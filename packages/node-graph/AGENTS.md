# directus-extension-node-graph

A Directus 11 bundle extension, published on npm as `directus-extension-node-graph`, that adds a configurable node-graph field. A `json` field shows an input-like row with a summary. Edit opens a widened stock side drawer with a Vue Flow 1.x canvas: a node palette on the left, the inspector and issues on the right. What a graph may contain (node types, node fields, ports, data types, edge types, connection and graph rules) is a per-field **ruleset** stored in the interface options and edited through a custom options form, or as JSON. A server-side hook enforces the same rules on every write.

The rules which hold for every extension of this repository (independence, bundle hygiene, code style, releasing, the sandbox) are in the root `AGENTS.md`. This file only holds what is specific to this package; `CLAUDE.md` imports it. The design history (feasibility study, the three-library experiment, the Vue Flow 1 vs 2 benchmark, QA reports) lives outside this repository.

## Commands

Run these in this folder, after `npm install` in the repository root:

```bash
npm run dev        # watch build, unminified
npm run check      # vue-tsc, plus tsc over the tests (tsconfig.test.json)
npm test           # vitest
npm run build      # dist/app.js + dist/api.js
npm run validate   # directus-extension validate
```

`prepublishOnly` runs check, test, build and validate.

## Layout

| Path | What |
|---|---|
| `src/interface.ts`, `src/display.ts`, `src/hook.ts` | Bundle entries. The ids `node-graph`, `node-graph-summary` and `node-graph-guard` are stored in users' schemas: never rename them. |
| `src/shared/core/` | Framework-free rules engine, compiled into **both** `dist/app.js` and `dist/api.js`. `types.ts` is the contract. Also `compile.ts` (ruleset → compiled plus problems), `validate.ts` and `connect.ts` (issues, live connection checks), `commands.ts` (pure `applyCommand`), `document.ts` (normalise, starter graph), `labels.ts`, `template.ts` and `references.ts` (plain-text titles and summaries), `hash.ts` and `meta.ts`. |
| `src/shared/ui/` | Editor shell. `NodeGraphInterface.vue` is the field row plus the editor. `NodeGraphEditor.vue` is the widened drawer, with history and keyboard. Then the palette, the inspector (global `v-form`), the issues list, `references.ts` (fetches display text for item references), `theme.css` (`--ng-*` tokens built from `--theme--*`), and `canvas-contract.ts`, the seam to the canvas. |
| `src/shared/options-editor/` | The custom interface-options component: the ruleset form built from stock Repeaters and pickers, "Load Example" and "Edit as JSON". `view-model.ts` converts Ruleset ↔ form rows. |
| `src/shared/hook/guard.ts` | Server enforcement for `items.create`/`items.update` (policies `ratchet`, `reject`, `log`, `off`) and a `fields.*` ruleset check. |
| `src/shared/display/` | The summary display. |
| `src/canvas/` | The Vue Flow 1.48.2 canvas implementing `canvas-contract.ts`, plus its Directus theme. |
| `tests/` | Vitest unit tests, `tests/fixtures/`. |
| `sandbox/` | Browser tests which run against the sandbox Directus of the repository: the field row, the editor opening with the ruleset's node types, and the hook refusing a value which is not a graph. |
| `docs/ruleset.md` | The full ruleset reference for people writing rulesets. Keep it in sync with behaviour. |
| `docs/design.md` | The visual spec. Code comments cite it as `docs/design.md §N`, so keep section numbers stable. |
| `examples/` | Example rulesets. `approval-workflow.json` must stay identical to `exampleRuleset` in core (a test enforces it). |

## Invariants: do not break

1. **Stored formats are public API.** The field value is a `GraphDocument` (`format: 'directus-node-graph', version: 1`). `options.ruleset` is a `Ruleset` (`format: 'directus-node-graph-ruleset', schemaVersion: 1`), and the other option keys keep their names and meanings. Any change must stay backward compatible or ship with a migration and tests.
2. **The options editor round-trips losslessly.** Ruleset → view model → ruleset must be deep-equal: key order, defaults that were absent, unknown keys and `meta.conditions` are all kept. Opening the field settings must not emit. See `tests/options-editor.test.ts`.
3. **Core is framework-free and synchronous.**
   - No Vue, DOM or Node-only APIs, and no async crypto.
   - `normalizeDocument` never throws, and it strips `_user`/`_date`, which content versioning injects.
   - `__proto__`, `constructor` and `prototype` are blocked.
   - Templates produce plain text, never HTML.
4. **The canvas is document-first.**
   - The `document` prop is the source of truth. The canvas emits `GraphCommand`s, which the shell applies with `applyCommand` and records in history.
   - Never drop unknown node types, ports or edges; they render as placeholders.
   - **Never set Vue Flow's store-level `isValidConnection`.** It silently drops stored edges on load, in 1.x and in `@xyflow/vue` 2 next.17. Validate per handle while drawing instead.
   - The shell owns the keyboard. Vue Flow's own key handling is off, and its listeners sit on `document`.
5. **The editor and the server agree.** Live checks (`canConnect`, `validateDocument`) and the hook use the same core. Completeness checks default to warnings, so half-built graphs can be saved.
6. **Bundle hygiene.**
   - The root `AGENTS.md` has the rules. Vue Flow (`@vue-flow/core`, `@vue-flow/minimap`) is bundled into `dist/app.js`. Its versions, and those of the `@directus/*` packages and `knex`, are pinned exactly.
   - `dist/app.js` is about 473 KB and `dist/api.js` about 114 KB. Directus serves the app bundle uncompressed by default. Report size changes.
7. **Directus look.**
   - Use only `--theme--*` tokens, so light, dark and custom themes work, and Directus global components (`v-drawer`, `v-form`, `v-button`, `v-list`, `v-notice`, …), following `docs/design.md`.
   - Scope every unscoped CSS rule under a root class.
   - The wide drawer depends on internal markup (`#dialog-outlet .v-drawer:has(...)`, against `app/src/components/v-drawer.vue:146,244`). Re-check it whenever the Directus version changes.
8. **No relational interfaces in nodes.** Node and edge fields are not database columns, so relational interfaces (M2O, M2A, files, …) cannot be used, and the stock interface picker hides them. Item references use `collection-item-dropdown` and `collection-item-multiple-dropdown`, which store `{ key, collection }`. The editor shows the item's display text; the server and the display show keys.
9. **The hook is non-sandboxed.** It reads `directus_fields` and stored items through the hook context, so it can't be sandboxed or installed from the Marketplace under default trust. Error messages may name only ids, titles and issue codes.

## Code style

The root `AGENTS.md` has the style of the repository. In this package also:

- Code comments cite the visual spec as `docs/design.md §N`: keep its section numbers stable.
- The unit tests cover the core, the hook, the options and the conversions of the options editor. The editor itself has to be checked in a browser.

## Demo

`demo/demo.mjs` describes the demo in the sandbox (see `sandbox/README.md`, "Demos"): the collection `demo_node_graph`, whose four items hold their graphs at different stages (finished, half built, just created, empty), a form with the graph fields in groups by topic, a table preset with the display, and `demo_node_graph_ovens`, the items which the item references of the bakery ruleset point at. The rulesets are `demo/bakery-line.json`, `demo/loan-desk.json` and `examples/approval-workflow.json`, and a field's note names its ruleset instead of listing it. The hook checks every graph the demo seeds, so a graph with errors only goes into a field set to Log only. A new or changed option gets a field in a group. `sandbox/demo.spec.ts` builds the demo, checks that every field draws its row and every value in the table the display, and opens the recipes in the editor.

## Known gaps

- Fit-to-screen in the wide drawer, with the panels open, lands near 39% zoom, so card text is unreadable. Options: a collapsible inspector, a minimum fit zoom.
- The editor is not code-split. The whole canvas ships in the boot bundle; an `extension.config.js` split was only tried in a throwaway build.
- `@xyflow/vue` 2: switch only when a stable 2.x is npm `latest`, is published from `xyflow/xyflow` main, and its Vue peer range fits the Directus Vue. A working port exists in the research workspace.
- The server does not check that item references exist.
- Renaming a key in the options editor does not update references to it.
- Untested: Safari, Firefox, touch, and the editor inside M2A drawers (an O2M child drawer was tested).
