<script setup lang="ts">
import { computed } from 'vue';
import { isEmpty, progressOf } from './steps';

/**
 * The Steps display: a pip per step, filled up to the current one, and the
 * label of the current step, on one line.
 *
 * The app hands a display the value, the type of the field and the options of
 * the field's interface, among other things
 * (app/src/views/private/components/render-display.vue:28-37 in Directus
 * 11.17.4). Only what is declared here is used, and attributes do not fall
 * through, so the rest never ends up on the element.
 *
 * It is inline content: it sits in a table cell, in the title of a card and
 * between the other fields of a display template, and takes no more height
 * than the line it is on.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps<{
	value?: unknown;
	type?: string;
	interfaceOptions?: Record<string, unknown> | null;
}>();

const progress = computed(() => progressOf(props.value, props.interfaceOptions, props.type));

// The app draws its own placeholder for `null` and does not call a display
// for it, but an empty text does arrive here. It gets the same placeholder.
const empty = computed(() => isEmpty(props.value));

// The styles carry no comments, because the build keeps them in the bundle.
// The root is inline, as the stock text display is: in a display template the
// label is then ordinary text of the line and is cut by the template's own
// ellipsis. A table cell lays its content out as a flex item, which makes the
// root a block, and only then do its `overflow`, `white-space` and
// `text-overflow` apply and cut the label at the edge of the cell. The pips
// are one unbreakable piece which keeps its size. The count and the label
// are each isolated for the order of the line: in a right-to-left page a
// count followed by a label in Latin letters would otherwise be one
// left-to-right run, with the count on the far side of the label.
</script>

<template>
	<value-null v-if="empty" />

	<span v-else class="steps-display">
		<span
			v-if="progress.pips"
			class="sd-pips"
			role="img"
			:aria-label="`Step ${progress.position} of ${progress.count}`"
		>
			<span v-for="(filled, index) in progress.pips" :key="index" class="sd-pip" :class="{ 'sd-filled': filled }" />
		</span>
		<span v-else-if="progress.position !== null" class="sd-count" v-text="`${progress.position}/${progress.count}`" />
		<span class="sd-label" v-text="progress.text" />
	</span>
</template>

<style scoped>
.steps-display {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	vertical-align: middle;
}

.sd-pips {
	display: inline-flex;
	gap: 0.1875rem;
	margin-inline-end: 0.5rem;
	vertical-align: middle;
}

.sd-pip {
	inline-size: 0.375rem;
	block-size: 0.375rem;
	background-color: var(--theme--border-color-accent);
	border-radius: 50%;
}

.sd-pip.sd-filled {
	background-color: var(--theme--primary);
}

.sd-count {
	margin-inline-end: 0.375rem;
	color: var(--theme--foreground-subdued);
	font-variant-numeric: tabular-nums;
}

.sd-count,
.sd-label {
	unicode-bidi: isolate;
}
</style>
