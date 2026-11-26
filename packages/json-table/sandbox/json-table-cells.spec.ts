// Browser tests of what a table says about its cells: the tooltips, the legend, the headings as groups of rows, and
// what assistive technology is told (json-table-support.ts has what the specs share).
import { expect, test } from '../../../sandbox/support/fixtures.ts';
import { boxOf, cell, example, makeCollection, makeItem, openTable, sheet, wrap } from './json-table-support.ts';

const COLLECTION = 'sandbox_json_table_cells';
const PEOPLE = 'sandbox_json_table_cells_people';

// Longer than a heading is wide in any font, since the label of a heading is 24rem at the most, and shorter than the
// 200 characters at which the format cuts text.
const LONG_HEADING = 'Ground floor, which is open from nine in the morning until seven in the evening on every day of the week but Sunday';

const HEBREW = 'שרה';

let person = 0;
let id = 0;
let board = 0;

/** The table of the tests: three groups of rows, the first without a heading, and a cell of every kind which has something to say. */
const timetable = () =>
	wrap({
		shared: {
			yes: { icon: 'check_circle', color: 'var(--theme--success)', tip: 'Included' },
			kids: { background: 'var(--theme--primary-background)', tip: 'For children' },
			late: { background: '#E3516926', tip: 'Late' },
			bare: { icon: 'local_cafe' },
			who: { text: 'Priya Shah', tip: 'The librarian', link: { collection: PEOPLE, id: String(person) } },
		},
		columns: [cell('Room'), cell('Morning', { tip: 'Until noon' }), cell('Afternoon'), { icon: 'schedule', tip: 'Evening' }],
		rows: [
			[cell('Front desk'), 'yes', 'bare', { text: [{ icon: 'add_circle', tip: 'Gained' }, { icon: 'remove_circle', tip: 'Lost' }] }],
			[cell(LONG_HEADING)],
			[cell('Hall', { tip: '80 seats' }), 'yes', 'kids', cell('Yoga', { tip: 'Bring a mat' })],
			[cell('First floor', { icon: 'stairs', tip: 'Up the stairs' })],
			[cell('Study room'), { tip: 'Changes', text: [cell('+4', { tip: 'Gained' }), cell('-1')] }, 'late', 'who'],
		],
		legend: ['yes', 'kids', 'late', { text: [HEBREW, 'one', 'two'], tip: 'Two scripts' }, 'who', { color: '#E35169', tip: 'Only a colour' }],
	});

test.beforeAll(async ({ api }) => {
	await api.drop(COLLECTION);
	await makeCollection(api, PEOPLE, []);
	person = await makeItem(api, PEOPLE, { title: 'Priya Shah' });

	await makeCollection(api, COLLECTION, [sheet('timetable'), sheet('board')]);
	id = await makeItem(api, COLLECTION, { title: 'cells', timetable: timetable() });
	board = await makeItem(api, COLLECTION, { title: 'board', board: example('status-board') });
});

test.afterAll(async ({ api }) => {
	await api.drop(COLLECTION, PEOPLE);
});

test('a header cell, a row header and a heading show their text and then their tip', async ({ page }) => {
	const root = await openTable(page, COLLECTION, id, 'timetable');
	const header = root.locator('thead th');
	const headings = root.locator('tbody th[scope="rowgroup"]');

	await expect(header.nth(0)).toHaveAttribute('title', 'Room');
	await expect(header.nth(1)).toHaveAttribute('title', 'Morning\nUntil noon');
	await expect(header.nth(3)).toHaveAttribute('title', 'Evening');
	await expect(root.locator('tbody th[scope="row"]').nth(1)).toHaveAttribute('title', 'Hall\n80 seats');

	// A heading which is cut off says all of its text, with or without a tip.
	await expect(headings.nth(0)).toHaveAttribute('title', LONG_HEADING);
	await expect(headings.nth(1)).toHaveAttribute('title', 'First floor\nUp the stairs');

	const cut = await headings.nth(0).locator('.jt-line').evaluate((line) => line.scrollWidth > line.clientWidth);
	expect(cut, 'the long heading is cut off, so the tooltip is the only place which has all of it').toBe(true);
});

test('any other cell shows its tip after the labels of its column and its row, and a part its own', async ({ page }) => {
	const root = await openTable(page, COLLECTION, id, 'timetable');
	const row = (index: number) => root.locator('tbody tr.jt-row').nth(index).locator('td');

	await expect(row(0).nth(0)).toHaveAttribute('title', 'Morning - Front desk: Included');
	await expect(row(1).nth(1)).toHaveAttribute('title', 'Afternoon - Hall: For children');
	// The column has no text, so only the row is named.
	await expect(row(1).nth(2)).toHaveAttribute('title', 'Hall: Bring a mat');
	// A cell without a tip has no tooltip.
	expect(await row(0).nth(1).getAttribute('title')).toBeNull();
	expect(await row(0).nth(2).getAttribute('title')).toBeNull();

	const parts = row(2).nth(0).locator('.jt-piece');
	await expect(row(2).nth(0)).toHaveAttribute('title', 'Morning - Study room: Changes');
	await expect(parts.nth(0)).toHaveAttribute('title', 'Morning - Study room: Gained');
	expect(await parts.nth(1).getAttribute('title')).toBeNull();
});

test('the legend draws each entry as it is in the table, a background alone as a swatch, and then its tip', async ({ page }) => {
	const root = await openTable(page, COLLECTION, id, 'timetable');
	const entries = root.locator('.jt-legend li');

	await expect(entries).toHaveCount(6);
	await expect(entries.nth(0)).toHaveText('Included');
	await expect(entries.nth(1)).toHaveText('For children');
	await expect(entries.nth(4)).toHaveText('Priya ShahThe librarian');

	// An icon is drawn by the entry itself.
	await expect(entries.nth(0).locator('.jt-glyph [data-icon="check_circle"]')).toHaveCount(1);

	const rem = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize));

	// A background alone has nothing in it to give it a size, and is a swatch all the same.
	for (const index of [1, 2]) {
		const swatch = entries.nth(index).locator('.jt-glyph');
		const box = await boxOf(swatch);

		await expect(swatch).toHaveCSS('background-image', /linear-gradient/);
		await expect(swatch).toHaveText('');
		expect(box.width).toBeGreaterThan(0);
		expect(box.height).toBeGreaterThan(0);
		// As tall as an icon at the least, which is 1.25rem.
		expect(box.height).toBeGreaterThanOrEqual(1.25 * rem);
		expect(box.width).toBeGreaterThanOrEqual(1.25 * rem);
	}

	// Parts of an entry which share a line are isolated from each other, as in the table.
	await expect(entries.nth(3).locator('.jt-glyph bdi')).toHaveText([HEBREW, 'one', 'two']);

	// An entry explains a cell and opens nothing: the same cell is a link in the table, and text here.
	await expect(root.locator('tbody .jt-link')).toHaveText('Priya Shah');
	await expect(root.locator('.jt-legend button')).toHaveCount(0);

	// A colour alone draws nothing, as in the table, and its label still stands.
	await expect(entries.nth(5)).toHaveText('Only a colour');
	await expect(entries.nth(5).locator('.jt-glyph')).toHaveCSS('background-image', 'none');
});

test('a heading and the rows under it are a group of rows, and the heading is their header, not a column header', async ({ page }) => {
	const root = await openTable(page, COLLECTION, id, 'timetable');

	// The rows before the first heading, then a group for each heading.
	await expect(root.locator('tbody')).toHaveCount(3);
	const rowsOf = (groups: Element[]) => groups.map((group) => Array.from(group.children, (row) => row.className.split(' ')[0]));

	expect(await root.locator('tbody').evaluateAll(rowsOf)).toEqual([
		['jt-row'],
		['jt-group', 'jt-row'],
		['jt-group', 'jt-row'],
	]);
	await expect(root.locator('th[scope="rowgroup"]')).toHaveCount(2);
	await expect(root.locator('th[scope="colgroup"]')).toHaveCount(0);
	await expect(root.locator('th[scope="rowgroup"]').first()).toHaveAttribute('colspan', '4');

	// What assistive technology is told: four column headers, and the headings among the row headers.
	await expect(root.getByRole('columnheader')).toHaveCount(4);
	await expect(root.getByRole('rowheader', { name: 'First floor' })).toHaveCount(1);
	await expect(root.getByRole('rowheader', { name: LONG_HEADING })).toHaveCount(1);
	await expect(root.getByRole('columnheader', { name: 'First floor' })).toHaveCount(0);
	await expect(root.getByRole('rowgroup')).toHaveCount(4);
});

test('the status board of the examples has its two headings as row headers', async ({ page }) => {
	const root = await openTable(page, COLLECTION, board, 'board');
	const tree = await root.ariaSnapshot();

	expect(tree).toContain('rowheader "Public"');
	expect(tree).toContain('rowheader "Internal"');
	expect(tree).not.toMatch(/columnheader "(public )?Public"/);
});

test('the name of an icon is not read out, and a cell which shows only an icon still has a name', async ({ page }) => {
	const root = await openTable(page, COLLECTION, id, 'timetable');
	const tree = await root.ariaSnapshot();

	// No name of an icon as its font spells it: not in the table, and not in the legend.
	for (const icon of ['check_circle', 'schedule', 'stairs', 'local_cafe', 'add_circle', 'remove_circle']) expect(tree, icon).not.toContain(icon);

	// An icon with a tip is called by the tip, placed like its tooltip.
	await expect(root.getByRole('cell', { name: 'Morning - Front desk: Included' })).toHaveCount(1);
	await expect(root.getByRole('columnheader', { name: 'Evening' })).toHaveCount(1);

	// Without a tip the name of the icon is all there is to say, and it is said as words.
	await expect(root.locator('td[data-icon="local_cafe"]')).toHaveAttribute('aria-label', 'local cafe');
	await expect(root.getByRole('cell', { name: 'local cafe', exact: true })).toHaveCount(1);

	// A cell of icons without a tip of its own is called by the tips of its parts, placed the same way: they are only
	// tooltips of the parts, and the name is read in their place. Its column has no text, so only the row is named.
	await expect(root.getByRole('cell', { name: 'Front desk: Gained, Lost', exact: true })).toHaveCount(1);

	// An icon in front of text adds nothing to the name.
	await expect(root.getByRole('rowheader', { name: 'First floor', exact: true })).toHaveCount(1);

	// The icon itself is still drawn: generated content which holds the name for the icon font.
	const drawn = await root.locator('td[data-icon="check_circle"]').first().evaluate((element) => getComputedStyle(element, '::before').content);
	expect(drawn).toContain('check_circle');

	// In the legend the entry is called by its label alone.
	expect(tree).toContain('- listitem: Included\n');
});

test('the table is a region called by the name of its field, and the legend a list called Legend', async ({ page }) => {
	const root = await openTable(page, COLLECTION, id, 'timetable');

	await expect(root.getByRole('region', { name: 'Timetable', exact: true })).toHaveCount(1);
	await expect(root.getByRole('region', { name: 'Table', exact: true })).toHaveCount(0);
	await expect(root.getByRole('list', { name: 'Legend' })).toHaveCount(1);
});
