# Changelog

## 1.0.4

### Added

- **A preview in the interface picker** of Settings, Data Model, where a new field is created, as the built-in interfaces have one.
- **A notice where Directus has no Builder (M2A) interface.** The extension draws the built-in component, and if a later Directus renames or drops it, the field now says so instead of staying empty.
- **The README has an options table, a list of limitations and a picture.**

### Changed

- **Items Shown When Read-only** now sits beside Per Page in the options form, has a shorter note, and its input stops at -1. The stored option is the same.
- **Page sizes are read more strictly.** Only a whole number from 1 up counts, as a number or as its text; anything else falls back, Per Page to 15 and Items Shown When Read-only to all items. Only odd stored values change: the text `"1e1"` is now 10 and no longer 1, and `"15abc"`, the fraction 2.7 and `true` fall back where they were read as 15, 2 and 1.
- **The README was corrected.** Who the built-in interface leaves with an inert list in Directus 11.17.4 (also users without update permission on the collection); what a user without read access sees (a notice in place of the field, not "Invalid Item"); that the upstream issue is closed without a change to the Builder (M2A); that a read-only field does not look read-only here; what `QUERY_LIMIT_MAX` does to "all"; and that the `host` range `^11.15.0` is the one of the repository, with only 11.17.4 tried.
- **Size.** The bundle grew from 3,215 to 4,570 bytes (1,550 to 1,737 gzipped). The preview is 1,469 of them; the code itself got smaller.

### Fixed

- **A list which can be edited keeps its page and its page size after a save which stays on the item.** Since 1.0.2 the list went back to its first page and forgot the page size chosen under it, because the built-in component was mounted anew after every load of the item, and saving loads the item again. Now only the first load is waited for. Another item or another content version in the same form still starts on the first page of its list. The "RangeError: Invalid array length" which 1.0.2 fixed stays fixed.

Unit tests for the page sizes and seven more browser tests came with these changes.

## 1.0.3

- The extension moved to the [directus-extensions](https://github.com/dkrutsko/directus-extensions) repository, which now holds its source and issues. The package name and the extension itself are unchanged.

## 1.0.2

- Fix "RangeError: Invalid array length" on item pages for M2A fields that are editable for the viewer. v-form marks every field disabled while the item is loading, so the wrapper mounted the built-in component in view-only mode with a page size of -1. The built-in component reads its `limit` prop only once at setup, kept -1 after the field became editable, and computed a negative page count that crashed its pagination. The wrapper now mounts nothing while the form is loading (a placeholder keeps the skeleton's height) and re-keys the built-in component whenever the view-only state flips, so its page size is always seeded from the current mode.
- Validate page sizes before handing them to the built-in component: edit mode falls back to 15, view-only mode to all items, for null, string, zero or negative option values.

## 1.0.1

- Test release exercising the manual publish workflow. No functional changes.

## 1.0.0

- Initial release. Wraps the built-in `list-m2a` interface and keeps items clickable when the field is read-only, opening the side drawer in view-only mode.
- Adds the **Items Shown When Read-only** option (default `-1`, all items) used as the page size while read-only, since the built-in component hides pagination in that mode.
- Targets Directus `^11.15.0`. Built against 11.17.4.
