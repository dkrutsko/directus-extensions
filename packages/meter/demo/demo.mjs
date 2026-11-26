// The demo of the Meter interface and display: a collection of items whose values differ, a form with the meters in
// groups by topic, and a table which shows the display. The sandbox builds it from this file; how a definition works
// is in sandbox/README.md, "Demos". docs/behaviour.md has the rules which the notes below rely on.
//
// To add a group: write a list of fields like RECIPES, add it to METERS, put a `group` of it into `fields`, and give
// its columns a bookmark of the table in `presets`. The items take values for its fields by themselves.
import { collection, field, group, table } from '../../../sandbox/demo/define.mjs';

const AMBER = '#FFA439';
const GREEN = '#2ECDA7';
const RED = '#E35169';

/** Thresholds in a note, as the options form reads them: each color from its value on. */
const thresholds = (list) => list.map(({ value, color }) => `\`${color}\` from ${value}`).join(' and ');

/**
 * A numeric field (integer unless `type` says otherwise) on the Meter, with the Meter display, which takes the options
 * of the interface. Half as wide as the form, so that two meters can be compared side by side, and as wide as in the
 * pictures of the README, which count their pieces at that width.
 */
const meter = (key, name, spec) =>
	field(key, name, { type: 'integer', interface: 'meter', display: 'meter', width: 'half', brief: { thresholds }, ...spec });

// The six recipes of the README, as they are there.
const RECIPES = [
	meter('rating', 'Rating, five dots', {
		type: 'float',
		note: 'A rating of five dots, set by piece. A click on the fourth dot sets 4, on any numeric type.',
		options: { max: 5, visualization: 'dots', input: 'piece', indicatorFormat: 'fraction', color: AMBER },
	}),
	meter('progress', 'Percentage, red to green', {
		note: 'A percentage in red, amber and green. Red below 50, amber from 50, green from 80.',
		options: {
			color: RED,
			thresholds: [
				{ value: 50, color: AMBER },
				{ value: 80, color: GREEN },
			],
		},
	}),
	meter('tasks', 'Count as a fraction', {
		note: 'A count as a fraction, with a suffix.',
		options: { max: 12, indicatorFormat: 'fraction', suffix: ' tasks' },
	}),
	meter('budget', 'Budget, blended', {
		note:
			'A budget with a prefix, a blend and a faded track. ' +
			'The fill shifts from green towards amber at 7,000 and red at 9,000, and the rest of the track is a faded tint of it.',
		options: {
			max: 10000,
			indicatorFormat: 'value',
			prefix: '$',
			color: GREEN,
			thresholds: [
				{ value: 7000, color: AMBER },
				{ value: 9000, color: RED },
			],
			activeColoring: 'blend',
			inactiveColoring: 'automatic',
		},
	}),
	meter('level', 'Level, thin bars', {
		note:
			'A level meter of thin bars. ' +
			'As many bars as fit, green, amber from 70 and red from 90 by their place, with the bars which are not filled in the same colours, faded.',
		options: {
			visualization: 'bars',
			color: GREEN,
			thresholds: [
				{ value: 70, color: AMBER },
				{ value: 90, color: RED },
			],
			activeColoring: 'steps',
			inactiveColoring: 'automatic',
		},
	}),
	meter('reading', 'Reading only', {
		note: 'A reading on a field which can be edited. The meter takes no press and no key, and the field can still be changed with **Edit Raw Value**.',
		options: { input: 'none', label: 'Kept up to date by a flow' },
	}),
];

// The five looks. Each shape in pairs: as many as the range and the width give, and a number which is set. A name
// says "as many as fit" only where that is what the field draws at this width: twenty segments and all the bars do,
// ten pills where fourteen fit do not.
const VISUALIZATION = [
	meter('bar', 'One bar', {
		note: 'The default: one bar, filled exactly.',
		options: {},
		width: 'full',
	}),
	meter('pills', 'Pills, without a number', {
		note: 'A hundred are wanted for 0 to 100, and about 14 fit here, so it draws the largest number which fits and divides a hundred: 10.',
		options: { visualization: 'pills' },
	}),
	meter('pills_five', 'Pills, five', {
		note: 'Each pill is a fifth of the range.',
		options: { visualization: 'pills', subdivisions: 5 },
	}),
	meter('segments', 'Segments, as many as fit', {
		note: 'Segments read as one bar cut into pieces. Here twenty fit, and twenty divide a hundred.',
		options: { visualization: 'segments' },
	}),
	meter('segments_eight', 'Segments, eight', {
		note: 'Eight segments of 12.5 each.',
		options: { visualization: 'segments', subdivisions: 8 },
	}),
	meter('bars', 'Bars, as many as fit', {
		note: 'Thin square bars. Bars and dots keep their size, so as many as fit are drawn, whether or not they divide the range.',
		options: { visualization: 'bars' },
	}),
	meter('bars_twenty', 'Bars, twenty', {
		note: 'A set number of bars is drawn wider, in whole pixels, so the end of the track can stay empty.',
		options: { visualization: 'bars', subdivisions: 20 },
	}),
	meter('dots_packed', 'Dots, packed', {
		note: 'Eight dots from the start, a fixed distance apart.',
		options: { visualization: 'dots', subdivisions: 8 },
	}),
	meter('dots_spread', 'Dots, spread', {
		note: 'The same eight dots from edge to edge.',
		options: { visualization: 'dots', subdivisions: 8, dotsLayout: 'spread' },
	}),
];

// One scale for the colourings, so that the fields differ only in how it is shown.
const SCALE = {
	color: RED,
	thresholds: [
		{ value: 40, color: AMBER },
		{ value: 80, color: GREEN },
	],
};

const COLORING = [
	meter('color_value', 'Value, the default', {
		note: 'One color, that of the value: red below 40, amber from 40, green from 80. The rest of the track is plain.',
		options: SCALE,
	}),
	meter('color_blend', 'Blend', {
		note: 'One color, which shifts towards the next threshold as the value nears it.',
		options: { ...SCALE, activeColoring: 'blend' },
	}),
	meter('color_steps', 'Steps', {
		note: 'Each place has the color of its threshold, whatever the value: red, then amber from 40, then green from 80.',
		options: { ...SCALE, activeColoring: 'steps' },
	}),
	meter('color_gradient', 'Gradient', {
		note: 'The colors blend into each other along the whole track, and the fill shows its own part of that.',
		options: { ...SCALE, activeColoring: 'gradient' },
	}),
	meter('color_faded', 'Value, faded track', {
		note: 'What is not filled has the color of the value, faded.',
		options: { ...SCALE, inactiveColoring: 'automatic' },
	}),
	meter('color_gradient_faded', 'Gradient to the end', {
		note: 'The gradient goes on to the end of the track, faded.',
		options: { ...SCALE, activeColoring: 'gradient', inactiveColoring: 'automatic' },
	}),
	meter('color_steps_ahead', 'Value, steps ahead', {
		note: 'The fill has the color of the value, and the track ahead the faded steps still to come.',
		options: { ...SCALE, inactiveColoring: 'steps' },
	}),
	meter('color_bars', 'Thin bars, gradient ahead', {
		note: 'The filled bars have the color of the value, and the bars ahead show the gradient, faded.',
		options: { visualization: 'bars', ...SCALE, inactiveColoring: 'gradient' },
	}),
	meter('color_pills', 'Pills in steps', {
		note: 'Each pill has the color of the place it fills, and the pills which are not filled have it faded.',
		options: { visualization: 'pills', ...SCALE, activeColoring: 'steps', inactiveColoring: 'automatic' },
	}),
	meter('color_theme', 'Theme colors', {
		note: 'Colors of the theme, which change with the light and the dark theme.',
		options: {
			color: 'var(--theme--danger)',
			thresholds: [
				{ value: 40, color: 'var(--theme--warning)' },
				{ value: 80, color: 'var(--theme--success)' },
			],
		},
	}),
];

// Ten pills, the meter which the growing ones are compared with. With 62 the seventh pill is under way.
const TEN_PILLS = { visualization: 'pills', subdivisions: 10 };

const GROW = [
	meter('grow_none', 'Pills, no growth', {
		note: 'Every pill at its full size: the meter to compare the others with.',
		options: TEN_PILLS,
	}),
	meter('grow_one', 'Pills, grow 1', {
		note: 'The pills which are not filled are small, and the next one grows as the value nears it.',
		options: { ...TEN_PILLS, grow: 1 },
	}),
	meter('grow_ramp', 'Pills, a ramp of three', {
		note: 'Up to three pills grow at once, a ramp towards the value.',
		options: { ...TEN_PILLS, grow: 3 },
	}),
	meter('grow_bars', 'Thin bars, a long ramp', {
		note: 'Thin bars reach further: with 4 about ten of them grow at once.',
		options: { visualization: 'bars', grow: 4 },
	}),
	meter('fade_dots', 'Dots, fade in', {
		note:
			'The next dot takes on the color of a filled one as the value nears it. ' +
			'The display fades too, as the bookmark "Grow and fade" of the table shows.',
		options: { visualization: 'dots', subdivisions: 10, fade: true },
	}),
	meter('grow_fade', 'Segments, grow and fade', {
		note: 'Both: the next segment grows and takes on its color.',
		options: { visualization: 'segments', subdivisions: 10, grow: 1, fade: true },
	}),
];

// The columns of the bookmark of this group: the two which tell that growth does not reach the display, and the two
// which fade in.
const GROWN_AND_FADED = GROW.filter((entry) => ['grow_none', 'grow_one', 'fade_dots', 'grow_fade'].includes(entry.field));

const TEXT = [
	meter('text_caption', 'Caption', {
		note: 'The caption is at the start of the line under the bar, the value text at its end.',
		options: { label: 'Books returned on time' },
	}),
	meter('text_none', 'No value text', {
		note: 'Only the bar. Screen readers are still told the value.',
		options: { indicator: false },
	}),
	meter('text_suffix', 'Value with a suffix', {
		note: 'The suffix is joined on as typed, so it starts with its space.',
		options: { max: 500, indicatorFormat: 'value', suffix: ' GB' },
	}),
	meter('text_prefix', 'Value with a prefix', {
		options: { max: 2000, indicatorFormat: 'value', prefix: '€' },
	}),
	meter('text_fraction', 'Fraction, prefix and suffix', {
		note: 'A fraction has the prefix before both numbers and the suffix once, at the end.',
		options: { max: 2000, indicatorFormat: 'fraction', prefix: '€', suffix: ' a month' },
	}),
	meter('text_below_zero', 'Below zero', {
		note: 'A range from -20 to 40: the bar is empty at -20 and half full at 10.',
		options: { min: -20, max: 40, indicatorFormat: 'value', suffix: ' °C' },
	}),
	meter('text_caption_only', 'Caption, no value text', {
		options: { label: 'Seats taken', indicator: false },
	}),
	meter('text_display', 'Own format in the table', {
		note: 'The display has a format of its own: a percentage here, a fraction in the table. Its other options come from the interface.',
		options: { max: 12, label: 'Chapters read' },
		display_options: { indicatorFormat: 'fraction' },
	}),
	meter('text_long', 'A long caption', {
		note: 'A long caption wraps, and the field grows with it. The value text stays at the end of the first line.',
		options: { label: 'Members of the hiking club who have paid this year’s fee and signed up for at least one walk before the summer' },
	}),
];

// The meter which shows the five input methods, and a read-only field, side by side. A pill is ten steps here.
const EDITED = { visualization: 'pills', subdivisions: 10 };

const EDITING = [
	meter('input_automatic', 'Automatic', {
		note: 'The default. Each pill is ten steps here, so it works as Position; five dots from 0 to 5 would be set by piece.',
		options: EDITED,
	}),
	meter('input_position', 'Position', {
		note: 'A press sets the value under the pointer, and a drag follows it. The pills a press would fill are drawn larger.',
		options: { ...EDITED, input: 'position' },
	}),
	meter('input_piece', 'Piece', {
		note: 'A press fills the pills up to the one under the pointer: 10, 20, 30 and so on.',
		options: { ...EDITED, input: 'piece' },
	}),
	meter('input_relative', 'Relative', {
		note: 'A press changes nothing. A drag moves the value by as much as the pointer moves, one width for the whole range. Shift is ten times finer.',
		options: { ...EDITED, input: 'relative' },
	}),
	meter('input_none', 'None', {
		note: 'A reading: no press and no key. **Edit Raw Value** in the menu of the field’s label still changes it.',
		options: { ...EDITED, input: 'none' },
	}),
	meter('input_readonly', 'Read-only', {
		note: 'The same meter on a read-only field: a reading as with None, and not dimmed.',
		options: EDITED,
		readonly: true,
	}),
	meter('edit_share', 'A share from 0 to 1', {
		type: 'float',
		note: 'A Float field from 0 to 1 without a step: the step comes to 0.01.',
		options: { max: 1, indicatorFormat: 'value' },
	}),
	meter('edit_step', 'Steps of 5', {
		note: 'The pointer and the keys go 0, 5, 10 and so on. A value between two steps, as 62, goes to the next one with the first key.',
		options: { step: 5 },
	}),
	meter('edit_sensitivity', 'Relative, fine', {
		note: 'One width of the meter is a fifth of the range, for fine changes.',
		options: { max: 1000, indicatorFormat: 'value', input: 'relative', sensitivity: 0.2 },
	}),
	meter('edit_swapped', 'Limits swapped', {
		note: 'A minimum above the maximum is read as the two swapped: this meter goes from 0 to 100.',
		options: { min: 100, max: 0 },
	}),
];

// Every meter of the demo, so that each item has a value for each.
const METERS = [...RECIPES, ...VISUALIZATION, ...COLORING, ...GROW, ...TEXT, ...EDITING];

// How far each item has come, as a share of each meter's range. At 62% the next piece of 5, 10 or 20 is under way,
// so "Past half" shows growing and fading at rest; on a boundary of half a piece nothing is.
const LEVELS = [
	['Low', 0.15],
	['Past half', 0.62],
	['Nearly full', 0.9],
	['Full', 1],
	['Over the maximum', 1.25],
	['No value', null],
];

/** The value at a share of a meter's range: whole on an integer field, with up to two decimals on a float. */
function valueAt({ type, meta }, share) {
	if (share === null) return null;
	const { min: first = 0, max: second = 100 } = meta.options;
	// The meter reads swapped limits as the range between them.
	const [min, max] = [Math.min(first, second), Math.max(first, second)];
	const value = min + share * (max - min);
	return type === 'float' ? Math.round(value * 100) / 100 : Math.round(value);
}

const keys = (fields) => fields.map((entry) => entry.field);

/** The widths of the columns of a table: the name, one width for each field of a group, and the exceptions. */
const widthsOf = (fields, width, own = {}) => ({ name: 170, ...Object.fromEntries(keys(fields).map((key) => [key, width])), ...own });

// The notices at the top of the groups.
const ABOUT_VISUALIZATION =
	'Without **Subdivisions** a meter wants one piece for each unit of its range, as the rating of five dots does, and else draws as many as fit. ' +
	'A piece is filled or not; the text keeps the exact value.';
const ABOUT_COLORING = 'All but the last have the same colors, red, amber from 40 and green from 80, so that only the two colorings differ.';
const ABOUT_GROW =
	'Both show how far the value is on its way to the next piece. Open "Past half" to see it at rest, or drag a meter slowly. ' +
	'The pieces of the display never grow.';
const ABOUT_TEXT = 'A value text is shown whole or not at all. Prefix and suffix belong to the value and the fraction.';
const ABOUT_EDITING =
	'Every meter here but "None" and "Read-only" can be set with the pointer, or with the arrow keys, Page Up, Page Down, Home and End. ' +
	'Escape during a drag puts the value back. The first six are one meter with each input method, and read-only.';

export default collection('demo_meter', {
	name: 'Meter',
	icon: 'speed',
	note: 'The Meter interface and display, in a form and in the table',
	template: '{{name}}',
	about:
		'**Meter** draws a number in its range as a bar, or as a row of pills, segments, bars or dots. ' +
		'Where the field can be edited the meter is also the control. ' +
		'The **Meter** display draws it in the table. The items differ only in how far they have come: "Past half" shows the most.',

	fields: [
		field('name', 'Item', { interface: 'input', describe: false, note: 'How far the meters of this item have come.' }),
		group('recipes', 'Recipes', { open: true, icon: 'menu_book', text: 'The recipes of the README, as they are there.' }, RECIPES),
		group('visualization', 'Visualization', { icon: 'view_week', text: ABOUT_VISUALIZATION }, VISUALIZATION),
		group('coloring', 'Coloring', { icon: 'palette', text: ABOUT_COLORING }, COLORING),
		group('grow', 'Grow and fade', { icon: 'trending_up', text: ABOUT_GROW }, GROW),
		group('text', 'Text', { icon: 'title', text: ABOUT_TEXT }, TEXT),
		group('editing', 'Editing', { icon: 'touch_app', text: ABOUT_EDITING }, EDITING),
	],

	items: LEVELS.map(([name, share]) => ({ name, ...Object.fromEntries(METERS.map((entry) => [entry.field, valueAt(entry, share)])) })),

	// The display shows its text only where the column has room for all of it, so every column has a width.
	presets: [
		table(['name', ...keys(RECIPES), 'pills', 'color_gradient_faded', 'text_below_zero', 'text_display'], {
			widths: {
				...widthsOf(RECIPES, 160, { progress: 230, tasks: 210, budget: 190 }),
				pills: 190,
				color_gradient_faded: 200,
				text_below_zero: 160,
				text_display: 210,
			},
		}),
		table(['name', ...keys(VISUALIZATION)], { bookmark: 'Visualization', widths: widthsOf(VISUALIZATION, 160, { pills: 190, segments: 210, bars: 190 }) }),
		table(['name', ...keys(COLORING)], { bookmark: 'Coloring', widths: widthsOf(COLORING, 190) }),
		// The pills with and without growth are drawn alike here, since the pieces of a display never grow. The
		// two which fade in do so in the display as well.
		table(['name', ...keys(GROWN_AND_FADED)], { bookmark: 'Grow and fade', widths: widthsOf(GROWN_AND_FADED, 190) }),
		table(['name', ...keys(TEXT)], { bookmark: 'Text', widths: widthsOf(TEXT, 190, { text_fraction: 280, text_display: 210 }) }),
	],
});
