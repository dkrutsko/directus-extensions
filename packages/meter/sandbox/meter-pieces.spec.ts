// Browser tests of the Meter bundle: a track which is cut into pieces. How many pieces are drawn for a width and
// how they are shaped, in the form and in the table, the colourings, and the options forms which set all of it.
import { expect, openItem, test } from '../../../sandbox/support/fixtures.ts';
import {
	AMBER,
	COLLECTION,
	GREEN,
	LOOKS,
	PAINTS,
	RED,
	RGB,
	SIZES,
	WIDE,
	attributes,
	blended,
	bookmarks,
	colourOf,
	drawn,
	edges,
	edited,
	expectColour,
	expectFilled,
	expectFilledPieces,
	faded,
	fieldOf,
	fill,
	fits,
	ids,
	meter,
	mixed,
	optionsDialog,
	readPieces,
	removeAll,
	rgb,
	seedMain,
	seedWide,
	shown,
	squeeze,
	strip,
	table,
	text,
	token,
	track,
	turn,
} from './meter-support.ts';
import type { Shape } from './meter-support.ts';

test.beforeAll(async ({ api }) => {
	await removeAll(api);
	await seedMain(api);
	await seedWide(api);
});

test.afterAll(async ({ api }) => {
	await removeAll(api);
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

	// A range of a hundred in ten pills: 44 fills four of them. In twenty dots 98 fills all twenty.
	await expectFilledPieces(strip(page, 'pill_hundred'), 10, 4);
	await expectFilledPieces(strip(page, 'dot_hundred'), 21, 21);

	// What is said stays exact: the text, and the meter for assistive technology, which the row of pieces is.
	const spoken = fieldOf(page, 'pill_hundred').getByRole('meter', { name: 'Pill Hundred', exact: true });
	await expect(spoken).toHaveAttribute('aria-valuenow', '44');
	await expect(spoken).toHaveAttribute('aria-valuetext', '44%');
	await expect(spoken).toHaveClass(/mt-strip/);
	await expect(text(page, 'dot_hundred')).toHaveText('98%');

	// A filled piece has the colour the bar would have, here that of the threshold which 44 has reached, and an
	// unfilled one the colour of the track.
	const hundred = await readPieces(strip(page, 'pill_hundred'));
	const trackColour = await token(page, '--theme--form--field--input--border-color');
	expect(hundred.slice(0, 4).map((piece) => piece.color)).toEqual(Array(4).fill(RGB[AMBER]));
	expect(hundred.slice(4).map((piece) => piece.color)).toEqual(Array(6).fill(trackColour));
	expect((await readPieces(strip(page, 'dot_auto')))[0]!.color).toBe(await token(page, '--theme--primary'));

	// Without a value: every piece, none filled, each a dashed outline as the track is, and a dash as the text.
	await expectFilledPieces(strip(page, 'pill_none'), 5, 0);
	const none = await readPieces(strip(page, 'pill_none'));
	expect(none.map((piece) => piece.border)).toEqual(Array(5).fill('dashed'));
	expect(none.map((piece) => piece.color)).toEqual(Array(5).fill('rgba(0, 0, 0, 0)'));
	await expect(text(page, 'pill_none')).toHaveText('—');
	await expect(meter(page, 'pill_none').getByRole('meter')).not.toHaveAttribute('aria-valuenow');

	// One bar has no pieces, and nothing on its elements but what the meter of 1.0.1 has.
	await expect(strip(page, 'plain')).toHaveCount(0);
	await expect(track(page, 'plain')).toHaveCount(1);
	expect(await attributes(meter(page, 'plain'))).toEqual(['class']);
	expect((await attributes(track(page, 'plain'))).includes('style')).toBe(false);
	expect(await track(page, 'plain').getAttribute('class')).toBe('mt-track');
	expect(await fill(page, 'plain').getAttribute('class')).toBe('mt-fill');

	// 45 of a hundred fills five of ten, 2 none of twenty, and 5 of five all of them.
	await openItem(page, COLLECTION, ids['Second']!);
	await expect(text(page, 'pill_hundred')).toHaveText('45%');
	await expectFilledPieces(strip(page, 'pill_hundred'), 10, 5);
	await expectFilledPieces(strip(page, 'dot_hundred'), 21, 0);
	await expectFilledPieces(strip(page, 'pill_auto'), 5, 5);
	await expect(text(page, 'dot_hundred')).toHaveText('2%');
	await expect(edited(page)).toHaveCount(0);
});

test('each visualization has its shape: which corners are round, how far the pieces are apart, and what they share', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'pill_hundred')).toHaveText('44%');

	const ROUND = '6px';
	const SQUARE = '0px';

	// Pills, segments and bars: as high as the track, equal widths from one edge of the field to the other. Five
	// bars are 3px apart, which fills this width to the pixel where 2px would leave four over.
	for (const [name, gap] of [
		['pill_auto', 4],
		['pill_hundred', 4],
		['pill_set', 4],
		['seg_auto', 3],
		['seg_hundred', 3],
		['bar_auto', 3],
		['bar_hundred', 2],
	] as const) {
		const area = await edges(meter(page, name));
		const all = await readPieces(strip(page, name));

		expect(all[0]!.left, name).toBe(area.left);
		expect(Math.max(...all.map((piece) => piece.width)) - Math.min(...all.map((piece) => piece.width)), name).toBeLessThan(0.5);
		expect(all.map((piece) => piece.height)).toEqual(all.map(() => 12));
		all.slice(1).forEach((piece, index) => expect(Math.abs(piece.left - all[index]!.right - gap), name).toBeLessThan(0.5));

		// Pills and segments reach the end of the field. Bars are each a whole number of pixels wide, all the same,
		// and what the field is wider than the row, less than a pixel for each bar, is empty at its end.
		if (name.startsWith('bar_')) {
			expect([...new Set(all.map((piece) => piece.width))], name).toHaveLength(1);
			expect(Number.isInteger(all[0]!.width), name).toBe(true);
			expect(area.right - all.at(-1)!.right, name).toBeGreaterThanOrEqual(0);
			expect(area.right - all.at(-1)!.right, name).toBeLessThan(all.length);
		} else {
			expect(Math.abs(all.at(-1)!.right - area.right), name).toBeLessThan(0.5);
		}
	}

	// Pills: every piece round at both ends.
	for (const name of ['pill_auto', 'pill_hundred']) {
		expect((await readPieces(strip(page, name))).map((piece) => piece.corners)).toEqual(
			Array(name === 'pill_auto' ? 5 : 10).fill([ROUND, ROUND, ROUND, ROUND]),
		);
	}

	// Segments: only the two outer ends of the row are round, so the row reads as one bar which is cut.
	for (const name of ['seg_auto', 'seg_hundred']) {
		const all = await readPieces(strip(page, name));

		expect(all[0]!.corners).toEqual([ROUND, SQUARE, SQUARE, ROUND]);
		expect(all.at(-1)!.corners).toEqual([SQUARE, ROUND, ROUND, SQUARE]);
		expect(all.slice(1, -1).map((piece) => piece.corners)).toEqual(all.slice(1, -1).map(() => [SQUARE, SQUARE, SQUARE, SQUARE]));
	}

	// Bars: no corner is round, and many fit: more than of any other shape in a field of the same width.
	const bars = await readPieces(strip(page, 'bar_hundred'));
	expect(bars.map((piece) => piece.corners)).toEqual(bars.map(() => [SQUARE, SQUARE, SQUARE, SQUARE]));
	expect(bars.length).toBeGreaterThan((await readPieces(strip(page, 'seg_hundred'))).length);
	expect((await readPieces(strip(page, 'seg_hundred'))).length).toBeGreaterThan((await readPieces(strip(page, 'pill_hundred'))).length);
	expect(bars[0]!.width).toBeGreaterThanOrEqual(4);

	// Dots: circles as high as the track, 4px apart, from the start of the field. In a field as wide as the form
	// they are the same circles.
	for (const name of ['dot_hundred', 'dot_auto', 'dot_set', 'look_wide']) {
		const area = await edges(meter(page, name));
		const all = await readPieces(strip(page, name));

		expect(all[0]!.left).toBe(area.left);
		expect(all.map((piece) => [piece.width, piece.height])).toEqual(all.map(() => [12, 12]));
		expect(all.map((piece) => piece.corners)).toEqual(all.map(() => ['50%', '50%', '50%', '50%']));
		all.slice(1).forEach((piece, index) => expect(piece.left - all[index]!.right).toBe(4));
		expect(all.at(-1)!.right).toBe(area.left + all.length * 16 - 4);
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

test('the number of pieces follows the width: what is wanted where it fits, else a number which divides it, else as many as fit; bars have no divisor', async ({
	page,
}) => {
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
				expect(await countOf(name), name).toBe(drawn(wanted, fits(await widthOf(name), SIZES.form[shape]), shape !== 'bars' && shape !== 'dots'));
			}
		}).toPass({ timeout: 5000 });

	await expectRule();

	// A range of a hundred never draws a number which does not divide a hundred, and a different one for each shape.
	// Bars are the exception: a hundred do not fit, so as many as fit are drawn, 57 in this width.
	const half = await widthOf('pill_hundred');
	expect(half).toBeGreaterThan(300);
	expect(half).toBeLessThan(400);
	expect(await countOf('pill_hundred')).toBe(10);
	expect(await countOf('seg_hundred')).toBe(20);
	expect(await countOf('bar_hundred')).toBe(57);
	expect(await countOf('dot_hundred')).toBe(21);
	expect(await countOf('look_wide')).toBe(44);

	// 62 of a hundred fills the nearest whole number of whatever is drawn: 12 of 20, 35 of 57.
	await expectFilledPieces(strip(page, 'seg_hundred'), 20, 12);
	await expectFilledPieces(strip(page, 'bar_hundred'), 57, 35);

	// No number wanted: as many as fit, each no narrower than its smallest.
	expect(await countOf('pill_free')).toBe(fits(half, SIZES.form.pills));
	expect(await countOf('dot_free')).toBe(fits(half, SIZES.form.dots));
	expect((await readPieces(strip(page, 'pill_free')))[0]!.width).toBeGreaterThanOrEqual(20);
	expect((await readPieces(strip(page, 'seg_free')))[0]!.width).toBeGreaterThanOrEqual(14);
	expect((await readPieces(strip(page, 'bar_free')))[0]!.width).toBeGreaterThanOrEqual(4);

	// A number which is set and fits is drawn as set: twelve pills. Thirty packed dots do not fit, so as many
	// as fit are drawn, 21, of which half the range fills eleven.
	expect(await countOf('pill_many')).toBe(12);
	expect(await countOf('dot_many')).toBe(21);
	await expectFilledPieces(strip(page, 'dot_many'), 21, 11);

	// The same fields in a narrower window: the form gets narrower, and each field again draws what its width
	// gives. Bars without a wanted number are fewer than before, and as many again in the window as it was.
	const before = await countOf('bar_free');
	expect(before).toBe(fits(half, SIZES.form.bars));

	await page.setViewportSize({ width: 1000, height: 900 });
	await expect.poll(() => widthOf('bar_free')).toBeLessThan(half - 50);
	await expectRule();
	expect(await countOf('bar_free')).toBeLessThan(before);
	expect(await countOf('bar_hundred')).toBe(await countOf('bar_free'));
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
	await expect(strip(page, 'dot_many').locator('> *')).toHaveCount(6);

	// A hundred in 130px of pills: room for five, which divides it.
	await squeeze(page, 'pill_hundred', 130);
	await expect(strip(page, 'pill_hundred').locator('> *')).toHaveCount(5);

	// Wide again: as before.
	for (const name of ['pill_many', 'dot_many', 'pill_hundred']) await squeeze(page, name, null);
	await expect(strip(page, 'pill_many').locator('> *')).toHaveCount(12);
	await expect(strip(page, 'dot_many').locator('> *')).toHaveCount(21);
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

test('a width which changes without changing the number of pieces changes nothing in the page: a meter is drawn again only for another number', async ({
	page,
}) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'pill_many')).toHaveText('50%');

	// Everything which changes inside a meter is counted: an element which comes or goes, an attribute, a text.
	type Counted = { changed: Record<string, number> };
	const watch = (name: string) =>
		meter(page, name).evaluate((element, key) => {
			const store = ((window as unknown as Counted).changed ??= {});
			store[key] = 0;
			new MutationObserver((records) => (store[key]! += records.length)).observe(element, {
				subtree: true,
				childList: true,
				attributes: true,
				characterData: true,
			});
		}, name);
	const changed = (name: string) => page.evaluate((key) => (window as unknown as Counted).changed[key], name);
	const forget = (name: string) => page.evaluate((key) => ((window as unknown as Counted).changed[key] = 0), name);
	const lineWidth = async (name: string) => (await edges(meter(page, name).locator('> :first-child'))).width;
	const countOf = (name: string) => strip(page, name).locator('> *').count();

	// The width as it is after a squeeze, and two frames later, by when a meter which was going to draw has drawn.
	const squeezeTo = async (name: string, width: number) => {
		await squeeze(page, name, width);
		await expect.poll(() => lineWidth(name)).toBe(width);
		await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(null)))));
	};

	for (const name of ['pill_many', 'bar_free', 'plain']) await watch(name);

	// Twelve pills, which need 284px: narrower and narrower, and still twelve. Nothing in the meter is touched.
	expect(await lineWidth('pill_many')).toBeGreaterThan(330);
	expect(await countOf('pill_many')).toBe(12);
	for (const width of [320, 301, 290]) {
		await squeezeTo('pill_many', width);
		expect(await countOf('pill_many')).toBe(12);
		expect(await changed('pill_many'), `${width}px`).toBe(0);
	}

	// Its width is watched all the same: in 150px six fit, and the meter is drawn again, once.
	await squeezeTo('pill_many', 150);
	await expect(strip(page, 'pill_many').locator('> *')).toHaveCount(6);
	expect(await changed('pill_many')).toBeGreaterThan(0);

	// And within that number nothing again: 150px to 165px is six pills.
	await forget('pill_many');
	for (const width of [158, 165]) {
		await squeezeTo('pill_many', width);
		expect(await countOf('pill_many')).toBe(6);
		expect(await changed('pill_many'), `${width}px`).toBe(0);
	}

	// As many bars as fit, one for every 6px: 57 from 340px to 342px, and 56 below that.
	expect(await countOf('bar_free')).toBe(57);
	for (const width of [341, 340]) {
		await squeezeTo('bar_free', width);
		expect(await countOf('bar_free')).toBe(57);
		expect(await changed('bar_free'), `${width}px`).toBe(0);
	}

	await squeezeTo('bar_free', 339);
	await expect(strip(page, 'bar_free').locator('> *')).toHaveCount(56);
	expect(await changed('bar_free')).toBeGreaterThan(0);

	// One bar has no number of pieces which could change: it is never drawn again for a width.
	for (const width of [300, 200, 90]) {
		await squeezeTo('plain', width);
		expect(await changed('plain'), `${width}px`).toBe(0);
	}

	await expect(edited(page)).toHaveCount(0);
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

	// Packed: the row is as long as its dots, 16px for each but the last, from the start of the field. As many
	// as fit, 44 for a hundred, nearly fill a field as wide as the form; five end long before half of it does.
	const wide = await edges(meter(page, 'look_wide'));
	const packed = await readPieces(strip(page, 'look_wide'));
	expect(packed).toHaveLength(44);
	expect(packed[0]!.left).toBe(wide.left);
	expect(packed.at(-1)!.right).toBe(wide.left + packed.length * 16 - 4);
	expect(packed.at(-1)!.right).toBeLessThanOrEqual(wide.right);
	await expect(meter(page, 'look_wide').locator('.mt-spread')).toHaveCount(0);

	const few = await readPieces(strip(page, 'dot_auto'));
	const short = await edges(meter(page, 'dot_auto'));
	expect(few.at(-1)!.right).toBe(short.left + 5 * 16 - 4);
	expect(few.at(-1)!.right).toBeLessThan(short.right - 100);

	// Spread: the same five dots for a range of five, the first at the start edge, the last at the end edge, and
	// the gaps between them equal and wider than those of packed dots.
	const area = await edges(meter(page, 'dot_spread'));
	const spread = await readPieces(strip(page, 'dot_spread'));
	expect(spread).toHaveLength(5);
	expect(spread.map((piece) => piece.filled)).toEqual([true, true, true, false, false]);
	expect(spread.map((piece) => [piece.width, piece.height])).toEqual(spread.map(() => [12, 12]));
	expect(spread[0]!.left).toBe(area.left);
	expect(Math.abs(spread.at(-1)!.right - area.right)).toBeLessThan(0.5);

	const gaps = spread.slice(1).map((piece, index) => piece.left - spread[index]!.right);
	expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(0.5);
	expect(Math.abs(gaps[0]! - (area.width - 5 * 12) / 4)).toBeLessThan(0.5);
	expect(gaps[0]!).toBeGreaterThan(4);

	// The packed dots of the same range, beside them, are the same dots.
	expect((await readPieces(strip(page, 'dot_auto'))).map((piece) => piece.filled)).toEqual(spread.map((piece) => piece.filled));

	// The layout of the dots is nothing to pills.
	await expect(meter(page, 'pill_auto').locator('.mt-spread')).toHaveCount(0);
});

test('packed dots are as many as fit: a hundred nearly fill the field and less than a dot and its gap is left, in the form and in the display', async ({
	page,
}) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'dot_hundred')).toHaveText('98%');

	// A hundred wanted in half of the form, 342px: 21 dots of 12px, 4px apart, are 332px. Twenty, the number
	// which divides a hundred, would end 26px before the field does.
	for (const [name, width] of [
		['dot_hundred', 342],
		['look_wide', 713],
	] as const) {
		const area = await edges(meter(page, name));
		const dots = await readPieces(strip(page, name));
		const left = area.right - dots.at(-1)!.right;

		expect(area.width, name).toBe(width);
		expect(dots.length, name).toBe(Math.floor((width + 4) / 16));
		expect(dots.length, name).toBe(name === 'dot_hundred' ? 21 : 44);
		expect(100 % dots.length, name).not.toBe(0);
		expect(dots[0]!.left, name).toBe(area.left);
		expect([...new Set(dots.map((dot) => `${dot.width} ${dot.height}`))], name).toEqual(['12 12']);
		expect([...new Set(dots.slice(1).map((dot, index) => dot.left - dots[index]!.right))], name).toEqual([4]);
		expect(left, name).toBeGreaterThanOrEqual(0);
		expect(left, name).toBeLessThan(16);
		expect(left, name).toBe(name === 'dot_hundred' ? 10 : 13);
	}

	// A number which is set and fits is a short row from the start, as it was: four dots.
	expect(await readPieces(strip(page, 'dot_set'))).toHaveLength(4);
	expect((await readPieces(strip(page, 'dot_auto'))).length).toBe(5);

	// The display in the table: nine dots of 6px, 2px apart, in its 72px, with 2px left.
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${bookmarks.looks}`);
	await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);
	const shown = table(page, LOOKS).display('First', 'dot_hundred').locator('.md-strip');
	const small = await readPieces(shown);
	expect(small).toHaveLength(9);
	expect([...new Set(small.slice(1).map((dot, index) => dot.left - small[index]!.right))]).toEqual([2]);
	expect((await edges(shown)).width).toBe(70);
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
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${bookmarks.looks}`);
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

	// A range of a hundred in a bar of 72px: five pills, five segments and ten dots, each a number which divides a
	// hundred, and as many bars as fit, 24. 44 fills two of five, 62 three of five and fifteen of 24, 98 all ten dots.
	await expectFilledPieces(row('First', 'pill_hundred'), 5, 2);
	await expectFilledPieces(row('First', 'seg_hundred'), 5, 3);
	await expectFilledPieces(row('First', 'bar_hundred'), 24, 15);
	await expectFilledPieces(row('First', 'dot_hundred'), 9, 9);
	await expectFilledPieces(row('Second', 'pill_hundred'), 5, 2);
	await expectFilledPieces(row('Second', 'dot_hundred'), 9, 0);
	expect((await readPieces(row('First', 'pill_hundred')))[0]!.color).toBe(RGB[AMBER]);

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
		const all = await readPieces(row('First', name));
		const whole = await edges(row('First', name));

		expect(whole.width, name).toBe(72);
		expect(Math.max(...all.map((piece) => piece.width)) - Math.min(...all.map((piece) => piece.width)), name).toBeLessThan(0.5);
		expect(all.map((piece) => piece.height)).toEqual(all.map(() => 8));
		all.slice(1).forEach((piece, index) => expect(Math.abs(piece.left - all[index]!.right - gap), name).toBeLessThan(0.5));
	}

	const pills = await readPieces(row('First', 'pill_hundred'));
	expect(pills.map((piece) => piece.corners)).toEqual(pills.map(() => ['4px', '4px', '4px', '4px']));

	const segments = await readPieces(row('First', 'seg_hundred'));
	expect(segments[0]!.corners).toEqual(['4px', '0px', '0px', '4px']);
	expect(segments.at(-1)!.corners).toEqual(['0px', '4px', '4px', '0px']);
	expect(segments.slice(1, -1).map((piece) => piece.corners)).toEqual(segments.slice(1, -1).map(() => ['0px', '0px', '0px', '0px']));

	const bars = await readPieces(row('First', 'bar_hundred'));
	expect(bars.map((piece) => piece.corners)).toEqual(bars.map(() => ['0px', '0px', '0px', '0px']));

	// Dots are circles of 6px, 2px apart, from the start: the row is as long as its dots.
	for (const [name, count] of [
		['dot_hundred', 9],
		['dot_set', 4],
	] as const) {
		const all = await readPieces(row('First', name));
		expect(all.map((piece) => [piece.width, piece.height])).toEqual(all.map(() => [6, 6]));
		expect(all.map((piece) => piece.corners)).toEqual(all.map(() => ['50%', '50%', '50%', '50%']));
		expect((await edges(row('First', name))).width).toBe(count * 8 - 2);
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
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${bookmarks.paints}`);
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
		expect((await readPieces(other('First', name)))[0]!.width).toBeGreaterThanOrEqual(SIZES.display[shape][0]);
	}

	// Half of the range fills the nearest whole number of them.
	await expectFilledPieces(other('First', 'bar_free'), 24, 12);
	await expectFilledPieces(other('First', 'pill_free'), 7, 4);

	// Spread dots stand from one end of the bar's length to the other.
	const spread = await readPieces(other('First', 'dot_spread'));
	const span = await edges(other('First', 'dot_spread'));
	expect(spread).toHaveLength(5);
	expect(span.width).toBe(72);
	expect(spread[0]!.left).toBe(span.left);
	expect(Math.abs(spread.at(-1)!.right - span.right)).toBeLessThan(0.5);
	expect(spread[1]!.left - spread[0]!.right).toBeGreaterThan(1);

	// Dots of its own, eight of them, on a field whose interface draws five pills: 50 fills four.
	await expectFilledPieces(other('First', 'look_own'), 8, 4);
	await expect(others.display('First', 'look_own').locator('.md-dots')).toHaveCount(1);

	// Options which were emptied are stored as null, and taken from the interface again: twelve bars, in steps,
	// with what is not filled faded.
	await expectFilledPieces(other('First', 'look_back'), 12, 6);
	await expect(others.display('First', 'look_back').locator('.md-bars')).toHaveCount(1);
	const back = await readPieces(other('First', 'look_back'));
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
	const stepped = await readPieces(strip(page, 'paint_steps'));
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
	expect((await readPieces(strip(page, 'pill_none'))).map((each) => each.color)).toEqual(Array(5).fill('rgba(0, 0, 0, 0)'));

	// The display takes the colouring from the interface: five pills for ten, of which 50 fills three, in the
	// blend across the whole bar, and one bar which shows the blend and goes on with it, faded.
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${bookmarks.paints}`);
	await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);

	const { display, bar } = table(page, PAINTS);
	const blend = display('First', 'paint_blend').locator('.md-strip');
	await expectFilledPieces(blend, 5, 3);
	for (const index of [0, 2]) expectColour(await colourOf(page, blend.locator('> *').nth(index)), blended((index + 0.5) / 5), 8);
	expectColour(await colourOf(page, blend.locator('> *').nth(4)), faded(blended(0.9), trackColour), 8);

	for (const place of [0.2, 0.4]) expectColour(await colourOf(page, bar('First', 'paint_bar'), place), blended(place), 8);
	for (const place of [0.6, 0.9]) expectColour(await colourOf(page, bar('First', 'paint_bar'), place), faded(blended(place), trackColour), 8);
});

test('the blend colouring: one colour for everything filled, between the colours of the two thresholds around the value', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'paint_mix')).toHaveText('60%');

	// The app fades a cover out over the page for a moment after the form is there, and a colour read through
	// the last of it is one step off.
	await expect(page.locator('.hydrating')).toHaveCount(0);

	const trackColour = rgb(await token(page, '--theme--form--field--input--border-color'));
	const piece = (index: number) => strip(page, 'paint_mix').locator('> *').nth(index);
	const apart = (one: number[], other: number[]) => Math.max(...one.map((channel, index) => Math.abs(channel - other[index]!)));

	// 60 is half way between the threshold of amber at 40 and that of green at 80: six of ten pills are filled,
	// and every one of them has the colour half way between the two, which is neither of them.
	await expectFilledPieces(strip(page, 'paint_mix'), 10, 6);
	const between = mixed(rgb(AMBER), rgb(GREEN), 0.5);
	// One after the other: reading a colour scrolls its piece into view first, and two at once would get in each other's way.
	const filled: number[][] = [];
	for (const index of [0, 1, 2, 3, 4, 5]) filled.push(await colourOf(page, piece(index)));

	for (const colour of filled) expectColour(colour, between);
	expect(apart(filled[0]!, rgb(AMBER))).toBeGreaterThan(40);
	expect(apart(filled[0]!, rgb(GREEN))).toBeGreaterThan(40);
	expect(apart(filled[0]!, rgb(RED))).toBeGreaterThan(40);

	// They share it to the pixel, at both ends of a pill as well: nothing runs along the track as in a gradient.
	expect(new Set(filled.map(String)).size, filled.map(String).join(' | ')).toBe(1);
	expect(await colourOf(page, piece(0), 0.2)).toEqual(await colourOf(page, piece(5), 0.8));
	expect(new Set((await readPieces(strip(page, 'paint_mix'))).slice(0, 6).map((each) => each.color)).size).toBe(1);

	// What is not filled follows it, faded.
	for (const index of [6, 9]) expectColour(await colourOf(page, piece(index)), faded(between, trackColour));

	// One bar at 20, half way from the red of the minimum to amber: the whole fill has that one colour, and the
	// track beyond it is plain.
	await expectFilled(track(page, 'paint_mixbar'), fill(page, 'paint_mixbar'), 0.2);
	const early = mixed(rgb(RED), rgb(AMBER), 0.5);
	for (const place of [0.03, 0.1, 0.17]) expectColour(await colourOf(page, track(page, 'paint_mixbar'), place), early);
	expect(await colourOf(page, track(page, 'paint_mixbar'), 0.03)).toEqual(await colourOf(page, track(page, 'paint_mixbar'), 0.17));
	expectColour(await colourOf(page, track(page, 'paint_mixbar'), 0.6), trackColour);

	// It is neither the red of the minimum nor the amber of the threshold ahead.
	expect(apart(await colourOf(page, track(page, 'paint_mixbar'), 0.1), rgb(RED))).toBeGreaterThan(20);
	expect(apart(await colourOf(page, track(page, 'paint_mixbar'), 0.1), rgb(AMBER))).toBeGreaterThan(20);
});

test('one colour for what is filled over a track painted by the scale: the faded steps and the faded gradient which are still to come', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'paint_ahead')).toHaveText('50%');
	await expect(page.locator('.hydrating')).toHaveCount(0);

	const trackColour = rgb(await token(page, '--theme--form--field--input--border-color'));
	const piece = (index: number) => strip(page, 'paint_ahead_pills').locator('> *').nth(index);

	// One bar at 50, in the colour of the value: all of the fill is amber, also where the scale is red.
	await expectFilled(track(page, 'paint_ahead'), fill(page, 'paint_ahead'), 0.5);
	for (const place of [0.05, 0.25, 0.45]) expectColour(await colourOf(page, track(page, 'paint_ahead'), place), rgb(AMBER));

	// The track ahead of it shows the steps of the scale at their places, faded: amber up to 80 and green from there.
	for (const place of [0.55, 0.65, 0.78]) expectColour(await colourOf(page, track(page, 'paint_ahead'), place), faded(rgb(AMBER), trackColour));
	for (const place of [0.82, 0.95]) expectColour(await colourOf(page, track(page, 'paint_ahead'), place), faded(rgb(GREEN), trackColour));

	// Ten pills at 60 which blend: the six which are filled share the colour half way from amber to green.
	await expectFilledPieces(strip(page, 'paint_ahead_pills'), 10, 6);
	for (const index of [0, 3, 5]) expectColour(await colourOf(page, piece(index)), mixed(rgb(AMBER), rgb(GREEN), 0.5));

	// The four which are not show their own tenths of the gradient across the whole track, faded: the seventh
	// is still between amber and green, and the last is green.
	const ahead: number[][] = [];
	for (const index of [6, 7, 8, 9]) ahead.push(await colourOf(page, piece(index)));

	ahead.forEach((colour, index) => expectColour(colour, faded(blended((index + 6.5) / 10), trackColour), 6));
	expect(ahead[0]).not.toEqual(ahead[3]);
	expectColour(ahead[3]!, faded(rgb(GREEN), trackColour), 6);
});

test('in a right-to-left page the pieces fill from the right, and the colours of the scale run from the right', async ({ page }) => {
	await openItem(page, COLLECTION, ids['First']!);
	await expect(text(page, 'pill_auto')).toHaveText('60%');

	const NAMES = ['pill_auto', 'seg_auto', 'bar_auto', 'dot_auto', 'dot_spread'];

	// Left to right first: the filled pieces are the leftmost.
	for (const name of NAMES) {
		const all = await readPieces(strip(page, name));
		expect(all[0]!.left).toBe((await edges(meter(page, name))).left);
		expect(all.map((piece) => piece.left)).toEqual([...all.map((piece) => piece.left)].sort((a, b) => a - b));
	}

	await turn(page, 'rtl');
	await expect(meter(page, 'pill_auto')).toHaveCSS('direction', 'rtl');

	// Mirrored: the same three of five are filled, and they are the rightmost; the first piece is at the right edge.
	for (const name of NAMES) {
		const all = await readPieces(strip(page, name));
		expect(all.map((piece) => piece.filled)).toEqual([true, true, true, false, false]);
		expect(Math.abs(all[0]!.right - (await edges(meter(page, name))).right)).toBeLessThan(0.5);
		expect(all.map((piece) => piece.left)).toEqual([...all.map((piece) => piece.left)].sort((a, b) => b - a));
	}

	// Spread dots still reach the other edge, and the round ends of a row of segments are its outer ends.
	const spread = await readPieces(strip(page, 'dot_spread'));
	expect(Math.abs(spread.at(-1)!.left - (await edges(meter(page, 'dot_spread'))).left)).toBeLessThan(0.5);

	const segments = await readPieces(strip(page, 'seg_auto'));
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
	await page.goto(`/admin/content/${COLLECTION}?bookmark=${bookmarks.looks}`);
	await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);
	await turn(page, 'rtl');

	const { display, number } = table(page, LOOKS);
	await expect(display('First', 'pill_auto')).toHaveCSS('direction', 'rtl');

	for (const name of ['pill_auto', 'seg_auto', 'bar_auto', 'dot_auto']) {
		const row = display('First', name).locator('.md-strip');
		const all = await readPieces(row);
		expect(all.map((piece) => piece.filled)).toEqual([true, true, true, false, false]);
		expect(Math.abs(all[0]!.right - (await edges(row)).right)).toBeLessThan(0.5);
		expect(all.map((piece) => piece.left)).toEqual([...all.map((piece) => piece.left)].sort((a, b) => b - a));
		expect((await edges(number('First', name))).right).toBeLessThan((await edges(row)).left);
	}

	await page.goto(`/admin/content/${COLLECTION}?bookmark=${bookmarks.paints}`);
	await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);
	await turn(page, 'rtl');

	const others = table(page, PAINTS);
	await expect(others.display('First', 'paint_bar')).toHaveCSS('direction', 'rtl');
	for (const place of [0.2, 0.4]) expectColour(await colourOf(page, others.bar('First', 'paint_bar'), 1 - place), blended(place), 8);
	expectColour(await colourOf(page, others.bar('First', 'paint_bar'), 1 - 0.9), faded(blended(0.9), trackColour), 8);
});

test('the options form of the look: the number and the layout only while they apply, and a display which can go back to its interface', async ({
	page,
	api,
}) => {
	// A field with a threshold, so that the colouring of the fill is asked for as well.
	const thresholds = [{ value: 50, color: AMBER }];
	await api.patch(`/fields/${COLLECTION}/fresh`, { meta: { options: { thresholds }, display_options: null } });

	await page.goto(`/admin/settings/data-model/${COLLECTION}/fresh`);

	const { dialogs, option, choose, save } = optionsDialog(page);

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
	await expect(option('subdivisions')).toContainText('Empty: one for each unit of a whole range');
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
		.toEqual({ thresholds, visualization: 'dots', dotsLayout: 'spread', subdivisions: 4, activeColoring: 'steps', inactiveColoring: 'automatic' });
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

test('Active Coloring shows only while there are thresholds, at once as one is added or removed, and in the display also by those of the interface', async ({
	page,
	api,
}) => {
	const put = (options: object | null, display: object | null) => api.patch(`/fields/${COLLECTION}/fresh`, { meta: { options, display_options: display } });
	const stored = async () => {
		const { meta } = await api.get(`/fields/${COLLECTION}/fresh`);
		return { options: meta.options, display: meta.display_options };
	};

	const { option, choose, tab, save, addThreshold, removeThreshold } = optionsDialog(page);
	const open = async (name: 'Interface' | 'Display') => {
		await page.goto(`/admin/settings/data-model/${COLLECTION}/fresh`);
		await tab(name);
		await expect(option('inactiveColoring')).toHaveCount(1);
	};

	await put(null, null);

	try {
		// No thresholds: every colouring of the fill draws the same, and the dropdown is not there. The
		// colouring of what is not filled does something without thresholds too, and stays.
		await open('Interface');
		await expect(option('thresholds')).toContainText('No items');
		await expect(option('activeColoring')).toHaveCount(0);

		// A threshold is added: the dropdown is there at once, with its default.
		await addThreshold(40, AMBER);
		await expect(option('activeColoring').locator('input')).toHaveValue('Value');

		// The display has no list of its own and takes the interface's, as it is being edited.
		await tab('Display');
		await expect(option('thresholds')).toContainText('40');
		await expect(option('activeColoring').locator('input')).toHaveValue('Value');

		// The threshold is removed again: the dropdown goes, in both forms.
		await tab('Interface');
		await removeThreshold();
		await expect(option('thresholds')).toContainText('No items');
		await expect(option('activeColoring')).toHaveCount(0);
		await expect(option('inactiveColoring')).toHaveCount(1);
		await tab('Display');
		await expect(option('activeColoring')).toHaveCount(0);

		// A threshold of the display's own brings it back there, and only there.
		await addThreshold(60, GREEN);
		await expect(option('activeColoring')).toHaveCount(1);
		await tab('Interface');
		await expect(option('activeColoring')).toHaveCount(0);

		// Chosen and saved, it is stored with the list which made it show. The threshold which the interface
		// had for a moment left nothing behind.
		await tab('Display');
		await choose('activeColoring', 'Steps');
		await save();
		await expect.poll(stored).toEqual({ options: {}, display: { thresholds: [{ value: 60, color: GREEN }], activeColoring: 'steps' } });

		// The interface has a threshold and the display has emptied its list, which the form stores as null and
		// which means none: the dropdown shows in the form of the interface, and not in that of the display.
		await put({ thresholds: [{ value: 40, color: AMBER }] }, { thresholds: null });
		await open('Interface');
		await expect(option('activeColoring')).toHaveCount(1);
		await tab('Display');
		await expect(option('thresholds')).toContainText('No items');
		await expect(option('activeColoring')).toHaveCount(0);

		// An empty list, as the API can be sent one, is no threshold either: in the interface, and in a display
		// whose interface has one.
		await put({ thresholds: [] }, null);
		await open('Interface');
		await expect(option('activeColoring')).toHaveCount(0);
		await tab('Display');
		await expect(option('activeColoring')).toHaveCount(0);

		await put({ thresholds: [{ value: 40, color: AMBER }] }, { thresholds: [] });
		await open('Display');
		await expect(option('activeColoring')).toHaveCount(0);
		await tab('Interface');
		await expect(option('activeColoring')).toHaveCount(1);

		// A display which never stored the key has the interface's threshold, and the dropdown.
		await put({ thresholds: [{ value: 40, color: AMBER }] }, { max: 50 });
		await open('Display');
		await expect(option('thresholds')).toContainText('40');
		await expect(option('activeColoring')).toHaveCount(1);
	} finally {
		await put(null, null);
	}
});

test('in the field settings the note of a half-width option takes two lines at the most, in both options forms', async ({ page, api }) => {
	// Every option which shows only sometimes shows: dots, a value text which has a prefix, a threshold, and the
	// relative method.
	const all = { visualization: 'dots', indicatorFormat: 'value', thresholds: [{ value: 50, color: AMBER }], input: 'relative' };
	await api.patch(`/fields/${COLLECTION}/fresh`, { meta: { options: all, display_options: { visualization: 'dots', indicatorFormat: 'value' } } });

	try {
		await page.goto(`/admin/settings/data-model/${COLLECTION}/fresh`);
		const { dialogs, option, tab } = optionsDialog(page);

		for (const [name, least] of [
			['Interface', 13],
			['Display', 9],
		] as const) {
			await tab(name);
			await expect(option('visualization')).toHaveCount(1);
			await expect(option('subdivisions').locator('.type-note')).toHaveCount(1);

			// The note of each option: how wide its field is in the form, and how many lines the note takes.
			const notes = await dialogs.locator('.field[data-field]').evaluateAll((fields) =>
				fields.flatMap((field) => {
					const note = field.querySelector(':scope > .type-note');
					if (note === null) return [];

					const lines = note.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(note).lineHeight);
					return [{ field: field.getAttribute('data-field'), half: /\bhalf(-right)?\b/.test(field.className), lines: Math.round(lines * 10) / 10 }];
				}),
			);

			const half = notes.filter((note) => note.half);
			expect(half.length, name).toBeGreaterThanOrEqual(least);
			expect(
				half.filter((note) => note.lines > 2.1),
				`${name}: notes of more than two lines`,
			).toEqual([]);
		}
	} finally {
		await api.patch(`/fields/${COLLECTION}/fresh`, { meta: { options: null, display_options: null } });
	}
});
