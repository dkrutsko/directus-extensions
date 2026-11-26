import { describe, expect, test } from 'vitest';
import { fitPins } from '../src/table';
import {
	COLUMN_LABELS,
	COLUMN_WIDTH,
	DEFAULT_COLUMN_LABELS,
	DEFAULT_STICKY,
	MAX_STICKY,
	MIN_HEIGHT,
	ROTATE_ABOVE,
	buildView,
	fittingColumns,
	heightLimit,
	pinCover,
	pinViews,
	rotates,
	stickyCount,
	wantedPins,
} from '../src/view';
import type { TableView } from '../src/view';
import { example, hostile, plain, valid } from './helpers';
import type { Json } from './helpers';

const everything = () => true;

/** What the component would draw for a table, for a user who may read every collection unless `readable` says otherwise. */
async function view(table: Json, readable: (collection: string) => boolean = everything): Promise<TableView> {
	return buildView(await valid(plain(table)), readable);
}

const text = (value: string, rest: Json = {}) => ({ text: value, ...rest });

describe('tooltips, as docs/format.md states them', () => {
	test('a header cell and a row header show their text and then their tip', async () => {
		const { columns, groups } = await view({
			columns: [text('Policy'), text('Priya Shah', { tip: 'priya@example.com' }), { tip: 'Only a tip' }, {}],
			rows: [[text('billing', { tip: 'Source control' }), {}, {}, {}]],
		});

		expect(columns.map((column) => column.title)).toEqual(['Policy', 'Priya Shah\npriya@example.com', 'Only a tip', undefined]);
		expect(groups[0]!.rows[0]!.first.title).toBe('billing\nSource control');
	});

	test('a heading shows its text, which may be cut off, and then its tip', async () => {
		const long = 'A heading which is longer than the table is wide '.repeat(3).trim();
		const { groups } = await view({ columns: [text('A'), text('B')], rows: [[text(long)], [text('Short', { tip: 'More about it' })], [{ icon: 'info' }]] });

		expect(groups.map((group) => group.heading!.title)).toEqual([long, 'Short\nMore about it', undefined]);
	});

	test('any other cell shows its tip after the text of its column header and of its row header', async () => {
		const { groups } = await view({
			shared: { gains: { icon: 'add_circle', tip: 'Gains' } },
			columns: [text('Policy'), text('Priya Shah'), text('Marco Bianchi')],
			rows: [[text('billing-engineers'), 'gains', text('No tip')]],
		});

		expect(groups[0]!.rows[0]!.tips).toEqual(['Priya Shah - billing-engineers: Gains', undefined]);
	});

	test('a header without text is left out of the place, and without any place the tip stands alone', async () => {
		const cell = text('x', { tip: 'Tip' });

		expect((await view({ columns: [{}, text('Column')], rows: [[{}, cell]] })).groups[0]!.rows[0]!.tips).toEqual(['Column: Tip']);
		expect((await view({ columns: [{}, {}], rows: [[text('Row'), cell]] })).groups[0]!.rows[0]!.tips).toEqual(['Row: Tip']);
		expect((await view({ columns: [{}, { icon: 'info' }], rows: [[{ icon: 'info' }, cell]] })).groups[0]!.rows[0]!.tips).toEqual(['Tip']);
	});

	test('the place is made of all the text of a header of several parts', async () => {
		const { groups } = await view({
			columns: [text('Plan'), { text: ['Reader', { text: 'most chosen', break: true }] }],
			rows: [[{ text: [{ text: 'Price', icon: 'sell' }, 'a year'] }, text('18', { tip: 'With tax' })]],
		});

		expect(groups[0]!.rows[0]!.tips).toEqual(['Reader most chosen - Price a year: With tax']);
	});

	test('a part with a tip of its own shows that one, placed the same way, and the others the tip of the cell', async () => {
		const parts = [text('+4', { tip: 'Gained' }), text('-1'), text('?', { tip: null })];
		const { groups } = await view({ columns: [text('Policy'), text('Total'), text('Plain')], rows: [[text('All'), { tip: 'Changes', text: parts }, {}]] });
		const row = groups[0]!.rows[0]!;

		expect(row.tips).toEqual(['Total - All: Changes', undefined]);
		// The second part has the tip of the cell. The third took it away, and its empty tooltip keeps the cell's from showing over it.
		expect(row.pieceTips[0]).toEqual([['Total - All: Gained', undefined, '']]);
		expect(row.pieceTips[1]).toBeUndefined();
	});

	test('a cell whose parts all have its tip needs no tooltip of their own', async () => {
		const { groups } = await view({ columns: [text('A'), text('B')], rows: [[text('Row'), { tip: 'Same', text: ['one', 'two'] }]] });

		expect(groups[0]!.rows[0]!.pieceTips).toEqual([]);
		expect(groups[0]!.rows[0]!.cells[0]!.own).toBeNull();
	});

	test('in a label, a part with a tip of its own shows its text and then that tip', async () => {
		const parts = [text('2.4.0', { tip: 'Released' }), text('beta'), { icon: 'info', tip: null }];
		const { columns } = await view({ columns: [{ tip: 'Whole', text: parts }], rows: [] });

		expect(columns[0]!.title).toBe('2.4.0 beta\nWhole');
		expect(columns[0]!.drawn[0]!.map((piece) => piece.title)).toEqual(['2.4.0\nReleased', undefined, '']);
	});

	test('a cell of one piece has no tooltip on the piece: the cell has it', async () => {
		const { columns } = await view({ columns: [text('Name', { tip: 'Tip' })], rows: [] });

		expect(columns[0]!.drawn).toHaveLength(1);
		expect(columns[0]!.drawn[0]![0]!.title).toBeUndefined();
	});
});

describe('what a cell is called for assistive technology', () => {
	test('a cell with text needs no name', async () => {
		const { columns, groups } = await view({ columns: [text('A'), text('B')], rows: [[text('Row'), text('7', { icon: 'info', tip: 'Seven' })]] });

		expect(columns[0]!.name).toBeUndefined();
		expect(groups[0]!.rows[0]!.names).toEqual([undefined]);
	});

	test('a cell which shows only an icon is called by its tip, placed as its tooltip is', async () => {
		const { groups } = await view({ columns: [text('Policy'), text('Priya')], rows: [[text('billing'), { icon: 'add_circle', tip: 'Gains' }]] });

		expect(groups[0]!.rows[0]!.names).toEqual(['Priya - billing: Gains']);
	});

	test('without a tip it is called by the name of its icon, as words', async () => {
		const { columns, groups } = await view({
			columns: [{ icon: 'table_chart' }, { icon: 'info', tip: 'About' }],
			rows: [[{ icon: 'check_circle' }, { text: [{ icon: 'add_circle' }, { icon: 'remove_circle' }] }], [{ icon: 'public' }]],
		});

		expect(columns.map((column) => column.name)).toEqual(['table chart', 'About']);
		expect(groups[0]!.rows[0]!.first.name).toBe('check circle');
		expect(groups[0]!.rows[0]!.names).toEqual(['add circle, remove circle']);
		expect(groups[1]!.heading!.name).toBe('public');
	});

	test('without a tip of its own it is called by what each part has to say: its tip, or else its icon', async () => {
		const gained = { icon: 'add_circle', tip: 'Gained' };
		const lost = { icon: 'remove_circle', tip: 'Lost' };
		const { columns, groups } = await view({
			columns: [text('Policy'), text('Priya'), { text: [gained, lost] }],
			rows: [
				[text('billing'), { text: [gained, lost] }, { text: [gained, { icon: 'remove_circle' }, { icon: 'star' }, { icon: 'star' }] }],
				[{ text: [gained, lost] }],
			],
		});
		const row = groups[0]!.rows[0]!;

		// The tips of the parts are only tooltips of the parts, and the name is read in their place.
		expect(row.tips).toEqual([undefined, undefined]);
		expect(row.pieceTips[0]).toEqual([['Priya - billing: Gained', 'Priya - billing: Lost']]);
		// In a row the name is placed as the tooltips are. The column of the second cell has no text.
		expect(row.names).toEqual(['Priya - billing: Gained, Lost', 'billing: Gained, remove circle, star, star']);
		// A header cell and a heading have no place to name.
		expect(columns[2]!.name).toBe('Gained, Lost');
		expect(groups[1]!.heading!.name).toBe('Gained, Lost');
	});

	test('the tip of the cell is its name, whatever its parts say', async () => {
		const parts = [{ icon: 'add_circle', tip: 'Gained' }, { icon: 'remove_circle' }];
		const silent = [
			{ icon: 'add_circle', tip: null },
			{ icon: 'remove_circle', tip: null },
		];
		const { groups } = await view({
			columns: [text('Policy'), text('Priya'), text('Marco')],
			rows: [[text('billing'), { tip: 'Changes', text: parts }, { tip: 'Changes', text: silent }]],
		});

		expect(groups[0]!.rows[0]!.names).toEqual(['Priya - billing: Changes', 'Marco - billing: Changes']);
	});

	test('the name of an icon is never placed', async () => {
		const { groups } = await view({ columns: [text('Policy'), text('Priya')], rows: [[text('billing'), { icon: 'local_cafe' }]] });

		expect(groups[0]!.rows[0]!.names).toEqual(['local cafe']);
		expect(groups[0]!.rows[0]!.cells[0]!.told).toBe(false);
	});

	test('an empty cell has no name', async () => {
		const { groups } = await view({ columns: [text('A'), text('B')], rows: [[{}, { background: '#E3516926' }]] });

		expect(groups[0]!.rows[0]!.first.name).toBeUndefined();
		expect(groups[0]!.rows[0]!.names).toEqual([undefined]);
	});
});

describe('links', () => {
	const linked = (collection: string, id = '1') => text('Open', { link: { collection, id } });

	test('a link is offered only for a collection which may be read', async () => {
		const table = { columns: [linked('people'), linked('secrets')], rows: [] };
		const { columns } = await view(table, (collection) => collection === 'people');

		expect(columns.map((column) => column.link)).toEqual([{ collection: 'people', id: '1' }, null]);
	});

	test('each collection is asked about once, however many cells link to it', async () => {
		const asked: string[] = [];
		const row = [linked('people', '1'), linked('people', '2'), linked('policies', '3')];

		await view({ columns: row, rows: [row, row, row], legend: row }, (collection) => {
			asked.push(collection);
			return true;
		});

		expect(asked).toEqual(['people', 'policies']);
	});

	test('a table without links asks about nothing', async () => {
		const asked: string[] = [];

		buildView(await valid(example('status-board')), (collection) => {
			asked.push(collection);
			return true;
		});

		// The example links its services, and nothing else.
		expect(new Set(asked)).toEqual(new Set(['services']));
		await view({ columns: [text('A')], rows: [[text('B')]] }, () => {
			throw new Error('asked');
		});
	});

	test('a link needs text, and the id of the form for a new item is never linked', async () => {
		const { columns } = await view({ columns: [{ icon: 'open_in_new', link: { collection: 'people', id: '1' } }, linked('people', '+')], rows: [] });

		expect(columns.map((column) => column.link)).toEqual([null, null]);
	});

	test('each part has its own link', async () => {
		const parts = [linked('people', '7'), text('plain'), linked('none')];
		const { columns } = await view({ columns: [{ text: parts }], rows: [] }, (collection) => collection === 'people');

		expect(columns[0]!.link).toBeNull();
		expect(columns[0]!.drawn[0]!.map((piece) => piece.link)).toEqual([{ collection: 'people', id: '7' }, null, null]);
	});

	test('the hostile table offers no link which leaves the drawer', async () => {
		const table = buildView(await valid(plain(hostile())), (collection) => collection === 'people');
		const body = table.groups.flatMap((group) => [...(group.heading ? [group.heading] : []), ...group.rows.flatMap((row) => [row.first, ...row.cells])]);
		const cells = [...table.columns, ...body];
		const links = cells.flatMap((cell) => cell.drawn.flat().map((piece) => piece.link)).filter((link) => link !== null);

		expect(links.length).toBeGreaterThan(0);
		for (const link of links) expect(link).toEqual({ collection: 'people', id: '../../users?x=1#y' });
	});
});

describe('rows and their groups', () => {
	test('a heading and the rows under it are a group, and the rows before the first heading are one without a heading', async () => {
		const row = (name: string) => [text(name), {}];
		const { groups, lines, span } = await view({
			columns: [text('A'), text('B')],
			rows: [row('one'), row('two'), [text('First')], row('three'), [text('Second')], [text('Third')], row('four')],
		});

		expect(groups.map((group) => [group.heading?.label ?? null, group.line, group.rows.map((entry) => `${entry.line} ${entry.first.label}`)])).toEqual([
			[null, 0, ['1 one', '2 two']],
			['First', 3, ['4 three']],
			['Second', 5, []],
			['Third', 6, ['7 four']],
		]);
		expect(lines).toBe(8);
		expect(span).toBe(2);
	});

	test('a table which starts with a heading has no group without one', async () => {
		const { groups } = await view(example('status-board').data);

		expect(groups.map((group) => group.heading?.label)).toEqual(['Public', 'Internal', 'Checked every five minutes']);
		expect(groups.map((group) => group.rows.length)).toEqual([3, 2, 0]);
	});

	test('in a table of one column a row of one cell is a row, not a heading', async () => {
		const { groups } = await view({ columns: [text('Only')], rows: [[text('one')], [text('two')]] });

		expect(groups).toHaveLength(1);
		expect(groups[0]!.heading).toBeNull();
		expect(groups[0]!.rows.map((row) => [row.first.label, row.cells])).toEqual([
			['one', []],
			['two', []],
		]);
	});

	test('a table without columns draws no rows, and still counts them', async () => {
		const { groups, lines, span } = await view({ columns: [], rows: [[], []] });

		expect(groups).toEqual([]);
		expect(span).toBe(0);
		expect(lines).toBe(3);
	});

	test('every table row has a line of its own, in order, whatever its group', async () => {
		const { groups, lines } = buildView(await valid(example('access-review')), everything);
		const drawn = groups.flatMap((group) => [...(group.heading ? [group.line] : []), ...group.rows.map((row) => row.line)]);

		expect(drawn).toEqual(Array.from({ length: lines - 1 }, (_, index) => index + 1));
	});
});

describe('what a cell shows', () => {
	test('a cell which the value shares by name is one view, wherever it is used', async () => {
		const { groups, legend } = await view({
			shared: { yes: { icon: 'check', tip: 'Yes' } },
			columns: [text('A'), text('B'), text('C')],
			rows: [
				[text('one'), 'yes', 'yes'],
				[text('two'), 'yes', { use: 'yes' }],
			],
			legend: ['yes'],
		});
		const [first, second] = groups[0]!.rows;

		expect(first!.cells[1]).toBe(first!.cells[0]);
		expect(second!.cells[0]).toBe(first!.cells[0]);
		expect(legend[0]).toBe(first!.cells[0]);
		// A cell which builds on the shared one is a cell of its own.
		expect(second!.cells[1]).not.toBe(first!.cells[0]);
		expect(second!.cells[1]).toEqual(first!.cells[0]);
	});

	test('a cell of one piece is drawn without an element for the piece, with its style on the cell', async () => {
		const late = text('Late', { icon: 'schedule', color: '#E35169', weight: 600, italic: true, background: '#E3516926' });
		const { columns } = await view({ columns: [late], rows: [] });

		expect(columns[0]).toMatchObject({
			text: 'Late',
			icon: 'schedule',
			lines: null,
			class: 'jt-text jt-fill',
			fill: { '--jt-fill': '#E3516926' },
			box: { color: '#E35169', fontWeight: '600', fontStyle: 'italic', '--jt-fill': '#E3516926' },
			label: 'Late',
		});
		expect(columns[0]!.drawn).toEqual([
			[{ text: 'Late', icon: 'schedule', link: null, class: 'jt-text', style: { color: '#E35169', fontWeight: '600', fontStyle: 'italic' }, title: undefined }],
		]);
	});

	test('a cell of several pieces has them by line, and its text is all of theirs', async () => {
		const parts = [text('12', { weight: 600 }), text('copies'), text('3 on loan', { break: true, color: '#6644FF' })];
		const { columns } = await view({ columns: [{ text: parts }], rows: [] });

		expect(columns[0]!.lines!.map((line) => line.map((piece) => [piece.text, piece.style]))).toEqual([
			[
				['12', { fontWeight: '600' }],
				['copies', undefined],
			],
			[['3 on loan', { color: '#6644FF' }]],
		]);
		expect(columns[0]).toMatchObject({ text: '', icon: undefined, label: '12 copies 3 on loan', class: 'jt-text', box: undefined });
	});

	test('a cell without text, such as an icon or a background alone, is not marked as text', async () => {
		const { columns } = await view({ columns: [{ icon: 'check' }, { background: '#E3516926' }, {}], rows: [] });

		expect(columns.map((column) => column.class)).toEqual(['', 'jt-fill', '']);
		expect(columns.map((column) => column.drawn[0]![0]!.class)).toEqual(['', '', '']);
	});

	test('the legend holds its entries as cells, and their tips as the labels', async () => {
		const { legend } = buildView(await valid(example('status-board')), everything);

		expect(legend.map((entry) => [entry.icon ?? entry.text, entry.tip])).toEqual([
			['check_circle', 'Healthy'],
			['schedule', 'Degraded'],
			['error', 'Down'],
			['n/a', 'Not deployed'],
		]);
	});
});

describe('the Maximum Height option', () => {
	test.each<[unknown, number | null]>([
		[400, 400],
		['400', 400],
		[MIN_HEIGHT, MIN_HEIGHT],
		[MIN_HEIGHT - 1, MIN_HEIGHT],
		[1, MIN_HEIGHT],
		['2', MIN_HEIGHT],
		[0, null],
		['0', null],
		['', null],
		[-1, null],
		[null, null],
		[undefined, null],
		['tall', null],
		[Number.NaN, null],
		[Number.POSITIVE_INFINITY, null],
	])('%j is a limit of %j', (option, limit) => {
		expect(heightLimit(option as number)).toBe(limit);
	});
});

describe('the Sticky options', () => {
	test.each<[unknown, number]>([
		[2, 2],
		['2', 2],
		[2.9, 2],
		[0, 0],
		['0', 0],
		[-1, 0],
		[MAX_STICKY, MAX_STICKY],
		[MAX_STICKY + 1, MAX_STICKY],
		[1000, MAX_STICKY],
		['', 7],
		[null, 7],
		[undefined, 7],
		['many', 7],
		[Number.NaN, 7],
	])('%j pins %i, where the default is 7 and there is room for any number', (option, count) => {
		expect(stickyCount(option as number, 7, 100)).toBe(count);
	});

	test('never more than there are rows or columns', () => {
		expect(stickyCount(5, 1, 3)).toBe(3);
		expect(stickyCount(null, 1, 0)).toBe(0);
	});

	test('with no option set, the first column is pinned, and the header row once the height is limited', () => {
		expect(DEFAULT_STICKY).toEqual({ left: 1, right: 0, top: 1, bottom: 0 });
		expect(wantedPins({}, 6, 20)).toEqual({ left: 1, right: 0, top: 0, bottom: 0 });
		expect(wantedPins({ maxHeight: 400 }, 6, 20)).toEqual({ left: 1, right: 0, top: 1, bottom: 0 });
	});

	test('rows are pinned only with a maximum height', () => {
		const options = { stickyLeft: 2, stickyRight: 1, stickyTop: 2, stickyBottom: 1 };

		expect(wantedPins(options, 6, 20)).toEqual({ left: 2, right: 1, top: 0, bottom: 0 });
		expect(wantedPins({ ...options, maxHeight: 0 }, 6, 20)).toEqual({ left: 2, right: 1, top: 0, bottom: 0 });
		expect(wantedPins({ ...options, maxHeight: 100 }, 6, 20)).toEqual({ left: 2, right: 1, top: 2, bottom: 1 });
	});

	test('more pins than there are columns or rows: the start is served first, and nothing is pinned twice', () => {
		const all = { stickyLeft: 10, stickyRight: 10, stickyTop: 10, stickyBottom: 10, maxHeight: 400 };

		expect(wantedPins(all, 30, 40)).toEqual({ left: 10, right: 10, top: 10, bottom: 10 });
		expect(wantedPins(all, 12, 14)).toEqual({ left: 10, right: 2, top: 10, bottom: 4 });
		expect(wantedPins(all, 3, 4)).toEqual({ left: 3, right: 0, top: 4, bottom: 0 });
		expect(wantedPins(all, 0, 1)).toEqual({ left: 0, right: 0, top: 1, bottom: 0 });
	});

	test('options as text, as the API can store them', () => {
		expect(wantedPins({ stickyLeft: '2', stickyRight: '', stickyTop: '0', stickyBottom: '3', maxHeight: '500' }, 6, 20)).toEqual({
			left: 2,
			right: 0,
			top: 0,
			bottom: 3,
		});
	});
});

describe('the Column Labels option', () => {
	test('has three settings, and automatic is the default', () => {
		expect(COLUMN_LABELS).toEqual(['auto', 'rotated', 'across']);
		expect(DEFAULT_COLUMN_LABELS).toBe('auto');
	});

	test('on their side and across hold whatever fits', () => {
		for (const fitting of [null, 0, 100]) {
			expect(rotates('rotated', 2, fitting)).toBe(true);
			expect(rotates('across', 200, fitting)).toBe(false);
		}
	});

	test('automatic turns the labels when the columns after the first do not all fit', () => {
		expect(rotates('auto', 6, 5)).toBe(false);
		expect(rotates('auto', 6, 4)).toBe(true);
		expect(rotates('auto', 1, 0)).toBe(false);
		expect(rotates('auto', 0, 0)).toBe(false);
	});

	test('before the first measurement a small table is written across', () => {
		expect(rotates('auto', ROTATE_ABOVE + 1, null)).toBe(false);
		expect(rotates('auto', ROTATE_ABOVE + 2, null)).toBe(true);
	});

	test('an option which was never set, or holds something else, is automatic', () => {
		for (const option of [null, undefined, '', 'sideways']) {
			expect(rotates(option, 6, 5)).toBe(false);
			expect(rotates(option, 6, 4)).toBe(true);
		}
	});

	test('how many columns fit is what is left of the width after the first column, in columns of 7.5rem', () => {
		expect(COLUMN_WIDTH).toBe(7.5);
		expect(fittingColumns(1000, 250, 16)).toBe(6);
		expect(fittingColumns(1000, 280, 16)).toBe(6);
		expect(fittingColumns(1000, 281, 16)).toBe(5);
		expect(fittingColumns(1000, 250, 20)).toBe(5);
		expect(fittingColumns(200, 250, 16)).toBe(0);
	});
});

describe('pinViews', () => {
	const classes = { start: 'jt-pin-start', end: 'jt-pin-end' };
	const property = { start: 'insetInlineStart', end: 'insetInlineEnd' };

	test('nothing is pinned before there are pins', () => {
		expect(pinViews(5, undefined, classes, property)).toEqual([]);
		expect(pinViews(5, { start: [], end: [] }, classes, property)).toEqual([]);
	});

	test('each pin has its offset from its edge, and the innermost of an edge is marked', () => {
		const views = pinViews(6, { start: [0, 200], end: [0] }, classes, property);

		expect(views).toHaveLength(6);
		expect(views[0]).toEqual({ class: 'jt-pin-start', style: { insetInlineStart: '0px' } });
		expect(views[1]).toEqual({ class: 'jt-pin-start jt-pin-edge', style: { insetInlineStart: '200px' } });
		expect([views[2], views[3], views[4]]).toEqual([undefined, undefined, undefined]);
		expect(views[5]).toEqual({ class: 'jt-pin-end jt-pin-edge', style: { insetInlineEnd: '0px' } });
	});

	test('the end is counted from the last row or column', () => {
		const views = pinViews(10, { start: [], end: [0, 30, 70] }, { start: 'top', end: 'bottom' }, { start: '--jt-pin', end: '--jt-pin' });

		expect(views[9]).toEqual({ class: 'bottom', style: { '--jt-pin': '0px' } });
		expect(views[8]).toEqual({ class: 'bottom', style: { '--jt-pin': '30px' } });
		expect(views[7]).toEqual({ class: 'bottom jt-pin-edge', style: { '--jt-pin': '70px' } });
		expect(views[0]).toBeUndefined();
	});
});

describe('pinCover', () => {
	test('is the size of what is pinned at each edge', () => {
		const start = [200, 40, 40];
		const end = [60, 50];

		expect(pinCover(fitPins(start, end, 900), start, end)).toEqual({ start: 280, end: 110 });
	});

	test('counts only the pins which fitted', () => {
		const start = [300, 10, 500];
		const end = [200];
		const pins = fitPins(start, end, 600);

		expect(pins).toEqual({ start: [0, 300], end: [] });
		expect(pinCover(pins, start, end)).toEqual({ start: 310, end: 0 });
	});

	test('is nothing where nothing is pinned', () => {
		expect(pinCover({ start: [], end: [] }, [200], [60])).toEqual({ start: 0, end: 0 });
	});
});
