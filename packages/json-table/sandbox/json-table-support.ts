// What the browser tests of JSON Table share: how a collection with tables is made and removed, a second user who
// may read only what a test lets him, and a few ways to read a table in the page. The tests are in the `*.spec.ts`
// files beside this one, by topic. Each makes the collections it needs before its tests and removes them afterwards,
// so each can be run alone (see ../../../sandbox/README.md for the sandbox they run in).
import fs from 'node:fs';
import { expect, openItem } from '../../../sandbox/support/fixtures.ts';
import type { Api } from '../../../sandbox/support/fixtures.ts';
import { BASE_URL } from '../../../sandbox/support/sandbox.ts';

export type Page = Parameters<typeof openItem>[0];
export type Locator = ReturnType<Page['locator']>;
export type Browser = NonNullable<ReturnType<ReturnType<Page['context']>['browser']>>;

/** A value of the format, version 1, which holds the table as it is. */
export const wrap = (data: object) => ({ version: 1, data });

/** A cell with text or with a list of parts, and any other fields of a cell. */
export const cell = (text: string | number | unknown[], rest: object = {}) => ({ text, ...rest });

/** One of the values in `../examples`. */
export const example = (name: string) => JSON.parse(fs.readFileSync(new URL(`../examples/${name}.json`, import.meta.url), 'utf8'));

/** A JSON field on the JSON Table interface, read-only as a project would set it up. */
export const sheet = (field: string, options: object = {}, meta: object = {}) => ({
	field,
	type: 'json',
	schema: {},
	meta: { interface: 'json-table', special: ['cast-json'], readonly: true, width: 'full', options, ...meta },
});

/** A collection with a numeric key, a title and the fields given. It is dropped first, so a run can follow a run which broke off. */
export async function makeCollection(api: Api, collection: string, fields: object[]) {
	await api.drop(collection);

	await api.post('/collections', {
		collection,
		meta: { icon: 'table_chart', display_template: '{{title}}' },
		schema: {},
		fields: [
			{ field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
			{ field: 'title', type: 'string', schema: {}, meta: { interface: 'input' } },
			...fields,
		],
	});
}

/** Creates an item and returns its key. */
export const makeItem = async (api: Api, collection: string, item: object): Promise<number> => (await api.post(`/items/${collection}`, item)).id;

export interface Credentials {
	email: string;
	password: string;
}

const PASSWORD = 'sandbox-reader';
const mail = (name: string) => `json-table-${name}@example.com`;
const policyName = (name: string) => `JSON Table ${name}`;

/** Removes a user made by `makeReader`, and the policy made for him. */
export async function dropReader(api: Api, name: string) {
	const users = await api.get<{ id: string }[]>(`/users?filter[email][_eq]=${encodeURIComponent(mail(name))}&fields=id`);
	for (const user of users) await api.delete(`/users/${user.id}`);

	const policies = await api.get<{ id: string }[]>(`/policies?filter[name][_eq]=${encodeURIComponent(policyName(name))}&fields=id`);
	for (const policy of policies) await api.delete(`/policies/${policy.id}`);
}

/**
 * A user who may use the Data Studio and read the collections named, and nothing else of the project. The tests of
 * the links need one, since the administrator may read everything.
 */
export async function makeReader(api: Api, name: string, collections: string[]): Promise<Credentials> {
	await dropReader(api, name);

	const policy = await api.post<{ id: string }>('/policies', { name: policyName(name), icon: 'table_chart', app_access: true, admin_access: false });

	await api.post(
		'/permissions',
		collections.map((collection) => ({ policy: policy.id, collection, action: 'read', fields: ['*'], permissions: {}, validation: {} })),
	);

	await api.post('/users', { email: mail(name), password: PASSWORD, first_name: 'Reader', last_name: name, policies: [{ policy: policy.id }] });

	return { email: mail(name), password: PASSWORD };
}

/**
 * A page of its own which is signed in as someone else than the administrator. The errors the page logs or throws
 * are collected in `errors`, as the fixture does for the page of a test; the caller checks them and closes the page.
 */
export async function signedIn(browser: Browser, credentials: Credentials, options: object = {}) {
	const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1440, height: 900 }, ...options });
	await context.addCookies([{ name: 'license-banner-dismissed', value: 'true', url: BASE_URL }]);

	const response = await context.request.post('/auth/login', { data: { ...credentials, mode: 'session' } });
	if (!response.ok()) throw new Error(`Could not sign in as ${credentials.email}: ${response.status()}`);

	const page = await context.newPage();
	const errors: string[] = [];

	page.on('console', (message) => {
		if (message.type() === 'error' && !/favicon|ResizeObserver loop|auth\/refresh/.test(message.text())) errors.push(message.text());
	});
	page.on('pageerror', (error) => errors.push(String(error)));

	return { page, errors, close: () => context.close() };
}

/** The table of a field in the form which is open, once it is drawn. */
export async function tableOf(page: Page, field = 'table'): Promise<Locator> {
	const root = page.locator(`main .field[data-field="${field}"] .json-table`);
	await expect(root.locator('.jt-grid')).toBeVisible();
	return root;
}

/** Opens an item and returns the table of one of its fields. */
export async function openTable(page: Page, collection: string, id: number, field = 'table'): Promise<Locator> {
	await openItem(page, collection, id);
	return tableOf(page, field);
}

/** The drawer which a link opens: the app draws it outside the form. */
export const drawerOf = (page: Page): Locator => page.locator('#dialog-outlet .v-drawer');

export interface Box {
	left: number;
	right: number;
	top: number;
	bottom: number;
	width: number;
	height: number;
}

/** Where an element is in the window. */
export const boxOf = (locator: Locator): Promise<Box> =>
	locator.evaluate((element) => {
		const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
		return { left, right, top, bottom, width, height };
	});

/**
 * The inside of the scroll box of a table: the area in which its cells show, without its border and without a
 * scrollbar, which takes room on one system and none on another.
 */
export const insideOf = (root: Locator): Promise<Box> =>
	root.locator('.jt-scroll').evaluate((scroll) => {
		const rect = scroll.getBoundingClientRect();
		const left = rect.left + scroll.clientLeft;
		const top = rect.top + scroll.clientTop;

		return { left, top, right: left + scroll.clientWidth, bottom: top + scroll.clientHeight, width: scroll.clientWidth, height: scroll.clientHeight };
	});

/** Scrolls the box of a table as far as it goes, or back to its start, without a pointer or a scrollbar. */
export const scrollTable = (root: Locator, to: 'end' | 'start') =>
	root.locator('.jt-scroll').evaluate((scroll, where) => {
		scroll.scrollTo({ left: where === 'end' ? scroll.scrollWidth : 0, top: where === 'end' ? scroll.scrollHeight : 0, behavior: 'instant' });
	}, to);
