# Changelog

## Unreleased

- New option `visualization` for the interface and the display: `contiguous` (the default, the one bar as before), `pills`, `segments`, `bars` or `dots`. All but the first cut the track into pieces which are each filled completely or not at all. The nearest whole number of them is filled, and the value text, the tooltip and what assistive technology is told stay exact.
- New option `subdivisions`: how many pieces are wanted, 2 or more. Without it, one for every unit of a range which is a whole number of at least 2.
- The width decides how many pieces are drawn. The interface measures its track: what is wanted is drawn where it fits, else the largest number which fits and divides it, else as many as fit, and one bar where fewer than two fit. The display applies the same rule to its bar of a fixed length, so every row of a layout has the same number. There are never more than 200 pieces.
- New option `dotsLayout`: `packed` (the default, from the start side) or `spread` (from edge to edge).
- New options `activeColoring` (`value`, `steps` or `gradient`) and `inactiveColoring` (`plain`, `automatic`, `value`, `steps` or `gradient`): the colours of the `color` and `thresholds` options by the current value as before, by the place on the scale in steps, or blended into a gradient across the whole track; and what is not filled as the plain track or in a faded tint of the same.
- The display takes each of these from the interface of the field where it has none of its own. Its dropdowns for them can be emptied in the options form, which hands the option back to the interface.
- **A meter can now be edited, which changes what existing fields do.** Until now the interface was a reading which never changed its field. From this version on a meter in a form is set with the pointer and the keyboard wherever its field can be edited. A field whose meter should stay a reading, such as a number which a flow keeps up to date, has to be marked **Read-only** in its field settings: a read-only field, and one which is disabled or shown where nothing is edited, is drawn exactly as before and cannot be changed. The display in layouts does not change.
- New option `input` for the interface, the method by which the pointer sets the value: `automatic` (the default), `contiguous` (the value is where the pointer is), `segment` (the pieces up to the pointer are filled) or `relative` (the value moves by as much as the pointer moves, with the pointer locked where the browser allows it). `automatic` is `segment` where every piece is exactly one step and `contiguous` otherwise.
- New option `step` for the interface, 1 by default: the distance between two values which can be set, counted from the minimum. The maximum can always be set. A field which was a stock Slider keeps that Slider's step.
- New option `sensitivity` for the `relative` method, 1 by default. Shift makes a drag ten times finer.
- The keys of a meter which can be edited: the arrows for one step, Page Up and Page Down for ten steps or one piece, Home and End for the two ends, Escape to put the value back during a drag. It is one tab stop with the role `slider`.
- What is written is a plain number on the steps, within the range, whole for a field of the type Integer or Big Integer, and only where it differs from what the field holds.
- Apart from that a field which sets none of the new options is drawn as before.

## 1.0.1

- First release published by the manual Publish workflow through npm trusted publishing, which validates the trusted publisher configuration. No functional changes.

## 1.0.0

- Initial release.
