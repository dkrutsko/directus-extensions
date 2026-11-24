// Browser tests of the __TITLE__ interface in the sandbox Directus
// (see ../../../sandbox/README.md).
import { expect, openItem, test } from '../../../sandbox/support/fixtures.ts';

const COLLECTION = 'sandbox___SNAKE__';

let id: number;

test.beforeAll(async ({ api }) => {
	await api.drop(COLLECTION);

	await api.post('/collections', {
		collection: COLLECTION,
		meta: { icon: 'extension' },
		schema: {},
		fields: [
			{
				field: 'id',
				type: 'integer',
				schema: { is_primary_key: true, has_auto_increment: true },
				meta: { hidden: true },
			},
			{ field: 'value', type: 'string', schema: {}, meta: { interface: '__NAME__' } },
		],
	});

	id = (await api.post(`/items/${COLLECTION}`, { value: 'First' })).id;
});

test('shows the stored value and saves what is typed', async ({ page, api }) => {
	await openItem(page, COLLECTION, id);

	const input = page.locator('.__NAME__ input');
	await expect(input).toHaveValue('First');

	await input.fill('Second');
	await page.keyboard.press('ControlOrMeta+s');

	await expect.poll(async () => (await api.get(`/items/${COLLECTION}/${id}`)).value).toBe('Second');
});
