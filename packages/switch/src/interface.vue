<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { useAppText } from './i18n';
import { DEFAULT_LABEL, isInert, lookOf, readOptions, stateOf, toggled } from './switch';

/**
 * The Switch interface.
 *
 * One button which is the whole box: the label and the description at the
 * start, the switch at the end. A click anywhere, Enter or Space flips the
 * value. The box takes its height, border, radius and colours from the tokens
 * of the stock inputs, so it lines up with the fields around it.
 *
 * The form passes `value`, `disabled`, `nonEditable` and `loading` to every
 * interface, the field's options as further props, and a good deal more
 * (app/src/components/v-form/components/form-field-interface.vue:60-85 in
 * Directus 11.17.4). Only what is declared here is used. Attributes do not
 * fall through, so the rest never ends up on the button.
 *
 * `disabled` and `nonEditable` follow the stock Toggle
 * (app/src/components/v-checkbox.vue:119-120, 189-217): both make the button
 * inert, and only `disabled` without `nonEditable` dims it. `nonEditable` is
 * what the form sets in the comparison of versions and revisions, where the
 * value has to stay readable.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps<{
	value?: unknown;
	disabled?: boolean;
	nonEditable?: boolean;
	loading?: boolean;
	label?: string | null;
	description?: string | null;
	iconOn?: string | null;
	iconOff?: string | null;
	colorOn?: string | null;
	colorOff?: string | null;
}>();

const emit = defineEmits<{ input: [value: boolean] }>();

const t = useAppText();
const id = useId();

const state = computed(() => stateOf(props.value));

// `enabled` is the label of the stock Toggle (app/src/interfaces/boolean/boolean.vue:33).
const options = computed(() => readOptions(props, t('enabled', DEFAULT_LABEL)));
const look = computed(() => lookOf(state.value, options.value));

const inert = computed(() => isInert(props));
const dimmed = computed(() => props.disabled && !props.nonEditable);

// A switch is on or off for assistive technology: the role has no third
// state. A field without an answer is therefore announced as off, and the
// description says that it is not set.
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
</script>

<template>
	<button
		class="switch"
		:class="[`sw-${state}`, { 'sw-inert': inert, 'sw-dimmed': dimmed, 'sw-animated': animated }]"
		type="button"
		role="switch"
		:aria-checked="state === 'on'"
		:aria-labelledby="`${id}-label`"
		:aria-describedby="describedBy"
		:disabled="inert"
		@click="toggle"
	>
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

		<span v-if="state === 'unset'" :id="`${id}-unset`" hidden>Not set</span>
	</button>
</template>

<style scoped>
/*
 * The box is a stock input in everything but its content: the same height,
 * padding, border, radius, background and shadow, each from the token the
 * inputs use (app/src/components/v-input.vue:412-433), so it matches them in
 * the light, the dark and any custom theme.
 */
.switch {
	--sw-track-width: 3rem;
	--sw-track-height: 1.75rem;
	--sw-knob-size: 1.25rem;
	--sw-knob-inset: calc((var(--sw-track-height) - var(--sw-knob-size)) / 2);

	/*
	 * The app draws its focus ring on every button which has keyboard focus
	 * (app/src/styles/_base.scss:45-49). Turned inwards it sits on the border,
	 * as on the stock Toggle (app/src/components/v-checkbox.vue:204).
	 */
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
	transition-property: color, background-color, border-color, box-shadow;
}

.switch:hover:not(.sw-inert) {
	border-color: var(--theme--form--field--input--border-color-hover);
	box-shadow: var(--theme--form--field--input--box-shadow-hover);
}

.switch.sw-inert {
	cursor: not-allowed;
}

/* Read-only: the look of a disabled stock input (v-input.vue:487-493). */
.switch.sw-dimmed {
	color: var(--theme--foreground-subdued);
	background-color: var(--theme--form--field--input--background-subdued);
}

/*
 * The text takes the width the switch leaves. It may shrink below its longest
 * word, which then breaks, so nothing can push the switch out of the box.
 *
 * Lines are 17px apart instead of the app's 20px, so that a label with one
 * line of description still fits the height of a stock input: 2 x 17px of
 * text, 2 x 8px of padding and 2 x 2px of border are its 54px.
 */
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
}

/* Half strength, but still in the colour of its state. */
.sw-dimmed .sw-track {
	opacity: 0.5;
}

/*
 * The knob moves along the inline axis by its inset, not by a transform, so
 * it travels towards the end of the line in either writing direction.
 */
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

/*
 * A name which the app's icon set does not have is drawn by the stock icon
 * component as text, many times wider than an icon. Cut to the box of an
 * icon, and that box to the circle of the knob, it cannot leave the knob.
 */
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
</style>
