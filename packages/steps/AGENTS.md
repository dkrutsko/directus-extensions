# directus-extension-steps

A Directus 11 bundle extension, published on npm as `directus-extension-steps`. It adds the **Steps** interface (`steps`) and the **Steps** display (`steps`) for `string` and `integer` fields which hold one value out of an ordered list. The interface draws the list as a progress track, one button per step, and a click makes a step the current one; the display shows a pip per step and the label of the current one in layouts. It stores what the stock Dropdown stores and exists for fields where the order of the choices carries meaning.

The rules which hold for every extension of this repository (independence, bundle hygiene, code style, releasing, the sandbox) are in the root `AGENTS.md`. This file only holds what is specific to this package; `CLAUDE.md` imports it.

## Commands

Run these in this folder, after `npm install` in the repository root:

```bash
npm run dev        # watch build, unminified
npm run check      # vue-tsc, plus tsc over the tests (tsconfig.test.json)
npm test           # vitest
npm run build      # dist/app.js + dist/api.js
npm run validate   # directus-extension validate
```

`prepublishOnly` runs check, test, build and validate.

## Layout

| Path | What |
|---|---|
| `src/interface.ts`, `src/display.ts` | The two entries of the bundle: `defineInterface` with the two options, and `defineDisplay` with its text handler. Both have the id `steps`, which is stored in users' schemas: never rename it. |
| `src/steps.ts` | The framework-free part, which both entries work from: the steps of a field with their names and labels (`readSteps`), whether the field shows labels (`labelsShown`), whether a track has no label at all (`isCompact`), the form a field stores a value in (`storedForm`, `keyOf`), where a value stands (`indexOfValue`, `trackOf`), what a click writes (`chosen`), when the track is inert (`isInert`), where a key moves the focus (`focusTarget`), how far the track scrolls for a step (`revealOffset`) and what the display shows (`progressOf`, `progressText`, and `textHandler`, which is the display's `handler`). No Vue, no DOM library, no Directus imports, so the tests run it in Node. |
| `src/interface.vue` | The track: the box, the list of buttons, the warning, the scrolling and all styles. |
| `src/display.vue` | The display: pips or a count, and the label. |
| `src/i18n.ts` | `useAppText`, which reads the app's `$t` for the notice of a field without steps, without importing `vue-i18n`. |
| `src/preview.ts` | The SVG shown in the interface picker of Data Model. Our own drawing, in `--theme--primary`. |
| `tests/` | Vitest unit tests of `src/steps.ts`. |
| `sandbox/` | Browser tests which run against the sandbox Directus of the repository. |
| `docs/images/` | The screenshots of the README, taken in the sandbox. |

## How it works

- **A bundle with an app side only.** The manifest has the two entries and no hook, endpoint or operation. The SDK still writes `dist/api.js`, three empty lists, because a bundle has both paths. The entry names differ (`steps`, `steps-display`), as a bundle needs; the ids are the same, since Directus registers interfaces and displays apart.
- **The options are cleaned once, in `readSteps`.** `choices` is whatever the schema holds. An entry which is not an object, has no value, repeats the value of an earlier entry or, on an integer field, is not a whole number, is left out. An icon which is not a name becomes `null`. Positions count what is kept. The options themselves are never changed, and nothing is reported: the README says which entries are dropped.
- **A step has a name and may have a label.** The name is the trimmed `text`, or the value as text when there is none; it is never empty, and it is what the accessible name, the tooltip and the display go by. The label is what is written under the marker, and it is the text and nothing else: `null` for a step without a text, and for every step when the field's `showLabels` option is off. `readSteps` takes that option as its third argument and `labelsShown` reads it: only the boolean `false` switches the labels off, so a field without the option, which is every field set up before it existed or by the stock Dropdown, shows them. For a while a step could hide its own label with a `showLabel` key; the key is gone, and one which is still stored is ignored like any key an entry may hold. The display calls `readSteps` without the option: it goes by names and has nothing to do with labels.
- **`showLabels` is a boolean prop with a default of `true`** (`withDefaults` in `interface.vue`). Without the default Vue would turn a prop which is not passed into `false`, and every field without the option would lose its labels.
- **A track without a single label is compact** (`isCompact`), which is the case when `showLabels` is off or when no step has a text: the markers alone in a box exactly as high as a stock input. That is arithmetic, not measurement: the track is `--theme--form--field--input--height` less the two borders, and the padding above a marker (`--st-top`) is half of what the marker leaves; the line between two markers takes its height from the same variable. The marker is placed from the top of its button, not centred in it, so it stays on the middle line of the box when the track scrolls and the scrollbar takes the lower edge of the track. The bar is 6px there, which fits under the markers, and the box keeps its height. The focus ring is drawn round the marker in this form, not round the column, whose lower edge would be under the scrollbar. Columns are at least 3rem, a marker and a gap. One label anywhere brings the row of labels back for the whole field.
- **A value is matched by its text, and written in the type of the field.** `storedForm` puts a value into the form the field stores, a safe whole number on `integer` and text on anything else; `keyOf` is that form as text, and steps and stored values are compared by it. So the number `2` finds a step whose option holds `"2"`, and a click on that step writes the number. A field type other than `integer` is treated as text.
- **Two values can never be the same step,** because `readSteps` keeps the first of each key. That is what makes "one current step" true without a check in the template.
- **Choosing the current step does nothing.** `chosen` gives `undefined` and the component returns before it emits, so the form is not marked as changed. The track never writes `null`.
- **An empty field and a field with a foreign value are told apart.** `trackOf` reports the value as `unknown` when it is none of the steps, unless the field holds `null`, nothing, or blank text. The component then names it in a line under the track. Every step is upcoming in both cases. The line is an English sentence and is marked as one (`lang="en" dir="ltr"`), so it reads correctly in a right-to-left page; the value inside it is isolated, since it can be in any script.
- **Labels are text, markers carry the state.** The label of a done and of an upcoming step are both in the text colour of an input (`--theme--form--field--input--foreground`), because an upcoming step is a choice on offer and `--theme--foreground-subdued` is 2.1 to 1 on white in the default light theme. What is quiet about an upcoming step is its marker: the number or icon in the subdued colour, the ring and the line in the border colour of the inputs. Done, current and upcoming differ without colour by a filled marker, a ringed marker with a bold label, and an empty marker. Only a dimmed field has subdued labels, which is what tells a read-only field from an editable one.
- **The box is a stock input in everything but its content.** Border, radius, background, shadow and their hover, focus-within and disabled forms are the form-input tokens. The input's padding is split between the box and the buttons (`--st-inset`), which need room of their own for the focus ring.
- **Equal columns, then a scroll.** The list is a grid with `grid-auto-columns: minmax(4.5rem, 1fr)`, and every item may shrink below its content (`min-inline-size: 0`), so no label widens its column. The line after a step is a pseudo-element of the list item which runs from the edge of its marker to the edge of the next: `inset-inline-start: calc(50% + marker / 2)` and `inline-size: calc(100% - marker)`. It relies on the columns being equal, and being laid out along the inline axis it needs no code for right-to-left. It does not pass under the markers, so a dimmed marker does not show a line through it.
- **The scrollbar is styled so that it shows.** `::-webkit-scrollbar` rules make it a thin bar which is always drawn where the system would otherwise hide scrollbars until they are used; browsers without that pseudo-element get `scrollbar-width` and `scrollbar-color`. The thumb is in `--theme--foreground-subdued`: the border colour of the inputs, which it had at first, is 1.2 to 1 against the box and could be overlooked.
- **The current step is brought into view by moving the track only** (`reveal`), since `scrollIntoView` would move the page too. `revealOffset` says how far, in either writing direction, and there are two ways.
  - A step which was chosen with the pointer stays under the pointer: the track moves no further than it takes to show the step whole, which is not at all for a step that already is. Were it brought to the middle, the second click of a double click would land on a neighbour and choose it. `choose` remembers the key of such a step (`pointed`); a click made with Enter or Space has a `detail` of 0, which is how the two are told apart.
  - Any other current step goes to the middle of what shows: on load, when the value changes from outside, after a choice with the keyboard, and when the width of the track changes (a `ResizeObserver`, whose first call is the track being laid out). A change of the track's height alone, which is a label taking a second line, moves nothing.
  - The track moves once per step (`shown` holds the key it last moved for). The form hands over `null` for a moment around a save and then the same value again; that is no new step, and the track stays where the user left it.
- **A tooltip with the name where the page does not show it in full:** always on a step without a label, and on one whose label is cut (`measure` compares the scroll height of each label with its two lines, when the track is laid out or resized, the steps or the value change, and once the fonts have loaded). A step which is inert gets none.
- **The tooltip is also for the keyboard.** The app's directive listens for the mouse only (`app/src/directives/tooltip.ts:20-27`). On `focusin` a button which matches `:focus-visible` is sent a `mouseenter` of our own, and on `focusout` a `mouseleave`; the directive's listeners are on the button and neither event bubbles, so nothing else hears them. A choice with Enter draws the component again, which makes the directive drop the tooltip; it comes back with the next focus.
- **Inert and dimmed are two things.** `disabled`, `nonEditable` and `loading` each make every button natively `disabled`, so none is a tab stop and nothing is emitted. Only `disabled` without `nonEditable` dims the box. That is how the stock Radio Buttons treat the comparison views (`app/src/components/v-radio.vue:96-112, 144-162`).
- **The focus ring is the app's.** The global rule of `app/src/styles/_base.scss:45-49` draws it on any button with keyboard focus. The buttons only turn it inwards (`--focus-ring-offset`), so it lies within the button, and the scrolling track cannot cut it off.
- **Colours change softly only after a step was chosen by hand** (`animated`): the first change of state is the item arriving in the form, which would fade every track of the page.
- **Nothing drawn for an icon leaves the marker.** An icon name is not checked against a list, which changes with the app. A name the app does not know is drawn by `v-icon` as text, many times wider than an icon, so the icon is cut to its own box and the marker to its circle (`overflow: hidden` on both). What is left of an unknown name is its first letter.
- **The display is inline text with one atomic piece.** Its root is an inline `span`, as the stock text display is, so in a display template the label is part of the line and the template's own ellipsis cuts it. A table cell is a flex container, which makes the root a block; only then do its own `overflow`, `white-space` and `text-overflow` apply and cut the label at the edge of the cell. The pips are an `inline-flex` with `role="img"` and a name ("Step 2 of 4"), and never shrink. The count and the label are each isolated for the order of the line (`unicode-bidi: isolate`): in a right-to-left page "5/12" and a label in Latin letters would otherwise form one left-to-right run, with the count on the far side of the label.
- **The display reads the interface's options.** The app passes them as `interfaceOptions` (`app/src/views/private/components/render-display.vue:28-37`), and the handler gets them in its context, so `progressOf` runs `readSteps` over the same `choices` and the two entries cannot disagree.

## Invariants: do not break

1. **Stored values and option keys are public API.** The field holds the `value` of a step, text or a whole number, and the interface never writes anything else, `null` included. The ids `steps` (interface) and `steps` (display), the option keys `choices` and `showLabels`, and the keys `text`, `value` and `icon` of an entry of `choices`, keep their names and meanings, and a missing `showLabels` means on. `choices` and the keys of its entries are also those of the stock Dropdown (`app/src/interfaces/select-dropdown/index.ts:14, 41`); keep them in step, so a field moves between the two by changing its interface alone. Other keys of an entry, such as the Dropdown's `color`, are left alone and ignored.
2. **Match loosely, write strictly.** A field configured elsewhere may hold numbers while its options hold their text, or the other way around. Both must keep showing their step, and what is written must stay in the type of the field. The unit tests and the browser test of the integer fields pin this.
3. **Never emit while inert.** The form drops what a disabled field reports in most cases, but not when the field is disabled because another user holds it in collaborative editing. `choose()` returns before it emits, and the buttons are natively disabled as well.
4. **Nothing falls through.** `inheritAttrs: false` in both components, and no template binds `$attrs`: the form passes some twenty props and two listeners to every interface, and a layout a handful to every display.
5. **The options are untrusted.** Text reaches the page only through `v-text`, the stored value in the warning included. Nothing from the options reaches CSS. An icon name goes to `v-icon` as it is, and whatever that draws stays inside the marker: keep the two `overflow: hidden`.
6. **`steps.ts` stays free of Vue, the DOM library and Directus.** `tsconfig.test.json` type-checks it without the DOM library.
7. **Bundle hygiene.**
   - The root `AGENTS.md` has the rules. There are no dependencies to bundle, and none should be added. `vue-i18n` in particular is not imported: `src/i18n.ts` reads `$t` from the app.
   - `dist/app.js` is about 19 KB and `dist/api.js` 72 bytes. Report size changes.
   - **No comments in the `<style>` blocks.** The build keeps them in the bundle (they were 2.6 KB of it), so what the styles rely on is written at the end of each component's script, which is not shipped, and under "How it works" here. `grep -o '/\*' dist/app.js | wc -l` is 0 after a build.
8. **It is an app-only bundle,** so the Marketplace can install it under the default `MARKETPLACE_TRUST`. Don't add API entries casually.
9. **Directus look.** Only `--theme--*` tokens for colours, and the form-input tokens for the box, so it matches the inputs beside it in every theme. The few app variables which are not theme tokens (`--fast`, `--medium`, `--transition`, `--focus-ring-offset-invert`) are used with a fallback. Styles are scoped; class names other than the two roots (`steps`, `steps-display`) and the notice (`steps-empty`) start with `st-` in the interface and `sd-` in the display.

## Code style

The root `AGENTS.md` has the style of the repository. In this package also:

- The unit tests cover only `steps.ts`. Everything in the two components has to be checked in a browser.
- The names of a step's three fields in the settings are the app's own strings (`$t:text`, `$t:value`, `$t:icon`) and the placeholders are the Dropdown's, each of which says exactly what is meant. The name of the option, "Steps", "Show Labels" and the notes have no such string and are plain English. `text` is not required; `value` is. The row of the repeater is `{{ text }} ({{ value }})`, so a step without a text can still be told from the others there.
- The options are a function of the field, as the Dropdown's are, only to give the `value` input the type of the field. Keep it that way: an untyped input writes text into the options of an integer field.

## Demo

`demo/demo.mjs` describes the demo in the sandbox (see `sandbox/README.md`, "Demos"): the collection `demo_steps`, whose six items differ only in how far they have come (first step, a third and two thirds of the way, last step, a value which is not a step, none), a form with the tracks in five groups by topic, a table preset of the recipes with the display, and a bookmark "More cases" for the rest. A few fields hold the same value in every item (`FIXED`), because their value is the point. The note of each field lists the values its steps store, with their icons, since the form shows only the labels (`brief`, up to eight steps). A new or changed option, or a rule for entries which are left out, gets a field in a group. `sandbox/demo.spec.ts` builds it and checks that every field draws a track or the notice of a field without steps, and every value in the table and in its bookmark the display.

## Testing in a browser

`sandbox/steps.spec.ts` creates the collection `sandbox_steps`, with a stock input and a stock Dropdown beside the tracks, and checks in Chromium that the built bundle loads and:

- the track draws the state of the value: done, current and upcoming, as an ordered list named "Steps" of buttons named by their labels, with one current step, icons from the choices of a Dropdown, and nothing of what the form passes on the box;
- entries without a value or with a repeated value are left out, and a step without a text has no label and is named by its value;
- a field which holds nothing has no current step and no warning; the label of an upcoming step is in the text colour of an input, as that of a done step, its marker is quiet and empty, and a done marker is filled;
- a click on a label and on a marker chooses a step, forwards and backwards, the saved item holds its value, and a click on the current step leaves the form unchanged;
- every step is a tab stop, Enter and Space choose, and the arrows, Home and End move the focus, stop at the ends and change nothing;
- an integer field, with numbers and with their text in its options, shows its step on load, sends and stores a number, and shows the chosen step after a reload;
- the options form gives the value of a step a number input on an integer field and stores a number, and nothing in the step but what was typed;
- a field with four texts and `showLabels` off draws no label, names its steps by their texts, shows a text as a tooltip, is exactly as high and as wide as the stock input in the same row and starts on the same line, with markers of the usual size on its middle line; twelve such steps beside a stock Toggle scroll in columns narrower than 4.5rem at the same height; a field with labels switched on and no text is compact too; a click chooses and the item saves it;
- a field with two steps with a text and two without draws two labels, one of them for a step which still holds the old `showLabel: false`, names all four for assistive technology, is not compact, shows the name of an unlabelled step as a tooltip for the mouse and for the keyboard, and shows none for a labelled one; a field without the option shows its labels;
- a read-only field is dimmed, has every label in the subdued colour (an editable one has not), is passed by the Tab key and does not change;
- a value which is not a step is named in a line inside the box, and the line goes when a step is chosen;
- a field without steps shows the stock notice and no box;
- twelve steps in half the form scroll inside the box with the last, current step in view, equal columns of at least 4.5rem, a styled scrollbar with a thumb in the subdued text colour, and nothing else on the page moved sideways; four steps fit the same width;
- on that track a double click on a step which is wholly in view makes that step the current one and leaves the track where it is, with the same step under the pointer; a double click on the visible part of a step which is cut by the edge moves the track by what was hidden and no more; a save does not move it; a step chosen with Enter goes to the middle;
- the focus ring of the first and the last step of that track lies inside the box;
- a label of 269 characters and a word of 41 stay in their columns on two lines, and only the cut label has a tooltip;
- an icon name which is not an icon changes nothing outside its marker, in either direction, and icons which are icons are not cut;
- in a page mirrored with `dir="rtl"` the first step is the rightmost, every line lies between its own step and the next, the same lines are coloured, and the arrow keys are turned around;
- a new item shows the default value of the field;
- the display in the table layout: pips and label for a string field, for both integer fields and for a field of the stock Dropdown, position and count beyond eight steps, the raw value for one which is not a step, the app's dash for an empty field, on one line as tall as the text display beside it;
- the display as plain text, in the titles of the calendar layout (a bookmark of the collection): the label for a string field, an integer field with text values, a field of twelve steps and a Dropdown field, the value itself for one which is not a step, nothing for an empty field.

Checked by hand in the sandbox for 1.0.0, in the light and the dark theme, with Playwright scripts which are not part of the repository:

- every state named above as a picture, beside a stock input and a stock Dropdown; hover on a done and on an upcoming step; the focus ring on the first and the last step; a viewport of 420px;
- the display in the table at the three row heights and in columns too narrow for it, in the title and subtitle of cards, in the template of a many-to-one field and of a related-values display, and in the title of an item page;
- the options form and the interface picker with its preview in Data Model, and a field moved from the stock Dropdown to Steps there, which keeps its choices;
- a user with the right-to-left text direction and one with an Arabic language, a `$t:` reference as the text of a step, and the notice of a field without steps in German;
- the comparison of two revisions: full strength, inert;
- a batch edit of two items: dimmed until the field is ticked, then editable;
- the compact form, with numbers and with icons, beside a stock input and a stock Toggle (the same height and middle line), with twelve steps in half the form and scrollbars switched on (still 54px, the bar under the markers), read-only, with a value which is not a step (the warning adds its line under the track), mirrored, with the focus ring round a marker and the tooltip which comes with it; a mixed field; the options form in Data Model with **Show Labels** under the list of steps, and the drawer of a step, which has Text, Value and Icon;
- the colour fade after a choice, and none with `prefers-reduced-motion`.

Things which are easy to trip over:

- **Playwright's headless Chromium hides every scrollbar,** so a picture of the track shows none and the track is no taller for it. The spec checks the style of the scrollbar instead. To see it, start Chromium with `ignoreDefaultArgs: ['--hide-scrollbars']`.
- **The app's tooltip is one shared element with one timer,** and every component which uses the directive drops a waiting tooltip when it is drawn again (`app/src/directives/tooltip.ts:29-50`). A mouse which arrives while the page is still settling or scrolling therefore gets none. The spec moves the mouse away and back until the tooltip shows.
- **The tests share one item and change it.** Each test which changes a field first puts that field back through the API (`reset`), so it does not depend on what an earlier test, or an earlier repeat of itself, saved. A second item (`still`) is never changed.
- **Right-to-left needs no user, but not the root element either.** The app writes `dir` on the root element again with every update of the document head. The spec's `turn()` sets it on `body`, and the tests which use it check at the end that the direction is still the one they set. A track which was already scrolled is not moved when the direction changes under it; a user whose language is right-to-left never sees that, since the direction is there before the track.
- **A line between two steps is a pseudo-element,** which has no box to ask for. The spec works its place out from the computed `left`, `top`, `width` and `height` of `::after` (`geometry`).
- **Text which overflows cannot be found with `elementFromPoint`.** The test of an unknown icon name compares pictures of the field with the marker painted over, with the icon shown and with it hidden. A page which was just opened is still moving, so a picture only counts once the next one equals it.
- **The form hands over `null` before the item arrives,** so a test first waits for the states it expects.
- **`page.mouse` does not wait as a locator does.** For a moment after a page has loaded, the app's cover (`.hydrating`), which is fading out, still takes a click. The pointer test needs raw coordinates, to click the visible part of a step which is cut by the edge, and first waits until the step is what `elementFromPoint` finds there.
- **A locator's click scrolls its target into view first,** inside the track too, so it cannot click a step which is partly hidden as a user would. That is the other reason for `page.mouse` there.
- **Two tracks of the fixture scroll** (`year` and `crowd`), so "nothing else on the page was moved sideways" counts the elements which are not a track (`strays`).
- **The API turns the text of a number into a number,** so the saved item cannot show whether the interface reported `4` or `"4"` for an integer field. `save()` returns the body of the request the form sent, and the tests compare that. Nor can a browser test see that a click on the current step reports nothing, since the form takes an unchanged value for no change: the unit test of `chosen` covers it.
- **A collection which points at `sandbox_steps`** (a many-to-one made by hand to try a template) stops the spec from dropping it. Delete that collection first.

## Known gaps

- Only Directus 11.17.4 has been tested, and only in Chromium: not Firefox, Safari or a touch device. The scrollbar of the track in Firefox, which has no `::-webkit-scrollbar`, was not looked at.
- Not tested with a screen reader. The roles, names, descriptions and the current step were checked through the accessibility tree which Playwright reads.
- Collaborative editing, where a field is disabled while another user holds it, was not tried: the sandbox runs without websockets.
- `loading` was not seen on its own: the form sets `disabled` whenever it sets `loading`.
- `nonEditable` was seen in the comparison of two revisions only. A content version compared with the main item, and a user who may not update the field, were not tried.
- Not tried with a custom theme which sets the form-input tokens apart from the page's, nor with one whose input is lower than a marker and its ring: the compact box then grows to fit the marker, by the `max()` in its rules, which was not seen.
- The compact form's scrollbar in a browser without `::-webkit-scrollbar` (Firefox) is as thin as `scrollbar-width: thin` makes it, which may reach the focus ring of a marker.
- The number or icon in the marker of an upcoming step, and the thumb of the scrollbar, are in `--theme--foreground-subdued`, about 2.1 to 1 against the box in the default light theme. Neither is the only carrier of anything: the label names the step, and the cut marker at the edge shows that the track goes on.
- The warning for a value which is not a step, "Completed" for a step which is passed, and "Step 2 of 4" of the display's pips are English only.
- An icon name which the app does not know shows as its first letter. Nothing says that the name is wrong.
