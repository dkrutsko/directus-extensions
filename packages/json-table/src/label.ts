import { h } from 'vue';
import type { FunctionalComponent } from 'vue';
import type { Link } from './table';
import type { PieceView } from './view';

/**
 * The lines of a label: of a header cell, a row header, a heading or an entry
 * of the legend. Each line holds the pieces which sit side by side on it, and
 * a piece is its text, as a button when it has a link, with its icon in front
 * (the `data-icon` attribute, which the styles of interface.vue draw).
 *
 * A table has a few hundred labels at most, so a component for each costs
 * little. The body cells are not drawn with it: there can be 200,000 of them,
 * and interface.vue writes them out as plain cells.
 *
 * Text only ever becomes a text node here: a string handed to `h` as the
 * children of an element is never read as markup. Text which shares a line
 * sits in `<bdi>`, so a piece in a right-to-left script cannot reorder its
 * neighbours.
 *
 * `plain` draws every piece as text, for the legend: an entry explains a cell
 * and opens nothing.
 */
interface Props {
	lines: PieceView[][];
	plain?: boolean;
}

interface Emits {
	open: (link: Link) => void;
	[event: string]: (...args: any[]) => void;
}

const Label: FunctionalComponent<Props, Emits> = (props, { emit }) =>
	props.lines.map((line) =>
		h(
			'span',
			{ class: 'jt-line' },
			line.map((piece) => {
				const link = props.plain ? null : piece.link;

				return h('span', { class: ['jt-piece', piece.class], style: piece.style, 'data-icon': piece.icon, title: piece.title }, [
					link ? h('button', { class: 'jt-link', type: 'button', onClick: () => emit('open', link) }, piece.text) : h('bdi', piece.text),
				]);
			}),
		),
	);

Label.props = { lines: { type: Array, required: true }, plain: Boolean };
Label.emits = ['open'];

export default Label;
