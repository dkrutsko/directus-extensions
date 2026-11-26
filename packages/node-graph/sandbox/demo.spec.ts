// The smoke test of the demo of the Node Graph (../demo/demo.mjs): the sandbox builds it from its definition, which
// also proves that the hook accepts every graph it seeds; every field of its form draws the row (or, the field without
// a ruleset, its notice), every value in its table the display, and the recipes open in the editor with all their
// nodes. ../../../sandbox/README.md, "Demos", has how demos work.
import { loadDemo } from '../../../sandbox/demo/apply.mjs';
import { checkDemo } from '../../../sandbox/support/demo.ts';
import { expect, openItem, test } from '../../../sandbox/support/fixtures.ts';

test('the demo builds, every field draws its row, every column the summary, and the recipes open', async ({ page, api }) => {
	await checkDemo(page, api, 'node-graph', {
		interfaces: { 'node-graph': '.ng-field-row' },
		displays: { 'node-graph-summary': '.node-graph-display' },
		fields: { no_ruleset: '.ng-ruleset-notice' },
	});

	// The first item holds the finished graphs. Vue Flow draws each node it can place, so the count says that the
	// seeded graphs were read whole.
	const [{ items }] = await loadDemo('node-graph');
	const [first] = await api.get('/items/demo_node_graph?sort=id&limit=1&fields=id');
	await openItem(page, 'demo_node_graph', first.id);

	for (const field of ['production', 'loan', 'approval']) {
		await page.locator(`main .field[data-field="${field}"] .ng-field-row`).click();
		const editor = page.locator('.node-graph-editor');
		await expect(editor.locator('.vue-flow__node'), `${field} in the editor`).toHaveCount(items[0][field].nodes.length);
		await page.keyboard.press('Escape');
		await expect(editor).toHaveCount(0);
	}
});
