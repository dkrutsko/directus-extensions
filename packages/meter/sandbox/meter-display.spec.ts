// Browser tests of the Meter bundle: the display. In the table layout, in a template of related values and in the
// calendar, by its own options and by those of the interface, and what becomes of a text which does not fit.
import { expect, openItem, test } from '../../../sandbox/support/fixtures.ts';
import {
	AMBER,
	COLLECTION,
	COLUMNS,
	GREEN,
	LONG_SUFFIX,
	OTHERS,
	OWNERS,
	RED,
	RGB,
	UNITS,
	UNIT_COLUMNS,
	attributes,
	bookmarks,
	edges,
	expectFilled,
	expectTooltip,
	fieldOf,
	fill,
	ids,
	makeUser,
	meter,
	removeAll,
	seedMain,
	seedOwners,
	seedUnits,
	shown,
	signedIn,
	squeezed,
	steps,
	table,
	text,
	token,
	track,
	turn,
} from './meter-support.ts';
import type { Credentials, Locator } from './meter-support.ts';

// A user who reads numbers in Arabic digits and the page from the right.
let arabic: Credentials;

test.beforeAll(async ({ api }) => {
	await removeAll(api);
	await seedMain(api);
	await seedOwners(api);
	await seedUnits(api);
	arabic = await makeUser(api, 'arabic', { language: 'ar-SA' });
});

test.afterAll(async ({ api }) => {
	await removeAll(api);
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
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${bookmarks.others}`);
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
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${bookmarks.others}`);

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
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${bookmarks.others}`);
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
	await expect(colour).toContainText('Primary color when empty');
	await expect(thresholds.locator('.v-list-item')).toHaveCount(0);
	await expect(thresholds.locator('.v-notice')).toBeVisible();
	await expect(dialogs.locator('.v-notice', { hasText: 'An emptied color or list of thresholds means none' })).toBeVisible();

	// And the table draws neither: the primary colour, though 40 is beyond the threshold of the interface.
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${bookmarks.others}`);
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
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${bookmarks.others}`);
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

		expect(
			states.filter((state) => state.part > 0),
			`numbers shown in part, ${direction}`,
		).toEqual([]);
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
		expect(
			states.filter((state) => state.part > 0),
			`numbers shown in part, ${direction}`,
		).toEqual([]);
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

test('for a user with Arabic digits a fraction which does not fit is left out as well, not cut to its maximum', async ({ browser }) => {
	// A user of the test's own with that language: the administrator, whom every other test signs in as, keeps theirs.
	const { context, page, quiet } = await signedIn(browser, {}, arabic);

	try {
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

		quiet();
	} finally {
		await context.close();
	}
});

test('the display as plain text is the text beside the bar, in the titles of the calendar layout', async ({ page }) => {
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${bookmarks.calendar}`);

	// The calendar renders its template to a string, for which the app asks the display of each field for text: the
	// percentage, with the Slider's limits and with limits which are text, the value over the maximum, and the
	// percentage of a field whose text is switched off in the layout. Then by the display's own options: its limits
	// and its format, its format alone, and its format with the range of the interface. Then a field which holds
	// both pairs of limits, as a Slider and as a Meter, which is 0 to 10 for both. And nothing for an empty field.
	const entry = page.locator('.fc-event', { hasText: 'First' });
	await expect(entry).toHaveCount(1);
	await expect(entry).toHaveText('First: 50% | 50% | 40% | 7 / 12 | 25% | 35 / 60 | 5 | 50% | 30% | 30% |');
});

test("a prefix and a suffix in the table: by the interface's options, by the display's own, in the tooltip, and a long one left out whole", async ({
	page,
}) => {
	await page.goto(`/admin/content/${UNITS}`);
	await expect(page.locator('table tbody tr.table-row')).toHaveCount(1);

	const units = table(page, UNIT_COLUMNS);
	const said = (name: string) => units.cell('Only', name).getByRole('meter');

	// Taken from the interface, like every other option: the value, the fraction, and neither for a percentage.
	await expect(units.number('Only', 'cost')).toHaveText('$4,200');
	await expect(units.number('Only', 'disk')).toHaveText('42 / 100 GB');
	await expect(units.number('Only', 'budget')).toHaveText('$4,200 / $10,000');
	await expect(units.number('Only', 'ratio')).toHaveText('42%');

	// The display's own suffix with the interface's prefix and format; and a display on a stock Slider.
	await expect(units.number('Only', 'own')).toHaveText('$42 MB');
	await expect(units.number('Only', 'speed')).toHaveText('42 km/h');

	// A field without a value has the dash of the app, and no meter.
	await expect(units.display('Only', 'blank')).toHaveCount(0);
	await expect(units.cell('Only', 'blank').locator('.null')).toHaveCount(1);

	// The texts show whole, and what assistive technology and the tooltip have is the same text.
	for (const name of ['cost', 'disk', 'budget', 'own', 'speed']) expect(await shown(units.number('Only', name)), name).toBe('whole');
	await expect(said('cost')).toHaveAttribute('aria-valuetext', '$4,200');
	await expect(said('disk')).toHaveAttribute('aria-valuetext', '42 / 100 GB');
	await expect(said('own')).toHaveAttribute('aria-valuetext', '$42 MB');
	await expectTooltip(page, units.display('Only', 'budget'), 'Spent: $4,200 / $10,000');
	await expectTooltip(page, units.display('Only', 'disk'), '42 / 100 GB');

	// A suffix of forty characters in a column of 150px: nothing of the text shows, the bar keeps its length,
	// nothing is outside the cell and the row is as high as it would be. In a column with room for it, it is whole.
	await expect(units.number('Only', 'wordy')).toHaveText(`42${LONG_SUFFIX}`);
	expect(await shown(units.number('Only', 'wordy'))).toBe('none');
	expect((await edges(units.bar('Only', 'wordy'))).width).toBe(72);

	const cell = await edges(units.cell('Only', 'wordy'));
	const whole = await edges(units.display('Only', 'wordy'));
	expect(whole.left).toBeGreaterThanOrEqual(cell.left);
	expect(whole.right).toBeLessThanOrEqual(cell.right);
	expect(cell.bottom - cell.top).toBe((await edges(units.cell('Only', 'cost'))).bottom - (await edges(units.cell('Only', 'cost'))).top);
	expect(whole.bottom - whole.top).toBe((await edges(units.display('Only', 'cost'))).bottom - (await edges(units.display('Only', 'cost'))).top);

	await expect(said('wordy')).toHaveAttribute('aria-valuetext', `42${LONG_SUFFIX}`);
	await expectTooltip(page, units.display('Only', 'wordy'), `42${LONG_SUFFIX}`);

	expect(await shown(units.number('Only', 'roomy'))).toBe('whole');
	expect((await edges(units.bar('Only', 'roomy'))).width).toBe(72);

	// Squeezed, each text is whole or missing at every width, never a part of it.
	const states = await squeezed(page, 'table tbody td.cell', page.locator('table tbody .md-text > span'), steps(80, 480, 20));
	expect(states.map((state) => state.part)).toEqual(states.map(() => 0));
	expect(states.at(-1)!.whole).toBeGreaterThan(states[0]!.whole);
});
