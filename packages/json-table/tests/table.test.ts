import { describe, expect, test } from 'vitest';
import { MAX_COLUMNS, MAX_PARTS, MAX_ROWS } from '../src/table';
import { accessReview, cell, cellProblem, example, packed, plain, problem, valid } from './helpers';

const columns = (count: number) => Array.from({ length: count }, (_, index) => ({ text: `C${index}` }));

describe('the examples', () => {
	test('the access review is 6 columns by 13 rows', async () => {
		const table = await valid(example('access-review'));

		expect(table.columns).toHaveLength(6);
		expect(table.rows).toHaveLength(13);
		expect(table.legend.map((entry) => entry.tip)).toEqual(['Gains', 'Loses', 'Already has', 'Unaffected']);
	});

	test('a shared cell is the cell it names, and every use of the name is the same object', async () => {
		const table = await valid(example('access-review'));
		const gains = table.rows[1]![1];

		expect(gains).toEqual({ icon: 'add_circle', color: 'var(--theme--success)', tip: 'Gains' });
		expect(table.rows[1]![2]).toBe(gains);
		expect(table.legend[0]).toBe(gains);
	});

	test('its totals are cells like any other', async () => {
		const totals = (await valid(example('access-review'))).rows[12]!;
		const plus = { color: 'var(--theme--success)', weight: 600 };
		const minus = { color: 'var(--theme--danger)', weight: 600 };

		// On a line each in the Total row, and side by side in the Total column.
		expect(totals[1]).toEqual({
			lines: [[{ text: '+6', ...plus }], [{ text: '-1', ...minus }]],
			background: 'var(--theme--background-subdued)',
		});
		expect(totals[5]!.lines).toEqual([[{ text: '+21', ...plus }, { text: '-2', ...minus }]]);
		expect(totals[3]).toEqual({ text: '+5', ...plus, background: 'var(--theme--background-subdued)' });
	});

	test('the status board is 6 columns by 8 rows', async () => {
		const table = await valid(example('status-board'));

		expect(table.columns).toHaveLength(6);
		expect(table.rows).toHaveLength(8);
		expect(table.rows[0]).toEqual([{ text: 'Public', icon: 'public' }]);
		expect(table.rows[3]![4]!.lines).toEqual([[{ text: '2.4.0', weight: 600 }, { text: 'beta', color: '#6644FF' }]]);
	});
});

describe('columns, rows and the legend', () => {
	test('columns and rows are required, the legend and shared are not', async () => {
		expect(await problem(plain({ rows: [] }))).toBe('columns must be an array');
		expect(await problem(plain({ columns: [] }))).toBe('rows must be an array');
		expect(await problem(plain({ columns: [], rows: [], legend: {} }))).toBe('legend must be an array');
		expect(await problem(plain({ columns: [], rows: [], shared: [] }))).toBe('shared must be an object');
		expect((await valid(plain({ columns: [], rows: [], legend: null, shared: null }))).legend).toEqual([]);
	});

	test('every row has one cell per column', async () => {
		const table = { columns: columns(3), rows: [[{}, {}, {}], [{}, {}]] };

		expect(await problem(plain(table))).toBe('rows[1] has 2 cells but there are 3 columns');
		expect(await problem(plain({ columns: columns(2), rows: [{ cells: [] }] }))).toBe('rows[0] must be an array of cells');
	});

	test('a row with one cell is a heading, in a table with more than one column', async () => {
		const table = await valid(plain({ columns: columns(3), rows: [[{ text: 'Heading' }], [{}, {}, {}]] }));

		expect(table.rows.map((row) => row.length)).toEqual([1, 3]);
	});

	test('a table with one column has rows of one cell, and one without columns has empty rows', async () => {
		expect((await valid(plain({ columns: columns(1), rows: [[{}]] }))).rows).toEqual([[{}]]);
		expect((await valid(plain({ columns: [], rows: [[], []] }))).rows).toEqual([[], []]);
		expect(await problem(plain({ columns: [], rows: [[{}]] }))).toBe('rows[0] has 1 cells but there are 0 columns');
	});

	test('a cell is an object or the name of a shared cell', async () => {
		expect(await problem(plain({ columns: columns(2), rows: [[{}, 42]] }))).toBe('rows[0][1] must be an object or the name of a shared cell');
		expect(await problem(plain({ columns: columns(2), rows: [[{}, 'gained']] }))).toBe('rows[0][1] is "gained", which is not a name in shared');
		expect(await problem(plain({ columns: [], rows: [], legend: [null] }))).toBe('legend[0] must be an object or the name of a shared cell');
	});
});

describe('the limits', () => {
	test('a table at the limits is whole', async () => {
		const table = await valid(
			plain({
				shared: { yes: { icon: 'check' } },
				columns: columns(MAX_COLUMNS),
				rows: Array.from({ length: MAX_ROWS }, (_, index) => (index === 0 ? [{ text: 'Heading' }] : columns(MAX_COLUMNS).map(() => 'yes'))),
			}),
		);

		expect(table.columns).toHaveLength(MAX_COLUMNS);
		expect(table.rows).toHaveLength(MAX_ROWS);
		expect(table.rows[MAX_ROWS - 1]).toHaveLength(MAX_COLUMNS);
	});

	test('one column, one row or one part too many is rejected, never cut', async () => {
		expect(await problem(plain({ columns: columns(MAX_COLUMNS + 1), rows: [] }))).toBe(
			`columns has ${MAX_COLUMNS + 1} cells, and a table can have at most ${MAX_COLUMNS} columns`,
		);
		expect(await problem(plain({ columns: columns(2), rows: Array.from({ length: MAX_ROWS + 1 }, () => [{}, {}]) }))).toBe(
			`rows has ${MAX_ROWS + 1} rows, and a table can have at most ${MAX_ROWS}`,
		);
		expect(await cellProblem({ text: Array.from({ length: MAX_PARTS + 1 }, () => 'x') })).toBe(
			`columns[0].text has ${MAX_PARTS + 1} parts, and a cell can have at most ${MAX_PARTS}`,
		);
		expect(await cellProblem({}, { tall: { text: Array.from({ length: MAX_PARTS + 1 }, () => 'x') } })).toBe(
			`shared["tall"].text has ${MAX_PARTS + 1} parts, and a cell can have at most ${MAX_PARTS}`,
		);
	});

	test('a cell can have as many parts as the limit', async () => {
		const most = await cell({ text: Array.from({ length: MAX_PARTS }, (_, index) => index) });

		expect(most.lines!.flat()).toHaveLength(MAX_PARTS);
	});

	test('the size is checked before any cell, so a table which is far too large costs nothing', async () => {
		const rows = Array.from({ length: MAX_ROWS + 10 }, (_, index) => [index === 5 ? 7 : {}]);

		expect(await problem(plain({ columns: columns(1), rows }))).toBe(`rows has ${MAX_ROWS + 10} rows, and a table can have at most ${MAX_ROWS}`);
	});
});

describe('generated tables', () => {
	test.each([
		['20 people by 50 policies', 1, 20, 50, 5, 22, 56],
		['100 people by 200 policies', 2, 100, 200, 10, 102, 211],
		['as wide as a table can be', 3, MAX_COLUMNS - 2, 40, 4, MAX_COLUMNS, 45],
		['as tall as a table can be', 4, 6, MAX_ROWS - 11, 10, 8, MAX_ROWS],
	])('%s', async (_name, seed, people, policies, groups, wide, tall) => {
		const table = await valid(plain(accessReview(seed, people, policies, groups)));

		expect(table.columns).toHaveLength(wide);
		expect(table.rows).toHaveLength(tall);
	});

	test('the largest table there can be, compressed', async () => {
		const largest = accessReview(5, MAX_COLUMNS - 2, MAX_ROWS - 11, 10, true);
		const stored = packed(largest);
		const table = await valid(stored);

		expect(table.columns).toHaveLength(MAX_COLUMNS);
		expect(table.rows).toHaveLength(MAX_ROWS);

		// About 930 KB as it is, with one-character names, and under 100 KB stored.
		expect(JSON.stringify(largest).length).toBeGreaterThan(800_000);
		expect(JSON.stringify(stored).length).toBeLessThan(100_000);
	});

	test('the totals of a generated table add up', async () => {
		const table = await valid(plain(accessReview(1, 20, 50, 5)));
		const last = table.rows.at(-1)!;
		const corner = last.at(-1)!.lines![0]!.map((piece) => Number(piece.text));
		const body = table.rows.slice(0, -1).flatMap((row) => row.slice(1, -1));

		expect(corner[0]).toBe(body.filter((entry) => entry.tip === 'Gains').length);
		expect(corner[1]).toBe(-body.filter((entry) => entry.tip === 'Loses').length);
	});
});
