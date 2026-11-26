// Browser tests of the JSON Table interface in the sandbox Directus (see ../../../sandbox/README.md): that the built
// bundle loads in a real Data Studio and draws a value, whatever the value holds and whatever the theme. The other
// specs beside this one have the cells, the links and the layout.
import { expect, openItem, test } from '../../../sandbox/support/fixtures.ts';
import { BASE_URL } from '../../../sandbox/support/sandbox.ts';
import { IMAGE, MUSTACHE, SCRIPT, hostile } from '../tests/helpers.ts';
import { cell, drawerOf, dropReader, example, makeCollection, makeItem, makeReader, openTable, sheet, signedIn, wrap } from './json-table-support.ts';
import type { Credentials, Page } from './json-table-support.ts';

const COLLECTION = 'sandbox_json_table';

const PINNED = { maxHeight: 320, stickyRight: 1, stickyTop: 2 };

// A table with a filled cell, a pinned column and two pinned rows, to look at under forced colours.
const FILLED = wrap({
	columns: [cell('Day'), cell('Morning'), cell('Afternoon'), cell('Total')],
	rows: Array.from({ length: 20 }, (_, index) => [cell(`Day ${index + 1}`), cell('Open', { background: '#E3516926' }), cell(index), cell(index * 2)]),
});

const values: Record<string, unknown> = {
	'status-board': example('status-board'),
	'access-review': example('access-review'),
	compressed: example('compressed'),
	empty: null,
	invalid: { version: 1, data: { columns: 'not a list', rows: [] } },
	hostile: wrap(hostile()),
};

const ids: Record<string, number> = {};
let reader: Credentials;

test.beforeAll(async ({ api }) => {
	await makeCollection(api, COLLECTION, [sheet('table'), sheet('pinned', PINNED)]);

	for (const [title, table] of Object.entries(values)) ids[title] = await makeItem(api, COLLECTION, { title, table });
	ids.filled = await makeItem(api, COLLECTION, { title: 'filled', pinned: FILLED });

	reader = await makeReader(api, 'drawing', [COLLECTION]);
});

test.afterAll(async ({ api }) => {
	await dropReader(api, 'drawing');
	await api.drop(COLLECTION);
});

for (const name of ['status-board', 'access-review']) {
	test(`draws the ${name} example`, async ({ page }) => {
		const { columns, rows } = (values[name] as { data: { columns: unknown[]; rows: unknown[][] } }).data;
		const root = await openTable(page, COLLECTION, ids[name]!);

		await expect(root.locator('thead th')).toHaveCount(columns.length);
		await expect(root.locator('tbody tr')).toHaveCount(rows.length);
		await expect(root.locator('tbody td')).toHaveCount(rows.filter((row) => row.length > 1).length * (columns.length - 1));
		await expect(root.locator('.v-notice')).toHaveCount(0);
	});
}

test('unpacks and draws a compressed value', async ({ page }) => {
	const root = await openTable(page, COLLECTION, ids.compressed!);

	// The compressed example is the access review.
	await expect(root.locator('tbody tr')).toHaveCount(example('access-review').data.rows.length);
	await expect(root.locator('thead th').first()).toHaveText('Policy');
});

test('shows the placeholder for an empty field', async ({ page }) => {
	await openItem(page, COLLECTION, ids.empty!);
	const root = page.locator('main .field[data-field="table"] .json-table');

	await expect(root.locator('.jt-empty')).toHaveText('No table yet');
	await expect(root.locator('.jt-grid')).toHaveCount(0);
});

test('shows one notice and no table for an invalid value', async ({ page }) => {
	await openItem(page, COLLECTION, ids.invalid!);
	const root = page.locator('main .field[data-field="table"] .json-table');

	await expect(root.locator('.v-notice')).toHaveCount(1);
	await expect(root.locator('.v-notice')).toContainText('Unable to display this table');
	await expect(root.locator('.v-notice')).toContainText('columns must be an array');
	await expect(root.locator('.jt-grid')).toHaveCount(0);

	// The icon of the notice is the app's own, which draws it. The rule which draws the icons of a table must not
	// reach it: it would draw the icon a second time, over the title.
	const icon = root.locator('.v-notice [data-icon]');
	await expect(icon).toHaveCount(1);

	const [name, before] = await icon.evaluate((element) => [element.getAttribute('data-icon'), getComputedStyle(element, '::before').content]);
	expect(name).toBeTruthy();
	expect(before).not.toContain(name);
});

test('a table full of markup and template syntax is drawn as text, and nothing in it runs or loads', async ({ page }) => {
	const dialogs: string[] = [];
	const requests: string[] = [];

	page.on('dialog', (dialog) => {
		dialogs.push(dialog.message());
		void dialog.dismiss();
	});
	page.on('request', (request) => requests.push(request.url()));

	const root = await openTable(page, COLLECTION, ids.hostile!);
	const table = hostile() as { columns: unknown[]; rows: unknown[][]; legend: unknown[] };

	await expect(root.locator('thead th')).toHaveCount(table.columns.length);
	await expect(root.locator('tbody tr')).toHaveCount(table.rows.length);
	await expect(root.locator('.jt-legend li')).toHaveCount(table.legend.length);

	// The markup is there as text: in the header, in a heading, in the cells and in the tooltips.
	await expect(root.locator('thead th').nth(1)).toHaveText(SCRIPT);
	await expect(root.locator('thead th').nth(2)).toHaveText(IMAGE);
	await expect(root.locator('thead th').nth(3)).toHaveText(MUSTACHE);
	await expect(root.locator('tbody th[scope="rowgroup"]').first()).toHaveText(SCRIPT);
	await expect(root.locator('thead th').nth(1)).toHaveAttribute('title', `${SCRIPT}\n${IMAGE}`);

	// And none of it became an element: the table holds only what the interface itself draws.
	const tags = await root.evaluate((element) => [...new Set(Array.from(element.querySelectorAll('*'), (inner) => inner.tagName.toLowerCase()))].sort());
	expect(tags).toEqual(['bdi', 'div', 'li', 'span', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul']);
	expect(await root.locator('[href], [src], [onerror], [onclick]').count()).toBe(0);

	// Its links name collections which the project does not have, so every one of them is text.
	await expect(root.locator('.jt-link')).toHaveCount(0);

	expect(dialogs).toEqual([]);
	expect(requests.filter((url) => !url.startsWith(BASE_URL) && !url.startsWith('data:') && !url.startsWith('blob:'))).toEqual([]);
	expect(requests.filter((url) => /\/x$|onerror|example\.com|javascript:/.test(url))).toEqual([]);
});

test('in a batch edit the field says that no table is shown, and not that the field is empty', async ({ page }) => {
	await page.goto(`/admin/content/${COLLECTION}`);

	const boxes = page.locator('main table tbody tr .v-checkbox');
	await boxes.nth(0).click();
	await boxes.nth(1).click();
	await page.locator('header .v-button:has(i[data-icon="edit"]) button').click();

	const field = drawerOf(page).locator('.field[data-field="table"] .json-table');

	await expect(field).toHaveText('A table is not shown while several items are edited');
	await expect(field.locator('.jt-grid')).toHaveCount(0);
});

/** The colour a token of the theme comes to in a page, as the browser writes a computed colour. */
const tokenOf = (page: Page, token: string) =>
	page.evaluate((name) => {
		const probe = document.createElement('i');
		probe.style.color = `var(${name})`;
		document.querySelector('main')!.append(probe);
		const { color } = getComputedStyle(probe);
		probe.remove();
		return color;
	}, token);

test('in the dark theme the examples are painted from the dark tokens', async ({ browser, page }) => {
	// The tokens of the light theme, from the page of the administrator, to tell the dark ones from.
	await openTable(page, COLLECTION, ids['status-board']!);
	const light = await tokenOf(page, '--theme--background');

	const session = await signedIn(browser, reader, { colorScheme: 'dark' });

	try {
		const shown = session.page;
		const root = await openTable(shown, COLLECTION, ids['status-board']!);

		await expect(shown.locator('body')).toHaveClass(/dark/);

		const background = await tokenOf(shown, '--theme--background');
		const subdued = await tokenOf(shown, '--theme--background-subdued');
		const normal = await tokenOf(shown, '--theme--background-normal');
		expect(background).not.toBe(light);

		// The cells, the header row and a heading each have the background of their token.
		await expect(root.locator('tbody td').first()).toHaveCSS('background-color', background);
		await expect(root.locator('thead th').first()).toHaveCSS('background-color', subdued);
		await expect(root.locator('tbody th[scope="rowgroup"]').first()).toHaveCSS('background-color', normal);
		await expect(root.locator('.jt-scroll')).toHaveCSS('background-color', background);

		// A colour of the value which is a theme variable follows the theme, and a hex colour stays what it is.
		await expect(root.locator('td[data-icon="check_circle"]').first()).toHaveCSS('color', await tokenOf(shown, '--theme--success'));
		await expect(root.locator('.jt-piece', { hasText: 'beta' })).toHaveCSS('color', 'rgb(102, 68, 255)');

		// The other example, and the compressed one, draw there too.
		await expect((await openTable(shown, COLLECTION, ids['access-review']!)).locator('tbody tr')).toHaveCount(13);
		await expect((await openTable(shown, COLLECTION, ids.compressed!)).locator('tbody tr')).toHaveCount(13);

		expect(session.errors).toEqual([]);
	} finally {
		await session.close();
	}
});

test('print keeps the backgrounds, and under forced colours a filled cell and the pinned edges are marked with lines', async ({ page }) => {
	const root = await openTable(page, COLLECTION, ids.filled!, 'pinned');
	const filled = root.locator('tbody td.jt-fill').first();
	const edge = root.locator('tbody td.jt-pin-end.jt-pin-edge').first();
	// The innermost pinned row is the first row of the body. The header row would not do: its line is heavier anyway.
	const under = root.locator('tbody tr.jt-pin-top.jt-pin-edge td').first();

	await expect(root).toHaveCSS('print-color-adjust', 'exact');
	await expect(filled).toHaveCSS('background-image', /linear-gradient/);
	await expect(filled).toHaveCSS('outline-style', 'none');
	await expect(edge).toHaveCSS('border-inline-start-width', '1px');
	await expect(under).toHaveCSS('border-block-end-width', '1px');

	await page.emulateMedia({ forcedColors: 'active' });

	// The background of the value would lie under text which the system has recoloured, so a line stands in for it.
	await expect(filled).toHaveCSS('background-image', 'none');
	await expect(filled).toHaveCSS('outline-style', 'solid');
	await expect(edge).toHaveCSS('border-inline-start-width', '2px');
	await expect(under).toHaveCSS('border-block-end-width', '2px');

	await page.emulateMedia({ forcedColors: 'none' });
	await expect(filled).toHaveCSS('background-image', /linear-gradient/);
});
