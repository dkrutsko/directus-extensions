// Browser tests of the Meter bundle: a meter which can be edited. What the pointer, a finger and the keys write, by
// every input method, what a field which cannot be edited is spared, and the options forms of editing.
import { expect, test } from '../../../sandbox/support/fixtures.ts';
import {
	EDIT,
	EDIT_VALUES,
	LISTENERS,
	asDecimal,
	attributes,
	clickAt,
	cursorOf,
	edges,
	edited,
	expectFilled,
	expectFilledPieces,
	expectLarge,
	fieldOf,
	fill,
	ids,
	keyOn,
	line,
	listened,
	meter,
	openEdit,
	optionsDialog,
	pointAt,
	removeAll,
	save,
	seedEdit,
	signedIn,
	text,
	token,
	turn,
} from './meter-support.ts';
import type { Locator, Page } from './meter-support.ts';

test.beforeAll(async ({ api }) => {
	await removeAll(api);
	await seedEdit(api);
});

test.afterAll(async ({ api }) => {
	await removeAll(api);
});

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

		// A click where the value already is leaves the form without a change. That is what a user sees, and no proof
		// that the meter emitted nothing: the form drops an edit which equals what is stored. The unit tests of
		// `changes` are the proof of that.
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
		// A finger which moves sideways is the meter's; one which moves up or down scrolls the page, and two
		// which pinch zoom it, on the track and on the whole area of a meter which can be edited.
		await expect(line(page, 'whole')).toHaveCSS('touch-action', 'pan-y pinch-zoom');
		await expect(meter(page, 'whole')).toHaveCSS('touch-action', 'pan-y pinch-zoom');
		for (const reach of await meter(page, 'whole').locator('.mt-reach').all()) await expect(reach).toHaveCSS('touch-action', 'pan-y pinch-zoom');
		await expect(meter(page, 'twin_locked')).toHaveCSS('touch-action', 'auto');
		await expect(line(page, 'twin_locked')).toHaveCSS('touch-action', 'auto');
		await expect(line(page, 'whole')).toHaveCSS('user-select', 'none');
	});

	test('by piece: a click on the nth piece fills n, and a drag to before the start gives the minimum', async ({ page }) => {
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
		await expect(line(page, 'forced')).toHaveClass(/mt-by-piece/);
		const seventh = await middle('forced', 6);
		await page.mouse.click(seventh.x, seventh.y);
		await expect(text(page, 'forced')).toHaveText('70%');
		await expectFilledPieces(line(page, 'forced'), 10, 7);

		// While the pointer rests over a piece, the pieces up to it are drawn large, and no longer when it has left.
		await page.mouse.move(fourth.x, fourth.y);
		await expectLarge(page, 'five', 4);
		await page.mouse.move(third.x, third.y);
		await expectLarge(page, 'five', 3);
		await page.mouse.move(third.x, third.y + 80);
		await expectLarge(page, 'five', 0);
		await expect(text(page, 'five')).toHaveText('1 / 5');

		// The large pieces follow the pointer through a drag. From the press on they are the pieces up to it.
		const marked = (count: number) => expectLarge(page, 'five', count);
		const fifth = await middle('five', 4);
		const secondPill = await middle('five', 1);

		await page.mouse.move(fourth.x, fourth.y);
		await marked(4);
		await page.mouse.down();
		await expect(text(page, 'five')).toHaveText('4 / 5');
		await marked(4);

		// Downwards.
		await page.mouse.move(secondPill.x, secondPill.y, { steps: 3 });
		await expect(text(page, 'five')).toHaveText('2 / 5');
		await expectFilledPieces(line(page, 'five'), 5, 2);
		await marked(2);

		// Before the start of the first piece there is nothing up to the pointer.
		await page.mouse.move(first.left - 30, first.y, { steps: 2 });
		await expect(text(page, 'five')).toHaveText('0 / 5');
		await marked(0);

		// Upwards, and with the pointer far below the meter: still by its place along the track, as the fill is.
		await page.mouse.move(fifth.x, fifth.y + 60, { steps: 3 });
		await expect(text(page, 'five')).toHaveText('5 / 5');
		await marked(5);
		await page.mouse.move(third.x, third.y + 60, { steps: 3 });
		await expect(text(page, 'five')).toHaveText('3 / 5');
		await marked(3);

		// Released there, away from the meter: the pointer rests on no piece, and nothing is marked.
		await page.mouse.up();
		await marked(0);

		// Released on a piece, the large pieces are those of that place at once, without the pointer moving again:
		// after a drag from the fifth pill down to the second, two are large and nothing above the pointer.
		await page.mouse.move(fifth.x, fifth.y);
		await page.mouse.down();
		await marked(5);
		await page.mouse.move(secondPill.x, secondPill.y, { steps: 3 });
		await marked(2);
		await page.mouse.up();
		await marked(2);
		await expect(text(page, 'five')).toHaveText('2 / 5');

		// Escape ends a drag as a release does: the value is back, and the large pieces are those of the pointer's place.
		await page.mouse.move(third.x, third.y);
		await page.mouse.down();
		await page.mouse.move(first.x, first.y, { steps: 2 });
		await expect(text(page, 'five')).toHaveText('1 / 5');
		await marked(1);
		await page.keyboard.press('Escape');
		await expect(text(page, 'five')).toHaveText('2 / 5');
		await marked(1);
		await page.mouse.up();
		await marked(1);

		// Escape with the pointer held far below the meter: the drag is over and the pointer rests on no piece,
		// so nothing is marked, at once and without the pointer moving.
		await page.mouse.move(third.x, third.y);
		await page.mouse.down();
		await page.mouse.move(fourth.x, fourth.y + 70, { steps: 2 });
		await expect(text(page, 'five')).toHaveText('4 / 5');
		await marked(4);
		await page.keyboard.press('Escape');
		await expect(text(page, 'five')).toHaveText('2 / 5');
		await marked(0);
		await page.mouse.up();
		await marked(0);

		// A meter in pieces which takes the value under the pointer draws large the pieces which a press there
		// fills, at rest and in a drag: five of ten at 50, and seven at 74.
		const plain = await pointAt(page, 'hundred', 0.5);
		await page.mouse.move(plain.x, plain.y);
		await expectLarge(page, 'hundred', 5);
		await page.mouse.down();
		await expectLarge(page, 'hundred', 5);
		await page.mouse.move(plain.x + plain.width * 0.24, plain.y, { steps: 2 });
		await expect(text(page, 'hundred')).toHaveText('74%');
		await expectLarge(page, 'hundred', 7);
		await page.mouse.up();
	});

	test('automatic fills by the piece where each piece is one step, and takes the value under the pointer otherwise', async ({ page }) => {
		// Five pieces for five steps, as pills and as dots: by the piece.
		await expect(line(page, 'five')).toHaveClass(/mt-by-piece/);
		await expect(line(page, 'dots')).toHaveClass(/mt-by-piece/);

		// One bar, and ten pills for a hundred steps: the value under the pointer.
		await expect(line(page, 'whole')).toHaveClass(/mt-by-position/);
		await expect(line(page, 'hundred')).toHaveClass(/mt-by-position/);
		await expectFilledPieces(line(page, 'hundred'), 10, 4);

		// 37% of the way along ten pills is 37, which a click on a piece could not give, and fills four of them.
		await clickAt(page, 'hundred', 0.37);
		await expect(text(page, 'hundred')).toHaveText('37%');
		await expectFilledPieces(line(page, 'hundred'), 10, 4);
		await clickAt(page, 'hundred', 0.93);
		await expect(text(page, 'hundred')).toHaveText('93%');
		await expectFilledPieces(line(page, 'hundred'), 10, 9);

		// The nine which that press filled are large under the pointer, and none of the two is ever the relative method.
		await expectLarge(page, 'hundred', 9);
		for (const name of ['whole', 'five', 'dots', 'hundred']) await expect(line(page, name)).not.toHaveClass(/mt-by-relative/);

		// Only the option makes a meter relative.
		await expect(line(page, 'rel')).toHaveClass(/mt-by-relative/);
	});

	// The relative method, step by step, for two browsers. The browser of these tests refuses to lock the pointer,
	// so there the meter works with a drag it has captured; the full browser grants the lock.
	const relativeSteps = async (page: Page, locks: boolean) => {
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

	/** The kinds of event the document listens to, as `listened` gives them for an element. */
	const documentListens = async (page: Page) => {
		const client = await page.context().newCDPSession(page);

		try {
			const { result } = await client.send('Runtime.evaluate', { expression: 'document' });
			const { listeners } = await client.send('DOMDebugger.getEventListeners', { objectId: result.objectId! });
			return listeners.map((listener) => listener.type);
		} finally {
			await client.detach();
		}
	};

	// A field which a condition hides once its value is 50: dragged across 50, its meter is taken out of the page
	// with the button held. Whatever it held on to is let go: no listener of its own is left on the document,
	// no pointer is locked, nothing is thrown, and the next press on another meter works as ever.
	const vanishingSteps = async (page: Page, locks: boolean) => {
		const locked = () => page.evaluate(() => document.pointerLockElement !== null);
		const lockListeners = async () => (await documentListens(page)).filter((type) => type === 'pointerlockchange').length;

		await expect(text(page, 'vanishing')).toHaveText('30%');
		const before = await lockListeners();

		const start = await pointAt(page, 'vanishing', 0.5);
		await page.mouse.move(start.x, start.y);
		await page.mouse.down();
		await expect.poll(locked).toBe(locks);
		expect(await lockListeners()).toBe(before + 1);

		await page.mouse.move(start.x + start.width * 0.1, start.y, { steps: 4 });
		await expect(text(page, 'vanishing')).toHaveText('40%');
		await page.mouse.move(start.x + start.width * 0.25, start.y, { steps: 6 });

		// Gone, with the button still down.
		await expect(fieldOf(page, 'vanishing')).toHaveCount(0);
		await expect.poll(locked).toBe(false);
		expect(await lockListeners()).toBe(before);

		await page.mouse.move(start.x + start.width * 0.3, start.y + 40, { steps: 3 });
		await page.mouse.up();
		await expect(fieldOf(page, 'vanishing')).toHaveCount(0);

		// The pointer is free: a press on another meter sets it.
		await clickAt(page, 'whole', 0.7);
		await expect(text(page, 'whole')).toHaveText('70%');
	};

	test('relative input: the press changes nothing, a drag changes the value by its distance times the sensitivity, and Shift is finer', async ({ page }) => {
		// In the browser of these tests, which refuses the lock: a captured drag.
		expect(await line(page, 'rel').evaluate((element) => typeof element.requestPointerLock)).toBe('function');
		await relativeSteps(page, false);
		await expect(line(page, 'rel')).toHaveCSS('cursor', 'ew-resize');
	});

	test('relative input under a real pointer lock, in the full browser', async ({ playwright }) => {
		// The browser of these tests never grants the lock, so the full browser is started for this, signed in as
		// the pages of these tests are. Where it cannot be started, this test is skipped and says why.
		let reason = '';
		const browser = await playwright.chromium.launch({ channel: 'chromium' }).catch((error: unknown) => {
			reason = String(error).split('\n')[0] ?? '';
			return null;
		});

		test.skip(browser === null, `the full browser could not be started, so the pointer lock was not tested: ${reason}`);
		if (browser === null) return;

		try {
			const { page: full, quiet } = await signedIn(browser);
			const locked = () => full.evaluate(() => document.pointerLockElement !== null);

			await openEdit(full);
			await expect(text(full, 'rel')).toHaveText('40%');
			await relativeSteps(full, true);

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

			// A press which is over before the lock arrives: the lock is given back at once, each time.
			for (let round = 0; round < 3; round++) {
				await full.mouse.move(point.x, point.y);
				await full.mouse.down();
				await full.mouse.up();
				await expect.poll(locked).toBe(false);

				// That no lock arrives late can only be shown by waiting, and there is no event to wait for when
				// nothing happens. The lock which was asked for at the press is granted or refused within a frame
				// or two; 150ms is some nine frames, a margin and not a bound which was measured.
				await full.waitForTimeout(150);
				expect(await locked()).toBe(false);
			}

			await expect(text(full, 'rel')).toHaveText('62%');

			// And right after such a press, a drag works as any other.
			await full.mouse.down();
			await expect.poll(locked).toBe(true);
			await full.mouse.move(point.x + point.width * 0.1, point.y, { steps: 5 });
			await expect(text(full, 'rel')).toHaveText('72%');
			await full.mouse.up();
			await expect.poll(locked).toBe(false);

			// A meter which is taken out of the page during a drag under the lock gives the lock back.
			await vanishingSteps(full, true);

			quiet();
		} finally {
			await browser.close();
		}
	});

	test('the other ends of a press: the browser takes the pointer away, and the meter is taken out of the page', async ({ page }) => {
		// The browser cancels a pointer when it takes it for something else, as when a finger starts to scroll
		// the page: nothing was meant, and the value from before the press is back.
		const start = await pointAt(page, 'whole', 0.2);
		await page.mouse.move(start.x, start.y);
		await page.mouse.down();
		await page.mouse.move(start.x + start.width * 0.5, start.y, { steps: 4 });
		await expect(text(page, 'whole')).toHaveText('70%');
		expect(await line(page, 'whole').evaluate((element) => element.hasPointerCapture(1))).toBe(true);

		await line(page, 'whole').evaluate((element) => element.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true })));
		await expect(text(page, 'whole')).toHaveText('40%');
		expect(await line(page, 'whole').evaluate((element) => element.hasPointerCapture(1))).toBe(false);
		await expect(line(page, 'whole')).not.toHaveClass(/mt-busy/);

		// The press is over: the pointer sets nothing until it is pressed again.
		await page.mouse.move(start.x + start.width * 0.3, start.y, { steps: 3 });
		await expect(text(page, 'whole')).toHaveText('40%');
		await page.mouse.up();
		await expect(edited(page)).toHaveCount(0);

		// A cancel for another pointer than the one which is pressed changes nothing.
		await page.mouse.move(start.x, start.y);
		await page.mouse.down();
		await expect(text(page, 'whole')).toHaveText('20%');
		await line(page, 'whole').evaluate((element) => element.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 7, bubbles: true })));
		await expect(text(page, 'whole')).toHaveText('20%');
		await page.mouse.move(start.x + start.width * 0.1, start.y, { steps: 2 });
		await expect(text(page, 'whole')).toHaveText('30%');
		await page.mouse.up();

		// The meter is taken out of the page during a drag, here without a lock.
		await vanishingSteps(page, false);

		// What the item is saved with: the two meters which were set, the one which went at the value which hid it.
		const sent = await save(page, EDIT);
		expect(sent.values).toEqual({ whole: 70, vanishing: 50 });
	});

	test('a finger sets a meter by a tap or a sideways drag, writes nothing where it scrolls the page, and leaves no piece large', async ({ browser }) => {
		// A page of its own which has a touch screen, signed in as the pages of these tests are. The fingers are
		// sent through the tools of the browser, which can move one as well as put it down.
		const { context, page, quiet } = await signedIn(browser, { hasTouch: true });

		try {
			await openEdit(page);

			const client = await context.newCDPSession(page);
			const finger = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) =>
				client.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });

			// The pointer of a finger is known as one, and the browser says when it takes one away.
			await line(page, 'whole').evaluate((element) => {
				const seen = ((window as unknown as { kinds: string[]; taken: number }).kinds = [] as string[]);
				(window as unknown as { taken: number }).taken = 0;
				element.addEventListener('pointerdown', (event) => seen.push((event as PointerEvent).pointerType));
				document.addEventListener('pointercancel', () => (window as unknown as { taken: number }).taken++, true);
			});
			const taken = () => page.evaluate(() => (window as unknown as { taken: number }).taken);

			// Everything the text of a meter says from here on: one entry for every time it changes. A value which
			// was written and put back would be two of them.
			type Said = { said: Record<string, string[]> };
			const listen = (name: string) =>
				text(page, name).evaluate((element, key) => {
					const store = ((window as unknown as Said).said ??= {});
					const list: string[] = (store[key] = []);
					new MutationObserver(() => list.push((element.textContent ?? '').trim())).observe(element, {
						subtree: true,
						childList: true,
						characterData: true,
					});
				}, name);
			const said = (name: string) => page.evaluate((key) => (window as unknown as Said).said[key], name);
			const frames = () => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(null)))));

			for (const name of ['whole', 'closing', 'rel', 'five']) await listen(name);

			// A tap sets the value under the finger: once, when the finger is lifted.
			const whole = await pointAt(page, 'whole', 0.25);
			await page.touchscreen.tap(whole.x, whole.y);
			await expect(text(page, 'whole')).toHaveText('25%');
			expect(await page.evaluate(() => (window as unknown as { kinds: string[] }).kinds)).toEqual(['touch']);
			expect(await said('whole')).toEqual(['25%']);

			// A finger which comes down writes nothing, and nothing while it has moved less than a few pixels.
			const left = whole.x - whole.width * 0.25;
			await finger('touchStart', left + whole.width * 0.3, whole.y);
			await frames();
			await finger('touchMove', left + whole.width * 0.3 + 3, whole.y);
			await frames();
			await finger('touchMove', left + whole.width * 0.3 + 5, whole.y + 4);
			await frames();

			// Nor while it has moved further down than sideways, which is how a scroll starts.
			await finger('touchMove', left + whole.width * 0.3 + 7, whole.y + 10);
			await frames();
			await expect(text(page, 'whole')).toHaveText('25%');
			expect(await said('whole')).toEqual(['25%']);

			// Once it moves sideways it is followed, and the value stays when it is lifted.
			for (const share of [0.4, 0.5, 0.6, 0.7]) {
				await finger('touchMove', left + whole.width * share, whole.y);
				await expect(text(page, 'whole')).toHaveText(`${share * 100}%`);
			}
			await finger('touchEnd');
			await expect(text(page, 'whole')).toHaveText('70%');
			expect(await said('whole')).toEqual(['25%', '40%', '50%', '60%', '70%']);
			expect(await taken()).toBe(0);

			// A finger which moves up the page was not meant for the meter: the browser takes it for scrolling.
			// Nothing was written: not the value under the finger, and so nothing which had to be put back.
			await finger('touchStart', left + whole.width * 0.1, whole.y);
			for (const up of [20, 60, 120, 200]) await finger('touchMove', left + whole.width * 0.1, whole.y - up);
			await finger('touchEnd');
			await frames();
			expect(await taken()).toBe(1);
			await expect(text(page, 'whole')).toHaveText('70%');
			expect(await said('whole')).toEqual(['25%', '40%', '50%', '60%', '70%']);

			// The same on a field which a condition closes from 50 on: a finger which comes down at 80 and then
			// scrolls the page leaves the field as it was, at 30 and open. Written at the touch, the 80 would
			// have closed the field, and could not have been put back.
			const closing = await pointAt(page, 'closing', 0.8);
			await finger('touchStart', closing.x, closing.y);
			await frames();
			for (const up of [20, 60, 120, 200]) await finger('touchMove', closing.x, closing.y - up);
			await finger('touchEnd');
			await frames();
			expect(await taken()).toBe(2);
			await expect(text(page, 'closing')).toHaveText('30%');
			expect(await said('closing')).toEqual([]);
			await expect(line(page, 'closing')).toHaveAttribute('role', 'slider');
			await expect(fieldOf(page, 'closing').locator('.field-label.edited')).toHaveCount(0);

			// A tap on it still sets it.
			const tapped = await pointAt(page, 'closing', 0.4);
			await page.touchscreen.tap(tapped.x, tapped.y);
			await expect(text(page, 'closing')).toHaveText('40%');
			expect(await said('closing')).toEqual(['40%']);

			// The relative method by finger: nothing on the touch, the distance of the drag after it, and no lock
			// is asked for.
			const rel = await pointAt(page, 'rel', 0.5);
			await finger('touchStart', rel.x, rel.y);
			await finger('touchMove', rel.x + 4, rel.y);
			await frames();
			await expect(text(page, 'rel')).toHaveText('40%');
			expect(await said('rel')).toEqual([]);
			for (const share of [0.05, 0.1, 0.15, 0.2]) await finger('touchMove', rel.x + rel.width * share, rel.y);
			await expect(text(page, 'rel')).toHaveText('60%');
			expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
			await finger('touchEnd');
			await expect(text(page, 'rel')).toHaveText('60%');

			// By the piece: a tap on the last pill fills all five, and a finger leaves no piece large behind it.
			const five = await pointAt(page, 'five', 0.9);
			await page.touchscreen.tap(five.x, five.y);
			await expect(text(page, 'five')).toHaveText('5 / 5');
			await expectLarge(page, 'five', 0);

			// A read-only meter is not set by a finger either.
			const locked = await pointAt(page, 'twin_locked', 0.9);
			await page.touchscreen.tap(locked.x, locked.y);
			await expect(text(page, 'twin_locked')).toHaveText('40%');

			// A finger has more room than a mouse: all of the area above the line of caption and text. A tap at
			// the very top of the area, well above the track, sets the value at that place along it; one on the
			// caption or on the value text sets nothing.
			await line(page, 'twin_live').scrollIntoViewIfNeeded();
			const area = (await meter(page, 'twin_live').boundingBox())!;
			const twin = (await line(page, 'twin_live').boundingBox())!;
			const caption = (await meter(page, 'twin_live').locator('.mt-caption').boundingBox())!;
			expect(twin.y - area.y).toBeGreaterThan(8);

			await page.touchscreen.tap(area.x + area.width * 0.7, area.y + 1);
			await expect(text(page, 'twin_live')).toHaveText('70%');
			await page.touchscreen.tap(caption.x + 20, caption.y + caption.height / 2);
			await page.touchscreen.tap(area.x + area.width * 0.2, caption.y + caption.height - 2);
			await expect(text(page, 'twin_live')).toHaveText('70%');

			// The same tap on the meter which cannot be edited sets nothing.
			const still = (await meter(page, 'twin_locked').boundingBox())!;
			await page.touchscreen.tap(still.x + still.width * 0.7, still.y + 1);
			await expect(text(page, 'twin_locked')).toHaveText('40%');

			await expect(edited(page)).toHaveCount(5);
			quiet();
		} finally {
			await context.close();
		}
	});

	test('more than the track takes a press: just above it and just below it, by every method, and not the caption or the text', async ({ page }) => {
		const trackOf = async (name: string) => {
			await line(page, name).scrollIntoViewIfNeeded();
			return (await line(page, name).boundingBox())!;
		};

		// How many rows of pixels at a place along a meter take a press, counted from well above the track to well
		// below it: those where the topmost thing is the track or its reach.
		const reachAt = (name: string, share: number) =>
			line(page, name).evaluate((element, at) => {
				const box = element.getBoundingClientRect();
				const x = box.left + box.width * at;
				let rows = 0;

				for (let y = Math.round(box.top) - 20; y < Math.round(box.bottom) + 20; y++) {
					const top = document.elementFromPoint(x, y + 0.5);
					if (top !== null && (element.contains(top) || top.classList.contains('mt-reach'))) rows++;
				}

				return rows;
			}, share);

		// One bar, by the place under the pointer. 5px above the track at 30%, and 2px below it at 60%.
		const whole = await trackOf('whole');
		expect(whole.height).toBe(12);
		await page.mouse.click(whole.x + whole.width * 0.3, whole.y - 5);
		await expect(text(page, 'whole')).toHaveText('30%');
		await page.mouse.click(whole.x + whole.width * 0.6, whole.y + whole.height + 2);
		await expect(text(page, 'whole')).toHaveText('60%');

		// The target is 24px high in all, the track and what is beside it, and no more: 10px above the track is
		// not in it. (A row of pixels more is counted where the track starts between two of them.)
		expect(await reachAt('whole', 0.5)).toBeGreaterThanOrEqual(24);
		expect(await reachAt('whole', 0.5)).toBeLessThanOrEqual(25);
		await page.mouse.click(whole.x + whole.width * 0.9, whole.y - 10);
		await expect(text(page, 'whole')).toHaveText('60%');

		// A press there is a press on the track in everything: a drag follows, the track has the focus, so the
		// keys work, and Escape puts the value back.
		await page.mouse.move(whole.x + whole.width * 0.2, whole.y - 4);
		await page.mouse.down();
		await expect(text(page, 'whole')).toHaveText('20%');
		await expect(line(page, 'whole')).toBeFocused();
		await page.mouse.move(whole.x + whole.width * 0.7, whole.y + 60, { steps: 3 });
		await expect(text(page, 'whole')).toHaveText('70%');
		await page.keyboard.press('Escape');
		await expect(text(page, 'whole')).toHaveText('60%');
		await page.mouse.up();
		await page.mouse.click(whole.x + whole.width * 0.5, whole.y - 3);
		await expect(text(page, 'whole')).toHaveText('50%');
		await page.keyboard.press('ArrowRight');
		await expect(text(page, 'whole')).toHaveText('51%');
		expect(await page.evaluate(() => String(getSelection()))).toBe('');

		// By the piece: above the fourth pill, and below the second.
		const five = await trackOf('five');
		const pillAt = async (index: number) => {
			const area = (await line(page, 'five').locator('> *').nth(index).boundingBox())!;
			return area.x + area.width / 2;
		};
		await page.mouse.click(await pillAt(3), five.y - 6);
		await expect(text(page, 'five')).toHaveText('4 / 5');
		await page.mouse.click(await pillAt(1), five.y + five.height + 3);
		await expect(text(page, 'five')).toHaveText('2 / 5');
		expect(await reachAt('five', 0.5)).toBeGreaterThanOrEqual(24);
		expect(await reachAt('five', 0.5)).toBeLessThanOrEqual(25);

		// By how far the pointer moves: the press above the track changes nothing, the drag after it does.
		const rel = await trackOf('rel');
		await page.mouse.move(rel.x + rel.width * 0.9, rel.y - 5);
		await page.mouse.down();
		await expect(text(page, 'rel')).toHaveText('40%');
		await page.mouse.move(rel.x + rel.width * 0.7, rel.y - 5, { steps: 4 });
		await expect(text(page, 'rel')).toHaveText('20%');
		await page.mouse.up();

		// The pointer shows it there as on the track, and nowhere else. The handle and the large pieces are the track's:
		// they do not show for a pointer which is only beside it.
		const cursorAt = (x: number, y: number) => page.evaluate(([left, top]) => getComputedStyle(document.elementFromPoint(left!, top!)!).cursor, [x, y]);
		expect(await cursorAt(whole.x + 50, whole.y - 5)).toBe('pointer');
		expect(await cursorAt(whole.x + 50, whole.y + whole.height + 2)).toBe('pointer');
		expect(await cursorAt(rel.x + 50, rel.y - 5)).toBe('ew-resize');
		expect(await cursorAt(whole.x + 50, whole.y - 12)).not.toBe('pointer');

		const twin = await trackOf('twin_live');
		await page.mouse.move(twin.x + 50, twin.y - 5);
		await expect(line(page, 'twin_live').locator('.mt-handle')).toBeHidden();
		await page.mouse.move(await pillAt(3), five.y - 5);
		await expectLarge(page, 'five', 0);

		// The caption and the value text under the track are not part of it: a press on either changes nothing.
		const caption = (await meter(page, 'twin_live').locator('.mt-caption').boundingBox())!;
		const value = (await text(page, 'twin_live').boundingBox())!;
		await page.mouse.click(caption.x + 20, caption.y + caption.height / 2);
		await page.mouse.click(value.x + value.width / 2, value.y + value.height / 2);
		await page.mouse.click(twin.x + twin.width * 0.7, caption.y + 2);
		await expect(text(page, 'twin_live')).toHaveText('40%');
		expect(await cursorAt(caption.x + 20, caption.y + caption.height / 2)).not.toBe('pointer');

		// What takes the press beside the track are two items of the area which grow into the room it has free: 8px
		// above the track here, and as much at the bottom, under the caption, where it takes no press. They move
		// nothing: the line of caption and text is 4px under the track, as it is under the track of the same meter
		// which cannot be edited, and the track is still the first thing in the area.
		const reach = meter(page, 'twin_live').locator('.mt-reach');
		await expect(reach).toHaveCount(2);
		const above = (await reach.first().boundingBox())!;
		const below = (await reach.last().boundingBox())!;
		expect(above.height).toBe(8);
		expect(above.y + above.height).toBe(twin.y);
		expect(below.height).toBe(8);
		expect(below.y).toBeGreaterThanOrEqual(caption.y + caption.height);
		await expect(reach.last()).toHaveCSS('pointer-events', 'none');
		expect(caption.y - (twin.y + twin.height)).toBe(4);
		await expect(line(page, 'twin_live')).toHaveClass(/mt-track/);

		// A meter which cannot be edited has none of it.
		const locked = await trackOf('twin_locked');
		await expect(meter(page, 'twin_locked').locator('.mt-reach')).toHaveCount(0);
		await expect(meter(page, 'twin_locked')).not.toHaveClass(/mt-open/);
		expect(await reachAt('twin_locked', 0.5)).toBeLessThanOrEqual(13);
		await page.mouse.click(locked.x + locked.width * 0.9, locked.y - 5);
		await page.mouse.click(locked.x + locked.width * 0.9, locked.y + locked.height + 2);
		await expect(text(page, 'twin_locked')).toHaveText('40%');
		expect(await cursorAt(locked.x + 50, locked.y - 5)).not.toBe('pointer');
		expect(await listened(page, meter(page, 'twin_locked'))).toEqual([]);

		await expect(edited(page)).toHaveCount(3);
	});

	test('the taller target never leaves the area of the meter: it is as high as the room above the track, and none under a caption of several lines', async ({
		page,
	}) => {
		const boxOf = async (locator: Locator) => {
			await locator.scrollIntoViewIfNeeded();
			return edges(locator);
		};

		// Whether the topmost thing at a point is part of a meter at all.
		const ours = (x: number, y: number) => page.evaluate(([left, top]) => document.elementFromPoint(left!, top!)?.closest('.meter') != null, [x, y]);

		// A caption of several lines: the group is higher than a stock input, the area has grown to it, and the
		// track is at the top edge of the area.
		const area = await boxOf(meter(page, 'wrapped'));
		const bar = await edges(line(page, 'wrapped'));
		const caption = await edges(meter(page, 'wrapped').locator('.mt-caption'));
		const label = await edges(fieldOf(page, 'wrapped').locator('.field-label'));
		expect(caption.bottom - caption.top).toBeGreaterThanOrEqual(60);
		expect(area.bottom - area.top).toBeGreaterThan(54);
		expect(bar.top).toBe(area.top);
		expect(area.top - label.bottom).toBeGreaterThan(2);

		// So there is no room above the track, and nothing of the meter is there: not in the gap under the label
		// of the field, and not on the bottom of the label's box. A press at either changes nothing.
		const reach = meter(page, 'wrapped').locator('.mt-reach');
		expect((await reach.first().boundingBox())!.height).toBe(0);
		expect((await reach.last().boundingBox())!.height).toBe(0);

		const x = bar.left + bar.width * 0.7;
		for (const y of [area.top - 1, area.top - 3, (area.top + label.bottom) / 2]) {
			expect(await ours(x, y), `${area.top - y}px above the area`).toBe(false);
			await page.mouse.click(x, y);
			await expect(text(page, 'wrapped')).toHaveText('40%');
		}

		// The label of a field is a button which opens the menu of the field, down to its last row of pixels:
		// that is what a press there does, as on any field.
		const menu = page.locator('.v-menu-popper:visible');
		for (const y of [label.bottom - 1, label.bottom - 3]) {
			expect(await ours(x, y), `${area.top - y}px above the area`).toBe(false);
			expect(await ours(label.left + 10, y), `${area.top - y}px above the area, on the name`).toBe(false);
			await expect(menu).toHaveCount(0);
			await page.mouse.click(x, y);
			await expect(menu).toHaveCount(1);
			await expect(text(page, 'wrapped')).toHaveText('40%');
			await page.mouse.click(x, y);
			await expect(menu).toHaveCount(0);
		}

		await expect(edited(page)).toHaveCount(0);
		expect(await cursorOf(page, x, area.top - 2)).not.toBe('pointer');

		// The track itself still takes a press, from its first row of pixels, and so does the gap under it.
		await page.mouse.click(bar.left + bar.width * 0.7, bar.top + 1);
		await expect(text(page, 'wrapped')).toHaveText('70%');
		await page.mouse.click(bar.left + bar.width * 0.3, bar.bottom + 2);
		await expect(text(page, 'wrapped')).toHaveText('30%');
		await page.mouse.click(caption.left + 20, caption.top + 30);
		await expect(text(page, 'wrapped')).toHaveText('30%');

		// Where the area has some room above the track, the target is as high as that room. A theme whose inputs
		// are 44px high leaves 4px above the group of a meter with a caption of one line, and 4px under it.
		await fieldOf(page, 'whole').evaluate((element) => (element as HTMLElement).style.setProperty('--theme--form--field--input--height', '44px'));
		const small = await boxOf(meter(page, 'whole'));
		const track = await edges(line(page, 'whole'));
		expect(small.bottom - small.top).toBe(44);
		expect(track.top - small.top).toBe(4);
		expect((await meter(page, 'whole').locator('.mt-reach').first().boundingBox())!.height).toBe(4);

		await page.mouse.click(track.left + track.width * 0.25, track.top - 3);
		await expect(text(page, 'whole')).toHaveText('25%');
		expect(await ours(track.left + track.width * 0.8, track.top - 5)).toBe(false);
		await page.mouse.click(track.left + track.width * 0.8, track.top - 5);
		await expect(text(page, 'whole')).toHaveText('25%');

		// With the height of a stock input back there are 8px of it, and a press just above the track sets the
		// value as before.
		await fieldOf(page, 'whole').evaluate((element) => (element as HTMLElement).style.removeProperty('--theme--form--field--input--height'));
		const back = await boxOf(line(page, 'whole'));
		expect((await meter(page, 'whole').locator('.mt-reach').first().boundingBox())!.height).toBe(8);
		await page.mouse.click(back.left + back.width * 0.6, back.top - 7);
		await expect(text(page, 'whole')).toHaveText('60%');
		await page.mouse.click(back.left + back.width * 0.9, back.top - 9.5);
		await expect(text(page, 'whole')).toHaveText('60%');

		// A meter with neither caption nor text has its track in the middle of the area, and room on both sides
		// of it: there the item under the track takes a press as the one above does.
		expect(await meter(page, 'bare').locator('.mt-line').count()).toBe(0);
		const bare = await boxOf(line(page, 'bare'));
		const whole = await edges(meter(page, 'bare'));
		expect(bare.top - whole.top).toBe(21);
		await page.mouse.click(bare.left + bare.width * 0.2, bare.top - 6);
		await expect(line(page, 'bare')).toHaveAttribute('aria-valuenow', '20');
		await page.mouse.click(bare.left + bare.width * 0.8, bare.bottom + 6);
		await expect(line(page, 'bare')).toHaveAttribute('aria-valuenow', '80');
		await page.mouse.click(bare.left + bare.width * 0.5, bare.bottom + 10);
		await page.mouse.click(bare.left + bare.width * 0.5, bare.top - 10);
		await expect(line(page, 'bare')).toHaveAttribute('aria-valuenow', '80');
		expect(await cursorOf(page, bare.left + 50, bare.bottom + 6)).toBe('pointer');

		await expect(edited(page)).toHaveCount(3);
	});

	test('only a meter which is cut into pieces watches its width, and it stops when its field leaves the form or the form the page', async ({ page }) => {
		// Every observer of sizes which the page makes is kept in a list from before the app starts, with the
		// field of the meter it watches, until it is disconnected or told to stop watching.
		await page.addInitScript(() => {
			const Native = window.ResizeObserver;
			const live = new Map<ResizeObserver, Map<Element, string>>();

			window.ResizeObserver = class extends Native {
				override observe(target: Element, options?: ResizeObserverOptions) {
					const name = target.closest('.meter') ? ((target.closest('.field') as HTMLElement | null)?.dataset['field'] ?? '?') : null;
					if (name !== null) live.set(this, (live.get(this) ?? new Map()).set(target, name));
					super.observe(target, options);
				}

				override unobserve(target: Element) {
					live.get(this)?.delete(target);
					super.unobserve(target);
				}

				override disconnect() {
					live.delete(this);
					super.disconnect();
				}
			};

			(window as unknown as { watchedMeters: () => string[] }).watchedMeters = () =>
				[...live.values()].flatMap((targets) => [...targets.values()]).sort();
		});

		await openEdit(page);
		const watched = () => page.evaluate(() => (window as unknown as { watchedMeters: () => string[] }).watchedMeters());
		const named = (selector: string) =>
			page
				.locator(`main .v-form .field .meter > ${selector}`)
				.evaluateAll((rows) => rows.map((row) => (row.closest('.field') as HTMLElement).dataset['field'] ?? '?').sort());

		// One for every meter which is cut into pieces, whether it can be edited or not, since the number of pieces
		// goes by the width. A meter which draws one bar needs no width and watches nothing.
		const cut = await named('.mt-strip');
		const bars = await named('.mt-track');

		expect(cut.length).toBeGreaterThan(20);
		expect(bars.length).toBeGreaterThan(10);
		expect([...cut, ...bars].sort()).toEqual(Object.keys(EDIT_VALUES).sort());
		expect(await watched()).toEqual(cut);
		expect(cut).toContain('five');
		expect(cut).toContain('pills_locked');
		expect(bars).toContain('whole');
		expect(bars).toContain('turning');

		// One bar which becomes pills, as a condition of the field can make it: it is measured then, so the pills are
		// as many as its range asks for, and watched from then on. Back to one bar, it is watched no longer.
		await line(page, 'turning').focus();
		await page.keyboard.press('ArrowRight');
		await page.keyboard.press('ArrowRight');
		await expect(line(page, 'turning')).toHaveClass(/mt-pills/);
		await expectFilledPieces(line(page, 'turning'), 10, 5);
		expect(await watched()).toEqual([...cut, 'turning'].sort());

		await line(page, 'turning').focus();
		await page.keyboard.press('ArrowLeft');
		await expect(line(page, 'turning')).toHaveClass(/mt-track/);
		await expect(text(page, 'turning')).toHaveText('40%');
		expect(await watched()).toEqual(cut);

		// A field which a condition hides is taken out of the form: two steps take `leaving` from 3 to 5, where its
		// condition hides it. Its meter is gone, and so is the one observer which watched it.
		await line(page, 'leaving').focus();
		await page.keyboard.press('ArrowRight');
		await expect(text(page, 'leaving')).toHaveText('40%');
		await page.keyboard.press('ArrowRight');
		await expect(meter(page, 'leaving')).toHaveCount(0);
		expect(await watched()).toEqual(cut.filter((name) => name !== 'leaving'));

		// Saved, so that the form can be left without a question.
		const sent = await save(page, EDIT);
		expect(sent.values).toEqual({ turning: 4, leaving: 5 });

		// The form leaves the page without the page being loaded again: no meter is left, and none is watched.
		await page.locator(`a[href$="/content/${EDIT}"]`).first().click();
		await expect(page.locator('main .v-form')).toHaveCount(0);
		await expect(page.locator('.meter')).toHaveCount(0);
		expect(await watched()).toEqual([]);
	});

	test('the track is measured once for a pointer event, and not at all for a pointer which rests on one bar', async ({ page }) => {
		// Every question for the box of a track or of a row of pieces is counted from here on, by the field it is in.
		await page.evaluate(() => {
			const counts: Record<string, number> = {};
			const native = Element.prototype.getBoundingClientRect;

			Element.prototype.getBoundingClientRect = function (this: Element) {
				if (this.matches('.meter > :first-child')) {
					const name = (this.closest('.field') as HTMLElement | null)?.dataset['field'] ?? '?';
					counts[name] = (counts[name] ?? 0) + 1;
				}

				return native.call(this);
			};

			(window as unknown as { measured: (name: string) => number }).measured = (name) => {
				const count = counts[name] ?? 0;
				counts[name] = 0;
				return count;
			};
		});

		// How often the track of a field was measured since this was last asked.
		const measured = (name: string) => page.evaluate((key) => (window as unknown as { measured: (name: string) => number }).measured(key), name);

		// Pills which are filled by the piece. Each of the four events needs to know where the pieces are, for the
		// pieces up to the pointer and for the value, and asks once.
		const five = await pointAt(page, 'five', 0.3);
		await expect(line(page, 'five')).toHaveClass(/mt-by-piece/);
		await measured('five');

		await page.mouse.move(five.x, five.y);
		await expectLarge(page, 'five', 2);
		expect(await measured('five'), 'a pointer which rests on a piece').toBe(1);

		await page.mouse.down();
		await expect(line(page, 'five')).toHaveAttribute('aria-valuenow', '2');
		expect(await measured('five'), 'the press').toBe(1);

		await page.mouse.move(five.x + five.width * 0.4, five.y);
		await expect(line(page, 'five')).toHaveAttribute('aria-valuenow', '4');
		expect(await measured('five'), 'a movement of the drag').toBe(1);

		await page.mouse.up();
		await expectLarge(page, 'five', 4);
		expect(await measured('five'), 'the release').toBe(1);

		// One bar has no pieces to enlarge: a pointer which rests on it asks for nothing, and a press and a
		// movement of the drag ask once each, for the value.
		const whole = await pointAt(page, 'whole', 0.3);
		await measured('whole');

		await page.mouse.move(whole.x, whole.y);
		await page.mouse.move(whole.x + 5, whole.y);
		await expect(line(page, 'whole').locator('.mt-handle')).toBeVisible();
		expect(await measured('whole'), 'a pointer which rests on one bar').toBe(0);

		await page.mouse.down();
		await expect(text(page, 'whole')).not.toHaveText('40%');
		expect(await measured('whole'), 'the press on one bar').toBe(1);

		await page.mouse.move(whole.x + whole.width * 0.3, whole.y);
		await expect(text(page, 'whole')).toHaveText('60%');
		expect(await measured('whole'), 'a movement of the drag on one bar').toBe(1);

		await page.mouse.up();
		expect(await measured('whole'), 'the release on one bar').toBe(0);
	});

	test('a decimal field with one decimal place from 0 to 1 is set in tenths: the pointer sets 0.4, and the item holds 0.4', async ({ page, api }) => {
		// The app is told that the column is a decimal with one decimal place, and the form is opened again: the
		// database of the sandbox has no such column (`asDecimal`). The form hands the meter the type and the scale.
		await asDecimal(page, EDIT, 'tenths', 1);
		await page.reload();
		await openEdit(page);

		await expect(text(page, 'tenths')).toHaveText('0.5');
		await expect(line(page, 'tenths')).toHaveClass(/mt-by-position/);

		// A press at 37.2% of the track. By the range alone the step is a hundredth, and this is 0.37, which a
		// column of one decimal rounds: the meter writes what the column holds, 0.4.
		await clickAt(page, 'tenths', 0.372);
		await expect(text(page, 'tenths')).toHaveText('0.4');
		await expect(line(page, 'tenths')).toHaveAttribute('aria-valuenow', '0.4');

		const sent = await save(page, EDIT);
		expect(sent.values).toEqual({ tenths: 0.4 });
		expect(Number((await api.get(`/items/${EDIT}/${ids['Edit']}`)).tenths)).toBe(0.4);

		// A key is a tenth, and a Page key the ten of them which the range has.
		await line(page, 'tenths').focus();
		await page.keyboard.press('ArrowRight');
		await expect(text(page, 'tenths')).toHaveText('0.5');
		await page.keyboard.press('PageDown');
		await expect(text(page, 'tenths')).toHaveText('0');

		// The float field beside it, with the same range and no scale, is still set in hundredths.
		await clickAt(page, 'unit', 0.372);
		await expect(text(page, 'unit')).toHaveText('0.37');

		// The options form shows the same step as the placeholder of the Step input.
		await save(page, EDIT);
		await page.goto(`/admin/settings/data-model/${EDIT}/tenths`);
		const { option, tab } = optionsDialog(page);
		await tab('Interface');
		await expect(option('step').locator('input')).toHaveAttribute('placeholder', '0.1');
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
		expect(await slider.evaluate((element) => getComputedStyle(element).outlineColor)).toBe(
			await token(page, '--theme--form--field--input--border-color-focus'),
		);
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

	test('on a fine grid of many steps every arrow key moves the value by one step, and a Page key by ten', async ({ page }) => {
		// Ten million in steps of a tenth, at 4,567,890.1: a step added to such a value does not land on the
		// next point, so a key which worked that way did nothing here, and Page Up went nine steps.
		await expect(text(page, 'fine')).toHaveText('4,567,890.1');
		await line(page, 'fine').focus();

		for (const [key, expected] of [
			['ArrowRight', '4,567,890.2'],
			['ArrowRight', '4,567,890.3'],
			['ArrowLeft', '4,567,890.2'],
			['ArrowLeft', '4,567,890.1'],
			['ArrowUp', '4,567,890.2'],
			['ArrowDown', '4,567,890.1'],
			['PageUp', '4,567,891.1'],
			['PageUp', '4,567,892.1'],
			['PageDown', '4,567,891.1'],
			['ArrowLeft', '4,567,891'],
			['ArrowLeft', '4,567,890.9'],
		] as const) {
			await page.keyboard.press(key);
			await expect(text(page, 'fine'), key).toHaveText(expected);
		}

		await expect(line(page, 'fine')).toHaveAttribute('aria-valuenow', '4567890.9');

		const sent = await save(page, EDIT);
		expect(sent.values).toEqual({ fine: 4567890.9 });
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
		await expect(line(page, 'none')).toHaveAttribute('aria-valuetext', 'No value');

		// Escape with no drag is not the meter's: a press and release, then Escape, keeps the value.
		await clickAt(page, 'whole', 0.3);
		await page.keyboard.press('Escape');
		await expect(text(page, 'whole')).toHaveText('30%');
	});

	test('a read-only field and a field which a condition closes do not change, are not focusable and keep the role of a meter', async ({ page }) => {
		const locked = line(page, 'twin_locked');

		// A reading, as the meter of 1.0.1 is: the role of a meter, its attributes and its class, no tab stop, no
		// handle, no cursor.
		await expect(fieldOf(page, 'twin_locked').getByRole('meter', { name: 'A caption', exact: true })).toHaveCount(1);
		await expect(fieldOf(page, 'twin_locked').getByRole('slider')).toHaveCount(0);
		expect((await attributes(locked)).sort()).toEqual([
			'aria-labelledby',
			'aria-valuemax',
			'aria-valuemin',
			'aria-valuenow',
			'aria-valuetext',
			'class',
			'role',
		]);
		expect(await locked.getAttribute('class')).toBe('mt-track');
		expect(
			await meter(page, 'twin_locked').evaluate(
				(element) => element.querySelectorAll('[tabindex], .mt-handle, .mt-swell, .mt-part[style*="transform"]').length,
			),
		).toBe(0);
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
		expect(
			await page.evaluate(() => {
				const top = (name: string) => document.querySelector(`main .v-form .field[data-field="${name}"]`)!.getBoundingClientRect().top;
				return top('twin_live') - top('twin_locked');
			}),
		).toBe(0);

		for (const property of ['backgroundColor', 'borderRadius', 'opacity', 'overflow'] as const) {
			expect(await line(page, 'twin_live').evaluate((element, name) => getComputedStyle(element)[name], property)).toBe(
				await locked.evaluate((element, name) => getComputedStyle(element)[name], property),
			);
			expect(await fill(page, 'twin_live').evaluate((element, name) => getComputedStyle(element)[name], property)).toBe(
				await fill(page, 'twin_locked').evaluate((element, name) => getComputedStyle(element)[name], property),
			);
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
				return {
					width: dot.width,
					height: dot.height,
					top: dot.top - bar.top,
					left: dot.left - bar.left,
					right: bar.right - dot.right,
					fromEnd: end - dot.right,
				};
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

	test('a field which stops being one that can be edited during a drag stops there, and nothing more is written', async ({ page }) => {
		// A condition makes the field read-only once its own value is 50 or more, so a drag across 50 closes it
		// while the button is held.
		const track = line(page, 'closing');
		const held = () => track.evaluate((element) => element.hasPointerCapture(1));
		const start = await pointAt(page, 'closing', 0.3);
		const to = (share: number) => page.mouse.move(start.x + start.width * (share - 0.3), start.y, { steps: 2 });

		await expect(text(page, 'closing')).toHaveText('30%');
		await expect(track).toHaveAttribute('role', 'slider');

		await page.mouse.move(start.x, start.y);
		await page.mouse.down();
		await to(0.4);
		await expect(text(page, 'closing')).toHaveText('40%');
		await to(0.48);
		await expect(text(page, 'closing')).toHaveText('48%');
		await expect(track).toHaveAttribute('role', 'slider');
		expect(await held()).toBe(true);
		expect(await listened(page, track)).toEqual(LISTENERS);

		// Across the limit: the value which closed the field is the last one written.
		await to(0.5);
		await expect(text(page, 'closing')).toHaveText('50%');
		await expect(track).toHaveAttribute('role', 'meter');

		// At once it is the reading again: it has let go of the pointer, listens to nothing, and has no tab stop,
		// handle, cursor or class of a meter which can be edited.
		expect(await held()).toBe(false);
		expect(await listened(page, track)).toEqual([]);
		expect(await track.getAttribute('class')).toBe('mt-track');
		expect(await meter(page, 'closing').evaluate((element) => element.querySelectorAll('[tabindex], .mt-handle, .mt-live, .mt-busy').length)).toBe(0);
		await expect(track).toHaveCSS('cursor', 'auto');

		// The button is still held, and the pointer moves on: nothing changes any more.
		for (const share of [0.52, 0.6, 0.8, 0.2, 0.45]) {
			await to(share);
			await expect(text(page, 'closing')).toHaveText('50%');
		}

		await expectFilled(track, fill(page, 'closing'), 0.5);
		await page.mouse.up();
		await expect(text(page, 'closing')).toHaveText('50%');

		// Nor does a new press, or a key sent to it.
		await page.mouse.click(start.x, start.y);
		await keyOn(track, 'Home');
		await expect(text(page, 'closing')).toHaveText('50%');
		await expect(track).toHaveAttribute('role', 'meter');

		// What is saved is the limit, and nothing else.
		const sent = await save(page, EDIT);
		expect(sent.values).toEqual({ closing: 50 });
	});

	test('whole numbers in a range whose limits are not whole: the pressed piece is the one filled, and the slider says what can be set', async ({ page }) => {
		const pill = async (name: string, index: number) => {
			await line(page, name).scrollIntoViewIfNeeded();
			const area = (await line(page, name).locator('> *').nth(index).boundingBox())!;
			return { x: area.x + area.width / 2, y: area.y + area.height / 2, left: area.x };
		};

		// Five pills over 0.5 to 5.5, of which a whole type can hold 1 to 5: four steps, so a pill is not a step,
		// and the method chosen for it is the value under the pointer.
		await expectFilledPieces(line(page, 'between'), 5, 3);
		await expect(line(page, 'between')).toHaveClass(/mt-by-position/);

		// The slider says the range which can be set, not the one which is drawn.
		for (const name of ['between', 'between_piece']) {
			await expect(line(page, name)).toHaveAttribute('aria-valuemin', '1');
			await expect(line(page, name)).toHaveAttribute('aria-valuemax', '5');
			await expect(line(page, name)).toHaveAttribute('aria-valuenow', '3');
		}

		// Filled by the piece because the option says so: a press on the nth pill leaves n filled, and the value is n.
		await expect(line(page, 'between_piece')).toHaveClass(/mt-by-piece/);

		for (const filled of [5, 1, 4, 2, 3]) {
			const point = await pill('between_piece', filled - 1);
			await page.mouse.click(point.x, point.y);
			await expect(text(page, 'between_piece')).toHaveText(String(filled));
			await expectFilledPieces(line(page, 'between_piece'), 5, filled);
		}

		// Before the first pill: the least which can be written, which is 1 and fills one.
		const first = await pill('between_piece', 0);
		const third = await pill('between_piece', 2);
		await page.mouse.move(third.x, third.y);
		await page.mouse.down();
		await page.mouse.move(first.left - 40, first.y, { steps: 3 });
		await expect(text(page, 'between_piece')).toHaveText('1');
		await page.mouse.up();
		await expectFilledPieces(line(page, 'between_piece'), 5, 1);

		// The keys keep to what can be written: Home and End are 1 and 5.
		await line(page, 'between').focus();
		await page.keyboard.press('End');
		await expect(text(page, 'between')).toHaveText('5');
		await page.keyboard.press('ArrowRight');
		await expect(text(page, 'between')).toHaveText('5');
		await page.keyboard.press('Home');
		await expect(text(page, 'between')).toHaveText('1');
		await page.keyboard.press('ArrowLeft');
		await expect(text(page, 'between')).toHaveText('1');

		// 15 in a range of 0 to 10.5: shown as it is, said to be at the most which can be set, and a step down
		// from there is 9, one step under that, as a step down from 150 of a hundred is 99.
		await expect(text(page, 'beyond')).toHaveText('15');
		await expect(line(page, 'beyond')).toHaveAttribute('aria-valuemax', '10');
		await expect(line(page, 'beyond')).toHaveAttribute('aria-valuenow', '10');
		await line(page, 'beyond').focus();
		await page.keyboard.press('ArrowLeft');
		await expect(text(page, 'beyond')).toHaveText('9');
		await page.keyboard.press('End');
		await expect(text(page, 'beyond')).toHaveText('10');

		// A meter which cannot be edited says the range as it is stored.
		await expect(line(page, 'twin_locked')).toHaveAttribute('aria-valuemin', '0');
		await expect(line(page, 'twin_locked')).toHaveAttribute('aria-valuemax', '100');

		const sent = await save(page, EDIT);
		expect(sent.values).toEqual({ between_piece: 1, between: 1, beyond: 10 });
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
		expect(
			await dialogs
				.locator('.meter')
				.evaluateAll((meters) => meters.filter((each) => each.querySelector('[tabindex], .mt-handle, .mt-live, .mt-swell')).length),
		).toBe(0);
		expect(await dialogs.locator('.meter > :first-child').evaluateAll((lines) => [...new Set(lines.map((each) => each.getAttribute('role')))])).toEqual([
			'meter',
		]);

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
		// A slider has to say a value: without one it says the least it could be set to, and "No value" as its text.
		await expect(line(page, 'none')).toHaveAttribute('aria-valuenow', '0');
		await expect(line(page, 'none')).toHaveAttribute('aria-valuetext', 'No value');
		await expect(fieldOf(page, 'none').getByRole('slider', { name: 'None', exact: true })).toHaveCount(1);

		await clickAt(page, 'none', 0.5);
		await expect(text(page, 'none')).toHaveText('50%');
		await expect(meter(page, 'none')).not.toHaveClass(/mt-empty/);
		await expect(line(page, 'none')).toHaveAttribute('aria-valuenow', '50');

		// 150 of a hundred is shown as it is: the bar full, the text beyond a hundred.
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

	test('the input method None: a reading in a field which can be edited, drawn as the same meter in a read-only field, and never written', async ({
		page,
	}) => {
		// What a meter is made of, with what differs between any two fields taken out: the ids of the caption and
		// the name of the field.
		const made = (name: string) =>
			meter(page, name).evaluate((element) => {
				const copy = element.cloneNode(true) as HTMLElement;

				for (const part of [copy, ...Array.from(copy.querySelectorAll('*'))]) {
					for (const attribute of ['id', 'aria-labelledby', 'aria-label']) if (part.hasAttribute(attribute)) part.setAttribute(attribute, '');
				}

				return copy.outerHTML;
			});

		const boxes = (name: string) =>
			fieldOf(page, name).evaluate((element) => {
				const origin = element.getBoundingClientRect();

				return Array.from(element.querySelectorAll('.meter, .meter *, .type-note')).map((part) => {
					const area = part.getBoundingClientRect();
					const style = getComputedStyle(part);
					return [
						area.left - origin.left,
						area.top - origin.top,
						area.width,
						area.height,
						style.backgroundColor,
						style.opacity,
						style.cursor,
						style.touchAction,
					].join(' ');
				});
			});

		for (const [name, twin, bar] of [
			['off', 'off_locked', 'mt-track'],
			['off_pills', 'off_pills_locked', 'mt-strip mt-pills'],
		] as const) {
			await line(page, name).scrollIntoViewIfNeeded();
			await expect(text(page, name)).toHaveText(name === 'off' ? '40%' : '60%');

			// The field can be edited: the form does not mark it read-only, as it does the one beside it.
			await expect(fieldOf(page, name).locator('.interface')).not.toHaveClass(/disabled/);

			// A meter, and not a slider: no tab stop, no handle, nothing beside the track which takes a press,
			// no cursor, and the classes of a meter which cannot be edited.
			await expect(fieldOf(page, name).getByRole('meter')).toHaveCount(1);
			await expect(fieldOf(page, name).getByRole('slider')).toHaveCount(0);
			expect(await line(page, name).getAttribute('class')).toBe(bar);
			expect(await meter(page, name).getAttribute('class')).toBe('meter');
			expect(
				await meter(page, name).evaluate(
					(element) => element.querySelectorAll('[tabindex], .mt-handle, .mt-reach, .mt-swell, [class*="mt-by-"], [style*="transform"]').length,
				),
			).toBe(0);
			await expect(line(page, name)).toHaveCSS('cursor', 'auto');
			await expect(line(page, name)).toHaveCSS('touch-action', 'auto');
			await expect(line(page, name)).toHaveAttribute('aria-valuemin', '0');
			await expect(line(page, name)).toHaveAttribute('aria-valuemax', name === 'off' ? '100' : '5');

			// It listens to nothing, neither its track nor its area.
			expect(await listened(page, line(page, name))).toEqual([]);
			expect(await listened(page, meter(page, name))).toEqual([]);

			// It is the meter of the read-only field beside it: the same elements, classes and styles, every box
			// in the same place in its field, the same colours, not dimmed.
			expect(await made(name)).toBe(await made(twin));
			expect(await boxes(name)).toEqual(await boxes(twin));
			await expect(meter(page, name)).toHaveCSS('opacity', '1');

			// Under the pointer nothing shows: no handle, no larger piece, no other cursor.
			const point = await pointAt(page, name, 0.9);
			await page.mouse.move(point.x, point.y);
			expect(await cursorOf(page, point.x, point.y)).toBe('auto');
			expect(await made(name)).toBe(await made(twin));
			expect(await boxes(name)).toEqual(await boxes(twin));

			// A press, a drag, a double click, the keys and events sent straight to it change nothing.
			await page.mouse.click(point.x, point.y);
			await page.mouse.dblclick(point.x, point.y);
			await page.mouse.down();
			await page.mouse.move(point.x - point.width * 0.5, point.y, { steps: 4 });
			await page.mouse.up();
			await page.mouse.click(point.x, point.y - 8);
			await page.keyboard.press('ArrowRight');
			await line(page, name).dispatchEvent('pointerdown', { button: 0, isPrimary: true, clientX: point.x, clientY: point.y, pointerId: 1 });
			for (const key of ['ArrowRight', 'ArrowLeft', 'End', 'Home', 'PageUp', 'Escape']) await keyOn(line(page, name), key);
			await expect(text(page, name)).toHaveText(name === 'off' ? '40%' : '60%');
			await expect(edited(page)).toHaveCount(0);

			// The Tab key passes it by.
			await fieldOf(page, name).locator('button.field-name').focus();
			await page.keyboard.press('Tab');
			expect(await meter(page, name).evaluate((element) => element.contains(document.activeElement))).toBe(false);
		}

		// The same options without the word are a slider, so it is the word which does it.
		await expect(fieldOf(page, 'twin_live').getByRole('slider')).toHaveCount(1);
		expect(await listened(page, line(page, 'twin_live'))).toEqual(LISTENERS);

		// Saving the item, after an edit of another field, writes nothing for these.
		await clickAt(page, 'whole', 0.25);
		await expect(text(page, 'whole')).toHaveText('25%');
		const sent = await save(page, EDIT);
		expect(sent.values).toEqual({ whole: 25 });
		expect(sent.text).not.toContain('off');

		// The field itself can still be changed by other means: the form's own menu of the field sets a raw
		// value and clears it, and the reading follows.
		const menu = page.locator('.v-menu-popper:visible .v-list-item');
		await fieldOf(page, 'off').locator('button.field-name').click();
		await menu.filter({ hasText: 'Edit Raw Value' }).click();
		const raw = page.locator('.v-card', { hasText: 'Edit Raw Value' });
		await raw.locator('.CodeMirror, textarea, input, [contenteditable="true"]').first().click();
		await page.keyboard.press('ControlOrMeta+A');
		await page.keyboard.type('70');
		await raw.getByRole('button', { name: 'Done' }).click();
		await expect(text(page, 'off')).toHaveText('70%');
		await expect(fieldOf(page, 'off').getByRole('meter')).toHaveCount(1);

		await fieldOf(page, 'off').locator('button.field-name').click();
		await menu.filter({ hasText: 'Clear Value' }).click();
		await expect(text(page, 'off')).toHaveText('—');
	});

	test('a float field from 0 to 1 which sets no step is set in hundredths, with the pointer and the keys, and the item saves the number as it reads', async ({
		page,
		api,
	}) => {
		await line(page, 'unit').scrollIntoViewIfNeeded();
		await expect(text(page, 'unit')).toHaveText('0.5');
		await expect(line(page, 'unit')).toHaveAttribute('aria-valuemax', '1');

		// The pointer: 37.2% of the way along is 0.37, where a step of 1 had only the two ends.
		await clickAt(page, 'unit', 0.372);
		await expect(text(page, 'unit')).toHaveText('0.37');
		await expect(line(page, 'unit')).toHaveAttribute('aria-valuenow', '0.37');

		// The keys: a hundredth for an arrow, ten of them for a Page key.
		await line(page, 'unit').focus();
		await page.keyboard.press('ArrowRight');
		await expect(line(page, 'unit')).toHaveAttribute('aria-valuenow', '0.38');
		await page.keyboard.press('ArrowLeft');
		await page.keyboard.press('ArrowLeft');
		await expect(line(page, 'unit')).toHaveAttribute('aria-valuenow', '0.36');
		await page.keyboard.press('PageUp');
		await expect(line(page, 'unit')).toHaveAttribute('aria-valuenow', '0.46');
		await page.keyboard.press('PageDown');
		await page.keyboard.press('ArrowRight');
		await expect(line(page, 'unit')).toHaveAttribute('aria-valuenow', '0.37');

		// A drag across the track: every value on the way is a number of hundredths, written as one.
		const seen = await line(page, 'unit').evaluate((element) => {
			const values: string[] = [];
			new MutationObserver(() => values.push(element.getAttribute('aria-valuenow') ?? '')).observe(element, {
				attributes: true,
				attributeFilter: ['aria-valuenow'],
			});
			return ((window as unknown as { seen: string[] }).seen = values);
		});
		expect(seen).toEqual([]);

		const from = await pointAt(page, 'unit', 0.1);
		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		await page.mouse.move(from.x + from.width * 0.83, from.y, { steps: 40 });
		await page.mouse.move(from.x + from.width * 0.272, from.y, { steps: 20 });
		await page.mouse.up();

		const values = await page.evaluate(() => (window as unknown as { seen: string[] }).seen);
		expect(values.length).toBeGreaterThan(30);
		for (const value of values) expect(value, value).toMatch(/^(0(\.\d{1,2})?|1)$/);
		await expect(line(page, 'unit')).toHaveAttribute('aria-valuenow', '0.37');
		await expect(text(page, 'unit')).toHaveText('0.37');

		// Five pills for 0 to 5 on such a field: a pill is a hundred steps, so the pointer sets the value under
		// it. With a step of 1 the pills are filled by the piece, as they are on a whole type.
		await expect(line(page, 'stars')).toHaveClass(/mt-by-position/);
		await clickAt(page, 'stars', 0.33);
		await expect(line(page, 'stars')).toHaveAttribute('aria-valuenow', '1.65');
		await expect(line(page, 'stars_whole')).toHaveClass(/mt-by-piece/);
		await clickAt(page, 'stars_whole', 0.33);
		await expect(line(page, 'stars_whole')).toHaveAttribute('aria-valuenow', '2');

		// What is saved is the number as it reads, without dust.
		const sent = await save(page, EDIT);
		expect(sent.values).toEqual({ unit: 0.37, stars: 1.65, stars_whole: 2 });
		expect(sent.text).toContain('"unit":0.37,');
		expect(sent.text).toContain('"stars":1.65,');

		expect(await api.get(`/items/${EDIT}/${ids['Edit']}`)).toMatchObject({ unit: 0.37, stars: 1.65, stars_whole: 2 });

		await page.reload();
		await expect(text(page, 'whole')).toHaveText('40%');
		await expect(text(page, 'unit')).toHaveText('0.37');
		await expect(line(page, 'unit')).toHaveAttribute('aria-valuenow', '0.37');
	});

	test('the options form: None hides the step and the sensitivity, a value and a fraction show prefix and suffix, the step shows what it comes to', async ({
		page,
		api,
	}) => {
		await page.goto(`/admin/settings/data-model/${EDIT}/unit`);

		const { dialogs, option, choose } = optionsDialog(page);

		try {
			await dialogs.getByText('Interface', { exact: true }).first().click();

			// A float field from 0 to 1 without a step: the step says that it comes to a hundredth, and follows
			// the maximum as it is typed. A range of a hundred and more has 1.
			await expect(option('step').locator('input')).toHaveValue('');
			await expect(option('step').locator('input')).toHaveAttribute('placeholder', '0.01');
			await option('max').locator('input').fill('10');
			await expect(option('step').locator('input')).toHaveAttribute('placeholder', '0.1');
			await option('max').locator('input').fill('250');
			await expect(option('step').locator('input')).toHaveAttribute('placeholder', '1');
			await option('max').locator('input').fill('1');
			await expect(option('step').locator('input')).toHaveAttribute('placeholder', '0.01');

			// The format is the value, so the prefix and the suffix are there: two inputs side by side, right
			// after the format, each with a note which says that it is joined on as typed.
			await expect(option('indicatorFormat').locator('input')).toHaveValue('Value');
			await expect(option('prefix')).toHaveCount(1);
			await expect(option('suffix')).toHaveCount(1);

			const order = await dialogs
				.locator('.extension-options .field[data-field], .interface-options .field[data-field], .field[data-field]')
				.evaluateAll((fields) => fields.map((field) => field.getAttribute('data-field')));
			expect(order.slice(order.indexOf('indicatorFormat'), order.indexOf('indicatorFormat') + 3)).toEqual(['indicatorFormat', 'prefix', 'suffix']);

			const [before, after] = [await edges(option('prefix')), await edges(option('suffix'))];
			expect(before.top).toBe(after.top);
			expect(Math.abs(before.width - after.width)).toBeLessThan(1);
			expect(after.left).toBeGreaterThan(before.right);
			await expect(option('prefix').locator('.type-note')).toContainText('As typed, with no space added');
			await expect(option('suffix').locator('.type-note')).toContainText('needs its space');

			// The percentage has neither; the fraction and the value have both.
			await choose('indicatorFormat', 'Percent');
			await expect(option('prefix')).toHaveCount(0);
			await expect(option('suffix')).toHaveCount(0);
			await choose('indicatorFormat', 'Value / Maximum');
			await expect(option('prefix')).toHaveCount(1);
			await expect(option('suffix')).toHaveCount(1);
			await choose('indicatorFormat', 'Value');
			await expect(option('suffix')).toHaveCount(1);

			await option('prefix').locator('input').fill('$');
			await option('suffix').locator('input').fill(' GB');

			// The input methods: the step shows for all but None, the sensitivity for the relative one alone.
			await expect(option('input').locator('input')).toHaveValue('Automatic');
			await expect(option('input').locator('.type-note')).toContainText('None: not edited');
			await expect(option('step')).toHaveCount(1);
			await expect(option('sensitivity')).toHaveCount(0);

			await choose('input', 'None');
			await expect(option('step')).toHaveCount(0);
			await expect(option('sensitivity')).toHaveCount(0);

			await choose('input', 'Relative');
			await expect(option('step')).toHaveCount(1);
			await expect(option('sensitivity')).toHaveCount(1);

			await choose('input', 'Piece');
			await expect(option('step')).toHaveCount(1);
			await expect(option('sensitivity')).toHaveCount(0);

			await choose('input', 'None');

			// The form of the display takes the prefix and the suffix over, and shows them as its placeholders.
			await dialogs.getByText('Display', { exact: true }).first().click();
			await expect(dialogs.locator('.v-notice', { hasText: 'taken from the interface of the field' })).toBeVisible();
			await expect(option('prefix').locator('input')).toHaveAttribute('placeholder', '$');
			await expect(option('suffix').locator('input')).toHaveAttribute('placeholder', ' GB');
			await expect(option('suffix').locator('input')).toHaveValue('');
			await choose('indicatorFormat', 'Percent');
			await expect(option('prefix')).toHaveCount(0);
			await expect(option('suffix')).toHaveCount(0);
			await choose('indicatorFormat', 'Value');
			await option('suffix').locator('input').fill(' MB');

			// Save the field: the words are stored, the texts as they were typed, with their spaces.
			await dialogs.locator('.v-drawer').last().locator('header button').last().click();
			await expect
				.poll(async () => (await api.get(`/fields/${EDIT}/unit`)).meta.options)
				.toEqual({ max: 1, indicatorFormat: 'value', prefix: '$', suffix: ' GB', input: 'none' });
			// The format of the display went back to the one it shows as taken over, which the form does not store.
			expect((await api.get(`/fields/${EDIT}/unit`)).meta.display_options).toEqual({ suffix: ' MB' });

			// The item is drawn by them: the text with both, and a reading where it was a slider.
			await openEdit(page);
			await line(page, 'unit').scrollIntoViewIfNeeded();
			await expect(text(page, 'unit')).toHaveText('$0.5 GB');
			await expect(fieldOf(page, 'unit').getByRole('meter')).toHaveAttribute('aria-valuetext', '$0.5 GB');
			await expect(fieldOf(page, 'unit').getByRole('slider')).toHaveCount(0);
			expect(await listened(page, line(page, 'unit'))).toEqual([]);
		} finally {
			// Put the field back, for the tests which set it.
			await api.patch(`/fields/${EDIT}/unit`, { meta: { options: { max: 1, indicatorFormat: 'value' }, display_options: null } });
		}
	});

	test('the options form of editing: the method, the step, and the sensitivity only for the relative method', async ({ page, api }) => {
		await page.goto(`/admin/settings/data-model/${EDIT}/fives`);

		const { dialogs, option } = optionsDialog(page);

		await dialogs.getByText('Interface', { exact: true }).first().click();

		// Automatic until another is chosen; the step shows the step the Slider left behind; no sensitivity.
		await expect(option('input').locator('input')).toHaveValue('Automatic');
		await expect(option('step').locator('input')).toHaveAttribute('type', 'number');
		await expect(option('step').locator('input')).toHaveAttribute('placeholder', '5');
		await expect(option('step').locator('input')).toHaveValue('');
		await expect(option('sensitivity')).toHaveCount(0);

		await option('input').locator('.v-input').click();
		// The five methods, in plain words, and none of them by a word of the visualizations.
		const methods = page.locator('.v-menu-popper:visible .v-list-item');
		await expect(methods.filter({ hasText: 'Piece' }).last()).toBeVisible();
		expect((await methods.allInnerTexts()).map((item) => item.trim())).toEqual(['Automatic', 'Position', 'Piece', 'Relative', 'None']);
		await page.locator('.v-list-item', { hasText: 'Relative' }).last().click();
		await expect(option('sensitivity').locator('input')).toHaveAttribute('placeholder', '1');
		await option('sensitivity').locator('input').fill('2');
		await option('step').locator('input').fill('10');

		// The display is not edited, and has none of the three.
		await dialogs.getByText('Display', { exact: true }).first().click();
		await expect(option('visualization')).toHaveCount(1);
		for (const name of ['input', 'step', 'sensitivity']) await expect(option(name)).toHaveCount(0);

		await dialogs.locator('.v-drawer').last().locator('header button').last().click();
		await expect
			.poll(async () => (await api.get(`/fields/${EDIT}/fives`)).meta.options)
			.toEqual({ stepInterval: 5, input: 'relative', sensitivity: 2, step: 10 });

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
