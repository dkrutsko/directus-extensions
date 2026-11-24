# directus-extension-__NAME__

A Directus 11 interface extension, published on npm as `directus-extension-__NAME__`. It adds the **__TITLE__** interface (`__NAME__`) for `string` fields. TODO: say in two sentences what it does and why it exists.

The rules which hold for every extension of this repository (independence, bundle hygiene, code style, releasing, the sandbox) are in the root `AGENTS.md`. This file only holds what is specific to this package; `CLAUDE.md` imports it.

## Layout

| Path | What |
|---|---|
| `src/index.ts` | `defineInterface` and the options. The id `__NAME__` is stored in users' schemas: never rename it. |
| `src/value.ts` | The framework-free part. No Vue, no DOM library, no Directus imports, so the tests run it in Node. |
| `src/interface.vue` | The component. |
| `tests/` | Vitest unit tests of `src/value.ts`. |
| `sandbox/` | Browser tests which run against the sandbox Directus of the repository. |

## How it works

TODO: the few things someone must know before changing the code.

## Invariants: do not break

1. **Stored values and option keys are public API.** TODO: name them.
2. **It is an app-only extension,** so the Marketplace can install it under the default `MARKETPLACE_TRUST`. Don't add API entries casually.

## Known gaps

- Only Directus 11.17.4 has been tested.
