// Browser tests of the Builder (M2A) Viewable interface in the sandbox
// Directus (see ../../../sandbox/README.md).
import { expect, openItem, test } from '../../../sandbox/support/fixtures.ts';

const PAGES = 'sandbox_m2a_pages';
const NOTES = 'sandbox_m2a_notes';
const JUNCTION = 'sandbox_m2a_pages_blocks';

const key = {
	field: 'id',
	type: 'integer',
	schema: { is_primary_key: true, has_auto_increment: true },
	meta: { hidden: true },
};

let page_id: number;

test.beforeAll(async ({ api }) => {
	await api.drop(JUNCTION, PAGES, NOTES);

	await api.post('/collections', {
		collection: NOTES,
		meta: { icon: 'notes', display_template: '{{text}}' },
		schema: {},
		fields: [key, { field: 'text', type: 'string', schema: {}, meta: { interface: 'input' } }],
	});

	await api.post('/collections', {
		collection: PAGES,
		meta: { icon: 'article', display_template: '{{title}}' },
		schema: {},
		fields: [key, { field: 'title', type: 'string', schema: {}, meta: { interface: 'input' } }],
	});

	await api.post('/collections', {
		collection: JUNCTION,
		meta: { hidden: true, icon: 'import_export' },
		schema: {},
		fields: [
			key,
			{ field: 'pages_id', type: 'integer', schema: {}, meta: { hidden: true } },
			{ field: 'item', type: 'string', schema: {}, meta: { hidden: true } },
			{ field: 'collection', type: 'string', schema: {}, meta: { hidden: true } },
		],
	});

	// The field under test: read-only, which is when the stock interface
	// stops reacting to clicks.
	await api.post(`/fields/${PAGES}`, {
		field: 'blocks',
		type: 'alias',
		meta: { interface: 'list-m2a-viewable', special: ['m2a'], readonly: true },
	});

	await api.post('/relations', {
		collection: JUNCTION,
		field: 'item',
		related_collection: null,
		meta: { one_collection_field: 'collection', one_allowed_collections: [NOTES], junction_field: 'pages_id' },
	});

	await api.post('/relations', {
		collection: JUNCTION,
		field: 'pages_id',
		related_collection: PAGES,
		meta: { one_field: 'blocks', junction_field: 'item' },
		schema: { on_delete: 'SET NULL' },
	});

	const first = await api.post(`/items/${NOTES}`, { text: 'First note' });
	const second = await api.post(`/items/${NOTES}`, { text: 'Second note' });

	page_id = (
		await api.post(`/items/${PAGES}`, {
			title: 'A page',
			blocks: [
				{ collection: NOTES, item: String(first.id) },
				{ collection: NOTES, item: String(second.id) },
			],
		})
	).id;
});

test('lists the items of a read-only field and opens one in a view-only drawer', async ({ page }) => {
	await openItem(page, PAGES, page_id);

	const rows = page.locator('main .v-form .v-list-item');
	await expect(rows).toHaveCount(2);
	await expect(rows.first()).toContainText('First note');

	await rows.first().click();

	const drawer = page.locator('.v-drawer');
	await expect(drawer).toBeVisible();
	await expect(drawer.locator('input').first()).toHaveValue('First note');
	await expect(drawer.locator('input').first()).toBeDisabled();
});
