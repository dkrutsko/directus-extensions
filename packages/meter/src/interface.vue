<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useId, watch } from 'vue';
import { useAppText, useLanguage } from './i18n';
import { useRatio } from './ratio';
import {
	barFit,
	canEdit,
	changes,
	drawingOf,
	fillStyle,
	filledAt,
	fractionOf,
	handleStart,
	inputMethod,
	keyValue,
	largeCount,
	numberOf,
	overStyle,
	paintClass,
	pieceCount,
	pieceGeometry,
	pieceLength,
	pieceStyle,
	pieceValue,
	positionAlong,
	reachOf,
	readEditing,
	readLook,
	readOptions,
	readingOf,
	relativeMove,
	rowStyle,
	saidOf,
	scaleOf,
	shareAt,
	sideways,
	snapValue,
	spreadLength,
	trackStyle,
	valueAtShare,
	writableRange,
} from './meter';
import type { Piece } from './meter';

/**
 * The Meter interface.
 *
 * An area as high as a stock input, with the track across its width and,
 * on a line under the track, the caption at the start and the value as text
 * at the end. There is no box around it.
 *
 * In a field which can be edited the track is a slider: the pointer and the
 * keys set the value. In a field which cannot (`disabled`, which is what
 * read-only comes to, `nonEditable` or `loading`), and where the input method
 * is `none`, it is a reading and nothing else: the same elements with the role
 * `meter`, no tab stop, no listener, no cursor, and nothing is ever emitted.
 * It is not dimmed either: a field which a flow keeps up to date is normally
 * read-only, and dimming it would dim nearly every meter.
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
	fieldData?: { name?: unknown; schema?: unknown } | null;
	min?: unknown;
	max?: unknown;
	minValue?: unknown;
	maxValue?: unknown;
	label?: unknown;
	indicator?: unknown;
	indicatorFormat?: unknown;
	prefix?: unknown;
	suffix?: unknown;
	color?: unknown;
	thresholds?: unknown;
	visualization?: unknown;
	subdivisions?: unknown;
	dotsLayout?: unknown;
	grow?: unknown;
	fade?: unknown;
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
//
// One bar is not cut and needs no width, so a meter which draws one bar is
// neither measured nor observed: `watched` holds only while the visualization
// has pieces. The element on the line is the same one in both cases.
const look = computed(() => readLook(props));
const line = shallowRef<HTMLElement | null>(null);
const width = shallowRef(0);
const watched = computed(() => look.value.visualization !== 'contiguous');
let observer: ResizeObserver | null = null;

function observe() {
	const element = line.value;

	observer?.disconnect();
	observer = null;

	if (!element || !watched.value) return;

	width.value = element.getBoundingClientRect().width;
	if (typeof ResizeObserver === 'undefined') return;

	observer = new ResizeObserver((entries) => {
		const entry = entries[entries.length - 1];
		if (entry) width.value = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
	});

	observer.observe(element);
}

onMounted(observe);

// After the page has been patched: a row which was a track until now is measured as the row it has become.
watch(watched, observe, { flush: 'post' });

onBeforeUnmount(() => {
	observer?.disconnect();
	observer = null;
});

// The width is read by three things and by nothing else: the count here, the two sizes of the bars and the
// reach, both below. Each comes to a number which changes only now and then, and a computed value which comes to
// the same number does not wake what depends on it, so the meter is drawn again when one of those numbers
// changes and not with every pixel of the width.
const ratio = useRatio();
const count = computed(() => pieceCount(look.value, options.value, 'form', width.value, ratio.value));

// Bars are drawn in whole device pixels, a bar as wide as every other and a gap as every other, and what the
// track is wider than that stays empty at its end (`barFit`). The two sizes change only when a bar gets a device
// pixel wider or narrower.
const fit = computed(() => (look.value.visualization === 'bars' && count.value >= 2 ? barFit('form', count.value, width.value, ratio.value) : null));
const barSize = computed(() => fit.value?.bar ?? null);
const barGap = computed(() => fit.value?.gap ?? null);

// Over how many pieces a piece grows or fades in before it is filled: by the number of `grow`, and by that of 1
// where the pieces only fade in. For thin bars it also depends on how wide a bar is, and so on the width; that part
// is a number of half pieces, which like the count changes only now and then, and it is asked for only where pieces
// grow or fade in, so a meter without that is still drawn again for nothing but its count.
const reach = computed(() => {
	const { visualization, grow, fade } = look.value;
	return grow > 0 || fade ? reachOf(visualization, 'form', count.value, width.value, grow > 0 ? grow : 1, ratio.value) : undefined;
});

// Where the pointer is along the track while it drags the value, as a fraction of the range: by its place for the
// `position` method, and by the value before it goes to the grid for the `relative` one. Pieces which grow or fade
// in are drawn from it, so they follow the pointer and not the steps the value takes, which for coarse steps are
// one or two sizes on the way to a piece. The fill, the text and what is written stay those of the value. `null`
// outside such a drag, and where nothing grows or fades in.
const exact = shallowRef<number | null>(null);
const drawing = computed(() =>
	drawingOf({
		look: look.value,
		options: options.value,
		reading: reading.value,
		count: count.value,
		value: props.value,
		reach: reach.value,
		at: exact.value,
	}),
);

// The colour stops of the scale are set once, on the root, for whichever
// surfaces paint with them.
const scales = computed(() => {
	const { stops, weakStops } = drawing.value;
	if (stops === null && weakStops === null) return undefined;

	return { '--mt-stops': stops ?? undefined, '--mt-weak-stops': weakStops ?? undefined };
});

// Pieces which grow or fade in change with a short transition when the value changes, by a press, a key or from
// outside. Not while the pointer drags the value, which they follow at once, and not for the first value a meter
// draws: the form hands over nothing until the item has loaded, and a transition from there would play on every
// page load. So the transition is switched on two frames after a value was first drawn.
const eased = shallowRef(false);
const following = shallowRef(false);
let easing = 0;

watch(
	() => (look.value.grow > 0 || look.value.fade) && !reading.value.empty,
	(drawn) => {
		cancelAnimationFrame(easing);
		eased.value = false;
		if (drawn) easing = requestAnimationFrame(() => (easing = requestAnimationFrame(() => (eased.value = true))));
	},
	{ immediate: true },
);

onBeforeUnmount(() => cancelAnimationFrame(easing));

// The element on the line of the track: the track of the one bar, or the row of pieces.
const lineStyle = computed(() => {
	const { pieces, track } = drawing.value;

	return pieces !== null ? rowStyle(pieces.length, barSize.value, barGap.value, 'mt') : trackStyle(track);
});

// The meter is named by its caption, which is on the page, or else by the
// name of its field, which the form prints above it.
const name = computed(() => {
	const field = props.fieldData?.name;
	return typeof field === 'string' && field.trim() !== '' ? field : 'Meter';
});

// `no_value` is what the app says for an empty field elsewhere.
const spoken = computed(() => (reading.value.empty ? t('no_value', 'No value') : reading.value.text));

// Editing. The pointer, the keys and `write` below are for a field which can
// be edited, and none of them is reached in one which cannot: the template
// binds the listeners, the tab stop and the role of a slider only while
// `editable` holds, every handler returns at once without it, and `write`
// checks it again. A meter whose input method is `none` is one which cannot,
// by `canEdit`, and so needs no check of its own anywhere below. `said`,
// `lined` and `lineClass`, further down, serve both kinds of field.
const editing = computed(() => readEditing(props, props.type, options.value, scaleOf(props.type, props.fieldData?.schema)));
const method = computed(() => inputMethod(editing.value, count.value, options.value));
const editable = computed(() => canEdit(props, method.value));

// How many pieces a press of the pointer would leave filled, while it rests over a meter in pieces which a press
// sets where the pointer is, by the piece or by the position (`largeCount`). Those are drawn larger than regular,
// by a transform like the one of pieces which grow: no box changes. `long` is how long a piece is along the track
// at that moment, which the size of pills and dots goes by. `pieceStyle` is handed both, as `near`, and decides
// for each piece.
const hover = shallowRef(0);
const long = shallowRef(0);
const near = computed(() => ({ count: hover.value, length: long.value }));

// While pieces are large, and for a moment after the last one stopped being so, the row lets them reach outside
// its box and eases their size (`mt-swell`). With no pointer on the meter the row has neither.
const swell = shallowRef(false);
const SETTLE = 250;
let settling: ReturnType<typeof setTimeout> | undefined;

onBeforeUnmount(() => clearTimeout(settling));

watch(hover, (now) => {
	clearTimeout(settling);

	if (now > 0) swell.value = true;
	else settling = setTimeout(() => (swell.value = false), SETTLE);
});
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
interface Frame {
	box: DOMRect;
	rtl: boolean;
	pieces: Piece[];
	length: number;
}

function frame(element: HTMLElement): Frame {
	const box = element.getBoundingClientRect();
	const rtl = getComputedStyle(element).direction === 'rtl';
	const { visualization, dotsLayout } = look.value;
	const cut = drawing.value.pieces?.length ?? 0;
	const pieces = cut > 0 && visualization !== 'contiguous' ? pieceGeometry(visualization, 'form', cut, box.width, dotsLayout, ratio.value) : [];

	return { box, rtl, pieces, length: spreadLength(pieces, box.width) };
}

// The frame of one event. Working it out asks the browser for a box and a computed style and lays out up to two
// hundred pieces, so a handler makes one of these and hands it on: the frame is worked out when it is first asked
// for, at most once, and not at all for an event which needs none (a pointer which rests on one bar).
function framed(element: HTMLElement): () => Frame {
	let made: Frame | null = null;
	return () => (made ??= frame(element));
}

// A point of the page, given by how far it is across the page, in pixels from the start side of the track.
const positionOf = (x: number, at: Frame) => positionAlong(x, at.box.left, at.box.right, at.rtl);

// Says where the pointer is to the pieces which grow or fade in (`exact`): a fraction of the range, or `null`.
function follow(place: number | null) {
	exact.value = place !== null && (look.value.grow > 0 || look.value.fade) && method.value !== 'piece' ? place : null;
}

// The value under a point of the page, given by how far it is across the page, by the method of the meter.
function valueUnder(x: number, at: Frame) {
	const position = positionOf(x, at);

	// By the piece: the value which leaves the pieces up to the pointer filled.
	if (method.value === 'piece' && at.pieces.length) return pieceValue(filledAt(position, at.pieces), at.pieces.length, options.value, editing.value);

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
	/** Where the pointer was last seen on the page, and whether it is a finger: for the large pieces after the drag. */
	x: number;
	y: number;
	touch: boolean;
	/**
	 * A finger which has come down and has neither moved sideways nor been lifted yet. It has written nothing: it
	 * may be the start of a scroll of the page. `startX` and `startY` are where it came down.
	 */
	pending: boolean;
	startX: number;
	startY: number;
}

// Works out which pieces are drawn large: those which a press of the pointer at a point of the page fills or
// would fill (`largeCount`, by the method and by what `valueUnder` says the press writes). A pointer which rests
// has to be on the track for that; one which is `held` down in a drag counts wherever it is, by its place along
// the track, as the fill does. A finger rests nowhere, and no piece is large for it. One bar has no pieces, and a
// relative press sets no value where the pointer is: for those no frame is asked for, as for a finger.
function enlargeUpTo(x: number, y: number, touch: boolean, frameOf: () => Frame, held = false) {
	if (!editable.value || touch || drawing.value.pieces === null || method.value === 'relative') {
		hover.value = 0;
		return;
	}

	const at = frameOf();
	const inside = held || (x >= at.box.left && x <= at.box.right && y >= at.box.top && y <= at.box.bottom);
	const piece = at.pieces[0];

	if (piece !== undefined) long.value = pieceLength(piece);
	hover.value = inside ? largeCount(method.value, positionOf(x, at), at.pieces, valueUnder(x, at), options.value) : 0;
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
		pending: event.pointerType === 'touch',
		startX: event.clientX,
		startY: event.clientY,
	};
	dragging.value = true;

	// The pieces which the press fills are large from the press on.
	const frameOf = framed(element);
	enlargeUpTo(event.clientX, event.clientY, event.pointerType === 'touch', frameOf, true);

	// The drag goes on when the pointer leaves the field.
	try {
		element.setPointerCapture(event.pointerId);
	} catch {
		// A pointer which is gone already: the drag ends with the next event.
	}

	// A mouse or a pen sets the value where it is pressed. A finger writes nothing by coming down: the first write
	// is that of a sideways drag, or of the finger being lifted where it came down.
	if (method.value !== 'relative') {
		if (!drag.pending) {
			const at = frameOf();
			follow(shareAt(positionOf(event.clientX, at), at.length));
			write(valueUnder(event.clientX, at));
		}

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

	const frameOf = framed(element);

	if (drag === null) {
		enlargeUpTo(event.clientX, event.clientY, event.pointerType === 'touch', frameOf);
		return;
	}

	if (event.pointerId !== drag.pointer) return;

	drag.x = event.clientX;
	drag.y = event.clientY;
	enlargeUpTo(drag.x, drag.y, drag.touch, frameOf, true);

	// A mouse which moves with no button held was released where the meter did not see it.
	if (event.pointerType === 'mouse' && event.buttons === 0) {
		finish(false);
		return;
	}

	// A finger has to have moved sideways first. From then on it is a drag like any other, and the relative method
	// counts its whole distance from where it came down.
	if (drag.pending) {
		if (!sideways(event.clientX - drag.startX, event.clientY - drag.startY)) return;
		drag.pending = false;
	}

	// From here the value follows the pointer, and pieces which grow follow it without a transition.
	following.value = true;
	const at = frameOf();

	if (method.value !== 'relative') {
		follow(shareAt(positionOf(event.clientX, at), at.length));
		write(valueUnder(event.clientX, at));
		return;
	}

	// A locked pointer does not move on the page; what it would have moved by is all it reports. The lock is
	// asked of the document here and now: the event which announces it comes after the first movement under it.
	const locked = document.pointerLockElement === element;
	if (locked) drag.locked = true;

	const moved = locked ? event.movementX : event.clientX - drag.lastX;
	drag.lastX = event.clientX;
	drag.raw = relativeMove(drag.raw, at.rtl ? -moved : moved, at.length, options.value, editing.value.sensitivity, event.shiftKey);
	follow(fractionOf(drag.raw, options.value));
	write(snapValue(drag.raw, options.value, editing.value));
}

// The end of a press. `restore` puts back what the field held before it.
function finish(restore: boolean) {
	const ended = drag;
	const element = line.value;
	if (ended === null) return;

	drag = null;
	dragging.value = false;
	following.value = false;

	// The sizes settle on what the value gives, eased like any change which is not the pointer's.
	follow(null);

	if (element) {
		try {
			if (element.hasPointerCapture(ended.pointer)) element.releasePointerCapture(ended.pointer);
		} catch {
			// The pointer is gone.
		}

		if (document.pointerLockElement === element) document.exitPointerLock();
	}

	// The large pieces are worked out again at once, for where the pointer is now, without waiting for it to move.
	if (element) enlargeUpTo(ended.x, ended.y, ended.touch, framed(element));
	else hover.value = 0;

	// A finger which never wrote has nothing to put back.
	if (restore && !ended.pending && editable.value && props.value !== ended.before) emit('input', ended.before);
}

function onPointerUp(event: PointerEvent) {
	const element = line.value;
	if (drag === null || event.pointerId !== drag.pointer) return;

	// A finger which is lifted without having dragged was a tap: it writes what a press there writes.
	if (drag.pending && element && method.value !== 'relative') write(valueUnder(drag.startX, frame(element)));

	finish(false);
}

// The browser took the pointer away, as it does when a finger starts to scroll the page: nothing was meant. For a
// finger nothing was written either, unless it had already dragged sideways.
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

// What the element says its range and its value are (`saidOf`): a slider the range which can be written, a meter
// which cannot be edited the range as it is stored.
const said = computed(() => saidOf(options.value, writableRange(options.value, editing.value), reading.value.now, editable.value));

// A taller target than the track, which is 0.75rem high. Above the track and under everything else are two
// elements (`mt-reach`) which take the room the area has free there, up to 0.5rem each: a press on the one above
// the track, on the gap between the track and the line of caption and text, or, where there is no such line, on
// the one below, is a press on the track at the same place along it. For a finger, and for any pointer which is
// coarse, a press anywhere in the area above the line of caption and text counts as well. Such a press is not
// left to the browser, which would take the focus away from the track and with it the keys, Escape among them:
// the track is given the focus.
const under = shallowRef<HTMLElement | null>(null);
const lined = computed(() => options.value.label !== null || options.value.indicator);

function pressBeside(event: PointerEvent) {
	const element = line.value;
	if (!editable.value || !element || !event.isPrimary || event.button !== 0) return;

	event.preventDefault();
	element.focus({ preventScroll: true });
	onPointerDown(event);
}

function onAreaDown(event: PointerEvent) {
	const element = line.value;
	if (!editable.value || !element) return;

	// What the track and its reach are pressed on themselves, they deal with themselves.
	const target = event.target instanceof Element ? event.target : null;
	if (target !== null && (element.contains(target) || target.closest('.mt-reach') !== null)) return;

	const coarse = event.pointerType === 'touch' || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);
	if (!coarse) return;

	// Not on the caption or the value text, nor under them.
	if (under.value && event.clientY >= under.value.getBoundingClientRect().top) return;

	pressBeside(event);
}

const areaListeners = computed(() => (editable.value ? { pointerdown: onAreaDown } : {}));

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

// The classes of the element on the line of the track. One which cannot be edited has none of the editing.
const lineClass = computed(() => {
	const { visualization, dotsLayout, grow, fade } = look.value;
	const { pieces, track, fill } = drawing.value;

	const drawn =
		pieces === null
			? ['mt-track', paintClass(track, 'mt'), { 'mt-scaled': fill.scale !== null }]
			: [
					'mt-strip',
					`mt-${visualization}`,
					{
						'mt-spread': visualization === 'dots' && dotsLayout === 'spread',
						'mt-fitted': barSize.value !== null,
						'mt-eased': (grow > 0 || fade) && eased.value && !following.value,
						'mt-swell': swell.value,
						'mt-tracking': following.value && exact.value !== null,
					},
				];

	return editable.value ? [...drawn, 'mt-live', `mt-by-${method.value}`, { 'mt-busy': dragging.value }] : drawn;
});

// A handle at the end of the fill of the one bar, inside the track, never past either end of it.
const handleStyle = computed(() => ({ insetInlineStart: handleStart(reading.value.fraction) }));

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
//   the two outer ends of the row round, bars 0.125rem apart and square. Bars
//   do not share the width in the end: sharing gives each a fraction of a
//   pixel, and the browser, which puts every edge on a device pixel, draws
//   some a pixel wider than others. The component works out a bar and a gap
//   in whole device pixels (`barFit` in meter.ts) and hands them to the row
//   as `--mt-bar` and `--mt-gap` (`mt-fitted`); the bars have that size, and
//   what is left of the track is empty at its end side. Dots
//   are circles as high as the track, which do not stretch: 0.25rem apart
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
//   drags of a finger for itself and leaves the up and down ones and a pinch
//   to the page (`touch-action: pan-y pinch-zoom`, on the whole area of a
//   meter which can be edited), and lets no drag select text. Its focus ring is
//   an outline in the colour of a focused input, which takes no room. The
//   app has a focus ring of its own for every `div` which takes the focus,
//   drawn inside the element and with square corners
//   (`div:not([contenteditable='true']):focus-visible`,
//   app/src/styles/_base.scss:52-60 in Directus 11.17.4):
//   the two rules of the ring are written with one class more than they
//   would need, to come before that one, and the second gives the track its
//   round ends back. None of the rules changes a size or a place: the area,
//   the caption, the text and the note of the form stay where they are.
// - The track is a small target, so more than the track takes a press. Two
//   more items of the column (`mt-reach`) stand above the track and under
//   everything else: `mt-above`, which is after the track in the markup and
//   drawn before it (`order`), so that the track stays the first child, and
//   `mt-below`. Each grows into the room the area has free, up to 0.5rem,
//   and has no height where there is none; the gap of the column next to
//   each is taken back by a negative margin. Two items which grow alike keep
//   the group in the middle of the area, exactly where centring puts it
//   without them, so nothing moves. Being items of the root, neither can
//   reach outside it, whatever the height of the area: under a caption of
//   several lines the track is at the top edge and the one above is nothing.
//   The 0.25rem between the track and the line of caption and text belong to
//   the target too, by a pseudo-element of `mt-above` laid under the track.
//   With a line under the track that is up to 0.5rem, the track and 0.25rem,
//   1.5rem in all, and `mt-below`, which then lies under the caption, takes
//   no press; without that line `mt-below` is right under the track and
//   takes them. None of it lies over the caption or the text, and the track
//   keeps its own events: the handle, the large pieces and the cursor under the
//   pointer are the track's. A finger gets the whole area above the line of
//   caption and text, by a listener on the root and not by a box.
// - The handle of the one bar is a dot inside the track at the end of the
//   fill, never past either end, which shows while the pointer is over the
//   track, while the track has the keyboard's focus and during a drag. It is
//   shown and hidden at once, without a transition.
// - The pieces which a press of the pointer would fill, by the piece or by
//   the position, are drawn larger than regular, by an inline transform like
//   that of pieces which grow, so no box changes: bars and segments half as
//   high again, dots a pixel on every side, pills a pixel at each end and a
//   third higher, with their corners set so that the ends stay half circles;
//   two pixels of a gap are left between two large dots or pills. They have
//   no class and no other colour.
//   The row clips what is outside its box (`overflow: hidden`), so while
//   pieces are large, and until the last has eased back, it has `mt-swell`:
//   nothing is clipped, and the size is eased like that of pieces which grow.
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
// - Pieces which grow (`grow`) are drawn at their size by a transform about
//   their middle, set on the piece itself: no box changes, so the pitch, the
//   gaps, where the pointer counts a piece and the height of the area are
//   what they are without it. A filled piece has no transform of its growth,
//   and a meter which does not grow its pieces has none anywhere, but for
//   the pieces up to the pointer (above).
// - The piece which fades in (`fade`) has one child (`mt-over`) which covers
//   it, painted as the piece will be once it is filled, at the opacity of
//   how far the value has come into it. It takes no press: the piece under
//   it does. Only that one piece has a child and the class `mt-under`; a
//   meter which does not fade has neither anywhere.
// - There are three transitions, 150ms each, and none for a user who asked
//   for less motion. Two are by the class `mt-eased` on the row: of the size
//   of pieces which grow and of the opacity of the piece which fades in,
//   not for the first value a meter draws and not while the pointer drags
//   the value. While the pointer drags, the sizes and the fading are worked
//   out from where the pointer is (`exact`), so they change with every
//   movement and need no transition; at the release they ease to what the
//   value gives. The third is by `mt-swell`: of the size and the corner radii
//   of the pieces up to the pointer (above). While the sizes go by where the
//   pointer is (`mt-tracking`), only the pieces up to the pointer (`mt-near`)
//   are eased, so a piece which grows still follows every movement; a piece
//   which stops being large is then at its growing size at once, which is
//   close to full there. A transition which is under way
//   when the next change comes is taken up by the browser from where it is.
//   Nothing else has one: the form hands over `null` until the item has
//   loaded, so a transition of the fill or of a colour would play on every
//   page load.
// - Everything above is painted with backgrounds, which a contrast theme of
//   the system takes away (`forced-colors: active`): every background colour
//   becomes that of the page and a gradient is dropped, which without rules
//   of its own leaves nothing of a meter but its text. There the track and
//   every piece which is not
//   filled are an outline in the colour of text (`CanvasText`) around the
//   colour of the page (`Canvas`), and the fill, a filled piece and what is
//   laid over the piece which fades in are the system's `Highlight`: filled is
//   told from not filled by the colour and, where a piece is wide enough for
//   it, by solid against hollow. No value keeps its dashes, in `GrayText`.
//   The handle is the page's colour with an outline of text, a pixel higher
//   since the track has a border there, and the focus ring is `Highlight`.
//   The colours of the options and of the thresholds give way to these: that
//   is what the mode is for, and why the rules are `!important`, which an
//   inline colour would otherwise win against. A system colour is left as it
//   is by the mode. Sizes, `grow` and `fade` are untouched: the track and the
//   pieces are border boxes, so an outline changes no size.
// - A browser prints no backgrounds unless it is asked to, so the root asks
//   (`print-color-adjust: exact`, which is inherited, with the older name
//   beside it): a printed form keeps its bars.
//
// The package's AGENTS.md, "How it works", has the rest.
</script>

<template>
	<div class="meter" :class="{ 'mt-empty': reading.empty, 'mt-open': editable, 'mt-lined': editable && lined }" :style="scales" v-on="areaListeners">
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
				<div
					v-if="reading.fraction > 0"
					class="mt-fill"
					:class="paintClass(drawing.fill, 'mt')"
					:style="fillStyle(drawing.fill, reading.fraction, 'mt')"
				/>
				<div v-if="editable" class="mt-handle" :style="handleStyle" />
			</template>
			<span
				v-for="(piece, index) in drawing.pieces ?? []"
				v-else
				:key="index"
				class="mt-part"
				:class="[{ 'mt-on': piece.filled, 'mt-under': piece.over !== null, 'mt-near': index < near.count }, paintClass(piece.paint, 'mt')]"
				:style="pieceStyle(piece, 'mt', index, look.visualization, near)"
			>
				<span v-if="piece.over !== null" class="mt-over" :class="paintClass(piece.over.paint, 'mt')" :style="overStyle(piece.over, piece.at, 'mt')" />
			</span>
		</div>

		<div v-if="editable" class="mt-reach mt-above" :class="`mt-by-${method}`" @pointerdown="pressBeside" />

		<div v-if="lined" ref="under" class="mt-line">
			<span v-if="options.label !== null" :id="`${id}-caption`" class="mt-caption" v-text="options.label" />
			<span v-if="options.indicator" class="mt-text" aria-hidden="true">
				<span dir="ltr" v-text="reading.text" />
			</span>
		</div>

		<div v-if="editable" class="mt-reach mt-below" :class="`mt-by-${method}`" @pointerdown="pressBeside" />
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
	-webkit-print-color-adjust: exact;
	print-color-adjust: exact;
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

.mt-fitted {
	gap: var(--mt-gap);
}

.mt-fitted .mt-part {
	flex: none;
	inline-size: var(--mt-bar);
}

.mt-dots {
	gap: 0.25rem;
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

.mt-under {
	position: relative;
}

.mt-over {
	position: absolute;
	inset: 0;
	pointer-events: none;
	background-color: var(--theme--primary);
	border-radius: inherit;
}

@media (prefers-reduced-motion: no-preference) {
	.mt-eased .mt-part {
		transition: transform 150ms ease-out;
	}

	.mt-swell .mt-part {
		transition:
			transform 150ms ease-out,
			border-radius 150ms ease-out;
	}

	.mt-swell.mt-tracking .mt-part:not(.mt-near) {
		transition: none;
	}

	.mt-eased .mt-over {
		transition: opacity 150ms ease-out;
	}
}

.mt-live {
	position: relative;
	cursor: pointer;
	touch-action: pan-y pinch-zoom;
	user-select: none;
}

.mt-open {
	touch-action: pan-y pinch-zoom;
}

.mt-reach {
	flex: 1 1 0;
	min-block-size: 0;
	max-block-size: 0.5rem;
	cursor: pointer;
	touch-action: pan-y pinch-zoom;
	user-select: none;
}

.mt-above {
	position: relative;
	order: -1;
	margin-block-end: -0.25rem;
}

.mt-below {
	margin-block-start: -0.25rem;
}

.mt-lined .mt-below {
	pointer-events: none;
}

.mt-lined .mt-above::after {
	position: absolute;
	inset-inline: 0;
	inset-block-start: calc(100% + var(--mt-height));
	block-size: 0.25rem;
	content: '';
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

.mt-swell {
	overflow: visible;
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

@media (forced-colors: active) {
	.mt-track,
	.mt-part {
		background-color: Canvas !important;
		background-image: none !important;
		border: 1px solid CanvasText;
	}

	.mt-fill,
	.mt-on,
	.mt-over {
		background-color: Highlight !important;
		background-image: none !important;
	}

	.mt-on {
		border-color: Highlight;
	}

	.mt-empty .mt-track,
	.mt-empty .mt-part {
		border: 1px dashed GrayText;
	}

	.mt-handle {
		inset-block-start: 0.0625rem;
		background-color: Canvas;
		border-color: CanvasText;
	}

	.meter .mt-live:focus-visible {
		outline-color: Highlight;
	}
}
</style>
