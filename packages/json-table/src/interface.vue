<script setup lang="ts">
import { useStores } from '@directus/extensions-sdk';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, toRaw, watch } from 'vue';
import { fitPins, linkTarget, parseValue } from './table';
import type { Cell, Link, ParseResult, Piece, Pins } from './table';

/**
 * The JSON Table interface.
 *
 * Renders the field's JSON value as a table which fills the width of the
 * field, with a legend under it. Rows and columns can be pinned to the edges
 * of the table so they stay in view while the rest scrolls. It is generic
 * and works nothing out: the value holds every cell with its text, icon,
 * colour and weight, and table.ts checks it first.
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
 */
defineOptions({ inheritAttrs: false });

type Count = number | string | null;

const props = withDefaults(
	defineProps<{
		value?: unknown;
		disabled?: boolean;
		nonEditable?: boolean;
		columnLabels?: string | null;
		stickyLeft?: Count;
		stickyRight?: Count;
		stickyTop?: Count;
		stickyBottom?: Count;
		maxHeight?: Count;
		placeholder?: string | null;
	}>(),
	{
		columnLabels: null,
		stickyLeft: null,
		stickyRight: null,
		stickyTop: null,
		stickyBottom: null,
		maxHeight: null,
		placeholder: null,
	},
);

const DEFAULT_PLACEHOLDER = 'No table yet';

// Options which were never saved arrive empty, so the defaults live here too.
const DEFAULT_STICKY = { left: 1, right: 0, top: 1, bottom: 0 };
const MAX_STICKY = 10;

// A height limit lower than this would leave no room under a pinned header.
const MIN_HEIGHT = 320;

// The header has two layouts. Labels are written across, or turned on their
// side over columns as narrow as their cells. With the Column Labels option on
// automatic they are written across while every column fits the width of the
// field. COLUMN_WIDTH is the least width of a column whose label is written
// across, in rem (.jt-column-label). Until the width has been measured,
// ROTATE_ABOVE decides. AGENTS.md has the measurements behind both.
const COLUMN_WIDTH = 7.5;
const ROTATE_ABOVE = 3;

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

type Style = Record<string, string>;

// What the template needs to draw one piece of a cell: text with an icon in
// front of it, in one colour and one weight.
interface PieceView {
	text: string;
	icon: string | null;
	link: Link | null;
	class: string;
	// The colour, the weight and the slant.
	style: Style | undefined;
	tip: string;
	// The tooltip of a piece whose tip is not the one of its cell, where the
	// piece is part of a label.
	title: string | undefined;
}

// A cell which the value shares by name is turned into one view, which every
// use of the name then points at.
interface CellView {
	// What a cell of one piece shows. A <td> draws that without an element
	// for the piece.
	text: string;
	icon: string | null;
	link: Link | null;
	// The lines of a cell of several pieces, each with the pieces which sit
	// side by side on it. Then the same for any cell.
	lines: PieceView[][] | null;
	drawn: PieceView[][];
	class: string;
	// The background, and the background with the style of the one piece.
	fill: Style | undefined;
	box: Style | undefined;
	// All the text of the cell, for the tooltips of other cells.
	label: string;
	tip: string;
	// The tooltip of a label: its text, which may be cut off, then its tip.
	title: string;
}

interface RowView {
	// Set for a row with a single cell, which spans the table.
	heading: CellView | null;
	// The first cell is the header of the row.
	first: CellView | null;
	cells: CellView[];
	// The tooltip of each of `cells`, for those with a tip.
	tips: (string | undefined)[];
	// The tooltips of the pieces of a cell, by line, where they differ from
	// the cell's. Indexed like `cells`, with holes.
	pieceTips: (string | undefined)[][][];
}

const table = computed(() => {
	const result = parsed.value;
	if (result.kind !== 'valid') return null;

	const { columns: headerCells, rows: bodyRows, legend } = result.table;

	// A link is only offered for a collection which exists and which the
	// user may read. Everything else is shown as plain text.
	const readable = new Map<string, boolean>();

	const target = (link: Link | undefined): Link | null => {
		if (!link) return null;

		let allowed = readable.get(link.collection);

		if (allowed === undefined) {
			allowed =
				collectionsStore.getCollection(link.collection) !== null &&
				permissionsStore.hasPermission(link.collection, 'read');

			readable.set(link.collection, allowed);
		}

		return allowed ? linkTarget(link) : null;
	};

	const pieceView = (piece: Piece, cellTip: string | undefined): PieceView => {
		const text = piece.text ?? '';
		const tip = piece.tip ?? '';
		const style: Style = {};

		if (piece.color) style['color'] = piece.color;
		if (piece.weight !== undefined) style['fontWeight'] = String(piece.weight);
		if (piece.italic) style['fontStyle'] = 'italic';

		return {
			text,
			icon: piece.icon ?? null,
			// A link is the text made into a button, so without text there is none.
			link: text ? target(piece.link) : null,
			class: text ? 'jt-text' : '',
			style: Object.keys(style).length > 0 ? style : undefined,
			tip,
			title:
				cellTip === undefined || tip === cellTip
					? undefined
					: [text, tip].filter(Boolean).join('\n'),
		};
	};

	const views = new Map<Cell, CellView>();

	const view = (cell: Cell): CellView => {
		let known = views.get(cell);

		if (!known) {
			const tip = cell.tip ?? '';
			const lines =
				cell.lines?.map((line) => line.map((piece) => pieceView(piece, tip))) ?? null;
			const only = lines ? null : pieceView(cell, undefined);
			const drawn = lines ?? (only ? [[only]] : []);
			const label = drawn
				.flat()
				.map((piece) => piece.text)
				.filter(Boolean)
				.join(' ');

			// The value's background is laid over the cell's own (.jt-fill).
			const fill = cell.background ? { '--jt-fill': cell.background } : undefined;
			const classes = [];

			if (label || lines) classes.push('jt-text');
			if (fill) classes.push('jt-fill');

			known = {
				text: only?.text ?? '',
				icon: only?.icon ?? null,
				link: only?.link ?? null,
				lines,
				drawn,
				class: classes.join(' '),
				fill,
				box: only?.style || fill ? { ...only?.style, ...fill } : undefined,
				label,
				tip,
				title: label && tip ? `${label}\n${tip}` : label || tip,
			};

			views.set(cell, known);
		}

		return known;
	};

	const columns = headerCells.map(view);

	const rows = bodyRows.map((row): RowView => {
		const [first, ...rest] = row.map(view);

		if (first && row.length === 1 && columns.length > 1) {
			return { heading: first, first: null, cells: [], tips: [], pieceTips: [] };
		}

		// A tip says which column and row it belongs to, because in a large
		// table the two headers can be far from the cell.
		const pieceTips: (string | undefined)[][][] = [];

		const tips = rest.map((cell, index) => {
			const place = [columns[index + 1]?.label, first?.label].filter(Boolean).join(' - ');
			const placed = (tip: string) => (tip && place ? `${place}: ${tip}` : tip);

			// A piece with a tip of its own shows that one, placed the same way.
			if (cell.lines?.some((line) => line.some((piece) => piece.tip !== cell.tip))) {
				pieceTips[index] = cell.lines.map((line) =>
					line.map((piece) => (piece.tip === cell.tip ? undefined : placed(piece.tip))),
				);
			}

			return cell.tip ? placed(cell.tip) : undefined;
		});

		return { heading: null, first: first ?? null, cells: rest, tips, pieceTips };
	});

	return {
		columns,
		rows,
		legend: legend.map(view),
		// The number of table columns, which a heading has to span.
		span: columns.length,
		// The number of table rows: the header row, then one per row.
		lines: rows.length + 1,
	};
});

// The height limit in pixels, or null when the table is as tall as its rows.
const heightLimit = computed(() => {
	const option = Number(props.maxHeight);

	return Number.isFinite(option) && option > 0 ? Math.max(option, MIN_HEIGHT) : null;
});

const scrollStyle = computed(() =>
	heightLimit.value === null ? undefined : { maxBlockSize: `${heightLimit.value}px` },
);

function stickyCount(option: Count, fallback: number, most: number): number {
	const count = option === null || option === '' ? fallback : Math.floor(Number(option));

	return Math.min(Math.max(Number.isFinite(count) ? count : fallback, 0), MAX_STICKY, most);
}

// How many rows and columns the options ask to pin. Rows can only be pinned
// when the height is limited: otherwise the table never scrolls up or down.
const wanted = computed(() => {
	const current = table.value;
	if (!current) return null;

	const limited = heightLimit.value !== null;
	const left = stickyCount(props.stickyLeft, DEFAULT_STICKY.left, current.span);
	const top = limited ? stickyCount(props.stickyTop, DEFAULT_STICKY.top, current.lines) : 0;

	return {
		left,
		right: stickyCount(props.stickyRight, DEFAULT_STICKY.right, current.span - left),
		top,
		bottom: limited
			? stickyCount(props.stickyBottom, DEFAULT_STICKY.bottom, current.lines - top)
			: 0,
	};
});

interface Measured {
	// The request these pins were measured for.
	wanted: object;
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
	const first = widths[0] ?? 0;
	const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

	fitting.value = Math.max(0, Math.floor((scroll.clientWidth - first) / (COLUMN_WIDTH * rem)));

	const lines = tableElement.rows;
	const height = (index: number) => lines[index]?.offsetHeight ?? 0;

	const next: Measured = {
		wanted: request,
		columns: fitPins(
			widths.slice(0, request.left),
			widths.slice(widths.length - request.right).reverse(),
			scroll.clientWidth,
		),
		lines: fitPins(
			Array.from({ length: request.top }, (_, index) => height(index)),
			Array.from({ length: request.bottom }, (_, index) => height(lines.length - 1 - index)),
			scroll.clientHeight,
		),
	};

	// Only a change is stored, since storing draws the whole table again.
	const current = pins.value;

	if (
		JSON.stringify([next.columns, next.lines]) !==
		JSON.stringify([current?.columns, current?.lines])
	) {
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

// A new value or new options can change every size.
watch([table, wanted], measure, { flush: 'post' });

onBeforeUnmount(() => observer?.disconnect());

const rotated = computed(() => {
	if (props.columnLabels === 'rotated') return true;
	if (props.columnLabels === 'across') return false;

	// The first column holds the row labels and is never turned.
	return (table.value?.columns.length ?? 0) - 1 > (fitting.value ?? ROTATE_ABOVE);
});

interface PinView {
	class: string;
	style: Record<string, string>;
}

// One entry per table row or column, with holes for those which are not
// pinned. The innermost pin of an edge is marked, so it can draw a line.
function pinViews(
	count: number,
	edges: Pins | undefined,
	classes: { start: string; end: string },
	property: { start: string; end: string },
): (PinView | undefined)[] {
	const views: (PinView | undefined)[] = [];
	if (!edges) return views;

	for (const edge of ['start', 'end'] as const) {
		edges[edge].forEach((offset, index) => {
			const innermost = index === edges[edge].length - 1;

			views[edge === 'start' ? index : count - 1 - index] = {
				class: innermost ? `${classes[edge]} jt-pin-edge` : classes[edge],
				style: { [property[edge]]: `${offset}px` },
			};
		});
	}

	return views;
}

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
	pinViews(
		table.value?.lines ?? 0,
		pins.value?.lines,
		{ start: 'jt-pin-top', end: 'jt-pin-bottom' },
		{ start: '--jt-pin', end: '--jt-pin' },
	),
);

// A label with a link opens the item in a drawer over the form, read-only,
// the way a related item opens from a relational field. `drawer-item` is a
// global component of the app (app/src/components/register.ts:158 in Directus
// 11.17.4), and `disabled` with `nonEditable` is what makes it view-only
// (app/src/views/private/components/overlay-item.vue:265,284-285).
const opened = ref<Link | null>(null);
const drawerActive = ref(false);

function open(link: Link) {
	opened.value = link;
	drawerActive.value = true;
}

const placeholderText = computed(() => props.placeholder || DEFAULT_PLACEHOLDER);
</script>

<template>
	<div ref="root" class="json-table">
		<p v-if="parsed.kind === 'empty'" class="jt-empty" v-text="placeholderText" />

		<v-notice v-else-if="parsed.kind === 'invalid'" type="danger">
			<div>
				<div class="jt-error-title">Unable to display this table</div>
				<div class="jt-error-detail" v-text="parsed.error" />
			</div>
		</v-notice>

		<template v-else-if="table">
			<p v-if="table.columns.length === 0" class="jt-empty">This table has no columns</p>

			<template v-else>
				<!-- Focusable, so the table can be scrolled with the keyboard -->
				<div
					class="jt-scroll"
					:style="scrollStyle"
					role="region"
					tabindex="0"
					aria-label="Table"
				>
					<table ref="grid" class="jt-grid" :class="{ 'jt-rotated': rotated }">
						<thead>
							<tr :class="linePins[0]?.class" :style="linePins[0]?.style">
								<th
									v-for="(column, index) in table.columns"
									:key="index"
									class="jt-head"
									:class="[
										index === 0 ? 'jt-first' : 'jt-column',
										column.class,
										columnPins[index]?.class,
									]"
									:style="[column.fill, columnPins[index]?.style]"
									scope="col"
									:title="column.title"
								>
									<div :class="index === 0 ? 'jt-label' : 'jt-column-label'">
										<span
											v-for="(line, at) in column.drawn"
											:key="at"
											class="jt-line"
										>
											<span
												v-for="(piece, part) in line"
												:key="part"
												class="jt-piece"
												:class="piece.class"
												:style="piece.style"
												:data-icon="piece.icon"
												:title="piece.title"
											>
												<button
													v-if="piece.link"
													class="jt-link"
													type="button"
													@click="open(piece.link)"
													v-text="piece.text"
												/>
												<bdi v-else v-text="piece.text" />
											</span>
										</span>
									</div>
								</th>
							</tr>
						</thead>

						<tbody>
							<template v-for="(row, line) in table.rows" :key="line">
								<tr
									v-if="row.heading"
									class="jt-group"
									:class="linePins[line + 1]?.class"
									:style="linePins[line + 1]?.style"
								>
									<th
										:class="row.heading.class"
										:style="row.heading.fill"
										:colspan="table.span"
										scope="colgroup"
										:title="row.heading.tip"
									>
										<span class="jt-group-label">
											<span
												v-for="(line, at) in row.heading.drawn"
												:key="at"
												class="jt-line"
											>
												<span
													v-for="(piece, part) in line"
													:key="part"
													class="jt-piece"
													:class="piece.class"
													:style="piece.style"
													:data-icon="piece.icon"
													:title="piece.title"
												>
													<button
														v-if="piece.link"
														class="jt-link"
														type="button"
														@click="open(piece.link)"
														v-text="piece.text"
													/>
													<bdi v-else v-text="piece.text" />
												</span>
											</span>
										</span>
									</th>
								</tr>

								<tr
									v-else-if="row.first"
									class="jt-row"
									:class="linePins[line + 1]?.class"
									:style="linePins[line + 1]?.style"
								>
									<th
										class="jt-first"
										:class="[row.first.class, columnPins[0]?.class]"
										:style="[row.first.fill, columnPins[0]?.style]"
										scope="row"
										:title="row.first.title"
									>
										<div class="jt-label">
											<span
												v-for="(line, at) in row.first.drawn"
												:key="at"
												class="jt-line"
											>
												<span
													v-for="(piece, part) in line"
													:key="part"
													class="jt-piece"
													:class="piece.class"
													:style="piece.style"
													:data-icon="piece.icon"
													:title="piece.title"
												>
													<button
														v-if="piece.link"
														class="jt-link"
														type="button"
														@click="open(piece.link)"
														v-text="piece.text"
													/>
													<bdi v-else v-text="piece.text" />
												</span>
											</span>
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
										:style="
											columnPins[index + 1]
												? [cell.box, columnPins[index + 1]?.style]
												: cell.box
										"
										:data-icon="cell.icon"
										:title="row.tips[index]"
										:aria-label="cell.label ? undefined : row.tips[index]"
									>
										<template v-if="cell.lines">
											<span
												v-for="(line, at) in cell.lines"
												:key="at"
												class="jt-line"
											>
												<span
													v-for="(piece, part) in line"
													:key="part"
													class="jt-piece"
													:class="piece.class"
													:style="piece.style"
													:data-icon="piece.icon"
													:title="row.pieceTips[index]?.[at]?.[part]"
												>
													<button
														v-if="piece.link"
														class="jt-link"
														type="button"
														@click="open(piece.link)"
														v-text="piece.text"
													/>
													<bdi v-else v-text="piece.text" />
												</span>
											</span>
										</template>
										<button
											v-else-if="cell.link"
											class="jt-link"
											type="button"
											@click="open(cell.link)"
											v-text="cell.text"
										/>
										<template v-else>{{ cell.text }}</template>
									</td>
								</tr>
							</template>
						</tbody>
					</table>
				</div>

				<!-- Each entry is a cell, drawn as it is in the table, then its tip -->
				<ul v-if="table.legend.length > 0" class="jt-legend" aria-label="Legend">
					<li v-for="(entry, index) in table.legend" :key="index">
						<span class="jt-glyph" :class="entry.class" :style="entry.fill">
							<span v-for="(line, at) in entry.drawn" :key="at" class="jt-line">
								<span
									v-for="(piece, part) in line"
									:key="part"
									class="jt-piece"
									:class="piece.class"
									:style="piece.style"
									:data-icon="piece.icon"
									v-text="piece.text"
								/>
							</span>
						</span>
						<bdi v-text="entry.tip" />
					</li>
				</ul>

				<!-- Never editable, and its `input` event is not listened to -->
				<drawer-item
					v-if="opened"
					v-model:active="drawerActive"
					:collection="opened.collection"
					:primary-key="opened.id"
					disabled
					non-editable
				/>
			</template>
		</template>
	</div>
</template>

<style scoped>
/*
 * The colours of the table itself come only from the app's theme variables,
 * so the light and dark themes both work. The value can colour its cells: see
 * "Colours from the value" below. Every cell has an opaque background,
 * otherwise the cells scrolling under a pinned one would show through.
 */

.json-table {
	/* The least width and height of a cell, which is what an icon gets */
	--jt-cell: 2.25rem;
	--jt-line: var(--theme--border-color-subdued);
	--jt-label-max: 16rem;

	/*
	 * A size container has no intrinsic width, so a wide table can never
	 * widen the form or make the page scroll sideways. The container is
	 * also what the query at the end of this file measures.
	 */
	container: json-table / inline-size;
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 0.75rem;
	color: var(--theme--foreground);
}

/*
 * A notice is a flex row which never shrinks its text, so a long word (an
 * identifier, for example) ran out of the box. Let the text shrink and break.
 */
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

/*
 * The box is as wide as the field. A table wider than that scrolls inside it,
 * and so does one taller than the Maximum Height option, when that is set.
 */
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

/*
 * A narrow table is stretched to the width of the box, and the columns after
 * the first share the extra width. Sticky cells and collapsed borders do not
 * mix: the borders scroll away.
 */
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

.jt-grid tbody tr:last-child > * {
	border-block-end: 0;
}

/* Header row */

.jt-grid .jt-head {
	color: var(--theme--foreground-accent);
	font-weight: 600;
	vertical-align: bottom;
	background-color: var(--theme--background-subdued);
	border-block-end-width: var(--theme--border-width);
}

/*
 * The width is what the label asks of its column, whatever its text, and the
 * minimum makes it fill a column which was stretched
 */
.jt-column-label {
	box-sizing: border-box;
	inline-size: 7.5rem;
	min-inline-size: 100%;
	padding: 0.5rem;
	overflow: hidden;
	text-align: center;
}

/*
 * One line of a cell. A cell has one line, unless a part of its text starts
 * a new one. A line never wraps: it is cut with an ellipsis where its cell
 * ends.
 */
.jt-line {
	display: block;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

/* The pieces of a line sit side by side, a space apart */
.jt-piece + .jt-piece {
	margin-inline-start: 0.25em;
}

/*
 * Rotated header, for tables with many columns. The label reads from the
 * bottom up and is cut with an ellipsis at the maximum height. Each of its
 * lines is 1.25rem wide. The first column is left as it is.
 *
 * The label is an inline block which its cell centres like text. Automatic
 * margins would centre a block in Chrome and Safari, but Firefox resolves them
 * to nothing for a box whose writing mode differs from its parent's.
 */
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

/*
 * First column. A width of 1% keeps it as wide as its labels when the table
 * is stretched.
 */

.jt-grid .jt-first {
	inline-size: 1%;
	border-inline-end: 1px solid var(--jt-line);
}

.jt-label {
	min-inline-size: 6rem;
	max-inline-size: var(--jt-label-max);
	padding: 0.5rem 0.75rem;
	overflow: hidden;
}

/*
 * A button which reads as the text around it, and opens the item. A button
 * is one box to the line it sits in, so the line cannot cut its text with an
 * ellipsis. The button is as wide as the line at most and cuts its own text.
 */
.jt-link {
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

/* The icon in front of it takes 1.625rem of the line */
.json-table [data-icon] > .jt-link {
	max-inline-size: calc(100% - 1.625rem);
}

.jt-link:hover,
.jt-link:focus-visible {
	color: var(--theme--primary);
	text-decoration: underline;
}

/* Headings: rows with a single cell, which spans the table */

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

/* Cells */

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

/*
 * A cell with text is as wide as the text, up to a limit. The text is small
 * and close to the edges, because a number in one cell widens its whole
 * column, and narrow columns are what keeps a large table in view.
 */
.jt-grid .jt-cell.jt-text {
	max-inline-size: var(--jt-label-max);
	padding: 0.25rem 0.375rem;
	font-size: 0.8125rem;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

/*
 * An icon is drawn the way v-icon draws one, with the name as a ligature of
 * the app's icon font (app/src/components/v-icon/v-icon.vue:119-141 in
 * Directus 11.17.4), but without an element or a component per cell. It
 * sits in front of the text of its piece, when there is any.
 */
.json-table [data-icon]::before {
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

/* An icon on its own sits in the middle of its cell */
.json-table .jt-cell:not(.jt-text)[data-icon]::before {
	display: block;
	margin-inline: auto;
}

.json-table .jt-piece:not(.jt-text)[data-icon]::before {
	margin-inline-end: 0;
}

/*
 * Colours from the value. The colour of the text, the weight and the slant
 * are inline styles on the cell or on the piece, so they win over the colours
 * of the header and the headings. The background is laid over the cell's own
 * as an image, and not set in its place, so a pinned cell stays opaque when
 * the colour is translucent. A colour which does not exist, such as a theme
 * variable with a wrong name, leaves the cell as it was.
 */
.json-table .jt-fill {
	background-image: linear-gradient(var(--jt-fill), var(--jt-fill));
}

/*
 * Pinned rows and columns. The component works out which ones are pinned and
 * how far from the edge each sits (see `pins` in the script). A column gets
 * its offset as an inline style on each of its cells, a row as a custom
 * property which its cells read. Layers: cells 0, pinned columns 1, pinned
 * rows 2, and the cells where the two cross 3.
 */

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

/* The innermost pin of each edge draws the line the rest scrolls under */

.jt-grid .jt-pin-start.jt-pin-edge {
	border-inline-end: 1px solid var(--jt-line);
}

.jt-grid .jt-pin-end.jt-pin-edge {
	border-inline-start: 1px solid var(--jt-line);
}

.jt-grid .jt-pin-bottom.jt-pin-edge > * {
	border-block-start: 1px solid var(--jt-line);
}

/* Legend */

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

/* A cell without a colour of its own has the colour it has in the table */
.jt-glyph {
	flex-shrink: 0;
	min-inline-size: 1.25rem;
	color: var(--theme--foreground);
	text-align: center;
}

.jt-glyph.jt-fill {
	padding-inline: 0.25rem;
	border-radius: 0.25rem;
}

/* On a narrow form the first column must leave room for the cells */
@container json-table (max-width: 30rem) {
	.jt-label {
		min-inline-size: 4rem;
		max-inline-size: 9rem;
		padding-inline: 0.5rem;
	}
}
</style>
