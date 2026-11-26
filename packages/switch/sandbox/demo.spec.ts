// The smoke test of the demo of the Switch (../demo/demo.mjs): the sandbox builds it from its definition, and every
// field of its form draws a switch. ../../../sandbox/README.md, "Demos", has how demos work.
import { checkDemo } from '../../../sandbox/support/demo.ts';
import { test } from '../../../sandbox/support/fixtures.ts';

test('the demo builds, and every field draws a switch', async ({ page, api }) => {
	await checkDemo(page, api, 'switch', { interfaces: { switch: '.switch' } });
});
