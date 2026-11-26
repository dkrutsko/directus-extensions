<script setup lang="ts">
import { computed, resolveComponent, shallowRef, useAttrs, watchEffect } from 'vue';
import { itemOf, keyOf, type Mount, mountOf, pageSize } from './page-size';

/**
 * A wrapper around the stock Builder (M2A) component. All paths are those of
 * the Directus 11.17.4 source.
 *
 * Directus registers every interface as a global component named
 * `interface-<id>` (app/src/interfaces/index.ts:16), so the stock component
 * is rendered by its name and nothing is imported from the app.
 *
 * Why a read-only field is inert in the stock interface: a row of its list is
 * disabled while `disabled` is set and `nonEditable` is not
 * (app/src/interfaces/list-m2a/list-m2a.vue:388, and 422 for a row whose
 * collection is not allowed). `disabled` is set for every field the user
 * cannot change here and now. `nonEditable` is only set where the app decided
 * that the user may look but not edit: a field which the user's update
 * permission leaves out (app/src/composables/use-permissions/item/lib/get-fields.ts:66-75,
 * read at app/src/components/v-form/components/form-field.vue:75-79), a
 * comparison of revisions, a share, a form inside a view-only drawer. The
 * Readonly toggle of a field sets `disabled` alone. So does a missing update
 * permission on the whole collection: the app gets the access "none" for it,
 * where get-fields.ts:58 tests for `false`.
 *
 * What the wrapper does: it sets `nonEditable` whenever the field is
 * `disabled`. The rows then react to a click, the stock component hides what
 * would change the list (the drag handle at list-m2a.vue:394, the remove
 * buttons at 406 and 431, the buttons under the list and the pagination at
 * 446-506), and the drawer of an item gets both flags (520-521) and cannot
 * save.
 *
 * Since the pagination is hidden with the rest, the items after the first
 * page could not be reached. So while view-only the page size is the option
 * `viewLimit`, all items by default, and not `limit`.
 *
 * Two rules of timing follow from how the stock component reads `limit`. It
 * reads it once, at setup, for a page size of its own (list-m2a.vue:107-113),
 * divides the number of items by that (114) and hands the result to the
 * pagination, which makes an array that long
 * (app/src/components/v-pagination.vue:46). And the form disables every field
 * while its item loads (app/src/components/v-form/v-form.vue:225-235). A stock
 * component mounted during the first load would take the view-only page size
 * of -1 and keep it once the field can be edited: a negative number of pages,
 * and "RangeError: Invalid array length". Hence:
 *
 *   1. Until the form has loaded once, nothing is mounted but a placeholder
 *      as high as the skeleton the form draws over it.
 *   2. The stock component is keyed by the mode, so a change of it (a batch
 *      edit switching the field on, another user taking the field) mounts a
 *      new one, with the page size of the new mode.
 *
 * A later load does not unmount anything by itself. Saving and staying on
 * the item loads it again (app/src/modules/content/routes/item.vue:494-506,
 * which calls `refresh` at app/src/composables/use-item/index.ts:514-526),
 * and a list mounted anew then would be back on its first page. During such
 * a load the stock component gets `disabled` with the mode it had, as it does
 * under the stock interface.
 *
 * The same form also loads when it is given another item or another content
 * version (use-item/index.ts:104, with the version in the query of 81-86),
 * and the stock component never puts its page back to 1 (list-m2a.vue:115).
 * Kept through that, it asks for page 2 of a list which may have one page,
 * shows "No items" and hides the pagination which would lead back (493).
 * Hence:
 *
 *   3. The stock component is also keyed by the item: the primary key and
 *      the key of the version. During a load the item page hands out the
 *      primary key "+" (item.vue:272-273), so like the mode, the item is the
 *      one seen when the form was last not loading. A save keeps the list,
 *      and another item starts with a new one.
 */

defineOptions({ inheritAttrs: false });

// The two options are typed `unknown`, and no prop has a default: they are
// stored JSON, and `pageSize` is where anything unusable falls back. Vue
// makes false of a boolean prop which is not passed.
//
// `primaryKey` and `version` are props because the key is made of them: what
// arrives as an attribute does not start a watcher when it changes.
const props = defineProps<{
	disabled?: boolean;
	nonEditable?: boolean;
	loading?: boolean;
	primaryKey?: string | number | null;
	version?: unknown;
	limit?: unknown;
	viewLimit?: unknown;
}>();

// Everything else the form passes (value, collection, field, the other
// options, the listeners) goes on as it came.
const attrs = useAttrs();

// `resolveComponent` hands back the name where nothing is registered under
// it. Without this check a Directus which renamed or dropped the stock
// interface would draw an empty element in place of the field, without a word.
const stock = resolveComponent('interface-list-m2a');
const found = typeof stock !== 'string';

const now = computed<Mount>(() => ({
	viewOnly: props.disabled || props.nonEditable,
	item: itemOf(props.primaryKey, props.version),
}));

// What was seen when the form was last not loading: see `mountOf`.
const last = shallowRef<Mount | null>(null);

watchEffect(() => {
	if (!props.loading) last.value = now.value;
});

const mount = computed(() => mountOf(props.loading, now.value, last.value));
const viewOnly = computed(() => mount.value?.viewOnly === true);

// `loading` is not passed on: the stock component has no such prop, and the
// form draws the skeleton itself.
const forwarded = computed(() => ({
	...attrs,
	primaryKey: props.primaryKey,
	version: props.version,
	disabled: props.disabled,
	nonEditable: viewOnly.value,
	limit: pageSize(viewOnly.value, props.limit, props.viewLimit),
}));
</script>

<template>
	<v-notice v-if="!found" type="warning">
		Builder (M2A) Viewable draws the built-in Builder (M2A) interface, which this version of Directus does not have.
		Choose another interface for this field.
	</v-notice>
	<div v-else-if="mount === null" style="min-block-size: 3.5rem" />
	<component :is="stock" v-else :key="keyOf(mount)" v-bind="forwarded" />
</template>
