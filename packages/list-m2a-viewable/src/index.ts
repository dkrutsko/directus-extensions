import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

/**
 * Builder (M2A) Viewable
 *
 * A thin wrapper around the built-in `list-m2a` ("Builder (M2A)") interface.
 * The only behavioural difference is that items in the list remain clickable
 * when the field is read-only (field "Read-only" toggle, missing update
 * permission, batch mode, etc.), opening the related item in the side drawer
 * in view-only mode.
 *
 * The option list below mirrors the built-in interface one-to-one (same field
 * names, same `$t:` translation keys), plus one extra option controlling how
 * many items are listed while in view-only mode.
 */
export default defineInterface({
	id: 'list-m2a-viewable',
	name: 'Builder (M2A) Viewable',
	description: 'Same as Builder (M2A), but items stay clickable when the field is read-only',
	icon: 'note_add',
	component: InterfaceComponent,
	relational: true,
	types: ['alias'],
	localTypes: ['m2a'],
	group: 'relational',
	options: ({ editing, relations }) => [
		{
			field: 'enableSelect',
			name: '$t:selecting_items',
			schema: {
				default_value: true,
			},
			meta: {
				interface: 'boolean',
				options: {
					label: '$t:enable_select_button',
				},
				width: 'half',
			},
		},
		{
			field: 'enableCreate',
			name: '$t:creating_items',
			schema: {
				default_value: true,
			},
			meta: {
				interface: 'boolean',
				options: {
					label: '$t:enable_create_button',
				},
				width: 'half',
			},
		},
		{
			field: 'limit',
			name: '$t:per_page',
			type: 'integer',
			meta: {
				interface: 'input',
				width: 'half',
			},
			schema: {
				default_value: 15,
			},
		},
		{
			field: 'allowDuplicates',
			name: '$t:allow_duplicates',
			schema: {
				default_value: false,
			},
			meta: {
				interface: 'boolean',
				width: 'half',
			},
		},
		{
			field: 'viewLimit',
			name: 'Items Shown When Read-only',
			type: 'integer',
			meta: {
				interface: 'input',
				width: 'half',
				note: 'Pagination is hidden while the field is read-only, so this many items are listed at once. Use -1 to list all items.',
			},
			schema: {
				default_value: -1,
			},
		},
		{
			field: 'prefix',
			name: '$t:prefix',
			meta:
				editing === '+'
					? {
							interface: 'presentation-notice',
							options: {
								text: '$t:interfaces.list-m2m.display_template_configure_notice',
							},
						}
					: {
							interface: 'system-display-template',
							note: '$t:interfaces.list-m2a.prefix_note',
							options: {
								collectionName: relations.o2m?.collection,
							},
						},
		},
	],
});
