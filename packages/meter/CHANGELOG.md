# Changelog

## 2.0.0

- **A meter can now be edited, which changes what existing fields do.** Until now the interface was a reading which never changed its field. From this version on a meter in a form is set with the pointer and the keyboard wherever its field can be edited. A field whose meter should stay a reading, such as a number which a flow keeps up to date, has to be marked **Read-only** in its field settings: a read-only field, and one which is disabled or shown where nothing is edited, is drawn exactly as before and cannot be changed. The display in layouts does not change.
- New option `input` for the interface, the method by which the pointer sets the value: `automatic` (the default), `contiguous` (the value is where the pointer is), `segment` (the pieces up to the pointer are filled) or `relative` (the value moves by as much as the pointer moves, with the pointer locked where the browser allows it). `automatic` is `segment` where every piece is exactly one step and `contiguous` otherwise.
- New option `step` for the interface, 1 by default: the distance between two values which can be set, counted from the minimum. The maximum can always be set. A field which was a stock Slider keeps that Slider's step.
- New option `sensitivity` for the `relative` method, 1 by default. Shift makes a drag ten times finer.
- The keys of a meter which can be edited: the arrows for one step, Page Up and Page Down for ten steps or one piece, Home and End for the two ends, Escape to put the value back during a drag. It is one tab stop with the role `slider`. A key counts in steps, so every press moves the value by exactly one step or ten, also for large values in fine steps.
- What is written is a plain number on the steps, within the range, whole for a field of the type Integer or Big Integer, and only where it differs from what the field holds. On such a field with limits which are not whole, the whole numbers within the range are what can be set.
- A press a little above or below the track counts as a press on it: up to 24px in all for a mouse and the whole area above the caption for a finger, never outside the meter's own area and never on the caption or the value text. Where the pieces are filled by the pointer, the pieces up to it are tinted a step darker, at rest and through a drag.
- A finger sets the value by a tap or by a sideways drag. One which goes up or down scrolls the page and writes nothing, and two fingers zoom the page as elsewhere. A scroll which starts with a little sideways drift is a drag until the browser takes it over; the value is then put back.
- New option `visualization` for the interface and the display: `contiguous` (the default, the one bar as before), `pills`, `segments`, `bars` or `dots`. All but the first cut the track into pieces which are each filled completely or not at all. The nearest whole number of them is filled, and the value text, the tooltip and what assistive technology is told stay exact.
- New option `subdivisions`: how many pieces are wanted, 2 or more. Without it, one for every unit of a range which is a whole number of at least 2.
- New option `dotsLayout`: `packed` (the default, from the start side) or `spread` (from edge to edge).
- The width decides how many pieces are drawn. The interface measures its track: what is wanted is drawn where it fits, else the largest number which fits and divides it, else as many as fit, and one bar where fewer than two fit. Bars leave the middle rule out: a number of them which does not fit becomes as many as fit, so that their row ends near the end of the field. The display applies the same rule to its bar of a fixed length, so every row of a layout has the same number. There are never more than 200 pieces.
- Bars are all drawn at one width and one distance, whole numbers of the screen's pixels, in the form at least 4px wide and 2px apart, with what is left of the field empty at its end: a few pixels where as many are drawn as fit, and up to a screen pixel for each bar where a number which is set fits.
- New option `grow` for the interface, a number which is 0, off, by default: how many pieces in front of the fill can be growing at once. Above 0 the pieces which are not filled are drawn small; with 1 the next one grows to its full size as the value comes near it, with more a ramp of several does. Thin bars grow over a short ramp of the next two or three for each 1. The display never grows its pieces.
- New option `fade` for the interface and the display, off by default: the next piece takes on the colour of a filled one gradually, as the value comes near it. Both have a short transition in the form, none for a user who asked for less motion, and follow the pointer itself while it drags the value.
- New options `activeColoring` (`value`, `blend`, `steps` or `gradient`) and `inactiveColoring` (`plain`, `automatic`, `value`, `blend`, `steps` or `gradient`): the colours of the `color` and `thresholds` options by the current value as before; as one colour which shifts towards the next threshold as the value comes near it; by the place on the scale in steps; or blended into a gradient across the whole track. What is not filled is the plain track or a faded tint of the same.
- The display takes each of these but `grow` from the interface of the field where it has none of its own. Its dropdowns for them can be emptied in the options form, which hands the option back to the interface.
- Every option can be set wherever the options of the interface or of the display are edited, the dialog of a stock Repeater's field among them. The Meter display chosen in that dialog draws the rows of the Repeater.
- Apart from that a field which sets none of the new options is drawn as before.

## 1.0.1

- First release published by the manual Publish workflow through npm trusted publishing, which validates the trusted publisher configuration. No functional changes.

## 1.0.0

- Initial release.
