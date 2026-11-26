// Browser tests of the links of a table: which cells are offered as links and to whom, the drawer they open, that
// nothing about them ever marks the item as changed, and that a link which the keyboard moves to is not left under
// the pinned rows and columns (json-table-support.ts has what the specs share).
import { expect, test } from '../../../sandbox/support/fixtures.ts';
import {
	boxOf,
	cell,
	drawerOf,
	dropReader,
	makeCollection,
	makeItem,
	makeReader,
	openTable,
	sheet,
	signedIn,
	tableOf,
	wrap,
} from './json-table-support.ts';
import type { Credentials, Locator, Page } from './json-table-support.ts';

const COLLECTION = 'sandbox_json_table_links';

// The items which the links open. The second user may read the people and not the notes.
const PEOPLE = 'sandbox_json_table_links_people';
const NOTES = 'sandbox_json_table_links_notes';

const SCROLLING = { maxHeight: 320, columnLabels: 'across', stickyLeft: 2, stickyRight: 1, stickyTop: 1, stickyBottom: 1 };

const to = (collection: string, id: number | string) => ({ link: { collection, id: String(id) } });

let id = 0;
let reader: Credentials;

// A table of 12 columns and 30 rows in which every cell but the row headers is a link, named by its row and its column.
const WIDE = 12;
const TALL = 30;

test.beforeAll(async ({ api }) => {
	await api.drop(COLLECTION);
	await makeCollection(api, PEOPLE, []);
	await makeCollection(api, NOTES, []);

	const priya = await makeItem(api, PEOPLE, { title: 'Priya Shah' });
	const marco = await makeItem(api, PEOPLE, { title: 'Marco Bianchi' });
	const note = await makeItem(api, NOTES, { title: 'Not for everyone' });

	const table = wrap({
		columns: [cell('Person'), cell('Manager', to(PEOPLE, marco)), cell('Notes'), cell('More')],
		rows: [
			[cell('Team', to(PEOPLE, marco))],
			[
				cell('Priya Shah', to(PEOPLE, priya)),
				cell('Marco', to(PEOPLE, marco)),
				cell([{ text: 'A part', ...to(PEOPLE, priya) }, 'beside text']),
				cell('A note', to(NOTES, note)),
			],
			[
				// None of these is a link for anyone: no such collection, the id of the form for a new item, and no text.
				cell('No such collection', to('sandbox_json_table_links_nowhere', 1)),
				cell('New item', to(PEOPLE, '+')),
				{ icon: 'open_in_new', ...to(PEOPLE, priya) },
				{},
			],
		],
	});

	const scrolling = wrap({
		columns: Array.from({ length: WIDE }, (_, column) => cell(`Column ${column}`)),
		rows: Array.from({ length: TALL }, (_, row) => [
			cell(`Row ${row}`),
			...Array.from({ length: WIDE - 1 }, (_, column) => cell(`${row}-${column + 1}`, to(PEOPLE, priya))),
		]),
	});

	await makeCollection(api, COLLECTION, [sheet('table'), sheet('scrolling', SCROLLING)]);
	id = await makeItem(api, COLLECTION, { title: 'links', table, scrolling });

	reader = await makeReader(api, 'links', [COLLECTION, PEOPLE]);
});

test.afterAll(async ({ api }) => {
	await dropReader(api, 'links');
	await api.drop(COLLECTION, PEOPLE, NOTES);
});

/** The save button of the form, in the header of the page. */
const saveOf = (page: Page): Locator => page.locator('#app header .v-button:has(i[data-icon="check"]) button');

test('a link is offered from a header cell, a heading, a row header, a cell and a part, where it has text and a collection', async ({ page }) => {
	const root = await openTable(page, COLLECTION, id);

	// The administrator may read every collection.
	await expect(root.locator('.jt-link')).toHaveText(['Manager', 'Team', 'Priya Shah', 'Marco', 'A part', 'A note']);
	await expect(root.locator('thead .jt-link')).toHaveCount(1);
	await expect(root.locator('th[scope="rowgroup"] .jt-link')).toHaveCount(1);
	await expect(root.locator('th[scope="row"] .jt-link')).toHaveCount(1);

	// The rest is drawn as it would be without a link.
	await expect(root.locator('tbody tr').nth(2).locator('th')).toHaveText('No such collection');
	await expect(root.locator('tbody tr').nth(2).locator('td').nth(0)).toHaveText('New item');
	await expect(root.locator('tbody tr').nth(2).locator('button')).toHaveCount(0);
	await expect(root.locator('td[data-icon="open_in_new"]')).toHaveCount(1);
});

test('a user who may not read a collection gets its links as plain text', async ({ browser }) => {
	const session = await signedIn(browser, reader);

	try {
		const root = await openTable(session.page, COLLECTION, id);

		await expect(root.locator('.jt-link')).toHaveText(['Manager', 'Team', 'Priya Shah', 'Marco', 'A part']);
		await expect(root.locator('tbody tr').nth(1).locator('td').nth(2)).toHaveText('A note');
		await expect(root.locator('tbody tr').nth(1).locator('td').nth(2).locator('button')).toHaveCount(0);

		// A link he does have opens for him as for anyone.
		await root.locator('.jt-link', { hasText: 'Marco' }).click();
		await expect(drawerOf(session.page).locator('.field[data-field="title"] input')).toHaveValue('Marco Bianchi');

		expect(session.errors).toEqual([]);
	} finally {
		await session.close();
	}
});

test('a link opens its item in a drawer which cannot be edited, also for a user who may update the item', async ({ page }) => {
	const root = await openTable(page, COLLECTION, id);
	const drawer = drawerOf(page);
	const title = drawer.locator('.field[data-field="title"] input');

	await root.locator('.jt-link', { hasText: 'Priya Shah' }).click();
	await expect(title).toHaveValue('Priya Shah');
	await expect(title).toBeDisabled();

	// Nothing in the drawer saves: it has no button to save with which could be pressed.
	for (const button of await drawer.locator('.v-button:has(i[data-icon="check"]) button').all()) await expect(button).toBeDisabled();

	await drawer.locator('> .cancel button').click();
	await expect(drawer).toHaveCount(0);

	// Another link opens another item, in the same way.
	await root.locator('.jt-link', { hasText: 'Manager' }).click();
	await expect(title).toHaveValue('Marco Bianchi');
	await expect(title).toBeDisabled();
});

test('the item is never marked as changed: not by a drawer, not by the keyboard, and leaving asks nothing', async ({ page }) => {
	const dialogs: string[] = [];

	page.on('dialog', (dialog) => {
		dialogs.push(dialog.message());
		void dialog.dismiss();
	});

	const root = await openTable(page, COLLECTION, id);
	const drawer = drawerOf(page);
	const save = saveOf(page);

	await expect(save).toHaveCount(1);
	await expect(save).toBeDisabled();

	// With the pointer.
	await root.locator('.jt-link', { hasText: 'A part' }).click();
	await expect(drawer.locator('.field[data-field="title"] input')).toHaveValue('Priya Shah');
	await drawer.locator('> .cancel button').click();
	await expect(drawer).toHaveCount(0);
	await expect(save).toBeDisabled();

	// With the keyboard: to the next link, into its drawer and out again.
	await root.locator('.jt-link').first().focus();
	await page.keyboard.press('Tab');
	await expect(root.locator('.jt-link').nth(1)).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(drawer.locator('.field[data-field="title"] input')).toHaveValue('Marco Bianchi');
	await drawer.locator('> .cancel button').click();
	await expect(drawer).toHaveCount(0);

	// Keys on the table itself, which scrolls and can hold the focus.
	const scrolling = await tableOf(page, 'scrolling');
	await scrolling.locator('.jt-scroll').focus();
	for (const key of ['ArrowDown', 'ArrowRight', 'End', 'Home', 'Space', 'Enter', 'a', 'Delete', 'Backspace']) await page.keyboard.press(key);
	await expect(save).toBeDisabled();

	// The value is what it was.
	expect(await root.locator('.jt-link').count()).toBe(6);

	// Leaving the item asks nothing: the app would ask in a dialog of its own, the browser in one of its.
	await page.locator('header .v-button:has(i[data-icon="arrow_back"]), header a:has(i[data-icon="arrow_back"])').first().click();
	await expect(page).toHaveURL(new RegExp(`/admin/content/${COLLECTION}$`));
	await expect(page.locator('#dialog-outlet .v-dialog')).toHaveCount(0);
	expect(dialogs).toEqual([]);
});

/** The link of the cell in row `row` and table column `column` of the table which scrolls. */
const linkAt = (root: Locator, row: number, column: number) => root.locator('.jt-link', { hasText: new RegExp(`^${row}-${column}$`) });

test('a link which lies under a pinned row or column is scrolled clear of it when the Tab key moves to it, at all four edges', async ({ page }) => {
	await openTable(page, COLLECTION, id);
	const root = await tableOf(page, 'scrolling');
	const row = 12;
	const column = 5;
	const target = linkAt(root, row, column);

	// What is left of the box between the pinned cells, read from the row and the column of the link.
	const clear = async () => {
		const cells = root.locator('tbody tr').nth(row).locator('th, td');
		const top = await boxOf(root.locator('thead th').nth(column));
		const bottom = await boxOf(root.locator('tbody tr').last().locator('td').nth(column - 1));

		return { left: (await boxOf(cells.nth(1))).right, right: (await boxOf(cells.last())).left, top: top.bottom, bottom: bottom.top };
	};

	for (const edge of ['top', 'bottom', 'left', 'right'] as const) {
		// The link before it has the focus, and the box is scrolled so that the link itself lies at one edge of the
		// box: in view as far as the browser can tell, and covered by the row or the column which is pinned there.
		await linkAt(root, row, column - 1).evaluate(
			(before, [to, side]) => {
				const scroll = before.closest('.jt-scroll')!;
				const link = Array.from(scroll.querySelectorAll('.jt-link')).find((entry) => entry.textContent === to)!;

				(before as HTMLElement).focus({ preventScroll: true });
				scroll.scrollTo({ left: scroll.scrollWidth / 3, top: scroll.scrollHeight / 3, behavior: 'instant' });

				const box = scroll.getBoundingClientRect();
				const rect = link.getBoundingClientRect();

				if (side === 'top') scroll.scrollTop += rect.top - (box.top + scroll.clientTop);
				if (side === 'bottom') scroll.scrollTop += rect.bottom - (box.top + scroll.clientTop + scroll.clientHeight);
				if (side === 'left') scroll.scrollLeft += rect.left - (box.left + scroll.clientLeft);
				if (side === 'right') scroll.scrollLeft += rect.right - (box.left + scroll.clientLeft + scroll.clientWidth);
			},
			[`${row}-${column}`, edge] as const,
		);

		const covered = await boxOf(target);
		const room = await clear();

		expect(
			{ top: covered.top < room.top, bottom: covered.bottom > room.bottom, left: covered.left < room.left, right: covered.right > room.right }[edge],
			`the link lies under the pinned cells at the ${edge} before the key is pressed`,
		).toBe(true);

		await page.keyboard.press('Tab');
		await expect(target).toBeFocused();

		// The box stops short of the pinned cells when it scrolls something into view, so the link is clear of all four.
		await expect
			.poll(async () => {
				const link = await boxOf(target);
				const now = await clear();

				return link.top >= now.top - 0.5 && link.bottom <= now.bottom + 0.5 && link.left >= now.left - 0.5 && link.right <= now.right + 0.5;
			}, `the link is clear of the pinned cells after the key, coming from the ${edge}`)
			.toBe(true);
	}
});
