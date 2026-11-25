// Browser tests of the Meter bundle in the sandbox Directus
// (see ../../../sandbox/README.md). They cover what the unit tests cannot:
// that the built bundle loads in a real Data Studio, that the interface draws
// every state with the right share of the track filled, and that the display
// draws in a layout and in a template, also where nothing was configured.
import { inflateSync } from 'node:zlib';
import { expect, openItem, test } from '../../../sandbox/support/fixtures.ts';
import { ADMIN, BASE_URL } from '../../../sandbox/support/sandbox.ts';

type Page = Parameters<typeof openItem>[0];
type Locator = ReturnType<Page['locator']>;

const COLLECTION = 'sandbox_meter';

// A collection which points at the first with a many-to-one, to show the display inside a template of related values.
const OWNERS = 'sandbox_meter_owner';

// A collection with a field which fills its row. It is one of its own because such a field changes the columns of
// its whole form, and the first collection is measured as it is.
const WIDE = 'sandbox_meter_wide';

// A collection of meters which can be edited, for the tests which set a value with the pointer and the keys and
// save the item.
const EDIT = 'sandbox_meter_edit';

/** A field on the Meter interface which can be edited: `field` without the read-only mark. */
const live = (name: string, options: object | null = null, meta: object = {}, type = 'integer', schema: object = {}) =>
	field(name, options, { readonly: false, ...meta }, type, schema);

const RED = '#E35169';
const AMBER = '#FFA439';
const GREEN = '#2ECDA7';

// The colours as the browser reports them.
const RGB = { [RED]: 'rgb(227, 81, 105)', [AMBER]: 'rgb(255, 164, 57)', [GREEN]: 'rgb(46, 205, 167)' };

const THRESHOLDS = [
	{ value: 10, color: GREEN },
	{ value: 6, color: AMBER },
];

/**
 * A field on the Meter interface and display, half as wide as the form. It is
 * read-only, as a number which something else keeps up to date is: the meter
 * of such a field is a reading, and stays the reading it was before a meter
 * could be edited. The fields which the tests of editing work on are made by
 * `live`, further down.
 */
const field = (name: string, options: object | null = null, meta: object = {}, type = 'integer', schema: object = {}) => ({
	field: name,
	type,
	schema,
	meta: { interface: 'meter', display: 'meter', width: 'half', readonly: true, options, ...meta },
});

// What the layout shows, in this order.
const COLUMNS = ['title', 'plain', 'level', 'share', 'tasks', 'quiet', 'empty', 'over', 'under'];

// A second table, for the fields whose display has options of its own or whose options hold leftovers.
const OTHERS = ['title', 'apart', 'muted', 'rated', 'cleared', 'emptied', 'slid', 'both', 'long'];

// The day every item is on in the calendar, and what the calendar writes on an entry.
const DAY = '2026-03-12';
const TITLE = '{{title}}: {{plain}} | {{level}} | {{share}} | {{tasks}} | {{quiet}} | {{apart}} | {{muted}} | {{rated}} | {{slid}} | {{both}} | {{empty}}';

// A colour and one threshold in the interface, for the fields whose display empties both.
const TINTED = { color: GREEN, thresholds: [{ value: 20, color: RED }] };

// What a field holds whose interface was changed between the stock Slider and the stock Input or the Meter: both
// pairs of limits, since the app keeps the options.
const LEFTOVERS = { min: 0, max: 10, minValue: 1, maxValue: 5 };

// The three items, by their titles, and the bookmarks which show the collection as a calendar and as the second table.
const ids: Record<string, number> = {};
let calendar: number;
let others: number;

// A third and a fourth table, for the fields whose track is cut into pieces and for those with a colouring of
// their own, and the bookmarks which show them.
const LOOKS = ['title', 'pill_auto', 'seg_auto', 'bar_auto', 'dot_auto', 'pill_hundred', 'seg_hundred', 'bar_hundred', 'dot_hundred', 'pill_set', 'dot_set'];
const PAINTS = ['title', 'pill_free', 'seg_free', 'bar_free', 'dot_free', 'dot_spread', 'look_own', 'look_back', 'paint_blend', 'paint_bar'];
let looks: number;
let paints: number;

// A colour and two thresholds, for the fields which are coloured by the place on the scale.
const SCALE = {
	color: RED,
	thresholds: [
		{ value: 40, color: AMBER },
		{ value: 80, color: GREEN },
	],
};

test.beforeAll(async ({ api }) => {
	// The collection which points at the other has to go first.
	await api.drop(OWNERS, WIDE, EDIT, COLLECTION);

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
			field('share', { min: '0', max: '12.5', indicator: true, label: 'Litres per day', color: GREEN }, {}, 'decimal', { numeric_precision: 10, numeric_scale: 3 }),
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
	others = (
		await api.post('/presets', {
			collection: COLLECTION,
			bookmark: 'Others',
			layout: 'tabular',
			layout_query: { tabular: { fields: OTHERS, sort: ['id'] } },
			layout_options: { tabular: { widths: { rated: 110, long: 150 } } },
		})
	).id;

	looks = (
		await api.post('/presets', {
			collection: COLLECTION,
			bookmark: 'Looks',
			layout: 'tabular',
			layout_query: { tabular: { fields: LOOKS, sort: ['id'] } },
		})
	).id;

	paints = (
		await api.post('/presets', {
			collection: COLLECTION,
			bookmark: 'Paints',
			layout: 'tabular',
			layout_query: { tabular: { fields: PAINTS, sort: ['id'] } },
		})
	).id;

	calendar = (
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
		dot_hundred: 96,
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
		paint_blend: 50,
		paint_bar: 50,
		paint_stepped: 90,
		paint_tint: 50,
	};

	ids['First'] = (await api.post(`/items/${COLLECTION}`, { ...values, title: 'First' })).id;
	ids['Second'] = (await api.post(`/items/${COLLECTION}`, { ...values, title: 'Second', plain: 5, tasks: 3, ruled: 60, muted: 9, pill_hundred: 45, dot_hundred: 4, pill_auto: 5 })).id;
	ids['Third'] = (await api.post(`/items/${COLLECTION}`, { ...values, title: 'Third', plain: 100, tasks: 11, ruled: 60 })).id;

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
			live('forced', { visualization: 'pills', input: 'segment' }),
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
		],
	});

	ids['Edit'] = (
		await api.post(`/items/${EDIT}`, {
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
		})
	).id;
});

const fieldOf = (page: Page, name: string) => page.locator(`main .v-form .field[data-field="${name}"]`);
const meter = (page: Page, name: string) => fieldOf(page, name).locator('.meter');
const track = (page: Page, name: string) => meter(page, name).locator('.mt-track');
const fill = (page: Page, name: string) => meter(page, name).locator('.mt-fill');
const text = (page: Page, name: string) => meter(page, name).locator('.mt-text');

// The form marks the label of a field which holds an unsaved change.
const edited = (page: Page) => page.locator('main .v-form .field-label.edited');

/**
 * Mirrors the page, or turns it back. The direction is set on `body`, not on
 * the root element where the app keeps the user's: the app writes that one
 * again with every update of the document head, so a direction a test puts
 * there can be gone a moment later.
 */
const turn = (page: Page, direction: 'ltr' | 'rtl') => page.evaluate((dir) => (document.body.dir = dir), direction);

/** A colour of the theme as the browser computes it. */
const token = (page: Page, name: string) =>
	page.evaluate((variable) => {
		const probe = document.body.appendChild(document.createElement('span'));
		probe.style.color = `var(${variable})`;
		const color = getComputedStyle(probe).color;
		probe.remove();
		return color;
	}, name);

const edges = async (locator: Locator) => {
	const area = (await locator.boundingBox())!;
	return { left: area.x, right: area.x + area.width, top: area.y, bottom: area.y + area.height, width: area.width, middle: area.y + area.height / 2 };
};

/**
 * Checks how much of a track is filled: the fill is that share of the track
 * wide, within a pixel, and starts where the track starts. A share of 0 is a
 * track without a fill at all. The smallest fill is as wide as the track is
 * high, a dot, so that a value just above the minimum can be seen.
 */
async function expectFilled(bar: Locator, part: Locator, share: number) {
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
 * How much of an element shows: all of it, none of it, or a part. What can
 * cut it are the elements around it which hide what overflows them, up to
 * the cell of a table or the interface of a field. The text of a number may
 * be whole or missing and never a part: a number which shows in part reads as
 * another number.
 */
const shown = (locator: Locator) =>
	locator.evaluate((element) => {
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
	});

/**
 * Squeezes what matches a selector to a row of widths, one after the other,
 * and says for each what shows of the numbers: how many of them are whole,
 * and how many show in part. The last width stays in place; `null` is no
 * squeeze at all.
 */
async function squeezed(page: Page, selector: string, numbers: Locator, widths: (number | null)[]) {
	const style = await page.addStyleTag({ content: `${selector} {}` });
	const states: { width: number | null; whole: number; part: number }[] = [];

	for (const width of widths) {
		await style.evaluate((sheet, rule) => (sheet.textContent = rule), width === null ? '' : `${selector} { max-inline-size: ${width}px !important; }`);

		const each = await Promise.all((await numbers.all()).map((number) => shown(number)));
		states.push({ width, whole: each.filter((state) => state === 'whole').length, part: each.filter((state) => state === 'part').length });
	}

	return states;
}

/** Every width from one to another, in steps. */
const steps = (from: number, to: number, step: number) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, index) => from + index * step);

/** The cells of one row of a table layout, by the title of the item and the key of the field. */
const table = (page: Page, columns: string[]) => {
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
async function expectTooltip(page: Page, target: Locator, expected: string) {
	await expect(async () => {
		await page.mouse.move(0, 0);
		await target.hover();
		await expect(page.locator('#tooltip.visible')).toHaveText(expected, { timeout: 2000 });
	}).toPass();
}

/** The attributes of an element which Vue did not put there for its scoped styles. */
const attributes = (locator: Locator) => locator.evaluate((element) => element.getAttributeNames().filter((name) => !name.startsWith('data-v-')));

test('draws the share of the range the value has reached, and says it', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);

	// The form hands every interface nothing until the item is there.
	await expect(text(page, 'plain')).toHaveText('50%');

	// Nothing configured: 0 to 100, the primary colour, no caption.
	await expectFilled(track(page, 'plain'), fill(page, 'plain'), 0.5);
	await expect(fill(page, 'plain')).toHaveCSS('background-color', await token(page, '--theme--primary'));
	await expect(track(page, 'plain')).toHaveCSS('background-color', await token(page, '--theme--form--field--input--border-color'));
	await expect(meter(page, 'plain').locator('.mt-caption')).toHaveCount(0);

	// A track of our own, rounded, the same in every browser.
	expect((await edges(track(page, 'plain'))).bottom - (await edges(track(page, 'plain'))).top).toBe(12);
	await expect(track(page, 'plain')).toHaveCSS('border-radius', '6px');
	await expect(meter(page, 'plain').locator('meter, progress')).toHaveCount(0);

	// Other ranges: 5 of 10, 500 of 1000, and 0 between -50 and 50 are each half a track.
	for (const name of ['rating', 'score', 'balance']) {
		await expect(text(page, name)).toHaveText('50%');
		await expectFilled(track(page, name), fill(page, name), 0.5);
	}

	// Limits which are text, one with a fraction, on a decimal field: 5 of 12.5.
	await expect(text(page, 'share')).toHaveText('40%');
	await expectFilled(track(page, 'share'), fill(page, 'share'), 0.4);
	await expect(fill(page, 'share')).toHaveCSS('background-color', RGB[GREEN]);

	// A big integer, and the value itself as the text, grouped for the language of the user.
	await expect(text(page, 'big')).toHaveText('3,000,000,000');
	await expectFilled(track(page, 'big'), fill(page, 'big'), 0.75);

	// Beyond the range the bar stays in its track, and the text says how far beyond.
	await expect(text(page, 'over')).toHaveText('150%');
	await expectFilled(track(page, 'over'), fill(page, 'over'), 1);
	await expect(text(page, 'under')).toHaveText('-20%');
	await expectFilled(track(page, 'under'), fill(page, 'under'), 0);

	// A minimum above the maximum counts as the two swapped, for the bar and the text alike.
	await expect(text(page, 'reverse')).toHaveText('30%');
	await expectFilled(track(page, 'reverse'), fill(page, 'reverse'), 0.3);

	// One number as both limits: full from that number upward.
	await expect(text(page, 'fixed')).toHaveText('100%');
	await expectFilled(track(page, 'fixed'), fill(page, 'fixed'), 1);

	// A field which was a stock Slider before keeps its range: 3 between 1 and 5.
	await expect(text(page, 'moved')).toHaveText('50%');
	await expectFilled(track(page, 'moved'), fill(page, 'moved'), 0.5);
	await expect(track(page, 'moved')).toHaveAttribute('aria-valuemin', '1');
	await expect(track(page, 'moved')).toHaveAttribute('aria-valuemax', '5');

	// The value over the maximum, in the colour of the threshold it has reached.
	await expect(text(page, 'tasks')).toHaveText('7 / 12');
	await expectFilled(track(page, 'tasks'), fill(page, 'tasks'), 7 / 12);
	await expect(fill(page, 'tasks')).toHaveCSS('background-color', RGB[AMBER]);

	// The text switched off: the bar takes the whole row.
	await expect(text(page, 'quiet')).toHaveCount(0);
	await expectFilled(track(page, 'quiet'), fill(page, 'quiet'), 0.25);
	expect((await edges(track(page, 'quiet'))).width).toBe((await edges(meter(page, 'quiet'))).width);

	// The note of a field is printed by the form, once, under the meter.
	await expect(fieldOf(page, 'empty').getByText('A note which the form prints itself.')).toHaveCount(1);

	await expect(edited(page)).toHaveCount(0);
});

test('a field without a value does not look like a field at its minimum', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'zero')).toHaveText('0%');

	// Zero: an empty track, and 0%.
	await expectFilled(track(page, 'zero'), fill(page, 'zero'), 0);
	await expect(track(page, 'zero')).toHaveCSS('border-top-style', 'none');
	await expect(track(page, 'zero')).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
	await expect(track(page, 'zero')).toHaveAttribute('aria-valuenow', '0');
	await expect(track(page, 'zero')).toHaveAttribute('aria-valuetext', '0%');

	// No value: a dashed outline where the track would be, a dash as the text, and no value for assistive technology.
	await expect(text(page, 'empty')).toHaveText('—');
	await expectFilled(track(page, 'empty'), fill(page, 'empty'), 0);
	await expect(track(page, 'empty')).toHaveCSS('border-top-style', 'dashed');
	await expect(track(page, 'empty')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
	await expect(track(page, 'empty')).not.toHaveAttribute('aria-valuenow');
	await expect(track(page, 'empty')).toHaveAttribute('aria-valuetext', 'No value');

	// The two are the same size, at the same place in their fields.
	expect((await edges(track(page, 'empty'))).width).toBe((await edges(track(page, 'zero'))).width);
	expect((await edges(track(page, 'empty'))).bottom - (await edges(track(page, 'empty'))).top).toBe(12);
});

test('is a meter with a name, a range and a value text for assistive technology', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'plain')).toHaveText('50%');

	// Without a caption it is named by its field.
	const plain = fieldOf(page, 'plain').getByRole('meter', { name: 'Plain', exact: true });
	await expect(plain).toHaveCount(1);
	await expect(plain).toHaveAttribute('aria-valuemin', '0');
	await expect(plain).toHaveAttribute('aria-valuemax', '100');
	await expect(plain).toHaveAttribute('aria-valuenow', '50');
	await expect(plain).toHaveAttribute('aria-valuetext', '50%');

	// The text beside the bar says the same and is not read a second time.
	await expect(text(page, 'plain')).toHaveAttribute('aria-hidden', 'true');

	// With a caption it is named by the caption, which is drawn under the row.
	const share = fieldOf(page, 'share').getByRole('meter', { name: 'Litres per day', exact: true });
	const caption = meter(page, 'share').locator('.mt-caption');
	await expect(share).toHaveCount(1);
	await expect(caption).toHaveText('Litres per day');
	expect((await edges(caption)).top).toBeGreaterThanOrEqual((await edges(track(page, 'share'))).bottom);
	await expect(share).toHaveAttribute('aria-valuemax', '12.5');
	await expect(share).toHaveAttribute('aria-valuenow', '5');

	// The value is kept within the range, the text is not.
	await expect(track(page, 'over')).toHaveAttribute('aria-valuenow', '100');
	await expect(track(page, 'over')).toHaveAttribute('aria-valuetext', '150%');
	await expect(track(page, 'under')).toHaveAttribute('aria-valuenow', '0');

	// The text switched off is still there to be heard.
	await expect(track(page, 'quiet')).toHaveAttribute('aria-valuetext', '25%');
	await expect(track(page, 'tasks')).toHaveAttribute('aria-valuetext', '7 / 12');

	// Nothing the form passes ends up on the elements as an attribute.
	expect(await attributes(meter(page, 'plain'))).toEqual(['class']);
	expect(await attributes(meter(page, 'empty'))).toEqual(['class']);
	expect((await attributes(track(page, 'plain'))).sort()).toEqual(['aria-label', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow', 'aria-valuetext', 'class', 'role']);
});

test('is a reading: no tab stop, nothing to click, and the same whether the field is read-only or not', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'plain')).toHaveText('50%');
	await expect(text(page, 'locked')).toHaveText('50%');

	// A read-only field is not dimmed: the same fill, the same text, the same colours.
	await expectFilled(track(page, 'locked'), fill(page, 'locked'), 0.5);

	const style = (part: Locator, property: string) => part.evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);

	for (const [part, property] of [
		[meter, 'opacity'],
		[fill, 'background-color'],
		[track, 'background-color'],
		[text, 'color'],
	] as const) {
		expect(await style(part(page, 'locked'), property), property).toBe(await style(part(page, 'plain'), property));
	}

	await expect(meter(page, 'locked')).toHaveCSS('opacity', '1');
	await expect(text(page, 'locked')).toHaveCSS('color', await token(page, '--theme--foreground'));
	await expect(meter(page, 'plain')).toHaveCSS('cursor', 'auto');

	// Nothing in a meter takes the focus: Tab goes from the label of one field to the label of the next.
	expect(await meter(page, 'plain').evaluate((element) => element.querySelectorAll('a, button, input, select, textarea, [tabindex]').length)).toBe(0);
	await fieldOf(page, 'plain').locator('button.field-name').focus();
	await page.keyboard.press('Tab');
	expect(await page.evaluate(() => document.activeElement?.closest('.meter') === null)).toBe(true);
	expect(await page.evaluate(() => document.activeElement?.closest('.field')?.getAttribute('data-field'))).not.toBe('plain');

	// A click on the bar and keys pressed afterwards change nothing.
	await track(page, 'plain').click();
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('End');
	await page.keyboard.press('Space');
	await expect(text(page, 'plain')).toHaveText('50%');
	await expectFilled(track(page, 'plain'), fill(page, 'plain'), 0.5);
	await expect(edited(page)).toHaveCount(0);
});

test('everything is inside an area as high as a stock input, so the note of the form is where it is under an input', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'noted')).toHaveText('58%');

	const line = (name: string) => meter(page, name).locator('.mt-line');
	const caption = (name: string) => meter(page, name).locator('.mt-caption');

	// A meter with a caption and a note beside a stock input with a note, in the same row of the form.
	const input = await edges(fieldOf(page, 'remark').locator('.v-input'));
	const area = await edges(meter(page, 'noted'));
	expect((await edges(fieldOf(page, 'noted'))).top).toBe((await edges(fieldOf(page, 'remark'))).top);

	// The area is as high as the input, 54px, and starts at the same place.
	expect(input.bottom - input.top).toBe(54);
	expect(area.bottom - area.top).toBe(input.bottom - input.top);
	expect(area.top).toBe(input.top);

	// The note which the form prints under the meter is level with the note under the input.
	const noteOfInput = await edges(fieldOf(page, 'remark').getByText('A note under an input.'));
	const noteOfMeter = await edges(fieldOf(page, 'noted').getByText('A note under a meter.'));
	expect(noteOfMeter.top).toBe(noteOfInput.top);
	expect(noteOfMeter.bottom).toBe(noteOfInput.bottom);

	// The track is across the whole width, and the line with caption and text is under it, close to it.
	const bar = await edges(track(page, 'noted'));
	const under = await edges(line('noted'));
	expect(bar.left).toBe(area.left);
	expect(bar.right).toBe(area.right);
	expect(bar.bottom - bar.top).toBe(12);
	expect(under.top - bar.bottom).toBe(4);

	// The two are centred in the area as one group.
	expect(Math.abs(bar.top - area.top - (area.bottom - under.bottom))).toBeLessThan(0.5);
	expect(bar.top).toBeGreaterThan(area.top);

	// On that line the caption is at the start and the text at the end, on one line of text.
	const label = await edges(caption('noted'));
	const number = await edges(text(page, 'noted'));
	expect(label.left).toBe(area.left);
	expect(number.right).toBe(area.right);
	expect(label.right).toBeLessThanOrEqual(number.left);
	expect(label.top).toBe(number.top);
	expect(label.bottom - label.top).toBe(20);
	expect(await shown(text(page, 'noted').locator('span'))).toBe('whole');

	// There is no box around it: no border, no background, no shadow.
	await expect(meter(page, 'noted')).toHaveCSS('border-top-width', '0px');
	await expect(meter(page, 'noted')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
	await expect(meter(page, 'noted')).toHaveCSS('box-shadow', 'none');

	// Without a caption the text is still under the track, at the end. This one is beside a stock input as well.
	expect((await edges(meter(page, 'plain'))).bottom - (await edges(meter(page, 'plain'))).top).toBe(54);
	expect((await edges(meter(page, 'plain'))).top).toBe((await edges(fieldOf(page, 'title').locator('.v-input'))).top);
	await expect(caption('plain')).toHaveCount(0);
	expect((await edges(text(page, 'plain'))).right).toBe((await edges(meter(page, 'plain'))).right);
	expect((await edges(text(page, 'plain'))).top).toBe((await edges(track(page, 'plain'))).bottom + 4);
	expect((await edges(track(page, 'plain'))).top).toBe(bar.top - area.top + (await edges(meter(page, 'plain'))).top);

	// With the text switched off the caption is alone under the track, at the start.
	await expect(text(page, 'named')).toHaveCount(0);
	await expect(caption('named')).toHaveText('Only a caption');
	expect((await edges(caption('named'))).left).toBe((await edges(meter(page, 'named'))).left);
	expect((await edges(caption('named'))).top).toBe((await edges(track(page, 'named'))).bottom + 4);
	expect((await edges(meter(page, 'named'))).bottom - (await edges(meter(page, 'named'))).top).toBe(54);

	// With neither the track is alone, in the middle of the area. So is the read-only one beside a stock Toggle.
	await expect(line('quiet')).toHaveCount(0);
	const alone = await edges(meter(page, 'quiet'));
	expect(alone.bottom - alone.top).toBe(54);
	expect((await edges(track(page, 'quiet'))).middle).toBe(alone.middle);

	const toggle = await edges(fieldOf(page, 'flag').locator('.v-checkbox'));
	expect((await edges(meter(page, 'locked'))).top).toBe(toggle.top);
	expect((await edges(meter(page, 'locked'))).bottom).toBe(toggle.bottom);

	// A caption which needs more lines takes them: the text stays at the end of its first line, whole, and the
	// area grows with it, so nothing is drawn below the area.
	const long = await edges(caption('wordy'));
	const beside = await edges(text(page, 'wordy'));
	const grown = await edges(meter(page, 'wordy'));
	expect(long.bottom - long.top).toBeGreaterThan(40);
	expect(beside.top).toBe(long.top);
	expect(beside.bottom - beside.top).toBe(20);
	expect(beside.right).toBe(grown.right);
	expect(long.right).toBeLessThanOrEqual(beside.left);
	expect(await shown(text(page, 'wordy').locator('span'))).toBe('whole');
	expect(grown.bottom - grown.top).toBeGreaterThan(54);
	expect(long.bottom).toBeLessThanOrEqual(grown.bottom);

	// The text is the app's: the size, weight and colour of the text in a stock input, and so is the caption.
	const typed = fieldOf(page, 'title').locator('input');
	for (const property of ['font-size', 'font-weight', 'font-family', 'color']) {
		const expected = await typed.evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);
		await expect(text(page, 'noted')).toHaveCSS(property, expected);
		await expect(caption('noted')).toHaveCSS(property, expected);
	}
});

test('a condition of the field replaces caption and colour while it matches', async ({ page }) => {
	// 15 is below 20: the options of the condition.
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'ruled')).toHaveText('15%');
	await expect(meter(page, 'ruled').locator('.mt-caption')).toHaveText('Behind');
	await expect(fill(page, 'ruled')).toHaveCSS('background-color', RGB[RED]);

	// 60 is not: the field's own.
	await openItem(page, COLLECTION, ids['Second']!);
	await expect(text(page, 'ruled')).toHaveText('60%');
	await expect(meter(page, 'ruled').locator('.mt-caption')).toHaveText('On track');
	await expect(fill(page, 'ruled')).toHaveCSS('background-color', RGB[GREEN]);
});

test('in a right-to-left page the fill grows from the right, the caption is at the right and the text at the left', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'share')).toHaveText('40%');

	const caption = meter(page, 'share').locator('.mt-caption');

	// Left to right first: the fill starts at the left end of the track; under it the caption at the left, the text at the right.
	let area = await edges(meter(page, 'share'));
	let bar = await edges(track(page, 'share'));
	let part = await edges(fill(page, 'share'));
	expect(Math.abs(part.left - bar.left)).toBeLessThan(0.5);
	expect(part.right).toBeLessThan(bar.right - 1);
	expect((await edges(caption)).left).toBe(area.left);
	expect((await edges(text(page, 'share'))).right).toBe(area.right);
	expect((await edges(caption)).right).toBeLessThan((await edges(text(page, 'share'))).left);

	await turn(page, 'rtl');
	await expect(meter(page, 'share')).toHaveCSS('direction', 'rtl');

	// Mirrored: the same share of the track, from its right end; the caption at the right, the text at the left.
	area = await edges(meter(page, 'share'));
	bar = await edges(track(page, 'share'));
	part = await edges(fill(page, 'share'));
	expect(Math.abs(part.right - bar.right)).toBeLessThan(0.5);
	expect(Math.abs(part.width - bar.width * 0.4)).toBeLessThan(1);
	expect((await edges(caption)).right).toBe(area.right);
	expect((await edges(text(page, 'share'))).left).toBe(area.left);
	expect((await edges(text(page, 'share'))).right).toBeLessThan((await edges(caption)).left);
	expect((await edges(text(page, 'share'))).top).toBe((await edges(caption)).top);
	await expect(caption).toHaveCSS('direction', 'rtl');

	// Without a caption the text is at the left as well.
	expect((await edges(text(page, 'plain'))).left).toBe((await edges(meter(page, 'plain'))).left);

	// A number has no direction of its own: its text still runs from the left, so the sign stays in front.
	await expect(text(page, 'under').locator('span')).toHaveCSS('direction', 'ltr');
	await expect(text(page, 'tasks').locator('span')).toHaveCSS('direction', 'ltr');
	await expect(text(page, 'under')).toHaveText('-20%');

	// What was measured was a mirrored page to the end.
	expect(await meter(page, 'share').evaluate((element) => getComputedStyle(element).direction)).toBe('rtl');
	await expect(edited(page)).toHaveCount(0);
});

test('a new item starts from the default value of the field', async ({ page }) => {
	await page.goto(`/admin/content/${COLLECTION}/+`);
	await page.locator('main .v-form .field').first().waitFor();

	await expect(text(page, 'preset')).toHaveText('30%');
	await expectFilled(track(page, 'preset'), fill(page, 'preset'), 0.3);

	// A field without a default has no value yet.
	await expect(text(page, 'plain')).toHaveText('—');
	await expect(track(page, 'plain')).toHaveCSS('border-top-style', 'dashed');
	await expect(edited(page)).toHaveCount(0);
});

test('the display draws bars of one length in the table layout, also where nothing is configured', async ({ page, api }) => {
	// The worst case first: neither the interface nor the display of this field has a single option.
	const plain = (await api.get(`/fields/${COLLECTION}/plain`)).meta;
	expect(plain.options).toBeNull();
	expect(plain.display_options).toBeNull();

	await page.goto(`/admin/content/${COLLECTION}`);

	await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);

	const { cell, display, bar, part, label } = table(page, COLUMNS);

	// 50, 5 and 100 of the default range: the right text and the right share of the bar.
	await expect(label('First', 'plain')).toHaveText('50%');
	await expect(label('Second', 'plain')).toHaveText('5%');
	await expect(label('Third', 'plain')).toHaveText('100%');
	await expectFilled(bar('First', 'plain'), part('First', 'plain'), 0.5);
	await expectFilled(bar('Second', 'plain'), part('Second', 'plain'), 0.05);
	await expectFilled(bar('Third', 'plain'), part('Third', 'plain'), 1);

	// Every bar of the column is the same length and starts at the same place, and so do the texts.
	const bars = await Promise.all(['First', 'Second', 'Third'].map((title) => edges(bar(title, 'plain'))));
	const texts = await Promise.all(['First', 'Second', 'Third'].map((title) => edges(label(title, 'plain'))));
	expect(bars.map((area) => area.width)).toEqual([72, 72, 72]);
	expect(new Set(bars.map((area) => area.left)).size).toBe(1);
	expect(new Set(texts.map((area) => area.left)).size).toBe(1);
	expect(texts[0]!.left).toBeGreaterThan(bars[0]!.right);
	expect(bars[0]!.bottom - bars[0]!.top).toBe(8);

	// A field of the stock Slider: the display reads the Slider's limits, 3 between 1 and 5.
	await expect(label('First', 'level')).toHaveText('50%');
	await expectFilled(bar('First', 'level'), part('First', 'level'), 0.5);

	// The display has no options of its own here either: range, colour, format and thresholds are the interface's.
	await expect(label('First', 'share')).toHaveText('40%');
	await expectFilled(bar('First', 'share'), part('First', 'share'), 0.4);
	await expect(part('First', 'share')).toHaveCSS('background-color', RGB[GREEN]);

	await expect(label('First', 'tasks')).toHaveText('7 / 12');
	await expect(part('Second', 'tasks')).toHaveCSS('background-color', RGB[RED]);
	await expect(part('First', 'tasks')).toHaveCSS('background-color', RGB[AMBER]);
	await expect(part('Third', 'tasks')).toHaveCSS('background-color', RGB[GREEN]);

	// The text switched off in the interface is off here too, and the bar is still a meter with its text.
	await expect(label('First', 'quiet')).toHaveCount(0);
	await expectFilled(bar('First', 'quiet'), part('First', 'quiet'), 0.25);
	await expect(cell('First', 'quiet').getByRole('meter', { name: 'Quiet', exact: true })).toHaveAttribute('aria-valuetext', '25%');

	// A meter for assistive technology: named by the caption, or by the field.
	const spoken = cell('First', 'share').getByRole('meter', { name: 'Litres per day', exact: true });
	await expect(spoken).toHaveAttribute('aria-valuenow', '5');
	await expect(spoken).toHaveAttribute('aria-valuemax', '12.5');
	await expect(spoken).toHaveAttribute('aria-valuetext', '40%');
	await expect(cell('First', 'plain').getByRole('meter', { name: 'Plain', exact: true })).toHaveCount(1);

	// Nothing a layout passes ends up on the element as an attribute.
	// `data-tooltip` is the mark of the app's tooltip, which the display uses.
	expect((await attributes(display('First', 'plain'))).sort()).toEqual([
		'aria-label',
		'aria-valuemax',
		'aria-valuemin',
		'aria-valuenow',
		'aria-valuetext',
		'class',
		'data-tooltip',
		'role',
	]);

	// Beyond the range: a full bar and the number.
	await expect(label('First', 'over')).toHaveText('150%');
	await expectFilled(bar('First', 'over'), part('First', 'over'), 1);

	// A field without a value is left to the app.
	await expect(display('First', 'empty')).toHaveCount(0);
	await expect(cell('First', 'empty')).toHaveText('--');

	// One line which is no taller than the text display beside it, on the middle of the row.
	const title = await edges(cell('First', 'title').locator('.display-formatted'));
	const ours = await edges(display('First', 'plain'));
	expect(ours.bottom - ours.top).toBe(title.bottom - title.top);
	expect(Math.abs(ours.middle - title.middle)).toBeLessThan(1);
	expect(Math.abs(bars[0]!.middle - title.middle)).toBeLessThan(1.5);

	// A column narrower than a bar: the bar is cut at the edge of the cell, and nothing is drawn outside it.
	const narrow = await edges(cell('First', 'under'));
	const clipped = await edges(display('First', 'under'));
	expect(narrow.width).toBeLessThan(72);
	expect(clipped.left).toBeGreaterThanOrEqual(narrow.left);
	expect(clipped.right).toBeLessThanOrEqual(narrow.right);
	await expect(display('First', 'under')).toHaveCSS('overflow-x', 'hidden');
	await expect(bar('First', 'under')).toBeVisible();
});

test('the tooltip of the display has the value text, after the caption where there is one', async ({ page }) => {
	await page.goto(`/admin/content/${COLLECTION}`);

	const { display } = table(page, COLUMNS);
	await expect(display('First', 'share')).toHaveCount(1);

	// The caption, which the display has no room for, and the value.
	await expectTooltip(page, display('First', 'share'), 'Litres per day: 40%');

	// The value alone: where the text beside the bar is switched off, and where it is there as well, since a column
	// which is too narrow leaves the text out.
	await expectTooltip(page, display('First', 'quiet'), '25%');
	await expectTooltip(page, display('First', 'plain'), '50%');
	await expectTooltip(page, display('First', 'tasks'), '7 / 12');
});

test('the display sits on the line of a related-values template of another collection', async ({ page }) => {
	await page.goto(`/admin/content/${OWNERS}`);

	const row = page.locator('table tbody tr.table-row').filter({ has: page.getByText('Owner', { exact: true }) });
	await expect(row).toHaveCount(1);

	// The template is a title, two meters and a word: all of it is there, in that order, on one line.
	const template = row.locator('.render-template').last();
	const displays = template.locator('.meter-display');
	await expect(displays).toHaveCount(2);
	await expect(displays.nth(0).locator('.md-text')).toHaveText('50%');
	await expect(displays.nth(1).locator('.md-text')).toHaveText('7 / 12');
	await expect(template).toHaveText(/First\s*50%\s*7 \/ 12\s*after/);

	// Both bars keep their length, and the second has the colour of its threshold.
	for (const index of [0, 1]) expect((await edges(displays.nth(index).locator('.md-track'))).width).toBe(72);
	await expectFilled(displays.nth(0).locator('.md-track'), displays.nth(0).locator('.md-fill'), 0.5);
	await expect(displays.nth(1).locator('.md-fill')).toHaveCSS('background-color', RGB[AMBER]);

	// Inline: each display is no taller than the line and lies within it, and what follows it comes after it.
	const line = await edges(template);
	const word = await edges(template.getByText('after'));
	const first = await edges(displays.nth(0));
	const second = await edges(displays.nth(1));

	for (const area of [first, second]) {
		expect(area.top).toBeGreaterThanOrEqual(line.top);
		expect(area.bottom).toBeLessThanOrEqual(line.bottom);
		expect(area.bottom - area.top).toBeLessThanOrEqual(word.bottom - word.top);
	}

	expect(first.right).toBeLessThanOrEqual(second.left);
	expect(second.right).toBeLessThanOrEqual(word.left);
	expect(Math.abs((await edges(displays.nth(0).locator('.md-track'))).middle - word.middle)).toBeLessThan(2);
	await expect(displays.nth(0)).toHaveCSS('display', 'inline');

	// The numbers stand on the line of the words around them: their letters are at the height of the word's.
	const letters = (locator: Locator) =>
		locator.evaluate((element) => {
			const range = document.createRange();
			range.selectNodeContents(element);
			const area = range.getBoundingClientRect();
			return { top: area.top, bottom: area.bottom };
		});

	const after = await letters(template.getByText('after'));

	for (const index of [0, 1]) {
		const number = await letters(displays.nth(index).locator('.md-text > span'));
		expect(Math.abs(number.top - after.top), 'the top of the letters').toBeLessThan(0.5);
		expect(Math.abs(number.bottom - after.bottom), 'the bottom of the letters').toBeLessThan(0.5);
	}
});

test('the display draws by its own options, and by those of the interface for what it leaves out', async ({ page }) => {
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${others}`);
	await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);

	const { cell, bar, part, label } = table(page, OTHERS);

	// Limits stored as text, a caption, a colour and a format, each other than the interface's: 35 between 10 and 60.
	await expect(label('First', 'apart')).toHaveText('35 / 60');
	await expectFilled(bar('First', 'apart'), part('First', 'apart'), 0.5);
	await expect(part('First', 'apart')).toHaveCSS('background-color', RGB[RED]);

	const apart = cell('First', 'apart').getByRole('meter', { name: 'Of the display', exact: true });
	await expect(apart).toHaveAttribute('aria-valuemin', '10');
	await expect(apart).toHaveAttribute('aria-valuemax', '60');
	await expect(apart).toHaveAttribute('aria-valuetext', '35 / 60');
	await expectTooltip(page, cell('First', 'apart').locator('.meter-display'), 'Of the display: 35 / 60');

	// A maximum as a number, the text switched off, the value as the format and thresholds of its own: 5 of 20 has
	// reached none of them, so the colour is the one option the display leaves out, the interface's. With the
	// interface's thresholds it would be green.
	await expect(label('First', 'muted')).toHaveCount(0);
	await expectFilled(bar('First', 'muted'), part('First', 'muted'), 0.25);
	await expect(part('First', 'muted')).toHaveCSS('background-color', RGB[RED]);
	await expect(cell('First', 'muted').getByRole('meter')).toHaveAttribute('aria-valuetext', '5');
	await expectTooltip(page, cell('First', 'muted').locator('.meter-display'), '5');

	// 9 of 20 has reached the display's threshold.
	await expectFilled(bar('Second', 'muted'), part('Second', 'muted'), 0.45);
	await expect(part('Second', 'muted')).toHaveCSS('background-color', RGB[AMBER]);

	// Only the format is its own: the percentage, of the range of the interface.
	await expect(label('First', 'rated')).toHaveText('50%');
	await expectFilled(bar('First', 'rated'), part('First', 'rated'), 0.5);

	// The form of the same item draws by the options of the interface.
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'apart')).toHaveText('35%');
	await expect(fill(page, 'apart')).toHaveCSS('background-color', RGB[GREEN]);
	await expect(meter(page, 'apart').locator('.mt-caption')).toHaveText('Of the interface');
	await expect(text(page, 'muted')).toHaveText('50%');
	await expect(fill(page, 'muted')).toHaveCSS('background-color', RGB[GREEN]);
	await expect(text(page, 'rated')).toHaveText('25');
});

test('on a field which holds both pairs of limits the display has the range the stock Slider draws', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'both')).toHaveText(/%/);

	// What the Slider of the form makes of a field, read from its own input: how far its value of 3 is along it.
	const along = async (name: string) => {
		const input = fieldOf(page, name).locator('input[type="range"]');
		await expect(input).toHaveValue('3');
		return input.evaluate((element: HTMLInputElement) => (Number(element.value) - Number(element.min)) / (Number(element.max) - Number(element.min)));
	};

	// A Slider which holds its own pair alone runs from 1 to 5.
	expect(await along('level')).toBe(0.5);

	// One which still holds `min` and `max` of an earlier interface runs from 0 to 10 in Directus 11.17.4.
	const share = await along('slid');
	expect(share).toBe(0.3);

	// The Meter of the form reads the same four options the same way.
	await expect(text(page, 'both')).toHaveText('30%');
	await expectFilled(track(page, 'both'), fill(page, 'both'), share);

	// And the table shows what the form shows, for both fields.
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${others}`);

	const { bar, part, label } = table(page, OTHERS);

	for (const name of ['slid', 'both']) {
		await expect(label('First', name)).toHaveText(`${share * 100}%`);
		await expectFilled(bar('First', name), part('First', name), share);
	}
});

test('a colour and thresholds which are emptied in the options form of the display mean none, in the form and in the table', async ({ page, api }) => {
	await api.patch(`/fields/${COLLECTION}/emptied`, { meta: { display_options: null } });

	const { part } = table(page, OTHERS);

	// Never set: the display has the colour and the threshold of the interface, and 40 has reached the threshold.
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${others}`);
	await expect(part('First', 'emptied')).toHaveCSS('background-color', RGB[RED]);

	// Stored as emptied: the primary colour, and no threshold.
	const primary = await token(page, '--theme--primary');
	await expect(part('First', 'cleared')).toHaveCSS('background-color', primary);

	// The options form of the display shows what it takes over, as its own.
	await page.goto(`/admin/settings/data-model/${COLLECTION}/emptied`);

	const dialogs = page.locator('#dialog-outlet');
	const colour = dialogs.locator('.field[data-field="color"]');
	const thresholds = dialogs.locator('.field[data-field="thresholds"]');

	await dialogs.getByText('Display', { exact: true }).first().click();
	await expect(colour.locator('input[type="text"]')).toHaveValue(GREEN);
	await expect(thresholds.locator('.v-list-item')).toHaveCount(1);

	// Remove the threshold, which the app asks to confirm, and clear the colour.
	await thresholds.locator('[data-icon="delete"]').click();
	await dialogs.getByRole('button', { name: 'Delete', exact: true }).click();
	await expect(thresholds.locator('.v-list-item')).toHaveCount(0);
	await colour.locator('[data-icon="close"]').click();
	await expect(colour.locator('input[type="text"]')).toHaveValue('');

	// Save the field. Both keys are stored, as nothing.
	await dialogs.locator('.v-drawer').last().locator('header button').last().click();
	await expect.poll(async () => (await api.get(`/fields/${COLLECTION}/emptied`)).meta.display_options).toEqual({ thresholds: null, color: null });

	// Opened again, the form shows neither, and the note of the colour says what that comes to.
	await page.goto(`/admin/settings/data-model/${COLLECTION}/emptied`);
	await dialogs.getByText('Display', { exact: true }).first().click();
	await expect(colour.locator('input[type="text"]')).toHaveValue('');
	await expect(colour).toContainText('Primary colour when empty');
	await expect(thresholds.locator('.v-list-item')).toHaveCount(0);
	await expect(thresholds.locator('.v-notice')).toBeVisible();
	await expect(dialogs.locator('.v-notice', { hasText: 'An emptied colour or list of thresholds means none' })).toBeVisible();

	// And the table draws neither: the primary colour, though 40 is beyond the threshold of the interface.
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${others}`);
	await expect(part('First', 'emptied')).toHaveCSS('background-color', primary);

	// The form of the item still has both: 40 is red there.
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'emptied')).toHaveText('40%');
	await expect(fill(page, 'emptied')).toHaveCSS('background-color', RGB[RED]);
});

test('in a right-to-left page the display fills from the right, with its text to the left of the bar', async ({ page }) => {
	await page.goto(`/admin/content/${COLLECTION}`);
	await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);

	const main = table(page, COLUMNS);
	await expect(main.label('First', 'plain')).toHaveText('50%');

	// Left to right first: the fill starts at the left end of the bar, and the text is to the right of it.
	let bar = await edges(main.bar('First', 'plain'));
	let part = await edges(main.part('First', 'plain'));
	expect(Math.abs(part.left - bar.left)).toBeLessThan(0.5);
	expect(part.right).toBeLessThan(bar.right - 1);
	expect((await edges(main.number('First', 'plain'))).left).toBeGreaterThan(bar.right);

	await turn(page, 'rtl');
	await expect(main.display('First', 'plain')).toHaveCSS('direction', 'rtl');

	// Mirrored: the same share of the bar from its right end, the text to the left of the bar.
	bar = await edges(main.bar('First', 'plain'));
	part = await edges(main.part('First', 'plain'));
	expect(Math.abs(part.right - bar.right)).toBeLessThan(0.5);
	expect(Math.abs(part.width - bar.width * 0.5)).toBeLessThan(1);
	expect((await edges(main.number('First', 'plain'))).right).toBeLessThan(bar.left);

	// Down the column every bar is still the same length and they end at the same place, and so do the texts.
	const bars = await Promise.all(['First', 'Second', 'Third'].map((title) => edges(main.bar(title, 'plain'))));
	const texts = await Promise.all(['First', 'Second', 'Third'].map((title) => edges(main.number(title, 'plain'))));
	expect(bars.map((area) => area.width)).toEqual([72, 72, 72]);
	expect(new Set(bars.map((area) => area.right)).size).toBe(1);
	expect(new Set(texts.map((area) => area.right)).size).toBe(1);

	// The text of a number runs from the left, so the sign stays in front, and all of it shows.
	await expect(main.number('First', 'over')).toHaveCSS('direction', 'ltr');
	await expect(main.number('First', 'over')).toHaveText('150%');
	expect(await shown(main.number('First', 'over'))).toBe('whole');
	expect(await shown(main.number('First', 'plain'))).toBe('whole');
	expect(await main.display('First', 'plain').evaluate((element) => getComputedStyle(element).direction)).toBe('rtl');
});

test('a text which does not fit is left out, and never shown in part', async ({ page }) => {
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${others}`);
	await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);

	const narrow = table(page, OTHERS);
	const long = narrow.number('First', 'long');

	for (const direction of ['ltr', 'rtl'] as const) {
		await turn(page, direction);
		await expect(narrow.display('First', 'long')).toHaveCSS('direction', direction);

		// A column of 150px and a text of twice that: the text is there for the tooltip and for assistive technology,
		// and nothing of it shows. The bar has kept its length, and nothing is outside the cell.
		await expect(long).toHaveText('999,999,999,999,998 / 999,999,999,999,999');
		expect(await shown(long)).toBe('none');
		expect((await edges(narrow.bar('First', 'long'))).width).toBe(72);

		const cell = await edges(narrow.cell('First', 'long'));
		const whole = await edges(narrow.display('First', 'long'));
		expect(whole.left).toBeGreaterThanOrEqual(cell.left);
		expect(whole.right).toBeLessThanOrEqual(cell.right);

		// A column of 110px leaves a few pixels beside the bar, which is no room for "50%": not a digit of it shows.
		await expect(narrow.number('First', 'rated')).toHaveText('50%');
		expect(await shown(narrow.number('First', 'rated'))).toBe('none');
		expect((await edges(narrow.bar('First', 'rated'))).width).toBe(72);

		// Columns of the usual width show their texts whole.
		expect(await shown(narrow.number('First', 'both'))).toBe('whole');
		expect(await shown(narrow.number('First', 'cleared'))).toBe('whole');
	}

	// The value is still to be had where its text is left out.
	await turn(page, 'ltr');
	await expect(narrow.cell('First', 'rated').getByRole('meter')).toHaveAttribute('aria-valuetext', '50%');
	await expectTooltip(page, narrow.display('First', 'rated'), '50%');

	// Every width around the one at which a text begins to fit, in both directions: "50%", "5%", "100%", "40%",
	// "7 / 12" and "150%" are each whole or missing. The wider the cell, the more of them show, from none to all
	// which show in a cell of the usual width.
	await page.goto(`/admin/content/${COLLECTION}`);
	await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);

	const numbers = page.locator('table tbody .md-text > span');
	await expect(numbers).toHaveCount(18);

	for (const direction of ['ltr', 'rtl'] as const) {
		await turn(page, direction);

		const states = await squeezed(page, 'table tbody .meter-display', numbers, [...steps(76, 140, 2), null]);

		expect(states.filter((state) => state.part > 0), `numbers shown in part, ${direction}`).toEqual([]);
		expect(states[0]!.whole).toBe(0);
		expect(states.at(-1)!.whole).toBeGreaterThanOrEqual(12);
		expect(states.at(-2)!.whole).toBe(states.at(-1)!.whole);
		expect(states.map((state) => state.whole)).toEqual([...states.map((state) => state.whole)].sort((a, b) => a - b));
		expect(new Set(states.map((state) => state.whole)).size).toBeGreaterThan(2);
	}

	// The same in the form: a field squeezed until its texts no longer fit beside the shortest track.
	await turn(page, 'ltr');
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'long')).toHaveText('999,999,999,999,998 / 999,999,999,999,999');

	const inForm = page.locator('main .v-form .mt-text > span');
	const count = await inForm.count();
	expect(count).toBeGreaterThan(20);

	for (const direction of ['ltr', 'rtl'] as const) {
		await turn(page, direction);
		await expect(meter(page, 'long')).toHaveCSS('direction', direction);

		const states = await squeezed(page, 'main .v-form .field .interface', inForm, [10, ...steps(20, 130, 5), 180, 293, null]);

		// In fields of their own width every text shows, each on the line under its track.
		expect(states.filter((state) => state.part > 0), `numbers shown in part, ${direction}`).toEqual([]);
		expect(states[0]!.whole).toBe(0);
		expect(states.at(-1)!.whole).toBe(count);
		expect(states.map((state) => state.whole)).toEqual([...states.map((state) => state.whole)].sort((a, b) => a - b));
	}

	// A field of 200px is too narrow for the longest text even on a line of its own: it is left out, with the track
	// across the field as ever. A text which fits is whole.
	await turn(page, 'ltr');
	await squeezed(page, 'main .v-form .field .interface', inForm, [200]);
	expect((await edges(meter(page, 'long'))).width).toBe(200);
	expect(await shown(text(page, 'long').locator('span'))).toBe('none');
	expect((await edges(track(page, 'long'))).width).toBe(200);
	await expect(track(page, 'long')).toHaveAttribute('aria-valuetext', '999,999,999,999,998 / 999,999,999,999,999');
	expect(await shown(text(page, 'big').locator('span'))).toBe('whole');

	// Beside a caption the text keeps its place and its width, and the caption wraps: both are whole.
	expect(await shown(text(page, 'share').locator('span'))).toBe('whole');
	expect((await edges(text(page, 'share'))).right).toBe((await edges(meter(page, 'share'))).right);
	expect((await edges(meter(page, 'share').locator('.mt-caption'))).top).toBe((await edges(text(page, 'share'))).top);
});

test('for a user with Arabic digits a fraction which does not fit is left out as well, not cut to its maximum', async ({ page, api }) => {
	const before = (await api.get('/users/me?fields=language')).language ?? null;

	try {
		await api.patch('/users/me', { language: 'ar-SA' });

		await page.goto(`/admin/content/${COLLECTION}`);
		await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);
		await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

		// The numbers are written in the digits of the language, and read from the right.
		const main = table(page, COLUMNS);
		const fraction = main.number('First', 'tasks');
		await expect(fraction).toHaveText('٧ / ١٢');
		expect(await shown(fraction)).toBe('whole');
		expect((await edges(fraction)).right).toBeLessThan((await edges(main.bar('First', 'tasks'))).left);

		// Squeezed, each text is whole or missing at every width: of a fraction neither number stands alone.
		const numbers = page.locator('table tbody .md-text > span');
		const states = await squeezed(page, 'table tbody .meter-display', numbers, [...steps(76, 140, 2), null]);

		expect(states.filter((state) => state.part > 0)).toEqual([]);
		expect(states[0]!.whole).toBe(0);
		expect(states.at(-1)!.whole).toBeGreaterThanOrEqual(12);

		// In the form, squeezed step by step down from 150px, the same.
		await openItem(page, COLLECTION, ids['First']!);
		await expect(text(page, 'tasks')).toHaveText('٧ / ١٢');

		const inForm = page.locator('main .v-form .mt-text > span');
		const inFields = await squeezed(page, 'main .v-form .field .interface', inForm, [10, ...steps(20, 150, 5)]);
		expect(inFields.filter((state) => state.part > 0)).toEqual([]);
		expect(inFields[0]!.whole).toBe(0);
		expect(inFields.at(-1)!.whole).toBeGreaterThan(15);

		// The fields are still 150px wide: the fraction of twelve fits. The one of two numbers of fifteen digits does
		// not, and neither of its numbers shows.
		expect((await edges(meter(page, 'long'))).width).toBe(150);
		await expect(text(page, 'long')).toHaveText(/ \/ /);
		expect(await shown(text(page, 'tasks').locator('span'))).toBe('whole');
		expect(await shown(text(page, 'long').locator('span'))).toBe('none');
		expect((await edges(track(page, 'long'))).width).toBe(150);
	} finally {
		await api.patch('/users/me', { language: before });
	}
});

test('the display as plain text is the text beside the bar, in the titles of the calendar layout', async ({ page }) => {
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${calendar}`);

	// The calendar renders its template to a string, for which the app asks the display of each field for text: the
	// percentage, with the Slider's limits and with limits which are text, the value over the maximum, and the
	// percentage of a field whose text is switched off in the layout. Then by the display's own options: its limits
	// and its format, its format alone, and its format with the range of the interface. Then a field which holds
	// both pairs of limits, as a Slider and as a Meter, which is 0 to 10 for both. And nothing for an empty field.
	const entry = page.locator('.fc-event', { hasText: 'First' });
	await expect(entry).toHaveCount(1);
	await expect(entry).toHaveText('First: 50% | 50% | 40% | 7 / 12 | 25% | 35 / 60 | 5 | 50% | 30% | 30% |');
});

test('the options form stores the limits as numbers, and the form of the display shows what it takes over', async ({ page, api }) => {
	await api.patch(`/fields/${COLLECTION}/fresh`, { meta: { options: null, display_options: null } });

	await page.goto(`/admin/settings/data-model/${COLLECTION}/fresh`);

	const dialogs = page.locator('#dialog-outlet');
	const input = (name: string) => dialogs.locator(`.field[data-field="${name}"] input`);

	await dialogs.getByText('Interface', { exact: true }).first().click();

	// Number inputs which are empty, with the defaults as their placeholders.
	await expect(input('min')).toHaveAttribute('type', 'number');
	await expect(input('min')).toHaveAttribute('placeholder', '0');
	await expect(input('max')).toHaveAttribute('placeholder', '100');
	await expect(input('min')).toHaveValue('');

	await input('min').fill('2');
	await input('max').fill('6');

	// The display's form has the same options, and shows the limits it takes over from the interface.
	await dialogs.getByText('Display', { exact: true }).first().click();
	await expect(dialogs.locator('.v-notice', { hasText: 'taken from the interface of the field' })).toBeVisible();
	await expect(input('min')).toHaveAttribute('placeholder', '2');
	await expect(input('max')).toHaveAttribute('placeholder', '6');
	await expect(input('max')).toHaveValue('');

	// Save the field.
	await dialogs.locator('.v-drawer').last().locator('header button').last().click();

	// Numbers, not their text, and nothing which was not typed in: no default, and nothing for the display.
	await expect.poll(async () => (await api.get(`/fields/${COLLECTION}/fresh`)).meta.options).toEqual({ min: 2, max: 6 });
	expect((await api.get(`/fields/${COLLECTION}/fresh`)).meta.display_options).toBeNull();

	// The item which holds 4 is half way between 2 and 6.
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'fresh')).toHaveText('50%');
	await expectFilled(track(page, 'fresh'), fill(page, 'fresh'), 0.5);
});


/**
 * The pieces of a track which is cut up, in the order of the document: where
 * each is, whether it is filled, its colour and its four corners (top left,
 * top right, bottom right, bottom left). Measured in one go.
 */
const pieces = (strip: Locator) =>
	strip.evaluate((element) =>
		Array.from(element.children).map((piece) => {
			const area = piece.getBoundingClientRect();
			const style = getComputedStyle(piece);

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
			};
		}),
	);

const strip = (page: Page, name: string) => meter(page, name).locator('.mt-strip');

/** How many pieces there are, and how many of them are filled, which have to be the first ones. */
async function expectFilledPieces(row: Locator, count: number, filled: number) {
	await expect(row.locator('> *')).toHaveCount(count);
	expect((await pieces(row)).map((piece) => piece.filled)).toEqual(Array.from({ length: count }, (_, index) => index < filled));
}

// The rule by which the pieces are counted, written out again here: how narrow a piece of each shape may get and
// how far it is from the next, in the form and in the display; how many of those fit a width; and how many are
// drawn when a number is wanted, or none is.
const SIZES = {
	form: { pills: [20, 4], segments: [14, 3], bars: [3, 2], dots: [12, 6] },
	display: { pills: [8, 2], segments: [6, 2], bars: [2, 1], dots: [6, 1.5] },
} as const;

type Shape = keyof (typeof SIZES)['form'];

const fits = (width: number, [piece, gap]: readonly [number, number]) => Math.floor((width + gap) / (piece + gap));

const drawn = (wanted: number | null, fit: number) => {
	if (fit < 2) return 0;
	if (wanted === null) return fit;
	if (wanted <= fit) return wanted;

	for (let count = fit; count >= 2; count--) if (wanted % count === 0) return count;
	return fit;
};

/** Makes the interface of a field of the form no wider than a number of pixels, or lets it go again. */
const squeeze = (page: Page, name: string, width: number | null) =>
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
async function pixel(page: Page, x: number, y: number) {
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

/** The colour in the middle of an element, or at a share of its width from its left edge. */
async function colourOf(page: Page, locator: Locator, share = 0.5) {
	await locator.scrollIntoViewIfNeeded();
	const area = (await locator.boundingBox())!;
	return pixel(page, area.x + area.width * share, area.y + area.height / 2);
}

const rgb = (color: string) => (color.startsWith('#') ? [1, 3, 5].map((at) => Number.parseInt(color.slice(at, at + 2), 16)) : (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number));

/** One colour mixed with another, as the browser mixes them: `share` of the second in the first. */
const mixed = (from: number[], to: number[], share: number) => from.map((channel, index) => channel + (to[index]! - channel) * share);

/** A colour faded as the meter fades it: seven parts of the track's colour in ten. */
const faded = (color: number[], trackColour: number[]) => mixed(color, trackColour, 0.7);

/** The colour at a place on the scale of the fields which blend: red at 0, amber at 40 and green from 80 of a hundred. */
const blended = (place: number) =>
	place <= 0.4 ? mixed(rgb(RED), rgb(AMBER), place / 0.4) : place <= 0.8 ? mixed(rgb(AMBER), rgb(GREEN), (place - 0.4) / 0.4) : rgb(GREEN);

function expectColour(actual: number[], expected: number[], tolerance = 4) {
	const off = Math.max(...actual.map((channel, index) => Math.abs(channel - expected[index]!)));
	expect(off, `rgb(${actual.join(', ')}) is not rgb(${expected.map(Math.round).join(', ')})`).toBeLessThanOrEqual(tolerance);
}

test('pills, segments, bars and dots in the form: the pieces which are wanted, the nearest whole number of them filled', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'pill_hundred')).toHaveText('44%');

	// A range of five, with nothing set: one piece for every unit, and 3 fills three, in each of the four shapes.
	for (const [name, shape] of [
		['pill_auto', 'pills'],
		['seg_auto', 'segments'],
		['bar_auto', 'bars'],
		['dot_auto', 'dots'],
	] as const) {
		await expectFilledPieces(strip(page, name), 5, 3);
		await expect(meter(page, name).locator(`.mt-${shape}`)).toHaveCount(1);
		await expect(text(page, name)).toHaveText('60%');
	}

	// A number which is set, as a number and as its text: four pieces, of which 50 fills two.
	await expectFilledPieces(strip(page, 'pill_set'), 4, 2);
	await expectFilledPieces(strip(page, 'dot_set'), 4, 2);

	// A range of a hundred in ten pills: 44 fills four of them. In ten dots 96 fills all ten.
	await expectFilledPieces(strip(page, 'pill_hundred'), 10, 4);
	await expectFilledPieces(strip(page, 'dot_hundred'), 10, 10);

	// What is said stays exact: the text, and the meter for assistive technology, which the row of pieces is.
	const spoken = fieldOf(page, 'pill_hundred').getByRole('meter', { name: 'Pill Hundred', exact: true });
	await expect(spoken).toHaveAttribute('aria-valuenow', '44');
	await expect(spoken).toHaveAttribute('aria-valuetext', '44%');
	await expect(spoken).toHaveClass(/mt-strip/);
	await expect(text(page, 'dot_hundred')).toHaveText('96%');

	// A filled piece has the colour the bar would have, here that of the threshold which 44 has reached, and an
	// unfilled one the colour of the track.
	const hundred = await pieces(strip(page, 'pill_hundred'));
	const trackColour = await token(page, '--theme--form--field--input--border-color');
	expect(hundred.slice(0, 4).map((piece) => piece.color)).toEqual(Array(4).fill(RGB[AMBER]));
	expect(hundred.slice(4).map((piece) => piece.color)).toEqual(Array(6).fill(trackColour));
	expect((await pieces(strip(page, 'dot_auto')))[0]!.color).toBe(await token(page, '--theme--primary'));

	// Without a value: every piece, none filled, each a dashed outline as the track is, and a dash as the text.
	await expectFilledPieces(strip(page, 'pill_none'), 5, 0);
	const none = await pieces(strip(page, 'pill_none'));
	expect(none.map((piece) => piece.border)).toEqual(Array(5).fill('dashed'));
	expect(none.map((piece) => piece.color)).toEqual(Array(5).fill('rgba(0, 0, 0, 0)'));
	await expect(text(page, 'pill_none')).toHaveText('—');
	await expect(meter(page, 'pill_none').getByRole('meter')).not.toHaveAttribute('aria-valuenow');

	// One bar has no pieces, as before, and nothing on its elements which it did not have.
	await expect(strip(page, 'plain')).toHaveCount(0);
	await expect(track(page, 'plain')).toHaveCount(1);
	expect(await attributes(meter(page, 'plain'))).toEqual(['class']);
	expect((await attributes(track(page, 'plain'))).includes('style')).toBe(false);
	expect(await track(page, 'plain').getAttribute('class')).toBe('mt-track');
	expect(await fill(page, 'plain').getAttribute('class')).toBe('mt-fill');

	// 45 of a hundred fills five of ten, 4 none, and 5 of five all of them.
	await openItem(page, COLLECTION, ids['Second']!);
	await expect(text(page, 'pill_hundred')).toHaveText('45%');
	await expectFilledPieces(strip(page, 'pill_hundred'), 10, 5);
	await expectFilledPieces(strip(page, 'dot_hundred'), 10, 0);
	await expectFilledPieces(strip(page, 'pill_auto'), 5, 5);
	await expect(text(page, 'dot_hundred')).toHaveText('4%');
	await expect(edited(page)).toHaveCount(0);
});

test('each visualization has its shape: which corners are round, how far the pieces are apart, and what they share', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'pill_hundred')).toHaveText('44%');

	const ROUND = '6px';
	const SQUARE = '0px';

	// Pills, segments and bars: as high as the track, equal widths from one edge of the field to the other.
	for (const [name, gap] of [
		['pill_auto', 4],
		['pill_hundred', 4],
		['pill_set', 4],
		['seg_auto', 3],
		['seg_hundred', 3],
		['bar_auto', 2],
		['bar_hundred', 2],
	] as const) {
		const area = await edges(meter(page, name));
		const all = await pieces(strip(page, name));

		expect(all[0]!.left, name).toBe(area.left);
		expect(Math.abs(all.at(-1)!.right - area.right), name).toBeLessThan(0.5);
		expect(Math.max(...all.map((piece) => piece.width)) - Math.min(...all.map((piece) => piece.width)), name).toBeLessThan(0.5);
		expect(all.map((piece) => piece.height)).toEqual(all.map(() => 12));
		all.slice(1).forEach((piece, index) => expect(Math.abs(piece.left - all[index]!.right - gap), name).toBeLessThan(0.5));
	}

	// Pills: every piece round at both ends.
	for (const name of ['pill_auto', 'pill_hundred']) {
		expect((await pieces(strip(page, name))).map((piece) => piece.corners)).toEqual(Array(name === 'pill_auto' ? 5 : 10).fill([ROUND, ROUND, ROUND, ROUND]));
	}

	// Segments: only the two outer ends of the row are round, so the row reads as one bar which is cut.
	for (const name of ['seg_auto', 'seg_hundred']) {
		const all = await pieces(strip(page, name));

		expect(all[0]!.corners).toEqual([ROUND, SQUARE, SQUARE, ROUND]);
		expect(all.at(-1)!.corners).toEqual([SQUARE, ROUND, ROUND, SQUARE]);
		expect(all.slice(1, -1).map((piece) => piece.corners)).toEqual(all.slice(1, -1).map(() => [SQUARE, SQUARE, SQUARE, SQUARE]));
	}

	// Bars: no corner is round, and many fit: more than of any other shape in a field of the same width.
	const bars = await pieces(strip(page, 'bar_hundred'));
	expect(bars.map((piece) => piece.corners)).toEqual(bars.map(() => [SQUARE, SQUARE, SQUARE, SQUARE]));
	expect(bars.length).toBeGreaterThan((await pieces(strip(page, 'seg_hundred'))).length);
	expect((await pieces(strip(page, 'seg_hundred'))).length).toBeGreaterThan((await pieces(strip(page, 'pill_hundred'))).length);
	expect(bars[0]!.width).toBeGreaterThanOrEqual(3);

	// Dots: circles as high as the track, 6px apart, from the start of the field. In a field as wide as the form
	// they are the same circles.
	for (const name of ['dot_hundred', 'dot_auto', 'dot_set', 'look_wide']) {
		const area = await edges(meter(page, name));
		const all = await pieces(strip(page, name));

		expect(all[0]!.left).toBe(area.left);
		expect(all.map((piece) => [piece.width, piece.height])).toEqual(all.map(() => [12, 12]));
		expect(all.map((piece) => piece.corners)).toEqual(all.map(() => ['50%', '50%', '50%', '50%']));
		all.slice(1).forEach((piece, index) => expect(piece.left - all[index]!.right).toBe(6));
		expect(all.at(-1)!.right).toBe(area.left + all.length * 18 - 6);
	}

	// The row of pieces is where the track is, and the line with caption and text under it as under a track.
	for (const name of ['pill_set', 'dot_set']) {
		const row = await edges(strip(page, name));
		const bar = await edges(track(page, 'noted'));
		expect(row.top - (await edges(meter(page, name))).top).toBe(bar.top - (await edges(meter(page, 'noted'))).top);
		expect(row.bottom - row.top).toBe(12);
		expect((await edges(meter(page, name).locator('.mt-line'))).top - row.bottom).toBe(4);
	}
});

test('the number of pieces follows the width of the field: what is wanted where it fits, else a number which divides it, else as many as fit', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'pill_hundred')).toHaveText('44%');

	// What each field wants: a hundred for a range of a hundred, the number which is set, or nothing in particular.
	const CASES: [string, Shape, number | null][] = [
		['pill_hundred', 'pills', 100],
		['seg_hundred', 'segments', 100],
		['bar_hundred', 'bars', 100],
		['dot_hundred', 'dots', 100],
		['pill_free', 'pills', null],
		['seg_free', 'segments', null],
		['bar_free', 'bars', null],
		['dot_free', 'dots', null],
		['pill_many', 'pills', 12],
		['dot_many', 'dots', 30],
		['look_wide', 'dots', 100],
	];

	const widthOf = async (name: string) => (await edges(meter(page, name))).width;
	const countOf = (name: string) => strip(page, name).locator('> *').count();

	// Every field draws what the rule gives for the width it has. A window which was resized goes on settling
	// for a moment, so width and number are read until they agree.
	const expectRule = () =>
		expect(async () => {
			for (const [name, shape, wanted] of CASES) {
				expect(await countOf(name), name).toBe(drawn(wanted, fits(await widthOf(name), SIZES.form[shape])));
			}
		}).toPass({ timeout: 5000 });

	await expectRule();

	// A range of a hundred never draws a number which does not divide a hundred, and a different one for each shape.
	const half = await widthOf('pill_hundred');
	expect(half).toBeGreaterThan(300);
	expect(half).toBeLessThan(400);
	expect(await countOf('pill_hundred')).toBe(10);
	expect(await countOf('seg_hundred')).toBe(20);
	expect(await countOf('bar_hundred')).toBe(50);
	expect(await countOf('dot_hundred')).toBe(10);
	expect(await countOf('look_wide')).toBe(25);

	// 62 of a hundred fills the nearest whole number of whatever is drawn: 12 of 20, 31 of 50.
	await expectFilledPieces(strip(page, 'seg_hundred'), 20, 12);
	await expectFilledPieces(strip(page, 'bar_hundred'), 50, 31);

	// No number wanted: as many as fit, each no narrower than its smallest.
	expect(await countOf('pill_free')).toBe(fits(half, SIZES.form.pills));
	expect(await countOf('dot_free')).toBe(fits(half, SIZES.form.dots));
	expect((await pieces(strip(page, 'pill_free')))[0]!.width).toBeGreaterThanOrEqual(20);
	expect((await pieces(strip(page, 'seg_free')))[0]!.width).toBeGreaterThanOrEqual(14);
	expect((await pieces(strip(page, 'bar_free')))[0]!.width).toBeGreaterThanOrEqual(3);

	// A number which is set and fits is drawn as set: twelve pills. Thirty dots do not fit, so fifteen are drawn.
	expect(await countOf('pill_many')).toBe(12);
	expect(await countOf('dot_many')).toBe(15);
	await expectFilledPieces(strip(page, 'dot_many'), 15, 8);

	// The same fields in a narrower window: the form gets narrower, and each field again draws what its width
	// gives. Bars without a wanted number are fewer than before, and as many again in the window as it was.
	const before = await countOf('bar_free');
	expect(before).toBe(fits(half, SIZES.form.bars));

	await page.setViewportSize({ width: 1000, height: 900 });
	await expect.poll(() => widthOf('bar_free')).toBeLessThan(half - 50);
	await expectRule();
	expect(await countOf('bar_free')).toBeLessThan(before);
	expect(100 % (await countOf('bar_hundred'))).toBe(0);
	expect(100 % (await countOf('seg_hundred'))).toBe(0);

	await page.setViewportSize({ width: 1440, height: 900 });
	await expect.poll(() => widthOf('bar_free')).toBe(half);
	await expectRule();
	expect(await countOf('bar_free')).toBe(before);

	// A field made narrower: twelve pills no longer fit in 150px, which has room for six, and six divides twelve.
	// Thirty dots in 100px, which has room for five.
	await squeeze(page, 'pill_many', 150);
	await expect(strip(page, 'pill_many').locator('> *')).toHaveCount(6);
	await expectFilledPieces(strip(page, 'pill_many'), 6, 3);
	await squeeze(page, 'pill_many', 100);
	await expect(strip(page, 'pill_many').locator('> *')).toHaveCount(4);
	await squeeze(page, 'dot_many', 100);
	await expect(strip(page, 'dot_many').locator('> *')).toHaveCount(5);

	// A hundred in 130px of pills: room for five, which divides it.
	await squeeze(page, 'pill_hundred', 130);
	await expect(strip(page, 'pill_hundred').locator('> *')).toHaveCount(5);

	// Wide again: as before.
	for (const name of ['pill_many', 'dot_many', 'pill_hundred']) await squeeze(page, name, null);
	await expect(strip(page, 'pill_many').locator('> *')).toHaveCount(12);
	await expect(strip(page, 'dot_many').locator('> *')).toHaveCount(15);
	await expect(strip(page, 'pill_hundred').locator('> *')).toHaveCount(10);

	// The text never changed with any of it.
	await expect(text(page, 'pill_many')).toHaveText('50%');
	await expect(edited(page)).toHaveCount(0);

	// A field which fills its row is more than twice as wide as the field of half the form beside it, and has as
	// many more bars as fit.
	await openItem(page, WIDE, ids['Wide']!);
	await expect(text(page, 'bar_fill')).toHaveText('1.25');

	const beside = await widthOf('bar_half');
	const filling = await widthOf('bar_fill');
	expect(filling).toBeGreaterThan(2 * beside);
	await expect(strip(page, 'bar_half').locator('> *')).toHaveCount(fits(beside, SIZES.form.bars));
	await expect(strip(page, 'bar_fill').locator('> *')).toHaveCount(fits(filling, SIZES.form.bars));
	expect(await countOf('bar_fill')).toBeGreaterThan(2 * (await countOf('bar_half')));
	expect(await countOf('bar_fill')).toBeLessThanOrEqual(200);
	await expectFilledPieces(strip(page, 'bar_fill'), await countOf('bar_fill'), Math.round((await countOf('bar_fill')) / 2));

	const area = await edges(meter(page, 'bar_fill'));
	expect(area.bottom - area.top).toBe(54);

	// In a narrower window it has fewer.
	await page.setViewportSize({ width: 1000, height: 900 });
	await expect.poll(() => widthOf('bar_fill')).toBeLessThan(filling - 50);
	await expect(async () => expect(await countOf('bar_fill')).toBe(fits(await widthOf('bar_fill'), SIZES.form.bars))).toPass({ timeout: 5000 });
	expect(await countOf('bar_fill')).toBeLessThan(fits(filling, SIZES.form.bars));
});

test('where fewer than two pieces fit, and in a field which is not shown, the meter is one bar', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'pill_auto')).toHaveText('60%');
	await expectFilledPieces(strip(page, 'pill_auto'), 5, 3);

	// 43px have room for one pill of 20px and not for two with their gap.
	await squeeze(page, 'pill_auto', 43);
	await expect(strip(page, 'pill_auto')).toHaveCount(0);
	await expect(track(page, 'pill_auto')).toHaveCount(1);
	await expectFilled(track(page, 'pill_auto'), fill(page, 'pill_auto'), 0.6);
	await expect(meter(page, 'pill_auto').getByRole('meter')).toHaveAttribute('aria-valuenow', '3');
	expect((await edges(track(page, 'pill_auto'))).bottom - (await edges(track(page, 'pill_auto'))).top).toBe(12);

	// 44px have room for two.
	await squeeze(page, 'pill_auto', 44);
	await expect(strip(page, 'pill_auto').locator('> *')).toHaveCount(2);
	await expectFilledPieces(strip(page, 'pill_auto'), 2, 1);

	await squeeze(page, 'pill_auto', null);
	await expectFilledPieces(strip(page, 'pill_auto'), 5, 3);

	// A field which is not shown has no width: no pieces. Shown again, it is measured again.
	await fieldOf(page, 'dot_auto').evaluate((element) => ((element as HTMLElement).style.display = 'none'));
	await expect(fieldOf(page, 'dot_auto').locator('.mt-part')).toHaveCount(0);
	await expect(fieldOf(page, 'dot_auto').locator('.mt-track')).toHaveCount(1);
	await fieldOf(page, 'dot_auto').evaluate((element) => (element as HTMLElement).style.removeProperty('display'));
	await expectFilledPieces(strip(page, 'dot_auto'), 5, 3);
});

test('dots are packed from the start, or spread from edge to edge', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'dot_spread')).toHaveText('60%');

	// Packed, in a field as wide as the form: the row ends long before the field does.
	const wide = await edges(meter(page, 'look_wide'));
	const packed = await pieces(strip(page, 'look_wide'));
	expect(packed[0]!.left).toBe(wide.left);
	expect(packed.at(-1)!.right).toBe(wide.left + packed.length * 18 - 6);
	expect(packed.at(-1)!.right).toBeLessThan(wide.right - 100);
	await expect(meter(page, 'look_wide').locator('.mt-spread')).toHaveCount(0);

	// Spread: the same five dots for a range of five, the first at the start edge, the last at the end edge, and
	// the gaps between them equal and wider than those of packed dots.
	const area = await edges(meter(page, 'dot_spread'));
	const spread = await pieces(strip(page, 'dot_spread'));
	expect(spread).toHaveLength(5);
	expect(spread.map((piece) => piece.filled)).toEqual([true, true, true, false, false]);
	expect(spread.map((piece) => [piece.width, piece.height])).toEqual(spread.map(() => [12, 12]));
	expect(spread[0]!.left).toBe(area.left);
	expect(Math.abs(spread.at(-1)!.right - area.right)).toBeLessThan(0.5);

	const gaps = spread.slice(1).map((piece, index) => piece.left - spread[index]!.right);
	expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(0.5);
	expect(Math.abs(gaps[0]! - (area.width - 5 * 12) / 4)).toBeLessThan(0.5);
	expect(gaps[0]!).toBeGreaterThan(6);

	// The packed dots of the same range, beside them, are the same dots.
	expect((await pieces(strip(page, 'dot_auto'))).map((piece) => piece.filled)).toEqual(spread.map((piece) => piece.filled));

	// The layout of the dots is nothing to pills.
	await expect(meter(page, 'pill_auto').locator('.mt-spread')).toHaveCount(0);
});

test('with pills or dots the area is as high as a stock input, and the note of the form level with the note beside it', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'pill_set')).toHaveText('50%');

	for (const [name, beside, note] of [
		['pill_set', 'beside_a', 'A note under pills.'],
		['dot_set', 'beside_b', 'A note under dots.'],
	] as const) {
		const input = await edges(fieldOf(page, beside).locator('.v-input'));
		const area = await edges(meter(page, name));

		// In one row of the form, as high as the input and at the same place.
		expect((await edges(fieldOf(page, name))).top).toBe((await edges(fieldOf(page, beside))).top);
		expect(area.bottom - area.top).toBe(54);
		expect(area.bottom - area.top).toBe(input.bottom - input.top);
		expect(area.top).toBe(input.top);

		// The two notes are level.
		const ours = await edges(fieldOf(page, name).getByText(note));
		const theirs = await edges(fieldOf(page, beside).getByText('A note under an input.'));
		expect(ours.top).toBe(theirs.top);
		expect(ours.bottom).toBe(theirs.bottom);

		// Caption at the start and text at the end of the line under the pieces, the group centred.
		const row = await edges(strip(page, name));
		const under = await edges(meter(page, name).locator('.mt-line'));
		expect(Math.abs(row.top - area.top - (area.bottom - under.bottom))).toBeLessThan(0.5);
		expect((await edges(meter(page, name).locator('.mt-caption'))).left).toBe(area.left);
		expect((await edges(text(page, name))).right).toBe(area.right);
	}

	// Every other shape and colouring, and the one bar they give way to, is as high: no meter is higher than an input.
	for (const name of ['seg_auto', 'bar_auto', 'bar_hundred', 'dot_spread', 'paint_blend', 'paint_bar']) {
		const area = await edges(meter(page, name));
		expect(area.bottom - area.top, name).toBe(54);
	}
});

test('the display draws the pieces in the table: the same number in every row, by its own options and by those of the interface', async ({ page }) => {
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${looks}`);
	await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);

	const shapes = table(page, LOOKS);
	const row = (title: string, name: string) => shapes.display(title, name).locator('.md-strip');

	// None of these displays has an option of its own: shape, number of pieces, range and colours are the interface's.
	for (const [name, shape] of [
		['pill_auto', 'pills'],
		['seg_auto', 'segments'],
		['bar_auto', 'bars'],
		['dot_auto', 'dots'],
	] as const) {
		await expectFilledPieces(row('First', name), 5, 3);
		await expect(shapes.display('First', name).locator(`.md-${shape}`)).toHaveCount(1);
	}

	await expectFilledPieces(row('Second', 'pill_auto'), 5, 5);
	await expectFilledPieces(row('First', 'pill_set'), 4, 2);
	await expectFilledPieces(row('First', 'dot_set'), 4, 2);

	// A range of a hundred in a bar of 72px: five pills, five segments, twenty bars and five dots, each a number
	// which divides a hundred. 44 fills two of five, 62 three of five and twelve of twenty, 96 all five.
	await expectFilledPieces(row('First', 'pill_hundred'), 5, 2);
	await expectFilledPieces(row('First', 'seg_hundred'), 5, 3);
	await expectFilledPieces(row('First', 'bar_hundred'), 20, 12);
	await expectFilledPieces(row('First', 'dot_hundred'), 5, 5);
	await expectFilledPieces(row('Second', 'pill_hundred'), 5, 2);
	await expectFilledPieces(row('Second', 'dot_hundred'), 5, 0);
	expect((await pieces(row('First', 'pill_hundred')))[0]!.color).toBe(RGB[AMBER]);

	// The same number in every row, whatever the value.
	for (const name of ['pill_hundred', 'seg_hundred', 'bar_hundred', 'dot_hundred']) {
		const counts = await Promise.all(['First', 'Second', 'Third'].map((title) => row(title, name).locator('> *').count()));
		expect(new Set(counts).size, name).toBe(1);
	}

	// What is said stays exact.
	await expect(shapes.number('First', 'pill_hundred')).toHaveText('44%');
	await expect(shapes.cell('First', 'pill_hundred').getByRole('meter')).toHaveAttribute('aria-valuetext', '44%');
	await expect(shapes.cell('First', 'pill_hundred').getByRole('meter')).toHaveAttribute('aria-valuenow', '44');

	// The shapes: pills, segments and bars share the length of the bar, 72px, at its height.
	for (const [name, gap] of [
		['pill_hundred', 2],
		['pill_auto', 2],
		['seg_hundred', 2],
		['bar_hundred', 1],
	] as const) {
		const all = await pieces(row('First', name));
		const whole = await edges(row('First', name));

		expect(whole.width, name).toBe(72);
		expect(Math.max(...all.map((piece) => piece.width)) - Math.min(...all.map((piece) => piece.width)), name).toBeLessThan(0.5);
		expect(all.map((piece) => piece.height)).toEqual(all.map(() => 8));
		all.slice(1).forEach((piece, index) => expect(Math.abs(piece.left - all[index]!.right - gap), name).toBeLessThan(0.5));
	}

	const pills = await pieces(row('First', 'pill_hundred'));
	expect(pills.map((piece) => piece.corners)).toEqual(pills.map(() => ['4px', '4px', '4px', '4px']));

	const segments = await pieces(row('First', 'seg_hundred'));
	expect(segments[0]!.corners).toEqual(['4px', '0px', '0px', '4px']);
	expect(segments.at(-1)!.corners).toEqual(['0px', '4px', '4px', '0px']);
	expect(segments.slice(1, -1).map((piece) => piece.corners)).toEqual(segments.slice(1, -1).map(() => ['0px', '0px', '0px', '0px']));

	const bars = await pieces(row('First', 'bar_hundred'));
	expect(bars.map((piece) => piece.corners)).toEqual(bars.map(() => ['0px', '0px', '0px', '0px']));

	// Dots are circles of 6px, 1.5px apart, from the start: the row is as long as its dots.
	for (const [name, count] of [
		['dot_hundred', 5],
		['dot_set', 4],
	] as const) {
		const all = await pieces(row('First', name));
		expect(all.map((piece) => [piece.width, piece.height])).toEqual(all.map(() => [6, 6]));
		expect(all.map((piece) => piece.corners)).toEqual(all.map(() => ['50%', '50%', '50%', '50%']));
		expect((await edges(row('First', name))).width).toBe(count * 7.5 - 1.5);
	}

	// One line, as tall as the text display beside it, and every text whole.
	const title = await edges(shapes.cell('First', 'title').locator('.display-formatted'));
	for (const name of ['pill_hundred', 'seg_hundred', 'bar_hundred', 'dot_hundred']) {
		const ours = await edges(shapes.display('First', name));
		expect(ours.bottom - ours.top).toBe(title.bottom - title.top);
		expect(await shown(shapes.number('First', name))).toBe('whole');
		expect((await edges(shapes.number('First', name))).left).toBeGreaterThan((await edges(row('First', name))).right);
	}

	// The second table: no number wanted, so as many as fit the bar, which is a number for each shape.
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${paints}`);
	await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);

	const others = table(page, PAINTS);
	const other = (title: string, name: string) => others.display(title, name).locator('.md-strip');

	for (const [name, shape, count] of [
		['pill_free', 'pills', 7],
		['seg_free', 'segments', 9],
		['bar_free', 'bars', 24],
		['dot_free', 'dots', 9],
	] as const) {
		expect(fits(72, SIZES.display[shape])).toBe(count);
		await expect(other('First', name).locator('> *')).toHaveCount(count);
		await expect(other('Third', name).locator('> *')).toHaveCount(count);
		expect((await pieces(other('First', name)))[0]!.width).toBeGreaterThanOrEqual(SIZES.display[shape][0]);
	}

	// Half of the range fills the nearest whole number of them.
	await expectFilledPieces(other('First', 'bar_free'), 24, 12);
	await expectFilledPieces(other('First', 'pill_free'), 7, 4);

	// Spread dots stand from one end of the bar's length to the other.
	const spread = await pieces(other('First', 'dot_spread'));
	const span = await edges(other('First', 'dot_spread'));
	expect(spread).toHaveLength(5);
	expect(span.width).toBe(72);
	expect(spread[0]!.left).toBe(span.left);
	expect(Math.abs(spread.at(-1)!.right - span.right)).toBeLessThan(0.5);
	expect(spread[1]!.left - spread[0]!.right).toBeGreaterThan(1.5);

	// Dots of its own, eight of them, on a field whose interface draws five pills: 50 fills four.
	await expectFilledPieces(other('First', 'look_own'), 8, 4);
	await expect(others.display('First', 'look_own').locator('.md-dots')).toHaveCount(1);

	// Options which were emptied are stored as null, and taken from the interface again: twelve bars, in steps,
	// with what is not filled faded.
	await expectFilledPieces(other('First', 'look_back'), 12, 6);
	await expect(others.display('First', 'look_back').locator('.md-bars')).toHaveCount(1);
	const back = await pieces(other('First', 'look_back'));
	const trackColour = rgb(await token(page, '--theme--form--field--input--border-color'));
	expect(back[0]!.color).toBe(RGB[RED]);
	expect(back[5]!.color).toBe(RGB[AMBER]);
	expectColour(await colourOf(page, other('First', 'look_back').locator('> *').nth(11)), faded(rgb(GREEN), trackColour));

	// The form of the same item draws by the interface: five pills, of which 50 fills three.
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'look_own')).toHaveText('50%');
	await expectFilledPieces(strip(page, 'look_own'), 5, 3);
	await expect(meter(page, 'look_own').locator('.mt-pills')).toHaveCount(1);
});

test('colouring by the place on the scale: steps, a gradient across the whole track, and what is not filled faded', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'paint_auto')).toHaveText('50%');

	const trackColour = rgb(await token(page, '--theme--form--field--input--border-color'));
	const piece = (name: string, index: number) => strip(page, name).locator('> *').nth(index);

	// Steps, 90 of a hundred in ten pills: nine are filled. Each has the colour of the value it reaches: red up to
	// 30, amber from 40 and green from 80. The tenth is not filled and plain.
	await expectFilledPieces(strip(page, 'paint_steps'), 10, 9);
	const stepped = await pieces(strip(page, 'paint_steps'));
	expect(stepped.map((each) => each.color)).toEqual([
		...Array(3).fill(RGB[RED]),
		...Array(4).fill(RGB[AMBER]),
		...Array(2).fill(RGB[GREEN]),
		`rgb(${trackColour.join(', ')})`,
	]);
	expectColour(await colourOf(page, piece('paint_steps', 2)), rgb(RED));
	expectColour(await colourOf(page, piece('paint_steps', 3)), rgb(AMBER));
	expectColour(await colourOf(page, piece('paint_steps', 9)), trackColour);

	// The same at 50 with what is not filled coloured as what is filled, which is in steps, and faded: five
	// filled, then two of faded amber and three of faded green. Faded is weaker and still not the plain track.
	await expectFilledPieces(strip(page, 'paint_auto'), 10, 5);
	expectColour(await colourOf(page, piece('paint_auto', 0)), rgb(RED));
	expectColour(await colourOf(page, piece('paint_auto', 4)), rgb(AMBER));
	expectColour(await colourOf(page, piece('paint_auto', 5)), faded(rgb(AMBER), trackColour));
	expectColour(await colourOf(page, piece('paint_auto', 6)), faded(rgb(AMBER), trackColour));
	expectColour(await colourOf(page, piece('paint_auto', 7)), faded(rgb(GREEN), trackColour));
	expectColour(await colourOf(page, piece('paint_auto', 9)), faded(rgb(GREEN), trackColour));
	expect(await colourOf(page, piece('paint_auto', 9))).not.toEqual(await colourOf(page, piece('paint_steps', 9)));

	// A gradient in ten pills: each shows its own tenth of the colours blended across the whole track, so the
	// middle of the first is nearly red and the middle of the fifth past amber, although only five are filled:
	// the blend is not squeezed into them. What is not filled goes on with the same blend, faded.
	await expectFilledPieces(strip(page, 'paint_blend'), 10, 5);
	for (const index of [0, 1, 3, 4]) expectColour(await colourOf(page, piece('paint_blend', index)), blended((index + 0.5) / 10), 6);
	for (const index of [5, 7, 9]) expectColour(await colourOf(page, piece('paint_blend', index)), faded(blended((index + 0.5) / 10), trackColour), 6);
	expect(await colourOf(page, piece('paint_blend', 0))).not.toEqual(await colourOf(page, piece('paint_blend', 4)));
	expect(await colourOf(page, piece('paint_blend', 5))).not.toEqual(await colourOf(page, piece('paint_blend', 9)));

	// Within one pill the colour goes on changing: its two ends differ.
	expect(await colourOf(page, piece('paint_blend', 2), 0.2)).not.toEqual(await colourOf(page, piece('paint_blend', 2), 0.8));

	// The one bar with a gradient, at 50: the fill shows the first half of the blend across the whole track, and
	// the track the rest of it, faded.
	await expect(strip(page, 'paint_bar')).toHaveCount(0);
	await expectFilled(track(page, 'paint_bar'), fill(page, 'paint_bar'), 0.5);
	for (const place of [0.1, 0.2, 0.3, 0.45]) expectColour(await colourOf(page, track(page, 'paint_bar'), place), blended(place), 6);
	for (const place of [0.55, 0.7, 0.9]) expectColour(await colourOf(page, track(page, 'paint_bar'), place), faded(blended(place), trackColour), 6);

	// The one bar in steps, at 90: the colour changes at once at 40 and at 80, and the track beyond is plain.
	await expectFilled(track(page, 'paint_stepped'), fill(page, 'paint_stepped'), 0.9);
	for (const [place, color] of [
		[0.1, RED],
		[0.38, RED],
		[0.42, AMBER],
		[0.78, AMBER],
		[0.82, GREEN],
		[0.88, GREEN],
	] as const) {
		expectColour(await colourOf(page, track(page, 'paint_stepped'), place), rgb(color));
	}
	expectColour(await colourOf(page, track(page, 'paint_stepped'), 0.95), trackColour);

	// One colour for what is filled, that of the value, and a faded tint of it for the track.
	expectColour(await colourOf(page, track(page, 'paint_tint'), 0.25), rgb(AMBER));
	expectColour(await colourOf(page, track(page, 'paint_tint'), 0.75), faded(rgb(AMBER), trackColour));

	// A field which sets none of this has the plain track and one colour.
	expectColour(await colourOf(page, track(page, 'tasks'), 0.95), trackColour);
	expectColour(await colourOf(page, track(page, 'plain'), 0.95), trackColour);

	// No value: nothing is tinted.
	expect((await pieces(strip(page, 'pill_none'))).map((each) => each.color)).toEqual(Array(5).fill('rgba(0, 0, 0, 0)'));

	// The display takes the colouring from the interface: five pills for ten, of which 50 fills three, in the
	// blend across the whole bar, and one bar which shows the blend and goes on with it, faded.
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${paints}`);
	await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);

	const { display, bar } = table(page, PAINTS);
	const blend = display('First', 'paint_blend').locator('.md-strip');
	await expectFilledPieces(blend, 5, 3);
	for (const index of [0, 2]) expectColour(await colourOf(page, blend.locator('> *').nth(index)), blended((index + 0.5) / 5), 8);
	expectColour(await colourOf(page, blend.locator('> *').nth(4)), faded(blended(0.9), trackColour), 8);

	for (const place of [0.2, 0.4]) expectColour(await colourOf(page, bar('First', 'paint_bar'), place), blended(place), 8);
	for (const place of [0.6, 0.9]) expectColour(await colourOf(page, bar('First', 'paint_bar'), place), faded(blended(place), trackColour), 8);
});

test('in a right-to-left page the pieces fill from the right, and the colours of the scale run from the right', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'pill_auto')).toHaveText('60%');

	const NAMES = ['pill_auto', 'seg_auto', 'bar_auto', 'dot_auto', 'dot_spread'];

	// Left to right first: the filled pieces are the leftmost.
	for (const name of NAMES) {
		const all = await pieces(strip(page, name));
		expect(all[0]!.left).toBe((await edges(meter(page, name))).left);
		expect(all.map((piece) => piece.left)).toEqual([...all.map((piece) => piece.left)].sort((a, b) => a - b));
	}

	await turn(page, 'rtl');
	await expect(meter(page, 'pill_auto')).toHaveCSS('direction', 'rtl');

	// Mirrored: the same three of five are filled, and they are the rightmost; the first piece is at the right edge.
	for (const name of NAMES) {
		const all = await pieces(strip(page, name));
		expect(all.map((piece) => piece.filled)).toEqual([true, true, true, false, false]);
		expect(Math.abs(all[0]!.right - (await edges(meter(page, name))).right)).toBeLessThan(0.5);
		expect(all.map((piece) => piece.left)).toEqual([...all.map((piece) => piece.left)].sort((a, b) => b - a));
	}

	// Spread dots still reach the other edge, and the round ends of a row of segments are its outer ends.
	const spread = await pieces(strip(page, 'dot_spread'));
	expect(Math.abs(spread.at(-1)!.left - (await edges(meter(page, 'dot_spread'))).left)).toBeLessThan(0.5);

	const segments = await pieces(strip(page, 'seg_auto'));
	expect(segments[0]!.corners).toEqual(['0px', '6px', '6px', '0px']);
	expect(segments.at(-1)!.corners).toEqual(['6px', '0px', '0px', '6px']);

	// The colours of the scale start at the right: the place is counted from the right edge.
	const trackColour = rgb(await token(page, '--theme--form--field--input--border-color'));
	for (const place of [0.1, 0.3, 0.45]) expectColour(await colourOf(page, track(page, 'paint_bar'), 1 - place), blended(place), 6);
	for (const place of [0.55, 0.9]) expectColour(await colourOf(page, track(page, 'paint_bar'), 1 - place), faded(blended(place), trackColour), 6);

	const blend = strip(page, 'paint_blend').locator('> *');
	for (const index of [0, 4]) expectColour(await colourOf(page, blend.nth(index)), blended((index + 0.5) / 10), 6);
	expectColour(await colourOf(page, blend.nth(9)), faded(blended(0.95), trackColour), 6);
	expectColour(await colourOf(page, blend.nth(2), 0.8), blended(0.22), 6);

	expectColour(await colourOf(page, track(page, 'paint_stepped'), 1 - 0.38), rgb(RED));
	expectColour(await colourOf(page, track(page, 'paint_stepped'), 1 - 0.42), rgb(AMBER));

	// The display, in the tables.
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${looks}`);
	await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);
	await turn(page, 'rtl');

	const { display, number } = table(page, LOOKS);
	await expect(display('First', 'pill_auto')).toHaveCSS('direction', 'rtl');

	for (const name of ['pill_auto', 'seg_auto', 'bar_auto', 'dot_auto']) {
		const row = display('First', name).locator('.md-strip');
		const all = await pieces(row);
		expect(all.map((piece) => piece.filled)).toEqual([true, true, true, false, false]);
		expect(Math.abs(all[0]!.right - (await edges(row)).right)).toBeLessThan(0.5);
		expect(all.map((piece) => piece.left)).toEqual([...all.map((piece) => piece.left)].sort((a, b) => b - a));
		expect((await edges(number('First', name))).right).toBeLessThan((await edges(row)).left);
	}

	await page.goto(`/admin/content/${COLLECTION}?bookmark=${paints}`);
	await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);
	await turn(page, 'rtl');

	const others = table(page, PAINTS);
	await expect(others.display('First', 'paint_bar')).toHaveCSS('direction', 'rtl');
	for (const place of [0.2, 0.4]) expectColour(await colourOf(page, others.bar('First', 'paint_bar'), 1 - place), blended(place), 8);
	expectColour(await colourOf(page, others.bar('First', 'paint_bar'), 1 - 0.9), faded(blended(0.9), trackColour), 8);
});

test('the options form of the look: the number and the layout only while they apply, and a display which can go back to its interface', async ({ page, api }) => {
	await api.patch(`/fields/${COLLECTION}/fresh`, { meta: { options: null, display_options: null } });

	await page.goto(`/admin/settings/data-model/${COLLECTION}/fresh`);

	const dialogs = page.locator('#dialog-outlet');
	const option = (name: string) => dialogs.locator(`.field[data-field="${name}"]`);
	const choose = async (name: string, choice: string) => {
		await option(name).locator('.v-input').click();
		await page.locator('.v-list-item', { hasText: choice }).last().click();
	};
	const save = () => dialogs.locator('.v-drawer').last().locator('header button').last().click();

	await dialogs.getByText('Interface', { exact: true }).first().click();

	// One bar: a dropdown with five choices, the two colourings, and no number or layout to ask for.
	await expect(option('visualization')).toHaveCount(1);
	await expect(option('activeColoring').locator('input')).toHaveValue('Value');
	await expect(option('inactiveColoring').locator('input')).toHaveValue('Plain');
	await expect(option('subdivisions')).toHaveCount(0);
	await expect(option('dotsLayout')).toHaveCount(0);

	// Bars: the number is asked for, from 2 and with no largest, and "Automatic" while it is empty. No layout.
	await choose('visualization', 'Bars');
	await expect(option('subdivisions').locator('input')).toHaveAttribute('type', 'number');
	await expect(option('subdivisions').locator('input')).toHaveAttribute('placeholder', 'Automatic');
	await expect(option('subdivisions').locator('input')).toHaveAttribute('min', '2');
	await expect(option('subdivisions').locator('input')).not.toHaveAttribute('max');
	await expect(option('subdivisions')).toContainText('The width is the ceiling');
	await expect(option('dotsLayout')).toHaveCount(0);

	// Dots: the layout as well.
	await choose('visualization', 'Dots');
	await expect(option('dotsLayout').locator('input')).toHaveValue('Packed');
	await choose('dotsLayout', 'Spread');
	await option('subdivisions').locator('input').fill('4');
	await choose('activeColoring', 'Steps');
	await choose('inactiveColoring', 'Automatic');

	// The form of the display takes all of it over, and shows it.
	await dialogs.getByText('Display', { exact: true }).first().click();
	await expect(option('visualization').locator('input')).toHaveValue('Dots');
	await expect(option('dotsLayout').locator('input')).toHaveValue('Spread');
	await expect(option('subdivisions').locator('input')).toHaveAttribute('placeholder', '4');
	await expect(option('subdivisions').locator('input')).toHaveValue('');
	await expect(option('activeColoring').locator('input')).toHaveValue('Steps');
	await expect(option('inactiveColoring').locator('input')).toHaveValue('Automatic');

	// Save the field: words and a number for the interface, nothing for the display.
	await save();
	await expect
		.poll(async () => (await api.get(`/fields/${COLLECTION}/fresh`)).meta.options)
		.toEqual({ visualization: 'dots', dotsLayout: 'spread', subdivisions: 4, activeColoring: 'steps', inactiveColoring: 'automatic' });
	expect((await api.get(`/fields/${COLLECTION}/fresh`)).meta.display_options).toBeNull();

	// The display gets a look of its own: pills, in which the layout of the dots is not asked for.
	await page.goto(`/admin/settings/data-model/${COLLECTION}/fresh`);
	await dialogs.getByText('Display', { exact: true }).first().click();
	await choose('visualization', 'Pills');
	await expect(option('dotsLayout')).toHaveCount(0);
	await expect(option('subdivisions')).toHaveCount(1);
	await save();
	await expect.poll(async () => (await api.get(`/fields/${COLLECTION}/fresh`)).meta.display_options).toEqual({ visualization: 'pills' });

	// And gives it up again: the dropdown of the display can be emptied, which is stored as null, shows what it
	// comes to as its placeholder, and brings back the layout of the interface's dots.
	await page.goto(`/admin/settings/data-model/${COLLECTION}/fresh`);
	await dialogs.getByText('Display', { exact: true }).first().click();
	await expect(option('visualization').locator('input')).toHaveValue('Pills');
	await choose('visualization', 'Deselect');
	await expect(option('visualization').locator('input')).toHaveValue('');
	await expect(option('visualization').locator('input')).toHaveAttribute('placeholder', 'Dots');
	await expect(option('dotsLayout').locator('input')).toHaveValue('Spread');
	await save();
	await expect.poll(async () => (await api.get(`/fields/${COLLECTION}/fresh`)).meta.display_options).toEqual({ visualization: null });

	// The dropdowns of the interface have nothing to go back to and cannot be emptied.
	await page.goto(`/admin/settings/data-model/${COLLECTION}/fresh`);
	await dialogs.getByText('Interface', { exact: true }).first().click();
	await option('visualization').locator('.v-input').click();
	await expect(page.locator('.v-list-item', { hasText: 'Contiguous' }).last()).toBeVisible();
	await expect(page.locator('.v-list-item', { hasText: 'Deselect' })).toHaveCount(0);
	await page.keyboard.press('Escape');

	// The item which holds 4 of a hundred draws four dots from edge to edge, none of them filled.
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'fresh')).toHaveText('4%');
	await expectFilledPieces(strip(page, 'fresh'), 4, 0);
	await expect(meter(page, 'fresh').locator('.mt-dots.mt-spread')).toHaveCount(1);

	// Put the field back, for the tests which count on it being one bar.
	await api.patch(`/fields/${COLLECTION}/fresh`, { meta: { options: null, display_options: null } });
});

// Editing. The meters of the collection made for it can be edited; every other meter of this spec is read-only.

/** The element on the line of the track, which is the slider of a meter that can be edited. */
const line = (page: Page, name: string) => meter(page, name).locator('> :first-child');

/** The point at a share of the width of a meter's track, on its middle line. */
async function pointAt(page: Page, name: string, share: number) {
	await line(page, name).scrollIntoViewIfNeeded();
	const area = (await line(page, name).boundingBox())!;
	return { x: area.x + area.width * share, y: area.y + area.height / 2, width: area.width };
}

/** A click at a share of the width of a meter's track. */
async function clickAt(page: Page, name: string, share: number) {
	const point = await pointAt(page, name, share);
	await page.mouse.click(point.x, point.y);
}

/**
 * A key pressed and released on an element which cannot have the focus. The release matters: the app keeps a list
 * of the keys which are down for its shortcuts, and one which never comes up again stops the shortcut for saving.
 */
async function keyOn(target: Locator, key: string) {
	await target.dispatchEvent('keydown', { key });
	await target.dispatchEvent('keyup', { key });
}

/**
 * The kinds of event an element listens to, as the tools of the browser report them. The form drops what a field
 * which cannot be edited hands it, so a meter which listened and wrote there would not show in the page: this
 * asks the browser whether it listens at all.
 */
async function listened(page: Page, target: Locator) {
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

const LISTENERS = ['keydown', 'pointercancel', 'pointerdown', 'pointerleave', 'pointermove', 'pointerup'];

/** Saves the item of the form with the keyboard, and gives what was sent, as the text and as the values. */
async function save(page: Page, collection: string) {
	const sent = page.waitForRequest((request) => request.method() === 'PATCH' && request.url().includes(`/items/${collection}/`));
	await page.keyboard.press('ControlOrMeta+s');
	const request = await sent;
	await expect(edited(page)).toHaveCount(0);
	return { text: request.postData() ?? '', values: request.postDataJSON() as Record<string, unknown> };
}

/** Puts the item of the tests of editing back as it was made, for the test which comes next. */
const EDIT_VALUES = {
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
};

/**
 * Opens the item of the tests of editing, and waits until the pointer can reach its form: the app fades out a
 * cover over the page for a moment after the form is there, and a click in that moment lands on the cover.
 */
async function openEdit(page: Page) {
	await openItem(page, EDIT, ids['Edit']!);
	await expect(text(page, 'whole')).toBeVisible();
	await expect(page.locator('.hydrating')).toHaveCount(0);
}

test.describe('a meter which can be edited', () => {
	test.beforeEach(async ({ api, page }) => {
		await api.patch(`/items/${EDIT}/${ids['Edit']}`, EDIT_VALUES);
		await openEdit(page);
		await expect(text(page, 'whole')).toHaveText('40%');
	});

	test('a click sets the value, the item saves it in the type of its field, and it survives a reload', async ({ page, api }) => {
		// A whole number on an integer field: a quarter of the way along 0 to 100.
		await clickAt(page, 'whole', 0.25);
		await expect(text(page, 'whole')).toHaveText('25%');
		await expectFilled(line(page, 'whole'), fill(page, 'whole'), 0.25);
		await expect(line(page, 'whole')).toHaveAttribute('aria-valuenow', '25');

		// Tenths on a float field, quarters on a decimal field, fifties on a big integer field.
		await clickAt(page, 'tenth', 0.31);
		await expect(text(page, 'tenth')).toHaveText('0.3');
		await clickAt(page, 'quarter', 0.33);
		await expect(text(page, 'quarter')).toHaveText('3.25');
		await clickAt(page, 'large', 0.33);
		await expect(text(page, 'large')).toHaveText('350');

		// A step of 2.4 on an integer field is a step of 2: 5.5 of 10 goes to 6 and not to 4.8 or 5.
		await clickAt(page, 'rounded', 0.55);
		await expect(text(page, 'rounded')).toHaveText('6');

		// Steps of 3 up to 10: 9 is on the grid, and the maximum can be had although it is not.
		await clickAt(page, 'thirds', 0.86);
		await expect(text(page, 'thirds')).toHaveText('9');
		await clickAt(page, 'thirds', 0.97);
		await expect(text(page, 'thirds')).toHaveText('10');

		// The step a stock Slider left behind: 5.
		await clickAt(page, 'fives', 0.62);
		await expect(text(page, 'fives')).toHaveText('60%');

		// The steps are counted from the minimum: half way along 1 to 10 is 5.5, which goes to 5 and not to 6.
		await clickAt(page, 'offset', 0.5);
		await expect(text(page, 'offset')).toHaveText('5');
		await clickAt(page, 'offset', 0.72);
		await expect(text(page, 'offset')).toHaveText('7');

		// The form marks each of them as changed, and nothing else.
		await expect(edited(page)).toHaveCount(8);

		// What is saved: plain numbers, as a stock Slider sends them for every type, with no dust in them.
		const sent = await save(page, EDIT);
		expect(sent.values).toEqual({ whole: 25, tenth: 0.3, quarter: 3.25, large: 350, rounded: 6, thirds: 10, fives: 60, offset: 7 });
		expect(sent.text).toContain('"tenth":0.3,');
		expect(sent.text).toContain('"quarter":3.25,');
		for (const value of Object.values(sent.values)) expect(typeof value).toBe('number');

		// What is stored, and what the form shows after a reload.
		const stored = await api.get(`/items/${EDIT}/${ids['Edit']}`);
		expect(stored).toMatchObject({ whole: 25, tenth: 0.3, quarter: 3.25, large: 350, rounded: 6, thirds: 10, fives: 60, offset: 7 });

		await page.reload();
		await expect(text(page, 'whole')).toHaveText('25%');
		await expect(page.locator('.hydrating')).toHaveCount(0);
		await expect(text(page, 'tenth')).toHaveText('0.3');
		await expect(text(page, 'quarter')).toHaveText('3.25');
		await expect(text(page, 'large')).toHaveText('350');
		await expect(edited(page)).toHaveCount(0);

		// A click where the value already is writes nothing: the form has no change.
		await clickAt(page, 'whole', 0.25);
		await clickAt(page, 'large', 0.35);
		await expect(text(page, 'whole')).toHaveText('25%');
		await expect(edited(page)).toHaveCount(0);
	});

	test('a drag follows the pointer, also when it leaves the field, and ends with the release', async ({ page }) => {
		const start = await pointAt(page, 'whole', 0.2);

		await page.mouse.move(start.x, start.y);
		await page.mouse.down();
		await expect(text(page, 'whole')).toHaveText('20%');

		// Along the track.
		await page.mouse.move(start.x + start.width * 0.4, start.y, { steps: 4 });
		await expect(text(page, 'whole')).toHaveText('60%');
		await expectFilled(line(page, 'whole'), fill(page, 'whole'), 0.6);

		// Far below the field: the value still follows the pointer sideways.
		await page.mouse.move(start.x + start.width * 0.1, start.y + 300, { steps: 4 });
		await expect(text(page, 'whole')).toHaveText('30%');

		// Past the end of the track and past its start: the maximum and the minimum, and nothing beyond.
		await page.mouse.move(start.x + start.width * 2, start.y + 100, { steps: 4 });
		await expect(text(page, 'whole')).toHaveText('100%');
		await page.mouse.move(start.x - start.width * 0.2 - 200, start.y - 50, { steps: 4 });
		await expect(text(page, 'whole')).toHaveText('0%');
		await expect(fill(page, 'whole')).toHaveCount(0);

		await page.mouse.move(start.x + start.width * 0.25, start.y + 40, { steps: 4 });
		await expect(text(page, 'whole')).toHaveText('45%');

		// Released: the pointer no longer sets anything.
		await page.mouse.up();
		await page.mouse.move(start.x + start.width * 0.6, start.y, { steps: 3 });
		await expect(text(page, 'whole')).toHaveText('45%');

		// Another button, and the same button with nothing under it, set nothing.
		await page.mouse.click(start.x, start.y, { button: 'right' });
		await page.keyboard.press('Escape');
		await page.mouse.click(start.x, start.y, { button: 'middle' });
		await expect(text(page, 'whole')).toHaveText('45%');

		// No text of the page was selected by any of it, and one field was changed.
		expect(await page.evaluate(() => String(getSelection()))).toBe('');
		await expect(edited(page)).toHaveCount(1);
		await expect(line(page, 'whole')).toHaveCSS('touch-action', 'pan-y');
		await expect(line(page, 'whole')).toHaveCSS('user-select', 'none');
	});

	test('segment input: a click on the nth piece fills n, and a drag to before the start gives the minimum', async ({ page }) => {
		const pill = (name: string, index: number) => line(page, name).locator('> *').nth(index);
		const middle = async (name: string, index: number) => {
			const area = (await pill(name, index).boundingBox())!;
			return { x: area.x + area.width / 2, y: area.y + area.height / 2, left: area.x, right: area.x + area.width };
		};

		await expectFilledPieces(line(page, 'five'), 5, 3);

		// A click on each pill fills up to it, and the value is that many of five.
		for (const filled of [5, 1, 4, 2]) {
			const point = await middle('five', filled - 1);
			await page.mouse.click(point.x, point.y);
			await expect(text(page, 'five')).toHaveText(`${filled} / 5`);
			await expectFilledPieces(line(page, 'five'), 5, filled);
		}

		// A click in the gap after the third pill counts for the third.
		const third = await middle('five', 2);
		await page.mouse.click(third.right + 2, third.y);
		await expect(text(page, 'five')).toHaveText('3 / 5');

		// A drag from the fourth pill to before the start of the first gives the minimum, and back in, one.
		const fourth = await middle('five', 3);
		const first = await middle('five', 0);
		await page.mouse.move(fourth.x, fourth.y);
		await page.mouse.down();
		await expect(text(page, 'five')).toHaveText('4 / 5');
		await page.mouse.move(first.left - 30, first.y + 20, { steps: 4 });
		await expect(text(page, 'five')).toHaveText('0 / 5');
		await expectFilledPieces(line(page, 'five'), 5, 0);
		await page.mouse.move(first.x, first.y, { steps: 2 });
		await expect(text(page, 'five')).toHaveText('1 / 5');
		await page.mouse.up();

		// Packed dots: the pieces are where the dots are. A click on the second dot fills two, and one on the
		// empty track far beyond the row of dots fills all five.
		const second = await middle('dots', 1);
		await page.mouse.click(second.x, second.y);
		await expect(text(page, 'dots')).toHaveText('2 / 5');
		await expectFilledPieces(line(page, 'dots'), 5, 2);

		await clickAt(page, 'dots', 0.5);
		await expect(text(page, 'dots')).toHaveText('5 / 5');
		await clickAt(page, 'dots', 0.95);
		await expect(text(page, 'dots')).toHaveText('5 / 5');

		const fourthDot = await middle('dots', 3);
		await page.mouse.click(fourthDot.x, fourthDot.y);
		await expect(text(page, 'dots')).toHaveText('4 / 5');

		// Ten pills for a hundred, filled by the piece because the option says so: the seventh is 70.
		await expect(line(page, 'forced')).toHaveClass(/mt-by-segment/);
		const seventh = await middle('forced', 6);
		await page.mouse.click(seventh.x, seventh.y);
		await expect(text(page, 'forced')).toHaveText('70%');
		await expectFilledPieces(line(page, 'forced'), 10, 7);

		// While the pointer rests over a piece, the pieces up to it are marked, and no longer when it has left.
		const hinted = line(page, 'five').locator('.mt-hint');
		await page.mouse.move(fourth.x, fourth.y);
		await expect(hinted).toHaveCount(4);
		await page.mouse.move(third.x, third.y);
		await expect(hinted).toHaveCount(3);
		await page.mouse.move(third.x, third.y + 80);
		await expect(hinted).toHaveCount(0);
		await expect(text(page, 'five')).toHaveText('1 / 5');
	});

	test('automatic fills by the piece where each piece is one step, and takes the value under the pointer otherwise', async ({ page }) => {
		// Five pieces for five steps, as pills and as dots: by the piece.
		await expect(line(page, 'five')).toHaveClass(/mt-by-segment/);
		await expect(line(page, 'dots')).toHaveClass(/mt-by-segment/);

		// One bar, and ten pills for a hundred steps: the value under the pointer.
		await expect(line(page, 'whole')).toHaveClass(/mt-by-contiguous/);
		await expect(line(page, 'hundred')).toHaveClass(/mt-by-contiguous/);
		await expectFilledPieces(line(page, 'hundred'), 10, 4);

		// 37% of the way along ten pills is 37, which a click on a piece could not give, and fills four of them.
		await clickAt(page, 'hundred', 0.37);
		await expect(text(page, 'hundred')).toHaveText('37%');
		await expectFilledPieces(line(page, 'hundred'), 10, 4);
		await clickAt(page, 'hundred', 0.93);
		await expect(text(page, 'hundred')).toHaveText('93%');
		await expectFilledPieces(line(page, 'hundred'), 10, 9);

		// No piece is marked under the pointer there, and none of the two is ever the relative method.
		await expect(line(page, 'hundred').locator('.mt-hint')).toHaveCount(0);
		for (const name of ['whole', 'five', 'dots', 'hundred']) await expect(line(page, name)).not.toHaveClass(/mt-by-relative/);

		// Only the option makes a meter relative.
		await expect(line(page, 'rel')).toHaveClass(/mt-by-relative/);
	});

	test('relative input: the press changes nothing, a drag changes the value by its distance times the sensitivity, and Shift is finer', async ({ page, playwright }) => {
		// The same steps in two browsers. The browser of these tests refuses to lock the pointer, so here the
		// meter works with a drag it has captured. The full browser grants the lock, and is started for this.
		const steps = async (page: Page, locks: boolean) => {
			const locked = () => page.evaluate(() => document.pointerLockElement !== null);
			const far = await pointAt(page, 'rel', 0.9);

			// A press far from where the fill ends, and a release, change nothing.
			await page.mouse.move(far.x, far.y);
			await page.mouse.down();
			await expect.poll(locked).toBe(locks);
			await page.mouse.up();
			await expect.poll(locked).toBe(false);
			await expect(text(page, 'rel')).toHaveText('40%');
			await expect(edited(page)).toHaveCount(0);

			// A fifth of the track towards the end is a fifth of the range, a tenth back is a tenth.
			const from = await pointAt(page, 'rel', 0.5);
			await page.mouse.move(from.x, from.y);
			await page.mouse.down();
			await expect.poll(locked).toBe(locks);
			await page.mouse.move(from.x + from.width * 0.2, from.y, { steps: 5 });
			await expect(text(page, 'rel')).toHaveText('60%');
			await page.mouse.move(from.x + from.width * 0.1, from.y + 60, { steps: 5 });
			await expect(text(page, 'rel')).toHaveText('50%');

			// With Shift the same fifth is a fiftieth: two steps.
			await page.keyboard.down('Shift');
			await page.mouse.move(from.x + from.width * 0.3, from.y, { steps: 5 });
			await expect(text(page, 'rel')).toHaveText('52%');
			await page.keyboard.up('Shift');

			// Released: the lock is given back, and the pointer sets nothing.
			await page.mouse.up();
			await expect.poll(locked).toBe(false);
			await page.mouse.move(from.x, from.y, { steps: 3 });
			await expect(text(page, 'rel')).toHaveText('52%');

			// Movements of a quarter of a step add up: forty of them are ten steps.
			const slow = await pointAt(page, 'rel', 0.3);
			await page.mouse.move(slow.x, slow.y);
			await page.mouse.down();
			await expect.poll(locked).toBe(locks);
			await page.mouse.move(slow.x + slow.width * 0.1, slow.y, { steps: 40 });
			await expect(text(page, 'rel')).toHaveText('62%');
			await page.mouse.up();

			// At a sensitivity of 2 a tenth of the track is a fifth of the range, and the range has ends.
			const fast = await pointAt(page, 'rel_fast', 0.2);
			await page.mouse.move(fast.x, fast.y);
			await page.mouse.down();
			await expect.poll(locked).toBe(locks);
			await page.mouse.move(fast.x + fast.width * 0.1, fast.y, { steps: 5 });
			await expect(text(page, 'rel_fast')).toHaveText('60%');
			await page.mouse.move(fast.x + fast.width * 0.6, fast.y, { steps: 5 });
			await expect(text(page, 'rel_fast')).toHaveText('100%');
			await page.mouse.move(fast.x + fast.width * 0.55, fast.y, { steps: 5 });
			await expect(text(page, 'rel_fast')).toHaveText('90%');

			// Escape puts back what the field held before the press.
			await page.keyboard.press('Escape');
			await expect(text(page, 'rel_fast')).toHaveText('40%');
			await expect.poll(locked).toBe(false);
			await page.mouse.move(fast.x, fast.y, { steps: 3 });
			await page.mouse.up();
			await expect(text(page, 'rel_fast')).toHaveText('40%');
			await expect(edited(page)).toHaveCount(1);
		};

		// The fall-back: no lock, a captured drag.
		expect(await line(page, 'rel').evaluate((element) => typeof element.requestPointerLock)).toBe('function');
		await steps(page, false);
		await expect(line(page, 'rel')).toHaveCSS('cursor', 'ew-resize');

		// The real thing, in the full browser, signed in as the pages of these tests are.
		const browser = await playwright.chromium.launch({ channel: 'chromium' }).catch(() => null);
		test.info().annotations.push({ type: 'pointer lock', description: browser ? 'granted in the full browser, refused in the browser of the tests' : 'the full browser could not be started' });
		if (browser === null) return;

		try {
			const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1440, height: 900 } });
			await context.addCookies([{ name: 'license-banner-dismissed', value: 'true', url: BASE_URL }]);
			expect((await context.request.post('/auth/login', { data: { ...ADMIN, mode: 'session' } })).ok()).toBe(true);

			const full = await context.newPage();
			const errors: string[] = [];
			full.on('pageerror', (error) => errors.push(String(error)));

			await openEdit(full);
			await expect(text(full, 'rel')).toHaveText('40%');
			await steps(full, true);

			// A lock which ends while the button is held was ended by the browser, as it does on Escape, and
			// counts as Escape: the value from before the press is back.
			const point = await pointAt(full, 'rel', 0.5);
			await expect(text(full, 'rel')).toHaveText('62%');
			await full.mouse.move(point.x, point.y);
			await full.mouse.down();
			await expect.poll(() => full.evaluate(() => document.pointerLockElement?.getAttribute('role'))).toBe('slider');
			await full.mouse.move(point.x + point.width * 0.2, point.y, { steps: 5 });
			await expect(text(full, 'rel')).toHaveText('82%');
			await full.evaluate(() => document.exitPointerLock());
			await expect(text(full, 'rel')).toHaveText('62%');
			await full.mouse.move(point.x + point.width * 0.4, point.y, { steps: 5 });
			await full.mouse.up();
			await expect(text(full, 'rel')).toHaveText('62%');

			expect(errors).toEqual([]);
		} finally {
			await browser.close();
		}
	});

	test('the keys: arrows, the Page keys, Home and End, and Left and Right the other way round in a right-to-left page', async ({ page }) => {
		// A slider with a name, a range, a value and its text, which the Tab key reaches from the label of its field.
		const slider = fieldOf(page, 'whole').getByRole('slider', { name: 'Whole', exact: true });
		await expect(slider).toHaveAttribute('aria-valuemin', '0');
		await expect(slider).toHaveAttribute('aria-valuemax', '100');
		await expect(slider).toHaveAttribute('aria-valuenow', '40');
		await expect(slider).toHaveAttribute('aria-valuetext', '40%');
		await expect(slider).toHaveAttribute('aria-orientation', 'horizontal');
		await expect(slider).toHaveAttribute('tabindex', '0');
		await expect(fieldOf(page, 'whole').getByRole('meter')).toHaveCount(0);

		// Named by its caption where it has one.
		await expect(fieldOf(page, 'twin_live').getByRole('slider', { name: 'A caption', exact: true })).toHaveCount(1);

		await fieldOf(page, 'whole').locator('button.field-name').focus();
		await page.keyboard.press('Tab');
		await expect(slider).toBeFocused();

		// The focus of the keyboard shows as a ring in the colour of a focused input, which takes no room.
		await expect(slider).toHaveCSS('outline-style', 'solid');
		await expect(slider).toHaveCSS('outline-width', '2px');
		expect(await slider.evaluate((element) => getComputedStyle(element).outlineColor)).toBe(await token(page, '--theme--form--field--input--border-color-focus'));
		const area = await edges(meter(page, 'whole'));
		expect(area.bottom - area.top).toBe(54);

		const press = async (key: string, expected: string) => {
			await page.keyboard.press(key);
			await expect(text(page, 'whole')).toHaveText(expected);
		};

		await press('ArrowRight', '41%');
		await press('ArrowUp', '42%');
		await press('ArrowLeft', '41%');
		await press('ArrowDown', '40%');
		await press('PageUp', '50%');
		await press('PageDown', '40%');
		await press('End', '100%');
		await press('ArrowRight', '100%');
		await press('Home', '0%');
		await press('ArrowLeft', '0%');
		await press('PageDown', '0%');
		await press('ArrowRight', '1%');
		await expect(slider).toHaveAttribute('aria-valuenow', '1');
		await expect(slider).toHaveAttribute('aria-valuetext', '1%');

		// Keys which are not the meter's change nothing, and neither do the meter's keys with a modifier.
		for (const key of ['Space', 'Enter', 'a', '5', 'Delete', 'Control+ArrowRight', 'Alt+ArrowRight']) await press(key, '1%');
		await expect(slider).toBeFocused();

		// Steps of a tenth, without dust.
		await line(page, 'tenth').focus();
		for (const expected of ['0.6', '0.7', '0.8']) {
			await page.keyboard.press('ArrowRight');
			await expect(text(page, 'tenth')).toHaveText(expected);
		}

		// Steps of 3 up to 10: up from 9 is the maximum, and down from it is 9 again.
		await line(page, 'thirds').focus();
		for (const [key, expected] of [
			['ArrowRight', '9'],
			['ArrowRight', '10'],
			['ArrowLeft', '9'],
			['ArrowLeft', '6'],
			['End', '10'],
			['Home', '0'],
		] as const) {
			await page.keyboard.press(key);
			await expect(text(page, 'thirds')).toHaveText(expected);
		}

		// Ten pills for a hundred: a Page key is one pill, ten, which is no more than ten steps. Five pills for
		// five: ten steps are more than the range.
		await line(page, 'hundred').focus();
		await page.keyboard.press('PageUp');
		await expect(text(page, 'hundred')).toHaveText('50%');
		await line(page, 'five').focus();
		await page.keyboard.press('ArrowRight');
		await expect(text(page, 'five')).toHaveText('4 / 5');
		await page.keyboard.press('PageDown');
		await expect(text(page, 'five')).toHaveText('0 / 5');

		// The relative method has the same keys.
		await line(page, 'rel').focus();
		await page.keyboard.press('ArrowRight');
		await expect(text(page, 'rel')).toHaveText('41%');

		// A right-to-left page: Left is up and Right is down; Up, Down and the others stay.
		await turn(page, 'rtl');
		await expect(meter(page, 'whole')).toHaveCSS('direction', 'rtl');
		await slider.focus();
		await press('ArrowLeft', '2%');
		await press('ArrowLeft', '3%');
		await press('ArrowRight', '2%');
		await press('ArrowUp', '3%');
		await press('ArrowDown', '2%');
		await press('PageUp', '12%');
		await press('End', '100%');
		await press('Home', '0%');

		// And the pointer counts from the right: a click a quarter in from the right edge is 25.
		await clickAt(page, 'whole', 0.75);
		await expect(text(page, 'whole')).toHaveText('25%');
		await clickAt(page, 'five', 0.9);
		await expect(text(page, 'five')).toHaveText('1 / 5');

		// The data of the item is what the keys left: the keys never wrote anything else.
		const sent = await save(page, EDIT);
		expect(sent.values).toEqual({ whole: 25, tenth: 0.8, thirds: 0, hundred: 50, five: 1, rel: 41 });
	});

	test('Escape during a drag puts back the value from before the press', async ({ page }) => {
		const start = await pointAt(page, 'whole', 0.2);

		await page.mouse.move(start.x, start.y);
		await page.mouse.down();
		await expect(text(page, 'whole')).toHaveText('20%');
		await page.mouse.move(start.x + start.width * 0.5, start.y, { steps: 4 });
		await expect(text(page, 'whole')).toHaveText('70%');

		await page.keyboard.press('Escape');
		await expect(text(page, 'whole')).toHaveText('40%');
		await expectFilled(line(page, 'whole'), fill(page, 'whole'), 0.4);

		// The drag is over: the pointer sets nothing until it is pressed again, and the form has no change.
		await page.mouse.move(start.x + start.width * 0.3, start.y, { steps: 3 });
		await expect(text(page, 'whole')).toHaveText('40%');
		await page.mouse.up();
		await expect(text(page, 'whole')).toHaveText('40%');
		await expect(edited(page)).toHaveCount(0);

		// A field without a value is without one again.
		const point = await pointAt(page, 'none', 0.5);
		await page.mouse.move(point.x, point.y);
		await page.mouse.down();
		await expect(text(page, 'none')).toHaveText('50%');
		await page.keyboard.press('Escape');
		await expect(text(page, 'none')).toHaveText('—');
		await page.mouse.up();
		await expect(meter(page, 'none')).toHaveClass(/mt-empty/);

		// Escape with no drag is not the meter's: a press and release, then Escape, keeps the value.
		await clickAt(page, 'whole', 0.3);
		await page.keyboard.press('Escape');
		await expect(text(page, 'whole')).toHaveText('30%');
	});

	test('a read-only field and a field which a condition closes do not change, are not focusable and keep the role of a meter', async ({ page }) => {
		const locked = line(page, 'twin_locked');

		// The reading it always was: the role of a meter, the attributes and the class it had, no tab stop, no
		// handle, no cursor.
		await expect(fieldOf(page, 'twin_locked').getByRole('meter', { name: 'A caption', exact: true })).toHaveCount(1);
		await expect(fieldOf(page, 'twin_locked').getByRole('slider')).toHaveCount(0);
		expect((await attributes(locked)).sort()).toEqual(['aria-labelledby', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow', 'aria-valuetext', 'class', 'role']);
		expect(await locked.getAttribute('class')).toBe('mt-track');
		expect(await meter(page, 'twin_locked').evaluate((element) => element.querySelectorAll('[tabindex], .mt-handle, .mt-hint').length)).toBe(0);
		await expect(locked).toHaveCSS('cursor', 'auto');
		await expect(locked).toHaveCSS('touch-action', 'auto');

		// It does not listen to anything, where the same meter which can be edited listens to the pointer and the keys.
		expect(await listened(page, locked)).toEqual([]);
		expect(await listened(page, line(page, 'twin_live'))).toEqual(LISTENERS);

		// Nothing done to it changes it: a click, a drag, a double click, and keys while the pointer is over it.
		const point = await pointAt(page, 'twin_locked', 0.8);
		await page.mouse.click(point.x, point.y);
		await page.mouse.dblclick(point.x, point.y);
		await page.mouse.move(point.x, point.y);
		await page.mouse.down();
		await page.mouse.move(point.x - point.width * 0.5, point.y, { steps: 4 });
		await page.mouse.up();
		await page.keyboard.press('ArrowRight');
		await locked.dispatchEvent('pointerdown', { button: 0, isPrimary: true, clientX: point.x, clientY: point.y, pointerId: 1 });
		for (const key of ['ArrowRight', 'End', 'Home', 'PageUp', 'Escape']) await keyOn(locked, key);
		await expect(text(page, 'twin_locked')).toHaveText('40%');
		await expect(edited(page)).toHaveCount(0);

		// The Tab key passes it by: from the label of its field it goes on to something which is not in the meter.
		await fieldOf(page, 'twin_locked').locator('button.field-name').focus();
		await page.keyboard.press('Tab');
		expect(await meter(page, 'twin_locked').evaluate((element) => element.contains(document.activeElement))).toBe(false);

		// Beside it, the same meter which can be edited is drawn the same: every box in the same place in its
		// field, the same colours, the same height, the note level. It is a slider, and has a handle which shows
		// only under the pointer or the focus of the keyboard.
		const boxes = (name: string) =>
			fieldOf(page, name).evaluate((element) => {
				const origin = element.getBoundingClientRect();
				const parts = ['.meter', '.meter > :first-child', '.mt-fill', '.mt-line', '.mt-caption', '.mt-text', '.type-note'];

				return parts.map((selector) => {
					const area = element.querySelector(selector)!.getBoundingClientRect();
					return [area.left - origin.left, area.top - origin.top, area.width, area.height];
				});
			});

		const twins = await Promise.all([boxes('twin_live'), boxes('twin_locked')]);
		expect(twins[0]).toEqual(twins[1]);
		expect(twins[0]![0]![3]).toBe(54);
		expect(twins[0]![1]![3]).toBe(12);
		await expect(fieldOf(page, 'twin_live').getByText('A note under a meter.')).toBeVisible();
		expect(await page.evaluate(() => { const top = (name: string) => document.querySelector(`main .v-form .field[data-field="${name}"]`)!.getBoundingClientRect().top; return top('twin_live') - top('twin_locked'); })).toBe(0);

		for (const property of ['backgroundColor', 'borderRadius', 'opacity', 'overflow'] as const) {
			expect(await line(page, 'twin_live').evaluate((element, name) => getComputedStyle(element)[name], property)).toBe(await locked.evaluate((element, name) => getComputedStyle(element)[name], property));
			expect(await fill(page, 'twin_live').evaluate((element, name) => getComputedStyle(element)[name], property)).toBe(await fill(page, 'twin_locked').evaluate((element, name) => getComputedStyle(element)[name], property));
		}

		const handle = line(page, 'twin_live').locator('.mt-handle');
		await expect(handle).toHaveCount(1);
		await page.mouse.move(point.x, point.y);
		await expect(handle).toBeHidden();
		await expect(line(page, 'twin_live')).toHaveCSS('cursor', 'pointer');

		// Under the pointer the handle shows, a dot inside the track where the fill ends, and nothing has moved.
		const over = await pointAt(page, 'twin_live', 0.9);
		await page.mouse.move(over.x, over.y);
		await expect(handle).toBeVisible();
		// Measured in one go: the handle against the track and the end of the fill.
		const dotOf = () =>
			line(page, 'twin_live').evaluate((element) => {
				const bar = element.getBoundingClientRect();
				const dot = element.querySelector('.mt-handle')!.getBoundingClientRect();
				const end = element.querySelector('.mt-fill')?.getBoundingClientRect().right ?? bar.left;
				return { width: dot.width, height: dot.height, top: dot.top - bar.top, left: dot.left - bar.left, right: bar.right - dot.right, fromEnd: end - dot.right };
			});

		const dot = await dotOf();
		expect(dot.width).toBe(8);
		expect(dot.height).toBe(8);
		expect(dot.top).toBe(2);
		expect(Math.abs(dot.fromEnd - 2)).toBeLessThan(0.5);
		expect(await boxes('twin_live')).toEqual(twins[1]);
		await page.mouse.move(over.x, over.y + 100);
		await expect(handle).toBeHidden();

		// With the focus of the keyboard it shows as well, and stays inside the track at both ends of the range.
		await fieldOf(page, 'twin_live').locator('button.field-name').focus();
		await page.keyboard.press('Tab');
		await expect(line(page, 'twin_live')).toBeFocused();
		await expect(handle).toBeVisible();
		await page.keyboard.press('Home');
		await expect(text(page, 'twin_live')).toHaveText('0%');
		expect((await dotOf()).left).toBe(2);
		await page.keyboard.press('End');
		await expect(text(page, 'twin_live')).toHaveText('100%');
		expect(Math.abs((await dotOf()).right - 2)).toBeLessThan(0.5);
		await page.keyboard.press('Home');
		for (let index = 0; index < 4; index++) await page.keyboard.press('PageUp');
		await expect(text(page, 'twin_live')).toHaveText('40%');

		// A field which a condition makes read-only: a slider while the rule does not match.
		await expect(fieldOf(page, 'gated').getByRole('slider')).toHaveCount(1);
		await clickAt(page, 'gated', 0.6);
		await expect(text(page, 'gated')).toHaveText('60%');

		// The rule matches once `whole` is 50 or more: at once it is a meter again, with no tab stop, and nothing
		// done to it changes it.
		await clickAt(page, 'whole', 0.5);
		await expect(text(page, 'whole')).toHaveText('50%');
		await expect(fieldOf(page, 'gated').getByRole('meter')).toHaveCount(1);
		await expect(fieldOf(page, 'gated').getByRole('slider')).toHaveCount(0);
		expect(await meter(page, 'gated').evaluate((element) => element.querySelectorAll('[tabindex], .mt-handle').length)).toBe(0);
		expect(await line(page, 'gated').getAttribute('class')).toBe('mt-track');
		expect(await listened(page, line(page, 'gated'))).toEqual([]);
		await clickAt(page, 'gated', 0.2);
		const gate = await pointAt(page, 'gated', 0.3);
		await page.mouse.move(gate.x, gate.y);
		await page.mouse.down();
		await page.mouse.move(gate.x + 60, gate.y, { steps: 3 });
		await page.mouse.up();
		for (const key of ['End', 'ArrowRight', 'PageUp']) await keyOn(line(page, 'gated'), key);
		await expect(text(page, 'gated')).toHaveText('60%');

		// Open again once the rule no longer matches.
		await clickAt(page, 'whole', 0.3);
		await expect(fieldOf(page, 'gated').getByRole('slider')).toHaveCount(1);
		expect(await listened(page, line(page, 'gated'))).toEqual(LISTENERS);
		await clickAt(page, 'gated', 0.2);
		await expect(text(page, 'gated')).toHaveText('20%');

		// Only the fields which could be edited were: the read-only twin is not among what is saved.
		const sent = await save(page, EDIT);
		expect(Object.keys(sent.values).sort()).toEqual(['gated', 'whole']);
	});

	test('in the comparison of two revisions no meter can be edited', async ({ page, api }) => {
		// Two more revisions of the item, and the form again, which reads them when it opens.
		await api.patch(`/items/${EDIT}/${ids['Edit']}`, { whole: 80 });
		await api.patch(`/items/${EDIT}/${ids['Edit']}`, { whole: 40 });
		await openEdit(page);

		await page.getByText('Revisions', { exact: true }).first().click();
		await page.locator('.revision-item').nth(1).click();

		// The comparison shows the fields of the item as the form does, and none of them may be edited there:
		// every meter is a meter, with no tab stop, no handle and no cursor, the ones which the form edits too.
		const dialogs = page.locator('#dialog-outlet');
		const shown = dialogs.locator('.field[data-field="whole"] .meter > :first-child');
		await expect(shown.first()).toBeVisible();
		expect(await dialogs.locator('.meter').count()).toBeGreaterThan(10);
		await expect(dialogs.getByRole('slider')).toHaveCount(0);
		expect(await dialogs.locator('.meter').evaluateAll((meters) => meters.filter((each) => each.querySelector('[tabindex], .mt-handle, .mt-live, .mt-hint')).length)).toBe(0);
		expect(await dialogs.locator('.meter > :first-child').evaluateAll((lines) => [...new Set(lines.map((each) => each.getAttribute('role')))])).toEqual(['meter']);

		// None of them listens to anything.
		for (const each of await dialogs.locator('.meter > :first-child').all()) expect(await listened(page, each)).toEqual([]);

		// A click, a drag and a key on one of them change nothing.
		const before = await dialogs.locator('.field[data-field="whole"] .mt-text').allInnerTexts();
		const area = (await shown.first().boundingBox())!;
		await page.mouse.click(area.x + area.width * 0.9, area.y + area.height / 2);
		await page.mouse.move(area.x + area.width * 0.2, area.y + area.height / 2);
		await page.mouse.down();
		await page.mouse.move(area.x + area.width * 0.6, area.y + area.height / 2, { steps: 3 });
		await page.mouse.up();
		await keyOn(shown.first(), 'End');
		expect(await dialogs.locator('.field[data-field="whole"] .mt-text').allInnerTexts()).toEqual(before);
		await expect(shown.first()).toHaveCSS('cursor', 'auto');
	});

	test('a field without a value takes one from the first click, and a value beyond the range comes into it', async ({ page }) => {
		// No value: the dashed track and a dash, and no value for assistive technology.
		await expect(meter(page, 'none')).toHaveClass(/mt-empty/);
		await expect(text(page, 'none')).toHaveText('—');
		await expect(line(page, 'none')).not.toHaveAttribute('aria-valuenow');
		await expect(fieldOf(page, 'none').getByRole('slider', { name: 'None', exact: true })).toHaveCount(1);

		await clickAt(page, 'none', 0.5);
		await expect(text(page, 'none')).toHaveText('50%');
		await expect(meter(page, 'none')).not.toHaveClass(/mt-empty/);
		await expect(line(page, 'none')).toHaveAttribute('aria-valuenow', '50');

		// 150 of a hundred is shown as it is, as before: the bar full, the text beyond a hundred.
		await expect(text(page, 'outside')).toHaveText('150%');
		await expect(line(page, 'outside')).toHaveAttribute('aria-valuenow', '100');
		await expectFilled(line(page, 'outside'), fill(page, 'outside'), 1);

		// A click at the very end writes the maximum, since the field holds something else.
		await clickAt(page, 'outside', 0.999);
		await expect(text(page, 'outside')).toHaveText('100%');

		const sent = await save(page, EDIT);
		expect(sent.values).toEqual({ none: 50, outside: 100 });
	});

	test('the first key gives a field without a value one, and brings a value from beyond the range into it', async ({ page }) => {
		// A step down from 150 is one step under the maximum. A step down from nothing is the minimum.
		await line(page, 'outside').focus();
		await page.keyboard.press('ArrowLeft');
		await expect(text(page, 'outside')).toHaveText('99%');

		await line(page, 'none').focus();
		await page.keyboard.press('ArrowLeft');
		await expect(text(page, 'none')).toHaveText('0%');
		await page.keyboard.press('ArrowRight');
		await expect(text(page, 'none')).toHaveText('1%');

		const sent = await save(page, EDIT);
		expect(sent.values).toEqual({ outside: 99, none: 1 });
	});

	test('the options form of editing: the method, the step, and the sensitivity only for the relative method', async ({ page, api }) => {
		await page.goto(`/admin/settings/data-model/${EDIT}/fives`);

		const dialogs = page.locator('#dialog-outlet');
		const option = (name: string) => dialogs.locator(`.field[data-field="${name}"]`);

		await dialogs.getByText('Interface', { exact: true }).first().click();

		// Automatic until another is chosen; the step shows the step the Slider left behind; no sensitivity.
		await expect(option('input').locator('input')).toHaveValue('Automatic');
		await expect(option('step').locator('input')).toHaveAttribute('type', 'number');
		await expect(option('step').locator('input')).toHaveAttribute('placeholder', '5');
		await expect(option('step').locator('input')).toHaveValue('');
		await expect(option('sensitivity')).toHaveCount(0);

		await option('input').locator('.v-input').click();
		await expect(page.locator('.v-list-item', { hasText: 'Segment' }).last()).toBeVisible();
		await page.locator('.v-list-item', { hasText: 'Relative' }).last().click();
		await expect(option('sensitivity').locator('input')).toHaveAttribute('placeholder', '1');
		await option('sensitivity').locator('input').fill('2');
		await option('step').locator('input').fill('10');

		// The display is not edited, and has none of the three.
		await dialogs.getByText('Display', { exact: true }).first().click();
		await expect(option('visualization')).toHaveCount(1);
		for (const name of ['input', 'step', 'sensitivity']) await expect(option(name)).toHaveCount(0);

		await dialogs.locator('.v-drawer').last().locator('header button').last().click();
		await expect.poll(async () => (await api.get(`/fields/${EDIT}/fives`)).meta.options).toEqual({ stepInterval: 5, input: 'relative', sensitivity: 2, step: 10 });

		// The item draws by them: relative, in steps of 10, twice as fast.
		await openEdit(page);
		await expect(text(page, 'fives')).toHaveText('40%');
		await expect(line(page, 'fives')).toHaveClass(/mt-by-relative/);
		const point = await pointAt(page, 'fives', 0.5);
		await page.mouse.move(point.x, point.y);
		await page.mouse.down();
		await expect(text(page, 'fives')).toHaveText('40%');
		await page.mouse.move(point.x + point.width * 0.13, point.y, { steps: 4 });
		await expect(text(page, 'fives')).toHaveText('70%');
		await page.mouse.up();

		// Put the field back, for the tests which count on its step of 5.
		await api.patch(`/fields/${EDIT}/fives`, { meta: { options: { stepInterval: 5 } } });
	});
});
