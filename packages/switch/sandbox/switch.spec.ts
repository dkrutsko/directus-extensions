// Browser tests of the Switch interface in the sandbox Directus
// (see ../../../sandbox/README.md). They cover what the unit tests cannot:
// that the built bundle loads in a real Data Studio, draws every state, and
// that a click or a key press ends up as `true` or `false` in the saved item.
import { expect, openItem, test } from '../../../sandbox/support/fixtures.ts';

type Page = Parameters<typeof openItem>[0];

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

// The item the tests change, and one which stays as it was seeded.
let id: number;
let still: number;

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
			field('styled', {
				options: {
					label: 'Visible',
					iconOn: 'visibility',
					iconOff: 'visibility_off',
					colorOn: '#2ECDA7',
					colorOff: '#E35169',
				},
			}),
			// What the icon picker stores for an icon which was cleared.
			field('bare', { options: { label: 'Plain knob', iconOn: null, iconOff: null } }),
			field('locked', { readonly: true, options: { label: 'Archived', description: 'Set by the nightly job.' } }),
			field('unset', { note: 'A note which the form prints itself.' }),
			field('wordy', { options: { label: LONG_LABEL, description: LONG_WORD } }),
			field('preset', {}, { default_value: true }),
			// A name the icon set does not have, which the app draws as text, and one of its social icons.
			field('odd', { options: { label: 'Unknown icon', iconOn: 'no_such_icon_name_at_all' } }),
			field('branded', { options: { label: 'Social icon', iconOn: 'github' } }),
		],
	});

	const values = {
		plain: false,
		stock_input: 'A stock input',
		described: true,
		stock_toggle: true,
		styled: true,
		bare: true,
		locked: true,
		unset: null,
		wordy: false,
		preset: false,
		odd: true,
		branded: true,
	};

	id = (await api.post(`/items/${COLLECTION}`, values)).id;
	still = (await api.post(`/items/${COLLECTION}`, values)).id;
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

test('draws a switch in the state of the value', async ({ page }) => {
	await openItem(page, COLLECTION, id);

	// No options: "Enabled" on one line, off, a cross in the knob.
	const plain = box(page, 'plain');
	await expect(plain).toHaveRole('switch');
	await expect(plain).toHaveAccessibleName('Enabled');
	await expect(plain).toHaveAttribute('aria-checked', 'false');
	await expect(plain).toHaveClass(/sw-off/);
	await expect(plain.locator('.sw-description')).toHaveCount(0);
	await expect(knobIcon(page, 'plain')).toHaveAttribute('data-icon', 'close');

	// A label and a description: on, a check in the knob, and both are announced.
	const described = box(page, 'described');
	await expect(described).toHaveAttribute('aria-checked', 'true');
	await expect(described).toHaveClass(/sw-on/);
	await expect(described).toHaveAccessibleName('Published');
	await expect(described).toHaveAccessibleDescription('Visible to everyone on the public site.');
	await expect(described.locator('.sw-description')).toBeVisible();
	await expect(knobIcon(page, 'described')).toHaveAttribute('data-icon', 'check');

	// The note of a field is not a description: the form prints it, once, under the box.
	await expect(box(page, 'unset').locator('.sw-description')).toHaveCount(0);
	await expect(fieldOf(page, 'unset').getByText('A note which the form prints itself.')).toHaveCount(1);

	await expect(edited(page)).toHaveCount(0);
});

test('a click anywhere in the box flips the value, and the item saves it', async ({ page, api }) => {
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

test('Space and Enter flip the value, and keyboard focus shows on the box', async ({ page, api }) => {
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
	await openItem(page, COLLECTION, id);

	const unset = box(page, 'unset');
	await expect(unset).toHaveClass(/sw-unset/);
	await expect(unset).toHaveAttribute('aria-checked', 'false');
	await expect(unset).toHaveAccessibleDescription('Not set');
	await expect(knobIcon(page, 'unset')).toHaveAttribute('data-icon', 'remove');

	// The knob sits in the middle of the track: not where off puts it, not where on does.
	const offset = async (name: string) => {
		const track = (await box(page, name).locator('.sw-track').boundingBox())!;
		const knob = (await box(page, name).locator('.sw-knob').boundingBox())!;
		return Math.round(knob.x - track.x);
	};

	await expect(box(page, 'plain')).toHaveClass(/sw-off/);
	await expect(box(page, 'bare')).toHaveClass(/sw-on/);
	expect(await offset('plain')).toBeLessThan(await offset('unset'));
	expect(await offset('unset')).toBeLessThan(await offset('bare'));

	await unset.click();
	await expect(unset).toHaveClass(/sw-on/);
	await expect(unset).toHaveAttribute('aria-checked', 'true');

	await save(page);
	expect((await api.get(`/items/${COLLECTION}/${id}`)).unset).toBe(true);
});

test('a read-only field shows its state dimmed and cannot be changed', async ({ page, api }) => {
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
	await openItem(page, COLLECTION, id);

	const styled = box(page, 'styled');
	const track = styled.locator('.sw-track');

	await expect(track).toHaveCSS('background-color', 'rgb(46, 205, 167)');
	await expect(knobIcon(page, 'styled')).toHaveAttribute('data-icon', 'visibility');

	await styled.click();
	await expect(track).toHaveCSS('background-color', 'rgb(227, 81, 105)');
	await expect(knobIcon(page, 'styled')).toHaveAttribute('data-icon', 'visibility_off');

	// Without a colour of its own the track is the primary colour of the theme while on.
	const primary = await page.evaluate(() => {
		const probe = document.body.appendChild(document.createElement('span'));
		probe.style.color = 'var(--theme--primary)';
		const color = getComputedStyle(probe).color;
		probe.remove();
		return color;
	});

	await expect(box(page, 'bare').locator('.sw-track')).toHaveCSS('background-color', primary);

	// An icon which was cleared leaves the knob plain, on and off.
	const bare = box(page, 'bare');
	await expect(bare.locator('.sw-knob .v-icon')).toHaveCount(0);
	await bare.click();
	await expect(bare).toHaveAttribute('aria-checked', 'false');
	await expect(bare.locator('.sw-knob .v-icon')).toHaveCount(0);
});

test('is as tall as a stock input, and grows with text which wraps', async ({ page }) => {
	await openItem(page, COLLECTION, id);

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
		await expect(box(page, 'plain')).toHaveAccessibleName(word);
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
