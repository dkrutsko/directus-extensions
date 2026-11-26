# Changelog

## 1.0.2

### Changed

- **A value which is neither `true`, `false` nor `null` is read by the rule Directus itself uses to turn a value into a boolean.** `1`, `"1"` and `"true"` are on and everything else is off. Until now any value which JavaScript calls truthy was on, so the text `"false"` or `"0"`, which a row of a Repeater or an import can hold, was drawn as on. A boolean field never holds such a value, and `0` and `1` are drawn as before.
- **A screen reader hears the name of the field in front of the label,** "Newsletter Enabled" where it was "Enabled", so two switches with the same label are told apart. Where the label says what the name of the field says, it is said once. Nothing which is seen changes.
- **A field without a value is announced in the user's language,** with the app's own words ("No value" in English), where it was "Not set" in English only.
- **The dimmed look of a field which becomes read-only is there at once,** as on the stock input beside it. It used to fade in.
- The notes of Color On and Color Off use the app's spelling and say that a theme variable such as `var(--theme--success)` can be typed in.
- README: the keys of the options, what a screen reader hears, how values from outside the app are read, and a link to this changelog. The sentence about the `host` range no longer says that 11.15.0 is the first release with `nonEditable`: Directus 11.17.4 is the only version which was tried.
- **Size.** The app bundle is about 11 kB as before (10.6 kB to 10.9 kB), and 3.6 kB gzipped where it was 3.9 kB: the comments of the styles no longer ship.
- Tests: guards of the styles and the built bundle (no comment, no colour but the theme's tokens), and browser tests of the comparison of revisions, forced colours, print, a Repeater, the numbers `0` and `1`, the accessible name and the options form. Every browser test which saves has an item of its own.

### Fixed

- **Contrast themes.** Under a contrast theme of the system (forced colours) the track and the knob disappeared, and a switch whose icons are cleared showed no state at all. The track is now an outline with a solid knob, filled with the system's highlight colour while on, dashed while the field has no value, and in the system's gray while read-only.
- **Print.** A printed form keeps the tracks and the knobs of its switches, which a browser used to leave out. The box prints as before, like a stock input.

## 1.0.1

- First release published by the manual Publish workflow through npm trusted publishing, which validates the trusted publisher configuration. No functional changes.

## 1.0.0

- Initial release.
