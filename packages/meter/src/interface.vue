<script setup lang="ts">
import { computed, useId } from 'vue';
import { useAppText, useLanguage } from './i18n';
import { readOptions, readingOf } from './meter';

/**
 * The Meter interface.
 *
 * An area as high as a stock input, with the track across its width and,
 * on a line under the track, the caption at the start and the value as text
 * at the end. There is no box around it: it is not an input. It is a reading and not a control, so it emits nothing, is no tab
 * stop and reacts to no pointer.
 *
 * The form passes `value`, `disabled`, `nonEditable` and `loading` to every
 * interface, the field's options as further props, and a good deal more
 * (app/src/components/v-form/components/form-field-interface.vue:60-85 in
 * Directus 11.17.4). Only what is declared here is used. Attributes do not
 * fall through, so the rest never ends up on the element.
 *
 * `disabled`, `nonEditable` and `loading` are left out on purpose. Nothing
 * here can be edited, so there is nothing to switch off, and a field which a
 * flow keeps up to date is normally read-only: dimming it would dim nearly
 * every meter and tell the user nothing they can act on. `direction` is left
 * out as well: it is the direction of the text which is typed into a field.
 * The form of an item hands over that of the user
 * (app/src/modules/content/routes/item.vue:888), a form inside the
 * translations interface that of its language
 * (app/src/interfaces/translations/translation-form.vue:213), and the stock
 * Input puts it on its element (app/src/interfaces/input/input.vue:88). The
 * meter holds no such text. Like the stock Slider it runs in the direction of
 * the page, which its styles follow on their own.
 *
 * The options are typed as `unknown`, not by what they should hold: they
 * arrive as the schema stores them, `readOptions` makes sense of them, and
 * a prop which Vue knows as a boolean would turn a missing `indicator` into
 * `false`.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps<{
	value?: unknown;
	fieldData?: { name?: unknown } | null;
	min?: unknown;
	max?: unknown;
	minValue?: unknown;
	maxValue?: unknown;
	label?: unknown;
	indicator?: unknown;
	indicatorFormat?: unknown;
	color?: unknown;
	thresholds?: unknown;
}>();

const t = useAppText();
const language = useLanguage();
const id = useId();

const options = computed(() => readOptions(props));
const reading = computed(() => readingOf(props.value, options.value, language()));

// The meter is named by its caption, which is on the page, or else by the
// name of its field, which the form prints above it.
const name = computed(() => {
	const field = props.fieldData?.name;
	return typeof field === 'string' && field.trim() !== '' ? field : 'Meter';
});

// `no_value` is what the app says for an empty field elsewhere.
const spoken = computed(() => (reading.value.empty ? t('no_value', 'No value') : reading.value.text));

// The styles carry no comments: the build keeps the comments of a style block
// in the bundle, which every Data Studio page loads. What they rely on:
//
// - Everything is inside one area which is at least as high as a stock input
//   (the token of the inputs' height), so the note which the form prints
//   under a field is where it is under an input. The track and the line under
//   it are centred in the area as one group. A caption which wraps makes the
//   area grow. There is no border and no background: it is a reading, not an
//   input.
// - The track is 0.75rem high with rounded ends, in the colour token of the
//   stock Slider's line. The fill is a block at the start of the track, sized
//   along the inline axis, so it needs nothing for right-to-left. It is never
//   narrower than it is high: the smallest value above the minimum shows as a
//   dot, not as a sliver of a rounded corner.
// - A field without a value has a dashed outline in place of the track, so it
//   does not look like a meter at its minimum, with or without the text. The
//   outline is thin and in the subdued text colour: in the colour of the
//   track, which is close to the background, dashes are easily overlooked.
// - The line under the track is a flex container: the caption at the start,
//   which takes what is left and wraps, and the text at the end, which keeps
//   its width and stands on the first line of the caption. The caption asks
//   for 4rem before it gives way. In a field too narrow for that and the text
//   together, the line wraps and the text goes under the caption, still at
//   the end.
// - The text is whole, or it is not shown: a number of which only a part
//   shows reads as another number, whichever part it is, and with or without
//   an ellipsis. Its box is a flex container which may wrap, one line high and
//   no wider than the field, and it cuts off what is beyond its height. The
//   first thing in it is a space without a width, which holds the first line;
//   the number comes after it, and goes to a second line, out of sight, when
//   the field is narrower than the number.
// - The number is marked as running from the left (`dir="ltr"`). A number
//   carries no direction of its own, so in a right-to-left page "-20%" would
//   otherwise be laid out as "20%-" and "7 / 12" as "12 / 7"; the number
//   formatting of a right-to-left language puts the marks it needs into the
//   text itself.
// - There is no transition anywhere. The form hands over `null` until the
//   item has loaded, so any transition would play on every page load.
//
// The package's AGENTS.md, "How it works", has the rest.
</script>

<template>
	<div class="meter" :class="{ 'mt-empty': reading.empty }">
		<div
			class="mt-track"
			role="meter"
			:aria-label="options.label === null ? name : undefined"
			:aria-labelledby="options.label === null ? undefined : `${id}-caption`"
			:aria-valuemin="options.min"
			:aria-valuemax="options.max"
			:aria-valuenow="reading.now ?? undefined"
			:aria-valuetext="spoken"
		>
			<div
				v-if="reading.fraction > 0"
				class="mt-fill"
				:style="{ inlineSize: `${reading.fraction * 100}%`, backgroundColor: reading.color }"
			/>
		</div>

		<div v-if="options.label !== null || options.indicator" class="mt-line">
			<span v-if="options.label !== null" :id="`${id}-caption`" class="mt-caption" v-text="options.label" />
			<span v-if="options.indicator" class="mt-text" aria-hidden="true">
				<span dir="ltr" v-text="reading.text" />
			</span>
		</div>
	</div>
</template>

<style scoped>
.meter {
	--mt-height: 0.75rem;

	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	justify-content: center;
	min-block-size: var(--theme--form--field--input--height);
	color: var(--theme--foreground);
}

.mt-track {
	flex: none;
	box-sizing: border-box;
	block-size: var(--mt-height);
	overflow: hidden;
	background-color: var(--theme--form--field--input--border-color);
	border-radius: calc(var(--mt-height) / 2);
}

.mt-fill {
	min-inline-size: var(--mt-height);
	block-size: 100%;
	background-color: var(--theme--primary);
	border-radius: inherit;
}

.mt-empty .mt-track {
	background-color: transparent;
	border: 1px dashed var(--theme--foreground-subdued);
}

.mt-line {
	display: flex;
	flex-wrap: wrap;
	column-gap: 0.75rem;
	align-items: flex-start;
	line-height: 1.25rem;
}

.mt-caption {
	flex: 1 1 4rem;
	min-inline-size: 0;
	overflow-wrap: anywhere;
}

.mt-text {
	display: flex;
	flex: none;
	flex-wrap: wrap;
	max-inline-size: 100%;
	block-size: 1.25rem;
	margin-inline-start: auto;
	overflow: hidden;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

.mt-text::before {
	content: '\200B';
}
</style>
