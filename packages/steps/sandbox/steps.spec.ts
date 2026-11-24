// Browser tests of the Steps bundle in the sandbox Directus
// (see ../../../sandbox/README.md). They cover what the unit tests cannot:
// that the built bundle loads in a real Data Studio, that the track draws
// every state, that a click or a key press ends up in the saved item in the
// type of the field, and that the display draws in a layout.
import { expect, openItem, test } from '../../../sandbox/support/fixtures.ts';

type Page = Parameters<typeof openItem>[0];

const COLLECTION = 'sandbox_steps';

const STAGES = [
	{ text: 'Draft', value: 'draft' },
	{ text: 'In review', value: 'review' },
	{ text: 'Approved', value: 'approved' },
	{ text: 'Published', value: 'published' },
];

// What the options form writes for an integer field: numbers.
const PHASES = [
	{ text: 'Backlog', value: 1 },
	{ text: 'Planned', value: 2 },
	{ text: 'Building', value: 3 },
	{ text: 'Shipped', value: 4 },
];

// An integer field whose steps hold text, as a schema written by hand or by another interface can.
const GRADES = [
	{ text: 'Low', value: '1' },
	{ text: 'Medium', value: '2' },
	{ text: 'High', value: '3' },
];

// The choices of a stock Dropdown, `color` included.
const DELIVERY = [
	{ text: 'Ordered', value: 'ordered', icon: 'shopping_cart', color: '#2ECDA7' },
	{ text: 'Packed', value: 'packed', icon: 'inventory_2', color: '#FFA439' },
	{ text: 'Sent', value: 'sent', icon: 'local_shipping', color: null },
	{ text: 'Delivered', value: 'delivered', icon: 'home' },
];

// A name the icon set does not have, which the app draws as text.
const ODD = [
	{ text: 'Checked', value: 'a', icon: 'check' },
	{ text: 'Unknown', value: 'b', icon: 'no_such_icon_name_at_all' },
	{ text: 'Numbered', value: 'c' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((text) => ({
	text,
	value: text.toLowerCase(),
}));

const LONG_LABEL = 'Waiting for the second reviewer to confirm that every change of the first round was made. '.repeat(3).trim();
const LONG_WORD = 'Supercalifragilisticexpialidociousnesses!';

const WORDY = [
	{ text: LONG_LABEL, value: 'long' },
	{ text: LONG_WORD, value: 'word' },
	{ text: 'Short', value: 'short' },
];

// Entries which are left out: a value an earlier step has, and no value. The last has no text.
const MESSY = [
	{ text: 'First', value: 'one' },
	{ text: 'Again', value: 'one' },
	{ text: 'Nothing' },
	{ text: '', value: 'two' },
];

// Some steps with a text and some without. The last carries a key which hid the label of a step before the field had
// an option for it; it is ignored, like any key an entry may hold.
const MIXED = [
	{ text: 'Start', value: 'a' },
	{ value: 'b' },
	{ text: '', value: 'c' },
	{ text: 'End', value: 'd', showLabel: false },
];

// Steps without a text: there is no label to show, whatever the field says about labels.
const NAMELESS = [{ value: 'low' }, { value: 'mid' }, { value: 'high' }];

/** A field on the Steps interface and display, half as wide as the form. */
const field = (name: string, choices: object[] | undefined, meta: object = {}, type = 'string', schema: object = {}) => ({
	field: name,
	type,
	schema,
	meta: { interface: 'steps', display: 'steps', width: 'half', options: choices ? { choices } : null, ...meta },
});

// What the layout shows, in this order.
const COLUMNS = ['title', 'stage', 'phase', 'grade', 'delivery', 'year', 'stray', 'empty', 'stock'];

// The day both items are on in the calendar, and what the calendar writes on an entry.
const DAY = '2026-03-12';
const TITLE = '{{title}}: {{stage}} | {{grade}} | {{year}} | {{stray}} | {{stock}} | {{empty}}';

// The item the tests change, and one which stays as it was seeded.
let id: number;
let still: number;

// The bookmark which shows the collection as a calendar.
let calendar: number;

test.beforeAll(async ({ api }) => {
	await api.drop(COLLECTION);

	await api.post('/collections', {
		collection: COLLECTION,
		meta: { icon: 'step', display_template: '{{title}}' },
		schema: {},
		fields: [
			{
				field: 'id',
				type: 'integer',
				schema: { is_primary_key: true, has_auto_increment: true },
				meta: { hidden: true },
			},
			// A stock input and a stock Dropdown beside the tracks, to compare them with.
			field('stage', STAGES),
			{ field: 'title', type: 'string', schema: {}, meta: { interface: 'input', width: 'half' } },
			field('phase', PHASES, {}, 'integer'),
			{
				field: 'stock',
				type: 'string',
				schema: {},
				meta: { interface: 'select-dropdown', display: 'steps', width: 'half', options: { choices: DELIVERY } },
			},
			field('grade', GRADES, {}, 'integer'),
			field('delivery', DELIVERY),
			field('locked', STAGES, { readonly: true }),
			field('year', MONTHS),
			field('stray', STAGES),
			field('bare', undefined),
			field('empty', STAGES, { note: 'A note which the form prints itself.' }),
			field('preset', STAGES, {}, 'string', { default_value: 'approved' }),
			field('odd', ODD),
			field('messy', MESSY),
			field('wordy', WORDY, { width: 'full' }),
			// Its steps are typed into the options form by a test.
			field('fresh', undefined, {}, 'integer'),
			field('mixed', MIXED),
			// The compact form: the labels of the field switched off, each beside a stock control it has to line up with.
			field('compact', STAGES, { options: { choices: STAGES, showLabels: false } }),
			{ field: 'beside', type: 'string', schema: {}, meta: { interface: 'input', width: 'half' } },
			field('crowd', MONTHS, { options: { choices: MONTHS, showLabels: false } }),
			{ field: 'flag', type: 'boolean', schema: {}, meta: { interface: 'boolean', special: ['cast-boolean'], width: 'half' } },
			// And the labels switched on, with no text to show.
			field('nameless', NAMELESS, { options: { choices: NAMELESS, showLabels: true } }),
			// For the calendar layout, which draws the titles of its entries as plain text.
			{ field: 'day', type: 'date', schema: {}, meta: { interface: 'datetime', hidden: true } },
		],
	});

	// The columns of the table layout, for every user.
	await api.post('/presets', {
		collection: COLLECTION,
		layout: 'tabular',
		layout_query: { tabular: { fields: COLUMNS, sort: ['id'] } },
	});

	// A bookmark has a layout of its own, so the calendar does not take the table's place.
	calendar = (
		await api.post('/presets', {
			collection: COLLECTION,
			bookmark: 'Calendar',
			layout: 'calendar',
			layout_options: { calendar: { template: TITLE, startDateField: 'day', viewInfo: { type: 'dayGridMonth', startDateStr: DAY } } },
		})
	).id;

	const values = {
		title: 'Untouched',
		day: DAY,
		stage: 'review',
		phase: 2,
		stock: 'packed',
		grade: 2,
		delivery: 'sent',
		locked: 'approved',
		year: 'dec',
		stray: 'archived',
		empty: null,
		preset: 'draft',
		odd: 'b',
		messy: 'two',
		wordy: 'word',
		mixed: 'b',
		compact: 'review',
		beside: 'A stock input',
		crowd: 'dec',
		flag: true,
		nameless: 'mid',
	};

	still = (await api.post(`/items/${COLLECTION}`, values)).id;
	id = (await api.post(`/items/${COLLECTION}`, { ...values, title: 'Changed' })).id;
});

const fieldOf = (page: Page, name: string) => page.locator(`.field[data-field="${name}"]`);
const box = (page: Page, name: string) => fieldOf(page, name).locator('.steps');
const track = (page: Page, name: string) => box(page, name).locator('.st-track');
const step = (page: Page, name: string, label: string) => box(page, name).getByRole('button', { name: label, exact: true });

/** The state of every step of a field, in the order of the track. */
const states = (page: Page, name: string) =>
	box(page, name)
		.locator('.st-step')
		.evaluateAll((items) => items.map((item) => /st-(done|current|upcoming)/.exec(item.className)?.[1]));

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

/** How many elements of the page were moved sideways, apart from the tracks, which may be. */
const strays = (page: Page) =>
	page.evaluate(() => Array.from(document.querySelectorAll('*')).filter((element) => element.scrollLeft !== 0 && !element.matches('.st-track')).length);

/** Saves the item, and returns what the form sent: the changed fields, in the types the interfaces reported them. */
async function save(page: Page): Promise<Record<string, unknown>> {
	const request = page.waitForRequest((sent) => sent.method() === 'PATCH' && sent.url().includes(`/items/${COLLECTION}/`));
	await page.keyboard.press('ControlOrMeta+s');
	const changes = (await request).postDataJSON();
	await expect(edited(page)).toHaveCount(0);
	return changes;
}

/** Puts fields of the item the tests change back to a known value, whatever an earlier test or run left. */
async function reset(api: { patch: (path: string, body: unknown) => Promise<unknown> }, values: object) {
	await api.patch(`/items/${COLLECTION}/${id}`, values);
}

type Box = { x: number; y: number; width: number; height: number };

/** Whether one box lies within another, give or take half a pixel of rounding. */
const within = (inner: Box, outer: Box) =>
	inner.x >= outer.x - 0.5 &&
	inner.y >= outer.y - 0.5 &&
	inner.x + inner.width <= outer.x + outer.width + 0.5 &&
	inner.y + inner.height <= outer.y + outer.height + 0.5;

/**
 * Where the markers and the lines between them are, from left to right
 * edge, and the colour of each line. A line is a pseudo-element, which has
 * no box to ask for, so it is worked out from its computed position.
 */
const geometry = (page: Page, name: string) =>
	box(page, name)
		.locator('.st-step')
		.evaluateAll((items) =>
			items.map((item) => {
				const outer = item.getBoundingClientRect();
				const marker = item.querySelector('.st-marker')!.getBoundingClientRect();
				const line = getComputedStyle(item, '::after');
				const from = outer.left + Number.parseFloat(line.left);

				return {
					marker: { left: marker.left, right: marker.right, middle: marker.top + marker.height / 2 },
					line:
						line.content === 'none'
							? null
							: { left: from, right: from + Number.parseFloat(line.width), middle: outer.top + Number.parseFloat(line.top) + Number.parseFloat(line.height) / 2, color: line.backgroundColor },
				};
			}),
		);

/** Checks that every line runs from its own marker to the next one, and that only the last step has none. */
async function expectJoined(page: Page, name: string) {
	const steps = await geometry(page, name);

	steps.forEach((current, index) => {
		const next = steps[index + 1];

		if (!next) {
			expect(current.line, 'the last step has no line').toBeNull();
			return;
		}

		// The gap between the two markers, whichever of them is on the left.
		const gap = { left: Math.min(current.marker.right, next.marker.right), right: Math.max(current.marker.left, next.marker.left) };

		expect(gap.right, 'the markers do not touch').toBeGreaterThan(gap.left);
		expect(Math.abs(current.line!.left - gap.left), `the line after step ${index + 1} starts at a marker`).toBeLessThan(1);
		expect(Math.abs(current.line!.right - gap.right), `the line after step ${index + 1} ends at a marker`).toBeLessThan(1);
		expect(Math.abs(current.line!.middle - current.marker.middle), 'the line is at the height of the markers').toBeLessThan(1);
	});

	return steps;
}

test('draws the track in the state of the value', async ({ page }) => {
	await openItem(page, COLLECTION, still);

	// The steps before the current one are done, those after it are still to come.
	await expect.poll(() => states(page, 'stage')).toEqual(['done', 'current', 'upcoming', 'upcoming']);

	// An ordered list with a name, a button per step which is named by its label alone, and one current step.
	const list = box(page, 'stage').getByRole('list', { name: 'Steps' });
	await expect(list.getByRole('listitem')).toHaveCount(4);
	await expect(list.getByRole('button')).toHaveText(['1Draft', '2In review', '3Approved', '4Published']);

	for (const label of ['Draft', 'In review', 'Approved', 'Published']) await expect(step(page, 'stage', label)).toBeVisible();

	await expect(box(page, 'stage').locator('[aria-current]')).toHaveCount(1);
	await expect(step(page, 'stage', 'In review')).toHaveAttribute('aria-current', 'step');
	await expect(step(page, 'stage', 'Draft')).toHaveAccessibleDescription('Completed');
	await expect(step(page, 'stage', 'Approved')).toHaveAccessibleDescription('');

	// Nothing the form passes ends up on the box as an attribute.
	const attributes = await box(page, 'stage').evaluate((element) => element.getAttributeNames().filter((name) => !name.startsWith('data-v-')));
	expect(attributes).toEqual(['class']);

	// The choices of a stock Dropdown: icons in the markers, and `color` does no harm.
	await expect.poll(() => states(page, 'delivery')).toEqual(['done', 'done', 'current', 'upcoming']);
	const icons = await box(page, 'delivery')
		.locator('.st-marker [data-icon]')
		.evaluateAll((glyphs) => glyphs.map((glyph) => glyph.getAttribute('data-icon')));
	expect(icons).toEqual(['shopping_cart', 'inventory_2', 'local_shipping', 'home']);

	// A value an earlier step has and an entry without a value are left out; a step without a text is named by its
	// value and has no label.
	await expect(box(page, 'messy').getByRole('button')).toHaveText(['1First', '2']);
	await expect(step(page, 'messy', 'two')).toHaveAttribute('aria-current', 'step');
	await expect.poll(() => states(page, 'messy')).toEqual(['done', 'current']);

	// A field which holds nothing: every step is still to come, and nothing is reported.
	await expect.poll(() => states(page, 'empty')).toEqual(['upcoming', 'upcoming', 'upcoming', 'upcoming']);
	await expect(box(page, 'empty').locator('[aria-current]')).toHaveCount(0);
	await expect(box(page, 'empty').locator('.st-warning')).toHaveCount(0);

	// The label of a step which is still to come is a choice on offer, in the colour of the text of an input, as
	// the label of a done step is. What is quiet about such a step is its marker; what tells it from a done one
	// without colour is that the marker is not filled.
	const text = await token(page, '--theme--form--field--input--foreground');
	const quiet = await token(page, '--theme--foreground-subdued');
	const upcoming = step(page, 'empty', 'Draft');
	const done = step(page, 'stage', 'Draft');

	expect(text).not.toBe(quiet);
	await expect(upcoming.locator('.st-label')).toHaveCSS('color', text);
	await expect(done.locator('.st-label')).toHaveCSS('color', text);
	await expect(upcoming.locator('.st-marker')).toHaveCSS('color', quiet);
	await expect(upcoming.locator('.st-marker')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
	await expect(done.locator('.st-marker')).toHaveCSS('background-color', await token(page, '--theme--primary'));

	// The note of a field is printed by the form, once, under the box.
	await expect(fieldOf(page, 'empty').getByText('A note which the form prints itself.')).toHaveCount(1);

	await expect(edited(page)).toHaveCount(0);
});

test('a click on a step makes it the current one, and the item saves its value', async ({ page, api }) => {
	await reset(api, { stage: 'review' });
	await openItem(page, COLLECTION, id);
	await expect.poll(() => states(page, 'stage')).toEqual(['done', 'current', 'upcoming', 'upcoming']);

	// On the label of a later step.
	await step(page, 'stage', 'Approved').locator('.st-label').click();
	await expect.poll(() => states(page, 'stage')).toEqual(['done', 'done', 'current', 'upcoming']);
	await expect(step(page, 'stage', 'Approved')).toHaveAttribute('aria-current', 'step');
	await expect(fieldOf(page, 'stage').locator('.field-label.edited')).toHaveCount(1);

	expect(await save(page)).toEqual({ stage: 'approved' });
	expect((await api.get(`/items/${COLLECTION}/${id}`)).stage).toBe('approved');

	// On the marker of an earlier one: the progress goes back.
	await step(page, 'stage', 'Draft').locator('.st-marker').click();
	await expect.poll(() => states(page, 'stage')).toEqual(['current', 'upcoming', 'upcoming', 'upcoming']);

	await save(page);
	expect((await api.get(`/items/${COLLECTION}/${id}`)).stage).toBe('draft');

	// The current step again: nothing is reported, so the form has nothing to save.
	await step(page, 'stage', 'Draft').click();
	await expect.poll(() => states(page, 'stage')).toEqual(['current', 'upcoming', 'upcoming', 'upcoming']);
	await expect(edited(page)).toHaveCount(0);
});

test('Enter and Space choose a step, the arrows, Home and End only move the focus', async ({ page, api }) => {
	await reset(api, { delivery: 'sent' });
	await openItem(page, COLLECTION, id);
	await expect.poll(() => states(page, 'delivery')).toEqual(['done', 'done', 'current', 'upcoming']);

	// Reached with the Tab key, from the label of its field. Every step is a tab stop.
	await fieldOf(page, 'delivery').locator('button.field-name').focus();
	await page.keyboard.press('Tab');
	await expect(step(page, 'delivery', 'Ordered')).toBeFocused();
	await expect(step(page, 'delivery', 'Ordered')).toHaveCSS('outline-style', 'solid');
	await page.keyboard.press('Tab');
	await expect(step(page, 'delivery', 'Packed')).toBeFocused();

	await page.keyboard.press('ArrowRight');
	await expect(step(page, 'delivery', 'Sent')).toBeFocused();
	await page.keyboard.press('ArrowLeft');
	await page.keyboard.press('ArrowLeft');
	await expect(step(page, 'delivery', 'Ordered')).toBeFocused();

	// The focus stops at the first step, and none of this has changed the value.
	await page.keyboard.press('ArrowLeft');
	await expect(step(page, 'delivery', 'Ordered')).toBeFocused();
	await page.keyboard.press('End');
	await expect(step(page, 'delivery', 'Delivered')).toBeFocused();
	await page.keyboard.press('ArrowRight');
	await expect(step(page, 'delivery', 'Delivered')).toBeFocused();
	await page.keyboard.press('Home');
	await expect(step(page, 'delivery', 'Ordered')).toBeFocused();
	expect(await states(page, 'delivery')).toEqual(['done', 'done', 'current', 'upcoming']);
	await expect(edited(page)).toHaveCount(0);

	await page.keyboard.press('Enter');
	await expect.poll(() => states(page, 'delivery')).toEqual(['current', 'upcoming', 'upcoming', 'upcoming']);

	await page.keyboard.press('End');
	await page.keyboard.press('Space');
	await expect.poll(() => states(page, 'delivery')).toEqual(['done', 'done', 'done', 'current']);
	await expect(step(page, 'delivery', 'Delivered')).toBeFocused();

	await save(page);
	expect((await api.get(`/items/${COLLECTION}/${id}`)).delivery).toBe('delivered');
});

test('an integer field stores a number and still shows its step after a reload', async ({ page, api }) => {
	await reset(api, { phase: 2, grade: 2 });
	await openItem(page, COLLECTION, id);

	// The value is a number. The steps of `phase` hold numbers, those of `grade` the same numbers as text.
	await expect.poll(() => states(page, 'phase')).toEqual(['done', 'current', 'upcoming', 'upcoming']);
	await expect.poll(() => states(page, 'grade')).toEqual(['done', 'current', 'upcoming']);

	await step(page, 'phase', 'Shipped').click();
	await step(page, 'grade', 'High').click();
	await expect.poll(() => states(page, 'phase')).toEqual(['done', 'done', 'done', 'current']);
	await expect.poll(() => states(page, 'grade')).toEqual(['done', 'done', 'current']);

	// Numbers, not their text: in what the form sends, where the API would still turn text into a number, and in the item.
	expect(await save(page)).toEqual({ phase: 4, grade: 3 });

	const saved = await api.get(`/items/${COLLECTION}/${id}`);
	expect(saved.phase).toBe(4);
	expect(saved.grade).toBe(3);

	// What the item hands back after a reload is still the step which was chosen.
	await page.reload();
	await page.locator('main .v-form .field').first().waitFor();
	await expect.poll(() => states(page, 'phase')).toEqual(['done', 'done', 'done', 'current']);
	await expect.poll(() => states(page, 'grade')).toEqual(['done', 'done', 'current']);
	await expect(edited(page)).toHaveCount(0);
});

test('a read-only field shows its progress dimmed and cannot be changed', async ({ page, api }) => {
	await openItem(page, COLLECTION, id);

	const locked = box(page, 'locked');
	await expect.poll(() => states(page, 'locked')).toEqual(['done', 'done', 'current', 'upcoming']);
	await expect(locked).toHaveClass(/st-dimmed/);
	await expect(locked.locator('.st-done .st-marker').first()).toHaveCSS('opacity', '0.5');
	await expect(locked).toHaveCSS('background-color', await token(page, '--theme--form--field--input--background-subdued'));

	// Every label of a read-only field is in the quiet colour of a disabled input, the current one still bold.
	const quiet = await token(page, '--theme--foreground-subdued');
	for (const label of await locked.locator('.st-label').all()) await expect(label).toHaveCSS('color', quiet);
	await expect(step(page, 'locked', 'Approved').locator('.st-label')).toHaveCSS('font-weight', '700');

	// The steps of an editable field are at full strength, and its labels are not quiet.
	await expect(box(page, 'stage').locator('.st-marker').first()).toHaveCSS('opacity', '1');
	await expect(step(page, 'stage', 'Published').locator('.st-label')).not.toHaveCSS('color', quiet);

	for (const button of await locked.getByRole('button').all()) await expect(button).toBeDisabled();

	// Not by a click, and not by the keyboard: Tab passes every step by.
	await step(page, 'locked', 'Published').click({ force: true });
	await fieldOf(page, 'locked').locator('button.field-name').focus();
	await page.keyboard.press('Tab');
	expect(await locked.evaluate((element) => element.contains(document.activeElement))).toBe(false);

	expect(await states(page, 'locked')).toEqual(['done', 'done', 'current', 'upcoming']);
	await expect(fieldOf(page, 'locked').locator('.field-label.edited')).toHaveCount(0);
	expect((await api.get(`/items/${COLLECTION}/${id}`)).locked).toBe('approved');
});

test('a value which is not one of the steps is named, until a step is chosen', async ({ page, api }) => {
	await reset(api, { stray: 'archived' });
	await openItem(page, COLLECTION, id);

	const stray = box(page, 'stray');
	const warning = stray.locator('.st-warning');

	await expect(warning).toBeVisible();
	await expect(warning).toContainText('archived');
	await expect(warning.locator('.st-value')).toHaveText('archived');
	await expect(warning.locator('[data-icon="warning"]')).toBeVisible();
	expect(await states(page, 'stray')).toEqual(['upcoming', 'upcoming', 'upcoming', 'upcoming']);
	await expect(stray.locator('[aria-current]')).toHaveCount(0);

	// The line is inside the box, under the track.
	expect(within((await warning.boundingBox())!, (await stray.boundingBox())!)).toBe(true);

	await step(page, 'stray', 'In review').click();
	await expect(warning).toHaveCount(0);
	await expect.poll(() => states(page, 'stray')).toEqual(['done', 'current', 'upcoming', 'upcoming']);

	await save(page);
	expect((await api.get(`/items/${COLLECTION}/${id}`)).stray).toBe('review');
});

test('a field without steps says so', async ({ page }) => {
	await openItem(page, COLLECTION, still);

	// The notice of the stock Radio Buttons, in place of the box.
	await expect(fieldOf(page, 'bare').locator('.v-notice')).toHaveText('No options available');
	await expect(box(page, 'bare')).toHaveCount(0);
	await expect(fieldOf(page, 'bare').getByRole('button', { name: /./ }).and(page.locator('.st-button'))).toHaveCount(0);
});

test('more steps than fit scroll inside the box, with the current step in view', async ({ page }) => {
	await openItem(page, COLLECTION, still);
	await expect.poll(async () => (await states(page, 'year')).at(-1)).toBe('current');

	const year = track(page, 'year');
	const size = () => year.evaluate((element) => ({ scroll: element.scrollLeft, content: element.scrollWidth, room: element.clientWidth }));
	const shown = async (label: string) => within((await step(page, 'year', label).boundingBox())!, (await year.boundingBox())!);

	// Twelve steps do not fit half the form: the track is wider than the box and has been moved to its last step.
	await expect.poll(() => shown('Dec')).toBe(true);
	const { scroll, content, room } = await size();
	expect(content).toBeGreaterThan(room);
	expect(scroll).toBeGreaterThan(0);
	expect(await shown('Jan')).toBe(false);

	// It scrolls with a scrollbar which shows, and nothing but a track was moved sideways.
	expect(await year.evaluate((element) => getComputedStyle(element).overflowX)).toBe('auto');
	expect(await year.evaluate((element) => getComputedStyle(element, '::-webkit-scrollbar').height)).toBe('8px');
	expect(await year.evaluate((element) => getComputedStyle(element, '::-webkit-scrollbar-thumb').backgroundColor)).toBe(
		await token(page, '--theme--foreground-subdued'),
	);
	expect(await strays(page)).toBe(0);

	// The box is as wide as the field beside it, and the columns are equal and no narrower than 4.5rem.
	expect((await box(page, 'year').boundingBox())!.width).toBe((await fieldOf(page, 'stock').locator('.v-input').boundingBox())!.width);
	const columns = await box(page, 'year')
		.locator('.st-step')
		.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().width));
	expect(Math.max(...columns) - Math.min(...columns)).toBeLessThan(0.5);
	expect(columns[0]).toBeGreaterThanOrEqual(72);
	await expectJoined(page, 'year');

	// Four steps fit the same width, and do not scroll.
	expect(await track(page, 'stage').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test('a step chosen with the pointer stays under the pointer, one chosen with the keyboard goes to the middle', async ({ page, api }) => {
	await reset(api, { year: 'dec' });
	await openItem(page, COLLECTION, id);
	await expect.poll(async () => (await states(page, 'year')).at(-1)).toBe('current');

	const year = track(page, 'year');
	const view = async () => (await year.boundingBox())!;
	const scroll = () => year.evaluate((element) => element.scrollLeft);
	const bounds = async (label: string) => (await step(page, 'year', label).boundingBox())!;
	const middle = (area: Box) => area.x + area.width / 2;
	const current = async () => MONTHS[(await states(page, 'year')).indexOf('current')]?.text;

	// The step whose button is under a point of the page.
	const under = (x: number, y: number) => page.evaluate(([left, top]) => document.elementFromPoint(left!, top!)?.closest('.st-button')?.textContent, [x, y]);

	// The pointer is moved to places on the page, so the field has to be on the screen and stay there.
	await box(page, 'year').scrollIntoViewIfNeeded();
	await expect.poll(async () => within(await bounds('Dec'), await view())).toBe(true);
	const start = await scroll();

	// A double click on a step which is wholly in view, away from the middle: it becomes the current one, the
	// track stays where it is, and the second click has landed on the same step.
	const sep = await bounds('Sep');
	expect(within(sep, await view())).toBe(true);
	expect(Math.abs(middle(sep) - middle(await view()))).toBeGreaterThan(sep.width / 2);

	// `page.mouse` does not wait as a locator does: for a moment after the page has loaded, the app's cover, which is
	// fading out, would still take the click.
	await expect.poll(() => under(middle(sep), sep.y + sep.height / 2)).toBe('9Sep');

	await page.mouse.dblclick(middle(sep), sep.y + sep.height / 2);
	await expect.poll(current).toBe('Sep');
	expect(await scroll()).toBe(start);
	expect(await under(middle(sep), sep.y + sep.height / 2)).toBe('9Sep');
	expect(await bounds('Sep')).toEqual(sep);

	// A step which is cut by the edge of the box, clicked on the part which shows: the track moves by what was
	// hidden and no more, so the step is whole and still under the pointer.
	const edge = await view();
	const cut = (await Promise.all(MONTHS.map(async ({ text }) => ({ text, area: await bounds(text) })))).find(
		({ area }) => area.x < edge.x - 8 && area.x + area.width > edge.x + 8,
	);

	expect(cut, 'a step which is partly hidden at the start of the track').toBeDefined();
	const hidden = edge.x - cut!.area.x;
	const point = { x: edge.x + (cut!.area.width - hidden) / 2, y: cut!.area.y + cut!.area.height / 2 };

	await page.mouse.dblclick(point.x, point.y);
	await expect.poll(current).toBe(cut!.text);
	await expect.poll(async () => within(await bounds(cut!.text), await view())).toBe(true);
	expect(Math.abs(start - (await scroll()) - hidden)).toBeLessThan(1);
	expect(await under(point.x, point.y)).toContain(cut!.text);

	// A save hands the interface nothing for a moment and then the same value again, which is no new step: the track stays.
	const before = await scroll();
	expect(await save(page)).toEqual({ year: cut!.text.toLowerCase() });
	await expect.poll(current).toBe(cut!.text);
	expect(await scroll()).toBe(before);

	// A step chosen with the keyboard has no pointer to stay under, and goes to the middle of what shows.
	await step(page, 'year', cut!.text).focus();
	for (let press = 0; press < 3; press++) await page.keyboard.press('ArrowLeft');
	const chosen = MONTHS[MONTHS.findIndex(({ text }) => text === cut!.text) - 3]!.text;
	await expect(step(page, 'year', chosen)).toBeFocused();

	await page.keyboard.press('Enter');
	await expect.poll(current).toBe(chosen);
	await expect.poll(async () => Math.abs(middle(await bounds(chosen)) - middle(await view()))).toBeLessThan(2);

	// Only the track was ever moved.
	expect(await strays(page)).toBe(0);
});

test('a field with its labels switched off is exactly as high as the stock input beside it', async ({ page, api }) => {
	await reset(api, { compact: 'review' });
	await openItem(page, COLLECTION, id);
	await expect.poll(() => states(page, 'compact')).toEqual(['done', 'current', 'upcoming', 'upcoming']);

	const compact = box(page, 'compact');
	const area = async (locator: ReturnType<typeof box>) => (await locator.boundingBox())!;
	const middle = (bounds: Box) => bounds.y + bounds.height / 2;

	// Every step has a text, and the field shows none of them: the box is the markers alone. A field with the same
	// steps and no word about labels shows all four.
	await expect(compact).toHaveClass(/st-compact/);
	await expect(compact.locator('.st-label')).toHaveCount(0);
	await expect(compact.getByRole('button')).toHaveText(['1', '2', '3', '4']);
	await expect(box(page, 'stage')).not.toHaveClass(/st-compact/);
	await expect(box(page, 'stage').locator('.st-label')).toHaveText(['Draft', 'In review', 'Approved', 'Published']);

	// The texts are still the names of the steps.
	const names = ['Draft', 'In review', 'Approved', 'Published'];
	for (const [index, button] of (await compact.getByRole('button').all()).entries()) await expect(button).toHaveAccessibleName(names[index]!);

	// The same box as the input in the same row: as high, as wide, and starting at the same line.
	const input = await area(fieldOf(page, 'beside').locator('.v-input'));
	const ours = await area(compact);
	expect(ours.height).toBe(input.height);
	expect(ours.width).toBe(input.width);
	expect(ours.y).toBe(input.y);

	// The markers are as large as under a row of labels, and sit on the middle line of the box.
	const full = await area(step(page, 'stage', 'Draft').locator('.st-marker'));

	for (const marker of await compact.locator('.st-marker').all()) {
		const circle = await area(marker);
		expect(circle.height).toBe(full.height);
		expect(circle.width).toBe(full.width);
		expect(Math.abs(middle(circle) - middle(ours))).toBeLessThan(0.5);
	}

	await expectJoined(page, 'compact');

	// Twelve such steps beside a stock Toggle: columns of a marker and a gap, a track which scrolls with its last
	// step in view, and still the height of the Toggle, with the markers on its middle line.
	const crowd = await area(box(page, 'crowd'));
	const toggle = await area(fieldOf(page, 'flag').locator('.v-checkbox'));
	expect(crowd.height).toBe(toggle.height);
	expect(crowd.height).toBe(input.height);
	expect(crowd.y).toBe(toggle.y);

	await expect.poll(async () => within(await area(step(page, 'crowd', 'Dec')), await area(track(page, 'crowd')))).toBe(true);
	expect(await track(page, 'crowd').evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
	expect(await track(page, 'crowd').evaluate((element) => getComputedStyle(element, '::-webkit-scrollbar').height)).toBe('6px');
	expect(Math.abs(middle(await area(step(page, 'crowd', 'Dec').locator('.st-marker'))) - middle(crowd))).toBeLessThan(0.5);

	const column = (await area(box(page, 'crowd').locator('.st-step').first())).width;
	expect(column).toBeGreaterThanOrEqual(full.width + 8);
	expect(column).toBeLessThan(72);
	await expectJoined(page, 'crowd');

	// A track with labels is higher than an input.
	expect((await area(box(page, 'stage'))).height).toBeGreaterThan(input.height);

	// Labels switched on and no step with a text: nothing to show either, and the same form.
	await expect(box(page, 'nameless')).toHaveClass(/st-compact/);
	await expect(box(page, 'nameless').locator('.st-label')).toHaveCount(0);
	expect((await area(box(page, 'nameless'))).height).toBe(input.height);
	await expect(step(page, 'nameless', 'mid')).toHaveAttribute('aria-current', 'step');

	// A step whose text does not show has it as a tooltip. The app drops a tooltip which is still waiting whenever a
	// component with a tooltip is drawn again, so the mouse comes back until it shows.
	const tooltip = page.locator('#tooltip.visible');
	await compact.scrollIntoViewIfNeeded();

	await expect(async () => {
		await page.mouse.move(0, 0);
		await step(page, 'compact', 'Published').hover();
		await expect(tooltip).toHaveText('Published', { timeout: 2000 });
	}).toPass();

	await page.mouse.move(0, 0);

	// It is the same control: a click chooses, and the item saves the value.
	await step(page, 'compact', 'Approved').click();
	await expect.poll(() => states(page, 'compact')).toEqual(['done', 'done', 'current', 'upcoming']);
	expect((await area(compact)).height).toBe(input.height);
	expect(await save(page)).toEqual({ compact: 'approved' });
});

test('a step without a label is still named, to assistive technology and in a tooltip for the mouse and the keyboard', async ({ page }) => {
	await openItem(page, COLLECTION, still);
	await expect.poll(() => states(page, 'mixed')).toEqual(['done', 'current', 'upcoming', 'upcoming']);

	const mixed = box(page, 'mixed');
	const tooltip = page.locator('#tooltip.visible');

	// Two of the four steps have a text, and so a label. The last of them holds `showLabel: false`, which a step
	// could say before the field had an option for it: it is ignored.
	await expect(mixed.locator('.st-label')).toHaveText(['Start', 'End']);
	await expect(mixed.getByRole('button')).toHaveText(['1Start', '2', '3', '4End']);

	// Every one of them has a name: its text, or its value where it has no text.
	const names = ['Start', 'b', 'c', 'End'];
	const buttons = await mixed.getByRole('button').all();
	for (const [index, button] of buttons.entries()) await expect(button).toHaveAccessibleName(names[index]!);
	await expect(step(page, 'mixed', 'b')).toHaveAttribute('aria-current', 'step');

	// One label is enough for the row of labels: the field is not compact.
	await expect(mixed).not.toHaveClass(/st-compact/);
	expect((await mixed.boundingBox())!.height).toBeGreaterThan((await fieldOf(page, 'beside').locator('.v-input').boundingBox())!.height);

	// A field which says nothing about labels shows them, as every field made before the option existed does.
	await expect(step(page, 'mixed', 'Start').locator('.st-label')).toBeVisible();
	await expect(box(page, 'stage').locator('.st-label')).toHaveText(['Draft', 'In review', 'Approved', 'Published']);

	// The mouse on a step without a label: its name as a tooltip. The app drops a tooltip which is still waiting
	// whenever a component with a tooltip is drawn again, so the mouse comes back until it shows.
	await mixed.scrollIntoViewIfNeeded();

	await expect(async () => {
		await page.mouse.move(0, 0);
		await step(page, 'mixed', 'b').hover();
		await expect(tooltip).toHaveText('b', { timeout: 2000 });
	}).toPass();

	// A step whose label shows in full has none.
	await step(page, 'mixed', 'Start').hover();
	await expect(tooltip).toHaveCount(0);
	await page.waitForTimeout(1000);
	await expect(tooltip).toHaveCount(0);

	// The keyboard on a step without a label: the same tooltip, with the mouse out of the way.
	await page.mouse.move(0, 0);
	await fieldOf(page, 'mixed').locator('button.field-name').focus();
	await page.keyboard.press('Tab');
	await expect(step(page, 'mixed', 'Start')).toBeFocused();

	await expect(async () => {
		await page.keyboard.press('Home');
		await page.keyboard.press('ArrowRight');
		await expect(step(page, 'mixed', 'b')).toBeFocused();
		await expect(tooltip).toHaveText('b', { timeout: 2000 });
	}).toPass();

	await page.keyboard.press('ArrowRight');
	await expect(step(page, 'mixed', 'c')).toBeFocused();
	await expect(tooltip).toHaveText('c');

	// And none on the labelled step the focus moves on to.
	await page.keyboard.press('ArrowRight');
	await expect(step(page, 'mixed', 'End')).toBeFocused();
	await expect(tooltip).toHaveCount(0);

	// Moving the focus chose nothing.
	expect(await states(page, 'mixed')).toEqual(['done', 'current', 'upcoming', 'upcoming']);
	await expect(edited(page)).toHaveCount(0);
});

test('the focus ring of the first and the last step stays inside the box', async ({ page }) => {
	await openItem(page, COLLECTION, still);
	await expect.poll(async () => (await states(page, 'year')).at(-1)).toBe('current');

	await fieldOf(page, 'year').locator('button.field-name').focus();
	await page.keyboard.press('Tab');

	for (const [key, label] of [
		['Home', 'Jan'],
		['End', 'Dec'],
	] as const) {
		await page.keyboard.press(key);
		const button = step(page, 'year', label);
		await expect(button).toBeFocused();

		// The ring is the app's, turned inwards: it is drawn within the button, and the button is within what the track shows.
		await expect(button).toHaveCSS('outline-style', 'solid');
		await expect(button).toHaveCSS('outline-width', '2px');
		await expect(button).toHaveCSS('outline-offset', '-2px');
		await expect.poll(async () => within((await button.boundingBox())!, (await track(page, 'year').boundingBox())!)).toBe(true);
	}

	// Moving the focus chose nothing.
	expect((await states(page, 'year')).at(-1)).toBe('current');
	await expect(edited(page)).toHaveCount(0);
});

test('a long label stays in its column on two lines, and shows in full as a tooltip', async ({ page }) => {
	await openItem(page, COLLECTION, still);
	await expect.poll(() => states(page, 'wordy')).toEqual(['done', 'current', 'upcoming']);

	const columns = await box(page, 'wordy')
		.locator('.st-step')
		.evaluateAll((items) =>
			items.map((item) => {
				const column = item.getBoundingClientRect();
				const label = item.querySelector('.st-label')!.getBoundingClientRect();
				const lines = label.height / Number.parseFloat(getComputedStyle(item.querySelector('.st-label')!).lineHeight);
				return { width: column.width, inside: label.left >= column.left && label.right <= column.right, lines: Math.round(lines) };
			}),
		);

	// Equal columns, whatever is written under them, and no label leaves its own.
	expect(Math.max(...columns.map((column) => column.width)) - Math.min(...columns.map((column) => column.width))).toBeLessThan(0.5);
	expect(columns.map((column) => column.inside)).toEqual([true, true, true]);
	expect(columns.map((column) => column.lines)).toEqual([2, 2, 1]);
	expect(await track(page, 'wordy').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
	await expectJoined(page, 'wordy');

	// The label which was cut has the whole text as a tooltip. The app shows
	// a tooltip half a second after the mouse arrives, and drops one which is
	// still waiting whenever a component with a tooltip is drawn again
	// (app/src/directives/tooltip.ts:29-50 in Directus 11.17.4), as happens while a page settles
	// or scrolls: so the mouse comes back until the tooltip shows.
	const tooltip = page.locator('#tooltip.visible');
	await box(page, 'wordy').scrollIntoViewIfNeeded();

	await expect(async () => {
		await page.mouse.move(0, 0);
		await step(page, 'wordy', LONG_LABEL).hover();
		await expect(tooltip).toHaveText(LONG_LABEL, { timeout: 2000 });
	}).toPass();

	// A label which shows in full has none: the tooltip of the app goes away and does not come back.
	await step(page, 'wordy', 'Short').hover();
	await expect(tooltip).toHaveCount(0);
	await page.waitForTimeout(1000);
	await expect(tooltip).toHaveCount(0);
});

test('an icon name which is not an icon stays inside its marker', async ({ page }) => {
	await openItem(page, COLLECTION, still);

	const odd = box(page, 'odd');
	const marker = step(page, 'odd', 'Unknown').locator('.st-marker');
	const drawing = marker.locator('.v-icon');
	await expect.poll(() => states(page, 'odd')).toEqual(['done', 'current', 'upcoming']);
	await odd.scrollIntoViewIfNeeded();
	await page.evaluate(() => document.fonts.ready);

	// The app draws the name as text, many times wider than the marker.
	const width = await marker.locator('[data-icon]').evaluate((glyph) => glyph.scrollWidth);
	expect(width).toBeGreaterThan((await marker.boundingBox())!.width * 3);

	// A picture of the field with the marker painted over. A page which was
	// just opened or mirrored may still be moving, so a picture counts once
	// the next one is the same.
	const around = () => fieldOf(page, 'odd').screenshot({ mask: [marker], animations: 'disabled' });

	const steady = async () => {
		let last = await around();

		await expect
			.poll(async () => {
				const next = await around();
				const same = next.equals(last);
				last = next;
				return same;
			})
			.toBe(true);

		return last;
	};

	// Whatever is drawn for the name, the steps beside it, the labels and the
	// border of the box look exactly as they do with nothing in the marker.
	const seen: Record<string, object> = {};

	for (const direction of ['ltr', 'rtl'] as const) {
		await turn(page, direction);
		await expect(odd).toHaveCSS('direction', direction);

		const drawn = await steady();
		await drawing.evaluate((element: HTMLElement) => (element.style.visibility = 'hidden'));
		const empty = await steady();
		await drawing.evaluate((element: HTMLElement) => (element.style.visibility = ''));

		seen[direction] = {
			outside: drawn.equals(empty) ? 'untouched' : 'drawn over',
			overflows: await track(page, 'odd').evaluate((element) => element.scrollWidth > element.clientWidth),
			// The pictures were taken of a page in this direction, to the last one.
			direction: await odd.evaluate((element) => getComputedStyle(element).direction),
		};
	}

	expect(seen).toEqual({
		ltr: { outside: 'untouched', overflows: false, direction: 'ltr' },
		rtl: { outside: 'untouched', overflows: false, direction: 'rtl' },
	});

	// An icon which is one is not cut: the glyph fits its box, and the box fits the marker.
	for (const label of ['Ordered', 'Packed', 'Sent', 'Delivered']) {
		const circle = (await step(page, 'delivery', label).locator('.st-marker').boundingBox())!;
		const glyph = step(page, 'delivery', label).locator('.st-marker .v-icon > *');

		await expect.poll(() => glyph.evaluate((element) => element.scrollWidth <= element.parentElement!.clientWidth)).toBe(true);
		expect(within((await glyph.boundingBox())!, circle)).toBe(true);
	}
});

test('in a right-to-left page the track runs from the right and every line joins its two steps', async ({ page }) => {
	await openItem(page, COLLECTION, still);
	await expect.poll(() => states(page, 'delivery')).toEqual(['done', 'done', 'current', 'upcoming']);

	const primary = await token(page, '--theme--primary');
	const colours = (steps: Awaited<ReturnType<typeof geometry>>) => steps.map((entry) => (entry.line ? entry.line.color === primary : null));

	// Left to right first: the first step is the leftmost, and the lines after the done steps are in the primary colour.
	const forwards = await expectJoined(page, 'delivery');
	expect(forwards.map((entry) => entry.marker.left)).toEqual([...forwards.map((entry) => entry.marker.left)].sort((a, b) => a - b));
	expect(colours(forwards)).toEqual([true, true, false, null]);

	await turn(page, 'rtl');
	await expect(box(page, 'delivery')).toHaveCSS('direction', 'rtl');

	// Mirrored: the first step is the rightmost, each line still lies between its own step and the next, and the same lines are coloured.
	const backwards = await expectJoined(page, 'delivery');
	expect(backwards.map((entry) => entry.marker.left)).toEqual([...backwards.map((entry) => entry.marker.left)].sort((a, b) => b - a));
	expect(colours(backwards)).toEqual([true, true, false, null]);

	// Onwards is now to the left.
	await step(page, 'delivery', 'Ordered').focus();
	await page.keyboard.press('ArrowLeft');
	await expect(step(page, 'delivery', 'Packed')).toBeFocused();
	await page.keyboard.press('ArrowRight');
	await expect(step(page, 'delivery', 'Ordered')).toBeFocused();

	// What was measured was a mirrored page to the end.
	expect(await box(page, 'delivery').evaluate((element) => getComputedStyle(element).direction)).toBe('rtl');
	await expect(edited(page)).toHaveCount(0);
});

test('a new item starts from the default value of the field', async ({ page }) => {
	await page.goto(`/admin/content/${COLLECTION}/+`);
	await page.locator('main .v-form .field').first().waitFor();

	await expect.poll(() => states(page, 'preset')).toEqual(['done', 'done', 'current', 'upcoming']);
	await expect.poll(() => states(page, 'stage')).toEqual(['upcoming', 'upcoming', 'upcoming', 'upcoming']);
	await expect(edited(page)).toHaveCount(0);
});

test('the display shows pips and the label of the step in the table layout', async ({ page }) => {
	await page.goto(`/admin/content/${COLLECTION}`);

	const row = page.locator('table tbody tr.table-row', { hasText: 'Untouched' });
	await expect(row).toHaveCount(1);

	const cell = (name: string) => row.locator('td.cell:not(.select)').nth(COLUMNS.indexOf(name));
	const pips = (name: string) => cell(name).locator('.sd-pip');

	// A pip per step, filled up to and including the current one, then its label.
	await expect(cell('stage').locator('.steps-display')).toHaveText('In review');
	await expect(pips('stage')).toHaveCount(4);
	await expect(cell('stage').locator('.sd-pip.sd-filled')).toHaveCount(2);
	await expect(cell('stage').getByRole('img')).toHaveAccessibleName('Step 2 of 4');

	// An integer field, with numbers as values and with the same numbers as text.
	await expect(cell('phase').locator('.steps-display')).toHaveText('Planned');
	await expect(cell('phase').locator('.sd-pip.sd-filled')).toHaveCount(2);
	await expect(cell('grade').locator('.steps-display')).toHaveText('Medium');
	await expect(pips('grade')).toHaveCount(3);
	await expect(cell('grade').locator('.sd-pip.sd-filled')).toHaveCount(2);

	// A field of the stock Dropdown: the display reads its choices.
	await expect(cell('stock').locator('.steps-display')).toHaveText('Packed');
	await expect(cell('stock').locator('.sd-pip.sd-filled')).toHaveCount(2);

	// Beyond eight steps: position and count as text.
	await expect(pips('year')).toHaveCount(0);
	await expect(cell('year').locator('.sd-count')).toHaveText('12/12');
	await expect(cell('year').locator('.steps-display')).toHaveText('12/12Dec');

	// A value which is not a step shows as it is; a field without a value is left to the app.
	await expect(cell('stray').locator('.steps-display')).toHaveText('archived');
	await expect(pips('stray')).toHaveCount(0);
	await expect(cell('empty').locator('.steps-display')).toHaveCount(0);
	await expect(cell('empty')).toHaveText('--');

	// One line which is no taller than the text display beside it, and pips which are whole.
	const text = (await cell('title').locator('.display-formatted').boundingBox())!;
	const ours = (await cell('stage').locator('.steps-display').boundingBox())!;
	expect(ours.height).toBe(text.height);
	expect(Math.abs(ours.y - text.y)).toBeLessThan(1);

	const filled = (await cell('stage').locator('.sd-pip.sd-filled').first().boundingBox())!;
	expect(filled.width).toBe(6);
	expect(filled.height).toBe(6);
	await expect(cell('stage').locator('.sd-pip.sd-filled').first()).toHaveCSS('background-color', await token(page, '--theme--primary'));
	await expect(pips('stage').last()).not.toHaveCSS('background-color', await token(page, '--theme--primary'));
});

test('the display as plain text is the label of the step, in the titles of the calendar layout', async ({ page }) => {
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${calendar}`);

	// The calendar renders its template to a string, for which the app asks the display of each field for text. The
	// string field, the integer field whose steps hold text, the field of twelve steps and the field of the stock
	// Dropdown give the label of their step; a value which is not a step gives itself, and an empty field nothing.
	const entry = page.locator('.fc-event', { hasText: 'Untouched' });
	await expect(entry).toHaveCount(1);
	await expect(entry).toHaveText('Untouched: In review | Medium | Dec | archived | Packed |');
});

test('the options form gives the steps of an integer field numbers', async ({ page, api }) => {
	await api.patch(`/fields/${COLLECTION}/fresh`, { meta: { options: null } });
	await api.patch(`/items/${COLLECTION}/${id}`, { fresh: 7 });

	await page.goto(`/admin/settings/data-model/${COLLECTION}/fresh`);

	const dialogs = page.locator('#dialog-outlet');
	await dialogs.getByText('Interface', { exact: true }).first().click();
	await dialogs.getByRole('button', { name: 'Create New' }).click();

	// The drawer of one step: a text, a value which is a number input because the field is an integer, and an icon.
	const value = dialogs.locator('.field[data-field="value"] input');
	await expect(value).toHaveAttribute('type', 'number');
	await dialogs.locator('.field[data-field="text"] input').fill('Seventh');
	await value.fill('7');

	// Save the step, then the field.
	await dialogs.locator('.v-drawer').last().locator('header button').last().click();
	await expect(value).toHaveCount(0);
	await dialogs.locator('.v-drawer').last().locator('header button').last().click();

	// A number, and nothing in the step but what was typed.
	await expect.poll(async () => (await api.get(`/fields/${COLLECTION}/fresh`)).meta.options?.choices).toEqual([{ text: 'Seventh', value: 7 }]);

	// The item which holds 7 shows that step as its current one.
	await openItem(page, COLLECTION, id);
	await expect.poll(() => states(page, 'fresh')).toEqual(['current']);
	await expect(step(page, 'fresh', 'Seventh')).toHaveAttribute('aria-current', 'step');
});
