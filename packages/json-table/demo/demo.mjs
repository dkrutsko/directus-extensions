// The demo of the JSON Table interface: one form (a singleton) whose fields each hold a table, in groups by topic, and
// a small collection of products which the tables link to. The interface has few options, and all of them lay the
// table out, so most fields differ in their value: what a writer can put into it (docs/format.md). The sandbox builds
// it from this file; how a definition works is in sandbox/README.md, "Demos".
import { gzipSync } from 'node:zlib';
import { collection, field, group } from '../../../sandbox/demo/define.mjs';

const PRODUCTS = 'demo_json_table_products';

const PRIMARY = 'var(--theme--primary)';
const SUCCESS = 'var(--theme--success)';
const WARNING = 'var(--theme--warning)';
const DANGER = 'var(--theme--danger)';
const SUBDUED = 'var(--theme--foreground-subdued)';
const SHADED = 'var(--theme--background-subdued)';

/** A JSON field on the JSON Table interface. */
const sheet = (key, name, spec) => field(key, name, { type: 'json', interface: 'json-table', ...spec });

/** A value of the format, version 1, which holds the table as it is. */
const wrap = (data) => ({ version: 1, data });

/** A cell with text, and any other fields of a cell. */
const cell = (text, rest) => ({ text, ...rest });

/** A note in a row of its own across the table, quieter than a heading. */
const aside = (text) => [cell(text, { icon: 'info', color: SUBDUED, italic: true, weight: 400 })];

/** A link to one of the products. The format writes every id as a string. */
const product = (id) => ({ collection: PRODUCTS, id: String(id) });

/** The same numbers in every run (mulberry32), so a rebuilt demo shows the same tables. */
function numbers(seed) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const counted = (count) => count.toLocaleString('en-US');

// The products the links open: a bakery's.
const BAKERY = [
	[1, 'Sourdough', 'Bread', 'Wheat with a little rye, proved overnight, with a dark crust.'],
	[2, 'Rye', 'Bread', 'A dense rye loaf with caraway, sliced thin.'],
	[3, 'Seeded spelt', 'Bread', 'Spelt with sunflower, pumpkin and linseed.'],
	[4, 'Croissant', 'Pastry', 'A butter croissant, baked every hour until noon.'],
	[5, 'Cinnamon roll', 'Pastry', 'With cardamom and a sugar glaze.'],
	[6, 'Almond croissant', 'Pastry', 'Filled with almond cream and topped with flaked almonds.'],
	[7, 'Carrot cake', 'Cake', 'With walnuts and a cream cheese frosting.'],
	[8, 'Apple tart', 'Cake', 'Thin apples on puff pastry, made without butter.'],
];

// Recipes

const PRICE_LIST = wrap({
	shared: {
		vegan: { icon: 'eco', color: SUCCESS, tip: 'Vegan' },
		nuts: { icon: 'warning', color: WARNING, tip: 'Contains nuts' },
		out: { text: 'Sold out', italic: true, color: DANGER, tip: 'Sold out today' },
		none: { text: '-', color: SUBDUED, tip: 'Not sold in this size' },
		size: { color: SUBDUED, italic: true, weight: 400 },
	},
	columns: [cell('Item'), cell('Diet'), cell('Small'), cell('Large')],
	rows: [
		[cell(['Bread', { use: 'size', text: 'small is half a loaf' }])],
		[cell('Sourdough', { link: product(1) }), 'vegan', cell('3.20'), cell('5.80')],
		[cell('Rye', { link: product(2) }), 'vegan', cell('2.90'), cell('5.20')],
		[cell('Seeded spelt', { link: product(3) }), 'vegan', cell('3.40'), cell('6.20')],
		[cell(['Pastries', { use: 'size', text: 'large is a box of six' }])],
		[cell('Croissant', { link: product(4) }), {}, cell('1.60'), cell('8.50')],
		[cell('Cinnamon roll', { link: product(5) }), {}, cell('2.10'), cell('11.00')],
		[cell('Almond croissant', { link: product(6) }), 'nuts', cell('2.40'), 'out'],
		[cell(['Cakes', { use: 'size', text: 'small is a slice' }])],
		[cell('Carrot cake', { link: product(7) }), 'nuts', cell('3.50'), cell('24.00')],
		[cell([{ text: 'Apple tart', link: product(8) }, { text: 'new', color: PRIMARY, weight: 600 }]), 'vegan', cell('3.20'), cell('21.00')],
		[cell('Lemon drizzle', { tip: 'Fridays only' }), {}, cell('3.00'), 'none'],
		aside('Prices include tax. Ask us about allergens.'),
	],
	legend: ['vegan', 'nuts', 'out', 'none'],
});

// One Saturday of a library's rooms, an hour a column. An empty hour is an empty cell.
const _ = {};
const booked = (use, text) => ({ use, text });
const room = (name, seats, hours) => [cell(name, { tip: `${seats} seats` }), ...hours];

const STORY = booked('kids', 'Story time');
const LEGO = booked('kids', 'Lego club');
const HOMEWORK = booked('kids', 'Homework help');
const BOOKS = booked('club', 'Book club');
const REPAIR = booked('club', 'Repair café');
const CHESS = booked('club', 'Chess');
const YOGA = booked('course', 'Yoga');
const SPANISH = booked('course', 'Spanish A1');
const CV = booked('course', 'CV workshop');

const TIMETABLE = wrap({
	shared: {
		kids: { color: PRIMARY, background: 'var(--theme--primary-background)', tip: 'For children' },
		club: { color: SUCCESS, background: 'var(--theme--success-background)', tip: 'A club, open to everyone' },
		course: { color: WARNING, background: 'var(--theme--warning-background)', tip: 'A course: sign up at the desk' },
		shut: { text: 'Closed', italic: true, color: SUBDUED, background: SHADED, tip: 'Closed for cleaning' },
	},
	columns: [cell('Room'), ...['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((hour) => cell(hour))],
	rows: [
		[cell('Ground floor')],
		room("Children's corner", 12, [_, STORY, _, _, _, LEGO, LEGO, _, _, _]),
		room('Reading room', 40, [_, _, _, _, _, _, _, _, BOOKS, BOOKS]),
		room('Hall', 80, ['shut', _, YOGA, YOGA, _, _, _, _, _, _]),
		[cell('First floor')],
		room('Study room 1', 6, [_, SPANISH, SPANISH, _, _, HOMEWORK, HOMEWORK, _, _, _]),
		room('Study room 2', 6, [_, _, _, _, _, _, CV, CV, _, 'shut']),
		room('Workshop', 12, [_, _, REPAIR, REPAIR, REPAIR, _, _, CHESS, CHESS, _]),
		aside('A free hour can be booked at the desk.'),
	],
	legend: ['kids', 'club', 'course', 'shut'],
});

const COMPARISON = wrap({
	shared: {
		yes: { icon: 'check_circle', color: SUCCESS, tip: 'Included' },
		some: { icon: 'timelapse', color: WARNING, tip: 'Included, with a limit' },
		no: { text: '-', color: SUBDUED, tip: 'Not included' },
		price: { weight: 600 },
		per: { color: SUBDUED, italic: true, weight: 400 },
	},
	columns: [
		cell('Membership'),
		cell('Basic'),
		cell(['Reader', { text: 'most chosen', color: PRIMARY, italic: true, weight: 400, break: true }]),
		cell('Family', { tip: 'Two adults and up to four children' }),
	],
	rows: [
		[cell('Borrowing')],
		[cell('Items at a time'), cell('5'), cell('15'), cell('40')],
		[cell('Loan period'), cell('2 weeks'), cell('4 weeks'), cell('4 weeks')],
		[cell('Renew online'), 'no', 'yes', 'yes'],
		[cell('Online')],
		[cell('E-books and audiobooks'), { use: 'some', tip: 'Two a month' }, 'yes', 'yes'],
		[cell('Newspaper archive'), 'no', 'yes', 'yes'],
		[cell('Language courses'), 'no', 'some', 'yes'],
		[cell('Rooms and events')],
		[cell('Study rooms'), 'no', { use: 'some', text: '2 h a week' }, 'yes'],
		[cell("Children's events"), 'no', 'no', 'yes'],
		[cell('Workshop tools'), 'no', 'yes', 'yes'],
		[
			cell('Price', { weight: 600 }),
			{ use: 'price', text: 'Free' },
			cell([{ use: 'price', text: '18' }, { use: 'per', text: 'a year', break: true }]),
			cell([{ use: 'price', text: '30' }, { use: 'per', text: 'a year', break: true }]),
		],
	],
	legend: ['yes', 'some', 'no'],
});

// Half a year of a library's loans by shelf and week, with the days it was open and the totals: the large table of
// the recipes, and the one the pins are tried on.
const SHELVES = [
	['Fiction', 'Ground', ['Crime', 'Romance', 'Fantasy', 'Science fiction', 'Historical fiction', 'Short stories', 'Poetry', 'Graphic novels', 'Large print']],
	[
		'Non-fiction',
		'First',
		['Travel', 'Cookery', 'Gardening', 'History', 'Science', 'Biography', 'Art', 'Music', 'Sport', 'Health', 'Local history', 'Languages'],
	],
	['Children', 'Ground', ['Picture books', 'First readers', 'Chapter books', 'Young adult', 'Comics', 'Facts for children']],
	['Media', 'Basement', ['Audiobooks', 'Films', 'Board games', 'Sheet music']],
];

// Days open in each of the 26 weeks: six, less in a week with a public holiday, none in the week of the stocktake.
const OPEN = [6, 6, 6, 6, 6, 6, 6, 6, 5, 6, 6, 6, 6, 4, 6, 6, 6, 0, 6, 6, 6, 5, 6, 6, 6, 6];

function loans() {
	const random = numbers(26);
	const totals = OPEN.map(() => 0);
	const rows = [
		[
			cell('Days open', { italic: true, color: SUBDUED }),
			{},
			...OPEN.map((days) => cell(String(days), days === 6 ? { color: SUBDUED } : { color: WARNING, tip: days ? 'A public holiday' : 'The stocktake' })),
			cell(String(OPEN.reduce((sum, days) => sum + days, 0)), { color: SUBDUED }),
		],
	];

	for (const [section, floor, shelves] of SHELVES) {
		rows.push([cell(section)]);

		for (const shelf of shelves) {
			const usual = 4 + Math.round(random() * 56);
			const counts = OPEN.map((days) => Math.round((usual * days * (0.6 + 0.8 * random())) / 6));
			counts.forEach((count, week) => (totals[week] += count));
			const sum = counts.reduce((all, count) => all + count, 0);
			const weeks = counts.map((count, week) => (OPEN[week] ? cell(String(count)) : 'shut'));
			rows.push([cell(shelf), cell(floor, { color: SUBDUED }), ...weeks, { use: 'total', text: counted(sum) }]);
		}
	}

	const all = totals.reduce((sum, count) => sum + count, 0);
	const total = (count) => ({ use: 'total', text: counted(count) });
	rows.push([{ use: 'total', text: 'Total' }, { use: 'total' }, ...totals.map(total), total(all)]);

	return wrap({
		shared: {
			total: { weight: 600, background: SHADED },
			shut: { text: '-', color: SUBDUED, tip: 'Closed for the stocktake' },
		},
		columns: [cell('Shelf'), cell('Floor'), ...OPEN.map((days, week) => cell(`Week ${week + 1}`)), cell('Total')],
		rows,
	});
}

const LOANS = loans();

// Cells: one kind a row, written as it is in the value and drawn. The lines of the first column are short enough for
// its width; the tooltip of a row label shows all of it, with a word on the kind.

/** JSON as the README writes it: a space after each colon and comma, and inside braces. */
function json(value) {
	if (Array.isArray(value)) return `[${value.map(json).join(', ')}]`;
	if (value && typeof value === 'object') {
		const entries = Object.entries(value);
		return entries.length ? `{ ${entries.map(([key, inner]) => `"${key}": ${json(inner)}`).join(', ')} }` : '{}';
	}
	return JSON.stringify(value);
}

const WIDE = 32;

/** The JSON of a value in lines of at most about WIDE characters, broken between the fields of objects and lists. */
function lines(value, end = '') {
	const flat = json(value) + end;
	if (flat.length <= WIDE || value === null || typeof value !== 'object') return [flat];

	const list = Array.isArray(value);
	const entries = list ? value.map((inner) => [null, inner]) : Object.entries(value);
	const inner = entries.flatMap(([key, item], index) => {
		const rest = lines(item, index < entries.length - 1 ? ',' : '');
		if (key === null) return rest;
		const head = `"${key}": ${rest[0]}`;
		return head.length <= WIDE ? [head, ...rest.slice(1)] : [`"${key}":`, ...rest];
	});

	inner[0] = `${list ? '[' : '{ '}${inner[0]}`;
	inner[inner.length - 1] += `${list ? ']' : ' }'}${end}`;
	return inner;
}

/** The first cell of a row of the gallery: how the cell is written, a line a part, with a word on it in the tooltip. */
function written(value, tip) {
	const [first, ...rest] = lines(value);
	return { text: [first, ...rest.map((line) => ({ text: line, break: true }))], ...(tip ? { tip } : {}) };
}

const KINDS = [
	['Text', 'notes', [
		[{ text: 'Opening hours' }],
		[{ text: 1204 }, 'A number is shown as it is written. Format it yourself, such as "1,204".'],
		[{ text: '<b>not</b> *bold*' }, 'Markup and Markdown are shown as text.'],
	]],
	['Colour and type', 'palette', [
		[{ text: 'Overdue', color: '#E35169' }, 'A hex colour is the same in the light and the dark theme.'],
		[{ text: 'Due soon', color: WARNING }, 'A theme variable follows the theme.'],
		[{ text: 'Late', background: '#E3516926' }, 'A translucent background lies over the cell, which stays readable when pinned.'],
		[{ text: 'Reserved', background: 'var(--theme--primary-background)' }, 'The soft backgrounds of the theme suit whole cells.'],
		[{ text: 'Total', weight: 700 }, 'From 1 to 1000. 400 is normal and 700 bold.'],
		[{ text: 'estimated', italic: true }],
	]],
	['Icons', 'category', [
		[{ icon: 'check_circle', color: SUCCESS }, 'Any name of Material Symbols.'],
		[{ icon: 'schedule', text: 'Due Friday' }],
	]],
	['Parts', 'view_column', [
		[{ text: [{ text: '2.4.0', weight: 600 }, { text: 'beta', color: '#6644FF' }] }, 'Parts sit side by side, a space apart.'],
		[{ text: [{ text: '12 copies', weight: 600 }, { text: '3 on loan', break: true }] }, 'A part with "break" starts a new line.'],
		[{ text: [{ use: 'up', text: '+4' }, { use: 'down', text: '-1' }] }, 'Each part can start from a shared cell.'],
	]],
	['Shared cells', 'share', [
		['done', 'A string is the name of a cell in "shared".'],
		[{ use: 'done', text: 'Done Monday' }, 'A field of its own wins over the shared one.'],
		[{ use: 'done', color: null }, 'null takes away what the shared cell had.'],
	]],
	['Links', 'link', [
		[{ text: 'Sourdough', link: product(1) }, 'Opens the product in a drawer, view-only.'],
		[{ text: 'Plain text', link: { collection: 'demo_json_table_none', id: '1' } }, 'No such collection, so the text is not a link.'],
		[{ text: 'Opens nothing', link: product(99) }, 'No such item: Directus says that it may not be accessed.'],
		[{ icon: 'open_in_new', link: product(2) }, 'A link needs text, so this cannot be clicked.'],
	]],
	['Tooltips and empty cells', 'more_horiz', [
		[{ text: 'Point here', tip: 'Shown after both labels' }, 'The tooltip of a cell starts with the labels of its column and row.'],
		[{}, 'An empty cell.'],
	]],
];

const GALLERY = wrap({
	shared: {
		done: { icon: 'check_circle', color: SUCCESS, tip: 'Done' },
		up: { icon: 'add_circle', color: SUCCESS },
		down: { icon: 'remove_circle', color: DANGER },
	},
	columns: [cell('Written as'), cell('Drawn')],
	rows: KINDS.flatMap(([heading, icon, kinds]) => [[cell(heading, { icon })], ...kinds.map(([value, tip]) => [written(value, tip), value])]),
	legend: ['done', { icon: 'schedule', text: 'Due', tip: 'A cell written in the legend itself, not in shared' }],
});

// Column labels: a sprint board, the same in all four fields.
const SPRINT = wrap({
	shared: {
		done: { icon: 'check_circle', color: SUCCESS, tip: 'Done' },
		doing: { icon: 'pending', color: PRIMARY, tip: 'In progress' },
		next: { icon: 'radio_button_unchecked', color: SUBDUED, tip: 'Not started' },
		blocked: { icon: 'block', color: DANGER, background: '#E3516926', tip: 'Blocked' },
	},
	columns: [cell('Task'), cell('Design'), cell('Build'), cell('Review'), cell('Release')],
	rows: [
		[cell('Sign-up form'), 'done', 'done', 'doing', 'next'],
		[cell('Password reset'), 'done', 'doing', 'next', 'next'],
		[cell('Export to CSV'), 'doing', 'next', 'next', 'next'],
		[cell('Dark theme'), 'done', 'done', 'done', 'done'],
		[cell('Search filters'), 'done', 'done', 'done', 'next'],
		[cell('Email reminders'), 'done', { use: 'blocked', tip: 'Blocked: waiting for a test mail server' }, 'next', 'next'],
	],
	legend: ['done', 'doing', 'next', 'blocked'],
});

// Values and states

// A year of visitors by day and hour: a table large enough to be worth compressing.
function visitors() {
	const random = numbers(2025);
	const busy = [8, 14, 22, 26, 18, 16, 20, 28, 24, 12];
	const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const rows = [];

	for (const date = new Date(Date.UTC(2025, 0, 1)); date.getUTCFullYear() === 2025; date.setUTCDate(date.getUTCDate() + 1)) {
		if (date.getUTCDate() === 1) rows.push([cell(`${months[date.getUTCMonth()]} 2025`)]);
		const day = `${days[date.getUTCDay()]} ${date.getUTCDate()}`;

		if (date.getUTCDay() === 0) {
			rows.push([cell(day, { color: SUBDUED }), ...busy.map(() => 'shut'), 'shut']);
			continue;
		}

		const counts = busy.map((usual) => Math.round(usual * (0.5 + random())));
		rows.push([cell(day), ...counts.map((count) => ({ text: count })), { use: 'total', text: counts.reduce((sum, count) => sum + count, 0) }]);
	}

	return {
		shared: {
			total: { weight: 600, background: SHADED },
			shut: { text: '-', color: SUBDUED, tip: 'Closed on Sundays' },
		},
		columns: [cell('Day'), ...busy.map((usual, hour) => cell(`${hour + 9}:00`)), cell('Total')],
		rows,
	};
}

const VISITORS = visitors();
const YEAR = JSON.stringify(VISITORS);
const PACKED = gzipSync(YEAR).toString('base64');
const kb = (text) => `${Math.round(text.length / 1024)} KB`;

const OPENING_HOURS = wrap({
	columns: [cell('Day'), cell('Opens'), cell('Closes')],
	rows: [
		...['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => [cell(day), cell('9:00'), cell('19:00')]),
		[cell('Saturday'), cell('10:00'), cell('17:00')],
		[cell('Sunday'), cell('Closed', { italic: true, color: SUBDUED }), {}],
	],
});

const LONG =
	'The reading room is open to everyone with a library card. Please keep phones on silent, leave large bags in the lockers ' +
	'by the stairs, and put books you have read on the trolley by the door, not back on the shelves, so that they can be counted.';

const RECIPES = [
	sheet('price_list', 'Price list', {
		note:
			'A price list with headings, icons, a legend and links: a click on an item opens it from Products, under this demo in the navigation, ' +
			'in a drawer, view-only.',
		options: {},
		value: PRICE_LIST,
	}),
	sheet('timetable', 'Timetable', {
		note: 'Rooms by the hour, with backgrounds from the theme. Ten columns do not fit across, so their labels turn on their side.',
		options: {},
		value: TIMETABLE,
	}),
	sheet('comparison', 'Comparison', {
		note: 'Plans side by side, with a label and a price of two lines each.',
		options: {},
		value: COMPARISON,
	}),
	sheet('loans', 'Large table, totals pinned', {
		note:
			`A report of ${LOANS.data.rows.length} rows by ${LOANS.data.columns.length} columns. It scrolls inside 400 pixels, ` +
			'and the Total column and row stay in view with the labels of the rows and columns.',
		options: { maxHeight: 400, stickyRight: 1, stickyBottom: 1 },
		value: LOANS,
	}),
];

const CELLS = [
	sheet('gallery', 'Every kind of cell', {
		note: 'Point at a row label for all of it and a word on the kind. The headings are rows with a single cell.',
		options: {},
		value: GALLERY,
	}),
];

const LABELS = [
	sheet('labels_full', 'Automatic, full width', {
		note: 'In a wide window the columns fit across the field, so the labels are written across. A narrower window turns them.',
		options: {},
		value: SPRINT,
	}),
	sheet('labels_half', 'Automatic, half width', {
		note: 'The same table in half the width: the columns do not fit, so the labels turn on their side.',
		width: 'half',
		options: {},
		value: SPRINT,
	}),
	sheet('labels_across', 'Across, half width', {
		note: 'Across whatever the width: the table scrolls sideways.',
		width: 'half',
		options: { columnLabels: 'across' },
		value: SPRINT,
	}),
	sheet('labels_rotated', 'On their side', {
		note: 'On their side although the columns would fit across. The table is then narrower than the field, so it is stretched to fill it.',
		options: { columnLabels: 'rotated' },
		value: SPRINT,
	}),
];

const PINS = [
	sheet('pins_page', 'No maximum height', {
		note:
			'Without a maximum height the page scrolls, not the table, so rows cannot be pinned: ' +
			'the Total column stays in view while the table scrolls sideways, and the Total row does not.',
		options: { stickyRight: 1, stickyBottom: 1 },
		value: LOANS,
	}),
	sheet('pins_all', 'Two deep, all four edges', {
		note: 'Shelf and floor, the labels and the days open, the Total column and the Total row stay in view.',
		options: { maxHeight: 400, stickyLeft: 2, stickyRight: 1, stickyTop: 2, stickyBottom: 1 },
		value: LOANS,
	}),
	sheet('pins_none', 'Nothing pinned', {
		note: 'Even the labels of the rows and columns scroll away.',
		options: { maxHeight: 400, stickyLeft: 0, stickyTop: 0 },
		value: LOANS,
	}),
	sheet('pins_many', 'More than fits', {
		note:
			'A height under 320 counts as 320, and the ten pins asked for at each edge are cut back ' +
			'until the columns cover at most two thirds of the width, and the rows two thirds of the height.',
		options: { maxHeight: 100, stickyLeft: 10, stickyRight: 10, stickyTop: 10, stickyBottom: 10 },
		value: LOANS,
	}),
];

const STATES = [
	sheet('empty', 'No value', {
		note: 'A field which holds `null` shows the placeholder.',
		options: {},
		value: null,
	}),
	sheet('empty_own', 'No value, own placeholder', {
		options: { placeholder: 'The nightly report has not run yet' },
		value: null,
	}),
	sheet('invalid', 'A value which breaks the format', {
		note: 'A colour name is not a colour of the format. Nothing is drawn, and the field says what is wrong and where.',
		options: {},
		value: wrap({ columns: [cell('Shelf'), cell('Loans')], rows: [[cell('Crime'), cell('34')], [cell('Travel'), cell('12', { color: 'red' })]] }),
	}),
	sheet('long_text', 'Very long text', {
		note: 'A line never wraps: it ends in an ellipsis where its cell does. The tooltip of a row label shows the text, cut at 200 characters.',
		options: {},
		value: wrap({
			columns: [cell('Rule'), cell('Room')],
			rows: [
				[cell(LONG), cell('Reading room')],
				[cell('Tools are lent at the desk.'), cell('Workshop')],
			],
		}),
	}),
	sheet('compressed', 'Compressed, a whole year', {
		note:
			`${VISITORS.rows.length} rows of ${VISITORS.columns.length} columns, stored as gzip in base64: ` +
			`${kb(PACKED)} instead of ${kb(YEAR)}. The browser unpacks it.`,
		options: { maxHeight: 400, stickyRight: 1 },
		value: { version: 1, encoding: 'gzip', data: PACKED },
	}),
	sheet('readonly', 'Read-only', {
		note:
			'As a project would set it up. It looks the same, since the interface never edits; ' +
			'only the menu under its name offers View Raw Value in place of Edit Raw Value.',
		readonly: true,
		options: {},
		value: OPENING_HOURS,
	}),
];

const demo = collection('demo_json_table', {
	name: 'JSON Table',
	icon: 'table_chart',
	note: 'The JSON Table interface with every option, and the cells a value can hold',
	singleton: true,
	about:
		'**JSON Table** draws a table which a JSON field holds cell by cell: a header row, rows with headings between them, ' +
		'cells with text, icons, colours and links, and a legend. Something else writes the value, such as a flow or a script, ' +
		'and the interface only reads it. Its options only lay the table out, so most fields here differ in their value. ' +
		'They are not read-only, so a value can be tried with **Edit Raw Value** in the menu under the name of a field; ' +
			'in a project, turn Read-only on.',

	fields: [
		group('recipes', 'Recipes', { open: true, icon: 'menu_book' }, RECIPES),
		group('cells', 'Cells', { icon: 'palette', text: 'What a value can hold, a kind of cell a row. `docs/format.md` is the full reference.' }, CELLS),
		group('labels', 'Column labels', { icon: 'text_rotate_up', text: 'The same table four times. Across, a column is 7.5rem wide.' }, LABELS),
		group('pins', 'Pinned rows and columns', { icon: 'push_pin', text: 'The large table of the recipes with other pins.' }, PINS),
		group('states', 'Values and states', { icon: 'rule' }, STATES),
	],
});

// The products the links open, under the demo in the navigation.
const products = collection(PRODUCTS, {
	name: 'Products',
	icon: 'bakery_dining',
	note: 'The items which the tables of the JSON Table demo link to',
	supports: demo.collection,
	about: 'The products which the tables of **JSON Table** link to. A link opens one in a drawer, view-only.',
	template: '{{name}}',
	fields: [
		field('name', 'Name', { interface: 'input', width: 'half', describe: false }),
		field('kind', 'Kind', { interface: 'input', width: 'half', describe: false }),
		field('description', 'Description', { type: 'text', interface: 'input-multiline', describe: false }),
	],
	items: BAKERY.map(([id, name, kind, description]) => ({ id, name, kind, description })),
});

export default [demo, products];
