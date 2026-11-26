// Browser tests of the Steps bundle in the sandbox Directus
// (see ../../../sandbox/README.md). They cover what the unit tests cannot:
// that the built bundle loads in a real Data Studio, that the track draws
// every state, that a click or a key press ends up in the saved item in the
// type of the field, and that the display draws in a layout.
import { expect, openItem, test, type Api } from '../../../sandbox/support/fixtures.ts';
import { ADMIN, BASE_URL } from '../../../sandbox/support/sandbox.ts';

type Page = Parameters<typeof openItem>[0];
type Locator = ReturnType<Page['locator']>;

const COLLECTION = 'sandbox_steps';

// A collection with a stock Repeater, one of whose fields is a track.
const ROWS = 'sandbox_steps_rows';

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
const MESSY = [{ text: 'First', value: 'one' }, { text: 'Again', value: 'one' }, { text: 'Nothing' }, { text: '', value: 'two' }];

// Some steps with a text and some without. The last carries a key which hid the label of a step before the field had
// an option for it; it is ignored, like any key an entry may hold.
const MIXED = [{ text: 'Start', value: 'a' }, { value: 'b' }, { text: '', value: 'c' }, { text: 'End', value: 'd', showLabel: false }];

// Steps without a text: there is no label to show, whatever the field says about labels.
const NAMELESS = [{ value: 'low' }, { value: 'mid' }, { value: 'high' }];

// Steps whose texts are strings of the app, which every user reads in their own language.
const WORDED = [
	{ text: '$t:draft', value: 'draft' },
	{ text: '$t:published', value: 'published' },
	{ text: '$t:archived', value: 'archived' },
];

// The fields of the Repeater, as the dialog of a Repeater's field stores them: the key and the type once more among the rest.
const ROW_FIELDS = [
	{ field: 'name', name: 'name', type: 'string', meta: { field: 'name', type: 'string', interface: 'input', width: 'half' } },
	{
		field: 'phase',
		name: 'phase',
		type: 'integer',
		meta: { field: 'phase', type: 'integer', interface: 'steps', display: 'steps', width: 'half', options: { choices: PHASES } },
	},
];

const ROW_VALUES = [
	{ name: 'First', phase: 2 },
	{ name: 'Second', phase: 4 },
];

/** A field on the Steps interface and display, half as wide as the form. */
const field = (name: string, choices: object[] | undefined, meta: object = {}, type = 'string', schema: object = {}) => ({
	field: name,
	type,
	schema,
	meta: { interface: 'steps', display: 'steps', width: 'half', options: choices ? { choices } : null, ...meta },
});

// What the layout shows, in this order.
const COLUMNS = ['title', 'stage', 'phase', 'grade', 'delivery', 'year', 'stray', 'empty', 'stock', 'worded'];

// The day both items are on in the calendar, and what the calendar writes on an entry.
const DAY = '2026-03-12';
const TITLE = '{{title}}: {{stage}} | {{grade}} | {{year}} | {{stray}} | {{stock}} | {{empty}}';

// The item the tests change, and one which stays as it was seeded.
let id: number;
let still: number;

// The item with the Repeater.
let rows: number;

// The bookmark which shows the collection as a calendar.
let calendar: number;

/** Who signs in: the administrator of the sandbox, or a user of these tests' own. */
interface Credentials {
	email: string;
	password: string;
}

// Users of these tests' own, so that no test changes the administrator, whom every other test signs in as. They are
// told by the start of their address, and removed by it.
const OWN = 'sandbox-steps-';
let dark: Credentials;
let german: Credentials;

/** A user with the role of the administrator and settings of its own, such as an appearance or a language. */
async function makeUser(api: Api, name: string, settings: object): Promise<Credentials> {
	const credentials = { email: `${OWN}${name}@example.com`, password: `${OWN}${name}` };
	const role: string = (await api.get('/users/me?fields=role')).role;

	await api.post('/users', { ...credentials, role, first_name: 'Steps', last_name: name, ...settings });
	return credentials;
}

async function removeUsers(api: Api) {
	const users = await api.get<{ id: string }[]>(`/users?fields=id&limit=-1&filter[email][_starts_with]=${OWN}`);
	for (const user of users) await api.delete(`/users/${user.id}`);
}

type Browser = NonNullable<ReturnType<ReturnType<Page['context']>['browser']>>;

// What the Directus app logs on its own, with or without extensions: the same as the fixture of every test passes over.
const NOISE = /favicon|ResizeObserver loop|auth\/refresh/;

/**
 * A signed-in page of its own, for a test which needs another user than the `page` of the fixture has. `quiet()`
 * fails when that page logged an error or threw, as the fixture does for its own: a test calls it at its end, and
 * closes the context itself.
 */
async function signedIn(browser: Browser, user: Credentials = ADMIN) {
	const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1440, height: 900 } });
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

test.beforeAll(async ({ api }) => {
	await removeUsers(api);
	await api.drop(COLLECTION, ROWS);

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
			// The compact form in a field which cannot be edited: nothing but a tooltip says what its steps are.
			field('sealed', STAGES, { readonly: true, options: { choices: STAGES, showLabels: false } }),
			// Read-only by a condition, for as long as the input `beside` holds "locked".
			field('gated', STAGES, { conditions: [{ name: 'Locked', rule: { _and: [{ beside: { _eq: 'locked' } }] }, readonly: true }] }),
			field('worded', WORDED),
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
		sealed: 'approved',
		gated: 'review',
		worded: 'draft',
	};

	still = (await api.post(`/items/${COLLECTION}`, values)).id;
	id = (await api.post(`/items/${COLLECTION}`, { ...values, title: 'Changed' })).id;

	await api.post('/collections', {
		collection: ROWS,
		meta: { icon: 'step' },
		schema: {},
		fields: [
			{ field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
			{
				field: 'rows',
				type: 'json',
				schema: {},
				meta: { interface: 'list', special: ['cast-json'], width: 'full', options: { template: '{{ name }}: {{ phase }}', fields: ROW_FIELDS } },
			},
		],
	});

	rows = (await api.post(`/items/${ROWS}`, { rows: ROW_VALUES })).id;

	dark = await makeUser(api, 'dark', { appearance: 'dark' });
	german = await makeUser(api, 'german', { language: 'de-DE' });
});

test.afterAll(async ({ api }) => {
	await removeUsers(api);
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
async function save(page: Page, collection = COLLECTION): Promise<Record<string, unknown>> {
	const request = page.waitForRequest((sent) => sent.method() === 'PATCH' && sent.url().includes(`/items/${collection}/`));
	await page.keyboard.press('ControlOrMeta+s');
	const changes = (await request).postDataJSON();
	await expect(edited(page)).toHaveCount(0);
	return changes;
}

/** Puts fields of the item the tests change back to a known value, whatever an earlier test or run left. */
async function reset(api: Api, values: object) {
	await api.patch(`/items/${COLLECTION}/${id}`, values);
}

/**
 * Waits for the tooltip of the app over a step. The app shows a tooltip a
 * moment after the mouse arrives, and drops one which is still waiting
 * whenever a component with a tooltip is drawn again
 * (app/src/directives/tooltip.ts:29-50 in Directus 11.17.4), as happens
 * while a page settles or scrolls: so the mouse comes back until it shows.
 */
async function expectTooltip(page: Page, target: Locator, expected: string) {
	await expect(async () => {
		await page.mouse.move(0, 0);
		await target.hover();
		await expect(page.locator('#tooltip.visible')).toHaveText(expected, { timeout: 2000 });
	}).toPass();
}

/**
 * Checks that a step has no tooltip and never had one, without waiting for one to stay away: the app's directive
 * marks an element with `data-tooltip` when it is given a text to show, and not before
 * (app/src/directives/tooltip.ts:20-27).
 */
const expectNoTooltip = (target: Locator) => expect(target).not.toHaveAttribute('data-tooltip');

/** How many steps of a field the Tab key stops at. */
const stops = (page: Page, name: string) => box(page, name).locator('.st-button[tabindex="0"]:not(:disabled)').count();

/** Whether the focus is on a step of a field. */
const focusWithin = (page: Page, name: string) => box(page, name).evaluate((element) => element.contains(document.activeElement));

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
							: {
									left: from,
									right: from + Number.parseFloat(line.width),
									middle: outer.top + Number.parseFloat(line.top) + Number.parseFloat(line.height) / 2,
									color: line.backgroundColor,
								},
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

	// An ordered list named after its field, a button per step which is named by its label alone, and one current
	// step. The role is written out, because a list without bullets is no list to Safari with VoiceOver.
	const list = box(page, 'stage').getByRole('list', { name: 'Stage' });
	await expect(list.getByRole('listitem')).toHaveCount(4);
	await expect(track(page, 'stage')).toHaveAttribute('role', 'list');
	await expect(box(page, 'delivery').getByRole('list', { name: 'Delivery' })).toHaveCount(1);

	// No two tracks of the form have the same name.
	const names = await page.locator('main .v-form .st-track').evaluateAll((lists) => lists.map((each) => each.getAttribute('aria-label')));
	expect(names.length).toBeGreaterThan(10);
	expect(new Set(names).size).toBe(names.length);
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

test('the field is one tab stop: Tab enters at the current step and leaves again, the arrows only move the focus, Enter and Space choose', async ({
	page,
	api,
}) => {
	await reset(api, { delivery: 'sent' });
	await openItem(page, COLLECTION, id);
	await expect.poll(() => states(page, 'delivery')).toEqual(['done', 'done', 'current', 'upcoming']);

	// One step of every track takes the Tab key, however many it has, and none of a field which cannot be edited.
	for (const name of ['stage', 'delivery', 'year', 'empty', 'stray', 'compact', 'mixed']) expect(await stops(page, name), name).toBe(1);
	expect(await stops(page, 'locked')).toBe(0);

	// Reached with the Tab key, from the label of its field: the current step, not the first.
	await fieldOf(page, 'delivery').locator('button.field-name').focus();
	await page.keyboard.press('Tab');
	await expect(step(page, 'delivery', 'Sent')).toBeFocused();
	await expect(step(page, 'delivery', 'Sent')).toHaveCSS('outline-style', 'solid');

	// The next Tab leaves the track, and Shift + Tab comes back to the same step.
	await page.keyboard.press('Tab');
	expect(await focusWithin(page, 'delivery')).toBe(false);
	await page.keyboard.press('Shift+Tab');
	await expect(step(page, 'delivery', 'Sent')).toBeFocused();

	// The arrows go along the track from there.
	await page.keyboard.press('ArrowRight');
	await expect(step(page, 'delivery', 'Delivered')).toBeFocused();
	for (let press = 0; press < 3; press++) await page.keyboard.press('ArrowLeft');
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

	// Tab leaves the track from the step the arrows went to as well, with the current step still ahead of it, and
	// the track is entered at the current step again.
	expect(await stops(page, 'delivery')).toBe(1);
	await page.keyboard.press('Tab');
	expect(await focusWithin(page, 'delivery')).toBe(false);
	await page.keyboard.press('Shift+Tab');
	await expect(step(page, 'delivery', 'Sent')).toBeFocused();

	// Backwards too, from a step after the current one.
	await page.keyboard.press('End');
	await expect(step(page, 'delivery', 'Delivered')).toBeFocused();
	await page.keyboard.press('Shift+Tab');
	expect(await focusWithin(page, 'delivery')).toBe(false);
	await page.keyboard.press('Tab');
	await expect(step(page, 'delivery', 'Sent')).toBeFocused();

	await page.keyboard.press('Home');
	await page.keyboard.press('Enter');
	await expect.poll(() => states(page, 'delivery')).toEqual(['current', 'upcoming', 'upcoming', 'upcoming']);

	await page.keyboard.press('End');
	await page.keyboard.press('Space');
	await expect.poll(() => states(page, 'delivery')).toEqual(['done', 'done', 'done', 'current']);
	await expect(step(page, 'delivery', 'Delivered')).toBeFocused();

	// The step which was chosen is where the track is entered from now on.
	await page.keyboard.press('Shift+Tab');
	expect(await focusWithin(page, 'delivery')).toBe(false);
	await page.keyboard.press('Tab');
	await expect(step(page, 'delivery', 'Delivered')).toBeFocused();
	expect(await stops(page, 'delivery')).toBe(1);

	// A field which holds nothing has no current step, and is entered at its first.
	await fieldOf(page, 'empty').locator('button.field-name').focus();
	await page.keyboard.press('Tab');
	await expect(step(page, 'empty', 'Draft')).toBeFocused();
	await page.keyboard.press('Tab');
	expect(await focusWithin(page, 'empty')).toBe(false);

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

test('a field without labels which cannot be edited still shows the names of its steps as tooltips', async ({ page }) => {
	await openItem(page, COLLECTION, still);
	await expect.poll(() => states(page, 'sealed')).toEqual(['done', 'done', 'current', 'upcoming']);

	// The markers alone, dimmed, and no step to be chosen: nothing on the page says what the four numbers stand for.
	const sealed = box(page, 'sealed');
	await expect(sealed).toHaveClass(/st-compact/);
	await expect(sealed).toHaveClass(/st-dimmed/);
	await expect(sealed.locator('.st-label')).toHaveCount(0);
	for (const button of await sealed.getByRole('button').all()) await expect(button).toBeDisabled();

	// The mouse on a step does.
	await sealed.scrollIntoViewIfNeeded();
	await expectTooltip(page, step(page, 'sealed', 'Published'), 'Published');
	await expectTooltip(page, step(page, 'sealed', 'Draft'), 'Draft');
	await page.mouse.move(0, 0);

	// A read-only field whose labels show has none: the labels say it.
	await expectNoTooltip(step(page, 'locked', 'Draft'));

	// It is still not to be changed.
	await step(page, 'sealed', 'Published').click({ force: true });
	expect(await states(page, 'sealed')).toEqual(['done', 'done', 'current', 'upcoming']);
	await expect(edited(page)).toHaveCount(0);
});

test('a condition which makes the field read-only makes the track inert and dimmed, and gives it back when it is lifted', async ({ page, api }) => {
	await reset(api, { gated: 'review', beside: 'A stock input' });
	await openItem(page, COLLECTION, id);
	await expect.poll(() => states(page, 'gated')).toEqual(['done', 'current', 'upcoming', 'upcoming']);

	const gated = box(page, 'gated');
	const input = fieldOf(page, 'beside').locator('input');

	await expect(gated).not.toHaveClass(/st-inert/);
	expect(await stops(page, 'gated')).toBe(1);

	// The condition matches as soon as the other field holds its word, before anything is saved.
	await input.fill('locked');
	await expect(gated).toHaveClass(/st-inert/);
	await expect(gated).toHaveClass(/st-dimmed/);
	await expect(gated).toHaveCSS('background-color', await token(page, '--theme--form--field--input--background-subdued'));
	for (const button of await gated.getByRole('button').all()) await expect(button).toBeDisabled();
	expect(await stops(page, 'gated')).toBe(0);

	await step(page, 'gated', 'Published').click({ force: true });
	expect(await states(page, 'gated')).toEqual(['done', 'current', 'upcoming', 'upcoming']);
	await expect(fieldOf(page, 'gated').locator('.field-label.edited')).toHaveCount(0);

	// Lifted again, the track is the one it was: one tab stop, and a click chooses.
	await input.fill('open');
	await expect(gated).not.toHaveClass(/st-inert/);
	await expect(gated).not.toHaveClass(/st-dimmed/);
	expect(await stops(page, 'gated')).toBe(1);

	await step(page, 'gated', 'Published').click();
	await expect.poll(() => states(page, 'gated')).toEqual(['done', 'done', 'done', 'current']);
	expect(await save(page)).toEqual({ beside: 'open', gated: 'published' });
});

test('in the comparison of two revisions the tracks keep their full colours and cannot be changed', async ({ page, api }) => {
	// Two more revisions of the item, and the form again, which reads them when it opens.
	await reset(api, { stage: 'approved' });
	await reset(api, { stage: 'draft' });
	await openItem(page, COLLECTION, id);
	await expect.poll(() => states(page, 'stage')).toEqual(['current', 'upcoming', 'upcoming', 'upcoming']);

	// Whatever the page sends from here on which is not a question.
	const written: string[] = [];
	page.on('request', (sent) => {
		if (sent.method() !== 'GET' && sent.url().includes('/items/')) written.push(`${sent.method()} ${sent.url()}`);
	});

	await page.getByText('Revisions', { exact: true }).first().click();
	await page.locator('.revision-item').nth(1).click();

	// The comparison shows the item twice, as it was before and after the change. Both tracks of the field show
	// their step, at full strength.
	const dialogs = page.locator('#dialog-outlet');
	const sides = dialogs.locator('.field[data-field="stage"] .steps');
	await expect(sides).toHaveCount(2);

	const stateOf = (side: Locator) =>
		side.locator('.st-step').evaluateAll((items) => items.map((item) => /st-(done|current|upcoming)/.exec(item.className)?.[1]));
	await expect
		.poll(async () => [await stateOf(sides.first()), await stateOf(sides.last())].map((each) => each.join(' ')).sort())
		.toEqual(['current upcoming upcoming upcoming', 'done done current upcoming'].sort());

	const paper = await token(page, '--theme--form--field--input--background');
	const quiet = await token(page, '--theme--foreground-subdued');

	// Every track of the comparison is inert and none is dimmed, the one of the field which is read-only in the
	// form included: the value has to stay readable.
	const all = dialogs.locator('.steps');
	expect(await all.count()).toBeGreaterThan(20);
	expect(await all.evaluateAll((boxes) => boxes.filter((each) => !each.classList.contains('st-inert') || each.classList.contains('st-dimmed')).length)).toBe(
		0,
	);
	expect(await dialogs.locator('.st-button:not(:disabled)').count()).toBe(0);

	for (const name of ['stage', 'locked']) {
		const shown = dialogs.locator(`.field[data-field="${name}"] .steps`).first();

		await expect(shown).toHaveCSS('background-color', paper);
		await expect(shown.locator('.st-done .st-marker, .st-current .st-marker').first()).toHaveCSS('opacity', '1');
		await expect(shown.locator('.st-label').first()).not.toHaveCSS('color', quiet);
	}

	// A track without labels says what its steps are there too.
	const compared = dialogs.locator('.field[data-field="compact"] .steps').first();
	await compared.scrollIntoViewIfNeeded();
	await expectTooltip(page, compared.getByRole('button', { name: 'Published', exact: true }), 'Published');
	await page.mouse.move(0, 0);

	// A click on a step changes nothing, on either side.
	const before = [await stateOf(sides.first()), await stateOf(sides.last())];
	await sides.first().scrollIntoViewIfNeeded();
	await sides.first().getByRole('button', { name: 'Published', exact: true }).click({ force: true });
	await sides.last().getByRole('button', { name: 'Published', exact: true }).click({ force: true });
	expect([await stateOf(sides.first()), await stateOf(sides.last())]).toEqual(before);

	// The comparison is closed again: the form has nothing to save, and nothing was sent.
	await dialogs.getByRole('button', { name: 'Cancel' }).click();
	await expect(dialogs.locator('.steps')).toHaveCount(0);
	expect(await states(page, 'stage')).toEqual(['current', 'upcoming', 'upcoming', 'upcoming']);
	await expect(edited(page)).toHaveCount(0);
	expect(written).toEqual([]);
	expect((await api.get(`/items/${COLLECTION}/${id}`)).stage).toBe('draft');
});

test('colours change softly only after a step was chosen by hand, and not at all for someone who asks for less motion', async ({ page, api }) => {
	await reset(api, { stage: 'review' });
	await openItem(page, COLLECTION, id);
	await expect.poll(() => states(page, 'stage')).toEqual(['done', 'current', 'upcoming', 'upcoming']);

	const stage = box(page, 'stage');
	const first = stage.locator('.st-step').first();

	// How long the marker, the label and the line of the first step, and the box itself, take to change colour.
	const durations = () =>
		first.evaluate((item) => ({
			marker: getComputedStyle(item.querySelector('.st-marker')!).transitionDuration,
			label: getComputedStyle(item.querySelector('.st-label')!).transitionDuration,
			line: getComputedStyle(item, '::after').transitionDuration,
			box: getComputedStyle(item.closest('.steps')!).transitionDuration,
		}));

	// Until a step is chosen nothing in the track fades: the first change of state is the item arriving in the form.
	await expect(stage).not.toHaveClass(/st-animated/);
	expect(await durations()).toMatchObject({ marker: '0s', label: '0s', line: '0s' });

	await step(page, 'stage', 'Approved').click();
	await expect.poll(() => states(page, 'stage')).toEqual(['done', 'done', 'current', 'upcoming']);
	await expect(stage).toHaveClass(/st-animated/);

	const moving = await durations();
	for (const part of Object.values(moving)) expect(part).not.toBe('0s');

	// Less motion asked for: nothing takes any time, and a step is chosen as before.
	await page.emulateMedia({ reducedMotion: 'reduce' });
	expect(await durations()).toEqual({ marker: '0s', label: '0s', line: '0s', box: '0s' });

	await step(page, 'stage', 'Published').click();
	await expect.poll(() => states(page, 'stage')).toEqual(['done', 'done', 'done', 'current']);
	await expect(stage).toHaveClass(/st-animated/);

	await page.emulateMedia({ reducedMotion: 'no-preference' });
	expect(await durations()).toEqual(moving);
});

test('a value which is not one of the steps is named, until a step is chosen', async ({ page, api }) => {
	await reset(api, { stray: 'archived' });
	await openItem(page, COLLECTION, id);

	const stray = box(page, 'stray');
	const warning = stray.locator('.st-warning');

	await expect(warning).toBeVisible();
	await expect(warning).toHaveText('The value “archived” is not one of the steps.');
	await expect(warning.locator('.st-value')).toHaveText('archived');
	await expect(warning.locator('[data-icon="warning"]')).toBeVisible();
	expect(await states(page, 'stray')).toEqual(['upcoming', 'upcoming', 'upcoming', 'upcoming']);
	await expect(stray.locator('[aria-current]')).toHaveCount(0);

	// The sentence is tied to the list, so someone who enters the track without seeing it is told why no step is
	// the current one. A list of a field whose value is a step has no such description.
	await expect(stray.getByRole('list', { name: 'Stray' })).toHaveAccessibleDescription('The value “archived” is not one of the steps.');
	await expect(track(page, 'stage')).not.toHaveAttribute('aria-describedby');

	// The line is inside the box, under the track.
	expect(within((await warning.boundingBox())!, (await stray.boundingBox())!)).toBe(true);

	await step(page, 'stray', 'In review').click();
	await expect(warning).toHaveCount(0);
	await expect.poll(() => states(page, 'stray')).toEqual(['done', 'current', 'upcoming', 'upcoming']);

	await save(page);
	expect((await api.get(`/items/${COLLECTION}/${id}`)).stray).toBe('review');

	// A value which differs from a step by its spaces alone, as an import can leave one: the spaces show, between
	// the quotation marks, so the sentence does not seem to name a step of the field.
	await reset(api, { stray: ' draft  ' });
	await page.reload();
	await expect(warning).toBeVisible();
	await expect(warning.locator('.st-value')).toHaveCSS('white-space', 'pre-wrap');
	await expect.poll(() => warning.evaluate((element: HTMLElement) => element.innerText.trim())).toBe('The value “ draft  ” is not one of the steps.');
	expect(await states(page, 'stray')).toEqual(['upcoming', 'upcoming', 'upcoming', 'upcoming']);
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

test('a key typed into another field makes no track read the layout of its labels again', async ({ page }) => {
	await openItem(page, COLLECTION, still);
	await expect.poll(() => states(page, 'stage')).toEqual(['done', 'current', 'upcoming', 'upcoming']);
	await page.evaluate(() => document.fonts.ready);

	// A track finds the labels which are cut by asking each for its `scrollHeight`. The page counts those questions.
	await page.evaluate(() => {
		const asked = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight')!;
		const counter = window as unknown as { labelsMeasured: number };
		counter.labelsMeasured = 0;

		Object.defineProperty(Element.prototype, 'scrollHeight', {
			configurable: true,
			get(this: Element) {
				if (this.classList.contains('st-label')) counter.labelsMeasured++;
				return asked.get!.call(this);
			},
		});
	});

	const measured = () => page.evaluate(() => (window as unknown as { labelsMeasured: number }).labelsMeasured);

	// A page which was just opened may still be laying itself out: the count is taken once it stands still. The first
	// reading cannot equal -1, so the two readings which agree are at least one interval of the poll apart.
	let rest = -1;

	await expect
		.poll(async () => {
			const next = await measured();
			const same = next === rest;
			rest = next;
			return same;
		})
		.toBe(true);

	// The form hands every field its options again with every key, as a new object which says the same.
	await fieldOf(page, 'title').locator('input').pressSequentially(' and ten more');
	await expect(fieldOf(page, 'title').locator('.field-label.edited')).toHaveCount(1);
	await expect(fieldOf(page, 'title').locator('input')).toHaveValue(/ and ten more/);
	expect(await measured()).toBe(rest);

	// The count does count: a step which is chosen changes which label is bold, and the labels are measured again.
	await step(page, 'stage', 'Approved').click();
	await expect.poll(() => states(page, 'stage')).toEqual(['done', 'done', 'current', 'upcoming']);
	await expect.poll(measured).toBeGreaterThan(rest);
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

	// A step whose text does not show has it as a tooltip.
	await compact.scrollIntoViewIfNeeded();
	await expectTooltip(page, step(page, 'compact', 'Published'), 'Published');
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

	// The mouse on a step without a label: its name as a tooltip.
	await mixed.scrollIntoViewIfNeeded();
	await expectTooltip(page, step(page, 'mixed', 'b'), 'b');

	// A step whose label shows in full has none: the tooltip of the app goes away, and that step never had one.
	await step(page, 'mixed', 'Start').hover();
	await expect(tooltip).toHaveCount(0);
	await expectNoTooltip(step(page, 'mixed', 'Start'));
	await expectNoTooltip(step(page, 'mixed', 'End'));

	// The keyboard on a step without a label: the same tooltip, with the mouse out of the way. Tab enters the track
	// at its current step, which is such a step.
	await page.mouse.move(0, 0);
	await fieldOf(page, 'mixed').locator('button.field-name').focus();
	await page.keyboard.press('Tab');
	await expect(step(page, 'mixed', 'b')).toBeFocused();

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

	// The label which was cut has the whole text as a tooltip.
	await box(page, 'wordy').scrollIntoViewIfNeeded();
	await expectTooltip(page, step(page, 'wordy', LONG_LABEL), LONG_LABEL);

	// A label which shows in full has none: the tooltip of the app goes away, and that step never had one.
	await step(page, 'wordy', 'Short').hover();
	await expect(page.locator('#tooltip.visible')).toHaveCount(0);
	await expectNoTooltip(step(page, 'wordy', 'Short'));
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

test('the display shows pips and the name of the step in the table layout', async ({ page }) => {
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

	// The count is told to assistive technology in the words of the pips, not as "12 slash 12".
	await expect(cell('year').getByRole('img')).toHaveAccessibleName('Step 12 of 12');

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

	// A pip which is not filled is in the subdued colour of text, which shows on the page; the accent colour of the
	// borders, which it had once, hardly does.
	expect(await token(page, '--theme--foreground-subdued')).not.toBe(await token(page, '--theme--border-color-accent'));
	await expect(pips('stage').last()).toHaveCSS('background-color', await token(page, '--theme--foreground-subdued'));
});

test('the display as plain text is the name of the step, in the titles of the calendar layout', async ({ page }) => {
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${calendar}`);

	// The calendar renders its template to a string, for which the app asks the display of each field for text. The
	// string field, the integer field whose steps hold text, the field of twelve steps and the field of the stock
	// Dropdown give the name of their step; a value which is not a step gives itself, and an empty field nothing.
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

	// Behind the drawer, the note of the list says which steps are left out, with the rule of an integer field.
	await expect(dialogs.getByText('with a value which is not a whole number')).toHaveCount(1);
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

test('a track in a row of a stock Repeater shows the step of the row, and a click writes a number into the row', async ({ page, api }) => {
	await api.patch(`/items/${ROWS}/${rows}`, { rows: ROW_VALUES });
	await openItem(page, ROWS, rows);

	// The rows are drawn by the display of the field: pips and the name of the step.
	const list = page.locator('main .v-form .field[data-field="rows"] .v-list-item');
	await expect(list).toHaveCount(2);
	await expect(list.first().locator('.steps-display')).toHaveText('Planned');
	await expect(list.first().locator('.sd-pip.sd-filled')).toHaveCount(2);
	await expect(list.last().locator('.steps-display')).toHaveText('Shipped');

	// The drawer of the first row: the track of its field, named after it, at the step of the row.
	await list.first().click();
	const drawer = page.locator('#dialog-outlet .v-drawer').last();
	await expect(drawer.locator('.field[data-field="phase"]').getByRole('list', { name: 'Phase' })).toHaveCount(1);
	await expect.poll(() => states(page, 'phase')).toEqual(['done', 'current', 'upcoming', 'upcoming']);
	expect(await stops(page, 'phase')).toBe(1);

	await step(page, 'phase', 'Building').click();
	await expect.poll(() => states(page, 'phase')).toEqual(['done', 'done', 'current', 'upcoming']);

	// The drawer is confirmed and the item saved: the row holds a number, and the other row is as it was.
	await drawer.locator('header button').last().click();
	await expect(page.locator('#dialog-outlet .v-drawer')).toHaveCount(0);
	await expect(list.first().locator('.steps-display')).toHaveText('Building');

	expect(await save(page, ROWS)).toEqual({ rows: [{ name: 'First', phase: 3 }, ROW_VALUES[1]] });

	const stored = (await api.get(`/items/${ROWS}/${rows}`)).rows;
	expect(stored).toEqual([{ name: 'First', phase: 3 }, ROW_VALUES[1]]);
	expect(typeof stored[0].phase).toBe('number');
});

test('under a contrast theme of the system the states of the track and the pips of the display are still told apart', async ({ page }) => {
	await page.emulateMedia({ forcedColors: 'active' });
	await openItem(page, COLLECTION, still);
	await expect.poll(() => states(page, 'stage')).toEqual(['done', 'current', 'upcoming', 'upcoming']);

	// Chromium's emulation of the mode has colours of its own. So no colour is written here: what is painted is
	// compared with the ground it stands on, and one state with another.
	const ground = await box(page, 'stage').evaluate((element) => getComputedStyle(element).backgroundColor);

	// A colour shows when it is not the one it lies on and not see-through, which is `rgba()` with a last part of 0.
	const shows = (color: string, on = ground) => color !== on && !/^rgba\(.*,\s*0\)$/.test(color);

	/** How each step of a field is painted: its marker, the label under it and the line after it. */
	const painted = (name: string) =>
		box(page, name)
			.locator('.st-step')
			.evaluateAll((items) =>
				items.map((item) => {
					const marker = item.querySelector('.st-marker')!;
					const style = getComputedStyle(marker);
					const label = item.querySelector('.st-label');
					const line = getComputedStyle(item, '::after');
					const bounds = marker.getBoundingClientRect();

					return {
						fill: style.backgroundColor,
						text: style.color,
						ring: style.borderTopColor,
						ringWidth: parseFloat(style.borderTopWidth),
						strength: style.opacity,
						size: `${bounds.width} by ${bounds.height}`,
						label: label ? getComputedStyle(label).color : null,
						line: line.content === 'none' ? null : line.backgroundColor,
						lineStrength: line.content === 'none' ? null : line.opacity,
					};
				}),
			);

	const stage = await painted('stage');
	const [done, current, upcoming, last] = [stage[0]!, stage[1]!, stage[2]!, stage[3]!];

	// A done step is filled, with a number which is not the colour of the fill. The mode takes a background in a
	// colour of the theme away, and a done marker was then the ring an upcoming one is.
	expect(shows(done.fill), `a done marker in ${done.fill} on ${ground}`).toBe(true);
	expect(done.ring).toBe(done.fill);
	expect(done.text).not.toBe(done.fill);

	// The current and an upcoming step are rings, and the ring of the current one is twice as wide, in the colour
	// of what is done. So the three states differ without any colour.
	for (const hollow of [current, upcoming, last]) {
		expect(hollow.fill).toBe(ground);
		expect(shows(hollow.ring), `a ring in ${hollow.ring}`).toBe(true);
		expect(shows(hollow.text), `a number in ${hollow.text}`).toBe(true);
	}

	expect(current.ringWidth).toBe(2 * upcoming.ringWidth);
	expect(current.ring).toBe(done.fill);
	expect(last.ringWidth).toBe(upcoming.ringWidth);

	// The wider ring is inside the marker: every marker is as large as the others.
	expect(new Set(stage.map((step) => step.size)).size).toBe(1);

	// The lines are backgrounds too. The one after a done step is in the colour of its marker, the others show.
	expect(done.line).toBe(done.fill);
	expect(shows(current.line!), `a line in ${current.line}`).toBe(true);
	expect(shows(upcoming.line!), `a line in ${upcoming.line}`).toBe(true);
	expect(last.line).toBeNull();

	// Chromium paints a plate in the colour of the page behind text in this mode, which would hide the number of a
	// done step. The marker opts out of the mode, so every colour of it has to be set, for the mouse as well: the
	// rules for hover would otherwise paint it in the colours of the theme.
	await expect(step(page, 'stage', 'Draft').locator('.st-marker')).toHaveCSS('forced-color-adjust', 'none');

	for (const [index, label] of [
		[0, 'Draft'],
		[2, 'Approved'],
	] as const) {
		await step(page, 'stage', label).hover();
		await expect.poll(() => step(page, 'stage', label).evaluate((element) => element.matches(':hover'))).toBe(true);
		expect((await painted('stage'))[index]).toEqual(stage[index]);
	}

	await page.mouse.move(0, 0);

	// A read-only field: nothing is at half strength, which the mode is not for, and the number and the ring of a
	// marker are in the colour the browser gives the label of a step which cannot be chosen.
	const locked = await painted('locked');
	expect(locked.map((step) => step.strength)).toEqual(['1', '1', '1', '1']);
	expect(locked.map((step) => step.lineStrength)).toEqual(['1', '1', '1', null]);
	expect(locked[0]!.fill).toBe(done.fill);
	expect(locked[2]!.text).toBe(locked[2]!.label);
	expect(locked[3]!.text).toBe(locked[3]!.label);
	expect(locked[3]!.ring).toBe(locked[3]!.label);

	// Without labels the ring is all which marks the current step. The ring of the keyboard focus round a marker is
	// in a colour of the system as well, the one of what is done, and not in the primary colour of the theme.
	const compact = await painted('compact');
	expect(shows(compact[0]!.fill)).toBe(true);
	expect(compact[1]!.ringWidth).toBe(2 * compact[2]!.ringWidth);

	await fieldOf(page, 'compact').locator('button.field-name').focus();
	await page.keyboard.press('Tab');
	await expect(step(page, 'compact', 'In review')).toBeFocused();
	await expect(step(page, 'compact', 'In review').locator('.st-marker')).toHaveCSS('outline-style', 'solid');
	await expect(step(page, 'compact', 'In review').locator('.st-marker')).toHaveCSS('outline-color', done.fill);

	// The thumb of the scrollbar is a background as well.
	expect(shows(await track(page, 'year').evaluate((element) => getComputedStyle(element, '::-webkit-scrollbar-thumb').backgroundColor))).toBe(true);

	// The display in the table. A pip is nothing but its background, so without rules of its own every pip was gone.
	// A filled one is a dot, one which is not filled a ring, and both are as large as they are otherwise.
	await page.goto(`/admin/content/${COLLECTION}`);

	const cell = page.locator('table tbody tr.table-row', { hasText: 'Untouched' }).locator('td.cell:not(.select)').nth(COLUMNS.indexOf('stage'));
	await expect(cell.locator('.sd-pip')).toHaveCount(4);

	const paper = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

	const pips = await cell.locator('.sd-pip').evaluateAll((items) =>
		items.map((item) => {
			const style = getComputedStyle(item);
			const bounds = item.getBoundingClientRect();

			return {
				filled: item.classList.contains('sd-filled'),
				fill: style.backgroundColor,
				ring: style.borderTopColor,
				outline: `${style.borderTopWidth} ${style.borderTopStyle}`,
				size: `${bounds.width} by ${bounds.height}`,
			};
		}),
	);

	expect(pips.map((pip) => pip.filled)).toEqual([true, true, false, false]);
	expect(pips.map((pip) => pip.size)).toEqual(['6 by 6', '6 by 6', '6 by 6', '6 by 6']);
	expect(pips.map((pip) => pip.outline)).toEqual(['1px solid', '1px solid', '1px solid', '1px solid']);

	for (const pip of pips) {
		expect(shows(pip.ring, paper), `a pip with an edge in ${pip.ring} on ${paper}`).toBe(true);
		expect(shows(pip.fill, paper), `a pip filled with ${pip.fill} on ${paper}`).toBe(pip.filled);
		if (pip.filled) expect(pip.ring).toBe(pip.fill);
	}
});

test('in the dark theme the track and the display are painted from the dark tokens', async ({ browser, page }) => {
	const NAMES = {
		paper: '--theme--form--field--input--background',
		faint: '--theme--form--field--input--background-subdued',
		edge: '--theme--form--field--input--border-color',
		text: '--theme--form--field--input--foreground',
		quiet: '--theme--foreground-subdued',
		primary: '--theme--primary',
		tint: '--theme--primary-background',
	};

	const tokensOf = async (from: Page) =>
		Object.fromEntries(await Promise.all(Object.entries(NAMES).map(async ([key, name]) => [key, await token(from, name)]))) as Record<
			keyof typeof NAMES,
			string
		>;

	// The tokens of the light theme, from the page of the administrator, to tell the dark ones from.
	await openItem(page, COLLECTION, still);
	const light = await tokensOf(page);

	const session = await signedIn(browser, dark);

	try {
		const shown = session.page;
		await openItem(shown, COLLECTION, still);
		await expect(shown.locator('body')).toHaveClass(/dark/);
		await expect.poll(() => states(shown, 'stage')).toEqual(['done', 'current', 'upcoming', 'upcoming']);

		// It is another theme: the box, its border and both colours of text are not what they are in the light one.
		const tokens = await tokensOf(shown);
		for (const key of ['paper', 'faint', 'edge', 'text', 'quiet'] as const) expect(tokens[key], key).not.toBe(light[key]);

		// The box of an input, with a done, a current and an upcoming step in the colours of this theme.
		await expect(box(shown, 'stage')).toHaveCSS('background-color', tokens.paper);
		await expect(box(shown, 'stage')).toHaveCSS('border-top-color', tokens.edge);

		const done = step(shown, 'stage', 'Draft');
		const current = step(shown, 'stage', 'In review');
		const upcoming = step(shown, 'stage', 'Published');

		await expect(done.locator('.st-marker')).toHaveCSS('background-color', tokens.primary);
		await expect(done.locator('.st-marker')).toHaveCSS('color', tokens.paper);
		await expect(done.locator('.st-label')).toHaveCSS('color', tokens.text);
		await expect(current.locator('.st-marker')).toHaveCSS('background-color', tokens.tint);
		await expect(current.locator('.st-label')).toHaveCSS('color', tokens.primary);
		await expect(upcoming.locator('.st-marker')).toHaveCSS('color', tokens.quiet);
		await expect(upcoming.locator('.st-marker')).toHaveCSS('border-top-color', tokens.edge);
		await expect(upcoming.locator('.st-label')).toHaveCSS('color', tokens.text);

		// A read-only field, and a value which is not a step.
		await expect(box(shown, 'locked')).toHaveCSS('background-color', tokens.faint);
		await expect(step(shown, 'locked', 'Draft').locator('.st-label')).toHaveCSS('color', tokens.quiet);
		await expect(box(shown, 'stray').locator('.st-warning')).toHaveCSS('color', tokens.text);

		// The display in the table: filled pips in the primary colour, the others in the subdued colour of this theme.
		await shown.goto(`/admin/content/${COLLECTION}`);
		const cell = shown.locator('table tbody tr.table-row', { hasText: 'Untouched' }).locator('td.cell:not(.select)').nth(COLUMNS.indexOf('stage'));
		await expect(cell.locator('.sd-pip')).toHaveCount(4);
		await expect(cell.locator('.sd-pip.sd-filled').first()).toHaveCSS('background-color', tokens.primary);
		await expect(cell.locator('.sd-pip').last()).toHaveCSS('background-color', tokens.quiet);

		session.quiet();
	} finally {
		await session.context.close();
	}
});

test('for a user with another language the notice and the texts of the steps are in that language', async ({ browser, page }) => {
	// The administrator reads English.
	await openItem(page, COLLECTION, still);
	await expect(box(page, 'worded').getByRole('button')).toHaveText(['1Draft', '2Published', '3Archived']);

	const session = await signedIn(browser, german);

	try {
		const shown = session.page;
		await openItem(shown, COLLECTION, still);

		// The notice of a field without steps is the app's own string.
		await expect(fieldOf(shown, 'bare').locator('.v-notice')).toHaveText('Keine Optionen verfügbar');

		// Steps whose texts are strings of the app: labels and names in the language of the user.
		await expect.poll(() => states(shown, 'worded')).toEqual(['current', 'upcoming', 'upcoming']);
		await expect(box(shown, 'worded').getByRole('button')).toHaveText(['1Entwurf', '2Veröffentlicht', '3Archiviert']);
		await expect(step(shown, 'worded', 'Entwurf')).toHaveAttribute('aria-current', 'step');

		// The steps of the other fields are what was typed in, whoever reads them.
		await expect(box(shown, 'stage').locator('.st-label')).toHaveText(['Draft', 'In review', 'Approved', 'Published']);

		// The display names the step in that language too.
		await shown.goto(`/admin/content/${COLLECTION}`);
		const cell = shown.locator('table tbody tr.table-row', { hasText: 'Untouched' }).locator('td.cell:not(.select)').nth(COLUMNS.indexOf('worded'));
		await expect(cell.locator('.steps-display')).toHaveText('Entwurf');
		await expect(cell.getByRole('img')).toHaveAccessibleName('Step 1 of 3');

		session.quiet();
	} finally {
		await session.context.close();
	}
});
