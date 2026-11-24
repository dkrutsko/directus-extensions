<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { useAppText } from './i18n';
import { chosen, focusTarget, isCompact, isInert, readSteps, revealOffset, trackOf } from './steps';

/**
 * The Steps interface.
 *
 * A box in the look of a stock input which holds the track: an ordered list
 * with one button per step, a marker with the label under it, joined by a
 * line. The steps before the current one are filled in, a click on a step
 * makes it the current one.
 *
 * The form passes `value`, `type`, `disabled`, `nonEditable` and `loading` to
 * every interface, the field's options as further props, and a good deal more
 * (app/src/components/v-form/components/form-field-interface.vue:60-85 in
 * Directus 11.17.4). Only what is declared here is used. Attributes do not
 * fall through, so the rest never ends up on the box.
 *
 * `disabled` and `nonEditable` follow the stock Radio Buttons
 * (app/src/components/v-radio.vue:96-112, 144-162): both make the steps
 * inert, and only `disabled` without `nonEditable` dims them. `nonEditable`
 * is what the form sets in the comparison of versions and revisions, where
 * the value has to stay readable.
 */
defineOptions({ inheritAttrs: false });

// `showLabels` has a default because Vue turns a boolean prop which is not
// passed into `false`, and a field without the option shows its labels.
const props = withDefaults(
	defineProps<{
		value?: unknown;
		type?: string;
		disabled?: boolean;
		nonEditable?: boolean;
		loading?: boolean;
		choices?: unknown;
		showLabels?: boolean | null;
	}>(),
	{ showLabels: true },
);

const emit = defineEmits<{ input: [value: string | number] }>();

const t = useAppText();
const id = useId();

const steps = computed(() => readSteps(props.choices, props.type, props.showLabels));
const track = computed(() => trackOf(steps.value, props.value, props.type));

// What the stock Radio Buttons say for a field without choices, in the same notice.
const noSteps = computed(() => t('no_options_available', 'No options available'));

// Without a label under any marker the box is the markers alone, as high as a stock input.
const compact = computed(() => isCompact(steps.value));

const inert = computed(() => isInert(props));
const dimmed = computed(() => props.disabled && !props.nonEditable);

// The line and the markers change colour softly only once a step was chosen
// by hand. Until then a change of state is the item arriving in the form,
// which would otherwise fade every track of the page in from nothing.
const animated = ref(false);

// The step which was last chosen with the pointer, by its key, until the form
// has handed its value back. A click made with Enter or Space counts no click
// (`detail` is 0), which is how the two are told apart.
let pointed: string | null = null;

// The form drops what a disabled field reports, but not in every case, so
// nothing is reported in the first place.
function choose(index: number, event: MouseEvent) {
	const step = steps.value[index];
	if (inert.value || !step) return;

	const value = chosen(step, props.value, props.type);
	if (value === undefined) return;

	pointed = event.detail > 0 ? step.key : null;
	animated.value = true;
	emit('input', value);
}

const list = ref<HTMLOListElement | null>(null);

const buttons = () => Array.from(list.value?.querySelectorAll<HTMLButtonElement>('.st-button') ?? []);

// The arrows, Home and End move the focus along the track and change no
// value. Which arrow is "onwards" comes from the direction the track is drawn
// in, whatever set it: the user's language, or a `dir` further up the page.
function onKeydown(event: KeyboardEvent) {
	if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !list.value) return;

	const all = buttons();
	const index = all.indexOf(event.target as HTMLButtonElement);
	if (index === -1) return;

	const target = focusTarget(event.key, index, all.length, getComputedStyle(list.value).direction === 'rtl');
	if (target === null) return;

	event.preventDefault();
	all[target]?.focus();
}

// A track with more steps than fit scrolls sideways inside the box, and the
// current step is brought into view by moving the track only: `scrollIntoView`
// would move the page as well. How far depends on how the step became the
// current one. A step chosen with the pointer has to stay under the pointer,
// or the second click of a double click lands on its neighbour: the track
// moves no further than it takes to show the step whole, which is not at all
// for a step that already is. Any other current step goes to the middle of
// what shows.
function reveal(centred: boolean) {
	const element = list.value;
	const item = element?.children[track.value.current];
	if (!element || !item) return;

	const outer = element.getBoundingClientRect();
	const inner = item.getBoundingClientRect();
	const offset = revealOffset({ start: inner.left, end: inner.right }, { start: outer.left, end: outer.right }, centred);

	if (Math.abs(offset) >= 1) element.scrollLeft += offset;
}

// A label which does not fit its two lines is cut. Not every step has a
// label, so the buttons are asked, one per step.
const cut = ref<boolean[]>([]);

function measure() {
	const next = buttons().map((button) => {
		const label = button.querySelector<HTMLElement>('.st-label');
		return label !== null && label.scrollHeight > label.clientHeight + 1;
	});

	if (next.length !== cut.value.length || next.some((flag, index) => flag !== cut.value[index])) cut.value = next;
}

// A tooltip with the name of the step, where the page does not show it in
// full: always on a step without a label, and on one whose label is cut.
// Never on a step which cannot be chosen.
function tooltipOf(index: number) {
	const step = steps.value[index];
	if (!step || inert.value) return null;

	return step.label === null || cut.value[index] ? step.name : null;
}

// The app's tooltip listens for the mouse only
// (app/src/directives/tooltip.ts:20-27). A step which is reached with the
// keyboard gets the same tooltip by being told that a mouse has arrived, and
// that it has left again: the directive's listeners are on the button, and
// neither event travels further. A click with the mouse focuses the button
// too, but then the mouse is there already.
function onFocus(event: FocusEvent) {
	const button = event.target as HTMLElement;
	if (button.matches('.st-button:focus-visible')) button.dispatchEvent(new MouseEvent('mouseenter'));
}

function onBlur(event: FocusEvent) {
	(event.target as HTMLElement).dispatchEvent(new MouseEvent('mouseleave'));
}

// The step the track was last moved for, by its key. The form hands over
// `null` for a moment around a save and then the same value again, and the
// options can change under a value: neither is a new current step, so the
// track stays where the user left it.
let shown: string | null = null;

watch(
	[steps, () => track.value.current],
	() => {
		measure();

		const key = steps.value[track.value.current]?.key ?? null;
		if (key === null || key === shown) return;

		reveal(key !== pointed);
		shown = key;
		pointed = null;
	},
	{ flush: 'post' },
);

// A change of the track's width changes what is cut and what is in view; its
// first measurement is the track being laid out. A change of its height alone
// is a label taking a second line, often because its step was just chosen,
// and must not move the track.
let width = 0;

function onResize() {
	measure();

	const now = list.value?.clientWidth ?? 0;
	if (now === width) return;

	width = now;
	reveal(true);
}

let observer: ResizeObserver | null = null;

// The list is there only while the field has steps, so it is watched rather
// than looked up once.
watch(
	list,
	(element) => {
		observer?.disconnect();
		if (element) observer?.observe(element);
	},
	{ flush: 'post' },
);

onMounted(() => {
	observer = new ResizeObserver(onResize);
	if (list.value) observer.observe(list.value);

	// A web font which arrives late changes where the labels wrap.
	void document.fonts?.ready.then(measure);
});

onBeforeUnmount(() => observer?.disconnect());

// The styles carry no comments: the build keeps the comments of a style block
// in the bundle, which every Data Studio page loads. What they rely on:
//
// - The box is a stock input in everything but its content, each property
//   from the token the inputs use (app/src/components/v-input.vue:412-433,
//   487-493 for the read-only look). The padding of an input is split between
//   the box and the buttons (`--st-inset`), which need room for the focus ring.
// - Every step has a column of the same width, so the line after a step, which
//   runs from the edge of its marker to the edge of the next, always joins two
//   markers. It is laid out along the inline axis, so it needs nothing for
//   right-to-left.
// - The app draws its focus ring on any button with keyboard focus
//   (app/src/styles/_base.scss:45-49). `--focus-ring-offset` turns it inwards,
//   where the scrolling track cannot cut it off.
// - A name the app's icon set does not have is drawn by `v-icon` as text, many
//   times wider than an icon. The two `overflow: hidden` on the marker and on
//   the icon keep it inside the circle.
// - A dimmed field draws what is primary at half strength, in the look of its
//   state. Upcoming markers and lines are quiet already and stay as they are.
// - The compact form is the height of a stock input by arithmetic: the track
//   is that height less the two borders, and the padding above a marker
//   (`--st-top`) is half of what the marker leaves. The marker is placed from
//   the top, not centred in its button, so it stays on the middle line of the
//   box when the track scrolls and the scrollbar takes the lower edge of the
//   track: the bar is thin enough there to fit under the markers, and the box
//   keeps its height. The focus ring is drawn round the marker instead of the
//   column, for the same reason: the lower edge of a ring round the column
//   would be under the scrollbar.
// - The warning is an English sentence, marked as one in the template, so it
//   reads from the left in a right-to-left page; the value in it can be in any
//   script and is isolated.
//
// The package's AGENTS.md, "How it works", has the rest.
</script>

<template>
	<v-notice v-if="steps.length === 0" class="steps-empty">{{ noSteps }}</v-notice>

	<div v-else class="steps" :class="{ 'st-compact': compact, 'st-inert': inert, 'st-dimmed': dimmed, 'st-animated': animated }">
		<ol ref="list" class="st-track" aria-label="Steps" @keydown="onKeydown" @focusin="onFocus" @focusout="onBlur">
			<li v-for="(step, index) in steps" :key="step.key" class="st-step" :class="`st-${track.states[index]}`">
				<button
					v-tooltip="tooltipOf(index)"
					class="st-button"
					type="button"
					:disabled="inert"
					:aria-label="step.label === null ? step.name : undefined"
					:aria-current="index === track.current ? 'step' : undefined"
					:aria-describedby="index < track.current ? `${id}-done` : undefined"
					@click="choose(index, $event)"
				>
					<span class="st-marker" aria-hidden="true">
						<v-icon v-if="step.icon" :name="step.icon" small />
						<span v-else v-text="step.position" />
					</span>
					<span v-if="step.label !== null" class="st-label" v-text="step.label" />
				</button>
			</li>
		</ol>

		<div v-if="track.unknown !== null" class="st-warning">
			<v-icon name="warning" small />
			<span lang="en" dir="ltr">
				The value
				<span class="st-value" v-text="track.unknown" />
				is not one of the steps.
			</span>
		</div>

		<span :id="`${id}-done`" hidden>Completed</span>
	</div>
</template>

<style scoped>
.steps {
	--st-marker: 2rem;
	--st-line: var(--theme--border-width);
	--st-inset: 0.25rem;
	--st-top: var(--st-inset);
	--st-column: 4.5rem;

	display: flex;
	flex-direction: column;
	gap: 0.375rem;
	padding: calc(var(--theme--form--field--input--padding) - var(--st-inset));
	color: var(--theme--form--field--input--foreground);
	background-color: var(--theme--form--field--input--background);
	border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
	border-radius: var(--theme--border-radius);
	box-shadow: var(--theme--form--field--input--box-shadow);
	transition: var(--fast, 125ms) var(--transition, ease);
	transition-property: border-color, box-shadow;
}

.steps:hover:not(.st-inert) {
	border-color: var(--theme--form--field--input--border-color-hover);
	box-shadow: var(--theme--form--field--input--box-shadow-hover);
}

.steps:focus-within:not(.st-inert) {
	border-color: var(--theme--form--field--input--border-color-focus);
	box-shadow: var(--theme--form--field--input--box-shadow-focus);
}

.steps.st-dimmed {
	color: var(--theme--foreground-subdued);
	background-color: var(--theme--form--field--input--background-subdued);
}

.st-track {
	display: grid;
	grid-auto-columns: minmax(var(--st-column), 1fr);
	grid-auto-flow: column;
	margin: 0;
	padding: 0;
	overflow: auto hidden;
	list-style: none;
	overscroll-behavior-inline: contain;
}

.st-track::-webkit-scrollbar {
	block-size: 0.5rem;
}

.st-track::-webkit-scrollbar-track {
	background-color: transparent;
}

.st-track::-webkit-scrollbar-thumb {
	background-color: var(--theme--foreground-subdued);
	border-radius: 0.25rem;
}

.st-track::-webkit-scrollbar-thumb:hover {
	background-color: var(--theme--form--field--input--foreground);
}

@supports not selector(::-webkit-scrollbar) {
	.st-track {
		scrollbar-color: var(--theme--foreground-subdued) transparent;
		scrollbar-width: thin;
	}
}

.st-step {
	position: relative;
	min-inline-size: 0;
}

.st-step:not(:last-child)::after {
	position: absolute;
	inset-block-start: calc(var(--st-top) + (var(--st-marker) - var(--st-line)) / 2);
	inset-inline-start: calc(50% + var(--st-marker) / 2);
	inline-size: calc(100% - var(--st-marker));
	block-size: var(--st-line);
	background-color: var(--theme--form--field--input--border-color);
	content: '';
	pointer-events: none;
}

.st-done:not(:last-child)::after {
	background-color: var(--theme--primary);
}

.st-button {
	--focus-ring-offset: var(--focus-ring-offset-invert, -2px);

	display: flex;
	flex-direction: column;
	gap: 0.375rem;
	align-items: center;
	inline-size: 100%;
	padding: var(--st-inset);
	color: inherit;
	text-align: center;
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.st-current .st-button {
	cursor: default;
}

.st-inert .st-button {
	cursor: not-allowed;
}

.st-marker {
	--v-icon-color: currentcolor;

	display: grid;
	flex: none;
	place-items: center;
	box-sizing: border-box;
	inline-size: var(--st-marker);
	block-size: var(--st-marker);
	color: var(--theme--foreground-subdued);
	font-weight: 700;
	line-height: 1;
	border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
	border-radius: 50%;
}

.st-marker,
.st-marker .v-icon {
	overflow: hidden;
}

.st-done .st-marker {
	color: var(--theme--form--field--input--background);
	background-color: var(--theme--primary);
	border-color: var(--theme--primary);
}

.st-current .st-marker {
	color: var(--theme--primary);
	background-color: var(--theme--primary-background);
	border-color: var(--theme--primary);
}

.st-label {
	display: -webkit-box;
	max-inline-size: 100%;
	overflow: hidden;
	line-height: 1.0625rem;
	overflow-wrap: anywhere;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
}

.st-current .st-label {
	color: var(--theme--primary);
	font-weight: 700;
}

.steps:not(.st-inert) .st-upcoming .st-button:hover .st-marker {
	color: var(--theme--primary);
	border-color: var(--theme--primary);
}

.steps:not(.st-inert) .st-done .st-button:hover .st-marker {
	background-color: var(--theme--primary-accent);
	border-color: var(--theme--primary-accent);
}

.st-dimmed .st-done .st-marker,
.st-dimmed .st-current .st-marker,
.st-dimmed .st-done::after {
	opacity: 0.5;
}

.st-dimmed .st-label {
	color: var(--theme--foreground-subdued);
}

.st-warning {
	display: flex;
	gap: 0.375rem;
	align-items: flex-start;
	padding-inline: var(--st-inset);
	color: var(--theme--form--field--input--foreground);
	line-height: 1.25rem;
	overflow-wrap: anywhere;
}

.st-warning .v-icon {
	--v-icon-color: var(--theme--warning);

	flex: none;
	margin-block-start: 0.0625rem;
}

.st-value {
	font-family: var(--theme--fonts--monospace--font-family);
	unicode-bidi: isolate;
}

.steps.st-compact {
	--st-inner: calc(var(--theme--form--field--input--height) - 2 * var(--theme--border-width));
	--st-top: max(var(--st-inset), calc((var(--st-inner) - var(--st-marker)) / 2));
	--st-column: 3rem;

	padding-block: 0;
}

.st-compact .st-track {
	block-size: max(var(--st-inner), calc(var(--st-marker) + 2 * var(--st-inset)));
}

.st-compact .st-track::-webkit-scrollbar {
	block-size: 0.375rem;
}

.st-compact .st-button {
	justify-content: flex-start;
	block-size: 100%;
	padding-block: var(--st-top) 0;
}

.st-compact .st-button:focus-visible {
	outline: none;
}

.st-compact .st-button:focus-visible .st-marker {
	outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, var(--theme--primary));
	outline-offset: 1px;
}

.st-compact .st-warning {
	padding-block-end: 0.5rem;
}

.st-animated .st-marker,
.st-animated .st-label,
.st-animated .st-step::after {
	transition: var(--medium, 200ms) var(--transition, ease);
	transition-property: color, background-color, border-color;
}

@media (prefers-reduced-motion: reduce) {
	.steps,
	.st-animated .st-marker,
	.st-animated .st-label,
	.st-animated .st-step::after {
		transition: none;
	}
}
</style>
