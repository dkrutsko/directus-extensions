import { describe, expect, test } from 'vitest';
import { MAX_PARTS, MAX_TEXT_LENGTH, linkTarget } from '../src/table';
import type { Table } from '../src/table';
import { HOSTILE, hostile, plain, valid } from './helpers';

/** Every piece of the table: the cells, and the pieces of those with several. */
function pieces(table: Table) {
	const cells = [...table.columns, ...table.rows.flat(), ...table.legend];
	return cells.flatMap((entry) => [entry, ...(entry.lines ?? []).flat()]);
}

describe('a table full of hostile text', () => {
	test('is valid: the text is data, not a reason to refuse', async () => {
		const table = await valid(plain(hostile()));

		expect(table.columns).toHaveLength(18);
		expect(table.rows).toHaveLength(20);
	});

	test('markup and template syntax are kept as text', async () => {
		const table = await valid(plain(hostile()));

		expect(table.columns[HOSTILE.markup]!.text).toBe('<script>alert("table")</script>');
		expect(table.columns[HOSTILE.lines]!.lines![1]![0]!.text).toMatch(/^<img /);
		expect(table.columns[3]!.text).toMatch(/^\{\{ constructor/);
	});

	test('every text and tip is cut to the limit and free of control characters', async () => {
		const texts = pieces(await valid(plain(hostile()))).flatMap((piece) => [piece.text, piece.tip].filter((text) => text !== undefined));

		expect(texts.length).toBeGreaterThan(300);
		expect(texts.every((text) => text.length <= MAX_TEXT_LENGTH)).toBe(true);
		expect(texts.some((text) => /[\u0000-\u001F\u007F-\u009F\u061C\u200E\u200F\u2028-\u202E\u2066-\u2069]/.test(text))).toBe(false);
	});

	test('marks without a glyph are gone, and the separators are spaces', async () => {
		const table = await valid(plain(hostile()));

		expect(table.columns[HOSTILE.marks]!.text).toBe('leftrightarabicline paragraph end');
		expect(table.columns[HOSTILE.marks]!.tip).toBe('leftrightarabicline paragraph end');
	});

	test('a line break in text cannot start a line', async () => {
		const table = await valid(plain(hostile()));

		expect(table.columns[HOSTILE.lines]!.lines![2]![0]!.text).toBe('line one line two');
	});

	test('icon names which are not icon names are dropped', async () => {
		const table = await valid(plain(hostile()));

		for (const index of HOSTILE.badIcons) expect(table.columns[index]!.icon).toBeUndefined();
	});

	test('nothing but the two colour forms is in any colour', async () => {
		const table = await valid(plain(hostile()));
		const colours = pieces(table).flatMap((piece) => [piece.color, 'background' in piece ? piece.background : undefined]);

		for (const colour of colours) {
			if (colour !== undefined) expect(colour).toMatch(/^(#[0-9a-f]{3,8}|var\(--theme--[a-z-]+\))$/i);
		}
	});

	test('parts are laid out as written', async () => {
		const table = await valid(plain(hostile()));

		expect(table.columns[HOSTILE.mostParts]!.lines).toHaveLength(MAX_PARTS);
		expect(table.columns[HOSTILE.sideBySide]!.lines!.map((line) => line.length)).toEqual([3, 2]);
	});

	test('shared names which every object has are only names', async () => {
		const table = await valid(plain(hostile()));

		expect(table.rows[1]![2]!.icon).toBe('remove_circle');
		expect(table.rows[1]![3]!.icon).toBeUndefined();
		expect(table.legend[2]!.color).toBe('var(--theme--danger)');
	});
});

describe('linkTarget', () => {
	test('an ordinary id is kept as it is, odd characters included', async () => {
		const table = await valid(plain(hostile()));

		expect(linkTarget(table.columns[HOSTILE.oddId]!.link!)).toEqual({ collection: 'people', id: '../../users?x=1#y' });
	});

	test('the id of the form for a new item is never linked, and neither are dot segments', async () => {
		const table = await valid(plain(hostile()));

		expect(linkTarget(table.columns[HOSTILE.createId]!.link!)).toBeNull();
		expect(linkTarget({ collection: 'people', id: '.' })).toBeNull();
		expect(linkTarget({ collection: 'people', id: '..' })).toBeNull();
	});
});
