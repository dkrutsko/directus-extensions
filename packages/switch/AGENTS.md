# directus-extension-switch

A Directus 11 interface extension, published on npm as `directus-extension-switch`. It adds the **Switch** interface (`switch`) for `boolean` fields: a box as tall as a stock input with a label and a line of description at the start and an on/off switch at the end. It stores what the stock Toggle stores and exists for fields which read like settings, where a sentence that says what the switch does is worth having.

The rules which hold for every extension of this repository (independence, bundle hygiene, code style, releasing, the sandbox) are in the root `AGENTS.md`. This file only holds what is specific to this package; `CLAUDE.md` imports it.

## Commands

Run these in this folder, after `npm install` in the repository root:

```bash
npm run dev        # watch build, unminified
npm run check      # vue-tsc, plus tsc over the tests (tsconfig.test.json)
npm test           # vitest
npm run build      # dist/index.js
npm run validate   # directus-extension validate
```

`prepublishOnly` runs check, build, test and validate: the build comes first because one of the tests reads `dist/index.js`.

## Layout

| Path | What |
|---|---|
| `src/index.ts` | `defineInterface` and the six options. The id `switch` is stored in users' schemas: never rename it. |
| `src/switch.ts` | The framework-free part: the state of a value (`stateOf`), what a toggle writes (`toggled`), when the switch is inert (`isInert`) and when it is dimmed (`isDimmed`), the name of the field in front of the label (`fieldNameFor`), the options (`readOptions` with `labelText`, `descriptionText`, `iconOr`, `colorOr`, `isColor`) and the look of a state (`lookOf`). No Vue, no DOM library, no Directus imports, so the tests run it in Node. |
| `src/interface.vue` | The component: one `button`, its template and all styles. The notes on the styles are at the end of its script, since the styles have no comments. |
| `src/i18n.ts` | `useAppText`, which reads the app's `$t` for the default label and for "No value" without importing `vue-i18n`. |
| `src/preview.ts` | The SVG shown in the interface picker of Data Model. Our own drawing, in `--theme--primary`. |
| `tests/switch.test.ts` | Vitest unit tests of `src/switch.ts`. |
| `tests/bundle.test.ts` | The guards of the styles and of the built bundle: no comment, no colour but the theme's tokens, system colours only under forced colours, and the rules which a contrast theme and print need. |
| `sandbox/` | Browser tests which run against the sandbox Directus of the repository. |
| `docs/images/` | The screenshots of the README, taken in the sandbox. |

## How it works

- **Three states, two values.** `stateOf` gives `on` for `true`, `off` for `false` and `unset` for `null` or a missing value. Anything else was written outside the app (SQLite hands back `0` and `1` for a boolean field without the `cast-boolean` special; a row of a Repeater or an import can hold text) and is on where Directus's `toBoolean` says true: `1`, `'1'` and `'true'` (`packages/utils/shared/to-boolean.ts:4-6`). Everything else is off, `'false'` and `'0'` included. The cast of a boolean field on read (`api/src/services/payload.ts:91-103`) says the same of `true`, `1`, `'1'`, `false`, `0` and `'0'`; it leaves `'true'` as text, and makes `''` a `null`, where the switch, handed `''` itself, draws off. `toggled` always gives a boolean, and `true` from `unset`. The switch never writes `null`.
- **Options are worked out once, in `readOptions`.** The component passes its props as they are, and the template only sees the result. A label is trimmed and never empty, a description of spaces is no description, a colour which is not a colour is the default. For an icon, `undefined` (never set) is the default and `null` (cleared in the icon picker, which is what it stores) is a knob without an icon.
- **The look of a field which is not set is fixed.** `lookOf` gives it the `remove` icon and a grey track whatever the options say, and the styles put the knob in the middle.
- **One button is the whole box.** `role="switch"` with `aria-checked`, named through `aria-labelledby` and described by the description element (`aria-describedby`). The role has no third state, so a field which is not set is announced as off, and a hidden element with the app's `no_value` ("No value", in the user's language) is added to its description. Enter and Space come with the button.
- **The name is the name of the field, then the label.** The label alone is "Enabled" on every field which sets none, so a form with three such fields would offer "Enabled, switch" three times. The form hands the field to every interface as `fieldData` (`app/src/components/v-form/components/form-field-interface.vue:77`), and `fieldNameFor` takes its `name`, which is the text the form prints above the box. It sits in a `hidden` element which `aria-labelledby` names first; a hidden element which is referenced directly still counts for the name. Where there is no name, or it says what the label says (compared without case), the label stands alone. Nothing of this is seen. A row of a stock Repeater has a `name` as well.
- **Inert and dimmed are two things.** `disabled`, `nonEditable` and `loading` each make the button natively `disabled`, so it is not a tab stop and never emits (`isInert`). Only `disabled` without `nonEditable` dims it (`isDimmed`). That is how the stock Toggle treats the comparison views (`app/src/components/v-checkbox.vue:119-120, 189-217`).
- **The size comes from the input tokens.** `min-block-size` is `--theme--form--field--input--height`, the inline padding `--theme--form--field--input--padding`. The text has lines of 17px (`1.0625rem`) instead of the app's 20px so that a label with one line of description still fits the 54px of a stock input: 2 x 17 + 2 x 8 of padding + 2 x 2 of border. Change one of these and the other two have to follow; the browser test compares the heights.
- **The box eases its border and its shadow, and nothing else,** as the stock input does (`app/src/components/v-input.vue:431-432`). 1.0.1 eased `color` and `background-color` too, and the dimmed look of a field which a condition makes read-only faded in over 125 ms beside an input which changed at once.
- **The focus ring is the app's.** The global rule of `app/src/styles/_base.scss:45-49` draws it on any button with keyboard focus. The component only turns it inwards (`--focus-ring-offset`), as the stock block controls do, so it sits on the border.
- **The knob moves by `inset-inline-start`,** not by a transform, so right-to-left needs no code. It slides only after the switch was flipped by hand (`animated`): the first change of state is the item arriving in the form, which would send every knob on the page from the middle to its place.
- **The colour of a state reaches CSS as `--sw-color`** on the track, through Vue's style binding. `isColor` lets nothing through but a hex colour or a `var(--theme--...)` reference.
- **Under forced colours every colour is a system colour.** A contrast theme of the system takes every background away, which leaves nothing of a track and a knob. The block `@media (forced-colors: active)` draws the track as an outline in `CanvasText` around `Canvas` with a solid knob, fills a switch which is on with `Highlight` (knob `HighlightText`), gives a field without a value a dashed outline and a knob in `GrayText`, and draws a read-only switch in `GrayText` at full strength. The outline is an `outline` with a negative offset, not a border: the knob is placed from the padding box of the track, so a border would move it. The track sets `forced-color-adjust: none`, because the mode lays a plate in the colour of the page behind text, and the icon in the knob is text: with the plate the knob looked hollow and the icon could not be seen. That is safe only while every colour in the track is set by that block, so a new painted part of the track needs a rule there. The icon takes its colour from `--v-icon-color`, which the block sets on the knob.
- **A printed form keeps its tracks and knobs, and no more.** `print-color-adjust: exact` on the track, with the `-webkit-` name beside it, since a browser prints no background unless asked. The property is inherited, so the knob and its icon have it from the track. It must not be on the box: the box's own background would print as well, which in a dark theme makes every switch a black block with light text beside stock inputs which print white, and a read-only switch would print its subdued background, which a disabled stock input does not. Without it the box prints as the stock input does, and Chromium darkens its text for paper.
- **Nothing drawn for an icon leaves the knob.** An icon name is not checked against a list, which changes with the app. A name the app does not know is drawn by `v-icon` as text, some 380px of it for a long name, so the icon is cut to its own box and the knob to its circle (`overflow: hidden` on both). What is left of an unknown name is its first letter.

## Invariants: do not break

1. **Stored values and option keys are public API.** The field holds `true` or `false` and the interface never writes anything else. The id `switch` and the option keys `label`, `description`, `iconOn`, `iconOff`, `colorOn` and `colorOff` keep their names and meanings. All but `description` are also the keys of the stock Toggle (`app/src/interfaces/boolean/index.ts:14-72`); keep them in step, so options carry over between the two.
2. **Never emit while inert.** The form drops what a disabled field reports in most cases, but not when the field is disabled because another user holds it in collaborative editing. `toggle()` returns before it emits, and the button is natively disabled as well.
3. **Nothing falls through.** `inheritAttrs: false`, and the template binds no `$attrs`: the form passes some twenty props and two listeners to every interface, and none of them belongs on the button.
4. **The options are untrusted.** Text reaches the page only through `v-text`. Colours are the only option which reaches CSS, and must pass `isColor`; do not loosen `HEX_COLOR` or `THEME_COLOR` without thinking about `url()`, a second declaration and `var()` fallbacks. The colour tests list what must stay rejected. An icon name goes to `v-icon` as it is, and whatever that draws stays inside the knob: keep the two `overflow: hidden`.
5. **`switch.ts` stays free of Vue, the DOM library and Directus.** `tsconfig.test.json` type-checks it without the DOM library.
6. **Bundle hygiene.**
   - The root `AGENTS.md` has the rules. There are no dependencies to bundle, and none should be added. `vue-i18n` in particular is not imported: `src/i18n.ts` reads `$t` from the app.
   - `dist/index.js` is about 11 kB (10,937 bytes, about 3.6 kB gzipped). Report size changes.
   - The styles have no comments: the build keeps a comment of a style block in the bundle, and Directus serves that bundle on every page. The notes are `//` comments at the end of the script of `interface.vue`. `tests/bundle.test.ts` fails on a comment in the style block or in `dist/index.js`.
7. **It is an app-only extension,** so the Marketplace can install it under the default `MARKETPLACE_TRUST`. Don't add API entries casually.
8. **Directus look.** Only `--theme--*` tokens for colours, and the form-input tokens for the box, so it matches the inputs beside it in every theme. System colours (`Canvas`, `Highlight`, ...) only inside the block for forced colours. `tests/bundle.test.ts` checks both. The few app variables which are not theme tokens (`--fast`, `--medium`, `--transition`, `--focus-ring-offset-invert`) are used with a fallback. Styles are scoped; class names other than the root's start with `sw-`.

## Code style

The root `AGENTS.md` has the style of the repository. In this package also:

- The unit tests cover `switch.ts`, and `bundle.test.ts` reads the style block and the built bundle as text. Everything else in `interface.vue` has to be checked in a browser.
- The names of the options in the settings are the app's own strings (`$t:label`, `$t:icon_on`, `$t:interfaces.boolean.color_on`, ...), each of which says exactly what is meant. The notes and the placeholder of Description have no such string and are plain English.

## Demo

`demo/demo.mjs` describes the demo in the sandbox (see `sandbox/README.md`, "Demos"): the singleton `demo_switch`, with every option in three groups, the first of the set-ups most fields want. A new or changed option gets a field there. `sandbox/demo.spec.ts` builds it and checks that every field draws a switch.

## Testing in a browser

`sandbox/switch.spec.ts` creates the collection `sandbox_switch`, with a stock input and a stock Toggle beside the switches to compare them with, and checks in Chromium that the built bundle loads and:

- on, off and not set each draw, with the default label, a description, and the note of a field left to the form;
- the accessible name is the name of the field and the label, three switches with the default label have three names, and a label which equals the name of its field is said once;
- a click on the label, on the track, on the description and on the padding of the box, Space and Enter flip the value, and the saved item holds `true` or `false`;
- a field which is not set turns on with the first click, and is described as "No value" until then;
- a read-only field is dimmed, is passed by the Tab key and does not change;
- colours and icons come from the options, and a cleared icon leaves the knob plain;
- one line, and a label with one line of description, are exactly as tall as the stock input and the stock Toggle, and long text wraps inside the box;
- a new item shows the default value of the field;
- a user whose language is German gets the app's German word as the default label, the same word as the stock Toggle beside it, and a description of a field without a value which is not the English one;
- in a page mirrored with `dir="rtl"` the switch is at the left end, and the knob at the right of the track while off, at the left while on and in the middle while not set;
- an icon name which is not an icon changes nothing outside the knob, in either direction, and icons which are icons (`check`, `visibility`, the social `github`) are not cut;
- in the comparison of a revision every switch is inert and none is dimmed, the read-only field included;
- under emulated forced colours the track, the knob and the icon are in system colours for on, off, not set and read-only, a switch with cleared icons differs between on and off, and no knob has moved;
- the track and the knob ask for their backgrounds in print and the box does not, as the stock input does not; the box eases only its border and shadow, the knob slides only after a flip by hand and not at all with reduced motion;
- a boolean field without `cast-boolean`, which hands back `0` and `1`, is drawn off and on, and the form sends `true` and `false`;
- in a row of a stock Repeater the switch is named by the field of the row, a new row is not set, and the saved rows hold booleans;
- the options form in Data Model shows the six options and the two notes of the colours.

Checked by hand in the sandbox for 1.0.2, with Playwright scripts which are not part of the repository: the demo in the light and the dark theme (nothing which is seen changed), under emulated forced colours in both colour schemes, and printed to PDF without backgrounds in both (the boxes print white like the stock input, the tracks and knobs in their colours); the notes of the options form; that the dimmed look of a field which a condition makes read-only no longer fades.

Checked by hand in the sandbox for 1.0.0, in the light and the dark theme, with Playwright scripts which are not part of the repository:

- hover and keyboard focus against the stock input and the stock Toggle, a field squeezed to 200px, a full-width field, the slide of the knob with and without `prefers-reduced-motion`;
- the options form and the interface picker in Data Model, what clearing the icon picker stores (`null`), and a field moved from the stock Toggle to Switch there, which keeps its label, icon and colour;
- a user with the right-to-left text direction and one with an Arabic language, a `$t:` reference as label and as description;
- the comparison of two revisions and of a content version with the main item, and a user who may not update the field: full strength, inert;
- a batch edit of two items: dimmed and not set until the field is ticked, then editable.

Things which are easy to trip over:

- **A boolean field created through the API needs `special: ['cast-boolean']`,** or SQLite returns `0` and `1`, which the stock Toggle draws as off. The spec sets it, as the app does for every boolean field it creates.
- **No test depends on another.** `beforeAll` creates the collection afresh for every run, with one item (`still`) which no test saves. A test which saves posts an item of its own (`fresh`). Keep it so: every test passes when it is run alone (`cd sandbox && npx playwright test packages/switch/sandbox/switch.spec -g "..."`; through `npm run sandbox:test` npm takes the `-g` for itself).
- **The numbers test reads the request, not the item.** The API hands a boolean column without `cast-boolean` back as `0` or `1` whatever was written, so that the form sent `true` shows only in the body of its PATCH.
- **System colours are read from the page, not written into the spec.** What `Highlight` or `GrayText` is differs between macOS and Linux, and under emulation `Highlight` is partly transparent. `colorAt` asks the browser for the colour at the place of the switch.
- **Under forced colours the browser lays a plate behind text,** in the colour of the page, and an icon is text. Computed styles do not show it: only a picture does. See "How it works".
- **The language test changes the administrator,** whom all specs share: it sets `language` to `de-DE` and puts the old value back in a `finally`. A run which is killed in between leaves a German administrator, and the tests which expect "Enabled" then fail: set `language` back to `null`.
- **Right-to-left needs no user, but not the root element either.** The app keeps the user's direction as `dir` on the root element, and writes it again with every update of the document head, the page title included. On an item page the last of those comes some tens of milliseconds after the first field is shown, so a `dir` which a test sets there right after `openItem` is put back to `ltr`, sometimes between two assertions. With a trace being recorded, which is how the sandbox is configured, the test happened to be slow enough to win; with `--trace off` it lost most of the time. A `dir` on `body` mirrors the form in the same way and the app never touches it: the spec's `turn()` sets that, and both tests which use it check at the end that the direction is still the one they set.
- **Text which overflows cannot be found with `elementFromPoint`.** The test of an unknown icon name compares pictures instead: the form to the left and to the right of the knob, with the icon shown and with it hidden, must be the same bytes. A page which was just opened is still moving, so a picture only counts once the next one equals it; without that wait the test failed now and then.
- **The form hands over `null` before the item arrives,** so a test which measures a knob first waits for the state it expects.

## Known gaps

- Only Directus 11.17.4 has been tested, and only in Chromium: not Firefox, Safari or a touch device.
- Not tested with a screen reader. The roles, names and descriptions were checked through the accessibility tree which Playwright reads.
- Collaborative editing, where a field is disabled while another user holds it, was not tried: the sandbox runs without websockets.
- Not tried with a custom theme which sets the form-input tokens apart from the page's.
- Forced colours and print were tried as Chromium emulates them, not with a contrast theme of Windows, in Firefox or on paper. The rule which makes the focus ring `Highlight` under forced colours changes nothing in Chromium, which does that by itself; it is there for a browser which does not, and was not tried in one.
- The name of the field in the accessible name is `fieldData.name`. A form which hands over no `fieldData` gets the label alone.
- An icon name which the app does not know shows as its first letter. Nothing says that the name is wrong.
