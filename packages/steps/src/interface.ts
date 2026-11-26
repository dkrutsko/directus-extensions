import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';
import preview from './preview';

/**
 * Steps
 *
 * An interface for a `string` or `integer` field which holds one value out
 * of an ordered list: the list is drawn as a progress track, and a click on
 * a step makes it the current one. The field stores the value of that step
 * and nothing else.
 *
 * The option `choices` and the keys `text`, `value` and `icon` of its
 * entries are those of the stock Dropdown
 * (app/src/interfaces/select-dropdown/index.ts:14, 41 in Directus 11.17.4), so
 * the options of a field carry over when its interface changes from one to
 * the other. The second option, `showLabels`, is ours; the Dropdown leaves it
 * alone. As there, the options are a function of the field, which gives
 * the input of a step's value the type of the field: an integer field gets a
 * number input and its steps hold numbers.
 *
 * The id and the option keys are stored in the schema of every project which
 * uses the interface: never rename them.
 */
export default defineInterface({
	id: 'steps',
	name: 'Steps',
	description: 'An ordered list of choices as a clickable progress track',
	icon: 'step',
	component: InterfaceComponent,
	types: ['string', 'integer'],
	group: 'selection',
	recommendedDisplays: ['steps'],
	options: ({ field }) => [
		{
			field: 'choices',
			name: 'Steps',
			type: 'json',
			meta: {
				width: 'full',
				interface: 'list',
				// An integer field is told the one rule more which holds for it.
				note:
					'In the order in which they are drawn. A step without a value' +
					(field?.type === 'integer' ? ', with a value which is not a whole number' : '') +
					', or with a value an earlier step already has, is left out.',
				options: {
					template: '{{ text }} ({{ value }})',
					fields: [
						{
							field: 'text',
							name: '$t:text',
							type: 'string',
							meta: {
								width: 'half',
								interface: 'system-input-translated-string',
								note: 'Optional. A step without a text is named by its value and has no label.',
								options: {
									placeholder: '$t:interfaces.select-dropdown.choices_name_placeholder',
								},
							},
						},
						{
							field: 'value',
							name: '$t:value',
							type: field?.type === 'integer' ? 'integer' : 'string',
							meta: {
								width: 'half',
								interface: 'input',
								required: true,
								options: {
									font: 'monospace',
									placeholder: '$t:interfaces.select-dropdown.choices_value_placeholder',
								},
							},
						},
						{
							field: 'icon',
							name: '$t:icon',
							type: 'string',
							meta: {
								width: 'half',
								interface: 'select-icon',
								note: 'Shown in the marker of the step instead of its number.',
							},
						},
					],
				},
			},
		},
		{
			field: 'showLabels',
			name: 'Show Labels',
			type: 'boolean',
			meta: {
				width: 'half',
				interface: 'boolean',
				note: 'Off: the markers alone, as high as an input. The name of a step shows as a tooltip, also where the field cannot be edited.',
				options: {
					label: 'Text under the markers',
				},
			},
			schema: {
				default_value: true,
			},
		},
	],
	preview,
});
