<script setup lang="ts">
import { computed, useAttrs } from 'vue';

/**
 * Wrapper around the built-in `interface-list-m2a` component.
 *
 * Directus registers every interface as a global Vue component named
 * `interface-<id>`, so the stock Builder (M2A) component can be rendered by
 * name without importing anything from the Directus app bundle.
 *
 * How the stock component decides whether a list row is clickable
 * (app/src/interfaces/list-m2a/list-m2a.vue, Directus 11.17.4):
 *
 *     <VListItem :disabled="disabled && !nonEditable" ... @click="editItem(element)">
 *
 * `disabled` is true for a read-only field; `nonEditable` is only ever true
 * for non-admins lacking update permission. So a read-only field is inert for
 * admins. Forcing `nonEditable` on whenever the field is `disabled` makes the
 * rows clickable again, hides the create/select/drag/remove controls, and
 * opens the side drawer in view-only mode (the drawer receives both flags).
 *
 * Side effect: the stock component also hides its pagination in `nonEditable`
 * mode, so while read-only we pass `viewLimit` (default -1, i.e. all items)
 * as the page size instead of the configured `limit`.
 */

defineOptions({ inheritAttrs: false });

const props = withDefaults(
	defineProps<{
		disabled?: boolean;
		nonEditable?: boolean;
		limit?: number;
		viewLimit?: number;
	}>(),
	{
		disabled: false,
		nonEditable: false,
		limit: 15,
		viewLimit: -1,
	},
);

// Everything the form passes that we did not declare as a prop (value,
// collection, field, primaryKey, version, enableCreate, enableSelect, prefix,
// allowDuplicates, onInput, onSetFieldValue, ...) is forwarded untouched.
const attrs = useAttrs();

const viewOnly = computed(() => props.disabled || props.nonEditable);

function normalizeLimit(value: number | null | undefined): number {
	const parsed = Number(value ?? -1);

	if (Number.isNaN(parsed) || parsed === 0) {
		return -1;
	}

	return parsed;
}

const forwarded = computed(() => ({
	...attrs,
	disabled: props.disabled,
	nonEditable: viewOnly.value,
	limit: viewOnly.value ? normalizeLimit(props.viewLimit) : props.limit,
}));
</script>

<template>
	<component :is="'interface-list-m2a'" v-bind="forwarded" />
</template>
