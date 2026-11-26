# How the Meter behaves

The exact rules of `directus-extension-meter`, by topic. The [README](https://github.com/dkrutsko/directus-extensions/blob/main/packages/meter/README.md) says what the package is for and lists the options; this file says what each of them does to the last detail. Lengths are in CSS pixels at the app's text size of 16px to the rem. "The form" is the interface in an item form, "the display" is the Meter display in a layout.

- [How the options are read](#how-the-options-are-read)
- [The range, the fill and the text](#the-range-the-fill-and-the-text)
- [How many pieces are drawn](#how-many-pieces-are-drawn)
- [The sizes of the pieces](#the-sizes-of-the-pieces)
- [Grow and fade](#grow-and-fade)
- [The colourings](#the-colourings)
- [The input methods](#the-input-methods)
- [The step](#the-step)
- [What is written](#what-is-written)
- [The keys](#the-keys)
- [The target of the pointer, and a finger](#the-target-of-the-pointer-and-a-finger)
- [The pieces up to the pointer](#the-pieces-up-to-the-pointer)
- [Where the text goes, and when it is left out](#where-the-text-goes-and-when-it-is-left-out)
- [The display](#the-display)
- [Options of other interfaces](#options-of-other-interfaces)
- [The options forms](#the-options-forms)
- [Motion, contrast themes and print](#motion-contrast-themes-and-print)

## How the options are read

Options are read loosely, since they are whatever the schema holds. An option which holds nothing usable counts as not set.

- **A number** is a number or the text of one (`"12.5"`). Text which is not a plain decimal number, such as `"0x10"` or `"Infinity"`, is not a number.
- **The limits.** `min` and `max`, each on its own. A limit which is not set is 0 or 100. A minimum above the maximum is read as the two swapped. Where both are the same number, the bar is empty below that number and full from it upward.
- **The caption** (`label`) is text which is not blank, with the spaces around it removed.
- **`prefix` and `suffix`** are text which is not blank, kept exactly as typed, with their spaces.
- **`indicator`** and **`fade`** are `true` or `false`. Anything else is not set: the text is shown, the fading is off.
- **An option with words** (`indicatorFormat`, `visualization`, `dotsLayout`, `activeColoring`, `inactiveColoring`, `input`) is one of its words. Anything else is the default.
- **`subdivisions`** is a whole number or the text of one. Below 2 it is 2. Anything else, such as 3.7, is not set.
- **`grow`** is a number from 0 to 20 or the text of one. More than 20 is 20. Anything else, and a negative number, is 0.
- **`step` and `sensitivity`** are numbers above zero. A step which is set to zero, to a negative number or to something which is no number is 1; the same goes for the sensitivity. A step which is empty is worked out: see [The step](#the-step). On a field of the type Integer or Big Integer the step is rounded to a whole number of at least 1.
- **A colour** is a hex colour (`#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`) or one theme variable, `var(--theme--...)`, of at most 80 characters. Anything else is ignored and the default is used.
- **`thresholds`** is a list of entries with a `value` (a number) and a `color` (a colour). An entry without either is left out. The order of the list does not matter; of two entries with the same value the later one counts. Values are in the units of the field, not in percent, and may lie outside the range.

Text reaches the page as text: markup in a caption, a prefix or a suffix is printed as it is.

## The range, the fill and the text

- **The fill** is the share of the range the value has reached, kept between nothing and all: a value beyond the range fills or empties the bar. The fill of the one bar is never narrower than the bar is high (12px in the form, 8px in the display), so the smallest value above the minimum shows as a dot.
- **The colour** of a value is the colour of the threshold with the highest `value` which the field's value has reached, and the `color` option below all of them.
- **A field without a value** has a dashed outline in place of the track and a dash as its text, in the form. Assistive technology is told "No value", in the language of the user where the app has that string. A value which is not a number is treated the same in the form.

What the text says, by `indicatorFormat`:

| Format | 7 of 0 to 12 | 150 of 0 to 100 | 0.4 of 0 to 100 |
|---|---|---|---|
| `percent` | 58% | 150% | 1% |
| `value` | 7 | 150 | 0.4 |
| `fraction` | 7 / 12 | 150 / 100 | 0.4 / 100 |

- **The percentage** is a whole number. A value strictly inside the range prints at least 1% and at most 99%, so "0%" and "100%" are only said when they are true. A value beyond the range prints what it is: "150%", "-20%".
- **A number** is printed with at most two decimals, and a number below 1 with its first two digits which count, so 0.004 is not "0". From 1,000,000,000,000,000 on, and below a millionth, it is written with an exponent.
- **The language** of the user decides the decimal mark, the grouping and the place of the percent sign.
- **`prefix` and `suffix`** belong to `value` and `fraction`. The value has both around it: "$4,200", "42 GB". The fraction has the prefix before each of its two numbers and the suffix once, at the end: "$4,200 / $10,000", "42 / 100 GB". Nothing is put between them and the number. A percentage has neither, and neither has the dash.
- **The same text everywhere:** under the bar, in the tooltip of the display, in `aria-valuetext` and in the plain text of the display.

## How many pieces are drawn

With any visualization but `contiguous` the track is a row of pieces, and each piece is filled or it is not.

1. **How many are wanted.** The number in `subdivisions`. Without one, one piece for every unit of the range where the range (maximum minus minimum) is a whole number of at least 2: 0 to 5 wants five, 0 to 100 a hundred. Any other range, such as 0 to 1 or 0 to 2.5, wants none in particular.
2. **How many fit.** Each shape has a smallest size and a gap (see the table below). As many as the width has room for at that size is how many fit. The form measures the width of its own track, and counts again when that changes. The display has one length, 72px, so every row of a layout has the same number.
3. **How many are drawn.**
   - What is wanted, where it fits.
   - **Pills and segments** which do not fit: the largest number of at least 2 which fits and divides what is wanted, so each piece stands for a round share. A hundred wanted with room for 14 draws 10; twelve wanted with room for 7 draws 6. Where nothing divides it, as for 13, as many as fit.
   - **Bars and dots** which do not fit: as many as fit. They keep their size, so a number which divides what is wanted would leave part of the track empty.
   - Nothing wanted: as many as fit.
   - Room for fewer than two: the meter is one bar.
   - Never more than 200, whatever the width and whatever is asked for.
4. **How many are filled.** The share of the range the value has reached, times the number of pieces, rounded to the nearest whole number, with the upper one half way. Of ten pieces on 0 to 100, 44 fills four and 45 fills five. The filled pieces are the first ones, from the side where text starts. The text still says the exact value.

Two things follow, and both are meant. The look depends on the width: the same field can have 10 pills in half of the form and 5 in a table. And a coarse meter rounds: five pieces for 0 to 100 show 44 and 58 alike. Set `subdivisions` to a small number, or give the meter a range of a few units, for a meter which looks the same everywhere.

## The sizes of the pieces

| Shape | Form: smallest, gap | Display: smallest, gap | Fit in the display's 72px |
|---|---|---|---|
| Pills | 20px, 4px | 8px, 2px | 7 |
| Segments | 14px, 3px | 6px, 2px | 9 |
| Bars | 4px, 2px | 2px, 1px | 24 |
| Dots | 12px, 4px | 6px, 2px | 9 |

- **Pills and segments** share the width in equal parts, as high as the bar (12px in the form, 8px in the display). Pills are round at both ends. Segments are square between them, and only the two outer ends of the row are round.
- **Dots** are circles which do not stretch: 12px in the form, 6px in the display. `packed` they stand from the start, a gap apart. `spread` the first is at the start edge, the last at the end edge, with equal gaps between. Packed and spread dots are the same number.
- **Bars** are square, and every bar is exactly as wide as every other and every gap as wide as every other: each is a whole number of device pixels (the screen's own pixels). The sizes in the table are the least, rounded up to whole device pixels. Of the sizes which fit the number of bars, the pair with the longest row is taken; a gap is never more than twice its least. What is left of the track stays empty at its end.
  - Where as many bars are drawn as fit, less than one bar and its gap is left: in a form field of 342px, 57 bars of 4px with 2px left.
  - Where a number of bars is set, or the range has one for each unit, and that number fits, up to one device pixel for each bar is left. Fifty bars set in 342px leave 44px on a screen of one device pixel to the pixel, and 19px on one of two. In the display nineteen bars leave 16px of the 72px.
  - How many bars fit depends on the device pixels, so the same field can draw a few more or fewer on another screen or after a zoom of the page. The other shapes do not depend on it.
- **Without a value** every piece is a dashed outline.

## Grow and fade

A row of pieces says how many are filled and nothing about the way to the next one. Two options show that. They are separate, and both are off until set.

- **`grow`** (the form only). With any number above 0 the pieces which are not filled are drawn small: dots at half their diameter, pills at six tenths of their length and height, segments and bars at their full width and a third of their height. A piece then grows to its full size as the value nears it.
- **The number is how many pieces can be growing at once.** A piece is filled once the value has come half of it. With 1 the growth starts that half piece before the fill, so only the next piece is ever under way, and at a value which is a whole number of pieces nothing is. Every further 1 reaches one piece further: with 2 a piece and a half, with 3 two and a half, a ramp of up to three. Below 1 the reach is half of the number: with 0.5 a quarter of a piece.
- **Thin bars** have a longer reach where the pieces alone give less: about 15px of the track for each 1 of `grow` in the form, counted in half bars. So with 1 the next two or three bars are a short ramp. Wide bars and the other shapes go by the pieces alone.
- **The ramp comes out of the start of the scale.** The growth never reaches further ahead than the fill is long, plus the half piece which fills the first one. A meter at its minimum is empty, and the ramp gets longer with the fill until it has its whole reach.
- **`fade`** (the form and the display). The piece which comes next has the look of a filled piece laid over it, the more the nearer the value is. It uses the reach of `grow`, and that of 1 where `grow` is 0. In the display, which has no `grow`, it is that of 1, and for thin bars about 9px.
- **No colour or size jumps.** A piece arrives at its full size and colour at the moment it is filled.
- **Nothing moves.** A small piece is drawn smaller about its middle, in the place it has anyway. The gaps, the number of pieces, the height of the field and where a press counts are the same with and without it.
- **While the pointer drags the value** by Position or Relative, the growing and the fading follow the pointer itself and not the steps of the value. The fill, the text and what is written stay on the steps. At the release the sizes settle on what the value gives. With steps of more than half a piece the value can fill a piece before the pointer has reached it.
- A field without a value keeps its dashed outlines, and one bar has nothing to grow.

## The colourings

`color` and `thresholds` say which colour a value has. The two colourings say where that shows.

- **The scale** is the colour of a meter at its minimum, and then the colour of each threshold above the minimum at its value.
- **`value`** (the default for what is filled): one colour, that of the current value, everywhere.
- **`blend`:** one colour as well, the one a gradient across the scale has where the value stands. Half way between two thresholds it is half way between their colours. From the last threshold on it is that threshold's colour.
- **`steps`:** a colour belongs to a place. The one bar changes colour at each threshold, whatever the value is. A piece has the colour of the value it reaches when it is filled completely.
- **`gradient`:** the same colours blended from one to the next across the whole track. The fill or a piece shows its own part; the blend is never squeezed into what is filled. In pieces the gaps are not counted: each piece shows an equal part of the scale.
- **What is not filled** is the plain track by default (`plain`). With `inactiveColoring` it is coloured in one of the four ways and faded: three parts of the colour to seven of the track's, mixed by the browser. `automatic` is the way of what is filled.
- **Without thresholds above the minimum** the scale is one colour, and the four ways are the same.
- **A place keeps its colour** in `steps` and `gradient` while the value changes: the fill only uncovers more or less of the same picture.
- A threshold at or below the minimum gives the minimum its colour. One beyond the maximum is beyond the track: steps never reach it, and a gradient blends towards it without arriving.
- Colours are blended in sRGB, from stop to stop.

## The input methods

A meter in a form is edited unless the field is read-only (by its settings, by a condition, by the permissions of the user or in a batch edit where the field is not ticked), is shown where nothing is edited, as in the comparison of revisions, or has the input method "None". It is then a reading: the role `meter`, no tab stop, no cursor, no handle, and it emits nothing. It is not dimmed.

- **`position`** ("Position"): a press sets the value under the pointer and a drag follows it. Past either end it is the minimum or the maximum. For bars and packed dots the range is spread along the row of pieces, which ends before the track does.
- **`piece`** ("Piece"): a press or a drag fills the pieces up to and including the one under the pointer. A pointer in a gap counts for the piece before it; before the first piece none is filled, beyond the last one all are. The value written is, of the values on the steps which draw exactly that many pieces, the one nearest to that share of the range: the third of five pieces on 0 to 5 is 3. Where no value on the steps draws that many, it is the value nearest to the share. On one bar "Piece" is "Position".
- **`relative`** ("Relative"): a press changes nothing. Moving towards the end raises the value and moving towards the start lowers it, by the share of the meter's length the pointer has moved, times `sensitivity`: at 1, one length is the whole range. Shift makes it ten times finer. The movement adds up also where each bit of it is less than a step. The meter asks the browser to lock the pointer, so the cursor disappears and the movement has no edge to run into. Where the lock is refused or missing, and for a finger, it is an ordinary drag.
- **`automatic`** ("Automatic", the default) is "Piece" where every piece stands for exactly one step and the limits themselves can be written, and "Position" otherwise. Five dots on an Integer field from 0 to 5 are set by piece. Ten pills on 0 to 100 are set by position, since a piece is ten steps there. A Float field from 0 to 5 which sets no step has a step of 0.01, so its five pieces are set by position, in hundredths: set **Step** to 1 or **Input Method** to "Piece" for whole pieces. It is never "Relative" and never "None".
- **`none`** ("None"): the meter is the reading described above, on a field which can still be changed by other means, such as **Edit Raw Value**.

A drag goes on when the pointer leaves the field. Only the main button and the primary pointer count.

## The step

The step is the distance between two values which can be set, counted from the minimum.

- **`step`** where it is set.
- Else **`stepInterval`**, which a field keeps from the stock Slider. A field which was a stock Input brings its `step` along where one was set there, under the Meter's own key.
- Else a step which suits the field:
  - 1 on a field of the type Integer or Big Integer.
  - On a Float or Decimal field the largest power of ten which gives the range at least a hundred steps, and at most 1:

    | Range | Step |
    |---|---|
    | 1, 5 | 0.01 |
    | 10, 50 | 0.1 |
    | 100 and more | 1 |

  - On a Decimal field never finer than its column holds: with one decimal place the step is 0.1 also from 0 to 1.
  - Never finer than fifteen decimals. A range of one number, and limits too far apart to subtract, have 1.

A step which is set is not held to the scale of a Decimal column: a finer one writes values which the database rounds.

## What is written

- **A plain number,** as the stock Slider writes one for every type.
- **On the steps.** The values which can be set are the minimum, the minimum plus one step, plus two, and so on, and the maximum also where the steps miss it: steps of 3 from 0 to 10 give 0, 3, 6, 9 and 10. The pointer writes the nearest of them, with the upper one half way.
- **Within the range,** always.
- **Without dust.** A value has no more decimals than the step and the two limits have between them: a step of 0.1 writes 0.3 and not 0.30000000000000004.
- **Whole for a whole type.** On an Integer or Big Integer field whose limits are not whole, such as 0.5 to 5.5, the values which can be set are the whole numbers within the range, 1 to 5, and the steps are counted from the first of them. The bar is still drawn against the limits as they are; assistive technology is told the range which can be set.
- **Only a change.** A press where the value already is writes nothing. A text which stands for the same number, as a Decimal value can arrive, is no change.
- **A step larger than the range** leaves the two ends, and the nearer one is written.
- **A range with more steps than can be counted exactly** (more than 9,007,199,254,740,991) has no steps: the value under the pointer is written, rounded to twelve digits which count.
- **A field without a value** gets one from the first press with "Position" and "Piece", from the first movement with "Relative", and from the first key. A value which was stored beyond the range is shown as it is and comes into the range the same way.
- **Nothing clears the value.** **Clear Value** in the menu of the field's label does.
- **Escape** during a drag puts back exactly what the field held before the press.

## The keys

A meter which can be edited is one tab stop with the role `slider`.

| Key | What it does |
|---|---|
| Right, Up | One step up. |
| Left, Down | One step down. |
| Page Up, Page Down | Ten steps, or the whole steps of one piece where those are more. |
| Home, End | The least and the most which can be set. |
| Escape | During a drag: puts the value back and ends the drag. |

- In a right-to-left page Left and Right swap, as the track itself does.
- A key counts in steps from the step the value is on. A value between two steps goes to the next one, not past it. A value from outside the range starts from the nearer end, and a field without a value from the minimum.
- A key of the meter's never scrolls the page, whether or not it changes anything. Keys with Alt, Ctrl or the Command key are left alone, and so are all keys but Escape during a drag.
- In a range without steps (see above) a key adds the step to the value; where that is less than the twelve digits which are kept, nothing changes.

## The target of the pointer, and a finger

The track is 12px high, so more than the track takes a press.

- **A mouse or a pen:** up to 8px above the track, and the 4px between the track and the line of caption and text, count as a press on the track at the same place along it: up to 24px in all. A meter with neither caption nor text takes up to 8px above its track and up to 8px under it. The caption and the text are never part of the target, and the target never leaves the meter's own area: where the area has less room above the track, the target is as high as that room.
- **A finger,** and any pointer the browser calls coarse: the whole area above the line of caption and text.
- **A finger which comes down writes nothing yet.** A tap sets the value when the finger is lifted. A finger which has moved at least 6px along the track, and further along it than across, drags the value from there on. One which moves up or down scrolls the page and has written nothing. Two fingers zoom the page as elsewhere.
- **When the browser takes a gesture away** (a scroll which began with a sideways drift), the value from before is put back.

What shows that a meter can be edited: the cursor, a ring around the track while it has the keyboard's focus, on the one bar a small handle at the end of the fill (under the pointer, with the focus and during a drag), and the larger pieces of the next section. None of it takes room: a meter which can be edited is as high as one which cannot.

## The pieces up to the pointer

Where the pieces are filled by the pointer ("Piece", by choice or by "Automatic"), the pieces the pointer would fill are drawn larger than the others while a mouse or a pen rests on the track, and all through a drag. Not for a finger.

- Bars and segments: half as high again, as wide as they are.
- Dots: a pixel more on every side.
- Pills: a pixel more at each end and a third higher, with their ends kept round.

A large piece keeps its own colour, filled or not, and is as large whatever `grow` would make of it. No piece moves or touches its neighbour.

## Where the text goes, and when it is left out

- **In the form** everything is inside an area at least as high as a stock input: the track, and under it one line with the caption at the start and the value text at the end. A caption which is long wraps, and the area grows with it. In a field too narrow for the text beside a little caption, the text goes under the caption, still at the end.
- **The text is whole, or it is not shown.** A number of which only a part shows reads as another number. In a field narrower than the text itself, and in a table column without room for the whole text beside the bar, the text is left out, without an ellipsis. Assistive technology still has it, and so has the tooltip of the display.
- **The number runs from the left** in every language (`dir="ltr"` on the number), so "-20%" and "7 / 12" are not turned round in a right-to-left page. A prefix and a suffix are inside that text.

## The display

The display draws a bar 72px long and 8px high, and then the text, on one line. It is inline content, as high as the line it is on.

- **It is never edited** and never grows its pieces: `input`, `step`, `sensitivity` and `grow` are options of the interface alone, and a `grow` which is set there does not reach it.
- **Options it does not set are taken from the field's interface,** key by key. The limits, the caption, `prefix`, `suffix`, `indicator`, the format, the visualization, the subdivisions, the layout of the dots, `fade` and the two colourings fall back whenever they hold nothing usable, so an option which was emptied is taken over again.
- **`color` and `thresholds` fall back only while they were never stored.** Once either was set or emptied in the display it is the display's own: emptied means the primary colour, or no thresholds, also where the interface has some.
- **The caption** has no room in a layout. It is in the tooltip, in front of the value ("Tasks done: 7 / 12"), and it is the name of the meter for assistive technology; without one the name is that of the field.
- **A field without a value** shows what Directus shows for every empty field. A value which is not a number is shown as the text it is, cut with an ellipsis like other text.
- **Where Directus needs plain text,** as in the titles of the calendar layout, the display gives the value text: "58%", "7 / 12", "42 GB". A field without a value gives none.
- **Packed dots** are a row as long as its dots, and the text follows it. Every other row is as long as the bar.
- In a display template the bar and the text are each one piece: where one does not fit the line, the ellipsis of the template stands for it.

## Options of other interfaces

Directus keeps the options of a field when its interface changes, so the Meter understands what two stock interfaces leave behind.

- **The stock Slider:** `minValue` and `maxValue` are read as the limits wherever `min` and `max` are not set, by the interface and by the display. `stepInterval` is the step while `step` is empty.
- **The stock Input:** `min`, `max` and `step` are the Meter's own keys, so they carry over as they are. The other options of the Input are not read.
- **A field which holds both pairs of limits** is drawn by `min` and `max`.

## The options forms

- A default which a form shows is not stored. Nothing is stored until an option is changed.
- Options which apply only sometimes show and hide by the option they depend on: Subdivisions, Grow and Fade In while the visualization has pieces, Dots Layout for dots, Prefix and Suffix while the format is not the percentage, Sensitivity for "Relative", and Step for every method but "None".
- The Step input shows what an empty step comes to as its placeholder, and follows the limits as they are typed.
- The form of the display shows what it takes over from the interface: as placeholders of the limits, the caption, the prefix, the suffix and the subdivisions, and as the state of its other inputs. Its dropdowns of the look and the colourings can be emptied, which hands the option back to the interface.
- **In the dialog of a stock Repeater's field** the forms are not told the field. The Step input then takes decimals also for a whole type (the meter still rounds the step) and says "Automatic". The form of the display cannot show what the interface has: its empty inputs say "As in the interface", and its options which apply only sometimes show until its own values rule them out.

## Motion, contrast themes and print

- **Three short transitions,** 150ms each: the size of pieces which grow, the opacity of the piece which fades in, and the size of the pieces up to the pointer. None plays for a user who has asked the system for less motion, and none for the first value a form draws. Growing and fading do not play while the pointer drags the value; the size of the pieces up to the pointer is eased during a drag by "Piece" as well. The fill, the colours and the handle change at once. The display has no transition.
- **Under a contrast theme of the system** (forced colours) the track and what is not filled are an outline in the system's text colour, and what is filled is the system's highlight colour. The colours of the options and of the thresholds are not shown there, and a gradient is not drawn. No size changes.
- **In print** the meter asks the browser to keep its backgrounds, so a printed form or table keeps its bars.
- **Right-to-left:** the track fills from the right, a gradient runs to the left, and the Left and Right keys swap. The meter follows the direction of the page.
