# Changelog

## 1.0.4

### Changed

- **Three new limits.** A legend can have 200 entries, the cells of a table 100,000 parts between them, and a chain of shared cells which use each other 32 links. A value over one of them is now rejected with a message of its own, where it was drawn before. No real legend and no real chain comes near its limit. **The limit on parts can be met:** only a cell written as a list of several parts counts, so a table with more than 50,000 cells of two parts each is over it, for example 1,000 rows with 51 such cells each. Version 1.0.3 drew such a table, slowly. Without the limits a stored value of 721 bytes could hold 100,000 legend entries and freeze the page for everyone who opened the item, and a chain of thousands of shared cells was reported as "Unexpected error".
- **Headings are groups of rows for assistive technology.** A heading and the rows under it are one row group, with the heading as its header. Before, a heading was exposed as a column header.
- **Icon names are no longer read out.** "check_circle Healthy" is now "Healthy". A cell which shows only icons is called by its tip, or else by what each of its parts has to say: its own tip, or the name of its icon as words ("check circle").
- **The table is called by the name of its field,** where every table was a region called "Table", and it is a stop for the Tab key only while it scrolls.
- **Sticky Rows, Top and Bottom show in the options form only while Maximum Height is set,** since they do nothing without one. What is stored for them is kept and read as before.
- **In a batch edit the field says that no table is shown.** It said "No table yet", though every item held one.
- **Text.** The direction marks U+200E, U+200F and U+061C are now removed like the other bidirectional controls, and the separators U+2028 and U+2029 become spaces like line breaks.
- **Opening a link no longer draws the table again.** On the largest table there can be, the page froze for a third of a second before the drawer opened; it is under a tenth now.
- **The option Placeholder is named by the app,** so its name is translated, and the interface has a drawing in the interface picker.
- **Size.** The bundle went from 32.2 kB to 31.2 kB (10.9 to 10.5 kB gzipped).
- The host range is still `^11.15.0`. The README no longer says that 11.15.0 is the first release the drawer works in: the extension is built and tested against Directus 11.17.4, and no other version was tried.

### Fixed

- **A legend entry which is only a background drew nothing.** It is a swatch of the background now, as `docs/format.md` said.
- **A heading showed only its `tip` as a tooltip,** and nothing without one. It shows its text, which may be cut off, and then its tip, like a header cell and a row header.
- **A link which the Tab key moved to could end up under the sticky rows and columns.** The table now scrolls it clear of them.
- **The parts of a legend entry** are isolated from each other for right-to-left text, as they are in the table.
- **Compressed data which is gzip but not UTF-8** was reported as "data is not valid gzip". It now says "data does not unpack to UTF-8 text".
- **Print and contrast themes.** A printed item keeps the backgrounds of its cells. Under a contrast theme of the system (forced colours) a filled cell and the edges of the sticky rows and columns are drawn as lines.
- **The documents.** The README links the examples by a full address, its `curl` fetches the example first and so works without the repository, and its options table has the keys and the types. `docs/format.md` lists every message, says what the legend draws, and gives the size limit of a compressed table as 8 MB of base64. The `$id` of `docs/schema.json` is now `https://raw.githubusercontent.com/dkrutsko/directus-extensions/main/packages/json-table/docs/schema.json`; it named the repository the extension moved from.
- Internal: the view logic moved from the component to `src/view.ts` and has unit tests, labels are drawn by one small component, the styles carry no comments into the bundle, and the browser tests now hold the interface to what the README promises (308 unit tests, up from 151; 31 browser tests, up from 6).

## 1.0.3

- The extension moved to the [directus-extensions](https://github.com/dkrutsko/directus-extensions) repository, which now holds its source and issues. The package name and the extension itself are unchanged.

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
