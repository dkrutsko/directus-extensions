# Sandbox

A local Directus 11.17.4 with a SQLite database which loads every extension of `../packages`, and the browser tests which run against it. It is for trying an extension by hand and for checking that the built bundles work in a real Data Studio. It is not a workspace of the repository: it has its own `package.json` and lockfile, so installing the extensions never installs Directus.

## Requirements

- **Node 22.** Directus 11.17.4 depends on a native module (`isolated-vm` 5.0.3) which has no build for Node 24 or later, so the install refuses any other version. The extensions themselves build on Node 22 and later.
- Every extension built (`npm run build` in the repository root). The start says which ones are not.

## Commands

Run these in the repository root:

```bash
npm run sandbox:install   # installs Directus and Playwright into sandbox/, and Playwright's Chromium
npm run sandbox           # starts Directus at http://127.0.0.1:8155
npm run sandbox:test      # runs every browser test
npm run sandbox:reset     # deletes the database, the uploads and the bundle
```

Sign in as `admin@example.com` with the password `sandbox`. Both, and the port, are in `settings.json`; `SANDBOX_PORT` overrides the port for one run. Everything the instance writes goes into `data/`, which git ignores.

The first start creates the database and the administrator. `npm run sandbox:test` starts the instance for the run when it is not already up, and stops it again afterwards. To run the tests of one extension, pass a part of the path, for example `npm run sandbox:test -- json-table/`.

## Working on an extension

1. `npm run sandbox`
2. In another terminal, `npm run dev -w packages/<name>` rebuilds the extension on every change.
3. Reload the browser tab. The sandbox reloads extensions when their `dist` changes (`EXTENSIONS_AUTO_RELOAD`), so it does not need a restart.

A change to a `package.json` of an extension, or a new extension, does need a restart.

## Browser tests

The tests live with the extensions, in `packages/<name>/sandbox/*.spec.ts`, and run in Chromium. A spec imports `test` and `expect` from `support/fixtures.ts`, which gives it:

- `api`, to seed through the REST API as the administrator. A spec creates its own collections, named `sandbox_<name>...`, and drops them first (`api.drop`), so it can run again on the same database.
- `page`, already signed in as the administrator.
- A check after every test that the page logged no error and threw nothing. Directus serves all app extensions as one bundle, so one broken extension shows as such an error in the tests of every other.

All specs share one Directus and one database, so they run one at a time. `playwright.config.ts` has the rest. Playwright runs TypeScript without checking it; `npm run check` in this folder type-checks the setup and every spec.

## Things which are easy to trip over

- **Two instances started from the same folder share one bundle.** Directus writes the bundle of all app extensions to `TEMP_PATH`, which defaults to a folder inside `node_modules`. The sandbox sets its own (`data/tmp`), so it can run next to another Directus on the same machine.
- **The sandbox refuses to start when an extension cannot be loaded** (`EXTENSIONS_MUST_LOAD`), so a test run cannot pass without it.
- **The versions belong together.** `directus` in `package.json` is the version the extensions are built for. When it changes, the SDK pin and the host range of the extensions change with it (see the root `AGENTS.md`).
