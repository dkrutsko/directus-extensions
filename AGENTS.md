# directus-extensions

A monorepo of Directus 11 extensions. Each folder of `packages/` is one extension, published on npm as `directus-extension-<folder>`, with its own version, changelog, README and `AGENTS.md`.

This file is the shared instruction file for coding agents (Codex, Cursor, Claude Code and others); `CLAUDE.md` imports it. It holds the rules for every extension. `packages/<name>/AGENTS.md` holds what is specific to one: read both before changing a package.

## Layout

| Path | What |
|---|---|
| `packages/<name>/` | One extension: `src`, `tests` (vitest unit tests, where it has any), `sandbox` (browser tests), `demo` (the definition of its demo, where it has one), `docs`, `examples`, and its own `README.md`, `CHANGELOG.md`, `LICENSE`, `AGENTS.md`. |
| `template/` | The starting point of a new extension, with `__NAME__`, `__SNAKE__`, `__TITLE__` and `__DESCRIPTION__` where `npm run new` fills in the name. Not a workspace and never built as it is. |
| `sandbox/` | A local Directus 11.17.4 (SQLite) which loads every package, the machinery which builds the demos (`sandbox/demo`), the Playwright setup and the fixtures of the browser tests. Its own `package.json` and lockfile; not a workspace. `sandbox/README.md` explains it. |
| `scripts/sync.mjs` | Writes the lists of packages (the table in `README.md`, the dropdowns of both workflows) and checks the rules below which a script can check, and that both lockfiles are complete. |
| `scripts/new.mjs` | Copies `template/` to `packages/<name>` and runs the sync. |
| `.github/workflows/` | **Build** and **Publish**, both started by hand with the package as an input. |
| `package.json` | The workspaces, the scripts which run across them, and `overrides`. |

## Commands

```bash
npm install                  # every package, one lockfile
npm run check                # type checks, every package
npm test                     # unit tests, every package which has them
npm run build
npm run validate             # directus-extension validate
npm run sync                 # rewrite the package lists, check the rules
npm run new -- <name> "..."  # a new extension from template/

npm run sandbox:install      # once, with Node 22
npm run sandbox              # Directus at http://127.0.0.1:8155, with the demos
npm run demo                 # puts the demos back; add `-- <name>` for one package
npm run sandbox:test         # browser tests; add `-- <name>/` for one package
```

Add `-w packages/<name>` to a script to run it for one package, or run it in the package's folder. Never run `npm audit fix --force`: it moves the SDK pin (rule 4).

## Rules for every extension

1. **Each extension relies on its own code only.** No import from another package, no shared internal package, no dependency on another package of this repository (`npm run sync` checks the last). When two extensions need the same helper, each has its own copy. The support code in `sandbox/` is test tooling, not extension code, and specs may import it.
2. **Re-implementations are clean-room.** When an extension does what someone else's extension or a stock Directus component does, it is written from the behaviour: what a user sees and what the public documentation says. Do not copy their code, structure, names or tests, and do not work from their source while writing ours. Tests are written independently, from the behaviour we want. The Directus app is BUSL-1.1: never copy from it; a thin wrapper around a stock component, or a citation of `path:line`, is fine. Such an extension gets an id of its own, different from the original's, so both can be installed side by side.
3. **This is a personal open-source project.** Nothing in it names an employer, a client or a private project, and examples use neutral, invented data.
4. **One Directus target for the whole repository.** Everything is built and tested against Directus 11.17.4, every package declares the host range `^11.15.0`, and `@directus/extensions-sdk` is pinned to exactly `17.1.4`, because its Vue compiler must match the host's Vue (3.5.24 in 11.17.4). The range and the pin are set in `template/package.json`, and `npm run sync` fails when a package differs. Moving to another Directus version is one change across the repository: the template, every package, `directus` in `sandbox/package.json`, the `path:line` citations in the code, and a full run of everything.
5. **Bundle hygiene.**
   - The app bundle of an extension imports only `vue` and `@directus/extensions-sdk`; everything else it uses is bundled in. Packages have `devDependencies` only, never runtime `dependencies`.
   - Directus serves all app extensions as one bundle on every Data Studio page, and one broken app bundle disables every custom app extension on the instance. Watch size, and report size changes.
   - Keep `overrides.esbuild` in the root `package.json`: without it the SDK's two esbuild versions break the build on npm installs. npm reads overrides only from the root, so a package must not have its own.
   - `.npmrc` pins the public npm registry. Every `resolved` URL in both lockfiles must start with `https://registry.npmjs.org/`; the only other entries are the links to the workspaces.
   - A lockfile must hold the optional dependencies of every platform, or `npm ci` fails on the runner. npm drops them when it updates a lockfile next to an existing `node_modules`. `npm run sync` checks both lockfiles for this; when it complains, delete that lockfile and the `node_modules` beside it and run `npm install` there (with Node 22 in `sandbox/`).
6. **What is stored is public API.** The ids of interfaces, displays, hooks and other entries, the format of stored values and the keys of options live in the schemas and data of other people's projects. Never rename them; change formats only in ways which keep old values working.
7. **Directus look.** Use only `--theme--*` tokens for colours, so light, dark and custom themes work, and Directus global components where one fits. Styles are scoped, or every rule sits under a root class of the package.
8. **App-only where possible.** The Marketplace installs app-only extensions under the default `MARKETPLACE_TRUST`; an API entry which is not sandboxed takes that away. Add one only when the extension needs it.

## Node versions

- **Extensions:** Node 22 or later. The workflows build and publish with Node 24, and the bundles it builds are byte for byte those of Node 22.
- **Sandbox:** Node 22 only. Directus 11.17.4 depends on `isolated-vm` 5.0.3, which has no build for Node 24. The Build workflow therefore builds with Node 24 and then switches to Node 22 for the browser tests.

## Code style

- TypeScript, tabs (4 wide) and single quotes. `package.json` and YAML use 2 spaces (see `.editorconfig`).
- Comments explain *why*. When relying on Directus internals, cite them as `path:line` in the Directus 11.17.4 source (`app/src/...`, `api/src/...`, `packages/...`).
- UI text is plain English. Reuse an existing Directus `$t:` key only when it matches exactly.
- Markdown paragraphs are unwrapped, one line each (README, CHANGELOG, docs).
- A README is shown on npm and in the Marketplace, outside this repository: link images as `https://raw.githubusercontent.com/dkrutsko/directus-extensions/main/packages/<name>/...` and files as `https://github.com/dkrutsko/directus-extensions/blob/main/packages/<name>/...`, never by a relative path.
- Code which needs no Vue, DOM or Directus goes into files of its own, so vitest can run it in Node. Add or update unit tests with every change to its behaviour; `npm run check` also type-checks the tests.

## Workflow rules

- **Ask before you bump a version, commit, push, tag or publish.** Only do them when explicitly asked. Record user-visible changes under `## Unreleased` at the top of the package's `CHANGELOG.md`.
- **Releasing a package, only when asked:**
  1. Run `npm version X.Y.Z --no-git-tag-version -w packages/<name>`. It also updates the root lockfile.
  2. Rename `## Unreleased` to `## X.Y.Z` in the package's `CHANGELOG.md`.
  3. Commit and push to `main`.
  4. The maintainer then runs **Actions → Publish** with the package and `X.Y.Z`. That workflow uses npm trusted publishing with provenance, then tags the commit as `directus-extension-<name>@X.Y.Z`.
- **There are no GitHub Releases.** The changelog of each package is the record of its releases, and the Publish workflow refuses a version without a section in it.
- **Both workflows stay `workflow_dispatch`-only;** there is no automatic CI. **Actions → Build** packs the tarball for inspection without publishing, and can run the browser tests.
- **After adding, renaming or removing a package, run `npm run sync`.** Both workflows fail when the lists are out of date.
- **The first release of a new package is published by hand,** because a trusted publisher is set up in the settings of a package which already exists on npm. The maintainer does that (`npm publish -w packages/<name> --provenance=false`), and then adds the trusted publisher on npmjs.com: user `dkrutsko`, repository `directus-extensions`, workflow `publish.yml`, environment `publishing`, with `npm publish` allowed. npm drops a trusted publisher which has not published within 2 days of being added.
- **Verify UI changes in the sandbox in a browser, in light and dark,** before handing them back; unit tests are not enough. Say plainly what was and wasn't tested.

## Browser tests

Every package has at least one spec in `packages/<name>/sandbox/` which proves that its built bundle loads in a real Data Studio and does its main job. `sandbox/README.md` describes the fixtures. Keep these in mind:

- The sandbox loads what is in `dist`, so build before a run. With the sandbox running, a rebuilt `dist` is picked up on a reload of the tab; a changed `package.json` or a new package needs a restart.
- A spec creates collections named `sandbox_<name>...` and drops them first, so it runs again on the same database.
- Every test fails on an error logged or thrown by the page, whichever extension caused it.
- The specs run in Chromium only. Firefox, WebKit, touch devices and the dark theme are checked by hand when a change calls for it.

## Demos

The sandbox has a folder "Demos" with a collection for each extension which has options to choose from, for the maintainer to test by hand and for anyone who clones the repository to try combinations. `sandbox/README.md` explains how they are built.

- **An extension with options has a demo** in `packages/<name>/demo/demo.mjs` and a smoke test in `packages/<name>/sandbox/demo.spec.ts`. `packages/switch` is the model of an interface alone (a singleton), `packages/meter` of one with a display (items and a table), `packages/json-table` of a demo with a collection it needs (`supports`).
- **A new or changed option gets a field in the demo, or is added to one.** The note under each field is written from its options. Keep the habits which `sandbox/README.md` lists, so the demos read as one. After a change run `npm run demo -- <name>` and the smoke test, and look at the form.
- **The definition is the only source.** The sandbox builds the demo from it, and nothing done in the Data Studio is written back.
- `list-m2a-viewable` has no demo: it has nothing to choose. A package made by `npm run new` has none yet either: add the two files, copied from the model which fits.

## Known gaps

- Only Directus 11.17.4 is tested. The host range starts at 11.15.0, and Directus 12 has not been tried.
- Nothing checks `template/` on its own: it is only known to work when an extension has just been created from it.
