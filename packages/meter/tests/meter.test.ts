import { describe, expect, test } from 'vitest';
import {
	DEFAULT_COLOR,
	DISPLAY_WIDTH,
	FADE,
	MAX_PIECES,
	MIN_SUBDIVISIONS,
	NO_VALUE,
	PIECE_SIZES,
	TRACK_COLOR,
	canEdit,
	changes,
	colorFor,
	drawingOf,
	drawnCount,
	fadedColor,
	filledAt,
	filledCount,
	fitCount,
	formatNumber,
	formatPercent,
	fractionOf,
	inputMethod,
	isColor,
	isEmpty,
	keyValue,
	numberOf,
	percentOf,
	pieceCount,
	pieceGeometry,
	readEditing,
	readLook,
	readOptions,
	readThresholds,
	readingOf,
	relativeMove,
	scaleStops,
	shareAt,
	snapValue,
	stopsCss,
	textHandler,
	textOf,
	tooltipOf,
	valueAtShare,
	valueText,
	wantedCount,
} from '../src/meter';
import type { Shape } from '../src/meter';

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

const PLAIN_LOOK = { visualization: 'contiguous', subdivisions: null, dotsLayout: 'packed', activeColoring: 'value', inactiveColoring: 'plain' };
const SHAPES: Shape[] = ['pills', 'segments', 'bars', 'dots'];

describe('how the meter is drawn', () => {
	test('one bar in the colour of its value on a plain track, unless the options say otherwise', () => {
		expect(readLook()).toEqual(PLAIN_LOOK);
		expect(readLook({})).toEqual(PLAIN_LOOK);
		expect(readLook(null, 'abc')).toEqual(PLAIN_LOOK);
	});

	test('the visualization is one of five words, and anything else is one bar', () => {
		for (const visualization of ['contiguous', 'pills', 'segments', 'bars', 'dots']) {
			expect(readLook({ visualization }).visualization).toBe(visualization);
		}

		for (const visualization of [null, undefined, '', 'Segments', 'dot', 'pill', 'style', 0, 1, true, ['dots'], { value: 'dots' }]) {
			expect(readLook({ visualization }).visualization, String(visualization)).toBe('contiguous');
		}
	});

	test('the layout of the dots is packed, unless it is spread', () => {
		expect(readLook({ dotsLayout: 'spread' }).dotsLayout).toBe('spread');
		expect(readLook({ dotsLayout: 'packed' }).dotsLayout).toBe('packed');

		for (const dotsLayout of [null, undefined, '', 'Spread', 'even', 1, true, ['spread']]) {
			expect(readLook({ dotsLayout }).dotsLayout, String(dotsLayout)).toBe('packed');
		}
	});

	test('the colouring of what is filled is one of three words, of what is not one of five', () => {
		for (const coloring of ['value', 'steps', 'gradient']) {
			expect(readLook({ activeColoring: coloring }).activeColoring).toBe(coloring);
			expect(readLook({ inactiveColoring: coloring }).inactiveColoring).toBe(coloring);
		}

		expect(readLook({ inactiveColoring: 'plain' }).inactiveColoring).toBe('plain');
		expect(readLook({ inactiveColoring: 'automatic' }).inactiveColoring).toBe('automatic');

		for (const coloring of [null, undefined, '', 'Steps', 'plain', 'automatic', 'blend', 1, true, ['steps']]) {
			expect(readLook({ activeColoring: coloring }).activeColoring, String(coloring)).toBe('value');
		}

		for (const coloring of [null, undefined, '', 'Plain', 'none', 'faded', 0, false, ['plain']]) {
			expect(readLook({ inactiveColoring: coloring }).inactiveColoring, String(coloring)).toBe('plain');
		}
	});

	test('a number of subdivisions which is set: a whole number of at least 2, with no largest', () => {
		const set = (subdivisions: unknown) => readLook({ visualization: 'pills', subdivisions }).subdivisions;

		expect(MIN_SUBDIVISIONS).toBe(2);
		expect(set(2)).toBe(2);
		expect(set(4)).toBe(4);
		expect(set(10)).toBe(10);
		expect(set(11)).toBe(11);
		expect(set(100)).toBe(100);
		expect(set(1000)).toBe(1000);

		// Below 2 it is 2.
		expect(set(1)).toBe(2);
		expect(set(0)).toBe(2);
		expect(set(-3)).toBe(2);

		// The text of a whole number is that number.
		expect(set('4')).toBe(4);
		expect(set(' 250 ')).toBe(250);
		expect(set('1')).toBe(2);
		expect(set(4.0)).toBe(4);
		expect(set('4.0')).toBe(4);
	});

	test('a number of subdivisions which is not a whole number is not set', () => {
		for (const subdivisions of [null, undefined, '', '   ', 3.7, '3.7', Number.NaN, Number.POSITIVE_INFINITY, 'abc', '4 parts', true, [4], { count: 4 }]) {
			expect(readLook({ visualization: 'dots', subdivisions }).subdivisions, String(subdivisions)).toBeNull();
		}
	});

	test('the display takes every key from the interface which it does not set itself, a stored null among them', () => {
		const inherited = { visualization: 'bars', subdivisions: 40, dotsLayout: 'spread', activeColoring: 'gradient', inactiveColoring: 'automatic' };
		const taken = { visualization: 'bars', subdivisions: 40, dotsLayout: 'spread', activeColoring: 'gradient', inactiveColoring: 'automatic' };
		const keys = Object.keys(inherited) as (keyof typeof inherited)[];

		// Nothing of its own, in whichever way: absent, undefined, null or unusable.
		expect(readLook({}, inherited)).toEqual(taken);
		expect(readLook(undefined, inherited)).toEqual(taken);
		expect(readLook(Object.fromEntries(keys.map((key) => [key, undefined])), inherited)).toEqual(taken);
		expect(readLook(Object.fromEntries(keys.map((key) => [key, null])), inherited)).toEqual(taken);
		expect(readLook({ visualization: 'rings', subdivisions: 'abc', dotsLayout: 'even', activeColoring: 'plain', inactiveColoring: 'none' }, inherited)).toEqual(taken);

		// Its own wins, key by key.
		expect(readLook({ visualization: 'dots' }, inherited)).toEqual({ ...taken, visualization: 'dots' });
		expect(readLook({ subdivisions: 8 }, inherited)).toEqual({ ...taken, subdivisions: 8 });
		expect(readLook({ dotsLayout: 'packed' }, inherited)).toEqual({ ...taken, dotsLayout: 'packed' });
		expect(readLook({ activeColoring: 'value' }, inherited)).toEqual({ ...taken, activeColoring: 'value' });
		expect(readLook({ inactiveColoring: 'plain' }, inherited)).toEqual({ ...taken, inactiveColoring: 'plain' });
		expect(readLook({ visualization: 'contiguous', subdivisions: '3' }, inherited)).toEqual({ ...taken, visualization: 'contiguous', subdivisions: 3 });

		// Neither has any.
		expect(readLook({}, {})).toEqual(PLAIN_LOOK);
	});

	test('the look changes nothing about the options and the reading', () => {
		const look = { visualization: 'dots', subdivisions: 4, dotsLayout: 'spread', activeColoring: 'steps', inactiveColoring: 'automatic' };

		expect(readOptions(look)).toEqual(readOptions());
		expect(readingOf(44, readOptions(look), EN)).toEqual(readingOf(44, readOptions(), EN));
	});
});

describe('how many pieces are wanted', () => {
	const natural = (min: number, max: number) => wantedCount({ subdivisions: null }, { min, max });

	test('nothing set: one for every unit of a whole range of at least 2', () => {
		expect(natural(0, 5)).toBe(5);
		expect(natural(0, 2)).toBe(2);
		expect(natural(0, 10)).toBe(10);
		expect(natural(0, 11)).toBe(11);
		expect(natural(0, 100)).toBe(100);
		expect(natural(0, 1000)).toBe(1000);
		expect(natural(1, 6)).toBe(5);
		expect(natural(-5, 5)).toBe(10);
		expect(natural(0.5, 3.5)).toBe(3);
	});

	test('nothing set, and a range which is not whole, smaller than 2 or of one number: none in particular', () => {
		expect(natural(0, 1)).toBeNull();
		expect(natural(0, 0.5)).toBeNull();
		expect(natural(0, 2.5)).toBeNull();
		expect(natural(0, 99.5)).toBeNull();
		expect(natural(7, 7)).toBeNull();
		expect(natural(0, 0)).toBeNull();
	});

	test('a number which is set is wanted, whatever the range', () => {
		const set = (subdivisions: unknown, range = { min: 0, max: 5 }) => wantedCount(readLook({ subdivisions }), range);

		expect(set(4)).toBe(4);
		expect(set(1)).toBe(2);
		expect(set(100)).toBe(100);
		expect(set('4')).toBe(4);
		expect(set(4, { min: 0, max: 2.5 })).toBe(4);
		expect(set(4, { min: 7, max: 7 })).toBe(4);

		// One which is not whole is not set: the range again.
		expect(set(3.7)).toBe(5);
		expect(set('abc')).toBe(5);
		expect(set('abc', { min: 0, max: 2.5 })).toBeNull();
	});

	test('from the options as they are stored, after their fall-back', () => {
		const wanted = (own: object, inherited?: object) => wantedCount(readLook(own, inherited), readOptions(own, inherited));

		expect(wanted({})).toBe(100);
		expect(wanted({ max: 5 })).toBe(5);
		expect(wanted({ min: '1', max: '4' })).toBe(3);
		expect(wanted({ min: 5, max: 0 })).toBe(5);
		expect(wanted({ minValue: 0, maxValue: 8 })).toBe(8);
		expect(wanted({}, { max: 6 })).toBe(6);
		expect(wanted({ max: 3 }, { max: 6, subdivisions: 9 })).toBe(9);
	});
});

describe('how many pieces fit', () => {
	test('the sizes of the pieces, for each visualization in each place', () => {
		expect(PIECE_SIZES).toEqual({
			form: { pills: { piece: 20, gap: 4 }, segments: { piece: 14, gap: 3 }, bars: { piece: 3, gap: 2 }, dots: { piece: 12, gap: 6 } },
			display: { pills: { piece: 8, gap: 2 }, segments: { piece: 6, gap: 2 }, bars: { piece: 2, gap: 1 }, dots: { piece: 6, gap: 1.5 } },
		});
	});

	test('in the display, whose bar has one length: a number for each visualization', () => {
		expect(DISPLAY_WIDTH).toBe(72);
		expect(fitCount('pills', 'display', DISPLAY_WIDTH)).toBe(7);
		expect(fitCount('segments', 'display', DISPLAY_WIDTH)).toBe(9);
		expect(fitCount('bars', 'display', DISPLAY_WIDTH)).toBe(24);
		expect(fitCount('dots', 'display', DISPLAY_WIDTH)).toBe(9);
	});

	test('in the form: as many as the width has room for, each at its smallest with its gap', () => {
		// 14 pills are 14 * 20 + 13 * 4 = 332px.
		expect(fitCount('pills', 'form', 342)).toBe(14);
		expect(fitCount('pills', 'form', 332)).toBe(14);
		expect(fitCount('pills', 'form', 331.9)).toBe(13);
		expect(fitCount('pills', 'form', 700)).toBe(29);
		expect(fitCount('pills', 'form', 717)).toBe(30);

		expect(fitCount('segments', 'form', 342)).toBe(20);
		expect(fitCount('segments', 'form', 31)).toBe(2);
		expect(fitCount('segments', 'form', 30.9)).toBe(1);

		expect(fitCount('bars', 'form', 342)).toBe(68);
		expect(fitCount('bars', 'form', 8)).toBe(2);
		expect(fitCount('bars', 'form', 7)).toBe(1);

		expect(fitCount('dots', 'form', 342)).toBe(19);
		expect(fitCount('dots', 'form', 174)).toBe(10);
		expect(fitCount('dots', 'form', 173)).toBe(9);
	});

	test('a width which is a hair under a whole number of pieces counts as that number', () => {
		expect(fitCount('pills', 'form', 331.99999)).toBe(14);
	});

	test('no width, as in a tab which is not shown, has room for none', () => {
		for (const shape of SHAPES) {
			expect(fitCount(shape, 'form', 0)).toBe(0);
			expect(fitCount(shape, 'form', -10)).toBe(0);
			expect(fitCount(shape, 'form', Number.NaN)).toBe(0);
			expect(fitCount(shape, 'form', 1)).toBe(0);
		}
	});

	test('never more than the cap of the package', () => {
		expect(MAX_PIECES).toBe(200);
		expect(fitCount('bars', 'form', 998)).toBe(200);
		expect(fitCount('bars', 'form', 5000)).toBe(200);
		expect(fitCount('bars', 'form', Number.POSITIVE_INFINITY)).toBe(200);
		expect(fitCount('dots', 'form', 1e9)).toBe(200);
	});
});

describe('how many pieces are drawn', () => {
	test('what is wanted, where it fits', () => {
		expect(drawnCount(5, 14)).toBe(5);
		expect(drawnCount(14, 14)).toBe(14);
		expect(drawnCount(2, 2)).toBe(2);
		expect(drawnCount(100, 143)).toBe(100);
	});

	test('where it does not fit: the largest number which fits and divides it', () => {
		expect(drawnCount(100, 29)).toBe(25);
		expect(drawnCount(12, 7)).toBe(6);
		expect(drawnCount(100, 14)).toBe(10);
		expect(drawnCount(100, 68)).toBe(50);
		expect(drawnCount(100, 24)).toBe(20);
		expect(drawnCount(100, 9)).toBe(5);
		expect(drawnCount(100, 3)).toBe(2);
		expect(drawnCount(15, 14)).toBe(5);
		expect(drawnCount(9, 2)).toBe(2);
	});

	test('a number which nothing that fits divides: as many as fit', () => {
		expect(drawnCount(13, 7)).toBe(7);
		expect(drawnCount(101, 29)).toBe(29);
		expect(drawnCount(9, 2)).toBe(2);
		expect(drawnCount(49, 6)).toBe(6);
	});

	test('nothing wanted: as many as fit', () => {
		expect(drawnCount(null, 14)).toBe(14);
		expect(drawnCount(null, 2)).toBe(2);
		expect(drawnCount(null, 68)).toBe(68);
	});

	test('fewer than two fit: no pieces, which makes the meter one bar', () => {
		expect(drawnCount(5, 1)).toBe(0);
		expect(drawnCount(5, 0)).toBe(0);
		expect(drawnCount(null, 1)).toBe(0);
		expect(drawnCount(null, 0)).toBe(0);
		expect(drawnCount(2, 1.9)).toBe(0);
		expect(drawnCount(5, Number.NaN)).toBe(0);
	});

	test('never more than the cap of the package, whatever is wanted and whatever fits', () => {
		expect(drawnCount(200, 500)).toBe(200);
		expect(drawnCount(null, 500)).toBe(200);
		expect(drawnCount(1000, 500)).toBe(200);
		expect(drawnCount(500, 1000)).toBe(125);
		expect(drawnCount(251, 1000)).toBe(200);
	});

	test('for a meter, from its look, its range and the width of its track', () => {
		const count = (own: object, place: 'form' | 'display', width: number) => pieceCount(readLook(own), readOptions(own), place, width);

		// One bar has no pieces at any width.
		expect(count({}, 'form', 342)).toBe(0);
		expect(count({ visualization: 'contiguous', subdivisions: 4 }, 'form', 342)).toBe(0);

		// A range of a hundred in half of the form: a number which divides 100.
		expect(count({ visualization: 'pills' }, 'form', 342)).toBe(10);
		expect(count({ visualization: 'segments' }, 'form', 342)).toBe(20);
		expect(count({ visualization: 'bars' }, 'form', 342)).toBe(50);
		expect(count({ visualization: 'dots' }, 'form', 342)).toBe(10);

		// The same field in a wider form has more.
		expect(count({ visualization: 'pills' }, 'form', 717)).toBe(25);
		expect(count({ visualization: 'bars' }, 'form', 717)).toBe(100);

		// One for every unit, and a number which is set.
		expect(count({ visualization: 'pills', max: 5 }, 'form', 342)).toBe(5);
		expect(count({ visualization: 'dots', subdivisions: 12 }, 'form', 342)).toBe(12);
		expect(count({ visualization: 'dots', subdivisions: 12 }, 'form', 120)).toBe(6);
		expect(count({ visualization: 'pills', subdivisions: '4', max: 5 }, 'form', 342)).toBe(4);

		// A range which wants nothing: as many as fit.
		expect(count({ visualization: 'pills', max: 2.5 }, 'form', 342)).toBe(14);

		// No room for two, and no width at all: one bar.
		expect(count({ visualization: 'pills' }, 'form', 40)).toBe(0);
		expect(count({ visualization: 'pills' }, 'form', 44)).toBe(2);
		expect(count({ visualization: 'dots' }, 'form', 0)).toBe(0);

		// The display: the same number in every row.
		expect(count({ visualization: 'pills' }, 'display', DISPLAY_WIDTH)).toBe(5);
		expect(count({ visualization: 'segments' }, 'display', DISPLAY_WIDTH)).toBe(5);
		expect(count({ visualization: 'bars' }, 'display', DISPLAY_WIDTH)).toBe(20);
		expect(count({ visualization: 'dots' }, 'display', DISPLAY_WIDTH)).toBe(5);
		expect(count({ visualization: 'dots', max: 8 }, 'display', DISPLAY_WIDTH)).toBe(8);
		expect(count({ visualization: 'pills', max: 12 }, 'display', DISPLAY_WIDTH)).toBe(6);
		expect(count({ visualization: 'bars', subdivisions: 24 }, 'display', DISPLAY_WIDTH)).toBe(24);
		expect(count({ visualization: 'bars', max: 2.5 }, 'display', DISPLAY_WIDTH)).toBe(24);
	});
});

describe('where the pieces are', () => {
	test('pills, segments and bars share the width equally, with their gap between them', () => {
		expect(pieceGeometry('pills', 'form', 4, 332)).toEqual([
			{ start: 0, end: 80 },
			{ start: 84, end: 164 },
			{ start: 168, end: 248 },
			{ start: 252, end: 332 },
		]);

		expect(pieceGeometry('segments', 'form', 2, 103)).toEqual([
			{ start: 0, end: 50 },
			{ start: 53, end: 103 },
		]);

		const bars = pieceGeometry('bars', 'display', 24, 72);
		expect(bars).toHaveLength(24);
		expect(bars[0]).toEqual({ start: 0, end: 49 / 24 });
		expect(bars[23]!.end).toBeCloseTo(72, 9);
		expect(bars[1]!.start - bars[0]!.end).toBeCloseTo(1, 9);
	});

	test('packed dots keep their size and their gap, from the start', () => {
		expect(pieceGeometry('dots', 'form', 3, 342)).toEqual([
			{ start: 0, end: 12 },
			{ start: 18, end: 30 },
			{ start: 36, end: 48 },
		]);

		expect(pieceGeometry('dots', 'form', 3, 342, 'packed')).toEqual(pieceGeometry('dots', 'form', 3, 342));
		expect(pieceGeometry('dots', 'display', 9, 72).at(-1)).toEqual({ start: 60, end: 66 });
	});

	test('spread dots keep their size: the first at the start edge, the last at the end edge, equal gaps between', () => {
		expect(pieceGeometry('dots', 'form', 3, 342, 'spread')).toEqual([
			{ start: 0, end: 12 },
			{ start: 165, end: 177 },
			{ start: 330, end: 342 },
		]);

		expect(pieceGeometry('dots', 'display', 5, 72, 'spread').map((piece) => piece.start)).toEqual([0, 16.5, 33, 49.5, 66]);

		// The layout of the dots is nothing to the other shapes.
		expect(pieceGeometry('pills', 'form', 4, 332, 'spread')).toEqual(pieceGeometry('pills', 'form', 4, 332));
	});

	test('no pieces, or no width: nothing', () => {
		expect(pieceGeometry('pills', 'form', 0, 342)).toEqual([]);
		expect(pieceGeometry('pills', 'form', 4, 0)).toEqual([]);
		expect(pieceGeometry('dots', 'form', 1, 342, 'spread')).toEqual([{ start: 0, end: 12 }]);
	});
});

describe('how many pieces are filled', () => {
	const drawn = (value: unknown, own: object, count: number) => {
		const options = readOptions(own);
		return drawingOf(readLook(own), options, readingOf(value, options, EN), count).pieces;
	};

	const filled = (value: unknown, own: object, count: number) => drawn(value, own, count)?.filter((piece) => piece.filled).length;

	test('the nearest whole number of them, never a part of one', () => {
		expect(filledCount(0.44, 10)).toBe(4);
		expect(filledCount(0.45, 10)).toBe(5);
		expect(filledCount(0.04, 10)).toBe(0);
		expect(filledCount(0.05, 10)).toBe(1);
		expect(filledCount(0.96, 10)).toBe(10);
		expect(filledCount(0.94, 10)).toBe(9);
		expect(filledCount(0.62, 25)).toBe(16);
		expect(filledCount(0.62, 50)).toBe(31);

		expect(filled(44, {}, 10)).toBe(4);
		expect(filled(45, {}, 10)).toBe(5);
		expect(filled(4, {}, 10)).toBe(0);
		expect(filled(96, {}, 10)).toBe(10);
		expect(filled(62, {}, 25)).toBe(16);
	});

	test('both ends of the range, and beyond them', () => {
		expect(filled(0, {}, 10)).toBe(0);
		expect(filled(100, {}, 10)).toBe(10);
		expect(filled(150, {}, 10)).toBe(10);
		expect(filled(-20, {}, 10)).toBe(0);
		expect(filledCount(-1, 10)).toBe(0);
		expect(filledCount(2, 10)).toBe(10);
	});

	test('one piece for every unit: a whole value fills that many, a fractional one the nearest', () => {
		expect(filled(3, { max: 5 }, 5)).toBe(3);
		expect(filled(3.4, { max: 5 }, 5)).toBe(3);
		expect(filled(3.5, { max: 5 }, 5)).toBe(4);
		expect(filled(0.4, { max: 5 }, 5)).toBe(0);
		expect(filled(4.6, { max: 5 }, 5)).toBe(5);
	});

	test('the filled ones are the first ones, and each knows its place among them', () => {
		expect(drawn(50, {}, 4)?.map((piece) => piece.filled)).toEqual([true, true, false, false]);
		expect(drawn(50, {}, 5)?.map((piece) => piece.at)).toEqual([0, 0.25, 0.5, 0.75, 1]);
		expect(drawn(0, {}, 2)?.map((piece) => piece.filled)).toEqual([false, false]);
	});

	test('no value: every piece, none of them filled, none of them coloured', () => {
		for (const look of [{}, { activeColoring: 'gradient', inactiveColoring: 'automatic', thresholds: [{ value: 40, color: AMBER }] }]) {
			const options = readOptions(look);
			const drawing = drawingOf(readLook(look), options, readingOf(null, options, EN), 3);

			expect(drawing.pieces).toEqual([
				{ filled: false, at: 0, paint: { color: null, scale: null } },
				{ filled: false, at: 0.5, paint: { color: null, scale: null } },
				{ filled: false, at: 1, paint: { color: null, scale: null } },
			]);
			expect(drawing.stops).toBeNull();
			expect(drawing.weakStops).toBeNull();
		}
	});

	test('fewer than two pieces: one bar', () => {
		expect(drawn(50, {}, 0)).toBeNull();
		expect(drawn(50, {}, 1)).toBeNull();
		expect(drawingOf(readLook(), readOptions(), readingOf(50, readOptions(), EN)).pieces).toBeNull();
	});

	test('never more pieces than the cap of the package', () => {
		expect(drawn(50, {}, 5000)).toHaveLength(200);
	});

	test('what is said stays the value as it is', () => {
		const own = { visualization: 'pills', label: 'Tasks' };
		const options = readOptions(own);

		expect(filled(44, own, 10)).toBe(4);
		expect(readingOf(44, options, EN).text).toBe('44%');
		expect(readingOf(44, options, EN).now).toBe(44);
		expect(valueText(3.2, readOptions({ max: 5, indicatorFormat: 'fraction', visualization: 'dots' }), EN)).toBe('3.2 / 5');
		expect(tooltipOf(readingOf(44, options, EN).text, 'Tasks')).toBe('Tasks: 44%');
		expect(textHandler(44, own, {}, EN)).toBe('44%');
	});
});

describe('the colours along the scale', () => {
	const scale = { color: RED, thresholds: [{ value: 40, color: AMBER }, { value: 80, color: GREEN }] };
	const faded = (color: string) => `color-mix(in srgb, ${color} 30%, var(--theme--form--field--input--border-color))`;

	test('a faded colour is mixed towards the track by one share, in the browser', () => {
		expect(FADE).toBe(70);
		expect(TRACK_COLOR).toBe('var(--theme--form--field--input--border-color)');
		expect(fadedColor(RED)).toBe(faded(RED));
		expect(fadedColor('var(--theme--primary)')).toBe(faded('var(--theme--primary)'));
	});

	test('the stops: the colour of the minimum, and every threshold above it at its share of the range', () => {
		expect(scaleStops(readOptions(scale))).toEqual([
			{ at: 0, color: RED },
			{ at: 0.4, color: AMBER },
			{ at: 0.8, color: GREEN },
		]);

		// In the units of the field, whatever the range.
		expect(scaleStops(readOptions({ ...scale, min: 20, max: 120 }))).toEqual([
			{ at: 0, color: RED },
			{ at: 0.2, color: AMBER },
			{ at: 0.6, color: GREEN },
		]);

		// In whatever order they are listed.
		expect(scaleStops(readOptions({ color: RED, thresholds: [...scale.thresholds].reverse() }))).toEqual(scaleStops(readOptions(scale)));
	});

	test('without thresholds, and without a colour: one stop', () => {
		expect(scaleStops(readOptions())).toEqual([{ at: 0, color: DEFAULT_COLOR }]);
		expect(scaleStops(readOptions({ color: GREEN }))).toEqual([{ at: 0, color: GREEN }]);
	});

	test('a threshold at or below the minimum is the colour of the minimum', () => {
		expect(scaleStops(readOptions({ color: RED, thresholds: [{ value: 0, color: AMBER }, { value: 50, color: GREEN }] }))).toEqual([
			{ at: 0, color: AMBER },
			{ at: 0.5, color: GREEN },
		]);

		expect(scaleStops(readOptions({ min: 10, color: RED, thresholds: [{ value: -5, color: GREEN }, { value: 5, color: AMBER }] }))).toEqual([{ at: 0, color: AMBER }]);
	});

	test('a threshold beyond the maximum is beyond the track', () => {
		expect(scaleStops(readOptions({ color: RED, thresholds: [{ value: 150, color: GREEN }] }))).toEqual([
			{ at: 0, color: RED },
			{ at: 1.5, color: GREEN },
		]);
	});

	test('of two thresholds at one value the later one counts, as for the colour of a value', () => {
		const options = readOptions({ color: RED, thresholds: [{ value: 40, color: AMBER }, { value: 40, color: GREEN }] });

		expect(scaleStops(options)).toEqual([
			{ at: 0, color: RED },
			{ at: 0.4, color: GREEN },
		]);
		expect(colorFor(40, options)).toBe(GREEN);
	});

	test('a range of one number, and limits too large to subtract: nothing which is not finite', () => {
		expect(scaleStops(readOptions({ ...scale, min: 50, max: 50 }))).toEqual([{ at: 0, color: AMBER }]);

		for (const stop of scaleStops(readOptions({ min: -1e308, max: 1e308, color: RED, thresholds: [{ value: 0, color: AMBER }, { value: 1e308, color: GREEN }] }))) {
			expect(Number.isFinite(stop.at)).toBe(true);
		}
	});

	test('as a gradient: each colour at its place', () => {
		const stops = scaleStops(readOptions(scale));

		expect(stopsCss(stops, 'gradient')).toBe(`${RED} 0%, ${AMBER} 40%, ${GREEN} 80%`);
		expect(stopsCss(stops, 'gradient', true)).toBe(`${faded(RED)} 0%, ${faded(AMBER)} 40%, ${faded(GREEN)} 80%`);
	});

	test('as steps: each colour up to the next place, where it changes at once', () => {
		const stops = scaleStops(readOptions(scale));

		expect(stopsCss(stops, 'steps')).toBe(`${RED} 40%, ${AMBER} 40%, ${AMBER} 80%, ${GREEN} 80%`);
		expect(stopsCss(stops, 'steps', true)).toBe(`${faded(RED)} 40%, ${faded(AMBER)} 40%, ${faded(AMBER)} 80%, ${faded(GREEN)} 80%`);
	});

	test('a place is written as a plain percentage, however odd', () => {
		expect(stopsCss([{ at: 0, color: RED }, { at: 1 / 3, color: AMBER }, { at: 1e30, color: GREEN }], 'gradient')).toBe(`${RED} 0%, ${AMBER} 33.333%, ${GREEN} 1000000%`);
	});
});

describe('the colours of a meter', () => {
	const scale = { color: RED, thresholds: [{ value: 40, color: AMBER }, { value: 80, color: GREEN }] };
	const faded = fadedColor;
	const none = { color: null, scale: null };

	const drawing = (value: unknown, own: object, count = 0) => {
		const options = readOptions(own);
		return drawingOf(readLook(own), options, readingOf(value, options, EN), count);
	};

	const paints = (value: unknown, own: object, count: number) => drawing(value, own, count).pieces!.map((piece) => piece.paint);

	test('nothing set: the fill in the colour of the value, the track as the styles have it', () => {
		expect(drawing(62, {})).toEqual({ stops: null, weakStops: null, track: none, fill: { color: DEFAULT_COLOR, scale: null }, pieces: null });
		expect(drawing(62, scale)).toEqual({ stops: null, weakStops: null, track: none, fill: { color: AMBER, scale: null }, pieces: null });
		expect(paints(50, scale, 4)).toEqual([{ color: AMBER, scale: null }, { color: AMBER, scale: null }, none, none]);
	});

	test('value: one colour for everything filled, by the current value', () => {
		expect(paints(90, { ...scale, activeColoring: 'value' }, 4).slice(0, 3)).toEqual(Array(3).fill({ color: GREEN, scale: null }));
		expect(paints(10, { ...scale, activeColoring: 'value' }, 10)[0]).toEqual({ color: RED, scale: null });
	});

	test('steps: a piece has the colour of the value it reaches when it is filled completely', () => {
		const own = { ...scale, activeColoring: 'steps' };

		// Ten pieces on 0 to 100 reach 10, 20, ... 100: amber from the fourth, green from the eighth.
		expect(paints(100, own, 10).map((paint) => paint.color)).toEqual([RED, RED, RED, AMBER, AMBER, AMBER, AMBER, GREEN, GREEN, GREEN]);
		expect(paints(100, own, 10).every((paint) => paint.scale === null)).toBe(true);

		// Whatever the current value is: the colours belong to the places.
		expect(paints(50, own, 10).map((paint) => paint.color)).toEqual([RED, RED, RED, AMBER, AMBER, null, null, null, null, null]);

		// Five pieces reach 20, 40, ... 100.
		expect(paints(100, own, 5).map((paint) => paint.color)).toEqual([RED, AMBER, AMBER, GREEN, GREEN]);

		// A hundred pieces: the 57th reaches 57 exactly, and a threshold there colours it.
		const fine = paints(100, { color: RED, thresholds: [{ value: 57, color: GREEN }], activeColoring: 'steps' }, 100);
		expect(fine[55]!.color).toBe(RED);
		expect(fine[56]!.color).toBe(GREEN);

		expect(drawing(100, own, 10).stops).toBeNull();
	});

	test('steps on the one bar: the colours of the scale across the whole track, changing at each threshold', () => {
		expect(drawing(62, { ...scale, activeColoring: 'steps' })).toEqual({
			stops: `${RED} 40%, ${AMBER} 40%, ${AMBER} 80%, ${GREEN} 80%`,
			weakStops: null,
			track: none,
			fill: { color: null, scale: 'full' },
			pieces: null,
		});
	});

	test('gradient: every surface shows its own part of the colours blended across the whole track', () => {
		const own = { ...scale, activeColoring: 'gradient' };

		expect(drawing(62, own)).toEqual({
			stops: `${RED} 0%, ${AMBER} 40%, ${GREEN} 80%`,
			weakStops: null,
			track: none,
			fill: { color: null, scale: 'full' },
			pieces: null,
		});

		expect(paints(50, own, 4)).toEqual([{ color: null, scale: 'full' }, { color: null, scale: 'full' }, none, none]);
		expect(drawing(50, own, 4).stops).toBe(`${RED} 0%, ${AMBER} 40%, ${GREEN} 80%`);
		expect(drawing(50, own, 4).weakStops).toBeNull();
	});

	test('what is not filled is plain, unless it is coloured too, and then it is faded', () => {
		// As what is filled.
		expect(paints(50, { ...scale, inactiveColoring: 'automatic' }, 4)).toEqual([
			{ color: AMBER, scale: null },
			{ color: AMBER, scale: null },
			{ color: faded(AMBER), scale: null },
			{ color: faded(AMBER), scale: null },
		]);

		expect(paints(50, { ...scale, activeColoring: 'steps', inactiveColoring: 'automatic' }, 5).map((paint) => paint.color)).toEqual([RED, AMBER, AMBER, faded(GREEN), faded(GREEN)]);

		const blended = drawing(50, { ...scale, activeColoring: 'gradient', inactiveColoring: 'automatic' }, 4);
		expect(blended.pieces!.map((piece) => piece.paint)).toEqual([
			{ color: null, scale: 'full' },
			{ color: null, scale: 'full' },
			{ color: null, scale: 'weak' },
			{ color: null, scale: 'weak' },
		]);
		expect(blended.stops).toBe(`${RED} 0%, ${AMBER} 40%, ${GREEN} 80%`);
		expect(blended.weakStops).toBe(`${faded(RED)} 0%, ${faded(AMBER)} 40%, ${faded(GREEN)} 80%`);
	});

	test('what is not filled can have a colouring of its own', () => {
		// A faded tint of the colour of the current value, under steps.
		expect(paints(50, { ...scale, activeColoring: 'steps', inactiveColoring: 'value' }, 5).map((paint) => paint.color)).toEqual([RED, AMBER, AMBER, faded(AMBER), faded(AMBER)]);

		// Faded steps under one colour.
		expect(paints(50, { ...scale, inactiveColoring: 'steps' }, 5).map((paint) => paint.color)).toEqual([AMBER, AMBER, AMBER, faded(GREEN), faded(GREEN)]);

		// A faded gradient under one colour.
		const mixed = drawing(50, { ...scale, inactiveColoring: 'gradient' }, 4);
		expect(mixed.pieces!.map((piece) => piece.paint)).toEqual([{ color: AMBER, scale: null }, { color: AMBER, scale: null }, { color: null, scale: 'weak' }, { color: null, scale: 'weak' }]);
		expect(mixed.stops).toBeNull();
		expect(mixed.weakStops).toBe(`${faded(RED)} 0%, ${faded(AMBER)} 40%, ${faded(GREEN)} 80%`);

		// Plain under a gradient.
		expect(paints(50, { ...scale, activeColoring: 'gradient', inactiveColoring: 'plain' }, 4).slice(2)).toEqual([none, none]);
	});

	test('the track of the one bar, where nothing is filled', () => {
		expect(drawing(62, { ...scale, inactiveColoring: 'automatic' }).track).toEqual({ color: faded(AMBER), scale: null });
		expect(drawing(62, { ...scale, inactiveColoring: 'value', activeColoring: 'gradient' }).track).toEqual({ color: faded(AMBER), scale: null });

		const stepped = drawing(62, { ...scale, activeColoring: 'steps', inactiveColoring: 'automatic' });
		expect(stepped.track).toEqual({ color: null, scale: 'weak' });
		expect(stepped.weakStops).toBe(`${faded(RED)} 40%, ${faded(AMBER)} 40%, ${faded(AMBER)} 80%, ${faded(GREEN)} 80%`);
		expect(stepped.stops).toBe(`${RED} 40%, ${AMBER} 40%, ${AMBER} 80%, ${GREEN} 80%`);

		const blended = drawing(62, { ...scale, activeColoring: 'gradient', inactiveColoring: 'automatic' });
		expect(blended.track).toEqual({ color: null, scale: 'weak' });
		expect(blended.fill).toEqual({ color: null, scale: 'full' });
		expect(blended.weakStops).toBe(`${faded(RED)} 0%, ${faded(AMBER)} 40%, ${faded(GREEN)} 80%`);

		// Each on its own: a faded gradient under a fill of one colour.
		const mixed = drawing(62, { ...scale, inactiveColoring: 'gradient' });
		expect(mixed.fill).toEqual({ color: AMBER, scale: null });
		expect(mixed.track).toEqual({ color: null, scale: 'weak' });
		expect(mixed.stops).toBeNull();
	});

	test('without thresholds the three ways are the same: one colour, and one faded colour', () => {
		for (const activeColoring of ['value', 'steps', 'gradient']) {
			for (const inactiveColoring of ['automatic', 'value', 'steps', 'gradient']) {
				const own = { color: GREEN, activeColoring, inactiveColoring };

				expect(drawing(62, own), `${activeColoring} ${inactiveColoring}`).toEqual({
					stops: null,
					weakStops: null,
					track: { color: faded(GREEN), scale: null },
					fill: { color: GREEN, scale: null },
					pieces: null,
				});

				expect(paints(50, own, 2)).toEqual([{ color: GREEN, scale: null }, { color: faded(GREEN), scale: null }]);
			}

			expect(drawing(62, { activeColoring }).track).toEqual(none);
			expect(drawing(62, { activeColoring }).fill).toEqual({ color: DEFAULT_COLOR, scale: null });
		}
	});

	test('no value: no colours, whatever the colouring', () => {
		expect(drawing(null, { ...scale, activeColoring: 'gradient', inactiveColoring: 'automatic' })).toEqual({ stops: null, weakStops: null, track: none, fill: none, pieces: null });
		expect(drawing('abc', { ...scale, inactiveColoring: 'value' }).track).toEqual(none);
	});

	test('every colour which reaches the page is a colour of the options, as it is or inside the one mix', () => {
		const own = { color: 'red; background: url(x)', thresholds: [{ value: 40, color: 'var(--theme--danger)' }, { value: 60, color: 'url(x)' }], activeColoring: 'gradient', inactiveColoring: 'steps' };
		const result = drawing(50, own);

		expect(result.stops).toBe(`${DEFAULT_COLOR} 0%, var(--theme--danger) 40%`);
		expect(result.weakStops).toBe(`${faded(DEFAULT_COLOR)} 40%, ${faded('var(--theme--danger)')} 40%`);
	});

	test('the colour of a value is that of the real value, not of the piece it fills', () => {
		const options = readOptions({ visualization: 'pills', color: RED, thresholds: [{ value: 45, color: GREEN }] });

		expect(readingOf(44.9, options, EN).color).toBe(RED);
		expect(readingOf(45, options, EN).color).toBe(GREEN);
	});
});

describe('how a meter is edited', () => {
	test('nothing set: the method is chosen for it, in steps of 1, at a sensitivity of 1', () => {
		expect(readEditing()).toEqual({ input: 'automatic', step: 1, sensitivity: 1, whole: false });
		expect(readEditing({})).toEqual({ input: 'automatic', step: 1, sensitivity: 1, whole: false });
		expect(readEditing(null, 'float')).toEqual({ input: 'automatic', step: 1, sensitivity: 1, whole: false });
	});

	test('the method is one of four words, and anything else is automatic', () => {
		for (const input of ['automatic', 'contiguous', 'segment', 'relative']) expect(readEditing({ input }).input).toBe(input);

		for (const input of [null, undefined, '', 'Relative', 'segments', 'drag', 1, true, ['relative']]) {
			expect(readEditing({ input }).input, String(input)).toBe('automatic');
		}
	});

	test('the step is a number above zero, or the text of one', () => {
		expect(readEditing({ step: 5 }).step).toBe(5);
		expect(readEditing({ step: 0.1 }).step).toBe(0.1);
		expect(readEditing({ step: '0.25' }).step).toBe(0.25);
		expect(readEditing({ step: 1e-3 }).step).toBe(0.001);
	});

	test('a step which is zero, negative or junk is 1', () => {
		for (const step of [0, -1, -0.5, 'abc', '0', Number.NaN, Number.POSITIVE_INFINITY, true, [2], { value: 2 }]) {
			expect(readEditing({ step }).step, String(step)).toBe(1);
			expect(readEditing({ step, stepInterval: 5 }).step, String(step)).toBe(1);
		}
	});

	test('without a step of its own, the step a stock Slider left behind', () => {
		expect(readEditing({ stepInterval: 5 }).step).toBe(5);
		expect(readEditing({ stepInterval: '0.5' }).step).toBe(0.5);
		expect(readEditing({ step: null, stepInterval: 5 }).step).toBe(5);
		expect(readEditing({ step: '', stepInterval: 5 }).step).toBe(5);
		expect(readEditing({ step: undefined, stepInterval: 5 }).step).toBe(5);

		// Its own wins.
		expect(readEditing({ step: 2, stepInterval: 5 }).step).toBe(2);

		// One which is no step is 1.
		expect(readEditing({ stepInterval: 0 }).step).toBe(1);
		expect(readEditing({ stepInterval: 'abc' }).step).toBe(1);
		expect(readEditing({ stepInterval: null }).step).toBe(1);
	});

	test('a field of a whole type has a whole step of at least 1', () => {
		for (const type of ['integer', 'bigInteger']) {
			expect(readEditing({}, type)).toEqual({ input: 'automatic', step: 1, sensitivity: 1, whole: true });
			expect(readEditing({ step: 2.4 }, type).step).toBe(2);
			expect(readEditing({ step: 2.5 }, type).step).toBe(3);
			expect(readEditing({ step: 0.1 }, type).step).toBe(1);
			expect(readEditing({ step: 0.4 }, type).step).toBe(1);
			expect(readEditing({ stepInterval: 0.5 }, type).step).toBe(1);
			expect(readEditing({ step: 50 }, type).step).toBe(50);
		}

		for (const type of ['float', 'decimal', undefined, null, 'string', 7]) {
			expect(readEditing({ step: 0.1 }, type).whole, String(type)).toBe(false);
			expect(readEditing({ step: 0.1 }, type).step, String(type)).toBe(0.1);
		}
	});

	test('the sensitivity is a number above zero, and 1 otherwise', () => {
		expect(readEditing({ sensitivity: 2 }).sensitivity).toBe(2);
		expect(readEditing({ sensitivity: '0.5' }).sensitivity).toBe(0.5);

		for (const sensitivity of [0, -1, 'abc', null, undefined, '', Number.NaN, true]) {
			expect(readEditing({ sensitivity }).sensitivity, String(sensitivity)).toBe(1);
		}
	});

	test('the options of editing change nothing about what is drawn', () => {
		const own = { input: 'relative', step: 5, sensitivity: 2 };

		expect(readOptions(own)).toEqual(readOptions());
		expect(readLook(own)).toEqual(readLook());
	});
});

describe('the value which is written', () => {
	const float = (step: number) => ({ step, whole: false });
	const whole = (step: number) => ({ step, whole: true });

	test('on the grid of steps, to the nearer of the two values around it', () => {
		expect(snapValue(42, range(0, 100), float(1))).toBe(42);
		expect(snapValue(42.4, range(0, 100), float(1))).toBe(42);
		expect(snapValue(42.5, range(0, 100), float(1))).toBe(43);
		expect(snapValue(42.6, range(0, 100), float(1))).toBe(43);
		expect(snapValue(12, range(0, 100), float(5))).toBe(10);
		expect(snapValue(12.5, range(0, 100), float(5))).toBe(15);
		expect(snapValue(13, range(0, 100), float(5))).toBe(15);
	});

	test('the grid is counted from the minimum', () => {
		expect(snapValue(4, range(1, 10), float(2))).toBe(5);
		expect(snapValue(3.9, range(1, 10), float(2))).toBe(3);
		expect(snapValue(-3, range(-5, 5), float(4))).toBe(-1);
		expect(snapValue(0.3, range(0.25, 2), float(0.5))).toBe(0.25);
		expect(snapValue(0.6, range(0.25, 2), float(0.5))).toBe(0.75);
	});

	test('never outside the range', () => {
		expect(snapValue(150, range(0, 100), float(1))).toBe(100);
		expect(snapValue(-20, range(0, 100), float(1))).toBe(0);
		expect(snapValue(1e300, range(0, 100), float(7))).toBe(100);
		expect(snapValue(-1e300, range(10, 100), float(7))).toBe(10);
	});

	test('the maximum can always be written, also where the grid misses it', () => {
		// Steps of 3 from 0 to 10: 0, 3, 6, 9 and 10.
		const grid = range(0, 10);

		expect(snapValue(10, grid, float(3))).toBe(10);
		expect(snapValue(11, grid, float(3))).toBe(10);
		expect(snapValue(9.6, grid, float(3))).toBe(10);
		expect(snapValue(9.5, grid, float(3))).toBe(10);
		expect(snapValue(9.4, grid, float(3))).toBe(9);
		expect(snapValue(9, grid, float(3))).toBe(9);
		expect(snapValue(8, grid, float(3))).toBe(9);
		expect(snapValue(7.4, grid, float(3))).toBe(6);

		// A step larger than the range: the two ends.
		expect(snapValue(4, range(0, 10), float(50))).toBe(0);
		expect(snapValue(6, range(0, 10), float(50))).toBe(10);
	});

	test('no dust: no more decimals than the step and the limits have', () => {
		expect(snapValue(0.3, range(0, 1), float(0.1))).toBe(0.3);
		expect(snapValue(0.30000000000000004, range(0, 1), float(0.1))).toBe(0.3);
		expect(snapValue(0.7, range(0, 1), float(0.1))).toBe(0.7);
		expect(snapValue(0.29, range(0, 1), float(0.01))).toBe(0.29);
		expect(snapValue(0.57, range(0, 1), float(0.01))).toBe(0.57);
		expect(snapValue(1.1, range(0.1, 2), float(0.2))).toBe(1.1);
		expect(snapValue(3.3, range(0, 10), float(1.1))).toBe(3.3);
		expect(snapValue(2.675, range(0, 10), float(0.25))).toBe(2.75);

		// Every point of a grid of tenths is written as it is read.
		for (let index = 0; index <= 100; index++) {
			const written = snapValue(index / 100 + 1e-12, range(0, 1), float(0.01));
			expect(String(written).length, String(written)).toBeLessThanOrEqual(4);
			expect(written).toBe(Number((index / 100).toFixed(2)));
		}

		for (let index = 0; index <= 30; index++) {
			expect(String(snapValue(index * 0.1, range(0, 3), float(0.1))).length).toBeLessThanOrEqual(3);
		}
	});

	test('a whole type gets a whole number, from a grid which starts at the first whole number of the range', () => {
		expect(snapValue(42.4, range(0, 100), whole(1))).toBe(42);
		expect(snapValue(42.5, range(0, 100), whole(1))).toBe(43);
		expect(snapValue(12, range(0, 100), whole(5))).toBe(10);
		expect(snapValue(0.2, range(0.5, 9.5), whole(1))).toBe(1);
		expect(snapValue(9.4, range(0.5, 9.5), whole(1))).toBe(9);
		expect(snapValue(20, range(0.5, 9.5), whole(1))).toBe(9);
		expect(snapValue(4, range(0.5, 9.5), whole(2))).toBe(5);

		for (let value = -5; value <= 15; value += 0.37) {
			expect(Number.isInteger(snapValue(value, range(0.5, 9.5), whole(2)))).toBe(true);
		}

		// A range which holds no whole number has nothing to write.
		expect(snapValue(0.5, range(0.2, 0.8), whole(1))).toBeNull();
	});

	test('to the next value below or above, as a key press wants it', () => {
		expect(snapValue(4.7, range(0, 10), float(1), 'down')).toBe(4);
		expect(snapValue(4.7, range(0, 10), float(1), 'up')).toBe(5);
		expect(snapValue(4, range(0, 10), float(1), 'down')).toBe(4);
		expect(snapValue(4, range(0, 10), float(1), 'up')).toBe(4);
		expect(snapValue(0.3, range(0, 1), float(0.1), 'down')).toBe(0.3);
		expect(snapValue(0.3, range(0, 1), float(0.1), 'up')).toBe(0.3);

		// Around the maximum of a grid which misses it.
		expect(snapValue(9.5, range(0, 10), float(3), 'down')).toBe(9);
		expect(snapValue(9.5, range(0, 10), float(3), 'up')).toBe(10);
		expect(snapValue(12, range(0, 10), float(3), 'down')).toBe(10);
		expect(snapValue(7, range(0, 10), float(3), 'up')).toBe(9);
		expect(snapValue(-2, range(0, 10), float(3), 'up')).toBe(0);
	});

	test('never anything but a finite number, whatever comes in', () => {
		for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
			expect(snapValue(value, range(0, 100), float(1))).toBeNull();
		}

		expect(snapValue(50, range(0, 100), float(0))).toBeNull();
		expect(snapValue(50, range(0, 100), float(-1))).toBeNull();
		expect(snapValue(50, range(0, 100), float(Number.NaN))).toBeNull();
		expect(snapValue(50, range(Number.NaN, 100), float(1))).toBeNull();

		// A range of one number has that number.
		expect(snapValue(3, range(7, 7), float(1))).toBe(7);

		// Limits too far apart to subtract, a step far smaller than the range, a step far larger.
		for (const [value, limits, step] of [
			[5, range(-1e308, 1e308), 1],
			[1e308, range(-1e308, 1e308), 1e300],
			[0.5, range(0, 1), 1e-12],
			[0.5, range(0, 1), 1e-300],
			[5e20, range(0, 1e21), 1],
			[3, range(0, 10), 1e308],
		] as const) {
			const written = snapValue(value, limits, float(step));
			expect(Number.isFinite(written), `${value} ${step}`).toBe(true);
			expect(written!).toBeGreaterThanOrEqual(limits.min);
			expect(written!).toBeLessThanOrEqual(limits.max);
		}
	});

	test('whatever is asked for, what is written is on the grid or the maximum, within the range', () => {
		for (const [limits, step] of [
			[range(0, 100), 1],
			[range(0, 10), 3],
			[range(-5, 5), 0.5],
			[range(0.1, 2), 0.2],
			[range(0, 1), 0.01],
			[range(2, 3), 0.3],
		] as const) {
			for (let share = -0.2; share <= 1.2; share += 0.0137) {
				const asked = limits.min + share * (limits.max - limits.min);

				for (const rounding of ['nearest', 'down', 'up'] as const) {
					const written = snapValue(asked, limits, float(step), rounding)!;
					const steps = (written - limits.min) / step;

					expect(written).toBeGreaterThanOrEqual(limits.min);
					expect(written).toBeLessThanOrEqual(limits.max);
					expect(written === limits.max || Math.abs(steps - Math.round(steps)) < 1e-9, `${asked} by ${step}: ${written}`).toBe(true);
				}
			}
		}
	});
});

describe('where the pointer is', () => {
	test('its share of the length of the track, from 0 to 1', () => {
		expect(shareAt(0, 400)).toBe(0);
		expect(shareAt(100, 400)).toBe(0.25);
		expect(shareAt(400, 400)).toBe(1);
		expect(shareAt(-50, 400)).toBe(0);
		expect(shareAt(900, 400)).toBe(1);
		expect(shareAt(100, 0)).toBe(0);
		expect(shareAt(Number.NaN, 400)).toBe(0);
	});

	test('the value at a share of the range', () => {
		expect(valueAtShare(0, range(0, 100))).toBe(0);
		expect(valueAtShare(0.25, range(0, 100))).toBe(25);
		expect(valueAtShare(1, range(0, 100))).toBe(100);
		expect(valueAtShare(0.5, range(-50, 50))).toBe(0);
		expect(valueAtShare(0.5, range(20, 30))).toBe(25);
		expect(valueAtShare(-1, range(20, 30))).toBe(20);
		expect(valueAtShare(2, range(20, 30))).toBe(30);
		expect(valueAtShare(Number.NaN, range(20, 30))).toBe(20);
		expect(Number.isFinite(valueAtShare(0.5, range(-1e308, 1e308)))).toBe(true);
	});

	test('contiguous: the value under the pointer, on the grid', () => {
		const under = (position: number, length: number, limits = range(0, 100), step = 1) => snapValue(valueAtShare(shareAt(position, length), limits), limits, { step, whole: false });

		expect(under(100, 400)).toBe(25);
		expect(under(101, 400)).toBe(25);
		expect(under(103, 400)).toBe(26);
		expect(under(0, 400)).toBe(0);
		expect(under(400, 400)).toBe(100);
		expect(under(-30, 400)).toBe(0);
		expect(under(430, 400)).toBe(100);
		expect(under(100, 400, range(0, 1), 0.1)).toBe(0.3);
		expect(under(390, 400, range(0, 10), 3)).toBe(10);
	});
});

describe('the pieces the pointer fills', () => {
	// Four pills of 80px, 4px apart, in a track of 332px.
	const pills = pieceGeometry('pills', 'form', 4, 332);

	test('all up to and including the piece under the pointer', () => {
		expect(filledAt(0, pills)).toBe(1);
		expect(filledAt(40, pills)).toBe(1);
		expect(filledAt(79.9, pills)).toBe(1);
		expect(filledAt(84, pills)).toBe(2);
		expect(filledAt(120, pills)).toBe(2);
		expect(filledAt(200, pills)).toBe(3);
		expect(filledAt(300, pills)).toBe(4);
		expect(filledAt(332, pills)).toBe(4);
	});

	test('a pointer in a gap counts for the piece before it', () => {
		expect(filledAt(80, pills)).toBe(1);
		expect(filledAt(82, pills)).toBe(1);
		expect(filledAt(83.9, pills)).toBe(1);
		expect(filledAt(166, pills)).toBe(2);
		expect(filledAt(250, pills)).toBe(3);
	});

	test('before the start of the first piece: none. After the last: all', () => {
		expect(filledAt(-0.1, pills)).toBe(0);
		expect(filledAt(-200, pills)).toBe(0);
		expect(filledAt(333, pills)).toBe(4);
		expect(filledAt(5000, pills)).toBe(4);
		expect(filledAt(Number.NaN, pills)).toBe(0);
		expect(filledAt(100, [])).toBe(0);
	});

	test('packed dots: the pieces are where the dots are, not the whole track', () => {
		// Five dots of 12px, 6px apart: the row is 84px of a track of 342px.
		const dots = pieceGeometry('dots', 'form', 5, 342);

		expect(filledAt(5, dots)).toBe(1);
		expect(filledAt(14, dots)).toBe(1);
		expect(filledAt(18, dots)).toBe(2);
		expect(filledAt(40, dots)).toBe(3);
		expect(filledAt(60, dots)).toBe(4);
		expect(filledAt(80, dots)).toBe(5);
		expect(filledAt(84, dots)).toBe(5);
		expect(filledAt(171, dots)).toBe(5);
		expect(filledAt(342, dots)).toBe(5);

		// Spread, the same five reach across the track.
		const spread = pieceGeometry('dots', 'form', 5, 342, 'spread');
		expect(filledAt(80, spread)).toBe(1);
		expect(filledAt(171, spread)).toBe(3);
		expect(filledAt(335, spread)).toBe(5);
	});

	test('the value is that share of the range', () => {
		const value = (position: number, limits = range(0, 5), step = 1) => snapValue(valueAtShare(filledAt(position, pills) / pills.length, limits), limits, { step, whole: true });

		expect(value(-10, range(0, 4))).toBe(0);
		expect(value(40, range(0, 4))).toBe(1);
		expect(value(120, range(0, 4))).toBe(2);
		expect(value(300, range(0, 4))).toBe(4);
		expect(value(900, range(0, 4))).toBe(4);
		expect(value(120, range(10, 18), 2)).toBe(14);

		// Four pieces for a hundred: a quarter each.
		expect(value(120, range(0, 100))).toBe(50);
	});
});

describe('the method the pointer works by', () => {
	const method = (own: object, count: number, limits = range(0, 100), type?: string) => inputMethod(readEditing(own, type), count, limits);

	test('automatic, on one bar: the value under the pointer', () => {
		expect(method({}, 0)).toBe('contiguous');
		expect(method({}, 1)).toBe('contiguous');
		expect(method({ input: 'automatic' }, 0, range(0, 5))).toBe('contiguous');
	});

	test('automatic, in pieces: by the piece where each piece is exactly one step', () => {
		expect(method({}, 5, range(0, 5))).toBe('segment');
		expect(method({}, 10, range(0, 10))).toBe('segment');
		expect(method({ step: 10 }, 10, range(0, 100))).toBe('segment');
		expect(method({ step: 25 }, 4, range(0, 100))).toBe('segment');
		expect(method({ step: 0.1 }, 10, range(0, 1))).toBe('segment');
		expect(method({ step: 0.1 }, 3, range(0, 0.3))).toBe('segment');
		expect(method({ stepInterval: 20 }, 5, range(0, 100))).toBe('segment');
		expect(method({}, 6, range(-3, 3))).toBe('segment');
	});

	test('automatic, in pieces which are more or less than a step: the value under the pointer', () => {
		expect(method({}, 10, range(0, 100))).toBe('contiguous');
		expect(method({}, 25, range(0, 100))).toBe('contiguous');
		expect(method({ step: 5 }, 10, range(0, 100))).toBe('contiguous');
		expect(method({ step: 2 }, 5, range(0, 5))).toBe('contiguous');
		expect(method({}, 14, range(0, 2.5))).toBe('contiguous');
		expect(method({ step: 0.5 }, 5, range(0, 5))).toBe('contiguous');
		// A whole type has a whole step, whatever is set.
		expect(method({ step: 0.5 }, 5, range(0, 5), 'integer')).toBe('segment');
	});

	test('automatic is never relative', () => {
		for (const count of [0, 2, 5, 10, 50]) {
			for (const step of [1, 2, 5, 10, 0.1]) expect(method({ step }, count)).not.toBe('relative');
		}
	});

	test('a method which is set is used, but one bar has no pieces to fill', () => {
		expect(method({ input: 'relative' }, 0)).toBe('relative');
		expect(method({ input: 'relative' }, 5, range(0, 5))).toBe('relative');
		expect(method({ input: 'contiguous' }, 5, range(0, 5))).toBe('contiguous');
		expect(method({ input: 'segment' }, 10)).toBe('segment');
		expect(method({ input: 'segment' }, 0)).toBe('contiguous');
		expect(method({ input: 'segment' }, 1)).toBe('contiguous');
	});
});

describe('the relative method', () => {
	const limits = range(0, 100);

	test('one length of the track is the whole range at a sensitivity of 1', () => {
		expect(relativeMove(40, 100, 400, limits, 1)).toBe(65);
		expect(relativeMove(40, -100, 400, limits, 1)).toBe(15);
		expect(relativeMove(0, 400, 400, limits, 1)).toBe(100);
		expect(relativeMove(40, 0, 400, limits, 1)).toBe(40);
		expect(relativeMove(20, 40, 400, range(20, 30), 1)).toBe(21);
	});

	test('the sensitivity multiplies it, and Shift makes it ten times finer', () => {
		expect(relativeMove(40, 100, 400, limits, 2)).toBe(90);
		expect(relativeMove(40, 100, 400, limits, 0.5)).toBe(52.5);
		expect(relativeMove(40, 100, 400, limits, 1, true)).toBe(42.5);
		expect(relativeMove(40, -100, 400, limits, 2, true)).toBe(35);
	});

	test('it stays within the range, and does not wind up beyond it', () => {
		expect(relativeMove(90, 400, 400, limits, 1)).toBe(100);
		expect(relativeMove(10, -400, 400, limits, 1)).toBe(0);
		// After running into the end, the first movement back counts.
		expect(relativeMove(relativeMove(90, 4000, 400, limits, 1), -40, 400, limits, 1)).toBe(90);
		// A value from outside the range starts at the end of the range.
		expect(relativeMove(150, -40, 400, limits, 1)).toBe(90);
		expect(relativeMove(-20, 40, 400, limits, 1)).toBe(10);
	});

	test('what is not yet a step is kept, so slow movement adds up', () => {
		const editing = { step: 1, whole: true };
		let raw = 40;
		const written: (number | null)[] = [];

		// A pixel at a time along 400px: a quarter of a step each.
		for (let index = 0; index < 8; index++) {
			raw = relativeMove(raw, 1, 400, limits, 1);
			written.push(snapValue(raw, limits, editing));
		}

		expect(raw).toBe(42);
		expect(written).toEqual([40, 41, 41, 41, 41, 42, 42, 42]);

		// With Shift, forty pixels are one step.
		raw = 40;
		for (let index = 0; index < 39; index++) raw = relativeMove(raw, 1, 400, limits, 1, true);
		expect(snapValue(raw, limits, editing)).toBe(41);
		expect(raw).toBeCloseTo(40.975, 9);
	});

	test('nothing which is not a number comes out', () => {
		expect(relativeMove(40, Number.NaN, 400, limits, 1)).toBe(40);
		expect(relativeMove(40, 100, 0, limits, 1)).toBe(40);
		expect(relativeMove(40, 100, -5, limits, 1)).toBe(40);
		expect(relativeMove(Number.NaN, 100, 400, limits, 1)).toBe(0);
		expect(relativeMove(40, Number.POSITIVE_INFINITY, 400, limits, 1)).toBe(40);
		expect(Number.isFinite(relativeMove(0, 100, 400, range(-1e308, 1e308), 1))).toBe(true);
	});
});

describe('the keys', () => {
	const limits = range(0, 100);
	const one = { step: 1, whole: true };
	const key = (name: string, current: number | null, editing = one, count = 0, rtl = false, within = limits) => keyValue(name, current, within, editing, count, rtl);

	test('Right and Up are one step up, Left and Down one step down', () => {
		expect(key('ArrowRight', 40)).toBe(41);
		expect(key('ArrowUp', 40)).toBe(41);
		expect(key('ArrowLeft', 40)).toBe(39);
		expect(key('ArrowDown', 40)).toBe(39);
		expect(key('ArrowRight', 40, { step: 5, whole: true })).toBe(45);
		expect(key('ArrowLeft', 0.5, { step: 0.1, whole: false }, 0, false, range(0, 1))).toBe(0.4);
		expect(key('ArrowRight', 0.2, { step: 0.1, whole: false }, 0, false, range(0, 1))).toBe(0.3);
	});

	test('in a right-to-left page Left and Right swap, Up and Down do not', () => {
		expect(key('ArrowLeft', 40, one, 0, true)).toBe(41);
		expect(key('ArrowRight', 40, one, 0, true)).toBe(39);
		expect(key('ArrowUp', 40, one, 0, true)).toBe(41);
		expect(key('ArrowDown', 40, one, 0, true)).toBe(39);
		expect(key('PageUp', 40, one, 0, true)).toBe(50);
		expect(key('Home', 40, one, 0, true)).toBe(0);
		expect(key('End', 40, one, 0, true)).toBe(100);
	});

	test('Page Up and Page Down are ten steps, or one piece where that is more', () => {
		expect(key('PageUp', 40)).toBe(50);
		expect(key('PageDown', 40)).toBe(30);
		expect(key('PageUp', 40, { step: 2, whole: true })).toBe(60);

		// Four pieces for a hundred: a piece is 25, which is more than ten steps of 1.
		expect(key('PageUp', 40, one, 4)).toBe(65);
		expect(key('PageDown', 40, one, 4)).toBe(15);

		// Twenty pieces: a piece is 5, which is less.
		expect(key('PageUp', 40, one, 20)).toBe(50);

		// Five pieces for five: ten steps would be the whole range and more.
		expect(key('PageUp', 2, one, 5, false, range(0, 5))).toBe(5);
		expect(key('PageDown', 2, one, 5, false, range(0, 5))).toBe(0);
	});

	test('Home and End are the two ends of the range', () => {
		expect(key('Home', 40)).toBe(0);
		expect(key('End', 40)).toBe(100);
		expect(key('End', 3, { step: 3, whole: true }, 0, false, range(0, 10))).toBe(10);
		expect(key('Home', 3, one, 0, false, range(0.5, 9.5))).toBe(1);
		expect(key('End', 3, one, 0, false, range(0.5, 9.5))).toBe(9);
	});

	test('the ends hold', () => {
		expect(key('ArrowRight', 100)).toBe(100);
		expect(key('ArrowLeft', 0)).toBe(0);
		expect(key('PageUp', 95)).toBe(100);
		expect(key('PageDown', 5)).toBe(0);
	});

	test('a grid which misses the maximum: up to it, and down from it to the grid', () => {
		const three = { step: 3, whole: true };
		const ten = range(0, 10);

		expect(key('ArrowRight', 9, three, 0, false, ten)).toBe(10);
		expect(key('ArrowLeft', 10, three, 0, false, ten)).toBe(9);
		expect(key('ArrowLeft', 9, three, 0, false, ten)).toBe(6);
		expect(key('ArrowRight', 6, three, 0, false, ten)).toBe(9);
	});

	test('a value between two points of the grid goes to the next point', () => {
		const five = { step: 5, whole: true };

		expect(key('ArrowRight', 42, five)).toBe(45);
		expect(key('ArrowLeft', 42, five)).toBe(40);
		expect(key('ArrowRight', 3.7, { step: 1, whole: false }, 0, false, range(0, 10))).toBe(4);
		expect(key('ArrowLeft', 3.7, { step: 1, whole: false }, 0, false, range(0, 10))).toBe(3);
	});

	test('a value outside the range comes into it, and a field without a value gets one', () => {
		expect(key('ArrowLeft', 150)).toBe(99);
		expect(key('ArrowRight', 150)).toBe(100);
		expect(key('ArrowRight', -20)).toBe(1);
		expect(key('ArrowLeft', -20)).toBe(0);
		expect(key('ArrowRight', null)).toBe(1);
		expect(key('ArrowLeft', null)).toBe(0);
		expect(key('End', null)).toBe(100);
		expect(key('ArrowRight', Number.NaN)).toBe(1);
	});

	test('any other key is none of the meter\'s', () => {
		for (const name of ['a', ' ', 'Enter', 'Tab', 'Escape', 'Delete', 'Backspace', '5', 'Shift']) {
			expect(key(name, 40), name).toBeUndefined();
		}
	});
});

describe('whether a field can be edited, and whether a value changes it', () => {
	test('a field can be edited unless it is disabled, shown without editing or loading', () => {
		expect(canEdit({})).toBe(true);
		expect(canEdit({ disabled: false, nonEditable: false, loading: false })).toBe(true);
		expect(canEdit({ disabled: undefined, nonEditable: undefined, loading: undefined })).toBe(true);
	});

	test('each of the three alone is enough to stop it, and so is any pair and all three', () => {
		expect(canEdit({ disabled: true })).toBe(false);
		expect(canEdit({ nonEditable: true })).toBe(false);
		expect(canEdit({ loading: true })).toBe(false);

		for (const disabled of [false, true]) {
			for (const nonEditable of [false, true]) {
				for (const loading of [false, true]) {
					expect(canEdit({ disabled, nonEditable, loading }), `${disabled} ${nonEditable} ${loading}`).toBe(!disabled && !nonEditable && !loading);
				}
			}
		}
	});

	test('a number which the field already holds is no change, as a number or as its text', () => {
		expect(changes(5, 5)).toBe(false);
		expect(changes('5', 5)).toBe(false);
		expect(changes('2.50', 2.5)).toBe(false);
		expect(changes(0, 0)).toBe(false);
		expect(changes(-0, 0)).toBe(false);
		expect(changes(5n, 5)).toBe(false);
	});

	test('any other number is a change, and any number is one for a field without a value', () => {
		expect(changes(5, 6)).toBe(true);
		expect(changes(0.3, 0.30000000000000004)).toBe(true);
		expect(changes(null, 0)).toBe(true);
		expect(changes(undefined, 0)).toBe(true);
		expect(changes('', 0)).toBe(true);
		expect(changes('abc', 0)).toBe(true);
		expect(changes(150, 100)).toBe(true);
	});
});
