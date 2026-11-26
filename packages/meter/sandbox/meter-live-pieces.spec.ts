// Browser tests of the Meter bundle: the pieces of a meter which can be edited. Those up to the pointer drawn
// larger, the pieces which grow and the one which fades in, at rest and during a drag, the colours of the scale while
// the value is dragged, and where the pointer counts dots and bars.
import { expect, test } from '../../../sandbox/support/fixtures.ts';
import {
	AMBER,
	EDIT,
	EDIT_VALUES,
	GREEN,
	GROWN,
	RED,
	RGB,
	blended,
	clickAt,
	edges,
	edited,
	expectColour,
	expectFilledPieces,
	expectLarge,
	fieldOf,
	fill,
	ids,
	key3,
	line,
	listened,
	meter,
	openEdit,
	pixel,
	pixels,
	pointAt,
	readPieces,
	removeAll,
	rgb,
	seedEdit,
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

test.describe('the pieces of a meter which can be edited', () => {
	test.beforeEach(async ({ api, page }) => {
		await api.patch(`/items/${EDIT}/${ids['Edit']}`, EDIT_VALUES);
		await openEdit(page);
		await expect(text(page, 'whole')).toHaveText('40%');
	});

	// Every piece of a row as it is drawn and as it is laid out, with its look, and the row itself. `cut` names the
	// first element around a piece which clips what is outside its box and does not hold the whole piece.
	const drawnRow = (page: Page, name: string) =>
		line(page, name).evaluate((element) => {
			const row = element.getBoundingClientRect();

			return {
				row: [row.left, row.top, row.width, row.height].join(' '),
				area: element.parentElement!.getBoundingClientRect().height,
				swell: element.classList.contains('mt-swell'),
				pieces: Array.from(element.children).map((each) => {
					const part = each as HTMLElement;
					const area = part.getBoundingClientRect();
					const style = getComputedStyle(part);
					const over = part.firstElementChild === null ? null : getComputedStyle(part.firstElementChild);
					let cut = '';

					for (let around = part.parentElement; around !== null && cut === ''; around = around.parentElement) {
						const clips = getComputedStyle(around);
						if (clips.overflowX === 'visible' && clips.overflowY === 'visible') continue;

						const box = around.getBoundingClientRect();
						if (area.left < box.left - 0.01 || area.right > box.right + 0.01 || area.top < box.top - 0.01 || area.bottom > box.bottom + 0.01)
							cut = around.className || around.tagName;
					}

					return {
						left: area.left,
						right: area.right,
						top: area.top,
						bottom: area.bottom,
						width: area.width,
						height: area.height,
						laid: [part.offsetLeft, part.offsetTop, part.offsetWidth, part.offsetHeight].join(' '),
						look: [
							style.backgroundColor,
							style.backgroundImage,
							style.opacity,
							getComputedStyle(part, '::before').content,
							getComputedStyle(part, '::after').content,
							`${style.outlineStyle} ${style.boxShadow} ${style.borderTopWidth}`,
							over === null ? 'nothing over it' : `${over.backgroundColor} ${over.opacity}`,
						].join(' | '),
						transform: part.style.transform,
						filled: part.classList.contains('mt-on'),
						cut,
					};
				}),
			};
		});

	test('the pieces up to the pointer are drawn larger in their own colours, every box in its place: bars and segments higher, pills and dots all round', async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		const trackColour = rgb(await token(page, '--theme--form--field--input--border-color'));
		const primary = rgb(await token(page, '--theme--primary'));
		const paper = rgb(await token(page, '--theme--background'));

		// Forty bars of which twenty are filled, and segments, pills and dots of five of which three are: none of
		// them grows or fades in. The pointer rests on a piece which is not filled and is not the last, so there
		// are filled and unfilled pieces up to it and at least one after it.
		for (const [name, count, over, high, longer] of [
			['ring_bars', 40, 29, 18, 0],
			['ring_segments', 5, 3, 18, 0],
			['five', 5, 3, 16, 2],
			['dots', 5, 3, 14, 2],
		] as const) {
			await line(page, name).scrollIntoViewIfNeeded();
			await page.mouse.move(5, 5);
			await expect(line(page, name)).toHaveClass(/mt-by-piece/);

			const before = await drawnRow(page, name);
			expect(before.pieces, name).toHaveLength(count);
			expect(
				before.pieces.map((piece) => `${piece.height} ${piece.transform}`),
				name,
			).toEqual(before.pieces.map(() => '12 '));
			expect(before.swell, name).toBe(false);

			const target = before.pieces[over]!;
			await page.mouse.move((target.left + target.right) / 2, (target.top + target.bottom) / 2);
			await expectLarge(page, name, over + 1);

			const after = await drawnRow(page, name);
			const large = after.pieces.slice(0, over + 1);

			// Larger than regular, each about its own middle: bars and segments half as high again and as wide as
			// they were, dots a pixel more on every side, pills a pixel more at each end and 2px above and below.
			for (const [index, piece] of large.entries()) {
				const was = before.pieces[index]!;
				expect(piece.height, `${name} ${index}`).toBeCloseTo(high, 1);
				expect(piece.width, `${name} ${index}`).toBeCloseTo(was.width + longer, 1);
				expect(piece.left + piece.right, `${name} ${index}`).toBeCloseTo(was.left + was.right, 1);
				expect(piece.top + piece.bottom, `${name} ${index}`).toBeCloseTo(was.top + was.bottom, 1);
			}

			expect([...new Set(large.map((piece) => piece.transform))], name).toHaveLength(1);
			expect(large.some((piece) => piece.filled) && large.some((piece) => !piece.filled), name).toBe(true);

			// The pieces after the pointer are exactly what they were.
			expect(after.pieces.slice(over + 1), name).toEqual(before.pieces.slice(over + 1));
			expect(after.pieces.length, name).toBeGreaterThan(over + 1);

			// No piece has another colour, and none has anything laid over it or a line around it.
			expect(
				after.pieces.map((piece) => piece.look),
				name,
			).toEqual(before.pieces.map((piece) => piece.look));

			// No box has changed: not that of a piece, not the row and not the area of the meter.
			expect(
				after.pieces.map((piece) => piece.laid),
				name,
			).toEqual(before.pieces.map((piece) => piece.laid));
			expect([after.row, after.area], name).toEqual([before.row, before.area]);

			// Two large pieces side by side do not touch: two pixels of the page show between them.
			for (let index = 1; index <= over; index++) expect(large[index]!.left - large[index - 1]!.right, `${name} ${index}`).toBeGreaterThanOrEqual(1.99);

			// The ends of a large pill are still half circles: its corners, as the transform draws them, are as
			// wide as they are high, half the height of the pill.
			if (name === 'five') {
				const corners = await line(page, name)
					.locator('> *')
					.first()
					.evaluate((pill) => {
						const [across, down] = getComputedStyle(pill).borderTopLeftRadius.split(' ').map(Number.parseFloat);
						const [along, high] = (pill as HTMLElement).style.transform
							.replace(/[^\d.,]/g, '')
							.split(',')
							.map(Number);
						return [across! * along!, (down ?? across)! * high!];
					});
				expect(corners[0]).toBeCloseTo(8, 1);
				expect(corners[1]).toBeCloseTo(8, 1);
			}

			// Nothing around a large piece cuts any of it off.
			expect(after.swell, name).toBe(true);
			expect(
				after.pieces.map((piece) => piece.cut),
				name,
			).toEqual(after.pieces.map(() => ''));

			// And it is on the page: above the box of a bar or a segment up to the pointer there is its colour,
			// that of a filled one and that of one which is not, and above one after the pointer the page.
			if (longer === 0) {
				const above = (piece: { left: number; right: number; top: number }) => pixel(page, (piece.left + piece.right) / 2, piece.top - 2);
				expectColour(await above(before.pieces[0]!), primary);
				expectColour(await above(before.pieces[over]!), trackColour);
				expectColour(await above(before.pieces[over + 1]!), paper);
			}

			// With the pointer gone every piece is what it was, and so is the row.
			await page.mouse.move(5, 5);
			await expectLarge(page, name, 0);
			await expect(line(page, name)).not.toHaveClass(/mt-swell/);
			expect(await drawnRow(page, name), name).toEqual(before);
		}

		await expect(edited(page)).toHaveCount(0);
	});

	test('pieces which grow are large up to the pointer too, and what the value makes them beyond it; the size is eased, but not for less motion', async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });

		// Forty bars for forty with a grow of 2, at 24: the bars which are not filled are a third as high, but
		// for the ramp in front of the fill.
		await line(page, 'near_bars').scrollIntoViewIfNeeded();
		await expect(line(page, 'near_bars')).toHaveClass(/mt-by-piece/);
		await expect(line(page, 'near_bars')).toHaveAttribute('aria-valuenow', '24');
		const before = await drawnRow(page, 'near_bars');
		expect(before.pieces).toHaveLength(40);
		expect(before.pieces.slice(0, 24).map((piece) => piece.height)).toEqual(Array.from({ length: 24 }, () => 12));
		expect(before.pieces.slice(24).every((piece) => piece.height < 12)).toBe(true);
		expect(before.pieces.at(-1)!.height).toBeCloseTo(4, 1);

		const middleOf = (index: number) => ({
			x: (before.pieces[index]!.left + before.pieces[index]!.right) / 2,
			y: (before.pieces[index]!.top + before.pieces[index]!.bottom) / 2,
		});

		// The pointer on the fourteenth bar, inside the fill: fourteen large bars, ten filled ones as they were,
		// and what is not filled as it was.
		await page.mouse.move(middleOf(13).x, middleOf(13).y);
		await expectLarge(page, 'near_bars', 14);
		const inside = await drawnRow(page, 'near_bars');
		expect(inside.pieces.slice(0, 14).map((piece) => Number(piece.height.toFixed(1)))).toEqual(Array.from({ length: 14 }, () => 18));
		expect(inside.pieces.slice(14)).toEqual(before.pieces.slice(14));

		// The pointer on the thirty-second bar, past the fill: the filled bars and the eight after them are all
		// as high as each other, each in the colour it had, and the last eight are small as before.
		await page.mouse.move(middleOf(31).x, middleOf(31).y);
		await expectLarge(page, 'near_bars', 32);
		const past = await drawnRow(page, 'near_bars');
		expect(past.pieces.slice(0, 32).map((piece) => Number(piece.height.toFixed(1)))).toEqual(Array.from({ length: 32 }, () => 18));
		expect([...new Set(past.pieces.slice(0, 32).map((piece) => piece.transform))]).toHaveLength(1);
		expect(past.pieces.slice(32)).toEqual(before.pieces.slice(32));
		expect(past.pieces.map((piece) => piece.look)).toEqual(before.pieces.map((piece) => piece.look));
		expect(past.pieces.map((piece) => piece.width)).toEqual(before.pieces.map((piece) => piece.width));
		expect(past.pieces.map((piece) => piece.cut)).toEqual(past.pieces.map(() => ''));
		expect(past.pieces[23]!.filled && !past.pieces[24]!.filled).toBe(true);

		// Nothing was written by any of it, and with the pointer gone the row is what it was.
		await expect(line(page, 'near_bars')).toHaveAttribute('aria-valuenow', '24');
		await page.mouse.move(5, 5);
		await expectLarge(page, 'near_bars', 0);
		await expect(line(page, 'near_bars')).not.toHaveClass(/mt-swell/);
		expect(await drawnRow(page, 'near_bars')).toEqual(before);

		// Five segments which grow and fade in, at 3.3 of 5: the fourth has the look of a filled one over it at
		// some strength, and still has it, as strong, when all five are large.
		await line(page, 'grow_segments').scrollIntoViewIfNeeded();
		const segments = await drawnRow(page, 'grow_segments');
		expect(segments.pieces[3]!.look).not.toContain('nothing over it');
		const fifth = segments.pieces[4]!;
		await page.mouse.move((fifth.left + fifth.right) / 2, (fifth.top + fifth.bottom) / 2);
		await expectLarge(page, 'grow_segments', 5);
		const all = await drawnRow(page, 'grow_segments');
		expect(all.pieces.map((piece) => Number(piece.height.toFixed(1)))).toEqual([18, 18, 18, 18, 18]);
		expect(all.pieces.map((piece) => piece.look)).toEqual(segments.pieces.map((piece) => piece.look));
		expect(all.pieces.map((piece) => piece.width)).toEqual(segments.pieces.map((piece) => piece.width));
		await page.mouse.move(5, 5);
		await expectLarge(page, 'grow_segments', 0);

		// Less motion was asked for: the size is there at once, with no transition on any piece.
		await page.mouse.move(middleOf(13).x, middleOf(13).y);
		await line(page, 'near_bars').scrollIntoViewIfNeeded();
		const still = (await line(page, 'near_bars').boundingBox())!;
		await page.mouse.move(still.x + 100, still.y + 6);
		await expect(line(page, 'near_bars')).toHaveClass(/mt-swell/);
		expect(
			await line(page, 'near_bars')
				.locator('> *')
				.first()
				.evaluate((piece) => getComputedStyle(piece).transitionDuration),
		).toBe('0s');
		await page.mouse.move(5, 5);
		await expectLarge(page, 'near_bars', 0);

		// With motion the size is eased, on a meter which does not grow its pieces as on one which does: a
		// transition of the transform runs on the pieces when the pointer arrives, when it moves on and when it
		// leaves, and a size which is on its way goes on from where it is.
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		for (const name of ['ring_bars', 'near_bars', 'dots']) {
			await line(page, name).scrollIntoViewIfNeeded();
			await page.mouse.move(5, 5);
			await expect(line(page, name)).not.toHaveClass(/mt-swell/);
			await line(page, name).evaluate((element) => {
				const seen = ((window as unknown as { runs: string[] }).runs = [] as string[]);
				element.addEventListener('transitionrun', (event) => seen.push((event as TransitionEvent).propertyName));
			});
			const runs = () => page.evaluate(() => (window as unknown as { runs: string[] }).runs.length);

			const boxes = (await line(page, name)
				.locator('> *')
				.evaluateAll((all) => all.map((each) => each.getBoundingClientRect().toJSON()))) as {
				left: number;
				right: number;
				top: number;
				bottom: number;
			}[];
			const third = boxes[2]!;
			await page.mouse.move((third.left + third.right) / 2, (third.top + third.bottom) / 2);
			await expect(line(page, name)).toHaveClass(/mt-swell/);
			expect(
				await line(page, name)
					.locator('> *')
					.first()
					.evaluate((piece) => `${getComputedStyle(piece).transitionProperty} ${getComputedStyle(piece).transitionDuration}`),
				name,
			).toBe('transform, border-radius 0.15s, 0.15s');
			await expect.poll(runs, { message: name }).toBe(3);
			await expectLarge(page, name, 3);

			// One piece further: one more transition, and the three which were large stay as they are.
			const fourth = boxes[3]!;
			await page.mouse.move((fourth.left + fourth.right) / 2, (fourth.top + fourth.bottom) / 2);
			await expect.poll(runs, { message: name }).toBe(4);
			await expectLarge(page, name, 4);

			// Away: the four ease back, and after that the row lets nothing reach outside it again.
			await page.mouse.move(5, 5);
			await expect.poll(runs, { message: name }).toBe(8);
			await expectLarge(page, name, 0);
			await expect(line(page, name)).not.toHaveClass(/mt-swell/);
		}

		await expect(edited(page)).toHaveCount(0);
	});

	test('by position the pieces which a press would leave filled are large: of ten pills for a hundred three at 34% and four at 36%, and a click fills as many', async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });

		// Ten pills for a hundred steps: "Automatic" takes the value under the pointer. Four are filled, at 40.
		await line(page, 'hundred').scrollIntoViewIfNeeded();
		await page.mouse.move(5, 5);
		await expect(line(page, 'hundred')).toHaveClass(/mt-by-position/);
		await expectFilledPieces(line(page, 'hundred'), 10, 4);
		const before = await drawnRow(page, 'hundred');
		expect(before.pieces.map((piece) => `${piece.height} ${piece.transform}`)).toEqual(before.pieces.map(() => '12 '));
		expect(before.swell).toBe(false);

		// Two points on the fourth pill, before its middle and after it. A press at the first writes 34, which
		// fills three pills, and one at the second 36, which fills four: so many are large, and not the four up
		// to the pointer both times.
		const fourth = before.pieces[3]!;
		const low = await pointAt(page, 'hundred', 0.34);
		const high = await pointAt(page, 'hundred', 0.36);
		expect(low.x).toBeGreaterThan(fourth.left);
		expect(low.x).toBeLessThan((fourth.left + fourth.right) / 2);
		expect(high.x).toBeGreaterThan((fourth.left + fourth.right) / 2);
		expect(high.x).toBeLessThan(fourth.right);

		await page.mouse.move(low.x, low.y);
		await expectLarge(page, 'hundred', 3);
		const three = await drawnRow(page, 'hundred');

		// As large as with "Piece", about their own middles: a pixel more at each end and 2px above and below.
		for (const [index, piece] of three.pieces.slice(0, 3).entries()) {
			const was = before.pieces[index]!;
			expect(piece.height, `${index}`).toBeCloseTo(16, 1);
			expect(piece.width, `${index}`).toBeCloseTo(was.width + 2, 1);
			expect(piece.left + piece.right, `${index}`).toBeCloseTo(was.left + was.right, 1);
			expect(piece.top + piece.bottom, `${index}`).toBeCloseTo(was.top + was.bottom, 1);
		}

		// The fourth, which is filled and under the pointer, and all after it are exactly what they were. No
		// piece has another colour, no box has changed, and nothing cuts a large piece off.
		expect(three.pieces.slice(3)).toEqual(before.pieces.slice(3));
		expect(three.pieces[3]!.filled).toBe(true);
		expect(three.pieces.map((piece) => piece.look)).toEqual(before.pieces.map((piece) => piece.look));
		expect(three.pieces.map((piece) => piece.laid)).toEqual(before.pieces.map((piece) => piece.laid));
		expect([three.row, three.area]).toEqual([before.row, before.area]);
		expect(three.swell).toBe(true);
		expect(three.pieces.map((piece) => piece.cut)).toEqual(three.pieces.map(() => ''));

		await page.mouse.move(high.x, high.y);
		await expectLarge(page, 'hundred', 4);

		// Past the fill: the four filled pills and four which are not, each in the colour it had.
		const far = await pointAt(page, 'hundred', 0.76);
		await page.mouse.move(far.x, far.y);
		await expectLarge(page, 'hundred', 8);
		const eight = await drawnRow(page, 'hundred');
		expect(eight.pieces.map((piece) => piece.look)).toEqual(before.pieces.map((piece) => piece.look));
		expect(eight.pieces.slice(8)).toEqual(before.pieces.slice(8));

		// Resting wrote nothing.
		await expect(text(page, 'hundred')).toHaveText('40%');
		await expect(edited(page)).toHaveCount(0);

		// A click fills exactly as many as were large, and they stay large under the pointer which is still there.
		await page.mouse.move(low.x, low.y);
		await expectLarge(page, 'hundred', 3);
		await page.mouse.click(low.x, low.y);
		await expect(text(page, 'hundred')).toHaveText('34%');
		await expectFilledPieces(line(page, 'hundred'), 10, 3);
		await expectLarge(page, 'hundred', 3);

		await page.mouse.move(high.x, high.y);
		await expectLarge(page, 'hundred', 4);
		await page.mouse.click(high.x, high.y);
		await expect(text(page, 'hundred')).toHaveText('36%');
		await expectFilledPieces(line(page, 'hundred'), 10, 4);
		await expectLarge(page, 'hundred', 4);

		// The same all along the track: where a press writes less than 5, none is large.
		for (const [share, value, count] of [
			[0.02, 2, 0],
			[0.08, 8, 1],
			[0.5, 50, 5],
			[0.93, 93, 9],
			[0.97, 97, 10],
			[0.66, 66, 7],
		] as const) {
			const point = await pointAt(page, 'hundred', share);
			await page.mouse.move(point.x, point.y);
			await expectLarge(page, 'hundred', count);
			await page.mouse.click(point.x, point.y);
			await expect(text(page, 'hundred'), `${share}`).toHaveText(`${value}%`);
			await expectFilledPieces(line(page, 'hundred'), 10, count);
			await expectLarge(page, 'hundred', count);
		}

		// No piece has another colour than the same piece without the pointer, and with the pointer gone none
		// is large and the row lets nothing reach outside it.
		const under = await drawnRow(page, 'hundred');
		expect(under.pieces.filter((piece) => piece.height > 15)).toHaveLength(7);
		await page.mouse.move(5, 5);
		await expectLarge(page, 'hundred', 0);
		await expect(line(page, 'hundred')).not.toHaveClass(/mt-swell/);
		const gone = await drawnRow(page, 'hundred');
		expect(gone.pieces.map((piece) => `${piece.height} ${piece.transform}`)).toEqual(gone.pieces.map(() => '12 '));
		expect(under.pieces.map((piece) => piece.look)).toEqual(gone.pieces.map((piece) => piece.look));
		expect(under.pieces.map((piece) => piece.laid)).toEqual(gone.pieces.map((piece) => piece.laid));
		expect([under.row, under.area]).toEqual([gone.row, gone.area]);

		// Ten pills which are coloured by their place on the scale, at 45: seven are large at 72%, in the reds,
		// ambers and their paler shades which they had.
		await line(page, 'flow_pills').scrollIntoViewIfNeeded();
		await expect(line(page, 'flow_pills')).toHaveClass(/mt-by-position/);
		const plain = await drawnRow(page, 'flow_pills');
		expect(new Set(plain.pieces.map((piece) => piece.look)).size).toBeGreaterThan(2);
		const shade = await pointAt(page, 'flow_pills', 0.72);
		await page.mouse.move(shade.x, shade.y);
		await expectLarge(page, 'flow_pills', 7);
		expect((await drawnRow(page, 'flow_pills')).pieces.map((piece) => piece.look)).toEqual(plain.pieces.map((piece) => piece.look));
		await page.mouse.move(5, 5);
		await expectLarge(page, 'flow_pills', 0);

		// Five pills for five steps, set by position because the option says so: on the third pill two are large
		// before its middle and three from it on, and on the fifth four and five.
		await line(page, 'placed').scrollIntoViewIfNeeded();
		await expect(line(page, 'placed')).toHaveClass(/mt-by-position/);
		await expectFilledPieces(line(page, 'placed'), 5, 3);
		const placed = await drawnRow(page, 'placed');

		for (const [share, on, count] of [
			[0.45, 2, 2],
			[0.55, 2, 3],
			[0.85, 4, 4],
			[0.95, 4, 5],
			[0.05, 0, 0],
		] as const) {
			const point = await pointAt(page, 'placed', share);
			expect(point.x, `${share}`).toBeGreaterThan(placed.pieces[on]!.left);
			expect(point.x, `${share}`).toBeLessThan(placed.pieces[on]!.right);
			await page.mouse.move(point.x, point.y);
			await expectLarge(page, 'placed', count);
			await page.mouse.click(point.x, point.y);
			await expect(text(page, 'placed'), `${share}`).toHaveText(`${count} / 5`);
			await expectFilledPieces(line(page, 'placed'), 5, count);
			await expectLarge(page, 'placed', count);
		}

		// By how far the pointer moves, a press sets nothing where the pointer is: no piece is large, at rest
		// or in a drag, and the row never lets anything reach outside it.
		const frames = () => page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
		await line(page, 'grow_rel').scrollIntoViewIfNeeded();
		await expect(line(page, 'grow_rel')).toHaveClass(/mt-by-relative/);
		await expect(line(page, 'grow_rel').locator('> *')).toHaveCount(5);
		const rel = await pointAt(page, 'grow_rel', 0.7);
		await page.mouse.move(rel.x, rel.y);
		await frames();
		await expectLarge(page, 'grow_rel', 0);
		await expect(line(page, 'grow_rel')).not.toHaveClass(/mt-swell/);
		await page.mouse.down();
		await page.mouse.move(rel.x + 40, rel.y, { steps: 4 });
		await frames();
		await expect(text(page, 'grow_rel')).not.toHaveText('40%');
		await expectLarge(page, 'grow_rel', 0);
		await expect(line(page, 'grow_rel')).not.toHaveClass(/mt-swell/);
		await page.mouse.up();
		await frames();
		await expectLarge(page, 'grow_rel', 0);
	});

	test('by position the large pieces follow a drag, and are right at once after the release, Escape and a pointer which is taken away', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await line(page, 'hundred').scrollIntoViewIfNeeded();
		await expect(line(page, 'hundred')).toHaveClass(/mt-by-position/);

		const track = (await line(page, 'hundred').boundingBox())!;
		const at = (share: number) => track.x + track.width * share;
		const middle = track.y + track.height / 2;

		// Large and filled are the same pieces all through a drag: what the press and every movement write.
		const both = async (value: number, count: number) => {
			await expect(text(page, 'hundred'), `${value}`).toHaveText(`${value}%`);
			await expectFilledPieces(line(page, 'hundred'), 10, count);
			await expectLarge(page, 'hundred', count);
		};

		await page.mouse.move(at(0.5), middle);
		await expectLarge(page, 'hundred', 5);
		await page.mouse.down();
		await both(50, 5);
		await expect(line(page, 'hundred')).toHaveClass(/mt-swell/);

		// Upwards within one pill, the eighth: 74 fills seven and 76 eight.
		await page.mouse.move(at(0.74), middle, { steps: 4 });
		await both(74, 7);
		await page.mouse.move(at(0.76), middle);
		await both(76, 8);

		// Downwards, with the pointer far below the meter: still by its place along the track, as the fill is.
		await page.mouse.move(at(0.2), middle + 60, { steps: 3 });
		await both(20, 2);

		// Before the start of the track nothing is filled and nothing is large, and beyond its end everything.
		await page.mouse.move(track.x - 30, middle + 60, { steps: 2 });
		await both(0, 0);
		await page.mouse.move(track.x + track.width + 30, middle + 60, { steps: 3 });
		await both(100, 10);
		await page.mouse.move(at(0.3), middle + 60, { steps: 3 });
		await both(30, 3);

		// Released there, away from the meter: the pointer rests on no track, and no piece is large.
		await page.mouse.up();
		await expectLarge(page, 'hundred', 0);
		await expect(text(page, 'hundred')).toHaveText('30%');

		// Released on the track, the large pieces are those of that place at once, without the pointer moving again.
		await page.mouse.move(at(0.9), middle);
		await page.mouse.down();
		await both(90, 9);
		await page.mouse.move(at(0.34), middle, { steps: 3 });
		await both(34, 3);
		await page.mouse.up();
		await both(34, 3);

		// Escape puts the value back, and the large pieces are those which a press at the pointer's place would
		// fill: two, while three are filled again.
		await page.mouse.move(at(0.6), middle);
		await page.mouse.down();
		await both(60, 6);
		await page.mouse.move(at(0.2), middle, { steps: 3 });
		await both(20, 2);
		await page.keyboard.press('Escape');
		await expect(text(page, 'hundred')).toHaveText('34%');
		await expectFilledPieces(line(page, 'hundred'), 10, 3);
		await expectLarge(page, 'hundred', 2);
		await page.mouse.up();
		await expectLarge(page, 'hundred', 2);

		// Escape with the pointer held far below the meter: the pointer rests on no track, and no piece is large.
		await page.mouse.move(at(0.6), middle);
		await page.mouse.down();
		await page.mouse.move(at(0.8), middle + 70, { steps: 2 });
		await both(80, 8);
		await page.keyboard.press('Escape');
		await expect(text(page, 'hundred')).toHaveText('34%');
		await expectLarge(page, 'hundred', 0);
		await page.mouse.up();
		await expectLarge(page, 'hundred', 0);

		// The browser takes the pointer away: the value is back, and the large pieces are those of where the
		// pointer was last seen.
		await page.mouse.move(at(0.8), middle);
		await page.mouse.down();
		await both(80, 8);
		await page.mouse.move(at(0.5), middle, { steps: 3 });
		await both(50, 5);
		await line(page, 'hundred').evaluate((element) => element.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true })));
		await expect(text(page, 'hundred')).toHaveText('34%');
		await expectFilledPieces(line(page, 'hundred'), 10, 3);
		await expectLarge(page, 'hundred', 5);
		await expect(line(page, 'hundred')).not.toHaveClass(/mt-busy/);
		await page.mouse.up();

		// The pointer leaves: none is large, and the row lets nothing reach outside it.
		await page.mouse.move(at(0.5), middle + 80);
		await expectLarge(page, 'hundred', 0);
		await expect(line(page, 'hundred')).not.toHaveClass(/mt-swell/);
		await expect(text(page, 'hundred')).toHaveText('34%');

		// Pieces which grow, set by position: five segments for a hundred in steps of ten, at 40. The filled
		// ones are large through a drag, the next one is as high as the pointer has come towards it, and the rest
		// are small.
		await line(page, 'grow_coarse').scrollIntoViewIfNeeded();
		await expect(line(page, 'grow_coarse')).toHaveClass(/mt-by-position/);
		const coarse = (await line(page, 'grow_coarse').boundingBox())!;
		const heights = async () => (await drawnRow(page, 'grow_coarse')).pieces.map((piece) => Number(piece.height.toFixed(1)));
		expect(await heights()).toEqual([12, 12, 4, 4, 4]);

		// At rest at 47%: a press would write 50, which fills three. The third is large though it is not filled.
		await page.mouse.move(coarse.x + coarse.width * 0.47, coarse.y + 6);
		await expectLarge(page, 'grow_coarse', 3);
		expect(await heights()).toEqual([18, 18, 18, 4, 4]);
		await expectFilledPieces(line(page, 'grow_coarse'), 5, 2);

		await page.mouse.down();
		await expect(text(page, 'grow_coarse')).toHaveText('50%');
		await expectFilledPieces(line(page, 'grow_coarse'), 5, 3);
		await expectLarge(page, 'grow_coarse', 3);

		await page.mouse.move(coarse.x + coarse.width * 0.64, coarse.y + 6, { steps: 4 });
		await expect(text(page, 'grow_coarse')).toHaveText('60%');
		await expectLarge(page, 'grow_coarse', 3);
		const dragged = await heights();
		expect(dragged.slice(0, 3)).toEqual([18, 18, 18]);
		expect(dragged[3]!).toBeGreaterThan(6);
		expect(dragged[3]!).toBeLessThan(8);
		expect(dragged[4]!).toBeCloseTo(4, 1);

		// At 70 the fourth is filled, and large with the others.
		await page.mouse.move(coarse.x + coarse.width * 0.72, coarse.y + 6, { steps: 2 });
		await expect(text(page, 'grow_coarse')).toHaveText('70%');
		await expectLarge(page, 'grow_coarse', 4);
		await page.mouse.up();
		await expectLarge(page, 'grow_coarse', 4);
		await page.mouse.move(5, 5);
		await expectLarge(page, 'grow_coarse', 0);
		expect((await heights()).slice(0, 4)).toEqual([12, 12, 12, 12]);
	});

	test('pieces which grow: those which are not filled are small, the next one is as large as the value has come, and nothing else moves', async ({
		page,
	}) => {
		// Sizes are read as they end up: the transition is looked at further down.
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await expect(text(page, 'grow_dots')).toHaveText('3.3');

		// Each piece as it is laid out, which a size drawn by a transform does not change.
		const laid = async (name: string) =>
			(await readPieces(line(page, name))).map((piece) => ({ ...piece.laid, sized: piece.transform !== '', children: piece.children }));
		const sizes = async (name: string) =>
			(await readPieces(line(page, name))).map((piece) => [Number(piece.width.toFixed(1)), Number(piece.height.toFixed(1))]);
		const key = async (name: string, press: string, times: number, expected: string) => {
			await line(page, name).focus();
			for (let count = 0; count < times; count++) await page.keyboard.press(press);
			await expect(text(page, name)).toHaveText(expected);
		};

		// Dots, 3.3 of 5: three filled at their full 12px, the fourth six tenths of the way from half to full,
		// the fifth at half.
		await line(page, 'grow_dots').scrollIntoViewIfNeeded();
		await expectFilledPieces(line(page, 'grow_dots'), 5, 3);
		expect(await sizes('grow_dots')).toEqual([
			[12, 12],
			[12, 12],
			[12, 12],
			[9.6, 9.6],
			[6, 6],
		]);

		// Each dot is on its place: the middles are 16px apart and on one line, and the boxes are as without it.
		const dots = await readPieces(line(page, 'grow_dots'));
		const plain = await readPieces(line(page, 'dots'));
		for (const [index, dot] of dots.entries()) {
			expect(dot.left + dot.width / 2 - (dots[0]!.left + 6), `dot ${index}`).toBeCloseTo(16 * index, 1);
			expect(dot.top + dot.height / 2 - (dots[0]!.top + 6), `dot ${index}`).toBeCloseTo(0, 1);
		}

		expect((await laid('grow_dots')).map(({ left, width, height }) => [left, width, height])).toEqual(
			(await laid('dots')).map(({ left, width, height }) => [left, width, height]),
		);
		expect((await laid('grow_dots')).map((piece) => piece.sized)).toEqual([false, false, false, true, true]);
		expect(plain.map((dot) => [dot.width, dot.height])).toEqual(Array.from({ length: 5 }, () => [12, 12]));
		const area = await edges(meter(page, 'grow_dots'));
		expect(area.bottom - area.top).toBe(54);

		// At a value which is a whole number of pieces nothing is growing: both unfilled dots are small.
		await key('grow_dots', 'ArrowLeft', 3, '3');
		expect(await sizes('grow_dots')).toEqual([
			[12, 12],
			[12, 12],
			[12, 12],
			[6, 6],
			[6, 6],
		]);

		// Nearer, larger; and at 3.5 the fourth is filled, at full size, and the fifth has not started.
		await key('grow_dots', 'ArrowRight', 2, '3.2');
		expect(await sizes('grow_dots')).toEqual([
			[12, 12],
			[12, 12],
			[12, 12],
			[8.4, 8.4],
			[6, 6],
		]);
		await key('grow_dots', 'ArrowRight', 2, '3.4');
		expect(await sizes('grow_dots')).toEqual([
			[12, 12],
			[12, 12],
			[12, 12],
			[10.8, 10.8],
			[6, 6],
		]);
		await key('grow_dots', 'ArrowRight', 1, '3.5');
		await expectFilledPieces(line(page, 'grow_dots'), 5, 4);
		expect(await sizes('grow_dots')).toEqual([
			[12, 12],
			[12, 12],
			[12, 12],
			[12, 12],
			[6, 6],
		]);
		expect((await laid('grow_dots')).map((piece) => piece.sized)).toEqual([false, false, false, false, true]);

		// Segments keep their width and are a third as high where they are not filled; the next one in between.
		await line(page, 'grow_segments').scrollIntoViewIfNeeded();
		await expectFilledPieces(line(page, 'grow_segments'), 5, 3);
		const segments = await sizes('grow_segments');
		const wide = segments[0]![0]!;
		expect(wide).toBeGreaterThan(50);
		expect(segments).toEqual([
			[wide, 12],
			[wide, 12],
			[wide, 12],
			[wide, 8.8],
			[wide, 4],
		]);
		const drawn = await readPieces(line(page, 'grow_segments'));
		for (const piece of drawn) expect(piece.top + piece.height / 2).toBeCloseTo(drawn[0]!.top + 6, 1);

		// A press on a piece fills up to it, as without it: on the fifth, which is small, in its upper corner,
		// where nothing of it is drawn; then on the second.
		const slots = await laid('grow_segments');
		const strip = (await line(page, 'grow_segments').boundingBox())!;
		await page.mouse.click(strip.x + slots[4]!.left + 3, strip.y + 1);
		await expect(text(page, 'grow_segments')).toHaveText('5');
		await expectFilledPieces(line(page, 'grow_segments'), 5, 5);

		// The pointer rests on the fifth, so all five are large; once it is gone, no piece has a size of its own.
		await expectLarge(page, 'grow_segments', 5);
		await page.mouse.move(5, 5);
		await expect.poll(async () => (await laid('grow_segments')).some((piece) => piece.sized)).toBe(false);
		await page.mouse.click(strip.x + slots[1]!.left + slots[1]!.width / 2, strip.y + 6);
		await expect(text(page, 'grow_segments')).toHaveText('2');
		await page.mouse.move(5, 5);
		await expect(async () =>
			expect(await sizes('grow_segments')).toEqual([
				[wide, 12],
				[wide, 12],
				[wide, 4],
				[wide, 4],
				[wide, 4],
			]),
		).toPass({ timeout: 5000 });
		await page.mouse.click(strip.x + slots[3]!.left + slots[3]!.width - 2, strip.y + 11);
		await expect(text(page, 'grow_segments')).toHaveText('4');

		// The sizes change over 150ms where the user has not asked for less motion, and not at all where they have.
		const motion = (name: string, index: number) =>
			line(page, name)
				.locator('> *')
				.nth(index)
				.evaluate((piece) => `${getComputedStyle(piece).transitionProperty} ${getComputedStyle(piece).transitionDuration}`);
		await expect(line(page, 'grow_dots')).toHaveClass(/mt-eased/);
		expect(await motion('grow_dots', 4)).not.toBe('transform 0.15s');
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		expect(await motion('grow_dots', 4)).toBe('transform 0.15s');
		expect(await motion('grow_dots', 0)).toBe('transform 0.15s');

		// A key eases: from 3.5 to 4.2 the fifth dot starts to grow, and its size is on its way for a moment.
		await line(page, 'grow_dots').evaluate((element) => {
			(window as unknown as { runs: number }).runs = 0;
			element.addEventListener('transitionrun', () => (window as unknown as { runs: number }).runs++);
		});
		const runs = () => page.evaluate(() => (window as unknown as { runs: number }).runs);
		await key('grow_dots', 'ArrowRight', 2, '3.7');
		expect(await runs()).toBe(0);
		await key('grow_dots', 'ArrowRight', 5, '4.2');
		await expect.poll(runs).toBeGreaterThan(0);
		await expect(async () =>
			expect(await sizes('grow_dots')).toEqual([
				[12, 12],
				[12, 12],
				[12, 12],
				[12, 12],
				[8.4, 8.4],
			]),
		).toPass({ timeout: 5000 });

		// While the pointer drags the value the sizes of the pieces which grow follow it at once, without a
		// transition. The value is spread along the row of dots, which is 76px long: five dots and four gaps.
		//
		// The dots which a drag by position fills are large, as by the piece, and while a piece is large the row
		// eases the sizes (`mt-swell`). The pieces which grow are spared that while the pointer drags the value
		// (`mt-tracking`), so the fourth dot follows the pointer at once all the same.
		const track = (await line(page, 'grow_dots').boundingBox())!;
		const along = (share: number) => track.x + 76 * share;
		await page.mouse.move(along(0.5), track.y + 6);
		await page.mouse.down();
		await expect(text(page, 'grow_dots')).toHaveText('2.5');
		await expect(line(page, 'grow_dots')).toHaveClass(/mt-eased/);
		await page.mouse.move(along(0.55), track.y + 6, { steps: 3 });
		await expect(line(page, 'grow_dots')).not.toHaveClass(/mt-eased/);
		expect(await motion('grow_dots', 4), 'a dot which grows has no transition while the pointer drags the value').not.toContain('0.15s');
		await page.mouse.move(along(0.3), track.y + 6, { steps: 5 });
		await page.mouse.move(along(0.66), track.y + 6, { steps: 5 });
		await expect(text(page, 'grow_dots')).toHaveText('3.3');
		expect((await sizes('grow_dots'))[3], 'the dot which grows is at the size of the place of the pointer at once').toEqual([9.6, 9.6]);

		// Where the sizes end up is the place of the pointer all the same: the three dots which the drag has
		// filled large, 14px, a size which is eased in a drag as it is by the piece, and the fourth six tenths
		// of the way from half to full.
		await expect(async () =>
			expect(await sizes('grow_dots')).toEqual([
				[14, 14],
				[14, 14],
				[14, 14],
				[9.6, 9.6],
				[6, 6],
			]),
		).toPass({ timeout: 5000 });
		await page.mouse.up();
		await expect(line(page, 'grow_dots')).toHaveClass(/mt-eased/);

		// A meter without it has no size on any piece and no transition: the elements and styles of plain pieces.
		for (const name of ['five', 'dots', 'ring_segments', 'ring_bars', 'pills_locked']) {
			await expect(line(page, name), name).not.toHaveClass(/mt-eased/);
			const parts = (await readPieces(line(page, name))).map((piece) => piece.markup);
			expect([...new Set(parts)].sort(), name).toEqual(['mt-part mt-on|background-color: var(--theme--primary);|0', 'mt-part||0']);
			expect(await motion(name, 0), name).not.toBe('transform 0.15s');
		}
	});

	test('a form which opens draws its meters with no transition: the first value is there at once, and only a later change is eased', async ({ page }) => {
		// Every transition which starts inside a meter, counted from before the page has anything in it.
		await page.addInitScript(() => {
			const started = ((window as unknown as { started: string[] }).started = [] as string[]);

			document.addEventListener('transitionrun', (event) => {
				const target = event.target instanceof Element ? event.target : null;
				if (target?.closest('.meter')) started.push(`${target.className}: ${event.propertyName}`);
			});
		});
		const started = () => page.evaluate(() => (window as unknown as { started: string[] }).started);

		// The form once more, from nothing, for a user who has not asked the system for less motion.
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await openEdit(page);
		await expect(text(page, 'grow_segments')).toHaveText('3.3');

		// The form drew every meter without a value first and then with its value, which is a change of size for
		// the pieces which grow and of opacity for the one which fades in. Their transitions are switched on by
		// now, and none of them has played.
		const eased = ['grow_dots', 'grow_segments', 'fade_pills', 'grow_bars', 'grow_coarse', 'grow_three', 'grow_four', 'near_bars'];
		for (const name of eased) await expect(line(page, name)).toHaveClass(/mt-eased/);
		expect(await started()).toEqual([]);

		// The same change later is eased: a key takes the segments from 3.3 to 3.4, and the fourth one grows
		// and takes on its colour with a transition each.
		await line(page, 'grow_segments').focus();
		await page.keyboard.press('ArrowRight');
		await expect(text(page, 'grow_segments')).toHaveText('3.4');
		await expect.poll(async () => (await started()).sort()).toEqual(['mt-over: opacity', 'mt-part mt-under: transform']);
	});

	test('the piece which fades in: the look of a filled piece laid over the next one, as much as the value has come, alone or with pieces which grow', async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await expect(text(page, 'fade_pills')).toHaveText('3.3');
		await line(page, 'fade_pills').scrollIntoViewIfNeeded();

		// What lies over each piece: nothing, or the colour and the opacity of what does.
		const overs = (row: Locator) =>
			row.evaluate((element) =>
				Array.from(element.children).map((piece) => {
					const over = piece.firstElementChild;
					if (over === null) return null;

					const style = getComputedStyle(over);
					const [inside, outside] = [over.getBoundingClientRect(), piece.getBoundingClientRect()];
					return {
						color: style.backgroundColor,
						opacity: Number(style.opacity),
						covers:
							Math.abs(inside.left - outside.left) < 0.1 &&
							Math.abs(inside.right - outside.right) < 0.1 &&
							Math.abs(inside.top - outside.top) < 0.1 &&
							Math.abs(inside.bottom - outside.bottom) < 0.1,
						under: piece.classList.contains('mt-under') || piece.classList.contains('md-under'),
						children: piece.children.length,
						round: style.borderTopLeftRadius === getComputedStyle(piece).borderTopLeftRadius,
					};
				}),
			);
		const key = async (name: string, press: string, times: number, expected: string) => {
			await line(page, name).focus();
			for (let count = 0; count < times; count++) await page.keyboard.press(press);
			await expect(text(page, name)).toHaveText(expected);
		};
		const fading = (opacity: number) => ({ color: RGB[GREEN], opacity, covers: true, under: true, children: 1, round: true });

		// Pills, 3.3 of 5: three filled, and over the fourth the green of a filled pill, six tenths of it. The
		// fifth has nothing over it, and neither have the filled ones. The pill under it is still the track.
		await expectFilledPieces(line(page, 'fade_pills'), 5, 3);
		expect(await overs(line(page, 'fade_pills'))).toEqual([null, null, null, fading(0.6), null]);
		const pills = await readPieces(line(page, 'fade_pills'));
		expect(pills[0]!.color).toBe(RGB[GREEN]);
		expect(pills[3]!.color).toBe(pills[4]!.color);
		expect(pills[3]!.color).toBe(await token(page, '--theme--form--field--input--border-color'));
		for (const pill of pills) expect(Math.abs(pill.width - pills[0]!.width)).toBeLessThan(0.1);
		expect((await readPieces(line(page, 'fade_pills'))).some((piece) => piece.transform !== '')).toBe(false);

		// At a whole number of pieces none has; nearer the next, more; and at the moment it is filled the piece
		// is that colour itself, with nothing over it, while the fifth has not started.
		await key('fade_pills', 'ArrowLeft', 3, '3');
		expect(await overs(line(page, 'fade_pills'))).toEqual([null, null, null, null, null]);
		await key('fade_pills', 'ArrowRight', 1, '3.1');
		expect(await overs(line(page, 'fade_pills'))).toEqual([null, null, null, fading(0.2), null]);
		await key('fade_pills', 'ArrowRight', 3, '3.4');
		expect(await overs(line(page, 'fade_pills'))).toEqual([null, null, null, fading(0.8), null]);
		await key('fade_pills', 'ArrowRight', 1, '3.5');
		await expectFilledPieces(line(page, 'fade_pills'), 5, 4);
		expect(await overs(line(page, 'fade_pills'))).toEqual([null, null, null, null, null]);
		expect((await readPieces(line(page, 'fade_pills')))[3]!.color).toBe(RGB[GREEN]);
		await key('fade_pills', 'ArrowRight', 6, '4.1');
		expect(await overs(line(page, 'fade_pills'))).toEqual([null, null, null, null, fading(0.2)]);

		// A press on the piece which is fading in is a press on that piece: what lies over it takes none.
		const fifth = (await line(page, 'fade_pills').locator('> *').nth(4).boundingBox())!;
		await page.mouse.click(fifth.x + fifth.width / 2, fifth.y + fifth.height / 2);
		await expect(text(page, 'fade_pills')).not.toHaveText('4.1');
		await page.mouse.move(5, 5);

		// Together with pieces which grow: the fourth segment is larger than the fifth and has the green over it.
		await line(page, 'grow_segments').scrollIntoViewIfNeeded();
		expect(await overs(line(page, 'grow_segments'))).toEqual([null, null, null, fading(0.6), null]);
		const segments = await readPieces(line(page, 'grow_segments'));
		expect(segments[3]!.height).toBeCloseTo(8.8, 1);
		expect(segments[4]!.height).toBeCloseTo(4, 1);

		// The opacity changes over 150ms where the user has not asked for less motion.
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		const motion = () =>
			line(page, 'grow_segments')
				.locator('.mt-over')
				.evaluate((over) => `${getComputedStyle(over).transitionProperty} ${getComputedStyle(over).transitionDuration}`);
		await expect(line(page, 'grow_segments')).toHaveClass(/mt-eased/);
		expect(await motion()).toBe('opacity 0.15s');
		await page.emulateMedia({ reducedMotion: 'reduce' });
		expect(await motion()).not.toBe('opacity 0.15s');

		// Dots which only grow have nothing over them, and a meter with neither has the elements of plain pieces.
		expect(await overs(line(page, 'grow_dots'))).toEqual([null, null, null, null, null]);
		for (const name of ['five', 'dots', 'ring_segments', 'pills_locked'])
			expect(await overs(line(page, name)), name).toEqual([null, null, null, null, null]);

		// The table of the collection. A display never grows its pieces, whatever its interface does, and fades
		// in the next one where its interface does: the option is the interface's until the display has its own.
		await page.goto(`/admin/content/${EDIT}`);
		await expect(page.locator('table tbody tr.table-row')).toHaveCount(1);
		const shown = (name: string) => page.locator('table tbody tr.table-row').first().locator('.meter-display').nth(GROWN.indexOf(name));
		const rowOf = (name: string) => shown(name).locator('.md-strip');

		for (const name of GROWN) {
			await expect(rowOf(name).locator('> *'), name).toHaveCount(5);
			const parts = await readPieces(rowOf(name));
			expect(
				parts.map((piece) => piece.filled),
				name,
			).toEqual([true, true, true, false, false]);
			expect([...new Set(parts.map((piece) => `${piece.width.toFixed(1)} ${piece.height.toFixed(1)}`))], name).toHaveLength(1);
			expect(
				parts.some((piece) => piece.transform !== ''),
				name,
			).toBe(false);
		}

		expect(await overs(rowOf('fade_pills'))).toEqual([null, null, null, fading(0.6), null]);
		expect(await overs(rowOf('grow_segments'))).toEqual([null, null, null, fading(0.6), null]);
		expect(await overs(rowOf('grow_dots'))).toEqual([null, null, null, null, null]);
		expect(await overs(rowOf('five'))).toEqual([null, null, null, null, null]);
		expect((await readPieces(rowOf('five'))).map((piece) => piece.markup)).toEqual([
			'md-part md-on|background-color: var(--theme--primary);|0',
			'md-part md-on|background-color: var(--theme--primary);|0',
			'md-part md-on|background-color: var(--theme--primary);|0',
			'md-part||0',
			'md-part||0',
		]);
		expect(
			await shown('fade_pills')
				.locator('.md-over')
				.evaluate((over) => getComputedStyle(over).transitionDuration),
		).toBe('0s');
	});

	test('thin bars grow and fade in over a short ramp: at every whole value of a hundred the bars in front of the fill differ in height', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await line(page, 'grow_bars').scrollIntoViewIfNeeded();
		await expect(text(page, 'grow_bars')).toHaveText('40%');

		// Fifty bars in half of the form, the number which is set, one for every two units: no whole value ever
		// lies in the last half of a bar, which is where a pill or a segment grows.
		await expect(line(page, 'grow_bars').locator('> *')).toHaveCount(50);

		const state = () =>
			line(page, 'grow_bars').evaluate((element) => {
				const parts = Array.from(element.children);

				return {
					value: Number(element.getAttribute('aria-valuenow')),
					filled: parts.filter((part) => part.classList.contains('mt-on')).length,
					heights: parts.map((part) => Number(part.getBoundingClientRect().height.toFixed(1))),
					widths: [...new Set(parts.map((part) => (part as HTMLElement).offsetWidth))],
					over: parts.map((part) => (part.firstElementChild === null ? 0 : Number(getComputedStyle(part.firstElementChild).opacity))),
				};
			});

		// At the minimum nothing is under way: fifty small bars.
		await line(page, 'grow_bars').focus();
		await page.keyboard.press('Home');
		await expect(text(page, 'grow_bars')).toHaveText('0%');
		const empty = await state();
		expect(empty.heights).toEqual(Array.from({ length: 50 }, () => 4));
		expect(empty.over).toEqual(Array.from({ length: 50 }, () => 0));

		// Every whole value from 1 to 100, one key at a time.
		for (let value = 1; value <= 100; value++) {
			await page.keyboard.press('ArrowRight');
			await expect(line(page, 'grow_bars')).toHaveAttribute('aria-valuenow', String(value));

			const now = await state();
			const filled = Math.ceil(value / 2);
			expect(now.filled, String(value)).toBe(filled);
			expect(now.heights.slice(0, filled), String(value)).toEqual(Array.from({ length: filled }, () => 12));
			expect(now.widths, String(value)).toEqual(empty.widths);

			// In front of the fill a ramp of two and a half bars' reach, fifteen pixels of bars which are 6px
			// apart: at an even value the next bar is four fifths of the way from small to full and the one
			// after it two fifths; at an odd value, which has just filled a bar, three fifths and one fifth.
			// Everything after that is small. What fades in has the same shares. The ramp comes out of the
			// start of the scale: at 1 a bar is filled and none has started, at 2 the next is two thirds of
			// the way, at 3 half way, and from 4 on it has its whole reach.
			const ahead = now.heights.slice(filled);
			const fading = now.over.slice(filled);
			const ramp = value === 1 ? [] : value === 2 ? [9.3] : value === 3 ? [8] : value % 2 === 0 ? [10.4, 7.2] : [8.8, 5.6];
			const shares = value === 1 ? [] : value === 2 ? [0.6667] : value === 3 ? [0.5] : value % 2 === 0 ? [0.8, 0.4] : [0.6, 0.2];

			expect(ahead.slice(0, ramp.length), String(value)).toEqual(ramp.slice(0, ahead.length));
			expect(ahead.slice(ramp.length), String(value)).toEqual(ahead.slice(ramp.length).map(() => 4));
			expect(fading.slice(0, shares.length), String(value)).toEqual(shares.slice(0, fading.length));
			expect(fading.slice(shares.length), String(value)).toEqual(fading.slice(shares.length).map(() => 0));
			expect(now.over.slice(0, filled), String(value)).toEqual(Array.from({ length: filled }, () => 0));

			// So at every value from 2 on which leaves a bar to fill, a bar is seen between small and full.
			if (filled < 50 && value > 1) {
				expect(ahead[0], String(value)).toBeGreaterThan(4);
				expect(ahead[0], String(value)).toBeLessThan(12);
			}
		}

		// Wide bars, and every other shape, keep the reach of half a piece: five segments at 3 of 5 show nothing
		// under way, where fifty bars at 40 of 100 do.
		await key3(page);
		const segments = await readPieces(line(page, 'grow_segments'));
		expect(segments.map((piece) => Number(piece.height.toFixed(1)))).toEqual([12, 12, 12, 4, 4]);

		// The display in the table fades by the same rule at its own size: fifty bars do not fit its 72px, so it
		// draws as many as do, 24 bars 3px apart, three of which are its reach. 40 is 9.6 of them: ten are
		// filled, and the next three are at 0.7, 0.37 and 0.03.
		await page.goto(`/admin/content/${EDIT}`);
		await expect(page.locator('table tbody tr.table-row')).toHaveCount(1);
		const shown = page.locator('table tbody tr.table-row').first().locator('.meter-display').nth(GROWN.length).locator('.md-strip');
		await expect(shown.locator('> *')).toHaveCount(24);

		const table = (await readPieces(shown)).map((part) => ({ filled: part.filled, height: Number(part.height.toFixed(1)), over: part.over?.opacity ?? 0 }));
		expect(table.filter((part) => part.filled)).toHaveLength(10);
		expect([...new Set(table.map((part) => part.height))]).toHaveLength(1);
		expect(table.map((part) => part.over)).toEqual([...Array.from({ length: 10 }, () => 0), 0.7, 0.3667, 0.0333, ...Array.from({ length: 11 }, () => 0)]);
	});

	test('while the pointer drags the value, pieces grow and fade in by where the pointer is, not by the steps of the value', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await line(page, 'grow_coarse').scrollIntoViewIfNeeded();
		await expect(text(page, 'grow_coarse')).toHaveText('40%');
		await expect(line(page, 'grow_coarse')).toHaveClass(/mt-by-position/);

		// The third of five segments, the one after the two which 40 fills: how high it is drawn, how much of
		// the look of a filled one lies over it, and whether its size is a transform and nothing else.
		const third = (name: string) =>
			line(page, name)
				.locator('> *')
				.nth(2)
				.evaluate((piece) => ({
					height: piece.getBoundingClientRect().height,
					laid: (piece as HTMLElement).offsetHeight,
					over: piece.firstElementChild === null ? 0 : Number(getComputedStyle(piece.firstElementChild).opacity),
					filled: piece.classList.contains('mt-on'),
					transform: (piece as HTMLElement).style.transform,
				}));

		// Every change of the text, which is the value as it is written.
		await text(page, 'grow_coarse').evaluate((element) => {
			const said = ((window as unknown as { said: string[] }).said = [] as string[]);
			new MutationObserver(() => said.push((element.textContent ?? '').trim())).observe(element, { subtree: true, childList: true, characterData: true });
		});
		const said = () => page.evaluate(() => (window as unknown as { said: string[] }).said);

		// At rest, at 40: two segments filled, and nothing under way.
		expect((await third('grow_coarse')).height).toBeCloseTo(4, 1);

		// A step is a tenth of the track. From 40.5% to 44.5% of it the value stays 40, the nearest step, and
		// the pointer comes nearer and nearer to where the third segment is filled.
		const track = (await line(page, 'grow_coarse').boundingBox())!;
		const at = (share: number) => track.x + track.width * share;
		await page.mouse.move(at(0.405), track.y + 6);
		await page.mouse.down();

		const seen: Awaited<ReturnType<typeof third>>[] = [];
		for (let share = 0.405; share <= 0.4451; share += 0.002) {
			await page.mouse.move(at(share), track.y + 6);
			seen.push(await third('grow_coarse'));
		}

		// The value never left 40: nothing was written, and the segment is not filled.
		await expect(text(page, 'grow_coarse')).toHaveText('40%');
		expect(await said()).toEqual([]);
		expect(seen.every((piece) => !piece.filled)).toBe(true);

		// But the segment grew all the way with the pointer: a different height at every position, never a
		// smaller one, from just above small to nearly half way, and what lies over it shows more and more.
		const heights = seen.map((piece) => Number(piece.height.toFixed(2)));
		expect(new Set(heights).size, heights.join(' ')).toBeGreaterThan(15);
		for (let index = 1; index < heights.length; index++) expect(heights[index]!, heights.join(' ')).toBeGreaterThanOrEqual(heights[index - 1]!);
		expect(heights[0]!).toBeGreaterThan(4);
		expect(heights[0]!).toBeLessThan(5);
		expect(heights.at(-1)!).toBeGreaterThan(7);
		expect(heights.at(-1)!).toBeLessThan(8);

		const overs = seen.map((piece) => piece.over);
		expect(new Set(overs).size).toBeGreaterThan(15);
		for (let index = 1; index < overs.length; index++) expect(overs[index]!).toBeGreaterThanOrEqual(overs[index - 1]!);

		// The size is a transform with fractions, on a box which stays 12px high.
		expect(
			seen.every((piece) => piece.laid === 12 && /^scale\(1, 0\.\d+\)$/.test(piece.transform)),
			seen.map((piece) => piece.transform).join(' '),
		).toBe(true);

		// At the release the size is that of the stored value, 40, where nothing is under way: with reduced
		// motion at once, without waiting.
		await page.mouse.up();
		const settled = await third('grow_coarse');
		expect(settled.height).toBeCloseTo(4, 1);
		expect(settled.over).toBe(0);
		await expect(text(page, 'grow_coarse')).toHaveText('40%');

		// Past the middle between two steps the value is 50, which fills the third segment; from there the
		// fourth is the one the pointer is on its way to.
		await page.mouse.move(at(0.44), track.y + 6);
		await page.mouse.down();
		await page.mouse.move(at(0.46), track.y + 6);
		await expect(text(page, 'grow_coarse')).toHaveText('50%');
		expect((await third('grow_coarse')).filled).toBe(true);
		await page.mouse.move(at(0.64), track.y + 6, { steps: 4 });
		await expect(text(page, 'grow_coarse')).toHaveText('60%');
		const fourth = (await readPieces(line(page, 'grow_coarse')))[3]!;
		expect(fourth.filled).toBe(false);
		expect(fourth.height).toBeGreaterThan(6);
		expect(fourth.height).toBeLessThan(8);

		// Escape puts the value back. The pointer still rests at 64% of the track, where a press would fill three
		// segments, so those are large, the third among them though it is not filled again; with the pointer
		// gone the sizes are those of the value.
		await page.keyboard.press('Escape');
		await expect(text(page, 'grow_coarse')).toHaveText('40%');
		await expectLarge(page, 'grow_coarse', 3);
		expect((await third('grow_coarse')).filled).toBe(false);
		await page.mouse.up();
		await expectLarge(page, 'grow_coarse', 3);
		await page.mouse.move(5, 5);
		await expectLarge(page, 'grow_coarse', 0);
		expect((await third('grow_coarse')).height).toBeCloseTo(4, 1);

		// The same for the method which goes by how far the pointer moves: 4% of the width to the right is 4 of
		// a hundred, which is not yet a step, and the third segment has grown by it.
		await line(page, 'grow_rel').scrollIntoViewIfNeeded();
		const rel = (await line(page, 'grow_rel').boundingBox())!;
		await page.mouse.move(rel.x + rel.width * 0.8, rel.y + 6);
		await page.mouse.down();
		expect((await third('grow_rel')).height).toBeCloseTo(4, 1);

		const moved: number[] = [];
		for (let step = 1; step <= 14; step++) {
			await page.mouse.move(rel.x + rel.width * 0.8 + step, rel.y + 6);
			moved.push(Number((await third('grow_rel')).height.toFixed(2)));
		}

		await expect(text(page, 'grow_rel')).toHaveText('40%');
		expect(new Set(moved).size, moved.join(' ')).toBeGreaterThan(10);
		for (let index = 1; index < moved.length; index++) expect(moved[index]!).toBeGreaterThanOrEqual(moved[index - 1]!);
		await page.mouse.up();
		expect((await third('grow_rel')).height).toBeCloseTo(4, 1);

		// With motion: at the release the size eases back to that of the stored value, and ends there.
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await line(page, 'grow_coarse').scrollIntoViewIfNeeded();
		const again = (await line(page, 'grow_coarse').boundingBox())!;
		await page.mouse.move(again.x + again.width * 0.405, again.y + 6);
		await page.mouse.down();
		await page.mouse.move(again.x + again.width * 0.445, again.y + 6, { steps: 5 });
		await expect(line(page, 'grow_coarse')).not.toHaveClass(/mt-eased/);

		// The two filled segments are large in the drag. The third, which grows, follows the pointer at once all
		// the same (`mt-tracking`); the check is repeated only until the frame is drawn.
		await expect(async () => expect((await third('grow_coarse')).height).toBeGreaterThan(7)).toPass({ timeout: 5000 });
		await line(page, 'grow_coarse').evaluate((element) => {
			(window as unknown as { runs: number }).runs = 0;
			element.addEventListener('transitionrun', () => (window as unknown as { runs: number }).runs++);
		});
		await page.mouse.up();
		await expect(line(page, 'grow_coarse')).toHaveClass(/mt-eased/);
		await expect.poll(() => page.evaluate(() => (window as unknown as { runs: number }).runs)).toBeGreaterThan(0);
		await expect(async () => expect((await third('grow_coarse')).height).toBeCloseTo(4, 1)).toPass({ timeout: 5000 });

		// A change which comes while a size is still easing goes on from where the size is: two keys shortly
		// after one another, and the size never steps back.
		await line(page, 'grow_dots').scrollIntoViewIfNeeded();
		const scaleOf = () =>
			line(page, 'grow_dots')
				.locator('> *')
				.nth(3)
				.evaluate((piece) => {
					const matrix = getComputedStyle(piece).transform;
					return matrix === 'none' ? 1 : Number(matrix.slice(7).split(',')[0]);
				});
		await line(page, 'grow_dots').focus();
		const first = await scaleOf();
		expect(first).toBeCloseTo(0.8, 2);
		await page.keyboard.press('ArrowRight');
		const second = await scaleOf();
		await page.keyboard.press('ArrowRight');
		const third3 = await scaleOf();
		expect(second).toBeGreaterThanOrEqual(first - 0.001);
		expect(third3).toBeGreaterThanOrEqual(second - 0.001);
		expect(third3).toBeLessThanOrEqual(1);
		await expect.poll(scaleOf).toBe(1);
		await expect(text(page, 'grow_dots')).toHaveText('3.5');
	});

	test('grow is a number of pieces which can be growing at once: a ramp of two at a whole value with 3, and none with 1', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		const sizes = async (name: string) => (await readPieces(line(page, name))).map((piece) => Number(piece.width.toFixed(1)));
		const key = async (name: string, press: string, times: number, expected: string) => {
			await line(page, name).focus();
			for (let count = 0; count < times; count++) await page.keyboard.press(press);
			await expect(text(page, name)).toHaveText(expected);
		};

		// Eight dots with 3, at exactly 3 of 8: three filled, and of the five which are not, the next two are
		// larger than the ones after them, the nearer the larger. The rest are small.
		await line(page, 'grow_three').scrollIntoViewIfNeeded();
		await expect(text(page, 'grow_three')).toHaveText('3');
		await expectFilledPieces(line(page, 'grow_three'), 8, 3);
		expect(await sizes('grow_three')).toEqual([12, 12, 12, 10.8, 8.4, 6, 6, 6]);

		// Close before the fourth is filled a third dot has started: a ramp of three.
		await key('grow_three', 'ArrowRight', 4, '3.4');
		expect(await sizes('grow_three')).toEqual([12, 12, 12, 11.8, 9.4, 7, 6, 6]);

		// And once it is filled, the ramp has moved on by a dot.
		await key('grow_three', 'ArrowRight', 1, '3.5');
		await expectFilledPieces(line(page, 'grow_three'), 8, 4);
		expect(await sizes('grow_three')).toEqual([12, 12, 12, 12, 9.6, 7.2, 6, 6]);

		// The boxes are those of dots which do not grow: a dot every 12px and its gap, on one line.
		const laid = (await readPieces(line(page, 'grow_three'))).map((piece) => `${piece.laid.width}x${piece.laid.height}`);
		expect([...new Set(laid)]).toEqual(['12x12']);

		// With 1, at a whole value, every dot which is not filled is small; on its way to the next, that one grows.
		await line(page, 'grow_dots').scrollIntoViewIfNeeded();
		await key('grow_dots', 'ArrowLeft', 3, '3');
		expect(await sizes('grow_dots')).toEqual([12, 12, 12, 6, 6]);
		await key('grow_dots', 'ArrowRight', 3, '3.3');
		expect(await sizes('grow_dots')).toEqual([12, 12, 12, 9.6, 6]);

		// A meter without it has no size on any piece.
		expect(await sizes('dots')).toEqual([12, 12, 12, 12, 12]);
	});

	test('the ramp of pieces which grow comes out of the start of the scale as it runs into its end: step by step, and an empty meter is empty', async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await line(page, 'grow_four').scrollIntoViewIfNeeded();
		await expect(text(page, 'grow_four')).toHaveText('40%');
		await expect(line(page, 'grow_four').locator('> *')).toHaveCount(50);

		// The heights of the fifty bars, and how many of them are higher than a bar which has not started (4px).
		const heights = async () => (await readPieces(line(page, 'grow_four'))).map((piece) => Number(piece.height.toFixed(1)));
		const larger = async () => (await heights()).filter((height) => height > 4.05).length;
		const at = async (key: string, value: number) => {
			await page.keyboard.press(key);
			await expect(line(page, 'grow_four')).toHaveAttribute('aria-valuenow', String(value));
		};

		// Well away from the start the ramp has its full reach, sixty pixels of bars which are 6px apart: twenty
		// bars filled, and ten more on their way, each lower than the one before it.
		const full = await heights();
		expect(full.slice(0, 20)).toEqual(Array.from({ length: 20 }, () => 12));
		const ramp = full.slice(20).filter((height) => height > 4.05);
		expect(ramp).toHaveLength(10);
		for (let index = 1; index < ramp.length; index++) expect(ramp[index]!).toBeLessThan(ramp[index - 1]!);

		// At the minimum the meter is empty: fifty small bars.
		await line(page, 'grow_four').focus();
		await at('Home', 0);
		expect(await heights()).toEqual(Array.from({ length: 50 }, () => 4));

		// One value after the other from there: each adds one bar to those which are larger than small, filled or
		// on its way. The ramp comes out of the start; it is not there in full at the first value.
		const rising: number[] = [await larger()];
		for (let value = 1; value <= 8; value++) {
			await at('ArrowRight', value);
			rising.push(await larger());

			// What is in front of the fill never rises again further on.
			const now = await heights();
			const filled = Math.ceil(value / 2);
			expect(now.slice(0, filled), String(value)).toEqual(Array.from({ length: filled }, () => 12));
			for (let index = filled + 1; index < 50; index++) expect(now[index]!, `${value}: bar ${index}`).toBeLessThanOrEqual(now[index - 1]!);
		}

		expect(rising).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);

		// The heights on the way, at 8 of a hundred: four bars filled, and four as far along as the reach which has
		// come out of the start by then, four and a half bars, gives them.
		expect((await heights()).slice(0, 9)).toEqual([12, 12, 12, 12, 11.1, 9.3, 7.6, 5.8, 4]);

		// And back down the same way: step by step, never to nothing before the minimum.
		const falling: number[] = [];
		for (let value = 7; value >= 0; value--) {
			await at('ArrowLeft', value);
			falling.push(await larger());
		}

		expect(falling).toEqual([7, 6, 5, 4, 3, 2, 1, 0]);

		// Towards the end it runs out as it did: at 98 the last bar is on its way, at 100 all are full.
		await at('End', 100);
		expect(await heights()).toEqual(Array.from({ length: 50 }, () => 12));
		await at('ArrowLeft', 99);
		await at('ArrowLeft', 98);
		const last = await heights();
		expect(last.slice(0, 49)).toEqual(Array.from({ length: 49 }, () => 12));
		expect(last[49]!).toBeGreaterThan(4);
		expect(last[49]!).toBeLessThan(12);
	});

	test('a meter in pieces which can be edited is drawn as the same meter which cannot', async ({ page }) => {
		// Every box of the meter and every one of its pieces, measured against its own field in one go.
		const boxes = (name: string) =>
			fieldOf(page, name).evaluate((element) => {
				const origin = element.getBoundingClientRect();
				const parts = Array.from(element.querySelectorAll('.meter, .meter > :first-child, .mt-part, .mt-line, .mt-caption, .mt-text, .type-note'));

				return parts.map((part) => {
					const area = part.getBoundingClientRect();
					const style = getComputedStyle(part);
					return [
						part.className.split(' ')[0],
						area.left - origin.left,
						area.top - origin.top,
						area.width,
						area.height,
						style.backgroundColor,
						style.borderRadius,
						style.opacity,
					].join(' ');
				});
			});

		for (const kind of ['pills', 'dots']) {
			const live = await boxes(`${kind}_live`);
			const locked = await boxes(`${kind}_locked`);

			// Five pieces, the line under them and the note: eleven boxes, each in the same place with the same look.
			expect(live.length, kind).toBe(11);
			expect(live, kind).toEqual(locked);

			// One is a slider which listens, the other a meter which does not.
			await expect(line(page, `${kind}_live`)).toHaveAttribute('role', 'slider');
			await expect(line(page, `${kind}_live`)).toHaveClass(/mt-live/);
			await expect(line(page, `${kind}_locked`)).toHaveAttribute('role', 'meter');
			expect(await line(page, `${kind}_locked`).getAttribute('class')).toBe(kind === 'pills' ? 'mt-strip mt-pills' : 'mt-strip mt-dots');
			expect(await listened(page, line(page, `${kind}_locked`))).toEqual([]);
			expect((await edges(meter(page, `${kind}_live`))).bottom - (await edges(meter(page, `${kind}_live`))).top).toBe(54);

			// Under the pointer the first piece is drawn larger, about its middle, and nothing else of the meter
			// moves; with the pointer gone and the focus of the keyboard on it, nothing at all.
			await line(page, `${kind}_live`).scrollIntoViewIfNeeded();
			const first = (await line(page, `${kind}_live`).locator('> *').first().boundingBox())!;
			const over = { x: first.x + first.width / 2, y: first.y + first.height / 2 };
			await page.mouse.move(over.x, over.y);
			await expectLarge(page, `${kind}_live`, 1);
			const places = (all: string[]) => all.map((box) => box.split(' ').slice(0, 5).join(' '));
			const under = places(await boxes(`${kind}_live`));
			const piece = under.findIndex((box) => box.startsWith('mt-part '));
			expect(under.filter((_, index) => index !== piece)).toEqual(places(locked).filter((_, index) => index !== piece));
			await page.mouse.move(over.x, over.y + 100);
			await line(page, `${kind}_live`).focus();
			await expect(async () => expect(await boxes(`${kind}_live`)).toEqual(locked)).toPass({ timeout: 5000 });

			// A click on the read-only one changes nothing, one on the other does.
			await clickAt(page, `${kind}_locked`, 0.05);
			await expect(text(page, `${kind}_locked`)).toHaveText('60%');
		}

		await expect(edited(page)).toHaveCount(0);
	});

	test('while the value is dragged a place on the scale keeps its colour, and the place where a colour ends does not move', async ({ page }) => {
		const distance = (one: number[], other: number[]) => Math.max(...one.map((channel, index) => Math.abs(channel - other[index]!)));

		// A drag from 36 to 100 through eleven values, on each of the four meters: the two sides of 40 and of 80,
		// where a colour of the scale ends, the values at which the fill is first well past such a place, and some
		// between. At each one row of pixels across the track is read, through the middle of the track. Every
		// value of the hundred would say the same of the same places, in four times as long.
		const VALUES = [36, 40, 41, 45, 60, 79, 80, 81, 85, 90, 100];

		const rows = async (name: string) => {
			const first = VALUES[0]! / 100;
			const start = await pointAt(page, name, first);
			const seen: { value: number; row: number[][] }[] = [];

			// The length along which the value is spread: the track, and for bars the row of bars as it is drawn,
			// which ends a little before the track does.
			const left = start.x - start.width * first;
			const span = await line(page, name).evaluate((element) => {
				const last = element.classList.contains('mt-bars') ? element.lastElementChild : null;
				return (last ?? element).getBoundingClientRect().right - element.getBoundingClientRect().left;
			});

			await page.mouse.move(left + span * first, start.y);

			// In pieces, those which the press would fill are large under the pointer: from before the press, and
			// more of them as the drag fills more. That size is eased, and it is no change of a colour: a large
			// pill is a pixel longer at each end, and while the size of any piece is on its way the browser may
			// draw the bars beside it one step of a channel off. So a row of pieces is read once the sizes rest.
			const cut = await line(page, name).evaluate((element) => element.classList.contains('mt-strip'));
			const rested = () =>
				line(page, name).evaluate(async (element) => {
					await Promise.all(element.getAnimations({ subtree: true }).map((each) => each.finished.catch(() => undefined)));
					await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
				});

			if (cut) {
				await expect(line(page, name)).toHaveClass(/mt-swell/);
				await rested();
			}

			await page.mouse.down();

			for (const value of VALUES) {
				await page.mouse.move(left + (span * value) / 100, start.y);
				await expect(text(page, name)).toHaveText(`${value}%`);
				if (cut) await rested();
				seen.push({ value, row: await pixels(page, left, start.y, start.width) });
			}

			await page.mouse.up();

			// The rows read while the fill was well past a place: the end of the fill of the one bar is round and
			// has the handle on it, so a place counts once the fill is 16px past it.
			const past = (place: number) => seen.filter((each) => (each.value / 100 - place) * start.width >= 16);

			return { seen, past, width: start.width };
		};

		// Nothing about the colours is animated: no transition and no animation on the track, the fill or a piece.
		for (const target of [
			line(page, 'flow_steps'),
			fill(page, 'flow_steps'),
			line(page, 'flow_pills').locator('> *').first(),
			line(page, 'flow_bars').locator('> *').first(),
		]) {
			expect(await target.evaluate((element) => [getComputedStyle(element).transitionDuration, getComputedStyle(element).animationName])).toEqual([
				'0s',
				'none',
			]);
		}

		// The size of the pieces up to the pointer is eased, which other tests look at. Here it would only be
		// waited for at every value, so the user of this test has asked for less motion.
		await page.emulateMedia({ reducedMotion: 'reduce' });

		// One bar in steps: red ends at 40% of the track and amber at 80%, at the same pixel whatever the value:
		// from 45 and from 85, the first values at which the fill is well past those places.
		const steps = await rows('flow_steps');
		const ends = (row: number[][], from: string, to: string) => row.findIndex((colour) => distance(colour, rgb(to)) < distance(colour, rgb(from)));

		const red = steps.past(0.4).map((each) => ends(each.row, RED, AMBER));
		const amber = steps.past(0.8).map((each) => ends(each.row.slice(Math.round(steps.width * 0.5)), AMBER, GREEN));
		expect(red).toHaveLength(8);
		expect(amber).toHaveLength(3);
		expect([...new Set(red)]).toEqual([Math.round(steps.width * 0.4)]);
		expect([...new Set(amber)]).toEqual([Math.round(steps.width * 0.8) - Math.round(steps.width * 0.5)]);

		// The colour at each of five fixed places, in every row read while the fill was well past the place: all
		// eleven rows for the first four, and the eight from 45 for the last. It does not change at all.
		const places = [0.03, 0.1, 0.2, 0.3, 0.39];
		const kept = (read: Awaited<ReturnType<typeof rows>>) =>
			places.map((place) => {
				const colours = read.past(place).map((each) => each.row[Math.round(read.width * place)]!.join(' '));
				return { place, rows: colours.length, colours: [...new Set(colours)].length };
			});
		const one = [11, 11, 11, 11, 8].map((count, index) => ({ place: places[index], rows: count, colours: 1 }));

		// One bar which blends, and the one in steps.
		const blend = await rows('flow_gradient');
		expect(kept(blend)).toEqual(one);
		expect(kept(steps)).toEqual(one);

		// And they are the colours of those places.
		for (const place of places) expectColour(blend.seen.at(-1)!.row[Math.round(blend.width * place)]!, blended(place), 6);

		// In pieces, steps and blended: the same.
		for (const name of ['flow_pills', 'flow_bars']) expect(kept(await rows(name)), name).toEqual(one);

		await expect(edited(page)).toHaveCount(4);
	});

	test('packed dots for a hundred: a press on the last dot gives the maximum, and so does one in what is left of the track', async ({ page }) => {
		await line(page, 'near_dots').scrollIntoViewIfNeeded();
		await expect(line(page, 'near_dots')).toHaveClass(/mt-by-piece/);
		await expect(text(page, 'near_dots')).toHaveText('40%');

		// 21 dots in the 342px of the track, which is all that fit: 332px, and 10px left at the end.
		const track = (await line(page, 'near_dots').boundingBox())!;
		const dots = await readPieces(line(page, 'near_dots'));
		expect(track.width).toBe(342);
		expect(dots).toHaveLength(21);
		expect(track.x + track.width - dots.at(-1)!.right).toBe(10);
		await expectFilledPieces(line(page, 'near_dots'), 21, 8);

		const middle = (index: number) => ({ x: dots[index]!.left + 6, y: dots[index]!.top + 6 });

		// The last dot is the maximum, and all 21 are filled.
		await page.mouse.click(middle(20).x, middle(20).y);
		await expect(line(page, 'near_dots')).toHaveAttribute('aria-valuenow', '100');
		await expectFilledPieces(line(page, 'near_dots'), 21, 21);

		// The first dot fills one, the eleventh eleven: the values nearest to those shares of a hundred.
		await page.mouse.click(middle(0).x, middle(0).y);
		await expect(line(page, 'near_dots')).toHaveAttribute('aria-valuenow', '5');
		await expectFilledPieces(line(page, 'near_dots'), 21, 1);
		await page.mouse.click(middle(10).x, middle(10).y);
		await expect(line(page, 'near_dots')).toHaveAttribute('aria-valuenow', '52');
		await expectFilledPieces(line(page, 'near_dots'), 21, 11);

		// What is left of the track after the last dot is past the end: the maximum again. And the pieces up
		// to the pointer there are all of them.
		await page.mouse.click(track.x + track.width - 3, track.y + 6);
		await expect(line(page, 'near_dots')).toHaveAttribute('aria-valuenow', '100');
		await expectLarge(page, 'near_dots', 21);
		await page.mouse.move(5, 5);
		await expectLarge(page, 'near_dots', 0);
	});

	test('spread dots for a hundred are as many as packed ones, 21 and not the twenty which divide a hundred, and a press on the last gives the maximum', async ({
		page,
	}) => {
		await line(page, 'near_spread').scrollIntoViewIfNeeded();
		await expect(line(page, 'near_spread')).toHaveClass(/mt-spread/);
		await expect(line(page, 'near_spread')).toHaveClass(/mt-by-piece/);
		await expect(text(page, 'near_spread')).toHaveText('40%');

		// The same number as the packed dots of the field before it, in the same width.
		const track = (await line(page, 'near_spread').boundingBox())!;
		const spread = await readPieces(line(page, 'near_spread'));
		const packed = await readPieces(line(page, 'near_dots'));
		expect(track.width).toBe(342);
		expect(spread).toHaveLength(21);
		expect(spread.length).toBe(packed.length);
		expect(100 % spread.length).not.toBe(0);
		await expectFilledPieces(line(page, 'near_spread'), 21, 8);

		// Where they stand is what differs: the first at the start edge, the last at the end edge, and the gaps
		// between them laid out alike, 4.5px, wider than the 4px of packed dots.
		expect([...new Set(spread.map((dot) => `${dot.width} ${dot.height}`))]).toEqual(['12 12']);
		expect(spread[0]!.left).toBeCloseTo(track.x, 1);
		expect(spread.at(-1)!.right).toBeCloseTo(track.x + track.width, 1);
		const gaps = spread.slice(1).map((dot, index) => dot.left - spread[index]!.right);
		expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(0.01);
		expect(gaps[0]!).toBeCloseTo((342 - 21 * 12) / 20, 2);
		expect(gaps[0]!).toBeGreaterThan(4);
		expect(packed.at(-1)!.right - packed[0]!.left).toBeCloseTo(332, 1);
		expect(spread.at(-1)!.right - spread[0]!.left).toBeCloseTo(342, 1);

		// By the piece: the last dot is the maximum, the first fills one and the eleventh eleven, as packed.
		const middle = (index: number) => ({ x: spread[index]!.left + 6, y: spread[index]!.top + 6 });
		await page.mouse.click(middle(20).x, middle(20).y);
		await expect(line(page, 'near_spread')).toHaveAttribute('aria-valuenow', '100');
		await expectFilledPieces(line(page, 'near_spread'), 21, 21);
		await expectLarge(page, 'near_spread', 21);
		await page.mouse.click(middle(0).x, middle(0).y);
		await expect(line(page, 'near_spread')).toHaveAttribute('aria-valuenow', '5');
		await expectFilledPieces(line(page, 'near_spread'), 21, 1);
		await page.mouse.click(middle(10).x, middle(10).y);
		await expect(line(page, 'near_spread')).toHaveAttribute('aria-valuenow', '52');
		await expectFilledPieces(line(page, 'near_spread'), 21, 11);
		await page.mouse.move(5, 5);
		await expectLarge(page, 'near_spread', 0);
	});

	test('bars in a right-to-left page: the row starts at the right, what is left of the track is at the left, and the pointer goes by the bars', async ({
		page,
	}) => {
		await turn(page, 'rtl');
		await expect(meter(page, 'ring_bars')).toHaveCSS('direction', 'rtl');

		// Where the bars of a row are, in the order of the document: the first one is the one at the start.
		const barsOf = (name: string) =>
			line(page, name).evaluate((element) => {
				const track = element.getBoundingClientRect();
				return {
					left: track.left,
					right: track.right,
					y: track.top + track.height / 2,
					bars: Array.from(element.children).map((bar) => {
						const box = bar.getBoundingClientRect();
						return { left: box.left, right: box.right };
					}),
				};
			});

		// Filled by the piece: forty bars for forty, each 6px wide and 2px from the next, 318px of the 342px.
		await line(page, 'ring_bars').scrollIntoViewIfNeeded();
		await expect(line(page, 'ring_bars')).toHaveClass(/mt-by-piece/);
		await expect(line(page, 'ring_bars')).toHaveAttribute('aria-valuenow', '20');
		const forty = await barsOf('ring_bars');
		expect(forty.bars).toHaveLength(40);
		expect(forty.right - forty.left).toBe(342);

		// The first bar ends at the right edge of the track, each next one is to the left of the one before it,
		// and the 24px which the row is shorter than the track are empty at the left.
		expect(forty.bars[0]!.right).toBeCloseTo(forty.right, 3);
		for (const [index, bar] of forty.bars.entries()) {
			expect(bar.right - bar.left, `bar ${index}`).toBeCloseTo(6, 3);
			expect(forty.right - bar.right, `bar ${index}`).toBeCloseTo(index * 8, 3);
		}
		expect(forty.bars.at(-1)!.left - forty.left).toBeCloseTo(24, 3);

		const middle = (bar: { left: number; right: number }) => (bar.left + bar.right) / 2;

		// A press on the first bar, at the right, fills one bar; on the last bar, the maximum; and in the empty
		// rest to the left of it, which is past the end, the maximum too.
		await page.mouse.click(middle(forty.bars[0]!), forty.y);
		await expect(line(page, 'ring_bars')).toHaveAttribute('aria-valuenow', '1');
		await expect(line(page, 'ring_bars').locator('.mt-on')).toHaveCount(1);
		await page.mouse.click(middle(forty.bars.at(-1)!), forty.y);
		await expect(line(page, 'ring_bars')).toHaveAttribute('aria-valuenow', '40');
		await page.mouse.click(middle(forty.bars[9]!), forty.y);
		await expect(line(page, 'ring_bars')).toHaveAttribute('aria-valuenow', '10');
		await page.mouse.click(forty.left + 3, forty.y);
		await expect(line(page, 'ring_bars')).toHaveAttribute('aria-valuenow', '40');
		await expect(line(page, 'ring_bars').locator('.mt-on')).toHaveCount(40);

		// The tint is on the bars from the right up to the pointer, and on all of them from the empty rest.
		await page.mouse.move(forty.bars[29]!.right - 1, forty.y);
		await expectLarge(page, 'ring_bars', 30);
		await page.mouse.move(forty.left + 3, forty.y);
		await expectLarge(page, 'ring_bars', 40);
		await page.mouse.move(5, 5);

		// By the place, fifty bars which are set for a hundred: the row of bars, 298px from the right edge,
		// stands for the whole range. Its left end and the empty 44px beyond it are the maximum, its middle 50,
		// a quarter of it from the right 25, and the right edge the minimum.
		await line(page, 'grow_four').scrollIntoViewIfNeeded();
		await expect(line(page, 'grow_four')).toHaveClass(/mt-by-position/);
		const fifty = await barsOf('grow_four');
		expect(fifty.bars).toHaveLength(50);
		const length = fifty.right - fifty.bars.at(-1)!.left;
		expect(length).toBeCloseTo(298, 3);
		expect(fifty.bars.at(-1)!.left - fifty.left).toBeCloseTo(44, 3);

		await page.mouse.click(fifty.right - length / 2, fifty.y);
		await expect(line(page, 'grow_four')).toHaveAttribute('aria-valuenow', '50');
		await page.mouse.click(fifty.right - length + 0.5, fifty.y);
		await expect(line(page, 'grow_four')).toHaveAttribute('aria-valuenow', '100');
		await page.mouse.click(fifty.right - length * 0.25, fifty.y);
		await expect(line(page, 'grow_four')).toHaveAttribute('aria-valuenow', '25');
		await page.mouse.click(fifty.left + 3, fifty.y);
		await expect(line(page, 'grow_four')).toHaveAttribute('aria-valuenow', '100');
		await page.mouse.click(fifty.right - 0.5, fifty.y);
		await expect(line(page, 'grow_four')).toHaveAttribute('aria-valuenow', '0');
	});
});
