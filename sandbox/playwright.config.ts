import path from 'node:path';
import { defineConfig } from '@playwright/test';
import { refusal } from './scripts/data.mjs';
import { BASE_URL } from './support/sandbox.ts';

// The tests live with the extensions, in packages/<name>/sandbox/*.spec.ts.
// They all share one Directus and one database, so they run one at a time.
// Run the tests of one extension with `npm run sandbox:test -- <name>/`.
//
// With SANDBOX_DATA set, the results go into that folder as well, so two runs
// side by side do not clear each other's. Playwright empties its results folder
// before anything else, so a folder the sandbox did not make is refused here.
const refused = refusal();
if (refused) throw new Error(refused);

export default defineConfig({
	testDir: '../packages',
	testMatch: '**/packages/*/sandbox/*.spec.ts',
	outputDir: process.env.SANDBOX_DATA ? path.resolve(import.meta.dirname, process.env.SANDBOX_DATA, 'test-results') : './test-results',
	fullyParallel: false,
	workers: 1,
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: './playwright-report' }]] : 'list',
	timeout: 60_000,
	expect: { timeout: 15_000 },

	use: {
		baseURL: BASE_URL,
		browserName: 'chromium',
		viewport: { width: 1440, height: 900 },
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},

	// Starts the sandbox for the run, or uses the one which is already up. One
	// started here builds no demos: each smoke test builds its own.
	webServer: {
		command: 'npm start',
		url: `${BASE_URL}/server/ping`,
		env: { SANDBOX_DEMOS: 'skip' },
		reuseExistingServer: true,
		timeout: 180_000,
	},
});
