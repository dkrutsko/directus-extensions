// Browser tests of the Switch interface in the sandbox Directus
// (see ../../../sandbox/README.md). They cover what the unit tests cannot:
// that the built bundle loads in a real Data Studio, draws every state, and
// that a click or a key press ends up as `true` or `false` in the saved item.
//
// No test depends on another: the ones which only look share one item which
// nothing changes (`still`), and each one which saves makes its own (`fresh`).
import { expect, openItem, test, type Api } from '../../../sandbox/support/fixtures.ts';

type Page = Parameters<typeof openItem>[0];
type Locator = ReturnType<Page['locator']>;

const COLLECTION = 'sandbox_switch';

const LONG_LABEL = 'Send a notification to every subscriber of this article whenever it is published, updated or withdrawn. '.repeat(2).trim();
const LONG_WORD = 'notification'.repeat(12);

// Without `cast-boolean`, which the app adds to every boolean field it creates,
// SQLite hands a boolean back as 0 or 1.
const BOOLEAN = { special: ['cast-boolean'], width: 'half' };

/** A boolean field on the Switch interface, half as wide as the form. */
const field = (name: string, meta: object = {}, schema: object = {}) => ({
	field: name,
	type: 'boolean',
	schema,
	meta: { ...BOOLEAN, interface: 'switch', display: 'boolean', ...meta },
});

// What every item starts with.
const VALUES = {
	plain: false,
	stock_input: 'A stock input',
	described: true,
	stock_toggle: true,
	published: true,
	styled: true,
	themed: true,
	bare: true,
	locked: true,
	unset: null,
	wordy: false,
	preset: false,
	odd: true,
	branded: true,
	raw_off: false,
	raw_on: true,
	rows: [{ title: 'one', active: false }],
};

// The item of the tests which only look. A test which saves makes an item of
// its own with `fresh`, so no test depends on what another one left behind.
let still: number;

const fresh = async (api: Api, values: object = {}): Promise<number> => (await api.post(`/items/${COLLECTION}`, { ...VALUES, ...values })).id;

test.beforeAll(async ({ api }) => {
	await api.drop(COLLECTION);

	await api.post('/collections', {
		collection: COLLECTION,
		meta: { icon: 'toggle_on' },
		schema: {},
		fields: [
			{
				field: 'id',
				type: 'integer',
				schema: { is_primary_key: true, has_auto_increment: true },
				meta: { hidden: true },
			},
			// No options at all, next to a stock input and above a stock Toggle to compare it with.
			field('plain'),
			{ field: 'stock_input', type: 'string', schema: {}, meta: { interface: 'input', width: 'half' } },
			field('described', {
				options: { label: 'Published', description: 'Visible to everyone on the public site.' },
			}),
			{ field: 'stock_toggle', type: 'boolean', schema: {}, meta: { ...BOOLEAN, interface: 'boolean' } },
			// A label which says what the name of the field says, "Published".
			field('published', { options: { label: 'Published' } }),
			field('styled', {
				options: {
					label: 'Visible',
					iconOn: 'visibility',
					iconOff: 'visibility_off',
					colorOn: '#2ECDA7',
					colorOff: '#E35169',
				},
			}),
			field('themed', { options: { label: 'Theme colors', colorOn: 'var(--theme--success)', colorOff: 'var(--theme--danger)' } }),
			// What the icon picker stores for an icon which was cleared.
			field('bare', { options: { label: 'Plain knob', iconOn: null, iconOff: null } }),
			field('locked', { readonly: true, options: { label: 'Archived', description: 'Set by the nightly job.' } }),
			field('unset', { note: 'A note which the form prints itself.' }),
			field('wordy', { options: { label: LONG_LABEL, description: LONG_WORD } }),
			field('preset', {}, { default_value: true }),
			// A name the icon set does not have, which the app draws as text, and one of its social icons.
			field('odd', { options: { label: 'Unknown icon', iconOn: 'no_such_icon_name_at_all' } }),
			field('branded', { options: { label: 'Social icon', iconOn: 'github' } }),
			// Boolean fields as something other than the app creates them: without the special, SQLite hands back 0 and 1.
			{ field: 'raw_off', type: 'boolean', schema: {}, meta: { interface: 'switch', width: 'half' } },
			{ field: 'raw_on', type: 'boolean', schema: {}, meta: { interface: 'switch', width: 'half' } },
			// A stock Repeater whose rows have a switch.
			{
				field: 'rows',
				type: 'json',
				schema: {},
				meta: {
					interface: 'list',
					special: ['cast-json'],
					options: {
						template: '{{ title }}',
						fields: [
							{ field: 'title', name: 'Title', type: 'string', meta: { interface: 'input', width: 'full' } },
							{
								field: 'active',
								name: 'Active',
								type: 'boolean',
								meta: { interface: 'switch', width: 'full', options: { label: 'Shown on the site' } },
							},
						],
					},
				},
			},
		],
	});

	still = await fresh(api);
});

const fieldOf = (page: Page, name: string) => page.locator(`.field[data-field="${name}"]`);
const box = (page: Page, name: string) => fieldOf(page, name).locator('.switch');
const knobIcon = (page: Page, name: string) => box(page, name).locator('.sw-knob [data-icon]');

// The form marks the label of a field which holds an unsaved change.
const edited = (page: Page) => page.locator('main .v-form .field-label.edited');

/**
 * Mirrors the page, or turns it back. The direction is set on `body`, not on
 * the root element where the app keeps the user's: the app writes that one
 * again with every update of the document head, the page title included, so
 * a direction a test puts there can be gone a moment later.
 */
const turn = (page: Page, direction: 'ltr' | 'rtl') => page.evaluate((dir) => (document.body.dir = dir), direction);

async function save(page: Page) {
	await page.keyboard.press('ControlOrMeta+s');
	await expect(edited(page)).toHaveCount(0);
}

/** What the browser makes of a colour at the place of an element, written as `getComputedStyle` writes colours. */
const colorAt = (place: Locator, color: string) =>
	place.evaluate((element, value) => {
		const probe = element.parentElement!.appendChild(document.createElement('span'));
		probe.style.color = value;
		const seen = getComputedStyle(probe).color;
		probe.remove();
		return seen;
	}, color);

/** How far the knob of a switch is from the start of its track, in pixels. */
async function knobOffset(control: Locator) {
	const track = (await control.locator('.sw-track').boundingBox())!;
	const knob = (await control.locator('.sw-knob').boundingBox())!;
	return Math.round(knob.x - track.x);
}

test('draws a switch in the state of the value', async ({ page }) => {
	await openItem(page, COLLECTION, still);

	// No options: "Enabled" on one line, off, a cross in the knob.
	const plain = box(page, 'plain');
	await expect(plain).toHaveRole('switch');
	await expect(plain.locator('.sw-label')).toHaveText('Enabled');
	await expect(plain).toHaveAttribute('aria-checked', 'false');
	await expect(plain).toHaveClass(/sw-off/);
	await expect(plain.locator('.sw-description')).toHaveCount(0);
	await expect(knobIcon(page, 'plain')).toHaveAttribute('data-icon', 'close');

	// A label and a description: on, a check in the knob, and both are announced.
	const described = box(page, 'described');
	await expect(described).toHaveAttribute('aria-checked', 'true');
	await expect(described).toHaveClass(/sw-on/);
	await expect(described.locator('.sw-label')).toHaveText('Published');
	await expect(described).toHaveAccessibleDescription('Visible to everyone on the public site.');
	await expect(described.locator('.sw-description')).toBeVisible();
	await expect(knobIcon(page, 'described')).toHaveAttribute('data-icon', 'check');

	// The note of a field is not a description: the form prints it, once, under the box.
	await expect(box(page, 'unset').locator('.sw-description')).toHaveCount(0);
	await expect(fieldOf(page, 'unset').getByText('A note which the form prints itself.')).toHaveCount(1);

	await expect(edited(page)).toHaveCount(0);
});

test('is named by its field and its label, so two switches with the same label are told apart', async ({ page }) => {
	await openItem(page, COLLECTION, still);

	// Three fields show the default label. The name of each starts with the name of its field, which the form prints above it.
	for (const [name, title] of [
		['plain', 'Plain'],
		['unset', 'Unset'],
		['preset', 'Preset'],
	] as const) {
		await expect(fieldOf(page, name).locator('.field-name')).toContainText(title);
		await expect(box(page, name).locator('.sw-label')).toHaveText('Enabled');
		await expect(box(page, name)).toHaveAccessibleName(`${title} Enabled`);
		await expect(page.locator('main').getByRole('switch', { name: `${title} Enabled`, exact: true })).toHaveCount(1);
	}

	// A label of its own comes after the name of the field as well, and the description stays the description.
	await expect(box(page, 'described')).toHaveAccessibleName('Described Published');
	await expect(box(page, 'described')).toHaveAccessibleDescription('Visible to everyone on the public site.');
	await expect(box(page, 'locked')).toHaveAccessibleName('Locked Archived');

	// Where the label says what the name of the field says, it is said once.
	await expect(fieldOf(page, 'published').locator('.field-name')).toContainText('Published');
	await expect(box(page, 'published')).toHaveAccessibleName('Published');

	// Nothing of this is seen: the box shows its label and nothing else.
	await expect(box(page, 'plain')).toHaveText('Enabled', { useInnerText: true });
});

test('a click anywhere in the box flips the value, and the item saves it', async ({ page, api }) => {
	const id = await fresh(api);
	await openItem(page, COLLECTION, id);

	const plain = box(page, 'plain');

	await plain.locator('.sw-label').click();
	await expect(plain).toHaveAttribute('aria-checked', 'true');
	await expect(knobIcon(page, 'plain')).toHaveAttribute('data-icon', 'check');
	await expect(fieldOf(page, 'plain').locator('.field-label.edited')).toHaveCount(1);

	await save(page);
	expect((await api.get(`/items/${COLLECTION}/${id}`)).plain).toBe(true);

	await plain.locator('.sw-track').click();
	await expect(plain).toHaveAttribute('aria-checked', 'false');

	await save(page);
	expect((await api.get(`/items/${COLLECTION}/${id}`)).plain).toBe(false);
});

test('a click on the description and on the padding of the box flips the value too', async ({ page, api }) => {
	const id = await fresh(api);
	await openItem(page, COLLECTION, id);

	const described = box(page, 'described');
	await expect(described).toHaveAttribute('aria-checked', 'true');

	await described.locator('.sw-description').click();
	await expect(described).toHaveAttribute('aria-checked', 'false');

	// The padding: inside the border of 2px, outside the text and the track, at the first corner and at the last.
	const outer = (await described.boundingBox())!;
	const text = (await described.locator('.sw-text').boundingBox())!;
	const track = (await described.locator('.sw-track').boundingBox())!;
	expect(text.x - outer.x).toBeGreaterThan(5);
	expect(text.y - outer.y).toBeGreaterThan(5);
	expect(outer.x + outer.width - (track.x + track.width)).toBeGreaterThan(5);

	await described.click({ position: { x: 4, y: 4 } });
	await expect(described).toHaveAttribute('aria-checked', 'true');

	await described.click({ position: { x: outer.width - 4, y: outer.height - 4 } });
	await expect(described).toHaveAttribute('aria-checked', 'false');

	await save(page);
	expect((await api.get(`/items/${COLLECTION}/${id}`)).described).toBe(false);
});

test('Space and Enter flip the value, and keyboard focus shows on the box', async ({ page, api }) => {
	const id = await fresh(api);
	await openItem(page, COLLECTION, id);

	const described = box(page, 'described');

	// Reached with the Tab key, from the label of its field.
	await fieldOf(page, 'described').locator('button.field-name').focus();
	await page.keyboard.press('Tab');
	await expect(described).toBeFocused();
	await expect(described).toHaveCSS('outline-style', 'solid');

	await page.keyboard.press('Space');
	await expect(described).toHaveAttribute('aria-checked', 'false');

	await page.keyboard.press('Enter');
	await expect(described).toHaveAttribute('aria-checked', 'true');

	await page.keyboard.press('Space');
	await expect(described).toHaveAttribute('aria-checked', 'false');

	await save(page);
	expect((await api.get(`/items/${COLLECTION}/${id}`)).described).toBe(false);
});

test('a field without an answer has a look of its own, and the first click turns it on', async ({ page, api }) => {
	const id = await fresh(api);
	await openItem(page, COLLECTION, id);

	const unset = box(page, 'unset');
	await expect(unset).toHaveClass(/sw-unset/);
	await expect(unset).toHaveAttribute('aria-checked', 'false');
	// The role has no third state, so the description says it, in the app's words for a field without a value.
	await expect(unset).toHaveAccessibleDescription('No value');
	await expect(knobIcon(page, 'unset')).toHaveAttribute('data-icon', 'remove');

	// The knob sits in the middle of the track: not where off puts it, not where on does.
	await expect(box(page, 'plain')).toHaveClass(/sw-off/);
	await expect(box(page, 'bare')).toHaveClass(/sw-on/);
	expect(await knobOffset(box(page, 'plain'))).toBeLessThan(await knobOffset(unset));
	expect(await knobOffset(unset)).toBeLessThan(await knobOffset(box(page, 'bare')));

	await unset.click();
	await expect(unset).toHaveClass(/sw-on/);
	await expect(unset).toHaveAttribute('aria-checked', 'true');
	await expect(unset).toHaveAccessibleDescription('');

	await save(page);
	expect((await api.get(`/items/${COLLECTION}/${id}`)).unset).toBe(true);
});

test('a read-only field shows its state dimmed and cannot be changed', async ({ page, api }) => {
	const id = await fresh(api);
	await openItem(page, COLLECTION, id);

	const locked = box(page, 'locked');
	await expect(locked).toHaveAttribute('aria-checked', 'true');
	await expect(locked).toHaveClass(/sw-dimmed/);
	await expect(locked).toBeDisabled();
	await expect(locked.locator('.sw-track')).toHaveCSS('opacity', '0.5');

	// Not by a click, and not by the keyboard: Tab passes it by.
	await locked.click({ force: true });
	await fieldOf(page, 'locked').locator('button.field-name').focus();
	await page.keyboard.press('Tab');
	await expect(locked).not.toBeFocused();
	await page.keyboard.press('Space');

	await expect(locked).toHaveAttribute('aria-checked', 'true');
	await expect(fieldOf(page, 'locked').locator('.field-label.edited')).toHaveCount(0);
	expect((await api.get(`/items/${COLLECTION}/${id}`)).locked).toBe(true);
});

test('takes its colours and icons from the options', async ({ page }) => {
	await openItem(page, COLLECTION, still);

	const styled = box(page, 'styled');
	const track = styled.locator('.sw-track');

	await expect(track).toHaveCSS('background-color', 'rgb(46, 205, 167)');
	await expect(knobIcon(page, 'styled')).toHaveAttribute('data-icon', 'visibility');

	await styled.click();
	await expect(track).toHaveCSS('background-color', 'rgb(227, 81, 105)');
	await expect(knobIcon(page, 'styled')).toHaveAttribute('data-icon', 'visibility_off');

	// A theme variable is a colour as well, and is whatever the theme makes of it.
	const themed = box(page, 'themed');
	await expect(themed.locator('.sw-track')).toHaveCSS('background-color', await colorAt(themed, 'var(--theme--success)'));
	await themed.click();
	await expect(themed.locator('.sw-track')).toHaveCSS('background-color', await colorAt(themed, 'var(--theme--danger)'));

	// Without a colour of its own the track is the primary colour of the theme while on.
	await expect(box(page, 'bare').locator('.sw-track')).toHaveCSS('background-color', await colorAt(box(page, 'bare'), 'var(--theme--primary)'));

	// An icon which was cleared leaves the knob plain, on and off.
	const bare = box(page, 'bare');
	await expect(bare.locator('.sw-knob .v-icon')).toHaveCount(0);
	await bare.click();
	await expect(bare).toHaveAttribute('aria-checked', 'false');
	await expect(bare.locator('.sw-knob .v-icon')).toHaveCount(0);
});

test('is as tall as a stock input, and grows with text which wraps', async ({ page }) => {
	await openItem(page, COLLECTION, still);

	const input = (await fieldOf(page, 'stock_input').locator('.v-input').boundingBox())!;
	const toggle = (await fieldOf(page, 'stock_toggle').locator('.v-checkbox').boundingBox())!;
	const plain = (await box(page, 'plain').boundingBox())!;
	const described = (await box(page, 'described').boundingBox())!;

	// One line, and one line with a line of description, fit the height of the stock controls.
	expect(plain.height).toBe(input.height);
	expect(plain.height).toBe(toggle.height);
	expect(described.height).toBe(input.height);
	expect(plain.width).toBe(input.width);

	// A long label and a word with no place to break stay inside the box, and so does the switch.
	const wordy = box(page, 'wordy');
	const outer = (await wordy.boundingBox())!;
	const text = (await wordy.locator('.sw-text').boundingBox())!;
	const track = (await wordy.locator('.sw-track').boundingBox())!;

	expect(outer.height).toBeGreaterThan(plain.height * 2);
	expect(outer.width).toBe(plain.width);
	expect(track.width).toBe((await box(page, 'plain').locator('.sw-track').boundingBox())!.width);
	expect(text.x).toBeGreaterThan(outer.x);
	expect(text.x + text.width).toBeLessThan(track.x);
	expect(track.x + track.width).toBeLessThan(outer.x + outer.width);
	expect(await wordy.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test('a new item starts from the default value of the field', async ({ page }) => {
	await page.goto(`/admin/content/${COLLECTION}/+`);
	await page.locator('main .v-form .field').first().waitFor();

	await expect(box(page, 'preset')).toHaveAttribute('aria-checked', 'true');
	await expect(box(page, 'preset')).toHaveClass(/sw-on/);
	await expect(box(page, 'plain')).toHaveClass(/sw-unset/);
	await expect(edited(page)).toHaveCount(0);
});

test('the default label is in the language of the user', async ({ page, api }) => {
	const { language } = await api.get('/users/me?fields=language');
	await api.patch('/users/me', { language: 'de-DE' });

	try {
		await openItem(page, COLLECTION, still);

		// The stock Toggle beside it shows the app's word for "Enabled", once the language has arrived.
		const stock = fieldOf(page, 'stock_toggle').locator('.v-checkbox .label');
		await expect(stock).toHaveText(/\S/);
		await expect(stock).not.toHaveText('Enabled');
		const word = (await stock.innerText()).trim();

		// Ours has no `label` option, so it shows the same word, not the English fallback.
		await expect(box(page, 'plain').locator('.sw-label')).toHaveText(word);
		await expect(box(page, 'plain')).toHaveAccessibleName(`Plain ${word}`);

		// What is said of a field without a value is the app's as well, and so in that language.
		await expect(box(page, 'unset')).toHaveClass(/sw-unset/);
		await expect(box(page, 'unset')).toHaveAccessibleDescription(/\S/);
		await expect(box(page, 'unset')).not.toHaveAccessibleDescription('No value');
	} finally {
		await api.patch('/users/me', { language });
	}
});

test('in a right-to-left page the switch is at the left end and the knob travels to the left', async ({ page }) => {
	await openItem(page, COLLECTION, still);

	await turn(page, 'rtl');

	for (const [name, state] of [
		['plain', 'off'],
		['described', 'on'],
		['unset', 'unset'],
	] as const) {
		const control = box(page, name);
		await expect(control).toHaveClass(new RegExp(`sw-${state}`));
		await expect(control).toHaveCSS('direction', 'rtl');

		const outer = (await control.boundingBox())!;
		const text = (await control.locator('.sw-text').boundingBox())!;
		const track = (await control.locator('.sw-track').boundingBox())!;
		const knob = (await control.locator('.sw-knob').boundingBox())!;

		// The switch is at the left end of the box, the text to the right of it.
		expect(track.x - outer.x).toBeLessThan(outer.x + outer.width - (track.x + track.width));
		expect(text.x).toBeGreaterThan(track.x + track.width);

		// The knob is inside the track: at its right end while off, at its left end while on.
		const left = knob.x - track.x;
		const right = track.x + track.width - (knob.x + knob.width);
		expect(left).toBeGreaterThan(0);
		expect(right).toBeGreaterThan(0);

		if (state === 'off') expect(right).toBeLessThan(left);
		if (state === 'on') expect(left).toBeLessThan(right);
		if (state === 'unset') expect(Math.abs(left - right)).toBeLessThan(1);

		// What was measured was a mirrored page to the end.
		expect(await control.evaluate((element) => getComputedStyle(element).direction)).toBe('rtl');
	}
});

test('an icon name which is not an icon stays inside the knob', async ({ page }) => {
	await openItem(page, COLLECTION, still);

	const odd = box(page, 'odd');
	const drawing = odd.locator('.sw-knob .v-icon');
	await expect(odd).toHaveClass(/sw-on/);
	await odd.scrollIntoViewIfNeeded();
	await page.evaluate(() => document.fonts.ready);

	// The app draws the name as text, many times wider than the knob.
	const width = await knobIcon(page, 'odd').evaluate((glyph) => glyph.scrollWidth);
	expect(width).toBeGreaterThan((await odd.locator('.sw-knob').boundingBox())!.width * 3);

	// Pictures of the form to the left and to the right of the knob, as tall as the box.
	const beside = async () => {
		const form = (await page.locator('main .v-form').boundingBox())!;
		const outer = (await odd.boundingBox())!;
		const knob = (await odd.locator('.sw-knob').boundingBox())!;
		const from = Math.floor(knob.x);
		const to = Math.ceil(knob.x + knob.width);
		const band = { y: outer.y, height: outer.height };

		return {
			left: await page.screenshot({ clip: { ...band, x: form.x, width: from - form.x } }),
			right: await page.screenshot({ clip: { ...band, x: to, width: form.x + form.width - to } }),
		};
	};

	// A page which was just opened or mirrored may still be moving (a scroll,
	// a transition), so a picture counts once the next one is the same.
	const steady = async () => {
		let last = await beside();

		await expect
			.poll(async () => {
				const next = await beside();
				const same = next.left.equals(last.left) && next.right.equals(last.right);
				last = next;
				return same;
			})
			.toBe(true);

		return last;
	};

	// Whatever is drawn for the name, the label, the border of the box and
	// the field beside it look exactly as they do with nothing in the knob.
	const seen: Record<string, object> = {};

	for (const direction of ['ltr', 'rtl'] as const) {
		await turn(page, direction);
		await expect(odd).toHaveCSS('direction', direction);

		const drawn = await steady();
		await drawing.evaluate((element: HTMLElement) => (element.style.visibility = 'hidden'));
		const empty = await steady();
		await drawing.evaluate((element: HTMLElement) => (element.style.visibility = ''));

		seen[direction] = {
			left: drawn.left.equals(empty.left) ? 'untouched' : 'drawn over',
			right: drawn.right.equals(empty.right) ? 'untouched' : 'drawn over',
			overflows: await odd.evaluate((element) => element.scrollWidth > element.clientWidth),
			// The pictures were taken of a page in this direction, to the last one.
			direction: await odd.evaluate((element) => getComputedStyle(element).direction),
		};
	}

	expect(seen).toEqual({
		ltr: { left: 'untouched', right: 'untouched', overflows: false, direction: 'ltr' },
		rtl: { left: 'untouched', right: 'untouched', overflows: false, direction: 'rtl' },
	});

	// An icon which is one is not cut: the glyph fits its box, and the box fits the knob.
	for (const name of ['described', 'styled']) {
		await expect.poll(() => knobIcon(page, name).evaluate((glyph) => glyph.scrollWidth <= glyph.parentElement!.clientWidth)).toBe(true);
	}

	for (const name of ['described', 'styled', 'branded']) {
		const knob = (await box(page, name).locator('.sw-knob').boundingBox())!;
		const glyph = (await box(page, name).locator('.sw-knob .v-icon > *').boundingBox())!;

		expect(glyph.x).toBeGreaterThanOrEqual(knob.x);
		expect(glyph.y).toBeGreaterThanOrEqual(knob.y);
		expect(glyph.x + glyph.width).toBeLessThanOrEqual(knob.x + knob.width);
		expect(glyph.y + glyph.height).toBeLessThanOrEqual(knob.y + knob.height);
	}
});

test('in the comparison of revisions a switch is inert but keeps its full colours', async ({ page, api }) => {
	const id = await fresh(api);

	// A change makes a revision to compare with.
	await api.patch(`/items/${COLLECTION}/${id}`, { described: false });
	await openItem(page, COLLECTION, id);

	// In the form the read-only field is dimmed.
	await expect(box(page, 'locked')).toHaveClass(/sw-dimmed/);
	await expect(box(page, 'locked').locator('.sw-track')).toHaveCSS('opacity', '0.5');

	await page.getByText('Revisions', { exact: true }).click();
	await page.locator('.revision-item').first().click();

	// The comparison shows the item twice. Neither side can be changed, and neither is dimmed: not even the read-only field.
	const modal = page.locator('.comparison-modal');
	const compared = modal.locator('.switch');
	await expect(modal.locator('.field[data-field="locked"] .switch')).toHaveCount(2);

	for (const control of await modal.locator('.field[data-field="locked"] .switch, .field[data-field="plain"] .switch').all()) {
		await expect(control).toBeDisabled();
		await expect(control).toHaveClass(/sw-inert/);
		await expect(control).not.toHaveClass(/sw-dimmed/);
		await expect(control.locator('.sw-track')).toHaveCSS('opacity', '1');
	}

	expect(await compared.count()).toBeGreaterThan(10);
	await expect(modal.locator('.switch.sw-dimmed')).toHaveCount(0);
	await expect(modal.locator('.switch:not(.sw-inert)')).toHaveCount(0);

	// The two sides show the two values of the field which changed.
	const described = modal.locator('.field[data-field="described"] .switch');
	const sides = await described.evaluateAll((controls) => controls.map((control) => control.getAttribute('aria-checked')));
	expect(sides.sort()).toEqual(['false', 'true']);

	// A click on one changes nothing.
	await modal.locator('.field[data-field="plain"] .switch').first().click({ force: true });
	await expect(modal.locator('.field[data-field="plain"] .switch').first()).toHaveAttribute('aria-checked', 'false');
});

test('under a contrast theme of the system the track, the knob and every state are drawn in system colours', async ({ page }) => {
	await openItem(page, COLLECTION, still);

	const bare = box(page, 'bare');
	const unset = box(page, 'unset');
	const plain = box(page, 'plain');
	const locked = box(page, 'locked');

	await expect(bare).toHaveClass(/sw-on/);
	await expect(unset).toHaveClass(/sw-unset/);

	const places = { on: await knobOffset(bare), off: await knobOffset(plain), unset: await knobOffset(unset) };

	await page.emulateMedia({ forcedColors: 'active' });

	const system = {
		canvas: await colorAt(bare, 'Canvas'),
		text: await colorAt(bare, 'CanvasText'),
		highlight: await colorAt(bare, 'Highlight'),
		highlightText: await colorAt(bare, 'HighlightText'),
		gray: await colorAt(bare, 'GrayText'),
	};

	// A switch with its icons cleared has nothing but its track and its knob to show its state with. On: filled.
	await expect(bare.locator('.sw-knob .v-icon')).toHaveCount(0);
	await expect(bare.locator('.sw-track')).toHaveCSS('background-color', system.highlight);
	await expect(bare.locator('.sw-knob')).toHaveCSS('background-color', system.highlightText);

	// Off: hollow, with an outline and a solid knob.
	await bare.click();
	await expect(bare).toHaveClass(/sw-off/);
	await expect(bare.locator('.sw-track')).toHaveCSS('background-color', system.canvas);
	await expect(bare.locator('.sw-track')).toHaveCSS('outline-style', 'solid');
	await expect(bare.locator('.sw-track')).toHaveCSS('outline-color', system.text);
	await expect(bare.locator('.sw-knob')).toHaveCSS('background-color', system.text);
	expect(system.highlight).not.toBe(system.canvas);
	expect(system.text).not.toBe(system.canvas);

	// An icon is drawn in the colour its knob is not.
	await expect(plain.locator('.sw-knob')).toHaveCSS('background-color', system.text);
	await expect(plain.locator('.sw-knob .v-icon')).toHaveCSS('color', system.canvas);
	await expect(box(page, 'described').locator('.sw-knob .v-icon')).toHaveCSS('color', system.highlight);

	// The colours of the options give way.
	await expect(box(page, 'styled').locator('.sw-track')).toHaveCSS('background-color', system.highlight);

	// Not set: a dashed outline.
	await expect(unset.locator('.sw-track')).toHaveCSS('background-color', system.canvas);
	await expect(unset.locator('.sw-track')).toHaveCSS('outline-style', 'dashed');
	await expect(unset.locator('.sw-track')).toHaveCSS('outline-color', system.gray);
	await expect(unset.locator('.sw-knob')).toHaveCSS('background-color', system.gray);

	// Read-only: the system's colour for what cannot be used, at full strength.
	await expect(locked).toHaveClass(/sw-dimmed/);
	await expect(locked.locator('.sw-track')).toHaveCSS('opacity', '1');
	await expect(locked.locator('.sw-track')).toHaveCSS('background-color', system.gray);
	await expect(locked).toHaveCSS('color', system.gray);

	// The outline takes no room: every knob is where it was.
	await bare.click();
	await expect(bare).toHaveClass(/sw-on/);
	await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
	expect({ on: await knobOffset(bare), off: await knobOffset(plain), unset: await knobOffset(unset) }).toEqual(places);
});

test('asks for track and knob in print but not for its box, eases only its border and shadow, and holds still for reduced motion', async ({ page }) => {
	await openItem(page, COLLECTION, still);

	const plain = box(page, 'plain');

	// A browser prints no background unless it is asked to, and track and knob are backgrounds.
	await expect(plain.locator('.sw-track')).toHaveCSS('print-color-adjust', 'exact');
	await expect(plain.locator('.sw-knob')).toHaveCSS('print-color-adjust', 'exact');

	// The box does not ask, like the stock input beside it: its own background would print too, black in a dark theme.
	await expect(plain).toHaveCSS('print-color-adjust', 'economy');
	await expect(plain.locator('.sw-text')).toHaveCSS('print-color-adjust', 'economy');
	await expect(fieldOf(page, 'stock_input').locator('.v-input .input')).toHaveCSS('print-color-adjust', 'economy');

	// Like the stock input beside it, so the look of a field which becomes read-only is there at once.
	await expect(plain).toHaveCSS('transition-property', 'border-color, box-shadow');
	await expect(fieldOf(page, 'stock_input').locator('.v-input .input')).toHaveCSS('transition-property', 'border-color, box-shadow');

	// The knob slides once the switch was flipped by hand, and not before: the item arriving is no reason to.
	await expect(plain.locator('.sw-knob')).toHaveCSS('transition-duration', '0s');
	await plain.click();
	await expect(plain).toHaveClass(/sw-animated/);
	await expect(plain.locator('.sw-knob')).toHaveCSS('transition-property', 'inset-inline-start');
	await expect(plain.locator('.sw-knob')).not.toHaveCSS('transition-duration', '0s');

	await page.emulateMedia({ reducedMotion: 'reduce' });
	await expect(plain.locator('.sw-knob')).toHaveCSS('transition-duration', '0s');
	await expect(plain.locator('.sw-track')).toHaveCSS('transition-duration', '0s');
	await expect(plain).toHaveCSS('transition-duration', '0s');
});

test('the numbers 0 and 1 are drawn as off and on, and a toggle writes a boolean', async ({ page, api }) => {
	const id = await fresh(api);

	// The fields have no `cast-boolean`, so the database's own numbers arrive.
	const stored = await api.get(`/items/${COLLECTION}/${id}?fields=raw_off,raw_on`);
	expect(stored).toEqual({ raw_off: 0, raw_on: 1 });

	await openItem(page, COLLECTION, id);

	const off = box(page, 'raw_off');
	const on = box(page, 'raw_on');
	await expect(off).toHaveClass(/sw-off/);
	await expect(off).toHaveAttribute('aria-checked', 'false');
	await expect(knobIcon(page, 'raw_off')).toHaveAttribute('data-icon', 'close');
	await expect(on).toHaveClass(/sw-on/);
	await expect(on).toHaveAttribute('aria-checked', 'true');
	await expect(knobIcon(page, 'raw_on')).toHaveAttribute('data-icon', 'check');
	await expect(edited(page)).toHaveCount(0);

	await off.click();
	await on.click();
	await expect(off).toHaveAttribute('aria-checked', 'true');
	await expect(on).toHaveAttribute('aria-checked', 'false');

	// What the form sends is `true` and `false`, not numbers.
	const sent = page.waitForRequest((request) => request.method() === 'PATCH' && request.url().includes(`/items/${COLLECTION}/${id}`));
	await save(page);
	expect((await sent).postDataJSON()).toEqual({ raw_off: true, raw_on: false });

	// And they come back as the numbers of the other state, which are drawn again.
	expect(await api.get(`/items/${COLLECTION}/${id}?fields=raw_off,raw_on`)).toEqual({ raw_off: 1, raw_on: 0 });
	await expect(off).toHaveClass(/sw-on/);
	await expect(on).toHaveClass(/sw-off/);
});

test('works in a row of a stock Repeater', async ({ page, api }) => {
	const id = await fresh(api);
	await openItem(page, COLLECTION, id);

	const rows = fieldOf(page, 'rows');
	const inRow = page.locator('.v-drawer .field[data-field="active"] .switch');
	const confirm = page.locator('.v-drawer button.icon:has([data-icon="check"])');

	// A row which holds `false`: off, and named by the field of the row and its label.
	await rows.getByText('one', { exact: true }).click();
	await expect(inRow).toHaveRole('switch');
	await expect(inRow).toHaveClass(/sw-off/);
	await expect(inRow).toHaveAccessibleName('Active Shown on the site');

	await inRow.click();
	await expect(inRow).toHaveClass(/sw-on/);
	await confirm.click();
	await expect(inRow).toHaveCount(0);

	// A new row holds nothing yet: not set, and on with the first click.
	await rows.getByRole('button', { name: 'Create New' }).click();
	await expect(inRow).toHaveClass(/sw-unset/);
	await expect(inRow).toHaveAccessibleDescription('No value');

	await inRow.click();
	await expect(inRow).toHaveAttribute('aria-checked', 'true');
	await confirm.click();
	await expect(inRow).toHaveCount(0);

	await save(page);
	expect((await api.get(`/items/${COLLECTION}/${id}`)).rows).toEqual([{ title: 'one', active: true }, { active: true }]);
});

test('the settings of a field offer the six options, and say that a theme variable can be typed', async ({ page }) => {
	await page.goto(`/admin/settings/data-model/${COLLECTION}/styled`);
	await page.locator('.v-drawer .v-tab', { hasText: 'Interface' }).click();

	const option = (key: string) => page.locator(`.v-drawer .field[data-field="${key}"]`);

	for (const key of ['label', 'description', 'iconOn', 'iconOff', 'colorOn', 'colorOff']) await expect(option(key)).toBeVisible();

	// The names are the app's own, in its spelling, and the notes follow it.
	await expect(option('colorOn').locator('.field-name')).toContainText('Color On');
	await expect(option('colorOff').locator('.field-name')).toContainText('Color Off');
	const typed = (variable: string) => `A theme variable such as ${variable} can be typed in.`;
	await expect(option('colorOn').locator('.type-note')).toHaveText(`Primary color when empty. ${typed('var(--theme--success)')}`);
	await expect(option('colorOff').locator('.type-note')).toHaveText(`Gray when empty. ${typed('var(--theme--danger)')}`);
});
