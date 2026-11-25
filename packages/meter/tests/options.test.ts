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
		expect(fields.map((field) => field.field)).toEqual(['min', 'max', 'label', 'indicator', 'indicatorFormat', 'visualization', 'color', 'thresholds', 'activeColoring', 'inactiveColoring', 'input', 'step']);
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
		expect(fields.map((field) => field.field)).toEqual(['inherited', 'min', 'max', 'label', 'indicator', 'indicatorFormat', 'visualization', 'color', 'thresholds', 'activeColoring', 'inactiveColoring']);
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

describe('the options of the look', () => {
	const keys = (fields: ReturnType<typeof optionFields>) => fields.map((field) => field.field);
	const choices = (fields: ReturnType<typeof optionFields>, key: string) => (fieldOf(fields, key).meta?.options?.['choices'] as { text: string; value: string }[]).map((choice) => choice.value);
	const BASE = ['min', 'max', 'label', 'indicator', 'indicatorFormat'];
	const COLOURS = ['color', 'thresholds', 'activeColoring', 'inactiveColoring'];
	const EDITING = ['input', 'step'];

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

	test('the number of subdivisions is asked for only while the track is cut into pieces, the layout of the dots only for dots', () => {
		expect(keys(optionFields({}, false))).toEqual([...BASE, 'visualization', ...COLOURS, ...EDITING]);
		expect(keys(optionFields({}, false, {}))).toEqual([...BASE, 'visualization', ...COLOURS, ...EDITING]);
		expect(keys(optionFields({}, false, { visualization: 'contiguous', subdivisions: 4, dotsLayout: 'spread' }))).toEqual([...BASE, 'visualization', ...COLOURS, ...EDITING]);
		expect(keys(optionFields({}, false, { visualization: 'rings' }))).toEqual([...BASE, 'visualization', ...COLOURS, ...EDITING]);

		for (const visualization of ['pills', 'segments', 'bars']) {
			expect(keys(optionFields({}, false, { visualization }))).toEqual([...BASE, 'visualization', 'subdivisions', ...COLOURS, ...EDITING]);
		}

		expect(keys(optionFields({}, false, { visualization: 'dots' }))).toEqual([...BASE, 'visualization', 'subdivisions', 'dotsLayout', ...COLOURS, ...EDITING]);
	});

	test('a whole-number input from 2 upward with no largest, which says that the width is the ceiling', () => {
		const field = fieldOf(optionFields({}, false, { visualization: 'pills' }), 'subdivisions');

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
		const fields = optionFields({}, false, { visualization: 'dots' });

		expect(choices(fields, 'dotsLayout')).toEqual(['packed', 'spread']);
		expect(choices(fields, 'activeColoring')).toEqual(['value', 'steps', 'gradient']);
		expect(choices(fields, 'inactiveColoring')).toEqual(['plain', 'automatic', 'value', 'steps', 'gradient']);

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

		// Nothing of its own: the interface draws dots, so the number and the layout are asked for, with the interface's shown.
		const fields = optionFields(inherited, true, {});
		expect(keys(fields)).toEqual(['inherited', ...BASE, 'visualization', 'subdivisions', 'dotsLayout', ...COLOURS]);
		expect(preset(fields, 'visualization')).toBe('dots');
		expect(placeholder(fields, 'subdivisions')).toBe('4');
		expect(preset(fields, 'dotsLayout')).toBe('spread');
		expect(preset(fields, 'activeColoring')).toBe('gradient');
		expect(preset(fields, 'inactiveColoring')).toBe('automatic');

		// One bar of its own: no number and no layout.
		expect(keys(optionFields(inherited, true, { visualization: 'contiguous' }))).toEqual(['inherited', ...BASE, 'visualization', ...COLOURS]);

		// Pills of its own on a field whose interface is one bar.
		const own = optionFields({}, true, { visualization: 'pills' });
		expect(preset(own, 'visualization')).toBe('contiguous');
		expect(placeholder(own, 'subdivisions')).toBe('$t:automatic');
	});

	test('a dropdown of the display can be emptied, and then shows what it comes to', () => {
		const inherited = { visualization: 'dots', dotsLayout: 'spread', activeColoring: 'gradient', inactiveColoring: 'automatic' };

		// Emptied, which is stored as null: taken from the interface again.
		const fields = optionFields(inherited, true, { visualization: null, dotsLayout: null, activeColoring: null, inactiveColoring: null });

		expect(keys(fields)).toContain('dotsLayout');

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
		const bare = optionFields({}, true, { visualization: 'dots' });
		expect(placeholder(bare, 'visualization')).toBe('Contiguous');
		expect(placeholder(bare, 'dotsLayout')).toBe('Packed');
		expect(placeholder(bare, 'activeColoring')).toBe('Value');
		expect(placeholder(bare, 'inactiveColoring')).toBe('Plain');
	});
});

describe('the options of editing', () => {
	const keys = (fields: ReturnType<typeof optionFields>) => fields.map((field) => field.field);

	test('only the interface has them: a display is never edited', () => {
		for (const own of [{}, { input: 'relative', step: 5, sensitivity: 2 }]) {
			const display = keys(optionFields({ input: 'relative', step: 5 }, true, own, 'integer'));

			expect(display).not.toContain('input');
			expect(display).not.toContain('step');
			expect(display).not.toContain('sensitivity');
		}
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
			['integer', 'integer'],
			['bigInteger', 'integer'],
		] as const) {
			const field = fieldOf(optionFields({}, false, {}, type), 'step');

			expect(field.name).toBe('Step');
			expect(field.type, String(type)).toBe(kind);
			expect(field.meta?.interface).toBe('input');
			expect(field.meta?.options).toEqual({ placeholder: '1', min: 0 });
			expect(field.schema?.default_value).toBeUndefined();
		}
	});

	test('the step a stock Slider left behind is shown as what an empty step comes to', () => {
		expect(placeholder(optionFields({ stepInterval: 5 }, false, {}, 'integer'), 'step')).toBe('5');
		expect(placeholder(optionFields({ stepInterval: 0.5 }, false, {}, 'float'), 'step')).toBe('0.5');
		expect(placeholder(optionFields({ stepInterval: 0.5 }, false, {}, 'integer'), 'step')).toBe('1');
		expect(placeholder(optionFields({ stepInterval: 'abc' }, false, {}, 'float'), 'step')).toBe('1');
		expect(placeholder(optionFields({ stepInterval: 5 }, false, { step: 2 }, 'integer'), 'step')).toBe('5');
	});

	test('the sensitivity is asked for only by the relative method', () => {
		expect(keys(optionFields({}, false, {}))).not.toContain('sensitivity');
		expect(keys(optionFields({}, false, { input: 'automatic', sensitivity: 2 }))).not.toContain('sensitivity');
		expect(keys(optionFields({}, false, { input: 'contiguous' }))).not.toContain('sensitivity');
		expect(keys(optionFields({}, false, { input: 'segment' }))).not.toContain('sensitivity');
		expect(keys(optionFields({}, false, { input: 'drag' }))).not.toContain('sensitivity');

		const fields = optionFields({}, false, { input: 'relative' });
		expect(keys(fields).slice(-3)).toEqual(['input', 'step', 'sensitivity']);

		const field = fieldOf(fields, 'sensitivity');
		expect(field.name).toBe('Sensitivity');
		expect(field.type).toBe('float');
		expect(field.meta?.interface).toBe('input');
		expect(field.meta?.options).toEqual({ placeholder: '1', min: 0 });
	});
});
