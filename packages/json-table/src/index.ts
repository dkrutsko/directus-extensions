import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

/**
 * JSON Table
 *
 * A read-only interface for `json` fields. It draws a table (a header row,
 * rows of cells with text, icons, colours and links, and a legend) which the
 * field's value holds cell by cell. The format of that value is declared in
 * table.ts and described in docs/format.md.
 *
 * The options below only say how the table is laid out: what is in it is
 * always the value's business. The component never emits `input`, so the field
 * is never marked as changed.
 */
export default defineInterface({
	id: 'json-table',
	name: 'JSON Table',
	description:
		'Read-only table drawn from the JSON value, with colours, icons, links, sticky rows and columns, and a legend',
	icon: 'table_chart',
	component: InterfaceComponent,
	types: ['json'],
	group: 'other',
	options: [
		{
			field: 'columnLabels',
			name: 'Column Labels',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'select-dropdown',
				options: {
					choices: [
						{ text: 'Automatic', value: 'auto' },
						{ text: 'On their side', value: 'rotated' },
						{ text: 'Across', value: 'across' },
					],
				},
				note: 'Automatic turns the labels on their side when the columns do not fit across.',
			},
			schema: {
				default_value: 'auto',
			},
		},
		{
			field: 'maxHeight',
			name: 'Maximum Height',
			type: 'integer',
			meta: {
				width: 'half',
				interface: 'input',
				options: { min: 0, placeholder: '0' },
				note: 'In pixels. 0 is no limit, and any other height is at least 320.',
			},
			schema: {
				default_value: 0,
			},
		},
		{
			field: 'stickyLeft',
			name: 'Sticky Columns, Left',
			type: 'integer',
			meta: {
				width: 'half',
				interface: 'input',
				options: { min: 0, max: 10, placeholder: '1' },
				note: 'The first column holds the row labels.',
			},
			schema: {
				default_value: 1,
			},
		},
		{
			field: 'stickyRight',
			name: 'Sticky Columns, Right',
			type: 'integer',
			meta: {
				width: 'half',
				interface: 'input',
				options: { min: 0, max: 10, placeholder: '0' },
				note: 'For example a column which holds totals.',
			},
			schema: {
				default_value: 0,
			},
		},
		{
			field: 'stickyTop',
			name: 'Sticky Rows, Top',
			type: 'integer',
			meta: {
				width: 'half',
				interface: 'input',
				options: { min: 0, max: 10, placeholder: '1' },
				note: 'The first row holds the column labels. Needs a maximum height.',
			},
			schema: {
				default_value: 1,
			},
		},
		{
			field: 'stickyBottom',
			name: 'Sticky Rows, Bottom',
			type: 'integer',
			meta: {
				width: 'half',
				interface: 'input',
				options: { min: 0, max: 10, placeholder: '0' },
				note: 'For example a row which holds totals. Needs a maximum height.',
			},
			schema: {
				default_value: 0,
			},
		},
		{
			field: 'placeholder',
			name: 'Placeholder',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'input',
				options: { placeholder: 'No table yet' },
				note: 'Shown while the field is empty.',
			},
		},
	],
});
