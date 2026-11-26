// Starts the sandbox Directus: creates the database and the admin user on the
// first run (and applies migrations on later ones), then serves until stopped.
// Once it answers, it builds every demo which is not in the database yet, so a
// fresh database gets all of them and one which has them is left as it is.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMIN, BASE_URL, signIn, waitUntilUp } from '../demo/api.mjs';
import { applyDemo, missingDemos } from '../demo/apply.mjs';
import { claim, refusal } from './data.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const directus = path.join(root, 'node_modules', '.bin', 'directus');
const packages = path.join(root, '..', 'packages');
const env = { ...process.env, CONFIG_PATH: path.join(root, 'config.cjs') };

// Directus 11.17.4 depends on isolated-vm 5.0.3, a native module which has no
// build for Node 24 or later. A newer Node fails with ERR_DLOPEN_FAILED.
if (process.versions.node.split('.')[0] !== '22') {
	console.error(`The sandbox needs Node 22 (this is ${process.version}): Directus 11.17.4 does not run on anything newer.`);
	process.exit(1);
}

if (!fs.existsSync(directus)) {
	console.error('The sandbox is not installed. Run `npm run sandbox:install` in the repository root.');
	process.exit(1);
}

// EXTENSIONS_MUST_LOAD would stop the start with a less helpful message.
const unbuilt = fs
	.readdirSync(packages, { withFileTypes: true })
	.filter((entry) => entry.isDirectory() && fs.existsSync(path.join(packages, entry.name, 'package.json')))
	.filter((entry) => !fs.existsSync(path.join(packages, entry.name, 'dist')))
	.map((entry) => entry.name);

if (unbuilt.length > 0) {
	console.error(`Not built yet: ${unbuilt.join(', ')}. Run \`npm run build\` in the repository root.`);
	process.exit(1);
}

// Before Directus opens or creates a database in it (see data.mjs).
if (refusal()) {
	console.error(refusal());
	process.exit(1);
}

claim();

const bootstrap = spawnSync(directus, ['bootstrap'], { cwd: root, env, stdio: 'inherit' });
if (bootstrap.status !== 0) process.exit(bootstrap.status ?? 1);

const server = spawn(directus, ['start'], { cwd: root, env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 0));

// The browser tests start the sandbox with SANDBOX_DEMOS=skip: each smoke test
// builds its own demo, and a build beside the first tests would race them.
// `npm run demo` skips it as well, since it builds the demos itself.
if (await waitUntilUp(server)) {
	if (process.env.SANDBOX_DEMOS !== 'skip') {
		try {
			const api = await signIn();
			const missing = await missingDemos(api);

			if (missing.length > 0) {
				const started = Date.now();
				const failed = [];
				console.log(`Building the demos: ${missing.join(', ')}`);

				// One demo which fails leaves nothing of itself behind (applyDemo
				// sees to that) and does not keep the others from being built.
				for (const name of missing) {
					try {
						await applyDemo(api, name);
					} catch (error) {
						failed.push(name);
						console.error(`Could not build the demo of ${name}: ${error.message}`);
					}
				}

				const seconds = ((Date.now() - started) / 1000).toFixed(1);
				if (failed.length === 0) console.log(`Built the demos in ${seconds}s`);
				else console.error(`Left out: ${failed.join(', ')}. \`npm run demo -- ${failed.join(' ')}\` tries again, and so does the next start.`);
			}
		} catch (error) {
			// The instance is still worth having.
			console.error(`Could not build the demos: ${error.message}. \`npm run demo\` tries again.`);
		}
	}

	console.log(`The sandbox is at ${BASE_URL}: sign in as ${ADMIN.email} with the password "${ADMIN.password}".`);
}
