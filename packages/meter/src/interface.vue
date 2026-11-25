<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useId, watch } from 'vue';
import { useAppText, useLanguage } from './i18n';
import { canEdit, changes, drawingOf, filledAt, inputMethod, keyValue, numberOf, pieceCount, pieceGeometry, readEditing, readLook, readOptions, readingOf, relativeMove, segmentValue, shareAt, snapValue, valueAtShare, writableRange } from './meter';
import type { Paint, Piece } from './meter';

/**
 * The Meter interface.
 *
 * An area as high as a stock input, with the track across its width and,
 * on a line under the track, the caption at the start and the value as text
 * at the end. There is no box around it.
 *
 * In a field which can be edited the track is a slider: the pointer and the
 * keys set the value. In a field which cannot (`disabled`, which is what
 * read-only comes to, `nonEditable` or `loading`) it is the reading it was
 * before there was any editing: the same elements with the role `meter`, no
 * tab stop, no listener, no cursor, and nothing is ever emitted. It is not
 * dimmed either: a field which a flow keeps up to date is normally read-only,
 * and dimming it would dim nearly every meter.
 *
 * The form passes `value`, `disabled`, `nonEditable`, `loading` and the
 * `type` of the field to every interface, the field's options as further
 * props, and a good deal more
 * (app/src/components/v-form/components/form-field-interface.vue:60-85 in
 * Directus 11.17.4). Only what is declared here is used. Attributes do not
 * fall through, so the rest never ends up on the element.
 *
 * `direction` is left out: it is the direction of the text which is typed
 * into a field. The form of an item hands over that of the user
 * (app/src/modules/content/routes/item.vue:888), a form inside the
 * translations interface that of its language
 * (app/src/interfaces/translations/translation-form.vue:213), and the stock
 * Input puts it on its element (app/src/interfaces/input/input.vue:88). The
 * meter holds no such text. Like the stock Slider it runs in the direction of
 * the page, which its styles follow on their own and its pointer and keys by
 * asking the element.
 *
 * The options are typed as `unknown`, not by what they should hold: they
 * arrive as the schema stores them, `readOptions` makes sense of them, and
 * a prop which Vue knows as a boolean would turn a missing `indicator` into
 * `false`. The three which say whether the field can be edited are booleans:
 * a missing one is `false` there, which is what it means.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps<{
	value?: unknown;
	fieldData?: { name?: unknown } | null;
	min?: unknown;
	max?: unknown;
	minValue?: unknown;
	maxValue?: unknown;
	label?: unknown;
	indicator?: unknown;
	indicatorFormat?: unknown;
	color?: unknown;
	thresholds?: unknown;
	visualization?: unknown;
	subdivisions?: unknown;
	dotsLayout?: unknown;
	activeColoring?: unknown;
	inactiveColoring?: unknown;
	input?: unknown;
	step?: unknown;
	stepInterval?: unknown;
	sensitivity?: unknown;
	type?: unknown;
	disabled?: boolean;
	nonEditable?: boolean;
	loading?: boolean;
}>();

const emit = defineEmits<{ input: [value: unknown] }>();

const t = useAppText();
const language = useLanguage();
const id = useId();

const options = computed(() => readOptions(props));
const reading = computed(() => readingOf(props.value, options.value, language()));

// How many pieces the track is cut into depends on its width, which is that
// of the element on the line of the track. The form gives that element its
// width, never what is inside it, so the number of pieces cannot change what
// is measured. It is measured when the component is mounted, before the first
// frame is painted, and again whenever its size changes. A field which is not
// shown, as in a tab or a group which is closed, has no width: it draws no
// pieces and keeps its height, and is measured again when it is shown.
const line = shallowRef<HTMLElement | null>(null);
const width = shallowRef(0);
let observer: ResizeObserver | null = null;

onMounted(() => {
	const element = line.value;
	if (!element) return;

	width.value = element.getBoundingClientRect().width;
	if (typeof ResizeObserver === 'undefined') return;

	observer = new ResizeObserver((entries) => {
		const entry = entries[entries.length - 1];
		if (entry) width.value = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
	});

	observer.observe(element);
});

onBeforeUnmount(() => {
	observer?.disconnect();
	observer = null;
});

// The width is read here and nowhere else. A computed value which comes to
// the same number does not wake what depends on it, so the meter is drawn
// again only when the number of pieces changes, not with every pixel.
const look = computed(() => readLook(props));
const count = computed(() => pieceCount(look.value, options.value, 'form', width.value));
const drawing = computed(() => drawingOf(look.value, options.value, reading.value, count.value, props.value));

// The colour stops of the scale are set once, on the root, for whichever
// surfaces paint with them.
const scales = computed(() => {
	const { stops, weakStops } = drawing.value;
	if (stops === null && weakStops === null) return undefined;

	return { '--mt-stops': stops ?? undefined, '--mt-weak-stops': weakStops ?? undefined };
});

const paintClass = (paint: Paint) => (paint.scale === null ? undefined : paint.scale === 'weak' ? 'mt-paint mt-weak' : 'mt-paint');

// The element on the line of the track: the track of the one bar, or the row of pieces.
const lineStyle = computed(() => {
	const { pieces, track } = drawing.value;

	if (pieces !== null) return { '--mt-n': pieces.length };
	return track.color !== null ? { backgroundColor: track.color } : undefined;
});

// The fill of the one bar. Painted with the scale, it is the first part of an image as wide as the track.
const fillStyle = computed(() => {
	const { fill } = drawing.value;
	const inlineSize = `${reading.value.fraction * 100}%`;

	if (fill.scale !== null) return { inlineSize, '--mt-n': 1 / reading.value.fraction };
	return fill.color !== null ? { inlineSize, backgroundColor: fill.color } : { inlineSize };
});

// The meter is named by its caption, which is on the page, or else by the
// name of its field, which the form prints above it.
const name = computed(() => {
	const field = props.fieldData?.name;
	return typeof field === 'string' && field.trim() !== '' ? field : 'Meter';
});

// `no_value` is what the app says for an empty field elsewhere.
const spoken = computed(() => (reading.value.empty ? t('no_value', 'No value') : reading.value.text));

// Editing. Everything from here to the styles' notes is for a field which can
// be edited, and none of it is reached in one which cannot: the template
// binds the listeners, the tab stop and the role of a slider only while
// `editable` holds, and `write` checks it once more.
const editable = computed(() => canEdit(props));
const editing = computed(() => readEditing(props, props.type));
const method = computed(() => inputMethod(editing.value, count.value, options.value));

// How many pieces the pointer would fill, while it rests over a meter whose pieces are filled by it.
const hover = shallowRef(0);
const dragging = shallowRef(false);

/**
 * Writes a value, which has to be one `snapValue` or `keyValue` made: on the
 * grid, within the range, a finite number. Only where the field can be
 * edited, and only where it differs from what the field holds.
 */
function write(value: number | null | undefined) {
	if (!editable.value || typeof value !== 'number' || !Number.isFinite(value)) return;
	if (!changes(props.value, value)) return;

	emit('input', value);
}

// Where things are at the moment of an event: the track, the direction of the page, the pieces as they are laid
// out, and the length along which a value is spread, which for packed dots is that of the row of dots.
function frame(element: HTMLElement) {
	const box = element.getBoundingClientRect();
	const rtl = getComputedStyle(element).direction === 'rtl';
	const visualization = look.value.visualization;
	const pieces: Piece[] =
		drawing.value.pieces !== null && visualization !== 'contiguous' ? pieceGeometry(visualization, 'form', drawing.value.pieces.length, box.width, look.value.dotsLayout) : [];
	const length = pieces.length ? pieces[pieces.length - 1]!.end : box.width;

	return { box, rtl, pieces, length };
}

// A point of the pointer in pixels from the start side of the track.
const positionOf = (event: PointerEvent, at: ReturnType<typeof frame>) => (at.rtl ? at.box.right - event.clientX : event.clientX - at.box.left);

// The value under the pointer, by the method of the meter.
function valueUnder(event: PointerEvent, at: ReturnType<typeof frame>) {
	const position = positionOf(event, at);

	// By the piece: the value which leaves the pieces up to the pointer filled.
	if (method.value === 'segment' && at.pieces.length) return segmentValue(filledAt(position, at.pieces), at.pieces.length, options.value, editing.value);

	return snapValue(valueAtShare(shareAt(position, at.length), options.value), options.value, editing.value);
}

// One press of the pointer, from the button going down to its release or to Escape. `before` is what the field
// held, as it was, which Escape puts back. `raw` is the value of the relative method before it goes to the grid.
interface Drag {
	pointer: number;
	before: unknown;
	raw: number;
	lastX: number;
	locked: boolean;
	/** Where the pointer was last seen on the page, and whether it is a finger: for the marks after the drag. */
	x: number;
	y: number;
	touch: boolean;
}

// Marks the pieces which a pointer resting at a point of the page would fill: those up to it, where the pieces
// are filled by the pointer and the point is on the track. A finger does not rest anywhere.
function rest(x: number, y: number, touch: boolean) {
	const element = line.value;

	if (!editable.value || !element || touch || method.value !== 'segment') {
		hover.value = 0;
		return;
	}

	const at = frame(element);
	const inside = x >= at.box.left && x <= at.box.right && y >= at.box.top && y <= at.box.bottom;
	hover.value = inside ? filledAt(at.rtl ? at.box.right - x : x - at.box.left, at.pieces) : 0;
}

let drag: Drag | null = null;
let watching = false;

function onPointerDown(event: PointerEvent) {
	const element = line.value;
	if (!editable.value || !element || !event.isPrimary || event.button !== 0) return;

	// A press which never saw its release, should there be one, ends here.
	finish(false);

	const current = numberOf(props.value);
	drag = {
		pointer: event.pointerId,
		before: props.value,
		raw: current ?? options.value.min,
		lastX: event.clientX,
		locked: false,
		x: event.clientX,
		y: event.clientY,
		touch: event.pointerType === 'touch',
	};
	dragging.value = true;

	// Nothing is marked during a drag: the fill itself follows the pointer.
	hover.value = 0;

	// The drag goes on when the pointer leaves the field.
	try {
		element.setPointerCapture(event.pointerId);
	} catch {
		// A pointer which is gone already: the drag ends with the next event.
	}

	if (method.value !== 'relative') {
		write(valueUnder(event, frame(element)));
		return;
	}

	// The relative method changes nothing on the press. It asks for the pointer to be locked, so that the movement
	// has no edge to run into; where that is refused or not to be had, and for a finger, the captured drag does.
	if (event.pointerType === 'touch' || typeof element.requestPointerLock !== 'function') return;

	if (!watching) {
		document.addEventListener('pointerlockchange', onLockChange);
		watching = true;
	}

	try {
		const asked = element.requestPointerLock() as Promise<void> | undefined;
		if (asked && typeof asked.catch === 'function') asked.catch(() => undefined);
	} catch {
		// Refused: the captured drag does.
	}
}

function onPointerMove(event: PointerEvent) {
	const element = line.value;
	if (!editable.value || !element) return;

	const at = frame(element);

	if (drag === null) {
		rest(event.clientX, event.clientY, event.pointerType === 'touch');
		return;
	}

	if (event.pointerId !== drag.pointer) return;

	drag.x = event.clientX;
	drag.y = event.clientY;

	// A mouse which moves with no button held was released where the meter did not see it.
	if (event.pointerType === 'mouse' && event.buttons === 0) {
		finish(false);
		return;
	}

	if (method.value !== 'relative') {
		write(valueUnder(event, at));
		return;
	}

	// A locked pointer does not move on the page; what it would have moved by is all it reports. The lock is
	// asked of the document here and now: the event which announces it comes after the first movement under it.
	const locked = document.pointerLockElement === element;
	if (locked) drag.locked = true;

	const moved = locked ? event.movementX : event.clientX - drag.lastX;
	drag.lastX = event.clientX;
	drag.raw = relativeMove(drag.raw, at.rtl ? -moved : moved, at.length, options.value, editing.value.sensitivity, event.shiftKey);
	write(snapValue(drag.raw, options.value, editing.value));
}

// The end of a press. `restore` puts back what the field held before it.
function finish(restore: boolean) {
	const ended = drag;
	const element = line.value;
	if (ended === null) return;

	drag = null;
	dragging.value = false;

	if (element) {
		try {
			if (element.hasPointerCapture(ended.pointer)) element.releasePointerCapture(ended.pointer);
		} catch {
			// The pointer is gone.
		}

		if (document.pointerLockElement === element) document.exitPointerLock();
	}

	// The marks are back at once, for where the pointer rests now, without waiting for it to move.
	rest(ended.x, ended.y, ended.touch);

	if (restore && editable.value && props.value !== ended.before) emit('input', ended.before);
}

function onPointerUp(event: PointerEvent) {
	if (drag !== null && event.pointerId === drag.pointer) finish(false);
}

// The browser took the pointer away, as it does when a finger starts to scroll the page: nothing was meant.
function onPointerCancel(event: PointerEvent) {
	if (drag !== null && event.pointerId === drag.pointer) finish(true);
}

function onPointerLeave() {
	hover.value = 0;
}

// The lock comes and goes on its own time. One which ends while the button is still held was ended by the
// browser, which does that on Escape, and counts as Escape. One which arrives after the press is over is given
// back at once.
function onLockChange() {
	const element = line.value;
	const locked = element !== null && document.pointerLockElement === element;

	if (drag === null) {
		if (locked) document.exitPointerLock();
		return;
	}

	if (drag.locked && !locked) finish(true);
	else drag.locked = locked;
}

function onKeyDown(event: KeyboardEvent) {
	const element = line.value;
	if (!editable.value || !element) return;

	if (event.key === 'Escape') {
		if (drag === null) return;

		event.preventDefault();
		event.stopPropagation();
		finish(true);
		return;
	}

	if (drag !== null || event.altKey || event.ctrlKey || event.metaKey) return;

	const rtl = getComputedStyle(element).direction === 'rtl';
	const value = keyValue(event.key, numberOf(props.value), options.value, editing.value, count.value, rtl);
	if (value === undefined) return;

	// The key is the meter's, whether or not it changes anything: the page does not scroll for it.
	event.preventDefault();
	write(value);
}

// A field which stops being one that can be edited while it is being dragged, as a condition can make it, lets
// go of the pointer at once. What was written up to then stays: the form already has it.
watch(editable, (now) => {
	if (now) return;

	hover.value = 0;
	finish(false);
});

// What a slider says its range and its value are: the range which can be written, which for a field of a whole
// type with limits between whole numbers is narrower than the range which is drawn, and the value within it. A
// meter which cannot be edited says what it always said: the range as it is stored.
const said = computed(() => {
	const range = (editable.value ? writableRange(options.value, editing.value) : null) ?? options.value;
	const now = reading.value.now;

	// A slider has to say a value, so one without a value says the least it could be set to, and "No value" as
	// the text of it. A meter without a value says none, as it always did.
	if (!editable.value) return { min: range.min, max: range.max, now: now ?? undefined };

	return { min: range.min, max: range.max, now: now === null ? range.min : Math.min(range.max, Math.max(range.min, now)) };
});

const listeners = computed(() =>
	editable.value
		? {
				pointerdown: onPointerDown,
				pointermove: onPointerMove,
				pointerup: onPointerUp,
				pointercancel: onPointerCancel,
				pointerleave: onPointerLeave,
				keydown: onKeyDown,
			}
		: {},
);

// The classes of the element on the line of the track. One which cannot be edited has those it always had.
const lineClass = computed(() => {
	const drawn =
		drawing.value.pieces === null
			? ['mt-track', paintClass(drawing.value.track), { 'mt-scaled': drawing.value.fill.scale !== null }]
			: ['mt-strip', `mt-${look.value.visualization}`, { 'mt-spread': look.value.visualization === 'dots' && look.value.dotsLayout === 'spread' }];

	return editable.value ? [...drawn, 'mt-live', `mt-by-${method.value}`, { 'mt-busy': dragging.value }] : drawn;
});

// A handle at the end of the fill of the one bar, inside the track, never past either end of it.
const handleStyle = computed(() => ({ insetInlineStart: `clamp(0.125rem, calc(${reading.value.fraction * 100}% - 0.625rem), calc(100% - 0.625rem))` }));

onBeforeUnmount(() => {
	if (watching) document.removeEventListener('pointerlockchange', onLockChange);
	finish(false);
});

// The styles carry no comments: the build keeps the comments of a style block
// in the bundle, which every Data Studio page loads. What they rely on:
//
// - Everything is inside one area which is at least as high as a stock input
//   (the token of the inputs' height), so the note which the form prints
//   under a field is where it is under an input. The track and the line under
//   it are centred in the area as one group. A caption which wraps makes the
//   area grow. There is no border and no background: it is a reading, not an
//   input.
// - The track is 0.75rem high with rounded ends, in the colour token of the
//   stock Slider's line. The fill is a block at the start of the track, sized
//   along the inline axis, so it needs nothing for right-to-left. It is never
//   narrower than it is high: the smallest value above the minimum shows as a
//   dot, not as a sliver of a rounded corner.
// - A track which is cut up (`visualization`) is a row of pieces on the line
//   of the track, at its height, and nothing else changes. The row is a flex
//   container, so the first piece is at the start side in either direction.
//   Pills, segments and bars share the width of the field equally: pills
//   0.25rem apart with both ends round, segments 0.1875rem apart with only
//   the two outer ends of the row round, bars 0.125rem apart and square. Dots
//   are circles as high as the track, which do not stretch: 0.375rem apart
//   from the start side, or spread from edge to edge. The gaps and the dot
//   are those of `PIECE_SIZES` in meter.ts, by which the pieces are counted,
//   with 16px to the rem. Without a value every piece is a dashed outline, as
//   the track is.
// - A surface which shows the colours of the scale (`mt-paint`) has a
//   gradient across the whole track as its background, of which it shows its
//   own part: the image is `--mt-n` times as wide as the surface, and placed
//   by `--mt-at`, 0 for the first part and 1 for the last. A piece is one of
//   `--mt-n` equal parts of the scale, the gaps between pieces not counted;
//   the fill of the one bar is the first `1 / --mt-n` of it. A percentage as
//   a background position moves the image by that share of what it is wider
//   than its box, which is what makes this work without knowing a width. The
//   stops are in `--mt-stops`, on the root; a faded surface (`mt-weak`) takes
//   `--mt-weak-stops` instead, by a rule of its own and not by setting
//   `--mt-stops` for itself: the fill is inside the track and would inherit
//   that.
// - A track which can be edited (`mt-live`) has a cursor, takes sideways
//   drags of a finger for itself and leaves the up and down ones to the page
//   (`touch-action: pan-y`), and lets no drag select text. Its focus ring is
//   an outline in the colour of a focused input, which takes no room. The
//   app has a focus ring of its own for every `div` which takes the focus,
//   drawn inside the element and with square corners
//   (`div:not([contenteditable=true]):focus-visible` in its global styles):
//   the two rules of the ring are written with one class more than they
//   would need, to come before that one, and the second gives the track its
//   round ends back. None of the rules changes a size or a place: the area,
//   the caption, the text and the note of the form stay where they are.
// - The handle of the one bar is a dot inside the track at the end of the
//   fill, never past either end, which shows while the pointer is over the
//   track, while the track has the keyboard's focus and during a drag. It is
//   shown and hidden at once, without a transition.
// - The pieces which the pointer would fill (`mt-hint`) have a veil in the
//   text colour over whatever they are painted with.
// - The fill of the one bar is the exception to "`--mt-n` times as wide": its
//   image is as wide as the track itself, `100cqi`, with the track made a
//   container for that (`mt-scaled`, only where the fill is painted so). An
//   image which is sized by the fill, `1 / fraction` times its width, comes
//   out a fraction of a pixel wider or narrower at every value, and the place
//   where one colour ends moves by a pixel as the value changes. Sized by the
//   track and laid at its start, no stop can move: the fill only uncovers
//   more or less of the same picture. `--mt-n` is still set on the fill, for
//   a browser which does not know the unit and drops that declaration.
// - A gradient has no logical direction, so a right-to-left page gets its own
//   rule, by `:dir(rtl)`: the gradient runs to the left and the place is
//   counted from the right. The app writes `dir` on the root element.
// - A field without a value has a dashed outline in place of the track, so it
//   does not look like a meter at its minimum, with or without the text. The
//   outline is thin and in the subdued text colour: in the colour of the
//   track, which is close to the background, dashes are easily overlooked.
// - The line under the track is a flex container: the caption at the start,
//   which takes what is left and wraps, and the text at the end, which keeps
//   its width and stands on the first line of the caption. The caption asks
//   for 4rem before it gives way. In a field too narrow for that and the text
//   together, the line wraps and the text goes under the caption, still at
//   the end.
// - The text is whole, or it is not shown: a number of which only a part
//   shows reads as another number, whichever part it is, and with or without
//   an ellipsis. Its box is a flex container which may wrap, one line high and
//   no wider than the field, and it cuts off what is beyond its height. The
//   first thing in it is a space without a width, which holds the first line;
//   the number comes after it, and goes to a second line, out of sight, when
//   the field is narrower than the number.
// - The number is marked as running from the left (`dir="ltr"`). A number
//   carries no direction of its own, so in a right-to-left page "-20%" would
//   otherwise be laid out as "20%-" and "7 / 12" as "12 / 7"; the number
//   formatting of a right-to-left language puts the marks it needs into the
//   text itself.
// - There is no transition anywhere. The form hands over `null` until the
//   item has loaded, so any transition would play on every page load.
//
// The package's AGENTS.md, "How it works", has the rest.
</script>

<template>
	<div class="meter" :class="{ 'mt-empty': reading.empty }" :style="scales">
		<div
			ref="line"
			:class="lineClass"
			:style="lineStyle"
			:role="editable ? 'slider' : 'meter'"
			:tabindex="editable ? 0 : undefined"
			:aria-orientation="editable ? 'horizontal' : undefined"
			:aria-label="options.label === null ? name : undefined"
			:aria-labelledby="options.label === null ? undefined : `${id}-caption`"
			:aria-valuemin="said.min"
			:aria-valuemax="said.max"
			:aria-valuenow="said.now"
			:aria-valuetext="spoken"
			v-on="listeners"
		>
			<template v-if="drawing.pieces === null">
				<div v-if="reading.fraction > 0" class="mt-fill" :class="paintClass(drawing.fill)" :style="fillStyle" />
				<div v-if="editable" class="mt-handle" :style="handleStyle" />
			</template>
			<span
				v-for="(piece, index) in drawing.pieces ?? []"
				v-else
				:key="index"
				class="mt-part"
				:class="[{ 'mt-on': piece.filled, 'mt-hint': index < hover }, paintClass(piece.paint)]"
				:style="
					piece.paint.color !== null ? { backgroundColor: piece.paint.color } : piece.paint.scale !== null ? { '--mt-at': piece.at } : undefined
				"
			/>
		</div>

		<div v-if="options.label !== null || options.indicator" class="mt-line">
			<span v-if="options.label !== null" :id="`${id}-caption`" class="mt-caption" v-text="options.label" />
			<span v-if="options.indicator" class="mt-text" aria-hidden="true">
				<span dir="ltr" v-text="reading.text" />
			</span>
		</div>
	</div>
</template>

<style scoped>
.meter {
	--mt-height: 0.75rem;

	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	justify-content: center;
	min-block-size: var(--theme--form--field--input--height);
	color: var(--theme--foreground);
}

.mt-track {
	flex: none;
	box-sizing: border-box;
	block-size: var(--mt-height);
	overflow: hidden;
	background-color: var(--theme--form--field--input--border-color);
	border-radius: calc(var(--mt-height) / 2);
}

.mt-fill {
	min-inline-size: var(--mt-height);
	block-size: 100%;
	background-color: var(--theme--primary);
	border-radius: inherit;
}

.mt-empty .mt-track {
	background-color: transparent;
	border: 1px dashed var(--theme--foreground-subdued);
}

.mt-strip {
	display: flex;
	flex: none;
	gap: 0.25rem;
	block-size: var(--mt-height);
	overflow: hidden;
}

.mt-segments {
	gap: 0.1875rem;
}

.mt-bars {
	gap: 0.125rem;
}

.mt-dots {
	gap: 0.375rem;
}

.mt-spread {
	gap: 0;
	justify-content: space-between;
}

.mt-part {
	flex: 1 1 0;
	box-sizing: border-box;
	min-inline-size: 0;
	background-color: var(--theme--form--field--input--border-color);
}

.mt-pills .mt-part {
	border-radius: calc(var(--mt-height) / 2);
}

.mt-segments .mt-part:first-child {
	border-start-start-radius: calc(var(--mt-height) / 2);
	border-end-start-radius: calc(var(--mt-height) / 2);
}

.mt-segments .mt-part:last-child {
	border-start-end-radius: calc(var(--mt-height) / 2);
	border-end-end-radius: calc(var(--mt-height) / 2);
}

.mt-dots .mt-part {
	flex: none;
	inline-size: var(--mt-height);
	border-radius: 50%;
}

.mt-paint {
	background-image: linear-gradient(to right, var(--mt-stops));
	background-repeat: no-repeat;
	background-position: calc(var(--mt-at, 0) * 100%) 0;
	background-size: calc(var(--mt-n, 1) * 100%) 100%;
}

.mt-weak {
	background-image: linear-gradient(to right, var(--mt-weak-stops));
}

.mt-scaled {
	container-type: inline-size;
}

.mt-fill.mt-paint {
	background-size: 100cqi 100%;
}

.mt-paint:dir(rtl) {
	background-image: linear-gradient(to left, var(--mt-stops));
	background-position: calc((1 - var(--mt-at, 0)) * 100%) 0;
}

.mt-weak:dir(rtl) {
	background-image: linear-gradient(to left, var(--mt-weak-stops));
}

.mt-on {
	background-color: var(--theme--primary);
}

.mt-empty .mt-part {
	background-color: transparent;
	border: 1px dashed var(--theme--foreground-subdued);
}

.mt-live {
	position: relative;
	cursor: pointer;
	touch-action: pan-y;
	user-select: none;
}

.mt-by-relative {
	cursor: ew-resize;
}

.meter .mt-live:focus-visible {
	outline: 2px solid var(--theme--form--field--input--border-color-focus);
	outline-offset: 2px;
}

.meter .mt-track.mt-live:focus-visible {
	border-radius: calc(var(--mt-height) / 2);
}

.mt-handle {
	position: absolute;
	inset-block-start: 0.125rem;
	box-sizing: border-box;
	inline-size: 0.5rem;
	block-size: 0.5rem;
	visibility: hidden;
	pointer-events: none;
	background-color: var(--theme--background);
	border: 1px solid var(--theme--foreground-subdued);
	border-radius: 50%;
}

.mt-live:hover .mt-handle,
.mt-live:focus-visible .mt-handle,
.mt-busy .mt-handle {
	visibility: visible;
}

.mt-hint {
	position: relative;
}

.mt-hint::after {
	position: absolute;
	inset: 0;
	content: '';
	background-color: var(--theme--foreground);
	border-radius: inherit;
	opacity: 0.25;
}

.mt-line {
	display: flex;
	flex-wrap: wrap;
	column-gap: 0.75rem;
	align-items: flex-start;
	line-height: 1.25rem;
}

.mt-caption {
	flex: 1 1 4rem;
	min-inline-size: 0;
	overflow-wrap: anywhere;
}

.mt-text {
	display: flex;
	flex: none;
	flex-wrap: wrap;
	max-inline-size: 100%;
	block-size: 1.25rem;
	margin-inline-start: auto;
	overflow: hidden;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

.mt-text::before {
	content: '\200B';
}
</style>
