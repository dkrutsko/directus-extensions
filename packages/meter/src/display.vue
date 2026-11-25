<script setup lang="ts">
import { useStores } from '@directus/extensions-sdk';
import { computed } from 'vue';
import { useLanguage } from './i18n';
import { useRatio } from './ratio';
import { DISPLAY_WIDTH, PIECE_SIZES, barFit, drawingOf, fillScale, isEmpty, numberOf, pieceCount, reachOf, readLook, readOptions, readingOf, textOf, tooltipOf } from './meter';
import type { Paint } from './meter';

/**
 * The Meter display: a bar of a fixed length, filled as far as the value has
 * come in its range, and the value as text, on one line.
 *
 * The app hands a display the value, the collection and the key of the field
 * and the options of the field's interface, among other things, and the
 * display's own options as further props
 * (app/src/views/private/components/render-display.vue:28-37 in Directus
 * 11.17.4). Only what is declared here is used, and attributes do not fall
 * through, so the rest never ends up on the element.
 *
 * It is inline content: it sits in a table cell, in the title of a card and
 * between the other fields of a display template, and takes no more height
 * than the line it is on. Every bar is the same length, so the bars of a
 * column can be compared.
 *
 * The options are typed as `unknown`, not by what they should hold: they
 * arrive as the schema stores them, and a prop which Vue knows as a boolean
 * would turn a missing `indicator` into `false`, which could then not fall
 * back to the interface's.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps<{
	value?: unknown;
	collection?: string;
	field?: string;
	interfaceOptions?: unknown;
	min?: unknown;
	max?: unknown;
	label?: unknown;
	indicator?: unknown;
	indicatorFormat?: unknown;
	color?: unknown;
	thresholds?: unknown;
	visualization?: unknown;
	subdivisions?: unknown;
	dotsLayout?: unknown;
	fade?: unknown;
	activeColoring?: unknown;
	inactiveColoring?: unknown;
}>();

const language = useLanguage();

// The name of the field is the name of a meter without a caption. A display
// is only handed the key of its field, so the name comes from the app's store
// of fields; where that cannot be had, the meter is called a meter.
let fields: { getField?: (collection: string, field: string) => { name?: unknown } | null } | null = null;

try {
	fields = useStores()['useFieldsStore']();
} catch {
	fields = null;
}

const options = computed(() => readOptions(props, props.interfaceOptions));

const name = computed(() => {
	if (options.value.label !== null) return options.value.label;

	const field = props.collection && props.field ? fields?.getField?.(props.collection, props.field)?.name : null;
	return typeof field === 'string' && field.trim() !== '' ? field : 'Meter';
});

// The app draws its own placeholder for `null` and does not call a display
// for it. A numeric field holds nothing else which is not a number; on a
// field of another type the value is shown as the text it is, and blank text
// gets the app's placeholder.
const plain = computed(() => (numberOf(props.value) === null ? textOf(props.value) : null));
const blank = computed(() => isEmpty(props.value));

const reading = computed(() => readingOf(props.value, options.value, language()));
const tooltip = computed(() => tooltipOf(reading.value.text, options.value.label));

// A track which is cut into pieces. Nothing is measured here: the bar has one
// length, so the number of pieces which fit is the same in every row of a
// layout, by the same rule as in the form.
const look = computed(() => readLook(props, props.interfaceOptions));

// The ratio of the screen, by which bars are counted and drawn: one value which every display of the page shares,
// so no row watches anything.
const ratio = useRatio();
const count = computed(() => pieceCount(look.value, options.value, 'display', DISPLAY_WIDTH, ratio.value));
const drawing = computed(() =>
	drawingOf({ ...look.value, grow: 0 }, options.value, reading.value, count.value, props.value, { reach: reachOf(look.value.visualization, 'display', count.value, DISPLAY_WIDTH, 1, ratio.value) }),
);

const dots = computed(() => drawing.value.pieces !== null && look.value.visualization === 'dots');

// Bars are drawn in whole device pixels, as in the form (`barFit`).
const fit = computed(() => (look.value.visualization === 'bars' && count.value >= 2 ? barFit('display', count.value, DISPLAY_WIDTH, ratio.value) : null));
const packed = computed(() => dots.value && look.value.dotsLayout !== 'spread');

// On the root: the colour stops of the scale, for whichever surfaces paint
// with them, and the length of a row of packed dots, which is as long as its
// dots; the text has to know that length to know its own room.
const rootStyle = computed(() => {
	const { stops, weakStops, pieces } = drawing.value;
	const style: Record<string, string> = {};

	if (stops !== null) style['--md-stops'] = stops;
	if (weakStops !== null) style['--md-weak-stops'] = weakStops;

	if (packed.value && pieces !== null) {
		const { piece, gap } = PIECE_SIZES.display.dots;
		style['--md-bar'] = `${(pieces.length * (piece + gap) - gap) / 16}rem`;
	}

	return Object.keys(style).length ? style : undefined;
});

const paintClass = (paint: Paint) => (paint.scale === null ? undefined : paint.scale === 'weak' ? 'md-paint md-weak' : 'md-paint');

// What a surface is painted with, as an inline style: its one colour, or its place on the scale.
const paintStyle = (paint: Paint, at: number) => (paint.color !== null ? { backgroundColor: paint.color } : paint.scale !== null ? { '--md-at': at } : undefined);

// The fill of the one bar. Painted with the scale, it is the first part of an image as long as the bar.
const fillStyle = computed(() => {
	const { fill } = drawing.value;
	const inlineSize = `${reading.value.fraction * 100}%`;

	if (fill.scale !== null) return { inlineSize, '--md-n': fillScale(reading.value.fraction) };
	return fill.color !== null ? { inlineSize, backgroundColor: fill.color } : { inlineSize };
});

// The styles carry no comments, because the build keeps them in the bundle.
// The root is inline, as the stock text display is, so it is part of the line
// of a display template. A table cell lays its content out as a flex item,
// which makes the root a block as wide as the cell allows; only then do its
// `overflow` and `white-space` apply. The track is one unbreakable piece which
// keeps its length, and as the first thing on the line it is clipped by a cell
// narrower than itself. The fill is a block at the start of the track, so it
// needs nothing for right-to-left.
//
// The text is whole, or it is not shown: a number of which only a part shows
// reads as another number, whichever part it is, and with or without an
// ellipsis. Its box is an inline flex container which may wrap, one line high,
// with the room which the track and the gap leave (`100% - 5rem`). The first
// thing in it is a space without a width, which holds the first line; the
// number comes after it and stays on that line when it fits. When it does not,
// it goes to a second line, which the box cuts off. The box is a flex
// container and not an inline block because a box which cuts sits on a line by
// its lower edge, which makes the line taller and the number stand too high; a
// flex container sits by the first line of its first item, the space. The
// height is the line height (`1lh`), with the line height of a table cell for
// a browser which does not know the unit.
//
// A track which is cut up is a row of pieces in the place of the bar, one
// unbreakable piece like it and as long as it, 4.5rem. Pills, segments and
// bars share that length equally: pills 0.125rem apart with both ends round,
// segments 0.125rem apart with only the two outer ends of the row round, bars
// 0.0625rem apart and square. Bars do not share the length in the end: each
// is a whole number of device pixels wide, and so is each gap (`barFit` in
// meter.ts, handed to the row as `--md-bar-size` and `--md-gap`, with the
// class `md-fitted`), so that every bar is drawn as wide as every other; what
// is left of the 4.5rem is empty at the end side. Dots are 0.375rem across, smaller than the bar
// is high so that ten of them fit: packed they are 0.0625rem apart from the
// start, and the row is as long as its dots, which the root is told
// (`--md-bar`) for the room of the text; spread they stand from one end of
// the bar's length to the other. The gaps and the dot are those of
// `PIECE_SIZES` in meter.ts, by which the pieces are counted, with 16px to
// the rem.
//
// A surface which shows the colours of the scale (`md-paint`) works as in the
// interface: a gradient across the whole bar, `--md-n` times as wide as the
// surface and placed by `--md-at`, with the stops in `--md-stops` on the root
// and the faded ones in `--md-weak-stops`. A right-to-left page has its own
// rule, by `:dir(rtl)`, because a gradient has no logical direction. The
// fill of the one bar is the exception: its image is as long as the bar,
// 4.5rem, and not a multiple of the fill, so that no stop moves by a pixel
// when the value changes.
//
// The pieces of a display never grow (`grow` is the interface's alone): they
// are too small to be drawn smaller. The piece which fades in (`fade`) has
// one child (`md-over`) which covers it, painted as the piece will be once it
// is filled, at the opacity of how far the value has come into it. Only that
// one piece has a child and the class `md-under`. There is no transition in a
// display.
//
// In a display template the box is one piece, like the track: where it does
// not fit the line, the ellipsis of the template stands for it. The number
// itself is marked as running from the left (`dir="ltr"`): a number carries no
// direction of its own, and in a right-to-left page "-20%" would otherwise be
// laid out as "20%-". The gap between track and text is a margin of the track,
// whose direction is that of the page. A value which is not a number is plain
// text and is cut like any other text, with an ellipsis.
</script>

<template>
	<value-null v-if="blank" />

	<span v-else-if="plain !== null" class="meter-display md-plain" v-text="plain" />

	<span
		v-else
		v-tooltip="tooltip"
		class="meter-display"
		:style="rootStyle"
		role="meter"
		:aria-label="name"
		:aria-valuemin="options.min"
		:aria-valuemax="options.max"
		:aria-valuenow="reading.now ?? undefined"
		:aria-valuetext="reading.text"
	>
		<span
			v-if="drawing.pieces === null"
			class="md-track"
			:class="paintClass(drawing.track)"
			:style="drawing.track.color !== null ? { backgroundColor: drawing.track.color } : undefined"
		>
			<span v-if="reading.fraction > 0" class="md-fill" :class="paintClass(drawing.fill)" :style="fillStyle" />
		</span>
		<span
			v-else
			class="md-strip"
			:class="[`md-${look.visualization}`, { 'md-packed': packed, 'md-spread': dots && !packed, 'md-fitted': fit !== null }]"
			:style="fit === null ? { '--md-n': drawing.pieces.length } : { '--md-n': drawing.pieces.length, '--md-bar-size': `${fit.bar}px`, '--md-gap': `${fit.gap}px` }"
		>
			<span
				v-for="(piece, index) in drawing.pieces"
				:key="index"
				class="md-part"
				:class="[{ 'md-on': piece.filled, 'md-under': piece.over !== null }, paintClass(piece.paint)]"
				:style="paintStyle(piece.paint, piece.at)"
			>
				<span
					v-if="piece.over !== null"
					class="md-over"
					:class="paintClass(piece.over.paint)"
					:style="{ ...paintStyle(piece.over.paint, piece.at), opacity: piece.over.opacity }"
				/>
			</span>
		</span>
		<span v-if="options.indicator" class="md-text">
			<span dir="ltr" v-text="reading.text" />
		</span>
	</span>
</template>

<style scoped>
.meter-display {
	--md-height: 0.5rem;

	overflow: hidden;
	white-space: nowrap;
	vertical-align: middle;
}

.md-plain {
	text-overflow: ellipsis;
}

.md-track {
	display: inline-block;
	inline-size: 4.5rem;
	block-size: var(--md-height);
	overflow: hidden;
	vertical-align: middle;
	background-color: var(--theme--form--field--input--border-color);
	border-radius: calc(var(--md-height) / 2);
}

.md-fill {
	display: block;
	min-inline-size: var(--md-height);
	block-size: 100%;
	background-color: var(--theme--primary);
	border-radius: inherit;
}

.md-strip {
	display: inline-flex;
	gap: 0.125rem;
	inline-size: 4.5rem;
	block-size: var(--md-height);
	vertical-align: middle;
}

.md-bars {
	gap: 0.0625rem;
}

.md-fitted {
	gap: var(--md-gap);
}

.md-fitted .md-part {
	flex: none;
	inline-size: var(--md-bar-size);
}

.md-dots {
	--md-height: 0.375rem;

	gap: 0.0625rem;
}

.md-packed {
	inline-size: auto;
}

.md-spread {
	gap: 0;
	justify-content: space-between;
}

.md-part {
	flex: 1 1 0;
	min-inline-size: 0;
	background-color: var(--theme--form--field--input--border-color);
}

.md-pills .md-part {
	border-radius: calc(var(--md-height) / 2);
}

.md-segments .md-part:first-child {
	border-start-start-radius: calc(var(--md-height) / 2);
	border-end-start-radius: calc(var(--md-height) / 2);
}

.md-segments .md-part:last-child {
	border-start-end-radius: calc(var(--md-height) / 2);
	border-end-end-radius: calc(var(--md-height) / 2);
}

.md-dots .md-part {
	flex: none;
	inline-size: var(--md-height);
	border-radius: 50%;
}

.md-paint {
	background-image: linear-gradient(to right, var(--md-stops));
	background-repeat: no-repeat;
	background-position: calc(var(--md-at, 0) * 100%) 0;
	background-size: calc(var(--md-n, 1) * 100%) 100%;
}

.md-weak {
	background-image: linear-gradient(to right, var(--md-weak-stops));
}

.md-fill.md-paint {
	background-size: 4.5rem 100%;
}

.md-paint:dir(rtl) {
	background-image: linear-gradient(to left, var(--md-stops));
	background-position: calc((1 - var(--md-at, 0)) * 100%) 0;
}

.md-weak:dir(rtl) {
	background-image: linear-gradient(to left, var(--md-weak-stops));
}

.md-on {
	background-color: var(--theme--primary);
}

.md-under {
	position: relative;
}

.md-over {
	position: absolute;
	inset: 0;
	background-color: var(--theme--primary);
	border-radius: inherit;
}

.md-track:not(:last-child),
.md-strip:not(:last-child) {
	margin-inline-end: 0.5rem;
}

.md-text {
	display: inline-flex;
	flex-wrap: wrap;
	max-inline-size: calc(100% - var(--md-bar, 4.5rem) - 0.5rem);
	block-size: 1.25rem;
	block-size: 1lh;
	overflow: hidden;
	font-variant-numeric: tabular-nums;
}

.md-text::before {
	content: '\200B';
}
</style>
