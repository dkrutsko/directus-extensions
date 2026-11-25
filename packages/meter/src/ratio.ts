import { shallowRef } from 'vue';
import type { ShallowRef } from 'vue';

/**
 * How many device pixels the screen has to the CSS pixel, for bars which are
 * drawn in whole device pixels. One value for every meter of the page, kept
 * up to date by one listener: a table has a display in every row, and none of
 * them should watch anything of its own. The ratio changes when the page is
 * zoomed and when the window moves to another screen; the browser says so
 * through a media query for the ratio as it is, which has to be asked again
 * after every change.
 */
const ratio = shallowRef(1);
let watched: MediaQueryList | null = null;

function read() {
	const now = typeof window === 'undefined' ? 1 : window.devicePixelRatio;
	ratio.value = Number.isFinite(now) && now > 0 ? now : 1;

	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

	watched?.removeEventListener('change', read);
	watched = window.matchMedia(`(resolution: ${ratio.value}dppx)`);
	watched.addEventListener('change', read);
}

/** The device pixel ratio of the page, which follows a zoom. Read it while rendering or in a computed value. */
export function useRatio(): Readonly<ShallowRef<number>> {
	if (watched === null) read();
	return ratio;
}
