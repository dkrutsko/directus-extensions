// Builds the demos from their definitions (packages/<name>/demo/demo.mjs, see ../README.md, "Demos") in a running
// Directus, through its REST API as the administrator. `npm run demo`, the first start of the sandbox and the smoke
// test of each extension all go through `applyDemo`, so they make the same thing.
//
// `api` is anything with `get`, `post`, `patch` and `delete` which take a path (and a body) and return the `data` of
// the answer: `signIn()` of ./api.mjs, or the `api` fixture of the browser tests.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packages = fileURLToPath(new URL('../../packages/', import.meta.url));

/** The folder in the navigation which holds every demo: a collection without a table. */
export const FOLDER = {
	collection: 'demo',
	schema: null,
	meta: {
		icon: 'interests',
		note: 'One collection for each extension, built from its definition in packages/<name>/demo',
		collapse: 'open',
		translations: [{ language: 'en-US', translation: 'Demos' }],
	},
};

/** The packages which have a demo, in alphabetical order. */
export function demoNames() {
	return fs
		.readdirSync(packages)
		.filter((name) => fs.existsSync(path.join(packages, name, 'demo', 'demo.mjs')))
		.sort();
}

/** The collections of one package's demo, as its definition exports them: one, or a list. */
export async function loadDemo(name) {
	if (!demoNames().includes(name)) throw new Error(`No demo called "${name}". There are: ${demoNames().join(', ')}`);
	const { default: demo } = await import(pathToFileURL(path.join(packages, name, 'demo', 'demo.mjs')).href);
	const collections = [demo].flat();

	// The one guard which keeps a definition away from everything else in the database, the tests' included.
	for (const { collection } of collections) {
		if (!/^demo_[a-z0-9_]+$/.test(collection)) throw new Error(`packages/${name}/demo: "${collection}" is not a demo collection (demo_...)`);
	}

	return collections;
}

/**
 * Removes the collections of one demo (Directus removes their fields, items and presets, the users' own included) and
 * makes them again from the definition. Returns the collections as defined. When a request fails, the collections it
 * has made so far are removed again before the error is thrown, so the demo is not left half built.
 */
export async function applyDemo(api, name) {
	const collections = await loadDemo(name);
	const existing = new Set((await api.get('/collections')).map((entry) => entry.collection));

	if (!existing.has(FOLDER.collection)) await api.post('/collections', FOLDER);

	// A collection which another of the demo points to goes last.
	for (const { collection } of [...collections].reverse()) {
		if (existing.has(collection)) await api.delete(`/collections/${collection}`);
	}

	const made = [];

	try {
		// The demos sit in the folder in the order of their packages, whichever was built last, and a collection which
		// supports a demo sits under it in the order of the definition.
		for (const [index, { items, presets, relations, ...payload }] of collections.entries()) {
			const sort = payload.meta.group === FOLDER.collection ? demoNames().indexOf(name) + 1 : index;
			await api.post('/collections', { ...payload, meta: { ...payload.meta, sort } });
			made.push(payload.collection);
		}

		for (const { relations } of collections) for (const relation of relations) await api.post('/relations', relation);

		for (const { collection, meta, items, presets } of collections) {
			// The API takes no POST for a singleton: a PATCH creates its one item.
			if (meta.singleton && items.length > 0) await api.patch(`/items/${collection}`, items[0]);
			else if (items.length > 0) await api.post(`/items/${collection}`, items);
			for (const preset of presets) await api.post('/presets', { ...preset, collection });
		}
	} catch (error) {
		// Half a demo would look built: the start builds only a demo none of whose collections exists (missingDemos),
		// so it would never be built again. The first error is the one worth reporting, not one of the clean-up.
		for (const collection of made.reverse()) {
			try {
				await api.delete(`/collections/${collection}`);
			} catch {}
		}
		throw error;
	}

	return collections;
}

/** The demos none of whose collections is in the database: those which the start of the sandbox builds. */
export async function missingDemos(api) {
	const existing = new Set((await api.get('/collections')).map((entry) => entry.collection));
	const missing = [];

	for (const name of demoNames()) {
		const collections = await loadDemo(name);
		if (!collections.some(({ collection }) => existing.has(collection))) missing.push(name);
	}

	return missing;
}
