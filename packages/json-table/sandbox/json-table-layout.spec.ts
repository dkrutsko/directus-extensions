// Browser tests of how a table is laid out by its options: the pinned rows and columns, the two header layouts, the
// stretching of a narrow table, when the box is a stop for the Tab key, and the form of the options itself
// (json-table-support.ts has what the specs share). Positions are compared with each other and with the box, never
// with a number of pixels: fonts, and with them every width, differ from one system to the next.
import { expect, test } from '../../../sandbox/support/fixtures.ts';
import { boxOf, cell, drawerOf, insideOf, makeCollection, makeItem, openTable, scrollTable, sheet, tableOf, wrap } from './json-table-support.ts';
import type { Locator } from './json-table-support.ts';

const COLLECTION = 'sandbox_json_table_layout';

/** A table of `wide` columns and `tall` rows, the first and the eleventh of which are headings, with a Total column and a Total row. */
const grid = (wide: number, tall: number) =>
	wrap({
		columns: [cell('Shelf'), ...Array.from({ length: wide - 2 }, (_, column) => cell(`Week ${column + 1}`)), cell('Total')],
		rows: Array.from({ length: tall }, (_, row) => {
			if (row === 0 || row === 10) return [cell(`Group ${row}`)];
			return [cell(row === tall - 1 ? 'Total' : `Shelf ${row}`), ...Array.from({ length: wide - 1 }, (_, column) => cell(row * (column + 1)))];
		}),
	});

const LARGE = grid(14, 40);
const SMALL = grid(4, 4);

let id = 0;

test.beforeAll(async ({ api }) => {
	await makeCollection(api, COLLECTION, [
		sheet('pinned', { maxHeight: 320, columnLabels: 'across', stickyLeft: 2, stickyRight: 1, stickyTop: 2, stickyBottom: 1 }),
		sheet('page', { columnLabels: 'across', stickyRight: 1, stickyTop: 2, stickyBottom: 1 }),
		sheet('many', { maxHeight: 100, columnLabels: 'across', stickyLeft: 10, stickyRight: 10, stickyTop: 10, stickyBottom: 10 }),
		sheet('none', { maxHeight: 320, columnLabels: 'across', stickyLeft: 0, stickyTop: 0 }),
		sheet('auto_few'),
		sheet('auto_many'),
		sheet('rotated_few', { columnLabels: 'rotated' }),
		sheet('across_many', { columnLabels: 'across' }),
		sheet('snug', { stickyRight: 1, columnLabels: 'rotated' }),
	]);

	id = await makeItem(api, COLLECTION, {
		title: 'layout',
		pinned: LARGE,
		page: LARGE,
		many: LARGE,
		none: LARGE,
		auto_few: SMALL,
		auto_many: grid(30, 4),
		rotated_few: SMALL,
		across_many: grid(30, 4),
		snug: SMALL,
	});
});

test.afterAll(async ({ api }) => {
	await api.drop(COLLECTION);
});

/** Whether two positions are the same, give or take the rounding of a border. */
const near = (actual: number, expected: number) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1);

test('with a maximum height the rows and columns asked for stay at their edges while the rest scrolls', async ({ page }) => {
	const root = await openTable(page, COLLECTION, id, 'pinned');
	const rows = root.locator('.jt-grid tr');
	const header = rows.nth(0).locator('th');
	const second = rows.nth(1).locator('th');
	const total = rows.last().locator('th, td');
	const sample = rows.nth(5).locator('th, td');

	await expect(root.locator('.jt-scroll')).toHaveCSS('max-block-size', '320px');
	await expect(rows.nth(0)).toHaveClass(/jt-pin-top/);
	await expect(rows.nth(1)).toHaveClass(/jt-pin-top jt-pin-edge/);
	await expect(rows.last()).toHaveClass(/jt-pin-bottom jt-pin-edge/);
	await expect(sample.nth(0)).toHaveClass(/jt-pin-start/);
	await expect(sample.nth(1)).toHaveClass(/jt-pin-start jt-pin-edge/);
	await expect(sample.last()).toHaveClass(/jt-pin-end jt-pin-edge/);
	await expect(sample.nth(2)).not.toHaveClass(/jt-pin/);

	for (const where of ['end', 'start'] as const) {
		await scrollTable(root, where);

		const inside = await insideOf(root);
		const corner = await boxOf(header.nth(0));

		// The header row at the top, the heading which is the second row under it, the last row at the bottom.
		near(corner.top, inside.top);
		near((await boxOf(second)).top, corner.bottom);
		near((await boxOf(total.nth(3))).bottom, inside.bottom);

		// Two columns at the start, one after the other, and one at the end, in a row of the middle.
		near((await boxOf(sample.nth(0))).left, inside.left);
		near((await boxOf(sample.nth(1))).left, (await boxOf(sample.nth(0))).right);
		near((await boxOf(sample.last())).right, inside.right);

		// The corners hold: the first header cell, and the Total of the Totals.
		near(corner.left, inside.left);
		near((await boxOf(total.last())).right, inside.right);
		near((await boxOf(total.last())).bottom, inside.bottom);
	}

	// What is not pinned did scroll: at the end, the third column is out of view to the left.
	await scrollTable(root, 'end');
	expect((await boxOf(sample.nth(2))).right).toBeLessThan((await insideOf(root)).left);
});

test('without a maximum height no row is pinned, since the page scrolls and not the table, and the columns still are', async ({ page }) => {
	const root = await openTable(page, COLLECTION, id, 'page');

	await expect(root.locator('.jt-pin-top, .jt-pin-bottom')).toHaveCount(0);
	await expect(root.locator('.jt-scroll')).toHaveCSS('max-block-size', 'none');
	await expect(root.locator('thead th.jt-pin-start')).toHaveCount(1);
	await expect(root.locator('thead th.jt-pin-end')).toHaveCount(1);

	await scrollTable(root, 'end');
	const inside = await insideOf(root);

	near((await boxOf(root.locator('thead th').first())).left, inside.left);
	near((await boxOf(root.locator('thead th').last())).right, inside.right);
});

test('pins which are set to none are none, and the labels scroll away', async ({ page }) => {
	const root = await openTable(page, COLLECTION, id, 'none');

	await expect(root.locator('[class*="jt-pin"]')).toHaveCount(0);

	await scrollTable(root, 'end');
	const inside = await insideOf(root);

	expect((await boxOf(root.locator('thead th').first())).bottom).toBeLessThan(inside.top);
	expect((await boxOf(root.locator('tbody th[scope="row"]').last())).right).toBeLessThan(inside.left);
});

/** The size, across or down, which the pinned cells of one line through the table take up. */
const covered = async (cells: Locator, side: 'width' | 'height') => {
	let sum = 0;
	for (const pinned of await cells.all()) sum += (await boxOf(pinned))[side];
	return sum;
};

test('more pins than fit are cut back to two thirds of the width and of the height, and a height under 320 counts as 320', async ({ page }) => {
	const root = await openTable(page, COLLECTION, id, 'many');
	const inside = await insideOf(root);
	const columns = root.locator('thead th.jt-pin-start, thead th.jt-pin-end');
	const lines = root.locator('tr.jt-pin-top > :first-child, tr.jt-pin-bottom > :first-child');

	await expect(root.locator('.jt-scroll')).toHaveCSS('max-block-size', '320px');

	// Ten were asked for at each edge of a table with 14 columns and 40 rows: some are pinned, and not all of them.
	const across = await columns.count();
	const down = await lines.count();

	expect(across).toBeGreaterThan(0);
	expect(across).toBeLessThan(14);
	expect(down).toBeGreaterThan(0);
	expect(down).toBeLessThan(20);

	// Together they leave a third of the box to what scrolls, in each direction on its own.
	expect(await covered(columns, 'width')).toBeLessThanOrEqual((inside.width * 2) / 3 + 1);
	expect(await covered(lines, 'height')).toBeLessThanOrEqual((inside.height * 2) / 3 + 1);

	// And one more would not have fitted: the pins are taken from the two edges in turn, so the next one is the
	// first cell after the pinned ones at the start, or the last before those at the end.
	const starts = await root.locator('thead th.jt-pin-start').count();
	const next = await boxOf(root.locator('thead th').nth(starts));
	expect((await covered(columns, 'width')) + next.width).toBeGreaterThan((inside.width * 2) / 3 - 1);

	// Both edges are served.
	await expect(root.locator('thead th.jt-pin-end')).not.toHaveCount(0);
	await expect(root.locator('tr.jt-pin-bottom')).not.toHaveCount(0);
});

test('Column Labels: automatic writes the labels across while the columns fit, and turns them when they do not', async ({ page }) => {
	const few = await openTable(page, COLLECTION, id, 'auto_few');
	const many = await tableOf(page, 'auto_many');

	// Four columns fit a field of the full width of the form, and thirty do not, whatever the font.
	await expect(few.locator('.jt-grid')).not.toHaveClass(/jt-rotated/);
	await expect(few.locator('.jt-column-label').first()).toHaveCSS('writing-mode', 'horizontal-tb');

	await expect(many.locator('.jt-grid')).toHaveClass(/jt-rotated/);
	await expect(many.locator('.jt-column-label').first()).toHaveCSS('writing-mode', 'vertical-rl');

	// Turned, a label is taller than it is wide; across, it is the other way round. The first column is never turned.
	const turned = await boxOf(many.locator('.jt-column-label').first());
	const flat = await boxOf(few.locator('.jt-column-label').first());

	expect(turned.height).toBeGreaterThan(turned.width);
	expect(flat.width).toBeGreaterThan(flat.height);
	await expect(many.locator('thead th').first().locator('.jt-label')).toHaveCSS('writing-mode', 'horizontal-tb');
});

test('Column Labels: on their side and across hold whatever the width', async ({ page }) => {
	const rotated = await openTable(page, COLLECTION, id, 'rotated_few');
	const across = await tableOf(page, 'across_many');

	await expect(rotated.locator('.jt-grid')).toHaveClass(/jt-rotated/);
	await expect(rotated.locator('.jt-column-label').first()).toHaveCSS('writing-mode', 'vertical-rl');

	await expect(across.locator('.jt-grid')).not.toHaveClass(/jt-rotated/);
	await expect(across.locator('.jt-column-label').first()).toHaveCSS('writing-mode', 'horizontal-tb');

	// Thirty columns across do not fit, so the table scrolls sideways inside its box, and the form is no wider for it.
	const scroll = across.locator('.jt-scroll');
	expect(await scroll.evaluate((box) => box.scrollWidth > box.clientWidth)).toBe(true);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

	// Every column across is as wide as the others: the width is the label's, not its text's.
	const widths = await across.locator('thead th.jt-column').evaluateAll((cells) => cells.map((entry) => Math.round(entry.getBoundingClientRect().width)));
	expect(new Set(widths).size).toBe(1);
});

test('a table narrower than its field is stretched to fill it, and the first and the sticky columns stay as wide as their content', async ({ page }) => {
	const root = await openTable(page, COLLECTION, id, 'snug');
	const inside = await insideOf(root);
	const table = await boxOf(root.locator('.jt-grid'));
	const header = root.locator('thead th');

	// The table is as wide as the inside of its box, and nothing scrolls.
	near(table.width, inside.width);
	expect(await root.locator('.jt-scroll').evaluate((box) => box.scrollWidth <= box.clientWidth)).toBe(true);

	await expect(header.nth(0)).toHaveClass(/jt-first/);
	await expect(header.nth(3)).toHaveClass(/jt-snug/);
	await expect(header.nth(1)).not.toHaveClass(/jt-snug/);

	// The two columns in the middle share what is left, so each is wider than the pinned Total column, whose cells
	// hold numbers as theirs do.
	const widths = await header.evaluateAll((cells) => cells.map((entry) => entry.getBoundingClientRect().width));

	expect(widths[1]!).toBeGreaterThan(widths[3]! * 2);
	expect(widths[2]!).toBeGreaterThan(widths[3]! * 2);
	near(widths[1]!, widths[2]!);
});

test('the box of a table is a stop for the Tab key only while there is something to scroll', async ({ page }) => {
	const scrolling = (await openTable(page, COLLECTION, id, 'pinned')).locator('.jt-scroll');
	const still = (await tableOf(page, 'snug')).locator('.jt-scroll');

	await expect(scrolling).toHaveAttribute('tabindex', '0');
	await expect(scrolling).toHaveAttribute('role', 'region');
	expect(await still.getAttribute('tabindex')).toBeNull();
	await expect(still).toHaveAttribute('role', 'region');

	// The arrow keys scroll the box which has the focus.
	await scrolling.focus();
	await expect(scrolling).toBeFocused();
	await page.keyboard.press('End');
	await expect.poll(() => scrolling.evaluate((box) => box.scrollTop)).toBeGreaterThan(0);
});

test('the options for sticky rows show only while there is a maximum height', async ({ page }) => {
	const drawer = drawerOf(page);
	const option = (key: string) => drawer.locator(`.v-form .field[data-field="${key}"]`);

	// A field which never had a height: the form shows the default, 0, which is no limit.
	await page.goto(`/admin/settings/data-model/${COLLECTION}/auto_few`);
	await drawer.getByText('Interface', { exact: true }).first().click();

	await expect(option('maxHeight')).toBeVisible();
	await expect(option('stickyLeft')).toBeVisible();
	await expect(option('stickyRight')).toBeVisible();
	await expect(option('stickyTop')).toHaveCount(0);
	await expect(option('stickyBottom')).toHaveCount(0);

	// The name of the placeholder is the app's own word, in the language of the user.
	await expect(option('placeholder')).toContainText('Placeholder');

	await option('maxHeight').locator('input').fill('400');
	await expect(option('stickyTop')).toBeVisible();
	await expect(option('stickyBottom')).toBeVisible();

	// 0, and an input which was emptied, are no height again.
	await option('maxHeight').locator('input').fill('0');
	await expect(option('stickyTop')).toHaveCount(0);
	await option('maxHeight').locator('input').fill('250');
	await expect(option('stickyBottom')).toBeVisible();
	await option('maxHeight').locator('input').fill('');
	await expect(option('stickyTop')).toHaveCount(0);
	await expect(option('stickyBottom')).toHaveCount(0);

	// A field which has a height stored shows them from the start, with what is stored.
	await page.goto(`/admin/settings/data-model/${COLLECTION}/pinned`);
	await drawer.getByText('Interface', { exact: true }).first().click();

	await expect(option('stickyTop').locator('input')).toHaveValue('2');
	await expect(option('stickyBottom').locator('input')).toHaveValue('1');

	// What is stored for them is kept while they are hidden, and is there again with a height.
	await option('maxHeight').locator('input').fill('0');
	await expect(option('stickyTop')).toHaveCount(0);
	await option('maxHeight').locator('input').fill('500');
	await expect(option('stickyTop').locator('input')).toHaveValue('2');
	await expect(option('stickyBottom').locator('input')).toHaveValue('1');
});
