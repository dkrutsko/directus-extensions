# directus-extension-meter

[![npm](https://img.shields.io/npm/v/directus-extension-meter)](https://www.npmjs.com/package/directus-extension-meter)
[![license](https://img.shields.io/npm/l/directus-extension-meter)](https://opensource.org/licenses/MIT)

A meter interface and display for [Directus](https://directus.io). A number which something else keeps up to date, such as a completion percentage written by a flow, a score, a quota used or a count of finished tasks, is drawn as a bar which is filled as far as the value has come between a minimum and a maximum, with the value as text beside it. In a read-only field it is a reading: nothing in it changes the field, and it is as legible as any other meter, where the stock Slider looks like a greyed-out control. In a field which can be edited the same bar is also the control: a click, a drag or the arrow keys set the value. The stock displays show the number, not where it stands in its range. The display draws the same bar in a layout, in the same length on every row, so a column can be compared at a glance.

![An item form with a stock input, six meters and a stock Slider. Each meter is a bar across its field with a line under it, the caption at its start and the value at its end: a percentage, seven tasks of twelve in amber, a budget in red with its value, storage at 150%, a field without a value as a dashed outline with a dash, and a read-only score](https://raw.githubusercontent.com/dkrutsko/directus-extensions/main/packages/meter/docs/images/form-light.png)

## Features

- **A bar against a range.** Any minimum and maximum, negative and fractional ones included. Without any, the range is 0 to 100.
- **The value as text,** at the end of the row: the percentage ("58%"), the value itself ("7") or the value over the maximum ("7 / 12"), written the way the language of the user writes numbers. It can be switched off.
- **Honest at the edges.** The percentage is a whole number, but a value which is not yet at the maximum never reads "100%", and one which has left the minimum never reads "0%". A value beyond the range fills or empties the bar and prints what it is, such as "150%". A field without a value has a dashed outline and a dash, and does not pass for a field at zero.
- **Colour by value.** A list of thresholds gives the bar another colour from a value upward: red below 50, amber from 50, green from 80. It works in the form and in every layout.
- **Colour by place.** The same colours can belong to the places on the scale instead of to the current value: in steps, or blended into a gradient across the whole track, of which the fill shows its part. What is not filled can show them too, faded.
- **One bar, or a row of pieces.** The track can be cut into pills, segments, bars or dots, each of which is filled or not: five dots for a rating out of five, twenty segments for a percentage, fifty thin bars like a level meter. How many are drawn depends on the width the meter has. The text keeps the exact value.
- **A caption** under the bar, at the start of the line which has the value at its end, typed in or picked from the translation strings of the project.
- **A display for layouts.** A short bar and the text, on one line: in the table at every row height, in cards, in the templates of related items and in the title of an item. Every bar is the same length.
- **Configured once.** The display takes every option which it does not set itself from the interface of the field. It also reads the limits of the stock Input and the stock Slider, so it works on a field of either without any options.
- **Lines up with the form.** Everything of the meter is inside an area as high as a stock input: the bar across the field, and under it one line with the caption and the value. The note of a field is therefore where it is under an input, and a meter beside an input, a dropdown or a toggle takes the same room. There is no box around it. The text is in the app's size and colour.
- **Set with the pointer and the keys,** unless the field is read-only: by where the pointer is, by the piece it is on, or by how far it moves, in steps of your choosing. What is written is always on those steps, within the range and in the type of the field.
- **A reading where the field is read-only.** A read-only meter cannot be changed, is no tab stop, and is not dimmed: a number which a flow maintains is normally read-only, and it stays as legible as any other.
- **A real meter for assistive technology:** the role `meter`, or `slider` where it can be edited, with its range, its value and the text which is printed, named by the caption or else by the field.
- **Looks like Directus** in light, dark and custom themes, follows right-to-left languages, and has no animation.
- **Self-contained.** One app bundle of about 36 KB which imports only `vue` and `@directus/extensions-sdk`.

![The same form in the dark theme](https://raw.githubusercontent.com/dkrutsko/directus-extensions/main/packages/meter/docs/images/form-dark.png)

## Installation

Choose one:

- **Marketplace.** In Directus go to Settings, Marketplace, search for `meter` and install. App-only extensions such as this one are listed under the default `MARKETPLACE_TRUST` setting.
- **npm.** In the project that runs Directus run `npm install directus-extension-meter`. Directus discovers extensions listed in the root `package.json` on startup.
- **Local folder.** Run `npm pack directus-extension-meter`, unpack the archive into `<EXTENSIONS_PATH>/directus-extension-meter` (`EXTENSIONS_PATH` defaults to `./extensions`) with `tar -xzf directus-extension-meter-*.tgz --strip-components 1 -C <that folder>`, then restart Directus. The archive holds `package.json` and `dist/`, which is all Directus needs at run time.

## Usage

1. Restart Directus if you installed via npm or a local folder, and reload the Data Studio, which fetches extensions once when it starts.
2. Settings, Extensions: confirm **directus-extension-meter** is enabled. It is a bundle of two entries, the interface and the display.
3. Settings, Data Model, open a collection and create a field. Choose **Meter**, in the "Other" group beside the Slider, and one of the types Integer, Big Integer, Float or Decimal. To use it for a field which already exists, open the field and set **Interface** to **Meter**.
4. Set the range, and under Display pick **Meter**, which the interface suggests. The display needs no options of its own.
5. If the number is kept up to date by something else and editors should not set it, tick **Read-only** in the field's settings.

A meter can be edited wherever its field can: see [Editing](#editing). **To keep a meter a reading,** as for a number which a flow, the API or an import keeps up to date, open the field in Settings, Data Model and tick **Read-only**. The meter then looks the same and cannot be changed. This is new in this version: before it, a meter never changed its field, whatever the field's settings were. A field whose meter should stay a reading has to be marked read-only now.

### Options

Every option is optional.

| Key | Name | Default | Description |
|---|---|---|---|
| `min` | Minimum Value | `0` | The value at which the bar is empty. |
| `max` | Maximum Value | `100` | The value at which the bar is full. |
| `label` | Label | none | A caption under the bar, at the start of its line. A long one wraps, and the field grows with it. It can be typed in, or picked from the translation strings of the project. It is also the name of the meter for a screen reader; without one that is the name of the field. |
| `indicator` | Value Text | on | Shows the value as text under the bar, at the end of the line. |
| `indicatorFormat` | Format | `percent` | What the text says. `percent`: how far the value has come in the range, "58%". `value`: the value itself, "7". `fraction`: the value over the maximum, "7 / 12". |
| `visualization` | Visualization | `contiguous` | How the track is drawn. `contiguous`: one bar, filled exactly as far as the value has come. `pills`: pieces which are round at both ends. `segments`: pieces with square edges between them, so the row reads as one rounded bar which is cut. `bars`: thin square pieces, many of them, like a level meter. `dots`: circles. A piece is filled or it is not. |
| `subdivisions` | Subdivisions | automatic | How many pieces are wanted, 2 or more. Empty means automatic: one for every unit of the range, or as many as fit. The width is the ceiling: where the number does not fit, fewer are drawn. The options form asks for it only while the visualization is not `contiguous`, which ignores it. |
| `dotsLayout` | Dots Layout | `packed` | Where dots stand. `packed`: from the start, a fixed distance apart. `spread`: the first at the start edge, the last at the end edge, equal gaps between. The options form asks for it only for `dots`. |
| `color` | Color | the primary colour | The colour of the bar. The colour picker stores a hex colour; a theme variable such as `var(--theme--danger)` can be written by hand. |
| `thresholds` | Thresholds | none | A list of entries with a `value` and a `color`. From its value upward the bar has the colour of an entry. |
| `activeColoring` | Active Coloring | `value` | The colours of what is filled. `value`: one colour, that of the current value. `blend`: one colour as well, which shifts towards the colour of the next threshold as the value comes near it. `steps`: each place on the scale has the colour of its own threshold. `gradient`: those colours blended from one to the next along the track. |
| `inactiveColoring` | Inactive Coloring | `plain` | The colours of what is not filled. `plain`: the track. `automatic`: as what is filled, faded. `value`, `blend`, `steps`, `gradient`: that one, faded, whatever what is filled has. |
| `input` | Input Method | `automatic` | How the pointer sets the value, in the interface. `contiguous`: the value is where the pointer is along the track. `segment`: the pieces up to the one under the pointer are filled. `relative`: the value moves by as much as the pointer moves. `automatic`: `segment` where every piece is exactly one step, `contiguous` otherwise. |
| `step` | Step | `1` | The distance between two values which can be set, counted from the minimum, in the interface. |
| `sensitivity` | Sensitivity | `1` | For `relative` only: how many times the range one width of the meter covers. The options form asks for it only while the input method is `relative`. |

How they are read:

- **The range.** A limit is a number, or the text of a number. Anything else counts as not set, and each limit has its own default. A minimum above the maximum counts as the two swapped. When both are the same number, the bar is empty below that number and full from it upward.
- **Thresholds.** The bar takes the colour of the entry with the highest `value` which the field's value has reached, and the `color` option while it is below all of them. The order of the list does not matter. An entry without a number or without a colour is left out. Values are in the units of the field, not in percent, and may lie outside the range: an entry at 101 colours only what is over a maximum of 100.
- **The visualization, the layout of the dots and the two colourings.** Each is one of its words. Anything else, and no word at all, is the default.
- **The input method.** One of its four words. Anything else is `automatic`.
- **The step and the sensitivity.** A number above zero, or the text of one. Zero, a negative number and anything else is 1. On a field of the type Integer or Big Integer the step is rounded to a whole number of at least 1. A field which was a stock Slider keeps that Slider's step (`stepInterval`), and the Meter uses it while its own step is empty; the options form shows it as the placeholder.
- **The number of subdivisions.** A whole number, or the text of one. Below 2 it counts as 2. Anything else, such as 3.7, counts as not set, which is automatic.
- **Colours.** A colour is a hex colour (`#RGB`, `#RGBA`, `#RRGGBB` or `#RRGGBBAA`) or one theme variable (`var(--theme--...)`). Anything else, which only a schema written by hand can hold, is ignored, and the default is used.

### Pills, segments, bars and dots

![Six meters in a form: one bar at 62%, ten pills of which six are filled, twenty segments of which twelve are filled and fifty thin bars of which thirty-one are filled for the same 62%, five dots of which four are filled for a rating of 4.2, and eight dots spread from edge to edge of which five are filled](https://raw.githubusercontent.com/dkrutsko/directus-extensions/main/packages/meter/docs/images/visualizations-light.png)

With any visualization but `contiguous` the track is a row of pieces, and each piece is filled completely or not at all.

- **The shapes.** Pills, segments and bars share the width of the field in equal parts, as high as the bar. Pills are round at both ends, 4px apart. Segments have square edges between them, 3px apart, and only the two outer ends of the row are round. Bars are square and 2px apart. Dots are circles as high as the bar which do not stretch: packed they stand 6px apart from the start of the field, spread they stand from one edge to the other.
- **How many pieces are wanted.** The number in `subdivisions`. Without one, one piece for every unit of the range where the range, maximum minus minimum, is a whole number of at least 2: a meter from 0 to 5 wants five, one from 0 to 100 a hundred. Any other range, such as 0 to 1 or 0 to 2.5, wants no number in particular.
- **How many fit.** A piece has a smallest width: 20px for a pill, 14px for a segment, 3px for a bar, and a dot is 12px. As many as the width of the field has room for at that size, with their gaps, is how many fit. The meter measures its own width, and counts again when the form or the window changes.
- **How many are drawn.** What is wanted, where it fits. Where it does not, the largest number which fits and divides what is wanted, so that every piece stands for a round share: a meter from 0 to 100 with room for 29 pills draws 25, one piece for every four; twelve wanted with room for seven draws six. Where no such number exists, as for 13, and where no number is wanted, as many as fit. Where not even two fit, the meter is one bar. There are never more than 200 pieces, whatever the width and whatever is asked for.
- **How many are filled.** The share of the range which the value has reached, times the number of pieces, rounded to the nearest whole number. Of ten pieces on 0 to 100, 44 fills four and 45 fills five; 4 fills none and 96 fills all ten. A value beyond the range fills all or none. The filled pieces are the first ones, from the side where the text starts.
- **The text is exact.** It says "44%" beside four filled pieces of ten, and so do the tooltip of the display and what a screen reader hears. Only the drawing is rounded.
- **A field without a value** has every piece as a dashed outline, none filled, and a dash as its text.

Two things follow from this, and both are meant:

- **The look depends on the width.** The same field can have ten pills in half of the form, 25 in a field as wide as the form and five in a table. A number which is set is kept wherever it fits; set a small one, or give the meter a range of a few units, for a meter which should look the same everywhere.
- **A coarse meter rounds.** Five pieces for 0 to 100 show 44 and 58 alike, as two filled, and nothing marks a value just above the minimum. The text beside the pieces is what says the value.

### Colouring

![Six meters at 62% with a red colour, amber from 40 and green from 80 (the colouring `blend` is not in this picture): one bar in amber on the plain track, the same with the track in faded amber, one bar which is red up to 40 and amber after it with the rest of the track in faded amber and faded green, one bar which blends from red over amber towards green and goes on, faded, to the end, ten pills in steps, and fifty thin bars which blend](https://raw.githubusercontent.com/dkrutsko/directus-extensions/main/packages/meter/docs/images/coloring-light.png)

The `color` and the `thresholds` say which colour a value has. The two colourings say where that shows.

- **`value`,** the default: everything which is filled has one colour, that of the current value. The whole fill turns amber when the value reaches the amber threshold.
- **`blend`:** one colour for everything which is filled, like `value`, but it is the colour the gradient has where the value stands. Half way between the amber threshold and the green one the whole fill is half way between amber and green, so the colour shifts little by little as the value moves and never jumps. From the last threshold on it is that threshold's colour.
- **`steps`:** a colour belongs to a place on the scale. Each place has the colour a meter standing there would have, so the bar is red up to the amber threshold and amber from there on, whatever the value is. A piece has the colour of the value it reaches when it is filled completely.
- **`gradient`:** the same colours, blended from one to the next: the `color` at the minimum, and the colour of each threshold at its value. The blend spans the whole track and the fill shows the part it covers; it is never squeezed into what is filled. A piece shows its own part of it.
- **What is not filled** is the plain track by default. With `inactiveColoring` it is coloured in one of the same four ways and faded: mixed with seven parts of the track's colour to three of its own, in every theme. `automatic` is the way of what is filled, so a gradient goes on, weaker, to the end of the track. `value` there is a faded tint of the colour of the current value, and `blend` a faded tint of the blended one.
- **Without thresholds** there is one colour, and the four ways are the same.
- **A place keeps its colour.** In `steps` and `gradient` a colour belongs to a place on the track, and it stays there to the pixel while the value changes: the fill only uncovers more or less of the same picture.
- **A field without a value** is not tinted: it keeps its dashed outline.
- A threshold at or below the minimum gives the minimum its colour. One beyond the maximum is beyond the track: steps never reach it, and a gradient blends towards it without arriving.

### What the text says

| Format | 7 of 0 to 12 | 150 of 0 to 100 | 0.4 of 0 to 100 |
|---|---|---|---|
| `percent` | 58% | 150% | 1% |
| `value` | 7 | 150 | 0.4 |
| `fraction` | 7 / 12 | 150 / 100 | 0.4 / 100 |

- The percentage is rounded to a whole number. A value strictly inside the range prints at least 1% and at most 99%, so the text says "0%" and "100%" only when they are true.
- The value and the maximum are printed with at most two decimals, and a number below 1 with its first two digits which count, so 0.004 is not "0". A number of sixteen digits or more, or one below a millionth, is written with an exponent.
- Numbers follow the language of the user: the decimal mark, the grouping of thousands and the place of the percent sign. German prints "1.250,5" and "58 %".
- The text is always whole. Beside a caption it keeps its place at the end of the line and the caption wraps; in a field too narrow for a few words of caption beside it, it goes under the caption. In a field narrower than the text itself it is left out. A screen reader hears the value either way.

### Values outside the range, and no value

- **Beyond the range** the bar stays within its track, full or empty, and the text is not held back: 150 of 100 prints "150%", and -20 prints "-20%". The number is what says that the value is beyond the range.
- **Just above the minimum** the bar shows a dot, as wide as the bar is high, so the smallest value can be told from none. A row of pieces has no such mark: of ten, a value below a twentieth of the range fills none, and the text is what tells it from zero.
- **A field without a value** (`null`, as on a new item without a default) is not a field at zero: the track is a dashed outline without a fill, the text is a dash, and a screen reader hears "No value" in the language of the user. A value which is not a number, which only a field of another type could hold, is treated the same.

### Editing

A meter in a form can be set with the pointer and the keyboard, unless the field is read-only, disabled by a condition or by the permissions of the user, or shown where nothing can be edited, as in the comparison of two revisions. There it is the reading described above and nothing done to it changes anything.

**With the pointer** (mouse, pen or finger, the main button only). A drag goes on when the pointer leaves the field. A finger which moves sideways edits, and one which moves up or down scrolls the page as before.

- **`contiguous`:** a press sets the value under the pointer, and a drag follows it. Past either end of the track it is the minimum or the maximum.
- **`segment`:** a press or a drag fills the pieces up to and including the one under the pointer, and the value is that many of them: the third of five pieces on 0 to 5 is 3. A pointer between two pieces counts for the one before it. Before the start of the first piece it is the minimum, beyond the last one the maximum. Packed dots are where the dots are, not the whole width of the field. While the pointer rests over the meter, the pieces it would fill are marked; during a drag nothing is marked, since the fill itself follows the pointer.
- **`relative`:** a press changes nothing. Moving towards the end of the track raises the value and moving towards its start lowers it, by the share of the meter's width which the pointer has moved, times the sensitivity: at 1, one width covers the whole range. Holding Shift makes it ten times finer. The meter asks the browser to lock the pointer for the drag, so the cursor disappears and the movement has no edge to run into; the lock ends with the release of the button. Where the browser refuses the lock or has none, and for a finger, the same works as an ordinary drag.
- **`automatic`,** the default, is `contiguous` for the one bar. For pills, segments, bars and dots it is `segment` where every piece stands for exactly one step, as five dots do on 0 to 5, and `contiguous` otherwise, as for ten pills on 0 to 100, where a piece is ten steps and filling by the piece could only ever give 10, 20, 30. It is never `relative`. Where `segment` is set by hand on such a meter, a press on a piece writes the value nearest to that piece's share which leaves exactly the pieces up to it filled.

**With the keyboard.** The meter is one tab stop.

| Key | What it does |
|---|---|
| Right, Up | One step up. |
| Left, Down | One step down. |
| Page Up, Page Down | Ten steps up or down, or one piece where a piece is more than that. |
| Home, End | The least and the most which can be set. |
| Escape | During a drag: puts back the value from before the press, and ends the drag. |

In a right-to-left language Left and Right swap, as the track itself does.

**The value which is written.**

- **On the steps.** The values which can be set are the minimum, the minimum plus one step, plus two, and so on, and the maximum, also where the steps miss it: steps of 3 from 0 to 10 give 0, 3, 6, 9 and 10. A step up from a value between two of them goes to the next one.
- **Within the range,** always.
- **A whole type keeps to whole numbers.** On a field of the type Integer or Big Integer whose limits are not whole, such as 0.5 to 5.5, the values which can be set are the whole numbers within the range, 1 to 5, and the steps are counted from the first of them. The bar is still drawn against the limits as they are; a screen reader is told the range which can be set.
- **A step larger than the range** leaves two values, the two ends, and the nearer one is written. **A step so small that the range holds more than a thousand million of them** is no step: the value under the pointer is written as it is, to twelve digits.
- **A plain number,** as the stock Slider writes one for every type. A step of 0.1 writes 0.3 and not 0.30000000000000004. A field of the type Integer or Big Integer gets a whole number.
- **Only a change is written.** A click where the value already is leaves the item unchanged.
- **A field without a value** gets one from the first press with `contiguous` and `segment`, from the first movement of a drag with `relative`, where a press alone changes nothing, and from the first key with all three. A value which was stored beyond the range is shown as it is, and comes into the range in the same way: with the first press, the first movement or the first key.
- **Nothing clears the value.** **Clear Value** in the menu of the field's label does that.
- Escape puts back exactly what the field held before the press, whatever that was.

**What shows that a meter can be edited:** the cursor over the track, a dot inside the bar at the end of the fill while the pointer is over it, while it has the focus of the keyboard and during a drag, and a ring around the track while it has that focus. None of it takes any room: a meter which can be edited is as high as one which cannot, and its caption, its text and the note of the form are in the same places.

### By value, in the form

The conditions of a field (Settings, Data Model, the field, **Conditions**) can replace any option while a rule on the item matches, as for every interface: another caption below 20, for example. They apply in the form only. For a colour by value which also shows in layouts, use the thresholds.

## The display

![The table layout with the display in four columns: bars of the same length with a percentage, tasks out of twelve in red, amber and green, a budget with its value, and a review score with the dash of Directus where there is none](https://raw.githubusercontent.com/dkrutsko/directus-extensions/main/packages/meter/docs/images/display-light.png)

The **Meter** display (`meter`) is for the same field in a layout. It draws a bar of a fixed length, 4.5rem, and then the text, on one line.

- **It is never edited.** `input`, `step` and `sensitivity` are options of the interface alone.
- **It has the other options of the interface,** under the same keys: `min`, `max`, `label`, `indicator`, `indicatorFormat`, `visualization`, `subdivisions`, `dotsLayout`, `color`, `thresholds`, `activeColoring` and `inactiveColoring`.
- **An option which was never set is taken from the interface of the field,** each on its own. A field which is set up with the Meter interface needs no display options at all, and its form and its layouts cannot disagree. The options form of the display shows what it takes over: the limits, the caption and the number of subdivisions as placeholders, the rest as the state of its inputs. Nothing of that is stored until an option is changed.
- **An option which is set is the display's own,** whatever the interface has. So a field which had display options before, with a range, caption or colour other than its interface's, keeps drawing by them.
- **An option which is emptied again** depends on which one it is, and the options form always shows what is drawn. Emptied limits, an emptied caption, an emptied number of subdivisions and an emptied dropdown of the visualization, of the layout of the dots or of a colouring are taken from the interface again, and their placeholders say so. Those dropdowns have a choice "Deselect" in the options form of the display for that. An emptied colour or list of thresholds stays empty and means none here: the primary colour, and no thresholds, also where the interface has some.
- **The limits of stock interfaces are understood too:** `min` and `max` of the stock Input, and `minValue` and `maxValue` of the stock Slider. So the display works on a field of either, as it is.
- **Without any options anywhere** the range is 0 to 100.
- **Pieces are drawn in a layout as well,** by the display's own options or else by the interface's, each on its own. Nothing is measured there: the bar of the display has one length, 72px, so the same options give the same number of pieces in every row. At most 7 pills (8px or wider, 2px apart), 9 segments (6px, 2px apart), 24 bars (2px, 1px apart) or 9 dots (circles of 6px, 1.5px apart) fit, and the rule is the one of the form: a meter from 0 to 100 draws five pills, five segments, twenty bars or five dots. Packed dots are a row as long as its dots; spread dots take the length of the bar. The colourings work as in the form.
- **The caption has no room in a layout.** It is in the tooltip which shows when the mouse rests on the bar, in front of the value, and it is the name of the meter for a screen reader.
- **The text is whole, or it is left out.** A column without room for the whole text beside the bar shows the bar alone, without an ellipsis; the tooltip and a screen reader still have the value. A column of the default width has room for "100%". A longer text, such as "35 / 60" or "24,350.5", needs a wider column. A column narrower than the bar cuts the bar at the edge of the cell. In a display template the bar and the text are each one piece: where one does not fit the line, the ellipsis of the template stands for it.
- **A number never shows in part,** in the display or in the form, in any language and in either direction. A part of a number reads as another number, whether it is its first digits or its last, with or without an ellipsis after it.
- **A field without a value** shows the dash Directus shows for every empty field. A value which is not a number is shown as it is.
- **Where Directus needs plain text** instead, as in the titles of the calendar layout, the display gives the text beside the bar, such as "58%" or "7 / 12".

A display can therefore have another range, caption, visualization, colouring, colour or list of thresholds than its interface, and no colour or thresholds where the interface has some. It cannot have no caption where the interface has one. Once the colour or the thresholds of a display were set or emptied, they no longer follow the interface.

## The value

The field holds a plain number. The display never writes it, and the interface writes it only as described under [Editing](#editing): a number on the steps, within the range. Filters, the API and other displays see what they would see with any other interface. A `decimal` or a `bigInteger` which the database returns as text is read as its number; a number too large to be held exactly is drawn at the nearest value which can.

## Compatibility

Built and tested against Directus 11.17.4. The `host` range starts at 11.15.0, but only 11.17.4 has been tested. It has not been run against Directus 12.

The browser tests run in Chrome. The form and the table were also looked at in Firefox and Safari's engine, where they draw the same; it has not been tried with a screen reader.

### Coming from the stock Slider or Input

Directus keeps the options of a field when its interface changes. A field which was a Slider keeps its `minValue` and `maxValue`, and the Meter reads them wherever its own `min` and `max` are not set, so the range carries over; the options form shows them as the placeholders of the two limits. `min` and `max` of the stock Input are the Meter's own keys. The Slider's step, `stepInterval`, is the Meter's step while it has none of its own. The other options of both are ignored.

A field can end up with both pairs, for example one which was a Meter or an Input with `min` and `max` and was then made a Slider with limits of its own. `min` and `max` then count, for the interface and for the display alike. That is also what the stock Slider of Directus 11.17.4 draws on such a field: it runs from `min` to `max` whatever its own two options say. To give such a field another range, change `min` and `max`, which the options form of the Meter has as its two limits.

## Limitations

- A meter can be edited wherever its field can. There is no option which makes it a reading: the field's own **Read-only** setting does that.
- No gesture types a number or clears the value. **Edit Raw Value** and **Clear Value** in the menu of the field's label do.
- The relative method needs a browser which locks the pointer for the disappearing cursor; without one it is an ordinary drag, which ends at the edge of the screen.
- Horizontal, in one height. There is no ring and no target marker.
- A piece is filled or not: there is no half-filled piece. How many pieces a meter has depends on its width, and can differ between the form and a layout. Packed dots do not use the width of a wide field; spread ones do.
- The colours of the gradient are blended by the browser in sRGB, from stop to stop. There are no other ways to blend, and no stops but the colour and the thresholds.
- The pieces are counted in pixels of the app's usual text size, 16 to the rem.
- A threshold means "from this value upward". There are no other comparisons.
- A minimum above the maximum is read as the two swapped, not as a meter which runs backwards.
- The text has no prefix or suffix. A unit can go into the caption.
- The names of the options "Value Text", "Thresholds", "Visualization", "Subdivisions", "Dots Layout", "Active Coloring", "Inactive Coloring", "Input Method", "Step" and "Sensitivity", the choices of their dropdowns, their notes, the notice in the options form of the display and the choice "Value / Maximum" are in English only. The caption, "No value" and the numbers follow the language of the user.

## Development

This package lives in the [directus-extensions](https://github.com/dkrutsko/directus-extensions) repository, whose README covers the setup, the test Directus and releasing. After `npm install` in the repository root, run these in `packages/meter`:

```bash
npm run dev       # watch build, unminified
npm run check     # vue-tsc, then tsc over the tests
npm test          # vitest
npm run build
npm run validate
```

The code is laid out as follows:

- `src/interface.ts` declares the interface, `src/interface.vue` is the meter of the form with its template and styles, and `src/preview.ts` is the drawing in the interface picker.
- `src/display.ts` declares the display with its text form, and `src/display.vue` draws it.
- `src/options.ts` is the options form which both entries share.
- `src/meter.ts` is everything which needs no browser: what the options and a value come to, how much of the track is filled, in how many pieces it is drawn and how many of them are filled, in which colour, and what the text says. It uses no Vue, DOM or Directus APIs, so the tests run it in Node.
- `tests` holds the unit tests of `src/meter.ts` and `src/options.ts`, and `sandbox` the browser tests which run in a real Directus.

## License

[MIT](https://github.com/dkrutsko/directus-extensions/blob/main/packages/meter/LICENSE)
