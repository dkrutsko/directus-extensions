// Deletes everything the sandbox Directus has written: the database, the
// uploads and the bundle, and, with SANDBOX_DATA set, the results of the
// browser tests, which go into that folder then (otherwise they are in
// sandbox/test-results, which this leaves alone). The next start creates a
// fresh instance and builds the demos again.
//
// Only these names are deleted, and only in a folder the sandbox made (see
// data.mjs). The folder goes too when nothing else is left in it.
import fs from 'node:fs';
import path from 'node:path';
import { DATA, MARKER, refusal } from './data.mjs';

const written = (name) => /^data\.db/.test(name) || ['uploads', 'tmp', 'test-results'].includes(name);

if (refusal()) {
	console.error(`Nothing was deleted. ${refusal()}`);
	process.exit(1);
}

if (fs.existsSync(DATA)) {
	for (const name of fs.readdirSync(DATA).filter(written)) fs.rmSync(path.join(DATA, name), { recursive: true, force: true });
	if (fs.readdirSync(DATA).every((name) => name === MARKER)) fs.rmSync(DATA, { recursive: true });
}

console.log(`Removed the database, the uploads and the bundle in ${DATA}`);
