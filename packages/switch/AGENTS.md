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

`prepublishOnly` runs check, test, build and validate.

## Layout

| Path | What |
|---|---|
| `src/index.ts` | `defineInterface` and the six options. The id `switch` is stored in users' schemas: never rename it. |
| `src/switch.ts` | The framework-free part: the state of a value (`stateOf`), what a toggle writes (`toggled`), when the switch is inert (`isInert`), the options (`readOptions` with `labelText`, `descriptionText`, `iconOr`, `colorOr`, `isColor`) and the look of a state (`lookOf`). No Vue, no DOM library, no Directus imports, so the tests run it in Node. |
| `src/interface.vue` | The component: one `button`, its template and all styles. |
| `src/i18n.ts` | `useAppText`, which reads the app's `$t` for the default label without importing `vue-i18n`. |
| `src/preview.ts` | The SVG shown in the interface picker of Data Model. Our own drawing, in `--theme--primary`. |
| `tests/` | Vitest unit tests of `src/switch.ts`. |
| `sandbox/` | Browser tests which run against the sandbox Directus of the repository. |
| `docs/images/` | The screenshots of the README, taken in the sandbox. |

## How it works

- **Three states, two values.** `stateOf` gives `on` for `true`, `off` for `false` and `unset` for `null` or a missing value; anything else counts by whether it is truthy (SQLite hands back `0` and `1` for a boolean field without the `cast-boolean` special). `toggled` always gives a boolean, and `true` from `unset`. The switch never writes `null`.
- **Options are worked out once, in `readOptions`.** The component passes its props as they are, and the template only sees the result. A label is trimmed and never empty, a description of spaces is no description, a colour which is not a colour is the default. For an icon, `undefined` (never set) is the default and `null` (cleared in the icon picker, which is what it stores) is a knob without an icon.
- **The look of a field which is not set is fixed.** `lookOf` gives it the `remove` icon and a grey track whatever the options say, and the styles put the knob in the middle.
- **One button is the whole box.** `role="switch"` with `aria-checked`, named by the label element (`aria-labelledby`) and described by the description element (`aria-describedby`). The role has no third state, so a field which is not set is announced as off, and a hidden "Not set" is added to its description. Enter and Space come with the button.
- **Inert and dimmed are two things.** `disabled`, `nonEditable` and `loading` each make the button natively `disabled`, so it is not a tab stop and never emits. Only `disabled` without `nonEditable` dims it. That is how the stock Toggle treats the comparison views (`app/src/components/v-checkbox.vue:119-120, 189-217`).
- **The size comes from the input tokens.** `min-block-size` is `--theme--form--field--input--height`, the inline padding `--theme--form--field--input--padding`. The text has lines of 17px (`1.0625rem`) instead of the app's 20px so that a label with one line of description still fits the 54px of a stock input: 2 x 17 + 2 x 8 of padding + 2 x 2 of border. Change one of these and the other two have to follow; the browser test compares the heights.
- **The focus ring is the app's.** The global rule of `app/src/styles/_base.scss:45-49` draws it on any button with keyboard focus. The component only turns it inwards (`--focus-ring-offset`), as the stock block controls do, so it sits on the border.
- **The knob moves by `inset-inline-start`,** not by a transform, so right-to-left needs no code. It slides only after the switch was flipped by hand (`animated`): the first change of state is the item arriving in the form, which would send every knob on the page from the middle to its place.
- **The colour of a state reaches CSS as `--sw-color`** on the track, through Vue's style binding. `isColor` lets nothing through but a hex colour or a `var(--theme--...)` reference.
- **Nothing drawn for an icon leaves the knob.** An icon name is not checked against a list, which changes with the app. A name the app does not know is drawn by `v-icon` as text, some 380px of it for a long name, so the icon is cut to its own box and the knob to its circle (`overflow: hidden` on both). What is left of an unknown name is its first letter.

## Invariants: do not break

1. **Stored values and option keys are public API.** The field holds `true` or `false` and the interface never writes anything else. The id `switch` and the option keys `label`, `description`, `iconOn`, `iconOff`, `colorOn` and `colorOff` keep their names and meanings. All but `description` are also the keys of the stock Toggle (`app/src/interfaces/boolean/index.ts:14-72`); keep them in step, so options carry over between the two.
2. **Never emit while inert.** The form drops what a disabled field reports in most cases, but not when the field is disabled because another user holds it in collaborative editing. `toggle()` returns before it emits, and the button is natively disabled as well.
3. **Nothing falls through.** `inheritAttrs: false`, and the template binds no `$attrs`: the form passes some twenty props and two listeners to every interface, and none of them belongs on the button.
4. **The options are untrusted.** Text reaches the page only through `v-text`. Colours are the only option which reaches CSS, and must pass `isColor`; do not loosen `HEX_COLOR` or `THEME_COLOR` without thinking about `url()`, a second declaration and `var()` fallbacks. The colour tests list what must stay rejected. An icon name goes to `v-icon` as it is, and whatever that draws stays inside the knob: keep the two `overflow: hidden`.
5. **`switch.ts` stays free of Vue, the DOM library and Directus.** `tsconfig.test.json` type-checks it without the DOM library.
6. **Bundle hygiene.**
   - The root `AGENTS.md` has the rules. There are no dependencies to bundle, and none should be added. `vue-i18n` in particular is not imported: `src/i18n.ts` reads `$t` from the app.
   - `dist/index.js` is about 11 KB. Report size changes.
7. **It is an app-only extension,** so the Marketplace can install it under the default `MARKETPLACE_TRUST`. Don't add API entries casually.
8. **Directus look.** Only `--theme--*` tokens for colours, and the form-input tokens for the box, so it matches the inputs beside it in every theme. The few app variables which are not theme tokens (`--fast`, `--medium`, `--transition`, `--focus-ring-offset-invert`) are used with a fallback. Styles are scoped; class names other than the root's start with `sw-`.

## Code style

The root `AGENTS.md` has the style of the repository. In this package also:

- The unit tests cover only `switch.ts`. Everything in `interface.vue` has to be checked in a browser.
- The names of the options in the settings are the app's own strings (`$t:label`, `$t:icon_on`, `$t:interfaces.boolean.color_on`, ...), each of which says exactly what is meant. The notes and the placeholder of Description have no such string and are plain English.

## Testing in a browser

`sandbox/switch.spec.ts` creates the collection `sandbox_switch`, with a stock input and a stock Toggle beside the switches to compare them with, and checks in Chromium that the built bundle loads and:

- on, off and not set each draw, with the default label, a description, and the note of a field left to the form;
- a click on the label and on the track, Space and Enter flip the value, and the saved item holds `true` or `false`;
- a field which is not set turns on with the first click;
- a read-only field is dimmed, is passed by the Tab key and does not change;
- colours and icons come from the options, and a cleared icon leaves the knob plain;
- one line, and a label with one line of description, are exactly as tall as the stock input and the stock Toggle, and long text wraps inside the box;
- a new item shows the default value of the field;
- a user whose language is German gets the app's German word as the default label, the same word as the stock Toggle beside it;
- in a page mirrored with `dir="rtl"` the switch is at the left end, and the knob at the right of the track while off, at the left while on and in the middle while not set;
- an icon name which is not an icon changes nothing outside the knob, in either direction, and icons which are icons (`check`, `visibility`, the social `github`) are not cut.

Checked by hand in the sandbox for 1.0.0, in the light and the dark theme, with Playwright scripts which are not part of the repository:

- hover and keyboard focus against the stock input and the stock Toggle, a field squeezed to 200px, a full-width field, the slide of the knob with and without `prefers-reduced-motion`;
- the options form and the interface picker in Data Model, what clearing the icon picker stores (`null`), and a field moved from the stock Toggle to Switch there, which keeps its label, icon and colour;
- a user with the right-to-left text direction and one with an Arabic language, a `$t:` reference as label and as description;
- the comparison of two revisions and of a content version with the main item, and a user who may not update the field: full strength, inert;
- a batch edit of two items: dimmed and not set until the field is ticked, then editable.

Things which are easy to trip over:

- **A boolean field created through the API needs `special: ['cast-boolean']`,** or SQLite returns `0` and `1`, which the stock Toggle draws as off. The spec sets it, as the app does for every boolean field it creates.
- **The specs share one item and change it,** so a test may depend on what an earlier one saved. `beforeAll` creates the collection afresh for every run. A second item (`still`) is never changed, for the tests which need a known state.
- **The language test changes the administrator,** whom all specs share: it sets `language` to `de-DE` and puts the old value back in a `finally`. A run which is killed in between leaves a German administrator, and the tests which expect "Enabled" then fail: set `language` back to `null`.
- **Right-to-left needs no user, but not the root element either.** The app keeps the user's direction as `dir` on the root element, and writes it again with every update of the document head, the page title included. On an item page the last of those comes some tens of milliseconds after the first field is shown, so a `dir` which a test sets there right after `openItem` is put back to `ltr`, sometimes between two assertions. With a trace being recorded, which is how the sandbox is configured, the test happened to be slow enough to win; with `--trace off` it lost most of the time. A `dir` on `body` mirrors the form in the same way and the app never touches it: the spec's `turn()` sets that, and both tests which use it check at the end that the direction is still the one they set.
- **Text which overflows cannot be found with `elementFromPoint`.** The test of an unknown icon name compares pictures instead: the form to the left and to the right of the knob, with the icon shown and with it hidden, must be the same bytes. A page which was just opened is still moving, so a picture only counts once the next one equals it; without that wait the test failed now and then.
- **The form hands over `null` before the item arrives,** so a test which measures a knob first waits for the state it expects.

## Known gaps

- Only Directus 11.17.4 has been tested, and only in Chromium: not Firefox, Safari or a touch device.
- Not tested with a screen reader. The roles, names and descriptions were checked through the accessibility tree which Playwright reads.
- Collaborative editing, where a field is disabled while another user holds it, was not tried: the sandbox runs without websockets.
- Not tried with a custom theme which sets the form-input tokens apart from the page's.
- "Not set" is English only.
- An icon name which the app does not know shows as its first letter. Nothing says that the name is wrong.
