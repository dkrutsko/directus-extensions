# Changelog

## 1.0.2

- Fix "RangeError: Invalid array length" on item pages for M2A fields that are editable for the viewer. v-form marks every field disabled while the item is loading, so the wrapper mounted the built-in component in view-only mode with a page size of -1. The built-in component reads its `limit` prop only once at setup, kept -1 after the field became editable, and computed a negative page count that crashed its pagination. The wrapper now mounts nothing while the form is loading (a placeholder keeps the skeleton's height) and re-keys the built-in component whenever the view-only state flips, so its page size is always seeded from the current mode.
- Validate page sizes before handing them to the built-in component: edit mode falls back to 15, view-only mode to all items, for null, string, zero or negative option values.

## 1.0.1

- Test release exercising the manual publish workflow. No functional changes.

## 1.0.0

- Initial release. Wraps the built-in `list-m2a` interface and keeps items clickable when the field
  is read-only, opening the side drawer in view-only mode.
- Adds the **Items Shown When Read-only** option (default `-1`, all items) used as the page size while
  read-only, since the built-in component hides pagination in that mode.
- Targets Directus `^11.15.0`. Built against 11.17.4.
