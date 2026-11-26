/**
 * What the component draws, worked out from a checked table and the options.
 *
 * `table.ts` says what a value holds. This file says how it is laid out: the
 * defaults and limits of the options, what each cell shows and says in its
 * tooltip, which rows belong to which heading, and which rows and columns are
 * pinned where. The component only measures the page and hands the sizes in.
 *
 * Nothing here touches Vue, the DOM or the Directus stores, so the unit tests
 * run it in Node as it is. The one question which needs Directus, whether the
 * user may read a collection, is asked through a function which is passed in.
 */

import { linkTarget } from './table';
import type { Cell, Link, Piece, Pins, Table } from './table';

// The options and what each comes to while it is not set. `index.ts` shows
// the same values in the form of the options, and an option which was never
// saved arrives empty, so the defaults are needed on both sides.
export const COLUMN_LABELS = ['auto', 'rotated', 'across'] as const;
export const DEFAULT_COLUMN_LABELS: ColumnLabels = 'auto';
export const DEFAULT_PLACEHOLDER = 'No table yet';
export const DEFAULT_HEIGHT = 0;
export const DEFAULT_STICKY = { left: 1, right: 0, top: 1, bottom: 0 };
export const MAX_STICKY = 10;

// A height limit lower than this would leave no room under a pinned header.
export const MIN_HEIGHT = 320;

// The header has two layouts. Labels are written across, or turned on their
// side over columns as narrow as their cells. With the Column Labels option on
// automatic they are written across while every column fits the width of the
// field. COLUMN_WIDTH is the least width of a column whose label is written
// across, in rem. Until the width has been measured, ROTATE_ABOVE decides.
// AGENTS.md has the measurements behind both.
export const COLUMN_WIDTH = 7.5;
export const ROTATE_ABOVE = 3;

export type ColumnLabels = (typeof COLUMN_LABELS)[number];

/** A number as an option holds it: the form stores a number, the API takes text as well. */
export type Count = number | string | null | undefined;

export type Style = Record<string, string>;

/** What the template needs to draw one piece of a cell: text with an icon in front of it, in one colour and one weight. */
export interface PieceView {
	text: string;
	icon: string | undefined;
	link: Link | null;
	class: string;
	// The colour, the weight and the slant.
	style: Style | undefined;
	// The tooltip of a piece whose tip is not the one of its cell, where the
	// piece is part of a label: its text, then its tip. An empty one keeps the
	// tooltip of the cell from showing over a piece which took the tip away.
	title: string | undefined;
}

/** One cell. A cell which the value shares by name is turned into one view, which every use of the name points at. */
export interface CellView {
	// What a cell of one piece shows. A <td> draws that without an element
	// for the piece.
	text: string;
	icon: string | undefined;
	link: Link | null;
	// The lines of a cell of several pieces, each with the pieces which sit
	// side by side on it. Then the same for any cell.
	lines: PieceView[][] | null;
	drawn: PieceView[][];
	class: string;
	// The background, and the background with the style of the one piece.
	fill: Style | undefined;
	box: Style | undefined;
	// All the text of the cell, for the tooltips of other cells.
	label: string;
	tip: string;
	// The tooltip of a label: its text, which may be cut off, then its tip.
	title: string | undefined;
	// What a cell without text is called for assistive technology: its tip,
	// or else what each of its pieces has to say, a tip of its own or the name
	// of its icon. A cell with text needs no name.
	name: string | undefined;
	// Whether a tip is part of the name. A row then places the name as it
	// places a tooltip.
	told: boolean;
	// The tips of the pieces, by line, with holes for those which have the tip
	// of the cell. Null when every piece has it.
	own: (string | undefined)[][] | null;
}

export interface RowView {
	// The table row it is, counting the header row as 0.
	line: number;
	// The first cell is the header of the row.
	first: CellView;
	cells: CellView[];
	// The tooltip of each of `cells`, for those with a tip.
	tips: (string | undefined)[];
	// The name of each of `cells` for assistive technology, for those without text.
	names: (string | undefined)[];
	// The tooltips of the pieces of a cell, by line, where they differ from
	// the cell's. Indexed like `cells`, with holes.
	pieceTips: (string | undefined)[][][];
}

/** A heading and the rows under it, up to the next heading. The rows before the first heading have none. */
export interface GroupView {
	heading: CellView | null;
	// The table row of the heading.
	line: number;
	rows: RowView[];
}

export interface TableView {
	columns: CellView[];
	groups: GroupView[];
	legend: CellView[];
	// The number of table columns, which a heading has to span.
	span: number;
	// The number of table rows: the header row, then one per row.
	lines: number;
}

/** An icon name as words: `check_circle` reads "check circle". */
const spoken = (icon: string): string => icon.replace(/_/g, ' ');

/**
 * Turns a checked table into what the template draws.
 *
 * `readable` says whether a collection exists and the user may read it. A
 * link is only offered then; everything else is shown as plain text. It is
 * asked once per collection.
 *
 * The one thing put together here is the tooltip. A header cell, a row header
 * and a heading show their text, which may be cut off, and then their tip.
 * Any other cell with a tip shows it after the text of its column header and
 * of its row header, because in a large table the two can be far away.
 */
export function buildView(table: Table, readable: (collection: string) => boolean): TableView {
	const allowed = new Map<string, boolean>();

	const target = (link: Link | undefined): Link | null => {
		if (!link) return null;

		let known = allowed.get(link.collection);

		if (known === undefined) {
			known = readable(link.collection);
			allowed.set(link.collection, known);
		}

		return known ? linkTarget(link) : null;
	};

	const pieceView = (piece: Piece, cellTip: string | undefined): PieceView => {
		const text = piece.text ?? '';
		const tip = piece.tip ?? '';
		const style: Style = {};

		if (piece.color) style['color'] = piece.color;
		if (piece.weight !== undefined) style['fontWeight'] = String(piece.weight);
		if (piece.italic) style['fontStyle'] = 'italic';

		return {
			text,
			icon: piece.icon,
			// A link is the text made into a button, so without text there is none.
			link: text ? target(piece.link) : null,
			class: text ? 'jt-text' : '',
			style: Object.keys(style).length > 0 ? style : undefined,
			title: cellTip === undefined || tip === cellTip ? undefined : [text, tip].filter(Boolean).join('\n'),
		};
	};

	const views = new Map<Cell, CellView>();

	const view = (cell: Cell): CellView => {
		let known = views.get(cell);

		if (!known) {
			const tip = cell.tip ?? '';
			const lines = cell.lines?.map((line) => line.map((piece) => pieceView(piece, tip))) ?? null;
			const only = lines ? null : pieceView(cell, undefined);
			const drawn = lines ?? (only ? [[only]] : []);
			const pieces = drawn.flat();
			const label = pieces
				.map((piece) => piece.text)
				.filter(Boolean)
				.join(' ');

			// What the cell says without text. A cell without a tip can still
			// have pieces with tips of their own, which the name must not hide:
			// they are only tooltips, and the name is read in their place.
			const parts = cell.lines?.flat() ?? [cell];
			const said = tip ? [tip] : parts.map((piece) => piece.tip || (piece.icon ? spoken(piece.icon) : ''));
			const own = cell.lines?.map((line) => line.map((piece) => ((piece.tip ?? '') === tip ? undefined : (piece.tip ?? ''))));

			// The value's background is laid over the cell's own (.jt-fill).
			const fill = cell.background ? { '--jt-fill': cell.background } : undefined;
			const classes = [];

			if (label || lines) classes.push('jt-text');
			if (fill) classes.push('jt-fill');

			known = {
				text: only?.text ?? '',
				icon: only?.icon,
				link: only?.link ?? null,
				lines,
				drawn,
				class: classes.join(' '),
				fill,
				box: only?.style || fill ? { ...only?.style, ...fill } : undefined,
				label,
				tip,
				title: (label && tip ? `${label}\n${tip}` : label || tip) || undefined,
				name: label ? undefined : said.filter(Boolean).join(', ') || undefined,
				told: tip !== '' || parts.some((piece) => piece.tip),
				own: own?.some((line) => line.some((entry) => entry !== undefined)) ? own : null,
			};

			views.set(cell, known);
		}

		return known;
	};

	const columns = table.columns.map(view);
	const groups: GroupView[] = [];
	let group: GroupView | undefined;

	table.rows.forEach((row, index) => {
		const [first, ...rest] = row.map(view);

		// A table without columns has rows without cells, and draws none of them.
		if (!first) return;

		if (row.length === 1 && columns.length > 1) {
			group = { heading: first, line: index + 1, rows: [] };
			groups.push(group);
			return;
		}

		if (!group) {
			group = { heading: null, line: 0, rows: [] };
			groups.push(group);
		}

		const pieceTips: (string | undefined)[][][] = [];
		const names: (string | undefined)[] = [];

		const tips = rest.map((cell, at) => {
			const place = [columns[at + 1]?.label, first.label].filter(Boolean).join(' - ');
			const placed = (tip: string) => (tip && place ? `${place}: ${tip}` : tip);

			// A piece with a tip of its own shows that one, placed the same way.
			if (cell.own) pieceTips[at] = cell.own.map((line) => line.map((tip) => (tip === undefined ? undefined : placed(tip))));

			// A cell which shows only an icon still has to say something. A name
			// made of tips is placed like them, and the name of an icon is not.
			names[at] = cell.name && cell.told ? placed(cell.name) : cell.name;

			return cell.tip ? placed(cell.tip) : undefined;
		});

		group.rows.push({ line: index + 1, first, cells: rest, tips, names, pieceTips });
	});

	return {
		columns,
		groups,
		legend: table.legend.map(view),
		span: columns.length,
		lines: table.rows.length + 1,
	};
}

/** The height limit in pixels which the Maximum Height option comes to, or null when the table is as tall as its rows. */
export function heightLimit(option: Count): number | null {
	const height = Number(option);

	return Number.isFinite(height) && height > 0 ? Math.max(height, MIN_HEIGHT) : null;
}

/** How many rows or columns an option asks to pin: a whole number from 0 to `most`, and `fallback` while it is not set. */
export function stickyCount(option: Count, fallback: number, most: number): number {
	const count = option === null || option === undefined || option === '' ? fallback : Math.floor(Number(option));

	return Math.min(Math.max(Number.isFinite(count) ? count : fallback, 0), MAX_STICKY, most);
}

export interface PinOptions {
	stickyLeft?: Count;
	stickyRight?: Count;
	stickyTop?: Count;
	stickyBottom?: Count;
	maxHeight?: Count;
}

export interface Wanted {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

/**
 * How many rows and columns the options ask to pin, in a table of `span`
 * columns and `lines` rows, the header row among them. A row or column is
 * pinned to one edge only, and the start comes first. Rows can only be pinned
 * when the height is limited: otherwise the table never scrolls up or down.
 */
export function wantedPins(options: PinOptions, span: number, lines: number): Wanted {
	const limited = heightLimit(options.maxHeight) !== null;
	const left = stickyCount(options.stickyLeft, DEFAULT_STICKY.left, span);
	const top = limited ? stickyCount(options.stickyTop, DEFAULT_STICKY.top, lines) : 0;

	return {
		left,
		right: stickyCount(options.stickyRight, DEFAULT_STICKY.right, span - left),
		top,
		bottom: limited ? stickyCount(options.stickyBottom, DEFAULT_STICKY.bottom, lines - top) : 0,
	};
}

/**
 * How many columns fit after the first one with their labels written across,
 * in a box `width` pixels wide whose first column takes `first` of them.
 */
export function fittingColumns(width: number, first: number, rem: number): number {
	return Math.max(0, Math.floor((width - first) / (COLUMN_WIDTH * rem)));
}

/**
 * Whether the column labels are turned on their side. `columns` counts the
 * first column, which holds the row labels and is never turned. `fitting` is
 * what `fittingColumns` found, or null before the first measurement.
 */
export function rotates(columnLabels: string | null | undefined, columns: number, fitting: number | null): boolean {
	if (columnLabels === 'rotated') return true;
	if (columnLabels === 'across') return false;

	return columns - 1 > (fitting ?? ROTATE_ABOVE);
}

export interface PinView {
	class: string;
	style: Style;
}

/**
 * The class and the offset of each pinned row or column: one entry per table
 * row or column, with holes for those which are not pinned. `count` is how
 * many rows or columns there are, and `edges` the offsets of the pinned ones
 * from their edge, outermost first. The innermost pin of an edge is marked, so
 * it can draw a line.
 */
export function pinViews(
	count: number,
	edges: Pins | undefined,
	classes: { start: string; end: string },
	property: { start: string; end: string },
): (PinView | undefined)[] {
	const views: (PinView | undefined)[] = [];
	if (!edges) return views;

	for (const edge of ['start', 'end'] as const) {
		edges[edge].forEach((offset, index) => {
			const innermost = index === edges[edge].length - 1;

			views[edge === 'start' ? index : count - 1 - index] = {
				class: innermost ? `${classes[edge]} jt-pin-edge` : classes[edge],
				style: { [property[edge]]: `${offset}px` },
			};
		});
	}

	return views;
}

/**
 * How much of each edge the pinned rows or columns cover, from the sizes of
 * the candidates which `fitPins` was given. Something which is scrolled into
 * view has to stop short of that, or it ends up under them.
 */
export function pinCover(pins: Pins, start: number[], end: number[]): { start: number; end: number } {
	const sum = (sizes: number[], count: number) => sizes.slice(0, count).reduce((all, size) => all + size, 0);

	return { start: sum(start, pins.start.length), end: sum(end, pins.end.length) };
}
