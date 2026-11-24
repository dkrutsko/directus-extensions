# Changelog

## 1.0.2

- Sticky columns now stay as wide as their content when a table narrower than the field is stretched to fill it, as the first column always did. The columns between them share the extra width. Before, a sticky column on the right, such as one which holds totals, took a larger share than the columns beside it, because the extra width is shared by the width of the content.

## 1.0.1

- First release published by the manual Publish workflow through npm trusted publishing, which validates the trusted publisher configuration. No functional changes.

## 1.0.0

- Initial release. The **JSON Table** interface (`json-table`) for `json` fields: a read-only table drawn from the field's value, with a legend under it.
- The value holds the table cell by cell in format version 1: a header row, rows, headings which span the table, and a legend. A cell has text, an icon, a colour and a background (hex colours or theme variables), a font weight, italics, a tooltip and a link which opens the item in a view-only drawer. See `docs/format.md`, the JSON Schema in `docs/schema.json` and the values in `examples/`.
- Cells which repeat are written once under `shared` and used by name or with `use`, which a cell can build on by changing fields. A cell's text can be a list of parts with their own fields, side by side or on a line each with `break`.
- A table can be stored compressed (`"encoding": "gzip"`), which the interface unpacks in the browser.
- Options: Column Labels (automatic, on their side or across), Maximum Height, Sticky Columns Left and Right, Sticky Rows Top and Bottom, and Placeholder.
- A table can have 200 columns, 1,000 rows and 10 parts in a cell. A value which breaks the format or a limit is not drawn, and the field shows the first problem found.
- Targets Directus `^11.15.0`. Built against 11.17.4, and tested in Chrome, Firefox and WebKit.
