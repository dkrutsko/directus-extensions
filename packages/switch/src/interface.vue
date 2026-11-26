<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { useAppText } from './i18n';
import { DEFAULT_LABEL, fieldNameFor, isDimmed, isInert, lookOf, readOptions, stateOf, toggled } from './switch';

/**
 * The Switch interface.
 *
 * One button which is the whole box: the label and the description at the
 * start, the switch at the end. A click anywhere, Enter or Space flips the
 * value. The box takes its height, border, radius and colours from the tokens
 * of the stock inputs, so it lines up with the fields around it.
 *
 * The form passes `value`, `disabled`, `nonEditable`, `loading` and the field
 * itself (`fieldData`) to every interface, the field's options as further
 * props, and a good deal more
 * (app/src/components/v-form/components/form-field-interface.vue:60-85 in
 * Directus 11.17.4). Only what is declared here is used. Attributes do not
 * fall through, so the rest never ends up on the button.
 *
 * `disabled` and `nonEditable` follow the stock Toggle
 * (app/src/components/v-checkbox.vue:119-120, 189-217): both make the button
 * inert, and only `disabled` without `nonEditable` dims it. `nonEditable` is
 * what the form sets in the comparison of versions and revisions, where the
 * value has to stay readable.
 *
 * The options are typed as `unknown`, not by what they should hold: they
 * arrive as the schema stores them, which a schema written by hand can fill
 * with anything, and `readOptions` makes sense of them. The three flags are
 * booleans: a missing one is `false`, which is what it means.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps<{
	value?: unknown;
	disabled?: boolean;
	nonEditable?: boolean;
	loading?: boolean;
	fieldData?: { name?: unknown } | null;
	label?: unknown;
	description?: unknown;
	iconOn?: unknown;
	iconOff?: unknown;
	colorOn?: unknown;
	colorOff?: unknown;
}>();

const emit = defineEmits<{ input: [value: boolean] }>();

const t = useAppText();
const id = useId();

const state = computed(() => stateOf(props.value));

// `enabled` is the label of the stock Toggle (app/src/interfaces/boolean/boolean.vue:33).
const options = computed(() => readOptions(props, t('enabled', DEFAULT_LABEL)));
const look = computed(() => lookOf(state.value, options.value));

const inert = computed(() => isInert(props));
const dimmed = computed(() => isDimmed(props));

// The label alone names a switch badly: it is "Enabled" on every field which
// sets none, so a form with three of them would offer "Enabled, switch" three
// times. The name of the field, which the form prints above the box, is said
// first. It is on the page already, so here it is an element nobody sees,
// which `aria-labelledby` may point at all the same.
const fieldName = computed(() => fieldNameFor(props.fieldData?.name, options.value.label));
const labelledBy = computed(() => (fieldName.value !== null ? `${id}-field ${id}-label` : `${id}-label`));

// A switch is on or off for assistive technology: the role has no third
// state. A field without an answer is therefore announced as off, and the
// description says that it has no value, in the app's own words (`no_value`).
const describedBy = computed(() => {
	const ids = [];
	if (options.value.description) ids.push(`${id}-description`);
	if (state.value === 'unset') ids.push(`${id}-unset`);
	return ids.length > 0 ? ids.join(' ') : undefined;
});

// The knob slides only once the switch has been flipped by hand. Until then a
// change of state is the item arriving in the form, which would otherwise send
// every knob of the page from the middle of its track to its place.
const animated = ref(false);

// The form drops what a disabled field reports, but not in every case, so
// nothing is reported in the first place.
function toggle() {
	if (inert.value) return;

	animated.value = true;
	emit('input', toggled(props.value));
}

// The styles, which have no comments of their own: the build keeps a comment
// of a style block in the bundle, which every page of the Data Studio loads.
//
// - The box is a stock input in everything but its content: the same height,
//   padding, border, radius, background and shadow, each from the token the
//   inputs use (app/src/components/v-input.vue:412-433), so it matches them
//   in the light, the dark and any custom theme. Like the input it eases its
//   border and its shadow and nothing else (v-input.vue:431-432): the dimmed
//   look of a field which a condition makes read-only is there at once, as
//   it is on the input beside it.
// - The app draws its focus ring on every button which has keyboard focus
//   (app/src/styles/_base.scss:45-49). Turned inwards (`--focus-ring-offset`)
//   it sits on the border, as on the stock Toggle
//   (app/src/components/v-checkbox.vue:204).
// - Read-only (`sw-dimmed`) is the look of a disabled stock input
//   (v-input.vue:487-493), and the track at half strength, still in the
//   colour of its state.
// - The text takes the width the switch leaves. It may shrink below its
//   longest word, which then breaks, so nothing can push the switch out of
//   the box. Lines are 17px apart instead of the app's 20px, so that a label
//   with one line of description still fits the height of a stock input:
//   2 x 17px of text, 2 x 8px of padding and 2 x 2px of border are its 54px.
// - The knob moves along the inline axis by its inset, not by a transform, so
//   it travels towards the end of the line in either writing direction.
// - A name which the app's icon set does not have is drawn by the stock icon
//   component as text, many times wider than an icon. Cut to the box of an
//   icon, and that box to the circle of the knob, it cannot leave the knob.
// - Track and knob are painted with backgrounds, which a contrast theme of
//   the system takes away (`forced-colors: active`): every background becomes
//   the colour of the page, which without rules of its own leaves nothing of
//   a switch but the icon in its knob, and nothing at all where the icons are
//   cleared. There the track is an outline in the colour of text
//   (`CanvasText`) around the colour of the page (`Canvas`) with a solid knob
//   in it, and a switch which is on is filled with the system's `Highlight`,
//   its knob in `HighlightText`: on is told from off by solid against hollow
//   as well as by where the knob is. A field without a value has a dashed
//   outline and a knob in `GrayText`. A read-only switch is `GrayText`
//   throughout and at full strength, since half of a system colour is no
//   system colour. The outline is an outline, not a border, so no size and
//   no place of the knob changes. The focus ring is `Highlight` by a rule of
//   its own: it sits on the border of the box, so it must not take the
//   colour of that border. Chromium draws it so without the rule, which is
//   there for a browser which does not. The colours of the options give way
//   to these, which is what the mode is for. The track opts out of the mode
//   (`forced-color-adjust: none`) since every colour in it is a system
//   colour by these rules already, and the mode would otherwise lay a plate
//   in the colour of the page behind the icon, which is text to it: the
//   plate hides the knob under the icon.
// - A browser prints no backgrounds unless it is asked to, and track and knob
//   are backgrounds, so the track asks (`print-color-adjust: exact`, with the
//   older name beside it). The property is inherited: the knob and its icon
//   have it from the track. The box must not ask. It would keep its own
//   background as well, which in a dark theme prints every switch as a black
//   block beside stock inputs which print white, and its text would stay as
//   light as it is on the screen.
//
// The package's AGENTS.md, "How it works", has the rest.
</script>

<template>
	<button
		class="switch"
		:class="[`sw-${state}`, { 'sw-inert': inert, 'sw-dimmed': dimmed, 'sw-animated': animated }]"
		type="button"
		role="switch"
		:aria-checked="state === 'on'"
		:aria-labelledby="labelledBy"
		:aria-describedby="describedBy"
		:disabled="inert"
		@click="toggle"
	>
		<span v-if="fieldName !== null" :id="`${id}-field`" hidden v-text="fieldName" />

		<span class="sw-text">
			<span :id="`${id}-label`" class="sw-label" v-text="options.label" />
			<span
				v-if="options.description"
				:id="`${id}-description`"
				class="sw-description"
				v-text="options.description"
			/>
		</span>

		<span class="sw-track" :style="{ '--sw-color': look.color }" aria-hidden="true">
			<span class="sw-knob">
				<v-icon v-if="look.icon" :name="look.icon" small />
			</span>
		</span>

		<span v-if="state === 'unset'" :id="`${id}-unset`" hidden v-text="t('no_value', 'No value')" />
	</button>
</template>

<style scoped>
.switch {
	--sw-track-width: 3rem;
	--sw-track-height: 1.75rem;
	--sw-knob-size: 1.25rem;
	--sw-knob-inset: calc((var(--sw-track-height) - var(--sw-knob-size)) / 2);
	--focus-ring-offset: var(--focus-ring-offset-invert, -2px);

	display: flex;
	gap: 1rem;
	align-items: center;
	inline-size: 100%;
	min-block-size: var(--theme--form--field--input--height);
	padding-block: 0.5rem;
	padding-inline: var(--theme--form--field--input--padding);
	color: var(--theme--form--field--input--foreground);
	text-align: start;
	background-color: var(--theme--form--field--input--background);
	border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
	border-radius: var(--theme--border-radius);
	box-shadow: var(--theme--form--field--input--box-shadow);
	cursor: pointer;
	transition: var(--fast, 125ms) var(--transition, ease);
	transition-property: border-color, box-shadow;
}

.switch:hover:not(.sw-inert) {
	border-color: var(--theme--form--field--input--border-color-hover);
	box-shadow: var(--theme--form--field--input--box-shadow-hover);
}

.switch.sw-inert {
	cursor: not-allowed;
}

.switch.sw-dimmed {
	color: var(--theme--foreground-subdued);
	background-color: var(--theme--form--field--input--background-subdued);
}

.sw-text {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-inline-size: 0;
	line-height: 1.0625rem;
	overflow-wrap: anywhere;
}

.sw-description {
	color: var(--theme--form--field--input--foreground-subdued);
}

.sw-track {
	position: relative;
	flex: none;
	inline-size: var(--sw-track-width);
	block-size: var(--sw-track-height);
	background-color: var(--sw-color);
	border-radius: calc(var(--sw-track-height) / 2);
	-webkit-print-color-adjust: exact;
	print-color-adjust: exact;
}

.sw-dimmed .sw-track {
	opacity: 0.5;
}

.sw-knob {
	--v-icon-color: var(--sw-color);

	position: absolute;
	inset-block-start: var(--sw-knob-inset);
	inset-inline-start: var(--sw-knob-inset);
	display: grid;
	place-items: center;
	inline-size: var(--sw-knob-size);
	block-size: var(--sw-knob-size);
	background-color: var(--theme--form--field--input--background);
	border-radius: 50%;
}

.sw-knob,
.sw-knob .v-icon {
	overflow: hidden;
}

.sw-on .sw-knob {
	inset-inline-start: calc(var(--sw-track-width) - var(--sw-knob-size) - var(--sw-knob-inset));
}

.sw-unset .sw-knob {
	inset-inline-start: calc((var(--sw-track-width) - var(--sw-knob-size)) / 2);
}

.sw-animated .sw-track {
	transition: background-color var(--medium, 200ms) var(--transition, ease);
}

.sw-animated .sw-knob {
	transition: inset-inline-start var(--medium, 200ms) var(--transition, ease);
}

@media (prefers-reduced-motion: reduce) {
	.switch,
	.sw-animated .sw-track,
	.sw-animated .sw-knob {
		transition: none;
	}
}

@media (forced-colors: active) {
	.switch:focus-visible {
		outline-color: Highlight;
	}

	.switch.sw-dimmed {
		color: GrayText;
	}

	.sw-track {
		background-color: Canvas;
		outline: 1px solid CanvasText;
		outline-offset: -1px;
		forced-color-adjust: none;
	}

	.sw-knob {
		--v-icon-color: Canvas;

		background-color: CanvasText;
	}

	.sw-on .sw-track {
		background-color: Highlight;
		outline-color: Highlight;
	}

	.sw-on .sw-knob {
		--v-icon-color: Highlight;

		background-color: HighlightText;
	}

	.sw-unset .sw-track {
		outline: 1px dashed GrayText;
	}

	.sw-unset .sw-knob {
		background-color: GrayText;
	}

	.sw-dimmed .sw-track {
		outline-color: GrayText;
		opacity: 1;
	}

	.sw-dimmed .sw-knob {
		background-color: GrayText;
	}

	.sw-dimmed.sw-on .sw-track {
		background-color: GrayText;
	}

	.sw-dimmed.sw-on .sw-knob {
		--v-icon-color: GrayText;

		background-color: Canvas;
	}
}
</style>
