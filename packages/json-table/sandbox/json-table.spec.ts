// Browser tests of the JSON Table interface in the sandbox Directus
// (see ../../../sandbox/README.md). They cover what the unit tests cannot:
// that the built bundle loads in a real Data Studio and draws.
import fs from 'node:fs';
import { expect, openItem, test } from '../../../sandbox/support/fixtures.ts';

const COLLECTION = 'sandbox_json_table';

const example = (name: string) =>
	JSON.parse(fs.readFileSync(new URL(`../examples/${name}.json`, import.meta.url), 'utf8'));

const values: Record<string, unknown> = {
	'status-board': example('status-board'),
	'access-review': example('access-review'),
	compressed: example('compressed'),
	empty: null,
	invalid: { version: 1, data: { columns: 'not a list', rows: [] } },
};

const ids: Record<string, number> = {};

test.beforeAll(async ({ api }) => {
	await api.drop(COLLECTION);

	await api.post('/collections', {
		collection: COLLECTION,
		meta: { icon: 'table_chart', display_template: '{{title}}' },
		schema: {},
		fields: [
			{
				field: 'id',
				type: 'integer',
				schema: { is_primary_key: true, has_auto_increment: true },
				meta: { hidden: true },
			},
			{ field: 'title', type: 'string', schema: {}, meta: { interface: 'input' } },
			{
				field: 'table',
				type: 'json',
				schema: {},
				meta: { interface: 'json-table', special: ['cast-json'], readonly: true, width: 'full' },
			},
		],
	});

	for (const [title, table] of Object.entries(values)) {
		ids[title] = (await api.post(`/items/${COLLECTION}`, { title, table })).id;
	}
});

for (const name of ['status-board', 'access-review']) {
	test(`draws the ${name} example`, async ({ page }) => {
		const { columns, rows } = (values[name] as { data: { columns: unknown[]; rows: unknown[] } }).data;

		await openItem(page, COLLECTION, ids[name]!);

		const grid = page.locator('.json-table .jt-grid');
		await expect(grid).toBeVisible();
		await expect(grid.locator('thead th')).toHaveCount(columns.length);
		await expect(grid.locator('tbody tr')).toHaveCount(rows.length);
		await expect(page.locator('.json-table .v-notice')).toHaveCount(0);
	});
}

test('unpacks and draws a compressed value', async ({ page }) => {
	await openItem(page, COLLECTION, ids.compressed!);

	const grid = page.locator('.json-table .jt-grid');
	await expect(grid).toBeVisible();
	await expect(grid.locator('tbody tr').first()).toBeVisible();
});

test('shows the placeholder for an empty field', async ({ page }) => {
	await openItem(page, COLLECTION, ids.empty!);

	await expect(page.locator('.json-table .jt-empty')).toBeVisible();
	await expect(page.locator('.json-table .jt-grid')).toHaveCount(0);
});

test('shows one notice and no table for an invalid value', async ({ page }) => {
	await openItem(page, COLLECTION, ids.invalid!);

	await expect(page.locator('.json-table .v-notice')).toContainText('Unable to display this table');
	await expect(page.locator('.json-table .jt-grid')).toHaveCount(0);
});
