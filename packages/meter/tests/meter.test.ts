import { describe, expect, test } from 'vitest';
import {
	DEFAULT_COLOR,
	DISPLAY_WIDTH,
	LEAST_STEP,
	STEPS_WANTED,
	defaultStep,
	FADE,
	FREE_DIGITS,
	MAX_PIECES,
	BAR_REACH,
	barFit,
	MAX_GROW,
	MAX_STEPS,
	SMALL_PIECES,
	TOUCH_SLOP,
	MIN_SUBDIVISIONS,
	NO_VALUE,
	PIECE_SIZES,
	TRACK_COLOR,
	blendAt,
	blendCss,
	canEdit,
	changes,
	colorFor,
	drawingOf,
	drawnCount,
	fadedColor,
	fillScale,
	growOf,
	growthOf,
	LARGE_ACROSS,
	LARGE_ALONG,
	largeScale,
	pieceScale,
	reachOf,
	scaleCss,
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
	pieceValue,
	shareAt,
	sideways,
	snapValue,
	stopsCss,
	textHandler,
	textOf,
	tooltipOf,
	valueAtShare,
	valueText,
	wantedCount,
	writableRange,
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
		const defaults = { min: 0, max: 100, label: null, indicator: true, indicatorFormat: 'percent', prefix: '', suffix: '', color: DEFAULT_COLOR, thresholds: [] };

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
		const inherited = { min: 0, max: 10, label: 'Tasks', indicator: false, indicatorFormat: 'fraction', prefix: '#', suffix: ' done', color: GREEN, thresholds: [{ value: 5, color: AMBER }] };

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

describe('nothing which is not finite reaches a style', () => {
	// The example of the review: 1e-300 of 0 to ten thousand million, coloured by a gradient.
	const wide = { min: 0, max: 1e10, color: '#2ECDA7', thresholds: [{ value: 5e9, color: '#E35169' }] };
	const gradient = { activeColoring: 'gradient', inactiveColoring: 'plain' } as const;

	test('a share too small to divide by is nothing filled', () => {
		expect(1 / (1e-300 / 1e10)).toBe(Number.POSITIVE_INFINITY);
		expect(fractionOf(1e-300, range(0, 1e10))).toBe(0);
		expect(fractionOf(5e-324, range(0, 1))).toBe(0);
		expect(fractionOf(1e-310, range(0, 1))).toBe(0);
		expect(fractionOf(1e-300, range(0, 1))).toBe(1e-300);
		expect(fractionOf(1e-10, range(0, 1e10))).toBe(1e-10 / 1e10);
	});

	test('the reading of the example is empty of fill, and still has its number as text', () => {
		const options = readOptions({ ...wide, indicatorFormat: 'value' });
		const reading = readingOf(1e-300, options, EN);

		expect(reading.empty).toBe(false);
		expect(reading.fraction).toBe(0);
		expect(reading.now).toBe(1e-300);
		expect(Number.isFinite(fillScale(reading.fraction))).toBe(true);
	});

	test('the scale of the fill, which both components write into its style, is finite for every fraction', () => {
		expect(fillScale(0.25)).toBe(4);
		expect(fillScale(1)).toBe(1);
		expect(fillScale(0)).toBe(1);
		expect(fillScale(5e-324)).toBe(1);
		expect(fillScale(1e-310)).toBe(1);
		expect(fillScale(Number.NaN)).toBe(1);
		expect(fillScale(-1)).toBe(1);
		expect(fillScale(2)).toBe(1);

		// Every number which the form and the display put into a style for a painted bar, over tiny, huge and
		// ordinary values: the length of the fill in percent, its scale, and the place of the handle.
		for (const value of [5e-324, 1e-320, 1e-310, 1e-308, 1e-300, 1e-200, 1e-20, 1, 12345.678, 5e9, 1e10, 1e300, -1, Number.MAX_VALUE]) {
			for (const max of [1, 100, 1e10, 1e300, Number.MAX_VALUE]) {
				const options = readOptions({ ...wide, max, thresholds: [{ value: max / 2, color: '#E35169' }] });
				const reading = readingOf(value, options, EN);
				const drawing = drawingOf(gradient, options, reading, 0, value);

				for (const number of [reading.fraction * 100, fillScale(reading.fraction), 1 / fillScale(reading.fraction)]) {
					if (!Number.isFinite(number)) expect.fail(`${value} of ${max}: ${number}`);
				}

				expect(drawing.stops, `${value} of ${max}`).not.toMatch(/Infinity|NaN/);
				if (reading.fraction > 0) expect(fillScale(reading.fraction), `${value} of ${max}`).toBe(1 / reading.fraction);
			}
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

describe('a prefix and a suffix of the value text', () => {
	const text = (value: number, own: object) => valueText(value, readOptions({ max: 10000, ...own }), EN);

	test('the value: the prefix, the number, the suffix, joined as they are', () => {
		expect(text(4200, { indicatorFormat: 'value', prefix: '$' })).toBe('$4,200');
		expect(text(42, { indicatorFormat: 'value', suffix: ' GB' })).toBe('42 GB');
		expect(text(42, { indicatorFormat: 'value', suffix: 'GB' })).toBe('42GB');
		expect(text(42, { indicatorFormat: 'value', prefix: '~ ', suffix: ' km/h' })).toBe('~ 42 km/h');
		expect(text(-5, { indicatorFormat: 'value', prefix: '$' })).toBe('$-5');
		expect(text(1250.5, { indicatorFormat: 'value', suffix: ' €' })).toBe('1,250.5 €');
		expect(valueText(1250.5, readOptions({ max: 2000, indicatorFormat: 'value', suffix: ' €' }), 'de-DE')).toBe('1.250,5 €');
	});

	test('the fraction: the prefix before each of the two numbers, the suffix once at the end', () => {
		expect(text(4200, { indicatorFormat: 'fraction', prefix: '$' })).toBe('$4,200 / $10,000');
		expect(text(42, { max: 100, indicatorFormat: 'fraction', suffix: ' GB' })).toBe('42 / 100 GB');
		expect(text(7, { max: 12, indicatorFormat: 'fraction', prefix: '#', suffix: ' tasks' })).toBe('#7 / #12 tasks');
	});

	test('the percentage has neither', () => {
		expect(text(4200, { indicatorFormat: 'percent', prefix: '$', suffix: ' GB' })).toBe('42%');
		expect(text(4200, { prefix: '$', suffix: ' GB' })).toBe('42%');
		expect(text(4200, { indicatorFormat: 'junk', prefix: '$', suffix: ' GB' })).toBe('42%');
	});

	test('they are read like the caption, but kept as they were typed', () => {
		expect(readOptions({ prefix: '$', suffix: ' GB' })).toMatchObject({ prefix: '$', suffix: ' GB' });
		expect(readOptions({ prefix: ' ≈ ', suffix: '  per day ' })).toMatchObject({ prefix: ' ≈ ', suffix: '  per day ' });

		// Nothing, blank text and anything which is no text is none.
		for (const junk of [undefined, null, '', ' ', '   ', 5, 0, true, false, {}, ['$'], { text: '$' }]) {
			expect(readOptions({ prefix: junk, suffix: junk }), String(junk)).toMatchObject({ prefix: '', suffix: '' });
		}

		// Text only: what looks like markup is the text it is.
		expect(text(5, { indicatorFormat: 'value', suffix: '<b>x</b>' })).toBe('5<b>x</b>');
	});

	test('without options the text is what it was', () => {
		expect(valueText(7, { min: 0, max: 12, indicatorFormat: 'fraction' }, EN)).toBe('7 / 12');
		expect(valueText(7, { min: 0, max: 12, indicatorFormat: 'value' }, EN)).toBe('7');
		expect(valueText(7, { min: 0, max: 12, indicatorFormat: 'value', prefix: '', suffix: '' }, EN)).toBe('7');
	});

	test('the display takes them from the interface where its own are not set, each on its own', () => {
		const inherited = { prefix: '$', suffix: ' GB' };

		expect(readOptions({}, inherited)).toMatchObject({ prefix: '$', suffix: ' GB' });
		expect(readOptions({ prefix: '€' }, inherited)).toMatchObject({ prefix: '€', suffix: ' GB' });
		expect(readOptions({ suffix: ' MB' }, inherited)).toMatchObject({ prefix: '$', suffix: ' MB' });

		// Emptied, blank and broken ones are taken over again, as the caption is.
		for (const unset of [null, undefined, '', '  ', 5]) {
			expect(readOptions({ prefix: unset, suffix: unset }, inherited), String(unset)).toMatchObject({ prefix: '$', suffix: ' GB' });
		}

		expect(readOptions({ prefix: '€' }, {})).toMatchObject({ prefix: '€', suffix: '' });
	});

	test('they are part of the text wherever it goes: what is drawn, the tooltip and the plain text', () => {
		const options = readOptions({ max: 100, indicatorFormat: 'value', prefix: '$', suffix: ' GB', label: 'Storage' });

		expect(readingOf(42, options, EN).text).toBe('$42 GB');
		expect(readingOf('42', options, EN).text).toBe('$42 GB');
		expect(tooltipOf(readingOf(42, options, EN).text, options.label)).toBe('Storage: $42 GB');

		expect(textHandler(42, { indicatorFormat: 'value', suffix: ' GB' }, {}, EN)).toBe('42 GB');
		expect(textHandler(4200, { indicatorFormat: 'fraction' }, { interfaceOptions: { max: 10000, prefix: '$' } }, EN)).toBe('$4,200 / $10,000');
		expect(textHandler(42, {}, { interfaceOptions: { indicatorFormat: 'value', prefix: '$', suffix: ' GB' } }, EN)).toBe('$42 GB');
		expect(textHandler(42, { suffix: ' MB' }, { interfaceOptions: { indicatorFormat: 'value', prefix: '$', suffix: ' GB' } }, EN)).toBe('$42 MB');
		expect(textHandler(42, { indicatorFormat: 'percent' }, { interfaceOptions: { indicatorFormat: 'value', prefix: '$', suffix: ' GB' } }, EN)).toBe('42%');
	});

	test('no value and a value which is no number have neither', () => {
		const options = readOptions({ indicatorFormat: 'value', prefix: '$', suffix: ' GB' });

		expect(readingOf(null, options, EN).text).toBe(NO_VALUE);
		expect(readingOf('abc', options, EN).text).toBe(NO_VALUE);
		expect(readingOf('', options, EN).text).toBe(NO_VALUE);

		expect(textHandler(null, { indicatorFormat: 'value', prefix: '$', suffix: ' GB' }, {}, EN)).toBeNull();
		expect(textHandler('abc', { indicatorFormat: 'value', prefix: '$', suffix: ' GB' }, {}, EN)).toBe('abc');
		expect(textHandler({ a: 1 }, {}, { interfaceOptions: { indicatorFormat: 'value', prefix: '$' } }, EN)).toBe('{"a":1}');
	});

	test('they change nothing about what is drawn or how a meter is edited', () => {
		const own = { prefix: '$', suffix: ' GB' };

		expect(readLook(own)).toEqual(readLook());
		expect(readEditing(own, 'float')).toEqual(readEditing({}, 'float'));
		expect({ ...readOptions(own), prefix: '', suffix: '' }).toEqual(readOptions());
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

const PLAIN_LOOK = { visualization: 'contiguous', subdivisions: null, dotsLayout: 'packed', activeColoring: 'value', inactiveColoring: 'plain', grow: 0, fade: false };
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

	test('the colouring of what is filled is one of four words, of what is not one of six', () => {
		for (const coloring of ['value', 'blend', 'steps', 'gradient']) {
			expect(readLook({ activeColoring: coloring }).activeColoring).toBe(coloring);
			expect(readLook({ inactiveColoring: coloring }).inactiveColoring).toBe(coloring);
		}

		expect(readLook({ inactiveColoring: 'plain' }).inactiveColoring).toBe('plain');
		expect(readLook({ inactiveColoring: 'automatic' }).inactiveColoring).toBe('automatic');

		for (const coloring of [null, undefined, '', 'Steps', 'plain', 'automatic', 'blended', 'mix', 1, true, ['steps']]) {
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
		// `grow` is the one key which is not taken over: the pieces of a display never grow.
		const inherited = { visualization: 'bars', subdivisions: 40, dotsLayout: 'spread', activeColoring: 'gradient', inactiveColoring: 'automatic', grow: 2, fade: true };
		const taken = { visualization: 'bars', subdivisions: 40, dotsLayout: 'spread', activeColoring: 'gradient', inactiveColoring: 'automatic', grow: 0, fade: true };
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
			form: { pills: { piece: 20, gap: 4 }, segments: { piece: 14, gap: 3 }, bars: { piece: 4, gap: 2 }, dots: { piece: 12, gap: 4 } },
			display: { pills: { piece: 8, gap: 2 }, segments: { piece: 6, gap: 2 }, bars: { piece: 2, gap: 1 }, dots: { piece: 6, gap: 2 } },
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

		expect(fitCount('bars', 'form', 342)).toBe(57);
		expect(fitCount('bars', 'form', 10)).toBe(2);
		expect(fitCount('bars', 'form', 9)).toBe(1);

		// 21 dots are 21 * 12 + 20 * 4 = 332px, and ten are 156px.
		expect(fitCount('dots', 'form', 342)).toBe(21);
		expect(fitCount('dots', 'form', 156)).toBe(10);
		expect(fitCount('dots', 'form', 155)).toBe(9);
		expect(fitCount('dots', 'form', 713)).toBe(44);
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
		expect(fitCount('bars', 'form', 1198)).toBe(200);
		expect(fitCount('bars', 'form', 1197)).toBe(199);
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

	test('bars do not divide: what is wanted where it fits, and as many as fit where it does not', () => {
		expect(drawnCount(100, 143, false)).toBe(100);
		expect(drawnCount(50, 68, false)).toBe(50);
		expect(drawnCount(100, 68, false)).toBe(68);
		expect(drawnCount(100, 24, false)).toBe(24);
		expect(drawnCount(12, 7, false)).toBe(7);
		expect(drawnCount(null, 68, false)).toBe(68);
		expect(drawnCount(100, 1, false)).toBe(0);
		expect(drawnCount(1000, 500, false)).toBe(200);

		// The other shapes still do.
		expect(drawnCount(100, 68)).toBe(50);
		expect(drawnCount(100, 68, true)).toBe(50);
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

		// A range of a hundred in half of the form: a number which divides 100, and for bars and packed dots as
		// many as fit. Spread dots are as many as packed ones.
		expect(count({ visualization: 'pills' }, 'form', 342)).toBe(10);
		expect(count({ visualization: 'segments' }, 'form', 342)).toBe(20);
		expect(count({ visualization: 'bars' }, 'form', 342)).toBe(57);
		expect(count({ visualization: 'dots' }, 'form', 342)).toBe(21);
		expect(count({ visualization: 'dots', dotsLayout: 'spread' }, 'form', 342)).toBe(21);

		// The same field in a wider form has more.
		expect(count({ visualization: 'pills' }, 'form', 717)).toBe(25);
		expect(count({ visualization: 'bars' }, 'form', 717)).toBe(100);
		expect(count({ visualization: 'dots' }, 'form', 713)).toBe(44);
		expect(count({ visualization: 'dots', dotsLayout: 'spread' }, 'form', 713)).toBe(44);

		// And in the display nine dots, packed or spread, where it has five pills.
		expect(count({ visualization: 'dots' }, 'display', DISPLAY_WIDTH)).toBe(9);
		expect(count({ visualization: 'dots', dotsLayout: 'spread' }, 'display', DISPLAY_WIDTH)).toBe(9);
		expect(count({ visualization: 'pills' }, 'display', DISPLAY_WIDTH)).toBe(5);

		// One for every unit, and a number which is set.
		expect(count({ visualization: 'pills', max: 5 }, 'form', 342)).toBe(5);
		expect(count({ visualization: 'dots', subdivisions: 12 }, 'form', 342)).toBe(12);
		expect(count({ visualization: 'dots', subdivisions: 12 }, 'form', 120)).toBe(7);
		expect(count({ visualization: 'dots', subdivisions: 12, dotsLayout: 'spread' }, 'form', 120)).toBe(7);
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
		expect(count({ visualization: 'bars' }, 'display', DISPLAY_WIDTH)).toBe(24);
		expect(count({ visualization: 'dots' }, 'display', DISPLAY_WIDTH)).toBe(9);
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

		// Bars do not share the width: each is a whole number of pixels, and the row ends where the last one does.
		const bars = pieceGeometry('bars', 'display', 24, 72);
		expect(bars).toHaveLength(24);
		expect(bars[0]).toEqual({ start: 0, end: 2 });
		expect(bars[1]).toEqual({ start: 3, end: 5 });
		expect(bars[23]).toEqual({ start: 69, end: 71 });
	});

	test('packed dots keep their size and their gap, from the start', () => {
		expect(pieceGeometry('dots', 'form', 3, 342)).toEqual([
			{ start: 0, end: 12 },
			{ start: 16, end: 28 },
			{ start: 32, end: 44 },
		]);

		expect(pieceGeometry('dots', 'form', 3, 342, 'packed')).toEqual(pieceGeometry('dots', 'form', 3, 342));
		expect(pieceGeometry('dots', 'display', 9, 72).at(-1)).toEqual({ start: 64, end: 70 });
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
				{ filled: false, at: 0, paint: { color: null, scale: null }, size: null, over: null },
				{ filled: false, at: 0.5, paint: { color: null, scale: null }, size: null, over: null },
				{ filled: false, at: 1, paint: { color: null, scale: null }, size: null, over: null },
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

	test('nothing set on a type which holds fractions: a step which suits the range', () => {
		expect(readEditing({ max: 1 }, 'float').step).toBe(0.01);
		expect(readEditing({ min: 0, max: 5 }, 'decimal').step).toBe(0.01);
		expect(readEditing({ max: 10 }, 'float').step).toBe(0.1);
		expect(readEditing({ minValue: 0, maxValue: 1 }, 'float').step).toBe(0.01);
		expect(readEditing({}, 'float').step).toBe(1);

		// The range which is handed over counts, where one is: the display's limits are not the interface's.
		expect(readEditing({ max: 1 }, 'float', range(0, 100)).step).toBe(1);
		expect(readEditing({}, 'float', range(0, 1)).step).toBe(0.01);

		// A whole type has 1, whatever the range.
		expect(readEditing({ max: 1 }, 'integer').step).toBe(1);
		expect(readEditing({ max: 5 }, 'bigInteger').step).toBe(1);

		// A step which is set, its own or a Slider's, is that step, and one which is no step is 1 as before.
		expect(readEditing({ max: 1, step: 0.25 }, 'float').step).toBe(0.25);
		expect(readEditing({ max: 1, stepInterval: 0.5 }, 'float').step).toBe(0.5);
		expect(readEditing({ max: 1, step: 'abc' }, 'float').step).toBe(1);
		expect(readEditing({ max: 1, step: 0 }, 'float').step).toBe(1);
		expect(readEditing({ max: 1, step: null }, 'float').step).toBe(0.01);
		expect(readEditing({ max: 1, step: '' }, 'float').step).toBe(0.01);
	});

	test('the method is one of five words, and anything else is automatic', () => {
		for (const input of ['automatic', 'position', 'piece', 'relative', 'none']) expect(readEditing({ input }).input).toBe(input);

		for (const input of [null, undefined, '', 'Relative', 'None', 'pieces', 'drag', 1, true, false, ['relative']]) {
			expect(readEditing({ input }).input, String(input)).toBe('automatic');
		}
	});

	test('the two words of builds which were never published are junk like any other', () => {
		expect(readEditing({ input: 'contiguous' }).input).toBe('automatic');
		expect(readEditing({ input: 'segment' }).input).toBe('automatic');

		// So five pills for five steps are filled by the piece, whatever such a field stored.
		expect(inputMethod(readEditing({ input: 'contiguous' }, 'integer', range(0, 5)), 5, range(0, 5))).toBe('piece');
		expect(inputMethod(readEditing({ input: 'segment' }, 'integer'), 10, range(0, 100))).toBe('position');
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

describe('the step of a field which sets none', () => {
	const float = (min: number, max: number) => defaultStep(range(min, max), false);

	test('a whole type: 1, whatever the range', () => {
		for (const [min, max] of [[0, 1], [0, 5], [0, 100], [0, 1e9], [0.5, 5.5], [0, 0], [-1, 1], [0, 1e-9]] as const) {
			expect(defaultStep(range(min, max), true), `${min} to ${max}`).toBe(1);
		}
	});

	test('any other type: the largest power of ten which gives at least a hundred steps, and never more than 1', () => {
		expect(STEPS_WANTED).toBe(100);

		for (const [span, step] of [
			[1, 0.01],
			[2, 0.01],
			[5, 0.01],
			[9.99, 0.01],
			[10, 0.1],
			[12.5, 0.1],
			[50, 0.1],
			[99.9, 0.1],
			[100, 1],
			[101, 1],
			[1000, 1],
			[1e9, 1],
			[1e300, 1],
			[0.5, 0.001],
			[0.1, 0.001],
			[0.099, 0.0001],
			[0.01, 0.0001],
			[2.5, 0.01],
			[1e-9, 1e-11],
			[3e-9, 1e-11],
		] as const) {
			expect(float(0, span), `a range of ${span}`).toBe(step);

			// It is the range which counts, not where it lies.
			expect(float(-span, 0), `a range of ${span} below zero`).toBe(step);
			expect(float(-span / 2, span / 2), `a range of ${span} around zero`).toBe(step);
		}

		expect(float(1, 2)).toBe(0.01);
		expect(float(100, 105)).toBe(0.01);
		expect(float(-50, 50)).toBe(1);
		expect(float(0.5, 5.5)).toBe(0.01);
	});

	test('it gives at least a hundred steps and the next power of ten would give fewer, for every range down to the least step', () => {
		for (let exponent = -12; exponent <= 6; exponent++) {
			for (const digit of [1, 1.5, 2, 3, 4.2, 5, 7, 9, 9.999]) {
				const span = digit * 10 ** exponent;
				const step = float(0, span);

				expect(step, String(span)).toBeLessThanOrEqual(1);
				if (step < 1) expect(span / step, String(span)).toBeGreaterThanOrEqual(100 * (1 - 1e-9));
				if (step < 1) expect(span / (step * 10), String(span)).toBeLessThan(100);
				if (step === 1) expect(span, String(span)).toBeGreaterThanOrEqual(100 * (1 - 1e-9));
			}
		}
	});

	test('limits which are a hair less than a power of ten apart still have their hundred steps', () => {
		// 0.7 - 0.6 is 0.09999999999999998.
		expect(0.7 - 0.6).toBeLessThan(0.1);
		expect(float(0.6, 0.7)).toBe(0.001);
		expect(float(0.1, 0.2)).toBe(0.001);
		expect(float(1.1, 2.1)).toBe(0.01);
	});

	test('the step is the very number its decimal stands for, not one worked out', () => {
		for (let exponent = -15; exponent <= 0; exponent++) {
			const step = float(0, Number(`1e${exponent + 2}`));

			expect(step, `1e${exponent}`).toBe(Number(`1e${exponent}`));
			expect(String(step), `1e${exponent}`).toBe(String(Number(`1e${exponent}`)));
		}

		expect(String(float(0, 1))).toBe('0.01');
		expect(String(float(0, 10))).toBe('0.1');
		expect(String(float(0, 0.01))).toBe('0.0001');

		// Arithmetic need not give that number.
		expect(0.1 * 0.1).not.toBe(0.01);
	});

	test('a range of one number, and limits which are not finite or too far apart: 1', () => {
		expect(float(5, 5)).toBe(1);
		expect(float(0, 0)).toBe(1);
		expect(float(5, 4)).toBe(1);
		expect(float(0, Number.POSITIVE_INFINITY)).toBe(1);
		expect(float(Number.NEGATIVE_INFINITY, 0)).toBe(1);
		expect(float(Number.NaN, 1)).toBe(1);
		expect(float(0, Number.NaN)).toBe(1);
		expect(float(-1e308, 1e308)).toBe(1);
	});

	test('the least step: fifteen decimals, for a range too small for a hundred of them', () => {
		expect(LEAST_STEP).toBe(1e-15);
		expect(float(0, 1e-13)).toBe(1e-15);
		expect(float(0, 1e-14)).toBe(1e-15);
		expect(float(0, 1e-15)).toBe(1e-15);
		expect(float(0, 1e-20)).toBe(1e-15);
		expect(float(0, 1e-300)).toBe(1e-15);
		expect(float(0, Number.MIN_VALUE)).toBe(1e-15);

		// A range smaller than that step has its two ends, as with any step larger than its range.
		expect(snapValue(4e-21, range(0, 1e-20), { step: float(0, 1e-20), whole: false })).toBe(0);
		expect(snapValue(6e-21, range(0, 1e-20), { step: float(0, 1e-20), whole: false })).toBe(1e-20);
	});

	test('what is written on such a grid is the decimal it looks like, at every point, down to a range of 1e-13', () => {
		// Every point of the grid of a range, written through `snapValue` as a press writes it, is the number its
		// decimal text stands for: 0.37 and not 0.37000000000000005.
		for (const [min, max] of [[0, 1], [0, 5], [0, 10], [0, 50], [-1, 1], [0.5, 5.5], [100, 101], [0, 0.1], [0, 1e-9], [0, 1e-13], [2, 2.5]] as const) {
			const limits = range(min, max);
			const editing = readEditing({}, 'float', limits);
			const decimals = Math.round(-Math.log10(editing.step));
			const points = Math.round((max - min) / editing.step);

			expect(points, `${min} to ${max}`).toBeGreaterThanOrEqual(100);
			expect(points, `${min} to ${max}`).toBeLessThan(1000);

			for (let index = 0; index <= points; index++) {
				// Asked for a little off the point, as a pointer is.
				const written = snapValue(min + (index + 0.3) * editing.step, limits, editing)!;
				const text = written.toFixed(decimals);

				expect(Number(text), `${min} to ${max}, point ${index}`).toBe(written);
				expect(Math.abs(written - (min + index * editing.step)), `${min} to ${max}, point ${index}`).toBeLessThan(editing.step / 2);

				// As JSON, which is how it is sent, it has no more digits than the step has decimals.
				if (decimals <= 6) expect((JSON.stringify(written).split('.')[1] ?? '').length, `${min} to ${max}, point ${index}: ${written}`).toBeLessThanOrEqual(decimals);
			}
		}

		const hundredths = readEditing({ max: 1 }, 'float');
		expect(snapValue(0.37000000000000005, range(0, 1), hundredths)).toBe(0.37);
		expect(JSON.stringify(snapValue(0.3699, range(0, 1), hundredths))).toBe('0.37');
		expect(JSON.stringify(snapValue(0.1 + 0.2, range(0, 1), hundredths))).toBe('0.3');

		// The keys count on the same grid.
		expect(keyValue('ArrowRight', 0.36, range(0, 1), hundredths)).toBe(0.37);
		expect(keyValue('ArrowRight', 0.29, range(0, 1), hundredths)).toBe(0.3);
		expect(keyValue('PageUp', 0.27, range(0, 1), hundredths)).toBe(0.37);
		expect(keyValue('ArrowLeft', 0.38, range(0, 1), hundredths)).toBe(0.37);

		// A range of 1e-9: hundredths of it, written as they are.
		const tiny = readEditing({}, 'float', range(0, 1e-9));
		expect(tiny.step).toBe(1e-11);
		expect(snapValue(3.7e-10, range(0, 1e-9), tiny)).toBe(3.7e-10);
		expect(snapValue(3.70000004e-10, range(0, 1e-9), tiny)).toBe(3.7e-10);
		expect(String(snapValue(3.70000004e-10, range(0, 1e-9), tiny))).toBe('3.7e-10');
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

	test('by position: the value under the pointer, on the grid', () => {
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
		// Five dots of 12px, 4px apart: the row is 76px of a track of 342px.
		const dots = pieceGeometry('dots', 'form', 5, 342);

		expect(filledAt(5, dots)).toBe(1);
		expect(filledAt(15, dots)).toBe(1);
		expect(filledAt(16, dots)).toBe(2);
		expect(filledAt(34, dots)).toBe(3);
		expect(filledAt(50, dots)).toBe(4);
		expect(filledAt(66, dots)).toBe(5);
		expect(filledAt(76, dots)).toBe(5);
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
	// On a whole type unless said: a type which holds fractions has a finer step where none is set.
	const method = (own: object, count: number, limits = range(0, 100), type = 'integer') => inputMethod(readEditing(own, type, limits), count, limits);

	test('automatic, on one bar: the value under the pointer', () => {
		expect(method({}, 0)).toBe('position');
		expect(method({}, 1)).toBe('position');
		expect(method({ input: 'automatic' }, 0, range(0, 5))).toBe('position');
	});

	test('automatic, in pieces: by the piece where each piece is exactly one step', () => {
		expect(method({}, 5, range(0, 5))).toBe('piece');
		expect(method({}, 10, range(0, 10))).toBe('piece');
		expect(method({ step: 10 }, 10, range(0, 100))).toBe('piece');
		expect(method({ step: 25 }, 4, range(0, 100))).toBe('piece');
		expect(method({ step: 0.1 }, 10, range(0, 1), 'float')).toBe('piece');
		expect(method({ step: 0.1 }, 3, range(0, 0.3), 'decimal')).toBe('piece');
		expect(method({ stepInterval: 20 }, 5, range(0, 100))).toBe('piece');
		expect(method({}, 6, range(-3, 3))).toBe('piece');
	});

	test('automatic, in pieces which are more or less than a step: the value under the pointer', () => {
		expect(method({}, 10, range(0, 100))).toBe('position');
		expect(method({}, 25, range(0, 100))).toBe('position');
		expect(method({ step: 5 }, 10, range(0, 100))).toBe('position');
		expect(method({ step: 2 }, 5, range(0, 5))).toBe('position');
		expect(method({}, 14, range(0, 2.5))).toBe('position');
		expect(method({ step: 0.5 }, 5, range(0, 5), 'float')).toBe('position');
		// A whole type has a whole step, whatever is set.
		expect(method({ step: 0.5 }, 5, range(0, 5), 'integer')).toBe('piece');
	});

	test('automatic, on a type which holds fractions and sets no step: a piece is no longer one step', () => {
		// Five pieces for 0 to 5 in hundredths: the value under the pointer.
		for (const type of ['float', 'decimal']) {
			expect(method({}, 5, range(0, 5), type), type).toBe('position');
			expect(method({}, 10, range(0, 10), type), type).toBe('position');
		}

		// A hundred pieces for 0 to 1 are a hundredth each, which is the step.
		expect(method({}, 100, range(0, 1), 'float')).toBe('piece');

		// Whole pieces are back with a step of 1, or by saying so.
		expect(method({ step: 1 }, 5, range(0, 5), 'float')).toBe('piece');
		expect(method({ input: 'piece' }, 5, range(0, 5), 'float')).toBe('piece');
		expect(method({}, 5, range(0, 5), 'integer')).toBe('piece');
	});

	test('none is none, whatever is drawn, and such a meter cannot be edited', () => {
		for (const count of [0, 1, 2, 5, 50]) {
			expect(method({ input: 'none' }, count)).toBe('none');
			expect(method({ input: 'none', step: 5 }, count, range(0, 5), 'float')).toBe('none');
		}

		// No other option comes to it.
		for (const input of ['automatic', 'position', 'piece', 'relative', 'None', 'contiguous', 'segment', null, false]) {
			for (const count of [0, 5]) expect(method({ input }, count), String(input)).not.toBe('none');
		}

		expect(canEdit({}, method({ input: 'none' }, 5))).toBe(false);
		expect(canEdit({ disabled: false, nonEditable: false, loading: false }, 'none')).toBe(false);
	});

	test('automatic is never relative', () => {
		for (const count of [0, 2, 5, 10, 50]) {
			for (const step of [1, 2, 5, 10, 0.1]) expect(method({ step }, count)).not.toBe('relative');
		}
	});

	test('a method which is set is used, but one bar has no pieces to fill', () => {
		expect(method({ input: 'relative' }, 0)).toBe('relative');
		expect(method({ input: 'relative' }, 5, range(0, 5))).toBe('relative');
		expect(method({ input: 'position' }, 5, range(0, 5))).toBe('position');
		expect(method({ input: 'piece' }, 10)).toBe('piece');
		expect(method({ input: 'piece' }, 0)).toBe('position');
		expect(method({ input: 'piece' }, 1)).toBe('position');
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

describe('pieces which grow', () => {
	// The growth of each of five pieces, for a value of 0 to 100.
	const five = (value: number) => [0, 1, 2, 3, 4].map((index) => growthOf(value / 100, 5, index));

	test('at a value which is a whole number of pieces nothing is growing', () => {
		// 60 of 100 in five pieces: three filled, two which have not started.
		expect(five(60)).toEqual([1, 1, 1, 0, 0]);
		expect(five(0)).toEqual([0, 0, 0, 0, 0]);
		expect(five(20)).toEqual([1, 0, 0, 0, 0]);
		expect(five(100)).toEqual([1, 1, 1, 1, 1]);

		// As the fraction of 3 of 5 is computed, a hair above three pieces: still nothing.
		expect(growthOf(fractionOf(3, range(0, 5)), 5, 3)).toBe(0);
		expect(growthOf(0.6, 5, 3)).toBe(0);
		expect(growthOf(0.7, 10, 7)).toBe(0);
	});

	test('the next piece grows as the value comes half of it, where it is filled', () => {
		// Half way to where the fourth piece is filled, which is at 70.
		expect(five(65)).toEqual([1, 1, 1, 0.5, 0]);
		expect(five(62)[3]).toBeCloseTo(0.2, 9);
		expect(five(68)[3]).toBeCloseTo(0.8, 9);

		// Just before it, and at it: filled.
		expect(five(69.9)[3]).toBeCloseTo(0.99, 9);
		expect(five(69.9)[3]).toBeLessThan(1);
		expect(five(70)).toEqual([1, 1, 1, 1, 0]);
		expect(filledCount(0.7, 5)).toBe(4);

		// The first piece, from nothing.
		expect(five(5)).toEqual([0.5, 0, 0, 0, 0]);
		expect(five(9)[0]).toBeCloseTo(0.9, 9);
		expect(five(10)).toEqual([1, 0, 0, 0, 0]);
	});

	test('only the next piece ever grows: after it is filled, the one after it has not started', () => {
		// From 70 to 80 the fourth piece is filled already and the fifth has not started; it grows from 80 to 90.
		expect(five(75)).toEqual([1, 1, 1, 1, 0]);
		expect(five(79.9)).toEqual([1, 1, 1, 1, 0]);
		expect(five(85)).toEqual([1, 1, 1, 1, 0.5]);
		expect(five(90)).toEqual([1, 1, 1, 1, 1]);

		for (let value = 0; value <= 100; value += 0.25) {
			const growing = five(value).filter((growth) => growth > 0 && growth < 1);
			if (growing.length > 1) expect.fail(`${value}: ${growing.length} pieces are growing`);
		}
	});

	test('two pieces, values outside the range, and no pieces at all', () => {
		expect([0, 1].map((index) => growthOf(0.125, 2, index))).toEqual([0.5, 0]);
		expect([0, 1].map((index) => growthOf(0.5, 2, index))).toEqual([1, 0]);
		expect([0, 1].map((index) => growthOf(0.625, 2, index))).toEqual([1, 0.5]);

		// The fraction of a value outside the range is 0 or 1: nothing has started, or everything is filled.
		expect([0, 1, 2].map((index) => growthOf(fractionOf(-20, range(0, 100)), 3, index))).toEqual([0, 0, 0]);
		expect([0, 1, 2].map((index) => growthOf(fractionOf(150, range(0, 100)), 3, index))).toEqual([1, 1, 1]);
		expect(growthOf(1.5, 3, 2)).toBe(1);
		expect(growthOf(-1, 3, 0)).toBe(0);
		expect(growthOf(Number.NaN, 3, 0)).toBe(0);

		expect(growthOf(0.5, 0, 0)).toBe(0);
		expect(growthOf(0.5, Number.NaN, 0)).toBe(0);
	});

	test('the size of a piece: small where it has not started, full where it is filled, and in between', () => {
		expect(SMALL_PIECES).toEqual({
			pills: { along: 0.6, across: 0.6 },
			segments: { along: 1, across: 1 / 3 },
			bars: { along: 1, across: 1 / 3 },
			dots: { along: 0.5, across: 0.5 },
		});

		expect(pieceScale('dots', 0)).toEqual({ along: 0.5, across: 0.5 });
		expect(pieceScale('dots', 0.5)).toEqual({ along: 0.75, across: 0.75 });
		expect(pieceScale('dots', 1)).toEqual({ along: 1, across: 1 });
		expect(pieceScale('pills', 0)).toEqual({ along: 0.6, across: 0.6 });
		expect(pieceScale('pills', 0.5)).toEqual({ along: 0.8, across: 0.8 });
		expect(pieceScale('segments', 0)).toEqual({ along: 1, across: 0.3333 });
		expect(pieceScale('segments', 0.5)).toEqual({ along: 1, across: 0.6667 });
		expect(pieceScale('bars', 0)).toEqual({ along: 1, across: 0.3333 });
		expect(pieceScale('bars', 1)).toEqual({ along: 1, across: 1 });

		// Never beyond its two ends, whatever comes in.
		expect(pieceScale('dots', -3)).toEqual({ along: 0.5, across: 0.5 });
		expect(pieceScale('dots', 7)).toEqual({ along: 1, across: 1 });
		expect(pieceScale('dots', Number.NaN)).toEqual({ along: 0.5, across: 0.5 });

		expect(scaleCss({ along: 1, across: 0.3333 })).toBe('scale(1, 0.3333)');
		expect(scaleCss(pieceScale('dots', 0.5))).toBe('scale(0.75, 0.75)');
	});

	test('what is drawn: filled pieces as they are, the others with their size', () => {
		const options = readOptions({ max: 100 });
		const sizes = (value: unknown, look: object, count = 5) => drawingOf(readLook(look), options, readingOf(value, options, EN), count, value).pieces!.map((piece) => piece.size);

		expect(sizes(65, { visualization: 'dots', grow: 1 })).toEqual([null, null, null, { along: 0.75, across: 0.75 }, { along: 0.5, across: 0.5 }]);
		expect(sizes(60, { visualization: 'dots', grow: 1 })).toEqual([null, null, null, { along: 0.5, across: 0.5 }, { along: 0.5, across: 0.5 }]);
		expect(sizes(65, { visualization: 'segments', grow: 1 })).toEqual([null, null, null, { along: 1, across: 0.6667 }, { along: 1, across: 0.3333 }]);
		expect(sizes(100, { visualization: 'bars', grow: 1 })).toEqual([null, null, null, null, null]);
		expect(sizes(0, { visualization: 'pills', grow: 1 })).toEqual(Array.from({ length: 5 }, () => ({ along: 0.6, across: 0.6 })));

		// Without a value nothing changes: no piece has a size.
		expect(sizes(null, { visualization: 'dots', grow: 1 })).toEqual([null, null, null, null, null]);
	});

	test('off, a meter is drawn exactly as before there was such an option', () => {
		const options = readOptions({ max: 100, color: GREEN, thresholds: [{ value: 40, color: AMBER }] });

		for (const shape of SHAPES) {
			for (const coloring of ['value', 'blend', 'steps', 'gradient']) {
				for (const value of [0, 33, 65, 100, null]) {
					const look = { visualization: shape, activeColoring: coloring, inactiveColoring: 'automatic' };
					const reading = readingOf(value, options, EN);
					const plain = drawingOf(readLook(look), options, reading, 5, value);

					// Neither a size nor an overlay on any piece, and the same drawing whether the keys are missing, false or emptied.
					expect(plain.pieces!.every((piece) => piece.size === null && piece.over === null)).toBe(true);
					expect(drawingOf(readLook({ ...look, grow: false, fade: false }), options, reading, 5, value)).toEqual(plain);
					expect(drawingOf(readLook({ ...look, grow: null, fade: null }), options, reading, 5, value)).toEqual(plain);
					expect(drawingOf({ activeColoring: readLook(look).activeColoring, inactiveColoring: readLook(look).inactiveColoring }, options, reading, 5, value)).toEqual(plain);

					// On, the paint of every piece and what is filled are still the same: only the sizes are new.
					const grown = drawingOf(readLook({ ...look, grow: 1 }), options, reading, 5, value);
					expect(grown.pieces!.map(({ filled, at, paint }) => ({ filled, at, paint }))).toEqual(plain.pieces!.map(({ filled, at, paint }) => ({ filled, at, paint })));
					expect({ ...grown, pieces: null }).toEqual({ ...plain, pieces: null });
				}
			}
		}
	});

	test('one bar ignores it, and only the entry\'s own option counts: a display never grows', () => {
		const options = readOptions({ max: 100 });
		const reading = readingOf(65, options, EN);

		expect(drawingOf(readLook({ grow: 1 }), options, reading, 0, 65)).toEqual(drawingOf(readLook({}), options, reading, 0, 65));
		expect(drawingOf(readLook({ visualization: 'contiguous', grow: 1 }), options, reading, 5, 65).pieces!.every((piece) => piece.size === null)).toBe(true);

		expect(readLook({ grow: 2 }).grow).toBe(2);
		expect(readLook({}, { grow: 2 }).grow).toBe(0);
		expect(readLook({ grow: null }, { grow: 2 }).grow).toBe(0);
	});
});

describe('grow as a number: how many pieces can be growing at once', () => {
	test('what the option comes to: a number from 0 to 20, and 0 for anything else', () => {
		expect(MAX_GROW).toBe(20);

		for (const [stored, grow] of [
			[0, 0],
			[0.5, 0.5],
			[1, 1],
			[1.5, 1.5],
			[2, 2],
			[3, 3],
			[20, 20],
			['2', 2],
			['1.5', 1.5],
			// A switch is no number.
			[true, 0],
			[false, 0],
			// Junk, and less than nothing.
			['true', 0],
			['abc', 0],
			['', 0],
			[null, 0],
			[undefined, 0],
			[{}, 0],
			[[], 0],
			[Number.NaN, 0],
			[Number.POSITIVE_INFINITY, 0],
			[-1, 0],
			[-0.5, 0],
			// More than twenty is twenty.
			[25, 20],
			[1e9, 20],
		] as const) {
			expect(growOf(stored), String(stored)).toBe(grow);
			expect(readLook({ grow: stored }).grow, String(stored)).toBe(grow);
		}
	});

	test('the reach in pieces: half of it up to 1, and half a piece less than it above', () => {
		for (const shape of ['pills', 'segments', 'dots'] as const) {
			for (const [grow, reach] of [
				[0, 0],
				[0.5, 0.25],
				[1, 0.5],
				[1.5, 1],
				[2, 1.5],
				[3, 2.5],
				[20, 19.5],
				[25, 19.5],
				[-1, 0],
				[Number.NaN, 0],
			] as const) {
				expect(reachOf(shape, 'form', 5, 342, grow), `${shape} ${grow}`).toBe(reach);
			}

			// Without a number it is that of 1, as for pieces which only fade in.
			expect(reachOf(shape, 'form', 5, 342)).toBe(0.5);
			expect(reachOf(shape, 'display', 5, 72)).toBe(0.5);
		}

		// What is no number reaches nowhere.
		expect(reachOf('dots', 'form', 5, 342, growOf(true))).toBe(0);
		expect(reachOf('dots', 'form', 5, 342, growOf(false))).toBe(0);
		expect(reachOf('dots', 'form', 5, 342, growOf('junk'))).toBe(0);
		expect(reachOf('dots', 'form', 5, 342, growOf(25))).toBe(19.5);
	});

	test('the growth of the next three pieces at a whole number of pieces, for 1, 2 and 3', () => {
		// Ten pieces, the value at exactly four of them: the pieces 5, 6 and 7 are half a piece, one and a half
		// and two and a half from being filled.
		const next = (grow: number, fraction: number) => [4, 5, 6].map((index) => Number(growthOf(fraction, 10, index, reachOf('pills', 'form', 10, 342, grow)).toFixed(4)));

		// 1: nothing is growing.
		expect(next(1, 0.4)).toEqual([0, 0, 0]);

		// 2: the next piece is two thirds grown, and the one after it has not started.
		expect(next(2, 0.4)).toEqual([0.6667, 0, 0]);

		// 3: a ramp of two, the nearer the larger.
		expect(next(3, 0.4)).toEqual([0.8, 0.4, 0]);

		// Below 1 nothing either, and at 0 nothing ever.
		expect(next(0.5, 0.4)).toEqual([0, 0, 0]);
		expect(next(0, 0.4)).toEqual([0, 0, 0]);
	});

	test('and close before a piece is filled', () => {
		// The value a hair short of four and a half pieces: the fifth piece is about to be filled.
		const next = (grow: number, fraction: number) => [4, 5, 6].map((index) => Number(growthOf(fraction, 10, index, reachOf('pills', 'form', 10, 342, grow)).toFixed(3)));

		expect(next(1, 0.4499)).toEqual([0.998, 0, 0]);
		expect(next(2, 0.4499)).toEqual([0.999, 0.333, 0]);
		expect(next(3, 0.4499)).toEqual([1, 0.6, 0.2]);

		// Half way there, at four and a quarter pieces.
		expect(next(1, 0.425)).toEqual([0.5, 0, 0]);
		expect(next(2, 0.425)).toEqual([0.833, 0.167, 0]);
		expect(next(3, 0.425)).toEqual([0.9, 0.5, 0.1]);

		// Below 1 the growth starts later: with a half, only over the last quarter of a piece.
		expect(next(0.5, 0.425)).toEqual([0, 0, 0]);
		expect(next(0.5, 0.4375)).toEqual([0.5, 0, 0]);
		expect(next(0.5, 0.4499)).toEqual([0.996, 0, 0]);

		// At the moment it is filled a piece is full, whatever the number.
		for (const grow of [0.5, 1, 2, 3]) expect(growthOf(0.45, 10, 4, reachOf('pills', 'form', 10, 342, grow)), String(grow)).toBe(1);

		// With 0 a piece which is not filled is never under way.
		expect(growthOf(0.4499, 10, 4, 0)).toBe(0);
		expect(growthOf(0.45, 10, 4, 0)).toBe(1);
	});

	test('thin bars: at least fifteen pixels of the track for each 1, where that is more than the pieces give', () => {
		// Fifty bars in half of the form are drawn 6px apart. 1: two and a half bars, fifteen pixels. 2: twice the ramp.
		expect(reachOf('bars', 'form', 50, 342, 1)).toBe(2.5);
		expect(reachOf('bars', 'form', 50, 342, 2)).toBe(5);
		expect(reachOf('bars', 'form', 50, 342, 3)).toBe(7.5);
		expect(reachOf('bars', 'form', 50, 342, 0.5)).toBe(1.5);
		expect(reachOf('bars', 'form', 50, 342, 0)).toBe(0);
		expect(reachOf('bars', 'form', 50, 342)).toBe(2.5);

		// On a screen of two device pixels to the pixel they are 6.5px apart, and the reach is the same.
		expect(reachOf('bars', 'form', 50, 342, 1, 2)).toBe(2.5);
		expect(reachOf('bars', 'form', 50, 342, 2, 2)).toBe(4.5);

		// At their narrowest they are 6px apart as well: two and a half for each 1.
		expect(reachOf('bars', 'form', 57, 342, 1)).toBe(2.5);
		expect(reachOf('bars', 'form', 57, 342, 2)).toBe(5);

		// The display, where pieces only fade in: its own nine pixels, for 1.
		expect(reachOf('bars', 'display', 24, 72)).toBe(3);
		expect(reachOf('bars', 'display', 20, 72)).toBe(3);
	});

	test('wide bars: the pieces alone, as every other shape', () => {
		// Five bars in half of the form are 69px apart: fifteen pixels are less than half of one.
		for (const [grow, reach] of [
			[0, 0],
			[0.5, 0.25],
			[1, 0.5],
			[2, 1.5],
			[3, 2.5],
		] as const) {
			expect(reachOf('bars', 'form', 5, 342, grow), String(grow)).toBe(reach);
			expect(reachOf('bars', 'form', 5, 342, grow), String(grow)).toBe(reachOf('segments', 'form', 5, 342, grow));
		}
	});

	test('what is drawn for dots with 3, with 1 and with what is no number', () => {
		const options = readOptions({ max: 8 });
		const sizes = (grow: unknown, value: number) => {
			const look = readLook({ visualization: 'dots', grow });
			return drawingOf(look, options, readingOf(value, options, EN), 8, value, { reach: reachOf('dots', 'form', 8, 342, look.grow) }).pieces!.map((piece) => piece.size?.along ?? 1);
		};

		// At exactly 3 of 8: with 3 the next two dots are larger than the ones after them, the nearer the larger.
		expect(sizes(3, 3)).toEqual([1, 1, 1, 0.9, 0.7, 0.5, 0.5, 0.5]);

		// With 1 every dot which is not filled is small, and the next one grows over its last half.
		expect(sizes(1, 3)).toEqual([1, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5]);
		expect(sizes(1, 3.3)).toEqual([1, 1, 1, 0.8, 0.5, 0.5, 0.5, 0.5]);
		expect(sizes('1', 3.3)).toEqual(sizes(1, 3.3));

		// With 0, with a switch, on or off, and with junk, no piece has a size at all.
		for (const grow of [0, true, false, 'junk', -2]) {
			const look = readLook({ visualization: 'dots', grow });
			expect(drawingOf(look, options, readingOf(3.3, options, EN), 8, 3.3).pieces!.every((piece) => piece.size === null), String(grow)).toBe(true);
		}
	});

	test('pieces which only fade in have the reach of 1, and with a number that of the number', () => {
		const options = readOptions({ max: 8, color: GREEN });
		const overs = (grow: number, value: number) => {
			const look = readLook({ visualization: 'dots', fade: true, grow });
			const reach = reachOf('dots', 'form', 8, 342, look.grow > 0 ? look.grow : 1);
			return drawingOf(look, options, readingOf(value, options, EN), 8, value, { reach }).pieces!.map((piece) => piece.over?.opacity ?? 0);
		};

		expect(overs(0, 3)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
		expect(overs(0, 3.25)).toEqual([0, 0, 0, 0.5, 0, 0, 0, 0]);
		expect(overs(3, 3)).toEqual([0, 0, 0, 0.8, 0.4, 0, 0, 0]);
	});
});

describe('half a piece is half a piece, whatever the product of two numbers comes to', () => {
	test('a value half way into a piece fills it, also where the product falls a hair short', () => {
		// 0.29 times 50 is 14.499999999999998 as numbers go, and 14.5 as pieces.
		expect(0.29 * 50).toBeLessThan(14.5);
		expect(filledCount(0.29, 50)).toBe(15);
		expect(filledCount(fractionOf(29, range(0, 100)), 50)).toBe(15);

		// Every odd value of a hundred fills its bar of fifty, and every even one the same as the value before it.
		for (let value = 0; value <= 100; value++) expect(filledCount(value / 100, 50), String(value)).toBe(Math.ceil(value / 2));

		// A hair short of half way is still not filled.
		expect(filledCount(0.2899999, 50)).toBe(14);
		expect(filledCount(0.44, 10)).toBe(4);
		expect(filledCount(0.45, 10)).toBe(5);
	});
});

describe('how far ahead of the fill a piece grows', () => {
	test('half a piece for pills, segments and dots, whatever their number and width', () => {
		for (const shape of ['pills', 'segments', 'dots', 'contiguous'] as const) {
			for (const [count, width] of [
				[5, 342],
				[20, 342],
				[100, 713],
				[9, 72],
			] as const) {
				expect(reachOf(shape, 'form', count, width), `${shape} ${count}`).toBe(0.5);
				expect(reachOf(shape, 'display', count, width), `${shape} ${count}`).toBe(0.5);
			}
		}
	});

	test('thin bars: about fifteen pixels of the track, counted in half pieces', () => {
		expect(BAR_REACH).toEqual({ form: 15, display: 9 });

		// Bars at their narrowest, 6px from one to the next: two and a half of them.
		expect(reachOf('bars', 'form', 57, 342)).toBe(2.5);

		// Fifty bars in half of the form are drawn 6px apart: two and a half. A hundred across it, 7px apart: two.
		expect(reachOf('bars', 'form', 50, 342)).toBe(2.5);
		expect(reachOf('bars', 'form', 100, 713)).toBe(2);

		// Twenty-five in half of the form, 13.8px apart: one.
		expect(reachOf('bars', 'form', 25, 342)).toBe(1);

		// The display is smaller, and so is its reach: about three of its narrowest bars.
		expect(reachOf('bars', 'display', 24, 72)).toBe(3);
		expect(reachOf('bars', 'display', 20, 72)).toBe(3);
	});

	test('wide bars: half a piece, as the other shapes', () => {
		expect(reachOf('bars', 'form', 10, 342)).toBe(0.5);
		expect(reachOf('bars', 'form', 5, 342)).toBe(0.5);
		expect(reachOf('bars', 'form', 2, 713)).toBe(0.5);
		expect(reachOf('bars', 'display', 5, 72)).toBe(0.5);
	});

	test('never less than half a piece, and never anything but a number', () => {
		for (const [count, width] of [
			[0, 342],
			[-3, 342],
			[Number.NaN, 342],
			[50, 0],
			[50, -10],
			[50, Number.NaN],
			[50, Number.POSITIVE_INFINITY],
			[1, 1e9],
		] as const) {
			const reach = reachOf('bars', 'form', count, width);
			expect(Number.isFinite(reach), `${count} in ${width}`).toBe(true);
			expect(reach, `${count} in ${width}`).toBeGreaterThanOrEqual(0.5);
		}
	});

	test('with the reach of half a piece the growth is what it was', () => {
		for (let value = 0; value <= 100; value += 0.5) {
			for (let index = 0; index < 5; index++) expect(growthOf(value / 100, 5, index, 0.5), `${value} ${index}`).toBe(growthOf(value / 100, 5, index));
		}

		// Without a reach it is half a piece; with a shorter one the growth starts later, and with none never.
		expect(growthOf(0.65, 5, 3, undefined)).toBe(0.5);
		expect(growthOf(0.65, 5, 3, 0.1)).toBe(0);
		expect(growthOf(0.69, 5, 3, 0.1)).toBeCloseTo(0.5, 9);
		expect(growthOf(0.65, 5, 3, 0)).toBe(0);
		expect(growthOf(0.65, 5, 3, Number.NaN)).toBe(0);
		expect(growthOf(0.65, 5, 3, -1)).toBe(0);
	});

	test('with a longer reach the bars in front of the fill are a ramp, each further along the nearer it is', () => {
		// Fifty bars for 0 to 100, a reach of two bars. At 40, twenty are filled: the next is three quarters of
		// the way, the one after it a quarter, and the rest have not started.
		const fifty = (value: number) => Array.from({ length: 50 }, (_, index) => growthOf(value / 100, 50, index, 2));

		expect(fifty(40).slice(18, 24)).toEqual([1, 1, 0.75, 0.25, 0, 0]);

		// At 41 the twenty-first is filled, and the next is half way.
		expect(fifty(41).slice(18, 24)).toEqual([1, 1, 1, 0.5, 0, 0]);
		expect(fifty(42).slice(18, 24)).toEqual([1, 1, 1, 0.75, 0.25, 0]);

		// At the minimum nothing is under way: an empty meter is empty. The ramp comes out of the start: at 1 a
		// bar is filled and the next has not started, at 2 it is two thirds of the way, and from 3 on the ramp
		// has its whole reach.
		expect(fifty(0).every((growth) => growth === 0)).toBe(true);
		expect(fifty(1).slice(0, 4)).toEqual([1, 0, 0, 0]);
		expect(fifty(2).slice(0, 4).map((growth) => Number(growth.toFixed(4)))).toEqual([1, 0.6667, 0, 0]);
		expect(fifty(3).slice(0, 4)).toEqual([1, 1, 0.5, 0]);

		// From there on the ramp is there at every whole value which leaves a bar to fill (99 fills the last),
		// falls from the fill onward, and moves with the value.
		expect(filledCount(0.99, 50)).toBe(50);

		for (let value = 2; value < 99; value++) {
			const growth = fifty(value);
			const filled = filledCount(value / 100, 50);
			const ahead = growth.slice(filled);

			if (!(ahead[0]! > 0 && ahead[0]! < 1)) expect.fail(`${value}: the next bar is at ${ahead[0]}`);
			for (let index = 1; index < ahead.length; index++) if (ahead[index]! > ahead[index - 1]!) expect.fail(`${value}: bar ${index} is further along than the one before it`);
			if (ahead.length > 2 && ahead[2] !== 0) expect.fail(`${value}: the third bar ahead is at ${ahead[2]}`);
		}

		// A hundred bars, one for each unit, with the same reach: also at every whole value.
		for (let value = 2; value < 100; value++) expect(growthOf(value / 100, 100, value, 2), String(value)).toBe(0.75);
		expect(growthOf(0.01, 100, 1, 2)).toBeCloseTo(2 / 3, 9);

		// With the reach of half a piece none of them would ever be seen growing.
		for (let value = 0; value <= 100; value++) {
			for (const count of [50, 100]) {
				const filled = filledCount(value / 100, count);
				if (filled < count) expect(growthOf(value / 100, count, filled), `${value} of ${count}`).toBe(0);
			}
		}
	});

	test('a piece is at its full size at the moment it is filled, whatever the reach', () => {
		for (const reach of [0.5, 1, 2, 3]) {
			expect(growthOf(0.409999, 50, 20, reach), String(reach)).toBeGreaterThan(0.99);
			expect(growthOf(0.409999, 50, 20, reach), String(reach)).toBeLessThan(1);
			expect(growthOf(0.41, 50, 20, reach), String(reach)).toBe(1);
		}
	});

	test('the drawing takes the reach: sizes and what fades in, for bars in the form and in the display', () => {
		const options = readOptions({ max: 100, color: GREEN });
		const pieces = (look: object, count: number, reach: number | undefined) => drawingOf(readLook({ visualization: 'bars', ...look }), options, readingOf(40, options, EN), count, 40, { reach }).pieces!;

		// Fifty bars which grow, at 40, with a reach of two and a half: the heights of the two bars in front of the
		// fill, between a third and all.
		const grown = pieces({ grow: 1 }, 50, reachOf('bars', 'form', 50, 342));
		expect(grown.slice(19, 23).map((piece) => piece.size)).toEqual([null, { along: 1, across: 0.8667 }, { along: 1, across: 0.6 }, { along: 1, across: 0.3333 }]);

		// Without a reach, as before: nothing in front of the fill has started.
		expect(pieces({ grow: 1 }, 50, undefined).slice(19, 22).map((piece) => piece.size)).toEqual([null, { along: 1, across: 0.3333 }, { along: 1, across: 0.3333 }]);

		// Twenty bars of a display which fade in, at 40, with a reach of three: eight filled, and over the next three
		// the green, less and less.
		const faded = pieces({ fade: true }, 20, reachOf('bars', 'display', 20, 72));
		expect(faded.slice(7, 12).map((piece) => piece.over?.opacity ?? null)).toEqual([null, 0.8333, 0.5, 0.1667, null]);
		expect(faded[8]!.over!.paint).toEqual({ color: GREEN, scale: null });
	});
});

describe('growing and fading by where the pointer is', () => {
	// Five segments for a hundred, which grow and fade in. The value is 40: two filled.
	const options = readOptions({ max: 100, color: GREEN });
	const look = readLook({ visualization: 'segments', grow: 1, fade: true });
	const reading = readingOf(40, options, EN);
	const draw = (at?: number | null) => drawingOf(look, options, reading, 5, 40, { at });

	test('without a place of the pointer, by the value', () => {
		expect(draw()).toEqual(drawingOf(look, options, reading, 5, 40));
		expect(draw(null)).toEqual(draw());
		expect(draw(Number.NaN)).toEqual(draw());
		expect(draw().pieces!.map((piece) => piece.size)).toEqual([null, null, { along: 1, across: 0.3333 }, { along: 1, across: 0.3333 }, { along: 1, across: 0.3333 }]);
	});

	test('with one, the pieces which are not filled are as far along as the pointer is, while the value fills what it fills', () => {
		// The pointer at 42, 44 and 48 of a hundred: the value is still 40, and the third segment on its way.
		for (const [at, growth] of [
			[0.42, 0.2],
			[0.44, 0.4],
			[0.48, 0.8],
		] as const) {
			const drawing = draw(at);

			expect(drawing.pieces!.map((piece) => piece.filled), String(at)).toEqual([true, true, false, false, false]);
			expect(drawing.pieces![2]!.size, String(at)).toEqual(pieceScale('segments', growth));
			expect(drawing.pieces![2]!.over, String(at)).toEqual({ paint: { color: GREEN, scale: null }, opacity: growth });
			expect(drawing.pieces![3]!.size, String(at)).toEqual({ along: 1, across: 0.3333 });
			expect(drawing.pieces![3]!.over, String(at)).toBeNull();

			// The paint of every piece is that of the value.
			expect(drawing.pieces!.map((piece) => piece.paint), String(at)).toEqual(draw().pieces!.map((piece) => piece.paint));
		}
	});

	test('a pointer which is ahead of the value leaves a piece full and not filled; one behind it leaves the filled pieces alone', () => {
		// At 55 the third segment would be filled by the pointer, and is not by the value: full size, all of the look laid over it.
		const ahead = draw(0.55).pieces!;
		expect(ahead.map((piece) => piece.filled)).toEqual([true, true, false, false, false]);
		expect(ahead[2]!.size).toEqual({ along: 1, across: 1 });
		expect(ahead[2]!.over).toEqual({ paint: { color: GREEN, scale: null }, opacity: 1 });
		expect(ahead[3]!.size).toEqual({ along: 1, across: 0.3333 });

		// At 10 the pointer is behind: the two filled segments stay as they are, and nothing is under way.
		const behind = draw(0.1).pieces!;
		expect(behind.map((piece) => piece.filled)).toEqual([true, true, false, false, false]);
		expect(behind.map((piece) => piece.size)).toEqual([null, null, { along: 1, across: 0.3333 }, { along: 1, across: 0.3333 }, { along: 1, across: 0.3333 }]);
		expect(behind.every((piece) => piece.over === null)).toBe(true);
	});

	test('a place outside the track is its nearer end, and a meter which neither grows nor fades takes no notice', () => {
		expect(draw(-3)).toEqual(draw(0));
		expect(draw(7)).toEqual(draw(1));

		const plain = readLook({ visualization: 'segments' });
		expect(drawingOf(plain, options, reading, 5, 40, { at: 0.48 })).toEqual(drawingOf(plain, options, reading, 5, 40));

		// Without a value there is nothing to grow, wherever the pointer is.
		expect(drawingOf(look, options, readingOf(null, options, EN), 5, null, { at: 0.48 }).pieces!.every((piece) => piece.size === null && piece.over === null)).toBe(true);
	});
});

describe('dots are as many as fit, packed or spread', () => {
	const count = (own: object, place: 'form' | 'display', width: number) => pieceCount(readLook({ visualization: 'dots', ...own }), readOptions(own), place, width);

	test('a wanted number which does not fit, and none: as many as fit, and less than one dot and its gap is left', () => {
		let seen = 0;

		for (const place of ['form', 'display'] as const) {
			const { piece, gap } = PIECE_SIZES[place].dots;

			for (let width = piece * 2 + gap; width <= 1200; width += place === 'form' ? 3.5 : 0.5) {
				if (place === 'display' && width > 120) break;

				for (const own of [{}, { max: 1000 }, { subdivisions: 150 }, { max: 2.5 }, { max: 97 }]) {
					const most = fitCount('dots', place, width);
					if (most >= 97) continue;

					const dots = count(own, place, width);
					const row = pieceGeometry('dots', place, dots, width);
					const left = width - row.at(-1)!.end;
					seen++;

					if (dots !== most) expect.fail(`${place}, ${width}px, ${JSON.stringify(own)}: ${dots} dots where ${most} fit`);
					if (left < -1e-6 || left >= piece + gap) expect.fail(`${place}, ${width}px: ${left}px are left behind ${dots} dots`);
					if (row[1]!.start - row[0]!.end !== gap || row[0]!.end - row[0]!.start !== piece) expect.fail(`${place}, ${width}px: a dot or a gap of another size`);
				}
			}
		}

		expect(seen).toBeGreaterThan(1000);
	});

	test('a hundred in half of the form, across it and in the display', () => {
		// 21 dots of 12px, 4px apart, are 332px of 342px: 10px are left, where the twenty which divide a hundred left 26px.
		expect(count({}, 'form', 342)).toBe(21);
		expect(pieceGeometry('dots', 'form', 21, 342).at(-1)).toEqual({ start: 320, end: 332 });
		expect(count({}, 'form', 713)).toBe(44);
		expect(pieceGeometry('dots', 'form', 44, 713).at(-1)).toEqual({ start: 688, end: 700 });
		expect(count({}, 'display', DISPLAY_WIDTH)).toBe(9);
		expect(pieceGeometry('dots', 'display', 9, DISPLAY_WIDTH).at(-1)).toEqual({ start: 64, end: 70 });
	});

	test('a wanted number which fits is drawn as it is, a short row from the start', () => {
		expect(count({ max: 5 }, 'form', 342)).toBe(5);
		expect(count({ subdivisions: 12 }, 'form', 342)).toBe(12);
		expect(count({ subdivisions: 21 }, 'form', 342)).toBe(21);
		expect(count({ max: 8 }, 'display', DISPLAY_WIDTH)).toBe(8);
		expect(pieceGeometry('dots', 'form', 5, 342).at(-1)).toEqual({ start: 64, end: 76 });
	});

	test('spread dots are the same number as packed ones: as many as fit, or the wanted number where it fits, and never a number which only divides it', () => {
		const spread = (own: object, place: 'form' | 'display', width: number) => count({ dotsLayout: 'spread', ...own }, place, width);
		let seen = 0;
		let fewer = 0;

		// Over a row of widths and of what is wanted, in the form and in the display: the same count in both
		// layouts, which is what fits where the wanted number does not, and the wanted number where it does.
		for (const place of ['form', 'display'] as const) {
			for (let width = 20; width <= 1200; width += place === 'form' ? 3.5 : 0.5) {
				if (place === 'display' && width > 120) break;

				const most = fitCount('dots', place, width);

				for (const own of [{}, { max: 5 }, { max: 12 }, { max: 13 }, { max: 30 }, { max: 97 }, { max: 2.5 }, { subdivisions: 8 }, { subdivisions: 30 }, { subdivisions: 150 }]) {
					const wanted = wantedCount(readLook({ visualization: 'dots', ...own }), readOptions(own));
					const expected = most < 2 ? 0 : wanted === null || wanted > most ? most : wanted;
					seen++;
					if (wanted !== null && wanted > most && most >= 2 && wanted % most !== 0) fewer++;

					if (spread(own, place, width) !== expected) expect.fail(`${place}, ${width}px, ${JSON.stringify(own)}: ${spread(own, place, width)} spread dots, not ${expected}`);
					if (spread(own, place, width) !== count(own, place, width)) expect.fail(`${place}, ${width}px, ${JSON.stringify(own)}: spread and packed differ`);
				}
			}
		}

		expect(seen).toBeGreaterThan(3000);

		// Many of those are cases in which a number which divides what is wanted would have been fewer dots.
		expect(fewer).toBeGreaterThan(500);

		// A hundred: 21 in half of the form, 44 across it and nine in the display, where the numbers which
		// divide a hundred were 20, 25 and 5.
		expect(spread({}, 'form', 342)).toBe(21);
		expect(spread({}, 'form', 713)).toBe(44);
		expect(spread({}, 'display', DISPLAY_WIDTH)).toBe(9);
		expect(spread({ subdivisions: 30 }, 'form', 342)).toBe(21);
		expect(spread({ max: 13 }, 'form', 150)).toBe(9);

		// A wanted number which fits is drawn exactly, and nothing wanted is as many as fit.
		expect(spread({ max: 5 }, 'form', 342)).toBe(5);
		expect(spread({ subdivisions: 8 }, 'display', DISPLAY_WIDTH)).toBe(8);
		expect(spread({ subdivisions: 21 }, 'form', 342)).toBe(21);
		expect(spread({ max: 2.5 }, 'form', 342)).toBe(21);

		// Where they stand is all that differs: spread, the last of the 21 ends at the end of the track.
		expect(pieceGeometry('dots', 'form', 21, 342, 'spread').at(-1)!.end).toBeCloseTo(342, 9);
		expect(pieceGeometry('dots', 'form', 21, 342, 'packed').at(-1)!.end).toBe(332);

		// A layout which is no layout is packed, and counts the same.
		expect(count({ dotsLayout: 'everywhere' }, 'form', 342)).toBe(21);
		expect(pieceCount({ visualization: 'dots', subdivisions: null }, readOptions({}), 'form', 342)).toBe(21);

		// Pills and segments still take a number which divides.
		expect(pieceCount(readLook({ visualization: 'pills' }), readOptions({}), 'form', 342)).toBe(10);
		expect(pieceCount(readLook({ visualization: 'segments' }), readOptions({}), 'form', 342)).toBe(20);
	});
});

describe('the pieces up to the pointer are drawn larger', () => {
	test('bars and segments half as high again and no wider; dots a pixel on every side; pills a pixel at each end and a third higher', () => {
		expect(largeScale('bars', 4)).toEqual({ along: 1, across: 1.5 });
		expect(largeScale('bars', 66)).toEqual({ along: 1, across: 1.5 });
		expect(largeScale('segments', 14.25)).toEqual({ along: 1, across: 1.5 });

		// A dot of 12px is 14px both ways. A pill of 30px is 32px long and 16px high.
		expect(largeScale('dots', 12)).toEqual({ along: 1.1667, across: 1.1667 });
		expect(largeScale('pills', 30)).toEqual({ along: 1.0667, across: 1.3333 });
		expect(largeScale('pills', 65.2).along * 65.2).toBeCloseTo(67.2, 1);
	});

	test('larger than any size a piece has without the pointer, and two side by side never touch', () => {
		for (const shape of SHAPES) {
			const large = largeScale(shape, PIECE_SIZES.form[shape].piece);
			const full = pieceScale(shape, 1);

			expect(large.across).toBeGreaterThan(full.across);
			expect(large.along).toBeGreaterThanOrEqual(full.along);

			// What a piece is longer by is less than the gap to the next one, by at least a pixel.
			expect(LARGE_ALONG[shape]).toBeLessThanOrEqual(PIECE_SIZES.form[shape].gap - 1);
		}

		expect(LARGE_ACROSS).toEqual({ pills: 4 / 3, segments: 1.5, bars: 1.5, dots: 7 / 6 });
		expect(LARGE_ALONG).toEqual({ pills: 2, segments: 0, bars: 0, dots: 2 });
	});

	test('a piece without a length, and one which is not a number, is not made longer', () => {
		for (const length of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(largeScale('dots', length)).toEqual({ along: 1, across: 1.1667 });
			expect(scaleCss(largeScale('pills', length))).toBe('scale(1, 1.3333)');
		}
	});
});

describe('bars which are all drawn alike', () => {
	// A row of track widths, some of them not whole, on screens of several ratios.
	const WIDTHS = [20, 72, 100, 137.5, 293, 342, 342.4, 512, 615, 713, 784.25, 1100, 2000];
	const RATIOS = [0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 3];
	const whole = (number: number) => Math.abs(number - Math.round(number)) < 1e-6;
	const least = (place: 'form' | 'display', ratio: number) => ({ bar: Math.ceil(PIECE_SIZES[place].bars.piece * ratio - 1e-6), gap: Math.ceil(PIECE_SIZES[place].bars.gap * ratio - 1e-6) });

	test('as many as fit: whole device pixels, all alike, the row fits, and less than one bar and its gap is left', () => {
		let seen = 0;

		for (const place of ['form', 'display'] as const) {
			for (const ratio of RATIOS) {
				for (const width of WIDTHS) {
					const count = fitCount('bars', place, width, ratio);
					if (count < 2) continue;

					const fit = barFit(place, count, width, ratio);
					if (fit === null) expect.fail(`${place}: ${count} bars in ${width}px at ${ratio}: no fit`);
					seen++;

					// In device pixels.
					const [bar, gap, length, room] = [fit.bar * ratio, fit.gap * ratio, fit.length * ratio, width * ratio];
					const small = least(place, ratio);
					const about = `${place}: ${count} bars in ${width}px at ${ratio}: bar ${bar}, gap ${gap}, length ${length} of ${room}`;

					if (!whole(bar) || !whole(gap)) expect.fail(about);
					if (bar < small.bar - 1e-6 || gap < small.gap - 1e-6 || gap > 2 * small.gap + 1e-6) expect.fail(`${about}: not within the sizes`);
					if (Math.abs(length - (count * bar + (count - 1) * gap)) > 1e-6) expect.fail(about);
					if (length > room + 1e-6) expect.fail(`${about}: the row does not fit`);

					// One more bar at the least sizes would not have fitted, unless the cap of the package held it back.
					if (count < 200 && room - length >= small.bar + small.gap + 1) expect.fail(`${about}: a bar and its gap are left`);
					if (count < 200 && (count + 1) * small.bar + count * small.gap <= Math.floor(room + 1e-4)) expect.fail(`${about}: one more would fit`);
				}
			}
		}

		expect(seen).toBeGreaterThan(100);
	});

	test('a number which is asked for and fits: whole device pixels, all alike, the row fits, and less than a device pixel for each bar is left', () => {
		let seen = 0;

		for (const place of ['form', 'display'] as const) {
			for (const ratio of RATIOS) {
				for (const width of WIDTHS) {
					const most = fitCount('bars', place, width, ratio);

					for (const count of [2, 3, 5, 10, 12, 20, 25, 40, 50, 68, 100, most - 1]) {
						if (!(count >= 2) || count > most) continue;

						const fit = barFit(place, count, width, ratio);
						if (fit === null) expect.fail(`${place}: ${count} bars in ${width}px at ${ratio}: no fit`);
						seen++;

						const [bar, gap, length, room] = [fit.bar * ratio, fit.gap * ratio, fit.length * ratio, width * ratio];
						const small = least(place, ratio);
						const about = `${place}: ${count} bars in ${width}px at ${ratio}: bar ${bar}, gap ${gap}, length ${length} of ${room}`;

						if (!whole(bar) || !whole(gap)) expect.fail(about);
						if (bar < small.bar - 1e-6 || gap < small.gap - 1e-6 || gap > 2 * small.gap + 1e-6) expect.fail(`${about}: not within the sizes`);
						if (Math.abs(length - (count * bar + (count - 1) * gap)) > 1e-6) expect.fail(about);
						if (length > room + 1e-6) expect.fail(`${about}: the row does not fit`);
						if (room - length >= count + 1) expect.fail(`${about}: more than a device pixel for each bar is left`);
					}
				}
			}
		}

		expect(seen).toBeGreaterThan(500);
	});

	test('on a page which is zoomed (ratios of 0.9, 1.1, 1.25 and 1.75): every bar starts and ends on a whole device pixel, all bars and all gaps are alike, and the row fits', () => {
		let seen = 0;

		for (const ratio of [0.9, 1.1, 1.25, 1.75]) {
			for (const place of ['form', 'display'] as const) {
				for (let width = place === 'form' ? 100 : 72; width <= (place === 'form' ? 800 : 72); width += 0.5) {
					const most = fitCount('bars', place, width, ratio);

					for (const count of new Set([most, most - 1, 50, 40, 12, 5, 2])) {
						if (count < 2 || count > most) continue;

						const pieces = pieceGeometry('bars', place, count, width, 'packed', ratio);
						const about = `${place}: ${count} bars in ${width}px at ${ratio}`;
						expect(pieces, about).toHaveLength(count);
						seen++;

						// In device pixels: where each bar starts and ends.
						const edges = pieces.map((piece) => [piece.start * ratio, piece.end * ratio] as const);
						const bar = edges[0]![1] - edges[0]![0];
						const gap = edges[1]![0] - edges[0]![1];

						if (!whole(bar) || !whole(gap) || Math.round(bar) < 1 || Math.round(gap) < 1) expect.fail(`${about}: bar ${bar}, gap ${gap}`);

						for (const [index, [start, end]] of edges.entries()) {
							if (Math.abs(start - index * (bar + gap)) > 1e-6 || Math.abs(end - start - bar) > 1e-6) expect.fail(`${about}: bar ${index} from ${start} to ${end}`);
						}

						if (edges.at(-1)![1] > Math.floor(width * ratio + 1e-4) + 1e-6) expect.fail(`${about}: the row does not fit`);

						// Never less than the least sizes, which are 4px and 2px in the form and 2px and 1px in the display.
						const small = least(place, ratio);
						if (bar < small.bar - 1e-6 || gap < small.gap - 1e-6) expect.fail(`${about}: bar ${bar}, gap ${gap} are less than ${small.bar} and ${small.gap}`);
					}
				}
			}
		}

		expect(seen).toBeGreaterThan(20000);

		// How many fit there: a hundred in 342px, and in the display's 72px.
		expect([0.9, 1.1, 1.25, 1.75].map((ratio) => fitCount('bars', 'form', 342, ratio))).toEqual([51, 47, 53, 54]);
		expect([0.9, 1.1, 1.25, 1.75].map((ratio) => fitCount('bars', 'display', DISPLAY_WIDTH, ratio))).toEqual([21, 16, 18, 21]);

		// At 110% a bar of 4px is five device pixels and a gap of 2px three: 47 of them are 373 of the 376.
		const zoomed = barFit('form', 47, 342, 1.1)!;
		expect(zoomed.bar * 1.1).toBeCloseTo(5, 9);
		expect(zoomed.gap * 1.1).toBeCloseTo(3, 9);
		expect(zoomed.length * 1.1).toBeCloseTo(373, 9);
	});

	test('how many bars: what is wanted where it fits, else as many as fit, counted in whole device pixels', () => {
		const count = (own: object, place: 'form' | 'display', width: number, ratio?: number) => pieceCount(readLook({ visualization: 'bars', ...own }), readOptions(own), place, width, ratio);

		// A hundred wanted in 342px: 57 fit, at 4px and 2px, and 57 are drawn. Not the fifty which divide a hundred.
		expect(count({}, 'form', 342)).toBe(57);
		expect(count({}, 'form', 342, 2)).toBe(57);
		expect(count({}, 'form', 342, 1.5)).toBe(57);
		expect(count({}, 'form', 713)).toBe(100);

		// What is wanted and fits is drawn as it is.
		expect(count({ subdivisions: 50 }, 'form', 342)).toBe(50);
		expect(count({ max: 40 }, 'form', 342)).toBe(40);
		expect(count({ max: 5 }, 'form', 342)).toBe(5);

		// Nothing wanted: as many as fit.
		expect(count({ max: 2.5 }, 'form', 342)).toBe(57);
		expect(count({ max: 2.5 }, 'form', 340)).toBe(57);
		expect(count({ max: 2.5 }, 'form', 339)).toBe(56);

		// The display, 72px: 24 at ratios of 1 and 2, and 22 where a bar of 2px has to be three device pixels.
		expect(count({}, 'display', DISPLAY_WIDTH)).toBe(24);
		expect(count({}, 'display', DISPLAY_WIDTH, 2)).toBe(24);
		expect(count({}, 'display', DISPLAY_WIDTH, 1.5)).toBe(22);
		expect(count({ subdivisions: 12 }, 'display', DISPLAY_WIDTH)).toBe(12);

		// Pills and segments keep the number which divides what is wanted, whatever the ratio, and dots are as
		// many as fit at any ratio, packed or spread: their sizes are whole device pixels at all three.
		for (const ratio of [1, 1.5, 2]) {
			expect(pieceCount(readLook({ visualization: 'pills' }), readOptions({}), 'form', 342, ratio)).toBe(10);
			expect(pieceCount(readLook({ visualization: 'segments' }), readOptions({}), 'form', 342, ratio)).toBe(20);
			expect(pieceCount(readLook({ visualization: 'dots', dotsLayout: 'spread' }), readOptions({}), 'form', 342, ratio)).toBe(21);
			expect(pieceCount(readLook({ visualization: 'dots' }), readOptions({}), 'form', 342, ratio)).toBe(21);
		}

		// How many fit, by the ratio: the least bar and gap are rounded up to whole device pixels.
		// At one and a quarter a bar of 4px is five device pixels and a gap of 2px three, which 53 times are 421 of 427.
		expect(fitCount('bars', 'form', 342, 1)).toBe(57);
		expect(fitCount('bars', 'form', 342, 2)).toBe(57);
		expect(fitCount('bars', 'form', 342, 1.25)).toBe(53);
		expect(fitCount('bars', 'form', 342, 1.5)).toBe(57);
		expect(fitCount('bars', 'form', 10, 1)).toBe(2);
		expect(fitCount('bars', 'form', 9, 1)).toBe(1);
		expect(fitCount('bars', 'form', 5000, 1)).toBe(200);
		expect(fitCount('bars', 'form', 342, Number.NaN)).toBe(57);
	});

	test('the owner\'s case: a hundred in 342px', () => {
		// 57 bars of 4px with 2px between them are 340px: 2px are left, less than the bar and the gap which would be next.
		expect(barFit('form', 57, 342, 1)).toEqual({ bar: 4, gap: 2, length: 340 });
		expect(barFit('form', 57, 342, 2)).toEqual({ bar: 4, gap: 2, length: 340 });

		// At one and a half, 57 bars of six device pixels with three between: 510 of the 513, so 2px are left there too.
		const fit = barFit('form', 57, 342, 1.5)!;
		expect(fit.bar * 1.5).toBeCloseTo(6, 9);
		expect(fit.gap * 1.5).toBeCloseTo(3, 9);
		expect(fit.length * 1.5).toBeCloseTo(510, 9);

		// Sharing the width, a bar was 4.88px for fifty, which no screen can draw fifty times alike.
		expect((342 - 49 * 2) / 50).toBe(4.88);

		// The display: 24 bars of 2px with 1px between, 71px of its 72px.
		expect(barFit('display', 24, 72, 1)).toEqual({ bar: 2, gap: 1, length: 71 });
		expect(barFit('display', 24, 72, 2)).toEqual({ bar: 2, gap: 1, length: 71 });
	});

	test('a number which is asked for keeps it, with the widest bar which fits, and a wider gap where that uses more of the track', () => {
		// Fifty asked for in 342px: bars of 4px, 298px in all. Nothing uses more: 44px are left.
		expect(barFit('form', 50, 342, 1)).toEqual({ bar: 4, gap: 2, length: 298 });
		expect(barFit('form', 50, 342, 2)).toEqual({ bar: 4.5, gap: 2, length: 323 });

		// Five in 342px: with 2px between them bars of 66px leave 4px, with 3px between them none.
		expect(barFit('form', 5, 342, 1)).toEqual({ bar: 66, gap: 3, length: 342 });

		// A hundred in 697px: bars of 4px, and 3px between them use all of it where 2px left 99. A pixel less,
		// and only 2px fit between bars of 4px: 98px are left.
		expect(barFit('form', 100, 697, 1)).toEqual({ bar: 4, gap: 3, length: 697 });
		expect(barFit('form', 100, 696, 1)).toEqual({ bar: 4, gap: 2, length: 598 });

		// A gap is never more than twice its least.
		expect(barFit('form', 2, 342, 1)!.gap).toBeLessThanOrEqual(4);
		expect(barFit('form', 2, 342, 1)).toEqual({ bar: 170, gap: 2, length: 342 });

		// The display: twelve bars of 5px, 71px.
		expect(barFit('display', 12, 72, 1)).toEqual({ bar: 5, gap: 1, length: 71 });
	});

	test('where the bars are: from the start, each as wide as every other, and the row ends before the track does', () => {
		const bars = pieceGeometry('bars', 'form', 50, 342);

		expect(bars).toHaveLength(50);
		expect(bars[0]).toEqual({ start: 0, end: 4 });
		expect(bars[1]).toEqual({ start: 6, end: 10 });
		expect(bars[49]).toEqual({ start: 294, end: 298 });
		expect(new Set(bars.map((bar) => bar.end - bar.start)).size).toBe(1);

		const many = pieceGeometry('bars', 'form', 57, 342);
		expect(many[0]).toEqual({ start: 0, end: 4 });
		expect(many[56]).toEqual({ start: 336, end: 340 });

		// By the ratio of the screen.
		const sharp = pieceGeometry('bars', 'form', 50, 342, 'packed', 2);
		expect(sharp[0]).toEqual({ start: 0, end: 4.5 });
		expect(sharp[1]).toEqual({ start: 6.5, end: 11 });
		expect(sharp[49]!.end).toBe(323);

		// The pointer: the last bar is the last piece, and so is everything beyond it, the empty rest of the track too.
		expect(filledAt(296, bars)).toBe(50);
		expect(filledAt(310, bars)).toBe(50);
		expect(filledAt(341, bars)).toBe(50);
		expect(filledAt(292, bars)).toBe(49);
		expect(filledAt(5, bars)).toBe(1);

		// The length which stands for the whole range is that of the row: its end is the maximum, and so is the rest.
		const length = bars[49]!.end;
		expect(valueAtShare(shareAt(298, length), range(0, 100))).toBe(100);
		expect(valueAtShare(shareAt(320, length), range(0, 100))).toBe(100);
		expect(valueAtShare(shareAt(149, length), range(0, 100))).toBe(50);

		// Pills and segments still share the width, and dots keep their own size, whatever the ratio.
		for (const shape of ['pills', 'segments', 'dots'] as const) expect(pieceGeometry(shape, 'form', 10, 342, 'packed', 2)).toEqual(pieceGeometry(shape, 'form', 10, 342));
		expect(pieceGeometry('pills', 'form', 10, 342).at(-1)!.end).toBeCloseTo(342, 9);
	});

	test('nothing to fit, more bars than fit, and a ratio which is none', () => {
		expect(barFit('form', 0, 342, 1)).toBeNull();
		expect(barFit('form', 50, 0, 1)).toBeNull();
		expect(barFit('form', Number.NaN, 342, 1)).toBeNull();
		expect(barFit('form', 50, Number.POSITIVE_INFINITY, 1)).toBeNull();

		// More bars than device pixels: no fit, and the bars share the width as before.
		expect(barFit('form', 200, 100, 1)).toBeNull();
		expect(pieceGeometry('bars', 'form', 200, 100)).toHaveLength(200);
		expect(pieceGeometry('bars', 'form', 200, 100).at(-1)!.end).toBeCloseTo(100, 9);

		// More than fit at the least sizes, which the count never asks for: thinner bars and gaps.
		expect(barFit('form', 50, 120, 1)).toEqual({ bar: 1, gap: 1, length: 99 });
		expect(barFit('form', 80, 342, 1)).toEqual({ bar: 2, gap: 2, length: 318 });

		for (const ratio of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(barFit('form', 50, 342, ratio), String(ratio)).toEqual(barFit('form', 50, 342, 1));
	});
});

describe('the ramp at the start of the scale', () => {
	// The reach which a `grow` gives: for dots by the pieces, for fifty thin bars in half of the form by the pixels.
	const dots = (grow: number) => reachOf('dots', 'form', 20, 342, grow);
	const bars = (grow: number) => reachOf('bars', 'form', 50, 342, grow);
	const all = (fraction: number, count: number, reach: number) => Array.from({ length: count }, (_, index) => growthOf(fraction, count, index, reach));

	// The growth as it was before the reach grew out of the start, away from the minimum: 1 - d / reach.
	const plain = (fraction: number, count: number, index: number, reach: number) => {
		if (index < filledCount(fraction, count)) return 1;
		return Math.min(1, Math.max(0, 1 - (index + 0.5 - Number((fraction * count).toFixed(9))) / reach));
	};

	test('at the minimum every growth is 0: an empty meter is empty, whatever the number', () => {
		expect(bars(4)).toBe(10);
		expect(dots(4)).toBe(3.5);

		for (const grow of [0.5, 1, 2, 4, 20]) {
			expect(all(0, 20, dots(grow)), `dots ${grow}`).toEqual(Array.from({ length: 20 }, () => 0));
			expect(all(0, 50, bars(grow)), `bars ${grow}`).toEqual(Array.from({ length: 50 }, () => 0));
			expect(all(0, 100, reachOf('bars', 'form', 100, 713, grow)), `a hundred bars ${grow}`).toEqual(Array.from({ length: 100 }, () => 0));
			expect(all(0, 2, reachOf('pills', 'form', 2, 342, grow)), `two pills ${grow}`).toEqual([0, 0]);
		}

		// And what is drawn there: no piece is larger than small, and nothing fades in.
		const options = readOptions({ max: 100, color: GREEN });
		const look = readLook({ visualization: 'bars', grow: 4, fade: true });
		const drawing = drawingOf(look, options, readingOf(0, options, EN), 50, 0, { reach: bars(4) });
		expect(drawing.pieces!.every((piece) => piece.size!.across === 0.3333 && piece.over === null)).toBe(true);
	});

	test('the ramp comes out of the start piece by piece: fifty bars with 4, at the first values', () => {
		// How many bars are filled or on their way, for the values 0 to 8 of a hundred.
		const larger = (value: number) => all(value / 100, 50, bars(4)).filter((growth) => growth > 0).length;
		expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map(larger)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);

		// At 2 one bar is filled and the next two thirds of the way; at 4 two are filled, then 0.8 and 0.4.
		expect(all(0.02, 50, bars(4)).slice(0, 4).map((growth) => Number(growth.toFixed(4)))).toEqual([1, 0.6667, 0, 0]);
		expect(all(0.04, 50, bars(4)).slice(0, 5).map((growth) => Number(growth.toFixed(4)))).toEqual([1, 1, 0.8, 0.4, 0]);

		// Before there was this rule the value 1 had a filled bar and eight on their way behind an empty meter.
		expect(all(0.01, 50, bars(4)).filter((growth) => growth > 0)).toHaveLength(1);
	});

	test('the growth of the first pieces is continuous in the position, from the minimum upwards', () => {
		for (const [name, count, reach] of [
			['bars with 4', 50, bars(4)],
			['dots with 4', 20, dots(4)],
			['bars with 20', 50, bars(20)],
			['dots with 2', 20, dots(2)],
		] as const) {
			// A thousandth of a piece at a time over the first twelve pieces. The steepest a growth can be is
			// that of the first piece at the very start, 4 for a piece, so no step is more than 0.004 and a hair.
			const step = 1 / (count * 1000);
			let before = all(0, count, reach);
			let largest = 0;

			for (let position = 1; position <= 12000; position++) {
				const now = all(position * step, count, reach);

				for (let index = 0; index < 16; index++) {
					const jump = Math.abs(now[index]! - before[index]!);
					largest = Math.max(largest, jump);
					if (jump > 0.0045) expect.fail(`${name}: piece ${index} jumps by ${jump} at ${position / 1000} pieces`);
				}

				before = now;
			}

			// It did move: the sweep is not of a meter in which nothing grows.
			expect(largest, name).toBeGreaterThan(0.001);
		}
	});

	test('once the fill is as long as the reach, the values are what they were', () => {
		for (const [count, reach] of [
			[50, bars(4)],
			[20, dots(4)],
			[50, bars(1)],
			[20, dots(2)],
		] as const) {
			// From the position at which the whole reach counts, up to the end of the scale.
			for (let position = Math.ceil((reach - 0.5) * 100); position <= count * 100; position += 7) {
				const fraction = position / (count * 100);
				for (let index = 0; index < count; index++) {
					const growth = growthOf(fraction, count, index, reach);
					if (Math.abs(growth - plain(fraction, count, index, reach)) > 1e-12) expect.fail(`${count} pieces, reach ${reach}, at ${position / 100}: piece ${index} is ${growth}`);
				}
			}
		}

		// Fifty bars with 4 at 40 of a hundred: twenty filled and a ramp of ten, sixty pixels of the track.
		expect(all(0.4, 50, bars(4)).filter((growth) => growth > 0 && growth < 1)).toHaveLength(10);
		expect(all(0.4, 50, bars(4)).slice(20, 23).map((growth) => Number(growth.toFixed(4)))).toEqual([0.95, 0.85, 0.75]);
	});

	test('a grow of 1 and less gives the same values as before everywhere, the start included', () => {
		for (const grow of [0.5, 1]) {
			for (const count of [2, 5, 20]) {
				const reach = reachOf('dots', 'form', count, 342, grow);
				expect(reach).toBeLessThanOrEqual(0.5);

				for (let position = 0; position <= count * 200; position++) {
					const fraction = position / (count * 200);
					for (let index = 0; index < count; index++) {
						const growth = growthOf(fraction, count, index, reach);
						if (Math.abs(growth - plain(fraction, count, index, reach)) > 1e-12) expect.fail(`grow ${grow}, ${count} pieces at ${position / 200}: piece ${index} is ${growth}`);
					}
				}
			}
		}
	});

	test('what fades in and the place of the pointer go by the same rule', () => {
		const options = readOptions({ max: 100, color: GREEN });
		const look = readLook({ visualization: 'bars', grow: 4, fade: true });
		const overs = (value: number, at?: number) => drawingOf(look, options, readingOf(value, options, EN), 50, value, { reach: bars(4), at }).pieces!.map((piece) => piece.over?.opacity ?? 0);

		// By the value: nothing at 0, nothing but the filled bar at 1, one bar fading in at 2.
		expect(overs(0).filter((opacity) => opacity > 0)).toHaveLength(0);
		expect(overs(1).filter((opacity) => opacity > 0)).toHaveLength(0);
		expect(overs(2).filter((opacity) => opacity > 0)).toEqual([0.6667]);

		// By the pointer, with the value still at 0: a hair past the start next to nothing, not a ramp of eight.
		expect(overs(0, 0.0001).filter((opacity) => opacity > 0.05)).toHaveLength(0);
		expect(overs(0, 0.005).filter((opacity) => opacity > 0)).toEqual([0.6667]);
	});
});

describe('the piece which fades in', () => {
	const options = readOptions({ max: 100, color: GREEN, thresholds: [{ value: 40, color: AMBER }, { value: 80, color: RED }] });
	const draw = (value: unknown, look: object, count = 5) => drawingOf(readLook({ visualization: 'pills', ...look }), options, readingOf(value, options, EN), count, value);
	const overs = (value: unknown, look: object, count = 5) => draw(value, look, count).pieces!.map((piece) => piece.over);

	test('the next piece has the look of a filled one laid over it, as much as it has grown; the others have nothing', () => {
		// 65 of 100 in five pieces: the fourth is half way to being filled.
		expect(overs(65, { fade: true })).toEqual([null, null, null, { paint: { color: AMBER, scale: null }, opacity: 0.5 }, null]);
		expect(overs(62, { fade: true })[3]).toEqual({ paint: { color: AMBER, scale: null }, opacity: 0.2 });
		expect(overs(69.9, { fade: true })[3]).toEqual({ paint: { color: AMBER, scale: null }, opacity: 0.99 });
		expect(overs(5, { fade: true })).toEqual([{ paint: { color: GREEN, scale: null }, opacity: 0.5 }, null, null, null, null]);
	});

	test('at a value which is a whole number of pieces, and once the piece is filled, there is none', () => {
		for (const value of [0, 20, 60, 70, 75, 79.9, 100, -20, 150]) expect(overs(value, { fade: true }), String(value)).toEqual([null, null, null, null, null]);
		expect(overs(null, { fade: true })).toEqual([null, null, null, null, null]);
	});

	test('the look laid over is that of the active colouring for that piece, and the piece under it keeps its inactive look', () => {
		// By the colour of the value, which at 65 is amber.
		expect(overs(65, { fade: true, activeColoring: 'value' })[3]!.paint).toEqual({ color: AMBER, scale: null });

		// By steps: the colour of the value the piece reaches when it is filled, 80, which is red.
		expect(overs(65, { fade: true, activeColoring: 'steps' })[3]!.paint).toEqual({ color: RED, scale: null });

		// By the gradient: its own part of the colours across the track, at full strength.
		expect(overs(65, { fade: true, activeColoring: 'gradient' })[3]!.paint).toEqual({ color: null, scale: 'full' });

		// By the blend: the one colour everything filled has.
		const blended = draw(65, { fade: true, activeColoring: 'blend' });
		expect(blended.pieces![3]!.over!.paint).toEqual(blended.pieces![0]!.paint);

		// The piece under it is what the inactive colouring gives it, with or without the fade.
		for (const inactiveColoring of ['plain', 'automatic', 'value', 'steps', 'gradient']) {
			const look = { activeColoring: 'steps', inactiveColoring };
			expect(draw(65, { ...look, fade: true }).pieces!.map((piece) => piece.paint)).toEqual(draw(65, look).pieces!.map((piece) => piece.paint));
		}
	});

	test('a gradient which only the fading piece shows still has its stops', () => {
		// 5 of 100: nothing is filled yet, and the first piece is fading in.
		expect(draw(5, { activeColoring: 'gradient' }).stops).toBeNull();
		expect(draw(5, { activeColoring: 'gradient', fade: true }).stops).not.toBeNull();
		expect(draw(0, { activeColoring: 'gradient', fade: true }).stops).toBeNull();
	});

	test('with both, the piece grows and fades in together, by the same share', () => {
		const piece = draw(65, { visualization: 'dots', grow: 1, fade: true }).pieces![3]!;

		expect(piece.size).toEqual({ along: 0.75, across: 0.75 });
		expect(piece.over).toEqual({ paint: { color: AMBER, scale: null }, opacity: 0.5 });

		const after = draw(65, { visualization: 'dots', grow: 1, fade: true }).pieces![4]!;
		expect(after.size).toEqual({ along: 0.5, across: 0.5 });
		expect(after.over).toBeNull();
	});

	test('the display takes it from the interface, a stored null too, and its own counts first', () => {
		expect(readLook({}, { fade: true }).fade).toBe(true);
		expect(readLook({ fade: null }, { fade: true }).fade).toBe(true);
		expect(readLook({ fade: false }, { fade: true }).fade).toBe(false);
		expect(readLook({ fade: true }, { fade: false }).fade).toBe(true);
		expect(readLook({ fade: 'yes' }, {}).fade).toBe(false);
	});

	test('one bar ignores it', () => {
		const reading = readingOf(65, options, EN);
		expect(drawingOf(readLook({ fade: true }), options, reading, 0, 65)).toEqual(drawingOf(readLook({}), options, reading, 0, 65));
	});
});

describe('a finger which drags and a finger which scrolls', () => {
	test('a few pixels sideways, and further sideways than up or down, is a drag', () => {
		expect(TOUCH_SLOP).toBe(6);

		expect(sideways(6, 0)).toBe(true);
		expect(sideways(-6, 0)).toBe(true);
		expect(sideways(40, 10)).toBe(true);
		expect(sideways(-40, -39)).toBe(true);
		expect(sideways(8, -7)).toBe(true);
	});

	test('anything less is not, and neither is a move which is mostly up or down', () => {
		expect(sideways(0, 0)).toBe(false);
		expect(sideways(5, 0)).toBe(false);
		expect(sideways(-5.9, 0)).toBe(false);
		expect(sideways(0, 200)).toBe(false);
		expect(sideways(8, 12)).toBe(false);
		expect(sideways(-8, -12)).toBe(false);
		expect(sideways(30, 30)).toBe(false);
		expect(sideways(30, -200)).toBe(false);
		expect(sideways(Number.NaN, 0)).toBe(false);
		expect(sideways(10, Number.NaN)).toBe(false);
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

	test('every method by which the pointer sets a value leaves that as it is, and none stops it', () => {
		for (const method of ['position', 'piece', 'relative'] as const) {
			expect(canEdit({}, method), method).toBe(true);
			expect(canEdit({ disabled: true }, method), method).toBe(false);
			expect(canEdit({ nonEditable: true }, method), method).toBe(false);
			expect(canEdit({ loading: true }, method), method).toBe(false);
		}

		expect(canEdit({}, 'none')).toBe(false);
		expect(canEdit({ disabled: true }, 'none')).toBe(false);
		expect(canEdit({}, undefined)).toBe(true);
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

describe('the range which can be written', () => {
	const whole = { whole: true };
	const any = { whole: false };

	test('the range as it is drawn, for a type which holds any number', () => {
		expect(writableRange(range(0, 100), any)).toEqual({ min: 0, max: 100 });
		expect(writableRange(range(0.5, 5.5), any)).toEqual({ min: 0.5, max: 5.5 });
		expect(writableRange(range(-2.25, 0.75), any)).toEqual({ min: -2.25, max: 0.75 });
		expect(writableRange(range(7, 7), any)).toEqual({ min: 7, max: 7 });
	});

	test('the whole numbers within it, for a whole type', () => {
		expect(writableRange(range(0, 100), whole)).toEqual({ min: 0, max: 100 });
		expect(writableRange(range(0.5, 5.5), whole)).toEqual({ min: 1, max: 5 });
		expect(writableRange(range(0, 10.5), whole)).toEqual({ min: 0, max: 10 });
		expect(writableRange(range(-2.5, 2.5), whole)).toEqual({ min: -2, max: 2 });
		expect(writableRange(range(-0.5, 3), whole)).toEqual({ min: 0, max: 3 });
		expect(writableRange(range(2.2, 2.8), whole)).toBeNull();
		expect(writableRange(range(0.2, 0.8), whole)).toBeNull();
	});

	test('nothing where a limit is not a finite number', () => {
		expect(writableRange(range(Number.NaN, 5), any)).toBeNull();
		expect(writableRange(range(0, Number.POSITIVE_INFINITY), any)).toBeNull();
		expect(writableRange(range(5, 0), any)).toBeNull();
	});

	test('automatic fills by the piece only where the limits themselves can be written', () => {
		const method = (own: object, count: number, limits: { min: number; max: number }, type: string) => inputMethod(readEditing(own, type, limits), count, limits);

		// Five pieces over 0.5 to 5.5 on a whole type: 1 to 5 can be written, which is four steps and not five.
		expect(method({}, 5, range(0.5, 5.5), 'integer')).toBe('position');
		expect(method({}, 5, range(0.5, 5.5), 'bigInteger')).toBe('position');
		expect(method({}, 10, range(0, 10.5), 'integer')).toBe('position');
		expect(method({}, 4, range(0.5, 5.5), 'integer')).toBe('position');

		// The same limits on a type which can hold them, in steps of 1.
		expect(method({ step: 1 }, 5, range(0.5, 5.5), 'float')).toBe('piece');
		expect(method({ step: 1 }, 5, range(0.5, 5.5), 'decimal')).toBe('piece');

		// Whole limits on a whole type, as before.
		expect(method({}, 5, range(0, 5), 'integer')).toBe('piece');
		expect(method({}, 5, range(-2, 3), 'integer')).toBe('piece');

		// Nothing which can be written: no piece is a step.
		expect(method({}, 5, range(0.2, 0.8), 'integer')).toBe('position');

		// The method which is set is used as it is.
		expect(method({ input: 'piece' }, 5, range(0.5, 5.5), 'integer')).toBe('piece');
	});
});

describe('the value a press on a piece writes', () => {
	const one = { step: 1, whole: true };
	const filledBy = (value: number | null, count: number, limits: { min: number; max: number }) => (value === null ? null : filledCount(fractionOf(value, limits), count));

	test('where a piece is a step: that many steps', () => {
		for (const filled of [0, 1, 2, 3, 4, 5]) expect(pieceValue(filled, 5, range(0, 5), one)).toBe(filled);
		for (const filled of [0, 3, 7, 10]) expect(pieceValue(filled, 10, range(0, 100), one)).toBe(filled * 10);

		expect(pieceValue(3, 4, range(10, 18), { step: 2, whole: true })).toBe(16);
		expect(pieceValue(2, 5, range(0, 1), { step: 0.2, whole: false })).toBe(0.4);
	});

	test('a whole type with limits between whole numbers: the piece which was pressed is the last one filled', () => {
		// Five pieces over 0.5 to 5.5, of which 1 to 5 can be written.
		const limits = range(0.5, 5.5);

		expect([1, 2, 3, 4, 5].map((filled) => pieceValue(filled, 5, limits, one))).toEqual([1, 2, 3, 4, 5]);
		for (const filled of [1, 2, 3, 4, 5]) expect(filledBy(pieceValue(filled, 5, limits, one), 5, limits)).toBe(filled);

		// Before the first piece no value draws none: the least which can be written.
		expect(pieceValue(0, 5, limits, one)).toBe(1);
	});

	test('of the values which draw the piece, the one nearest to its share', () => {
		// Four pieces for 0 to 100 in steps of 1: the second piece is 50, though 38 to 62 would all draw two.
		expect(pieceValue(2, 4, range(0, 100), one)).toBe(50);

		// Steps of 20: the share of the second of four pieces, 50, is between 40 and 60, which both draw two; the upper one of a tie.
		expect(pieceValue(2, 4, range(0, 100), { step: 20, whole: true })).toBe(60);

		// Steps of 30 up to 100 are 0, 30, 60, 90 and 100. The third of four pieces, 75: 60 draws two and 90 four,
		// so no value draws three, and the nearest value is written.
		expect(pieceValue(3, 4, range(0, 100), { step: 30, whole: true })).toBe(90);
		expect(filledBy(60, 4, range(0, 100))).toBe(2);
		expect(filledBy(90, 4, range(0, 100))).toBe(4);
	});

	test('whatever the options, the pressed piece is filled whenever any value could fill it', () => {
		const cases: [{ min: number; max: number }, { step: number; whole: boolean }, number][] = [
			[range(0.5, 5.5), { step: 1, whole: true }, 5],
			[range(0, 10.5), { step: 1, whole: true }, 10],
			[range(0, 100), { step: 7, whole: true }, 10],
			[range(0, 1), { step: 0.3, whole: false }, 4],
			[range(-3.5, 3.5), { step: 2, whole: true }, 7],
			[range(0, 10), { step: 4, whole: true }, 8],
		];

		for (const [limits, editing, count] of cases) {
			for (let filled = 0; filled <= count; filled++) {
				const written = pieceValue(filled, count, limits, editing);
				expect(written).not.toBeNull();

				// Every value which can be written, and whether one of them draws this many pieces.
				const writable = writableRange(limits, editing)!;
				const possible: number[] = [];
				for (let value = writable.min; value <= writable.max + 1e-9; value += editing.step) possible.push(snapValue(value, limits, editing)!);
				possible.push(writable.max);

				const drawing = possible.filter((value) => filledBy(value, count, limits) === filled);
				if (drawing.length) expect(filledBy(written, count, limits), `${JSON.stringify(limits)} ${editing.step} piece ${filled}: ${written}`).toBe(filled);
				expect(possible.some((value) => Math.abs(value - written!) < 1e-9)).toBe(true);
			}
		}
	});

	test('nothing where nothing can be written, or there are no pieces', () => {
		expect(pieceValue(1, 5, range(0.2, 0.8), one)).toBeNull();
		expect(pieceValue(1, 0, range(0, 5), one)).toBeNull();
	});
});

describe('the keys in a range of which not all can be written', () => {
	const one = { step: 1, whole: true };

	test('a value from beyond the range is brought to the nearer end of what can be written, and the key counts from there', () => {
		// 0 to 10.5 on a whole type: 0 to 10 can be written.
		expect(keyValue('ArrowLeft', 15, range(0, 10.5), one)).toBe(9);
		expect(keyValue('ArrowRight', 15, range(0, 10.5), one)).toBe(10);
		expect(keyValue('ArrowDown', 11, range(0, 10.5), one)).toBe(9);
		expect(keyValue('PageDown', 25, range(0, 20.5), one)).toBe(10);

		// 0.5 to 5.5: 1 to 5.
		expect(keyValue('ArrowRight', -3, range(0.5, 5.5), one)).toBe(2);
		expect(keyValue('ArrowLeft', -3, range(0.5, 5.5), one)).toBe(1);
		expect(keyValue('ArrowRight', null, range(0.5, 5.5), one)).toBe(2);
		expect(keyValue('ArrowLeft', null, range(0.5, 5.5), one)).toBe(1);

		// Whole limits, as before.
		expect(keyValue('ArrowLeft', 150, range(0, 100), one)).toBe(99);
		expect(keyValue('ArrowRight', -20, range(0, 100), one)).toBe(1);
	});

	test('Home and End are the ends of what can be written, and a Page key is a piece of it', () => {
		expect(keyValue('Home', 3, range(0.5, 5.5), one)).toBe(1);
		expect(keyValue('End', 3, range(0.5, 5.5), one)).toBe(5);

		// Two pieces over 0.5 to 40.5: a piece of what can be written, 1 to 40, is 19.5, more than ten steps.
		expect(keyValue('PageUp', 1, range(0.5, 40.5), one, 2)).toBe(20);
		expect(keyValue('PageDown', 40, range(0.5, 40.5), one, 2)).toBe(21);
	});

	test('where nothing can be written a key of the meter\'s gives nothing, and another key is still not the meter\'s', () => {
		for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']) {
			expect(keyValue(key, 0, range(0.2, 0.8), one), key).toBeNull();
		}

		expect(keyValue('a', 0, range(0.2, 0.8), one)).toBeUndefined();
		expect(keyValue('Enter', 3, range(0, 5), one)).toBeUndefined();
	});
});

describe('the keys on a fine grid of many steps', () => {
	const float = (step: number) => ({ step, whole: false });
	const wide = range(0, 10_000_000);
	const money = range(0, 1_000_000);

	test('the cases of the review: every key moves, and a Page key is ten steps', () => {
		// 0 to 10,000,000 in steps of 0.1, at 4,567,890.1.
		expect(keyValue('ArrowRight', 4567890.1, wide, float(0.1))).toBe(4567890.2);
		expect(keyValue('ArrowRight', 4567890.2, wide, float(0.1))).toBe(4567890.3);
		expect(keyValue('ArrowLeft', 4567890.3, wide, float(0.1))).toBe(4567890.2);
		expect(keyValue('ArrowLeft', 4567890.1, wide, float(0.1))).toBe(4567890);
		expect(keyValue('ArrowUp', 4567890.1, wide, float(0.1))).toBe(4567890.2);
		expect(keyValue('ArrowDown', 4567890.1, wide, float(0.1))).toBe(4567890);
		expect(keyValue('PageUp', 4567890.1, wide, float(0.1))).toBe(4567891.1);
		expect(keyValue('PageDown', 4567890.1, wide, float(0.1))).toBe(4567889.1);

		// Money to the cent, 0 to 1,000,000.
		expect(keyValue('ArrowRight', 523456.78, money, float(0.01))).toBe(523456.79);
		expect(keyValue('ArrowLeft', 523456.78, money, float(0.01))).toBe(523456.77);
		expect(keyValue('PageUp', 523456.78, money, float(0.01))).toBe(523456.88);
		expect(keyValue('PageDown', 523456.78, money, float(0.01))).toBe(523456.68);
		expect(keyValue('ArrowRight', 1234.56, money, float(0.01))).toBe(1234.57);
		expect(keyValue('ArrowLeft', 1234.56, money, float(0.01))).toBe(1234.55);
		expect(keyValue('ArrowRight', 999999.99, money, float(0.01))).toBe(1000000);
		expect(keyValue('ArrowLeft', 1000000, money, float(0.01))).toBe(999999.99);
	});

	test('a sweep: Right always rises by exactly one step and Left always falls by one', () => {
		// The points are counted, so the nth point of a grid of tenths is n / 10 as a number, and of cents n / 100.
		const grids = [
			{ within: wide, step: 0.1, per: 10, points: 100_000_000 },
			{ within: money, step: 0.01, per: 100, points: 100_000_000 },
			{ within: range(0, 300_000), step: 0.01, per: 100, points: 30_000_000 },
			{ within: range(-5_000_000, 5_000_000), step: 0.1, per: 10, points: 100_000_000 },
		];

		for (const { within, step, per, points } of grids) {
			const point = (index: number) => (within.min * per + index) / per;
			let seed = 7;
			const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

			for (let turn = 0; turn < 25_000; turn++) {
				const index = 1 + Math.floor(random() * (points - 2));
				const current = point(index);

				if (keyValue('ArrowRight', current, within, float(step)) !== point(index + 1)) expect.fail(`Right from ${current} in steps of ${step}: ${keyValue('ArrowRight', current, within, float(step))}`);
				if (keyValue('ArrowLeft', current, within, float(step)) !== point(index - 1)) expect.fail(`Left from ${current} in steps of ${step}: ${keyValue('ArrowLeft', current, within, float(step))}`);
				if (keyValue('PageUp', current, within, float(step)) !== point(Math.min(points, index + 10))) expect.fail(`Page Up from ${current} in steps of ${step}`);
				if (keyValue('PageDown', current, within, float(step)) !== point(Math.max(0, index - 10))) expect.fail(`Page Down from ${current} in steps of ${step}`);
			}
		}
	});

	test('a walk of many presses passes every point once, up and back', () => {
		let value: number | null | undefined = 4567890.1;

		for (let press = 1; press <= 3000; press++) {
			value = keyValue('ArrowRight', value as number, wide, float(0.1));
			if (value !== (45678901 + press) / 10) expect.fail(`press ${press} up: ${value}`);
		}

		for (let press = 1; press <= 3000; press++) {
			value = keyValue('ArrowLeft', value as number, wide, float(0.1));
			if (value !== (45678901 + 3000 - press) / 10) expect.fail(`press ${press} down: ${value}`);
		}

		expect(value).toBe(4567890.1);
	});

	test('the pointer writes the same points', () => {
		expect(snapValue(4567890.14, wide, float(0.1))).toBe(4567890.1);
		expect(snapValue(4567890.16, wide, float(0.1))).toBe(4567890.2);
		expect(snapValue(4567890.14, wide, float(0.1), 'up')).toBe(4567890.2);
		expect(snapValue(4567890.16, wide, float(0.1), 'down')).toBe(4567890.1);
		expect(snapValue(4567890.1, wide, float(0.1), 'up')).toBe(4567890.1);
		expect(snapValue(4567890.1, wide, float(0.1), 'down')).toBe(4567890.1);
		expect(snapValue(523456.784, money, float(0.01))).toBe(523456.78);
		expect(snapValue(523456.786, money, float(0.01))).toBe(523456.79);
	});

	test('a value which is on a point but for the dust of a sum counts as on it', () => {
		// 4567890.1 + 0.1 is not the number 4567890.2 but the one below it, 45678901 * 0.1 is the number above
		// 4567890.1, and 0.1 + 0.2 is not 0.3.
		expect(4567890.1 + 0.1).toBeLessThan(4567890.2);
		expect(keyValue('ArrowRight', 4567890.1 + 0.1, wide, float(0.1))).toBe(4567890.3);
		expect(keyValue('ArrowLeft', 4567890.1 + 0.1, wide, float(0.1))).toBe(4567890.1);
		expect(45678901 * 0.1).toBeGreaterThan(4567890.1);
		expect(keyValue('ArrowRight', 45678901 * 0.1, wide, float(0.1))).toBe(4567890.2);
		expect(keyValue('ArrowLeft', 45678901 * 0.1, wide, float(0.1))).toBe(4567890);
		expect(keyValue('ArrowRight', 0.1 + 0.2, range(0, 1), float(0.1))).toBe(0.4);
		expect(keyValue('ArrowLeft', 0.1 + 0.2, range(0, 1), float(0.1))).toBe(0.2);
	});

	test('where the numbers lie further apart than the points, a key still gives another number', () => {
		// At a thousand million million the numbers are an eighth apart, and the steps a thousandth.
		const far = range(1e15, 1e15 + 1);

		const up = keyValue('ArrowRight', 1e15, far, float(0.001)) as number;
		expect(up).toBeGreaterThan(1e15);
		expect(up).toBeLessThanOrEqual(1e15 + 0.25);

		const down = keyValue('ArrowLeft', 1e15 + 1, far, float(0.001)) as number;
		expect(down).toBeLessThan(1e15 + 1);
		expect(down).toBeGreaterThanOrEqual(1e15 + 0.75);

		expect(keyValue('ArrowRight', 1e15 + 1, far, float(0.001))).toBe(1e15 + 1);
		expect(keyValue('ArrowLeft', 1e15, far, float(0.001))).toBe(1e15);
	});
});

describe('steps which make no grid', () => {
	const float = (step: number) => ({ step, whole: false });
	const whole = (step: number) => ({ step, whole: true });

	test('a step larger than the range leaves its two ends, and the nearer one is written', () => {
		// The steps of the review: a range of 10, and steps up to ten thousand million times that.
		for (const step of [50, 1e8, 1e9, 2e9, 1e10, 1e300]) {
			expect(snapValue(9.99, range(0, 10), float(step)), String(step)).toBe(10);
			expect(snapValue(6, range(0, 10), float(step)), String(step)).toBe(10);
			expect(snapValue(5, range(0, 10), float(step)), String(step)).toBe(10);
			expect(snapValue(4.99, range(0, 10), float(step)), String(step)).toBe(0);
			expect(snapValue(0.01, range(0, 10), float(step)), String(step)).toBe(0);
			expect(snapValue(0, range(0, 10), float(step)), String(step)).toBe(0);
			expect(snapValue(10, range(0, 10), float(step)), String(step)).toBe(10);
			expect(snapValue(-3, range(0, 10), float(step)), String(step)).toBe(0);
			expect(snapValue(30, range(0, 10), float(step)), String(step)).toBe(10);
		}

		// Counted from the minimum, on a whole type, and as a key wants it.
		expect(snapValue(24, range(20, 30), float(1e10))).toBe(20);
		expect(snapValue(26, range(20, 30), float(1e10))).toBe(30);
		expect(snapValue(3, range(0.5, 5.5), whole(100))).toBe(5);
		expect(snapValue(2.9, range(0.5, 5.5), whole(100))).toBe(1);
		expect(snapValue(9.99, range(0, 10), float(1e10), 'down')).toBe(0);
		expect(snapValue(0.01, range(0, 10), float(1e10), 'up')).toBe(10);
		expect(snapValue(10, range(0, 10), float(1e10), 'down')).toBe(10);
		expect(snapValue(0, range(0, 10), float(1e10), 'up')).toBe(0);

		// A step as long as the range is a grid of its two ends like any other.
		expect(snapValue(4, range(0, 10), float(10))).toBe(0);
		expect(snapValue(6, range(0, 10), float(10))).toBe(10);
	});

	test('a range which holds more steps than can be counted exactly has no grid: the value itself is written', () => {
		expect(MAX_STEPS).toBe(Number.MAX_SAFE_INTEGER);
		expect(FREE_DIGITS).toBe(12);

		// The steps of the review, of which a hundred holds more than can be counted.
		for (const step of [1e-300, 1e-307, 5e-308, 1e-309, 1e-15]) {
			expect(snapValue(30, range(0, 100), float(step)), String(step)).toBe(30);
			expect(snapValue(0.25, range(0, 100), float(step)), String(step)).toBe(0.25);
			expect(snapValue(99.5, range(0, 100), float(step)), String(step)).toBe(99.5);
			expect(snapValue(150, range(0, 100), float(step)), String(step)).toBe(100);
			expect(snapValue(-1, range(0, 100), float(step)), String(step)).toBe(0);
		}

		// With the twelve digits which count, and no dust.
		expect(snapValue(0.123456789012345, range(0, 1), float(1e-17))).toBe(0.123456789012);
		expect(snapValue(0.1 + 0.2, range(0, 1), float(1e-17))).toBe(0.3);
		expect(snapValue(33.333333333333336, range(0, 100), float(1e-15))).toBe(33.3333333333);

		// A whole type stays whole.
		expect(snapValue(1234567890123456789.4, range(0, 1e19), whole(1))).toBe(1234567890120000000);
		expect(Number.isInteger(snapValue(5e17 + 0.6, range(0, 1e18), whole(1)))).toBe(true);
	});

	test('up to that many steps the grid holds, however many they are', () => {
		// A range of two thousand million with the step of 1: whole numbers, also on a field which takes decimals.
		expect(snapValue(913578246.913, range(0, 2e9), float(1))).toBe(913578247);
		expect(snapValue(913578246.4, range(0, 2e9), float(1))).toBe(913578246);
		expect(snapValue(1999999999.7, range(0, 2e9), float(1))).toBe(2e9);
		expect(snapValue(913578246.913, range(0, 2e9), whole(1))).toBe(913578247);
		expect(snapValue(5e9 + 0.6, range(0, 1e10), whole(1))).toBe(5000000001);
		expect(snapValue(123456789012.4, range(0, 1e12), whole(1))).toBe(123456789012);
		expect(snapValue(123456789012.4, range(0, 1e12), float(1))).toBe(123456789012);
		expect(snapValue(4999999999.3, range(0, 1e10), float(0.5))).toBe(4999999999.5);

		// The keys keep to it.
		expect(keyValue('ArrowRight', 913578246, range(0, 2e9), float(1))).toBe(913578247);
		expect(keyValue('ArrowLeft', 913578246, range(0, 2e9), float(1))).toBe(913578245);
		expect(keyValue('ArrowRight', 913578246.913, range(0, 2e9), float(1))).toBe(913578247);
		expect(keyValue('ArrowLeft', 913578246.913, range(0, 2e9), float(1))).toBe(913578246);
		expect(keyValue('PageUp', 913578246, range(0, 2e9), float(1))).toBe(913578256);
		expect(keyValue('End', 913578246.913, range(0, 2e9), float(1))).toBe(2e9);

		// Fine steps which were none before: a thousand million and more of them.
		expect(snapValue(0.0000000014, range(0, 1), float(1e-9))).toBe(0.000000001);
		expect(snapValue(0.12345678949, range(0, 100), float(1e-10))).toBe(0.1234567895);
		expect(snapValue(33.333333333333336, range(0, 100), float(1e-10))).toBe(33.3333333333);
		expect(snapValue(0.123456789012345, range(0, 1), float(1e-12))).toBe(0.123456789012);
		expect(snapValue(0.1 + 0.2, range(0, 1), float(1e-12))).toBe(0.3);
		expect(snapValue(30, range(0, 100), float(1e-12))).toBe(30);
		expect(snapValue(150, range(0, 100), float(1e-12))).toBe(100);
	});

	test('a key still moves the value where there is no grid, and lands on an end where there are only two', () => {
		expect(keyValue('ArrowRight', 30, range(0, 100), float(1e-10))).toBe(30.0000000001);
		expect(keyValue('ArrowRight', 0, range(0, 10), float(1e10))).toBe(10);
		expect(keyValue('ArrowLeft', 10, range(0, 10), float(1e10))).toBe(0);
		expect(keyValue('ArrowLeft', 0, range(0, 10), float(1e10))).toBe(0);
	});
});

describe('the colouring which blends towards the next threshold', () => {
	const scale = { color: RED, thresholds: [{ value: 40, color: AMBER }, { value: 80, color: GREEN }] };
	const stops = scaleStops(readOptions(scale));
	const mix = (from: string, share: number, to: string) => `color-mix(in srgb, ${from} ${share}%, ${to})`;

	const drawing = (value: unknown, own: object, count = 0) => {
		const options = readOptions(own);
		return drawingOf(readLook(own), options, readingOf(value, options, EN), count, value);
	};

	test('the two stops around a place, and the share of the way from the first to the second', () => {
		// Between two stops.
		expect(blendAt(stops, 0.2)).toEqual({ from: RED, to: AMBER, share: 0.5 });
		expect(blendAt(stops, 0.1)).toEqual({ from: RED, to: AMBER, share: 0.25 });
		expect(blendAt(stops, 0.6).from).toBe(AMBER);
		expect(blendAt(stops, 0.6).to).toBe(GREEN);
		expect(blendAt(stops, 0.6).share).toBeCloseTo(0.5, 12);
		expect(blendAt(stops, 0.7).share).toBeCloseTo(0.75, 12);

		// Below the first stop, and on it: the first colour.
		expect(blendAt(stops, -0.5)).toEqual({ from: RED, to: RED, share: 0 });
		expect(blendAt(stops, 0)).toEqual({ from: RED, to: RED, share: 0 });

		// On a threshold: its colour, with nothing of the next.
		expect(blendAt(stops, 0.4)).toEqual({ from: AMBER, to: GREEN, share: 0 });

		// On the last stop and beyond it: the last colour.
		expect(blendAt(stops, 0.8)).toEqual({ from: GREEN, to: GREEN, share: 0 });
		expect(blendAt(stops, 1)).toEqual({ from: GREEN, to: GREEN, share: 0 });
		expect(blendAt(stops, 7)).toEqual({ from: GREEN, to: GREEN, share: 0 });

		// One stop, and none.
		expect(blendAt([{ at: 0, color: GREEN }], 0.5)).toEqual({ from: GREEN, to: GREEN, share: 0 });
		expect(blendAt([], 0.5)).toEqual({ from: DEFAULT_COLOR, to: DEFAULT_COLOR, share: 0 });
		expect(blendAt(stops, Number.NaN)).toEqual({ from: RED, to: RED, share: 0 });
	});

	test('a range which does not start at 0: the places are shares of the range', () => {
		// From 20 to 120, with thresholds at 40 and 80: the stops are at 0, 0.2 and 0.6.
		const moved = scaleStops(readOptions({ ...scale, min: 20, max: 120 }));

		expect(blendAt(moved, 0.1)).toEqual({ from: RED, to: AMBER, share: 0.5 });
		expect(blendAt(moved, 0.4).from).toBe(AMBER);
		expect(blendAt(moved, 0.4).share).toBeCloseTo(0.5, 12);

		// 30 is half way from the minimum to the first threshold, 60 half way between the two.
		expect(drawing(30, { ...scale, min: 20, max: 120, activeColoring: 'blend' }).fill.color).toBe(mix(RED, 50, AMBER));
		expect(drawing(60, { ...scale, min: 20, max: 120, activeColoring: 'blend' }).fill.color).toBe(mix(AMBER, 50, GREEN));
		expect(drawing(20, { ...scale, min: 20, max: 120, activeColoring: 'blend' }).fill.color).toBe(RED);
	});

	test('as one colour for CSS, mixed by the browser', () => {
		expect(blendCss({ from: RED, to: AMBER, share: 0.5 })).toBe(mix(RED, 50, AMBER));
		expect(blendCss({ from: RED, to: AMBER, share: 0.25 })).toBe(mix(RED, 75, AMBER));
		expect(blendCss({ from: 'var(--theme--danger)', to: 'var(--theme--warning)', share: 1 / 3 })).toBe(mix('var(--theme--danger)', 66.67, 'var(--theme--warning)'));

		// Nothing to mix.
		expect(blendCss({ from: RED, to: AMBER, share: 0 })).toBe(RED);
		expect(blendCss({ from: RED, to: AMBER, share: 1 })).toBe(AMBER);
		expect(blendCss({ from: RED, to: RED, share: 0.5 })).toBe(RED);
		expect(blendCss({ from: RED, to: AMBER, share: Number.NaN })).toBe(RED);
	});

	test('the fill of the one bar has that one colour, which shifts as the value nears a threshold', () => {
		const own = { ...scale, activeColoring: 'blend' };

		expect(drawing(20, own)).toEqual({ stops: null, weakStops: null, track: { color: null, scale: null }, fill: { color: mix(RED, 50, AMBER), scale: null }, pieces: null });
		expect(drawing(30, own).fill.color).toBe(mix(RED, 25, AMBER));
		expect(drawing(39, own).fill.color).toBe(mix(RED, 2.5, AMBER));
		expect(drawing(40, own).fill.color).toBe(AMBER);
		expect(drawing(60, own).fill.color).toBe(mix(AMBER, 50, GREEN));
		expect(drawing(80, own).fill.color).toBe(GREEN);
		expect(drawing(100, own).fill.color).toBe(GREEN);
		expect(drawing(0, own).fill.color).toBe(RED);

		// Where `value` jumps at the threshold.
		expect(drawing(39, scale).fill.color).toBe(RED);
		expect(drawing(40, scale).fill.color).toBe(AMBER);
	});

	test('a value beyond the range is at its own place, where a threshold may still be', () => {
		const own = { color: RED, thresholds: [{ value: 200, color: GREEN }], activeColoring: 'blend' };

		expect(drawing(100, own).fill.color).toBe(mix(RED, 50, GREEN));
		expect(drawing(150, own).fill.color).toBe(mix(RED, 25, GREEN));
		expect(drawing(250, own).fill.color).toBe(GREEN);
		expect(drawing(-50, own).fill.color).toBe(RED);

		// Without the value itself, the place is where the fill ends.
		const options = readOptions(own);
		expect(drawingOf(readLook(own), options, readingOf(150, options, EN)).fill.color).toBe(mix(RED, 50, GREEN));
	});

	test('every filled piece has that same colour', () => {
		const pieces = drawing(60, { ...scale, activeColoring: 'blend' }, 10).pieces!;

		expect(pieces.filter((piece) => piece.filled)).toHaveLength(6);
		expect(pieces.slice(0, 6).map((piece) => piece.paint)).toEqual(Array(6).fill({ color: mix(AMBER, 50, GREEN), scale: null }));
		expect(pieces.slice(6).map((piece) => piece.paint)).toEqual(Array(4).fill({ color: null, scale: null }));
		expect(drawing(60, { ...scale, activeColoring: 'blend' }, 10).stops).toBeNull();
	});

	test('for what is not filled it is that colour, faded; automatic follows it', () => {
		const faded = fadedColor(mix(AMBER, 50, GREEN));

		expect(drawing(60, { ...scale, activeColoring: 'blend', inactiveColoring: 'automatic' }).track).toEqual({ color: faded, scale: null });
		expect(drawing(60, { ...scale, inactiveColoring: 'blend' }).track).toEqual({ color: faded, scale: null });
		expect(drawing(60, { ...scale, inactiveColoring: 'blend' }).fill).toEqual({ color: AMBER, scale: null });
		expect(drawing(60, { ...scale, activeColoring: 'blend', inactiveColoring: 'plain' }).track).toEqual({ color: null, scale: null });

		const pieces = drawing(60, { ...scale, activeColoring: 'blend', inactiveColoring: 'automatic' }, 10).pieces!;
		expect(pieces.slice(6).map((piece) => piece.paint)).toEqual(Array(4).fill({ color: faded, scale: null }));

		// Each on its own: a gradient over a faded blend, and a blend over faded steps.
		expect(drawing(60, { ...scale, activeColoring: 'gradient', inactiveColoring: 'blend' }).track).toEqual({ color: faded, scale: null });
		expect(drawing(60, { ...scale, activeColoring: 'blend', inactiveColoring: 'steps' }).track).toEqual({ color: null, scale: 'weak' });
	});

	test('without thresholds it is the colour of the value, and no value has no colour', () => {
		expect(drawing(60, { color: GREEN, activeColoring: 'blend', inactiveColoring: 'automatic' })).toEqual(drawing(60, { color: GREEN, activeColoring: 'value', inactiveColoring: 'automatic' }));
		expect(drawing(60, { activeColoring: 'blend' }).fill).toEqual({ color: DEFAULT_COLOR, scale: null });
		expect(drawing(null, { ...scale, activeColoring: 'blend', inactiveColoring: 'automatic' })).toEqual({ stops: null, weakStops: null, track: { color: null, scale: null }, fill: { color: null, scale: null }, pieces: null });
	});
});
