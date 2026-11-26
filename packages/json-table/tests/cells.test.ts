import { describe, expect, test } from 'vitest';
import { MAX_SHARED_DEPTH, MAX_TEXT_LENGTH } from '../src/table';
import { cell, cellProblem, lineTexts, plain, problem, valid } from './helpers';

/** Shared cells which build on each other, for the tests of what wins over what. */
const SHARED = {
	base: { color: '#111111', icon: 'info', tip: 'Base', weight: 300 },
	mid: { use: 'base', color: '#222222', italic: true },
	lines: { use: 'mid', text: ['one', { text: 'two', color: '#333' }] },
	link: { link: { collection: 'people', id: '1' }, background: '#00000010' },
};

describe('the fields of a cell', () => {
	test('every field is optional, and an empty cell is allowed', async () => {
		expect(await cell({})).toEqual({});
	});

	test('text is a string or a finite number', async () => {
		expect(await cell({ text: 'One' })).toEqual({ text: 'One' });
		expect(await cell({ text: 1 })).toEqual({ text: '1' });
		expect(await cell({ text: -2.5 })).toEqual({ text: '-2.5' });
		expect(await cell({ text: '' })).toEqual({});
		expect(await cellProblem({ text: true })).toBe('columns[0].text must be a string, a number or a list of parts');
		expect(await cellProblem({ text: Number.NaN })).toBe('columns[0].text must be a string, a number or a list of parts');
	});

	test('text and tips are cut at the limit, with three dots', async () => {
		const long = await cell({ text: 'x'.repeat(500), tip: 'y'.repeat(500) });

		expect(long.text).toHaveLength(MAX_TEXT_LENGTH);
		expect(long.text!.endsWith('...')).toBe(true);
		expect(long.tip).toHaveLength(MAX_TEXT_LENGTH);
	});

	test('control characters become spaces and bidirectional controls are removed', async () => {
		expect(await cell({ text: 'line one\nline two\ttab', tip: 'evil\u202Etxt.exe\u2066' })).toEqual({
			text: 'line one line two tab',
			tip: 'eviltxt.exe',
		});
	});

	test('the line and paragraph separators become spaces too, so a line stays a line', async () => {
		expect(await cell({ text: 'one\u2028two\u2029three', tip: 'a\u2028b' })).toEqual({ text: 'one two three', tip: 'a b' });
	});

	test('the marks which have a direction but no glyph are removed, and the letters around them kept', async () => {
		// Left-to-right mark, right-to-left mark and Arabic letter mark.
		expect(await cell({ text: 'a\u200Eb\u200Fc\u061Cd', tip: '\u200F\u05E9\u05E8\u05D4\u200E' })).toEqual({ text: 'abcd', tip: '\u05E9\u05E8\u05D4' });
	});

	test('an icon which is not the name of a Material icon is no icon', async () => {
		expect(await cell({ icon: 'add_circle' })).toEqual({ icon: 'add_circle' });
		expect(await cell({ text: 'x', icon: 'Add Circle' })).toEqual({ text: 'x' });
		expect(await cell({ text: 'x', icon: '"><script>alert(1)</script>' })).toEqual({ text: 'x' });
		expect(await cell({ text: 'x', icon: 'a'.repeat(65) })).toEqual({ text: 'x' });
		expect(await cellProblem({ icon: 7 })).toBe('columns[0].icon must be a string');
	});

	test('weight is a number from 1 to 1000, as in CSS', async () => {
		expect(await cell({ weight: 600 })).toEqual({ weight: 600 });
		expect(await cell({ weight: 450.5 })).toEqual({ weight: 450.5 });
		expect(await cellProblem({ weight: 0 })).toBe('columns[0].weight must be a number from 1 to 1000');
		expect(await cellProblem({ weight: 1001 })).toBe('columns[0].weight must be a number from 1 to 1000');
		expect(await cellProblem({ weight: 'bold' })).toBe('columns[0].weight must be a number from 1 to 1000');
	});

	test('italic is true or false, and only kept when true', async () => {
		expect(await cell({ italic: true })).toEqual({ italic: true });
		expect(await cell({ italic: false })).toEqual({});
		expect(await cellProblem({ italic: 'yes' })).toBe('columns[0].italic must be true or false');
	});

	test('a tip is text', async () => {
		expect(await cell({ tip: 'Gains' })).toEqual({ tip: 'Gains' });
		expect(await cellProblem({ tip: 7 })).toBe('columns[0].tip must be a string');
	});

	test('a link names a collection and an id', async () => {
		expect(await cell({ link: { collection: 'people', id: '1', more: true } })).toEqual({ link: { collection: 'people', id: '1' } });
		expect(await cellProblem({ link: 'people/1' })).toBe('columns[0].link must be an object');
		expect(await cellProblem({ link: { collection: '', id: '1' } })).toBe('columns[0].link.collection must be a non-empty string');
		expect(await cellProblem({ link: { collection: 'people', id: 1 } })).toBe('columns[0].link.id must be a non-empty string');
	});
});

describe('colours', () => {
	test.each(['#abc', '#ABCD', '#a1b2c3', '#a1b2c3d4', 'var(--theme--success)', 'var(--theme--form--field--input--border-color)'])(
		'%s is accepted, for the text and for the background',
		async (color) => {
			expect(await cell({ color, background: color })).toEqual({ color, background: color });
		},
	);

	// Colours are the only part of the value which reaches CSS, so nothing but
	// the two forms may pass: no names, no functions, no second declaration and
	// no fallback inside var().
	test.each([
		'red',
		'#12',
		'#12345',
		'#ggg',
		'rgb(0,0,0)',
		'var(--primary)',
		'var(--theme--success, red)',
		'var(--theme--success);background:url(//example.com)',
		'#fff;position:fixed',
		'url(javascript:alert(1))',
		'expression(alert(1))',
		' #fff',
		'#fff\n',
		`var(--theme--${'a'.repeat(100)})`,
	])('%j is rejected', async (color) => {
		expect(await cellProblem({ text: 'x', color })).toContain('must be a hex colour such as #E35169 or a theme variable such as var(--theme--success)');
		expect(await cellProblem({ text: 'x', background: color })).toContain('columns[0].background');
	});

	test('a colour must be text', async () => {
		expect(await cellProblem({ color: 7 })).toBe('columns[0].color must be a string');
	});
});

describe('shared cells and use', () => {
	test('a cell takes what the shared cell it uses has, and what that one uses', async () => {
		expect(await cell({ use: 'mid', text: 'x' }, SHARED)).toEqual({
			text: 'x',
			icon: 'info',
			color: '#222222',
			weight: 300,
			italic: true,
			tip: 'Base',
		});
	});

	test('the fields of a cell win over the shared cell it uses', async () => {
		expect((await cell({ use: 'mid', weight: 700 }, SHARED)).weight).toBe(700);
	});

	test('a cell which is only a name is the shared cell of that name', async () => {
		expect(await cell('mid', SHARED)).toEqual(await cell({ use: 'mid' }, SHARED));
	});

	test('null takes away what is inherited', async () => {
		expect(await cell({ use: 'mid', icon: null, tip: null, italic: null, color: null }, SHARED)).toEqual({ weight: 300 });
		expect(await cell({ use: 'link', link: null, background: null, text: null }, SHARED)).toEqual({});
	});

	test('a name must be in shared, and use must be a name', async () => {
		expect(await cellProblem({ use: 'bonus' }, SHARED)).toBe('columns[0].use is "bonus", which is not a name in shared');
		expect(await cellProblem({ use: 7 }, SHARED)).toBe('columns[0].use must be the name of a shared cell');
	});

	test('a shared cell must be an object, and is checked whether it is used or not', async () => {
		expect(await cellProblem({}, { gains: 'loses' })).toBe('shared["gains"] must be an object');
		expect(await cellProblem({}, { spare: { italic: 'yes' } })).toBe('shared["spare"].italic must be true or false');
	});

	test('a shared cell which leads back to itself is rejected', async () => {
		expect(await cellProblem({}, { a: { use: 'a' } })).toBe('shared["a"] uses itself: "a" > "a"');
		expect(await cellProblem({}, { a: { use: 'b' }, b: { use: 'c' }, c: { use: 'a' } })).toBe('shared["a"] uses itself: "a" > "b" > "c" > "a"');
		expect(await cellProblem({}, { a: { use: 'b' }, b: { text: [{ use: 'a', text: 'x' }] } })).toBe('shared["a"] uses itself: "a" > "b" > "a"');
	});

	/** Shared cells `c0`, `c1` and so on, each using the next, written from the start of the chain or from its end. */
	const chain = (length: number, fromEnd = false) => {
		const entries = Array.from({ length }, (_, index): [string, object] => [`c${index}`, index < length - 1 ? { use: `c${index + 1}` } : { text: 'end' }]);

		return Object.fromEntries(fromEnd ? entries.reverse() : entries);
	};

	test('a chain of shared cells can be as long as the limit, whichever end is written first', async () => {
		expect(await cell('c0', chain(MAX_SHARED_DEPTH))).toEqual({ text: 'end' });
		expect(await cell('c0', chain(MAX_SHARED_DEPTH, true))).toEqual({ text: 'end' });
	});

	test('a longer chain is rejected with a message of its own, whichever end is written first', async () => {
		const tooLong = `shared["c0"] starts a chain of more than ${MAX_SHARED_DEPTH} shared cells, each using the next`;

		expect(await cellProblem({}, chain(MAX_SHARED_DEPTH + 1))).toBe(tooLong);
		expect(await cellProblem({}, chain(MAX_SHARED_DEPTH + 1, true))).toBe(tooLong);
	});

	test('a chain of thousands is rejected the same way, and does not run out of stack', async () => {
		expect(await cellProblem({}, chain(20_000))).toMatch(/^shared\["c0"\] starts a chain of more than/);
		expect(await cellProblem({}, chain(20_000, true))).toMatch(/^shared\["c\d+"\] starts a chain of more than/);
	});

	test('a chain through the parts of shared cells counts as well', async () => {
		const shared: Record<string, object> = { c0: { text: 'end' } };
		for (let index = 1; index <= MAX_SHARED_DEPTH; index++) shared[`c${index}`] = { text: ['x', { use: `c${index - 1}`, text: 'y' }] };

		expect(await cellProblem({}, shared)).toBe(
			`shared["c${MAX_SHARED_DEPTH}"] starts a chain of more than ${MAX_SHARED_DEPTH} shared cells, each using the next`,
		);
	});

	test('many shared cells which use the same one are not a chain', async () => {
		const shared: Record<string, object> = { base: { weight: 600 } };
		for (let index = 0; index < 500; index++) shared[`c${index}`] = { use: 'base', text: String(index) };

		expect(await cell('c499', shared)).toEqual({ text: '499', weight: 600 });
	});

	test('a name which every object has as a member is only a name', async () => {
		const shared = { constructor: { text: 'c' }, valueOf: { text: 'v' }, toString: { use: 'valueOf', icon: 'info' } };

		expect(await cell('toString', shared)).toEqual({ text: 'v', icon: 'info' });
		expect(await cellProblem('isPrototypeOf', shared)).toBe('columns[0] is "isPrototypeOf", which is not a name in shared');
		expect(await cellProblem({ use: 'toString' })).toBe('columns[0].use is "toString", which is not a name in shared');
	});

	test('__proto__ and hasOwnProperty work as names in a value which still has them', async () => {
		// From JSON text, because an object literal would set the prototype. In
		// Directus they do not survive: the API drops a `__proto__` key when the
		// value is saved, and the form hands interfaces a function for
		// `hasOwnProperty`. The table is then rejected, which is the safe outcome.
		const shared = '{"__proto__":{"text":"p"},"hasOwnProperty":{"use":"__proto__"}}';
		const value = `{"version":1,"data":{"shared":${shared},"columns":["__proto__","hasOwnProperty"],"rows":[]}}`;

		expect((await valid(value)).columns).toEqual([{ text: 'p' }, { text: 'p' }]);
	});
});

describe('parts', () => {
	test('a part is text, a number or an object, and a string is text, never a name', async () => {
		expect((await cell({ text: ['base', 7, { text: 'x', color: '#abc' }] }, SHARED)).lines).toEqual([
			[{ text: 'base' }, { text: '7' }, { text: 'x', color: '#abc' }],
		]);
		expect(await cellProblem({ text: ['a', true] })).toBe('columns[0].text[1] must be text, a number or an object');
		expect(await cellProblem({ text: ['a', null] })).toBe('columns[0].text[1] must be text, a number or an object');
	});

	test('a part starts from the fields of its cell', async () => {
		const made = await cell({ color: '#444444', weight: 600, tip: 'T', icon: 'info', text: ['a', { text: 'b', color: '#555' }] });

		expect(made.lines).toEqual([
			[
				{ text: 'a', icon: 'info', color: '#444444', weight: 600, tip: 'T' },
				{ text: 'b', icon: 'info', color: '#555', weight: 600, tip: 'T' },
			],
		]);
		expect(made.tip).toBe('T');
	});

	test('a part wins over its shared cell, which wins over the cell', async () => {
		const made = await cell({ use: 'link', color: '#444444', text: [{ use: 'base', weight: 900 }, { link: null, tip: 'Own' }, 'three'] }, SHARED);

		expect(made).toEqual({
			lines: [
				[
					{ icon: 'info', color: '#111111', weight: 900, tip: 'Base', link: { collection: 'people', id: '1' } },
					{ color: '#444444', tip: 'Own' },
					{ text: 'three', color: '#444444', link: { collection: 'people', id: '1' } },
				],
			],
			background: '#00000010',
		});
	});

	test('a cell which sets text replaces the parts it would inherit', async () => {
		expect(await cell({ use: 'lines', text: 'whole' }, SHARED)).toEqual({
			text: 'whole',
			icon: 'info',
			color: '#222222',
			weight: 300,
			italic: true,
			tip: 'Base',
		});
	});

	test('inherited parts take the fields of the cell which uses them', async () => {
		expect((await cell({ use: 'lines', color: '#555', icon: null }, SHARED)).lines).toEqual([
			[
				{ text: 'one', color: '#555', weight: 300, italic: true, tip: 'Base' },
				{ text: 'two', color: '#333', weight: 300, italic: true, tip: 'Base' },
			],
		]);
	});

	test('a list with one part is the same as that part written as the cell', async () => {
		expect(await cell({ text: [{ text: 'a', color: '#abc' }], tip: 'T', background: '#fff' })).toEqual({
			text: 'a',
			color: '#abc',
			tip: 'T',
			background: '#fff',
		});
	});

	test('an empty list is no text', async () => {
		expect(await cell({ text: [], icon: 'info' })).toEqual({ icon: 'info' });
	});

	test('a part has no background of its own', async () => {
		const made = await cell({ text: [{ text: 'a', background: 'not even checked' }, { use: 'link', text: 'b' }] }, SHARED);

		expect(made.lines).toEqual([[{ text: 'a' }, { text: 'b', link: { collection: 'people', id: '1' } }]]);
		expect(made.background).toBeUndefined();
	});

	test('a part cannot hold parts', async () => {
		expect(await cellProblem({ text: [{ text: ['x'] }] })).toBe('columns[0].text[0].text must be a string or a number: a part cannot hold parts');
		expect(await cellProblem({ text: [{ use: 'lines' }] }, SHARED)).toBe('columns[0].text[0].use is "lines", which has parts, and a part cannot hold parts');
		expect((await cell({ text: [{ use: 'lines', text: 'x' }, 'y'] }, SHARED)).lines![0]![0]!.text).toBe('x');
	});

	test('a problem in a part says where it is', async () => {
		expect(await problem(plain({ columns: [{}, {}], rows: [[{}, { text: ['a', { text: 'b', weight: 'bold' }] }]] }))).toBe(
			'rows[0][1].text[1].weight must be a number from 1 to 1000',
		);
	});
});

describe('lines and break', () => {
	test('parts sit side by side on one line', async () => {
		expect(lineTexts(await cell({ text: ['a', 'b', 'c'] }))).toEqual(['a b c']);
	});

	test('a part with break starts a new line', async () => {
		expect(lineTexts(await cell({ text: ['a', { text: 'b', break: true }, 'c'] }))).toEqual(['a', 'b c']);
	});

	test('break on the cell puts every part on a line of its own', async () => {
		expect(lineTexts(await cell({ break: true, text: ['a', 'b', 'c'] }))).toEqual(['a', 'b', 'c']);
	});

	test('a part can stay on the line although its cell breaks', async () => {
		const made = await cell({ break: true, text: ['a', { text: 'b', break: false }, { text: 'c', break: null }, 'd'] });

		expect(lineTexts(made)).toEqual(['a b c', 'd']);
	});

	test('break comes from a shared cell too, and a part looks at its own shared cell first', async () => {
		const shared = { ...SHARED, stack: { break: true }, flat: { use: 'stack', break: false } };
		const made = await cell({ use: 'stack', text: ['a', { use: 'base', text: 'b' }, { use: 'flat', text: 'c' }] }, shared);

		expect(lineTexts(made)).toEqual(['a', 'b c']);
	});

	test('break on the first part changes nothing, and neither does break without parts', async () => {
		expect(lineTexts(await cell({ text: [{ text: 'a', break: true }, 'b'] }))).toEqual(['a b']);
		expect(await cell({ text: 'a', break: true })).toEqual({ text: 'a' });
	});

	test('break must be true or false', async () => {
		expect(await cellProblem({ text: ['a', { text: 'b', break: 1 }] })).toBe('columns[0].text[1].break must be true or false');
		expect(await cellProblem({}, { stack: { break: 'yes' } })).toBe('shared["stack"].break must be true or false');
	});
});
