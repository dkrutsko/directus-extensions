import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, test } from 'vitest';
import { MAX_COLUMNS, MAX_LEGEND, MAX_PARTS, MAX_ROWS, MAX_TABLE_PARTS } from '../src/table';
import { accessReview, example, hostile, pack, packed, parse, plain } from './helpers';

/**
 * `docs/schema.json` is for people who write values in other languages. It
 * can only check the structure, so it is allowed to accept a value which the
 * interface rejects (a row of the wrong length, a name which is not shared).
 * It must never be the other way round, and it must agree on everything it
 * does check.
 */
const schema = JSON.parse(readFileSync(new URL('../docs/schema.json', import.meta.url), 'utf8'));
const accepts = new Ajv2020({ allErrors: true, allowUnionTypes: true }).compile(schema);

const EMPTY_TABLE = { columns: [], rows: [] };

describe('docs/schema.json', () => {
	test('is a valid schema and accepts an empty field', () => {
		expect(accepts(null)).toBe(true);
	});

	test.each(['access-review', 'status-board', 'compressed'])('accepts examples/%s.json', (name) => {
		expect(accepts(example(name)), JSON.stringify(accepts.errors)).toBe(true);
	});

	test('accepts generated tables, the largest one and the hostile one', () => {
		expect(accepts(plain(accessReview(1, 20, 50, 5)))).toBe(true);
		expect(accepts(plain(accessReview(5, MAX_COLUMNS - 2, MAX_ROWS - 11, 10, true)))).toBe(true);
		expect(accepts(packed(accessReview(2, 100, 200)))).toBe(true);
		expect(accepts(plain(hostile())), JSON.stringify(accepts.errors)).toBe(true);
	});

	test('accepts every way of leaving a field out', () => {
		const most = { use: null, text: null, icon: null, color: null, weight: null, italic: null, tip: null, link: null, break: null };
		const value = plain({ shared: null, legend: null, columns: [{ ...most, background: null }, { text: [most] }], rows: [] });

		expect(accepts(JSON.parse(JSON.stringify(value))), JSON.stringify(accepts.errors)).toBe(true);
	});

	// What the schema rejects, the interface rejects too.
	const cells = (entry: unknown) => plain({ columns: [entry], rows: [] });
	const columns = (count: number) => Array.from({ length: count }, () => ({}));

	test.each<[string, unknown]>([
		['another version', { version: 2, data: EMPTY_TABLE }],
		['no version', { data: EMPTY_TABLE }],
		['a table at the top level', { version: 1, ...EMPTY_TABLE }],
		['an unknown encoding', { version: 1, encoding: 'zstd', data: 'AAAA' }],
		['text without an encoding', { version: 1, data: pack('{}') }],
		['an encoding without text', { version: 1, encoding: 'gzip', data: EMPTY_TABLE }],
		['a table without rows', plain({ columns: [] })],
		['a row which is not a list', plain({ columns: [{}], rows: [{}] })],
		['a cell which is a number', cells(42)],
		['a colour name', cells({ color: 'red' })],
		['a colour which carries more CSS', cells({ background: '#fff;position:fixed' })],
		['a fallback inside var()', cells({ color: 'var(--theme--success, red)' })],
		['a weight of zero', cells({ weight: 0 })],
		['a weight in words', cells({ weight: 'bold' })],
		['italic in words', cells({ italic: 'yes' })],
		['break in words', cells({ break: 'yes' })],
		['text which is neither text nor a number', cells({ text: true })],
		['a part which holds parts', cells({ text: [{ text: ['x'] }] })],
		['a part which is neither text nor an object', cells({ text: ['a', true] })],
		['a link without an id', cells({ link: { collection: 'people' } })],
		['a link as text', cells({ link: 'people/1' })],
		['a shared cell which is a name', plain({ shared: { a: 'b' }, columns: [], rows: [] })],
		['one column too many', plain({ columns: columns(MAX_COLUMNS + 1), rows: [] })],
		['one row too many', plain({ columns: columns(1), rows: Array.from({ length: MAX_ROWS + 1 }, () => [{}]) })],
		['one part too many', cells({ text: Array.from({ length: MAX_PARTS + 1 }, () => 'x') })],
		['one legend entry too many', plain({ columns: [], rows: [], legend: Array.from({ length: MAX_LEGEND + 1 }, () => ({})) })],
	])('rejects %s, as the interface does', async (_name, value) => {
		expect(accepts(value)).toBe(false);
		expect((await parse(value)).kind).toBe('invalid');
	});

	test('accepts a table at every limit it states', () => {
		const table = {
			columns: columns(MAX_COLUMNS),
			rows: Array.from({ length: MAX_ROWS }, () => [{ text: Array.from({ length: MAX_PARTS }, () => 'x') }]),
			legend: Array.from({ length: MAX_LEGEND }, () => ({})),
		};

		expect(accepts(plain(table)), JSON.stringify(accepts.errors)).toBe(true);
	});

	test('states the limits of the validator, and no other', () => {
		const { table, cellObject } = schema.$defs;

		expect(table.properties.columns.maxItems).toBe(MAX_COLUMNS);
		expect(table.properties.rows.maxItems).toBe(MAX_ROWS);
		expect(table.properties.rows.items.maxItems).toBe(MAX_COLUMNS);
		expect(table.properties.legend.maxItems).toBe(MAX_LEGEND);
		expect(cellObject.properties.text.oneOf[1].maxItems).toBe(MAX_PARTS);
		expect(JSON.stringify(schema).match(/"maxItems"/g)).toHaveLength(5);
	});

	test('leaves to the interface what a schema cannot check', async () => {
		const wrongLength = plain({ columns: columns(3), rows: [[{}, {}]] });
		const unknownName = cells('gained');
		const loop = plain({ shared: { a: { use: 'a' } }, columns: [], rows: [] });
		const links = Array.from({ length: 40 }, (_, index) => [`c${index}`, index ? { use: `c${index - 1}` } : {}]);
		const chain = plain({ shared: Object.fromEntries(links), columns: [], rows: [] });
		const pair = { text: ['a', 'b'] };
		const manyParts = plain({ columns: columns(101), rows: Array.from({ length: MAX_TABLE_PARTS / 200 + 1 }, () => columns(101).map(() => pair)) });

		for (const value of [wrongLength, unknownName, loop, chain, manyParts]) {
			expect(accepts(value)).toBe(true);
			expect((await parse(value)).kind).toBe('invalid');
		}
	});
});
