// The smoke test of an extension's demo (packages/<name>/sandbox/demo.spec.ts). It builds the demo from its
// definition with the function `npm run demo` uses, opens the form of each collection with every group open and, where
// the collection has presets of the table, the table and each bookmark, and checks that each field which uses the
// extension drew it, not the notice of Directus for an interface or a display it does not know. The fixture fails the
// test on any error the page logs.
import { applyDemo } from '../demo/apply.mjs';
import { expect, type Api } from './fixtures.ts';

type Page = import('@playwright/test').Page;

/**
 * What the extension draws: for each id of its interfaces and displays, a selector of the element it draws. `fields`
 * names, by the key of a field, what a field draws instead on purpose, such as the notice of a field without steps; it
 * wins over the selector of the interface.
 */
export type Draws = { interfaces?: Record<string, string>; displays?: Record<string, string>; fields?: Record<string, string> };

type Field = { field: string; meta: { interface?: string; display?: string } };
type Preset = { bookmark: string | null; layout_query: { tabular: { fields: string[] } } };
type Collection = { collection: string; meta: { singleton: boolean }; fields: Field[]; items: Record<string, unknown>[]; presets: Preset[] };

const UNKNOWN = /(Interface|Display) ".*" not found/;

export async function checkDemo(page: Page, api: Api, name: string, draws: Draws) {
	const collections = (await applyDemo(api, name)) as Collection[];
	let checked = 0;

	for (const { collection, meta, fields, items, presets } of collections) {
		// The form: a singleton has its own page, a collection opens its first item.
		const first = meta.singleton ? '' : `/${(await api.get(`/items/${collection}?sort=id&limit=1&fields=id`))[0].id}`;
		await page.goto(`/admin/content/${collection}${first}`);
		await page.locator('main .v-form .field').first().waitFor();

		// A closed group draws nothing inside it until it is opened.
		const closed = page.locator('main .group-detail > .toggle-btn:has(.v-divider:not(.active))');
		while ((await closed.count()) > 0) await closed.first().click();

		for (const { field, meta } of fields) {
			const selector = draws.fields?.[field] ?? draws.interfaces?.[meta.interface ?? ''];
			if (!selector) continue;
			const drawn = page.locator(`main .field[data-field="${field}"] ${selector}`).first();
			await expect(drawn, `${collection}.${field} draws ${selector}`).toBeVisible();
			checked++;
		}

		await expect(page.locator('main').getByText(UNKNOWN)).toHaveCount(0);

		// The table, by each preset: the one without a name and every bookmark. Every value which is not empty in a
		// column of the display is drawn by it.
		const saved = await api.get<{ id: number; bookmark: string }[]>(
			`/presets?filter[collection][_eq]=${collection}&filter[bookmark][_nnull]=true&fields=id,bookmark`,
		);

		for (const preset of presets) {
			// How many cells each selector should be found in: one for every value of its columns.
			const expected = new Map<string, number>();
			for (const { field, meta } of fields) {
				const selector = draws.displays?.[meta.display ?? ''];
				if (!selector || !preset.layout_query.tabular.fields.includes(field)) continue;
				const filled = items.filter((item) => item[field] !== null && item[field] !== undefined).length;
				expected.set(selector, (expected.get(selector) ?? 0) + filled);
				checked++;
			}

			if (expected.size === 0) continue;

			const id = saved.find((entry) => entry.bookmark === preset.bookmark)?.id;
			if (preset.bookmark) expect(id, `the bookmark "${preset.bookmark}"`).toBeDefined();
			await page.goto(`/admin/content/${collection}${preset.bookmark ? `?bookmark=${id}` : ''}`);
			await page.locator('main .v-table tbody tr').first().waitFor();
			// The title says which bookmark is shown, and that it is not the table without one.
			if (preset.bookmark) await expect(page.locator('.header-bar .title h1')).toHaveText(preset.bookmark);

			for (const [selector, count] of expected) {
				const cells = page.locator(`main .v-table tbody ${selector}`);
				await expect(cells, `cells drawn by ${selector} in ${preset.bookmark ?? 'the table'}`).toHaveCount(count);
			}

			await expect(page.locator('main').getByText(UNKNOWN)).toHaveCount(0);
		}
	}

	// A demo which checks nothing has a definition or a map of what it draws which does not fit.
	expect(checked, 'fields and columns checked').toBeGreaterThan(0);
}
