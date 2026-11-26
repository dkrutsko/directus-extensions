# directus-extension-meter

[![npm](https://img.shields.io/npm/v/directus-extension-meter)](https://www.npmjs.com/package/directus-extension-meter)
[![license](https://img.shields.io/npm/l/directus-extension-meter)](https://opensource.org/licenses/MIT)

A meter interface and display for [Directus](https://directus.io). A number which something else keeps up to date, such as a completion percentage written by a flow, a score, a quota used or a count of finished tasks, is drawn as a bar which is filled as far as the value has come between a minimum and a maximum, with the value as text beside it. In a read-only field it is a reading: nothing in it changes the field, and it is as legible as any other meter, where the stock Slider looks like a greyed-out control. In a field which can be edited the same bar is also the control: a click, a drag or the arrow keys set the value. The stock displays show the number, not where it stands in its range. The display draws the same bar in a layout, in the same length on every row, so a column can be compared at a glance.

![An item form with a stock input, six meters and a stock Slider. Each meter is a bar across its field with a line under it, the caption at its start and the value at its end: a percentage, seven tasks of twelve in amber, a budget in red with its value, storage at 150%, a field without a value as a dashed outline with a dash, and a read-only score](https://raw.githubusercontent.com/dkrutsko/directus-extensions/main/packages/meter/docs/images/form-light.png)

## Features

- **A bar against a range.** Any minimum and maximum, negative and fractional ones included. Without any, the range is 0 to 100.
- **The value as text,** at the end of the row: the percentage ("58%"), the value itself ("7") or the value over the maximum ("7 / 12"), written the way the language of the user writes numbers, with a prefix and a suffix where a unit belongs ("$4,200", "42 / 100 GB"). It can be switched off.
- **Honest at the edges.** The percentage is a whole number, but a value which is not yet at the maximum never reads "100%", and one which has left the minimum never reads "0%". A value beyond the range fills or empties the bar and prints what it is, such as "150%". A field without a value has a dashed outline and a dash, and does not pass for a field at zero.
- **Colour by value.** A list of thresholds gives the bar another colour from a value upward: red below 50, amber from 50, green from 80. It works in the form and in every layout.
- **Colour by place.** The same colours can belong to the places on the scale instead of to the current value: in steps, or blended into a gradient across the whole track, of which the fill shows its part. Or the one colour of the fill can shift from one threshold's colour towards the next as the value moves. What is not filled can show them too, faded.
- **One bar, or a row of pieces.** The track can be cut into pills, segments, bars or dots, each of which is filled or not: five dots for a rating out of five, twenty segments for a percentage, a row of thin bars like a level meter. How many are drawn depends on the width the meter has. The text keeps the exact value.
- **The way to the next piece.** Two options show what a few pieces cannot: the pieces which are not filled are drawn small and the next one grows as the value comes near it, or the next one takes on its colour little by little, or both.
- **A caption** under the bar, at the start of the line which has the value at its end, typed in or picked from the translation strings of the project.
- **A display for layouts.** A short bar and the text, on one line: in the table at every row height, in cards, in the templates of related items and in the title of an item. Every bar is the same length.
- **Configured once.** The display takes every option which it does not set itself from the interface of the field. It also reads the limits of the stock Input and the stock Slider, so it works on a field of either without any options.
- **Lines up with the form.** Everything of the meter is inside an area as high as a stock input: the bar across the field, and under it one line with the caption and the value. The note of a field is therefore where it is under an input, and a meter beside an input, a dropdown or a toggle takes the same room. There is no box around it. The text is in the app's size and colour.
- **Set with the pointer and the keys,** unless the field is read-only: by where the pointer is, by the piece it is on, or by how far it moves, in steps of your choosing or in steps which suit the range. What is written is always on those steps, within the range and in the type of the field.
- **A reading where the field is read-only.** A read-only meter cannot be changed, is no tab stop, and is not dimmed: a number which a flow maintains is normally read-only, and it stays as legible as any other. The input method "None" makes the same reading of a meter whose field can be edited.
- **A real meter for assistive technology:** the role `meter`, or `slider` where it can be edited, with its range, its value and the text which is printed, named by the caption or else by the field.
- **Looks like Directus** in light, dark and custom themes, follows right-to-left languages, and has no animation but two short ones: of pieces which grow or fade in, where that is switched on, and of the pieces under the pointer on a meter which is filled by the piece. Neither plays for a user who has asked for less motion.
- **Contrast themes and print.** Under a contrast theme of the system (forced colours) the bar is drawn in the system's own colours, with what is filled told from what is not, and a printed form or table keeps its bars.
- **Self-contained.** One app bundle of about 50 KB which imports only `vue` and `@directus/extensions-sdk`.

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

A meter can be edited wherever its field can: see [Editing](#editing). **To keep a meter a reading,** as for a number which a flow, the API or an import keeps up to date, open the field in Settings, Data Model and tick **Read-only**. The meter then looks the same and cannot be changed. This is new in 2.0.0: before it, a meter never changed its field, whatever the field's settings were. A field whose meter should stay a reading has to be marked read-only now, or have its **Input Method** set to **None**, which makes the meter the same reading while the field itself can still be changed by other means, such as **Edit Raw Value**.

### Options

Every option is optional. The interface has all of them. The display has all but the four which say "Interface only", and takes each one it does not set itself from the interface of the field: see [The display](#the-display).

| Key | Name | Type | Default | Description |
|---|---|---|---|---|
| `min` | Minimum Value | number | `0` | The value at which the bar is empty. |
| `max` | Maximum Value | number | `100` | The value at which the bar is full. |
| `label` | Label | text | none | A caption under the bar, at the start of its line. A long one wraps, and the field grows with it. It can be typed in, or picked from the translation strings of the project. It is also the name of the meter for a screen reader; without one that is the name of the field. |
| `indicator` | Value Text | on or off | on | Shows the value as text under the bar, at the end of the line. |
| `indicatorFormat` | Format | one word | `percent` | What the text says. `percent`: how far the value has come in the range, "58%". `value`: the value itself, "7". `fraction`: the value over the maximum, "7 / 12". |
| `prefix` | Prefix | text | none | Text before the number, for `value` and `fraction`: "$" gives "$4,200", and "$4,200 / $10,000" for a fraction, which has it before both numbers. It is joined on as it is typed: type a space where one is wanted. The options form asks for it only while the format is not `percent`, which ignores it. |
| `suffix` | Suffix | text | none | Text after the value text, for `value` and `fraction`: " GB" gives "42 GB", and "42 / 100 GB" for a fraction, which has it once, at the end. Joined on as typed too, so the space of " GB" has to be typed. Asked for like `prefix`, and `percent` ignores it too. |
| `visualization` | Visualization | one word | `contiguous` | How the track is drawn. `contiguous`: one bar, filled exactly as far as the value has come. `pills`: pieces which are round at both ends. `segments`: pieces with square edges between them, so the row reads as one rounded bar which is cut. `bars`: thin square pieces, many of them, like a level meter. `dots`: circles. A piece is filled or it is not. |
| `subdivisions` | Subdivisions | whole number | automatic | How many pieces are wanted, 2 or more. Empty means automatic: one for every unit of the range, or as many as fit. The width is the ceiling: where the number does not fit, fewer are drawn. The options form asks for it only while the visualization is not `contiguous`, which ignores it. |
| `dotsLayout` | Dots Layout | one word | `packed` | Where dots stand. `packed`: from the start, a fixed distance apart. `spread`: the first at the start edge, the last at the end edge, equal gaps between. The options form asks for it only for `dots`. |
| `grow` | Grow | number | `0` | Interface only. How many pieces in front of the fill can be growing at once. `0` is off. From any number above it the pieces which are not filled are drawn small; with `1` the next one grows to its full size as the value comes near it, and every further 1 lets the growth reach one piece further ahead. Up to 20. The options form asks for it only while the visualization is not `contiguous`, which ignores it. |
| `fade` | Fade In | on or off | off | The next piece takes on the colour of a filled one gradually, as the value comes near it, over as many pieces as `grow` says, or as with a `grow` of 1 where that is 0. Asked for like `grow`, and `contiguous` ignores it too. |
| `color` | Color | colour | the primary colour | The colour of the bar. The colour picker stores a hex colour; a theme variable such as `var(--theme--danger)` can be written by hand. |
| `thresholds` | Thresholds | list | none | A list of entries with a `value`, a number, and a `color`. From its value upward the bar has the colour of an entry. |
| `activeColoring` | Active Coloring | one word | `value` | The colours of what is filled. `value`: one colour, that of the current value. `blend`: one colour as well, which shifts towards the colour of the next threshold as the value comes near it. `steps`: each place on the scale has the colour of its own threshold. `gradient`: those colours blended from one to the next along the track. |
| `inactiveColoring` | Inactive Coloring | one word | `plain` | The colours of what is not filled. `plain`: the track. `automatic`: as what is filled, faded. `value`, `blend`, `steps`, `gradient`: that one, faded, whatever what is filled has. |
| `input` | Input Method | one word | `automatic` | Interface only. How the pointer sets the value. `position` ("By position"): the value is where the pointer is along the track. `piece` ("By piece"): the pieces up to the one under the pointer are filled. `relative`: the value moves by as much as the pointer moves. `automatic`: `piece` where every piece is exactly one step, `position` otherwise. `none`: the meter is not edited at all, and is drawn and behaves as in a read-only field. |
| `step` | Step | number | by the type and the range | Interface only. The distance between two values which can be set, counted from the minimum. Empty: 1 on a field of the type Integer or Big Integer, and on a Float or Decimal field the largest power of ten which gives the range at least a hundred steps, at most 1: 0.01 for 0 to 1, 0.1 for 0 to 10, 1 from a range of 100 on. The options form shows what it comes to as the placeholder, and does not ask for the step while the input method is `none`. |
| `sensitivity` | Sensitivity | number | `1` | Interface only, and for `relative` only: how many times the range one width of the meter covers. The options form asks for it only while the input method is `relative`. |

How they are read:

- **The range.** A limit is a number, or the text of a number. Anything else counts as not set, and each limit has its own default. A minimum above the maximum counts as the two swapped. When both are the same number, the bar is empty below that number and full from it upward.
- **Thresholds.** The bar takes the colour of the entry with the highest `value` which the field's value has reached, and the `color` option while it is below all of them. The order of the list does not matter. An entry without a number or without a colour is left out. Values are in the units of the field, not in percent, and may lie outside the range: an entry at 101 colours only what is over a maximum of 100.
- **The visualization, the layout of the dots and the two colourings.** Each is one of its words. Anything else, and no word at all, is the default.
- **`grow`.** A number from 0 to 20, or the text of one; more than 20 counts as 20. Anything else, and a negative number, is 0.
- **`fade`.** On or off. Anything else counts as not set, which is off.
- **The input method.** One of its five words. Anything else is `automatic`.
- **The step and the sensitivity.** A number above zero, or the text of one. A step or a sensitivity which is set to zero, a negative number or anything else is 1. On a field of the type Integer or Big Integer the step is rounded to a whole number of at least 1. A field which was a stock Slider keeps that Slider's step (`stepInterval`), and the Meter uses it while its own step is empty. With neither, the step is the one which suits the type and the range, as the table says: a range of one number, or limits which are not finite, have 1, and no such step is finer than fifteen decimals.
- **The prefix and the suffix.** Text which is not blank, kept as it was typed, with its spaces. Anything else counts as not set. It is text and nothing else: markup in it is printed as it is. A translation string of the project can be picked, as for the caption.
- **The number of subdivisions.** A whole number, or the text of one. Below 2 it counts as 2. Anything else, such as 3.7, counts as not set, which is automatic.
- **Colours.** A colour is a hex colour (`#RGB`, `#RGBA`, `#RRGGBB` or `#RRGGBBAA`) or one theme variable (`var(--theme--...)`). Anything else, which only a schema written by hand can hold, is ignored, and the default is used.

### Pills, segments, bars and dots

![Six meters in a form: one bar at 62%, ten pills of which six are filled, twenty segments of which twelve are filled and 57 thin bars, all of one width, of which 35 are filled for the same 62%, five dots 4px apart of which four are filled for a rating of 4.2, and eight dots spread from edge to edge of which five are filled](https://raw.githubusercontent.com/dkrutsko/directus-extensions/main/packages/meter/docs/images/visualizations-light.png)

With any visualization but `contiguous` the track is a row of pieces, and each piece is filled completely or not at all.

- **The shapes.** Pills and segments share the width of the field in equal parts, as high as the bar. Pills are round at both ends, 4px apart. Segments have square edges between them, 3px apart, and only the two outer ends of the row are round. Bars are square, 4px wide or wider and 2px apart or a little more, and every bar is exactly as wide as every other and every gap as wide as every other: whole numbers of the screen's own pixels, the ones with which that many bars fill the field best. What the field is wider than the row of bars stays empty at its end; bars which shared the width to the last fraction would be drawn some a pixel wider than others. Dots are circles as high as the bar which do not stretch: packed they stand 4px apart from the start of the field, spread they stand from one edge to the other.
- **How many pieces are wanted.** The number in `subdivisions`. Without one, one piece for every unit of the range where the range, maximum minus minimum, is a whole number of at least 2: a meter from 0 to 5 wants five, one from 0 to 100 a hundred. Any other range, such as 0 to 1 or 0 to 2.5, wants no number in particular.
- **How many fit.** A piece has a smallest width: 20px for a pill, 14px for a segment, 4px for a bar, and a dot is 12px. As many as the width of the field has room for at that size, with their gaps (4px, 3px, 2px and 4px), is how many fit. The meter measures its own width, and counts again when the form or the window changes.
- **How many are drawn.** What is wanted, where it fits. Where it does not, the largest number which fits and divides what is wanted, so that every piece stands for a round share: a meter from 0 to 100 with room for 29 pills draws 25, one piece for every four; twelve wanted with room for seven draws six. Where no such number exists, as for 13, and where no number is wanted, as many as fit. That middle rule is for pills and segments, which share the width. Bars and dots keep their size, so they leave it out: a number of them which does not fit becomes as many as fit. A row of bars or of packed dots then ends within a few pixels of the field's end, and spread dots are as many as packed ones and not sparser. A meter from 0 to 100 in half of the form, 342px, draws 57 bars of 4px with 2px left over, or 21 dots: packed with 10px left over, spread from edge to edge. A number of bars or of dots which fits is drawn as that number. Where not even two fit, the meter is one bar. There are never more than 200 pieces, whatever the width and whatever is asked for.
- **How many are filled.** The share of the range which the value has reached, times the number of pieces, rounded to the nearest whole number. Of ten pieces on 0 to 100, 44 fills four and 45 fills five; 4 fills none and 96 fills all ten. A value beyond the range fills all or none. The filled pieces are the first ones, from the side where the text starts.
- **The text is exact.** It says "44%" beside four filled pieces of ten, and so do the tooltip of the display and what a screen reader hears. Only the drawing is rounded.
- **A field without a value** has every piece as a dashed outline, none filled, and a dash as its text.

Two things follow from this, and both are meant:

- **The look depends on the width.** The same field can have ten pills in half of the form, 25 in a field as wide as the form and five in a table. A number which is set is kept wherever it fits; set a small one, or give the meter a range of a few units, for a meter which should look the same everywhere.
- **A coarse meter rounds.** Five pieces for 0 to 100 show 44 and 58 alike, as two filled, and nothing marks a value just above the minimum. The text beside the pieces is what says the value. `grow` and `fade`, below, show something of what lies between two pieces.

### Pieces which grow and fade in

![Eight meters in a form, each a little short of filling its next piece. Dots, pills and segments with a grow of 1: the pieces which are not filled are small, dots and pills in both directions and segments in their height, and the first of them is larger than the ones after it. 57 thin bars with a grow of 1: the three after the fill are a short ramp, each lower than the one before. Ten pills with a grow of 3: a ramp of three pills. 57 thin bars with a grow of 4: a ramp of ten bars. Five pills of which the fourth is a paler shade of the filled ones. And segments with both: the next one is higher than the rest and tinted](https://raw.githubusercontent.com/dkrutsko/directus-extensions/main/packages/meter/docs/images/grow-light.png)

A row of pieces says how many are filled, and nothing about how far the value has come towards the next one. Two options show that. They are separate, so a meter can have neither, one or both, and both are off until they are set.

- **`grow`,** a number: with anything above 0 the pieces which are not filled are drawn small. Dots have half their diameter, pills six tenths of their length and their height, segments and bars their full width and a third of their height. With 1 the piece which comes next grows from that size to its full size while the value comes the half of a piece which fills it. The size is drawn with fractions of a pixel, never rounded to whole ones.
- **The number is how many pieces can be growing at once.** A piece is filled once the value has come half of it. With 1 the growth reaches that half piece ahead of the fill. Every further 1 reaches one piece further: with 2 the next piece is always partly grown and the one after it starts when the next comes close to being filled; with 3 it is a ramp of up to three, each larger the nearer it is. Between 0 and 1 the growth starts later than half a piece before the fill: with 0.5 over the last quarter.
- **`fade`:** the piece which comes next has the look of a filled piece laid over it, by `activeColoring`, the more the nearer the value is. Under it the piece is what it was, by `inactiveColoring`.
- **With 1 only the next piece changes.** Until it is filled the next piece grows or fades in by how far the value has come of that last half, so it arrives at its full size and colour at the very moment it is filled, and nothing jumps; that holds for every number. At a value which is a whole number of pieces, such as 3 of 5, nothing is under way with 1: three pieces are filled and the others are small, or plain. With 2 or more something always is.
- **Thin bars grow over a short ramp.** Fifty bars set for 0 to 100 stand for two units each, and no whole number ever lies in the last half of such a bar: by the pieces alone they would never be seen growing. So for bars the growth reaches at least about 15px of the track ahead of the fill for each 1 of `grow`, where that is more than the pieces give: with 1 the next two or three thin bars are each higher the nearer they are to being filled, with 2 twice as many, and the ramp moves along with the value. Wide bars, and pills, segments and dots, go by the pieces alone.
- **The ramp comes out of the start of the scale as it runs into its end.** A meter at its minimum is empty: nothing is filled and nothing is under way, whatever the number. From there a ramp gets longer with the fill, one piece after the other, until it has its whole reach: the growth never reaches further ahead than the fill is long, plus the half piece which fills the first one. At the end of the scale the pieces which are left grow until all are full. So nothing appears or disappears at once anywhere between the minimum and the maximum. With a `grow` of 1 or less on pills, segments and dots this changes nothing, since there only the next piece ever grows.
- **`fade` uses the same reach:** that of `grow` where it is above 0, and that of 1 where it is 0. In the display, which has no `grow`, it is that of 1, for thin bars over about three of them.
- **Nothing moves.** A small piece is drawn smaller about its middle, in the place it has anyway. The gaps, the number of pieces, the height of the field and where a press counts are the same with and without it: a press on the place of a small piece fills up to it.
- **A short transition** of about a seventh of a second when the value changes by a press, a key or from outside; a change which comes during it goes on from where the size is. There is none for a user who has asked the system for less motion, nor when a form opens.
- **While the pointer drags the value** by its place or by how far it moves, the growing and the fading follow the pointer itself and not the steps of the value: with steps of ten the value stays 40 until the pointer is half way to 50, and the next piece grows all the while. The fill, the text and what is written stay on the steps. At the release the sizes settle on what the value gives. Where a step is more than half a piece, the value can fill a piece before the pointer has reached it.
- **`grow` is for the form.** The pieces of the display in a layout are too small to be drawn smaller: the display never grows them, whatever its interface does, and has no such option. `fade` works in both, and the display takes it from the interface like any other option.
- **A field without a value** keeps its dashed outlines, and one bar has no pieces to grow.

### Colouring

![Eight meters at 62% with a red colour, amber from 40 and green from 80: one bar in amber on the plain track, the same with the track in faded amber, one bar in a colour between amber and green, ten pills in that colour with the rest faded, one bar which is red up to 40 and amber after it with the rest of the track in faded amber and faded green, one bar which blends from red over amber towards green and goes on, faded, to the end, ten pills in steps, and 57 thin bars which blend](https://raw.githubusercontent.com/dkrutsko/directus-extensions/main/packages/meter/docs/images/coloring-light.png)

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
- A `prefix` and a `suffix` are part of the text of `value` and `fraction`, wherever it goes: under the bar, in the tooltip of the display, in what a screen reader hears and in the plain text of the display. The value has both around it, "$4,200" or "42 GB". The fraction has the prefix before each of its two numbers and the suffix once, at the end: "$4,200 / $10,000", "42 / 100 GB". Nothing is put between them and the number, so a space which is wanted has to be typed, as the first character of " GB". A percentage has neither, and neither has the dash of a field without a value.
- The text is always whole. Beside a caption it keeps its place at the end of the line and the caption wraps; in a field too narrow for a few words of caption beside it, it goes under the caption. In a field narrower than the text itself it is left out. A screen reader hears the value either way.

### Values outside the range, and no value

- **Beyond the range** the bar stays within its track, full or empty, and the text is not held back: 150 of 100 prints "150%", and -20 prints "-20%". The number is what says that the value is beyond the range.
- **Just above the minimum** the bar shows a dot, as wide as the bar is high, so the smallest value can be told from none. A row of pieces has no such mark unless its pieces grow or fade in: of ten, a value below a twentieth of the range fills none, and the text is what tells it from zero.
- **A field without a value** (`null`, as on a new item without a default) is not a field at zero: the track is a dashed outline without a fill, the text is a dash, and a screen reader hears "No value" in the language of the user. A value which is not a number, which only a field of another type could hold, is treated the same.

### Editing

![Two meters in a form which can be edited. One bar with the focus of the keyboard: a ring around the track and a small dot inside the bar at the end of its fill. Five pills of which two are filled, with the pointer over the fourth: the first four are drawn larger than the fifth, the two filled ones and the two which are not, each in its own colour](https://raw.githubusercontent.com/dkrutsko/directus-extensions/main/packages/meter/docs/images/editing-light.png)

A meter in a form can be set with the pointer and the keyboard, unless the field is read-only, disabled by a condition or by the permissions of the user, or shown where nothing can be edited, as in the comparison of two revisions, or unless its input method is `none`. There it is the reading described above and nothing done to it changes anything.

**With the pointer** (mouse, pen or finger, the main button only). A drag goes on when the pointer leaves the field.

- **`position`** (By position): a press sets the value under the pointer, and a drag follows it. Past either end of the track it is the minimum or the maximum.
- **`piece`** (By piece): a press or a drag fills the pieces up to and including the one under the pointer, and the value is that many of them: the third of five pieces on 0 to 5 is 3. A pointer between two pieces counts for the one before it. Before the start of the first piece it is the minimum, beyond the last one the maximum. Packed dots are where the dots are, not the whole width of the field. The pieces up to the pointer are drawn larger than the others, filled or not and each in its own colour, while the pointer rests over the meter and all through a drag, so the large pieces always end where the pointer is: bars and segments half as high again, dots a pixel more on every side, pills a pixel more at each end and a third higher. The size changes with a short transition, none for a user who has asked for less motion, and no piece moves or touches its neighbour. It does not depend on `grow`: a small piece up to the pointer is as large as a filled one.
- **`relative`:** a press changes nothing. Moving towards the end of the track raises the value and moving towards its start lowers it, by the share of the meter's width which the pointer has moved, times the sensitivity: at 1, one width covers the whole range. Holding Shift makes it ten times finer. The meter asks the browser to lock the pointer for the drag, so the cursor disappears and the movement has no edge to run into; the lock ends with the release of the button. Where the browser refuses the lock or has none, and for a finger, the same works as an ordinary drag.
- **`automatic`,** the default, is `position` for the one bar. For pills, segments, bars and dots it is `piece` where every piece stands for exactly one step, as five dots do on 0 to 5 on a field of a whole type, and `position` otherwise, as for ten pills on 0 to 100, where a piece is ten steps and filling by the piece could only ever give 10, 20, 30. It is never `relative` and never `none`. Where `piece` is set by hand on such a meter, a press on a piece writes the value nearest to that piece's share which leaves exactly the pieces up to it filled. On a Float or Decimal field which sets no step a piece is rarely one step, since the step is then a fraction: five pieces for 0 to 5 are set by position, in hundredths; set **Step** to 1 or **Input Method** to **By piece** to have whole pieces there.
- **`none`:** the pointer and the keys do nothing. The meter is the one of a read-only field, in every way: the role `meter`, no tab stop, no cursor, no handle, nothing under the pointer, and it is not dimmed, so it looks exactly like a meter which can be edited does while nothing touches it. It writes nothing, and saving the item sends nothing for the field. The field is still one which can be edited: **Edit Raw Value** and **Clear Value** in the menu of its label work.

**With a finger** the same, with one difference: a finger which comes down writes nothing yet. A tap sets the value when the finger is lifted. A finger which moves sideways by a few pixels drags the value from there on. One which moves up or down scrolls the page as on any other part of it, and has then written nothing at all. A scroll which starts with a little sideways drift is taken for a drag at first: the value follows the finger until the browser takes the gesture over, and is then put back. On a field which its own condition makes read-only at the value the finger reached, it cannot be put back, and the edit stays. Two fingers zoom the page as elsewhere.

**With the keyboard.** The meter is one tab stop.

| Key | What it does |
|---|---|
| Right, Up | One step up. |
| Left, Down | One step down. |
| Page Up, Page Down | Ten steps up or down, or one piece where a piece is more than that. |
| Home, End | The least and the most which can be set. |
| Escape | During a drag: puts back the value from before the press, and ends the drag. |

In a right-to-left language Left and Right swap, as the track itself does. A key counts in steps from the step the value is on, so every press moves the value, and by exactly one step or ten, also where the values are large and the steps fine, as for an amount of millions to the cent. Only where a value and its step are some fifteen digits apart can a key miss a step.

**The value which is written.**

- **On the steps.** The values which can be set are the minimum, the minimum plus one step, plus two, and so on, and the maximum, also where the steps miss it: steps of 3 from 0 to 10 give 0, 3, 6, 9 and 10. A step up from a value between two of them goes to the next one.
- **Within the range,** always.
- **A whole type keeps to whole numbers.** On a field of the type Integer or Big Integer whose limits are not whole, such as 0.5 to 5.5, the values which can be set are the whole numbers within the range, 1 to 5, and the steps are counted from the first of them. The bar is still drawn against the limits as they are; a screen reader is told the range which can be set.
- **A step larger than the range** leaves two values, the two ends, and the nearer one is written. **A range which holds more steps than can be counted exactly,** more than nine thousand million million of them, has none: the value under the pointer is written as it is, to twelve digits, and the arrow and Page keys do nothing there. Anything less is on its steps: 0 to 2,000,000,000 with a step of 1 writes whole numbers.
- **A plain number,** as the stock Slider writes one for every type. A step of 0.1 writes 0.3 and not 0.30000000000000004, and the hundredths of a Float field from 0 to 1 without a step are written as 0.37. A field of the type Integer or Big Integer gets a whole number.
- **Only a change is written.** A click where the value already is leaves the item unchanged.
- **A field without a value** gets one from the first press with `position` and `piece`, from the first movement of a drag with `relative`, where a press alone changes nothing, and from the first key with all three. A value which was stored beyond the range is shown as it is, and comes into the range in the same way: with the first press, the first movement or the first key.
- **Nothing clears the value.** **Clear Value** in the menu of the field's label does that.
- Escape puts back exactly what the field held before the press, whatever that was.

**The target is taller than the track.** The track is 12px high. For a mouse a press up to 8px above it and in the 4px under it counts as a press on the track at the same place along it, 24px in all; the caption and the value text are never part of it. For a finger the whole area above the caption and the text counts. The target never leaves the meter's own area: where the area has less than 8px free above the track it is as high as what is free, and under a caption of several lines, where the track is at the top of the area, there is none above the track, so the label of the field keeps its own presses. A meter with neither caption nor text takes a press up to 8px under its track as well.

**What shows that a meter can be edited:** the cursor over the track and beside it, a dot inside the bar at the end of the fill while the pointer is over it, while it has the focus of the keyboard and during a drag, the pieces up to the pointer drawn larger where the pieces are filled by it, and a ring around the track while it has the keyboard's focus. None of it takes any room: a meter which can be edited is as high as one which cannot, and its caption, its text and the note of the form are in the same places.

### By value, in the form

The conditions of a field (Settings, Data Model, the field, **Conditions**) can replace any option while a rule on the item matches, as for every interface: another caption below 20, for example. They apply in the form only. For a colour by value which also shows in layouts, use the thresholds.

## The display

![The table layout with the display in four columns: bars of the same length with a percentage, tasks out of twelve in red, amber and green, a budget with its value, and a review score with the dash of Directus where there is none](https://raw.githubusercontent.com/dkrutsko/directus-extensions/main/packages/meter/docs/images/display-light.png)

The **Meter** display (`meter`) is for the same field in a layout. It draws a bar of a fixed length, 4.5rem, and then the text, on one line.

- **It is never edited.** `input`, `step` and `sensitivity` are options of the interface alone.
- **It never grows its pieces.** `grow` is an option of the interface alone too, and one which is set there does not reach the display.
- **It has the other options of the interface,** under the same keys: `min`, `max`, `label`, `indicator`, `indicatorFormat`, `prefix`, `suffix`, `visualization`, `subdivisions`, `dotsLayout`, `fade`, `color`, `thresholds`, `activeColoring` and `inactiveColoring`.
- **An option which was never set is taken from the interface of the field,** each on its own. A field which is set up with the Meter interface needs no display options at all, and its form and its layouts cannot disagree. The options form of the display shows what it takes over: the limits, the caption, the prefix, the suffix and the number of subdivisions as placeholders, the rest as the state of its inputs. Nothing of that is stored until an option is changed.
- **An option which is set is the display's own,** whatever the interface has. So a field which had display options before, with a range, caption or colour other than its interface's, keeps drawing by them.
- **An option which is emptied again** depends on which one it is, and the options form always shows what is drawn. Emptied limits, an emptied caption, prefix or suffix, an emptied number of subdivisions and an emptied dropdown of the visualization, of the layout of the dots or of a colouring are taken from the interface again, and their placeholders say so. Those dropdowns have a choice "Deselect" in the options form of the display for that. An emptied colour or list of thresholds stays empty and means none here: the primary colour, and no thresholds, also where the interface has some.
- **The limits of stock interfaces are understood too:** `min` and `max` of the stock Input, and `minValue` and `maxValue` of the stock Slider. So the display works on a field of either, as it is.
- **Without any options anywhere** the range is 0 to 100.
- **Pieces are drawn in a layout as well,** by the display's own options or else by the interface's, each on its own. Nothing is measured there: the bar of the display has one length, 72px, so the same options give the same number of pieces in every row. At most 7 pills (8px or wider, 2px apart), 9 segments (6px, 2px apart), 24 bars (2px, 1px apart) or 9 dots (circles of 6px, 2px apart) fit, and the rule is the one of the form: a meter from 0 to 100 draws five pills or five segments, and as many as fit of bars, 24, and of dots, nine, packed or spread. Bars are all drawn alike here too, in whole pixels of the screen, with what is left of the 72px empty at their end. Packed dots are a row as long as its dots; spread dots take the length of the bar. The colourings work as in the form.
- **The caption has no room in a layout.** It is in the tooltip which shows when the mouse rests on the bar, in front of the value, and it is the name of the meter for a screen reader.
- **The text is whole, or it is left out.** A column without room for the whole text beside the bar shows the bar alone, without an ellipsis; the tooltip and a screen reader still have the value. A column of the default width has room for "100%". A longer text, such as "35 / 60", "24,350.5" or anything with a suffix of some length, needs a wider column. A column narrower than the bar cuts the bar at the edge of the cell. In a display template the bar and the text are each one piece: where one does not fit the line, the ellipsis of the template stands for it.
- **A number never shows in part,** in the display or in the form, in any language and in either direction. A part of a number reads as another number, whether it is its first digits or its last, with or without an ellipsis after it.
- **A field without a value** shows the dash Directus shows for every empty field. A value which is not a number is shown as it is.
- **Where Directus needs plain text** instead, as in the titles of the calendar layout, the display gives the text beside the bar, such as "58%", "7 / 12" or "42 GB".

A display can therefore have another range, caption, prefix, suffix, visualization, colouring, colour or list of thresholds than its interface, and no colour or thresholds where the interface has some. It cannot have no caption, prefix or suffix where the interface has one, short of another format: the percentage has neither. Once the colour or the thresholds of a display were set or emptied, they no longer follow the interface.

## The value

The field holds a plain number. The display never writes it, and the interface writes it only as described under [Editing](#editing): a number on the steps, within the range. Filters, the API and other displays see what they would see with any other interface. A `decimal` or a `bigInteger` which the database returns as text is read as its number; a number too large to be held exactly is drawn at the nearest value which can.

## Compatibility

Built and tested against Directus 11.17.4. The `host` range starts at 11.15.0, but only 11.17.4 has been tested. It has not been run against Directus 12.

The browser tests run in Chromium, the engine of Chrome and Edge. The form and the table were also looked at in Firefox and in WebKit, the engine of Safari, where they draw the same; it has not been tried with a screen reader. Touch was tried with the touch events of a desktop browser, not with a finger on a device. Forced colours were tried as Chromium emulates them, not with a contrast theme of Windows, and a page was not actually printed.

### In a stock Repeater

A Meter can be the interface of a field of a stock Repeater, and the Meter display can draw that field in the rows of the Repeater.

- **The interface.** In the dialog where such a field is set up, every option of the Meter can be set; the ones which apply only sometimes (Prefix, Suffix, Subdivisions, Dots Layout, Grow, Fade In, Step, Sensitivity) appear and go there as they do in the ordinary field settings, by the option they depend on. A meter in the drawer of a row is drawn by these options and writes plain numbers into the row.
- **The display.** The same dialog has a group **Display**, which is closed at first. Choose **Meter** there and the rows of the Repeater draw the field as a meter, where they otherwise show the plain number. A row is drawn by the display's options from that dialog, and by the options of the interface for whatever those leave unset, as in a table.
- **What that dialog does not tell the options forms** is the field: neither its type nor, for the form of the display, the options of its interface. So the Step input takes decimals there also for a whole type (the meter itself still rounds the step to a whole number) and says "Automatic" where it would otherwise show what an empty step comes to, and the form of the display cannot show what an unset option comes to: its empty inputs say "As in the interface", Subdivisions, Dots Layout and Fade In show until a visualization is chosen there which rules them out, and Prefix and Suffix until the format is the percentage.

### Coming from the stock Slider or Input

Directus keeps the options of a field when its interface changes. A field which was a Slider keeps its `minValue` and `maxValue`, and the Meter reads them wherever its own `min` and `max` are not set, so the range carries over; the options form shows them as the placeholders of the two limits. `min` and `max` of the stock Input are the Meter's own keys. The Slider's step, `stepInterval`, is the Meter's step while it has none of its own. The other options of both are ignored.

A field can end up with both pairs, for example one which was a Meter or an Input with `min` and `max` and was then made a Slider with limits of its own. `min` and `max` then count, for the interface and for the display alike. That is also what the stock Slider of Directus 11.17.4 draws on such a field: it runs from `min` to `max` whatever its own two options say. To give such a field another range, change `min` and `max`, which the options form of the Meter has as its two limits.

## Limitations

- A meter can be edited wherever its field can, unless its input method is `none`. That option is the interface's alone and makes a reading of the meter, not of the field: the field's own **Read-only** setting does that.
- No gesture types a number or clears the value. **Edit Raw Value** and **Clear Value** in the menu of the field's label do.
- The relative method needs a browser which locks the pointer for the disappearing cursor; without one it is an ordinary drag, which ends at the edge of the screen.
- Horizontal, in one height. There is no round gauge and no target marker.
- Bars do not always reach the end of their field. Where as many are drawn as fit, less than one bar and its gap is left over, a few pixels. Where a number of bars is set, or the range has one bar for each of its units, and that number fits, it is drawn with all bars alike, and up to one screen pixel for each bar is left over: on a screen of one pixel to the pixel that can be a tenth of the field and more (fifty bars set in 342px leave 44px; on a screen of two pixels to the pixel 19px), and in the display up to 16px of its 72px. The same goes for a field wide enough for more than 200 bars, about 1200px. A press in what is left counts as one past the last bar.
- How many bars fit depends on the screen's pixels as well as on the width, so the same field can draw a few bars more or fewer on another screen or after a zoom of the page, and so can the bars of the display in a table.
- A piece is filled or not: there is no half-filled piece. `grow` and `fade` show the way to the next pieces, with fixed small sizes; the display does not grow pieces. How many pieces a meter has depends on its width, and can differ between the form and a layout. A few packed dots do not use the width of a wide field; spread ones do. The gaps of spread dots can differ by one screen pixel, since they share a width which rarely divides evenly.
- The colours of the gradient are blended by the browser in sRGB, from stop to stop. There are no other ways to blend, and no stops but the colour and the thresholds.
- The pieces are counted in pixels of the app's usual text size, 16 to the rem.
- A threshold means "from this value upward". There are no other comparisons.
- A minimum above the maximum is read as the two swapped, not as a meter which runs backwards.
- The prefix and the suffix are joined to the number as they are, in every language: there is no rule for where a unit goes in the language of the user, and none for how many decimals a number has. They are inside the text which is marked as running from the left, as the number is.
- Under forced colours every meter has the same system colours: the colours of the options and of the thresholds are not shown there, and a gradient is not drawn. A piece too thin for an outline, as the bars of the display are, is told from a filled one by its colour alone.
- The names of the options "Value Text", "Thresholds", "Visualization", "Subdivisions", "Dots Layout", "Grow", "Fade In", "Active Coloring", "Inactive Coloring", "Input Method", "Step" and "Sensitivity", the choices of their dropdowns, their notes, the notice in the options form of the display and the choice "Value / Maximum" are in English only. The caption, a prefix or suffix which is a translation string, "No value" and the numbers follow the language of the user.

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
- `src/meter.ts` is everything which needs no browser: what the options and a value come to, how much of the track is filled, in how many pieces it is drawn and how many of them are filled, in which colour and at which size, what the text says, and which value a press or a key writes. It uses no Vue, DOM or Directus APIs, so the tests run it in Node.
- `tests` holds the unit tests of `src/meter.ts` and `src/options.ts`, and `sandbox` the browser tests which run in a real Directus.

## License

[MIT](https://github.com/dkrutsko/directus-extensions/blob/main/packages/meter/LICENSE)
