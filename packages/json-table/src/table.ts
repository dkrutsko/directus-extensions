/**
 * The table format (version 1), its validator and the pure helpers.
 *
 * The field's value is plain table data: a header row, rows of cells and a
 * legend. Every cell says what it shows (text, an icon, a colour, a weight),
 * so nothing is worked out here: a table with totals simply has cells which
 * hold them. The table sits in `data`, either as it is or compressed with
 * gzip. `docs/format.md` describes the format for people who write values.
 *
 * Nothing in this file touches Vue, the DOM or the Directus stores, so the
 * unit tests run it in Node as it is. The value comes from a JSON field which
 * may hold text typed by anyone, so it is treated as untrusted: `parseValue`
 * checks every field and returns a fresh object holding only the known
 * fields. The component renders nothing else.
 */

export const VERSION = 1;

// Limits. A table beyond one of them is rejected, and not cut, so that nothing
// is ever left out without a word: the part left out could be the totals. Only
// text beyond MAX_TEXT_LENGTH is cut, and then ends in three dots.
export const MAX_COLUMNS = 200;
export const MAX_ROWS = 1000;
export const MAX_PARTS = 10;
export const MAX_TEXT_LENGTH = 200;

// The legend explains a handful of cells. Without a limit a value of a few
// hundred bytes, compressed, could ask for a million entries, each of which is
// drawn.
export const MAX_LEGEND = 200;

// The parts of all cells together. The limits above allow 200,000 cells of 10
// parts each, and every part is at least two elements in the page. A cell
// which is not a list of parts does not count.
export const MAX_TABLE_PARTS = 100_000;

// How long a chain of shared cells may be, each building on the next with
// `use`. Each step is a call inside a call, so a chain of thousands would run
// out of stack; no table needs more than a few.
export const MAX_SHARED_DEPTH = 32;

// The most a compressed table may be, packed or unpacked. A few bytes of gzip
// can unpack to gigabytes, so the unpacking stops here. For comparison, Directus
// accepts request bodies of 1 MB by default (MAX_PAYLOAD_SIZE,
// packages/env/src/constants/defaults.ts:12 in Directus 11.17.4).
export const MAX_UNPACKED_BYTES = 8 * 1024 * 1024;

// What the name of a Material Symbols icon looks like. Anything else is not
// handed to the icon font.
const MAX_ICON_LENGTH = 64;
const ICON_PATTERN = /^[a-z0-9_]+$/;

// A colour is a hex colour or one of the app's theme variables, and nothing
// else, so it can be handed to CSS as it is.
const MAX_COLOR_LENGTH = 80;
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const THEME_COLOR = /^var\(--theme(?:--?[a-z0-9]+)+\)$/;

export interface Link {
	collection: string;
	id: string;
}

// One piece of the content of a cell: text with an icon in front of it, in one
// colour and one weight.
export interface Piece {
	text?: string;
	icon?: string;
	color?: string;
	weight?: number;
	italic?: boolean;
	tip?: string;
	link?: Link;
}

export interface Cell extends Piece {
	background?: string;
	// A cell of several pieces, as the lines they are drawn on. The pieces of a
	// line sit side by side. Each piece is complete, so such a cell has no
	// text, icon, colour, weight, italic or link of its own. Its `tip` is the
	// one the pieces started from.
	lines?: Piece[][];
}

export interface Table {
	// The header row: one cell per table column.
	columns: Cell[];
	// Every row has one cell per column, except a heading, which has one cell.
	rows: Cell[][];
	legend: Cell[];
}

export type ParseResult =
	| { kind: 'empty' }
	| { kind: 'invalid'; error: string }
	// Checked, and within the limits.
	| { kind: 'valid'; table: Table };

class ValidationError extends Error {}

function fail(message: string): never {
	throw new ValidationError(message);
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Control characters and the line and paragraph separators (U+2028, U+2029)
// would break the one-line layout. The bidirectional embedding, override and
// isolate characters, and the marks which have a direction but no glyph
// (U+200E, U+200F, U+061C), can reorder the text around them: a label could be
// made to read as something else. Letters of right-to-left scripts are kept.
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g;
const BIDI_CONTROLS = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

function cleanText(text: string): string {
	return text.replace(CONTROL_CHARACTERS, ' ').replace(BIDI_CONTROLS, '');
}

/**
 * Cuts text to `max` characters, ending in three dots when something was cut.
 * Never leaves half of a surrogate pair (an emoji, for example) at the end.
 */
export function truncateText(text: string, max: number = MAX_TEXT_LENGTH): string {
	if (text.length <= max) return text;

	let cut = text.slice(0, Math.max(0, max - 3));
	const last = cut.charCodeAt(cut.length - 1);
	if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);

	return `${cut}...`;
}

// For quoting a value from the data inside an error message.
function quote(text: string): string {
	return `"${truncateText(cleanText(text), 40)}"`;
}

/**
 * The fields of a cell or of a part, checked, before anything is inherited.
 * A field is missing when it was left out and `null` when it was written as
 * `null`, which takes away what would otherwise be inherited. Layers are laid
 * over each other with a spread, so a later one wins field by field.
 */
interface Layer {
	// The parts are layers too: each is what its `use` gave, under its own fields.
	text?: string | Layer[] | null;
	icon?: string | null;
	color?: string | null;
	background?: string | null;
	weight?: number | null;
	italic?: boolean | null;
	tip?: string | null;
	link?: Link | null;
	// Only read on a part: true starts a new line with it.
	break?: boolean | null;
}

interface Shared {
	// The entries as they were written. A map, so that a name like
	// "constructor" is only ever a name.
	entries: Map<string, unknown>;
	layers: Map<string, Layer>;
	// The length of the longest chain of `use` which starts at each name.
	depths: Map<string, number>;
	// The deepest shared cell which the entry being worked out has used so far.
	deepest: number;
	// One cell per name, so every use of a name is the same object.
	cells: Map<string, Cell>;
	// The names being worked out, to catch an entry which leads back to itself.
	open: string[];
	// The parts of the cells checked so far (MAX_TABLE_PARTS).
	parts: number;
}

function readText(text: unknown, path: string, expected = 'a string or a number'): string | null {
	if (text === null) return null;

	// A number is welcome, since whoever writes a table has counts at hand.
	if (typeof text === 'number' && Number.isFinite(text)) return String(text);
	if (typeof text === 'string') return truncateText(cleanText(text));

	return fail(`${path} must be ${expected}`);
}

function readColor(color: unknown, path: string): string | null {
	if (color === null) return null;
	if (typeof color !== 'string') fail(`${path} must be a string`);

	if (color.length > MAX_COLOR_LENGTH || !(HEX_COLOR.test(color) || THEME_COLOR.test(color))) {
		fail(
			`${path} ${quote(color)} must be a hex colour such as #E35169 or a theme variable such as var(--theme--success)`,
		);
	}

	return color;
}

function readLink(link: unknown, path: string): Link | null {
	if (link === null) return null;
	if (!isObject(link)) fail(`${path} must be an object`);

	const { collection, id } = link;

	if (typeof collection !== 'string' || collection === '') {
		fail(`${path}.collection must be a non-empty string`);
	}

	if (typeof id !== 'string' || id === '') fail(`${path}.id must be a non-empty string`);

	return { collection, id };
}

/**
 * Checks the fields of a cell, or of one part of a cell, and lays them over
 * the shared cell it names with `use`, when it names one.
 */
function readFields(
	entry: Record<string, unknown>,
	path: string,
	shared: Shared,
	part: boolean,
): Layer {
	const { use, text, icon, color, background, weight, italic, tip, link } = entry;
	const breaks = entry['break'];
	const own: Layer = {};

	if (Array.isArray(text)) {
		if (part) fail(`${path}.text must be a string or a number: a part cannot hold parts`);

		if (text.length > MAX_PARTS) {
			fail(`${path}.text has ${text.length} parts, and a cell can have at most ${MAX_PARTS}`);
		}

		own.text = text.map((item, index) => readPart(item, `${path}.text[${index}]`, shared));
	} else if (text !== undefined) {
		own.text = readText(
			text,
			`${path}.text`,
			part ? 'a string or a number' : 'a string, a number or a list of parts',
		);
	}

	if (icon !== undefined) {
		if (icon !== null && typeof icon !== 'string') fail(`${path}.icon must be a string`);

		// A name which could be anything but a Material icon is no icon.
		const known = icon !== null && icon.length <= MAX_ICON_LENGTH && ICON_PATTERN.test(icon);
		own.icon = known ? icon : null;
	}

	if (color !== undefined) own.color = readColor(color, `${path}.color`);

	// A part is a piece of its cell and has no background of its own.
	if (background !== undefined && !part) {
		own.background = readColor(background, `${path}.background`);
	}

	if (weight !== undefined) {
		// As in CSS, where 400 is normal and 700 is bold.
		if (weight !== null && (typeof weight !== 'number' || !(weight >= 1 && weight <= 1000))) {
			fail(`${path}.weight must be a number from 1 to 1000`);
		}

		own.weight = weight;
	}

	if (italic !== undefined) {
		if (italic !== null && typeof italic !== 'boolean') {
			fail(`${path}.italic must be true or false`);
		}

		own.italic = italic;
	}

	if (tip !== undefined) {
		if (tip !== null && typeof tip !== 'string') fail(`${path}.tip must be a string`);
		own.tip = tip === null ? null : truncateText(cleanText(tip));
	}

	if (link !== undefined) own.link = readLink(link, `${path}.link`);

	if (breaks !== undefined) {
		if (breaks !== null && typeof breaks !== 'boolean') {
			fail(`${path}.break must be true or false`);
		}

		own.break = breaks;
	}

	if (use === undefined || use === null) return own;
	if (typeof use !== 'string') fail(`${path}.use must be the name of a shared cell`);

	const layer: Layer = { ...sharedLayer(use, `${path}.use`, shared), ...own };

	if (part) {
		if (Array.isArray(layer.text)) {
			fail(`${path}.use is ${quote(use)}, which has parts, and a part cannot hold parts`);
		}

		delete layer.background;
	}

	return layer;
}

// One entry of a `text` list. Here a string is text, not a name.
function readPart(entry: unknown, path: string, shared: Shared): Layer {
	if (typeof entry === 'string' || (typeof entry === 'number' && Number.isFinite(entry))) {
		return { text: readText(entry, path) };
	}

	if (!isObject(entry)) fail(`${path} must be text, a number or an object`);

	return readFields(entry, path, shared, true);
}

// The fields of the shared cell `name`. `path` is where the name was used.
function sharedLayer(name: string, path: string, shared: Shared): Layer {
	const known = shared.layers.get(name);

	if (known) {
		shared.deepest = Math.max(shared.deepest, shared.depths.get(name) ?? 1);
		return known;
	}

	if (!shared.entries.has(name)) fail(`${path} is ${quote(name)}, which is not a name in shared`);

	const from = shared.open.indexOf(name);

	if (from !== -1) {
		const circle = [...shared.open.slice(from), name].map(quote).join(' > ');
		fail(`shared[${quote(name)}] uses itself: ${circle}`);
	}

	const entry = shared.entries.get(name);
	const entryPath = `shared[${quote(name)}]`;
	if (!isObject(entry)) fail(`${entryPath} must be an object`);

	// A chain is too long whichever end it is read from. Read from its start,
	// the names pile up in `open` before any length is known; read from its
	// end, each entry is one longer than the one it uses. Both stop at the same
	// length, so the order of the names in `shared` does not matter.
	const tooLong = (start: string) =>
		fail(`shared[${quote(start)}] starts a chain of more than ${MAX_SHARED_DEPTH} shared cells, each using the next`);

	if (shared.open.length >= MAX_SHARED_DEPTH) tooLong(shared.open[0] ?? name);

	const outer = shared.deepest;
	shared.deepest = 0;

	shared.open.push(name);
	const layer = readFields(entry, entryPath, shared, false);
	shared.open.pop();

	const depth = shared.deepest + 1;
	if (depth > MAX_SHARED_DEPTH) tooLong(name);

	shared.layers.set(name, layer);
	shared.depths.set(name, depth);
	shared.deepest = Math.max(outer, depth);

	return layer;
}

// What is left of a layer once nothing more can be laid over it.
function toPiece(layer: Layer): Piece {
	const piece: Piece = {};

	if (typeof layer.text === 'string' && layer.text !== '') piece.text = layer.text;
	if (layer.icon) piece.icon = layer.icon;
	if (layer.color) piece.color = layer.color;
	if (typeof layer.weight === 'number') piece.weight = layer.weight;
	if (layer.italic) piece.italic = true;
	if (layer.tip) piece.tip = layer.tip;
	if (layer.link) piece.link = layer.link;

	return piece;
}

/**
 * Turns the fields of a cell into the cell. Each part starts from the fields
 * of its cell, without the text and the background, and becomes one piece. A
 * piece sits beside the one before it, unless its `break` is true: then it
 * starts a new line. A list with one part is the same as that part written as
 * the cell.
 */
function toCell(layer: Layer): Cell {
	const { text, background, ...rest } = layer;
	let cell: Cell;

	if (Array.isArray(text) && text.length > 0) {
		const parts = text.map((part) => ({ ...rest, ...part }));
		const [only] = parts;

		if (only && parts.length === 1) {
			cell = toPiece(only);
		} else {
			const lines: Piece[][] = [];
			let line: Piece[] | undefined;

			for (const part of parts) {
				if (!line || part.break) {
					line = [];
					lines.push(line);
				}

				line.push(toPiece(part));
			}

			cell = { lines };
			if (rest.tip) cell.tip = rest.tip;
		}
	} else {
		cell = toPiece(Array.isArray(text) ? rest : layer);
	}

	if (background) cell.background = background;

	return cell;
}

/**
 * Checks one cell. A cell is an object, or the name of a cell in `shared`,
 * which gives the same object back for every use of the name.
 */
function parseCell(entry: unknown, path: string, shared: Shared): Cell {
	let cell: Cell | undefined;

	if (typeof entry === 'string') {
		cell = shared.cells.get(entry);

		if (!cell) {
			cell = toCell(sharedLayer(entry, path, shared));
			shared.cells.set(entry, cell);
		}
	} else {
		if (!isObject(entry)) fail(`${path} must be an object or the name of a shared cell`);

		cell = toCell(readFields(entry, path, shared, false));
	}

	// Every use of a shared cell counts: each is drawn.
	if (cell.lines) {
		for (const line of cell.lines) shared.parts += line.length;

		if (shared.parts > MAX_TABLE_PARTS) {
			fail(`${path} brings the parts of all cells to more than ${MAX_TABLE_PARTS}, the most a table can have`);
		}
	}

	return cell;
}

function parseShared(table: Record<string, unknown>): Shared {
	const shared: Shared = {
		entries: new Map(),
		layers: new Map(),
		depths: new Map(),
		deepest: 0,
		cells: new Map(),
		open: [],
		parts: 0,
	};
	const entries = table['shared'];

	if (entries === undefined || entries === null) return shared;
	if (!isObject(entries)) fail('shared must be an object');

	for (const [name, entry] of Object.entries(entries)) shared.entries.set(name, entry);

	// Every entry is checked, whether the table uses it or not.
	for (const name of shared.entries.keys()) sharedLayer(name, 'shared', shared);

	return shared;
}

function requiredArray(object: Record<string, unknown>, key: string): unknown[] {
	const value = object[key];
	if (!Array.isArray(value)) fail(`${key} must be an array`);
	return value;
}

function parseCells(entries: unknown[], path: string, shared: Shared): Cell[] {
	return entries.map((entry, index) => parseCell(entry, `${path}[${index}]`, shared));
}

// Checks the table itself: what `data` holds, or unpacks to.
function checkTable(table: Record<string, unknown>): ParseResult {
	const columnEntries = requiredArray(table, 'columns');
	const rowEntries = requiredArray(table, 'rows');
	const legendEntries = table['legend'] === undefined || table['legend'] === null ? [] : requiredArray(table, 'legend');
	const width = columnEntries.length;

	// Counted before any cell is checked, so a table which is far too large
	// costs nothing.
	if (width > MAX_COLUMNS) {
		fail(`columns has ${width} cells, and a table can have at most ${MAX_COLUMNS} columns`);
	}

	if (rowEntries.length > MAX_ROWS) {
		fail(`rows has ${rowEntries.length} rows, and a table can have at most ${MAX_ROWS}`);
	}

	if (legendEntries.length > MAX_LEGEND) {
		fail(`legend has ${legendEntries.length} entries, and a table can have at most ${MAX_LEGEND}`);
	}

	const shared = parseShared(table);
	const columns = parseCells(columnEntries, 'columns', shared);

	const rows = rowEntries.map((entry, index) => {
		const path = `rows[${index}]`;
		if (!Array.isArray(entry)) fail(`${path} must be an array of cells`);

		// A row with a single cell is a heading which spans the table.
		if (entry.length !== width && (entry.length !== 1 || width === 0)) {
			fail(`${path} has ${entry.length} cells but there are ${width} columns`);
		}

		return parseCells(entry, path, shared);
	});

	const legend = parseCells(legendEntries, 'legend', shared);

	return { kind: 'valid', table: { columns, rows, legend } };
}

type Opened =
	| { kind: 'empty' }
	| { kind: 'table'; data: Record<string, unknown> }
	| { kind: 'gzip'; data: string };

// Checks the wrapper around the table: the version and how `data` is stored.
function open(value: unknown): Opened {
	let parsed: unknown = value;

	// Some databases hand a JSON column back as text.
	if (typeof parsed === 'string') {
		try {
			parsed = JSON.parse(parsed) as unknown;
		} catch {
			fail('The value is not valid JSON');
		}

		if (parsed === null) return { kind: 'empty' };
	}

	if (!isObject(parsed)) fail('The value must be an object');

	const { version, encoding, data } = parsed;

	if (version !== VERSION) {
		fail(
			typeof version === 'number' || typeof version === 'string'
				? `version ${quote(String(version))} is not supported, expected ${VERSION}`
				: `version must be ${VERSION}`,
		);
	}

	if (encoding === undefined || encoding === null) {
		if (typeof data === 'string') fail('data is text, which needs "encoding": "gzip"');
		if (!isObject(data)) fail('data must be an object');

		return { kind: 'table', data };
	}

	if (encoding !== 'gzip') {
		fail(
			typeof encoding === 'string'
				? `encoding ${quote(encoding)} is not supported, expected "gzip" or none`
				: 'encoding must be "gzip" or left out',
		);
	}

	if (typeof data !== 'string') fail('data must be a base64 string when encoding is "gzip"');

	return { kind: 'gzip', data };
}

/**
 * Unpacks a compressed table: base64, then gzip, then JSON. It uses what
 * browsers and Node have built in (DecompressionStream, atob, TextDecoder),
 * so there is no library. Unpacking stops at MAX_UNPACKED_BYTES.
 */
async function unpack(data: string): Promise<Record<string, unknown>> {
	const megabytes = MAX_UNPACKED_BYTES / (1024 * 1024);

	if (typeof DecompressionStream === 'undefined') {
		fail('This browser cannot unpack a compressed table');
	}

	if (data.length > MAX_UNPACKED_BYTES) fail(`data is larger than ${megabytes} MB`);

	let binary = '';

	try {
		// The URL-safe alphabet is accepted too.
		binary = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
	} catch {
		fail('data is not valid base64');
	}

	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);

	const reader = new Blob([bytes])
		.stream()
		.pipeThrough(new DecompressionStream('gzip'))
		.getReader();

	const decoder = new TextDecoder('utf-8', { fatal: true });
	let text = '';
	let size = 0;

	// The decoder throws on bytes which are not UTF-8, the reader on bytes
	// which are not gzip. Each has a message of its own.
	const decode = (chunk?: Uint8Array): string => {
		try {
			return chunk ? decoder.decode(chunk, { stream: true }) : decoder.decode();
		} catch {
			return fail('data does not unpack to UTF-8 text');
		}
	};

	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;

			size += value.byteLength;

			if (size > MAX_UNPACKED_BYTES) fail(`data unpacks to more than ${megabytes} MB`);

			text += decode(value);
		}

		text += decode();
	} catch (error) {
		if (error instanceof ValidationError) {
			// Stopped here on purpose, so the rest is not unpacked.
			void reader.cancel().catch(() => undefined);
			throw error;
		}

		fail('data is not valid gzip');
	}

	let table: unknown;

	try {
		table = JSON.parse(text) as unknown;
	} catch {
		fail('data does not unpack to valid JSON');
	}

	if (!isObject(table)) fail('data must unpack to an object');

	return table;
}

function invalid(error: unknown): ParseResult {
	return {
		kind: 'invalid',
		error: error instanceof ValidationError ? error.message : 'Unexpected error',
	};
}

/**
 * Checks a field value against the contract. Never throws and never rejects:
 * the result is the checked table, `empty` for a field without a value, or
 * the first problem found. A table which is not compressed
 * is checked at once. A compressed one has to be unpacked first, which takes
 * a moment, so the result is then a promise.
 */
export function parseValue(value: unknown): ParseResult | Promise<ParseResult> {
	if (value === null || value === undefined) return { kind: 'empty' };

	try {
		const opened = open(value);

		if (opened.kind === 'empty') return opened;
		if (opened.kind === 'table') return checkTable(opened.data);

		return unpack(opened.data).then(checkTable).catch(invalid);
	} catch (error) {
		return invalid(error);
	}
}

/**
 * The item a link opens, or null when the id cannot name an existing item.
 * The caller still has to check that the collection exists and that the user
 * can read it.
 */
export function linkTarget(link: Link): Link | null {
	// The drawer treats "+" as a new item (app/src/views/private/components/
	// overlay-item.vue:138,175 in Directus 11.17.4), and dot segments are
	// resolved away when the item is requested.
	if (link.id === '+' || link.id === '.' || link.id === '..') return null;

	return link;
}

// The share of the scroll area which pinned rows or columns may cover.
export const PIN_SHARE = 2 / 3;

export interface Pins {
	// The offset of each pinned row or column from its edge, outermost first.
	start: number[];
	end: number[];
}

/**
 * Works out which rows or columns can be pinned to the two edges of a scroll
 * area. `start` and `end` hold the sizes of the candidates, outermost first.
 * Candidates are taken from both edges in turn while everything pinned still
 * fits in PIN_SHARE of `available`, so the rest always has room to scroll. An
 * edge stops at its first candidate which does not fit.
 */
export function fitPins(start: number[], end: number[], available: number): Pins {
	const pins: Pins = { start: [], end: [] };
	const budget = available * PIN_SHARE;
	const used = { start: 0, end: 0 };
	const open = { start: true, end: true };

	for (let index = 0; open.start || open.end; index++) {
		for (const edge of ['start', 'end'] as const) {
			if (!open[edge]) continue;

			const size = (edge === 'start' ? start : end)[index];

			if (size === undefined || used.start + used.end + size > budget) {
				open[edge] = false;
				continue;
			}

			pins[edge].push(used[edge]);
			used[edge] += size;
		}
	}

	return pins;
}

/**
 * Says which columns stay as wide as their content when a table narrower than
 * its box is stretched to fill it: the first column and those which the
 * options ask to pin, `left` of them at the start and `right` at the end. They
 * hold labels and totals, so the extra width goes to the columns in between.
 * When no column would be left to take it, only the first column stays as it
 * is and the rest share the extra width.
 */
export function snugColumns(count: number, left: number, right: number): boolean[] {
	const snug = Array.from(
		{ length: count },
		(_, index) => index === 0 || index < left || index >= count - right,
	);

	return snug.every(Boolean) ? snug.map((_, index) => index === 0) : snug;
}
