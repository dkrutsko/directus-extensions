<script setup lang="ts">
import { clean } from './value';

withDefaults(
	defineProps<{
		value: string | null;
		disabled?: boolean;
		placeholder?: string | null;
	}>(),
	{
		disabled: false,
		placeholder: null,
	},
);

const emit = defineEmits<{ input: [value: string | null] }>();
</script>

<template>
	<v-input
		class="__NAME__"
		:model-value="value"
		:disabled="disabled"
		:placeholder="placeholder ?? undefined"
		@update:model-value="emit('input', clean($event))"
	/>
</template>
