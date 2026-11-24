# The value format

This is the reference for whoever writes the value of a field which uses the **JSON Table** interface: a flow, a hook, a script that talks to the API, or a person with a JSON editor. The interface only reads the value. It draws what it is given, cell by cell, and works nothing out: there is no sorting, grouping or counting, so a table with totals is a table whose writer added the cells which hold them.

The format has a version, currently `1`. [`schema.json`](schema.json) is a JSON Schema of it for validating values in any language, and [`examples/`](../examples) has complete values to start from.

## At a glance

```json
{
	"version": 1,
	"data": {
		"shared": {
			"gains": { "icon": "add_circle", "color": "var(--theme--success)", "tip": "Gains" },
			"loses": { "icon": "remove_circle", "color": "var(--theme--danger)", "tip": "Loses" },
			"total": { "weight": 600, "background": "var(--theme--background-subdued)" },
			"plus": { "use": "total", "color": "var(--theme--success)" },
			"minus": { "use": "total", "color": "#E35169" }
		},
		"columns": [
			{ "text": "Policy" },
			{ "text": "Priya Shah", "tip": "priya.shah@example.com", "link": { "collection": "people", "id": "1" } },
			{ "text": "Marco Bianchi" },
			{ "text": "Total" }
		],
		"rows": [
			[{ "text": "Source control" }],
			[{ "text": "billing-engineers" }, "gains", "gains", { "use": "plus", "text": "+2" }],
			[
				{ "text": "billing-legacy" },
				"loses",
				"gains",
				{ "use": "total", "text": [{ "use": "plus", "text": "+1" }, { "use": "minus", "text": "-1" }] }
			]
		],
		"legend": ["gains", "loses"]
	}
}
```

This draws a table of four columns and three rows. "Source control" is a heading across the table, the cells under the two people are green and red icons, and the last column holds bold totals on a shaded background, the second of them reading `+1 -1` in two colours. Under the table a legend explains the two icons.

## The wrapper

A field without a table holds `null`, and the interface then shows its placeholder. Any other value is an object with these fields:

| Field | Value |
|---|---|
| `version` | Always the number `1`. |
| `encoding` | Left out or `null` when `data` is the table itself, `"gzip"` when it is compressed. |
| `data` | The table: an object, or with `"encoding": "gzip"` a string (see [Compression](#compression)). |

Any other field next to these is ignored, so a writer can keep bookkeeping of its own in the value, such as a timestamp or a hash of what the table was computed from.

## The table

| Field | Value |
|---|---|
| `columns` | Required. The header row: a list with one [cell](#cells) per table column. |
| `rows` | Required. A list of rows. Each row is a list of cells. |
| `shared` | Optional. An object of cells by name. See [Shared cells](#shared-cells). |
| `legend` | Optional. A list of cells drawn under the table. |

- **Rows.** A row has exactly one cell per column. The first cell of a row is the header of that row: it is drawn in the first column, which stays in view while the table scrolls sideways.
- **Headings.** A row with a single cell, in a table with more than one column, is a heading which spans the whole table. Use it for groups, or for a note such as "120 more rows are not shown".
- **Legend.** Each entry is drawn the way it is drawn in the table, followed by its `tip` as the label. Naming the shared cells is usually all it takes: `"legend": ["gains", "loses"]`.
- **Empty cells.** `{}` is an empty cell. A row cannot be shorter than `columns`.
- Other fields in the table are ignored, like those next to `data`.

## Cells

A cell is an object. Every field is optional:

| Field | Value | Meaning |
|---|---|---|
| `text` | string, number or list | The text of the cell. A list holds [parts](#parts-and-lines). |
| `icon` | string | The name of an icon of the Directus icon set ([Material Symbols](https://fonts.google.com/icons)), such as `check_circle`. Drawn in front of the text. |
| `color` | string | The [colour](#colours) of the text and the icon. |
| `background` | string | The colour behind the cell. |
| `weight` | number | The font weight, from 1 to 1000. 400 is normal and 700 is bold. |
| `italic` | boolean | `true` slants the text. |
| `tip` | string | The tooltip. In the legend it is the label. |
| `link` | object | `{ "collection": "people", "id": "1" }`. See [Links](#links). |
| `use` | string | The name of a cell in `shared` to start from. |
| `break` | boolean | For parts: `true` starts a new line. See [Parts and lines](#parts-and-lines). |

A cell can also be just a string, which is the name of a cell in `shared`: `"gains"` means the same as `{ "use": "gains" }`. A string is never the text of a cell. For text, write `{ "text": "..." }`.

Any field can be `null`, which means "nothing here" and matters when a cell inherits fields (see below). Fields the format does not know are ignored.

### Text

Text is plain text. Markup, Markdown and template syntax are shown as they are written and never interpreted. Control characters, line breaks included, become spaces, and text longer than 200 characters is cut and ends in three dots. A number is turned into text as it is, so format it yourself (`"1,204"`) when you want it formatted.

A cell with text is as wide as its text, up to a limit, and a cell never wraps: text which does not fit is cut with an ellipsis, and the tooltip shows it in full for header cells and row headers.

### Colours

`color` and `background` take one of two forms, and nothing else:

- **A hex colour:** `#RGB`, `#RGBA`, `#RRGGBB` or `#RRGGBBAA`. It is the same colour in the light and the dark theme, so check both.
- **A theme variable** of the Data Studio, written `var(--theme--name)`. It follows the theme, including custom themes. The usual ones are `--theme--primary`, `--theme--success`, `--theme--warning`, `--theme--danger`, `--theme--foreground`, `--theme--foreground-subdued`, `--theme--background-subdued` and `--theme--background-normal`. The matching soft backgrounds are `--theme--primary-background`, `--theme--success-background`, `--theme--warning-background` and `--theme--danger-background`.

A colour name (`red`), `rgb()`, any other CSS function and a `var()` with a fallback are rejected, and the table is then not drawn. A theme variable which does not exist is accepted and leaves the cell as it was. A translucent background (`#E3516926`) is laid over the cell's own background, so the cell stays readable when it is pinned and other cells scroll under it.

### Links

A `link` names an item: `{ "collection": "people", "id": "42" }`. The `id` is always a string, also for numeric keys. The text of the cell becomes a button which opens that item in a side drawer over the form, the way a related item opens from a relational field. The drawer is view-only, whatever the user's permissions.

The link is only offered when the collection exists and the user may read it. Otherwise the cell shows its text as plain text. The interface cannot know whether the item itself exists: a link to one which does not, or which the user may not read, opens nothing, and Directus shows its own "You don't have permission to access this" notice. A link needs text, so a cell with only an icon cannot be clicked.

### Tooltips

- A header cell, a row header and a heading show their text, which may be cut off, and then their `tip`.
- Any other cell with a `tip` shows it after the text of its column header and of its row header: `Priya Shah - billing-engineers: Gains`. In a large table the two headers can be far away from the cell.

## Shared cells

`shared` holds cells by name, like components, so that a table of thousands of cells writes most of them as one short string:

```json
"shared": {
	"total": { "weight": 600, "background": "var(--theme--background-subdued)" },
	"plus": { "use": "total", "color": "var(--theme--success)" }
}
```

- A cell with `use` starts from the shared cell of that name. Its own fields win, field by field: `{ "use": "plus", "text": "+3" }` is a bold green `+3` on the shaded background.
- A field set to `null` takes away what the shared cell had: `{ "use": "plus", "background": null }`.
- A shared cell can `use` another shared cell. A chain which leads back to itself is rejected.
- A name which is not in `shared` is rejected, and so is a shared cell which is not an object. Every shared cell is checked, whether the table uses it or not.
- Do not call a shared cell `__proto__` or `hasOwnProperty`. Directus loses the first when it saves the value and replaces the second in the form, and the table is then rejected. Any other name works, one-character names included.

Short names matter only for a very large table which is not compressed, where each character of a name is repeated for every cell.

## Parts and lines

When `text` is a list, each entry is a part: a piece of the cell with its own colour, weight, icon, link and tooltip.

```json
{ "text": [{ "text": "2.4.0", "weight": 600 }, { "text": "beta", "color": "#6644FF" }] }
```

- A part is text, a number, or an object with the fields of a cell except `background`. In a list a string is always text, never the name of a shared cell: write `{ "use": "plus" }` for that.
- **Parts sit side by side** on one line, a space apart, in the order they are written. The example reads `2.4.0 beta`.
- **`"break": true` on a part starts a new line** with that part.
- **A part starts from the fields of its cell.** `color`, `weight`, `italic`, `icon`, `tip`, `link` and `break` on the cell apply to every part which does not set its own, and a part can set any of them to `null`. So `"break": true` on the cell, or on a shared cell it uses, puts every part on a line of its own, and `"break": false` on one part keeps that part on the line.
- The order in which fields are taken is: the part's own fields, the shared cell the part uses, the fields of its cell, the shared cell its cell uses. Because of that, keep `break` out of a shared cell which parts use for their colour.
- A part cannot hold parts: its `text` is a string or a number.
- A list with one part is the same as that part written as the cell. An empty list is no text. A cell can have 10 parts at most.

For example, with `"stack": { "use": "total", "break": true }` in `shared`, a totals row whose cells are `{ "use": "stack", "text": [...] }` shows what is gained over what is lost and keeps its columns narrow, while a totals column with `{ "use": "total", "text": [...] }` shows the two side by side and keeps its rows low. [`examples/access-review.json`](../examples/access-review.json) does both.

## Compression

A large table can be stored compressed. `data` is then the base64 of the gzip of the JSON of the table, which is the object that `data` would otherwise hold:

```json
{ "version": 1, "encoding": "gzip", "data": "H4sIAAAAAAAA..." }
```

The interface unpacks it in the browser. The base64 is the standard alphabet with padding, and the URL-safe alphabet is accepted too.

Why compress: Directus accepts request bodies of 1 MB by default (`MAX_PAYLOAD_SIZE`), every item read carries the value, and a collection which keeps revisions stores a copy with every write. A table of 100 by 200 cells is about 200 KB as it is and about 13 KB compressed. The largest table there can be, 200 by 1,000, is between 0.9 and 1.6 MB as it is, depending on how long the names in `shared` are, and under 100 KB compressed.

Why not always: a compressed value cannot be read in the database, in the raw value editor, in revisions or by anything else which reads the field. A sensible rule is to store small tables as they are and to compress above a size of your choosing, such as 32 KB.

In JavaScript (Node):

```js
import { gzipSync } from 'node:zlib';

const value = { version: 1, encoding: 'gzip', data: gzipSync(JSON.stringify(table)).toString('base64') };
```

In Go:

```go
var packed bytes.Buffer
writer := gzip.NewWriter(&packed)

if err := json.NewEncoder(writer).Encode(table); err != nil {
	return err
}

if err := writer.Close(); err != nil {
	return err
}

value := map[string]any{
	"version":  1,
	"encoding": "gzip",
	"data":     base64.StdEncoding.EncodeToString(packed.Bytes()),
}
```

In Python:

```python
import base64, gzip, json

value = {
    "version": 1,
    "encoding": "gzip",
    "data": base64.b64encode(gzip.compress(json.dumps(table).encode("utf-8"))).decode("ascii"),
}
```

## Limits

| What | Limit | Beyond it |
|---|---|---|
| Columns | 200, counting the first column | The table is rejected. |
| Rows | 1,000, counting headings | The table is rejected. |
| Parts in a cell | 10 | The table is rejected. |
| Text and tips | 200 characters | Cut, ending in three dots. |
| A compressed table | 8 MB packed, and 8 MB unpacked | The table is rejected. |

A table over a limit is never cut, because the part left out could be the part which matters, such as the totals. A writer with more to show has to choose what to leave out, and can say so in a row of the table.

Every cell is an element in the page, so the time to draw a table grows with its number of cells. In Chrome on a current laptop, 100 by 200 takes about half a second and scrolls smoothly, and the largest table there can be takes about four seconds, during which the page does not respond.

## Invalid values

A value which breaks the format is not drawn at all. The field shows "Unable to display this table" and the first problem found, with the place it was found in:

| Message | Meaning |
|---|---|
| `version "2" is not supported, expected 1` | Another version of the format, or a value in another format altogether. |
| `data must be an object` | `data` is missing, or the table sits next to `version` and not inside `data`. |
| `data is text, which needs "encoding": "gzip"` | A compressed table without its `encoding`. |
| `encoding "zstd" is not supported, expected "gzip" or none` | gzip is the only encoding. |
| `data is not valid base64`, `data is not valid gzip`, `data does not unpack to valid JSON` | The step of unpacking which failed. |
| `data unpacks to more than 8 MB` | The compressed table is too large. |
| `columns must be an array`, `rows must be an array` | A required field is missing. |
| `rows[4] has 5 cells but there are 6 columns` | A row is neither as long as the header row nor a heading. Indexes count from 0. |
| `rows[4][2] is "gained", which is not a name in shared` | A cell written as a string which names no shared cell. |
| `rows[4][2].color "red" must be a hex colour such as #E35169 or a theme variable such as var(--theme--success)` | See [Colours](#colours). |
| `shared["total"] uses itself: "total" > "plus" > "total"` | Shared cells which lead back to each other. |
| `columns has 201 cells, and a table can have at most 200 columns` | See [Limits](#limits). |

## Writing the value

The interface is read-only and never changes the value, so something else writes it. With the REST API:

```sh
curl -X PATCH "https://directus.example.com/items/reviews/42" \
	-H "Authorization: Bearer $TOKEN" \
	-H "Content-Type: application/json" \
	--data @- <<'JSON'
{ "table": { "version": 1, "data": { "columns": [{ "text": "Name" }, { "text": "Count" }], "rows": [[{ "text": "One" }, { "text": 1 }]] } } }
JSON
```

Here `reviews` is the collection and `table` the JSON field. A flow can do the same with an "Update Data" operation, and a hook or an endpoint with the items service. Mark the field as read-only in the Data Model so that the form never offers to edit it.

Text in the table may come from anywhere, user input included: the interface shows it as text. What the writer has to get right is the structure, and the list of [limits](#limits).
