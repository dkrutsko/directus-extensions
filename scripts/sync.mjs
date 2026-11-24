// Keeps everything which lists the packages in step with packages/:
//
// - the table of extensions in README.md,
// - the "package" dropdown of the Build and Publish workflows.
//
// It also checks the rules every package has to follow (see AGENTS.md).
//
//   npm run sync             rewrites the lists and reports broken rules
//   npm run sync -- --check  changes nothing; fails when a list is out of
//                            date or a rule is broken (the workflows run it)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const check = process.argv.includes('--check');
const REPOSITORY = 'git+https://github.com/dkrutsko/directus-extensions.git';

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));

const folders = fs
	.readdirSync(path.join(root, 'packages'), { withFileTypes: true })
	.filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, 'packages', entry.name, 'package.json')))
	.map((entry) => entry.name)
	.sort();

const packages = folders.map((folder) => ({ folder, manifest: json(`packages/${folder}/package.json`) }));
const template = json('template/package.json');
const problems = [];

//----------------------------------------------------------------------------//
// Rules                                                                      //
//----------------------------------------------------------------------------//

const names = new Set(packages.map(({ manifest }) => manifest.name));
const sdk = template.devDependencies['@directus/extensions-sdk'];
const host = template['directus:extension'].host;

for (const { folder, manifest } of packages) {
	const fail = (message) => problems.push(`packages/${folder}: ${message}`);
	const extension = manifest['directus:extension'] ?? {};

	if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(folder)) fail('the folder name must be lower case words joined by hyphens');
	if (manifest.name !== `directus-extension-${folder}`) fail(`"name" must be directus-extension-${folder}`);
	if (manifest.private) fail('must not be private');
	if (manifest.license !== 'MIT') fail('"license" must be MIT');
	if (manifest.repository?.url !== REPOSITORY) fail(`"repository.url" must be ${REPOSITORY}`);
	if (manifest.repository?.directory !== `packages/${folder}`) fail(`"repository.directory" must be packages/${folder}`);
	if (manifest.publishConfig?.provenance !== true) fail('"publishConfig.provenance" must be true');
	if (manifest.publishConfig?.access !== 'public') fail('"publishConfig.access" must be public');

	// npm only reads overrides from the root package.json.
	if (manifest.overrides) fail('"overrides" belong in the root package.json');

	// One SDK and one host range for the whole repository, set in template/package.json.
	if (manifest.devDependencies?.['@directus/extensions-sdk'] !== sdk) fail(`@directus/extensions-sdk must be ${sdk}, as in template/package.json`);
	if (extension.host !== host) fail(`the host range must be ${host}, as in template/package.json`);

	// Each extension relies on its own code only.
	for (const group of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
		for (const dependency of Object.keys(manifest[group] ?? {})) {
			if (names.has(dependency)) fail(`must not depend on ${dependency}, another package of this repository`);
		}
	}

	for (const file of ['README.md', 'CHANGELOG.md', 'LICENSE', 'AGENTS.md']) {
		if (!fs.existsSync(path.join(root, 'packages', folder, file))) fail(`${file} is missing`);
	}
}

//----------------------------------------------------------------------------//
// Lists                                                                      //
//----------------------------------------------------------------------------//

/** Replaces the lines between the two marker lines of a file, keeping the markers. */
function between(file, start, end, lines) {
	const before = read(file);
	const all = before.split('\n');
	const from = all.findIndex((line) => line.includes(start));
	const to = all.findIndex((line) => line.includes(end));

	if (from === -1 || to <= from) {
		problems.push(`${file}: the markers "${start}" and "${end}" are missing`);
		return;
	}

	const after = [...all.slice(0, from + 1), ...lines, ...all.slice(to)].join('\n');
	if (after === before) return;

	if (check) problems.push(`${file}: the list of packages is out of date, run \`npm run sync\``);
	else {
		fs.writeFileSync(path.join(root, file), after);
		console.log(`Updated ${file}`);
	}
}

between('README.md', '<!-- packages:start -->', '<!-- packages:end -->', [
	'| Extension | What it adds | npm |',
	'|---|---|---|',
	...packages.map(
		({ folder, manifest }) =>
			`| [${manifest.name}](packages/${folder}) | ${manifest.description} | [![npm](https://img.shields.io/npm/v/${manifest.name})](https://www.npmjs.com/package/${manifest.name}) |`,
	),
]);

for (const workflow of ['.github/workflows/build.yml', '.github/workflows/publish.yml']) {
	between(
		workflow,
		'# packages:start',
		'# packages:end',
		folders.map((folder) => `          - ${folder}`),
	);
}

if (problems.length > 0) {
	console.error(problems.map((problem) => `- ${problem}`).join('\n'));
	process.exit(1);
}

console.log(`${packages.length} packages in step: ${folders.join(', ')}`);
