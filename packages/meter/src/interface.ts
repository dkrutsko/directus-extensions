import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';
import { optionFields } from './options';
import preview from './preview';

/**
 * Meter
 *
 * An interface for a numeric field which something else keeps up to date: the
 * value is drawn as a bar which is filled in proportion to where it stands
 * between a minimum and a maximum, with the value as text and a caption
 * under it. In a field which can be edited the bar is a slider, set
 * with the pointer and the keys; in a read-only field it is a reading.
 *
 * It sits in the group of the stock Slider, its counterpart for input
 * (app/src/interfaces/slider/index.ts:13 in Directus 11.17.4). The stock id
 * `meter` is a panel of Insights, which is registered apart from interfaces
 * and displays.
 *
 * The id and the option keys are stored in the schema of every project which
 * uses the interface: never rename them.
 */
export default defineInterface({
	id: 'meter',
	name: 'Meter',
	description: 'A number as a bar which is filled as far as the value has come in its range',
	icon: 'speed',
	component: InterfaceComponent,
	types: ['integer', 'bigInteger', 'float', 'decimal'],
	group: 'other',
	recommendedDisplays: ['meter'],
	options: ({ field }) => {
		const stored: Record<string, unknown> = field?.meta?.options ?? {};
		const left = { minValue: stored['minValue'], maxValue: stored['maxValue'], stepInterval: stored['stepInterval'] };

		return optionFields(left, false, field?.type, field?.meta != null, stored, field?.schema);
	},
	preview,
});
