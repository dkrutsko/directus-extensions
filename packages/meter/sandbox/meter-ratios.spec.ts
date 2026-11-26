// Browser tests of the Meter bundle: bars on screens of several device pixel ratios, each in a browser which
// really has them, and a meter as a field of a stock Repeater.
import { expect, openItem, test } from '../../../sandbox/support/fixtures.ts';
import {
	COLLECTION,
	EDIT,
	EDIT_VALUES,
	LISTENERS,
	LOOKS,
	REPEATED,
	REPEATER,
	REPEATER_ROWS,
	SIZES,
	bookmarks,
	clickAt,
	edges,
	edited,
	expectFilledPieces,
	expectLarge,
	ids,
	keyOn,
	line,
	listened,
	makeUser,
	meter,
	openEdit,
	optionsDialog,
	pixels,
	pointAt,
	readPieces,
	removeAll,
	rgb,
	save,
	seedEdit,
	seedMain,
	seedRepeater,
	signedIn,
	strip,
	table,
	text,
	token,
} from './meter-support.ts';
import type { Credentials, Locator, Page } from './meter-support.ts';

// A user who may read the collection of editing and change two of its fields, `five` and `dots`, and no other.
let reader: Credentials;

test.beforeAll(async ({ api }) => {
	await removeAll(api);
	await seedMain(api);
	await seedEdit(api);
	await seedRepeater(api);

	reader = await makeUser(api, 'reader', {}, [
		{ collection: EDIT, action: 'read' },
		{ collection: EDIT, action: 'update', fields: ['five', 'dots'] },
	]);
});

test.afterAll(async ({ api }) => {
	await removeAll(api);
});

// Bars are drawn in whole device pixels, so that every bar is as wide as every other. That has to be looked at on
// a screen which really has the device pixels: a page which is only told to pretend a ratio (`deviceScaleFactor`
// of a context) is laid out in whole CSS pixels and enlarged afterwards, and draws a bar of four and a half pixels
// as four and as five by turns. So each of these tests starts a browser of its own with the ratio forced.
test.describe('bars are all drawn alike', () => {
	// The runs of a row of pixels: what is not the page's background is a bar, what is is a gap.
	const runsOf = (row: number[][], paper: number[]) => {
		const runs: { bar: boolean; length: number }[] = [];

		for (const colour of row) {
			const bar = Math.max(...colour.map((channel, index) => Math.abs(channel - paper[index]!))) > 10;
			if (runs.length && runs.at(-1)!.bar === bar) runs.at(-1)!.length++;
			else runs.push({ bar, length: 1 });
		}

		return runs;
	};

	// The bars of a row as they are drawn, from a row of pixels through their middle: the widths of the bars, of the
	// gaps between them and of what is empty after the last one up to the end of the track, in device pixels.
	const drawnBars = async (page: Page, row: Locator, ratio: number) => {
		await row.scrollIntoViewIfNeeded();
		const area = (await row.boundingBox())!;
		const paper = rgb(await token(page, '--theme--background'));
		const line = await pixels(page, area.x, area.y + area.height / 2, Math.ceil(area.width));
		const runs = runsOf(line.slice(0, Math.round(area.width * ratio)), paper);
		const empty = runs.at(-1)!.bar ? 0 : runs.pop()!.length;

		return {
			bars: runs.filter((run) => run.bar).map((run) => run.length),
			gaps: runs.filter((run) => !run.bar).map((run) => run.length),
			empty,
			room: Math.round(area.width * ratio),
		};
	};

	// The same from the boxes, in device pixels: where each bar starts and how wide it is.
	const laidBars = (row: Locator, ratio: number) =>
		row.evaluate((element, scale) => {
			const from = element.getBoundingClientRect().left;
			return Array.from(element.children).map((bar) => {
				const box = bar.getBoundingClientRect();
				return { start: (box.left - from) * scale, width: box.width * scale };
			});
		}, ratio);

	// The rule for bars, written out again: the least bar and gap in whole device pixels, how many of those fit a
	// width, and for a number of bars the gap, from the least to twice the least, and the largest bar beside it
	// which leave the least of the track empty.
	const least = (place: 'form' | 'display', ratio: number) => {
		const [piece, space] = SIZES[place].bars;
		return { bar: Math.ceil(piece * ratio), gap: Math.ceil(space * ratio) };
	};

	const most = (place: 'form' | 'display', width: number, ratio: number) => {
		const { bar, gap } = least(place, ratio);
		return Math.floor((Math.floor(width * ratio) + gap) / (bar + gap));
	};

	const sized = (place: 'form' | 'display', count: number, width: number, ratio: number) => {
		const small = least(place, ratio);
		const room = Math.floor(width * ratio);
		let best = { bar: 0, gap: 0, length: 0 };

		for (let gap = small.gap; gap <= 2 * small.gap; gap++) {
			const bar = Math.floor((room - (count - 1) * gap) / count);
			if (bar < small.bar) break;

			const length = count * bar + (count - 1) * gap;
			if (length > best.length) best = { bar, gap, length };
		}

		return best;
	};

	for (const ratio of [1, 1.5, 2]) {
		test(`at ${ratio} device pixels to the pixel every bar is as wide as every other, in the form and in the table, and the pointer goes by the bars`, async ({
			playwright,
		}) => {
			const browser = await playwright.chromium.launch({
				args: [`--force-device-scale-factor=${ratio}`, `--window-size=${Math.round(1440 * ratio)},${Math.round(900 * ratio)}`],
			});

			try {
				const { page, quiet } = await signedIn(browser, { viewport: null });

				// The owner's case: a hundred in half of the form, 342px. A hundred bars do not fit, so as many as
				// fit are drawn, 57 on each of these screens, and not the fifty which divide a hundred.
				await openItem(page, COLLECTION, ids['First']!);
				await expect(text(page, 'bar_hundred')).toHaveText('62%');
				await expect(page.locator('.hydrating')).toHaveCount(0);
				expect(await page.evaluate(() => window.devicePixelRatio)).toBe(ratio);

				const row = strip(page, 'bar_hundred');
				const count = most('form', 342, ratio);
				expect(count).toBe(57);
				await expect(row.locator('> *')).toHaveCount(count);
				expect((await row.boundingBox())!.width).toBe(342);

				// As drawn: bars of one width and gaps of one width, the least which the rule allows, 4px and 2px,
				// and less than one more bar with its gap empty at the end of the track: 2px.
				const { bar, gap } = sized('form', count, 342, ratio);
				expect([bar, gap]).toEqual([4 * ratio, 2 * ratio]);
				const drawn = await drawnBars(page, row, ratio);

				expect([...new Set(drawn.bars)], `bars drawn ${drawn.bars.join(' ')}`).toEqual([bar]);
				expect(drawn.bars).toHaveLength(count);
				expect([...new Set(drawn.gaps)], `gaps drawn ${drawn.gaps.join(' ')}`).toEqual([gap]);
				expect(drawn.gaps).toHaveLength(count - 1);
				expect(drawn.empty).toBe(drawn.room - (count * bar + (count - 1) * gap));
				expect(drawn.empty).toBeLessThan(bar + gap);
				expect(drawn.empty).toBe(2 * ratio);

				// As laid out: every box starts on a whole device pixel and is that many wide.
				const laid = await laidBars(row, ratio);
				for (const [index, box] of laid.entries()) {
					expect(box.width, `bar ${index}`).toBeCloseTo(bar, 3);
					expect(box.start, `bar ${index}`).toBeCloseTo(index * (bar + gap), 3);
				}

				// No number wanted draws the same row. Five bars, a number which fits, are drawn as five, with
				// the bar and the gap which fill the track best: all of it but a device pixel at most.
				const free = await drawnBars(page, strip(page, 'bar_free'), ratio);
				expect(free.bars, 'bar_free').toEqual(drawn.bars);
				expect(free.gaps, 'bar_free').toEqual(drawn.gaps);

				const five = await drawnBars(page, strip(page, 'bar_auto'), ratio);
				const wide = sized('form', 5, 342, ratio);
				expect([wide.bar, wide.gap]).toEqual(ratio === 1 ? [66, 3] : ratio === 1.5 ? [100, 3] : [132, 6]);
				expect(five.bars, `five: ${five.bars.join(' ')}`).toEqual(Array.from({ length: 5 }, () => wide.bar));
				expect(five.gaps, `five: ${five.gaps.join(' ')}`).toEqual(Array.from({ length: 4 }, () => wide.gap));
				expect(five.empty).toBeLessThanOrEqual(1);

				// Pills and segments still share the whole width of the field.
				for (const name of ['pill_hundred', 'seg_hundred']) {
					const all = await readPieces(strip(page, name));
					const area = await edges(meter(page, name));
					expect(Math.abs(all.at(-1)!.right - area.right), name).toBeLessThan(0.5);
				}

				// The display in the table: as many bars as fit its 72px for the same field, 24 or 22, each as
				// wide as every other, and less than a bar and its gap empty after them.
				await page.goto(`/admin/content/${COLLECTION}?bookmark=${bookmarks.looks}`);
				await expect(page.locator('table tbody tr.table-row')).toHaveCount(3);
				const shown = table(page, LOOKS).display('First', 'bar_hundred').locator('.md-strip');
				const few = most('display', 72, ratio);
				expect(few).toBe(ratio === 1.5 ? 22 : 24);
				await expect(shown.locator('> *')).toHaveCount(few);
				expect((await shown.boundingBox())!.width).toBe(72);

				const thin = sized('display', few, 72, ratio);
				expect([thin.bar, thin.gap]).toEqual(ratio === 1 ? [2, 1] : ratio === 1.5 ? [3, 2] : [4, 2]);
				const cell = await drawnBars(page, shown, ratio);
				expect([...new Set(cell.bars)], `bars drawn ${cell.bars.join(' ')}`).toEqual([thin.bar]);
				expect(cell.bars).toHaveLength(few);
				expect([...new Set(cell.gaps)], `gaps drawn ${cell.gaps.join(' ')}`).toEqual([thin.gap]);
				expect(cell.empty).toBe(Math.floor(72 * ratio) - (few * thin.bar + (few - 1) * thin.gap));
				expect(cell.empty).toBeLessThan(thin.bar + thin.gap);

				// Fifty bars which are set, in the same width: fifty fit, so fifty are drawn, each of one width
				// and each gap of one width, the largest which fit fifty. What is left is less than a device
				// pixel for each bar, which here is most of what it can be.
				await openEdit(page);
				await line(page, 'grow_four').scrollIntoViewIfNeeded();
				await expect(line(page, 'grow_four').locator('> *')).toHaveCount(50);
				expect((await line(page, 'grow_four').boundingBox())!.width).toBe(342);
				await page.mouse.move(5, 5);

				const set = sized('form', 50, 342, ratio);
				expect([set.bar, set.gap]).toEqual(ratio === 1 ? [4, 2] : ratio === 1.5 ? [7, 3] : [9, 4]);
				const wanted = await drawnBars(page, line(page, 'grow_four'), ratio);
				expect([...new Set(wanted.bars)], `bars drawn ${wanted.bars.join(' ')}`).toEqual([set.bar]);
				expect(wanted.bars).toHaveLength(50);
				expect([...new Set(wanted.gaps)], `gaps drawn ${wanted.gaps.join(' ')}`).toEqual([set.gap]);
				expect(wanted.gaps).toHaveLength(49);
				expect(wanted.empty).toBe(wanted.room - (50 * set.bar + 49 * set.gap));
				expect(wanted.empty).toBeLessThan(50);

				// The pointer goes by the bars as they are drawn. By the piece, forty bars for forty: a press on
				// the last bar is the maximum, and so is one in the empty rest of the track after it.
				await line(page, 'ring_bars').scrollIntoViewIfNeeded();
				await expect(line(page, 'ring_bars')).toHaveClass(/mt-by-piece/);
				const forty = (await line(page, 'ring_bars').boundingBox())!;
				const boxes = await laidBars(line(page, 'ring_bars'), 1);
				const last = boxes.at(-1)!;
				expect(forty.width - (last.start + last.width)).toBeGreaterThan(3);

				await page.mouse.click(forty.x + boxes[9]!.start + boxes[9]!.width / 2, forty.y + 6);
				await expect(line(page, 'ring_bars')).toHaveAttribute('aria-valuenow', '10');
				await page.mouse.click(forty.x + last.start + last.width / 2, forty.y + 6);
				await expect(line(page, 'ring_bars')).toHaveAttribute('aria-valuenow', '40');
				await page.mouse.click(forty.x + boxes[19]!.start + 1, forty.y + 6);
				await expect(line(page, 'ring_bars')).toHaveAttribute('aria-valuenow', '20');
				await page.mouse.click(forty.x + forty.width - 3, forty.y + 6);
				await expect(line(page, 'ring_bars')).toHaveAttribute('aria-valuenow', '40');

				// The tint is on the bars up to the pointer, and on all of them from the empty rest.
				await page.mouse.move(forty.x + boxes[29]!.start + 1, forty.y + 6);
				await expectLarge(page, 'ring_bars', 30);
				await page.mouse.move(forty.x + forty.width - 3, forty.y + 6);
				await expectLarge(page, 'ring_bars', 40);
				await page.mouse.move(5, 5);

				// By the place, fifty bars for a hundred: the row of bars stands for the whole range. Its end and
				// the empty rest after it are the maximum, its middle is 50, and its start the minimum.
				await line(page, 'grow_four').scrollIntoViewIfNeeded();
				await expect(line(page, 'grow_four')).toHaveClass(/mt-by-position/);
				const fifty = (await line(page, 'grow_four').boundingBox())!;
				const bars = await laidBars(line(page, 'grow_four'), 1);
				const length = bars.at(-1)!.start + bars.at(-1)!.width;
				expect(fifty.width - length).toBeGreaterThan(8);

				await page.mouse.click(fifty.x + length / 2, fifty.y + 6);
				await expect(line(page, 'grow_four')).toHaveAttribute('aria-valuenow', '50');
				await page.mouse.click(fifty.x + length - 0.5, fifty.y + 6);
				await expect(line(page, 'grow_four')).toHaveAttribute('aria-valuenow', '100');
				await page.mouse.click(fifty.x + length * 0.25, fifty.y + 6);
				await expect(line(page, 'grow_four')).toHaveAttribute('aria-valuenow', '25');
				await page.mouse.click(fifty.x + fifty.width - 3, fifty.y + 6);
				await expect(line(page, 'grow_four')).toHaveAttribute('aria-valuenow', '100');
				await page.mouse.click(fifty.x + 0.5, fifty.y + 6);
				await expect(line(page, 'grow_four')).toHaveAttribute('aria-valuenow', '0');

				quiet();
			} finally {
				await browser.close();
			}
		});
	}
});

// A meter as a field of a stock Repeater. The dialog in which such a field is set up is not the ordinary field
// settings: it builds the options form of the interface without telling it the field, its options or its type.
test.describe('a meter in a stock Repeater', () => {
	test.beforeEach(async ({ api }) => {
		await api.patch(`/fields/${REPEATER}/rows`, { meta: { options: { template: '{{ name }}: {{ level }} / {{ share }}', fields: REPEATED } } });
		await api.patch(`/items/${REPEATER}/${ids['Repeater']}`, { rows: REPEATER_ROWS });
	});

	test('in the dialog of a field of the Repeater every option of the meter can be reached, also those which show only sometimes', async ({ page, api }) => {
		await page.goto(`/admin/settings/data-model/${REPEATER}/rows`);

		const dialogs = page.locator('#dialog-outlet');
		await dialogs.getByText('Interface', { exact: true }).first().click();

		// The fields of the Repeater are listed by their interface; the first meter is "level".
		await dialogs.getByText('— meter', { exact: false }).first().click();

		const { drawer: dialog, option, choose } = optionsDialog(page, '.extension-options');

		// It is the dialog of a Repeater's field: a key, a type, an interface and its options, and a display in a
		// group which starts closed.
		await expect(dialog.locator('.field[data-field="field"] input')).toHaveValue('level');
		await expect(dialog.locator('.field[data-field="display"]')).toHaveCount(0);

		// Every option which always shows.
		for (const name of [
			'min',
			'max',
			'label',
			'indicator',
			'indicatorFormat',
			'visualization',
			'color',
			'thresholds',
			'activeColoring',
			'inactiveColoring',
			'input',
			'step',
		]) {
			await expect(option(name), name).toHaveCount(1);
		}

		// The field draws pills, so the number of subdivisions shows, and the layout of dots does not.
		await expect(option('visualization').locator('input')).toHaveValue('Pills');
		await expect(option('subdivisions')).toHaveCount(1);
		await expect(option('subdivisions').locator('input')).toHaveAttribute('placeholder', 'Automatic');
		await expect(option('dotsLayout')).toHaveCount(0);

		// With pieces, also how far they grow ahead of the fill, a number which is nothing until it is set, and
		// the switch for fading in.
		await expect(option('grow').locator('input')).toHaveAttribute('type', 'number');
		await expect(option('grow').locator('input')).toHaveAttribute('placeholder', '0');
		await expect(option('grow').locator('input')).toHaveAttribute('step', '0.5');
		await expect(option('grow').locator('input')).toHaveValue('');
		await expect(option('fade')).toHaveCount(1);

		// Dots: the layout as well. One bar: neither. Each of the other shapes: the number alone.
		await choose('visualization', 'Dots');
		await expect(option('subdivisions')).toHaveCount(1);
		await expect(option('dotsLayout')).toHaveCount(1);
		await expect(option('dotsLayout').locator('input')).toHaveValue('Packed');

		await choose('visualization', 'Contiguous');
		await expect(option('subdivisions')).toHaveCount(0);
		await expect(option('dotsLayout')).toHaveCount(0);
		await expect(option('grow')).toHaveCount(0);
		await expect(option('fade')).toHaveCount(0);

		for (const shape of ['Segments', 'Bars', 'Pills']) {
			await choose('visualization', shape);
			await expect(option('subdivisions'), shape).toHaveCount(1);
			await expect(option('dotsLayout'), shape).toHaveCount(0);
		}

		// The sensitivity shows for the relative method alone.
		await expect(option('input').locator('input')).toHaveValue('Automatic');
		await expect(option('sensitivity')).toHaveCount(0);

		for (const method of ['Position', 'Piece']) {
			await choose('input', method);
			await expect(option('sensitivity'), method).toHaveCount(0);
			await expect(option('step'), method).toHaveCount(1);
		}

		// The dialog does not say the type or the limits of the field, so the step cannot say what it comes to.
		await expect(option('step').locator('input')).toHaveAttribute('placeholder', 'Automatic');

		// None: the meter is not edited, and neither the step nor the sensitivity means anything.
		await choose('input', 'None');
		await expect(option('step')).toHaveCount(0);
		await expect(option('sensitivity')).toHaveCount(0);

		await choose('input', 'Relative');
		await expect(option('sensitivity')).toHaveCount(1);
		await expect(option('sensitivity').locator('input')).toHaveAttribute('placeholder', '1');

		// Set what only shows sometimes, and save: the dialog, then the field.
		await option('sensitivity').locator('input').fill('2');
		await choose('visualization', 'Dots');
		await choose('dotsLayout', 'Spread');
		await option('subdivisions').locator('input').fill('4');
		await option('grow').locator('input').fill('2.5');

		await dialog.locator('header button').last().click();
		await dialogs.locator('.v-drawer').last().locator('header button').last().click();

		await expect
			.poll(async () => (await api.get(`/fields/${REPEATER}/rows`)).meta.options.fields[1].meta.options)
			.toEqual({
				max: 5,
				visualization: 'dots',
				indicatorFormat: 'fraction',
				color: '#2ECDA7',
				input: 'relative',
				sensitivity: 2,
				dotsLayout: 'spread',
				subdivisions: 4,
				grow: 2.5,
			});

		// A row of an item is drawn by them: four dots from edge to edge, set by how far the pointer moves.
		await openItem(page, REPEATER, ids['Repeater']!);
		await page.locator('main .v-form .field[data-field="rows"] .v-list-item').first().click();

		const row = page.locator('#dialog-outlet .v-drawer').last();
		const level = row.locator('.field[data-field="level"] .meter > :first-child');
		await expect(level).toHaveClass(/mt-dots/);
		await expect(level).toHaveClass(/mt-spread/);
		await expect(level).toHaveClass(/mt-by-relative/);
		await expect(level.locator('> *')).toHaveCount(4);
	});

	test('the display chosen in the dialog of a field of the Repeater draws the rows, by its own options and by those of the interface', async ({
		page,
		api,
	}) => {
		// No display is chosen for "share": a row shows its plain number.
		await openItem(page, REPEATER, ids['Repeater']!);
		const rows = page.locator('main .v-form .field[data-field="rows"] .v-list-item');
		await expect(rows).toHaveCount(2);
		await expect(rows.first().locator('.meter-display')).toHaveCount(1);
		await expect(rows.first()).toContainText('0.5');

		// The dialog of that field, and in it the group "Display", which starts closed.
		await page.goto(`/admin/settings/data-model/${REPEATER}/rows`);
		const dialogs = page.locator('#dialog-outlet');
		await dialogs.getByText('Interface', { exact: true }).first().click();
		await dialogs.getByText('share — meter', { exact: false }).first().click();

		const dialog = dialogs.locator('.v-drawer').last();
		await expect(dialog.locator('.field[data-field="field"] input')).toHaveValue('share');
		await dialog.locator('.v-detail', { hasText: 'Display' }).last().locator('.v-divider').first().click();

		const display = dialog.locator('.field[data-field="display"]');
		await expect(display).toHaveCount(1);
		await display.locator('.v-input').first().click();
		await page.locator('.v-menu-popper:visible .v-list-item', { hasText: 'Meter' }).last().click();

		// The options of the display. The dialog does not tell the form the field, so the form cannot show what
		// the interface has: its inputs are empty and say so, and the two options which apply only to some
		// visualizations show until one is chosen here which rules them out.
		const { option, choose } = optionsDialog(page, '.field[data-field="display_options"]');

		for (const name of [
			'inherited',
			'min',
			'max',
			'label',
			'indicator',
			'indicatorFormat',
			'visualization',
			'subdivisions',
			'dotsLayout',
			'color',
			'thresholds',
			'activeColoring',
			'inactiveColoring',
		]) {
			await expect(option(name), name).toHaveCount(1);
		}

		for (const name of ['input', 'step', 'sensitivity']) await expect(option(name), name).toHaveCount(0);
		await expect(option('inherited')).toContainText('cannot show what is set there');
		await expect(option('max').locator('input')).toHaveAttribute('placeholder', 'As in the interface');
		await expect(option('visualization').locator('input')).toHaveValue('');
		await expect(option('visualization').locator('input')).toHaveAttribute('placeholder', 'As in the interface');
		await expect(option('indicatorFormat').locator('input')).toHaveValue('');

		await choose('visualization', 'Contiguous');
		await expect(option('subdivisions')).toHaveCount(0);
		await expect(option('dotsLayout')).toHaveCount(0);
		await choose('visualization', 'Dots');
		await expect(option('subdivisions')).toHaveCount(1);
		await expect(option('dotsLayout')).toHaveCount(1);
		await choose('visualization', 'Pills');
		await expect(option('subdivisions')).toHaveCount(1);
		await expect(option('dotsLayout')).toHaveCount(0);

		// Four pills for the display, and nothing else: the range and the format stay those of the interface.
		await option('subdivisions').locator('input').fill('4');
		await dialog.locator('header button').last().click();
		await dialogs.locator('.v-drawer').last().locator('header button').last().click();

		await expect
			.poll(async () => {
				const stored = (await api.get(`/fields/${REPEATER}/rows`)).meta.options.fields[2].meta;
				return { display: stored.display, display_options: stored.display_options, options: stored.options };
			})
			.toEqual({
				display: 'meter',
				display_options: { visualization: 'pills', subdivisions: 4 },
				options: { max: 1, step: 0.1, indicatorFormat: 'value' },
			});

		// The rows are drawn by it: four pills, of which 0.5 of 1 fills two and 0.2 fills one, and the value as
		// the interface formats it.
		await openItem(page, REPEATER, ids['Repeater']!);
		await expect(rows).toHaveCount(2);

		for (const [index, filled, said] of [
			[0, 2, '0.5'],
			[1, 1, '0.2'],
		] as const) {
			const shares = rows.nth(index).locator('.meter-display').nth(1);
			await expect(shares.locator('.md-pills')).toHaveCount(1);
			await expectFilledPieces(shares.locator('.md-strip'), 4, filled);
			await expect(shares.locator('.md-text')).toHaveText(said);
			await expect(shares).toHaveAttribute('aria-valuemax', '1');
		}

		// The display of "level" beside it is still its own: five pills by the options of its interface.
		await expectFilledPieces(rows.first().locator('.meter-display').first().locator('.md-strip'), 5, 3);

		// A change of the interface's options alone reaches the row too: with a maximum of 2, 0.5 fills one of four.
		const fields = (await api.get(`/fields/${REPEATER}/rows`)).meta.options.fields;
		fields[2].meta.options = { ...fields[2].meta.options, max: 2 };
		await api.patch(`/fields/${REPEATER}/rows`, { meta: { options: { template: '{{ name }}: {{ level }} / {{ share }}', fields } } });
		await openItem(page, REPEATER, ids['Repeater']!);
		await expectFilledPieces(rows.first().locator('.meter-display').nth(1).locator('.md-strip'), 4, 1);
		await expect(rows.first().locator('.meter-display').nth(1)).toHaveAttribute('aria-valuemax', '2');
	});

	test('a meter in a row of the Repeater is drawn by the options of its field, and editing it writes numbers into the row', async ({ page, api }) => {
		await openItem(page, REPEATER, ids['Repeater']!);
		await expect(page.locator('.hydrating')).toHaveCount(0);

		// The row itself: the display of the meter, where one is chosen for the field, drawn by the options of
		// the field's interface as in a table: five pills in the colour of the interface, three filled, and
		// "3 / 5". A meter for which no display is chosen is the plain number.
		const rows = page.locator('main .v-form .field[data-field="rows"] .v-list-item');
		await expect(rows).toHaveCount(2);
		const shownAs = rows.first().locator('.meter-display');
		await expect(shownAs).toHaveCount(1);
		await expectFilledPieces(shownAs.locator('.md-strip'), 5, 3);
		await expect(shownAs.locator('.md-pills')).toHaveCount(1);
		await expect(shownAs.locator('.md-text')).toHaveText('3 / 5');
		expect((await readPieces(shownAs.locator('.md-strip')))[0]!.color).toBe('rgb(46, 205, 167)');
		await expect(rows.first()).toContainText('0.5');

		// The drawer of the row: each meter by its options, and one which can be edited.
		await rows.first().click();
		const row = page.locator('#dialog-outlet .v-drawer').last();
		const lineOf = (name: string) => row.locator(`.field[data-field="${name}"] .meter > :first-child`);
		const textOf = (name: string) => row.locator(`.field[data-field="${name}"] .mt-text`);
		const press = async (name: string, share: number) => {
			const area = (await lineOf(name).boundingBox())!;
			await page.mouse.click(area.x + area.width * share, area.y + area.height / 2);
		};

		await expect(lineOf('level')).toHaveClass(/mt-pills/);
		await expect(lineOf('level')).toHaveClass(/mt-by-piece/);
		await expect(lineOf('level')).toHaveAttribute('role', 'slider');
		await expectFilledPieces(lineOf('level'), 5, 3);
		await expect(textOf('level')).toHaveText('3 / 5');
		expect((await readPieces(lineOf('level')))[0]!.color).toBe('rgb(46, 205, 167)');
		await expect(textOf('share')).toHaveText('0.5');
		await expect(textOf('big')).toHaveText('500');

		// The form of the row says the type of each field: a whole number, tenths, fifties.
		await press('level', 0.9);
		await expect(textOf('level')).toHaveText('5 / 5');

		// The pointer rests on the fifth pill, so all five are drawn large, 16px high: nothing around them in
		// the drawer, which scrolls and so clips, cuts any of them off.
		const large = () =>
			lineOf('level').evaluate((element) =>
				Array.from(element.children).map((part) => {
					const area = part.getBoundingClientRect();
					let cut = '';

					for (let around = part.parentElement; around !== null && cut === ''; around = around.parentElement) {
						const clips = getComputedStyle(around);
						if (clips.overflowX === 'visible' && clips.overflowY === 'visible') continue;

						const box = around.getBoundingClientRect();
						if (area.left < box.left - 0.01 || area.right > box.right + 0.01 || area.top < box.top - 0.01 || area.bottom > box.bottom + 0.01)
							cut = around.className || around.tagName;
					}

					return `${Math.round(area.height)}px ${cut}`.trim();
				}),
			);
		await expect.poll(large).toEqual(['16px', '16px', '16px', '16px', '16px']);

		await press('share', 0.31);
		await expect(textOf('share')).toHaveText('0.3');
		await press('big', 0.33);
		await expect(textOf('big')).toHaveText('350');

		// The drawer is confirmed and the item saved: the row holds plain numbers, the other row is as it was.
		await row.locator('header button').last().click();
		await expect(rows.first().locator('.md-text')).toHaveText('5 / 5');
		await expect(page.locator('#dialog-outlet .v-drawer')).toHaveCount(0);

		const sent = await save(page, REPEATER);
		expect(sent.values).toEqual({ rows: [{ name: 'First', level: 5, share: 0.3, big: 350 }, REPEATER_ROWS[1]] });
		expect(sent.text).toContain('"level":5,"share":0.3,"big":350');

		const stored = (await api.get(`/items/${REPEATER}/${ids['Repeater']}`)).rows;
		expect(stored).toEqual([{ name: 'First', level: 5, share: 0.3, big: 350 }, REPEATER_ROWS[1]]);
		for (const value of [stored[0].level, stored[0].share, stored[0].big]) expect(typeof value).toBe('number');
	});
});

// What keeps a number which a flow maintains from being edited is, for most users, their permissions: the form
// disables a field which the user may not change, and a batch edit every field which is not ticked.
test.describe('a field which the form does not let the user change', () => {
	test.beforeEach(async ({ api }) => {
		await api.patch(`/items/${EDIT}/${ids['Edit']}`, EDIT_VALUES);
	});

	test('a user who may read a field and not change it has a reading: the role of a meter, no tab stop, no listener, and a press changes nothing', async ({
		browser,
	}) => {
		const session = await signedIn(browser, {}, reader);

		try {
			const page = session.page;
			await openEdit(page);
			await expect(text(page, 'whole')).toHaveText('40%');

			// A field the user may not change, on one bar and on pieces.
			for (const name of ['whole', 'near_bars']) {
				const row = line(page, name);

				await expect(row, name).toHaveAttribute('role', 'meter');
				await expect(row, name).not.toHaveAttribute('tabindex');
				await expect(row, name).not.toHaveClass(/mt-live/);
				await expect(meter(page, name).locator('.mt-reach, .mt-handle'), name).toHaveCount(0);
				await expect(row, name).toHaveCSS('cursor', 'auto');
				expect(await listened(page, row), name).toEqual([]);
				expect(await listened(page, meter(page, name)), name).toEqual([]);
			}

			// A press, a drag and keys change nothing, in the page or in what the form holds.
			const point = await pointAt(page, 'whole', 0.8);
			await page.mouse.move(point.x, point.y);
			await page.mouse.down();
			await page.mouse.move(point.x - 60, point.y, { steps: 3 });
			await page.mouse.up();
			for (const key of ['ArrowRight', 'End', 'PageUp']) await keyOn(line(page, 'whole'), key);

			await expect(text(page, 'whole')).toHaveText('40%');
			await expect(line(page, 'whole')).toHaveAttribute('aria-valuenow', '40');
			await expect(edited(page)).toHaveCount(0);

			// The same user may change `five`: there the meter is a slider, and a press writes.
			await expect(line(page, 'five')).toHaveAttribute('role', 'slider');
			await expect(line(page, 'five')).toHaveAttribute('tabindex', '0');
			expect(await listened(page, line(page, 'five'))).toEqual(LISTENERS);

			await clickAt(page, 'five', 0.9);
			await expect(line(page, 'five')).toHaveAttribute('aria-valuenow', '5');
			await expect(edited(page)).toHaveCount(1);

			session.quiet();
		} finally {
			await session.context.close();
		}
	});

	test('in a batch edit a field which is not ticked is a reading, and a ticked one writes the same number to both items', async ({ page, api }) => {
		const second = (await api.post(`/items/${EDIT}`, { ...EDIT_VALUES, whole: 70, five: 1 })).id;

		try {
			// Both items are chosen in the table, and the button which edits what is chosen opens the form in a drawer.
			await page.goto(`/admin/content/${EDIT}`);
			const rows = page.locator('table tbody tr.table-row');
			await expect(rows).toHaveCount(2);
			for (const row of await rows.all()) await row.locator('td.select').click();

			await page
				.locator('.header-bar button')
				.filter({ has: page.locator('[data-icon="edit"]') })
				.first()
				.click();

			const drawer = page.locator('#dialog-outlet .v-drawer').last();
			const within = (name: string) => drawer.locator(`.v-form .field[data-field="${name}"]`);
			const row = (name: string) => within(name).locator('.meter > :first-child');
			const tick = (name: string) => within(name).locator('.field-label .v-checkbox');
			const press = async (name: string, share: number) => {
				await row(name).scrollIntoViewIfNeeded();
				const area = (await row(name).boundingBox())!;
				await page.mouse.click(area.x + area.width * share, area.y + area.height / 2);
			};

			await expect(row('whole')).toBeVisible();

			// No field is ticked, so the form lets none be changed: every meter is a reading, on one bar and on pieces.
			for (const name of ['whole', 'five', 'near_bars']) {
				await expect(tick(name), name).toHaveAttribute('aria-pressed', 'false');
				await expect(row(name), name).toHaveAttribute('role', 'meter');
				await expect(row(name), name).not.toHaveAttribute('tabindex');
				await expect(row(name), name).not.toHaveClass(/mt-live/);
				expect(await listened(page, row(name)), name).toEqual([]);
			}

			// A batch edit starts without values. A press on a field which is not ticked changes nothing.
			await expect(within('whole').locator('.mt-text')).toHaveText('—');
			await press('whole', 0.8);
			await expect(within('whole').locator('.mt-text')).toHaveText('—');
			await expect(tick('whole')).toHaveAttribute('aria-pressed', 'false');
			await expect(row('whole')).toHaveAttribute('role', 'meter');

			// Ticked, the field can be changed: the meter is a slider which listens, and a press sets its value.
			await tick('whole').click();
			await expect(row('whole')).toHaveAttribute('role', 'slider');
			expect(await listened(page, row('whole'))).toEqual(LISTENERS);

			await press('whole', 0.3);
			await expect(within('whole').locator('.mt-text')).toHaveText('30%');
			await expect(row('whole')).toHaveAttribute('aria-valuenow', '30');

			// The field beside it is still not ticked, and still a reading.
			await expect(row('five')).toHaveAttribute('role', 'meter');
			expect(await listened(page, row('five'))).toEqual([]);

			// Saved: one request for both items, with the one number, and each item holds it beside what it had.
			const sent = page.waitForRequest((request) => request.method() === 'PATCH' && request.url().includes(`/items/${EDIT}`));
			await drawer.locator('header button').last().click();

			const body = (await sent).postDataJSON() as { keys: (string | number)[]; data: Record<string, unknown> };
			expect(body.data).toEqual({ whole: 30 });
			expect(body.keys.map(Number).sort()).toEqual([ids['Edit']!, second].sort());

			await expect
				.poll(async () =>
					(await api.get<{ whole: number; five: number }[]>(`/items/${EDIT}?fields=whole,five&sort=id`)).map((item) => [item.whole, item.five]),
				)
				.toEqual([
					[30, EDIT_VALUES.five],
					[30, 1],
				]);
		} finally {
			await api.delete(`/items/${EDIT}/${second}`);
		}
	});
});
