// Creates a new extension from template/:
//
//   npm run new -- <name> ["One line which says what it adds"]
//
// <name> is the part after "directus-extension-", in lower case words joined
// by hyphens, such as "json-table". The package lands in packages/<name>.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [name, description = 'TODO: one line which says what this extension adds to Directus'] = process.argv.slice(2);

function stop(message) {
	console.error(message);
	process.exit(1);
}

if (!name) stop('Usage: npm run new -- <name> ["One line which says what it adds"]');
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) stop(`"${name}" must be lower case words joined by hyphens, such as json-table`);
if (name.startsWith('directus-extension')) stop('Leave out "directus-extension-": it is added for you');
if (/["\\\n]/.test(description)) stop('The description must not contain quotes, backslashes or line breaks');

const target = path.join(root, 'packages', name);
if (fs.existsSync(target)) stop(`packages/${name} already exists`);

// A name which someone else already uses on npm cannot be published.
try {
	const response = await fetch(`https://registry.npmjs.org/directus-extension-${name}`, { method: 'HEAD' });
	if (response.status !== 404) stop(`directus-extension-${name} is already taken on npm (status ${response.status})`);
} catch {
	console.warn('Could not reach npm to check whether the name is free. Check it before the first release.');
}

const values = {
	__NAME__: name,
	__SNAKE__: name.replaceAll('-', '_'),
	__TITLE__: name
		.split('-')
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join(' '),
	__DESCRIPTION__: description.replace(/\.$/, ''),
};

const fill = (text) => text.replace(/__(NAME|SNAKE|TITLE|DESCRIPTION)__/g, (token) => values[token]);

function copy(from, to) {
	fs.mkdirSync(to, { recursive: true });

	for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
		const source = path.join(from, entry.name);
		const destination = path.join(to, fill(entry.name));

		if (entry.isDirectory()) copy(source, destination);
		else fs.writeFileSync(destination, fill(fs.readFileSync(source, 'utf8')));
	}
}

copy(path.join(root, 'template'), target);

// Adds the package to the README and to the dropdowns of both workflows.
const sync = spawnSync(process.execPath, [path.join(root, 'scripts', 'sync.mjs')], { cwd: root, stdio: 'inherit' });
if (sync.status !== 0) process.exit(sync.status ?? 1);

console.log(`
Created packages/${name}. Next:

  1. npm install                          adds it to the workspace and the lockfile
  2. Work through the TODOs in packages/${name} (README.md, AGENTS.md, src/)
  3. npm run build -w packages/${name}
  4. npm run sandbox:test -- ${name}/     its browser test, in the sandbox Directus
`);
