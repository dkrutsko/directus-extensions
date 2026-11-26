// What the browser tests of the Meter bundle share: the collections they work on and how each is made, and the
// helpers which read a meter in the page. The tests are in the `*.spec.ts` files beside this one, by topic; each
// makes the collections it needs before its tests and removes them afterwards, so each can be run alone
// (see ../../../sandbox/README.md for the sandbox they run in).
import { inflateSync } from 'node:zlib';
import { expect, openItem } from '../../../sandbox/support/fixtures.ts';
import type { Api } from '../../../sandbox/support/fixtures.ts';
import { ADMIN, BASE_URL } from '../../../sandbox/support/sandbox.ts';

export type Page = Parameters<typeof openItem>[0];

export type Locator = ReturnType<Page['locator']>;

export const COLLECTION = 'sandbox_meter';

// A collection which points at the first with a many-to-one, to show the display inside a template of related values.
export const OWNERS = 'sandbox_meter_owner';

// A collection with a field which fills its row. It is one of its own because such a field changes the columns of
// its whole form, and the first collection is measured as it is.
export const WIDE = 'sandbox_meter_wide';

// A collection of meters which can be edited, for the tests which set a value with the pointer and the keys and
// save the item.
export const EDIT = 'sandbox_meter_edit';

// A collection with a stock Repeater, three of whose fields are meters, and those fields as its options hold them.
export const REPEATER = 'sandbox_meter_repeater';

export const repeated = (name: string, type: string, meta: object) => ({ field: name, name, type, meta: { field: name, type, width: 'half', ...meta } });

export const REPEATED = [
	// As the dialog of a Repeater's field stores them: the key and the type once more among the rest.
	repeated('name', 'string', { interface: 'input' }),
	// With the display which that dialog stores when Meter is chosen in its group "Display".
	repeated('level', 'integer', {
		interface: 'meter',
		display: 'meter',
		options: { max: 5, visualization: 'pills', indicatorFormat: 'fraction', color: '#2ECDA7' },
	}),
	repeated('share', 'float', { interface: 'meter', options: { max: 1, step: 0.1, indicatorFormat: 'value' } }),
	repeated('big', 'bigInteger', { interface: 'meter', options: { max: 1000, step: 50, indicatorFormat: 'value' } }),
];

export const REPEATER_ROWS = [
	{ name: 'First', level: 3, share: 0.5, big: 500 },
	{ name: 'Second', level: 1, share: 0.2, big: 100 },
];

// A collection whose value texts have a prefix, a suffix or both, in the form and in a table.
export const UNITS = 'sandbox_meter_units';

export const UNIT_COLUMNS = ['title', 'cost', 'disk', 'budget', 'ratio', 'blank', 'own', 'speed', 'wordy', 'roomy'];

// A suffix of forty characters, the space it starts with among them.
export const LONG_SUFFIX = ' litres per hundred kilometres travelled';

/** A field on the Meter interface which can be edited: `field` without the read-only mark. */
export const live = (name: string, options: object | null = null, meta: object = {}, type = 'integer', schema: object = {}) =>
	field(name, options, { readonly: false, ...meta }, type, schema);

// The columns of the table of the collection whose meters can be edited.
export const GROWN = ['fade_pills', 'grow_dots', 'grow_segments', 'five'];

// A caption which takes several lines in half of the form.
export const WRAPPING =
	'A caption which is long enough to take several lines in half of the form, as a real one might ' +
	'when it says what the number means, where it comes from and who keeps it up to date';

export const RED = '#E35169';

export const AMBER = '#FFA439';

export const GREEN = '#2ECDA7';

// The colours as the browser reports them.
export const RGB = { [RED]: 'rgb(227, 81, 105)', [AMBER]: 'rgb(255, 164, 57)', [GREEN]: 'rgb(46, 205, 167)' };

export const THRESHOLDS = [
	{ value: 10, color: GREEN },
	{ value: 6, color: AMBER },
];

/**
 * A field on the Meter interface and display, half as wide as the form. It is
 * read-only, as a number which something else keeps up to date is: the meter
 * of such a field is a reading and nothing else. The fields which the tests of
 * editing work on are made by `live`.
 */
export const field = (name: string, options: object | null = null, meta: object = {}, type = 'integer', schema: object = {}) => ({
	field: name,
	type,
	schema,
	meta: { interface: 'meter', display: 'meter', width: 'half', readonly: true, options, ...meta },
});

// What the layout shows, in this order.
export const COLUMNS = ['title', 'plain', 'level', 'share', 'tasks', 'quiet', 'empty', 'over', 'under'];

// A second table, for the fields whose display has options of its own or whose options hold leftovers.
export const OTHERS = ['title', 'apart', 'muted', 'rated', 'cleared', 'emptied', 'slid', 'both', 'long'];

// The day every item is on in the calendar, and what the calendar writes on an entry.
export const DAY = '2026-03-12';

export const TITLE =
	'{{title}}: {{plain}} | {{level}} | {{share}} | {{tasks}} | {{quiet}} | {{apart}} | {{muted}} | {{rated}} | {{slid}} | {{both}} | {{empty}}';

// A colour and one threshold in the interface, for the fields whose display empties both.
export const TINTED = { color: GREEN, thresholds: [{ value: 20, color: RED }] };

// What a field holds whose interface was changed between the stock Slider and the stock Input or the Meter: both
// pairs of limits, since the app keeps the options.
export const LEFTOVERS = { min: 0, max: 10, minValue: 1, maxValue: 5 };

// The items, by their titles.
export const ids: Record<string, number> = {};

// The bookmarks which show the first collection as a calendar, as its second table (the fields whose display has
// options of its own), as its third (the fields whose track is cut into pieces) and as its fourth (those with a
// colouring of their own).
export const bookmarks = { calendar: 0, others: 0, looks: 0, paints: 0, words: 0 };

// The columns of a fifth table, for the two fields whose caption is not plain text.
export const WORDS = ['title', 'worded', 'marked'];

// A translation string of the project, and what it says in the language of the tests. The app translates a `$t:`
// key in the options of a field before an interface or a display is handed them (its store of fields does, when it
// loads them: app/src/stores/fields.ts:157-178 with app/src/utils/translate-object-values.ts:4-18 in Directus
// 11.17.4), so the meter never sees the key.
export const CAPTION_KEY = 'sandbox_meter_caption';
export const CAPTION = 'Hours booked';

// Markup in a caption, a prefix and a suffix. None of it may become elements of the page.
export const MARKUP = { label: '<b>bold</b> caption', prefix: '<i>', suffix: '</i>' };

// The columns of the third and the fourth table.
export const LOOKS = [
	'title',
	'pill_auto',
	'seg_auto',
	'bar_auto',
	'dot_auto',
	'pill_hundred',
	'seg_hundred',
	'bar_hundred',
	'dot_hundred',
	'pill_set',
	'dot_set',
];

export const PAINTS = ['title', 'pill_free', 'seg_free', 'bar_free', 'dot_free', 'dot_spread', 'look_own', 'look_back', 'paint_blend', 'paint_bar'];

// A colour and two thresholds, for the fields which are coloured by the place on the scale.
export const SCALE = {
	color: RED,
	thresholds: [
		{ value: 40, color: AMBER },
		{ value: 80, color: GREEN },
	],
};

/**
 * Removes every collection of these tests which exists, the one which points at another first, the users of their
 * own and their translation string. A spec calls it
 * before it makes its collections, so that it runs again on a database which an interrupted run left behind, and
 * after its tests.
 */
export async function removeAll(api: Api) {
	await api.drop(OWNERS, WIDE, EDIT, REPEATER, UNITS, COLLECTION);
	await removeUsers(api);

	for (const { id } of await api.get<{ id: string }[]>(`/translations?fields=id&limit=-1&filter[key][_starts_with]=sandbox_meter`)) {
		await api.delete(`/translations/${id}`);
	}
}

/** The first collection, with its tables and bookmarks and its three items, and the translation string of one caption. */
export async function seedMain(api: Api) {
	await api.post('/translations', { key: CAPTION_KEY, language: 'en-US', value: CAPTION });

	await api.post('/collections', {
		collection: COLLECTION,
		meta: { icon: 'speed', display_template: '{{title}}' },
		schema: {},
		fields: [
			{
				field: 'id',
				type: 'integer',
				schema: { is_primary_key: true, has_auto_increment: true },
				meta: { hidden: true },
			},
			// A stock input, a stock Toggle and a stock Slider beside the meters, to compare them with. The input and
			// the Toggle each have a meter beside them in their row of the form.
			{ field: 'title', type: 'string', schema: {}, meta: { interface: 'input', width: 'half' } },
			// Nothing configured at all, neither for the interface nor for the display.
			field('plain'),
			{ field: 'flag', type: 'boolean', schema: {}, meta: { interface: 'boolean', special: ['cast-boolean'], width: 'half' } },
			field('locked', null, { readonly: true }),
			// A stock input with a note, and beside it a meter with a caption and a note: the two notes have to be level.
			{ field: 'remark', type: 'string', schema: {}, meta: { interface: 'input', width: 'half', note: 'A note under an input.' } },
			field('noted', { label: 'Under the track' }, { note: 'A note under a meter.' }),
			// The limits are text, one with a fraction, as the options form of another interface can store them. This
			// field has a text and a caption, and the one beside it in the form has neither.
			field('share', { min: '0', max: '12.5', indicator: true, label: 'Litres per day', color: GREEN }, {}, 'decimal', {
				numeric_precision: 10,
				numeric_scale: 3,
			}),
			field('quiet', { indicator: false }),
			// The stock Slider with our display, which has no options of its own and reads the Slider's limits.
			{
				field: 'level',
				type: 'integer',
				schema: {},
				meta: { interface: 'slider', display: 'meter', width: 'half', options: { minValue: 1, maxValue: 5 } },
			},
			field('tasks', { min: 0, max: 12, indicatorFormat: 'fraction', color: RED, thresholds: THRESHOLDS }),
			field('empty', null, { note: 'A note which the form prints itself.' }),
			field('zero'),
			field('over'),
			field('under'),
			field('rating', { max: 10 }),
			field('score', { max: 1000 }, {}, 'float'),
			field('balance', { min: -50, max: 50 }),
			field('reverse', { min: 100, max: 0 }),
			field('fixed', { min: 5, max: 5 }),
			// What a field holds which was a stock Slider before: the app keeps the options when the interface changes.
			field('moved', { minValue: 1, maxValue: 5, stepInterval: 1, alwaysShowValue: true }),
			field('big', { max: '4000000000', indicatorFormat: 'value' }, {}, 'bigInteger'),
			field('preset', null, {}, 'integer', { default_value: 30 }),
			// While the value is below 20 a condition of the field replaces caption and colour.
			field(
				'ruled',
				{ label: 'On track', color: GREEN },
				{ conditions: [{ name: 'Behind', rule: { _and: [{ ruled: { _lt: 20 } }] }, options: { label: 'Behind', color: RED } }] },
			),
			// Its limits are typed into the options form by a test.
			field('fresh'),
			// The display has options of its own, each of which differs from the interface's: limits as text, a
			// caption, a colour and a format.
			field(
				'apart',
				{ min: 0, max: 100, label: 'Of the interface', color: GREEN },
				{ display_options: { min: '10', max: '60', label: 'Of the display', color: RED, indicatorFormat: 'fraction' } },
			),
			// Its own maximum as a number, the text switched off, another format and its own thresholds. It has no
			// colour of its own, which is the interface's.
			field(
				'muted',
				{ max: 10, color: RED, thresholds: [{ value: 2, color: GREEN }] },
				{ display_options: { max: 20, indicator: false, indicatorFormat: 'value', thresholds: [{ value: 8, color: AMBER }] } },
			),
			// Only the format is the display's; the range is the interface's.
			field('rated', { max: 50, indicatorFormat: 'value' }, { display_options: { indicatorFormat: 'percent' } }),
			// What the options form stores once the colour and the thresholds of the display were emptied.
			field('cleared', TINTED, { display_options: { color: null, thresholds: null } }),
			// A test empties them in the options form.
			field('emptied', TINTED),
			// Both pairs of limits, on a stock Slider and on the Meter. The Slider of Directus 11.17.4 draws such a
			// field from 0 to 10.
			{ field: 'slid', type: 'integer', schema: {}, meta: { interface: 'slider', display: 'meter', width: 'half', options: LEFTOVERS } },
			field('both', LEFTOVERS),
			// A text which does not fit half the form, nor a column.
			field('long', { max: '999999999999999', indicatorFormat: 'fraction' }, {}, 'bigInteger'),
			// A caption and no text. A caption which needs more than one line.
			field('named', { label: 'Only a caption', indicator: false }),
			field('wordy', { label: 'A caption which is long enough to need more than one line in a field which is half as wide as the form, and then some.' }),
			// The track cut into pieces. A field as wide as the form first, so that the pairs after it are each one
			// row of the form: a stock input with a note, and beside it a meter with a caption and a note.
			field('look_wide', { visualization: 'dots', label: 'Dots in a field as wide as the form' }, { width: 'full' }),
			{ field: 'beside_a', type: 'string', schema: {}, meta: { interface: 'input', width: 'half', note: 'A note under an input.' } },
			field('pill_set', { visualization: 'pills', subdivisions: 4, label: 'Four pills' }, { note: 'A note under pills.' }),
			{ field: 'beside_b', type: 'string', schema: {}, meta: { interface: 'input', width: 'half', note: 'A note under an input.' } },
			// The number of subdivisions as text, as the options form of another interface can store it.
			field('dot_set', { visualization: 'dots', subdivisions: '4', label: 'Four dots' }, { note: 'A note under dots.' }),
			// One piece for every unit of a range of five, in each of the four shapes.
			field('pill_auto', { visualization: 'pills', max: 5 }),
			field('seg_auto', { visualization: 'segments', max: 5 }),
			field('bar_auto', { visualization: 'bars', max: 5 }),
			field('dot_auto', { visualization: 'dots', max: 5 }),
			// A range of a hundred wants a hundred, which fit nowhere but as bars in a wide field.
			field('pill_hundred', { visualization: 'pills', color: RED, thresholds: [{ value: 40, color: AMBER }] }),
			field('seg_hundred', { visualization: 'segments' }),
			field('bar_hundred', { visualization: 'bars' }),
			field('dot_hundred', { visualization: 'dots' }),
			field('pill_none', { visualization: 'pills', max: 5 }),
			// A range which wants no number in particular: as many as fit.
			field('pill_free', { visualization: 'pills', max: 2.5, indicatorFormat: 'value' }, {}, 'float'),
			field('seg_free', { visualization: 'segments', max: 2.5, indicatorFormat: 'value' }, {}, 'float'),
			field('bar_free', { visualization: 'bars', max: 2.5, indicatorFormat: 'value' }, {}, 'float'),
			field('dot_free', { visualization: 'dots', max: 2.5, indicatorFormat: 'value' }, {}, 'float'),
			// Numbers which are set: twelve pills, which fit half the form, and thirty dots, which do not.
			field('pill_many', { visualization: 'pills', subdivisions: 12 }),
			field('dot_many', { visualization: 'dots', subdivisions: 30 }),
			// Dots from edge to edge.
			field('dot_spread', { visualization: 'dots', dotsLayout: 'spread', max: 5 }),
			// Pills in the form, and dots of its own in layouts.
			field('look_own', { visualization: 'pills', subdivisions: 5 }, { display_options: { visualization: 'dots', subdivisions: 8 } }),
			// A display whose options of the look were all emptied again, which is stored as null.
			field(
				'look_back',
				{ visualization: 'bars', subdivisions: 12, ...SCALE, activeColoring: 'steps', inactiveColoring: 'automatic' },
				{ display_options: { visualization: null, subdivisions: null, dotsLayout: null, activeColoring: null, inactiveColoring: null } },
			),
			// Coloured by the place on the scale: ten pills in steps, the same with what is not filled faded, ten
			// pills and one bar which blend, one bar in steps, and one bar in one colour over a faded track.
			field('paint_steps', { visualization: 'pills', subdivisions: 10, ...SCALE, activeColoring: 'steps' }),
			field('paint_auto', { visualization: 'pills', subdivisions: 10, ...SCALE, activeColoring: 'steps', inactiveColoring: 'automatic' }),
			field('paint_blend', { visualization: 'pills', subdivisions: 10, ...SCALE, activeColoring: 'gradient', inactiveColoring: 'automatic' }),
			field('paint_bar', { ...SCALE, activeColoring: 'gradient', inactiveColoring: 'automatic' }),
			field('paint_stepped', { ...SCALE, activeColoring: 'steps' }),
			field('paint_tint', { ...SCALE, inactiveColoring: 'value' }),
			// One colour which shifts towards the next threshold: ten pills with the rest faded, and one bar.
			field('paint_mix', { visualization: 'pills', subdivisions: 10, ...SCALE, activeColoring: 'blend', inactiveColoring: 'automatic' }),
			field('paint_mixbar', { ...SCALE, activeColoring: 'blend' }),
			// One colour for what is filled, over a track which is painted by the place on the scale: one bar in
			// the colour of the value before the faded steps, and ten pills which blend before the faded gradient.
			field('paint_ahead', { ...SCALE, inactiveColoring: 'steps' }),
			field('paint_ahead_pills', { visualization: 'pills', subdivisions: 10, ...SCALE, activeColoring: 'blend', inactiveColoring: 'gradient' }),
			// A caption which is a translation string of the project, as the options form stores one which was
			// picked from its list: the key, after `$t:`.
			field('worded', { label: `$t:${CAPTION_KEY}` }),
			// A caption, a prefix and a suffix with markup in them, which has to stay the text it is.
			field('marked', { label: MARKUP.label, prefix: MARKUP.prefix, suffix: MARKUP.suffix, indicatorFormat: 'value' }),
			// For the calendar layout, which draws the titles of its entries as plain text.
			{ field: 'day', type: 'date', schema: {}, meta: { interface: 'datetime', hidden: true } },
		],
	});

	// The columns of the table layout, for every user. The narrow column is narrower than a bar.
	await api.post('/presets', {
		collection: COLLECTION,
		layout: 'tabular',
		layout_query: { tabular: { fields: COLUMNS, sort: ['id'] } },
		layout_options: { tabular: { widths: { under: 60 } } },
	});

	// A bookmark has a layout of its own, so it does not take the place of the table above.
	bookmarks.others = (
		await api.post('/presets', {
			collection: COLLECTION,
			bookmark: 'Others',
			layout: 'tabular',
			layout_query: { tabular: { fields: OTHERS, sort: ['id'] } },
			layout_options: { tabular: { widths: { rated: 110, long: 150 } } },
		})
	).id;

	bookmarks.looks = (
		await api.post('/presets', {
			collection: COLLECTION,
			bookmark: 'Looks',
			layout: 'tabular',
			layout_query: { tabular: { fields: LOOKS, sort: ['id'] } },
		})
	).id;

	bookmarks.paints = (
		await api.post('/presets', {
			collection: COLLECTION,
			bookmark: 'Paints',
			layout: 'tabular',
			layout_query: { tabular: { fields: PAINTS, sort: ['id'] } },
		})
	).id;

	bookmarks.words = (
		await api.post('/presets', {
			collection: COLLECTION,
			bookmark: 'Words',
			layout: 'tabular',
			layout_query: { tabular: { fields: WORDS, sort: ['id'] } },
		})
	).id;

	bookmarks.calendar = (
		await api.post('/presets', {
			collection: COLLECTION,
			bookmark: 'Calendar',
			layout: 'calendar',
			layout_options: { calendar: { template: TITLE, startDateField: 'day', viewInfo: { type: 'dayGridMonth', startDateStr: DAY } } },
		})
	).id;

	const values = {
		day: DAY,
		flag: true,
		level: 3,
		plain: 50,
		locked: 50,
		share: 5,
		quiet: 25,
		tasks: 7,
		empty: null,
		zero: 0,
		over: 150,
		under: -20,
		rating: 5,
		score: 500,
		balance: 0,
		reverse: 30,
		fixed: 5,
		moved: 3,
		big: 3000000000,
		preset: 80,
		ruled: 15,
		fresh: 4,
		apart: 35,
		muted: 5,
		rated: 25,
		cleared: 40,
		emptied: 40,
		slid: 3,
		both: 3,
		long: 999999999999998,
		remark: 'A remark',
		noted: 58,
		named: 72,
		wordy: 66,
		look_wide: 62,
		beside_a: 'Beside pills',
		pill_set: 50,
		beside_b: 'Beside dots',
		dot_set: 50,
		pill_auto: 3,
		seg_auto: 3,
		bar_auto: 3,
		dot_auto: 3,
		pill_hundred: 44,
		seg_hundred: 62,
		bar_hundred: 62,
		dot_hundred: 98,
		pill_none: null,
		pill_free: 1.25,
		seg_free: 1.25,
		bar_free: 1.25,
		dot_free: 1.25,
		pill_many: 50,
		dot_many: 50,
		dot_spread: 3,
		look_own: 50,
		look_back: 50,
		paint_steps: 90,
		paint_auto: 50,
		worded: 50,
		marked: 50,
		paint_blend: 50,
		paint_bar: 50,
		paint_stepped: 90,
		paint_tint: 50,
		paint_mix: 60,
		paint_mixbar: 20,
		paint_ahead: 50,
		paint_ahead_pills: 60,
	};

	ids['First'] = (await api.post(`/items/${COLLECTION}`, { ...values, title: 'First' })).id;
	ids['Second'] = (
		await api.post(`/items/${COLLECTION}`, {
			...values,
			title: 'Second',
			plain: 5,
			tasks: 3,
			ruled: 60,
			muted: 9,
			pill_hundred: 45,
			dot_hundred: 2,
			pill_auto: 5,
		})
	).id;
	ids['Third'] = (await api.post(`/items/${COLLECTION}`, { ...values, title: 'Third', plain: 100, tasks: 11, ruled: 60 })).id;
}

/** The collection which points at the first, which has to be there. */
export async function seedOwners(api: Api) {
	await api.post('/collections', {
		collection: OWNERS,
		meta: { icon: 'person' },
		schema: {},
		fields: [
			{
				field: 'id',
				type: 'integer',
				schema: { is_primary_key: true, has_auto_increment: true },
				meta: { hidden: true },
			},
			{ field: 'name', type: 'string', schema: {}, meta: { interface: 'input', width: 'half' } },
			{
				field: 'meter',
				type: 'integer',
				schema: {},
				meta: {
					interface: 'select-dropdown-m2o',
					special: ['m2o'],
					width: 'half',
					options: { template: '{{title}}' },
					display: 'related-values',
					display_options: { template: '{{title}} {{plain}} {{tasks}} after' },
				},
			},
		],
	});

	await api.post('/relations', { collection: OWNERS, field: 'meter', related_collection: COLLECTION });

	await api.post('/presets', {
		collection: OWNERS,
		layout: 'tabular',
		layout_query: { tabular: { fields: ['name', 'meter'], sort: ['id'] } },
		layout_options: { tabular: { widths: { meter: 420 } } },
	});

	await api.post(`/items/${OWNERS}`, { name: 'Owner', meter: ids['First'] });
}

/** The collection with a field which fills its row. */
export async function seedWide(api: Api) {
	// Bars, as many as fit: in half of the form, and in a field which takes what is left of its row, here all of it.
	await api.post('/collections', {
		collection: WIDE,
		meta: { icon: 'speed' },
		schema: {},
		fields: [
			{ field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
			field('bar_half', { visualization: 'bars', max: 2.5, indicatorFormat: 'value' }, {}, 'float'),
			field('bar_fill', { visualization: 'bars', max: 2.5, indicatorFormat: 'value' }, { width: 'fill' }, 'float'),
		],
	});

	ids['Wide'] = (await api.post(`/items/${WIDE}`, { bar_half: 1.25, bar_fill: 1.25 })).id;
}

/** The collection whose meters can be edited, with its one item and its table. */
export async function seedEdit(api: Api) {
	await api.post('/collections', {
		collection: EDIT,
		meta: { icon: 'speed' },
		schema: {},
		fields: [
			{ field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
			// One bar on each numeric type: whole steps, tenths, quarters, and fifties on a big integer.
			live('whole'),
			live('tenth', { max: 1, step: 0.1, indicatorFormat: 'value' }, {}, 'float'),
			live('quarter', { max: 10, step: 0.25, indicatorFormat: 'value' }, {}, 'decimal', { numeric_precision: 10, numeric_scale: 2 }),
			live('large', { max: 1000, step: 50, indicatorFormat: 'value' }, {}, 'bigInteger'),
			// A step which is not whole on a whole type is rounded: 2. Steps of 3 miss the maximum of 10.
			live('rounded', { max: 10, step: 2.4, indicatorFormat: 'value' }),
			live('thirds', { max: 10, step: 3, indicatorFormat: 'value' }),
			// The step a stock Slider left behind.
			live('fives', { stepInterval: 5 }),
			// Pieces which are one step each, as pills and as packed dots; pieces which are ten steps each; and
			// the same with the pieces filled by the pointer all the same.
			live('five', { visualization: 'pills', max: 5, indicatorFormat: 'fraction' }),
			live('dots', { visualization: 'dots', max: 5, indicatorFormat: 'fraction' }),
			live('hundred', { visualization: 'pills' }),
			live('forced', { visualization: 'pills', input: 'piece' }),
			// By how far the pointer moves, at a sensitivity of 1 and of 2.
			live('rel', { input: 'relative' }),
			live('rel_fast', { input: 'relative', sensitivity: 2 }),
			// Without a value, and with one beyond the range.
			live('none'),
			live('outside'),
			// Read-only while a rule on the item matches: once `whole` is 50 or more.
			live('gated', null, { conditions: [{ name: 'Closed', rule: { _and: [{ whole: { _gte: 50 } }] }, readonly: true }] }),
			// The same meter twice in one row of the form, one which can be edited and one which cannot.
			live('twin_live', { label: 'A caption', color: GREEN }, { note: 'A note under a meter.' }),
			field('twin_locked', { label: 'A caption', color: GREEN }, { note: 'A note under a meter.' }),
			// A range which does not start at 0: steps of 2 from 1 are 1, 3, 5, 7 and 9, and 10 is the maximum.
			live('offset', { min: 1, max: 10, step: 2, indicatorFormat: 'value' }),
			// Read-only by its own value: a drag across 50 closes it while the button is held.
			live('closing', null, { conditions: [{ name: 'Closed', rule: { _and: [{ closing: { _gte: 50 } }] }, readonly: true }] }),
			// Whole numbers in a range whose limits are not whole: 1 to 5 can be written of 0.5 to 5.5, and 0 to 10
			// of 0 to 10.5. Five pills by the method chosen for them, and five filled by the piece all the same.
			live('between', { min: 0.5, max: 5.5, visualization: 'pills', indicatorFormat: 'value' }),
			live('between_piece', { min: 0.5, max: 5.5, visualization: 'pills', input: 'piece', indicatorFormat: 'value' }),
			live('beyond', { max: 10.5, indicatorFormat: 'value' }),
			// Coloured by the place on the scale, and edited: one bar in steps and one which blends along the
			// track, ten pills in steps and bars which blend.
			live('flow_steps', { ...SCALE, activeColoring: 'steps' }),
			live('flow_gradient', { ...SCALE, activeColoring: 'gradient' }),
			live('flow_pills', { ...SCALE, visualization: 'pills', activeColoring: 'steps' }),
			live('flow_bars', { ...SCALE, visualization: 'bars', activeColoring: 'gradient' }),
			// Hidden by its own value: a relative drag across 50 takes the field out of the form while the button is held.
			live('vanishing', { input: 'relative' }, { conditions: [{ name: 'Gone', rule: { _and: [{ vanishing: { _gte: 50 } }] }, hidden: true }] }),
			// The same meters in pieces twice, one which can be edited and one which cannot: pills and dots.
			live('pills_live', { visualization: 'pills', max: 5, label: 'A caption' }, { note: 'A note under a meter.' }),
			field('pills_locked', { visualization: 'pills', max: 5, label: 'A caption' }, { note: 'A note under a meter.' }),
			live('dots_live', { visualization: 'dots', max: 5, label: 'A caption' }, { note: 'A note under a meter.' }),
			field('dots_locked', { visualization: 'dots', max: 5, label: 'A caption' }, { note: 'A note under a meter.' }),
			// Filled by the piece, as segments and as thin bars: five segments for five steps, forty bars for forty.
			live('ring_segments', { visualization: 'segments', max: 5 }),
			live('ring_bars', { visualization: 'bars', max: 40 }),
			// A fine grid of many steps: ten million in tenths, a hundred million points.
			live('fine', { max: 10000000, step: 0.1, indicatorFormat: 'value' }, {}, 'float'),
			// A caption of several lines: the group is higher than the area would be, and the track is at its top edge.
			live('wrapped', { label: WRAPPING }),
			// Neither caption nor text: the track alone, in the middle of the area.
			live('bare', { indicator: false }),
			// Five pieces for a range of five in tenths, so that a value can stand between two pieces: dots which
			// grow, segments which grow and fade in and are filled by the piece, and pills which only fade in.
			live('grow_dots', { visualization: 'dots', max: 5, step: 0.1, grow: 1, indicatorFormat: 'value' }, {}, 'float'),
			live(
				'grow_segments',
				{ visualization: 'segments', max: 5, step: 0.1, grow: 1, fade: true, input: 'piece', color: GREEN, indicatorFormat: 'value' },
				{},
				'float',
			),
			live('fade_pills', { visualization: 'pills', max: 5, step: 0.1, fade: true, color: GREEN, indicatorFormat: 'value' }, {}, 'float'),
			// Thin bars for a hundred whole numbers, fifty of them in half of the form, which grow and fade in.
			live('grow_bars', { visualization: 'bars', subdivisions: 50, grow: 1, fade: true, color: GREEN }),
			// Coarse steps: five segments of twenty for a hundred in steps of ten, by the place under the pointer
			// and by how far it moves. A tenth of the track is one step, 34px in half of the form.
			live('grow_coarse', { visualization: 'segments', subdivisions: 5, step: 10, grow: 1, fade: true, color: GREEN }),
			live('grow_rel', { visualization: 'segments', subdivisions: 5, step: 10, grow: 1, input: 'relative' }),
			// Grow as a number: eight dots of which up to three can be growing at once.
			live('grow_three', { visualization: 'dots', max: 8, step: 0.1, grow: 3, indicatorFormat: 'value' }, {}, 'float'),
			// A type which holds fractions, a range of 1 and no step: it is set in hundredths.
			live('unit', { max: 1, indicatorFormat: 'value' }, {}, 'float'),
			// A long ramp on thin bars: fifty bars for a hundred, up to four growing by the pieces and more by the pixels.
			live('grow_four', { visualization: 'bars', subdivisions: 50, grow: 4 }),
			// Forty bars for forty which grow and are filled by the piece: what is not filled is small, and the
			// pieces up to the pointer are large.
			live('near_bars', { visualization: 'bars', max: 40, grow: 2 }),
			// Packed dots for a hundred, as many as fit, filled by the piece.
			live('near_dots', { visualization: 'dots', input: 'piece' }),
			// The same spread from edge to edge: as many dots as packed, in other places.
			live('near_spread', { visualization: 'dots', dotsLayout: 'spread', input: 'piece' }),
			// The input method "None": a reading in a field which can be edited. One bar and five pills, each
			// beside the same meter, without the word, in a read-only field.
			live('off', { label: 'A caption', color: GREEN, input: 'none' }, { note: 'A note under a meter.' }),
			field('off_locked', { label: 'A caption', color: GREEN }, { note: 'A note under a meter.' }),
			live('off_pills', { visualization: 'pills', max: 5, input: 'none' }),
			field('off_pills_locked', { visualization: 'pills', max: 5 }),
			// Five pills for 0 to 5 on a type which holds fractions: without a step a pill is a hundred steps, and
			// with a step of 1 it is one.
			live('stars', { visualization: 'pills', max: 5, indicatorFormat: 'value' }, {}, 'float'),
			live('stars_whole', { visualization: 'pills', max: 5, step: 1, indicatorFormat: 'value' }, {}, 'float'),
			// One bar which a condition of its own value turns into pills from 5, and back: a meter which is cut
			// into pieces is measured, one bar is not.
			live('turning', { max: 10 }, { conditions: [{ name: 'Pieces', rule: { _and: [{ turning: { _gte: 5 } }] }, options: { visualization: 'pills' } }] }),
			// Pills which a condition of their own value takes out of the form from 5.
			live('leaving', { visualization: 'pills', max: 10 }, { conditions: [{ name: 'Gone', rule: { _and: [{ leaving: { _gte: 5 } }] }, hidden: true }] }),
			// A range of 1 and no step, for the test of a decimal column with one decimal place. The database of the
			// sandbox, SQLite, has no such column: it makes a float of a `decimal` field and reports no scale. So
			// this is a float, and the test tells the app what another database would report (`asDecimal`).
			live('tenths', { max: 1, indicatorFormat: 'value' }, {}, 'float'),
			// Five pills for five steps, which "Automatic" would fill by the piece, set by the place of the pointer
			// because the option says so: a press before the middle of a pill leaves it empty.
			live('placed', { visualization: 'pills', max: 5, input: 'position', indicatorFormat: 'fraction' }),
		],
	});

	ids['Edit'] = (await api.post(`/items/${EDIT}`, EDIT_VALUES)).id;

	// The columns of its table: the three, and five plain pills beside them.
	await api.post('/presets', { collection: EDIT, layout: 'tabular', layout_query: { tabular: { fields: [...GROWN, 'grow_bars'], sort: ['id'] } } });
}

/** The collection with a stock Repeater. */
export async function seedRepeater(api: Api) {
	await api.post('/collections', {
		collection: REPEATER,
		meta: { icon: 'speed' },
		schema: {},
		fields: [
			{ field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
			{
				field: 'rows',
				type: 'json',
				schema: {},
				meta: {
					interface: 'list',
					special: ['cast-json'],
					width: 'full',
					options: { template: '{{ name }}: {{ level }} / {{ share }}', fields: REPEATED },
				},
			},
		],
	});

	ids['Repeater'] = (await api.post(`/items/${REPEATER}`, { rows: REPEATER_ROWS })).id;
}

/** The collection whose value texts have a prefix or a suffix. */
export async function seedUnits(api: Api) {
	await api.post('/collections', {
		collection: UNITS,
		meta: { icon: 'speed' },
		schema: {},
		fields: [
			{ field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
			{ field: 'title', type: 'string', schema: {}, meta: { interface: 'input', width: 'half' } },
			// The value with a prefix, the fraction with a suffix, and the fraction with a prefix and a caption.
			field('cost', { max: 10000, indicatorFormat: 'value', prefix: '$' }),
			field('disk', { max: 100, indicatorFormat: 'fraction', suffix: ' GB' }),
			field('budget', { max: 10000, indicatorFormat: 'fraction', prefix: '$', label: 'Spent' }),
			// The percentage has neither, and so has a field without a value.
			field('ratio', { prefix: '$', suffix: ' GB' }),
			field('blank', { indicatorFormat: 'value', prefix: '$', suffix: ' GB' }),
			// A suffix of the display's own: the prefix and the format are still the interface's.
			field('own', { indicatorFormat: 'value', prefix: '$', suffix: ' GB' }, { display_options: { suffix: ' MB' } }),
			// A stock Slider with our display, which has the format and the suffix itself.
			{
				field: 'speed',
				type: 'integer',
				schema: {},
				meta: { interface: 'slider', display: 'meter', width: 'half', display_options: { indicatorFormat: 'value', suffix: ' km/h' } },
			},
			// A long suffix: alone on its line in half of the form and in a narrow column, and beside a caption
			// and in a wide column.
			field('wordy', { indicatorFormat: 'value', suffix: LONG_SUFFIX }),
			field('roomy', { indicatorFormat: 'value', suffix: LONG_SUFFIX, label: 'Fuel' }),
			// One which can be edited, to hear what a slider says.
			live('paid', { max: 10000, step: 100, indicatorFormat: 'value', prefix: '$' }),
		],
	});

	await api.post('/presets', {
		collection: UNITS,
		layout: 'tabular',
		layout_query: { tabular: { fields: UNIT_COLUMNS, sort: ['id'] } },
		// Room for each text beside its bar, but for the long one in `wordy`.
		layout_options: { tabular: { widths: { cost: 200, disk: 220, budget: 260, ratio: 160, blank: 120, own: 200, speed: 200, wordy: 150, roomy: 460 } } },
	});

	ids['Units'] = (
		await api.post(`/items/${UNITS}`, {
			title: 'Only',
			cost: 4200,
			disk: 42,
			budget: 4200,
			ratio: 42,
			blank: null,
			own: 42,
			speed: 42,
			wordy: 42,
			roomy: 42,
			paid: 4200,
		})
	).id;
}

export const fieldOf = (page: Page, name: string) => page.locator(`main .v-form .field[data-field="${name}"]`);

export const meter = (page: Page, name: string) => fieldOf(page, name).locator('.meter');

export const track = (page: Page, name: string) => meter(page, name).locator('.mt-track');

export const fill = (page: Page, name: string) => meter(page, name).locator('.mt-fill');

export const text = (page: Page, name: string) => meter(page, name).locator('.mt-text');

// The form marks the label of a field which holds an unsaved change.
export const edited = (page: Page) => page.locator('main .v-form .field-label.edited');

/**
 * Mirrors the page, or turns it back. The direction is set on `body`, not on
 * the root element where the app keeps the user's: the app writes that one
 * again with every update of the document head, so a direction a test puts
 * there can be gone a moment later.
 */
export const turn = (page: Page, direction: 'ltr' | 'rtl') => page.evaluate((dir) => (document.body.dir = dir), direction);

/** A colour of the theme as the browser computes it. */
export const token = (page: Page, name: string) =>
	page.evaluate((variable) => {
		const probe = document.body.appendChild(document.createElement('span'));
		probe.style.color = `var(${variable})`;
		const color = getComputedStyle(probe).color;
		probe.remove();
		return color;
	}, name);

export const edges = async (locator: Locator) => {
	const area = (await locator.boundingBox())!;
	return { left: area.x, right: area.x + area.width, top: area.y, bottom: area.y + area.height, width: area.width, middle: area.y + area.height / 2 };
};

/**
 * Checks how much of a track is filled: the fill is that share of the track
 * wide, within a pixel, and starts where the track starts. A share of 0 is a
 * track without a fill at all. The smallest fill is as wide as the track is
 * high, a dot, so that a value just above the minimum can be seen.
 */
export async function expectFilled(bar: Locator, part: Locator, share: number) {
	if (share === 0) {
		await expect(part).toHaveCount(0);
		return;
	}

	await expect(part).toHaveCount(1);

	// The fill is the one child of its track. Both are measured in one go: a page which is still scrolling, as after
	// a key press which scrolls it, has moved between two questions.
	const { outer, inner } = await bar.evaluate((element) => {
		const area = (box: DOMRect) => ({ left: box.left, width: box.width, height: box.height, middle: box.top + box.height / 2 });
		return { outer: area(element.getBoundingClientRect()), inner: area(element.firstElementChild!.getBoundingClientRect()) };
	});

	const width = Math.max(outer.width * share, outer.height);

	expect(Math.abs(inner.width - width), `a fill of ${share} of the track`).toBeLessThan(1);
	expect(Math.abs(inner.left - outer.left), 'the fill starts where the track starts').toBeLessThan(0.5);
	expect(Math.abs(inner.middle - outer.middle), 'the fill is in the track').toBeLessThan(0.5);
}

/**
 * How much of each element a user sees, the elements of a locator in the order of the page: its box cut by every
 * ancestor which hides its overflow, up to the cell or the field. `whole`, `part`, or `none` for one which is cut
 * away entirely. One question to the page, however many elements there are.
 */
export const shownAll = (locator: Locator) =>
	locator.evaluateAll((elements) =>
		elements.map((element) => {
			const own = element.getBoundingClientRect();
			const seen = { left: own.left, right: own.right, top: own.top, bottom: own.bottom };

			for (let around = element.parentElement; around; around = around.parentElement) {
				const style = getComputedStyle(around);

				if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
					const area = around.getBoundingClientRect();
					seen.left = Math.max(seen.left, area.left);
					seen.right = Math.min(seen.right, area.right);
					seen.top = Math.max(seen.top, area.top);
					seen.bottom = Math.min(seen.bottom, area.bottom);
				}

				if (around.matches('td, .interface')) break;
			}

			const width = seen.right - seen.left;
			const height = seen.bottom - seen.top;

			if (width <= 0.5 || height <= 0.5) return 'none';
			return width >= own.width - 0.5 && height >= own.height - 0.5 ? 'whole' : 'part';
		}),
	);

/** The same for the one element of a locator, which has to be in the page. */
export async function shown(locator: Locator) {
	await locator.waitFor({ state: 'attached' });

	const [state, ...more] = await shownAll(locator);
	if (state === undefined || more.length) throw new Error(`shown() is for one element, and the locator has ${1 + more.length}`);

	return state;
}

export async function squeezed(page: Page, selector: string, numbers: Locator, widths: (number | null)[]) {
	const style = await page.addStyleTag({ content: `${selector} {}` });
	const states: { width: number | null; whole: number; part: number }[] = [];

	for (const width of widths) {
		await style.evaluate((sheet, rule) => (sheet.textContent = rule), width === null ? '' : `${selector} { max-inline-size: ${width}px !important; }`);

		const each = await shownAll(numbers);
		states.push({ width, whole: each.filter((state) => state === 'whole').length, part: each.filter((state) => state === 'part').length });
	}

	return states;
}

/** Every width from one to another, in steps. */
export const steps = (from: number, to: number, step: number) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, index) => from + index * step);

/** The cells of one row of a table layout, by the title of the item and the key of the field. */
export const table = (page: Page, columns: string[]) => {
	const row = (title: string) => page.locator('table tbody tr.table-row').filter({ has: page.getByText(title, { exact: true }) });
	const cell = (title: string, name: string) => row(title).locator('td.cell:not(.select)').nth(columns.indexOf(name));
	const display = (title: string, name: string) => cell(title, name).locator('.meter-display');

	return {
		cell,
		display,
		bar: (title: string, name: string) => display(title, name).locator('.md-track'),
		part: (title: string, name: string) => display(title, name).locator('.md-fill'),
		label: (title: string, name: string) => display(title, name).locator('.md-text'),
		number: (title: string, name: string) => display(title, name).locator('.md-text > span'),
	};
};

/**
 * Waits for the tooltip of the app over an element. The app shows a tooltip
 * half a second after the mouse arrives, and drops one which is still waiting
 * whenever a component with a tooltip is drawn again
 * (app/src/directives/tooltip.ts:29-50 in Directus 11.17.4), as happens
 * while a page settles: so the mouse comes back until it shows.
 */
export async function expectTooltip(page: Page, target: Locator, expected: string) {
	await expect(async () => {
		await page.mouse.move(0, 0);
		await target.hover();
		await expect(page.locator('#tooltip.visible')).toHaveText(expected, { timeout: 2000 });
	}).toPass();
}

/** The attributes of an element which Vue did not put there for its scoped styles. */
export const attributes = (locator: Locator) => locator.evaluate((element) => element.getAttributeNames().filter((name) => !name.startsWith('data-v-')));

/**
 * The pieces of a track which is cut up, in the order of the document, measured in one go. For each: where its box
 * is as it is drawn, transforms included (`left`, `right`, `top`, `width`, `height`); whether it is filled; its
 * colour, its four corners (top left, top right, bottom right, bottom left) and its border; its box as it is laid
 * out, which a transform does not change (`laid`); the transform of its inline style; its classes, inline style and
 * number of children as one text (`markup`); and what is laid over it, if anything (`over`): the colour and the
 * opacity of that child, and whether it covers the piece exactly.
 */
export const readPieces = (row: Locator) =>
	row.evaluate((element) =>
		Array.from(element.children).map((each) => {
			const piece = each as HTMLElement;
			const area = piece.getBoundingClientRect();
			const style = getComputedStyle(piece);
			const child = piece.firstElementChild;
			const inside = child?.getBoundingClientRect();
			const laidOver = child ? getComputedStyle(child) : null;

			return {
				filled: piece.classList.contains('mt-on') || piece.classList.contains('md-on'),
				left: area.left,
				right: area.right,
				top: area.top,
				width: area.width,
				height: area.height,
				color: style.backgroundColor,
				corners: [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius],
				border: style.borderTopStyle,
				laid: { left: piece.offsetLeft, width: piece.offsetWidth, height: piece.offsetHeight },
				transform: piece.style.transform,
				markup: `${piece.className}|${piece.getAttribute('style') ?? ''}|${piece.children.length}`,
				children: piece.children.length,
				over:
					laidOver && inside
						? {
								color: laidOver.backgroundColor,
								opacity: Number(laidOver.opacity),
								covers:
									Math.abs(inside.left - area.left) < 0.1 &&
									Math.abs(inside.right - area.right) < 0.1 &&
									Math.abs(inside.top - area.top) < 0.1 &&
									Math.abs(inside.bottom - area.bottom) < 0.1,
							}
						: null,
			};
		}),
	);

export const strip = (page: Page, name: string) => meter(page, name).locator('.mt-strip');

/** How many pieces there are, and how many of them are filled, which have to be the first ones. */
export async function expectFilledPieces(row: Locator, count: number, filled: number) {
	await expect(row.locator('> *')).toHaveCount(count);
	expect((await readPieces(row)).map((piece) => piece.filled)).toEqual(Array.from({ length: count }, (_, index) => index < filled));
}

// The rule by which the pieces are counted, written out again here: how narrow a piece of each shape may get and
// how far it is from the next, in the form and in the display; how many of those fit a width; and how many are
// drawn when a number is wanted, or none is. Bars and dots take no number which divides the wanted one: what
// is wanted where it fits, else as many as fit, for dots in either layout.
export const SIZES = {
	form: { pills: [20, 4], segments: [14, 3], bars: [4, 2], dots: [12, 4] },
	display: { pills: [8, 2], segments: [6, 2], bars: [2, 1], dots: [6, 2] },
} as const;

export type Shape = keyof (typeof SIZES)['form'];

export const fits = (width: number, [piece, gap]: readonly [number, number]) => Math.floor((width + gap) / (piece + gap));

export const drawn = (wanted: number | null, fit: number, divide = true) => {
	if (fit < 2) return 0;
	if (wanted === null) return fit;
	if (wanted <= fit) return wanted;
	if (!divide) return fit;

	for (let count = fit; count >= 2; count--) if (wanted % count === 0) return count;
	return fit;
};

/** Makes the interface of a field of the form no wider than a number of pixels, or lets it go again. */
export const squeeze = (page: Page, name: string, width: number | null) =>
	fieldOf(page, name)
		.locator('.interface')
		.evaluate((element, limit) => {
			if (limit === null) (element as HTMLElement).style.removeProperty('max-inline-size');
			else (element as HTMLElement).style.setProperty('max-inline-size', `${limit}px`, 'important');
		}, width);

/**
 * The colour of one pixel of the page, from a screenshot of that pixel alone.
 * A picture of one pixel holds its red, green and blue after one byte which
 * says how the line is filtered, and no filter changes the first pixel of a
 * picture.
 */
export async function pixel(page: Page, x: number, y: number) {
	const picture = await page.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width: 1, height: 1 } });
	const data: Buffer[] = [];

	for (let offset = 8; offset < picture.length; ) {
		const length = picture.readUInt32BE(offset);
		if (picture.toString('latin1', offset + 4, offset + 8) === 'IDAT') data.push(picture.subarray(offset + 8, offset + 8 + length));
		offset += length + 12;
	}

	const line = inflateSync(Buffer.concat(data));
	return [line[1]!, line[2]!, line[3]!];
}

/**
 * The colours of one row of pixels of the page, from left to right, from a screenshot of that row alone. The line
 * of a picture may be stored as the difference of each pixel from the one before it, which is undone here; with
 * no line above it, the other ways of storing it come to the same or to half of that.
 */
export async function pixels(page: Page, x: number, y: number, width: number) {
	const picture = await page.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width: Math.floor(width), height: 1 } });
	const data: Buffer[] = [];
	let count = 0;
	let channels = 3;

	for (let offset = 8; offset < picture.length; ) {
		const length = picture.readUInt32BE(offset);
		const kind = picture.toString('latin1', offset + 4, offset + 8);

		if (kind === 'IHDR') {
			count = picture.readUInt32BE(offset + 8);
			channels = picture[offset + 17] === 6 ? 4 : 3;
		}

		if (kind === 'IDAT') data.push(picture.subarray(offset + 8, offset + 8 + length));
		offset += length + 12;
	}

	const stored = inflateSync(Buffer.concat(data));
	const filter = stored[0]!;
	const line = Buffer.from(stored.subarray(1, 1 + count * channels));

	for (let index = 0; index < line.length; index++) {
		const before = index >= channels ? line[index - channels]! : 0;
		if (filter === 1 || filter === 4) line[index] = (line[index]! + before) & 255;
		else if (filter === 3) line[index] = (line[index]! + (before >> 1)) & 255;
	}

	return Array.from({ length: count }, (_, index) => [line[index * channels]!, line[index * channels + 1]!, line[index * channels + 2]!]);
}

/** The colour in the middle of an element, or at a share of its width from its left edge. */
export async function colourOf(page: Page, locator: Locator, share = 0.5) {
	await locator.scrollIntoViewIfNeeded();
	const area = (await locator.boundingBox())!;
	return pixel(page, area.x + area.width * share, area.y + area.height / 2);
}

export const rgb = (color: string) =>
	color.startsWith('#') ? [1, 3, 5].map((at) => Number.parseInt(color.slice(at, at + 2), 16)) : (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);

/** One colour mixed with another, as the browser mixes them: `share` of the second in the first. */
export const mixed = (from: number[], to: number[], share: number) => from.map((channel, index) => channel + (to[index]! - channel) * share);

/** A colour faded as the meter fades it: seven parts of the track's colour in ten. */
export const faded = (color: number[], trackColour: number[]) => mixed(color, trackColour, 0.7);

/** The colour at a place on the scale of the fields which blend: red at 0, amber at 40 and green from 80 of a hundred. */
export const blended = (place: number) =>
	place <= 0.4 ? mixed(rgb(RED), rgb(AMBER), place / 0.4) : place <= 0.8 ? mixed(rgb(AMBER), rgb(GREEN), (place - 0.4) / 0.4) : rgb(GREEN);

export function expectColour(actual: number[], expected: number[], tolerance = 4) {
	const off = Math.max(...actual.map((channel, index) => Math.abs(channel - expected[index]!)));
	expect(off, `rgb(${actual.join(', ')}) is not rgb(${expected.map(Math.round).join(', ')})`).toBeLessThanOrEqual(tolerance);
}

// Editing. The meters of the collection made for it can be edited; every other meter of this spec is read-only.

/** The element on the line of the track, which is the slider of a meter that can be edited. */
export const line = (page: Page, name: string) => meter(page, name).locator('> :first-child');

/**
 * Which pieces of a row are drawn larger than their boxes are laid out: the pieces which a press of the pointer
 * would fill, on a meter in pieces which a press sets where the pointer is.
 */
export const largeOf = (page: Page, name: string) =>
	line(page, name).evaluate((element) =>
		Array.from(element.children).map((part) => part.getBoundingClientRect().height > (part as HTMLElement).offsetHeight + 0.5),
	);

/** The first `count` pieces of a row are large and no other. The size is eased, so this is asked until it holds. */
export const expectLarge = (page: Page, name: string, count: number) =>
	expect
		.poll(async () => (await largeOf(page, name)).map((large) => (large ? 'L' : '-')).join(''), {
			message: `${name}: the first ${count} pieces are large, and no other`,
		})
		.toMatch(new RegExp(`^L{${count}}-*$`));

/** The point at a share of the width of a meter's track, on its middle line. */
export async function pointAt(page: Page, name: string, share: number) {
	await line(page, name).scrollIntoViewIfNeeded();
	const area = (await line(page, name).boundingBox())!;
	return { x: area.x + area.width * share, y: area.y + area.height / 2, width: area.width };
}

/** The cursor which the topmost thing at a point of the page asks for. */
export const cursorOf = (page: Page, x: number, y: number) =>
	page.evaluate(([left, top]) => getComputedStyle(document.elementFromPoint(left!, top!)!).cursor, [x, y]);

/** Brings the segments which grow to exactly three of five, by its keys. */
export async function key3(page: Page) {
	await line(page, 'grow_segments').scrollIntoViewIfNeeded();
	await line(page, 'grow_segments').focus();
	for (let press = 0; press < 3; press++) await page.keyboard.press('ArrowLeft');
	await expect(text(page, 'grow_segments')).toHaveText('3');
}

/** A click at a share of the width of a meter's track. */
export async function clickAt(page: Page, name: string, share: number) {
	const point = await pointAt(page, name, share);
	await page.mouse.click(point.x, point.y);
}

/**
 * A key pressed and released on an element which cannot have the focus. The release matters: the app keeps a list
 * of the keys which are down for its shortcuts, and one which never comes up again stops the shortcut for saving.
 */
export async function keyOn(target: Locator, key: string) {
	await target.dispatchEvent('keydown', { key });
	await target.dispatchEvent('keyup', { key });
}

/**
 * The kinds of event an element listens to, as the tools of the browser report them. The form drops what a field
 * which cannot be edited hands it, so a meter which listened and wrote there would not show in the page: this
 * asks the browser whether it listens at all.
 */
export async function listened(page: Page, target: Locator) {
	const client = await page.context().newCDPSession(page);

	try {
		await target.evaluate((element) => ((window as unknown as { probed: Element }).probed = element));
		const { result } = await client.send('Runtime.evaluate', { expression: 'window.probed' });
		const { listeners } = await client.send('DOMDebugger.getEventListeners', { objectId: result.objectId! });
		return [...new Set(listeners.map((listener) => listener.type))].sort();
	} finally {
		await client.detach();
	}
}

export const LISTENERS = ['keydown', 'pointercancel', 'pointerdown', 'pointerleave', 'pointermove', 'pointerup'];

/** Saves the item of the form with the keyboard, and gives what was sent, as the text and as the values. */
export async function save(page: Page, collection: string) {
	const sent = page.waitForRequest((request) => request.method() === 'PATCH' && request.url().includes(`/items/${collection}/`));
	await page.keyboard.press('ControlOrMeta+s');
	const request = await sent;
	await expect(edited(page)).toHaveCount(0);
	return { text: request.postData() ?? '', values: request.postDataJSON() as Record<string, unknown> };
}

/** What the item of the tests of editing holds: it is made with these values, and put back to them before every test. */
export const EDIT_VALUES = {
	whole: 40,
	tenth: 0.5,
	quarter: 2.5,
	large: 500,
	rounded: 4,
	thirds: 6,
	fives: 40,
	five: 3,
	dots: 3,
	hundred: 40,
	forced: 40,
	rel: 40,
	rel_fast: 40,
	none: null,
	outside: 150,
	twin_live: 40,
	twin_locked: 40,
	gated: 40,
	offset: 1,
	closing: 30,
	between: 3,
	between_piece: 3,
	beyond: 15,
	flow_steps: 45,
	flow_gradient: 45,
	flow_pills: 45,
	flow_bars: 45,
	vanishing: 30,
	pills_live: 3,
	pills_locked: 3,
	dots_live: 3,
	dots_locked: 3,
	ring_segments: 3,
	ring_bars: 20,
	fine: 4567890.1,
	wrapped: 40,
	bare: 40,
	grow_dots: 3.3,
	grow_segments: 3.3,
	fade_pills: 3.3,
	grow_bars: 40,
	grow_coarse: 40,
	grow_rel: 40,
	grow_three: 3,
	unit: 0.5,
	grow_four: 40,
	near_bars: 24,
	near_dots: 40,
	near_spread: 40,
	off: 40,
	off_locked: 40,
	off_pills: 3,
	off_pills_locked: 3,
	stars: 3,
	stars_whole: 3,
	turning: 3,
	leaving: 3,
	tenths: 0.5,
	placed: 3,
};

/**
 * Opens the item of the tests of editing, and waits until the pointer can reach its form: the app fades out a
 * cover over the page for a moment after the form is there, and a click in that moment lands on the cover.
 */
export async function openEdit(page: Page) {
	await openItem(page, EDIT, ids['Edit']!);
	await expect(text(page, 'whole')).toBeVisible();
	await expect(page.locator('.hydrating')).toHaveCount(0);
}

/**
 * Makes the pages of a test refuse the pointer lock, as a browser may. The headless browser of the tests refuses it
 * on macOS and grants it on Linux, where it then reports movements which no pointer made, with no button held. So
 * a test of the relative method without the lock refuses it itself, and the lock is tested in the full browser.
 * Call it before the page is opened.
 */
export const refuseLock = (page: Page) =>
	page.addInitScript(() => {
		Element.prototype.requestPointerLock = () => Promise.reject(new DOMException('Refused for the test.', 'NotSupportedError'));
	});

/** The colours across the middle of an element of the page, from left to right, each as text. */
export async function across(page: Page, locator: Locator) {
	await locator.scrollIntoViewIfNeeded();
	const area = (await locator.boundingBox())!;
	return (await pixels(page, area.x, area.y + area.height / 2, area.width)).map((color) => color.join(','));
}

/**
 * Checks that what is filled and what is not can both be seen, and told apart: `filled` is nowhere the colour of
 * the page inside its edges, `rest` has something which is not the colour of the page, an outline at the least,
 * and the middle of the one is not the colour of the middle of the other.
 */
export async function expectTold(page: Page, filled: Locator, rest: Locator, ground: string, what: string) {
	const [full, hollow] = [await across(page, filled), await across(page, rest)];

	expect(
		full.slice(1, -1).filter((color) => color === ground),
		`${what}: nothing of what is filled has the colour of the page`,
	).toEqual([]);
	expect(
		hollow.some((color) => color !== ground),
		`${what}: what is not filled shows on the page`,
	).toBe(true);
	expect(full[Math.floor(full.length / 2)], `${what}: filled is not the colour of not filled`).not.toBe(hollow[Math.floor(hollow.length / 2)]);
}

type Context = ReturnType<Page['context']>;
type Browser = NonNullable<ReturnType<Context['browser']>>;
type ContextOptions = NonNullable<Parameters<Browser['newContext']>[0]>;

/** Who signs in: the administrator of the sandbox, or a user which a spec made (`makeUser`). */
export interface Credentials {
	email: string;
	password: string;
}

// What the Directus app logs on its own, with or without extensions: the same as the fixture of every test passes over.
const NOISE = /favicon|ResizeObserver loop|auth\/refresh/;

/**
 * A signed-in page of its own, for a test which needs another browser, another kind of screen or another user than
 * the `page` of the fixture gives it. `options` are those of the browser context, laid over a window of the size of
 * the other tests. `quiet()` fails when the page logged an error or threw, as the fixture does for its own page: a
 * test calls it at its end, and closes the context or the browser itself.
 */
export async function signedIn(browser: Browser, options: ContextOptions = {}, user: Credentials = ADMIN) {
	const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1440, height: 900 }, ...options });
	await context.addCookies([{ name: 'license-banner-dismissed', value: 'true', url: BASE_URL }]);

	const response = await context.request.post('/auth/login', { data: { ...user, mode: 'session' } });
	if (!response.ok()) throw new Error(`Could not sign in to the sandbox as ${user.email}: ${response.status()}`);

	const page = await context.newPage();
	const errors: string[] = [];

	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(`console: ${message.text()} ${message.location().url ?? ''}`);
	});

	page.on('pageerror', (error) => errors.push(`page: ${String(error)}`));

	const quiet = () =>
		expect(
			errors.filter((error) => !NOISE.test(error)),
			'errors logged or thrown by the page',
		).toEqual([]);

	return { context, page, quiet };
}

// Users, roles and policies of these tests are told by this start of their name, and removed by it.
const OWN = 'sandbox-meter-';

/** One permission of a user who is no administrator: an action on a collection, for all fields or for those named. */
export interface Permission {
	collection: string;
	action: 'create' | 'read' | 'update' | 'delete';
	fields?: string[];
}

/**
 * A user of these tests' own, so that no test changes the administrator, whom every other test signs in as.
 * `settings` are fields of the user, such as a language or an appearance. Without `permissions` the user has the
 * role of the administrator; with them, a role of its own which may use the app and do what they say and no more.
 */
export async function makeUser(api: Api, name: string, settings: object = {}, permissions: Permission[] | null = null): Promise<Credentials> {
	const credentials = { email: `${OWN}${name}@example.com`, password: `${OWN}${name}` };
	let role: string = (await api.get('/users/me?fields=role')).role;

	if (permissions !== null) {
		const policy = (await api.post('/policies', { name: `${OWN}${name}`, icon: 'speed', app_access: true, admin_access: false })).id;
		role = (await api.post('/roles', { name: `${OWN}${name}`, icon: 'speed' })).id;
		await api.post('/access', { role, policy });

		for (const { collection, action, fields = ['*'] } of permissions) {
			await api.post('/permissions', { policy, collection, action, fields, permissions: {}, validation: {} });
		}
	}

	await api.post('/users', { ...credentials, role, first_name: 'Meter', last_name: name, ...settings });
	return credentials;
}

/** Removes the users of these tests' own, with their roles and policies. */
export async function removeUsers(api: Api) {
	const named = (path: string, key: string) => api.get<{ id: string }[]>(`${path}?fields=id&limit=-1&filter[${key}][_starts_with]=${OWN}`);

	for (const user of await named('/users', 'email')) await api.delete(`/users/${user.id}`);
	for (const role of await named('/roles', 'name')) await api.delete(`/roles/${role.id}`);
	for (const policy of await named('/policies', 'name')) await api.delete(`/policies/${policy.id}`);
}

/**
 * The options form which is open in the page, in the field settings or in the dialog of a Repeater's field.
 * `option` is the field of one option, `choose` picks a choice of a dropdown by the very text of the choice, `tab`
 * goes to a tab of the field settings, and `save` presses the button which saves the topmost drawer. `scope` narrows
 * `option` to a part of the topmost drawer, where the same keys are in the page more than once. `addThreshold`
 * adds an entry to the list of thresholds, in the drawer the list opens for it, and `removeThreshold` removes the
 * first entry, which the app asks to confirm.
 */
export function optionsDialog(page: Page, scope = '') {
	const dialogs = page.locator('#dialog-outlet');
	const drawer = dialogs.locator('.v-drawer').last();
	const option = (name: string) => (scope === '' ? dialogs : drawer.locator(scope)).locator(`.field[data-field="${name}"]`);

	const choose = async (name: string, choice: string) => {
		await option(name).locator('.v-input').first().click();
		await page
			.locator('.v-menu-popper:visible .v-list-item')
			.filter({ has: page.getByText(choice, { exact: true }) })
			.last()
			.click();
	};

	const tab = (name: 'Interface' | 'Display') => dialogs.getByText(name, { exact: true }).first().click();
	const save = () => drawer.locator('header button').last().click();

	const addThreshold = async (value: number, color: string) => {
		const list = option('thresholds').locator('.v-list-item');
		const before = await list.count();

		await option('thresholds').getByRole('button', { name: 'Create New' }).click();
		await drawer.locator('.field[data-field="value"] input').fill(String(value));
		await drawer.locator('.field[data-field="color"] input[type="text"]').fill(color);
		await save();
		await expect(list).toHaveCount(before + 1);
	};

	const removeThreshold = async () => {
		const list = option('thresholds').locator('.v-list-item');
		const before = await list.count();

		await list.first().locator('[data-icon="delete"]').click();
		await dialogs.getByRole('button', { name: 'Delete', exact: true }).click();
		await expect(list).toHaveCount(before - 1);
	};

	return { dialogs, drawer, option, choose, tab, save, addThreshold, removeThreshold };
}

/**
 * Tells the app of a page that a field is a `decimal` whose column holds `scale` decimals, as a database which has
 * such columns reports it. SQLite, which the sandbox runs on, has none: there a `decimal` field is a float without
 * a scale. Every answer of the API about fields which the page asks for is passed on with that one field changed;
 * the database is not touched. Call it before the page is opened.
 */
export async function asDecimal(page: Page, collection: string, name: string, scale: number) {
	const told = (entry: unknown) => {
		const field = entry as { collection?: string; field?: string; type?: string; schema?: Record<string, unknown> | null } | null;
		if (field?.collection !== collection || field.field !== name) return entry;

		return { ...field, type: 'decimal', schema: { ...field.schema, data_type: 'decimal', numeric_precision: 10, numeric_scale: scale } };
	};

	await page.route(/\/fields(\/[^?]*)?(\?.*)?$/, async (route) => {
		if (route.request().method() !== 'GET') return route.continue();

		const response = await route.fetch();
		const body = (await response.json()) as { data?: unknown };
		const data = Array.isArray(body.data) ? body.data.map(told) : told(body.data);

		await route.fulfill({ response, json: { ...body, data } });
	});
}
