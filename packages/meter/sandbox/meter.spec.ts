// Browser tests of the Meter bundle in the sandbox Directus
// (see ../../../sandbox/README.md). They cover what the unit tests cannot:
// that the built bundle loads in a real Data Studio, that the interface draws
// every state with the right share of the track filled, and that the display
// draws in a layout and in a template, also where nothing was configured.
import { expect, openItem, test } from '../../../sandbox/support/fixtures.ts';

type Page = Parameters<typeof openItem>[0];
type Locator = ReturnType<Page['locator']>;

const COLLECTION = 'sandbox_meter';

// A collection which points at the first with a many-to-one, to show the display inside a template of related values.
const OWNERS = 'sandbox_meter_owner';

const RED = '#E35169';
const AMBER = '#FFA439';
const GREEN = '#2ECDA7';

// The colours as the browser reports them.
const RGB = { [RED]: 'rgb(227, 81, 105)', [AMBER]: 'rgb(255, 164, 57)', [GREEN]: 'rgb(46, 205, 167)' };

const THRESHOLDS = [
	{ value: 10, color: GREEN },
	{ value: 6, color: AMBER },
];

/** A field on the Meter interface and display, half as wide as the form. */
const field = (name: string, options: object | null = null, meta: object = {}, type = 'integer', schema: object = {}) => ({
	field: name,
	type,
	schema,
	meta: { interface: 'meter', display: 'meter', width: 'half', options, ...meta },
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

test.beforeAll(async ({ api }) => {
	// The collection which points at the other has to go first.
	await api.drop(OWNERS, COLLECTION);

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
	};

	ids['First'] = (await api.post(`/items/${COLLECTION}`, { ...values, title: 'First' })).id;
	ids['Second'] = (await api.post(`/items/${COLLECTION}`, { ...values, title: 'Second', plain: 5, tasks: 3, ruled: 60, muted: 9 })).id;
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
