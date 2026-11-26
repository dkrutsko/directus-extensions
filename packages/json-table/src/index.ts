import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';
import preview from './preview';
import { COLUMN_LABELS, DEFAULT_COLUMN_LABELS, DEFAULT_HEIGHT, DEFAULT_PLACEHOLDER, DEFAULT_STICKY, MAX_STICKY, MIN_HEIGHT } from './view';
import type { ColumnLabels } from './view';

// What the form calls each setting of Column Labels. A record has to name
// every one of them, so a new one cannot be left without a name here.
const COLUMN_LABEL_NAMES: Record<ColumnLabels, string> = { auto: 'Automatic', rotated: 'On their side', across: 'Across' };

/** One of the four options which pin rows or columns. The form shows the default as the value and as the placeholder. */
const sticky = (field: string, name: string, preset: number, note: string, meta: object = {}) => ({
	field,
	name,
	type: 'integer' as const,
	meta: {
		width: 'half' as const,
		interface: 'input',
		options: { min: 0, max: MAX_STICKY, placeholder: String(preset) },
		note,
		...meta,
	},
	schema: {
		default_value: preset,
	},
});

/**
 * Rows can only be pinned in a table with a maximum height, so the two
 * options for rows show only while there is one. The condition looks at the
 * form's own `maxHeight`, or, while that key was never stored, at the default
 * which the form shows for it, 0 (app/src/utils/get-default-values-from-fields.ts:9
 * in Directus 11.17.4). `hidden` is what applies while the rule is not met:
 * for 0, and for an input which was emptied, which is `null`. A rule has one
 * key, or the app passes over it (app/src/utils/apply-conditions.ts:16). The
 * component reads the two options whether or not the form shows them.
 */
const WITH_A_HEIGHT = {
	hidden: true,
	conditions: [{ name: 'A maximum height', rule: { maxHeight: { _gt: 0 } }, hidden: false }],
};

/**
 * JSON Table
 *
 * A read-only interface for `json` fields. It draws a table (a header row,
 * rows of cells with text, icons, colours and links, and a legend) which the
 * field's value holds cell by cell. The format of that value is declared in
 * table.ts and described in docs/format.md.
 *
 * The options below only say how the table is laid out: what is in it is
 * always the value's business. Their defaults and limits are those of
 * view.ts, which reads the options for the component. The component never
 * emits `input`, so the field is never marked as changed.
 *
 * The id and the option keys are stored in the schema of every project which
 * uses the interface: never rename them.
 */
export default defineInterface({
	id: 'json-table',
	name: 'JSON Table',
	description: 'Read-only table drawn from the JSON value, with colours, icons, links, sticky rows and columns, and a legend',
	icon: 'table_chart',
	component: InterfaceComponent,
	types: ['json'],
	group: 'other',
	preview,
	options: [
		{
			field: 'columnLabels',
			name: 'Column Labels',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'select-dropdown',
				options: {
					choices: COLUMN_LABELS.map((value) => ({ text: COLUMN_LABEL_NAMES[value], value })),
				},
				note: 'Automatic turns the labels on their side when the columns do not fit across.',
			},
			schema: {
				default_value: DEFAULT_COLUMN_LABELS,
			},
		},
		{
			field: 'maxHeight',
			name: 'Maximum Height',
			type: 'integer',
			meta: {
				width: 'half',
				interface: 'input',
				options: { min: 0, placeholder: String(DEFAULT_HEIGHT) },
				note: `In pixels. 0 is no limit, any other height is at least ${MIN_HEIGHT}. Rows can be sticky once it is set.`,
			},
			schema: {
				default_value: DEFAULT_HEIGHT,
			},
		},
		sticky('stickyLeft', 'Sticky Columns, Left', DEFAULT_STICKY.left, 'The first column holds the row labels.'),
		sticky('stickyRight', 'Sticky Columns, Right', DEFAULT_STICKY.right, 'For example a column which holds totals.'),
		sticky('stickyTop', 'Sticky Rows, Top', DEFAULT_STICKY.top, 'The first row holds the column labels.', WITH_A_HEIGHT),
		sticky('stickyBottom', 'Sticky Rows, Bottom', DEFAULT_STICKY.bottom, 'For example a row which holds totals.', WITH_A_HEIGHT),
		{
			field: 'placeholder',
			name: '$t:placeholder',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'input',
				options: { placeholder: DEFAULT_PLACEHOLDER },
				note: 'Shown while the field is empty.',
			},
		},
	],
});
