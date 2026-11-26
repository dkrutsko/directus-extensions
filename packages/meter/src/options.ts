import type { InterfaceConfig } from '@directus/types';
import {
	COLORINGS,
	DEFAULT_COLOR,
	DEFAULT_GROW,
	DEFAULT_INPUT,
	DEFAULT_SENSITIVITY,
	DOTS_LAYOUTS,
	FORMATS,
	INACTIVE_COLORINGS,
	INPUTS,
	MAX_GROW,
	MIN_SUBDIVISIONS,
	SHAPES,
	VISUALIZATIONS,
	readEditing,
	readLook,
	readOptions,
	scaleOf,
} from './meter';
import type { DotsLayout, IndicatorFormat, InactiveColoring, InputMethod, Visualization } from './meter';

type Fields = Extract<InterfaceConfig['options'], unknown[]>;

interface Choice {
	text: string;
	value: string;
}

// What the form calls each word of an option which has choices. The words themselves, and their order, are those
// of `meter.ts`; a record has to name every one of them, so a new word cannot be left without a name here.
const FORMAT_NAMES: Record<IndicatorFormat, string> = { percent: '$t:percent', value: '$t:value', fraction: 'Value / Maximum' };
const VISUALIZATION_NAMES: Record<Visualization, string> = { contiguous: 'Contiguous', pills: 'Pills', segments: 'Segments', bars: 'Bars', dots: 'Dots' };
const DOTS_LAYOUT_NAMES: Record<DotsLayout, string> = { packed: 'Packed', spread: 'Spread' };
const COLORING_NAMES: Record<InactiveColoring, string> = {
	plain: 'Plain',
	automatic: 'Automatic',
	value: 'Value',
	blend: 'Blend',
	steps: 'Steps',
	gradient: 'Gradient',
};
const INPUT_NAMES: Record<InputMethod, string> = { automatic: 'Automatic', position: 'Position', piece: 'Piece', relative: 'Relative', none: 'None' };

/** The choices of a dropdown: the words of an option, each with its name. */
const choicesOf = <T extends string>(words: readonly T[], names: Record<T, string>): Choice[] => words.map((value) => ({ text: names[value], value }));

/** What an empty input says in the form of a display which cannot see the options of its interface. */
const FROM_INTERFACE = 'As in the interface';

/**
 * The conditions of an option which applies only while the track is cut into pieces. Each rule has one key: the
 * app passes over a rule with more or fewer (app/src/utils/apply-conditions.ts:16 in Directus 11.17.4).
 */
const SHOWN_FOR_PIECES = [
	{ name: 'One bar', rule: { visualization: { _eq: 'contiguous' } }, hidden: true },
	{ name: 'Pieces', rule: { visualization: { _in: [...SHAPES] } }, hidden: false },
];

/**
 * The conditions of Active Coloring, which changes nothing while there are no thresholds: all four colourings of
 * the fill then draw the one colour. The rules look at the form's own `thresholds`, or, while that key was never
 * stored, at the default the form shows for it (app/src/utils/get-default-values-from-fields.ts:9 in Directus
 * 11.17.4): `null` in the form of the interface, the interface's list in the form of the display. A list which is
 * emptied in the form is `null` as well (app/src/interfaces/list/list.vue:201-203); one which the API was sent
 * can be `[]`. No operator of the app's tells `[]` from a list with entries by the key itself (`_nnull` and
 * `_nempty` both pass it), so two rules count the list: the app works out `count()` of a key before it tries a
 * rule, and gives `null` for what is no list (packages/utils/shared/validate-payload.ts:57 and
 * functions.ts:52-54).
 *
 * The app tries the last rule first. The first one here is for an app which does not count, where neither rule on
 * `count()` is ever met: a list which is not `null` then shows the dropdown, where it would else be out of reach.
 */
const KNOWN_THRESHOLDS = [
	{ name: 'A list of thresholds', rule: { thresholds: { _nnull: true } }, hidden: false },
	{ name: 'No thresholds', rule: { thresholds: { _null: true } }, hidden: true },
];
const COUNTED_THRESHOLDS = [
	{ name: 'An empty list of thresholds', rule: { 'count(thresholds)': { _eq: 0 } }, hidden: true },
	{ name: 'Thresholds', rule: { 'count(thresholds)': { _gt: 0 } }, hidden: false },
];

/** The formats of the value text which have a prefix and a suffix. A percentage has neither. */
const AFFIXED: readonly IndicatorFormat[] = FORMATS.filter((format) => format !== 'percent');

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
 * key (`readOptions`), and a notice says so. For the interface it is the
 * limits a stock Slider left behind, if the field was one before: the app
 * keeps the options of a field when its interface changes.
 *
 * A form shows a default only while the key is missing, and an empty input
 * once the key is stored as `null`; a placeholder shows whenever the input is
 * empty. What is drawn follows that: emptied limits and an emptied caption
 * are taken over again, an emptied colour or list of thresholds means none.
 *
 * Some options apply only sometimes: the number of subdivisions, `grow` and
 * `fade` while the track is cut into pieces, the layout of the dots while
 * those pieces are dots, `prefix` and `suffix` while the format is not the
 * percentage, the colouring of the fill while there are thresholds, the
 * sensitivity for the relative method, and the step for every input method
 * but `none`. `grow` is an option of the interface alone: the
 * pieces of a display never grow. They are always in the list, with
 * conditions on the values of the form itself which show or hide them; the
 * form evaluates those wherever it is drawn. The list cannot be made to
 * depend on the options as they are being edited: the ordinary field settings
 * hand the function the field with its options, but the dialog in which a
 * stock Repeater's fields are set up hands it a stand-in without any
 * (`{ field: { type: 'unknown' }, ... }`,
 * app/src/interfaces/_system/system-interface-options/system-interface-options.vue:49-53
 * in Directus 11.17.4), and an option which is left out there can never be
 * reached. `hidden` itself is what applies while the deciding option is not
 * among the form's values, which for the display is what the interface has.
 *
 * That dialog also has a display with its options, in a group which starts
 * closed, and hands the display's form the same stand-in
 * (app/src/interfaces/_system/system-display-options/system-display-options.vue:49-51).
 * There the options of the interface are not to be had (`known` is false), so
 * the form of the display cannot show what an unset option comes to: its
 * placeholders say that the interface decides, its dropdowns start empty, and
 * the number of subdivisions, `fade` and the layout of the dots show until
 * the form's own visualization rules them out.
 *
 * The dropdowns of the format and the look (`indicatorFormat`,
 * `visualization`, `dotsLayout`, `activeColoring`, `inactiveColoring`) fall
 * back like the limits: an emptied one is taken from
 * the interface again. In the form of the display they can be emptied, and
 * then show what they come to as their placeholder.
 *
 * `prefix` and `suffix` are the inputs of the stock Formatted Value display,
 * under its keys and its names (app/src/displays/formatted-value/index.ts:99-124
 * in Directus 11.17.4), and like its own they are joined to the number as
 * they are typed.
 *
 * `own` are the options of the interface as they are stored, where the form
 * was handed its field: the Step input shows as its placeholder what the step
 * comes to while it is empty, which depends on the limits and, for a
 * `decimal` field, on the scale of its column (`defaultStep`; `schema` is
 * that of the field). Where the form was not told its field (`known` is
 * false) the limits and the type are not to be had, and the placeholder says
 * "Automatic".
 *
 * The limits are `float` so that the number input hands over numbers; a
 * `decimal` one would store their text (app/src/constants.ts:171-173 in
 * Directus 11.17.4). The names are the app's own strings where one says
 * exactly the same.
 */
export function optionFields(fallback: unknown, display: boolean, type?: unknown, known = true, own?: unknown, schema?: unknown): Fields {
	// What the options, and how the meter is drawn, come to when nothing is set here.
	const unsetOptions = readOptions(undefined, fallback);
	const unsetLook = readLook(undefined, fallback);

	// The form of a display which was not told its field: what an unset option comes to is not known here.
	const blind = display && !known;
	const unset = (text: string) => (blind ? FROM_INTERFACE : text);

	// A dropdown of the format or the look. It shows what it comes to while nothing is stored. In the form of the display it can
	// be emptied, which hands the option back to the interface, and then shows what it comes to as its placeholder.
	const dropdown = (field: string, name: string, choices: Choice[], preset: string, note?: string): Fields[number] => ({
		field,
		name,
		type: 'string',
		meta: {
			width: 'half',
			interface: 'select-dropdown',
			options: display ? { choices, allowNone: true, placeholder: unset(choices.find((choice) => choice.value === preset)?.text ?? '') } : { choices },
			...(note ? { note } : {}),
		},
		...(blind ? {} : { schema: { default_value: preset } }),
	});

	// The text before and after the value text. In the form of the display the placeholder is what is taken over,
	// as for the caption. Hidden while the format is the percentage, which has neither; a form which does not
	// know the format of the interface shows them until its own format rules them out.
	const affix = (field: 'prefix' | 'suffix', name: string, note: string): Fields[number] => ({
		field,
		name,
		type: 'string',
		meta: {
			width: 'half',
			interface: 'system-input-translated-string',
			options: {
				...(blind ? { placeholder: FROM_INTERFACE } : unsetOptions[field] !== '' ? { placeholder: unsetOptions[field] } : {}),
				trim: false,
			},
			note,
			hidden: !blind && !AFFIXED.includes(unsetOptions.indicatorFormat),
			conditions: [
				{ name: 'Percentage', rule: { indicatorFormat: { _eq: 'percent' } }, hidden: true },
				{ name: 'Value or fraction', rule: { indicatorFormat: { _in: [...AFFIXED] } }, hidden: false },
			],
		},
	});

	const dotsLayout = dropdown(
		'dotsLayout',
		'Dots Layout',
		choicesOf(DOTS_LAYOUTS, DOTS_LAYOUT_NAMES),
		unsetLook.dotsLayout,
		'Packed: from the start. Spread: from edge to edge.',
	);

	// Hidden while it is certain that no threshold applies. The form of a display which was not told its field
	// shows `null` for the list also while the key was never stored, when the thresholds are the interface's
	// and not known here: there only a list which is stored empty hides the dropdown.
	const activeColoring = dropdown(
		'activeColoring',
		'Active Coloring',
		choicesOf(COLORINGS, COLORING_NAMES),
		unsetLook.activeColoring,
		'Value, Blend: one color, by the value. Steps, Gradient: colors by their place.',
	);

	const fields: Fields = [
		{
			field: 'min',
			name: '$t:interfaces.input.minimum_value',
			type: 'float',
			meta: {
				width: 'half',
				interface: 'input',
				options: {
					placeholder: unset(String(unsetOptions.min)),
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
					placeholder: unset(String(unsetOptions.max)),
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
					placeholder: unset(unsetOptions.label ?? 'Enter a caption...'),
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
					label: display ? 'Show the value beside the bar' : 'Show the value under the bar',
				},
			},
			schema: {
				default_value: unsetOptions.indicator,
			},
		},
		dropdown('indicatorFormat', '$t:format', choicesOf(FORMATS, FORMAT_NAMES), unsetOptions.indicatorFormat),
		affix('prefix', '$t:displays.formatted-value.prefix', 'As typed, with no space added. A fraction has it before both numbers.'),
		affix('suffix', '$t:displays.formatted-value.suffix', 'As typed: " GB" needs its space. A fraction has it once, at the end.'),
		dropdown(
			'visualization',
			'Visualization',
			choicesOf(VISUALIZATIONS, VISUALIZATION_NAMES),
			unsetLook.visualization,
			'One bar, or a row of pieces which are each filled or not.',
		),
		{
			field: 'subdivisions',
			name: 'Subdivisions',
			type: 'integer',
			meta: {
				width: 'half',
				interface: 'input',
				options: {
					placeholder: unset(unsetLook.subdivisions === null ? '$t:automatic' : String(unsetLook.subdivisions)),
					min: MIN_SUBDIVISIONS,
				},
				note: 'Empty: one for each unit of a whole range, else what fits. Fewer if too many.',
				hidden: !blind && unsetLook.visualization === 'contiguous',
				conditions: SHOWN_FOR_PIECES,
			},
		},
		{
			...dotsLayout,
			meta: {
				...dotsLayout.meta,
				hidden: !blind && unsetLook.visualization !== 'dots',
				conditions: [
					{ name: 'Not dots', rule: { visualization: { _in: VISUALIZATIONS.filter((word) => word !== 'dots') } }, hidden: true },
					{ name: 'Dots', rule: { visualization: { _eq: 'dots' } }, hidden: false },
				],
			},
		},
		...(display
			? []
			: [
					{
						field: 'grow',
						name: 'Grow',
						type: 'float' as const,
						meta: {
							width: 'half' as const,
							interface: 'input',
							options: {
								placeholder: String(DEFAULT_GROW),
								min: 0,
								max: MAX_GROW,
								step: 0.5,
							},
							note: '0: off. 1: the next piece or few thin bars grow as the value nears. More: a ramp.',
							hidden: unsetLook.visualization === 'contiguous',
							conditions: SHOWN_FOR_PIECES,
						},
					},
				]),
		{
			field: 'fade',
			name: 'Fade In',
			type: 'boolean',
			meta: {
				width: 'half',
				interface: 'boolean',
				options: {
					label: 'Fade in the next piece',
				},
				note: 'The next piece or few take on their color gradually, as the value nears them.',
				hidden: !blind && unsetLook.visualization === 'contiguous',
				conditions: SHOWN_FOR_PIECES,
			},
			schema: {
				default_value: unsetLook.fade,
			},
		},
		{
			field: 'color',
			name: '$t:color',
			type: 'string',
			meta: {
				width: 'half',
				interface: 'select-color',
				note: 'The color of the bar. Primary color when empty.',
			},
			schema: {
				default_value: unsetOptions.color !== DEFAULT_COLOR ? unsetOptions.color : null,
			},
		},
		{
			field: 'thresholds',
			name: 'Thresholds',
			type: 'json',
			meta: {
				width: 'full',
				interface: 'list',
				note: 'From its value upward the bar has the color of a threshold. The highest threshold the value has reached counts.',
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
				default_value: unsetOptions.thresholds.length > 0 ? unsetOptions.thresholds : null,
			},
		},
		{
			...activeColoring,
			meta: {
				...activeColoring.meta,
				hidden: !blind && unsetOptions.thresholds.length === 0,
				conditions: blind ? COUNTED_THRESHOLDS : [...KNOWN_THRESHOLDS, ...COUNTED_THRESHOLDS],
			},
		},
		dropdown(
			'inactiveColoring',
			'Inactive Coloring',
			choicesOf(INACTIVE_COLORINGS, COLORING_NAMES),
			unsetLook.inactiveColoring,
			'Plain: the track. Automatic: as the fill, faded. Others: that coloring, faded.',
		),
	];

	if (!display) {
		// How the meter is edited, which only the interface is. The step shows what it comes to while it is empty:
		// the step a stock Slider left behind, or the one which suits the type and the limits of the field, where
		// the form knows them. The sensitivity is shown by the method which has one, and neither by `none`.
		const left = { stepInterval: (fallback as Record<string, unknown> | null)?.['stepInterval'] };
		const unsetEditing = readEditing(left, type, readOptions(own, fallback), scaleOf(type, schema));

		return [
			...fields,
			{
				field: 'input',
				name: 'Input Method',
				type: 'string',
				meta: {
					width: 'half',
					interface: 'select-dropdown',
					options: { choices: choicesOf(INPUTS, INPUT_NAMES) },
					note: 'Automatic: Piece where a piece is one step, else Position. None: not edited.',
				},
				schema: {
					default_value: DEFAULT_INPUT,
				},
			},
			{
				field: 'step',
				name: 'Step',
				type: unsetEditing.whole ? 'integer' : 'float',
				meta: {
					width: 'half',
					interface: 'input',
					options: {
						placeholder: known ? String(unsetEditing.step) : '$t:automatic',
						min: 0,
					},
					note: 'Counted from the minimum. Left empty: a step which suits the range.',
					conditions: [{ name: 'None', rule: { input: { _eq: 'none' } }, hidden: true }],
				},
			},
			{
				field: 'sensitivity',
				name: 'Sensitivity',
				type: 'float',
				meta: {
					width: 'half',
					interface: 'input',
					options: {
						placeholder: String(DEFAULT_SENSITIVITY),
						min: 0,
					},
					note: 'At 1, the width of the meter is the whole range. Shift: ten times finer.',
					hidden: true,
					conditions: [{ name: 'Relative', rule: { input: { _eq: 'relative' } }, hidden: false }],
				},
			},
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
					text: blind
						? 'An option which is not set here is taken from the interface of the field. This dialog cannot show what is set there: an empty input stands for it. ' +
							'An emptied color or list of thresholds means none.'
						: 'An option which is not set here is taken from the interface of the field, and shown as it is set there. ' +
							'An emptied option is taken from it again, except an emptied color or list of thresholds, which means none.',
				},
			},
		},
		...fields,
	];
}
