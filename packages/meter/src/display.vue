<script setup lang="ts">
import { useStores } from '@directus/extensions-sdk';
import { computed } from 'vue';
import { useLanguage } from './i18n';
import { isEmpty, numberOf, readOptions, readingOf, textOf, tooltipOf } from './meter';

/**
 * The Meter display: a bar of a fixed length, filled as far as the value has
 * come in its range, and the value as text, on one line.
 *
 * The app hands a display the value, the collection and the key of the field
 * and the options of the field's interface, among other things, and the
 * display's own options as further props
 * (app/src/views/private/components/render-display.vue:28-37 in Directus
 * 11.17.4). Only what is declared here is used, and attributes do not fall
 * through, so the rest never ends up on the element.
 *
 * It is inline content: it sits in a table cell, in the title of a card and
 * between the other fields of a display template, and takes no more height
 * than the line it is on. Every bar is the same length, so the bars of a
 * column can be compared.
 *
 * The options are typed as `unknown`, not by what they should hold: they
 * arrive as the schema stores them, and a prop which Vue knows as a boolean
 * would turn a missing `indicator` into `false`, which could then not fall
 * back to the interface's.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps<{
	value?: unknown;
	collection?: string;
	field?: string;
	interfaceOptions?: unknown;
	min?: unknown;
	max?: unknown;
	label?: unknown;
	indicator?: unknown;
	indicatorFormat?: unknown;
	color?: unknown;
	thresholds?: unknown;
}>();

const language = useLanguage();

// The name of the field is the name of a meter without a caption. A display
// is only handed the key of its field, so the name comes from the app's store
// of fields; where that cannot be had, the meter is called a meter.
let fields: { getField?: (collection: string, field: string) => { name?: unknown } | null } | null = null;

try {
	fields = useStores()['useFieldsStore']();
} catch {
	fields = null;
}

const options = computed(() => readOptions(props, props.interfaceOptions));

const name = computed(() => {
	if (options.value.label !== null) return options.value.label;

	const field = props.collection && props.field ? fields?.getField?.(props.collection, props.field)?.name : null;
	return typeof field === 'string' && field.trim() !== '' ? field : 'Meter';
});

// The app draws its own placeholder for `null` and does not call a display
// for it. A numeric field holds nothing else which is not a number; on a
// field of another type the value is shown as the text it is, and blank text
// gets the app's placeholder.
const plain = computed(() => (numberOf(props.value) === null ? textOf(props.value) : null));
const blank = computed(() => isEmpty(props.value));

const reading = computed(() => readingOf(props.value, options.value, language()));
const tooltip = computed(() => tooltipOf(reading.value.text, options.value.label));

// The styles carry no comments, because the build keeps them in the bundle.
// The root is inline, as the stock text display is, so it is part of the line
// of a display template. A table cell lays its content out as a flex item,
// which makes the root a block as wide as the cell allows; only then do its
// `overflow` and `white-space` apply. The track is one unbreakable piece which
// keeps its length, and as the first thing on the line it is clipped by a cell
// narrower than itself. The fill is a block at the start of the track, so it
// needs nothing for right-to-left.
//
// The text is whole, or it is not shown: a number of which only a part shows
// reads as another number, whichever part it is, and with or without an
// ellipsis. Its box is an inline flex container which may wrap, one line high,
// with the room which the track and the gap leave (`100% - 5rem`). The first
// thing in it is a space without a width, which holds the first line; the
// number comes after it and stays on that line when it fits. When it does not,
// it goes to a second line, which the box cuts off. The box is a flex
// container and not an inline block because a box which cuts sits on a line by
// its lower edge, which makes the line taller and the number stand too high; a
// flex container sits by the first line of its first item, the space. The
// height is the line height (`1lh`), with the line height of a table cell for
// a browser which does not know the unit.
//
// In a display template the box is one piece, like the track: where it does
// not fit the line, the ellipsis of the template stands for it. The number
// itself is marked as running from the left (`dir="ltr"`): a number carries no
// direction of its own, and in a right-to-left page "-20%" would otherwise be
// laid out as "20%-". The gap between track and text is a margin of the track,
// whose direction is that of the page. A value which is not a number is plain
// text and is cut like any other text, with an ellipsis.
</script>

<template>
	<value-null v-if="blank" />

	<span v-else-if="plain !== null" class="meter-display md-plain" v-text="plain" />

	<span
		v-else
		v-tooltip="tooltip"
		class="meter-display"
		role="meter"
		:aria-label="name"
		:aria-valuemin="options.min"
		:aria-valuemax="options.max"
		:aria-valuenow="reading.now ?? undefined"
		:aria-valuetext="reading.text"
	>
		<span class="md-track">
			<span
				v-if="reading.fraction > 0"
				class="md-fill"
				:style="{ inlineSize: `${reading.fraction * 100}%`, backgroundColor: reading.color }"
			/>
		</span>
		<span v-if="options.indicator" class="md-text">
			<span dir="ltr" v-text="reading.text" />
		</span>
	</span>
</template>

<style scoped>
.meter-display {
	--md-height: 0.5rem;

	overflow: hidden;
	white-space: nowrap;
	vertical-align: middle;
}

.md-plain {
	text-overflow: ellipsis;
}

.md-track {
	display: inline-block;
	inline-size: 4.5rem;
	block-size: var(--md-height);
	overflow: hidden;
	vertical-align: middle;
	background-color: var(--theme--form--field--input--border-color);
	border-radius: calc(var(--md-height) / 2);
}

.md-fill {
	display: block;
	min-inline-size: var(--md-height);
	block-size: 100%;
	background-color: var(--theme--primary);
	border-radius: inherit;
}

.md-track:not(:last-child) {
	margin-inline-end: 0.5rem;
}

.md-text {
	display: inline-flex;
	flex-wrap: wrap;
	max-inline-size: calc(100% - 5rem);
	block-size: 1.25rem;
	block-size: 1lh;
	overflow: hidden;
	font-variant-numeric: tabular-nums;
}

.md-text::before {
	content: '\200B';
}
</style>
