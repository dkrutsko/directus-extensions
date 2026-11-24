# directus-extension-__NAME__

[![npm](https://img.shields.io/npm/v/directus-extension-__NAME__)](https://www.npmjs.com/package/directus-extension-__NAME__)
[![license](https://img.shields.io/npm/l/directus-extension-__NAME__)](https://opensource.org/licenses/MIT)

__DESCRIPTION__.

TODO: say in a paragraph what the extension adds to [Directus](https://directus.io) and when someone would want it. A screenshot goes here; link it by its full URL (`https://raw.githubusercontent.com/dkrutsko/directus-extensions/main/packages/__NAME__/docs/images/...`), because npm and the Marketplace show this file outside the repository.

## Installation

Choose one:

- **Marketplace.** In Directus go to Settings, Marketplace, search for `__NAME__` and install. App-only extensions such as this one are listed under the default `MARKETPLACE_TRUST` setting.
- **npm.** In the project that runs Directus run `npm install directus-extension-__NAME__`. Directus discovers extensions listed in the root `package.json` on startup.
- **Local folder.** Run `npm pack directus-extension-__NAME__`, unpack the archive into `<EXTENSIONS_PATH>/directus-extension-__NAME__` (`EXTENSIONS_PATH` defaults to `./extensions`) with `tar -xzf directus-extension-__NAME__-*.tgz --strip-components 1 -C <that folder>`, then restart Directus. The archive holds `package.json` and `dist/`, which is all Directus needs at run time.

## Usage

1. Restart Directus if you installed via npm or a local folder.
2. Settings, Extensions: confirm **directus-extension-__NAME__** is enabled.
3. Settings, Data Model, open the collection, add or open a field, and set **Interface** to **__TITLE__**.

TODO: describe the options and what the field stores.

## Compatibility

Built and tested against Directus 11.17.4. The `host` range starts at 11.15.0, but only 11.17.4 has been tested.

## Development

This package lives in the [directus-extensions](https://github.com/dkrutsko/directus-extensions) repository, whose README covers the setup, the test Directus and releasing. After `npm install` in the repository root, run these in this folder:

```bash
npm run dev       # watch build, unminified
npm run check     # vue-tsc, then tsc over the tests
npm test          # vitest
npm run build
npm run validate
```

## License

[MIT](https://github.com/dkrutsko/directus-extensions/blob/main/packages/__NAME__/LICENSE)
