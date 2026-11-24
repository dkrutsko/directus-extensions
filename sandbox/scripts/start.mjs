// Starts the sandbox Directus: creates the database and the admin user on the
// first run (and applies migrations on later ones), then serves until stopped.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

fs.mkdirSync(path.join(root, 'data', 'uploads'), { recursive: true });

const bootstrap = spawnSync(directus, ['bootstrap'], { cwd: root, env, stdio: 'inherit' });
if (bootstrap.status !== 0) process.exit(bootstrap.status ?? 1);

const server = spawn(directus, ['start'], { cwd: root, env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 0));
