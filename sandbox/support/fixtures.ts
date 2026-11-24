// What every browser test of an extension starts from. A spec imports `test`
// and `expect` from here instead of from Playwright:
//
//   import { expect, openItem, test } from '../../../sandbox/support/fixtures.ts';
//
// - `api` talks to the sandbox as the administrator, for seeding.
// - `page` is already signed in as the administrator.
// - Every test fails when the page logged an error or threw, whatever else
//   it checked. One broken app extension disables all of them in Directus,
//   and that shows as such an error.
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';
import { ADMIN, BASE_URL } from './sandbox.ts';

export { expect };

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export class Api {
	constructor(
		private readonly request: APIRequestContext,
		private readonly token: string,
	) {}

	/** Sends a request and returns the `data` of the answer. Throws on any error status. */
	async send<T = any>(method: Method, path: string, body?: unknown): Promise<T> {
		const response = await this.request.fetch(path, {
			method,
			data: body,
			headers: { Authorization: `Bearer ${this.token}` },
		});

		const text = await response.text();
		if (!response.ok()) throw new Error(`${method} ${path}: ${response.status()} ${text.slice(0, 500)}`);
		return (text ? JSON.parse(text).data : null) as T;
	}

	get<T = any>(path: string) {
		return this.send<T>('GET', path);
	}

	post<T = any>(path: string, body: unknown) {
		return this.send<T>('POST', path, body);
	}

	patch<T = any>(path: string, body: unknown) {
		return this.send<T>('PATCH', path, body);
	}

	delete(path: string) {
		return this.send<null>('DELETE', path);
	}

	/**
	 * Deletes the named collections which exist, in the order given, so a
	 * spec can create its collections afresh on every run. Name a junction
	 * collection before the collections it points to.
	 */
	async drop(...names: string[]) {
		const existing = (await this.get<{ collection: string }[]>('/collections')).map((entry) => entry.collection);
		for (const name of names) if (existing.includes(name)) await this.delete(`/collections/${name}`);
	}
}

/** Errors which the Directus app logs on its own, with or without extensions. */
const NOISE = /favicon|ResizeObserver loop|auth\/refresh/;

export const test = base.extend<{ errors: string[] }, { api: Api }>({
	api: [
		async ({ playwright }, use) => {
			const request = await playwright.request.newContext({ baseURL: BASE_URL });
			const response = await request.post('/auth/login', { data: ADMIN });
			if (!response.ok()) throw new Error(`Could not sign in to the sandbox: ${response.status()}`);
			const { data } = await response.json();
			await use(new Api(request, data.access_token));
			await request.dispose();
		},
		{ scope: 'worker' },
	],

	context: async ({ context }, use) => {
		await context.addCookies([{ name: 'license-banner-dismissed', value: 'true', url: BASE_URL }]);
		const response = await context.request.post('/auth/login', { data: { ...ADMIN, mode: 'session' } });
		if (!response.ok()) throw new Error(`Could not sign in to the sandbox: ${response.status()}`);
		await use(context);
	},

	errors: [
		async ({ page }, use) => {
			const errors: string[] = [];

			page.on('console', (message) => {
				if (message.type() === 'error') errors.push(`console: ${message.text()} ${message.location().url ?? ''}`);
			});

			page.on('pageerror', (error) => errors.push(`page: ${String(error)}`));

			await use(errors);

			expect(
				errors.filter((error) => !NOISE.test(error)),
				'errors logged or thrown by the page',
			).toEqual([]);
		},
		{ auto: true },
	],
});

/** Opens an item in the Data Studio and waits until its form is there. */
export async function openItem(page: Page, collection: string, id: string | number) {
	await page.goto(`/admin/content/${collection}/${id}`);
	await page.locator('main .v-form .field').first().waitFor();
}
