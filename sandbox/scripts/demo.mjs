// Puts the demos back as their definitions in packages/<name>/demo describe them:
//
//   npm run demo                 every demo
//   npm run demo -- meter steps  the named ones
//
// Each demo's collections are removed and made again, with their items and
// presets; nothing else in the database is touched. When the sandbox is not up
// it is started for the run and stopped again afterwards.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { BASE_URL, isUp, signIn, waitUntilUp } from '../demo/api.mjs';
import { applyDemo, demoNames } from '../demo/apply.mjs';

const asked = process.argv.slice(2);
const unknown = asked.filter((name) => !demoNames().includes(name));

if (unknown.length > 0) {
	console.error(`No demo called ${unknown.join(', ')}. There are: ${demoNames().join(', ')}`);
	process.exit(1);
}

let server;

if (!(await isUp())) {
	console.log(`Starting the sandbox at ${BASE_URL} for the run`);
	const start = fileURLToPath(new URL('./start.mjs', import.meta.url));
	// Only its errors are shown: its other output is about an instance which is gone again at the end.
	server = spawn(process.execPath, [start], { env: { ...process.env, SANDBOX_DEMOS: 'skip' }, stdio: ['ignore', 'ignore', 'inherit'] });
	if (!(await waitUntilUp(server))) {
		console.error('The sandbox did not start. `npm run sandbox` shows why.');
		process.exit(1);
	}
}

try {
	const api = await signIn();

	// One demo which fails leaves nothing of itself behind, and the others are
	// still built.
	for (const name of asked.length > 0 ? asked : demoNames()) {
		try {
			await applyDemo(api, name);
			console.log(`Built the demo of ${name}`);
		} catch (error) {
			console.error(`Could not build the demo of ${name}: ${error.message}`);
			process.exitCode = 1;
		}
	}
} catch (error) {
	console.error(error.message);
	process.exitCode = 1;
} finally {
	if (server && server.exitCode === null && server.signalCode === null) {
		server.kill('SIGTERM');
		await once(server, 'exit');
	}
}
