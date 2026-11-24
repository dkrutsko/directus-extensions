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

	test('has the seven options, under their keys and in this order', () => {
		expect(fields.map((field) => field.field)).toEqual(['min', 'max', 'label', 'indicator', 'indicatorFormat', 'color', 'thresholds']);
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
		expect(fields.map((field) => field.field)).toEqual(['inherited', 'min', 'max', 'label', 'indicator', 'indicatorFormat', 'color', 'thresholds']);
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
