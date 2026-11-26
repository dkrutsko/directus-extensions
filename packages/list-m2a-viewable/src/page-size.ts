// The part of the wrapper which needs no Vue, DOM or Directus: the page size
// it hands the stock component, and what a stock component is mounted for
// (its mode and its item). The unit tests run this file in Node.

/** Per Page of a field which never set it: the default of the stock prop (`app/src/interfaces/list-m2a/list-m2a.vue:53`). */
export const EDIT_PAGE_SIZE = 15;

/**
 * "All items". The API reads a limit of -1 as no limit, and the stock code
 * which pages the items not saved yet does too
 * (`app/src/composables/use-relation-multiple.ts:743`).
 */
export const ALL_ITEMS = -1;

/**
 * A page size out of a stored option, or `fallback` where the option holds
 * none. Options are stored JSON, so anything can arrive: null, text, zero, a
 * negative number, a fraction. Only a whole number from 1 up counts, as a
 * number or as its text.
 *
 * Text is read by `Number()` and not by `parseInt`, which stops at the first
 * character it does not know and so makes 1 of "1e1" and 15 of "15abc".
 */
export function toPageSize(value: unknown, fallback: number): number {
	let read: number;

	if (typeof value === 'number') read = value;
	else if (typeof value === 'string' && value.trim() !== '') read = Number(value.trim());
	else return fallback;

	return Number.isSafeInteger(read) && read >= 1 ? read : fallback;
}

/**
 * The `limit` the stock component gets. While view-only it is the option
 * `viewLimit`, and everything by default, since the stock component hides
 * its pagination then. While editing it is `limit`, and never "all": the
 * stock component divides the number of items by it to count its pages.
 */
export function pageSize(viewOnly: boolean, limit: unknown, viewLimit: unknown): number {
	return viewOnly ? toPageSize(viewLimit, ALL_ITEMS) : toPageSize(limit, EDIT_PAGE_SIZE);
}

/** What one stock component is mounted for. Another mode or another item gets a stock component of its own. */
export interface Mount {
	/** True for view-only, false for editing. */
	viewOnly: boolean;
	/** The item the list belongs to: see `itemOf`. */
	item: string;
}

/**
 * The item of a form as text: its primary key and the key of its content
 * version, both as the form hands them to every interface
 * (`app/src/components/v-form/components/form-field-interface.vue:78,82`).
 *
 * The key of the version and not its id: a version which was not saved yet
 * has the id "+" and gets a real one with its first save
 * (`app/src/types/versions.ts:10`, `app/src/composables/use-versions.ts:217-228`),
 * which is still the same list.
 */
export function itemOf(primaryKey: unknown, version: unknown): string {
	const key = typeof version === 'object' && version !== null ? (version as { key?: unknown }).key : null;

	// JSON keeps the two apart whatever characters they hold. A primary key is text in the address of an item page
	// and a number elsewhere, so both are made text.
	return JSON.stringify([String(primaryKey ?? ''), String(key ?? '')]);
}

/**
 * What the stock component is mounted for, or null while that is not known.
 *
 * What a field is told during a load says nothing about it: the form
 * disables every field while its item loads
 * (`app/src/components/v-form/v-form.vue:225-235`), and the item page hands
 * out the primary key "+" (`app/src/modules/content/routes/item.vue:272-273`).
 * `last` is what was seen when the form was last not loading, and holds
 * through a load: the first one, where it is null, and every later one,
 * where the stock component stays as it is.
 */
export function mountOf(loading: boolean, now: Mount, last: Mount | null): Mount | null {
	return loading ? last : now;
}

/** The key of the stock component: a new one is mounted when the mode or the item changes. */
export function keyOf(mount: Mount): string {
	return `${mount.viewOnly ? 'view' : 'edit'} ${mount.item}`;
}
