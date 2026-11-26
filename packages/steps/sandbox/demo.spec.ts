// The smoke test of the demo of Steps (../demo/demo.mjs): the sandbox builds it from its definition, every field of
// its form draws a track, or the notice of a field without steps, and every value in its table and its bookmark the
// display. ../../../sandbox/README.md, "Demos", has how demos work.
import { checkDemo } from '../../../sandbox/support/demo.ts';
import { test } from '../../../sandbox/support/fixtures.ts';

test('the demo builds, and every field and every column draws its steps', async ({ page, api }) => {
	await checkDemo(page, api, 'steps', {
		interfaces: { steps: '.steps' },
		displays: { steps: '.steps-display' },
		fields: { bare: '.steps-empty' },
	});
});
