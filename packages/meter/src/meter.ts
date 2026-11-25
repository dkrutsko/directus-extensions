// The part of the bundle which needs no Vue, DOM or Directus: what a stored
// value and the options come to, how much of the track is filled, in which
// colour, and what the text beside it says. The interface and the display
// both work from it, and the unit tests run it in Node.

/** What the text beside the bar says. */
export type IndicatorFormat = 'percent' | 'value' | 'fraction';

/** How the track is drawn: as one bar, or cut into pieces which are each filled or not. */
export type Visualization = 'contiguous' | 'pills' | 'segments' | 'bars' | 'dots';

/** A visualization which cuts the track into pieces. */
export type Shape = Exclude<Visualization, 'contiguous'>;

/** Where dots stand: from the start side with a fixed gap, or from edge to edge with equal gaps. */
export type DotsLayout = 'packed' | 'spread';

/**
 * Where a colour comes from. `value`: one colour, that of the current value.
 * `steps`: every place on the scale has the colour a meter standing there
 * would have. `gradient`: the same colours, blended from one to the next.
 */
export type Coloring = 'value' | 'blend' | 'steps' | 'gradient';

/** The colouring of what is not filled: the plain track, that of what is filled, or one of its own. */
export type InactiveColoring = 'plain' | 'automatic' | Coloring;

/** Where a meter is drawn: the interface measures its width, the display has one fixed width. */
export type Place = 'form' | 'display';

/**
 * How the pointer sets the value. `contiguous`: the value is where the
 * pointer is along the track. `segment`: the pieces up to the one under the
 * pointer are filled. `relative`: the value moves by as much as the pointer
 * moves, from wherever it is pressed. `automatic` is one of the first two,
 * whichever suits what is drawn (`inputMethod`).
 */
export type InputMethod = 'automatic' | 'contiguous' | 'segment' | 'relative';

/** How a meter is edited, after `readEditing`. */
export interface Editing {
	input: InputMethod;
	/** The distance between two values which can be written, counted from the minimum. Above 0, and whole for a whole type. */
	step: number;
	/** How much of the range one track width of movement covers with the `relative` method. Above 0. */
	sensitivity: number;
	/** Whether the type of the field holds whole numbers only. */
	whole: boolean;
}

/** Which way a value goes to the grid of steps: to the nearest point, or to the next one below or above. */
export type Rounding = 'nearest' | 'down' | 'up';

/** How a meter is drawn, after `readLook`. */
export interface Look {
	visualization: Visualization;
	/** How many pieces were asked for, 2 or more, or `null` when none were. */
	subdivisions: number | null;
	dotsLayout: DotsLayout;
	activeColoring: Coloring;
	inactiveColoring: InactiveColoring;
}

/** The smallest a piece may get along the track, and the gap to the next one, in pixels. */
export interface PieceSize {
	piece: number;
	gap: number;
}

/** One piece of a track which is cut up: where it starts and ends, in pixels from the start side of the track. */
export interface Piece {
	start: number;
	end: number;
}

/** A place on the scale, as a share of the range from the minimum, and the colour which starts there. */
export interface Stop {
	at: number;
	color: string;
}

/**
 * What a surface is painted with. `color`: that one colour. `scale`: its own
 * part of the colours across the whole track, at full strength or faded.
 * Neither: what the styles give it, the track colour or the primary colour.
 */
export interface Paint {
	color: string | null;
	scale: 'full' | 'weak' | null;
}

/** One piece as it is drawn. `at` is where it stands among the pieces, 0 for the first and 1 for the last. */
export interface PieceDrawing {
	filled: boolean;
	at: number;
	paint: Paint;
}

/** Everything about the colours and pieces of one meter, after `drawingOf`. */
export interface Drawing {
	/** The colour stops across the whole track for a surface painted `full`, as the arguments of a CSS gradient. */
	stops: string | null;
	/** The same for a surface painted `weak`. */
	weakStops: string | null;
	/** The track of the one bar, which shows where nothing is filled. */
	track: Paint;
	/** The fill of the one bar. */
	fill: Paint;
	/** The pieces from the start side, or `null` for the one bar. */
	pieces: PieceDrawing[] | null;
}

/** From `value` upward the fill has `color`. */
export interface Threshold {
	value: number;
	color: string;
}

/** The options after `readOptions`: every one has a usable value. */
export interface Options {
	/** The value at which the track is empty. Never above `max`. */
	min: number;
	/** The value at which the track is full. */
	max: number;
	/** The caption, or `null` when there is none. */
	label: string | null;
	/** Whether the text beside the bar is drawn. */
	indicator: boolean;
	indicatorFormat: IndicatorFormat;
	/** The colour of the fill below every threshold. */
	color: string;
	/** In rising order of their values. */
	thresholds: Threshold[];
}

/** What is drawn for one value. */
export interface Reading {
	/** Whether the field holds no number. Nothing is filled then. */
	empty: boolean;
	/** How much of the track is filled, from 0 to 1. Always finite. */
	fraction: number;
	/** The value, kept within the range, for assistive technology. `null` without a value. */
	now: number | null;
	/** The text beside the bar: the value in the format of the options, or a dash without a value. */
	text: string;
	/** The colour of the fill. */
	color: string;
}

export const DEFAULT_MIN = 0;
export const DEFAULT_MAX = 100;
export const DEFAULT_FORMAT: IndicatorFormat = 'percent';
export const DEFAULT_COLOR = 'var(--theme--primary)';

/** The text of a field without a value. */
export const NO_VALUE = '—';

export const DEFAULT_VISUALIZATION: Visualization = 'contiguous';
export const DEFAULT_DOTS_LAYOUT: DotsLayout = 'packed';
export const DEFAULT_ACTIVE_COLORING: Coloring = 'value';
export const DEFAULT_INACTIVE_COLORING: InactiveColoring = 'plain';

/** The fewest pieces a track is cut into. With room for fewer the meter is one bar. */
export const MIN_SUBDIVISIONS = 2;

/**
 * The most pieces a track is ever cut into, whatever its width and whatever
 * was asked for: every piece is an element of the page.
 */
export const MAX_PIECES = 200;

/**
 * How narrow a piece may get and how far it is from the next, for each
 * visualization in each place. The width of the track divided by these is how
 * many pieces fit (`fitCount`). The styles of the two components draw the
 * same gaps, and dots of the same size.
 */
export const PIECE_SIZES: Record<Place, Record<Shape, PieceSize>> = {
	form: {
		pills: { piece: 20, gap: 4 },
		segments: { piece: 14, gap: 3 },
		bars: { piece: 3, gap: 2 },
		dots: { piece: 12, gap: 6 },
	},
	display: {
		pills: { piece: 8, gap: 2 },
		segments: { piece: 6, gap: 2 },
		bars: { piece: 2, gap: 1 },
		dots: { piece: 6, gap: 1.5 },
	},
};

/** The length of the display's bar, in pixels, which is the same in every row of a layout. */
export const DISPLAY_WIDTH = 72;

/** The colour of a track where nothing is filled. */
export const TRACK_COLOR = 'var(--theme--form--field--input--border-color)';

/**
 * How much of the track's colour is mixed into a colour to fade it, in
 * percent. One share for both themes: what is not filled stays clearly weaker
 * than what is, and still shows which colour it would have.
 */
export const FADE = 70;

export const DEFAULT_INPUT: InputMethod = 'automatic';
export const DEFAULT_STEP = 1;
export const DEFAULT_SENSITIVITY = 1;

/**
 * The most steps a range can hold and still have a grid, and the digits a
 * value is written with where it has none. Past a thousand million steps the
 * arithmetic of the grid no longer tells one step from the next.
 */
export const MAX_STEPS = 1e9;
export const FREE_DIGITS = 12;

/** How many steps the Page keys move, and how much finer the `relative` method is while Shift is held. */
export const PAGE_STEPS = 10;
export const FINE = 0.1;

const INPUTS: readonly unknown[] = ['automatic', 'contiguous', 'segment', 'relative'];
const WHOLE_TYPES: readonly unknown[] = ['integer', 'bigInteger'];

const FORMATS: readonly unknown[] = ['percent', 'value', 'fraction'];
const VISUALIZATIONS: readonly unknown[] = ['contiguous', 'pills', 'segments', 'bars', 'dots'];
const DOTS_LAYOUTS: readonly unknown[] = ['packed', 'spread'];
const COLORINGS: readonly unknown[] = ['value', 'blend', 'steps', 'gradient'];
const INACTIVE_COLORINGS: readonly unknown[] = ['plain', 'automatic', 'value', 'blend', 'steps', 'gradient'];

// A number as the API writes it: digits with an optional sign, fraction and
// exponent. Not hexadecimal, not "Infinity", not an empty text, each of which
// `Number()` would take.
const NUMERIC = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

// A colour is a hex colour or one of the app's theme variables, and nothing
// else, so it can be handed to CSS as it is. That leaves no room for a
// second declaration, a url() or a var() with a fallback.
const MAX_COLOR_LENGTH = 80;
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const THEME_COLOR = /^var\(--theme--[a-z0-9]+(?:--?[a-z0-9]+)*\)$/;

// Beyond these a number is written with an exponent: the digits of a larger
// one are not all true, and a smaller one would be a row of zeros.
const HUGE = 1e15;
const TINY = 1e-6;

/**
 * The number a value stands for, or `null`. A `decimal` or a `bigInteger`
 * field hands its value over as text on some databases, and the options form
 * of another interface may have stored a limit as text, so the text of a
 * number counts as that number. Anything which is not finite does not.
 */
export function numberOf(value: unknown): number | null {
	const number =
		typeof value === 'number' || typeof value === 'bigint'
			? Number(value)
			: typeof value === 'string' && NUMERIC.test(value.trim())
				? Number(value)
				: Number.NaN;

	// Adding zero turns `-0` into `0`.
	return Number.isFinite(number) ? number + 0 : null;
}

/** Whether a field holds nothing: `null`, no value at all, or text without a character in it. */
export function isEmpty(value: unknown): boolean {
	return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

/** Any value as text, for showing a value which is not a number. */
export function textOf(value: unknown): string {
	if (typeof value === 'string') return value;
	if (value === null || value === undefined) return '';

	if (typeof value === 'object') {
		try {
			return JSON.stringify(value) ?? String(value);
		} catch {
			return String(value);
		}
	}

	return String(value);
}

/** Whether a colour may reach CSS as it is. */
export function isColor(color: unknown): color is string {
	return typeof color === 'string' && color.length <= MAX_COLOR_LENGTH && (HEX_COLOR.test(color) || THEME_COLOR.test(color));
}

/** The colour of an option, or `null` when the option holds anything but a colour. */
function colorOf(color: unknown): string | null {
	const text = typeof color === 'string' ? color.trim() : color;
	return isColor(text) ? text : null;
}

/**
 * The thresholds of a field, from its `thresholds` option, which is untrusted:
 * it is whatever the schema holds. An entry which is not an object, whose
 * value is not a number or whose colour is not a colour is left out. The rest
 * comes out in rising order; of two with the same value the later one counts.
 * Anything which is not a list gives none.
 */
export function readThresholds(list: unknown): Threshold[] {
	if (!Array.isArray(list)) return [];

	const thresholds: Threshold[] = [];

	for (const entry of list as unknown[]) {
		if (typeof entry !== 'object' || entry === null) continue;

		const value = numberOf((entry as Record<string, unknown>)['value']);
		const color = colorOf((entry as Record<string, unknown>)['color']);
		if (value !== null && color !== null) thresholds.push({ value, color });
	}

	return thresholds.sort((a, b) => a.value - b.value);
}

type Source = Record<string, unknown>;

const sourceOf = (options: unknown): Source => (typeof options === 'object' && options !== null ? (options as Source) : {});

/** What the first source which has something usable has, or `null`. */
function first<T>(sources: Source[], pick: (source: Source) => T | null): T | null {
	for (const source of sources) {
		const found = pick(source);
		if (found !== null) return found;
	}

	return null;
}

/**
 * Works out every option, key by key. `own` are the options of the entry
 * itself. `inherited` are the options of the field's interface, which the
 * display falls back to for what its own options do not set, so a field is
 * configured once. Both are untrusted.
 *
 * For the limits, the caption, `indicator` and the format, anything unusable
 * counts as not set and falls through: a limit which is no number, a blank
 * caption, a format which is none of the three, and so an option which was
 * emptied (`null`) as well. The options form of the display shows what is
 * taken over as the placeholder of such an input, emptied or not.
 *
 * The colour and the thresholds fall back only while the key is missing. One
 * which is there counts, whatever it holds: an emptied colour (`null`) is the
 * default colour and an emptied list no thresholds. An options form shows the
 * colour and the list of the interface only until the key is stored, and
 * empty inputs afterwards, so anything else would draw what the form does
 * not show.
 *
 * A limit is `min` or `max`, the keys of this bundle and of the stock Input
 * (app/src/interfaces/input/index.ts:147, 156 in Directus 11.17.4), or else
 * `minValue` or `maxValue`, the keys of the stock Slider
 * (app/src/interfaces/slider/index.ts:16, 25). A field can hold both pairs,
 * because the app keeps the options of a field when its interface changes.
 * `min` and `max` then count, in each source, whatever the interface of the
 * field is: the stock Slider itself draws by them when its field has them,
 * since they reach the range input inside it past its own two options
 * (app/src/interfaces/slider/slider.vue:38-49). Each limit falls back on its
 * own, to the other pair, to the next source and at last to its default. A
 * minimum above the maximum counts as the two swapped.
 */
export function readOptions(own?: unknown, inherited?: unknown): Options {
	const mine = sourceOf(own);
	const theirs = sourceOf(inherited);
	const sources = [mine, theirs];

	const min = first(sources, (source) => numberOf(source['min']) ?? numberOf(source['minValue'])) ?? DEFAULT_MIN;
	const max = first(sources, (source) => numberOf(source['max']) ?? numberOf(source['maxValue'])) ?? DEFAULT_MAX;

	// The source of a key which falls back only while it is missing.
	const holder = (key: string) => (mine[key] !== undefined ? mine : theirs);

	return {
		min: Math.min(min, max),
		max: Math.max(min, max),
		label: first(sources, (source) => {
			const text = typeof source['label'] === 'string' ? source['label'].trim() : '';
			return text !== '' ? text : null;
		}),
		indicator: first(sources, (source) => (typeof source['indicator'] === 'boolean' ? source['indicator'] : null)) ?? true,
		indicatorFormat:
			first(sources, (source) => (FORMATS.includes(source['indicatorFormat']) ? (source['indicatorFormat'] as IndicatorFormat) : null)) ??
			DEFAULT_FORMAT,
		color: colorOf(holder('color')['color']) ?? DEFAULT_COLOR,
		thresholds: readThresholds(holder('thresholds')['thresholds']),
	};
}

/**
 * How many pieces an option asks for: a whole number, or the text of one, and
 * 2 where it is less. Anything else (nothing, junk, 3.7) asks for none in
 * particular, which is `null`. There is no largest number here: the width of
 * the track is what holds it back (`drawnCount`).
 */
function subdivisionsOf(value: unknown): number | null {
	const number = numberOf(value);
	if (number === null || !Number.isInteger(number)) return null;

	return Math.max(MIN_SUBDIVISIONS, number);
}

/**
 * Works out how a meter is drawn, from the options `visualization`,
 * `subdivisions`, `dotsLayout`, `activeColoring` and `inactiveColoring`, with
 * the same two sources as `readOptions`. Every one of these keys falls
 * through when it holds nothing usable, as the format and the limits do: a
 * word which is not one of its choices, a number of subdivisions which is no
 * whole number, and so an option which was emptied (`null`) as well. Without
 * a usable one anywhere the meter is one bar in the colour of its value, on a
 * plain track.
 *
 * The key is `visualization` and not `style`: the options of a field arrive
 * as the props of a component, and `style` is not a prop like any other in
 * Vue.
 */
export function readLook(own?: unknown, inherited?: unknown): Look {
	const sources = [sourceOf(own), sourceOf(inherited)];
	const oneOf = <T>(key: string, choices: readonly unknown[]) => first(sources, (source) => (choices.includes(source[key]) ? (source[key] as T) : null));

	return {
		visualization: oneOf<Visualization>('visualization', VISUALIZATIONS) ?? DEFAULT_VISUALIZATION,
		subdivisions: first(sources, (source) => subdivisionsOf(source['subdivisions'])),
		dotsLayout: oneOf<DotsLayout>('dotsLayout', DOTS_LAYOUTS) ?? DEFAULT_DOTS_LAYOUT,
		activeColoring: oneOf<Coloring>('activeColoring', COLORINGS) ?? DEFAULT_ACTIVE_COLORING,
		inactiveColoring: oneOf<InactiveColoring>('inactiveColoring', INACTIVE_COLORINGS) ?? DEFAULT_INACTIVE_COLORING,
	};
}

/**
 * Works out how a meter is edited, from the options `input`, `step` and
 * `sensitivity` of the interface and the type of its field. All untrusted.
 *
 * The step is `step`. Where that is not set (missing, emptied or blank), it
 * is `stepInterval`, the key of the stock Slider
 * (app/src/interfaces/slider/index.ts in Directus 11.17.4), which a field
 * keeps when its interface changes, as it keeps the Slider's limits. A step
 * which is set and is not a number above zero is 1, and so is everything
 * without either. A field of a whole type has a whole step of at least 1.
 */
export function readEditing(own?: unknown, type?: unknown): Editing {
	const source = sourceOf(own);
	const whole = WHOLE_TYPES.includes(type);
	const positive = (value: unknown) => {
		const number = numberOf(value);
		return number !== null && number > 0 ? number : null;
	};

	const stepOf = (key: string) => (isEmpty(source[key]) ? null : (positive(source[key]) ?? DEFAULT_STEP));
	const step = stepOf('step') ?? stepOf('stepInterval') ?? DEFAULT_STEP;

	return {
		input: INPUTS.includes(source['input']) ? (source['input'] as InputMethod) : DEFAULT_INPUT,
		step: whole ? Math.max(1, Math.round(step)) : step,
		sensitivity: positive(source['sensitivity']) ?? DEFAULT_SENSITIVITY,
		whole,
	};
}

/**
 * Whether a field can be edited, by what the form says about it: not while it
 * is disabled, which is what read-only comes to, be it by the settings of the
 * field, by a condition, by the permissions of the user or in a batch edit;
 * not where it is shown and not edited, as in the comparison of revisions;
 * and not while it is loading. Each of the three alone is enough.
 */
export function canEdit(state: { disabled?: unknown; nonEditable?: unknown; loading?: unknown }): boolean {
	return !state.disabled && !state.nonEditable && !state.loading;
}

/**
 * Whether writing a number would change what a field holds. What it holds is
 * compared as the number it stands for, so the text of a decimal is no
 * change, and a field without a value is changed by any number.
 */
export function changes(held: unknown, next: number): boolean {
	return numberOf(held) !== next;
}

type Range = Pick<Options, 'min' | 'max'>;

/**
 * Where a value stands in a range of two different numbers: 0 at the minimum,
 * 1 at the maximum, less or more outside. The plain difference of two very
 * large numbers is not finite, so those are halved first.
 */
function shareOf(value: number, range: Range): number {
	let span = range.max - range.min;
	let offset = value - range.min;

	if (!Number.isFinite(span) || !Number.isFinite(offset)) {
		span = range.max / 2 - range.min / 2;
		offset = value / 2 - range.min / 2;
	}

	return offset / span;
}

/**
 * How much of the track is filled, from 0 to 1: the bar never leaves its
 * track. A range of one number is empty below that number and full from it
 * upward.
 */
export function fractionOf(value: number, range: Range): number {
	if (value >= range.max) return 1;
	if (value <= range.min) return 0;
	return Math.min(1, Math.max(0, shareOf(value, range)));
}

/**
 * The percentage as a whole number. It is not kept within the range: 150 of
 * 100 is 150, and the number is then what says that the value is beyond it.
 * A value strictly inside the range is never 0 or 100, so "nothing" and
 * "done" are not claimed too early.
 */
export function percentOf(value: number, range: Range): number {
	if (range.max === range.min) return value >= range.max ? 100 : 0;

	const exact = shareOf(value, range) * 100;
	if (!Number.isFinite(exact)) return exact > 0 ? Number.MAX_VALUE : -Number.MAX_VALUE;

	const whole = Math.round(exact);
	const inside = value > range.min && value < range.max;

	return (inside ? Math.min(99, Math.max(1, whole)) : whole) + 0;
}

const STYLES = {
	number: { maximumFractionDigits: 2 },
	small: { maximumSignificantDigits: 2 },
	exponent: { notation: 'scientific', maximumFractionDigits: 2 },
	percent: { style: 'percent', maximumFractionDigits: 0 },
	percentExponent: { style: 'percent', notation: 'scientific', maximumFractionDigits: 2 },
} satisfies Record<string, Intl.NumberFormatOptions>;

// A formatter is costly to make and a table makes one text per row.
const formatters = new Map<string, Intl.NumberFormat>();

function format(number: number, style: keyof typeof STYLES, locale?: string): string {
	const key = `${locale ?? ''} ${style}`;
	let formatter = formatters.get(key);

	if (!formatter) {
		try {
			formatter = new Intl.NumberFormat(locale || undefined, STYLES[style]);
		} catch {
			// Not a language tag: the language of the browser then.
			formatter = new Intl.NumberFormat(undefined, STYLES[style]);
		}

		formatters.set(key, formatter);
	}

	return formatter.format(number);
}

/**
 * A number as text in a language: grouped, with at most two decimals, or two
 * digits which count for a number below 1, so 0.004 is not "0". `locale` is a
 * language tag such as `de-DE`; without one it is the language of the browser.
 */
export function formatNumber(number: number, locale?: string): string {
	const size = Math.abs(number);

	if (size >= HUGE || (size > 0 && size < TINY)) return format(number, 'exponent', locale);
	return format(number, size < 1 ? 'small' : 'number', locale);
}

/** A whole percentage as text in a language, which decides where the sign goes. */
export function formatPercent(percent: number, locale?: string): string {
	if (Math.abs(percent) >= HUGE) return format(percent / 100, 'percentExponent', locale);
	return format(percent / 100, 'percent', locale);
}

/** The text beside the bar for a number: "58%", "7" or "7 / 12". */
export function valueText(value: number, options: Pick<Options, 'min' | 'max' | 'indicatorFormat'>, locale?: string): string {
	if (options.indicatorFormat === 'value') return formatNumber(value, locale);
	if (options.indicatorFormat === 'fraction') return `${formatNumber(value, locale)} / ${formatNumber(options.max, locale)}`;
	return formatPercent(percentOf(value, options), locale);
}

/**
 * How many pieces are wanted, before the width has its say: the number which
 * was asked for, or else one for every unit of the range where the range is a
 * whole number of at least 2, so a meter from 0 to 5 wants five. Any other
 * range (not whole, smaller, or of one number) wants none in particular,
 * which is `null`: as many as fit are drawn then.
 */
export function wantedCount(look: Pick<Look, 'subdivisions'>, range: Range): number | null {
	if (look.subdivisions !== null) return look.subdivisions;

	const span = range.max - range.min;
	return Number.isInteger(span) && span >= MIN_SUBDIVISIONS ? span : null;
}

/**
 * How many pieces of a visualization fit into a track of `width` pixels: each
 * at its smallest, with the gaps between them. Never more than the cap of the
 * package. A track without a width, as in a tab which is not shown, has room
 * for none.
 */
export function fitCount(visualization: Shape, place: Place, width: number): number {
	const { piece, gap } = PIECE_SIZES[place][visualization];
	if (!(width > 0)) return 0;

	// A measured width may be a hair under the whole number it stands for.
	const count = Math.floor((width + gap) / (piece + gap) + 1e-6);
	return Number.isFinite(count) ? Math.min(MAX_PIECES, count) : MAX_PIECES;
}

/**
 * How many pieces are drawn, from how many are wanted and how many fit. What
 * is wanted is drawn where it fits. Where it does not, the largest number of
 * at least 2 which fits and divides it, so that every piece stands for a
 * round share: 25 for 100 wanted with room for 29, 6 for 12 with room for 7.
 * A number which nothing divides (a prime), and no wanted number at all, give
 * as many as fit. With room for fewer than two there are no pieces, which is
 * 0: the meter is one bar then.
 */
export function drawnCount(wanted: number | null, fit: number): number {
	const room = Math.min(MAX_PIECES, Math.floor(fit));

	if (!(room >= MIN_SUBDIVISIONS)) return 0;
	if (wanted === null || !(wanted >= MIN_SUBDIVISIONS)) return room;
	if (wanted <= room) return wanted;

	for (let count = room; count >= MIN_SUBDIVISIONS; count--) {
		if (wanted % count === 0) return count;
	}

	return room;
}

/**
 * How many pieces a meter is cut into in a track of `width` pixels: 0 for one
 * bar, which is what `contiguous` is and what is left where fewer than two
 * pieces fit. The display hands over its fixed width, so every row of a
 * layout comes to the same number.
 */
export function pieceCount(look: Pick<Look, 'visualization' | 'subdivisions'>, range: Range, place: Place, width: number): number {
	if (look.visualization === 'contiguous') return 0;
	return drawnCount(wantedCount(look, range), fitCount(look.visualization, place, width));
}

/**
 * Where each of `count` pieces starts and ends in a track of `width` pixels,
 * from the start side, which is the right in a right-to-left page. Pills,
 * segments and bars share the width equally, with their gap between them.
 * Dots keep their size: packed they stand from the start with their gap,
 * spread the first is at the start edge, the last at the end edge, and the
 * gaps between are equal. The styles of the components lay the pieces out by
 * the same rules; this is the same thing as numbers, for whatever has to find
 * the piece under a point.
 */
export function pieceGeometry(visualization: Shape, place: Place, count: number, width: number, dotsLayout: DotsLayout = DEFAULT_DOTS_LAYOUT): Piece[] {
	const { piece, gap } = PIECE_SIZES[place][visualization];
	if (!(count >= 1) || !(width > 0)) return [];

	const dots = visualization === 'dots';
	const size = dots ? piece : (width - gap * (count - 1)) / count;
	const between = dots && dotsLayout === 'spread' && count > 1 ? (width - count * size) / (count - 1) : gap;

	return Array.from({ length: count }, (_, index) => {
		const start = index * (size + between);
		return { start, end: start + size };
	});
}

/**
 * The range of the values which can be written to a field: the range as it
 * is drawn, and for a field of a whole type the whole numbers within it, from
 * the first to the last. Everything which edits works in this range: the grid
 * of steps starts at its minimum, a key starts from its nearer end for a
 * value from outside, and it is the range a slider announces. `null` where
 * it holds no value at all, as a range from 0.2 to 0.8 holds no whole number.
 * What is drawn keeps to the range as it is stored.
 */
export function writableRange(range: Range, editing: Pick<Editing, 'whole'>): Range | null {
	const min = editing.whole ? Math.ceil(range.min) : range.min;
	const max = editing.whole ? Math.floor(range.max) : range.max;

	return Number.isFinite(min) && Number.isFinite(max) && max >= min ? { min: min + 0, max: max + 0 } : null;
}

/** How many digits a number has after its decimal point, as it is written out. */
function decimalsOf(number: number): number {
	const [mantissa = '', exponent = '0'] = String(number).toLowerCase().split('e');
	return Math.max(0, (mantissa.split('.')[1] ?? '').length - Number(exponent));
}

/**
 * The value which is written for a value which was asked for: on the grid of
 * steps counted from the minimum, never outside the range, and never anything
 * but a finite number. The maximum can always be written, also where the grid
 * misses it: with steps of 3 from 0 to 10 the values are 0, 3, 6, 9 and 10.
 *
 * `rounding` says which of the two values around the one asked for it is: the
 * nearer one, with the upper one for a value half way; or the next one below
 * or above, which is what a key press wants, so that a step up from a value
 * between two points of the grid goes to the next point and not past it.
 *
 * The result has no more decimals than the step, the minimum and the maximum
 * have between them, so a step of 0.1 gives 0.3 and not 0.30000000000000004.
 * A field of a whole type gets a whole number, from a grid which starts at
 * the first whole number of the range. Where the range holds no value which
 * can be written, or the value asked for is not a number, there is nothing to
 * write, which is `null`.
 *
 * Two kinds of step have no grid. One larger than the range leaves the two
 * ends of the range, and the nearer is written. One so small that the range
 * holds more than `MAX_STEPS` of it is no step at all: the value within the
 * range is written, rounded to `FREE_DIGITS` digits which count.
 */
export function snapValue(value: number, range: Range, editing: Pick<Editing, 'step' | 'whole'>, rounding: Rounding = 'nearest'): number | null {
	const writable = writableRange(range, editing);
	const step = editing.step;

	if (writable === null || !Number.isFinite(value) || !(step > 0)) return null;

	const { min, max } = writable;

	const within = Math.min(max, Math.max(min, value));
	const span = max - min;

	// Limits too far apart to subtract: no grid can be counted, and the value within the range is all there is.
	if (!Number.isFinite(span)) return (editing.whole ? Math.round(within) : within) + 0;

	// How many steps the range holds. A step larger than the range leaves two values which can be written, the
	// two ends, and the nearer one is written.
	const held = span / step;

	if (!(held >= 1)) {
		if (within <= min) return min;
		if (within >= max) return max;
		if (rounding !== 'nearest') return rounding === 'down' ? min : max;
		return within - min < max - within ? min : max;
	}

	// More steps than can be counted with any meaning: there is no grid, and the value within the range is
	// written, with the digits which mean something.
	if (!(held <= MAX_STEPS)) {
		const rounded = Number(within.toPrecision(FREE_DIGITS));
		const free = Math.min(max, Math.max(min, editing.whole ? Math.round(rounded) : rounded));
		return Number.isFinite(free) ? free + 0 : null;
	}

	// A hair of slack, so that 0.3 counts as three steps of 0.1 and not as 2.9999999999999996.
	const SLACK = 1e-9;
	const steps = (within - min) / step;
	const lastIndex = Math.floor(span / step + SLACK);
	const last = min + lastIndex * step;

	let snapped: number;

	if (within >= max) {
		snapped = max;
	} else if (steps >= lastIndex) {
		// Between the last point of the grid and the maximum.
		const beyond = steps - lastIndex > SLACK;
		if (rounding === 'down' || !beyond) snapped = last;
		else if (rounding === 'up') snapped = max;
		else snapped = within - last < max - within ? last : max;
	} else {
		const index = rounding === 'down' ? Math.floor(steps + SLACK) : rounding === 'up' ? Math.ceil(steps - SLACK) : Math.round(steps);
		snapped = min + index * step;
	}

	const decimals = Math.max(decimalsOf(step), decimalsOf(min), decimalsOf(max));
	const clean = editing.whole ? Math.round(snapped) : decimals <= 15 ? Number(snapped.toFixed(decimals)) : snapped;
	const written = Math.min(max, Math.max(min, clean));

	return Number.isFinite(written) ? written + 0 : null;
}

/** The value at a share of the range: the minimum at 0, the maximum at 1, and nothing beyond them. */
export function valueAtShare(share: number, range: Range): number {
	if (!(share > 0)) return range.min;
	if (share >= 1) return range.max;

	const offset = share * (range.max - range.min);
	return Number.isFinite(offset) ? range.min + offset : range.min * (1 - share) + range.max * share;
}

/**
 * Where a point stands along a track of `length` pixels, as a share from 0 to
 * 1. `position` is in pixels from the start side of the track, which is the
 * right in a right-to-left page.
 */
export function shareAt(position: number, length: number): number {
	if (!(length > 0) || !(position > 0)) return 0;
	return Math.min(1, position / length);
}

/**
 * How many pieces a point fills with the `segment` method: all up to and
 * including the piece it is on. A point in a gap counts for the piece before
 * it. A point before the start of the first piece fills none, and one beyond
 * the last piece all of them, wherever the track itself ends: packed dots end
 * long before their track does.
 */
export function filledAt(position: number, pieces: Piece[]): number {
	let filled = 0;

	for (const piece of pieces) {
		if (!(position >= piece.start)) break;
		filled++;
	}

	return filled;
}

/**
 * The method by which the pointer sets the value of a meter which is drawn
 * with `count` pieces (below 2: one bar). `relative` is only ever chosen by
 * the option. One bar has no pieces to fill, so `segment` is `contiguous`
 * there. `automatic` fills pieces where each piece stands for exactly one
 * step, which is where a click on the third piece can mean nothing but three
 * steps; where a piece stands for more or less than a step, as for a range of
 * a hundred drawn in ten pieces, it takes the value under the pointer, so
 * that every value of the grid can be reached. A piece is a step only where
 * the limits themselves can be written: a whole type from 0.5 to 5.5 draws
 * five pieces over a range of which only 1 to 5 can be written, and takes
 * the value under the pointer.
 */
export function inputMethod(editing: Pick<Editing, 'input' | 'step' | 'whole'>, count: number, range: Range): Exclude<InputMethod, 'automatic'> {
	if (editing.input === 'relative') return 'relative';
	if (!(count >= MIN_SUBDIVISIONS) || editing.input === 'contiguous') return 'contiguous';
	if (editing.input === 'segment') return 'segment';

	// A piece is a step only where the pieces are drawn over the very range which can be written.
	const writable = writableRange(range, editing);
	if (writable === null || writable.min !== range.min || writable.max !== range.max) return 'contiguous';

	const span = range.max - range.min;
	return Math.abs(count * editing.step - span) <= 1e-9 * Math.max(1, Math.abs(span)) ? 'segment' : 'contiguous';
}

/**
 * The value which is written when the pointer fills `filled` of `count`
 * pieces with the `segment` method. The press is on a piece, so that piece is
 * what has to be filled afterwards: of the values which can be written and
 * which draw exactly that many pieces, the one nearest to that share of the
 * range. Where a piece is one step that is the share itself. Where no value
 * draws that many, as with more pieces than there are steps, it is the value
 * nearest to the share. `null` where nothing can be written.
 */
export function segmentValue(filled: number, count: number, range: Range, editing: Pick<Editing, 'step' | 'whole'>): number | null {
	if (!(count >= 1)) return null;

	const target = valueAtShare(Math.min(count, Math.max(0, filled)) / count, range);
	const nearest = snapValue(target, range, editing);
	if (nearest === null) return null;

	// Of the values which can be written, those which draw the pieces asked for lie together around the target,
	// so the nearest of them is the one next to the target on one side or the other.
	const draws = (value: number | null): value is number => value !== null && filledCount(fractionOf(value, range), count) === filled;
	const around = [nearest, snapValue(target, range, editing, 'down'), snapValue(target, range, editing, 'up')].filter(draws);

	return around.length ? around.reduce((best, value) => (Math.abs(value - target) < Math.abs(best - target) ? value : best)) : nearest;
}

/**
 * The `relative` method: the value before it is put on the grid, after the
 * pointer has moved by `movement` pixels towards the end side (negative:
 * towards the start side) along a track of `length` pixels. One length of the
 * track is the whole range at a sensitivity of 1, and a tenth of it while
 * `fine` (Shift) is held. The value stays within the range. It is kept from
 * one movement to the next as it is, not as it was written, so a slow
 * movement of less than a step at a time still adds up.
 */
export function relativeMove(raw: number, movement: number, length: number, range: Range, sensitivity: number, fine = false): number {
	const from = Math.min(range.max, Math.max(range.min, raw));
	if (!(length > 0) || !Number.isFinite(movement) || !Number.isFinite(from)) return Number.isFinite(from) ? from : range.min;

	const moved = from + (movement / length) * (range.max - range.min) * sensitivity * (fine ? FINE : 1);
	return Number.isFinite(moved) ? Math.min(range.max, Math.max(range.min, moved)) : from;
}

/**
 * The value a key asks for, or `undefined` for a key which is none of the
 * meter's. Right and Up are one step up, Left and Down one step down, with
 * Left and Right the other way round in a right-to-left page. Page Up and
 * Page Down are ten steps, or one piece where a piece is more than that. Home
 * and End are the two ends of what can be written. A step is counted from
 * the value as it is. A value from outside the range is first brought to the
 * nearer end of what can be written, and a field without a value starts at
 * the minimum of it; a value between two points of the grid goes to the next
 * point. A key of the meter's where nothing can be written gives `null`.
 */
export function keyValue(key: string, current: number | null, range: Range, editing: Pick<Editing, 'step' | 'whole'>, count = 0, rtl = false): number | null | undefined {
	const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
	const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
	const writable = writableRange(range, editing);

	const known = ['Home', 'End', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
	if (!known.includes(key)) return undefined;
	if (writable === null) return null;

	const piece = count >= MIN_SUBDIVISIONS ? (writable.max - writable.min) / count : 0;
	const page = Math.max(PAGE_STEPS * editing.step, Number.isFinite(piece) ? piece : 0);

	if (key === 'Home') return snapValue(writable.min, range, editing);
	if (key === 'End') return snapValue(writable.max, range, editing);

	const delta = key === forward || key === 'ArrowUp' ? editing.step : key === backward || key === 'ArrowDown' ? -editing.step : key === 'PageUp' ? page : -page;

	// A value from outside the range is first brought to the nearer end of what can be written; the key counts from there.
	const from = current === null || !Number.isFinite(current) ? writable.min : Math.min(writable.max, Math.max(writable.min, current));
	return snapValue(from + delta, range, editing, delta > 0 ? 'down' : 'up');
}

/**
 * How many of `count` pieces are filled for a fraction of the track, the one
 * the bar is filled to: the nearest whole number of them. No piece is ever
 * filled in part, so 44 of 100 fills four of ten and 45 fills five. The text
 * beside it still says the value as it is.
 */
export function filledCount(fraction: number, count: number): number {
	return Math.min(count, Math.max(0, Math.round(fraction * count)));
}

/**
 * The colour of the fill for a value: that of the highest threshold the value
 * has reached, and the `color` option below all of them.
 */
export function colorFor(value: number, options: Pick<Options, 'color' | 'thresholds'>): string {
	let color = options.color;

	for (const threshold of options.thresholds) {
		if (value < threshold.value) break;
		color = threshold.color;
	}

	return color;
}

/**
 * What is drawn for a value. A value which is not a number, `null` among
 * them, is a meter without a reading: nothing filled, and a dash as its text.
 */
export function readingOf(value: unknown, options: Options, locale?: string): Reading {
	const number = numberOf(value);

	if (number === null) return { empty: true, fraction: 0, now: null, text: NO_VALUE, color: options.color };

	return {
		empty: false,
		fraction: fractionOf(number, options),
		now: Math.min(options.max, Math.max(options.min, number)),
		text: valueText(number, options, locale),
		color: colorFor(number, options),
	};
}

/** A colour mixed towards the colour of the track, by the one share of the package. The browser does the mixing: a colour may be a theme variable. */
export function fadedColor(color: string): string {
	return `color-mix(in srgb, ${color} ${100 - FADE}%, ${TRACK_COLOR})`;
}

/**
 * The colours along the scale: the colour of a meter at its minimum, at 0,
 * and after it every threshold above the minimum, at its share of the range,
 * in rising order. A threshold beyond the maximum is among them, beyond 1.
 * One stop only means one colour everywhere: no thresholds, or none above the
 * minimum, or a range of one number.
 */
export function scaleStops(options: Pick<Options, 'min' | 'max' | 'color' | 'thresholds'>): Stop[] {
	const stops: Stop[] = [{ at: 0, color: colorFor(options.min, options) }];
	if (!(options.max > options.min)) return stops;

	for (const threshold of options.thresholds) {
		if (threshold.value <= options.min) continue;

		const at = shareOf(threshold.value, options);
		const last = stops[stops.length - 1]!;

		if (!Number.isFinite(at)) continue;

		// Of two thresholds at one value the later one counts, as for the colour of a value.
		if (last.at === at) last.color = threshold.color;
		else stops.push({ at, color: threshold.color });
	}

	return stops;
}

/**
 * The stops as the arguments of a CSS gradient across the whole track. For
 * `gradient` each colour stands at its place and the browser blends from one
 * to the next. For `steps` each colour holds up to the next place, where it
 * changes at once. `faded` mixes every colour towards the track.
 */
export function stopsCss(stops: Stop[], coloring: 'steps' | 'gradient', faded = false): string {
	const colorOf = (stop: Stop) => (faded ? fadedColor(stop.color) : stop.color);
	const placeOf = (stop: Stop) => `${Number((Math.min(1e4, Math.max(-1e4, stop.at)) * 100).toFixed(3))}%`;

	if (coloring === 'gradient') return stops.map((stop) => `${colorOf(stop)} ${placeOf(stop)}`).join(', ');

	return stops
		.slice(1)
		.map((stop, index) => `${colorOf(stops[index]!)} ${placeOf(stop)}, ${colorOf(stop)} ${placeOf(stop)}`)
		.join(', ');
}

/** Two neighbouring colours of the scale, and how far a place is from the first towards the second, from 0 to 1. */
export interface Blend {
	from: string;
	to: string;
	share: number;
}

/**
 * The colour of the scale at one place, as the gradient has it there: the
 * two stops around the place and the share of the way from one to the other.
 * Before the first stop it is the first colour, on a stop that stop's colour,
 * and from the last stop on the last colour. `place` is a share of the range
 * from the minimum, and may lie outside 0 to 1, as the stops may.
 */
export function blendAt(stops: Stop[], place: number): Blend {
	const first = stops[0];
	if (first === undefined) return { from: DEFAULT_COLOR, to: DEFAULT_COLOR, share: 0 };
	if (!(place > first.at)) return { from: first.color, to: first.color, share: 0 };

	for (let index = 1; index < stops.length; index++) {
		const from = stops[index - 1]!;
		const to = stops[index]!;
		if (place < to.at) return { from: from.color, to: to.color, share: (place - from.at) / (to.at - from.at) };
	}

	const last = stops[stops.length - 1]!;
	return { from: last.color, to: last.color, share: 0 };
}

/** A blend as one CSS colour. The browser does the mixing, as it does for a faded colour: a stop may be a theme variable. */
export function blendCss(blend: Blend): string {
	if (!(blend.share > 0) || blend.from === blend.to) return blend.from;
	if (blend.share >= 1) return blend.to;

	return `color-mix(in srgb, ${blend.from} ${Number(((1 - blend.share) * 100).toFixed(2))}%, ${blend.to})`;
}

/** The value a piece reaches when it is filled completely: the maximum for the last of them. */
function valueAtPiece(index: number, count: number, range: Range): number {
	if (index + 1 >= count) return range.max;

	// Multiplied first, so that the 57th of a hundred pieces on 0 to 100 reaches 57 and not a hair less.
	const offset = ((index + 1) * (range.max - range.min)) / count;
	if (Number.isFinite(offset)) return range.min + offset;

	const share = (index + 1) / count;
	return range.min * (1 - share) + range.max * share;
}

const NO_PAINT: Paint = { color: null, scale: null };

/**
 * The colours and the pieces of a meter. `count` is how many pieces the track
 * is cut into (`pieceCount`); below 2 it is one bar.
 *
 * What is filled is coloured by `activeColoring`. `value`: the colour of the
 * current value, everywhere. `blend`: one colour everywhere as well, but the
 * one the gradient has at the place of the current value, so that it shifts
 * towards the colour of a threshold as the value comes near it instead of
 * changing at it; `value` is the stored value, for its place, which may be
 * beyond the range as the stops may. `steps`: a piece has the colour of the value it
 * reaches when it is filled completely, and the one bar changes colour at
 * each threshold. `gradient`: the colours of the scale blended across the
 * whole track, of which a piece or the fill shows its own part; the blend is
 * never squeezed into what is filled.
 *
 * What is not filled is the plain track, or coloured by `inactiveColoring`
 * in the same three ways and faded; `automatic` is the way of what is filled.
 *
 * A scale of one colour makes the three ways the same, and is drawn as
 * `value`. A meter without a reading has no colours at all: it keeps its
 * dashed look.
 */
export function drawingOf(
	look: Pick<Look, 'activeColoring' | 'inactiveColoring'>,
	options: Options,
	reading: Pick<Reading, 'empty' | 'fraction' | 'color'>,
	count = 0,
	value: unknown = null,
): Drawing {
	const pieces = count >= MIN_SUBDIVISIONS ? Math.min(MAX_PIECES, Math.floor(count)) : 0;
	const filled = filledCount(reading.fraction, pieces);
	const placeOf = (index: number) => (pieces > 1 ? index / (pieces - 1) : 0);

	if (reading.empty) {
		return {
			stops: null,
			weakStops: null,
			track: NO_PAINT,
			fill: NO_PAINT,
			pieces: pieces ? Array.from({ length: pieces }, (_, index) => ({ filled: false, at: placeOf(index), paint: NO_PAINT })) : null,
		};
	}

	const stops = scaleStops(options);
	const flat = stops.length < 2;
	const active: Coloring = flat ? 'value' : look.activeColoring;
	const wanted = look.inactiveColoring === 'automatic' ? look.activeColoring : look.inactiveColoring;
	const inactive: Coloring | 'plain' = flat && wanted !== 'plain' ? 'value' : wanted;

	// The one colour of `blend`: that of the scale at the place of the value, which for a value beyond the range
	// is beyond the track, where a threshold may still be.
	const number = numberOf(value);
	const place = number !== null && options.max > options.min ? shareOf(number, options) : reading.fraction;
	const blended = blendCss(blendAt(stops, Number.isFinite(place) ? place : reading.fraction));

	// The two colourings which are one colour everywhere, and that colour.
	const single = (coloring: Coloring | 'plain'): coloring is 'value' | 'blend' => coloring === 'value' || coloring === 'blend';
	const colorOf = (coloring: 'value' | 'blend') => (coloring === 'value' ? reading.color : blended);

	if (!pieces) {
		return {
			stops: single(active) ? null : stopsCss(stops, active),
			weakStops: inactive === 'plain' || single(inactive) ? null : stopsCss(stops, inactive, true),
			track: inactive === 'plain' ? NO_PAINT : single(inactive) ? { color: fadedColor(colorOf(inactive)), scale: null } : { color: null, scale: 'weak' },
			fill: single(active) ? { color: colorOf(active), scale: null } : { color: null, scale: 'full' },
			pieces: null,
		};
	}

	const paintOf = (index: number): Paint => {
		const coloring = index < filled ? active : inactive;
		const weak = index >= filled;

		if (coloring === 'plain') return NO_PAINT;
		if (coloring === 'gradient') return { color: null, scale: weak ? 'weak' : 'full' };

		const color = single(coloring) ? colorOf(coloring) : colorFor(valueAtPiece(index, pieces, options), options);
		return { color: weak ? fadedColor(color) : color, scale: null };
	};

	return {
		stops: active === 'gradient' && filled > 0 ? stopsCss(stops, 'gradient') : null,
		weakStops: inactive === 'gradient' && filled < pieces ? stopsCss(stops, 'gradient', true) : null,
		track: NO_PAINT,
		fill: NO_PAINT,
		pieces: Array.from({ length: pieces }, (_, index) => ({ filled: index < filled, at: placeOf(index), paint: paintOf(index) })),
	};
}

/**
 * The display's tooltip: the value text, after the caption when there is one.
 * The display has no room for the caption, and it leaves the text out where
 * the whole of it does not fit beside the bar, so the tooltip always has both.
 */
export function tooltipOf(text: string, label: string | null): string {
	return label !== null ? `${label}: ${text}` : text;
}

/**
 * The display's `handler`, which the app calls where it renders a template to
 * a string instead of to components: the calendar layout, for one
 * (app/src/utils/render-string-template.ts:54-97 in Directus 11.17.4). It
 * hands over the value, the options of the display and a context with the
 * options of the field's interface. The text is the one beside the bar,
 * whether or not that is switched on: "58%". A value which is not a number
 * gives itself, and a field without a value has no text.
 */
export function textHandler(value: unknown, options?: unknown, context?: { interfaceOptions?: unknown } | null, locale?: string): string | null {
	if (isEmpty(value)) return null;

	const number = numberOf(value);
	return number === null ? textOf(value) : valueText(number, readOptions(options, context?.interfaceOptions), locale);
}
