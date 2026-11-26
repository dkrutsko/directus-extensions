// The smoke test of the demo of the Meter (../demo/demo.mjs): the sandbox builds it from its definition, every field
// of its form draws a meter, and every value in its table and in each bookmark of the table the display.
// ../../../sandbox/README.md, "Demos", has how demos work.
import { checkDemo } from '../../../sandbox/support/demo.ts';
import { test } from '../../../sandbox/support/fixtures.ts';

test('the demo builds, and every field and every column draws a meter', async ({ page, api }) => {
	await checkDemo(page, api, 'meter', { interfaces: { meter: '.meter' }, displays: { meter: '.meter-display' } });
});
