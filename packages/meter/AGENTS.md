# directus-extension-meter

A Directus 11 bundle extension, published on npm as `directus-extension-meter`. It adds the **Meter** interface (`meter`) and the **Meter** display (`meter`) for `integer`, `bigInteger`, `float` and `decimal` fields. The interface draws the number as a bar, or as a row of pills, segments, bars or dots, filled as far as the value has come between a minimum and a maximum, with a caption and the value as text under it. In a field which can be edited it is also the control: the pointer and the keys set the value. In a field which cannot, and with the input method `none`, it is a reading and nothing else. The display draws a short bar of a fixed length and the text in layouts.

The rules which hold for every extension of this repository (independence, bundle hygiene, code style, releasing, the sandbox) are in the root `AGENTS.md`. This file only holds what is specific to this package; `CLAUDE.md` imports it. What a user sees is in `README.md`, and every rule of behaviour, exactly, in `docs/behaviour.md`: read that before changing how something is counted, coloured or written, and keep it true.

## Commands

Run these in this folder, after `npm install` in the repository root:

```bash
npm run dev        # watch build, unminified
npm run check      # vue-tsc, plus tsc over the tests (tsconfig.test.json)
npm test           # vitest
npm run build      # dist/app.js + dist/api.js
npm run validate   # directus-extension validate
```

`prepublishOnly` runs check, build, test and validate: the build comes before the tests, so that `tests/bundle.test.ts` reads the bundle which is published.

## Layout

| Path | What |
|---|---|
| `src/interface.ts`, `src/display.ts` | The two entries of the bundle: `defineInterface`, and `defineDisplay` with its text `handler`. Both have the id `meter`. Each hands `optionFields` what it knows of the field. |
| `src/meter.ts` | Everything which needs no Vue, DOM or Directus, as pure functions. Reading the options (`readOptions`, `readLook`, `readEditing`, `readThresholds`, `numberOf`, `isColor`). The value (`fractionOf`, `percentOf`, `valueText`, `colorFor`, `readingOf`). The pieces (`wantedCount`, `fitCount`, `drawnCount`, `pieceCount`, `barFit`, `pieceGeometry`, `filledCount`). Growth (`reachOf`, `growthOf`, `pieceScale`, `largeScale`). Colours (`scaleStops`, `stopsCss`, `blendAt`, `fadedColor`) and everything drawn for one meter (`drawingOf`). Editing (`canEdit`, `inputMethod`, `defaultStep`, `scaleOf`, `writableRange`, `snapValue`, `pieceValue`, `keyValue`, `relativeMove`, `sideways`, `changes`). What the components hand the page (`paintClass`, `paintStyle`, `rowStyle`, `fillStyle`, `pieceStyle`, `overStyle`, `handleStart`, `saidOf`). The display's `tooltipOf` and `textHandler`. The words of every option with choices are `as const` lists there (`FORMATS`, `VISUALIZATIONS`, `DOTS_LAYOUTS`, `COLORINGS`, `INACTIVE_COLORINGS`, `INPUTS`); the types are derived from them. |
| `src/options.ts` | `optionFields`, the options form of both entries: a list of fields, built from the lists of words in `meter.ts`. Its one import from Directus is a type. |
| `src/interface.vue` | The meter of the form: the track or its row of pieces, the line with caption and text, the pointer and the keys, and its styles. |
| `src/display.vue` | The display: the bar or its row of pieces and the text, inline. |
| `src/ratio.ts` | `useRatio`: the device pixel ratio of the page as one reactive value which every meter shares, kept up to date by one media query listener. |
| `src/i18n.ts` | `useAppText` (the app's `$t`, for "No value"), `useLanguage` and `pageLanguage` (the language numbers are written in). Nothing imports `vue-i18n`. |
| `src/preview.ts` | The SVG in the interface picker of Data Model. Our own drawing. |
| `tests/` | Vitest: `meter.test.ts` and `options.test.ts` for the two framework-free files, and `bundle.test.ts`, which reads the `<style>` blocks of the two components (no comment, no colour but the theme's tokens, system colours only under forced colours) and `dist/app.js` where there is a build (no comment). |
| `sandbox/` | Six browser spec files by topic, `meter-support.ts`, which holds what they share, and `demo.spec.ts`, the smoke test of the demo. |
| `demo/demo.mjs` | The definition of the demo in the sandbox: see [Demo](#demo). |
| `docs/behaviour.md` | The rules of behaviour, by topic. Not in the npm archive; the README links to it on GitHub. |
| `docs/images/` | The pictures of the README, taken in the sandbox. |

## How it works

`docs/behaviour.md` has the rules a user can observe. This section has what the code does to keep them.

### Reading

- **Options arrive as stored,** as props typed `unknown`. `readOptions(own, inherited)`, `readLook(own, inherited)` and `readEditing(own, type, range, scale)` turn them into usable values and never throw. The interface passes its props as `own`; the display passes its props and `interfaceOptions`.
- **Not set, emptied, set.** An option which was never set arrives as `undefined`, an emptied one as `null`. Most keys fall through to the next source whenever they hold nothing usable. `color` and `thresholds` fall back only while the key is `undefined`: the options form shows the interface's colour only until the key is stored, and what is drawn has to follow what the form shows.
- **`grow`** is read from the entry's own options alone, and the display forces it to 0.
- **Limits:** in each source `min` counts before `minValue`, and `max` before `maxValue`; then the next source; then 0 and 100. The stock Slider of 11.17.4 itself draws by `min` and `max` on a field which has both pairs (`app/src/interfaces/slider/slider.vue:38-49`).
- **The step:** `step`, else `stepInterval`, else `defaultStep(range, whole, scale)`. `scaleOf` reads `numeric_scale` from `fieldData.schema` of a `decimal` field only. A field which was a stock Input brings a `step` along where one was set there: it is the Meter's own key, and the meter uses it.
- **Never a number which is not finite.** `numberOf` takes a number, a bigint or the plain decimal text of one. `fractionOf` stays within 0 and 1 and returns 0 for a share too small to divide by. Differences of very large limits are halved first (`shareOf`). The unit tests pin this with extreme values.

### Drawing

- **`drawingOf`** takes one object (`look`, `options`, `reading`, `count`, `value`, `reach`, `at`) and returns plain data: the paint of the track and the fill, or a list of pieces with `filled`, `paint`, `size` and `over`. The two components bind it with the style helpers of `meter.ts`, which take a prefix: `mt` for the interface, `md` for the display.
- **A surface with one colour** gets an inline `backgroundColor`. A surface which shows its part of the colours across the track gets the class `-paint` (and `-weak` where faded) and its place in `--<prefix>-at`; the stops are in `--<prefix>-stops` and `--<prefix>-weak-stops` on the root, and `--<prefix>-n` says how many parts there are. A surface painted by its own rule has no inline style at all.
- **The fill of the one bar** is sized by the track, not by itself: `100cqi` in the form (the track is a container, class `mt-scaled`, only then), `4.5rem` in the display. Sized by the fill, a stop would move by a pixel as the value changes.
- **A gradient has no logical direction,** so a right-to-left page has rules of its own by `:dir(rtl)`. Everything else is laid out along the inline axis.
- **Sizes are transforms.** A piece which grows, and a piece which a press of the pointer would fill, is drawn at its size by a `transform` about its middle. No box changes, so the count, the gaps, the height and where the pointer counts a piece are untouched. `pieceStyle` decides between the two sizes: the large one wins. A large pill also gets corner radii which keep its ends round (`roundEnds`).
- **`fade`:** each piece which is fading in (the next one, or as many as the reach covers) has one child (`-over`), painted as the piece will be once filled, at the opacity of its growth.
- **Bars** are sized by `barFit` in whole device pixels and handed to the row as `--<prefix>-bar` and `--<prefix>-gap` (class `-fitted`). `fitCount` counts bars with the same least sizes.
- **Measuring.** The form measures the element on the line of the track with a `ResizeObserver`, only while the visualization has pieces (`watched`). The width is read by three computed values (the count, the two sizes of the bars, the reach of thin bars), each of which changes only now and then, so a meter is not drawn again with every pixel. A field which is not shown has no width and draws one bar. The display measures nothing: its length is `DISPLAY_WIDTH`.
- **The text is whole or absent** by layout alone. Its box is a flex container which may wrap, one line high, with `overflow: hidden`, and a zero-width space as `::before` holds the first line: a number which does not fit goes to the second line and is gone. Never put `text-overflow` on a number.
- **Transitions** are switched by classes on the row: `mt-eased` (two frames after a value was first drawn, and not while the pointer drags the value) and `mt-swell` (while pieces are large, and 250ms after). While a drag sizes the growing pieces by where the pointer is, the row also has `mt-tracking`, and `mt-swell` then eases only the pieces up to the pointer (`mt-near`), so a growing piece follows every movement. All sit inside `prefers-reduced-motion: no-preference`.
- **Forced colours and print** are CSS only: a `@media (forced-colors: active)` block in each component, `!important` because the colours of the options are inline, and `print-color-adjust: exact` on both roots.
- **The styles have no comments.** What they rely on is written at the end of each component's `<script>`, which is not shipped. Read those notes before changing a style.

### Editing

- **`canEdit(state, method)` is the one gate.** `disabled`, `nonEditable` or `loading`, each alone, or the method `none`, make a reading. The template binds the listeners, the tab stop and the role `slider` only while `editable` holds; every handler returns at once without it; `write` checks it again.
- **Listeners.** Six on the line (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `pointerleave`, `keydown`), one `pointerdown` on the root for a coarse pointer, one on each of the two `mt-reach` elements which make the target taller. One `pointerlockchange` on `document`, added at the first press with the `relative` method and removed when the component is unmounted. A reading has none.
- **`write`** emits only a finite number which `snapValue`, `pieceValue` or `keyValue` made, and only where `changes` says it differs from what the field holds. The one other emit puts back what the field held before a press (Escape, `pointercancel`, a pointer lock ended by the browser).
- **A press** is one `Drag` object from `pointerdown` to its end. The pointer is captured. A finger starts as `pending` and writes nothing until it has moved sideways (`sideways`, `TOUCH_SLOP`) or is lifted where it came down.
- **The frame of an event** (the box of the track, the direction, the pieces as laid out) is worked out at most once for an event (`framed`), and not at all for a pointer resting on one bar.
- **The grid.** `gridOf` numbers the points which can be written from 0 at the minimum, with the maximum as the last point where the steps miss it. The pointer and the keys count in points and turn a number back into a value; nothing adds a step to a value. A point is cleaned to the decimals of the step and the limits (`toFixed`, up to fifteen). `defaultStep` makes its power of ten from decimal text (`Number('1e-2')`) for the same reason.
- **`automatic`** is settled by `inputMethod` from the count, the step and the range; the components never look at the word.
- **While the pointer drags** by position or relatively, `exact` holds where the pointer is, and `drawingOf` takes it as `at`: sizes and fading follow the pointer, the fill and the value stay on the steps.
- **The large pieces** are counted by `largeCount`, which `enlargeUpTo` hands the method, the place of the pointer, the pieces as laid out and what `valueUnder` says a press there writes. By `piece`: up to and including the piece under the pointer (`filledAt`). By `position`: as many as the drawing fills for that value (`filledCount`), so the press which follows fills exactly those. None with `relative`, on one bar, for a finger or in a field which cannot be edited; for those `enlargeUpTo` asks for no frame.
- **`saidOf`** says what assistive technology is told: a reading the range as stored, a slider the range which can be written.
- **The direction** is asked of the element (`getComputedStyle(...).direction`). The `direction` prop of the form is that of typed text, and is not used.

### The options form

- `optionFields(fallback, display, type, known, own, schema)` builds both forms. `fallback` is what an unset option comes to: for the display the options of the field's interface, for the interface the limits and the step a stock Slider left behind.
- **A default which a form shows is not stored.** The defaults are in the components.
- **Options which apply only sometimes** are always in the list, with `conditions` on the values of the form itself. Each rule has one key: the app passes over a rule with more or fewer (`app/src/utils/apply-conditions.ts:16`).
- **Active Coloring shows only while there are thresholds.** Its rules are on the form's `thresholds`: two on `count(thresholds)`, which the app works out before it tries a rule (`packages/utils/shared/validate-payload.ts:57`), since no operator tells `[]` from a list with entries, and before them two on the key itself: `null` (never set in the interface's form, or emptied) hides, and anything else shows. The app tries the last rule first, so the last of these only decides in an app which does not count, where the dropdown would else be out of reach. The values a rule sees have the defaults of the form's fields under them, so a display which never stored the key is judged by the interface's list, which is the default of its `thresholds`. The blind form has only the two which count: there `null` is also what "never stored" looks like.
- **`known` is false** in the dialog of a stock Repeater's field, which hands the forms a stand-in without `meta` (`app/src/interfaces/_system/system-interface-options/system-interface-options.vue:49-53`). The display's form is then "blind": placeholders say "As in the interface", dropdowns start empty, and the options which apply only sometimes show until the form's own values rule them out.
- **The notes of half-width options fit two lines** (about eighty characters), which a browser test measures. The README's options table is where each option is told in full.

### The display

- Inline content: no more height than its line. The app does not call a display for `null`; blank text gets the app's `value-null`, and a value which is not a number is plain text.
- The tooltip (`v-tooltip`) always has the value text, after the caption where there is one.
- The name of a meter without a caption is the name of the field, from the app's fields store through `useStores`; where that fails it is "Meter".
- `handler` is `textHandler`: the value text, `null` for an empty field.

## Invariants: do not break

1. **Stored values and option keys are public API.** The field holds a plain number. The ids `meter` (interface) and `meter` (display), every option key (`min`, `max`, `label`, `indicator`, `indicatorFormat`, `prefix`, `suffix`, `visualization`, `subdivisions`, `dotsLayout`, `grow`, `fade`, `color`, `thresholds` with `value` and `color`, `activeColoring`, `inactiveColoring`, `input`, `step`, `sensitivity`) and every word of an option with choices keep their names and meanings. `minValue`, `maxValue` and `stepInterval` keep being read. 1.0.1 is on npm with `min`, `max`, `label`, `indicator`, `indicatorFormat`, `color` and `thresholds`.
2. **Read loosely.** Limits and thresholds arrive as numbers or as their text, and a `decimal` or `bigInteger` value as text on some databases. A display with options of its own draws by them, whatever its interface has.
3. **The options form of the display shows what the layouts draw.** Whoever changes the fall-back of a key changes what the form shows for it, and the other way round. Do not give a prop a default: it would hide the difference between `undefined` and `null`.
4. **The defaults are in the components, not in the form.** Do not type an option's prop as a boolean: Vue would turn a missing one into `false`.
5. **Never throw, never hand the page a number which is not finite.**
6. **Nothing falls through.** `inheritAttrs: false` in both components, and no template binds `$attrs`.
7. **The options are untrusted.** Text reaches the page only through `v-text`. A colour reaches CSS only after `isColor`, which takes a hex colour or one `var(--theme--...)` and nothing else.
8. **`meter.ts` stays free of Vue, the DOM library and Directus,** and `options.ts` of everything but a type of Directus. `tsconfig.test.json` type-checks both without the DOM library.
9. **A field which cannot be edited never emits,** and has no dimming, no pointer reaction, no tab stop, no listener and no handle. A meter set to `none` is such a meter by `canEdit` and by nothing else: never give a handler or a style a check for the word.
10. **A field which can be edited writes only what `snapValue`, `pieceValue` or `keyValue` made:** a finite number on the grid, within the range, whole for a whole type.
11. **`contiguous` with the default colouring, and both `grow` and `fade` off, add nothing to the page:** the elements, classes and inline styles of the plain meter, in a field which cannot be edited exactly those of 1.0.1. A piece is filled or not, never in part, and what is said about the value is never the rounded one. The number of pieces comes from the width of the track's own line and from nothing which the pieces could change.
12. **A number shows whole, or not at all.**
13. **Bundle hygiene.** No dependencies to bundle, and none should be added. `dist/app.js` is 49,331 bytes (15,696 gzipped) and `dist/api.js` 72 bytes: report size changes. No comments in the `<style>` blocks, since the build keeps them; `tests/bundle.test.ts` checks it.
14. **It is an app-only bundle,** so the Marketplace can install it under the default `MARKETPLACE_TRUST`.
15. **Directus look.** Only `--theme--*` tokens for colours, and system colours only under forced colours (`tests/bundle.test.ts` checks both). The track is `--theme--form--field--input--border-color`, the fill `--theme--primary` unless an option says otherwise. Styles are scoped; class names other than the two roots (`meter`, `meter-display`) start with `mt-` in the interface and `md-` in the display.

## Code style

The root `AGENTS.md` has the style of the repository. In this package also:

- `src`, `tests` and `sandbox` are laid out as Prettier 3.3.3 lays them out with `--print-width 160 --use-tabs --tab-width 4 --single-quote`; `npx prettier@3.3.3 <those flags> --check src tests sandbox` passes. Prettier is not a dependency.
- The unit tests cover `meter.ts` and the list of fields which `options.ts` builds. Everything in the two components, and what the app makes of the options form, has to be checked in a browser.
- The names of the options are the app's own strings where one says exactly the same (`$t:interfaces.input.minimum_value`, `$t:interfaces.input.maximum_value`, `$t:label`, `$t:format`, `$t:color`, `$t:automatic`, `$t:percent`, `$t:value`, and `$t:displays.formatted-value.prefix` and `.suffix`, the names of the same two options of the stock Formatted Value display). Every other name, choice and note is plain English, with "color" as the app spells it. The package has no translations of its own.
- The key of the format is `indicatorFormat`, not `format`: the stock Formatted Value display stores a boolean under `format`, and the options of a field can outlive a change of its display. The key of the look is `visualization`, not `style`, which is no ordinary prop in Vue.
- A new word of an option goes into its list in `meter.ts` and its record of names in `options.ts`; the type check fails until both have it.

## Demo

`demo/demo.mjs` describes the demo in the sandbox (see `sandbox/README.md`, "Demos"): the collection `demo_meter`, with 50 meters, all but the plain bar at half the width of the form, as in the README's pictures, in six groups: Recipes, Visualization, Coloring, Grow and fade, Text, Editing. Its six items differ only in how far they have come (each value is a share of each field's range); "Past half" is at 62%, where the next of 5, 10 or 20 pieces is under way, so growing and fading show at rest. The table has a preset with the recipes and four more columns, a bookmark each for Visualization, Coloring and Text, and a bookmark "Grow and fade" with four columns of that group: the pills without and with growth, which the display draws alike, and the two which fade in, which it fades too.

A new or changed option gets a field in a group, or is added to one; set no option to its default, since the note under a field lists what it sets. `sandbox/demo.spec.ts` builds the demo and checks that every field draws a meter, and every value in the table and in each bookmark the display.

## Testing in a browser

The browser tests run against the sandbox Directus of the repository (root `AGENTS.md`, `sandbox/README.md`), in Chromium. **The titles of the tests are the list of what is covered:** `npx playwright test meter/ --list` in `sandbox/` prints them (98 tests, 1 of them the demo's).

| File | What it holds |
|---|---|
| `meter-reading.spec.ts` | The interface as a reading in the form: the fill and the text, no value, the roles, the area as high as an input, a condition, right-to-left, prefix and suffix, forced colours, print, the dark theme, "No value" in the language of the user, a translated caption, markup as text. |
| `meter-display.spec.ts` | The display: the table, the tooltip, a template of a related item, its own options against the interface's, both pairs of limits, emptied colour and thresholds, right-to-left, prefix and suffix in the table, text which does not fit, Arabic digits, plain text in the calendar. |
| `meter-pieces.spec.ts` | Pieces and colourings, in the form and in the table: the shapes, the count by the width, dots packed and spread, colours read from pixels, one colour over a track painted by the scale, and their options forms, with Active Coloring which shows only while there are thresholds. |
| `meter-editing.spec.ts` | What the pointer, a finger and the keys write, by every input method; a second finger, a release the meter never saw, keys which never scroll the page and are left alone during a drag, Escape in a drawer; what a reading is spared; the step; what is measured and observed; the options forms of editing. One test starts the full Chromium for the pointer lock and is skipped where that cannot be started. |
| `meter-live-pieces.spec.ts` | The pieces of a meter which can be edited: large where a press would fill them (by "Piece" and by "Position"), growing and fading, no transition for the first value a form draws, and the colours of the scale during a drag. |
| `meter-ratios.spec.ts` | Bars at real device pixel ratios of 1, 1.5 and 2 (a browser of its own for each), a meter in a stock Repeater, and a field the form does not let the user change (a user who may only read, a batch edit). |
| `demo.spec.ts` | The smoke test of the demo (see [Demo](#demo)): it builds `demo_meter`, not a `sandbox_meter...` collection. |

`meter-support.ts` holds the fixtures (`seedMain`, `seedOwners`, `seedWide`, `seedEdit`, `seedRepeater`, `seedUnits`, `removeAll`), the helpers which read a meter in the page (`readPieces`, `shown`, `expectFilled`, `listened`, `optionsDialog`, `pixel` among them), `signedIn`, which opens a signed-in page of its own in any browser and fails on its errors, `makeUser`, for a user of the tests' own (another language, the dark appearance, fewer permissions), and `asDecimal`, which tells the app of a page that a field is a decimal with a scale.

Each file makes the collections it needs before its tests and removes them after, so one file runs alone:

```bash
npm run sandbox:test -- meter/                          # all seven, from the repository root
npm run sandbox:test -- meter/sandbox/meter-editing     # one file
cd sandbox && npx playwright test meter/ -g "a title"   # one test: npm takes `-g` for itself
```

Build first: the sandbox loads `dist`. The files share collection names (`sandbox_meter`, `sandbox_meter_owner`, `sandbox_meter_wide`, `sandbox_meter_edit`, `sandbox_meter_repeater`, `sandbox_meter_units`), so they run one at a time. A new test is shown to fail once, on a build with the behaviour broken.

Things which are easy to trip over:

- **A click right after a page opens lands on a cover.** The app fades out an element over the whole page (`.hydrating`). `openEdit` waits until it is gone.
- **The form hands over `null` before the item arrives,** so a test first waits for the text it expects.
- **The app keeps a list of the keys which are down.** A `keydown` sent to an element without a `keyup` stays in it, and Ctrl+S no longer saves. `keyOn` sends both.
- **Home, End, the Page keys and the space bar scroll the page** when no meter has the focus, and the scrolling goes on for a moment. Measure two boxes in one `evaluate`, not one after the other.
- **A click anywhere on the label of a field opens the menu of the field.** It stays open and takes the next clicks; a second click on the label closes it, Escape does not.
- **The headless browser of the tests has no pointer lock which works.** On macOS it refuses the lock. On Linux, where the Build workflow runs, it grants it and then reports movements which no pointer made, with no button held, and a relative drag ends at once. `refuseLock` makes the pages of the tests of editing refuse the lock on every system, and the test of the lock starts the full browser (`channel: 'chromium'`).
- **A ratio which is emulated is not a real one.** `deviceScaleFactor` enlarges a page laid out in whole CSS pixels. `--force-device-scale-factor=2` at launch, with `viewport: null`, gives real device pixels.
- **A finger can be driven:** a context with `hasTouch`, `page.touchscreen.tap`, and `Input.dispatchTouchEvent` through a CDP session for a finger which moves.
- **A transition makes a size a moving target.** Read sizes with reduced motion emulated, and test the transition apart.
- **Colours are read from the page, not from the styles.** The computed style of a painted surface is the same gradient everywhere; `pixel` reads a screenshot. The handle lies over the colours near the end of the fill.
- **Forced colours and print are emulated per page** (`page.emulateMedia`), and Chromium's emulation has colours of its own. Compare with the colour of the page beside the meter, not with an expected colour.
- **A theme colour can only be read once the page has its theme.** Read a token after the first thing the test waits for.
- **Right-to-left needs no user.** The app rewrites `dir` on the root element, so `turn` sets it on `body`; the meter follows the page.
- **What shows of a text is worked out, not asked.** `shown` cuts the box of the number by every ancestor which hides its overflow. A number which wrapped out of sight still has a box and its text.
- **Arabic digits are narrower than western ones in the app's font.** Squeeze to a fixed width rather than count on a text being too long.
- **A column of the default width has no room for "$4,200" beside the bar.** A table of value texts with units gives every column a width.
- **Packed dots and bars are shorter than their track.** A drag by position goes along the row, not the width of the field.
- **A field is squeezed by its `.interface`,** not by the `.field` around it. A field with the width "fill" changes the columns of its whole form, so it lives in a collection of its own.
- **A resized window goes on settling.** Read a width and a count together, and again until they agree.
- **The dialog of a Repeater's field** is reached through Settings, Data Model, the json field, Interface, "Edit Fields". Its display options are in a group which starts closed. The save shortcut does nothing while a drawer is still closing.
- **A drawer slides in.** A meter in it which is measured at once is pressed some pixels off: wait until it has been in one place for a few frames.
- **Two fingers can be driven as well:** `Input.dispatchTouchEvent` takes every finger which is down, the second is not the primary pointer, and nothing is pinched or cancelled. `touchEnd` takes no fingers and lifts all of them.
- **A threshold is added in a drawer of its own and removed after the app has asked.** `optionsDialog` has `addThreshold` and `removeThreshold`. A list which is emptied in the form is `null`, and equals the default, so nothing is stored for it.
- **The app's tooltip is one shared element with one timer,** and leaves `data-tooltip` on its element. `expectTooltip` moves the mouse away and back until it shows.
- **A choice of a dropdown found by a part of its text can be another one:** "Value" is also in "Value / Maximum". Ask for the exact text.
- **The app's form does not store a value which equals what the input shows as its default.**
- **SQLite has no decimal columns.** A `decimal` field of the sandbox comes back as `float` without a scale; `asDecimal` rewrites the answers of `/fields` for one page.
- **A test which changes the administrator restores it in a `finally`.** Better: `makeUser`.
- **The trace of a failed run is gone with the next run.** And do not build while a run is under way: the sandbox reloads extensions when a `dist` changes.
- **`removeAll` in every `afterAll`** leaves nothing to look at after a failed run but the trace.

## Known gaps

Not tested, or accepted as it is. A statement that something "was not tried" is the record of earlier work, kept here so nobody takes it for covered.

**Platforms**

- Only Directus 11.17.4. The browser tests run in Chromium only. Editing, the pieces, the colourings and forced colours were never tried in Firefox or WebKit.
- No real touch device, no pen, no screen reader, no custom theme, no contrast theme of Windows. Touch is driven through the browser's tools; forced colours and print are Chromium's emulation; no page was printed.
- `color-mix()` and `:dir()` are required for faded and blended colours and for a right-to-left gradient. Without them a colour falls back to the plain track or the primary colour, and a gradient does not turn. `1lh` and `100cqi` have fall-backs in the styles which were not tried in a browser without the units.
- Not tried next to another extension which registers an interface or a display with the id `meter`.

**Decimal columns**

- **The default step by the scale of a `decimal` column was tried only with the app told of the scale** (`asDecimal`), since SQLite has no decimal columns. A database which rounds was not tried.
- A database which returns `decimal` and `bigInteger` values as text was not tried either; the unit tests cover the reading of such text.
- A step which is set is not held to the scale. A big integer beyond 2^53 is written as the nearest number which can be held.

**Editing**

- **A touch which drifts sideways and then scrolls the page writes.** The meter takes a finger for a drag after 6px along the track; the browser decides later that the gesture is a scroll, sends `pointercancel`, and the value is put back, so the text flickers. On a field which its own condition closes at the value written, the put-back is refused and the edit stays. The fix which is meant: with a finger, draw the value during the drag and write it once, when the finger is lifted. No test produces the diagonal start.
- **The keys at the edge of a double's precision.** From about fifteen significant digits between a value and its step, a key can skip a point or stay on one. In a range without a grid (more than `Number.MAX_SAFE_INTEGER` steps) the arrow and Page keys can do nothing. No test.
- `pointer: coarse` without touch events was not produced. `nonEditable` and `loading` were not seen on their own: a field the user may not change arrives with `disabled` and `nonEditable` both.
- Under the pointer lock `movementX` was only seen at a device pixel ratio of 1. Escape ending a lock in the browser's own way was not produced; the test ends the lock from the page.
- While the pointer drags, a piece can be at its full size a moment before the value fills it, and with steps of more than half a piece the value can fill a piece before the pointer is there.
- A large piece reaches up to 3px outside the track. Under a caption of several lines that is into the gap under the field's label; nothing cuts it off in the item form or in the drawer of a Repeater's row, and other containers were not tried.
- The round outer end of a row of segments is squashed with its segment where it grows, and stretched where it is large. Only a large pill has its corners corrected.
- The input method `none` makes a reading of the meter, not of the field: **Edit Raw Value** and **Clear Value** in the menu of the field's label still change it, which the test of the method in `meter-editing.spec.ts` shows.

**Pieces and bars**

- How many bars fit depends on the device pixel ratio, so it changes with a zoom, and with it `automatic` can change from `piece` to `position`. `useRatio` follows a change of the ratio, but no test changes it on a live page.
- The pieces are counted in pixels of 16 to the rem and drawn in rem. With another root font size the two would drift apart.
- No browser test reaches the cap of 200 pieces; the unit tests pin it.
- The gaps of spread dots can differ by one device pixel, since they share a width which rarely divides. Without a value, many thin bars are a lattice of dashes.
- The pieces of the display were not looked at in a card or at the three row heights of the table.

**The display and the options forms**

- A caption, prefix or suffix of the display cannot be emptied where the interface has one. A colour or list of thresholds which was set or emptied in the display follows the interface again only when the key is removed from the stored options, for which the form has no control.
- Active Coloring shows for any list of thresholds with entries, also one whose thresholds all lie at or below the minimum or are not usable, where the four colourings still draw the same. In the dialog of a Repeater's field the display's form shows it whatever the interface has, and also after its own list was emptied there. The rules which tell an empty list lean on `count()` in a condition, which was tried in 11.17.4 only; the source of 11.15.0 has it as well, and without it any list which is not `null` shows the dropdown.
- A text which does not fit is left out without a mark. In the form only assistive technology and the raw value have it then.
- The fraction as plain text (the handler) carries no direction mark, so a right-to-left page may lay "7 / 12" out as "12 / 7" where the app prints that string.
- In the dialog of a Repeater's field the Step input takes decimals also for a whole type, and the two toggles of the display's form (Value Text, Fade In) show a default which may not be the interface's. A decimal field in a Repeater was not tried, nor other places which draw options inside another form (a flow's operation, a panel).
- A form inside the translations interface with a right-to-left language was not tried: the meter runs in the direction of the page there, by decision.
- The prefix and the suffix are inside the text marked as running from the left; a suffix in a right-to-left script was not tried. A translation string as a prefix or suffix cannot be given a space of its own.
- The order of the two pairs of limits follows the stock Slider of 11.17.4. Another version may differ; the test which reads the Slider's own limits would then fail.
- The names, choices and notes of the options, the notices of the display's form and the fall-back name "Meter" are English only.
