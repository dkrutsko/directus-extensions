// The smoke test of the demo of JSON Table (../demo/demo.mjs): the sandbox builds it from its definition, and every
// field of its form draws what its value asks for: a table, the placeholder, or for the one value which breaks the
// format on purpose the notice. ../../../sandbox/README.md, "Demos", has how demos work.
import { checkDemo } from '../../../sandbox/support/demo.ts';
import { expect, test } from '../../../sandbox/support/fixtures.ts';

test('the demo builds, and every field draws its table', async ({ page, api }) => {
	// The interface draws its box for an empty or a broken value too, so a check of the box alone would pass on a demo
	// whose tables are all rejected: every field which holds a table must draw its grid.
	await checkDemo(page, api, 'json-table', {
		interfaces: { 'json-table': '.jt-grid' },
		fields: {
			empty: '.jt-empty:has-text("No table yet")',
			empty_own: '.jt-empty:has-text("The nightly report has not run yet")',
			invalid: '.v-notice:has-text("Unable to display this table")',
		},
	});

	// A link is offered only when its collection exists and may be read: the products are there.
	await page.goto('/admin/content/demo_json_table');
	await expect(page.locator('main .field[data-field="price_list"] .jt-link')).toHaveCount(8);
});
