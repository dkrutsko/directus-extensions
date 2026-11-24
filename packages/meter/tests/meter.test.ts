import { describe, expect, test } from 'vitest';
import {
	DEFAULT_COLOR,
	NO_VALUE,
	colorFor,
	formatNumber,
	formatPercent,
	fractionOf,
	isColor,
	isEmpty,
	numberOf,
	percentOf,
	readOptions,
	readThresholds,
	readingOf,
	textHandler,
	textOf,
	tooltipOf,
	valueText,
} from '../src/meter';

const EN = 'en-US';
const RED = '#E35169';
const AMBER = '#FFA439';
const GREEN = '#2ECDA7';

const range = (min: number, max: number) => ({ min, max });

describe('the number a value stands for', () => {
	test('a number is itself', () => {
		expect(numberOf(0)).toBe(0);
		expect(numberOf(50)).toBe(50);
		expect(numberOf(-12.5)).toBe(-12.5);
		expect(numberOf(1e300)).toBe(1e300);
		expect(numberOf(5e-324)).toBe(5e-324);
	});

	test('the text of a number is that number, as a decimal or a big integer field hands it over', () => {
		expect(numberOf('40')).toBe(40);
		expect(numberOf('12.50')).toBe(12.5);
		expect(numberOf('-0.5')).toBe(-0.5);
		expect(numberOf('+7')).toBe(7);
		expect(numberOf('.5')).toBe(0.5);
		expect(numberOf('5.')).toBe(5);
		expect(numberOf(' 42 ')).toBe(42);
		expect(numberOf('1e3')).toBe(1000);
		expect(numberOf('1.5E-3')).toBe(0.0015);
		expect(numberOf('9007199254740993')).toBe(9007199254740992);
	});

	test('a big integer is its number', () => {
		expect(numberOf(12n)).toBe(12);
		expect(numberOf(10n ** 400n)).toBeNull();
	});

	test('minus zero comes out as zero', () => {
		expect(Object.is(numberOf(-0), 0)).toBe(true);
		expect(Object.is(numberOf('-0'), 0)).toBe(true);
	});

	test('anything else is no number, and nothing throws', () => {
		const cyclic: Record<string, unknown> = {};
		cyclic['self'] = cyclic;

		for (const value of [null, undefined, '', '   ', 'abc', '12abc', '1,5', '0x10', 'Infinity', '-Infinity', 'NaN', '1e999', '--1', '1e', '.']) {
			expect(numberOf(value), String(value)).toBeNull();
		}

		for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, true, false, [], [5], {}, { value: 5 }, cyclic, () => 5, Symbol('five')]) {
			expect(numberOf(value)).toBeNull();
		}
	});
});

describe('an empty value, and a value as text', () => {
	test('null, nothing and blank text are empty; zero is not', () => {
		expect(isEmpty(null)).toBe(true);
		expect(isEmpty(undefined)).toBe(true);
		expect(isEmpty('')).toBe(true);
		expect(isEmpty('  ')).toBe(true);
		expect(isEmpty(0)).toBe(false);
		expect(isEmpty('0')).toBe(false);
		expect(isEmpty(false)).toBe(false);
	});

	test('any value has a text form', () => {
		const cyclic: Record<string, unknown> = {};
		cyclic['self'] = cyclic;

		expect(textOf('abc')).toBe('abc');
		expect(textOf(12)).toBe('12');
		expect(textOf(true)).toBe('true');
		expect(textOf(null)).toBe('');
		expect(textOf(undefined)).toBe('');
		expect(textOf({ a: 1 })).toBe('{"a":1}');
		expect(textOf([1, 2])).toBe('[1,2]');
		expect(textOf(cyclic)).toBe('[object Object]');
	});
});

describe('a colour', () => {
	test('a hex colour and a theme variable pass', () => {
		for (const color of ['#abc', '#ABCD', '#aabbcc', '#aabbccdd', '#6644FF', 'var(--theme--danger)', 'var(--theme--primary-background)', 'var(--theme--form--field--input--foreground)']) {
			expect(isColor(color), color).toBe(true);
		}
	});

	test('anything else does not, so nothing but a colour reaches CSS', () => {
		for (const color of [
			'red',
			'',
			'#ab',
			'#abcde',
			'#ggg',
			'rgb(0, 0, 0)',
			'url(x)',
			'javascript:1',
			'var(--x)',
			'var(--theme--danger, red)',
			'var(--x); color: red',
			'var(--theme--danger); color: red',
			'#abc; color: red',
			' #abc',
			`var(--theme--${'a'.repeat(80)})`,
		]) {
			expect(isColor(color), color).toBe(false);
		}

		for (const color of [null, undefined, 0, 0xabc, true, ['#abc'], { color: '#abc' }]) expect(isColor(color)).toBe(false);
	});
});

describe('the thresholds of a field', () => {
	test('well-formed entries come out in rising order, whatever the order of the list', () => {
		const list = [
			{ value: 80, color: GREEN },
			{ value: 50, color: AMBER },
		];

		expect(readThresholds(list)).toEqual([
			{ value: 50, color: AMBER },
			{ value: 80, color: GREEN },
		]);

		// The option itself is left as it is.
		expect(list[0]).toEqual({ value: 80, color: GREEN });
	});

	test('the text of a number counts, and a colour is trimmed', () => {
		expect(readThresholds([{ value: '12.5', color: ` ${GREEN} ` }])).toEqual([{ value: 12.5, color: GREEN }]);
	});

	test('an entry without a number or without a colour is left out', () => {
		expect(
			readThresholds([
				{ value: 'abc', color: GREEN },
				{ value: null, color: GREEN },
				{ color: GREEN },
				{ value: Number.NaN, color: GREEN },
				{ value: 10, color: 'javascript:1' },
				{ value: 20, color: 'red' },
				{ value: 30, color: null },
				{ value: 40 },
				null,
				'50',
				60,
				[70, GREEN],
				{ value: 90, color: 'var(--theme--danger)' },
			]),
		).toEqual([{ value: 90, color: 'var(--theme--danger)' }]);
	});

	test('anything which is not a list gives none', () => {
		for (const list of [null, undefined, '', 'abc', 5, {}, { value: 5, color: GREEN }]) expect(readThresholds(list)).toEqual([]);
	});

	test('of two entries with the same value the later one counts', () => {
		const thresholds = readThresholds([
			{ value: 50, color: AMBER },
			{ value: 50, color: GREEN },
		]);

		expect(colorFor(50, { color: RED, thresholds })).toBe(GREEN);
	});
});

describe('the options', () => {
	test('without any, the range is 0 to 100, the colour the default, and there is no caption', () => {
		const defaults = { min: 0, max: 100, label: null, indicator: true, indicatorFormat: 'percent', color: DEFAULT_COLOR, thresholds: [] };

		expect(readOptions()).toEqual(defaults);
		expect(readOptions({})).toEqual(defaults);
		expect(readOptions(null, null)).toEqual(defaults);
		expect(readOptions('abc', 5)).toEqual(defaults);
		expect(DEFAULT_COLOR).toBe('var(--theme--primary)');
	});

	test('a limit is a number or the text of one', () => {
		expect(readOptions({ min: '0', max: '12.5' })).toMatchObject({ min: 0, max: 12.5 });
		expect(readOptions({ min: 0, max: 12.5 })).toMatchObject({ min: 0, max: 12.5 });
		expect(readOptions({ min: '0', max: 12.5 })).toMatchObject({ min: 0, max: 12.5 });
		expect(readOptions({ min: -50, max: '50' })).toMatchObject({ min: -50, max: 50 });
	});

	test('a limit which is no number is its default, and the other one is kept', () => {
		for (const broken of [null, undefined, '', 'abc', Number.NaN, Number.POSITIVE_INFINITY, {}, [], true]) {
			expect(readOptions({ min: broken, max: 12.5 })).toMatchObject({ min: 0, max: 12.5 });
			expect(readOptions({ min: 20, max: broken })).toMatchObject({ min: 20, max: 100 });
		}
	});

	test('a minimum above the maximum counts as the two swapped', () => {
		expect(readOptions({ min: 100, max: 0 })).toMatchObject({ min: 0, max: 100 });
		expect(readOptions({ min: 10, max: -10 })).toMatchObject({ min: -10, max: 10 });

		// Also against a default: a minimum of 200 with no maximum is the range 100 to 200.
		expect(readOptions({ min: 200 })).toMatchObject({ min: 100, max: 200 });
	});

	test('the limits of the stock Slider count where there is no `min` or `max`', () => {
		expect(readOptions({ minValue: 1, maxValue: 5 })).toMatchObject({ min: 1, max: 5 });
		expect(readOptions({ min: 2, minValue: 1, max: 4, maxValue: 5 })).toMatchObject({ min: 2, max: 4 });
		expect(readOptions({ min: 'abc', minValue: 1 })).toMatchObject({ min: 1, max: 100 });
	});

	test('the caption is trimmed text, or none', () => {
		expect(readOptions({ label: '  Storage used ' }).label).toBe('Storage used');
		for (const label of ['', '   ', null, undefined, 5, true, {}]) expect(readOptions({ label }).label).toBeNull();
	});

	test('the value text is on unless it is switched off', () => {
		expect(readOptions({ indicator: false }).indicator).toBe(false);
		expect(readOptions({ indicator: true }).indicator).toBe(true);
		for (const indicator of [null, undefined, 'false', 0, 1, {}]) expect(readOptions({ indicator }).indicator).toBe(true);
	});

	test('a format which is none of the three is the percentage', () => {
		expect(readOptions({ indicatorFormat: 'value' }).indicatorFormat).toBe('value');
		expect(readOptions({ indicatorFormat: 'fraction' }).indicatorFormat).toBe('fraction');
		expect(readOptions({ indicatorFormat: 'percent' }).indicatorFormat).toBe('percent');
		for (const indicatorFormat of [null, undefined, true, 'Percent', 'ratio', 0, ['value']]) expect(readOptions({ indicatorFormat }).indicatorFormat).toBe('percent');
	});

	test('a colour which is none is the default', () => {
		expect(readOptions({ color: GREEN }).color).toBe(GREEN);
		expect(readOptions({ color: ' var(--theme--danger) ' }).color).toBe('var(--theme--danger)');
		for (const color of ['red', 'url(x)', 'var(--x); color: red', '', null, 5]) expect(readOptions({ color }).color).toBe(DEFAULT_COLOR);
	});

	test('the thresholds are cleaned', () => {
		expect(readOptions({ thresholds: [{ value: 80, color: GREEN }, { value: 'x', color: GREEN }, { value: 50, color: AMBER }] }).thresholds).toEqual([
			{ value: 50, color: AMBER },
			{ value: 80, color: GREEN },
		]);

		expect(readOptions({ thresholds: 'abc' }).thresholds).toEqual([]);
	});
});

describe('the display falls back to the options of the interface, key by key', () => {
	test('without options of its own it has those of the interface', () => {
		const inherited = { min: 0, max: 10, label: 'Tasks', indicator: false, indicatorFormat: 'fraction', color: GREEN, thresholds: [{ value: 5, color: AMBER }] };

		expect(readOptions({}, inherited)).toEqual({ ...inherited, thresholds: [{ value: 5, color: AMBER }] });
		expect(readOptions(undefined, inherited)).toEqual(readOptions(inherited));

		// Options which were never set arrive as `undefined`.
		expect(readOptions({ min: undefined, max: undefined, label: undefined, indicator: undefined, indicatorFormat: undefined, color: undefined, thresholds: undefined }, inherited)).toEqual(
			readOptions(inherited),
		);
	});

	test('emptied limits, an emptied caption, switch and format are taken over again', () => {
		const inherited = { min: 0, max: 10, label: 'Tasks', indicator: false, indicatorFormat: 'fraction' };

		// The options form stores `null` for an input which was emptied, and shows what is taken over as its placeholder.
		expect(readOptions({ min: null, max: null, label: null, indicator: null, indicatorFormat: null }, inherited)).toEqual(readOptions(inherited));
		expect(readOptions({ min: '', max: 'abc', label: '   ', indicatorFormat: 'ratio' }, inherited)).toEqual(readOptions(inherited));
	});

	test('an emptied colour or list of thresholds means none: only a missing key is taken over', () => {
		const inherited = { color: GREEN, thresholds: [{ value: 5, color: AMBER }] };
		const taken = { color: GREEN, thresholds: [{ value: 5, color: AMBER }] };
		const none = { color: DEFAULT_COLOR, thresholds: [] };

		// Missing: what the options form shows as the default of its inputs.
		expect(readOptions({}, inherited)).toMatchObject(taken);
		expect(readOptions({ color: undefined, thresholds: undefined }, inherited)).toMatchObject(taken);

		// Emptied: the form stores `null` and then shows empty inputs.
		expect(readOptions({ color: null, thresholds: null }, inherited)).toMatchObject(none);
		expect(readOptions({ color: '', thresholds: [] }, inherited)).toMatchObject(none);

		// Each on its own.
		expect(readOptions({ color: null }, inherited)).toMatchObject({ color: DEFAULT_COLOR, thresholds: taken.thresholds });
		expect(readOptions({ thresholds: null }, inherited)).toMatchObject({ color: GREEN, thresholds: [] });

		// A key which is there counts whatever it holds: nothing unusable falls through to another colour.
		expect(readOptions({ color: 'red', thresholds: 'abc' }, inherited)).toMatchObject(none);
		expect(readOptions({ thresholds: [{ value: 'x', color: RED }] }, inherited).thresholds).toEqual([]);
	});

	test('the limits of the stock Input and of the stock Slider are understood', () => {
		expect(readOptions({}, { min: 0, max: 10 })).toMatchObject({ min: 0, max: 10 });
		expect(readOptions({}, { minValue: 1, maxValue: 5, stepInterval: 1 })).toMatchObject({ min: 1, max: 5 });
		expect(readOptions({}, { min: '2', maxValue: '8' })).toMatchObject({ min: 2, max: 8 });
	});

	test('an option of its own wins, each on its own', () => {
		const inherited = { min: 0, max: 10, label: 'Tasks', indicator: true, indicatorFormat: 'fraction', color: GREEN, thresholds: [{ value: 5, color: AMBER }] };

		expect(readOptions({ max: 20 }, inherited)).toMatchObject({ min: 0, max: 20, label: 'Tasks' });
		expect(readOptions({ min: 5 }, inherited)).toMatchObject({ min: 5, max: 10 });
		expect(readOptions({ label: 'Done' }, inherited)).toMatchObject({ label: 'Done', color: GREEN });
		expect(readOptions({ indicator: false }, inherited)).toMatchObject({ indicator: false, indicatorFormat: 'fraction' });
		expect(readOptions({ indicator: true }, { indicator: false })).toMatchObject({ indicator: true });
		expect(readOptions({ indicatorFormat: 'value' }, inherited)).toMatchObject({ indicatorFormat: 'value' });
		expect(readOptions({ color: RED }, inherited)).toMatchObject({ color: RED });
		expect(readOptions({ thresholds: [{ value: 9, color: RED }] }, inherited).thresholds).toEqual([{ value: 9, color: RED }]);

		// A list of its own counts even when it is empty: the display then has no thresholds.
		expect(readOptions({ thresholds: [] }, inherited).thresholds).toEqual([]);
	});

	test('a limit or a format of its own which is unusable counts as not set', () => {
		const inherited = { min: 0, max: 10, indicatorFormat: 'value' };

		expect(readOptions({ min: 'abc', max: '', indicatorFormat: 'ratio' }, inherited)).toMatchObject({ min: 0, max: 10, indicatorFormat: 'value' });
	});

	test('the swap happens after the fall-back', () => {
		expect(readOptions({ min: 50 }, { max: 10 })).toMatchObject({ min: 10, max: 50 });
	});
});

describe('a field which holds both pairs of limits', () => {
	// What a field holds after its interface was changed: the app keeps the options of the interface before.
	const both = { min: 0, max: 10, minValue: 1, maxValue: 5 };

	test('`min` and `max` count, in the interface and in what the display takes over', () => {
		// The stock Slider itself draws such a field from 0 to 10, so the display on it must as well.
		expect(readOptions(both)).toMatchObject({ min: 0, max: 10 });
		expect(readOptions({}, both)).toMatchObject({ min: 0, max: 10 });
		expect(readOptions({}, { minValue: 1, maxValue: 5, min: 0, max: 10 })).toMatchObject({ min: 0, max: 10 });
	});

	test('each limit falls back on its own: to the other pair, then to the interface, then to its default', () => {
		expect(readOptions({}, { min: 2, maxValue: 5 })).toMatchObject({ min: 2, max: 5 });
		expect(readOptions({}, { min: 'abc', max: null, minValue: 1, maxValue: 5 })).toMatchObject({ min: 1, max: 5 });
		expect(readOptions({ minValue: 3 }, both)).toMatchObject({ min: 3, max: 10 });
		expect(readOptions({ max: 20 }, both)).toMatchObject({ min: 0, max: 20 });
		expect(readOptions({}, { maxValue: 5 })).toMatchObject({ min: 0, max: 5 });
	});

	test('the plain text follows the same rule', () => {
		expect(textHandler(3, {}, { interfaceOptions: both }, EN)).toBe('30%');
		expect(textHandler(3, {}, { interfaceOptions: { minValue: 1, maxValue: 5 } }, EN)).toBe('50%');
	});
});

describe('how much of the track is filled', () => {
	test('in proportion to where the value stands in the range', () => {
		expect(fractionOf(0, range(0, 100))).toBe(0);
		expect(fractionOf(50, range(0, 100))).toBe(0.5);
		expect(fractionOf(100, range(0, 100))).toBe(1);
		expect(fractionOf(5, range(0, 10))).toBe(0.5);
		expect(fractionOf(500, range(0, 1000))).toBe(0.5);
		expect(fractionOf(0.337, range(0, 1))).toBeCloseTo(0.337, 12);
		expect(fractionOf(12.5, range(0, 100))).toBe(0.125);
	});

	test('a negative range', () => {
		expect(fractionOf(0, range(-50, 50))).toBe(0.5);
		expect(fractionOf(-50, range(-50, 50))).toBe(0);
		expect(fractionOf(-75, range(-100, -50))).toBe(0.5);
	});

	test('the bar never leaves its track', () => {
		expect(fractionOf(-20, range(0, 100))).toBe(0);
		expect(fractionOf(150, range(0, 100))).toBe(1);
		expect(fractionOf(-1e300, range(0, 100))).toBe(0);
		expect(fractionOf(1e300, range(0, 100))).toBe(1);
	});

	test('a range of one number is empty below it and full from it upward', () => {
		expect(fractionOf(4, range(5, 5))).toBe(0);
		expect(fractionOf(5, range(5, 5))).toBe(1);
		expect(fractionOf(6, range(5, 5))).toBe(1);
	});

	test('swapped limits fill as the range they come to', () => {
		const options = readOptions({ min: 100, max: 0 });

		expect(fractionOf(30, options)).toBe(0.3);
		expect(valueText(30, options, EN)).toBe('30%');
	});

	test('very large and very small numbers give a finite fraction', () => {
		expect(fractionOf(0, range(-Number.MAX_VALUE, Number.MAX_VALUE))).toBe(0.5);
		expect(fractionOf(Number.MAX_VALUE / 2, range(-Number.MAX_VALUE, Number.MAX_VALUE))).toBe(0.75);
		expect(fractionOf(1e-10, range(0, 2e-10))).toBe(0.5);
		expect(fractionOf(5e-324, range(0, 1e-323))).toBe(0.5);
		expect(fractionOf(9007199254740993, range(0, 18014398509481984))).toBeCloseTo(0.5, 12);

		for (const [value, min, max] of [
			[1e308, -1e308, 1e308],
			[-1e308, -1e308, 1e308],
			[5e-324, 0, 5e-324],
			[1, 0, 5e-324],
			[1e308, 0, 5e-324],
			[0, -5e-324, 5e-324],
		] as const) {
			const fraction = fractionOf(value, range(min, max));
			expect(fraction).toBeGreaterThanOrEqual(0);
			expect(fraction).toBeLessThanOrEqual(1);
		}
	});
});

describe('the percentage', () => {
	test('a whole number', () => {
		expect(percentOf(0, range(0, 100))).toBe(0);
		expect(percentOf(50, range(0, 100))).toBe(50);
		expect(percentOf(100, range(0, 100))).toBe(100);
		expect(percentOf(1, range(0, 3))).toBe(33);
		expect(percentOf(2, range(0, 3))).toBe(67);
		expect(percentOf(0.337, range(0, 1))).toBe(34);
		expect(percentOf(12.5, range(0, 100))).toBe(13);
		expect(percentOf(0, range(-50, 50))).toBe(50);
	});

	test('a value strictly inside the range is never 0 or 100', () => {
		expect(percentOf(0.4, range(0, 100))).toBe(1);
		expect(percentOf(0.0001, range(0, 100))).toBe(1);
		expect(percentOf(99.6, range(0, 100))).toBe(99);
		expect(percentOf(99.9999, range(0, 100))).toBe(99);
	});

	test('it is not kept within the range', () => {
		expect(percentOf(150, range(0, 100))).toBe(150);
		expect(percentOf(-20, range(0, 100))).toBe(-20);
		expect(percentOf(15, range(0, 10))).toBe(150);
		expect(percentOf(100.4, range(0, 100))).toBe(100);
		expect(Object.is(percentOf(-0.4, range(0, 100)), 0)).toBe(true);
	});

	test('a range of one number is 0 below it and 100 from it upward', () => {
		expect(percentOf(4, range(5, 5))).toBe(0);
		expect(percentOf(5, range(5, 5))).toBe(100);
		expect(percentOf(6, range(5, 5))).toBe(100);
	});

	test('it is always a number', () => {
		expect(percentOf(1e308, range(0, 5e-324))).toBe(Number.MAX_VALUE);
		expect(percentOf(-1e308, range(0, 5e-324))).toBe(-Number.MAX_VALUE);
		expect(percentOf(0, range(-Number.MAX_VALUE, Number.MAX_VALUE))).toBe(50);
	});
});

describe('numbers as text', () => {
	test('grouped, with at most two decimals and no trailing zeros', () => {
		expect(formatNumber(7, EN)).toBe('7');
		expect(formatNumber(0, EN)).toBe('0');
		expect(formatNumber(12.5, EN)).toBe('12.5');
		expect(formatNumber(1250.5, EN)).toBe('1,250.5');
		expect(formatNumber(1234567.891, EN)).toBe('1,234,567.89');
		expect(formatNumber(-20, EN)).toBe('-20');
		expect(formatNumber(0.337, EN)).toBe('0.34');
		expect(formatNumber(0.5, EN)).toBe('0.5');
	});

	test('a number below 1 keeps two digits which count', () => {
		expect(formatNumber(0.004, EN)).toBe('0.004');
		expect(formatNumber(0.00337, EN)).toBe('0.0034');
		expect(formatNumber(-0.00012, EN)).toBe('-0.00012');
	});

	test('a very large and a very small number are written with an exponent', () => {
		expect(formatNumber(9223372036854775807, EN)).toBe('9.22E18');
		expect(formatNumber(1e300, EN)).toBe('1E300');
		expect(formatNumber(1e-10, EN)).toBe('1E-10');
		expect(formatNumber(999999999999999, EN)).toBe('999,999,999,999,999');
	});

	test('in the way of the language given', () => {
		expect(formatNumber(1250.5, 'de-DE')).toBe('1.250,5');
		expect(formatPercent(58, 'de-DE')).toBe('58 %');
		expect(formatPercent(58, EN)).toBe('58%');
		expect(formatPercent(-20, EN)).toBe('-20%');
		expect(formatPercent(1234, EN)).toBe('1,234%');
		expect(formatPercent(Number.MAX_VALUE, EN)).toBe('1.8E308%');
	});

	test('a language tag which is none falls back to the language of the browser instead of throwing', () => {
		expect(() => formatNumber(7, 'not a language')).not.toThrow();
		expect(formatNumber(7, 'not a language')).toBe(formatNumber(7));
		expect(formatNumber(7, '')).toBe(formatNumber(7));
	});
});

describe('the text beside the bar', () => {
	test('the percentage, which is also what an unknown format gives', () => {
		const text = (value: number, min: number, max: number) => valueText(value, readOptions({ min, max }), EN);

		expect(text(1, 0, 3)).toBe('33%');
		expect(text(0.337, 0, 1)).toBe('34%');
		expect(text(0.4, 0, 100)).toBe('1%');
		expect(text(99.6, 0, 100)).toBe('99%');
		expect(text(0, 0, 100)).toBe('0%');
		expect(text(100, 0, 100)).toBe('100%');
		expect(text(150, 0, 100)).toBe('150%');
		expect(text(-20, 0, 100)).toBe('-20%');

		expect(valueText(50, readOptions({ indicatorFormat: true }), EN)).toBe('50%');
		expect(valueText(50, readOptions({ indicatorFormat: 'percent' }), EN)).toBe('50%');
	});

	test('the value', () => {
		const options = readOptions({ min: 0, max: 12, indicatorFormat: 'value' });

		expect(valueText(7, options, EN)).toBe('7');
		expect(valueText(0.337, options, EN)).toBe('0.34');
		expect(valueText(1250.5, options, EN)).toBe('1,250.5');
		expect(valueText(1250.5, options, 'de-DE')).toBe('1.250,5');
	});

	test('the value over the maximum', () => {
		const options = readOptions({ min: 0, max: 12, indicatorFormat: 'fraction' });

		expect(valueText(7, options, EN)).toBe('7 / 12');
		expect(valueText(15, options, EN)).toBe('15 / 12');
		expect(valueText(1250.5, readOptions({ max: 2000, indicatorFormat: 'fraction' }), 'de-DE')).toBe('1.250,5 / 2.000');

		// Swapped limits: the larger one is the maximum. One number as both: the value over that number.
		expect(valueText(30, readOptions({ min: 100, max: 0, indicatorFormat: 'fraction' }), EN)).toBe('30 / 100');
		expect(valueText(6, readOptions({ min: 5, max: 5, indicatorFormat: 'fraction' }), EN)).toBe('6 / 5');
	});
});

describe('the colour of the fill', () => {
	const options = readOptions({
		color: RED,
		thresholds: [
			{ value: 50, color: AMBER },
			{ value: 80, color: GREEN },
		],
	});

	test('that of the highest threshold the value has reached', () => {
		expect([49, 50, 79, 80, 150].map((value) => colorFor(value, options))).toEqual([RED, AMBER, AMBER, GREEN, GREEN]);
		expect(colorFor(-1000, options)).toBe(RED);
	});

	test('the order of the list does not matter', () => {
		const reversed = readOptions({ color: RED, thresholds: [{ value: 80, color: GREEN }, { value: 50, color: AMBER }] });
		expect([49, 50, 79, 80, 150].map((value) => colorFor(value, reversed))).toEqual([RED, AMBER, AMBER, GREEN, GREEN]);
	});

	test('an entry which is not usable is ignored', () => {
		const messy = readOptions({ color: RED, thresholds: [{ value: 'abc', color: GREEN }, { value: 10, color: 'javascript:1' }, { value: 50, color: AMBER }] });
		expect([9, 10, 49, 50].map((value) => colorFor(value, messy))).toEqual([RED, RED, RED, AMBER]);
	});

	test('without thresholds it is the `color` option, and the default when that is no colour', () => {
		expect(colorFor(50, readOptions({ color: GREEN }))).toBe(GREEN);
		expect(colorFor(50, readOptions({ color: 'red' }))).toBe(DEFAULT_COLOR);
		expect(colorFor(50, readOptions({ color: 'red', thresholds: [{ value: 60, color: GREEN }] }))).toBe(DEFAULT_COLOR);
	});

	test('a threshold may lie outside the range', () => {
		const over = readOptions({ thresholds: [{ value: 101, color: RED }] });
		expect(colorFor(100, over)).toBe(DEFAULT_COLOR);
		expect(colorFor(150, over)).toBe(RED);
	});
});

describe('what is drawn for a value', () => {
	test('a number: its share of the track, its text, its colour, and the value kept within the range', () => {
		expect(readingOf(50, readOptions(), EN)).toEqual({ empty: false, fraction: 0.5, now: 50, text: '50%', color: DEFAULT_COLOR });
		expect(readingOf(150, readOptions(), EN)).toEqual({ empty: false, fraction: 1, now: 100, text: '150%', color: DEFAULT_COLOR });
		expect(readingOf(-20, readOptions(), EN)).toEqual({ empty: false, fraction: 0, now: 0, text: '-20%', color: DEFAULT_COLOR });
		expect(readingOf('12.50', readOptions({ min: '0', max: '50', color: GREEN }), EN)).toEqual({ empty: false, fraction: 0.25, now: 12.5, text: '25%', color: GREEN });
		expect(readingOf(0, readOptions({ min: -50, max: 50 }), EN)).toMatchObject({ empty: false, fraction: 0.5, now: 0, text: '50%' });
	});

	test('the colour is that of the threshold the value has reached', () => {
		const options = readOptions({ color: RED, thresholds: [{ value: 50, color: AMBER }, { value: 80, color: GREEN }] });

		expect(readingOf(49, options, EN).color).toBe(RED);
		expect(readingOf('50', options, EN).color).toBe(AMBER);
		expect(readingOf(150, options, EN).color).toBe(GREEN);
		expect(readingOf(null, options, EN).color).toBe(RED);
	});

	test('a field at its minimum is not an empty field', () => {
		expect(readingOf(0, readOptions(), EN)).toEqual({ empty: false, fraction: 0, now: 0, text: '0%', color: DEFAULT_COLOR });
	});

	test('no value, and a value which is not a number: nothing filled and a dash', () => {
		const none = { empty: true, fraction: 0, now: null, text: NO_VALUE, color: DEFAULT_COLOR };

		for (const value of [null, undefined, '', 'abc', Number.NaN, Number.POSITIVE_INFINITY, {}, [], true]) {
			expect(readingOf(value, readOptions(), EN)).toEqual(none);
		}

		// Also in a range in which zero would be half the track.
		expect(readingOf(null, readOptions({ min: -50, max: 50 }), EN)).toEqual(none);
	});

	test('whatever the value and the options, the numbers handed to the page are finite', () => {
		const values = [0, 1, -1, 1e308, -1e308, 5e-324, '1e308', null, 'abc'];
		const limits = [0, 100, -1e308, 1e308, 5e-324, 'abc', null];

		for (const value of values) {
			for (const min of limits) {
				for (const max of limits) {
					const options = readOptions({ min, max });
					const reading = readingOf(value, options, EN);

					expect(Number.isFinite(reading.fraction)).toBe(true);
					expect(reading.fraction).toBeGreaterThanOrEqual(0);
					expect(reading.fraction).toBeLessThanOrEqual(1);
					expect(reading.now === null || Number.isFinite(reading.now)).toBe(true);
					expect(reading.text).not.toMatch(/NaN|∞|Infinity/);
				}
			}
		}
	});
});

describe('the tooltip of the display', () => {
	test('the value text, after the caption when there is one', () => {
		expect(tooltipOf('58%', 'Storage used')).toBe('Storage used: 58%');
		expect(tooltipOf('58%', null)).toBe('58%');
		expect(tooltipOf('7 / 12', 'Tasks')).toBe('Tasks: 7 / 12');
	});
});

describe('the display as plain text', () => {
	test('the text beside the bar, from the options of the display and of the interface', () => {
		expect(textHandler(5, {}, { interfaceOptions: { min: 0, max: 10 } }, EN)).toBe('50%');
		expect(textHandler(5, { max: 20 }, { interfaceOptions: { min: 0, max: 10 } }, EN)).toBe('25%');
		expect(textHandler(7, { indicatorFormat: 'fraction' }, { interfaceOptions: { max: 12 } }, EN)).toBe('7 / 12');
		expect(textHandler(3, {}, { interfaceOptions: { minValue: 1, maxValue: 5 } }, EN)).toBe('50%');
		expect(textHandler('12.50', { indicatorFormat: 'value' }, {}, EN)).toBe('12.5');
		expect(textHandler(58, {}, {}, 'de-DE')).toBe('58 %');
	});

	test('the options of the display win over those of the interface', () => {
		const inherited = { min: 0, max: 100, indicatorFormat: 'percent' };

		expect(textHandler(35, { min: '10', max: '60', indicatorFormat: 'fraction' }, { interfaceOptions: inherited }, EN)).toBe('35 / 60');
		expect(textHandler(35, { min: '10', max: '60' }, { interfaceOptions: inherited }, EN)).toBe('50%');
		expect(textHandler(35, { indicatorFormat: 'value' }, { interfaceOptions: inherited }, EN)).toBe('35');
	});

	test('also when the text is switched off in the layout', () => {
		expect(textHandler(58, { indicator: false }, {}, EN)).toBe('58%');
	});

	test('without options or a context', () => {
		expect(textHandler(58, undefined, undefined, EN)).toBe('58%');
		expect(textHandler(58, null, null, EN)).toBe('58%');
	});

	test('a value which is not a number gives itself, and an empty one nothing', () => {
		expect(textHandler('abc', {}, {}, EN)).toBe('abc');
		expect(textHandler({ a: 1 }, {}, {}, EN)).toBe('{"a":1}');
		expect(textHandler(null, {}, {}, EN)).toBeNull();
		expect(textHandler(undefined, {}, {}, EN)).toBeNull();
		expect(textHandler('  ', {}, {}, EN)).toBeNull();
		expect(textHandler(0, {}, {}, EN)).toBe('0%');
	});
});
