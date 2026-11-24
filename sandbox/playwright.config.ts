import { defineConfig } from '@playwright/test';
import { BASE_URL } from './support/sandbox.ts';

// The tests live with the extensions, in packages/<name>/sandbox/*.spec.ts.
// They all share one Directus and one database, so they run one at a time.
// Run the tests of one extension with `npm run sandbox:test -- <name>/`.
export default defineConfig({
	testDir: '../packages',
	testMatch: '**/packages/*/sandbox/*.spec.ts',
	outputDir: './test-results',
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

	// Starts the sandbox for the run, or uses the one which is already up.
	webServer: {
		command: 'npm start',
		url: `${BASE_URL}/server/ping`,
		reuseExistingServer: true,
		timeout: 180_000,
	},
});
