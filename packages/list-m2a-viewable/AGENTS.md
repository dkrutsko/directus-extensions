# directus-extension-list-m2a-viewable

A Directus 11 interface extension, published on npm as `directus-extension-list-m2a-viewable`. It is a drop-in replacement for the built-in **Builder (M2A)** interface (`list-m2a`) that keeps list items clickable when the field is read-only, so anyone who can see the field can open each referenced item in the side drawer, in view-only mode.

The rules which hold for every extension of this repository (independence, bundle hygiene, code style, releasing, the sandbox) are in the root `AGENTS.md`. This file only holds what is specific to this package; `CLAUDE.md` imports it. What a user sees is in `README.md`.

## Why it exists

Since Directus 11.15.0, the stock component disables a row of its list while `disabled` is set and `nonEditable` is not (`app/src/interfaces/list-m2a/list-m2a.vue:388,422` in 11.17.4). In 11.14.1 the rows had no such binding and always opened the drawer.

- `disabled` is set for every field the user cannot change here and now: the **Readonly** toggle, a missing update permission, a batch edit before the field's checkbox is ticked, a field another user holds in collaborative editing, and every field while the form loads (`app/src/components/v-form/v-form.vue:225-235`, `app/src/components/v-form/components/form-field.vue:67-73`).
- `nonEditable` is set only where the app marks the form as view-only (`form-field.vue:75-79`):
  - a field which the user's update permission leaves out (`app/src/composables/use-permissions/item/lib/get-fields.ts:66-75`; tried by the review of 1.0.3);
  - an item which the user's update rule does not cover, and a singleton the user may not update (`get-fields.ts:42-64`; read, not tried);
  - the comparison of revisions and versions (`app/src/views/private/components/comparison/comparison-modal.vue:296,339`);
  - a share (`app/src/routes/shared/components/share-item.vue:25`);
  - a form inside a view-only drawer (`app/src/views/private/components/overlay-item-content.vue:152,168`).

So in 11.17.4 a read-only M2A field is inert on the item page for an administrator, for a user who may update the collection, and also for a user with no update permission on the collection at all: that user's permission arrives as the access `"none"`, where `get-fields.ts:58` tests for `false`, so no field is marked non-editable. The browser tests cover the first and the last of the three. Directus 12 tests for `"none"` as well (see [Known gaps](#known-gaps)).

Upstream issue: directus/directus#26689. It was closed on 2026-02-23 by PR #26711, which changed `list-m2m`, `list-o2m` and `select-dropdown-m2o` and left `list-m2a` as it was; its rows are bound the same way in 12.7.0.

## Layout

| Path | What |
|---|---|
| `src/index.ts` | `defineInterface`: the manifest and the options. |
| `src/interface.vue` | The wrapper. Its header comment has the reasoning, with the citations. |
| `src/page-size.ts` | What needs no Vue, DOM or Directus: `toPageSize`, `pageSize` (which `limit` the stock component gets), and `itemOf`, `mountOf` and `keyOf` (which mode and which item a stock component is mounted for). |
| `src/preview.ts` | The SVG in the interface picker of Data Model. Our own drawing; the stock interface has one too (`app/src/interfaces/list-m2a/index.ts:86`). |
| `tests/page-size.test.ts` | Vitest, 25 tests of `src/page-size.ts`. |
| `sandbox/list-m2a-viewable.spec.ts` | The browser tests, 8 of them. |
| `docs/images/drawer-light.png` | The picture of the README: see [Testing in a browser](#testing-in-a-browser). |

## How it works

- The wrapper renders the stock component by its global name, `interface-list-m2a` (`app/src/interfaces/index.ts:16`), with `inheritAttrs: false`. Every attribute it does not declare goes on unchanged.
- It sets `nonEditable` whenever the field is `disabled`. The stock component then hides its create and select buttons, its drag handles, its remove buttons and its pagination (`list-m2a.vue:394,406,431,446-506`), and hands both flags to the drawer (`520-521`), which then cannot save.
- Since the pagination is hidden, the wrapper passes the option **Items Shown When Read-only** (`viewLimit`, default `-1` = all) as the page size while view-only, instead of `limit`.
- **What a stock component is mounted for** is a mode, view-only or editing, and an item, the primary key and the key of the content version (`Mount` and `itemOf` in `src/page-size.ts`). While the form loads, both are the ones last seen when it was not loading (`mountOf`). Until the first load is over there are none, and the wrapper draws a placeholder as high as the skeleton which the form lays over it. The stock component is keyed by both (`keyOf`), so each mode and each item gets one of its own.
- `primaryKey` and `version` are declared as props, because the key is made of them and an attribute does not start a watcher when it changes. The wrapper passes both on.
- **The options mirror the stock ones on purpose.** `src/index.ts` has the manifest and the options of `app/src/interfaces/list-m2a/index.ts:5-85` (`types: ['alias']`, `localTypes: ['m2a']`, `relational: true`, group `relational`): the same keys, defaults and `$t:` names, plus `viewLimit`. Rule 2 of the root `AGENTS.md` says nothing is copied from the app, and this is the one exception, because nothing else works: the stock component reads the options by these keys, and a field must be able to change between the two interfaces with its stored options untouched (rule 6). Do not take it for a slip, and do not extend it: nothing else of the app is repeated here, and the README and the code describe the stock template instead of quoting it.
- If nothing is registered as `interface-list-m2a`, the wrapper draws a `v-notice` which says so, instead of an empty element.
- The interface id `list-m2a-viewable` is stored in users' schemas: never rename it.

## Invariants: do not break

1. **Stay a thin wrapper.** Never copy code from the stock component (the Directus app is BUSL-1.1), and don't change its behaviour beyond the documented differences. Stored data and options must stay identical to the stock interface, so switching a field back to Builder (M2A) is always safe.
2. **The stock component reads `limit` once, at setup, and must never keep the page size of another mode, nor the page of another item.** It seeds a page size of its own from the prop (`list-m2a.vue:107-113`), divides the number of items by it (`114`) and hands that to its pagination, which makes an array that long (`app/src/components/v-pagination.vue:46`). With the view-only `-1` on a field which can be edited, that is "RangeError: Invalid array length", the bug which 1.0.2 fixed. And it never puts its page back to 1 (`115`). Four things belong together:
   - **The stock component is keyed by the mode,** so a change of mode (a batch edit, another user's lock) mounts a new one with the page size of the new mode. This alone keeps the error away; a browser test fails without it.
   - **Nothing is mounted until the form has loaded once.** The form disables every field while it loads, so a stock component mounted then would be a view-only one which is thrown away a moment later. Only the unit tests of `mountOf` pin this.
   - **A load by itself unmounts nothing.** The mode and the item hold while the form loads again, as it does after a save which stays on the item (`app/src/modules/content/routes/item.vue:494-506`, `app/src/composables/use-item/index.ts:514-526`). 1.0.3 mounted a new stock component after every load, which put the list back on its first page and forgot the page size chosen under it. A browser test fails without this.
   - **The stock component is keyed by the item as well,** so another item or another content version in the same form gets a new one. The form also loads when the app moves from one item to another without leaving the item page, and when the content version changes (`use-item/index.ts:104`, with the version in the query of `81-86`). A stock component kept through that asks for its old page of the new list: from page 2 of a long list to a short one it shows "No items" and hides the pagination which would lead back (`list-m2a.vue:493`), and the stock interface does just that. The item is the one seen when the form was not loading, because the item page hands out the primary key `+` during every load (`item.vue:272-273`); a key which followed that would mount a new list after every save. The version counts by its key and not by its id, which a version only gets with its first save (`app/src/composables/use-versions.ts:217-228`). A browser test fails without the item in the key, and the test of the save fails when the key follows the primary key during a load.
3. **Page sizes are read by `toPageSize`.** Option values are stored JSON and can be null, text, zero, negative or a fraction. Only a whole number from 1 up counts, as a number or as its text (read by `Number()`, not `parseInt`). Editing falls back to 15 and never to "all"; view-only falls back to `-1`. The props of the two options are typed `unknown` and have no defaults.
4. **Keep options in sync with the stock interface of the host version.** When moving to a new Directus version, compare `src/index.ts` with `app/src/interfaces/list-m2a/index.ts`, and check every `path:line` in `src/` and in this file.
5. **Bundle hygiene.** The root `AGENTS.md` has the rules. Nothing but the wrapper is bundled: `dist/index.js` is 4,570 bytes (1,737 gzipped), of which the preview is 1,469. The placeholder has an inline style and the component no `<style>` block: one rule in a block costs about 920 bytes for the code which injects it.
6. **It is an app-only extension,** so the Marketplace can install it under the default `MARKETPLACE_TRUST`. Don't add API entries casually.

## Commands

Run these in this folder, after `npm install` in the repository root:

```bash
npm run dev        # watch build, unminified
npm run check      # vue-tsc, plus tsc over the tests (tsconfig.test.json)
npm test           # vitest
npm run build      # dist/index.js
npm run validate   # directus-extension validate
```

`prepublishOnly` runs check, test, build and validate.

## Testing in a browser

`sandbox/list-m2a-viewable.spec.ts` runs against the sandbox Directus of the repository (root `AGENTS.md`, `sandbox/README.md`). It makes three collections, `sandbox_list_m2a_viewable_pages`, `..._notes` and `..._pages_blocks`, with one M2A field, and a user who may only read them (`sandbox-list-m2a-viewable-reader`); all are removed and made again at the start of a run. Each test sets the field up as it needs it (`setField`) before it opens a page, since the app reads the fields once, when it starts. The titles of the tests are the list of what is covered:

- a read-only field as an administrator: the rows, no controls, a drawer with a disabled input and a disabled save button;
- the regression of 1.0.2: a field which can be edited, with more items than Per Page, shows 15 rows and its pagination, and nothing is logged;
- a user who may not update the collection opens an item, view-only;
- a read-only field lists all 20 items by default, and 5 with `viewLimit: 5`;
- a batch edit: ticking the field's checkbox brings Create New and Add Existing, and no pagination with a page size of -1;
- a save which stays on the item keeps the page of the list, and the page size chosen under it;
- another item in the same form starts on the first page: from page 2 of the long page the app's router (`$router` of `__vue_app__`) moves to the short page, which lists its 2 items, and the browser's Back then shows the first page of the long one;
- the notice when nothing is registered as `interface-list-m2a`. The test removes the stock component from the app's registry in the page (`__vue_app__` on `#app`) and then opens an item from the table, without loading the page again.

```bash
npm run sandbox:test -- packages/list-m2a-viewable/   # from the repository root
```

Build first: the sandbox loads `dist`. In a checkout whose folder is itself named `list-m2a-viewable`, the shorter `-- list-m2a-viewable/` matches every package, since it is a part of every path.

Things which are easy to trip over:

- **A drawer has a `main` of its own.** `main .v-form` also finds the form of an open drawer; the field under test is found by `data-field="blocks"`.
- **The rows are buttons,** so `getByRole('button')` inside the field counts them too.
- **A click on a row of the collection's table mounts a new item page,** so it cannot show what a form does when it is given another item. The app's router does, when it moves from one item to another (`moveTo` in the spec).
- **After a save the list is asked for again,** by the stock component itself. `saveAndStay` waits for the item to be loaded again, which is after the form was told that it is loading; what the list shows after that is what stayed.
- **In a batch edit the list is empty** ("No items"): the form has no item.

**The picture** `docs/images/drawer-light.png` was taken in the sandbox by a script which is not kept. To take it again: four collections with the translated names Articles, Paragraphs (`text`), Quotes (`quote`, `source`) and Article Blocks (the junction, hidden), an article "Tide pools at low water" with a read-only `blocks` field which holds a paragraph, a quote and a paragraph. A window of 1560 by 720 at a device scale factor of 2, light, reduced motion. Open the article, click the quote, wait until the drawer stands still, and cut the picture from the left edge of the main content to the right edge of the window, 420 high from the top. Remove the collections afterwards.

## Known gaps

Not tested, or accepted as it is. "Not tried" is the record of earlier work, kept here so nobody takes it for covered.

**Platforms**

- Only Directus 11.17.4. The browser tests run in Chromium only; Firefox, WebKit and touch were not tried.
- No screen reader. The accessibility tree was read: a row of a read-only field is a button named by its collection and its item, takes the focus, and opens the drawer with Enter. Nothing tells assistive technology that the field is read-only.

**Directus 12**

Not tried: only the source of 12.7.0 was read. The host range `^11.15.0` excludes it, and whether the Marketplace of a Directus 12 refuses such an extension was not checked.

- What the wrapper relies on is still there in 12.7.0: the global name, the props `disabled`, `nonEditable` and `limit`, the binding of the rows, the page size read once, the controls and the pagination behind `nonEditable`, the drawer bound to both flags, the form which disables its fields while loading, and the same options.
- A move would need: the host range (rule 4 of the root `AGENTS.md`, for the whole repository), every `path:line` in `src/` and in this file (the rows are at `list-m2a.vue:390,424` there, the page size at `107`, the controls at `448`), and the README's account of who is affected. Directus 12 marks the fields of a user without update permission as non-editable (`get-fields.ts:58` there also takes the access `"none"`), so for that user the stock rows are clickable already, and the extension is for administrators and for users who may update the collection but face a read-only field.
- New in 12: rows of "inactive collections" are not clickable. By reading, the wrapper does not get in the way of that.

**Not tried**

- **Content versions in a test.** Tried by hand with a version of the long page: changing to the version and back starts the list on its first page each time, and a save inside the version keeps page 2. No test covers it.
- **Collaborative editing.** The key changes when another user takes or leaves the field (`form-field.vue:67-73`), which mounts a new stock component. Suspected: a view-only drawer which is open at that moment closes, and the list is loaded again. It needs websockets and two browsers; the sandbox runs without websockets.
- A share, the live preview and the visual editor, an M2A field inside a drawer or inside the translations interface, and a new item (`+`) whose read-only M2A field has a default value.
- The comparison of revisions was tried by the review of 1.0.3 (both sides list all items, nothing logged); no test covers it.
- A Directus which really has no Builder (M2A): the notice is tested by removing the component from the app in the page.

**Accepted**

- **A read-only field does not look read-only.** The stock component draws disabled rows with a subdued background and grey collection names (`list-m2a.vue:550-560`); rows which can be clicked are not disabled, so they look like those of a field which can be edited. Changing that would mean styling the inside of the stock component. The README says so.
- **`viewLimit` as a number hides the items after it,** with no pagination and no count.
- **`QUERY_LIMIT_MAX`.** Tried by hand with a maximum of 10 and 20 items: the default lists 10 with nothing which says that there are more (the API makes the maximum of `-1`, `api/src/utils/sanitize-query.ts:38`), `viewLimit: 50` lists 10 as well (the app cuts the page size down, `app/src/composables/use-page-size.ts:27`), and nothing is logged. No test: the configuration of the sandbox is fixed.
- **Every change of mode or of item loads the list again,** and "all" loads every item in one request.
- **A new item which is saved starts its list on the first page.** Its primary key changes from `+` to the real one, which is another item to the key. By reading, the stock interface keeps the page there, and only a new item with more staged items than a page shows the difference. Not tried.
- **Renaming a content version starts the list on its first page,** since the key of the version is part of the key. By reading; not tried.
- The name and the note of `viewLimit`, the description of the interface and the notice are English only.
- No demo in the sandbox: see the root `AGENTS.md`.

## Release history

1.0.0 was published by hand on 2026-09-03; 1.0.1, a test of the Publish workflow, on 2026-09-04; and 1.0.2, the RangeError fix, on 2026-09-10. All three came from the extension's first repository, `dkrutsko/directus-extension-list-m2a-viewable`.
