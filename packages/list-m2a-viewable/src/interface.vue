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
 *
 * Two timing rules follow from how the stock component is written. It reads
 * its `limit` prop exactly once, at setup, to seed an internal page size and
 * never looks at the prop again. And v-form marks every field `disabled`
 * while the item is still loading. Mounting the stock component during that
 * window would seed it with the view-only page size, which then sticks after
 * the field turns editable and produces a negative page count (the stock
 * pagination crashes on it). Hence:
 *
 *   1. nothing is mounted while the form is `loading`, only a placeholder so
 *      the form's skeleton overlay keeps its height, and
 *   2. the stock component is keyed on the view-only flag, so any later flip
 *      (batch mode, a collaborator focusing the field, ...) remounts it with a
 *      freshly seeded page size instead of a stale one.
 */

defineOptions({ inheritAttrs: false });

const props = withDefaults(
	defineProps<{
		disabled?: boolean;
		nonEditable?: boolean;
		loading?: boolean;
		limit?: number;
		viewLimit?: number;
	}>(),
	{
		disabled: false,
		nonEditable: false,
		loading: false,
		limit: 15,
		viewLimit: -1,
	},
);

// Everything the form passes that we did not declare as a prop (value,
// collection, field, primaryKey, version, enableCreate, enableSelect, prefix,
// allowDuplicates, onInput, onSetFieldValue, ...) is forwarded untouched.
const attrs = useAttrs();

const viewOnly = computed(() => props.disabled || props.nonEditable);

// Field options arrive from stored JSON and can be null, a string, zero or
// negative. The stock component derives its page count from this number and
// hands that to VPagination, which builds an array of that length, so
// anything that is not a positive integer must be caught here. In edit mode
// fall back to the stock default of 15. In view-only mode -1 means "all
// items", which the API accepts and which is safe because the stock component
// hides its pagination while non-editable.
function toPageSize(value: unknown, fallback: number): number {
	const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);

	if (!Number.isFinite(parsed) || parsed < 1) {
		return fallback;
	}

	return Math.floor(parsed);
}

const forwarded = computed(() => ({
	...attrs,
	loading: props.loading,
	disabled: props.disabled,
	nonEditable: viewOnly.value,
	limit: viewOnly.value ? toPageSize(props.viewLimit, -1) : toPageSize(props.limit, 15),
}));
</script>

<template>
	<div v-if="loading" class="loading-placeholder" />
	<component
		:is="'interface-list-m2a'"
		v-else
		:key="viewOnly ? 'view' : 'edit'"
		v-bind="forwarded"
	/>
</template>

<style scoped>
.loading-placeholder {
	min-block-size: 3.5rem;
}
</style>
