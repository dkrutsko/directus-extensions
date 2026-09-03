# Changelog

## 1.0.0

- Initial release. Wraps the built-in `list-m2a` interface and keeps items clickable when the field
  is read-only, opening the side drawer in view-only mode.
- Adds the **Items Shown When Read-only** option (default `-1`, all items) used as the page size while
  read-only, since the built-in component hides pagination in that mode.
- Targets Directus `^11.15.0`. Built against 11.17.4.
