# directus-extension-list-m2a-viewable

A Directus 11 interface extension, published on npm as `directus-extension-list-m2a-viewable`. It is a drop-in replacement for the built-in **Builder (M2A)** interface (`list-m2a`) that keeps list items clickable when the field is read-only, so anyone who can see the field can open each referenced item in the side drawer, in view-only mode.

The rules which hold for every extension of this repository (independence, bundle hygiene, code style, releasing, the sandbox) are in the root `AGENTS.md`. This file only holds what is specific to this package; `CLAUDE.md` imports it.

## Why it exists

Since Directus 11.15, the stock component renders each row as `<VListItem :disabled="disabled && !nonEditable" ...>` (`app/src/interfaces/list-m2a/list-m2a.vue:388,422` in 11.17.4).
- `disabled` is true for a read-only field.
- `nonEditable` is only ever true for non-admins who lack update permission.

So a read-only field is inert for admins, and for anyone else who has update permission. Upstream issue: directus/directus#26689.

## How it works

Everything is in `src/index.ts` (the `defineInterface`) and `src/interface.vue` (the wrapper).

- The wrapper renders the stock component by its global name, `interface-list-m2a`, with `inheritAttrs: false`. It forwards every attribute it doesn't declare unchanged.
- It forces `nonEditable` on whenever the field is `disabled`. The stock component then hides its create, select, drag and remove controls and opens the drawer read-only.
- The stock component hides its pagination when `nonEditable`. So in view-only mode the wrapper passes the extra option **Items Shown When Read-only** (`viewLimit`, default `-1` = all) as the page size, instead of `limit`.
- `src/index.ts` mirrors the stock options one-to-one: the same field names and the same `$t:` keys, plus `viewLimit`. The manifest matches the stock one (`types: ['alias']`, `localTypes: ['m2a']`, `relational: true`, group `relational`).
- The interface id `list-m2a-viewable` is stored in users' schemas: never rename it.

## Invariants: do not break

1. **Stay a thin wrapper.** Never copy code from the stock component (the Directus app is BUSL-1.1), and don't change its behaviour beyond the documented differences. Stored data and options must stay identical to the stock interface, so switching a field back to Builder (M2A) is always safe.
2. **Props that the stock component reads only once, at setup, must stay stable for the wrapper's lifetime, or trigger a remount.** The stock component seeds an internal page size from `limit` once (`limitWritable` at `list-m2a.vue:113`) and derives a page count for `VPagination` from it. Version 1.0.2 fixed a "RangeError: Invalid array length" caused by this, and both parts of the fix must stay:
   - **Nothing is mounted while the form is `loading`,** only a placeholder that keeps the skeleton's height. v-form's `isDisabled()` includes `loading` (`app/src/components/v-form/v-form.vue:225-229`), so mounting during load would seed the view-only page size.
   - **The stock component is keyed on the view-only flag,** so a flip (batch mode, a collaborator's lock, …) remounts it with a fresh page size.
3. **Validate page sizes** (`toPageSize`). Option values come from stored JSON and can be null, strings, zero or negative. Edit mode falls back to 15, view-only mode to `-1`.
4. **Keep options in sync with the stock interface of the host version.** When moving to a new Directus version, compare `src/index.ts` with `app/src/interfaces/list-m2a/index.ts` and re-check the `:disabled` row binding above.
5. **Bundle hygiene.**
   - The root `AGENTS.md` has the rules. Here nothing but the wrapper is bundled, so `dist/index.js` stays at about 3 KB.
   - The extension cannot work below Directus 11.15.0, the first release with the `nonEditable` prop it relies on. That is also where the host range of the repository starts.
6. **It is an app-only extension,** so the Marketplace can install it under the default `MARKETPLACE_TRUST`. Don't add API entries casually.

## Commands

Run these in this folder, after `npm install` in the repository root:

```bash
npm run dev        # watch build, unminified
npm run check      # vue-tsc
npm run build      # dist/index.js
npm run validate   # directus-extension validate
```

`prepublishOnly` runs check, build and validate. There are no unit tests. `sandbox/list-m2a-viewable.spec.ts` checks in the sandbox Directus that the rows of a read-only field can be clicked as an admin and open a view-only drawer; with the stock interface on the same field that test fails. Verify changes in the sandbox in a browser, and cover at least:
- a read-only M2A field as an admin;
- a non-admin without update permission;
- an editable field;
- the item page while it loads, with no RangeError;
- batch mode;
- the drawer opening read-only.

## Release history

1.0.0 was published by hand on 2026-09-03; 1.0.1, a test of the Publish workflow, on 2026-09-04; and 1.0.2, the RangeError fix, on 2026-09-10. All three came from the extension's first repository, `dkrutsko/directus-extension-list-m2a-viewable`.
