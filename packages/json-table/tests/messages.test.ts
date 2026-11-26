import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MAX_UNPACKED_BYTES } from '../src/table';
import { pack, packed, plain, problem } from './helpers';
import type { Json } from './helpers';

/**
 * The messages of docs/format.md, "Invalid values". People search that table
 * for what their field says, so every message in it is produced here by a
 * value which breaks the format in that way, word for word, and every message
 * written there has a value here. A message which is reworded in table.ts, or
 * a line of the table which was guessed, fails one of the two.
 */
const FORMAT = readFileSync(new URL('../docs/format.md', import.meta.url), 'utf8');

/** The messages written in the tables of the section, in the order they are written. */
function documented(): string[] {
	const section = FORMAT.slice(FORMAT.indexOf('## Invalid values'), FORMAT.indexOf('## Writing the value'));
	const rows = section.split('\n').filter((line) => line.startsWith('| `'));

	return rows.flatMap((row) => [...row.split(' | ')[0]!.matchAll(/`([^`]+)`/g)].map((match) => match[1]!));
}

// The examples of the document name the third cell of the fifth row.
const at = (entry: unknown, shared: Json = {}): Json =>
	plain({ shared: { stack: { text: ['a', 'b'] }, ...shared }, columns: [{}, {}, {}], rows: [...Array<unknown[]>(4).fill([{}, {}, {}]), [{}, {}, entry]] });

const gzip = (data: unknown): Json => ({ version: 1, encoding: 'gzip', data });

// Forty shared cells which each use the next, the first of them named "a".
const CHAIN = Object.fromEntries(Array.from({ length: 40 }, (_, index) => [index === 0 ? 'a' : `n${index}`, index === 39 ? {} : { use: `n${index + 1}` }]));

// 200 cells of 10 parts in a row are 2,000 parts, so the first cell of the 51st row is the one which goes over 100,000.
const TEN = { text: Array<string>(10).fill('a') };
const PARTS = plain({ shared: { ten: TEN }, columns: Array<Json>(200).fill({}), rows: Array<string[]>(51).fill(Array<string>(200).fill('ten')) });

const CASES: [message: string, value: unknown][] = [
	['The value is not valid JSON', '{'],
	['The value must be an object', [1]],
	['version "2" is not supported, expected 1', { version: 2, data: {} }],
	['version must be 1', { data: {} }],
	['data must be an object', { version: 1 }],
	['data is text, which needs "encoding": "gzip"', { version: 1, data: 'H4sIAAAAAAAA' }],
	['encoding "zstd" is not supported, expected "gzip" or none', { version: 1, encoding: 'zstd', data: '' }],
	['encoding must be "gzip" or left out', { version: 1, encoding: 1, data: '' }],
	['data must be a base64 string when encoding is "gzip"', gzip({})],
	['data is larger than 8 MB', gzip('A'.repeat(MAX_UNPACKED_BYTES + 4))],
	['data is not valid base64', gzip('!!!!')],
	['data is not valid gzip', gzip('AAAA')],
	['data does not unpack to UTF-8 text', gzip(pack(new Uint8Array([0xff, 0xfe, 0xfd])))],
	['data unpacks to more than 8 MB', gzip(pack(' '.repeat(MAX_UNPACKED_BYTES + 1)))],
	['data does not unpack to valid JSON', gzip(pack('{'))],
	['data must unpack to an object', gzip(pack('[1]'))],
	['columns must be an array', plain({ rows: [] })],
	['rows must be an array', plain({ columns: [] })],
	['legend must be an array', plain({ columns: [], rows: [], legend: 'gains' })],
	['shared must be an object', plain({ columns: [], rows: [], shared: [] })],
	['rows[4] must be an array of cells', plain({ columns: [{}, {}], rows: [...Array<unknown[]>(4).fill([{}, {}]), 'a row'] })],
	['rows[4] has 5 cells but there are 6 columns', plain({ columns: Array<Json>(6).fill({}), rows: [[{}], [{}], [{}], [{}], Array<Json>(5).fill({})] })],
	['columns has 201 cells, and a table can have at most 200 columns', plain({ columns: Array<Json>(201).fill({}), rows: [] })],
	['rows has 1001 rows, and a table can have at most 1000', plain({ columns: [{}], rows: Array<Json[]>(1001).fill([{}]) })],
	['legend has 201 entries, and a table can have at most 200', plain({ columns: [{}], rows: [], legend: Array<Json>(201).fill({}) })],
	['rows[50][0] brings the parts of all cells to more than 100000, the most a table can have', PARTS],
	['rows[4][2] must be an object or the name of a shared cell', at(5)],
	['rows[4][2] is "gained", which is not a name in shared', at('gained')],
	['rows[4][2].use must be the name of a shared cell', at({ use: 1 })],
	['rows[4][2].use is "gained", which is not a name in shared', at({ use: 'gained' })],
	['shared["total"] must be an object', at({}, { total: 'bold' })],
	['shared["total"] uses itself: "total" > "plus" > "total"', at({}, { total: { use: 'plus' }, plus: { use: 'total' } })],
	['shared["a"] starts a chain of more than 32 shared cells, each using the next', at({}, CHAIN)],
	['rows[4][2].text must be a string, a number or a list of parts', at({ text: true })],
	['rows[4][2].text[1].text must be a string or a number', at({ text: ['a', { text: true }] })],
	['rows[4][2].text[1].text must be a string or a number: a part cannot hold parts', at({ text: ['a', { text: ['b'] }] })],
	['rows[4][2].text[1] must be text, a number or an object', at({ text: ['a', true] })],
	['rows[4][2].text has 11 parts, and a cell can have at most 10', at({ text: Array<string>(11).fill('a') })],
	['rows[4][2].text[1].use is "stack", which has parts, and a part cannot hold parts', at({ text: ['a', { use: 'stack' }] })],
	['rows[4][2].color "red" must be a hex colour such as #E35169 or a theme variable such as var(--theme--success)', at({ color: 'red' })],
	['rows[4][2].color must be a string', at({ color: 1 })],
	['rows[4][2].icon must be a string', at({ icon: 1 })],
	['rows[4][2].tip must be a string', at({ tip: 1 })],
	['rows[4][2].weight must be a number from 1 to 1000', at({ weight: 0 })],
	['rows[4][2].italic must be true or false', at({ italic: 'yes' })],
	['rows[4][2].break must be true or false', at({ break: 'yes' })],
	['rows[4][2].link must be an object', at({ link: 'people/1' })],
	['rows[4][2].link.collection must be a non-empty string', at({ link: { id: '1' } })],
	['rows[4][2].link.id must be a non-empty string', at({ link: { collection: 'people', id: 1 } })],
];

// Node can unpack, so the browser which cannot is one without the stream.
const NO_STREAM = 'This browser cannot unpack a compressed table';

describe('the messages of docs/format.md', () => {
	afterEach(() => vi.unstubAllGlobals());

	test.each(CASES)('%s', async (message, value) => {
		expect(await problem(value)).toBe(message);
	});

	test(NO_STREAM, async () => {
		vi.stubGlobal('DecompressionStream', undefined);

		expect(await problem(packed({ columns: [], rows: [] }))).toBe(NO_STREAM);
	});

	test('every message written in the document is one of them, and each of them is written there', () => {
		const tried = [...CASES.map(([message]) => message), NO_STREAM];

		expect(documented().length).toBeGreaterThan(40);
		expect([...documented()].sort()).toEqual([...tried].sort());
	});

	test('the document says what a failure of the interface itself reads', () => {
		expect(FORMAT).toContain('`Unexpected error`');
	});
});
