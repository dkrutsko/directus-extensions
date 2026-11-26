<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import type { Link } from './table';

/**
 * The drawer which a link opens: the item, over the form, view-only, the way
 * a related item opens from a relational field. `drawer-item` is a global
 * component of the app (app/src/components/register.ts:158 in Directus
 * 11.17.4), and `disabled` with `nonEditable` is what makes it view-only
 * (app/src/views/private/components/overlay-item.vue:265,284-285). Its `input`
 * event is not listened to, so nothing it could hand back is ever stored.
 *
 * It is a component of its own so that which item is open is its state and
 * not the table's. Kept in interface.vue, opening and closing it ran the
 * render of the whole table again, which on the largest table froze the page
 * for a third of a second each time.
 */
const opened = shallowRef<Link | null>(null);
const active = ref(false);

function open(link: Link) {
	opened.value = link;
	active.value = true;
}

defineExpose({ open });
</script>

<template>
	<drawer-item v-if="opened" v-model:active="active" :collection="opened.collection" :primary-key="opened.id" disabled non-editable />
</template>
