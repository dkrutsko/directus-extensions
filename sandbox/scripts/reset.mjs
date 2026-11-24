// Deletes everything the sandbox Directus has written: the database, the
// uploads and the bundle. The next start creates a fresh instance.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const data = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'data');
fs.rmSync(data, { recursive: true, force: true });
console.log(`Removed ${data}`);
