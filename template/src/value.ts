// The part of the interface which needs no Vue, DOM or Directus: the unit
// tests run it in Node. Keep such code in files of its own.

/** What the field stores for what was typed: the text, or `null` when there is none. */
export function clean(value: unknown): string | null {
	return typeof value === 'string' && value !== '' ? value : null;
}
