// The demo of the Steps interface and display: a collection of items which stand at different steps, a form with the
// tracks in groups by topic, and a table which shows the display. The sandbox builds it from this file; how a
// definition works is in sandbox/README.md, "Demos".
//
// Each item takes a value for each field by itself, from how far it has come (PLACES) and the steps the field draws.
// A field whose point is its value, such as one which holds no value, has the same value in every item (FIXED). To
// add a field: put it into a group, and into a table preset if the display has something to show for it.
import { collection, field, group, table } from '../../../sandbox/demo/define.mjs';

const code = (text) => `\`${text}\``;

/** A value as a step stores it. A number is bare and text which reads as one is quoted, since the two are stored apart. */
const stored = (value) => {
	if (value === undefined) return 'no value';
	return typeof value === 'string' && Number.isNaN(Number(value)) ? code(value) : code(JSON.stringify(value));
};

const entry = ({ value, icon, color }) => {
	const extra = [icon && `icon ${code(icon)}`, color && `colour ${code(color)}`].filter(Boolean);
	return extra.length > 0 ? `${stored(value)} (${extra.join(', ')})` : stored(value);
};

// The form shows the labels of the steps but not the values they store, which are what a project of one's own needs.
// So the note lists the values in order, with the icon or colour of each, instead of the count the machinery would
// write. Beyond eight only the first and the last are named, as the months would bury the sentence.
const choices = (list) => (list.length > 8 ? `${list.length} entries, ${entry(list[0])} to ${entry(list.at(-1))}` : list.map(entry).join(' → '));

/** A field on the Steps interface, with the Steps display, which reads the steps from the options of the interface. */
const track = (key, name, spec) => field(key, name, { interface: 'steps', display: 'steps', brief: { choices }, ...spec });

const STAGES = [
	{ text: 'Draft', value: 'draft' },
	{ text: 'In review', value: 'review' },
	{ text: 'Approved', value: 'approved' },
	{ text: 'Published', value: 'published' },
];

const DELIVERY = [
	{ text: 'Ordered', value: 'ordered', icon: 'shopping_cart' },
	{ text: 'Packed', value: 'packed', icon: 'inventory_2' },
	{ text: 'Sent', value: 'sent', icon: 'local_shipping' },
	{ text: 'Delivered', value: 'delivered', icon: 'home' },
];

// What the options form writes for an integer field: numbers.
const PHASES = [
	{ text: 'Backlog', value: 1 },
	{ text: 'Planned', value: 2 },
	{ text: 'Building', value: 3 },
	{ text: 'Testing', value: 4 },
	{ text: 'Shipped', value: 5 },
];

const PRIORITY = [
	{ text: 'Low', value: 'low' },
	{ text: 'Normal', value: 'normal' },
	{ text: 'High', value: 'high' },
	{ text: 'Urgent', value: 'urgent' },
];

const FEEDBACK = [
	{ text: 'Very poor', value: 'very_poor', icon: 'sentiment_very_dissatisfied' },
	{ text: 'Poor', value: 'poor', icon: 'sentiment_dissatisfied' },
	{ text: 'Fair', value: 'fair', icon: 'sentiment_neutral' },
	{ text: 'Good', value: 'good', icon: 'sentiment_satisfied' },
	{ text: 'Very good', value: 'very_good', icon: 'sentiment_very_satisfied' },
];

// The steps of a loaf, two of them without a text.
const BREAD = [{ text: 'Mix', value: 'mix' }, { value: 'rest' }, { text: 'Shape', value: 'shape' }, { value: 'proof' }, { text: 'Bake', value: 'bake' }];

const SIZES = [{ value: 'XS' }, { value: 'S' }, { value: 'M' }, { value: 'L' }, { value: 'XL' }];

const TRIP = [
	{ text: 'Booked', value: 'booked', icon: 'event' },
	{ text: 'Paid', value: 'paid' },
	{ text: 'Away', value: 'away', icon: 'flight_takeoff' },
	{ text: 'Back', value: 'back' },
];

// A reservation at a library, with one label too long for its two lines.
const HOLD = [
	{ text: 'Requested', value: 'requested' },
	{ text: 'Waiting for the copy which is out on loan to come back, and then for it to be sent to the branch the reader chose', value: 'waiting' },
	{ text: 'Ready to collect at the front desk', value: 'ready' },
	{ text: 'Collected', value: 'collected' },
];

const PAIR = [
	{ text: 'Pending', value: 'pending' },
	{ text: 'Confirmed', value: 'confirmed' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((text) => ({ text, value: text.toLowerCase() }));

// The choices of a stock Dropdown, which has colours.
const ORDERS = [
	{ text: 'Received', value: 'received', color: '#3399FF' },
	{ text: 'Baking', value: 'baking', color: '#FFA439' },
	{ text: 'Ready', value: 'ready', color: '#2ECDA7' },
	{ text: 'Collected', value: 'collected' },
];

// Text on an integer field, as a schema written by hand can hold it. "2.5" is no whole number and is left out.
const GRADES = [
	{ text: 'Low', value: '1' },
	{ text: 'Medium', value: '2' },
	{ text: 'Two and a half', value: '2.5' },
	{ text: 'High', value: '3' },
];

// Five entries, three steps: the second repeats a value, the third has none.
const MESSY = [
	{ text: 'Mix', value: 'mix' },
	{ text: 'Mix again', value: 'mix' },
	{ text: 'Knead' },
	{ text: 'Bake', value: 'bake' },
	{ text: 'Cool', value: 'cool' },
];

// A name the icon set does not have.
const ODD = [
	{ text: 'Checked', value: 'checked', icon: 'check' },
	{ text: 'Unknown icon', value: 'unknown', icon: 'no_such_icon' },
	{ text: 'Numbered', value: 'numbered' },
];

const RECIPES = [
	track('status', 'Workflow', {
		note: 'The usual set-up: a value and a label for each step. A new item starts at Draft, the default value of the field.',
		schema: { default_value: 'draft' },
		options: { choices: STAGES },
	}),
	track('delivery', 'Icons in the markers', {
		note: 'Each step has an icon in its marker in place of its number.',
		options: { choices: DELIVERY },
	}),
	track('phase', 'Whole numbers', {
		type: 'integer',
		note: 'An integer field: its steps hold numbers, and a click stores a number.',
		options: { choices: PHASES },
	}),
	track('priority', 'Compact, numbers', {
		note: 'Labels switched off: the markers alone, as high as a stock input. The name of a step shows as a tooltip, for the mouse and the keyboard.',
		width: 'half',
		options: { choices: PRIORITY, showLabels: false },
	}),
	track('feedback', 'Compact, icons', {
		note: 'Labels switched off, with an icon on each step.',
		width: 'half',
		options: { choices: FEEDBACK, showLabels: false },
	}),
];

const LABELS = [
	track('bread', 'Some steps without a text', {
		note: 'A step without a text has no label, is named by its value, and shows that name as a tooltip. One label anywhere keeps the row of labels.',
		options: { choices: BREAD },
	}),
	track('size', 'No text at all', {
		note: 'Without a single text the track is compact, as with the labels switched off, and each step is named by its value.',
		width: 'half',
		options: { choices: SIZES },
	}),
	track('trip', 'Icons on some steps', {
		note: 'A step without an icon shows its number.',
		width: 'half',
		options: { choices: TRIP },
	}),
	track('hold', 'Long labels', {
		note: 'A label has two lines in the column of its step. A longer one ends in an ellipsis and shows whole as a tooltip.',
		options: { choices: HOLD },
	}),
];

const COUNTS = [
	track('booking', 'Two steps', {
		note: 'Every step has a column of the same width, however few there are.',
		options: { choices: PAIR },
	}),
	track('month', 'Twelve steps in half the width', {
		note:
			'The track scrolls inside the box, and the current step is brought into view. ' +
			'Beyond eight steps the display shows the position and the count, such as "5/12", instead of pips.',
		width: 'half',
		options: { choices: MONTHS },
	}),
	track('month_compact', 'Twelve steps, compact', {
		note: 'Narrower columns without labels, and still a scroll.',
		width: 'half',
		options: { choices: MONTHS, showLabels: false },
	}),
];

const STATES = [
	track('locked', 'Read-only', {
		note: 'Dimmed, passed by the Tab key, and never changed.',
		width: 'half',
		readonly: true,
		options: { choices: STAGES },
	}),
	track('unset', 'No value', {
		note: 'Every item holds `null` here, so no step is current. The track never writes `null`: **Clear Value** in the menu of the label of the field does.',
		width: 'half',
		options: { choices: STAGES },
	}),
	track('stray', 'A value which is not a step', {
		note:
			'Every item holds `withdrawn` here. The track names it and the display shows it as it is. ' +
			'Once a step is chosen, `withdrawn` cannot be chosen again.',
		width: 'half',
		options: { choices: STAGES },
	}),
	track('bare', 'No steps', {
		note: 'A field without steps shows the notice of the stock Radio Buttons.',
		width: 'half',
		options: {},
	}),
];

const OTHERS = [
	field('dropdown', 'The stock Dropdown, with the display', {
		note:
			'A stock Dropdown with the Steps display, which reads the same choices. ' +
			'Change its interface to Steps in Data Model: the choices stay, and their colours are kept but not drawn.',
		interface: 'select-dropdown',
		display: 'steps',
		brief: { choices },
		options: { choices: ORDERS },
	}),
	track('grade', 'Numbers as text, on an integer field', {
		type: 'integer',
		note: 'The stored number 2 finds the step whose value is `"2"`, and a click stores a number. `"2.5"` is no whole number and is left out.',
		options: { choices: GRADES },
	}),
	track('messy', 'Entries which are left out', {
		note: 'Five entries, three steps: one which repeats a value and one without a value are left out, and the numbers count what is drawn.',
		options: { choices: MESSY },
	}),
	track('odd_icon', 'An icon which does not exist', {
		note: 'The second icon is a name Directus has no icon for. Its marker shows the first letter, and nothing spills out of it.',
		options: { choices: ODD },
	}),
];

const FIELDS = [...RECIPES, ...LABELS, ...COUNTS, ...STATES, ...OTHERS];

// The fields whose value is the same in every item.
const FIXED = { unset: null, stray: 'withdrawn', bare: null };

// How far each item has come, as a share of each field's steps. `stray` is a value which is none of the steps.
const PLACES = [
	['First step', 0],
	['Under way', 1 / 3],
	['Nearly there', 2 / 3],
	['Last step', 1],
	['Not a step', 'stray'],
	['No value', null],
];

/** The values of the steps a field draws: those with a value which no earlier step has, and on an integer field only whole numbers. */
function drawn({ type, meta }) {
	const seen = new Set();
	const values = [];
	for (const { value } of meta.options.choices ?? []) {
		if (value === undefined || value === null || value === '' || seen.has(String(value))) continue;
		if (type === 'integer' && !Number.isInteger(Number(value))) continue;
		seen.add(String(value));
		values.push(type === 'integer' ? Number(value) : String(value));
	}
	return values;
}

/** The value of a field in an item which has come `share` of the way. */
function valueAt(entry, share) {
	if (entry.field in FIXED) return FIXED[entry.field];
	if (share === null) return null;
	if (share === 'stray') return entry.type === 'integer' ? 99 : 'archived';
	const values = drawn(entry);
	return values[Math.round(share * (values.length - 1))];
}

const keys = (fields) => fields.map((entry) => entry.field);

// The notices at the top of the groups.
const RECIPES_TEXT = 'The set-ups most fields want. Each item stands at another step: open the next one to compare.';

const LABELS_TEXT =
	'The *name* of a step is its text, or its value when it has none. The *label* is the text under its marker. ' +
	'A step without a label shows its name as a tooltip.';

const OTHERS_TEXT =
	'Steps takes the options of the stock Dropdown, so a field can change between the two and keep its choices. ' +
	'The other three hold options which only a schema written by hand can, and show what Steps makes of them.';

export default collection('demo_steps', {
	name: 'Steps',
	icon: 'step',
	note: 'The Steps interface and display, in a form and in the table',
	template: '{{name}}',
	about:
		'**Steps** draws a field which holds one value out of an ordered list as a progress track: a marker for each step, the steps passed filled in, ' +
		'the current one ringed. A click on a step makes it the current one. The **Steps** display shows a pip for each step and the name of the ' +
		'current one in the table. The items differ only in how far they have come.',

	fields: [
		field('name', 'Item', { interface: 'input', describe: false, note: 'How far the fields of this item have come.' }),
		group('recipes', 'Recipes', { open: true, icon: 'menu_book', text: RECIPES_TEXT }, RECIPES),
		group('labels', 'Labels and icons', { icon: 'label', text: LABELS_TEXT }, LABELS),
		group('counts', 'Few and many steps', { icon: 'linear_scale' }, COUNTS),
		group('states', 'States', { icon: 'lock' }, STATES),
		group('others', 'From a Dropdown, and written by hand', { icon: 'tune', text: OTHERS_TEXT }, OTHERS),
	],

	items: PLACES.map(([name, share]) => ({ name, ...Object.fromEntries(FIELDS.map((entry) => [entry.field, valueAt(entry, share)])) })),

	presets: [
		table(['name', ...keys(RECIPES), 'month'], {
			widths: { name: 130, status: 150, delivery: 180, phase: 160, priority: 170, feedback: 160, month: 220 },
		}),
		table(['name', 'bread', 'size', 'hold', 'booking', 'stray', 'dropdown', 'grade', 'messy'], {
			bookmark: 'More cases',
			widths: { name: 130, bread: 160, size: 130, hold: 200, booking: 140, stray: 170, dropdown: 180, grade: 170, messy: 160 },
		}),
	],
});
