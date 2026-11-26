// Helpers for writing a demo definition (packages/<name>/demo/demo.mjs, see ../README.md, "Demos"). Each returns
// what the REST API of Directus takes, so a definition reads as data and apply.mjs only has to send it.

/** The specials the app gives every field it creates of these types. Without `cast-boolean` SQLite hands back 0 or 1. */
const SPECIALS = { boolean: ['cast-boolean'], json: ['cast-json'], csv: ['cast-csv'] };

const ID = { field: 'id', type: 'integer', schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true, readonly: true } };

const DEMO = /^demo_[a-z0-9_]+$/;

const named = (name) => [{ language: 'en-US', translation: name }];

const code = (text) => `\`${text}\``;

/** A value as the README writes it: JSON with a space after each comma and colon, short enough to read in a note. */
function shown(value) {
	if (Array.isArray(value)) return `[${value.map(shown).join(', ')}]`;
	if (value && typeof value === 'object') return `{ ${Object.entries(value).map(([key, inner]) => `"${key}": ${shown(inner)}`).join(', ')} }`;
	return JSON.stringify(value);
}

// A list or an object longer than this is summed up in a note: a list of steps or a ruleset written out would bury
// the sentence above it, and Data Model shows all of it. Text is always written out, since it is what the field shows.
const LONG = 60;

/** What stands in a note for a long list or object: how many entries the list has and the keys they use, or the keys. */
function summary(value) {
	const keys = (entry) => (entry && typeof entry === 'object' && !Array.isArray(entry) ? Object.keys(entry) : []);
	const few = (list) => (list.length > 4 ? [...list.slice(0, 3).map(code), `${list.length - 3} more`] : list.map(code)).join(', ');

	if (!Array.isArray(value)) return `an object (${few(keys(value))})`;
	const used = [...new Set(value.flatMap(keys))];
	const count = `${value.length} ${value.length === 1 ? 'entry' : 'entries'}`;
	return used.length > 0 ? `${count} (${few(used)})` : count;
}

/** One option in a note: `key: value` as stored, or the key and a summary of a long value, or the definition's own words. */
function option(key, value, brief) {
	if (brief) return `${code(key)}: ${typeof brief === 'function' ? brief(value) : brief}`;
	const text = shown(value);
	return text.length > LONG && value && typeof value === 'object' ? `${code(key)}: ${summary(value)}` : code(`${key}: ${text}`);
}

const listed = (options, briefs = {}) =>
	Object.entries(options ?? {})
		.filter(([, value]) => value !== undefined)
		.map(([key, value]) => option(key, value, briefs[key]))
		.join(', ');

/**
 * The note under a demo field: the sentence of the definition, then every option the field sets, as stored. The form
 * renders a note as Markdown, so the options are code. Written from the options themselves, so it cannot drift. A long
 * list or object is summed up; `brief` gives other words for an option, by its key: Markdown, or a function of the value.
 */
export function settingsNote(sentence, { options, display_options: display, readonly, brief }) {
	const parts = sentence ? [sentence] : [];
	parts.push(listed(options, brief) ? `Options: ${listed(options, brief)}.` : 'No options: every one is at its default.');
	if (listed(display)) parts.push(`Display options: ${listed(display)}.`);
	if (readonly) parts.push('The field is read-only.');
	return parts.join(' ');
}

/**
 * A field. `name` is what the form shows, so it says what the field shows ("Dots, spread"). `spec` holds the `type`
 * (default `string`), `note` (one sentence before the settings), `brief` (see `settingsNote`), `value` (for the one
 * item a singleton has), `schema`, and anything else of the field's `meta`: `interface`, `options`, `display`,
 * `display_options`, `width` (default `full`), `readonly`, `hidden`. The note lists the options the field sets;
 * `describe: false` leaves the note as it is, for a field which only supports the demo, such as the name of an item.
 */
export function field(key, name, { type = 'string', note, brief, value, describe = true, schema = type === 'alias' ? null : {}, ...meta } = {}) {
	return {
		field: key,
		type,
		schema,
		meta: {
			special: SPECIALS[type] ?? null,
			width: 'full',
			translations: named(name),
			...meta,
			note: describe ? settingsNote(note, { ...meta, brief }) : (note ?? null),
		},
		value,
	};
}

/** A notice across the form, in Markdown. */
export function notice(key, text, { color = 'info', icon = 'info' } = {}) {
	return {
		field: key,
		type: 'alias',
		meta: { special: ['alias', 'no-data'], interface: 'presentation-notice', options: { color, icon, text }, width: 'full' },
	};
}

/**
 * A stock collapsible group of fields, closed unless `open`. `text` puts a notice at its top. Returns a list, which a
 * collection's `fields` takes as it is.
 */
export function group(key, name, { open = false, icon, text } = {}, fields = []) {
	const head = {
		field: key,
		type: 'alias',
		meta: {
			special: ['alias', 'no-data', 'group'],
			interface: 'group-detail',
			options: { start: open ? 'open' : 'closed', headerIcon: icon },
			translations: named(name),
			width: 'full',
		},
	};

	const inside = [...(text ? [notice(`${key}_notice`, text)] : []), ...fields.flat()];
	return [head, ...inside.map((child) => ({ ...child, meta: { ...child.meta, group: child.meta.group ?? key } }))];
}

/** A preset of the table layout for every user: which columns show, in this order. A `bookmark` gets a name of its own. */
export function table(fields, { bookmark = null, widths = {}, sort = ['id'] } = {}) {
	return { bookmark, layout: 'tabular', layout_query: { tabular: { fields, sort } }, layout_options: { tabular: { widths } } };
}

/**
 * One collection of a demo, in the folder "Demos". The key starts with `demo_`. `about` says in a sentence or two what
 * the extension is; the form starts with it, and with how to try a field and where its settings are. `fields` may hold
 * the lists `group` returns. `items` are the items to create; without them, the `value`s of the fields make one item,
 * which suits a singleton. `presets` come from `table`. `relations` are sent as they are, after every collection of
 * the demo exists.
 *
 * `supports` names the demo collection which this one only serves, such as the items its links open: it sits under
 * that one in the navigation, and its notice is `about` alone, since it has no options to try.
 */
export function collection(key, { name, icon, note, about, supports, singleton = false, template = null, fields = [], items, presets = [], relations = [] }) {
	if (!DEMO.test(key)) throw new Error(`A demo collection is named demo_<something> in lower case, not "${key}"`);
	if (supports !== undefined && !DEMO.test(supports)) throw new Error(`"${key}" can only support a demo collection, not "${supports}"`);

	const text = supports
		? about
		: [
				about,
				'Every field below can be tried. The note under a field lists the options it sets; ' +
					`to see or change all of its settings, open Settings, Data Model, ${name} (in Demos) and the field.`,
				'`npm run demo` in the repository puts every demo back as its definition in `packages/<name>/demo` describes it.',
			].join('\n\n');

	const intro = notice('demo_intro', text, { icon: icon ?? 'info' });
	const all = [ID, intro, ...fields.flat()];
	const values = Object.fromEntries(all.filter((entry) => entry.value !== undefined).map((entry) => [entry.field, entry.value]));

	return {
		collection: key,
		schema: {},
		meta: { group: supports ?? 'demo', icon, note, singleton, display_template: template, translations: named(name) },
		fields: all.map(({ value, ...rest }, index) => ({ ...rest, meta: { ...rest.meta, sort: index + 1 } })),
		items: items ?? (Object.keys(values).length > 0 ? [values] : []),
		presets,
		relations,
	};
}
