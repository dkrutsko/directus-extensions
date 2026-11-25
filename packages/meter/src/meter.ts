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
	/**
	 * How many pieces in front of the fill can be growing at once, where the pieces which are not filled are drawn
	 * small: 0 is off, from 0 to `MAX_GROW`. Only the interface has it.
	 */
	grow: number;
	/** Whether the next piece takes on the look of a filled one gradually, as the value nears it. */
	fade: boolean;
}

/** How large a piece is drawn, as shares of its full size: along the track and across it. */
export interface Scale {
	along: number;
	across: number;
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

/** What is laid over a piece which is about to be filled (`fade`): the look it has once it is filled, and how much of it shows, above 0 and up to 1. */
export interface Overlay {
	paint: Paint;
	opacity: number;
}

/**
 * One piece as it is drawn. `at` is where it stands among the pieces, 0 for
 * the first and 1 for the last. `size` is how large it is drawn where the
 * pieces grow (`grow`), and `null` for a piece at its full size, which is
 * every piece of a meter which does not grow them. `over` is what is laid
 * over the one piece which is fading in (`fade`), and `null` for every other.
 */
export interface PieceDrawing {
	filled: boolean;
	at: number;
	paint: Paint;
	size: Scale | null;
	over: Overlay | null;
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
		bars: { piece: 4, gap: 2 },
		dots: { piece: 12, gap: 4 },
	},
	display: {
		pills: { piece: 8, gap: 2 },
		segments: { piece: 6, gap: 2 },
		bars: { piece: 2, gap: 1 },
		dots: { piece: 6, gap: 2 },
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

/**
 * How small a piece which is not filled is drawn where the pieces grow
 * (`grow`), as shares of its full size. Dots and pills shrink both ways, a
 * dot to half its diameter. Segments and bars keep their width, so that the
 * row still reads as one track, and are a third as high.
 */
export const SMALL_PIECES: Record<Shape, Scale> = {
	pills: { along: 0.6, across: 0.6 },
	segments: { along: 1, across: 1 / 3 },
	bars: { along: 1, across: 1 / 3 },
	dots: { along: 0.5, across: 0.5 },
};

/** How much of a piece the value has to have come before the piece is filled: half of it, as pieces are filled to the nearest. */
const FILLED_FROM = 0.5;

/** The most `grow` can be: more pieces growing at once than that is no ramp any more. */
export const MAX_GROW = 20;

/**
 * How far ahead of the fill thin bars grow and fade in at the least, in
 * pixels of the track for each 1 of `grow`: two and a half bars at their
 * narrowest in the form, and three in the display. Every other shape, and
 * bars which are wider than that, go by the number of pieces alone.
 */
export const BAR_REACH: Record<Place, number> = { form: 15, display: 9 };

export const DEFAULT_INPUT: InputMethod = 'automatic';
export const DEFAULT_STEP = 1;
export const DEFAULT_SENSITIVITY = 1;

/**
 * The most steps a range can hold and still have a grid, and the digits a
 * value is written with where it has none. A grid holds as long as its points
 * can be counted exactly, which a number can up to this many.
 */
export const MAX_STEPS = Number.MAX_SAFE_INTEGER;
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
 * `subdivisions`, `dotsLayout`, `activeColoring`, `inactiveColoring`, `grow`
 * and `fade`, with the same two sources as `readOptions`. Every one of these keys falls
 * through when it holds nothing usable, as the format and the limits do: a
 * word which is not one of its choices, a number of subdivisions which is no
 * whole number, and so an option which was emptied (`null`) as well. Without
 * a usable one anywhere the meter is one bar in the colour of its value, on a
 * plain track.
 *
 * `grow` is the exception: it is read from the entry's own options alone,
 * and only the interface draws by it. The pieces of a display are too small
 * to be drawn smaller, so a `grow` on the interface does not reach it.
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
		grow: growOf(sources[0]!['grow']),
		fade: first(sources, (source) => (typeof source['fade'] === 'boolean' ? source['fade'] : null)) ?? false,
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
 * upward. A share so small that nothing can be divided by it, as 1e-300 of
 * ten thousand million is, counts as nothing: what is filled is scaled by one
 * over this number (`fillScale`), and nothing which is not finite may reach
 * the page.
 */
export function fractionOf(value: number, range: Range): number {
	if (value >= range.max) return 1;
	if (value <= range.min) return 0;

	const share = Math.min(1, Math.max(0, shareOf(value, range)));
	return Number.isFinite(1 / share) ? share : 0;
}

/**
 * How many times as long as the fill the whole track is, for the fill of the
 * one bar where it shows its part of the colours across the track. Always a
 * finite number, and 1 for a fill of nothing.
 */
export function fillScale(fraction: number): number {
	const scale = 1 / fraction;
	return Number.isFinite(scale) && scale >= 1 ? scale : 1;
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
 * The least a bar and its gap may be on a screen of `ratio` device pixels to
 * the CSS pixel, in whole device pixels: the sizes of `PIECE_SIZES`, rounded
 * up where the ratio makes them a fraction. `scale` is the ratio as it is
 * used, 1 for one which is none.
 */
function leastBar(place: Place, ratio: number): { bar: number; gap: number; scale: number } {
	const scale = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
	const { piece, gap } = PIECE_SIZES[place].bars;

	return { bar: Math.max(1, Math.ceil(piece * scale - 1e-6)), gap: Math.max(1, Math.ceil(gap * scale - 1e-6)), scale };
}

/** A width in whole device pixels. A measured width may be a hair under the whole number it stands for. */
const deviceWidth = (width: number, scale: number) => Math.floor(width * scale + 1e-4);

/**
 * How many pieces of a visualization fit into a track of `width` pixels: each
 * at its smallest, with the gaps between them. Never more than the cap of the
 * package. A track without a width, as in a tab which is not shown, has room
 * for none.
 *
 * Bars are counted in whole device pixels, for the `ratio` of the screen,
 * since that is how they are drawn (`barFit`): the least bar and the gap,
 * each rounded up to a whole device pixel, and as many of them as the track
 * has whole device pixels for.
 */
export function fitCount(visualization: Shape, place: Place, width: number, ratio = 1): number {
	const { piece, gap } = PIECE_SIZES[place][visualization];
	if (!(width > 0)) return 0;

	if (visualization === 'bars') {
		const least = leastBar(place, ratio);
		const bars = Math.floor((deviceWidth(width, least.scale) + least.gap) / (least.bar + least.gap));

		return Number.isFinite(bars) ? Math.min(MAX_PIECES, Math.max(0, bars)) : MAX_PIECES;
	}

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
 *
 * Bars do not `divide`: where what is wanted does not fit, as many are drawn
 * as fit. Bars are all drawn at one whole number of device pixels, so a
 * number which divides what is wanted would leave the rest of the track
 * empty: fifty for a hundred where 57 fit leave an eighth of it. With as many
 * as fit, only the bar which would be cut off is missing.
 */
export function drawnCount(wanted: number | null, fit: number, divide = true): number {
	const room = Math.min(MAX_PIECES, Math.floor(fit));

	if (!(room >= MIN_SUBDIVISIONS)) return 0;
	if (wanted === null || !(wanted >= MIN_SUBDIVISIONS)) return room;
	if (wanted <= room) return wanted;
	if (!divide) return room;

	for (let count = room; count >= MIN_SUBDIVISIONS; count--) {
		if (wanted % count === 0) return count;
	}

	return room;
}

/**
 * How many pieces a meter is cut into in a track of `width` pixels: 0 for one
 * bar, which is what `contiguous` is and what is left where fewer than two
 * pieces fit. The display hands over its fixed width, so every row of a
 * layout comes to the same number. `ratio` is that of the screen, by which
 * bars are counted.
 */
export function pieceCount(look: Pick<Look, 'visualization' | 'subdivisions'> & Partial<Pick<Look, 'dotsLayout'>>, range: Range, place: Place, width: number, ratio = 1): number {
	if (look.visualization === 'contiguous') return 0;

	// Bars and packed dots keep their size and stand from the start, so a number which divides what is wanted
	// would leave the rest of the track empty: they are as many as fit. Spread dots fill the track anyway.
	const packed = look.visualization === 'dots' && (look.dotsLayout ?? DEFAULT_DOTS_LAYOUT) === 'packed';

	return drawnCount(wantedCount(look, range), fitCount(look.visualization, place, width, ratio), look.visualization !== 'bars' && !packed);
}

/** How wide a bar and the gap to the next one are drawn, and how long the row of bars is with them, in CSS pixels. */
export interface BarFit {
	bar: number;
	gap: number;
	length: number;
}

/**
 * The sizes at which `count` bars are drawn in a track of `width` CSS pixels
 * on a screen with `ratio` device pixels to the CSS pixel: a bar and a gap
 * which are each a whole number of device pixels, so that every bar is drawn
 * as wide as every other and every gap as every other. Bars which share the
 * width of the track come to a fraction of a pixel each (342px for fifty is
 * 4.88px a bar), and the browser, which puts every edge on a whole device
 * pixel, then draws some of them a pixel wider than others.
 *
 * Neither is less than its least size (`PIECE_SIZES`, rounded up to whole
 * device pixels), which is what the bars are counted with (`fitCount`). Of
 * the bars and gaps which fit the count, the pair with the longest row is
 * taken: the widest bar for the least gap, or for a gap which is a device
 * pixel or two wider where that uses more of the track; a gap is never more
 * than twice its least. What is left over stays empty at the end side of the
 * track: `length` is how long the row is. For as many bars as fit that is
 * less than one bar and its gap; for a number which was asked for and which
 * fits, it can be nearly a device pixel for each bar.
 *
 * `null` where there is nothing to fit. A count which does not fit at the
 * least sizes, which only a caller with a count of its own can ask for, gets
 * thinner gaps and bars down to one device pixel, and `null` where not even
 * those fit: the bars then share the width as the other shapes do.
 */
export function barFit(place: Place, count: number, width: number, ratio = 1): BarFit | null {
	if (!(count >= 1) || !(width > 0) || !Number.isFinite(width) || !Number.isFinite(count)) return null;

	const least = leastBar(place, ratio);
	const scale = least.scale;
	const bars = Math.floor(count);
	const room = deviceWidth(width, scale);
	const sized = (bar: number, gap: number): BarFit => ({ bar: bar / scale, gap: gap / scale, length: (bars * bar + (bars - 1) * gap) / scale });

	// The longest row of bars and gaps which are not less than their least sizes.
	let best: { bar: number; gap: number; length: number } | null = null;

	for (let gap = least.gap; gap <= 2 * least.gap; gap++) {
		const bar = Math.floor((room - (bars - 1) * gap) / bars);
		if (bar < least.bar) break;

		const length = bars * bar + (bars - 1) * gap;
		if (best === null || length > best.length) best = { bar, gap, length };
	}

	if (best !== null) return sized(best.bar, best.gap);

	// More bars than fit at the least sizes: thinner ones, down to a device pixel.
	let gap = least.gap;
	let bar = Math.floor((room - (bars - 1) * gap) / bars);

	while (bar < 1 && gap > 1) {
		gap--;
		bar = Math.floor((room - (bars - 1) * gap) / bars);
	}

	return bar < 1 ? null : sized(bar, gap);
}

/**
 * Where each of `count` pieces starts and ends in a track of `width` pixels,
 * from the start side, which is the right in a right-to-left page. Pills and
 * segments share the width equally, with their gap between them. Bars are
 * each a whole number of device pixels wide (`barFit`, for the `ratio` of the
 * screen), from the start, and end before the track does where its width is
 * not used up. Dots keep their size: packed they stand from the start with
 * their gap, spread the first is at the start edge, the last at the end edge,
 * and the gaps between are equal. The styles of the components lay the pieces
 * out by the same rules; this is the same thing as numbers, by which the
 * pointer finds the piece under it and the length which stands for the whole
 * range.
 */
export function pieceGeometry(visualization: Shape, place: Place, count: number, width: number, dotsLayout: DotsLayout = DEFAULT_DOTS_LAYOUT, ratio = 1): Piece[] {
	const { piece, gap } = PIECE_SIZES[place][visualization];
	if (!(count >= 1) || !(width > 0)) return [];

	const dots = visualization === 'dots';
	const fit = visualization === 'bars' ? barFit(place, count, width, ratio) : null;
	const size = fit !== null ? fit.bar : dots ? piece : (width - gap * (count - 1)) / count;
	const between = fit !== null ? fit.gap : dots && dotsLayout === 'spread' && count > 1 ? (width - count * size) / (count - 1) : gap;

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
 * The points which can be written within a range, numbered from 0 at the
 * minimum: the grid of steps counted from the minimum, and the maximum as the
 * point after the last one where the grid misses it. With steps of 3 from 0
 * to 10 the points are 0, 3, 6, 9 and 10, and `top`, the number of the last
 * one, is 4. A step larger than the range leaves the two ends, points 0 and 1.
 *
 * Everything which moves along the grid counts in these numbers and turns a
 * number back into a value with `at`; nothing adds a step to a value and
 * looks where it landed, which goes wrong once the values are large and the
 * steps fine. `around` gives the numbers of the two points next to a value
 * within the range, below it and above it, and twice the same number for a
 * value which is on a point.
 */
interface Grid {
	top: number;
	at: (index: number) => number;
	around: (value: number) => [number, number];
}

/**
 * The grid of a range which can be written, of two finite limits. `null`
 * where the range holds more steps than can be counted exactly: then there is
 * no grid.
 */
function gridOf(writable: Range, editing: Pick<Editing, 'step' | 'whole'>): Grid | null {
	const { min, max } = writable;
	const step = editing.step;
	const held = (max - min) / step;

	if (!(held <= MAX_STEPS)) return null;

	// A point has no more decimals than the step, the minimum and the maximum have between them.
	const decimals = Math.max(decimalsOf(step), decimalsOf(min), decimalsOf(max));
	const clean = (value: number) => (editing.whole ? Math.round(value) : decimals <= 15 ? Number(value.toFixed(decimals)) : value);

	// Two numbers which are one point: a hair apart against a step (or against the range, where the step is
	// larger), or as close as two numbers of their size can be.
	const hair = Math.min(step, max - min) * 1e-9;
	const same = (a: number, b: number) => Math.abs(a - b) <= Math.max(hair, 4 * Number.EPSILON * Math.max(Math.abs(a), Math.abs(b)));

	// The maximum is the point after the last one of the grid, unless the grid ends on it.
	const count = Math.round(held);
	const reach = clean(min + count * step);
	const top = reach < max && !same(reach, max) ? count + 1 : count;

	const at = (index: number) => (index >= top ? max : index <= 0 ? min : Math.min(max, Math.max(min, clean(min + index * step))));

	const around = (value: number): [number, number] => {
		if (value >= max) return [top, top];
		if (value <= min) return [0, 0];

		const guess = Math.min(top, Math.max(0, Math.round((value - min) / step)));
		const [low, high] = value < at(guess) ? [Math.max(0, guess - 1), guess] : [guess, Math.min(top, guess + 1)];

		if (same(value, at(low))) return [low, low];
		if (same(value, at(high))) return [high, high];
		return [low, high];
	};

	return { top, at, around };
}

/**
 * The value which is written for a value which was asked for: on the grid of
 * steps counted from the minimum, never outside the range, and never anything
 * but a finite number. The maximum can always be written, also where the grid
 * misses it: with steps of 3 from 0 to 10 the values are 0, 3, 6, 9 and 10.
 *
 * `rounding` says which of the two points around the value asked for it is:
 * the nearer one, with the upper one for a value half way; or the next one
 * below or above.
 *
 * The result has no more decimals than the step, the minimum and the maximum
 * have between them, so a step of 0.1 gives 0.3 and not 0.30000000000000004.
 * A field of a whole type gets a whole number, from a grid which starts at
 * the first whole number of the range. Where the range holds no value which
 * can be written, or the value asked for is not a number, there is nothing to
 * write, which is `null`.
 *
 * A step larger than the range leaves the two ends of the range, and the
 * nearer is written. Only a range which holds more than `MAX_STEPS` steps,
 * more than can be counted exactly, has no grid: the value within the range
 * is written, rounded to `FREE_DIGITS` digits which count.
 */
export function snapValue(value: number, range: Range, editing: Pick<Editing, 'step' | 'whole'>, rounding: Rounding = 'nearest'): number | null {
	const writable = writableRange(range, editing);
	const step = editing.step;

	if (writable === null || !Number.isFinite(value) || !(step > 0)) return null;

	const { min, max } = writable;
	const within = Math.min(max, Math.max(min, value));

	// Limits too far apart to subtract: no grid can be counted, and the value within the range is all there is.
	if (!Number.isFinite(max - min)) return (editing.whole ? Math.round(within) : within) + 0;

	const grid = gridOf(writable, editing);

	// More steps than can be counted: there is no grid, and the value within the range is written, with the
	// digits which mean something.
	if (grid === null) {
		const rounded = Number(within.toPrecision(FREE_DIGITS));
		const free = Math.min(max, Math.max(min, editing.whole ? Math.round(rounded) : rounded));
		return Number.isFinite(free) ? free + 0 : null;
	}

	const [below, above] = grid.around(within);
	const index = rounding === 'down' ? below : rounding === 'up' ? above : within - grid.at(below) < grid.at(above) - within ? below : above;
	const written = grid.at(index);

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
 * How far a finger has to move along the track, in pixels, before it is
 * dragging the meter and not about to scroll the page or to be lifted again.
 */
export const TOUCH_SLOP = 6;

/**
 * Whether a finger which has moved by `along` pixels along the track and by
 * `across` pixels up or down since it came down is dragging the meter: a few
 * pixels sideways, and further sideways than up or down. Until then a finger
 * writes nothing: it may be the start of a scroll of the page, which the
 * browser then takes away, and nothing was meant.
 */
export function sideways(along: number, across: number): boolean {
	return Math.abs(along) >= TOUCH_SLOP && Math.abs(along) > Math.abs(across);
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
 * Page Down are ten steps, or the whole steps of one piece where a piece is
 * more than that. Home and End are the two ends of what can be written.
 *
 * A key counts in points of the grid: from the number of the point the value
 * is on, one, ten or a piece further, and that number is turned back into a
 * value. So no key lands on the point it started from, however large the
 * values and however fine the steps, and a Page key is always its ten steps.
 * A value from outside the range is first brought to the nearer end of what
 * can be written, and a field without a value starts at the minimum of it; a
 * value between two points counts from the point behind it, so that one step
 * takes it to the next point and not past it. A key of the meter's where
 * nothing can be written gives `null`.
 */
export function keyValue(key: string, current: number | null, range: Range, editing: Pick<Editing, 'step' | 'whole'>, count = 0, rtl = false): number | null | undefined {
	const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
	const writable = writableRange(range, editing);
	const step = editing.step;

	const known = ['Home', 'End', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
	if (!known.includes(key)) return undefined;
	if (writable === null) return null;

	if (key === 'Home') return snapValue(writable.min, range, editing);
	if (key === 'End') return snapValue(writable.max, range, editing);

	// How many steps a Page key is: ten, or the whole steps of a piece where those are more.
	const piece = count >= MIN_SUBDIVISIONS ? (writable.max - writable.min) / count / step : 0;
	const whole = Math.abs(piece - Math.round(piece)) <= 1e-9 * Math.max(1, piece) ? Math.round(piece) : Math.floor(piece);
	const page = Math.max(PAGE_STEPS, Number.isFinite(whole) ? whole : 0);

	const up = key === forward || key === 'ArrowUp' || key === 'PageUp';
	const far = key === 'PageUp' || key === 'PageDown' ? page : 1;

	// A value from outside the range is first brought to the nearer end of what can be written; the key counts from there.
	const from = current === null || !Number.isFinite(current) ? writable.min : Math.min(writable.max, Math.max(writable.min, current));
	const grid = step > 0 && Number.isFinite(writable.max - writable.min) ? gridOf(writable, editing) : null;

	// No grid to count on: the step is added to the value, and what is written is the value within the range.
	if (grid === null) return snapValue(from + (up ? far : -far) * step, range, editing);

	const [below, above] = grid.around(from);
	const within = (index: number) => Math.min(grid.top, Math.max(0, index));
	let index = within(up ? below + far : above - far);

	// Where the numbers themselves lie further apart than the points, the next point can be the same number:
	// go on, twice as far each time, to the first point which is another one.
	for (let more = far; grid.at(index) === from && index > 0 && index < grid.top && more <= MAX_STEPS; more *= 2) {
		index = within(up ? index + more : index - more);
	}

	const written = grid.at(index);
	return Number.isFinite(written) ? written + 0 : null;
}

/**
 * What the option `grow` comes to: a number from 0 to `MAX_GROW`, or the
 * text of one. It was a switch once: a stored `true` is 1 and `false` is 0.
 * Anything else, and a negative number, is 0, which is off.
 */
export function growOf(value: unknown): number {
	if (value === true) return 1;

	const number = typeof value === 'boolean' ? null : numberOf(value);
	return number !== null && number > 0 ? Math.min(MAX_GROW, number) : 0;
}

/**
 * Over how many pieces before it is filled a piece grows and fades in: the
 * reach, for a `grow` which says how many pieces can be growing at once.
 *
 * A piece is filled once the value has come half of it. With `grow` at 1 the
 * reach is that half piece: the piece after the filled ones grows during the
 * half step before it is filled, only one piece is ever under way, and a
 * value which is a whole number of pieces shows nothing growing. Every
 * further 1 reaches one piece further: 2 is a piece and a half, so the next
 * piece is always partly grown and the one after it starts as the next comes
 * close to being filled; 3 is two and a half, a ramp of up to three. Below 1
 * the reach is half of `grow`, so the growth starts later than half a step
 * before the fill. At 0 there is none.
 *
 * Bars are the exception where they are thin. On a range of a hundred in
 * whole numbers, fifty or a hundred bars stand for two units or one each, and
 * no whole number ever lies inside the last half of such a bar: with a reach
 * in pieces alone they would never be seen growing. So the reach of bars is
 * at least `BAR_REACH` pixels of the track for each 1 of `grow`: the next few
 * bars form a short ramp in front of the fill. That part is counted in half
 * pieces, so that it changes with the number of bars and not with every pixel
 * of the width. `width` is that of the track, `count` the number of bars and
 * `ratio` that of the screen, by which the bars are drawn (`barFit`).
 */
export function reachOf(visualization: Visualization, place: Place, count: number, width: number, grow = 1, ratio = 1): number {
	const amount = Number.isFinite(grow) && grow > 0 ? Math.min(MAX_GROW, grow) : 0;
	const pieces = amount <= 1 ? amount / 2 : amount - FILLED_FROM;

	if (visualization !== 'bars' || !(count >= 1) || !(width > 0)) return pieces;

	// From one bar to the next, as they are drawn.
	const fit = barFit(place, count, width, ratio);
	const pitch = fit !== null ? fit.bar + fit.gap : (width + PIECE_SIZES[place].bars.gap) / count;
	const track = Math.round((2 * amount * BAR_REACH[place]) / pitch) / 2;

	return Number.isFinite(track) ? Math.max(pieces, track) : pieces;
}

/**
 * How far a piece has grown towards its full size, from 0 to 1, where the
 * pieces which are not filled are drawn small (`grow`) or fade in (`fade`).
 * `index` counts the pieces from 0. With the value at `fraction * count`
 * pieces, not rounded, a piece is filled once the value has come half of it,
 * and that is where its growth reaches 1. It starts `reach` pieces before
 * that (`reachOf`): a piece which is still `d` pieces from being filled has
 * grown `1 - d / reach`. A filled piece is 1, and a reach of nothing leaves
 * every other piece at 0.
 *
 * The reach grows out of the start of the scale: what counts is the reach or
 * the position plus half a piece, whichever is less. At the minimum that is
 * the half piece the first piece is away, so nothing has grown and an empty
 * meter is empty; as the value rises the ramp gets longer with the fill until
 * it has its whole reach. So it comes out of the start as it runs into the
 * end, where the pieces which are left grow until all are full, and nothing
 * jumps anywhere between the two. A reach of half a piece or less is never
 * more than that, and is as it is everywhere. An earlier rule made the
 * minimum a case of its own, nothing under way there, and a long ramp was
 * there in full at the first value above it.
 *
 * `fraction` may be the place of the pointer and not that of the value, and
 * so ahead of what is filled: a piece which is not filled is then 1 as well.
 */
export function growthOf(fraction: number, count: number, index: number, reach = FILLED_FROM): number {
	if (!(count >= 1) || !(fraction >= 0)) return 0;
	if (index < filledCount(fraction, count)) return 1;
	if (!(reach > 0)) return 0;

	const pieces = piecesAt(Math.min(1, fraction), count);
	const within = Math.min(reach, pieces + FILLED_FROM);
	const away = index + FILLED_FROM - pieces;

	return Math.min(1, Math.max(0, 1 - away / within));
}

/** How large a piece of a shape is drawn for its growth: from the small size of the shape at 0 to its full size at 1. */
export function pieceScale(shape: Shape, growth: number): Scale {
	const small = SMALL_PIECES[shape];
	const grown = Math.min(1, Math.max(0, Number.isFinite(growth) ? growth : 0));
	const between = (least: number) => Number((least + (1 - least) * grown).toFixed(4));

	return { along: between(small.along), across: between(small.across) };
}

/**
 * How much higher than its regular size a piece is drawn while the pointer
 * would fill it (the pieces up to the pointer, on a meter whose pieces are
 * filled by the pointer). Bars and segments half as high again, as wide as
 * they are. Dots a pixel on every side, which is what `LARGE_ALONG` leaves
 * them. Pills a third higher: a pixel on every side is hard to see on a piece
 * that long, and along the track they have no more room than dots.
 */
export const LARGE_ACROSS: Record<Shape, number> = { pills: 4 / 3, segments: 1.5, bars: 1.5, dots: 7 / 6 };

/**
 * How many pixels longer along the track such a piece is drawn: pills and
 * dots only, a pixel at each end, which is less than their gap, so that two
 * of them side by side never touch. Bars and segments keep their width.
 */
export const LARGE_ALONG: Record<Shape, number> = { pills: 2, segments: 0, bars: 0, dots: 2 };

/**
 * The size at which a piece up to the pointer is drawn: larger than regular,
 * whether it is filled or not and whatever it would be without the pointer.
 * `length` is how long a piece is along the track, in pixels, since the
 * growth along it is a number of pixels and a scale is a factor. A piece
 * without a length is not made longer.
 */
export function largeScale(shape: Shape, length: number): Scale {
	const along = length > 0 && Number.isFinite(length) ? Number(((length + LARGE_ALONG[shape]) / length).toFixed(4)) : 1;

	return { along, across: Number(LARGE_ACROSS[shape].toFixed(4)) };
}

/** A size as the CSS transform which draws it: about the middle of the piece, so the piece stays on its place and its box as it was. */
export function scaleCss(size: Scale): string {
	return `scale(${size.along}, ${size.across})`;
}

/**
 * How many pieces a fraction of the track comes to, not rounded to whole
 * pieces but without the dust of the product: 0.6 of 5 pieces is 3 of them
 * and not a hair more, and 0.29 of 50 is 14.5 and not a hair less.
 */
function piecesAt(fraction: number, count: number): number {
	return Number((fraction * count).toFixed(9));
}

/**
 * How many of `count` pieces are filled for a fraction of the track, the one
 * the bar is filled to: the nearest whole number of them, with the upper one
 * half way. No piece is ever filled in part, so 44 of 100 fills four of ten
 * and 45 fills five. The text beside it still says the value as it is.
 */
export function filledCount(fraction: number, count: number): number {
	return Math.min(count, Math.max(0, Math.round(piecesAt(fraction, count))));
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
 *
 * Where the look says `grow` and names a shape, every piece which is not
 * filled has a `size` (`growthOf`, `pieceScale`). Otherwise, for a filled
 * piece and without a reading, `size` is `null`: the piece is as it always
 * was.
 *
 * Where the look says `fade`, a piece which is not filled and has started to
 * grow has an `over`: the look it has once it is filled, by `activeColoring`,
 * shown as much as it has grown (`growthOf`), over its own look, which stays
 * what `inactiveColoring` gives it. At the moment it is filled the two are
 * the same, so no colour jumps. Every other piece has `over: null`, and so
 * has every piece of a meter which does not fade.
 *
 * `ahead` says how the growth is counted: over which `reach` in pieces
 * (`reachOf`; half a piece without it), and from which place, `at`, a
 * fraction of the track, where that is not the place of the value: the
 * place of the pointer while it drags the value, so that sizes and fading
 * follow the pointer and not the steps the value takes. What is filled, the
 * colours and everything else stay those of the value.
 */
export function drawingOf(
	look: Pick<Look, 'activeColoring' | 'inactiveColoring'> & Partial<Pick<Look, 'grow' | 'fade' | 'visualization'>>,
	options: Options,
	reading: Pick<Reading, 'empty' | 'fraction' | 'color'>,
	count = 0,
	value: unknown = null,
	ahead: { reach?: number | undefined; at?: number | null | undefined } = {},
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
			pieces: pieces ? Array.from({ length: pieces }, (_, index) => ({ filled: false, at: placeOf(index), paint: NO_PAINT, size: null, over: null })) : null,
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

	// Pieces which grow: those which are not filled are small, and the next one is as large as the value has come.
	const shape = typeof look.grow === 'number' && look.grow > 0 && look.visualization !== undefined && look.visualization !== 'contiguous' ? look.visualization : null;
	const from = typeof ahead.at === 'number' && Number.isFinite(ahead.at) ? Math.min(1, Math.max(0, ahead.at)) : reading.fraction;
	const grown = (index: number) => growthOf(from, pieces, index, ahead.reach);
	const sizeOf = (index: number): Scale | null => (shape === null || index < filled ? null : pieceScale(shape, grown(index)));

	// A piece as one of the two colourings paints it, at full strength or faded.
	const paintAs = (index: number, coloring: Coloring | 'plain', weak: boolean): Paint => {
		if (coloring === 'plain') return NO_PAINT;
		if (coloring === 'gradient') return { color: null, scale: weak ? 'weak' : 'full' };

		const color = single(coloring) ? colorOf(coloring) : colorFor(valueAtPiece(index, pieces, options), options);
		return { color: weak ? fadedColor(color) : color, scale: null };
	};

	const paintOf = (index: number): Paint => (index < filled ? paintAs(index, active, false) : paintAs(index, inactive, true));

	// The pieces which fade in: those which are not filled and have started to grow.
	const overOf = (index: number): Overlay | null => {
		if (look.fade !== true || index < filled) return null;

		const opacity = Number(grown(index).toFixed(4));
		return opacity > 0 ? { paint: paintAs(index, active, false), opacity } : null;
	};

	const fading = filled < pieces && overOf(filled) !== null;

	return {
		stops: active === 'gradient' && (filled > 0 || fading) ? stopsCss(stops, 'gradient') : null,
		weakStops: inactive === 'gradient' && filled < pieces ? stopsCss(stops, 'gradient', true) : null,
		track: NO_PAINT,
		fill: NO_PAINT,
		pieces: Array.from({ length: pieces }, (_, index) => ({ filled: index < filled, at: placeOf(index), paint: paintOf(index), size: sizeOf(index), over: overOf(index) })),
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
