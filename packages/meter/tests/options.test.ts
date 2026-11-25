import { describe, expect, test } from 'vitest';
import { optionFields } from '../src/options';

const GREEN = '#2ECDA7';

/** One field of a form, by its key. */
const fieldOf = (fields: ReturnType<typeof optionFields>, key: string) => {
	const found = fields.find((field) => field.field === key);
	if (!found) throw new Error(`the form has no field ${key}`);
	return found;
};

const placeholder = (fields: ReturnType<typeof optionFields>, key: string) => fieldOf(fields, key).meta?.options?.['placeholder'];
const preset = (fields: ReturnType<typeof optionFields>, key: string) => fieldOf(fields, key).schema?.default_value;

describe('the options form of the interface', () => {
	const fields = optionFields({}, false);

	test('has its options, under their keys and in this order', () => {
		expect(fields.map((field) => field.field)).toEqual(['min', 'max', 'label', 'indicator', 'indicatorFormat', 'visualization', 'subdivisions', 'dotsLayout', 'grow', 'fade', 'color', 'thresholds', 'activeColoring', 'inactiveColoring', 'input', 'step', 'sensitivity']);
	});

	test('the limits are number inputs which hand over numbers, with the defaults as placeholders', () => {
		for (const key of ['min', 'max']) {
			expect(fieldOf(fields, key).type).toBe('float');
			expect(fieldOf(fields, key).meta?.interface).toBe('input');
			expect(fieldOf(fields, key).meta?.required).toBeUndefined();
		}

		expect(placeholder(fields, 'min')).toBe('0');
		expect(placeholder(fields, 'max')).toBe('100');
	});

	test('shows the defaults of the components: the text on, as a percentage, no colour and no thresholds', () => {
		expect(preset(fields, 'indicator')).toBe(true);
		expect(preset(fields, 'indicatorFormat')).toBe('percent');
		expect(preset(fields, 'color')).toBeNull();
		expect(preset(fields, 'thresholds')).toBeNull();
	});

	test('offers the three formats', () => {
		const choices = fieldOf(fields, 'indicatorFormat').meta?.options?.['choices'] as { value: string }[];
		expect(choices.map((choice) => choice.value)).toEqual(['percent', 'value', 'fraction']);
	});

	test('a threshold has a number and a colour, both required', () => {
		const entry = fieldOf(fields, 'thresholds').meta?.options?.['fields'] as { field: string; type: string; meta: { required: boolean } }[];

		expect(entry.map((field) => [field.field, field.type, field.meta.required])).toEqual([
			['value', 'float', true],
			['color', 'string', true],
		]);
	});

	test('the limits a stock Slider left behind are the placeholders', () => {
		const moved = optionFields({ minValue: 1, maxValue: 5 }, false);

		expect(placeholder(moved, 'min')).toBe('1');
		expect(placeholder(moved, 'max')).toBe('5');
	});
});

describe('the options form of the display', () => {
	const inherited = {
		min: '0',
		max: 12.5,
		label: 'Litres per day',
		indicator: false,
		indicatorFormat: 'fraction',
		color: GREEN,
		thresholds: [
			{ value: 80, color: GREEN },
			{ value: 'abc', color: GREEN },
		],
	};

	const fields = optionFields(inherited, true);

	test('starts with a notice which stores nothing, and has the same options', () => {
		expect(fields.map((field) => field.field)).toEqual(['inherited', 'min', 'max', 'label', 'indicator', 'indicatorFormat', 'visualization', 'subdivisions', 'dotsLayout', 'fade', 'color', 'thresholds', 'activeColoring', 'inactiveColoring']);
		expect(fields[0]?.type).toBe('alias');
		expect(fields[0]?.meta?.interface).toBe('presentation-notice');
		expect(fields[0]?.meta?.special).toEqual(['alias', 'no-data']);
	});

	test('shows what it takes over from the interface', () => {
		expect(placeholder(fields, 'min')).toBe('0');
		expect(placeholder(fields, 'max')).toBe('12.5');
		expect(placeholder(fields, 'label')).toBe('Litres per day');
		expect(preset(fields, 'indicator')).toBe(false);
		expect(preset(fields, 'indicatorFormat')).toBe('fraction');
		expect(preset(fields, 'color')).toBe(GREEN);
		expect(preset(fields, 'thresholds')).toEqual([{ value: 80, color: GREEN }]);
	});

	test('on a field of the stock Slider, the Slider limits', () => {
		const slider = optionFields({ minValue: 1, maxValue: 5, stepInterval: 1 }, true);

		expect(placeholder(slider, 'min')).toBe('1');
		expect(placeholder(slider, 'max')).toBe('5');
		expect(preset(slider, 'indicator')).toBe(true);
	});

	test('on a field which holds both pairs of limits, `min` and `max`', () => {
		const both = optionFields({ min: 0, max: 10, minValue: 1, maxValue: 5 }, true);

		expect(placeholder(both, 'min')).toBe('0');
		expect(placeholder(both, 'max')).toBe('10');
	});

	test('the notice says what an emptied option comes to', () => {
		const text = String(fields[0]?.meta?.options?.['text']);

		expect(text).toContain('taken from the interface of the field');
		expect(text).toContain('Emptied limits and an emptied label are taken from it again');
		expect(text).toContain('An emptied colour or list of thresholds means none');
	});

	test('on a field without interface options, the defaults', () => {
		for (const nothing of [{}, null, undefined, 'abc']) {
			const bare = optionFields(nothing, true);

			expect(placeholder(bare, 'min')).toBe('0');
			expect(placeholder(bare, 'max')).toBe('100');
			expect(preset(bare, 'indicator')).toBe(true);
			expect(preset(bare, 'indicatorFormat')).toBe('percent');
			expect(preset(bare, 'color')).toBeNull();
			expect(preset(bare, 'thresholds')).toBeNull();
		}
	});
});

/**
 * Whether the form shows a field for the values it holds, as the app's forms decide it (`applyConditions` in
 * app/src/utils/apply-conditions.ts of Directus 11.17.4): the conditions of the field are gone through from the
 * last to the first, the first whose rule the values meet says whether the field is hidden, and without one the
 * field's own `hidden` holds. The values are the defaults of the form's fields with what was set laid over them;
 * an option which was emptied is `null` there, which meets no rule.
 */
function shown(fields: ReturnType<typeof optionFields>, key: string, set: Record<string, unknown> = {}): boolean {
	const defaults = Object.fromEntries(fields.filter((field) => field.schema?.default_value !== undefined).map((field) => [field.field, field.schema?.default_value]));
	const values: Record<string, unknown> = { ...defaults, ...set };
	const field = fieldOf(fields, key);
	const conditions = [...((field.meta?.conditions ?? []) as { rule: Record<string, { _eq?: unknown; _in?: unknown[] }>; hidden?: boolean }[])].reverse();

	const met = conditions.find((condition) => {
		const entries = Object.entries(condition.rule);
		if (entries.length !== 1) return false;

		const [name, test] = entries[0]!;
		return '_eq' in test ? values[name] === test._eq : (test._in ?? []).includes(values[name]);
	});

	return !(met ? met.hidden : field.meta?.hidden);
}

describe('the options of the look', () => {
	const keys = (fields: ReturnType<typeof optionFields>) => fields.map((field) => field.field);
	const choices = (fields: ReturnType<typeof optionFields>, key: string) => (fieldOf(fields, key).meta?.options?.['choices'] as { text: string; value: string }[]).map((choice) => choice.value);
	const BEFORE = ['min', 'max', 'label', 'indicator', 'indicatorFormat', 'visualization', 'subdivisions', 'dotsLayout'];
	const AFTER = ['fade', 'color', 'thresholds', 'activeColoring', 'inactiveColoring'];
	// The interface has `grow`, which the display has not.
	const LOOK = [...BEFORE, 'grow', ...AFTER];
	const SHOWN = [...BEFORE, ...AFTER];

	test('a dropdown with the five visualizations, which shows one bar until another is chosen', () => {
		const fields = optionFields({}, false);

		expect(fieldOf(fields, 'visualization').name).toBe('Visualization');
		expect(fieldOf(fields, 'visualization').meta?.interface).toBe('select-dropdown');
		expect(fieldOf(fields, 'visualization').meta?.options?.['choices']).toEqual([
			{ text: 'Contiguous', value: 'contiguous' },
			{ text: 'Pills', value: 'pills' },
			{ text: 'Segments', value: 'segments' },
			{ text: 'Bars', value: 'bars' },
			{ text: 'Dots', value: 'dots' },
		]);
		expect(preset(fields, 'visualization')).toBe('contiguous');
	});

	test('every option is always in the list, whatever the field and whatever is set: none can be out of reach', () => {
		// The ordinary field settings hand over the field; the dialog of a stock Repeater's fields hands over a
		// stand-in without options or a type. The list is the same.
		expect(keys(optionFields({}, false))).toEqual([...LOOK, 'input', 'step', 'sensitivity']);
		expect(keys(optionFields({}, false, 'unknown'))).toEqual([...LOOK, 'input', 'step', 'sensitivity']);
		expect(keys(optionFields({ visualization: 'dots', input: 'relative' }, false, 'integer'))).toEqual([...LOOK, 'input', 'step', 'sensitivity']);
		expect(keys(optionFields({}, true))).toEqual(['inherited', ...SHOWN]);
		expect(keys(optionFields({ visualization: 'dots' }, true))).toEqual(['inherited', ...SHOWN]);
	});

	test('the number of subdivisions shows only while the track is cut into pieces, the layout of the dots only for dots', () => {
		const fields = optionFields({}, false);

		// Nothing set, which is one bar: neither.
		expect(shown(fields, 'subdivisions')).toBe(false);
		expect(shown(fields, 'dotsLayout')).toBe(false);
		expect(shown(fields, 'subdivisions', { visualization: 'contiguous', subdivisions: 4, dotsLayout: 'spread' })).toBe(false);
		expect(shown(fields, 'dotsLayout', { visualization: 'contiguous', dotsLayout: 'spread' })).toBe(false);

		for (const visualization of ['pills', 'segments', 'bars']) {
			expect(shown(fields, 'subdivisions', { visualization }), visualization).toBe(true);
			expect(shown(fields, 'dotsLayout', { visualization }), visualization).toBe(false);
		}

		expect(shown(fields, 'subdivisions', { visualization: 'dots' })).toBe(true);
		expect(shown(fields, 'dotsLayout', { visualization: 'dots' })).toBe(true);

		// Every other option shows always: it has no condition and is not hidden.
		for (const key of ['min', 'max', 'label', 'indicator', 'indicatorFormat', 'visualization', 'color', 'thresholds', 'activeColoring', 'inactiveColoring', 'input', 'step']) {
			expect(fieldOf(fields, key).meta?.hidden, key).toBeUndefined();
			expect(fieldOf(fields, key).meta?.conditions, key).toBeUndefined();
		}
	});

	test('the conditions are on the values of the form itself, one option each, so the form can decide them anywhere', () => {
		const fields = optionFields({}, false);

		expect(fieldOf(fields, 'subdivisions').meta?.conditions).toEqual([
			{ name: 'One bar', rule: { visualization: { _eq: 'contiguous' } }, hidden: true },
			{ name: 'Pieces', rule: { visualization: { _in: ['pills', 'segments', 'bars', 'dots'] } }, hidden: false },
		]);

		expect(fieldOf(fields, 'dotsLayout').meta?.conditions).toEqual([
			{ name: 'Not dots', rule: { visualization: { _in: ['contiguous', 'pills', 'segments', 'bars'] } }, hidden: true },
			{ name: 'Dots', rule: { visualization: { _eq: 'dots' } }, hidden: false },
		]);

		expect(fieldOf(fields, 'sensitivity').meta?.conditions).toEqual([{ name: 'Relative', rule: { input: { _eq: 'relative' } }, hidden: false }]);
	});

	test('a whole-number input from 2 upward with no largest, which says that the width is the ceiling', () => {
		const field = fieldOf(optionFields({}, false), 'subdivisions');

		expect(field.name).toBe('Subdivisions');
		expect(field.type).toBe('integer');
		expect(field.meta?.interface).toBe('input');
		// The app's own word for it, in the language of the user.
		expect(field.meta?.options).toEqual({ placeholder: '$t:automatic', min: 2 });
		expect(field.meta?.note).toContain('at least 2');
		expect(field.meta?.note).toContain('The width is the ceiling');
		expect(field.schema?.default_value).toBeUndefined();
	});

	test('the dropdowns of the layout of the dots and of the two colourings', () => {
		const fields = optionFields({}, false);

		expect(choices(fields, 'dotsLayout')).toEqual(['packed', 'spread']);
		expect(choices(fields, 'activeColoring')).toEqual(['value', 'blend', 'steps', 'gradient']);
		expect((fieldOf(fields, 'activeColoring').meta?.options?.['choices'] as { text: string }[])[1]!.text).toBe('Blend');
		expect(choices(fields, 'inactiveColoring')).toEqual(['plain', 'automatic', 'value', 'blend', 'steps', 'gradient']);

		expect(preset(fields, 'dotsLayout')).toBe('packed');
		expect(preset(fields, 'activeColoring')).toBe('value');
		expect(preset(fields, 'inactiveColoring')).toBe('plain');

		expect(fieldOf(fields, 'dotsLayout').name).toBe('Dots Layout');
		expect(fieldOf(fields, 'activeColoring').name).toBe('Active Coloring');
		expect(fieldOf(fields, 'inactiveColoring').name).toBe('Inactive Coloring');

		for (const key of ['visualization', 'dotsLayout', 'activeColoring', 'inactiveColoring']) {
			expect(fieldOf(fields, key).type).toBe('string');
			expect(fieldOf(fields, key).meta?.interface).toBe('select-dropdown');
			expect(fieldOf(fields, key).meta?.width).toBe('half');

			// The interface has nothing to go back to, so its dropdowns cannot be emptied.
			expect(fieldOf(fields, key).meta?.options?.['allowNone']).toBeUndefined();
			expect(placeholder(fields, key)).toBeUndefined();
		}
	});

	test('the form of the display shows what it takes over from the interface', () => {
		const inherited = { visualization: 'dots', subdivisions: 4, dotsLayout: 'spread', activeColoring: 'gradient', inactiveColoring: 'automatic' };

		// Nothing of its own: the interface draws dots, so the number and the layout show, with the interface's in them.
		const fields = optionFields(inherited, true);
		expect(preset(fields, 'visualization')).toBe('dots');
		expect(shown(fields, 'subdivisions')).toBe(true);
		expect(shown(fields, 'dotsLayout')).toBe(true);
		expect(placeholder(fields, 'subdivisions')).toBe('4');
		expect(preset(fields, 'dotsLayout')).toBe('spread');
		expect(preset(fields, 'activeColoring')).toBe('gradient');
		expect(preset(fields, 'inactiveColoring')).toBe('automatic');

		// One bar of its own: no number and no layout.
		expect(shown(fields, 'subdivisions', { visualization: 'contiguous' })).toBe(false);
		expect(shown(fields, 'dotsLayout', { visualization: 'contiguous' })).toBe(false);

		// Pills of its own: the number, and no layout.
		expect(shown(fields, 'subdivisions', { visualization: 'pills' })).toBe(true);
		expect(shown(fields, 'dotsLayout', { visualization: 'pills' })).toBe(false);

		// Pills of its own on a field whose interface is one bar.
		const own = optionFields({}, true);
		expect(preset(own, 'visualization')).toBe('contiguous');
		expect(shown(own, 'subdivisions')).toBe(false);
		expect(shown(own, 'subdivisions', { visualization: 'pills' })).toBe(true);
		expect(placeholder(own, 'subdivisions')).toBe('$t:automatic');
	});

	test('a dropdown of the display can be emptied, and then shows what it comes to', () => {
		const inherited = { visualization: 'dots', dotsLayout: 'spread', activeColoring: 'gradient', inactiveColoring: 'automatic' };
		const fields = optionFields(inherited, true);

		// Emptied, which is stored as null: taken from the interface again, whose dots still want their number and layout.
		const emptied = { visualization: null, dotsLayout: null, activeColoring: null, inactiveColoring: null };
		expect(shown(fields, 'subdivisions', emptied)).toBe(true);
		expect(shown(fields, 'dotsLayout', emptied)).toBe(true);

		// Emptied over an interface which draws one bar: neither.
		expect(shown(optionFields({}, true), 'subdivisions', emptied)).toBe(false);
		expect(shown(optionFields({}, true), 'dotsLayout', emptied)).toBe(false);

		for (const [key, text] of [
			['visualization', 'Dots'],
			['dotsLayout', 'Spread'],
			['activeColoring', 'Gradient'],
			['inactiveColoring', 'Automatic'],
		] as const) {
			expect(fieldOf(fields, key).meta?.options?.['allowNone']).toBe(true);
			expect(placeholder(fields, key)).toBe(text);
		}

		// With nothing in the interface, the placeholders are the defaults.
		const bare = optionFields({}, true);
		expect(placeholder(bare, 'visualization')).toBe('Contiguous');
		expect(placeholder(bare, 'dotsLayout')).toBe('Packed');
		expect(placeholder(bare, 'activeColoring')).toBe('Value');
		expect(placeholder(bare, 'inactiveColoring')).toBe('Plain');
	});
});

describe('the options of editing', () => {
	const keys = (fields: ReturnType<typeof optionFields>) => fields.map((field) => field.field);

	test('only the interface has them: a display is never edited', () => {
		const display = keys(optionFields({ input: 'relative', step: 5 }, true, 'integer'));

		expect(display).not.toContain('input');
		expect(display).not.toContain('step');
		expect(display).not.toContain('sensitivity');
	});

	test('a dropdown with the four methods, which shows automatic until another is chosen', () => {
		const field = fieldOf(optionFields({}, false), 'input');

		expect(field.name).toBe('Input Method');
		expect(field.type).toBe('string');
		expect(field.meta?.interface).toBe('select-dropdown');
		expect(field.meta?.width).toBe('half');
		expect(field.meta?.options?.['choices']).toEqual([
			{ text: 'Automatic', value: 'automatic' },
			{ text: 'Contiguous', value: 'contiguous' },
			{ text: 'Segment', value: 'segment' },
			{ text: 'Relative', value: 'relative' },
		]);
		expect(field.schema?.default_value).toBe('automatic');
		expect(field.meta?.note).toContain('read-only');
	});

	test('the step is a number input which shows 1 while it is empty, and whole numbers for a whole type', () => {
		for (const [type, kind] of [
			['float', 'float'],
			['decimal', 'float'],
			[undefined, 'float'],
			// The dialog of a stock Repeater's fields does not say the type of the field.
			['unknown', 'float'],
			['integer', 'integer'],
			['bigInteger', 'integer'],
		] as const) {
			const field = fieldOf(optionFields({}, false, type), 'step');

			expect(field.name).toBe('Step');
			expect(field.type, String(type)).toBe(kind);
			expect(field.meta?.interface).toBe('input');
			expect(field.meta?.options).toEqual({ placeholder: '1', min: 0 });
			expect(field.schema?.default_value).toBeUndefined();
		}
	});

	test('the step a stock Slider left behind is shown as what an empty step comes to', () => {
		expect(placeholder(optionFields({ stepInterval: 5 }, false, 'integer'), 'step')).toBe('5');
		expect(placeholder(optionFields({ stepInterval: 0.5 }, false, 'float'), 'step')).toBe('0.5');
		expect(placeholder(optionFields({ stepInterval: 0.5 }, false, 'integer'), 'step')).toBe('1');
		expect(placeholder(optionFields({ stepInterval: 'abc' }, false, 'float'), 'step')).toBe('1');
	});

	test('the sensitivity shows only for the relative method', () => {
		const fields = optionFields({}, false);

		expect(keys(fields).slice(-3)).toEqual(['input', 'step', 'sensitivity']);
		expect(shown(fields, 'sensitivity')).toBe(false);
		expect(shown(fields, 'sensitivity', { input: 'automatic', sensitivity: 2 })).toBe(false);
		expect(shown(fields, 'sensitivity', { input: 'contiguous' })).toBe(false);
		expect(shown(fields, 'sensitivity', { input: 'segment' })).toBe(false);
		expect(shown(fields, 'sensitivity', { input: 'drag' })).toBe(false);
		expect(shown(fields, 'sensitivity', { input: 'relative' })).toBe(true);

		const field = fieldOf(fields, 'sensitivity');
		expect(field.name).toBe('Sensitivity');
		expect(field.type).toBe('float');
		expect(field.meta?.interface).toBe('input');
		expect(field.meta?.options).toEqual({ placeholder: '1', min: 0 });
	});
});

describe('the options form of a display which is not told its field', () => {
	// The dialog of a stock Repeater's field hands the form a stand-in without the options of the interface.
	const blind = optionFields({}, true, undefined, false);
	const told = optionFields({}, true);

	test('has the same options under the same keys', () => {
		expect(blind.map((field) => field.field)).toEqual(told.map((field) => field.field));
	});

	test('claims nothing about what an unset option comes to: the placeholders say that the interface decides', () => {
		for (const key of ['min', 'max', 'label', 'indicatorFormat', 'visualization', 'subdivisions', 'dotsLayout', 'activeColoring', 'inactiveColoring']) {
			expect(placeholder(blind, key), key).toBe('As in the interface');
		}

		expect(placeholder(told, 'max')).toBe('100');
		expect(placeholder(told, 'visualization')).toBe('Contiguous');
	});

	test('its dropdowns start empty, so nothing is shown as chosen which is not', () => {
		for (const key of ['indicatorFormat', 'visualization', 'dotsLayout', 'activeColoring', 'inactiveColoring']) {
			expect(fieldOf(blind, key).schema, key).toBeUndefined();
			expect(preset(told, key), key).toBeDefined();
		}

		for (const key of ['visualization', 'dotsLayout', 'activeColoring', 'inactiveColoring']) expect(fieldOf(blind, key).meta?.options?.['allowNone'], key).toBe(true);
	});

	test('the number of subdivisions and the layout of the dots show until the visualization of the form rules them out', () => {
		expect(shown(blind, 'subdivisions')).toBe(true);
		expect(shown(blind, 'dotsLayout')).toBe(true);

		expect(shown(blind, 'subdivisions', { visualization: 'contiguous' })).toBe(false);
		expect(shown(blind, 'dotsLayout', { visualization: 'contiguous' })).toBe(false);

		for (const shape of ['pills', 'segments', 'bars']) {
			expect(shown(blind, 'subdivisions', { visualization: shape }), shape).toBe(true);
			expect(shown(blind, 'dotsLayout', { visualization: shape }), shape).toBe(false);
		}

		expect(shown(blind, 'subdivisions', { visualization: 'dots' })).toBe(true);
		expect(shown(blind, 'dotsLayout', { visualization: 'dots' })).toBe(true);

		// A visualization which was chosen and emptied again is the interface's once more.
		expect(shown(blind, 'subdivisions', { visualization: null })).toBe(true);
		expect(shown(blind, 'dotsLayout', { visualization: null })).toBe(true);

		// Told its field, the form goes by the interface: one bar there, and neither shows.
		expect(shown(told, 'subdivisions')).toBe(false);
		expect(shown(told, 'dotsLayout')).toBe(false);
	});

	test('the notice says that the dialog cannot show what the interface has', () => {
		expect(String(fieldOf(blind, 'inherited').meta?.options?.['text'])).toContain('cannot show what is set there');
		expect(String(fieldOf(told, 'inherited').meta?.options?.['text'])).toContain('shown as it is set there');
	});

	test('the form of the interface is the same whether or not it is told', () => {
		expect(optionFields({}, false, 'unknown', false)).toEqual(optionFields({}, false, 'unknown'));
	});
});

describe('the options which grow the pieces and fade the next one in', () => {
	test('a number for how far the growth reaches, and a toggle for the fading, each with a note', () => {
		const fields = optionFields({}, false);

		const grow = fieldOf(fields, 'grow');
		expect(grow.name).toBe('Grow');
		expect(grow.type).toBe('float');
		expect(grow.meta?.interface).toBe('input');
		expect(grow.meta?.width).toBe('half');
		expect(grow.meta?.options).toEqual({ placeholder: '0', min: 0, max: 20, step: 0.5 });
		expect(grow.schema?.default_value).toBeUndefined();

		const fade = fieldOf(fields, 'fade');
		expect(fade.name).toBe('Fade In');
		expect(fade.type).toBe('boolean');
		expect(fade.meta?.interface).toBe('boolean');
		expect(fade.meta?.width).toBe('half');
		expect(preset(fields, 'fade')).toBe(false);

		for (const field of [grow, fade]) {
			expect(String(field.meta?.note).length).toBeGreaterThan(20);
			expect(String(field.meta?.note)).not.toContain('\n');
		}
	});

	test('they show only while the track is cut into pieces', () => {
		const fields = optionFields({}, false);

		for (const key of ['grow', 'fade']) {
			expect(shown(fields, key), key).toBe(false);
			expect(shown(fields, key, { visualization: 'contiguous', [key]: true }), key).toBe(false);
			for (const shape of ['pills', 'segments', 'bars', 'dots']) expect(shown(fields, key, { visualization: shape }), `${key} ${shape}`).toBe(true);
		}

		// A field which already draws pieces shows them from the start.
		expect(shown(optionFields({ visualization: 'dots' }, false), 'grow')).toBe(true);
	});

	test('only the interface grows its pieces: the display has no such option', () => {
		for (const fields of [optionFields({}, true), optionFields({ visualization: 'pills', grow: true }, true), optionFields({}, true, undefined, false)]) {
			expect(fields.map((field) => field.field)).not.toContain('grow');
			expect(fields.map((field) => field.field)).toContain('fade');
		}
	});

	test('the display fades as the interface does until it is set, and shows that', () => {
		expect(preset(optionFields({ fade: true }, true), 'fade')).toBe(true);
		expect(preset(optionFields({ fade: false }, true), 'fade')).toBe(false);
		expect(preset(optionFields({}, true), 'fade')).toBe(false);

		// With pieces on the interface it shows, with one bar there it does not, and the form's own visualization decides once it is set.
		expect(shown(optionFields({ visualization: 'pills' }, true), 'fade')).toBe(true);
		expect(shown(optionFields({}, true), 'fade')).toBe(false);
		expect(shown(optionFields({}, true), 'fade', { visualization: 'bars' })).toBe(true);
		expect(shown(optionFields({ visualization: 'pills' }, true), 'fade', { visualization: 'contiguous' })).toBe(false);

		// Not told its field, it shows until the form's own visualization rules it out.
		const blind = optionFields({}, true, undefined, false);
		expect(shown(blind, 'fade')).toBe(true);
		expect(shown(blind, 'fade', { visualization: 'contiguous' })).toBe(false);
	});
});
