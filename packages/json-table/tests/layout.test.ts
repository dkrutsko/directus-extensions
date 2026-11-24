import { describe, expect, test } from 'vitest';
import { PIN_SHARE, fitPins, snugColumns, truncateText } from '../src/table';

describe('truncateText', () => {
	test('short text is kept', () => {
		expect(truncateText('abc', 5)).toBe('abc');
		expect(truncateText('abcde', 5)).toBe('abcde');
	});

	test('long text ends in three dots and is never longer than the limit', () => {
		expect(truncateText('abcdefgh', 5)).toBe('ab...');
	});

	test('a surrogate pair is never split', () => {
		expect(truncateText('ab\u{1F680}defgh', 6)).toBe('ab...');
	});
});

describe('fitPins', () => {
	test('one pin sits at its edge', () => {
		expect(fitPins([200], [], 900)).toEqual({ start: [0], end: [] });
	});

	test('each pin sits after the ones before it', () => {
		expect(fitPins([200, 40, 40], [], 900)).toEqual({ start: [0, 200, 240], end: [] });
	});

	test('both edges are pinned, taking turns', () => {
		expect(fitPins([200], [60], 900)).toEqual({ start: [0], end: [0] });
		expect(fitPins([100, 100], [50, 50], 900)).toEqual({ start: [0, 100], end: [0, 50] });
	});

	test('pins never cover more than their share of the room', () => {
		expect(PIN_SHARE).toBeLessThan(1);
		expect(fitPins([200, 300, 40], [60], 600)).toEqual({ start: [0], end: [0] });
	});

	test('an edge stops at its first pin which does not fit', () => {
		expect(fitPins([300, 10], [200], 600)).toEqual({ start: [0, 300], end: [] });
	});

	test('nothing is pinned without room', () => {
		expect(fitPins([200], [60], 0)).toEqual({ start: [], end: [] });
	});
});

describe('snugColumns', () => {
	test('the first column is snug, whatever is pinned', () => {
		expect(snugColumns(4, 0, 0)).toEqual([true, false, false, false]);
		expect(snugColumns(4, 1, 0)).toEqual([true, false, false, false]);
	});

	test('pinned columns are snug at both edges', () => {
		expect(snugColumns(6, 1, 1)).toEqual([true, false, false, false, false, true]);
		expect(snugColumns(6, 2, 2)).toEqual([true, true, false, false, true, true]);
		expect(snugColumns(6, 0, 1)).toEqual([true, false, false, false, false, true]);
	});

	test('a column is always left to take the extra width', () => {
		expect(snugColumns(2, 1, 1)).toEqual([true, false]);
		expect(snugColumns(2, 0, 1)).toEqual([true, false]);
		expect(snugColumns(4, 2, 2)).toEqual([true, false, false, false]);
		expect(snugColumns(3, 1, 1)).toEqual([true, false, true]);
	});

	test('a table without columns has none', () => {
		expect(snugColumns(0, 1, 1)).toEqual([]);
		expect(snugColumns(1, 1, 0)).toEqual([true]);
	});
});
