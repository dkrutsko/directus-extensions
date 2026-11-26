# Changelog

## 2.0.0

### Breaking

- **A meter on a field which can be edited is now edited.** In 1.x the interface never changed its field. Now the pointer and the keys set the value wherever the field is not read-only. To keep a reading, tick **Readonly** in the field's settings, or set the meter's **Input Method** to "None".

### Added

- **Input Method** (`input`, interface): "Automatic", "Position" (the value is where the pointer is), "Piece" (the pieces up to the pointer are filled), "Relative" (the value moves by as much as the pointer moves) or "None" (the meter is not edited). "Automatic" is "Piece" where every piece is exactly one step, and "Position" otherwise.
- **Step** (`step`, interface): the distance between two values which can be set, counted from the minimum. Left empty, it is a step which suits the type and the range, and a field which was a stock Slider or Input keeps the step which was set there.
- **Sensitivity** (`sensitivity`, interface): for "Relative", how much of the range one length of the meter covers. Shift makes a drag ten times finer.
- **Keys.** A meter which can be edited is one tab stop with the role `slider`: the arrows for one step, Page Up and Page Down for ten steps or one piece, Home and End for the two ends, Escape to put the value back during a drag.
- **Touch.** A tap or a sideways drag sets the value; a vertical one scrolls the page.
- **A taller target.** A press a little above or below the track counts as a press on it.
- **What is written** is a plain number on the steps, within the range, whole on an Integer or Big Integer field, and only where it differs from what the field holds.
- **Prefix** and **Suffix** (`prefix`, `suffix`): text before and after the value text, joined on as typed. "$" gives "$4,200", " GB" gives "42 GB". A percentage has neither.
- **Visualization** (`visualization`): "Contiguous" (one bar, the default), "Pills", "Segments", "Bars" or "Dots". All but the first cut the track into pieces which are each filled or not; the value text stays exact.
- **Subdivisions** (`subdivisions`): how many pieces are wanted. Left empty, one for every unit of a whole range, or as many as fit. Where the number does not fit the width, fewer are drawn.
- **Dots Layout** (`dotsLayout`): "Packed" from the start, or "Spread" from edge to edge.
- **Grow** (`grow`, interface): the pieces which are not filled are drawn small, and grow as the value nears them. The number is how many can be growing at once.
- **Fade In** (`fade`): the next piece, or the next few with a ramp or thin bars, takes on the colour of a filled one gradually, as the value nears it.
- **Active Coloring** (`activeColoring`): "Value" (one colour, by the current value, as before), "Blend" (one colour which shifts towards the next threshold's), "Steps" (each place on the track has the colour of its threshold) or "Gradient" (those colours blended along the track). The form shows it only while there is at least one threshold: without one all four draw the same.
- **Inactive Coloring** (`inactiveColoring`): "Plain" (the track, as before), "Automatic" (as what is filled, faded) or one of the four, faded.
- **The display** has every new option but Grow and the three of editing, and takes each from the interface of the field where it sets none of its own. Its Format can now be emptied, and is then the interface's again.
- **In a stock Repeater** a Meter can be the interface of a field, and the Meter display can draw the rows.
- **Contrast themes and print.** Under a contrast theme of the system (forced colours) the meter is drawn in the system's colours. A printed form or table keeps its bars.
- **Size.** The app bundle grew from about 14 kB to 49 kB (16 kB gzipped). It still has no dependency.

### Unchanged

- **What 1.x stored.** The field holds a plain number, and the options `min`, `max`, `label`, `indicator`, `indicatorFormat`, `color` and `thresholds` keep their meaning.
- **The look of a field which sets none of the new options,** where the field is read-only. Where it can be edited it also shows a pointer cursor, a handle while it is used and a focus ring.
- **The display is never edited.**

## 1.0.1

- First release published by the manual Publish workflow through npm trusted publishing, which validates the trusted publisher configuration. No functional changes.

## 1.0.0

- Initial release.
