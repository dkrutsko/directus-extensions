// The folder the sandbox writes into: data/ here, or the one SANDBOX_DATA
// names. The names it writes there are those of any Directus project on SQLite
// (data.db, uploads), so a SANDBOX_DATA which names such a project's folder
// would open its database and let a reset delete it. The start therefore
// leaves a file .sandbox in the folder, and the start and the reset refuse a
// folder which holds files but not that one. data/ here is the sandbox's own,
// with or without it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export const DATA = path.resolve(root, process.env.SANDBOX_DATA || 'data');
export const MARKER = '.sandbox';

/** Why the sandbox must keep out of DATA, or null when it may use it: data/ here, a new or empty folder, or one it marked. */
export function refusal() {
	if (DATA === path.join(root, 'data') || !fs.existsSync(DATA)) return null;
	const names = fs.readdirSync(DATA);
	if (names.length === 0 || names.includes(MARKER)) return null;
	return `${DATA} holds files, and the sandbox did not make it (there is no ${MARKER} file in it). Set SANDBOX_DATA to a new or empty folder.`;
}

/** Makes DATA and marks it as the sandbox's. */
export function claim() {
	fs.mkdirSync(path.join(DATA, 'uploads'), { recursive: true });
	fs.writeFileSync(path.join(DATA, MARKER), 'Made by the sandbox of directus-extensions. `npm run sandbox:reset` deletes what it wrote here.\n');
}
