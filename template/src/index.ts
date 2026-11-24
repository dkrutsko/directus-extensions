import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

/**
 * __TITLE__
 *
 * The id is stored in the schema of every project which uses the interface:
 * never rename it after the first release.
 */
export default defineInterface({
	id: '__NAME__',
	name: '__TITLE__',
	description: '__DESCRIPTION__',
	icon: 'extension',
	component: InterfaceComponent,
	types: ['string'],
	group: 'standard',
	options: [
		{
			field: 'placeholder',
			name: '$t:placeholder',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'system-input-translated-string',
			},
		},
	],
});
