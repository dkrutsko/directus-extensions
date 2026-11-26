import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';
import preview from './preview';
import { DEFAULT_ICON_OFF, DEFAULT_ICON_ON } from './switch';

/**
 * Switch
 *
 * An interface for `boolean` fields: a box as tall as a stock input with a
 * label and a description at the start and an on/off switch at the end. It
 * stores what the stock Toggle stores, `true` or `false`, and never writes
 * `null`.
 *
 * The option keys other than `description` are those of the stock Toggle
 * (app/src/interfaces/boolean/index.ts:14-72 in Directus 11.17.4), so the
 * options of a field carry over when its interface changes from one to the
 * other. The names are the app's own strings where one says exactly the same.
 *
 * The id and the option keys are stored in the schema of every project which
 * uses the interface: never rename them.
 */
export default defineInterface({
	id: 'switch',
	name: 'Switch',
	description: 'An on/off switch with a label and a line of description',
	icon: 'toggle_on',
	component: InterfaceComponent,
	types: ['boolean'],
	group: 'selection',
	recommendedDisplays: ['boolean'],
	options: [
		{
			field: 'label',
			name: '$t:label',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'system-input-translated-string',
				options: {
					placeholder: '$t:interfaces.boolean.label_placeholder',
				},
			},
			schema: {
				default_value: '$t:interfaces.boolean.label_default',
			},
		},
		{
			field: 'description',
			name: '$t:description',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'system-input-translated-string',
				options: {
					placeholder: 'Enter a description...',
				},
				note: 'A second line under the label, which says what the switch does.',
			},
		},
		{
			field: 'iconOn',
			name: '$t:icon_on',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'select-icon',
				note: 'Shown in the knob. Clear it for a plain knob.',
			},
			schema: {
				default_value: DEFAULT_ICON_ON,
			},
		},
		{
			field: 'iconOff',
			name: '$t:icon_off',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'select-icon',
				note: 'Shown in the knob. Clear it for a plain knob.',
			},
			schema: {
				default_value: DEFAULT_ICON_OFF,
			},
		},
		{
			field: 'colorOn',
			name: '$t:interfaces.boolean.color_on',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'select-color',
				note: 'Primary color when empty. A theme variable such as `var(--theme--success)` can be typed in.',
			},
		},
		{
			field: 'colorOff',
			name: '$t:interfaces.boolean.color_off',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'select-color',
				note: 'Gray when empty. A theme variable such as `var(--theme--danger)` can be typed in.',
			},
		},
	],
	preview,
});
