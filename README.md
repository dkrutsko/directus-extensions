# directus-extensions

A collection of extensions for [Directus](https://directus.io): interfaces, displays and more. Each one is its own npm package with its own version, changelog and documentation, and none depends on another.

<!-- packages:start -->
| Extension | What it adds | npm |
|---|---|---|
| [directus-extension-json-table](packages/json-table) | Read-only table interface for Directus JSON fields: draws the field's value as a table with colours, icons, links, sticky rows and columns, and a legend | [![npm](https://img.shields.io/npm/v/directus-extension-json-table)](https://www.npmjs.com/package/directus-extension-json-table) |
| [directus-extension-list-m2a-viewable](packages/list-m2a-viewable) | Builder (M2A) interface for Directus whose items stay clickable when the field is read-only | [![npm](https://img.shields.io/npm/v/directus-extension-list-m2a-viewable)](https://www.npmjs.com/package/directus-extension-list-m2a-viewable) |
| [directus-extension-node-graph](packages/node-graph) | Node-graph field for Directus: edit a graph of nodes and connections against a configurable ruleset, with a summary display and server-side validation | [![npm](https://img.shields.io/npm/v/directus-extension-node-graph)](https://www.npmjs.com/package/directus-extension-node-graph) |
<!-- packages:end -->

Install an extension from the Directus Marketplace or with npm; its own README says how to use it. All of them are built and tested against Directus 11.17.4 and declare the host range `^11.15.0`.

## Development

The extensions need Node 22 or later and npm 11. One install in the repository root serves all of them:

```bash
npm install
npm run check      # type checks, every package
npm test           # unit tests, every package which has them
npm run build
npm run validate   # directus-extension validate
```

Add `-w packages/<name>` to run a script for one extension, or run it inside the package's folder, where `npm run dev` is the watch build.

- `packages/<name>` is one extension. Each relies on its own code only: nothing is shared between them, and none depends on another.
- `sandbox` is a local Directus 11.17.4 which loads every extension, with browser tests. It needs Node 22 and has [its own README](sandbox/README.md).
- `template` is the starting point of a new extension.
- `scripts` holds the two helpers behind `npm run new` and `npm run sync`.

### Trying an extension in Directus

```bash
npm run sandbox:install   # once, with Node 22
npm run build
npm run sandbox           # Directus at http://127.0.0.1:8155, admin@example.com / sandbox
npm run sandbox:test      # the browser tests of every extension
```

### Adding an extension

```bash
npm run new -- <name> "One line which says what it adds"
npm install
```

`<name>` is the part after `directus-extension-`, such as `json-table`. The command copies `template` to `packages/<name>` and adds the package to the table above and to the dropdowns of both workflows. `npm run sync` rewrites those lists at any time, and checks the rules every package follows.

### Releasing

Nothing runs automatically. Every extension has its own version and its own `CHANGELOG.md`, which is the record of its releases; this repository has no GitHub Releases. Two workflows under the Actions tab are triggered by hand, and both ask which extension they are for:

- **Build** runs check, test, build and validate on Node 24 for one extension or for all, then attaches the exact `.tgz` that would be uploaded to npm as a downloadable artifact. With the browser tests ticked it also starts the sandbox Directus and runs them.
- **Publish** takes an extension and a version number. Bump `version` in the package's `package.json` (`npm version X.Y.Z --no-git-tag-version -w packages/<name>`), rename `## Unreleased` in its `CHANGELOG.md` to `## X.Y.Z`, commit and push to `main`, then run the workflow. It verifies that the version matches `package.json`, has a changelog section and was not published before, publishes to npm with provenance via trusted publishing, and only after npm accepts the upload tags the commit as `directus-extension-<name>@X.Y.Z`. The job runs under the `publishing` environment, so it pauses for approval when that environment has required reviewers.

The first release of a new extension is different: a trusted publisher is set up in the settings of a package on npm, so the package has to exist first. Version 1.0.0 is therefore published by hand, with `npm login` and then `npm publish -w packages/<name> --provenance=false` (a provenance statement can only be made in a workflow). After that, add a trusted publisher in the package's settings on npmjs.com: GitHub Actions, user `dkrutsko`, repository `directus-extensions`, workflow `publish.yml`, environment `publishing`, with `npm publish` among the allowed actions. npm drops a new trusted publisher which has not published within 2 days, so add it when the next release is ready.

## License

[MIT](LICENSE)
