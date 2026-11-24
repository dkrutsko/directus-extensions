# directus-extension-list-m2a-viewable

A Directus 11 interface extension, published on npm as `directus-extension-list-m2a-viewable`. It is a drop-in replacement for the built-in **Builder (M2A)** interface (`list-m2a`) that keeps list items clickable when the field is read-only, so anyone who can see the field can open each referenced item in the side drawer, in view-only mode.

This file is the shared instruction file for coding agents (Codex, Cursor, Claude Code and others); `CLAUDE.md` imports it. If the workspace notes one level up (`../CLAUDE.md`) are present, they describe the surrounding folders and the Galactus instance this extension was built for.

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
   - `dist/index.js` imports only `vue` and `@directus/extensions-sdk`.
   - `@directus/extensions-sdk` is pinned to exactly `17.1.4`, because its Vue compiler must match the host's Vue (3.5.24 in 11.17.4).
   - Keep `overrides.esbuild`: without it the SDK's two esbuild versions break the build on npm installs.
   - `host` is `^11.15.0`, the first release with the `nonEditable` prop this relies on.
   - Directus loads all app extensions as one bundle, and one broken bundle disables every custom app extension on the instance.
6. **It is an app-only extension,** so the Marketplace can install it under the default `MARKETPLACE_TRUST`. Don't add API entries casually.

## Commands

```bash
npm install
npm run dev        # watch build, unminified
npm run check      # vue-tsc
npm run build      # dist/index.js
npm run validate   # directus-extension validate
```

`prepublishOnly` runs check, build and validate. There are no unit tests. Verify changes in a real Directus 11.17.4 in a browser, and cover at least:
- a read-only M2A field as an admin;
- a non-admin without update permission;
- an editable field;
- the item page while it loads, with no RangeError;
- batch mode;
- the drawer opening read-only.

Never run `npm audit fix --force`: it moves the SDK pin.

## Code style

- TypeScript, tabs (4 wide) and single quotes. `package.json` and YAML use 2 spaces (see `.editorconfig`).
- Comments explain *why*. When relying on Directus internals, cite them as `path:line` in the Directus 11.17.4 source.
- Markdown paragraphs are unwrapped, one line each (README, CHANGELOG).

## Workflow rules

- **Ask before you bump the version, commit, push, tag or publish.** Only do them when explicitly asked.
- **Releasing, only when asked:**
  1. Run `npm version X.Y.Z --no-git-tag-version`.
  2. Add a `## X.Y.Z` section at the top of `CHANGELOG.md`.
  3. Commit and push to `main`.
  4. The maintainer then runs **Actions → Publish** with `X.Y.Z`. That workflow uses npm trusted publishing with provenance, then creates the `vX.Y.Z` tag and the GitHub Release from that CHANGELOG section.
  **Actions → Build** packs the tarball for inspection without publishing. Both workflows stay `workflow_dispatch`-only; there is no automatic CI.
- **Release history:** 1.0.0 was published by hand on 2026-09-03; 1.0.1, a test of the Publish workflow, on 2026-09-04; and 1.0.2, the RangeError fix, on 2026-09-10.

## Known issues

- **A latent bug in the Publish workflow's release-notes step** (`sed -n "/^## X$/,/^## /p" CHANGELOG.md | sed '1d;$d'`). It drops the last line of a section when that section is the last one in the file. New releases are added at the top, so it only bites when releasing the oldest or only section. The sister repo `directus-extension-node-graph` uses the fixed form, `sed -n "/^## X$/,/^## /{/^## /!p;}"`.
