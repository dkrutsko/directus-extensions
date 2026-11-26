// The part of the interface which needs no Vue, DOM or Directus: what a value
// means, what a toggle writes, when the switch is inert or dimmed, what it is
// called and what the options come to. The unit tests run it in Node.

/** What the switch shows. `unset` is a field which holds no answer yet. */
export type State = 'on' | 'off' | 'unset';

/** The options of a field as the form hands them over: anything, or nothing. */
export interface RawOptions {
	label?: unknown;
	description?: unknown;
	iconOn?: unknown;
	iconOff?: unknown;
	colorOn?: unknown;
	colorOff?: unknown;
}

/** The options after `readOptions`: every one has a usable value. */
export interface Options {
	label: string;
	/** `null` is no second line. */
	description: string | null;
	/** `null` is a knob without an icon. */
	iconOn: string | null;
	iconOff: string | null;
	colorOn: string;
	colorOff: string;
}

/** What the form says about whether the field can change. A missing flag is `false`. */
export interface Flags {
	disabled?: boolean;
	nonEditable?: boolean;
	loading?: boolean;
}

/** The knob and the track of one state. */
export interface Look {
	icon: string | null;
	color: string;
}

/** The label when the app has no translation to offer. */
export const DEFAULT_LABEL = 'Enabled';

export const DEFAULT_ICON_ON = 'check';
export const DEFAULT_ICON_OFF = 'close';

// The colours of the stock Toggle, so a field looks the same in both until
// someone picks a colour.
export const DEFAULT_COLOR_ON = 'var(--theme--primary)';
export const DEFAULT_COLOR_OFF = 'var(--theme--form--field--input--foreground-subdued)';

// A field without an answer is not a field which says no, so it has a look
// of its own which the options cannot change.
export const UNSET_ICON = 'remove';
export const UNSET_COLOR = 'var(--theme--form--field--input--foreground-subdued)';

// A colour is a hex colour or one of the app's theme variables, and nothing
// else, so it can be handed to CSS as it is. That leaves no room for a
// second declaration, a url() or a var() with a fallback.
const MAX_COLOR_LENGTH = 80;
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const THEME_COLOR = /^var\(--theme--[a-z0-9]+(?:--?[a-z0-9]+)*\)$/;

/**
 * Which state a stored value is. A boolean field holds `true`, `false` or
 * `null`. Anything else is a value which was written outside the app: a
 * column without the `cast-boolean` special (SQLite hands back `0` and `1`),
 * a row of a Repeater, an import. Such a value is on where Directus itself
 * would read it as true, which is `true`, `1`, `'1'` and `'true'`
 * (`toBoolean`, packages/utils/shared/to-boolean.ts:4-6 in Directus 11.17.4),
 * and off otherwise, so `'false'` and `'0'` are not on because they are text.
 */
export function stateOf(value: unknown): State {
	if (value === null || value === undefined) return 'unset';
	return value === true || value === 1 || value === '1' || value === 'true' ? 'on' : 'off';
}

/** What a toggle writes: always a boolean, and `true` for a field without an answer. */
export function toggled(value: unknown): boolean {
	return stateOf(value) !== 'on';
}

/** Whether the switch stays as it is: the form may not, or cannot yet, take a new value. */
export function isInert(flags: Flags): boolean {
	return flags.disabled === true || flags.nonEditable === true || flags.loading === true;
}

/**
 * Whether the switch is drawn at half strength: a field which is read-only.
 * `nonEditable` is what the form sets in the comparison of revisions and
 * versions, where the value is there to be read, so it wins over `disabled`.
 * A form which is loading is inert but not dimmed, or every box would blink.
 */
export function isDimmed(flags: Flags): boolean {
	return flags.disabled === true && flags.nonEditable !== true;
}

/**
 * The name of the field, to be said in front of the label: with it, two
 * switches which both show "Enabled" are still told apart. `null` where the
 * form gives no name, and where the name says what the label says already.
 */
export function fieldNameFor(name: unknown, label: string): string | null {
	const text = typeof name === 'string' ? name.trim() : '';
	if (text === '') return null;

	return text.toLowerCase() === label.trim().toLowerCase() ? null : text;
}

/** The label, trimmed. The switch always has one, since it is also its accessible name. */
export function labelText(label: unknown, fallback: string = DEFAULT_LABEL): string {
	const text = typeof label === 'string' ? label.trim() : '';
	return text !== '' ? text : fallback;
}

/** The description, trimmed, or `null` when there is nothing to show. */
export function descriptionText(description: unknown): string | null {
	const text = typeof description === 'string' ? description.trim() : '';
	return text !== '' ? text : null;
}

/** Whether a colour may reach CSS as it is. */
export function isColor(color: unknown): color is string {
	return typeof color === 'string' && color.length <= MAX_COLOR_LENGTH && (HEX_COLOR.test(color) || THEME_COLOR.test(color));
}

/** The colour of an option, or the fallback when the option holds anything but a colour. */
export function colorOr(color: unknown, fallback: string): string {
	const text = typeof color === 'string' ? color.trim() : color;
	return isColor(text) ? text : fallback;
}

/**
 * The icon of an option. An option which was never set gives the fallback.
 * One which was cleared in the icon picker is stored as `null`, and gives a
 * knob without an icon.
 */
export function iconOr(icon: unknown, fallback: string): string | null {
	if (icon === null) return null;
	if (typeof icon !== 'string') return fallback;

	const name = icon.trim();
	return name !== '' ? name : null;
}

/** Works out every option. `defaultLabel` is the app's translation of "Enabled". */
export function readOptions(raw: RawOptions, defaultLabel: string = DEFAULT_LABEL): Options {
	return {
		label: labelText(raw.label, defaultLabel),
		description: descriptionText(raw.description),
		iconOn: iconOr(raw.iconOn, DEFAULT_ICON_ON),
		iconOff: iconOr(raw.iconOff, DEFAULT_ICON_OFF),
		colorOn: colorOr(raw.colorOn, DEFAULT_COLOR_ON),
		colorOff: colorOr(raw.colorOff, DEFAULT_COLOR_OFF),
	};
}

/** The icon in the knob and the colour of the track for a state. */
export function lookOf(state: State, options: Options): Look {
	if (state === 'on') return { icon: options.iconOn, color: options.colorOn };
	if (state === 'off') return { icon: options.iconOff, color: options.colorOff };
	return { icon: UNSET_ICON, color: UNSET_COLOR };
}
