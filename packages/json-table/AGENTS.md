# directus-extension-json-table

A Directus 11 interface extension, published on npm as `directus-extension-json-table`. It adds the **JSON Table** interface (`json-table`) for `json` fields: a read-only table which the field's value holds cell by cell, with a legend under it. Something else writes the value (a flow, a hook, a script that talks to the API); the interface only draws it.

The rules which hold for every extension of this repository (independence, bundle hygiene, code style, releasing, the sandbox) are in the root `AGENTS.md`. This file only holds what is specific to this package; `CLAUDE.md` imports it.

## Commands

Run these in this folder, after `npm install` in the repository root:

```bash
npm run dev        # watch build, unminified
npm run check      # vue-tsc, plus tsc over the tests (tsconfig.test.json)
npm run build      # dist/index.js
npm test           # vitest; two tests read dist/index.js
npm run validate   # directus-extension validate
```

`prepublishOnly` runs check, build, test and validate. The build comes before the tests because `tests/bundle.test.ts` reads `dist/index.js`, and skips its two checks of the bundle with a warning when there is none.

## Layout

| Path | What |
|---|---|
| `src/index.ts` | `defineInterface` and the seven options, with the condition which shows the two options for rows only while there is a maximum height. The id `json-table` is stored in users' schemas: never rename it. |
| `src/table.ts` | The format: types, the validator (`parseValue`), unpacking of compressed values, and the pure helpers (`truncateText`, `linkTarget`, `fitPins`, `snugColumns`). No Vue, no DOM library, no Directus imports, so the tests run it in Node. |
| `src/view.ts` | What the component draws, worked out from a checked table and the options: the defaults and limits of the options, the view model (`buildView`: cells, groups of rows, tooltips, names for assistive technology, links), the reading of the options (`heightLimit`, `stickyCount`, `wantedPins`, `rotates`, `fittingColumns`) and the pins (`pinViews`, `pinCover`). As free of Vue, the DOM and Directus as `table.ts`: whether a collection may be read is asked through a function which is passed in. |
| `src/interface.vue` | The component: it asks the stores, measures the page and hands the sizes to `view.ts`, and has the template and all styles. The reasons behind the styles are in a comment at the end of its script. |
| `src/label.ts` | A functional component which draws the lines of a label: of a header cell, a row header, a heading and an entry of the legend. |
| `src/drawer.vue` | The drawer which a link opens, with the state of which item is open. |
| `src/preview.ts` | The drawing in the interface picker of Settings, Data Model. |
| `tests/` | Vitest unit tests: of `table.ts` (`table`, `cells`, `value`, `layout`, `hostile`), of `view.ts` (`view`), of the documents (`docs`, `messages`, `schema`) and of the styles and the built bundle (`bundle`). `helpers.ts` has the builders, a generator of large tables (`accessReview`) and a table full of hostile text (`hostile`). |
| `sandbox/` | Browser tests which run against the sandbox Directus of the repository, by topic (see "Testing in a browser"). `json-table-support.ts` has what the specs share. |
| `docs/format.md` | The format reference for people who write values. Keep it in sync with behaviour. |
| `docs/schema.json` | JSON Schema of the format. `tests/schema.test.ts` checks it against the validator, and that it states the validator's limits. |
| `examples/` | Complete values. `tests/table.test.ts` pins their shape, and `tests/docs.test.ts` parses the examples written out in the README and `docs/format.md`. |

## How it works

- **Validate, then render.** `parseValue` returns `empty`, `invalid` with the first problem, or `valid` with a fresh object holding only the known fields. The template only ever sees that object. An invalid value shows one danger notice and never a partial table. `parseValue` never throws and never rejects.
- **Plain and compressed.** A table which is not compressed is checked at once and the result returned as it is. A compressed one (`encoding: "gzip"`) has to be unpacked first, so the result is then a promise. The component keeps the result in `parsed`, set from a watcher on the value; while a value is being unpacked it shows nothing (`pending`) or the table which was there before, and a counter (`reading`) drops a result which arrives after a newer value.
- **Everything a cell inherits is worked out in `table.ts`.** A `Layer` is the checked fields of a cell or part, where a missing field was left out and `null` takes away what would be inherited. Layers are laid over each other with a spread: the part's own fields, the part's `use`, the cell's fields, the cell's `use`. `toCell` then makes finished cells. A cell of several parts comes as `lines`, a list of lines which each hold the pieces that sit side by side, and then has no text, icon, colour, weight or link of its own.
- **A cell written as a string gives the very same object** for every use of the name. `buildView` maps each `Cell` to one `CellView` by identity, so 20,000 cells which are one of five share five views. What differs from place to place, the tooltip and the name of a cell, is kept by row (`tips`, `names`, `pieceTips`).
- **No component per cell.** A body cell is a plain `<td>` which holds its text, or a `<button>` when it has a link. Only a cell of several parts has an element per line (`.jt-line`) and per piece (`.jt-piece`). Header cells, row headers, headings and the legend always have them, drawn by `label.ts`: there are a few hundred of those at most. `label.ts` is a functional component without a scope of its own, so the styles reach its elements with `:deep()`. A rule in `:deep()` is not held to this component's elements, so each names a class of the package (`tests/bundle.test.ts` checks it).
- **Icons.** An icon is `data-icon` plus `content: attr(data-icon)` on the `::before`, as a ligature of the app's `Material Symbols` font (`app/src/components/v-icon/v-icon.vue:119-141`). A second `content` gives it an empty alternative text (`attr(data-icon) / ''`), so the name is not read out; a browser which does not know that form keeps the first. A cell without text is named for assistive technology by `aria-label`: its tip, placed like its tooltip, or else what each of its parts has to say, a tip of its own (placed too) or the name of its icon as words. The rule names `.jt-cell` and `.jt-piece`, never `[data-icon]` alone: under `:deep()` that also matched the icon of the app's notice, which then drew twice.
- **Headings are groups of rows.** A heading and the rows under it are one `<tbody>`, and the heading is a `<th scope="rowgroup">`; the rows before the first heading are a `<tbody>` without one. `rows` of the table element is still every row in the order drawn, which `measure()` and the pins count by (`RowView.line`, `GroupView.line`).
- **Colours from the value are inline styles** set through Vue's style binding, never CSS text. The background is the custom property `--jt-fill`, which `.jt-fill` lays over the cell's own opaque background as a `linear-gradient` of one colour, so a pinned cell stays opaque when the colour is translucent.
- **Pinned rows and columns** are `position: sticky` cells in a real `<table>` inside `.jt-scroll`. `measure()` reads the sizes the options ask for and `fitPins` takes pins from both edges in turn while they fit in two thirds (`PIN_SHARE`) of the scroll area. A column gets its offset as an inline style on each of its cells, a row as `--jt-pin` on its `<tr>`. A `ResizeObserver` repeats the measurement. Rows can only be pinned with a maximum height: without one the page scrolls, not the table. `measure()` also writes two things straight to the scroll box, which the template does not bind, since a binding would be state and every change of state draws the whole table again: `scroll-padding` as wide as the pinned rows and columns, so a link which the Tab key moves to is not left under them, and `tabindex="0"` only while there is something to scroll.
- **Two header layouts.** Across: columns of 7.5rem (`COLUMN_WIDTH` in `view.ts`, which reaches the styles as `--jt-column`). On their side: columns as narrow as their cells, labels in `writing-mode: vertical-rl` turned by `rotate(180deg)`, cut at 9rem. `auto` picks the second when the columns do not fit the field's width, which `measure()` works out; before the first measurement more than `ROTATE_ABOVE` (3) columns after the first counts as not fitting. The first column is equally wide in both layouts, so switching cannot loop.
- **Links** become the `collection` and `primary-key` props of the app's own `drawer-item` (`app/src/components/register.ts:158`), always with `disabled` and `non-editable`. A link is offered only when the collection exists in the collections store and the user has read permission on it. The legend draws its entries without links (`plain`). Which item is open is the state of `drawer.vue` and not of the table: in the table's own render, opening a drawer drew the largest table again and froze the page for a third of a second (about 0.08s now).
- **Options.** The defaults and limits are constants of `view.ts`. `index.ts` shows them in the form, and the component reads the options through `view.ts`, because an option which was never saved arrives empty. The two options for rows are hidden by a condition on the form's own `maxHeight`; the component reads them whether or not the form shows them.
- **Names.** The scroll box is a region called by the name of its field (`fieldData.name`), and the legend a list called "Legend". In a batch edit (`batchMode`) the field shows a line of text and no table.
- **Stretching.** A table narrower than its box fills it (`min-inline-size: 100%`), and the browser shares the extra width between the columns by the width of their content. A header cell with a width of 1% keeps its column as wide as its content: the first column (`.jt-first`) and the columns the options ask to pin (`.jt-snug`, from `snugColumns`), unless that would be every column. This follows the options and not the measured pins, since it changes the widths which `measure()` reads.
- **Width.** `.json-table` is a size container (`container: json-table / inline-size`), which gives it no intrinsic width, so a wide table can never widen the form.

## Invariants: do not break

1. **The format is public API.** `version: 1` values written by other programs must keep drawing the same. Change the format by adding optional fields; anything else needs a new `version` and a parser which still reads version 1. The option keys (`columnLabels`, `maxHeight`, `stickyLeft`, `stickyRight`, `stickyTop`, `stickyBottom`, `placeholder`) keep their names and meanings.
2. **Read-only, always.** The component never emits `input`, and `inheritAttrs: false` keeps the listener the form attaches off every element. Emitting would mark the item as changed and try to save a field nobody edited. `disabled` and `nonEditable` are accepted and ignored.
3. **The interface works nothing out.** No counting, sorting, grouping or knowledge of what a table means. If a table needs totals, the writer adds the cells. The one thing the interface puts together is the tooltip of a body cell (column header, row header, tip), which is layout.
4. **The value is untrusted.**
   - Text only reaches the page through `v-text`, `{{ }}` and attribute bindings, and in `label.ts` as the string children and the attributes of `h`. No `v-html`, `innerHTML`, `eval`, dynamic `import` or `<component :is>` driven by the value.
   - Colours are the only part of the value which reaches CSS. They must match `HEX_COLOR` or `THEME_COLOR` in `table.ts`; do not loosen either without thinking about `url()`, a second declaration and `var()` fallbacks. The colour tests list what must stay rejected.
   - `shared` is read into a `Map`, so a name such as `constructor` is only ever a name.
   - Control characters and the line and paragraph separators become spaces, and the bidirectional controls and marks are removed; text which shares a line sits in `<bdi>`, in the legend as well.
   - No `href`, route or URL is ever taken from the value. `linkTarget` refuses the ids `+`, `.` and `..`.
   - Unpacking stops at `MAX_UNPACKED_BYTES`.
5. **Nothing is left out without a word.** A table over a limit (`MAX_COLUMNS`, `MAX_ROWS`, `MAX_PARTS`, `MAX_TABLE_PARTS`, `MAX_LEGEND`, `MAX_SHARED_DEPTH`) is rejected, never cut. Only text is cut, and it then ends in three dots. Everything the value can make the page draw has a limit: a new list in the format needs one, in the validator, in `docs/schema.json` and in the limits table of `docs/format.md`.
6. **`table.ts` and `view.ts` stay free of Vue, the DOM library and Node-only APIs.** They run in the browser and in the tests. `tsconfig.test.json` type-checks them without the DOM library, so they may only use globals which both have (`DecompressionStream`, `Blob`, `TextDecoder`, `atob`).
7. **Bundle hygiene.**
   - The root `AGENTS.md` has the rules. Here nothing but the extension's own code is bundled: there are no dependencies to bundle, and none should be added.
   - The `<style>` block has no comments: the build keeps them, and they were 13% of the bundle. What the rules rely on is written in a comment at the end of the script of `interface.vue`, in the order of the rules. `tests/bundle.test.ts` checks the block and the built bundle for comments.
   - `dist/index.js` is 31,200 bytes, 10,515 gzipped (1.0.3: 32,187 and 10,899). Report size changes.
8. **It is an app-only extension,** so the Marketplace can install it under the default `MARKETPLACE_TRUST`. Don't add API entries casually.
9. **Directus look.** Use only `--theme--*` tokens for the table's own colours, so light, dark and custom themes work, and Directus global components (`v-notice`, `drawer-item`). The colours of the system stand in under forced colours, and only there. `tests/bundle.test.ts` checks both. Styles are scoped; class names start with `jt-`.

## Code style

The root `AGENTS.md` has the style of the repository. In this package also:

- Invisible and bidirectional characters in source are written as `\u` escapes, never as the characters themselves.
- Add a line to the message tables of `docs/format.md` with every new message, and a value which produces it to `tests/messages.test.ts`, which holds the tables and the validator against each other.
- What needs no Vue and no DOM goes into `view.ts`, with unit tests. What is left in `interface.vue`, `label.ts` and `drawer.vue` has to be checked in a browser.
- No comment in a `<style>` block (invariant 7).

## Demo

`demo/demo.mjs` describes the demo in the sandbox (see `sandbox/README.md`, "Demos"): the singleton `demo_json_table`, whose fields each hold a table, in groups (recipes, every kind of cell, column labels, pins, values and states), and `demo_json_table_products`, under it in the navigation, which the links open. The options only lay a table out, so most fields differ in their value; a new or changed option gets a field, and a new field of the format a row in the gallery of cells. `sandbox/demo.spec.ts` builds it and checks that each field draws a table, its placeholder or, for the one broken on purpose, the notice.

## Testing in a browser

The specs in `sandbox/` run in the sandbox Directus, in Chromium: 31 tests in about 1.2 minutes (`npm run sandbox:test -- packages/json-table/` from the root). Each makes the collections it needs and drops them again, and each can run alone.

| Spec | What it holds the interface to |
|---|---|
| `json-table.spec.ts` | The built bundle loads and draws the examples, a compressed value, the placeholder and the notice, whose own icon the styles of the table leave alone. `hostile()` is drawn as text: no element of its own, no dialog, no request. A batch edit says that no table is shown. In the dark theme the cells are painted from the dark tokens. Print keeps the backgrounds, and forced colours mark a filled cell and the pinned edges with lines. |
| `json-table-cells.spec.ts` | The tooltips of `docs/format.md`. The legend: an entry as in the table, a background alone as a swatch, `<bdi>`, no link. Headings as groups of rows, and what the accessibility tree says of them, of icons and of the region. |
| `json-table-layout.spec.ts` | Pins at all four edges while the table scrolls, none without a maximum height, none when set to 0, the cut at two thirds. The three Column Labels settings. Stretching with snug columns. The tab stop. The options form with its two hidden options. |
| `json-table-links.spec.ts` | Which cells are links, and for whom: a collection which does not exist and one the user may not read are text. The drawer cannot be edited. The item is never marked as changed, and leaving it asks nothing. A link under a pinned row or column is scrolled clear of it by the Tab key. |
| `demo.spec.ts` | The demo builds, and every field draws its table, its placeholder or its notice. |

The specs compare positions with each other and with the box, never with a number of pixels, and use no text width, a fixed wait, the pointer lock or a real scrollbar, so nothing in them leans on the fonts or the browser of one system. They were run on macOS only. Each test which is new in 1.0.4 was seen to fail once with its behaviour broken in the source.

Not automated, and to check by hand when a change calls for it:

- **Firefox and WebKit.** For 1.0.4 the two examples, a table with pins at all four edges across groups of rows, the legend with swatches, the icons and the notice of an invalid value were looked at in both, with Playwright's builds, and drew as in Chromium with no error. Version 1.0.0 was verified in Chrome, Firefox and WebKit with 97 scripted checks each, which are not part of the repository.
- **Large tables:** the generated tables of `tests/helpers.ts` up to 200 by 1,000 (compressed), for the time they take.
- **Window widths** from 375px to 1920px, and the field widths half, full and fill.
- **A newer value which arrives while an older one is being unpacked** (the counter `reading`).
- **Screen readers.** Only the accessibility tree of Chromium was read. What VoiceOver or NVDA say of a heading, an icon cell and the region was not tried.
- **Print and forced colours** beyond what Chromium emulates: the tests check the computed styles, and a look at a screenshot under emulated forced colours; no page was printed and no Windows contrast theme was used.

Things which are easy to trip over:

- **The API drops a `__proto__` key** when a value is saved, and the form hands interfaces a function for `hasOwnProperty`, so those two cannot be names in `shared` (`tests/cells.test.ts`).
- **Firefox resolves automatic margins to nothing** for a block whose writing mode differs from its parent's, so the label on its side is an inline block which its cell centres like text.
- **WebKit reports the app's own cancelled requests as errors** when a page is left quickly ("due to access control checks", "AxiosError: Network Error"). They also appear on pages without this interface.
- **A save mounts the interface anew.** Measured: after a save the table element which was there gets no change at all, and a new one is drawn. Nothing measured for the old value is at hand for the new one.
- **A rule of a condition sees the default of an option which was never stored** (`app/src/utils/get-default-values-from-fields.ts:9`), and `null` once its input was emptied. The condition of the two options for rows is written for both (`src/index.ts`).
- **The form hands the interface `batchMode`, `field` and `fieldData`** beside the value and the options (`app/src/components/v-form/components/form-field-interface.vue:62-77`).

Measured in headless Chrome on Apple silicon with the default options and the generated tables of `tests/helpers.ts`, from the arrival of the item to the first frame with the table:

| Table | Cells | Value | Drawn after | Scrolling |
|---|---|---|---|---|
| 102 by 211, `accessReview(2, 100, 200)` | 20,600 | 190 KB | about 0.4s | Smooth. Down the page about 1 frame in 13 long |
| 200 by 45, `accessReview(3, 198, 40, 4)` | 8,400 | 99 KB | about 0.2s | Smooth |
| 8 by 1,000, `accessReview(4, 6, 989)` | 7,900 | 163 KB | about 0.2s | Smooth |
| 200 by 1,000, `accessReview(5, 198, 989, 10, true)` | 198,000 | 85 KB compressed (918 KB) | about 3.6s, page frozen | Stutters: frames of up to 0.5s |

The first draw was measured again for 1.0.4, as the long tasks from navigation in Chromium, and is what it was: about 0.7s for the first table and 4.0 to 4.3s for the last, before and after. Opening a link's drawer over the last table blocks the page for about 0.08s (0.33s in 1.0.3), and over the first for about 0.02s (0.05s). From navigation, the last one takes about 4s in Chrome and Firefox and about 6s in WebKit. Unpacking is not what takes the time: the browser unpacks and parses the 918 KB in about 5 milliseconds, and the rest is drawing. With the 102 table columns of the first table in a field 709px wide, whose first column is 252px, labels across give columns of 120px (3 in view, header 38px tall) and labels on their side columns of 47px (9 in view, header 162px tall).

## Known gaps

- No virtual scrolling: every cell is an element, so the cost grows with the number of cells. Drawing only the rows in view would need fixed column widths (a table sizes a column by its widest cell) and row heights which are known without drawing.
- The fixed texts are English only, the messages of the validator among them.
- No display: in layouts the field shows as raw JSON. Text never wraps.
- With more than one pin per edge the table is drawn with the outermost pins, measured, and drawn again with all of them. The second draw only patches classes and offsets. It cannot start from an earlier measurement, since a save mounts the component anew.
- Closing a link's drawer over the largest table takes about 1.5s (2.1s in 1.0.3). Where that time goes was not looked into.
- Only Material Symbols icons are drawn; the custom and social icons of `v-icon` are not.
- A value cannot say which rows or columns to pin; that is a field option, so it is the same for every item.
- Built and tested against Directus 11.17.4 only. The `host` range `^11.15.0` is the one every package of the repository declares; no other version in it was tried, and Directus 12 not at all. The drawer (`drawer-item`), the stores, the props the form hands over and the icon font are internals which a Directus upgrade can change: re-check the citations in the code.
- Not tested: Safari itself (only Playwright's WebKit), touch devices, screen readers. A right-to-left interface language was tried by hand for 1.0.3 (the first column pins to the right) and has no test.
