<script setup lang="ts">
import { useStores } from '@directus/extensions-sdk';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, toRaw, watch } from 'vue';
import LinkDrawer from './drawer.vue';
import JtLabel from './label';
import { fitPins, parseValue, snugColumns } from './table';
import type { Link, ParseResult, Pins } from './table';
import { COLUMN_WIDTH, DEFAULT_PLACEHOLDER, buildView, fittingColumns, heightLimit, pinCover, pinViews, rotates, wantedPins } from './view';
import type { Count, Wanted } from './view';

/**
 * The JSON Table interface.
 *
 * Renders the field's JSON value as a table which fills the width of the
 * field, with a legend under it. Rows and columns can be pinned to the edges
 * of the table so they stay in view while the rest scrolls. It is generic
 * and works nothing out: the value holds every cell with its text, icon,
 * colour and weight. table.ts checks it first, and view.ts turns the checked
 * table into what the template below draws.
 *
 * The value may hold text typed by anyone, so it only ever reaches the page
 * through text interpolation and attribute bindings. Colours reach it as
 * inline styles, and table.ts lets nothing through but a hex colour or a
 * theme variable.
 *
 * It is read-only whatever the form says. The form passes `value`, `disabled`
 * and `nonEditable` to every interface, and the field's options as further
 * props (app/src/components/v-form/components/form-field-interface.vue:62-67
 * in Directus 11.17.4). `disabled` and `nonEditable` are accepted and
 * ignored, and nothing is ever emitted, so the field is never marked as
 * changed. Attributes do not fall through either, so the `input` listener
 * which the form attaches never ends up on an element.
 *
 * The form also says whether several items are being edited at once
 * (`batchMode`, line 68 of the same file) and hands over the field
 * (`field` and `fieldData`, lines 76-77), whose name the table is called by.
 */
defineOptions({ inheritAttrs: false });

const props = withDefaults(
	defineProps<{
		value?: unknown;
		disabled?: boolean;
		nonEditable?: boolean;
		batchMode?: boolean;
		field?: string | null;
		fieldData?: { name?: string | null } | null;
		columnLabels?: string | null;
		stickyLeft?: Count;
		stickyRight?: Count;
		stickyTop?: Count;
		stickyBottom?: Count;
		maxHeight?: Count;
		placeholder?: string | null;
	}>(),
	{
		field: null,
		fieldData: null,
		columnLabels: null,
		stickyLeft: null,
		stickyRight: null,
		stickyTop: null,
		stickyBottom: null,
		maxHeight: null,
		placeholder: null,
	},
);

// The least width of a column whose label is written across, for the styles.
const ROOT_STYLE = { '--jt-column': `${COLUMN_WIDTH}rem` };

// useStores() is typed as Record<string, any>. Only the members used below
// are declared, matching app/src/stores/collections.ts:225 and
// app/src/stores/permissions.ts:68 in Directus 11.17.4.
interface CollectionsStore {
	getCollection(collection: string): object | null;
}

interface PermissionsStore {
	hasPermission(collection: string, action: 'read'): boolean;
}

const { useCollectionsStore, usePermissionsStore } = useStores();
const collectionsStore = useCollectionsStore() as CollectionsStore;
const permissionsStore = usePermissionsStore() as PermissionsStore;

// A link is only offered for a collection which exists and which the user
// may read.
const readable = (collection: string): boolean =>
	collectionsStore.getCollection(collection) !== null && permissionsStore.hasPermission(collection, 'read');

// The checked value. A compressed value has to be unpacked first, which takes
// a moment. Until then nothing is shown, or the table which was there before.
const parsed = shallowRef<ParseResult | { kind: 'pending' }>({ kind: 'pending' });
let reading = 0;

watch(
	() => props.value,
	(value) => {
		const ticket = ++reading;
		const result = parseValue(toRaw(value));

		if (!(result instanceof Promise)) {
			parsed.value = result;
			return;
		}

		if (parsed.value.kind !== 'valid') parsed.value = { kind: 'pending' };

		void result.then((unpacked) => {
			// A newer value may have arrived in the meantime.
			if (ticket === reading) parsed.value = unpacked;
		});
	},
	{ immediate: true },
);

const table = computed(() => (parsed.value.kind === 'valid' ? buildView(parsed.value.table, readable) : null));

const scrollStyle = computed(() => {
	const limit = heightLimit(props.maxHeight);

	return limit === null ? undefined : { maxBlockSize: `${limit}px` };
});

// How many rows and columns the options ask to pin.
const wanted = computed((): Wanted | null => (table.value ? wantedPins(props, table.value.span, table.value.lines) : null));

interface Measured {
	// The request these pins were measured for.
	wanted: Wanted;
	columns: Pins;
	lines: Pins;
}

const root = ref<HTMLElement | null>(null);
const grid = ref<HTMLTableElement | null>(null);

// How many columns fit after the first one with their labels written across,
// or null before the first measurement. The first column is as wide in both
// layouts, so switching layout never changes the answer.
const fitting = ref<number | null>(null);
const measured = shallowRef<Measured | null>(null);

// Before the table has been measured only the outermost row and column of
// each edge are pinned, which needs no sizes. That is also the usual case, so
// the first measurement rarely changes anything.
const pins = computed((): Measured | null => {
	const request = wanted.value;
	if (!request) return null;
	if (measured.value?.wanted === request) return measured.value;

	const first = (count: number) => (count > 0 ? [0] : []);

	return {
		wanted: request,
		columns: { start: first(request.left), end: first(request.right) },
		lines: { start: first(request.top), end: first(request.bottom) },
	};
});

function measure() {
	const tableElement = grid.value;
	const scroll = tableElement?.parentElement;
	const head = tableElement?.rows[0];
	const request = wanted.value;

	if (!tableElement || !scroll || !head || !request) {
		fitting.value = null;
		return;
	}

	const widths = Array.from(head.cells, (cell) => cell.offsetWidth);
	const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

	fitting.value = fittingColumns(scroll.clientWidth, widths[0] ?? 0, rem);

	// The candidates of each edge, outermost first. `rows` holds the rows of
	// the header and of every group, in the order they are drawn.
	const lines = tableElement.rows;
	const height = (index: number) => lines[index]?.offsetHeight ?? 0;
	const starts = widths.slice(0, request.left);
	const ends = widths.slice(widths.length - request.right).reverse();
	const tops = Array.from({ length: request.top }, (_, index) => height(index));
	const bottoms = Array.from({ length: request.bottom }, (_, index) => height(lines.length - 1 - index));

	const next: Measured = {
		wanted: request,
		columns: fitPins(starts, ends, scroll.clientWidth),
		lines: fitPins(tops, bottoms, scroll.clientHeight),
	};

	// Two things are written to the scroll box here and not bound in the
	// template: a binding would be state of this component, and every change
	// of that draws the whole table again. The template binds neither, so Vue
	// leaves both alone, but for the padding when the height limit goes (see
	// the watcher below).
	//
	// A link which the keyboard moves to is scrolled into view, and without
	// the padding it would end up under the pinned rows and columns.
	const across = pinCover(next.columns, starts, ends);
	const down = pinCover(next.lines, tops, bottoms);

	scroll.style.scrollPaddingInline = `${across.start}px ${across.end}px`;
	scroll.style.scrollPaddingBlock = `${down.start}px ${down.end}px`;

	// The box is a tab stop only while there is something to scroll, so the
	// arrow keys can scroll it; a table which fits is no stop on the way
	// through the form.
	if (scroll.scrollWidth > scroll.clientWidth || scroll.scrollHeight > scroll.clientHeight) scroll.tabIndex = 0;
	else scroll.removeAttribute('tabindex');

	// Only a change is stored, since storing draws the whole table again.
	const current = pins.value;

	if (JSON.stringify([next.columns, next.lines]) !== JSON.stringify([current?.columns, current?.lines])) {
		measured.value = next;
	}
}

let observer: ResizeObserver | null = null;

onMounted(() => {
	if (typeof ResizeObserver !== 'undefined') {
		observer = new ResizeObserver(measure);
		if (root.value) observer.observe(root.value);
		if (grid.value) observer.observe(grid.value);
	}

	measure();
});

// The table element comes and goes with the value.
watch(grid, (element, previous) => {
	if (previous) observer?.unobserve(previous);
	if (element) observer?.observe(element);
});

// A new value or new options can change every size. The height limit is
// named as well, though `wanted` is new whenever it changes: when the limit
// goes, Vue takes the whole `style` attribute off the scroll box, and with it
// the padding which `measure()` wrote there. That must be written again,
// however `wanted` comes to be worked out.
watch([table, wanted, scrollStyle], measure, { flush: 'post' });

onBeforeUnmount(() => observer?.disconnect());

const rotated = computed(() => rotates(props.columnLabels, table.value?.span ?? 0, fitting.value));

// Indexed by table column.
const columnPins = computed(() =>
	pinViews(
		table.value?.span ?? 0,
		pins.value?.columns,
		{ start: 'jt-pin-start', end: 'jt-pin-end' },
		{ start: 'insetInlineStart', end: 'insetInlineEnd' },
	),
);

// Indexed by table row: the header row is 0 and row `n` of the value is
// `n + 1`. The offset is a custom property which the cells of the row read.
const linePins = computed(() =>
	pinViews(table.value?.lines ?? 0, pins.value?.lines, { start: 'jt-pin-top', end: 'jt-pin-bottom' }, { start: '--jt-pin', end: '--jt-pin' }),
);

// Indexed by table column: whether the column stays as wide as its content
// when the table is stretched. This follows what the options ask to pin and
// not what `measure()` found room for, because the answer changes the widths
// which `measure()` reads.
const snug = computed(() => snugColumns(table.value?.span ?? 0, wanted.value?.left ?? 0, wanted.value?.right ?? 0));

// A label with a link opens the item in a drawer over the form. Which item is
// open is the state of the drawer (drawer.vue), not of the table.
const drawer = ref<InstanceType<typeof LinkDrawer> | null>(null);

function open(link: Link) {
	drawer.value?.open(link);
}

const placeholderText = computed(() => props.placeholder || DEFAULT_PLACEHOLDER);

// A form can hold several tables, so each is called by the name of its field.
const regionName = computed(() => props.fieldData?.name || props.field || 'Table');

// The styles carry no comments: the build keeps the comments of a style block
// in the bundle, which every page of the Data Studio loads. What they rely on
// is written here, in the order of the rules. tests/bundle.test.ts checks
// that the block has no comment and names no colour of its own.
//
// - Colours. The colours of the table itself come only from the app's theme
//   variables, so the light and dark themes both work. Every cell has an
//   opaque background, otherwise the cells scrolling under a pinned one would
//   show through. `print-color-adjust` keeps the backgrounds on paper, where
//   a browser leaves them out to save ink.
//
// - `.json-table`. `--jt-cell` is the least width and height of a cell, which
//   is what an icon gets. A size container has no intrinsic width, so a wide
//   table can never widen the form or make the page scroll sideways. The
//   container is also what the query at the end of the block measures: on a
//   narrow form the first column must leave room for the cells.
//
// - `.v-notice-content`. A notice is a flex row which never shrinks its text,
//   so a long word (an identifier, for example) ran out of the box. The text
//   may shrink and break.
//
// - `.jt-scroll`. The box is as wide as the field. A table wider than that
//   scrolls inside it, and so does one taller than the Maximum Height option,
//   when that is set.
//
// - `.jt-grid`. A narrow table is stretched to the width of the box, and the
//   columns which are not snug share the extra width. Sticky cells and
//   collapsed borders do not mix: the borders scroll away. The last row of
//   the last group has no line under it, since the box has a border.
//
// - `.jt-column-label`. The width (`--jt-column`, which the script sets from
//   COLUMN_WIDTH) is what the label asks of its column, whatever its text,
//   and the minimum makes it fill a column which was stretched.
//
// - `.jt-line`. One line of a cell. A cell has one line, unless a part of its
//   text starts a new one. A line never wraps: it is cut with an ellipsis
//   where its cell ends. The pieces of a line sit side by side, a space
//   apart.
//
// - `:deep()`. The lines, pieces and links of a label are drawn by label.ts,
//   whose elements do not carry the scope of this block. Their rules reach
//   them through the root of the component, which does. Such a rule is no
//   longer held to the elements of this component, so each names a class of
//   the package: the notice, the one thing in the field which the app draws,
//   has an icon with a `data-icon` of its own.
//
// - `.jt-rotated`. The header for tables with many columns. The label reads
//   from the bottom up and is cut with an ellipsis at the maximum height.
//   Each of its lines is 1.25rem wide. The first column is left as it is.
//   The label is an inline block which its cell centres like text. Automatic
//   margins would centre a block in Chrome and Safari, but Firefox resolves
//   them to nothing for a box whose writing mode differs from its parent's.
//
// - `.jt-first, .jt-snug`. A width of 1% keeps a column as wide as its
//   content when the table is stretched. The header cell of a column is
//   enough to say so. The first column always is (see `snug` above for the
//   others).
//
// - `.jt-link`. A button which reads as the text around it, and opens the
//   item. A button is one box to the line it sits in, so the line cannot cut
//   its text with an ellipsis. The button is as wide as the line at most and
//   cuts its own text. The icon in front of it takes 1.625rem of the line.
//
// - `.jt-group`. Headings: rows with a single cell, which spans the table.
//   The label stays in view while the table scrolls sideways.
//
// - `.jt-cell.jt-text`. A cell with text is as wide as the text, up to a
//   limit. The text is small and close to the edges, because a number in one
//   cell widens its whole column, and narrow columns are what keeps a large
//   table in view.
//
// - `[data-icon]::before`. An icon is drawn the way v-icon draws one, with
//   the name as a ligature of the app's icon font
//   (app/src/components/v-icon/v-icon.vue:119-141 in Directus 11.17.4), but
//   without an element or a component per cell. Only a cell and a piece have
//   one: v-icon draws its own in `::after`, and the rule would draw the icon
//   of the notice a second time in `::before`. It sits in front of the text
//   of its piece, when there is any, and an icon on its own sits in the
//   middle of its cell. The name is written twice: the second `content` has
//   an empty alternative text after the slash, so that assistive technology
//   does not read "check_circle" out, and a browser which does not know that
//   form keeps the first.
//
// - `.jt-fill`. Colours from the value. The colour of the text, the weight
//   and the slant are inline styles on the cell or on the piece, so they win
//   over the colours of the header and the headings. The background is laid
//   over the cell's own as an image, and not set in its place, so a pinned
//   cell stays opaque when the colour is translucent. A colour which does
//   not exist, such as a theme variable with a wrong name, leaves the cell as
//   it was.
//
// - `.jt-pin-*`. Pinned rows and columns. The script works out which ones are
//   pinned and how far from the edge each sits (see `pins` above). A column
//   gets its offset as an inline style on each of its cells, a row as a
//   custom property which its cells read. Layers: cells 0, pinned columns 1,
//   pinned rows 2, and the cells where the two cross 3. The innermost pin of
//   each edge draws the line the rest scrolls under.
//
// - `.jt-glyph`. An entry of the legend is a cell, drawn as it is in the
//   table. A cell without a colour of its own has the colour it has in the
//   table. A cell which is only a background has no content to give it a
//   height, so the least height is one line: the background then shows as a
//   swatch.
//
// - `forced-colors`. Under a contrast theme the system paints every
//   background in one colour and every text in another, so the colours of
//   the value are gone, and so are the shades which tell the header, the
//   headings and the pinned cells from the rest. The lines stay, in the
//   colour of the text. A background from the value is an image, which the
//   system would keep under text it has recoloured, so it is taken away and
//   the cell gets a line inside its edge in its place. The innermost pins get
//   a heavier line, and the focused box an outline, since its border no
//   longer changes colour.
</script>

<template>
	<div ref="root" class="json-table" :style="ROOT_STYLE">
		<p v-if="batchMode" class="jt-empty">A table is not shown while several items are edited</p>

		<p v-else-if="parsed.kind === 'empty'" class="jt-empty" v-text="placeholderText" />

		<v-notice v-else-if="parsed.kind === 'invalid'" type="danger">
			<div>
				<div class="jt-error-title">Unable to display this table</div>
				<div class="jt-error-detail" v-text="parsed.error" />
			</div>
		</v-notice>

		<template v-else-if="table">
			<p v-if="table.span === 0" class="jt-empty">This table has no columns</p>

			<template v-else>
				<div class="jt-scroll" :style="scrollStyle" role="region" :aria-label="regionName">
					<table ref="grid" class="jt-grid" :class="{ 'jt-rotated': rotated }">
						<thead>
							<tr :class="linePins[0]?.class" :style="linePins[0]?.style">
								<th
									v-for="(column, index) in table.columns"
									:key="index"
									class="jt-head"
									:class="[index === 0 ? 'jt-first' : 'jt-column', { 'jt-snug': snug[index] }, column.class, columnPins[index]?.class]"
									:style="[column.fill, columnPins[index]?.style]"
									scope="col"
									:title="column.title"
									:aria-label="column.name"
								>
									<div :class="index === 0 ? 'jt-label' : 'jt-column-label'">
										<jt-label :lines="column.drawn" @open="open" />
									</div>
								</th>
							</tr>
						</thead>

						<!-- A heading and the rows under it are one group of rows -->
						<tbody v-for="(group, at) in table.groups" :key="at">
							<tr v-if="group.heading" class="jt-group" :class="linePins[group.line]?.class" :style="linePins[group.line]?.style">
								<th
									:class="group.heading.class"
									:style="group.heading.fill"
									:colspan="table.span"
									scope="rowgroup"
									:title="group.heading.title"
									:aria-label="group.heading.name"
								>
									<span class="jt-group-label">
										<jt-label :lines="group.heading.drawn" @open="open" />
									</span>
								</th>
							</tr>

							<tr v-for="row in group.rows" :key="row.line" class="jt-row" :class="linePins[row.line]?.class" :style="linePins[row.line]?.style">
								<th
									class="jt-first"
									:class="[row.first.class, columnPins[0]?.class]"
									:style="[row.first.fill, columnPins[0]?.style]"
									scope="row"
									:title="row.first.title"
									:aria-label="row.first.name"
								>
									<div class="jt-label">
										<jt-label :lines="row.first.drawn" @open="open" />
									</div>
								</th>

								<!--
									Plain cells: a component per cell would be too slow.
									Only a cell of several pieces has elements for them.
								-->
								<td
									v-for="(cell, index) in row.cells"
									:key="index"
									class="jt-cell"
									:class="[cell.class, columnPins[index + 1]?.class]"
									:style="columnPins[index + 1] ? [cell.box, columnPins[index + 1]?.style] : cell.box"
									:data-icon="cell.icon"
									:title="row.tips[index]"
									:aria-label="row.names[index]"
								>
									<template v-if="cell.lines">
										<span v-for="(line, at) in cell.lines" :key="at" class="jt-line">
											<span
												v-for="(piece, part) in line"
												:key="part"
												class="jt-piece"
												:class="piece.class"
												:style="piece.style"
												:data-icon="piece.icon"
												:title="row.pieceTips[index]?.[at]?.[part]"
											>
												<button v-if="piece.link" class="jt-link" type="button" @click="open(piece.link)" v-text="piece.text" />
												<bdi v-else v-text="piece.text" />
											</span>
										</span>
									</template>
									<button v-else-if="cell.link" class="jt-link" type="button" @click="open(cell.link)" v-text="cell.text" />
									<template v-else>{{ cell.text }}</template>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<!-- Each entry is a cell, drawn as it is in the table, then its tip -->
				<ul v-if="table.legend.length > 0" class="jt-legend" aria-label="Legend">
					<li v-for="(entry, index) in table.legend" :key="index">
						<span class="jt-glyph" :class="entry.class" :style="entry.fill">
							<jt-label :lines="entry.drawn" plain />
						</span>
						<bdi v-text="entry.tip" />
					</li>
				</ul>
			</template>
		</template>

		<link-drawer ref="drawer" />
	</div>
</template>

<style scoped>
.json-table {
	--jt-cell: 2.25rem;
	--jt-line: var(--theme--border-color-subdued);
	--jt-label-max: 16rem;

	container: json-table / inline-size;
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 0.75rem;
	color: var(--theme--foreground);
	print-color-adjust: exact;
}

.json-table :deep(.v-notice-content) {
	min-inline-size: 0;
	overflow-wrap: anywhere;
}

.jt-empty {
	margin: 0;
	color: var(--theme--foreground-subdued);
	font-style: italic;
}

.jt-error-title {
	font-weight: 600;
}

.jt-error-detail {
	font-size: 0.8125rem;
	overflow-wrap: anywhere;
}

.jt-scroll {
	overflow: auto;
	background-color: var(--theme--background);
	border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
	border-radius: var(--theme--border-radius);
}

.jt-scroll:focus-visible {
	border-color: var(--theme--primary);
	outline: none;
}

.jt-grid {
	min-inline-size: 100%;
	font-size: 0.875rem;
	line-height: 1.25rem;
	border-collapse: separate;
	border-spacing: 0;
}

.jt-grid th,
.jt-grid td {
	padding: 0;
	font-weight: inherit;
	text-align: start;
	background-color: var(--theme--background);
	border-block-end: 1px solid var(--jt-line);
}

.jt-grid tbody:last-child tr:last-child > * {
	border-block-end: 0;
}

.jt-grid .jt-head {
	color: var(--theme--foreground-accent);
	font-weight: 600;
	vertical-align: bottom;
	background-color: var(--theme--background-subdued);
	border-block-end-width: var(--theme--border-width);
}

.jt-column-label {
	box-sizing: border-box;
	inline-size: var(--jt-column);
	min-inline-size: 100%;
	padding: 0.5rem;
	overflow: hidden;
	text-align: center;
}

.json-table :deep(.jt-line) {
	display: block;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.json-table :deep(.jt-piece + .jt-piece) {
	margin-inline-start: 0.25em;
}

.jt-rotated .jt-column {
	text-align: center;
}

.jt-rotated .jt-column-label {
	display: inline-block;
	inline-size: auto;
	min-inline-size: 0;
	width: max-content;
	min-width: 1.25rem;
	max-height: 9rem;
	margin: 0.5rem 0;
	padding: 0;
	text-align: start;
	vertical-align: bottom;
	transform: rotate(180deg);
	writing-mode: vertical-rl;
}

.jt-grid .jt-first,
.jt-grid .jt-snug {
	inline-size: 1%;
}

.jt-grid .jt-first {
	border-inline-end: 1px solid var(--jt-line);
}

.jt-label {
	min-inline-size: 6rem;
	max-inline-size: var(--jt-label-max);
	padding: 0.5rem 0.75rem;
	overflow: hidden;
}

.json-table :deep(.jt-link) {
	display: inline-block;
	max-inline-size: 100%;
	margin: 0;
	padding: 0;
	overflow: hidden;
	color: inherit;
	font: inherit;
	white-space: nowrap;
	text-align: inherit;
	text-decoration: none;
	text-overflow: ellipsis;
	vertical-align: bottom;
	background: none;
	border: 0;
	cursor: pointer;
	unicode-bidi: isolate;
}

.json-table :deep([data-icon] > .jt-link) {
	max-inline-size: calc(100% - 1.625rem);
}

.json-table :deep(.jt-link:hover),
.json-table :deep(.jt-link:focus-visible) {
	color: var(--theme--primary);
	text-decoration: underline;
}

.jt-grid .jt-group > th {
	color: var(--theme--foreground-accent);
	font-weight: 600;
	font-size: 0.8125rem;
	background-color: var(--theme--background-normal);
}

.jt-group-label {
	position: sticky;
	inset-inline-start: 0;
	display: inline-block;
	box-sizing: border-box;
	min-block-size: 0.5rem;
	max-inline-size: min(24rem, 100cqi - 1rem);
	padding: 0.25rem 0.75rem;
	overflow: hidden;
	vertical-align: top;
}

.jt-row:hover > th,
.jt-row:hover > td {
	background-color: var(--theme--background-subdued);
}

.jt-grid .jt-cell {
	min-inline-size: var(--jt-cell);
	block-size: var(--jt-cell);
	font-variant-numeric: tabular-nums;
	text-align: center;
}

.jt-grid .jt-cell.jt-text {
	max-inline-size: var(--jt-label-max);
	padding: 0.25rem 0.375rem;
	font-size: 0.8125rem;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.json-table :deep(:is(.jt-cell, .jt-piece)[data-icon])::before {
	display: inline-block;
	inline-size: 1.25rem;
	block-size: 1.25rem;
	margin-inline-end: 0.375rem;
	overflow: hidden;
	font-weight: normal;
	font-size: 1.25rem;
	font-family: 'Material Symbols';
	font-style: normal;
	line-height: 1;
	letter-spacing: normal;
	white-space: nowrap;
	text-transform: none;
	vertical-align: middle;
	overflow-wrap: normal;
	direction: ltr;
	content: attr(data-icon);
	content: attr(data-icon) / '';
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-rendering: optimizeLegibility;
	font-feature-settings: 'liga';
	font-variation-settings:
		'FILL' 0,
		'wght' 400,
		'GRAD' 0,
		'opsz' 24;
}

.json-table .jt-cell:not(.jt-text)[data-icon]::before {
	display: block;
	margin-inline: auto;
}

.json-table :deep(.jt-piece:not(.jt-text)[data-icon])::before {
	margin-inline-end: 0;
}

.json-table .jt-fill {
	background-image: linear-gradient(var(--jt-fill), var(--jt-fill));
}

.jt-grid .jt-pin-start,
.jt-grid .jt-pin-end {
	position: sticky;
	z-index: 1;
}

.jt-grid .jt-pin-top > *,
.jt-grid .jt-pin-bottom > * {
	position: sticky;
	z-index: 2;
}

.jt-grid .jt-pin-top > * {
	inset-block-start: var(--jt-pin);
}

.jt-grid .jt-pin-bottom > * {
	inset-block-end: var(--jt-pin);
}

.jt-grid .jt-pin-top > .jt-pin-start,
.jt-grid .jt-pin-top > .jt-pin-end,
.jt-grid .jt-pin-bottom > .jt-pin-start,
.jt-grid .jt-pin-bottom > .jt-pin-end {
	z-index: 3;
}

.jt-grid .jt-pin-start.jt-pin-edge {
	border-inline-end: 1px solid var(--jt-line);
}

.jt-grid .jt-pin-end.jt-pin-edge {
	border-inline-start: 1px solid var(--jt-line);
}

.jt-grid .jt-pin-bottom.jt-pin-edge > * {
	border-block-start: 1px solid var(--jt-line);
}

.jt-legend {
	display: flex;
	flex-wrap: wrap;
	gap: 0.25rem 1.25rem;
	margin: 0;
	padding: 0;
	color: var(--theme--foreground-subdued);
	font-size: 0.875rem;
	list-style: none;
}

.jt-legend li {
	display: inline-flex;
	gap: 0.375rem;
	align-items: center;
	min-inline-size: 0;
	overflow-wrap: anywhere;
}

.jt-glyph {
	flex-shrink: 0;
	min-inline-size: 1.25rem;
	min-block-size: 1.25rem;
	color: var(--theme--foreground);
	text-align: center;
}

.jt-glyph.jt-fill {
	padding-inline: 0.25rem;
	border-radius: 0.25rem;
}

@container json-table (max-width: 30rem) {
	.jt-label {
		min-inline-size: 4rem;
		max-inline-size: 9rem;
		padding-inline: 0.5rem;
	}
}

@media (forced-colors: active) {
	.jt-scroll:focus-visible {
		outline: 2px solid Highlight;
		outline-offset: 1px;
	}

	.json-table .jt-fill {
		background-image: none;
		outline: 1px solid CanvasText;
		outline-offset: -4px;
	}

	.jt-grid .jt-pin-start.jt-pin-edge {
		border-inline-end: 2px solid CanvasText;
	}

	.jt-grid .jt-pin-end.jt-pin-edge {
		border-inline-start: 2px solid CanvasText;
	}

	.jt-grid .jt-pin-top.jt-pin-edge > * {
		border-block-end: 2px solid CanvasText;
	}

	.jt-grid .jt-pin-bottom.jt-pin-edge > * {
		border-block-start: 2px solid CanvasText;
	}
}
</style>
