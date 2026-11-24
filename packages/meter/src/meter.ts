// The part of the bundle which needs no Vue, DOM or Directus: what a stored
// value and the options come to, how much of the track is filled, in which
// colour, and what the text beside it says. The interface and the display
// both work from it, and the unit tests run it in Node.

/** What the text beside the bar says. */
export type IndicatorFormat = 'percent' | 'value' | 'fraction';

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

const FORMATS: readonly unknown[] = ['percent', 'value', 'fraction'];

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
