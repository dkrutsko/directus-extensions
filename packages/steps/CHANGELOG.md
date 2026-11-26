# Changelog

## 1.1.0

### Added

- **A step which cannot be chosen shows its name too.** In a field without labels which is read-only, disabled by a condition or shown in the comparison of revisions, the name of a step shows as a tooltip when the mouse rests on it. In 1.0 such a field showed its numbers and nothing else.
- **The options as stored** are in the README, for a field which is set up through the API or a schema file.

### Changed

- **The field is one tab stop.** Tab enters the track at the current step, or at the first where no step is current, and the next Tab leaves it. In 1.0 every step was a tab stop, so a field of twelve steps took twelve presses. The arrows, Home and End move along the track and Enter and Space choose, as before. This is the change which makes the version a minor one: someone who went from step to step with Tab now uses the arrows.
- **The warning for a value which is not a step** puts the value between quotation marks and keeps its spaces: `The value “draft ” is not one of the steps.` A value which differs from a step by a space at its end used to read as that step.
- **The empty pips of the display** are in the subdued text colour of the theme. The accent colour of the borders, which they had, could hardly be seen against the page.
- **The description of the display** in the display picker says that it shows the name of the step, not its label.
- **Size.** The app bundle grew from 18.8 kB to 21.2 kB (6.2 to 6.7 kB gzipped). It still has no dependency.

### Fixed

- **The list of steps is named after its field** for assistive technology. In 1.0 every track of a form was a list called "Steps". That name is left for a field which has none.
- **The count of the display,** such as "5/12", is announced as "Step 5 of 12", as the pips are, and no longer as "5 slash 12".
- **The warning is tied to the list,** so someone who enters the track without seeing it is told why no step is the current one.
- **The list says that it is one** (`role="list"`). Safari with VoiceOver takes a list without bullets for no list, and then did not announce the position of a step.
- **Contrast themes.** Under a contrast theme of the system (forced colours) the pips of the display, the fill of a done step, the lines between the steps and the thumb of the scrollbar were not drawn at all, since the browser takes the colours of a theme away there. They are now drawn in the system's colours: a done step is filled, the current one has a ring twice as wide, an upcoming one a plain ring, and a pip which is not filled is a ring.
- **A track no longer measures its labels on every keystroke** in another field of the form. Every track of a form did, since the form hands each field its options again with every change.
- **The note of the Steps option** says, on an integer field, that a step whose value is not a whole number is left out, and the note of Show Labels that the tooltip is also there where the field cannot be edited.
- **The README** no longer says that the `host` range starts with the first release which has `nonEditable`: `^11.15.0` is the range every extension of the repository declares, and only Directus 11.17.4 is tested. It says "name" where it meant the name of a step, and "Chromium" for the browser it was tested in.
- Tests: the unit tests cover the tab stop, the tooltips and the moves of the track, a new test guards the style rules and the built bundle, and the browser tests cover the comparison of revisions, reduced motion, forced colours, a Repeater, a condition, the dark theme and another language.

## 1.0.1

- First release published by the manual Publish workflow through npm trusted publishing, which validates the trusted publisher configuration. No functional changes.

## 1.0.0

- Initial release.
