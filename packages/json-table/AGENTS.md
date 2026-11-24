# directus-extension-json-table

A Directus 11 interface extension, published on npm as `directus-extension-json-table`. It adds the **JSON Table** interface (`json-table`) for `json` fields: a read-only table which the field's value holds cell by cell, with a legend under it. Something else writes the value (a flow, a hook, a script that talks to the API); the interface only draws it.

This file is the shared instruction file for coding agents (Codex, Cursor, Claude Code and others); `CLAUDE.md` imports it. If the workspace notes one level up (`../CLAUDE.md`) are present, they describe the surrounding folders.

## Commands

```bash
npm install
npm run dev        # watch build, unminified
npm run check      # vue-tsc, plus tsc over the tests (tsconfig.test.json)
npm test           # vitest
npm run build      # dist/index.js
npm run validate   # directus-extension validate
```

`prepublishOnly` runs check, test, build and validate. Never run `npm audit fix --force`: it moves the SDK pin (see invariant 7).

## Layout

| Path | What |
|---|---|
| `src/index.ts` | `defineInterface` and the seven options. The id `json-table` is stored in users' schemas: never rename it. |
| `src/table.ts` | The format: types, the validator (`parseValue`), unpacking of compressed values, and the pure helpers (`truncateText`, `linkTarget`, `fitPins`). No Vue, no DOM library, no Directus imports, so the tests run it in Node. |
| `src/interface.vue` | The component: view model, pinning and header measurement, template and all styles. |
| `tests/` | Vitest unit tests of `table.ts`. `helpers.ts` has the builders, a generator of large tables (`accessReview`) and a table full of hostile text (`hostile`). |
| `docs/format.md` | The format reference for people who write values. Keep it in sync with behaviour. |
| `docs/schema.json` | JSON Schema of the format. `tests/schema.test.ts` checks it against the validator. |
| `examples/` | Complete values. `tests/table.test.ts` pins their shape, and `tests/docs.test.ts` parses the examples written out in the README and `docs/format.md`. |

## How it works

- **Validate, then render.** `parseValue` returns `empty`, `invalid` with the first problem, or `valid` with a fresh object holding only the known fields. The template only ever sees that object. An invalid value shows one danger notice and never a partial table. `parseValue` never throws and never rejects.
- **Plain and compressed.** A table which is not compressed is checked at once and the result returned as it is. A compressed one (`encoding: "gzip"`) has to be unpacked first, so the result is then a promise. The component keeps the result in `parsed`, set from a watcher on the value; while a value is being unpacked it shows nothing (`pending`) or the table which was there before, and a counter (`reading`) drops a result which arrives after a newer value.
- **Everything a cell inherits is worked out in `table.ts`.** A `Layer` is the checked fields of a cell or part, where a missing field was left out and `null` takes away what would be inherited. Layers are laid over each other with a spread: the part's own fields, the part's `use`, the cell's fields, the cell's `use`. `toCell` then makes finished cells. A cell of several parts comes as `lines`, a list of lines which each hold the pieces that sit side by side, and then has no text, icon, colour, weight or link of its own.
- **A cell written as a string gives the very same object** for every use of the name. The component maps each `Cell` to one `CellView` by identity, so 20,000 cells which are one of five share five views.
- **No component per cell.** A body cell is a plain `<td>` which holds its text, or a `<button>` when it has a link. Only a cell of several parts has an element per line (`.jt-line`) and per piece (`.jt-piece`); header cells, row headers, headings and the legend always have them, since there are few of those. An icon is `data-icon` plus `content: attr(data-icon)` on the `::before`, as a ligature of the app's `Material Symbols` font (`app/src/components/v-icon/v-icon.vue:119-141`).
- **Colours from the value are inline styles** set through Vue's style binding, never CSS text. The background is the custom property `--jt-fill`, which `.jt-fill` lays over the cell's own opaque background as a `linear-gradient` of one colour, so a pinned cell stays opaque when the colour is translucent.
- **Pinned rows and columns** are `position: sticky` cells in a real `<table>` inside `.jt-scroll`. `measure()` reads the sizes the options ask for and `fitPins` takes pins from both edges in turn while they fit in two thirds (`PIN_SHARE`) of the scroll area. A column gets its offset as an inline style on each of its cells, a row as `--jt-pin` on its `<tr>`. A `ResizeObserver` repeats the measurement. Rows can only be pinned with a maximum height: without one the page scrolls, not the table.
- **Two header layouts.** Across: columns of 7.5rem. On their side: columns as narrow as their cells, labels in `writing-mode: vertical-rl` turned by `rotate(180deg)`, cut at 9rem. `auto` picks the second when the columns do not fit the field's width, which `measure()` works out; before the first measurement more than `ROTATE_ABOVE` (3) columns after the first counts as not fitting. The first column is equally wide in both layouts, so switching cannot loop.
- **Links** become the `collection` and `primary-key` props of the app's own `drawer-item` (`app/src/components/register.ts:158`), always with `disabled` and `non-editable`. A link is offered only when the collection exists in the collections store and the user has read permission on it.
- **Width.** `.json-table` is a size container (`container: json-table / inline-size`), which gives it no intrinsic width, so a wide table can never widen the form.

## Invariants: do not break

1. **The format is public API.** `version: 1` values written by other programs must keep drawing the same. Change the format by adding optional fields; anything else needs a new `version` and a parser which still reads version 1. The option keys (`columnLabels`, `maxHeight`, `stickyLeft`, `stickyRight`, `stickyTop`, `stickyBottom`, `placeholder`) keep their names and meanings.
2. **Read-only, always.** The component never emits `input`, and `inheritAttrs: false` keeps the listener the form attaches off every element. Emitting would mark the item as changed and try to save a field nobody edited. `disabled` and `nonEditable` are accepted and ignored.
3. **The interface works nothing out.** No counting, sorting, grouping or knowledge of what a table means. If a table needs totals, the writer adds the cells. The one thing the interface puts together is the tooltip of a body cell (column header, row header, tip), which is layout.
4. **The value is untrusted.**
   - Text only reaches the page through `v-text`, `{{ }}` and attribute bindings. No `v-html`, `innerHTML`, `eval`, dynamic `import` or `<component :is>` driven by the value.
   - Colours are the only part of the value which reaches CSS. They must match `HEX_COLOR` or `THEME_COLOR` in `table.ts`; do not loosen either without thinking about `url()`, a second declaration and `var()` fallbacks. The colour tests list what must stay rejected.
   - `shared` is read into a `Map`, so a name such as `constructor` is only ever a name.
   - Control characters become spaces and bidirectional controls are removed; text which shares a line sits in `<bdi>`.
   - No `href`, route or URL is ever taken from the value. `linkTarget` refuses the ids `+`, `.` and `..`.
   - Unpacking stops at `MAX_UNPACKED_BYTES`.
5. **Nothing is left out without a word.** A table over a limit (`MAX_COLUMNS`, `MAX_ROWS`, `MAX_PARTS`) is rejected, never cut. Only text is cut, and it then ends in three dots.
6. **`table.ts` stays free of Vue, the DOM library and Node-only APIs.** It runs in the browser and in the tests. `tsconfig.test.json` type-checks it without the DOM library, so it may only use globals which both have (`DecompressionStream`, `Blob`, `TextDecoder`, `atob`).
7. **Bundle hygiene.**
   - `dist/index.js` imports only `vue` and `@directus/extensions-sdk`. There are no runtime dependencies; do not add any.
   - `@directus/extensions-sdk` is pinned to exactly `17.1.4`, because its Vue compiler must match the host's Vue (3.5.24 in Directus 11.17.4).
   - Keep `overrides.esbuild`: without it the SDK's two esbuild versions break the build on npm installs.
   - Directus serves all app extensions as one bundle on every Data Studio page, and one broken app bundle disables every custom app extension on the instance. Watch size (about 31 KB), and report size changes.
8. **It is an app-only extension,** so the Marketplace can install it under the default `MARKETPLACE_TRUST`. Don't add API entries casually.
9. **Directus look.** Use only `--theme--*` tokens for the table's own colours, so light, dark and custom themes work, and Directus global components (`v-notice`, `drawer-item`). Styles are scoped; class names start with `jt-`.

## Code style

- TypeScript, tabs (4 wide) and single quotes. `package.json` and YAML use 2 spaces (see `.editorconfig`).
- Comments explain *why*. When relying on Directus internals, cite them as `path:line` in the Directus 11.17.4 source (`app/src/...`, `packages/...`).
- Invisible and bidirectional characters in source are written as `\u` escapes, never as the characters themselves.
- UI text is plain English.
- Markdown paragraphs are unwrapped, one line each (README, CHANGELOG, docs).
- Add or update vitest tests with every behaviour change, and a line in the message table of `docs/format.md` with every new message people are likely to meet. `npm run check` also type-checks the tests.

## Workflow rules

- **Ask before you bump the version, commit, push, tag or publish.** Only do them when explicitly asked. Record user-visible changes under `## Unreleased` at the top of `CHANGELOG.md`.
- **Releasing, only when asked:**
  1. Run `npm version X.Y.Z --no-git-tag-version`.
  2. Rename `## Unreleased` to `## X.Y.Z`.
  3. Commit and push to `main`.
  4. The maintainer then runs **Actions → Publish** with `X.Y.Z`. That workflow uses npm trusted publishing with provenance, then creates the `vX.Y.Z` tag and the GitHub Release from that CHANGELOG section.
  Both workflows stay `workflow_dispatch`-only; there is no automatic CI.
- **Verify UI changes in a real Directus 11.17.4 in a browser, in light and dark,** before handing them back; unit tests cover only `table.ts`. Say plainly what was and wasn't tested.

## Testing in a browser

There are no browser tests in this repo. Version 1.0.0 was verified against a disposable Directus 11.17.4 (SQLite) with Playwright in Chrome, Firefox and WebKit, 97 checks each. To repeat it, seed a collection with a read-only `json` field on this interface and one item per case, and cover at least:

- every value in `examples/`, the generated tables of `tests/helpers.ts` up to 200 by 1,000 (compressed), `hostile()` (no markup, no dialog, no request to another origin), an empty field and invalid values;
- cells: colours, weights, italics, icons, backgrounds, parts side by side and with `break`, tooltips, the legend;
- links from a header cell, a heading, a row header, a body cell and single parts: the right item opens in a drawer whose fields cannot be edited, also for a user who may update that item; a collection the user cannot read and one which does not exist are plain text;
- the item is never marked as changed, and leaving it asks nothing;
- options: a maximum height with pins at all four edges, more pins than fit, both header layouts, the placeholder, field widths half, full and fill;
- window widths from 375px to 1920px, and the dark theme.

Things which are easy to trip over:

- **Directus bundles app extensions when it starts** (unless `EXTENSIONS_AUTO_RELOAD` is on). After a build, restart it and reload the browser tab.
- **Two instances started from the same folder share one bundle.** Directus writes the bundle of app extensions to `TEMP_PATH`, which defaults to `./node_modules/.directus`. Give a second instance its own `TEMP_PATH`.
- **The API drops a `__proto__` key** when a value is saved, and the form hands interfaces a function for `hasOwnProperty`, so those two cannot be names in `shared` (`tests/cells.test.ts`).
- **Firefox resolves automatic margins to nothing** for a block whose writing mode differs from its parent's, so the label on its side is an inline block which its cell centres like text.
- **WebKit reports the app's own cancelled requests as errors** when a page is left quickly ("due to access control checks", "AxiosError: Network Error"). They also appear on pages without this interface.

Measured in headless Chrome on Apple silicon with the default options and the generated tables of `tests/helpers.ts`, from the arrival of the item to the first frame with the table:

| Table | Cells | Value | Drawn after | Scrolling |
|---|---|---|---|---|
| 102 by 211, `accessReview(2, 100, 200)` | 20,600 | 190 KB | about 0.4s | Smooth. Down the page about 1 frame in 13 long |
| 200 by 45, `accessReview(3, 198, 40, 4)` | 8,400 | 99 KB | about 0.2s | Smooth |
| 8 by 1,000, `accessReview(4, 6, 989)` | 7,900 | 163 KB | about 0.2s | Smooth |
| 200 by 1,000, `accessReview(5, 198, 989, 10, true)` | 198,000 | 85 KB compressed (918 KB) | about 3.6s, page frozen | Stutters: frames of up to 0.5s |

From navigation, the last one takes about 4s in Chrome and Firefox and about 6s in WebKit. Unpacking is not what takes the time: the browser unpacks and parses the 918 KB in about 5 milliseconds, and the rest is drawing. With the 102 table columns of the first table in a field 709px wide, whose first column is 252px, labels across give columns of 120px (3 in view, header 38px tall) and labels on their side columns of 47px (9 in view, header 162px tall).

## Known gaps

- No virtual scrolling: every cell is an element, so the cost grows with the number of cells. Drawing only the rows in view would need fixed column widths (a table sizes a column by its widest cell) and row heights which are known without drawing.
- The fixed texts are English only.
- Only Material Symbols icons are drawn; the custom and social icons of `v-icon` are not.
- A value cannot say which rows or columns to pin; that is a field option, so it is the same for every item.
- The `host` range starts at 11.15.0, but only 11.17.4 has been tested, and Directus 12 not at all. The drawer (`drawer-item`), the stores and the icon font are internals which a Directus upgrade can change: re-check the citations in the code.
- Not tested: Safari itself (only Playwright's WebKit), touch devices, right-to-left interface languages, screen readers.
