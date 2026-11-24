// Browser tests of the Node Graph bundle in the sandbox Directus
// (see ../../../sandbox/README.md).
import fs from 'node:fs';
import { expect, openItem, test } from '../../../sandbox/support/fixtures.ts';

const COLLECTION = 'sandbox_node_graph';

const ruleset = JSON.parse(
	fs.readFileSync(new URL('../examples/approval-workflow.json', import.meta.url), 'utf8'),
);

let id: number;

test.beforeAll(async ({ api }) => {
	await api.drop(COLLECTION);

	await api.post('/collections', {
		collection: COLLECTION,
		meta: { icon: 'account_tree', display_template: '{{title}}' },
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
				field: 'graph',
				type: 'json',
				schema: {},
				meta: {
					interface: 'node-graph',
					display: 'node-graph-summary',
					special: ['cast-json'],
					width: 'full',
					options: { ruleset },
				},
			},
		],
	});

	id = (await api.post(`/items/${COLLECTION}`, { title: 'A workflow' })).id;
});

test('shows the field row and opens the editor with the ruleset\'s node types', async ({ page }) => {
	await openItem(page, COLLECTION, id);

	const field = page.locator('.node-graph-interface');
	await expect(field.locator('.ng-field-row')).toBeVisible();
	await expect(field.locator('.ng-ruleset-notice')).toHaveCount(0);

	await field.locator('.ng-field-row').click();

	const editor = page.locator('.node-graph-editor');
	await expect(editor).toBeVisible();
	await expect(editor.locator('.ng-canvas')).toBeVisible();
	// The palette sits in the drawer's side bar, outside the editor's own element.
	await expect(page.locator('.ng-palette-item').first()).toBeVisible();
});

test('the server refuses a value which is not a graph', async ({ api }) => {
	await expect(api.patch(`/items/${COLLECTION}/${id}`, { graph: { nodes: 'not a list' } })).rejects.toThrow(/400/);
});
