import type { InterfaceConfig } from '@directus/types';
import { DEFAULT_COLOR, readOptions } from './meter';

type Fields = Extract<InterfaceConfig['options'], unknown[]>;

/**
 * The options form of both entries, which have the same options under the
 * same keys. The keys are stored in the schema of every project which uses
 * either: never rename them.
 *
 * `fallback` is what an option which is not set comes to, and the form shows
 * it: as the placeholder of a limit and of the caption, and as the default of
 * the other inputs. A default which a form shows is not stored, so the
 * fall-back stays in place until an option is changed. For the display it is
 * the options of the field's interface, which the display takes over key by
 * key (`readOptions`), and a notice says so. For
 * the interface it is the limits a stock Slider left behind, if the field
 * was one before: the app keeps the options of a field when its interface
 * changes.
 *
 * A form shows a default only while the key is missing, and an empty input
 * once the key is stored as `null`; a placeholder shows whenever the input is
 * empty. What is drawn follows that: emptied limits and an emptied caption
 * are taken over again, an emptied colour or list of thresholds means none.
 *
 * The limits are `float` so that the number input hands over numbers; a
 * `decimal` one would store their text (app/src/constants.ts:171-173 in
 * Directus 11.17.4). The names are the app's own strings where one says
 * exactly the same.
 */
export function optionFields(fallback: unknown, display: boolean): Fields {
	const base = readOptions(undefined, fallback);

	const fields: Fields = [
		{
			field: 'min',
			name: '$t:interfaces.input.minimum_value',
			type: 'float',
			meta: {
				width: 'half',
				interface: 'input',
				options: {
					placeholder: String(base.min),
				},
			},
		},
		{
			field: 'max',
			name: '$t:interfaces.input.maximum_value',
			type: 'float',
			meta: {
				width: 'half',
				interface: 'input',
				options: {
					placeholder: String(base.max),
				},
			},
		},
		{
			field: 'label',
			name: '$t:label',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'system-input-translated-string',
				options: {
					placeholder: base.label ?? 'Enter a caption...',
				},
				note: display ? 'Shown when the mouse rests on the bar, and read out by screen readers.' : 'A caption under the bar.',
			},
		},
		{
			field: 'indicator',
			name: 'Value Text',
			type: 'boolean',
			meta: {
				width: 'half',
				interface: 'boolean',
				options: {
					label: 'Show the value beside the bar',
				},
			},
			schema: {
				default_value: base.indicator,
			},
		},
		{
			field: 'indicatorFormat',
			name: '$t:format',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'select-dropdown',
				options: {
					choices: [
						{ text: '$t:percent', value: 'percent' },
						{ text: '$t:value', value: 'value' },
						{ text: 'Value / Maximum', value: 'fraction' },
					],
				},
			},
			schema: {
				default_value: base.indicatorFormat,
			},
		},
		{
			field: 'color',
			name: '$t:color',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'select-color',
				note: 'The colour of the bar. Primary colour when empty.',
			},
			schema: {
				default_value: base.color !== DEFAULT_COLOR ? base.color : null,
			},
		},
		{
			field: 'thresholds',
			name: 'Thresholds',
			type: 'json',
			meta: {
				width: 'full',
				interface: 'list',
				note: 'From its value upward the bar has the colour of a threshold. The highest threshold the value has reached counts.',
				options: {
					template: '{{ value }}',
					fields: [
						{
							field: 'value',
							name: '$t:value',
							type: 'float',
							meta: {
								width: 'half',
								interface: 'input',
								required: true,
							},
						},
						{
							field: 'color',
							name: '$t:color',
							type: 'string',
							meta: {
								width: 'half',
								interface: 'select-color',
								required: true,
							},
						},
					],
				},
			},
			schema: {
				default_value: base.thresholds.length > 0 ? base.thresholds : null,
			},
		},
	];

	if (!display) return fields;

	return [
		{
			field: 'inherited',
			type: 'alias',
			meta: {
				width: 'full',
				interface: 'presentation-notice',
				special: ['alias', 'no-data'],
				options: {
					text: 'An option which is not set here is taken from the interface of the field, and shown as it is set there. Emptied limits and an emptied label are taken from it again. An emptied colour or list of thresholds means none.',
				},
			},
		},
		...fields,
	];
}
