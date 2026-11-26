import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';
import preview from './preview';

/**
 * Builder (M2A) Viewable: the stock Builder (M2A) interface (`list-m2a`), in
 * a wrapper which keeps the rows of a read-only field clickable. A click
 * opens the item in the side drawer, where it can be read and not changed.
 * `interface.vue` says how.
 *
 * The manifest and the options are those of the stock interface in Directus
 * 11.17.4 (app/src/interfaces/list-m2a/index.ts:5-85): the same keys, the
 * same defaults and the same `$t:` names. That is on purpose, and the one
 * place where this package repeats what the app has. The wrapper hands the
 * options to the stock component, which reads them by these keys, and a field
 * must be able to go from one interface to the other and back with its stored
 * options untouched. `viewLimit` is the one option of our own.
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
		// Ours, beside Per Page, which it stands in for while the field is
		// read-only. The order of the options is not stored. With
		// QUERY_LIMIT_MAX set, the API makes that maximum of -1
		// (api/src/utils/sanitize-query.ts:38), and the app cuts a larger
		// number down to it (app/src/composables/use-page-size.ts:27).
		{
			field: 'viewLimit',
			name: 'Items Shown When Read-only',
			type: 'integer',
			meta: {
				interface: 'input',
				width: 'half',
				options: {
					min: -1,
				},
				note: 'Pagination is hidden while read-only. -1 lists all, up to QUERY_LIMIT_MAX.',
			},
			schema: {
				default_value: -1,
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
	preview,
});
