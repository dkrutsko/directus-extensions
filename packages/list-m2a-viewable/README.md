# directus-extension-list-m2a-viewable

[![npm](https://img.shields.io/npm/v/directus-extension-list-m2a-viewable)](https://www.npmjs.com/package/directus-extension-list-m2a-viewable)
[![license](https://img.shields.io/npm/l/directus-extension-list-m2a-viewable)](https://opensource.org/licenses/MIT)

A drop-in replacement for the built-in **Builder (M2A)** interface (`list-m2a`) in [Directus](https://directus.io) that keeps list items clickable when the field is read-only. Anyone who can _see_ the field can open each referenced item in the side drawer, in view-only mode.

## Why

Since Directus 11.15 the built-in interface renders each row as

```vue
<VListItem :disabled="disabled && !nonEditable" ... @click="editItem(element)"></VListItem>
```

`disabled` is true for a read-only field. `nonEditable` is only ever true for non-admins who lack update permission. A read-only field is therefore inert for administrators, and for any user who has update permission on the collection but faces a read-only field. In earlier versions those rows still opened the drawer. See [directus/directus#26689](https://github.com/directus/directus/issues/26689).

## How

The extension renders the built-in component by its global name (`interface-list-m2a`) and forces `nonEditable` on whenever the field is `disabled`. Everything else is forwarded untouched, so behaviour, options and stored data are identical to the built-in interface.

In view-only mode the built-in component hides its create, select, drag and remove controls, opens the drawer with a disabled Save button, and also hides its pagination. Because of that last point the extension exposes one extra option, **Items Shown When Read-only** (default `-1`, meaning all items), that is used as the page size while the field is read-only.

## Installation

Choose one:

- **Marketplace.** In Directus go to Settings, Marketplace, search for `list-m2a-viewable` and install. App-only extensions such as this one are listed under the default `MARKETPLACE_TRUST` setting.
- **npm.** In the project that runs Directus run `npm install directus-extension-list-m2a-viewable`. Directus discovers extensions listed in the root `package.json` on startup.
- **Local folder.** Run `npm pack directus-extension-list-m2a-viewable`, unpack the archive into `<EXTENSIONS_PATH>/directus-extension-list-m2a-viewable` with `tar -xzf directus-extension-list-m2a-viewable-*.tgz --strip-components 1 -C <that folder>`, then restart Directus. The archive holds `package.json` and `dist/`, which is all Directus needs at run time.

## Usage

1. Restart Directus if you installed via npm or a local folder.
2. Settings, Extensions: confirm **directus-extension-list-m2a-viewable** is enabled.
3. Settings, Data Model, open the collection, open the M2A field, and set **Interface** to **Builder (M2A) Viewable**. Re-check its options. They match the built-in ones one-to-one.
4. Leave the field's **Read-only** toggle as it is. Items are now clickable for everyone who can read the field.

Users still need read permission on the junction collection and on every target collection of the M2A. Rows for collections they cannot read render as "Invalid item" and remain unclickable, exactly as with the built-in interface.

## Compatibility

Built and tested against Directus 11.17.4. The `host` range starts at 11.15.0, the first release with the `nonEditable` prop this extension relies on.

## Development

This package lives in the [directus-extensions](https://github.com/dkrutsko/directus-extensions) repository, whose README covers the setup, the test Directus and releasing. After `npm install` in the repository root, run these in `packages/list-m2a-viewable`:

```bash
npm run dev       # watch build, unminified
npm run check     # vue-tsc
npm run build
npm run validate
```

There are no unit tests: the extension is a thin wrapper, so `sandbox` holds a browser test which runs in a real Directus.

## License

[MIT](https://github.com/dkrutsko/directus-extensions/blob/main/packages/list-m2a-viewable/LICENSE)
