import { describe, expect, it } from 'vitest';
import { ALL_ITEMS, EDIT_PAGE_SIZE, itemOf, keyOf, type Mount, mountOf, pageSize, toPageSize } from '../src/page-size';

describe('toPageSize', () => {
	it('keeps a whole number from 1 up', () => {
		expect(toPageSize(1, 15)).toBe(1);
		expect(toPageSize(15, -1)).toBe(15);
		expect(toPageSize(500, 15)).toBe(500);
	});

	it('reads the text of a whole number, with spaces around it', () => {
		expect(toPageSize('5', 15)).toBe(5);
		expect(toPageSize(' 7 ', 15)).toBe(7);
		expect(toPageSize('25\n', 15)).toBe(25);
	});

	it('reads text as a number as a whole, not as far as it makes sense', () => {
		// parseInt would make 1 and 15 of these.
		expect(toPageSize('1e1', 15)).toBe(10);
		expect(toPageSize('15abc', -1)).toBe(-1);
		expect(toPageSize('5 items', 15)).toBe(15);
	});

	it('falls back for nothing, zero and negative numbers', () => {
		expect(toPageSize(undefined, 15)).toBe(15);
		expect(toPageSize(null, 15)).toBe(15);
		expect(toPageSize(0, 15)).toBe(15);
		expect(toPageSize(-1, 15)).toBe(15);
		expect(toPageSize('-1', 15)).toBe(15);
		expect(toPageSize('0', -1)).toBe(-1);
	});

	it('falls back for a number which is not whole', () => {
		expect(toPageSize(2.7, 15)).toBe(15);
		expect(toPageSize('2.7', -1)).toBe(-1);
		expect(toPageSize(0.5, 15)).toBe(15);
	});

	it('falls back for a number nothing can count to', () => {
		expect(toPageSize(Number.NaN, 15)).toBe(15);
		expect(toPageSize(Number.POSITIVE_INFINITY, 15)).toBe(15);
		expect(toPageSize('Infinity', 15)).toBe(15);
		expect(toPageSize(2 ** 60, 15)).toBe(15);
	});

	it('falls back for text which is no number, and for empty text', () => {
		expect(toPageSize('abc', 15)).toBe(15);
		expect(toPageSize('', 15)).toBe(15);
		expect(toPageSize('   ', -1)).toBe(-1);
	});

	it('falls back for anything which is neither a number nor text', () => {
		// Number(true) is 1 and Number([5]) is 5: neither is a page size someone set.
		expect(toPageSize(true, 15)).toBe(15);
		expect(toPageSize(false, 15)).toBe(15);
		expect(toPageSize([5], 15)).toBe(15);
		expect(toPageSize({ limit: 5 }, -1)).toBe(-1);
	});
});

describe('pageSize', () => {
	it('is Per Page while editing, whatever the view-only option says', () => {
		expect(pageSize(false, 20, 5)).toBe(20);
		expect(pageSize(false, '20', -1)).toBe(20);
	});

	it('is the view-only option while view-only, whatever Per Page says', () => {
		expect(pageSize(true, 20, 5)).toBe(5);
		expect(pageSize(true, 20, '7')).toBe(7);
	});

	it('falls back to the stock default while editing, and never to "all"', () => {
		expect(EDIT_PAGE_SIZE).toBe(15);

		// A page size of -1 while editing is what crashed the stock pagination before 1.0.2.
		for (const limit of [undefined, null, 0, -1, '-1', 'abc', 2.5]) expect(pageSize(false, limit, -1)).toBe(15);
	});

	it('falls back to all items while view-only', () => {
		expect(ALL_ITEMS).toBe(-1);
		for (const viewLimit of [undefined, null, 0, -1, -5, 'abc', '', 2.5]) expect(pageSize(true, 15, viewLimit)).toBe(-1);
	});
});

describe('itemOf', () => {
	it('tells one primary key from another, and one content version from another', () => {
		expect(itemOf(1, null)).not.toBe(itemOf(2, null));
		expect(itemOf(1, null)).not.toBe(itemOf(1, { key: 'draft' }));
		expect(itemOf(1, { key: 'draft' })).not.toBe(itemOf(1, { key: 'review' }));
		expect(itemOf('+', null)).not.toBe(itemOf(1, null));
	});

	it('is the same for the same item, whatever else the version holds', () => {
		expect(itemOf(7, null)).toBe(itemOf(7, null));
		expect(itemOf(7, undefined)).toBe(itemOf(7, null));

		// A version gets its id with its first save, and a new object with every load of the versions.
		expect(itemOf(7, { id: '+', key: 'draft', name: null })).toBe(itemOf(7, { id: 'a1b2', key: 'draft', name: 'Draft' }));
	});

	it('takes a primary key as number and as text for the same', () => {
		expect(itemOf(7, null)).toBe(itemOf('7', null));
	});

	it('does not mix up the primary key and the key of the version', () => {
		expect(itemOf('a', { key: 'b' })).not.toBe(itemOf('a","b', null));
		expect(itemOf('a b', null)).not.toBe(itemOf('a', { key: 'b' }));
		expect(itemOf('', { key: 'a' })).not.toBe(itemOf('a', null));
	});

	it('is the same for everything which has no key', () => {
		expect(itemOf(undefined, null)).toBe(itemOf(null, undefined));
		expect(itemOf(1, 'draft')).toBe(itemOf(1, null));
		expect(itemOf(1, {})).toBe(itemOf(1, null));
	});
});

describe('mountOf', () => {
	const editing: Mount = { viewOnly: false, item: itemOf(1, null) };
	const viewing: Mount = { viewOnly: true, item: itemOf(1, null) };

	// What the item page hands out while it loads: every field disabled, and the primary key "+".
	const loading: Mount = { viewOnly: true, item: itemOf('+', null) };

	it('is not known while the form loads for the first time', () => {
		expect(mountOf(true, loading, null)).toBeNull();
		expect(mountOf(true, editing, null)).toBeNull();
	});

	it('is what the field says once the form has loaded', () => {
		expect(mountOf(false, viewing, null)).toEqual(viewing);
		expect(mountOf(false, editing, null)).toEqual(editing);
	});

	it('holds through a later load, which disables the field and takes its primary key away', () => {
		expect(mountOf(true, loading, editing)).toEqual(editing);
		expect(mountOf(true, loading, viewing)).toEqual(viewing);
	});

	it('follows the field when it changes while nothing loads', () => {
		expect(mountOf(false, viewing, editing)).toEqual(viewing);
		expect(mountOf(false, editing, viewing)).toEqual(editing);
	});

	it('follows the form to another item once that has loaded', () => {
		const other: Mount = { viewOnly: false, item: itemOf(2, null) };

		expect(mountOf(true, loading, editing)).toEqual(editing);
		expect(mountOf(false, other, editing)).toEqual(other);
	});
});

describe('keyOf', () => {
	const key = (viewOnly: boolean, primaryKey: unknown, version: unknown = null) => keyOf({ viewOnly, item: itemOf(primaryKey, version) });

	it('stays the same through a save: the same mode and the same item', () => {
		expect(key(false, 1)).toBe(key(false, '1'));
		expect(key(true, 1, { id: '+', key: 'draft' })).toBe(key(true, 1, { id: 'a1b2', key: 'draft' }));
	});

	it('changes with the mode', () => {
		expect(key(false, 1)).not.toBe(key(true, 1));
	});

	it('changes with the item and with the content version', () => {
		expect(key(false, 1)).not.toBe(key(false, 2));
		expect(key(false, 1)).not.toBe(key(false, 1, { key: 'draft' }));
		expect(key(false, '+')).not.toBe(key(false, 1));
	});
});
