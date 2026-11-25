import type { InterfaceConfig } from '@directus/types';
import { DEFAULT_COLOR, MIN_SUBDIVISIONS, readEditing, readLook, readOptions } from './meter';

type Fields = Extract<InterfaceConfig['options'], unknown[]>;

interface Choice {
	text: string;
	value: string;
}

const VISUALIZATIONS: Choice[] = [
	{ text: 'Contiguous', value: 'contiguous' },
	{ text: 'Pills', value: 'pills' },
	{ text: 'Segments', value: 'segments' },
	{ text: 'Bars', value: 'bars' },
	{ text: 'Dots', value: 'dots' },
];

const DOTS_LAYOUTS: Choice[] = [
	{ text: 'Packed', value: 'packed' },
	{ text: 'Spread', value: 'spread' },
];

const ACTIVE_COLORINGS: Choice[] = [
	{ text: 'Value', value: 'value' },
	{ text: 'Blend', value: 'blend' },
	{ text: 'Steps', value: 'steps' },
	{ text: 'Gradient', value: 'gradient' },
];

const INPUTS: Choice[] = [
	{ text: 'Automatic', value: 'automatic' },
	{ text: 'Contiguous', value: 'contiguous' },
	{ text: 'Segment', value: 'segment' },
	{ text: 'Relative', value: 'relative' },
];

const INACTIVE_COLORINGS: Choice[] = [
	{ text: 'Plain', value: 'plain' },
	{ text: 'Automatic', value: 'automatic' },
	...ACTIVE_COLORINGS,
];

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
 * `own` are the options of the entry as the form holds them at the moment,
 * which only decide which inputs there are: the number of subdivisions is
 * asked for while the track is cut into pieces, and the layout of the dots
 * while those pieces are dots.
 *
 * The dropdowns of the look (`visualization`, `dotsLayout`, `activeColoring`,
 * `inactiveColoring`) fall back like the limits: an emptied one is taken from
 * the interface again. In the form of the display they can be emptied, and
 * then show what they come to as their placeholder.
 *
 * The limits are `float` so that the number input hands over numbers; a
 * `decimal` one would store their text (app/src/constants.ts:171-173 in
 * Directus 11.17.4). The names are the app's own strings where one says
 * exactly the same.
 */
export function optionFields(fallback: unknown, display: boolean, own?: unknown, type?: unknown): Fields {
	const base = readOptions(undefined, fallback);

	// How the meter is drawn when nothing is set here, and how it is drawn as the form stands. The number of
	// subdivisions is only asked for while the track has any: the app builds the form again when an option changes.
	const baseLook = readLook(undefined, fallback);
	const look = readLook(own, fallback);

	// A dropdown of the look. It shows what it comes to while nothing is stored. In the form of the display it can
	// be emptied, which hands the option back to the interface, and then shows what it comes to as its placeholder.
	const dropdown = (field: string, name: string, choices: Choice[], preset: string, note: string): Fields[number] => ({
		field,
		name,
		type: 'string',
		meta: {
			width: 'half',
			interface: 'select-dropdown',
			options: display ? { choices, allowNone: true, placeholder: choices.find((choice) => choice.value === preset)?.text } : { choices },
			note,
		},
		schema: {
			default_value: preset,
		},
	});

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
		dropdown('visualization', 'Visualization', VISUALIZATIONS, baseLook.visualization, 'One bar, or a row of pieces which are each filled or not.'),
		...(look.visualization === 'contiguous'
			? []
			: ([
					{
						field: 'subdivisions',
						name: 'Subdivisions',
						type: 'integer',
						meta: {
							width: 'half',
							interface: 'input',
							options: {
								placeholder: baseLook.subdivisions === null ? '$t:automatic' : String(baseLook.subdivisions),
								min: MIN_SUBDIVISIONS,
							},
							note: `How many pieces, at least ${MIN_SUBDIVISIONS}. The width is the ceiling: where they do not fit, fewer are drawn. Left empty: one for every unit of the range, or as many as fit.`,
						},
					},
				] satisfies Fields)),
		...(look.visualization === 'dots' ? [dropdown('dotsLayout', 'Dots Layout', DOTS_LAYOUTS, baseLook.dotsLayout, 'Packed: from the start. Spread: from edge to edge.')] : []),
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
		dropdown(
			'activeColoring',
			'Active Coloring',
			ACTIVE_COLORINGS,
			baseLook.activeColoring,
			'What is filled. Value: the colour of the current value. Blend: one colour which shifts towards the next threshold as the value nears it. Steps: each part of the track in the colour of its own threshold. Gradient: those colours blended along the track.',
		),
		dropdown(
			'inactiveColoring',
			'Inactive Coloring',
			INACTIVE_COLORINGS,
			baseLook.inactiveColoring,
			'What is not filled. Plain: the track. Automatic: as what is filled, faded. Or one of the four on its own, faded.',
		),
	];

	if (!display) {
		// How the meter is edited, which only the interface is. The step shows what it comes to while it is empty:
		// the step a stock Slider left behind, or 1. The sensitivity is only asked for by the method which has one.
		const editing = readEditing(own, type);
		const base = readEditing({ stepInterval: (fallback as Record<string, unknown> | null)?.['stepInterval'] }, type);

		return [
			...fields,
			{
				field: 'input',
				name: 'Input Method',
				type: 'string',
				meta: {
					width: 'half',
					interface: 'select-dropdown',
					options: { choices: INPUTS },
					note: 'How the pointer sets the value. Automatic: by the pieces where each is one step, else by where the pointer is. Relative: by how far it moves. A read-only field is never edited.',
				},
				schema: {
					default_value: 'automatic',
				},
			},
			{
				field: 'step',
				name: 'Step',
				type: editing.whole ? 'integer' : 'float',
				meta: {
					width: 'half',
					interface: 'input',
					options: {
						placeholder: String(base.step),
						min: 0,
					},
					note: 'The distance between two values which can be set, counted from the minimum.',
				},
			},
			...(editing.input === 'relative'
				? ([
						{
							field: 'sensitivity',
							name: 'Sensitivity',
							type: 'float',
							meta: {
								width: 'half',
								interface: 'input',
								options: {
									placeholder: '1',
									min: 0,
								},
								note: 'At 1, moving the pointer by the width of the meter covers the whole range. Shift makes it ten times finer.',
							},
						},
					] satisfies Fields)
				: []),
		];
	}

	return [
		{
			field: 'inherited',
			type: 'alias',
			meta: {
				width: 'full',
				interface: 'presentation-notice',
				special: ['alias', 'no-data'],
				options: {
					text: 'An option which is not set here is taken from the interface of the field, and shown as it is set there. Emptied limits and an emptied label are taken from it again, as are the emptied dropdowns of the look and the colouring. An emptied colour or list of thresholds means none.',
				},
			},
		},
		...fields,
	];
}
