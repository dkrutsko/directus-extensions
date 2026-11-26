/**
 * Builders shared by the test suites: the two ways a table is stored, short
 * ways to parse a value and to look at one cell, a generator of large tables
 * in the shape of `examples/access-review.json`, and a table full of text
 * which must come out inert.
 */

import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { parseValue } from '../src/table';
import type { Cell, ParseResult, Table } from '../src/table';

export type Json = Record<string, unknown>;

/** A table as the field holds it when it is not compressed. */
export const plain = (table: unknown): Json => ({ version: 1, data: table });

/** The base64 of the gzip of some text, which is what `data` holds when compressed. */
export const pack = (text: string | Uint8Array): string => gzipSync(text).toString('base64');

/** The same table, compressed. */
export const packed = (table: unknown): Json => ({ version: 1, encoding: 'gzip', data: pack(JSON.stringify(table)) });

/** One of the values in `examples/`, read fresh each time so a test can change it. */
export function example(name: string): { version: number; encoding?: string; data: any } {
	return JSON.parse(readFileSync(new URL(`../examples/${name}.json`, import.meta.url), 'utf8'));
}

/** `parseValue` answers at once, or with a promise for a compressed value. */
export async function parse(value: unknown): Promise<ParseResult> {
	return parseValue(value);
}

/** The checked table of a value which must be valid. */
export async function valid(value: unknown): Promise<Table> {
	const result = await parse(value);
	if (result.kind !== 'valid') throw new Error(result.kind === 'invalid' ? result.error : 'The value is empty');
	return result.table;
}

/** The problem a value is rejected with. */
export async function problem(value: unknown): Promise<string> {
	const result = await parse(value);
	if (result.kind !== 'invalid') throw new Error(`Expected the value to be rejected, but it is ${result.kind}`);
	return result.error;
}

/** The cell which a table of one column and no rows turns `entry` into. */
export async function cell(entry: unknown, shared: Json = {}): Promise<Cell> {
	const table = await valid(plain({ shared, columns: [entry], rows: [] }));
	return table.columns[0]!;
}

/** The problem such a table is rejected with. */
export const cellProblem = (entry: unknown, shared: Json = {}): Promise<string> =>
	problem(plain({ shared, columns: [entry], rows: [] }));

/** The text of a cell's pieces, one string per line. */
export const lineTexts = (entry: Cell): string[] | undefined =>
	entry.lines?.map((line) => line.map((piece) => piece.text ?? '').join(' '));

/** Small deterministic random number generator (mulberry32), so generated tables never change. */
function random(seed: number): () => number {
	let state = seed;

	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const FIRST_NAMES = ['Priya', 'Marco', 'Lena', 'Sam', 'Aiko', 'Tomasz', 'Guadalupe', 'Oluwaseun', 'Ingrid', 'Maximilian', 'Wei', 'Fatima'];

const LAST_NAMES = [
	'Shah',
	'Bianchi',
	'Novak',
	'Okafor',
	'Tanaka',
	'Kowalczyk',
	'Hernandez-Villanueva',
	'Adeyemi',
	'Johansson',
	'Fitzgerald-Montgomery',
	'Lindqvist',
	'Moreau',
];

/** Groups of policies, each with a label for policy `n`. */
const GROUPS: [string, (n: number) => string][] = [
	['Issue tracker', (n) => `project-${n}`],
	['Cloud', (n) => `Role${n} @ account-${(n % 7) + 1}`],
	['Monitoring', (n) => `dashboard-team-${n}`],
	['Source control', (n) => `team-${n}-engineers`],
	['Mail', (n) => `group-${n}@example.com`],
	['Directory', (n) => `directory-group-${n}`],
	['On call', (n) => `rotation-${n}`],
	['Warehouse', (n) => `ROLE_${n}_READ`],
	['Databases', (n) => `cluster-${n}-production-read-only`],
	['Meetings', (n) => `licence-${n}`],
];

/** The names of the shared cells. Short ones keep a very large table small. */
const LONG = { gains: 'gains', loses: 'loses', has: 'has', none: 'none', total: 'total', stack: 'stack', plus: 'plus', minus: 'minus' };
const SHORT: typeof LONG = { gains: '+', loses: '-', has: '=', none: '.', total: 't', stack: 's', plus: 'p', minus: 'm' };

/**
 * A table of people (columns) by policies (rows) like the access review in
 * `examples/`: a heading before each group, a Total column at the end and a
 * Total row at the bottom. A total says what is gained and what is lost: side
 * by side in the Total column, and on a line each in the Total row. The totals
 * are counted here, because the interface only draws the cells it is given.
 *
 * It has `people + 2` columns and `policies + groups + 1` rows.
 */
export function accessReview(seed: number, people: number, policies: number, groups = GROUPS.length, short = false): Json {
	const next = random(seed);
	const names = short ? SHORT : LONG;
	const used = GROUPS.slice(0, groups);
	const perGroup = Math.ceil(policies / used.length);

	const header = Array.from({ length: people }, (_, index) => {
		const first = FIRST_NAMES[index % FIRST_NAMES.length]!;
		const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length]!;

		return {
			text: `${first} ${last}`,
			tip: `${first}.${last}@example.com`.toLowerCase(),
			link: { collection: 'people', id: String(index + 1) },
		};
	});

	const total = (gained: number, lost: number, style: 'total' | 'stack' = 'total'): unknown => {
		const parts = [];

		if (gained > 0) parts.push({ use: names.plus, text: `+${gained}` });
		if (lost > 0) parts.push({ use: names.minus, text: `-${lost}` });

		if (parts.length === 0) return names.total;

		return parts.length === 1 ? parts[0] : { use: names[style], text: parts };
	};

	const gains = header.map(() => 0);
	const loses = header.map(() => 0);
	const rows: unknown[][] = [];

	for (let index = 0; index < policies; index++) {
		const [group, label] = used[Math.floor(index / perGroup)]!;
		if (index % perGroup === 0) rows.push([{ text: group }]);

		const kind = next();
		let gained = 0;
		let lost = 0;

		const cells = header.map((_, column) => {
			const roll = next();
			let key: 'gains' | 'loses' | 'has' | 'none';

			if (kind < 0.08) {
				// A policy being taken away from the people who have it.
				key = roll < 0.6 ? 'loses' : 'none';
			} else if (kind < 0.2) {
				// A policy most people already hold.
				key = roll < 0.85 ? 'has' : 'gains';
			} else if (kind < 0.26) {
				// A policy which moves from some people to others.
				key = roll < 0.5 ? 'gains' : roll < 0.7 ? 'loses' : 'none';
			} else {
				key = roll < 0.8 ? 'gains' : roll < 0.95 ? 'has' : 'none';
			}

			if (key === 'gains') {
				gained++;
				gains[column]!++;
			} else if (key === 'loses') {
				lost++;
				loses[column]!++;
			}

			return names[key];
		});

		rows.push([
			{ text: label(index + 1), tip: group, link: { collection: 'policies', id: String(index + 1) } },
			...cells,
			total(gained, lost),
		]);
	}

	const sum = (counts: number[]) => counts.reduce((all, count) => all + count, 0);

	rows.push([
		{ use: names.total, text: 'Total' },
		...header.map((_, column) => total(gains[column]!, loses[column]!, 'stack')),
		total(sum(gains), sum(loses)),
	]);

	return {
		shared: {
			[names.gains]: { icon: 'add_circle', color: 'var(--theme--success)', tip: 'Gains' },
			[names.loses]: { icon: 'remove_circle', color: 'var(--theme--danger)', tip: 'Loses' },
			[names.has]: { icon: 'check_circle', tip: 'Already has' },
			[names.none]: { text: '.', color: 'var(--theme--foreground-subdued)', tip: 'Unaffected' },
			[names.total]: { weight: 600, background: 'var(--theme--background-subdued)' },
			[names.stack]: { use: names.total, break: true },
			[names.plus]: { use: names.total, color: 'var(--theme--success)' },
			[names.minus]: { use: names.total, color: 'var(--theme--danger)' },
		},
		columns: [{ text: 'Policy' }, ...header, { text: 'Total' }],
		rows,
		legend: [names.gains, names.loses, names.has, names.none],
	};
}

// Text which must come out as inert, cut, one-line text.
export const SCRIPT = '<script>alert("table")</script>';
export const IMAGE = '<img src=x onerror="alert(\'table\')">';
export const MUSTACHE = "{{ constructor.constructor('alert(1)')() }}";
export const LONG_TEXT = 'Long'.repeat(2500);
export const HEBREW = '\u05E9\u05E8\u05D4 \u05DB\u05D4\u05DF';
export const ARABIC = '\u0641\u0627\u0637\u0645\u0629 \u0627\u0644\u0632\u0647\u0631\u0627\u0621';
export const OVERRIDE = 'evil\u202Etxt.exe';
export const MARKS = 'left\u200Eright\u200Farabic\u061Cline\u2028paragraph\u2029end';
export const EMOJI = '\u{1F469}\u200D\u{1F4BB} Dev \u{1F680}\u{1F525}';

/** Where the cells of interest sit in the header row of `hostile()`. */
export const HOSTILE = { markup: 1, marks: 8, badIcons: [9, 10], oddId: 12, createId: 13, lines: 15, mostParts: 16, sideBySide: 17 } as const;

/**
 * A valid table whose text tries everything: markup, template syntax, a
 * 10,000 character string, right-to-left text, an override character, emoji,
 * bad icon names, odd links, a theme variable which does not exist, and shared
 * names which every object also has as a member. Each hostile cell appears in
 * the header row, as a row header and as an ordinary cell.
 */
export function hostile(): Json {
	const cells = [
		{ text: SCRIPT, tip: IMAGE },
		{ text: IMAGE, tip: SCRIPT, color: '#E35169' },
		{ text: MUSTACHE, tip: MUSTACHE, weight: 700, background: '#2ECDA740' },
		{ text: LONG_TEXT, tip: LONG_TEXT, italic: true },
		{ text: HEBREW, tip: ARABIC },
		{ text: OVERRIDE, tip: 'line one\nline two\ttab' },
		{ text: EMOJI, tip: EMOJI.repeat(40) },
		{ text: MARKS, tip: MARKS },
		// Icon names which are not Material icon names are dropped.
		{ text: 'Bad icon', icon: '"><script>alert(1)</script>', color: 'var(--theme--warning)' },
		{ text: 'Odd icon', icon: 'Add Circle', color: 'var(--theme--primary)' },
		// Links which must never leave the app's own drawer.
		{ text: 'No such collection', link: { collection: 'javascript:alert(1)', id: '1' } },
		{ text: 'Odd id', link: { collection: 'people', id: '../../users?x=1#y' } },
		{ text: 'Create id', link: { collection: 'people', id: '+' } },
		{ text: 'External', link: { collection: 'https://example.com', id: '//example.com' } },
		// Parts on a line each: text, a part with everything of its own, and a shared cell.
		{
			text: [
				SCRIPT,
				{ text: IMAGE, tip: MUSTACHE, link: { collection: 'javascript:alert(1)', id: '1' } },
				{ use: 'constructor', text: 'line one\nline two' },
				LONG_TEXT,
			],
			tip: IMAGE,
			color: 'var(--theme--no-such-colour)',
			break: true,
		},
		// As many parts as a cell can have, on a line each.
		{ text: Array.from({ length: 10 }, (_, index) => `Line ${index + 1} ${MUSTACHE}`), break: true },
		// Parts side by side, and one which starts a second line.
		{
			text: [
				{ text: 'Side', icon: 'info', color: '#0061FF' },
				{ text: SCRIPT, weight: 700 },
				{ text: IMAGE, italic: true, tip: MUSTACHE },
				{ text: 'Below', break: true, color: 'var(--theme--danger)' },
				LONG_TEXT,
			],
		},
	];

	return {
		// Names which are also members of every object. `__proto__` and
		// `hasOwnProperty` are left out here because Directus itself loses them
		// before the interface sees the value (see the tests), so a table with
		// them could not be drawn in a browser test.
		shared: {
			constructor: { icon: 'add_circle', color: 'var(--theme--success)', tip: SCRIPT },
			valueOf: { icon: 'remove_circle', color: 'var(--theme--danger)', tip: IMAGE },
			toString: { use: 'valueOf', icon: null, text: MUSTACHE, tip: MUSTACHE },
		},
		columns: [{ text: IMAGE }, ...cells],
		rows: [
			[{ text: SCRIPT, tip: IMAGE }],
			...cells.map((entry, index) => [
				entry,
				...cells.map((_, column) => (column === index ? entry : ['constructor', 'valueOf', 'toString'][(index + column) % 3])),
			]),
			[{ text: LONG_TEXT, icon: 'info', color: 'var(--theme--foreground-subdued)' }],
			[{ text: 42 }, ...cells.map((_, column) => ({ text: column - 6.5 }))],
		],
		legend: [
			'constructor',
			'valueOf',
			'toString',
			{ text: EMOJI, tip: LONG_TEXT },
			{ tip: HEBREW },
			{ text: [SCRIPT, IMAGE], tip: MUSTACHE, background: '#E3516940' },
		],
	};
}
