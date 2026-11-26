import { gzipSync } from 'node:zlib';
import { describe, expect, test } from 'vitest';
import { MAX_UNPACKED_BYTES, parseValue } from '../src/table';
import { example, pack, packed, parse, plain, problem, valid } from './helpers';

const EMPTY_TABLE = { columns: [], rows: [] };

describe('a field without a table', () => {
	test('null and undefined are empty, not invalid', () => {
		expect(parseValue(null)).toEqual({ kind: 'empty' });
		expect(parseValue(undefined)).toEqual({ kind: 'empty' });
	});

	test('the text "null" is empty too, for databases which hand JSON back as text', () => {
		expect(parseValue('null')).toEqual({ kind: 'empty' });
	});

	test('anything which is not an object is rejected', async () => {
		expect(await problem([])).toBe('The value must be an object');
		expect(await problem(7)).toBe('The value must be an object');
		expect(await problem('nope')).toBe('The value is not valid JSON');
		expect(await problem('"text"')).toBe('The value must be an object');
	});
});

describe('the wrapper around the table', () => {
	test('a value handed back as text is parsed', async () => {
		expect((await parse(JSON.stringify(example('access-review')))).kind).toBe('valid');
	});

	test('the version must be 1', async () => {
		expect(await problem({ version: 2, data: EMPTY_TABLE })).toBe('version "2" is not supported, expected 1');
		expect(await problem({ version: '1', data: EMPTY_TABLE })).toBe('version "1" is not supported, expected 1');
		expect(await problem({ data: EMPTY_TABLE })).toBe('version must be 1');
		expect(await problem({ version: null, data: EMPTY_TABLE })).toBe('version must be 1');
	});

	test('without an encoding, data is the table', async () => {
		expect((await parse({ version: 1, data: EMPTY_TABLE })).kind).toBe('valid');
		expect((await parse({ version: 1, encoding: null, data: EMPTY_TABLE })).kind).toBe('valid');
		expect(await problem({ version: 1 })).toBe('data must be an object');
		expect(await problem({ version: 1, data: [] })).toBe('data must be an object');
	});

	test('a table at the top level, without the wrapper, is rejected', async () => {
		expect(await problem({ version: 1, ...EMPTY_TABLE })).toBe('data must be an object');
	});

	test('text in data needs an encoding, and an encoding needs text', async () => {
		expect(await problem({ version: 1, data: pack('{}') })).toBe('data is text, which needs "encoding": "gzip"');
		expect(await problem({ version: 1, encoding: 'gzip', data: EMPTY_TABLE })).toBe('data must be a base64 string when encoding is "gzip"');
	});

	test('gzip is the only encoding', async () => {
		expect(await problem({ version: 1, encoding: 'zstd', data: 'AAAA' })).toBe('encoding "zstd" is not supported, expected "gzip" or none');
		expect(await problem({ version: 1, encoding: 1, data: 'AAAA' })).toBe('encoding must be "gzip" or left out');
	});

	test('fields which are not part of the format are ignored and dropped', async () => {
		const table = await valid({
			version: 1,
			computedAt: '2026-11-01T14:00:00Z',
			data: { sourceHash: 'abc', columns: [{ text: 'Name', note: 'x' }], rows: [] },
		});

		expect(Object.keys(table).sort()).toEqual(['columns', 'legend', 'rows']);
		expect(table.columns[0]).toEqual({ text: 'Name' });
	});
});

describe('a compressed table', () => {
	test('a table which is not compressed is checked at once, a compressed one in a promise', () => {
		expect(parseValue(example('access-review'))).not.toBeInstanceOf(Promise);
		expect(parseValue(example('compressed'))).toBeInstanceOf(Promise);
	});

	test('unpacks to the same table', async () => {
		const whole = example('access-review');

		expect(await valid(packed(whole.data))).toEqual(await valid(whole));
		expect(await valid(example('compressed'))).toEqual(await valid(whole));
	});

	test('the URL-safe base64 alphabet is accepted', async () => {
		// Padded with spaces until the base64 has both of the characters which differ.
		let text = JSON.stringify(example('access-review').data);
		while (!(pack(text).includes('+') && pack(text).includes('/'))) text += ' ';

		const data = pack(text).replace(/\+/g, '-').replace(/\//g, '_');

		expect((await parse({ version: 1, encoding: 'gzip', data })).kind).toBe('valid');
	});

	test('each step which fails has its own message', async () => {
		const value = (data: string) => ({ version: 1, encoding: 'gzip', data });
		const whole = Buffer.from(pack(JSON.stringify(example('access-review').data)), 'base64');

		expect(await problem(value('This is not base64!'))).toBe('data is not valid base64');
		expect(await problem(value(whole.subarray(0, 60).toString('base64')))).toBe('data is not valid gzip');
		expect(await problem(value(Buffer.concat([whole, Buffer.from('more')]).toString('base64')))).toBe('data is not valid gzip');
		expect(await problem(value(pack('nope')))).toBe('data does not unpack to valid JSON');
		expect(await problem(value(pack('[]')))).toBe('data must unpack to an object');
	});

	test('gzip which is whole but does not hold UTF-8 text is not called bad gzip', async () => {
		const value = (bytes: number[]) => ({ version: 1, encoding: 'gzip', data: gzipSync(Buffer.from(bytes)).toString('base64') });

		// A byte which no UTF-8 text has, and a character which is cut off at the end.
		expect(await problem(value([0x7b, 0xff, 0xfe, 0x7d]))).toBe('data does not unpack to UTF-8 text');
		expect(await problem(value([0x7b, 0x7d, 0xe2, 0x82]))).toBe('data does not unpack to UTF-8 text');
	});

	test('the table which comes out goes through the same checks', async () => {
		expect(await problem(packed({ columns: [{ color: 'red' }], rows: [] }))).toContain('columns[0].color "red" must be a hex colour');
	});

	test('unpacking stops at the limit, so a few bytes cannot fill the memory', async () => {
		// A valid table followed by 9 MB of spaces, which gzip packs into a few KB.
		const bomb = pack(JSON.stringify(EMPTY_TABLE) + ' '.repeat(9 * 1024 * 1024));

		expect(bomb.length).toBeLessThan(20_000);
		expect(await problem({ version: 1, encoding: 'gzip', data: bomb })).toBe('data unpacks to more than 8 MB');
	});

	test('text which is too long is rejected before it is decoded', async () => {
		expect(await problem({ version: 1, encoding: 'gzip', data: 'A'.repeat(MAX_UNPACKED_BYTES + 1) })).toBe('data is larger than 8 MB');
	});

	test('a plain table is the same whether or not it says so', async () => {
		const whole = example('access-review');

		expect(await valid({ ...whole, encoding: null })).toEqual(await valid(plain(whole.data)));
	});
});
