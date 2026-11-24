// The part of the bundle which needs no Vue, DOM or Directus: what the
// `choices` option comes to, which step a stored value is, what choosing a
// step writes, and what the display shows. The interface and the display both
// work from it, and the unit tests run it in Node.

/** One step of the track, as `readSteps` hands it out. */
export interface Step {
	/** What choosing the step writes: a number on an integer field, text on any other. */
	value: string | number;
	/** The value as text. A stored value is matched by it, so `2` and `"2"` are the same step. */
	key: string;
	/** What the step is called: its text, or its value as text when it has none. Never empty. */
	name: string;
	/** What is written under the marker: the text, or `null` when there is none or the field shows no labels. */
	label: string | null;
	/** The icon in the marker. `null` shows the position instead. */
	icon: string | null;
	/** The place in the track, counted from 1 over the steps which were kept. */
	position: number;
}

/** A step the value has passed, the step the value is at, or one which is still to come. */
export type StepState = 'done' | 'current' | 'upcoming';

/** Where a stored value stands in a list of steps. */
export interface Track {
	/** The index of the current step, or -1 when the value is none of them. */
	current: number;
	/** The state of each step, in the order of the steps. */
	states: StepState[];
	/** The value as text when the field holds something which is not a step, otherwise `null`. */
	unknown: string | null;
}

/** What the display shows for a value. */
export interface Progress {
	/** The name of the current step, or the value as text when it is not a step. */
	text: string;
	/** The place of the current step, counted from 1, or `null` when the value is not a step. */
	position: number | null;
	/** How many steps there are. */
	count: number;
	/** One entry per step, `true` up to and including the current one. `null` when no pips are drawn. */
	pips: boolean[] | null;
}

/** Up to this many steps the display draws a pip for each; beyond it, position and count as text. */
export const MAX_PIPS = 8;

// A whole number as someone would type it. No exponent, no fraction, no
// leading plus: those are not what an integer field hands back either.
const INTEGER = /^-?\d+$/;

/** The whole number a value stands for, or `null`. `-0` comes out as `0`. */
function integerOf(value: unknown): number | null {
	const number = typeof value === 'number' ? value : typeof value === 'string' && INTEGER.test(value.trim()) ? Number(value) : Number.NaN;
	return Number.isSafeInteger(number) ? number + 0 : null;
}

/**
 * A value in the form a field of the given type stores it: a whole number on
 * an `integer` field, text on any other. `null` when the field could not hold
 * it, which is also what a missing value, an empty text and anything which is
 * neither text nor a number come to.
 */
export function storedForm(value: unknown, type?: unknown): string | number | null {
	if (type === 'integer') return integerOf(value);
	if (typeof value === 'string') return value.trim() !== '' ? value : null;
	if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
	return null;
}

/**
 * What a value is matched by: its stored form as text. A number and its text
 * form therefore match each other in both directions, on either field type.
 */
export function keyOf(value: unknown, type?: unknown): string | null {
	const stored = storedForm(value, type);
	return stored === null ? null : String(stored);
}

/** Any value as text, for showing a value which is not a step. */
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

/** Whether a field holds nothing: `null`, no value at all, or text without a character in it. */
export function isEmpty(value: unknown): boolean {
	return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

/** The text of a choice, trimmed, or `null` when it has none. A number is its text. */
function textOfChoice(text: unknown): string | null {
	if (typeof text === 'number' && Number.isFinite(text)) return String(text);

	const trimmed = typeof text === 'string' ? text.trim() : '';
	return trimmed !== '' ? trimmed : null;
}

function iconOf(icon: unknown): string | null {
	const name = typeof icon === 'string' ? icon.trim() : '';
	return name !== '' ? name : null;
}

/**
 * Whether a field shows labels, from its `showLabels` option. Only the option
 * switched off hides them: a field which was set up before the option
 * existed, or by another interface, has none stored, and the form hands that
 * over as nothing or as `null`.
 */
export function labelsShown(option: unknown): boolean {
	return option !== false;
}

/**
 * The steps of a field, from its `choices` option, which is untrusted: it is
 * whatever the schema holds. Left out without a word are
 *
 * - an entry which is not an object, or has no value,
 * - an entry whose value an earlier one already has (`2` and `"2"` are the same),
 * - on an integer field, an entry whose value is not a whole number, since
 *   it could never be saved.
 *
 * A step is named by its text, or by its value when the text is missing or
 * blank. Its label is the text and nothing else: a step without a text has
 * none, and no step has one when the field's `showLabels` option is off
 * (`labelsShown`). Keys other than `text`, `value` and `icon` (the stock
 * Dropdown's `color`) are ignored. Anything which is not a list gives no
 * steps.
 */
export function readSteps(choices: unknown, type?: unknown, showLabels: unknown = true): Step[] {
	if (!Array.isArray(choices)) return [];

	const steps: Step[] = [];
	const seen = new Set<string>();
	const labelled = labelsShown(showLabels);

	for (const choice of choices as unknown[]) {
		if (typeof choice !== 'object' || choice === null) continue;

		const entry = choice as Record<string, unknown>;
		const value = storedForm(entry['value'], type);
		if (value === null) continue;

		const key = String(value);
		if (seen.has(key)) continue;
		seen.add(key);

		const text = textOfChoice(entry['text']);

		steps.push({
			value,
			key,
			name: text ?? key,
			label: labelled ? text : null,
			icon: iconOf(entry['icon']),
			position: steps.length + 1,
		});
	}

	return steps;
}

/**
 * Whether a track has no label to draw at all: the field shows none, or no
 * step has a text. It is then drawn in its compact form, the markers alone,
 * as high as a stock input.
 */
export function isCompact(steps: readonly Step[]): boolean {
	return steps.length > 0 && steps.every((step) => step.label === null);
}

/** The index of the step a value is, or -1. */
export function indexOfValue(steps: readonly Step[], value: unknown, type?: unknown): number {
	const key = keyOf(value, type);
	return key === null ? -1 : steps.findIndex((step) => step.key === key);
}

/**
 * Where a value stands in the steps. The steps before the current one are
 * done, those after it upcoming. A value which is none of them leaves every
 * step upcoming and is reported in `unknown`, unless the field is empty.
 */
export function trackOf(steps: readonly Step[], value: unknown, type?: unknown): Track {
	const current = indexOfValue(steps, value, type);

	return {
		current,
		states: steps.map((_, index) => (current === -1 || index > current ? 'upcoming' : index < current ? 'done' : 'current')),
		unknown: current === -1 && !isEmpty(value) ? textOf(value) : null,
	};
}

/**
 * What choosing a step writes: its value, which `readSteps` already put into
 * the type of the field. `undefined` when the step is the current one, and
 * nothing is to be written at all.
 */
export function chosen(step: Step, value: unknown, type?: unknown): string | number | undefined {
	return keyOf(value, type) === step.key ? undefined : step.value;
}

/** Whether the track stays as it is: the form may not, or cannot yet, take a new value. */
export function isInert(flags: { disabled?: boolean; nonEditable?: boolean; loading?: boolean }): boolean {
	return flags.disabled === true || flags.nonEditable === true || flags.loading === true;
}

/**
 * The step a key moves the focus to, from the step at `index` of `count`:
 * the arrows to its neighbour, turned around in a right-to-left page, Home
 * and End to the first and the last. The focus stops at either end. `null`
 * for any other key, which is then none of the track's business.
 */
export function focusTarget(key: string, index: number, count: number, rtl = false): number | null {
	if (count <= 0) return null;

	const last = count - 1;
	const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
	const backward = rtl ? 'ArrowRight' : 'ArrowLeft';

	if (key === forward) return Math.min(index + 1, last);
	if (key === backward) return Math.max(index - 1, 0);
	if (key === 'Home') return 0;
	if (key === 'End') return last;
	return null;
}

/** The left and the right edge of something on the page, in pixels. */
export interface Span {
	start: number;
	end: number;
}

/**
 * How far a scrolling track has to move to bring a step into view, in pixels
 * towards the right. Centred, the middle of the step goes to the middle of
 * the view. Otherwise the track moves no further than it takes to show the
 * step whole: not at all for a step which already is, so a step which was
 * clicked stays under the pointer.
 */
export function revealOffset(step: Span, view: Span, centred: boolean): number {
	if (centred) return (step.start + step.end) / 2 - (view.start + view.end) / 2;
	if (step.start < view.start) return step.start - view.start;
	if (step.end > view.end) return step.end - view.end;
	return 0;
}

/**
 * What the display shows for a value: the name of its step, and where that
 * step stands. `interfaceOptions` are the options of the field's interface,
 * whose `choices` are the steps, so the display has no list of its own and
 * also reads a field of the stock Dropdown or Radio Buttons.
 */
export function progressOf(value: unknown, interfaceOptions?: unknown, type?: unknown): Progress {
	const options = typeof interfaceOptions === 'object' && interfaceOptions !== null ? (interfaceOptions as Record<string, unknown>) : {};
	const steps = readSteps(options['choices'], type);
	const current = indexOfValue(steps, value, type);
	const step = steps[current];

	if (!step) return { text: textOf(value), position: null, count: steps.length, pips: null };

	return {
		text: step.name,
		position: current + 1,
		count: steps.length,
		pips: steps.length <= MAX_PIPS ? steps.map((_, index) => index <= current) : null,
	};
}

/** The display as plain text: the name of the current step, or the value when it is not a step. */
export function progressText(value: unknown, interfaceOptions?: unknown, type?: unknown): string {
	return progressOf(value, interfaceOptions, type).text;
}

/**
 * The display's `handler`, which the app calls where it renders a template to
 * a string instead of to components: the calendar layout, for one
 * (app/src/utils/render-string-template.ts:54-97 in Directus 11.17.4). It
 * hands over the value, the options of the display, which has none, and a
 * context with the field and the options of the field's interface. The steps
 * are the `choices` of those options, read in the type of that field, so the
 * text is the name the track and the display's component go by. A field
 * without a value has no text.
 */
export function textHandler(
	value: unknown,
	_options?: unknown,
	context?: { interfaceOptions?: unknown; field?: { type?: unknown } | null },
): string | null {
	if (isEmpty(value)) return null;
	return progressText(value, context?.interfaceOptions, context?.field?.type);
}
