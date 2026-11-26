# Sandbox

A local Directus 11.17.4 with a SQLite database which loads every extension of `../packages`, and the browser tests which run against it. It is for trying an extension by hand, for playing with the demos of the extensions side by side, and for checking that the built bundles work in a real Data Studio. It is not a workspace of the repository: it has its own `package.json` and lockfile, so installing the extensions never installs Directus.

## Requirements

- **Node 22.** Directus 11.17.4 depends on a native module (`isolated-vm` 5.0.3) which has no build for Node 24 or later, so the install refuses any other version. The extensions themselves build on Node 22 and later.
- Every extension built (`npm run build` in the repository root). The start says which ones are not.

## Commands

Run these in the repository root:

```bash
npm run sandbox:install   # installs Directus and Playwright into sandbox/, and Playwright's Chromium
npm run sandbox           # starts Directus at http://127.0.0.1:8155, and builds the demos it does not have yet
npm run demo              # puts every demo back as its definition describes it; `npm run demo -- meter` puts back one
npm run sandbox:test      # runs every browser test
npm run sandbox:reset     # deletes the database, the uploads and the bundle
```

Sign in as `admin@example.com` with the password `sandbox`. Both, and the port, are in `settings.json`. Everything the instance writes goes into `data/`, and the results of the browser tests into `test-results/`; git ignores both.

The first start creates the database and the administrator, and then the demos. `npm run sandbox:test` starts the instance for the run when it is not already up, and stops it again afterwards. To run the tests of one extension, pass a part of the path, for example `npm run sandbox:test -- json-table/`.

### Two instances side by side

Two variables move an instance for one run, so that two of them never share a database, an uploads folder or a bundle:

- `SANDBOX_PORT` is the port (8155 by default).
- `SANDBOX_DATA` is the folder for everything the instance writes (`data/` by default): absolute, or relative to this folder. With it set, the results of the browser tests go into it too, under `test-results`; without it, into `test-results/` here.

Every command reads both, so set them for the whole terminal:

```bash
export SANDBOX_PORT=8156 SANDBOX_DATA=/some/folder/outside/the/repository
npm run sandbox        # in one terminal
npm run demo           # in another, against that instance
npm run sandbox:test   # also against that instance
```

`npm run sandbox:reset` deletes only the names the sandbox writes (`data.db` and its companions, `uploads`, `tmp`, `test-results`), and the folder when nothing else is left in it. Those are also the names a Directus project on SQLite uses, so the start leaves a file `.sandbox` in the folder, and the start, the reset and the browser tests refuse a folder named by `SANDBOX_DATA` which holds files but not that one: point it at a new or empty folder. `data/` here is the sandbox's own and needs no such file.

## Demos

The Data Studio has a folder **Demos** with one collection for each extension which has options to choose from, in the order of the packages: JSON Table, Meter, Node Graph, Steps and Switch. Each shows the extension in fields with different options, in collapsible groups by topic of which only the first, Recipes, starts open, so they can be tried and compared side by side, and a set-up picked for a project of one's own. The note under each field lists the options it sets. A demo with a display is a collection with a few items whose values differ, and its table shows the display in several columns, with bookmarks for more; a demo of an interface alone is a singleton, so a click on it opens the form. A collection which a demo only needs, such as the products which the tables of JSON Table link to, sits under that demo.

**The definitions are the one source.** Each demo is described by `packages/<name>/demo/demo.mjs`, and the sandbox builds it from there; nothing goes the other way. A field changed in the Data Studio, under Settings, Data Model, stays changed only until the demo is built again: by `npm run demo`, or by the smoke test of that extension. To keep a change, make it in the definition.

**When the demos are built:**

- `npm run sandbox` builds, once the instance answers, every demo none of whose collections is in the database. A fresh database gets all of them; on one which has them nothing happens, so what someone is trying is kept. A new demo appears with the next start. A demo which fails to build leaves none of its collections behind, so the next start tries it again; the start names it and goes on with the others.
- `npm run demo` removes the collections of every demo, or of the ones named, with their items and presets (the users' own too), and makes them again. It touches no other collection. When the sandbox is not up, it starts it for the run and stops it again.
- `npm run sandbox:reset` followed by `npm run sandbox` builds all of them from nothing.

A first start takes about 8 seconds on a laptop, half a second of it for the demos; a later start about as long, without them. `npm run demo` takes about two seconds against a running instance.

### Writing a definition

A definition is plain JavaScript which Node 22 runs as it is: no TypeScript, no build, no dependency. Its default export is a collection, or a list of them, made with the helpers of `demo/define.mjs`:

```js
import { collection, field, group } from '../../../sandbox/demo/define.mjs';

const toggle = (key, name, spec) => field(key, name, { type: 'boolean', interface: 'switch', display: 'boolean', width: 'half', ...spec });

export default collection('demo_switch', {
	name: 'Switch',
	icon: 'toggle_on',
	note: 'The Switch interface with every option',
	singleton: true,
	about: '**Switch** draws a boolean field as a box with a label and a line of description, ...',
	fields: [
		group('recipes', 'Recipes', { open: true, icon: 'menu_book', text: 'The set-ups most fields want.' }, [
			toggle('published', 'Label and description', {
				note: 'The usual set-up: a label, and a line which says what the switch does.',
				options: { label: 'Published', description: 'Visible to everyone on the public site.' },
				value: true,
			}),
		]),
	],
});
```

- `collection(key, spec)`: the key is `demo_<something>`. `name` is what the navigation shows, `icon`, `note` (one line), `singleton`, `template` (the display template), `about` (what the extension is, in a sentence or two of Markdown), `fields`, `items`, `presets` and `relations`. The form starts with a notice made of `about` and the same few sentences in every demo: every field can be tried, the note under a field lists its options, where the rest of its settings are, and that `npm run demo` puts everything back.
- `supports` in a collection's `spec` names the demo collection which it only serves, such as the items which its links open: it sits under that one in the navigation, and its notice is `about` alone, since it has no options to try. A demo with one exports a list, the demo first.
- `field(key, name, spec)`: `name` says what the field shows ("Dots, spread"), not its key. `spec` has `type` (default `string`), `note` (one sentence), `brief` (below), `value` and `schema`; everything else is the field's `meta` as the API takes it: `interface`, `options`, `display`, `display_options`, `width` (default `full`), `readonly`, `hidden`. `boolean`, `json` and `csv` fields get the special the app gives them.
- `group(key, name, { open, icon, text }, fields)`: a stock collapsible group, closed unless `open` (open only the first). `text` puts a notice at its top.
- `notice(key, text)`: a notice across the form, in Markdown.
- `table(fields, { bookmark, widths })`: a preset of the table layout for every user: the columns, and their widths in pixels. One without a `bookmark` is what the table shows; each `bookmark` is one more saved view, such as the columns of one group.
- **Items:** `items` is a list of items. Without it, the `value`s of the fields make one item, which is what a singleton wants.
- **Files** are not supported: a definition which needs one has to grow that first.

The note under each field is written by `field()` from the field's own options: the sentence of the definition, then `Options:` with each key and value as stored, in code, then the display options and "read-only" where the field has them. A list or an object longer than 60 characters is summed up instead, as its number of entries and the keys they use, such as "`choices`: 4 entries (`text`, `value`)", since written out it would bury the sentence; Data Model shows all of it. Where that says too little, `brief` gives an option other words, by its key, as Markdown or a function of the value: the Meter writes its thresholds as "`#FFA439` from 50", Steps lists the values its steps store, and the Node Graph names its ruleset and the file it comes from. Set no option to its default, or the note lists it. A field which only supports the demo, such as the name of an item, takes `describe: false` and keeps its note as written.

So that the demos read as one, they share a few habits:

- The first group is **Recipes** (key `recipes`, icon `menu_book`), the only one open: the set-ups most fields want, or the recipes of the extension's README.
- `about` starts with the name of the extension in bold and what it does. A demo with items says what they differ in, and its items have a field `name` called "Item".
- Keys are in snake case; names say what a field shows, in sentence case.

`packages/switch/demo/demo.mjs` is the model of a singleton, `packages/meter/demo/demo.mjs` of a collection with items and a table, and `packages/json-table/demo/demo.mjs` of a demo with a collection which supports it.

### The smoke test

Every extension with a demo has `packages/<name>/sandbox/demo.spec.ts`:

```ts
import { checkDemo } from '../../../sandbox/support/demo.ts';
import { test } from '../../../sandbox/support/fixtures.ts';

test('the demo builds, and every field and every column draws a meter', async ({ page, api }) => {
	await checkDemo(page, api, 'meter', { interfaces: { meter: '.meter' }, displays: { meter: '.meter-display' } });
});
```

`checkDemo` (in `support/demo.ts`) builds the demo with the same function as `npm run demo`, opens the form of each collection with every group open, and checks that each field whose interface is named in the map drew the element given for it, and that nothing says "Interface ... not found". A field which draws something else on purpose, such as the notice of a field without steps, gets a selector of its own by its key in `fields`, which wins over the interface's. Where the map names displays, it opens the table and each bookmark of the collection, and checks that every value which is not empty in a column of the display is drawn by it. The fixture fails the test on any error the page logs.

## Working on an extension

1. `npm run sandbox`
2. In another terminal, `npm run dev -w packages/<name>` rebuilds the extension on every change.
3. Reload the browser tab. The sandbox reloads extensions when their `dist` changes (`EXTENSIONS_AUTO_RELOAD`), so it does not need a restart.

A change to a `package.json` of an extension, or a new extension, does need a restart. A changed demo definition needs `npm run demo -- <name>`.

## Browser tests

The tests live with the extensions, in `packages/<name>/sandbox/*.spec.ts`, and run in Chromium. A spec imports `test` and `expect` from `support/fixtures.ts`, which gives it:

- `api`, to seed through the REST API as the administrator. A spec creates its own collections, named `sandbox_<name>...`, and drops them first (`api.drop`), so it can run again on the same database. The demos' collections are named `demo_...`, and neither touches the other's.
- `page`, already signed in as the administrator.
- A check after every test that the page logged no error and threw nothing. Directus serves all app extensions as one bundle, so one broken extension shows as such an error in the tests of every other.

All specs share one Directus and one database, so they run one at a time. `playwright.config.ts` has the rest. Playwright runs TypeScript without checking it; `npm run check` in this folder type-checks the setup and every spec.

## Things which are easy to trip over

- **Two instances started from the same folder share one bundle.** Directus writes the bundle of all app extensions to `TEMP_PATH`, which defaults to a folder inside `node_modules`. The sandbox sets its own (`tmp` in the data folder), so it can run next to another Directus on the same machine.
- **The sandbox refuses to start when an extension cannot be loaded** (`EXTENSIONS_MUST_LOAD`), so a test run cannot pass without it.
- **The versions belong together.** `directus` in `package.json` is the version the extensions are built for. When it changes, the SDK pin and the host range of the extensions change with it (see the root `AGENTS.md`).
- **A sandbox started by the browser tests builds no demos** (`SANDBOX_DEMOS=skip`, which `npm run demo` uses too): each smoke test builds its own, and a build beside the first tests would race them. Started that way on a fresh database, it has only the demos whose smoke tests ran; the next `npm run sandbox` adds the others.
- **A test run puts the demos it tests back,** changes made by hand included.
- **Building the demos logs a few warnings of the Node Graph hook** that `demo_node_graph.no_ruleset` has no valid ruleset. That field shows a Node Graph field before a ruleset is set, on purpose.
- **A singleton takes no POST:** the API creates its one item with a PATCH, which `applyDemo` does.
- **A boolean field created through the API needs `cast-boolean`,** or SQLite hands back `0` and `1`; `field()` adds it.
- **Names and notes are English.** The names of fields and collections are translations for `en-US`; a user with another language sees the keys.
