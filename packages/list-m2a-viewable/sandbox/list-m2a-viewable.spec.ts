// Browser tests of the Builder (M2A) Viewable interface in the sandbox
// Directus (see ../../../sandbox/README.md).
//
// One M2A field, `blocks`, on a collection of pages. A test sets the field up
// as it needs it (`setField`) before it opens a page of the browser: the app
// reads the fields once, when it starts.
import { type Api, expect, openItem, test } from '../../../sandbox/support/fixtures.ts';
import { BASE_URL } from '../../../sandbox/support/sandbox.ts';

// Playwright is installed in the sandbox, not here, so its types are taken from what the fixtures hand out.
type Page = Parameters<typeof openItem>[0];
type Locator = ReturnType<Page['locator']>;
type Browser = NonNullable<ReturnType<ReturnType<Page['context']>['browser']>>;

const PAGES = 'sandbox_list_m2a_viewable_pages';
const NOTES = 'sandbox_list_m2a_viewable_notes';
const JUNCTION = 'sandbox_list_m2a_viewable_pages_blocks';

// The user, the role and the policy of these tests are told by this name.
const READER = 'sandbox-list-m2a-viewable-reader';
const reader = { email: `${READER}@example.com`, password: READER };

// More items than a page of the stock default (15), and than the 5 which one test sets.
const MANY = 20;

const key = {
	field: 'id',
	type: 'integer',
	schema: { is_primary_key: true, has_auto_increment: true },
	meta: { hidden: true },
};

/** The ids of two pages: one with 2 items in its list, one with 20. A third, with 20 as well, is only there to be batch edited. */
let short_id: number;
let long_id: number;

/** Sets the field under test up: read-only or not, and the options of the interface. */
async function setField(api: Api, readonly: boolean, options: Record<string, unknown> | null = null) {
	await api.patch(`/fields/${PAGES}/blocks`, { meta: { interface: 'list-m2a-viewable', readonly, options } });
}

/** Removes the user of these tests, with its role and its policy. */
async function removeReader(api: Api) {
	const named = (path: string, field: string) => api.get<{ id: string }[]>(`${path}?fields=id&filter[${field}][_starts_with]=${READER}`);

	for (const user of await named('/users', 'email')) await api.delete(`/users/${user.id}`);
	for (const role of await named('/roles', 'name')) await api.delete(`/roles/${role.id}`);
	for (const policy of await named('/policies', 'name')) await api.delete(`/policies/${policy.id}`);
}

/** The field under test in a form: the one of the item page, or the one of a drawer. */
const fieldOf = (page: Page, form = 'main .v-form') => page.locator(`${form} .field[data-field="blocks"]`);

/** The rows of the list in the form of the item page. */
const rowsOf = (page: Page) => fieldOf(page).locator('.v-list-item');

/** Clicks a row and expects what a view-only drawer shows: the item, an input which is disabled, and a save button which is too. */
async function expectViewOnlyDrawer(page: Page, row: Locator, text: string) {
	await row.click();

	const drawer = page.locator('.v-drawer');
	const input = drawer.locator('.v-form input').first();

	await expect(input).toHaveValue(text);
	await expect(input).toBeDisabled();
	await expect(drawer.locator('header .actions button:has([data-icon="check"])')).toBeDisabled();
}

/**
 * Saves the item of the page with the shortcut and stays on it. The app then loads the item again; this returns
 * once that answer is in, which is after the form was told that it is loading.
 */
async function saveAndStay(page: Page, id: number) {
	let saved = false;

	const reloaded = page.waitForResponse((response) => {
		const mine = new URL(response.url()).pathname.endsWith(`/items/${PAGES}/${id}`);
		if (mine && response.request().method() === 'PATCH') saved = true;
		return mine && saved && response.request().method() === 'GET';
	});

	await page.keyboard.press('ControlOrMeta+s');
	await reloaded;
}

/**
 * Moves the app to another item of the collection without loading the page, as a link inside the app does (a
 * notification, Save as Copy): by its router. The item page stays mounted and loads the other item into the same form.
 */
async function moveTo(page: Page, id: number) {
	await page.evaluate(async (path) => {
		type App = { config: { globalProperties: { $router: { push(to: string): Promise<unknown> } } } };
		const app = (document.querySelector('#app') as unknown as { __vue_app__: App }).__vue_app__;
		await app.config.globalProperties.$router.push(path);
	}, `/content/${PAGES}/${id}`);
}

// What the Directus app logs on its own, with or without extensions: the same as the fixture passes over.
const NOISE = /favicon|ResizeObserver loop|auth\/refresh/;

/** A page of its own for the user who may only read. A test checks `errors` at its end, as the fixture does for its own page. */
async function readerPage(browser: Browser) {
	const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1440, height: 900 } });
	await context.addCookies([{ name: 'license-banner-dismissed', value: 'true', url: BASE_URL }]);

	const response = await context.request.post('/auth/login', { data: { ...reader, mode: 'session' } });
	if (!response.ok()) throw new Error(`Could not sign in to the sandbox as ${reader.email}: ${response.status()}`);

	const page = await context.newPage();
	const errors: string[] = [];

	const note = (error: string) => {
		if (!NOISE.test(error)) errors.push(error);
	};

	page.on('console', (message) => {
		if (message.type() === 'error') note(`console: ${message.text()} ${message.location().url ?? ''}`);
	});

	page.on('pageerror', (error) => note(`page: ${String(error)}`));

	return { context, page, errors };
}

test.beforeAll(async ({ api }) => {
	await removeReader(api);
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

	const notes: { id: number }[] = [];
	for (let n = 1; n <= MANY; n++) notes.push(await api.post(`/items/${NOTES}`, { text: `Note ${n}` }));

	const blocks = (count: number) => notes.slice(0, count).map((note) => ({ collection: NOTES, item: String(note.id) }));

	short_id = (await api.post(`/items/${PAGES}`, { title: 'A short page', blocks: blocks(2) })).id;
	long_id = (await api.post(`/items/${PAGES}`, { title: 'A long page', blocks: blocks(MANY) })).id;
	await api.post(`/items/${PAGES}`, { title: 'Another long page', blocks: blocks(MANY) });

	// A user who may read the three collections and change nothing.
	const policy = (await api.post('/policies', { name: READER, icon: 'visibility', app_access: true, admin_access: false })).id;
	const role = (await api.post('/roles', { name: READER, icon: 'visibility' })).id;
	await api.post('/access', { role, policy });

	for (const collection of [PAGES, NOTES, JUNCTION]) {
		await api.post('/permissions', { policy, collection, action: 'read', fields: ['*'], permissions: {}, validation: {} });
	}

	await api.post('/users', { ...reader, role, first_name: 'Reader', last_name: 'Only' });
});

test('lists the items of a read-only field and opens one in a drawer which cannot save', async ({ page, api }) => {
	await setField(api, true);
	await openItem(page, PAGES, short_id);

	const rows = rowsOf(page);
	await expect(rows).toHaveCount(2);
	await expect(rows.first()).toContainText('Note 1');

	// Nothing which would change the list is offered.
	await expect(fieldOf(page).locator('.actions, .drag-handle, .item-actions')).toHaveCount(0);

	await expectViewOnlyDrawer(page, rows.first(), 'Note 1');
});

// The regression of 1.0.2: mounted while the form loads and kept when the field turns out to be editable, the stock
// component held on to the view-only page size of -1, and its pagination threw "RangeError: Invalid array length".
// The fixture fails the test on that error, and the list does not come to 15 rows.
test('a field which can be edited, with more items than Per Page, shows its pagination', async ({ page, api }) => {
	await setField(api, false);
	await openItem(page, PAGES, long_id);

	const field = fieldOf(page);
	await expect(rowsOf(page)).toHaveCount(15);
	await expect(field.locator('.v-pagination .page')).toHaveText(['1', '2']);
	await expect(field.getByRole('button', { name: 'Create New' })).toBeEnabled();
	await expect(field.getByRole('button', { name: 'Add Existing' })).toBeEnabled();
});

test('a user who may not update the collection opens an item of the list, view-only', async ({ browser, api }) => {
	// Not read-only: it is the missing permission which disables the field, and the stock rows with it.
	await setField(api, false);

	const { context, page, errors } = await readerPage(browser);

	try {
		await openItem(page, PAGES, short_id);

		const rows = rowsOf(page);
		await expect(rows).toHaveCount(2);
		await expect(fieldOf(page).locator('.actions')).toHaveCount(0);

		await expectViewOnlyDrawer(page, rows.nth(1), 'Note 2');
		expect(errors, 'errors logged or thrown by the page').toEqual([]);
	} finally {
		await context.close();
	}
});

test('a read-only field lists every item by default, and as many as Items Shown When Read-only says', async ({ page, api }) => {
	await setField(api, true);
	await openItem(page, PAGES, long_id);

	await expect(rowsOf(page)).toHaveCount(MANY);
	await expect(rowsOf(page).last()).toContainText(`Note ${MANY}`);
	await expect(fieldOf(page).locator('.v-pagination')).toHaveCount(0);

	// The app reads the fields when it starts, so the option counts after a reload.
	await setField(api, true, { viewLimit: 5 });
	await page.reload();

	await expect(rowsOf(page)).toHaveCount(5);
	await expect(rowsOf(page).last()).toContainText('Note 5');
	await expect(fieldOf(page).locator('.v-pagination')).toHaveCount(0);
});

test('in a batch edit, switching the field on brings the buttons of the list', async ({ page, api }) => {
	await setField(api, false);
	await page.goto(`/admin/content/${PAGES}`);

	for (const title of ['A long page', 'Another long page']) {
		await page.locator('main tr.table-row').filter({ hasText: title }).first().locator('.v-checkbox').click();
	}

	await page.locator('header.header-bar .actions button:has([data-icon="edit"])').click();

	// A field of a batch edit is disabled until its checkbox is ticked: view-only first, then to edit.
	const field = fieldOf(page, '.v-drawer .v-form');
	await expect(field.locator('.v-notice')).toHaveText('No items');
	await expect(field.locator('.actions')).toHaveCount(0);

	await field.locator('.field-label .v-checkbox').click();

	await expect(field.getByRole('button', { name: 'Create New' })).toBeEnabled();
	await expect(field.getByRole('button', { name: 'Add Existing' })).toBeEnabled();

	// An empty list has no pagination. One which kept the view-only page size would offer "-1" per page.
	await expect(field.locator('.pagination')).toHaveCount(0);
});

test('a save which stays on the item keeps the page of the list and its page size', async ({ page, api }) => {
	await setField(api, false);
	await openItem(page, PAGES, long_id);

	const field = fieldOf(page);
	const rows = rowsOf(page);
	const title = page.locator('main .v-form .field[data-field="title"] input');

	await field.locator('.v-pagination .page', { hasText: '2' }).click();
	await expect(rows).toHaveCount(MANY - 15);
	await expect(rows.first()).toContainText('Note 16');

	await title.fill('A long page, saved once');
	await saveAndStay(page, long_id);

	await expect(rows.first()).toContainText('Note 16');
	await expect(rows).toHaveCount(MANY - 15);
	await expect(field.locator('.v-pagination .page.active')).toHaveText('2');

	// The page size chosen under the list is the stock component's own as well.
	await field.locator('.per-page .v-select button').click();
	await page.locator('.v-menu-popper:visible .v-list-item').filter({ hasText: '25' }).click();
	await expect(rows).toHaveCount(MANY);

	await title.fill('A long page, saved twice');
	await saveAndStay(page, long_id);

	await expect(rows).toHaveCount(MANY);
	await expect(field.locator('.per-page .v-select button')).toHaveText('25');
});

// The stock component never puts its page back for another item. Kept mounted from page 2 of a list of 20, it asks for
// page 2 of a list of 2, shows "No items" and hides the pagination which would lead back.
test('another item in the same form starts its list on the first page', async ({ page, api }) => {
	await setField(api, false);
	await openItem(page, PAGES, long_id);

	const field = fieldOf(page);
	const rows = rowsOf(page);
	const title = page.locator('main .v-form .field[data-field="title"] input');

	await field.locator('.v-pagination .page', { hasText: '2' }).click();
	await expect(rows.first()).toContainText('Note 16');

	await moveTo(page, short_id);

	await expect(title).toHaveValue('A short page');
	await expect(rows).toHaveCount(2);
	await expect(rows.first()).toContainText('Note 1');

	// And back, by the history of the browser: the first page of the long list, not the second it was left on.
	await page.goBack();

	await expect(title).toHaveValue(/^A long page/);
	await expect(rows).toHaveCount(15);
	await expect(rows.first()).toContainText('Note 1');
	await expect(field.locator('.v-pagination .page.active')).toHaveText('1');
});

test('says so when Directus has no Builder (M2A) interface to draw', async ({ page, api }) => {
	await setField(api, true);
	await page.goto(`/admin/content/${PAGES}`);

	const row = page.locator('main tr.table-row').filter({ hasText: 'A short page' });
	await row.waitFor();

	// What a Directus which renamed or dropped the stock interface would be like: nothing registered under its name.
	// The app is loaded, so the item is opened from the table, without loading the page again.
	await page.evaluate(() => {
		const app = (document.querySelector('#app') as unknown as { __vue_app__: { _context: { components: Record<string, unknown> } } }).__vue_app__;
		delete app._context.components['interface-list-m2a'];
	});

	await row.getByText('A short page').click();

	const field = fieldOf(page);
	await expect(field.locator('.v-notice')).toContainText('this version of Directus does not have');
	await expect(field.locator('.v-list-item')).toHaveCount(0);
});
