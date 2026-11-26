// Browser tests of the Meter bundle: the interface as a reading in the form. That the built bundle loads in a real
// Data Studio and draws every state with the right share of the track filled, what it says to assistive technology,
// the area it takes, a right-to-left page, the prefix and the suffix of the value text, forced colours and print.
import { expect, openItem, test } from '../../../sandbox/support/fixtures.ts';
import {
	AMBER,
	CAPTION,
	COLLECTION,
	COLUMNS,
	GREEN,
	LONG_SUFFIX,
	LOOKS,
	MARKUP,
	RED,
	RGB,
	UNITS,
	WORDS,
	across,
	attributes,
	bookmarks,
	clickAt,
	colourOf,
	edges,
	edited,
	expectColour,
	expectFilled,
	expectFilledPieces,
	expectTold,
	expectTooltip,
	faded,
	fieldOf,
	fill,
	ids,
	line,
	makeUser,
	meter,
	pixel,
	pixels,
	readPieces,
	removeAll,
	rgb,
	seedMain,
	seedUnits,
	shown,
	signedIn,
	squeeze,
	strip,
	table,
	text,
	token,
	track,
	turn,
} from './meter-support.ts';
import type { Credentials, Locator } from './meter-support.ts';

// A user whose appearance is dark, and one whose language is German, so that no test changes the administrator.
let dark: Credentials;
let german: Credentials;

test.beforeAll(async ({ api }) => {
	await removeAll(api);
	await seedMain(api);
	await seedUnits(api);
	dark = await makeUser(api, 'dark', { appearance: 'dark' });
	german = await makeUser(api, 'german', { language: 'de-DE' });
});

test.afterAll(async ({ api }) => {
	await removeAll(api);
});

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
	expect((await attributes(track(page, 'plain'))).sort()).toEqual([
		'aria-label',
		'aria-valuemax',
		'aria-valuemin',
		'aria-valuenow',
		'aria-valuetext',
		'class',
		'role',
	]);
});

test('is a reading: not dimmed, no tab stop, nothing to click', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'plain')).toHaveText('50%');

	// A read-only field is not dimmed: the fill in full, at full opacity, and the text in the colour of text.
	await expectFilled(track(page, 'plain'), fill(page, 'plain'), 0.5);
	await expect(meter(page, 'plain')).toHaveCSS('opacity', '1');
	await expect(text(page, 'plain')).toHaveCSS('color', await token(page, '--theme--foreground'));
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

test('a prefix and a suffix are part of the value text in the form: before each number of a fraction, after the text, and never with a percentage', async ({
	page,
}) => {
	expect(LONG_SUFFIX.length).toBe(40);

	await openItem(page, UNITS, ids['Units']!);
	await expect(text(page, 'cost')).toHaveText('$4,200');

	// The value has both around it, the fraction the prefix before each of its numbers and the suffix once. They
	// are joined on as they were typed: the space of " GB" is the option's.
	await expect(text(page, 'disk')).toHaveText('42 / 100 GB');
	await expect(text(page, 'budget')).toHaveText('$4,200 / $10,000');
	await expect(text(page, 'own')).toHaveText('$42 GB');

	// A percentage has neither, and no value is a dash and nothing else.
	await expect(text(page, 'ratio')).toHaveText('42%');
	await expect(text(page, 'blank')).toHaveText('—');

	// What assistive technology is told is the same text, for a meter and for a slider.
	await expect(line(page, 'cost')).toHaveAttribute('aria-valuetext', '$4,200');
	await expect(line(page, 'disk')).toHaveAttribute('aria-valuetext', '42 / 100 GB');
	await expect(line(page, 'budget')).toHaveAttribute('aria-valuetext', '$4,200 / $10,000');
	await expect(line(page, 'ratio')).toHaveAttribute('aria-valuetext', '42%');
	await expect(line(page, 'blank')).toHaveAttribute('aria-valuetext', 'No value');
	await expect(fieldOf(page, 'paid').getByRole('slider')).toHaveAttribute('aria-valuetext', '$4,200');
	await expect(fieldOf(page, 'paid').getByRole('slider')).toHaveAttribute('aria-valuenow', '4200');

	// It is text: one text node in the element of the number, which runs from the left.
	expect(
		await text(page, 'cost')
			.locator('> span')
			.evaluate((element) => [element.childNodes.length, element.children.length, element.getAttribute('dir')]),
	).toEqual([1, 0, 'ltr']);

	// Editing changes the number, and what is around it stays.
	await expect(page.locator('.hydrating')).toHaveCount(0);
	await clickAt(page, 'paid', 0.5);
	await expect(text(page, 'paid')).toHaveText('$5,000');

	// A suffix of forty characters, in half of the form. The text is on one line, whole, inside its field, the
	// track is across the field and the area is as high as that of any other meter: nothing breaks.
	const number = text(page, 'wordy').locator('> span');
	await expect(number).toHaveText(`42${LONG_SUFFIX}`);
	expect(await shown(number)).toBe('whole');

	const measure = (name: string) =>
		fieldOf(page, name).evaluate((element) => {
			const box = (selector: string) => element.querySelector(selector)!.getBoundingClientRect();
			const [field, area, bar, words, digits] = [
				element.getBoundingClientRect(),
				box('.meter'),
				box('.meter > :first-child'),
				box('.mt-text'),
				box('.mt-text > span'),
			];

			return {
				field: field.width,
				area: area.height,
				bar: bar.width,
				words: words.height,
				lines: digits.height,
				inside: digits.left >= field.left - 0.5 && digits.right <= field.right + 0.5 && area.right <= field.right + 0.5,
			};
		});

	const plain = await measure('cost');
	const long = await measure('wordy');
	expect(long).toEqual({ ...plain, inside: true });
	expect(long.area).toBe(54);
	expect(long.words).toBe(20);
	expect(long.bar).toBe(long.field);

	// Beside a caption it keeps its line too: the caption is at the start, the text whole at the end.
	expect(await shown(text(page, 'roomy').locator('> span'))).toBe('whole');
	expect((await measure('roomy')).inside).toBe(true);
	expect((await measure('roomy')).area).toBe(54);

	// A field too narrow for it leaves the whole text out, and never shows a part of it; the track is still
	// across the field and the area as high. What a screen reader is told still has it.
	const needed = Math.ceil((await edges(number)).width);
	expect(needed).toBeGreaterThan(200);
	await squeeze(page, 'wordy', needed + 1);
	expect(await shown(number)).toBe('whole');

	for (const width of [needed - 2, needed - 40, 200, 120]) {
		await squeeze(page, 'wordy', width);
		expect(await shown(number), `${width}px`).toBe('none');

		const narrow = await measure('wordy');
		expect(narrow.area, `${width}px`).toBe(54);
		expect(narrow.bar, `${width}px`).toBe(width);
	}

	await expect(line(page, 'wordy')).toHaveAttribute('aria-valuetext', `42${LONG_SUFFIX}`);
	await squeeze(page, 'wordy', null);
	expect(await shown(number)).toBe('whole');
});

test('under forced colours the meter can still be seen: what is filled, what is not, and no value, in the form and in the table', async ({ page }) => {
	await page.emulateMedia({ forcedColors: 'active' });
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'plain')).toHaveText('50%');
	await expect(page.locator('.hydrating')).toHaveCount(0);

	// The colour of the page, from beside the field's own text.
	const ground = (await pixel(page, (await edges(meter(page, 'plain'))).left + 2, (await edges(meter(page, 'plain'))).top + 2)).join(',');

	// One bar at 50%: the fill, and the half of the track which is not filled, which is the part of the track
	// after the fill. Its outline shows along its upper edge as well.
	const bar = await edges(track(page, 'plain'));
	const filled = await across(page, fill(page, 'plain'));
	expect(filled.slice(2, -2).filter((color) => color === ground)).toEqual([]);

	const rest = (await pixels(page, bar.left + bar.width * 0.6, bar.middle, bar.width * 0.4)).map((color) => color.join(','));
	expect(
		rest.some((color) => color !== ground),
		'the end of the track shows',
	).toBe(true);
	expect(rest[0], 'the track is not the colour of the fill').not.toBe(filled[Math.floor(filled.length / 2)]);
	expect((await pixel(page, bar.left + bar.width * 0.75, Math.ceil(bar.top))).join(','), 'the outline of the track').not.toBe(ground);
	await expect(track(page, 'plain')).toHaveCSS('border-top-style', 'solid');

	// The colours of the options give way: a fill which is green by its option is the system's colour here.
	await expect(fill(page, 'share')).toHaveCSS('background-color', await fill(page, 'plain').evaluate((element) => getComputedStyle(element).backgroundColor));

	// Five pills of which three are filled.
	await expectFilledPieces(strip(page, 'pill_auto'), 5, 3);
	await expectTold(page, strip(page, 'pill_auto').locator('> *').nth(1), strip(page, 'pill_auto').locator('> *').nth(4), ground, 'pills in the form');

	// Thin bars, a gradient and what is not filled faded: still two looks, and no gradient.
	const thin = strip(page, 'bar_hundred').locator('> *');
	await expectTold(page, thin.first(), thin.last(), ground, 'thin bars in the form');
	await expectTold(page, strip(page, 'paint_blend').locator('> *').first(), strip(page, 'paint_blend').locator('> *').last(), ground, 'pills which blend');
	await expect(strip(page, 'paint_blend').locator('> *').first()).toHaveCSS('background-image', 'none');
	await expect(fill(page, 'paint_bar')).toHaveCSS('background-image', 'none');

	// No value keeps its dashes, which show, and has no fill; at the minimum the outline is solid.
	await expect(track(page, 'empty')).toHaveCSS('border-top-style', 'dashed');
	expect(
		(await across(page, track(page, 'empty'))).some((color) => color !== ground),
		'the dashes of no value',
	).toBe(true);
	await expect(track(page, 'zero')).toHaveCSS('border-top-style', 'solid');

	// No size has changed for it: the track is 12px high across its field, and the pills are where they were.
	expect(bar.bottom - bar.top).toBe(12);
	expect(bar.width).toBe((await edges(meter(page, 'plain'))).width);
	expect((await readPieces(strip(page, 'pill_auto'))).map((piece) => piece.height)).toEqual([12, 12, 12, 12, 12]);

	// The table: one bar, and a row of pills, of bars and of dots.
	await page.goto(`/admin/content/${COLLECTION}`);
	await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);

	const plain = table(page, COLUMNS);
	await expect(plain.number('First', 'plain')).toHaveText('50%');
	const cellGround = (await pixel(page, (await edges(plain.cell('First', 'plain'))).left + 2, (await edges(plain.cell('First', 'plain'))).top + 3)).join(',');

	const short = await edges(plain.bar('First', 'plain'));
	const part = await across(page, plain.part('First', 'plain'));
	expect(part.slice(2, -2).filter((color) => color === cellGround)).toEqual([]);

	const after = (await pixels(page, short.left + short.width * 0.6, short.middle, short.width * 0.4)).map((color) => color.join(','));
	expect(
		after.some((color) => color !== cellGround),
		'the end of the bar shows',
	).toBe(true);
	expect(after[0], 'the bar is not the colour of its fill').not.toBe(part[Math.floor(part.length / 2)]);
	expect((await pixel(page, short.left + short.width * 0.75, Math.ceil(short.top))).join(','), 'the outline of the bar').not.toBe(cellGround);
	expect(short.width).toBe(72);
	expect(short.bottom - short.top).toBe(8);

	await page.goto(`/admin/content/${COLLECTION}?bookmark=${bookmarks.looks}`);
	await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);

	const rows = table(page, LOOKS);

	for (const name of ['pill_auto', 'bar_hundred', 'dot_auto']) {
		const parts = rows.display('First', name).locator('.md-strip > *');
		await expect(parts.first()).toHaveClass(/md-on/);
		await expect(parts.last()).not.toHaveClass(/md-on/);
		await expectTold(page, parts.first(), parts.last(), cellGround, `${name} in the table`);
	}

	// The row of pills is as long and as high as it was.
	const row = await edges(rows.display('First', 'pill_auto').locator('.md-strip'));
	expect(row.width).toBe(72);
	expect(row.bottom - row.top).toBe(8);
});

test('for print the meter asks the browser to keep its colours, in the form and in the table', async ({ page }) => {
	const adjust = (locator: Locator) =>
		locator.first().evaluate((element) => {
			const style = getComputedStyle(element) as CSSStyleDeclaration & { printColorAdjust?: string; webkitPrintColorAdjust?: string };
			return style.printColorAdjust || style.webkitPrintColorAdjust;
		});

	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'plain')).toHaveText('50%');

	// A stock element of the form does not ask, which is why a printed page loses what is painted with backgrounds.
	expect(await adjust(fieldOf(page, 'title').locator('input'))).toBe('economy');

	await page.emulateMedia({ media: 'print' });

	for (const [what, painted] of [
		['the track', track(page, 'plain')],
		['the fill', fill(page, 'plain')],
		['a filled piece', strip(page, 'pill_auto').locator('.mt-on')],
		['a piece which is not filled', strip(page, 'pill_auto').locator(':not(.mt-on)')],
		['a piece with a gradient', strip(page, 'paint_blend').locator('.mt-paint')],
		['a track without a value', track(page, 'empty')],
	] as const) {
		expect(await adjust(painted), what).toBe('exact');
	}

	// The text does not ask: a browser which prints without backgrounds darkens light text for the paper, and would
	// leave the text of the dark theme as light as it is on the screen.
	expect(await adjust(meter(page, 'plain')), 'the root').toBe('economy');
	expect(await adjust(text(page, 'plain')), 'the value text').toBe('economy');

	await page.emulateMedia({ media: null });
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${bookmarks.looks}`);
	await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);
	await page.emulateMedia({ media: 'print' });

	const rows = table(page, LOOKS);
	expect(await adjust(rows.display('First', 'pill_auto').locator('.md-on'))).toBe('exact');
	expect(await adjust(rows.display('First', 'pill_auto').locator('.md-part:not(.md-on)'))).toBe('exact');

	await page.emulateMedia({ media: null });
	await page.goto(`/admin/content/${COLLECTION}`);
	await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);
	await page.emulateMedia({ media: 'print' });

	const plain = table(page, COLUMNS);
	expect(await adjust(plain.bar('First', 'plain'))).toBe('exact');
	expect(await adjust(plain.part('First', 'plain'))).toBe('exact');
	expect(await adjust(page.locator('table tbody .meter-display')), 'the root of the display').toBe('economy');
});

test('in the dark theme the track, the fill and a faded piece are painted from the dark tokens', async ({ browser, page }) => {
	const TRACK = '--theme--form--field--input--border-color';

	// The tokens of the light theme, from the page of the administrator, to tell the dark ones from.
	await openItem(page, COLLECTION, ids['First']!);
	const light = { track: await token(page, TRACK), paper: await token(page, '--theme--background'), text: await token(page, '--theme--foreground') };

	const session = await signedIn(browser, {}, dark);

	try {
		const shown = session.page;
		await openItem(shown, COLLECTION, ids['First']!);
		await expect(shown.locator('body')).toHaveClass(/dark/);

		const tokens = {
			track: await token(shown, TRACK),
			primary: await token(shown, '--theme--primary'),
			paper: await token(shown, '--theme--background'),
			text: await token(shown, '--theme--foreground'),
		};

		// It is another theme: the page, the text and the track are not what they are in the light one.
		expect(tokens.paper).not.toBe(light.paper);
		expect(tokens.text).not.toBe(light.text);
		expect(tokens.track).not.toBe(light.track);

		// The one bar: the track in the track's token, the fill in the primary colour, the text in the colour of text,
		// by what the browser computes and by the pixels it paints.
		await expect(track(shown, 'plain')).toHaveCSS('background-color', tokens.track);
		await expect(fill(shown, 'plain')).toHaveCSS('background-color', tokens.primary);
		await expect(text(shown, 'plain')).toHaveCSS('color', tokens.text);
		expectColour(await colourOf(shown, track(shown, 'plain'), 0.9), rgb(tokens.track));
		expectColour(await colourOf(shown, track(shown, 'plain'), 0.25), rgb(tokens.primary));

		// Ten pills coloured by their place, half of them filled: the last is green, faded, which is green mixed into
		// the track of this theme. Mixed into the light track it would be another colour by far.
		await expectFilledPieces(strip(shown, 'paint_auto'), 10, 5);
		const last = await colourOf(shown, strip(shown, 'paint_auto').locator('> *').last());

		expectColour(last, faded(rgb(GREEN), rgb(tokens.track)), 6);
		expect(Math.max(...faded(rgb(GREEN), rgb(light.track)).map((channel, index) => Math.abs(channel - last[index]!)))).toBeGreaterThan(40);

		// A filled one keeps the colour of its threshold, whatever the theme.
		expectColour(await colourOf(shown, strip(shown, 'paint_auto').locator('> *').first()), rgb(RED));

		// No value: the dashes are in the subdued colour of text of this theme.
		await expect(track(shown, 'empty')).toHaveCSS('border-top-color', await token(shown, '--theme--foreground-subdued'));

		session.quiet();
	} finally {
		await session.context.close();
	}
});

test('for a user with another language a field without a value says so in that language, not in English', async ({ browser }) => {
	const session = await signedIn(browser, {}, german);

	try {
		const shown = session.page;
		await openItem(shown, COLLECTION, ids['First']!);
		await expect(shown.locator('html')).toHaveAttribute('lang', 'de-DE');
		await expect(text(shown, 'empty')).toHaveText('—');

		// The words are the app's own for an empty value, `no_value`, which is "Kein Wert" in the German of
		// Directus 11.17.4. In English the app's text and the meter's fall-back are the same words, so only
		// another language shows that the meter asks the app.
		await expect(track(shown, 'empty')).toHaveAttribute('aria-valuetext', 'Kein Wert');
		await expect(line(shown, 'pill_none')).toHaveAttribute('aria-valuetext', 'Kein Wert');
		await expect(track(shown, 'empty')).not.toHaveAttribute('aria-valuenow');

		// A field with a value says its value, written as the language writes a percentage.
		await expect(track(shown, 'plain')).toHaveAttribute('aria-valuetext', '50\u00a0%');

		session.quiet();
	} finally {
		await session.context.close();
	}
});

test('a caption which is a translation string of the project is translated: in the form, in the tooltip of the display and in both names', async ({ page }) => {
	// The app translates the options of a field before the meter is handed them, so the caption arrives as its text.
	await openItem(page, COLLECTION, ids['First']!);

	const caption = meter(page, 'worded').locator('.mt-caption');
	await expect(caption).toHaveText(CAPTION);
	await expect(track(page, 'worded')).toHaveAttribute('aria-labelledby', (await caption.getAttribute('id'))!);
	await expect(page.getByRole('meter', { name: CAPTION, exact: true })).toHaveCount(1);
	await expect(meter(page, 'worded')).not.toContainText('$t:');

	// The display takes the caption from the interface: it is its name, and the first part of its tooltip.
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${bookmarks.words}`);
	const words = table(page, WORDS);

	await expect(words.display('First', 'worded')).toHaveAttribute('aria-label', CAPTION);
	await expectTooltip(page, words.bar('First', 'worded'), `${CAPTION}: 50%`);
});

test('markup in a caption, a prefix and a suffix stays the text it is, in the form and in the tooltip', async ({ page }) => {
	const whole = `${MARKUP.prefix}50${MARKUP.suffix}`;

	await openItem(page, COLLECTION, ids['First']!);

	// In the form: the caption and the value text hold the characters, and no element was made of them.
	await expect(meter(page, 'marked').locator('.mt-caption')).toHaveText(MARKUP.label);
	await expect(meter(page, 'marked').locator('.mt-text > span')).toHaveText(whole);
	await expect(meter(page, 'marked').locator('b, i')).toHaveCount(0);
	await expect(meter(page, 'marked').locator('.mt-caption > *, .mt-text > span > *')).toHaveCount(0);
	await expect(track(page, 'marked')).toHaveAttribute('aria-valuetext', whole);
	await expect(page.getByRole('meter', { name: MARKUP.label, exact: true })).toHaveCount(1);

	// In the table: the name and the value text of the display, and the tooltip, which the app writes as text.
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${bookmarks.words}`);
	const words = table(page, WORDS);

	await expect(words.display('First', 'marked')).toHaveAttribute('aria-label', MARKUP.label);
	await expect(words.display('First', 'marked')).toHaveAttribute('aria-valuetext', whole);
	await expect(words.number('First', 'marked')).toHaveText(whole);
	await expect(words.display('First', 'marked').locator('b, i')).toHaveCount(0);

	await expectTooltip(page, words.bar('First', 'marked'), `${MARKUP.label}: ${whole}`);
	await expect(page.locator('#tooltip b, #tooltip i')).toHaveCount(0);
});
