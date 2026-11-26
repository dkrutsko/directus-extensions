import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

// The rules of the bundle which a script can check (invariants 7 and 9 of the package's AGENTS.md): the styles of
// the two components hold no comment, which the build would keep in a bundle every Data Studio page loads, and no
// colour but the tokens of the theme, so that every theme works. Under a contrast theme of the system the theme has no
// say, so the rules for it name the colours of the system, and only they do. The built bundle is checked too, where
// there is one.

const pathOf = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
const COMPONENTS = ['interface.vue', 'display.vue'];
const BUNDLE = pathOf('../dist/app.js');

/** What is between the `<style>` tags of a component. */
function styleOf(component: string): string {
	const source = readFileSync(pathOf(`../src/${component}`), 'utf8');
	const blocks = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]!);

	expect(blocks, `${component} has one style block`).toHaveLength(1);
	return blocks[0]!;
}

/** The declarations of a piece of CSS, as pairs of property and value. A value may run over several lines. */
const declarationsOf = (css: string) =>
	[...css.matchAll(/(?:^|[{;])\s*(-{0,2}[a-z][a-z-]*)\s*:\s*([^;{}]+);/gm)].map((match) => [match[1]!, match[2]!.replace(/\s+/g, ' ').trim()] as const);

// The properties which can hold a colour. `--v-icon-color` is the colour the app's icon is drawn in.
const PAINTED = new RegExp(
	'^(?:' +
		[
			'color',
			'background(?:-color|-image)?',
			'border(?:-(?:block|inline)(?:-(?:start|end))?)?(?:-color)?',
			'outline(?:-color)?',
			'box-shadow',
			'text-shadow',
			'fill',
			'stroke',
			'scrollbar-color',
			'--v-icon-color',
		].join('|') +
		')$',
);

// The words such a value may hold beside lengths and the tokens: none of them names a colour of its own.
const PLAIN_WORDS = ['solid', 'none', 'transparent', 'inherit', 'currentcolor', 'important'];

// The colours of the system (CSS Color 4), which a contrast theme sets and the browser then leaves as they are.
const SYSTEM_COLORS = [
	'accentcolor',
	'accentcolortext',
	'activetext',
	'buttonborder',
	'buttonface',
	'buttontext',
	'canvas',
	'canvastext',
	'field',
	'fieldtext',
	'graytext',
	'highlight',
	'highlighttext',
	'linktext',
	'mark',
	'marktext',
	'selecteditem',
	'selecteditemtext',
	'visitedtext',
];

const FORCED = '@media (forced-colors: active)';

/** A piece of CSS in two parts: the rules for a contrast theme of the system, and all the others. */
function split(css: string): { forced: string; rest: string } {
	const start = css.indexOf(FORCED);
	if (start < 0) return { forced: '', rest: css };

	// The block of the media query ends where as many braces have closed as have opened.
	let open = 0;
	let end = start;

	do {
		if (css[end] === '{') open++;
		if (css[end] === '}') open--;
		end++;
	} while (end < css.length && (open > 0 || !css.slice(start, end).includes('{')));

	return { forced: css.slice(start, end), rest: css.slice(0, start) + css.slice(end) };
}

// A colour written out: a hex colour, or one of the functions which make a colour.
const LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/i;

// The one colour which is no token of the theme: the app draws every focus ring in `--focus-ring-color`, which it
// sets to the theme's primary colour (app/src/styles/_variables.scss:26 in Directus 11.17.4), and the ring round a
// compact marker has to be that ring. The primary colour stands in where the app has no such variable.
const FOCUS_RING = ['var(--focus-ring-width, 2px)', 'var(--focus-ring-color, var(--theme--primary))'];

// The variables of the app which are not tokens of the theme. A later release may drop any of them, so each is read
// with a fallback.
const APP_VARIABLES = ['--fast', '--medium', '--transition', '--focus-ring-offset-invert', '--focus-ring-width', '--focus-ring-color'];

/** The words of a value which are neither a token of the theme, a variable of the component, the focus ring nor a length. */
function wordsOf(value: string): string[] {
	let bare = value;
	for (const ring of FOCUS_RING) bare = bare.split(ring).join(' ');

	bare = bare
		.replace(/var\(--theme--[a-z0-9-]+\)/g, ' ')
		.replace(/var\(--s[td]-[a-z-]+\)/g, ' ')
		.replace(/\bcalc\(/g, ' ');

	return (bare.match(/[a-z][a-z-]*/gi) ?? []).map((word) => word.toLowerCase()).filter((word) => !/^(?:px|rem|em|ms|s|deg)$/.test(word));
}

/** Every variable a piece of CSS reads, with whether it is read with a fallback. */
const variablesOf = (css: string) => [...css.matchAll(/var\(\s*(--[a-z0-9-]+)\s*([,)])/g)].map((match) => ({ name: match[1]!, fallback: match[2] === ',' }));

describe('the styles of the components', () => {
	for (const component of COMPONENTS) {
		test(`${component}: no comment, which the build would keep in the bundle`, () => {
			const css = styleOf(component);

			expect(css).not.toContain('/*');
			expect(css).not.toContain('*/');
			expect(css).not.toMatch(/^\s*\/\//m);
		});

		test(`${component}: no colour but the tokens of the theme, and the colours of the system only under forced colours`, () => {
			const css = styleOf(component);
			const { forced, rest } = split(css);
			expect(css).not.toMatch(LITERAL);

			const painted = declarationsOf(rest).filter(([property]) => PAINTED.test(property));
			expect(painted.length).toBeGreaterThan(2);

			for (const [property, value] of painted) {
				for (const word of wordsOf(value)) expect(PLAIN_WORDS, `${property}: ${value}`).toContain(word);
			}

			// A colour of the system outside that block would paint the component in it for everyone.
			for (const [property, value] of declarationsOf(rest)) {
				for (const word of wordsOf(value)) expect(SYSTEM_COLORS, `${property}: ${value}`).not.toContain(word);
			}

			// The block is there, since without it what is painted by a background alone is gone in that mode. In it
			// a token of the theme would be taken away by the browser, so every colour is one of the system's.
			const systemic = declarationsOf(forced).filter(([property]) => PAINTED.test(property));
			expect(systemic.filter(([, value]) => wordsOf(value).some((word) => SYSTEM_COLORS.includes(word))).length).toBeGreaterThan(2);

			for (const [property, value] of systemic) {
				expect(value, `${property}: ${value}`).not.toContain('--theme--');
				for (const word of wordsOf(value)) expect([...PLAIN_WORDS, ...SYSTEM_COLORS], `${property}: ${value}`).toContain(word);
			}
		});

		test(`${component}: a variable which is neither the theme's nor its own is one of the app's, read with a fallback`, () => {
			const foreign = variablesOf(styleOf(component)).filter(({ name }) => !/^--(?:theme--|s[td]-)/.test(name));

			for (const { name, fallback } of foreign) {
				expect(APP_VARIABLES, name).toContain(name);
				expect(fallback, `${name} has a fallback`).toBe(true);
			}
		});
	}

	test('the focus ring of the app is used once, round the compact marker, and nowhere else', () => {
		const css = styleOf('interface.vue');

		expect(css.split('--focus-ring-color').length - 1).toBe(1);
		expect(css).toContain(`outline: ${FOCUS_RING.join(' solid ')};`);
		expect(styleOf('display.vue')).not.toContain('--focus-ring');
	});

	test('the checks themselves tell a written colour and a named one from a token', () => {
		expect('color: #ff0000;').toMatch(LITERAL);
		expect('background: rgb(0 0 0 / 50%);').toMatch(LITERAL);
		expect('background-color: var(--theme--primary);').not.toMatch(LITERAL);

		expect(wordsOf('var(--theme--border-width) solid var(--theme--form--field--input--border-color)')).toEqual(['solid']);
		expect(wordsOf('1px solid red')).toEqual(['solid', 'red']);
		expect(wordsOf('var(--st-line) solid var(--border-normal)')).toEqual(['solid', 'var', 'border-normal']);
		expect(wordsOf(FOCUS_RING.join(' solid '))).toEqual(['solid']);
		expect(wordsOf('var(--focus-ring-width, 2px) solid var(--focus-ring-color, red)')).toContain('red');

		expect(PAINTED.test('scrollbar-color')).toBe(true);
		expect(PAINTED.test('--v-icon-color')).toBe(true);
		expect(PAINTED.test('border-inline-start-color')).toBe(true);
		expect(PAINTED.test('border-radius')).toBe(false);
		expect(PAINTED.test('--st-marker')).toBe(false);

		expect(declarationsOf('.a {\n\t--v-icon-color: red;\n\tborder:\n\t\t1px solid\n\t\tblue;\n}')).toEqual([
			['--v-icon-color', 'red'],
			['border', '1px solid blue'],
		]);

		expect(wordsOf('1px solid CanvasText')).toEqual(['solid', 'canvastext']);
		expect(wordsOf('Highlight !important')).toEqual(['highlight', 'important']);

		const css = `.a { color: var(--theme--primary); }\n${FORCED} {\n\t.a { color: CanvasText; }\n\t.b { color: Highlight; }\n}\n.c { top: 0; }`;

		expect(split(css)).toEqual({
			forced: `${FORCED} {\n\t.a { color: CanvasText; }\n\t.b { color: Highlight; }\n}`,
			rest: '.a { color: var(--theme--primary); }\n\n.c { top: 0; }',
		});
		expect(split('.a { top: 0; }')).toEqual({ forced: '', rest: '.a { top: 0; }' });

		expect(variablesOf('a { transition: var(--fast, 125ms) var(--transition); color: var(--theme--primary); }')).toEqual([
			{ name: '--fast', fallback: true },
			{ name: '--transition', fallback: false },
			{ name: '--theme--primary', fallback: false },
		]);
	});
});

describe('the built bundle', () => {
	test('holds no comment, and imports nothing but Vue and the extensions SDK', (context) => {
		if (!existsSync(BUNDLE)) {
			console.warn('dist/app.js is not there: the bundle was not checked. Run `npm run build` first.');
			context.skip();
			return;
		}

		const bundle = readFileSync(BUNDLE, 'utf8');

		expect(bundle.length).toBeGreaterThan(10_000);
		expect(bundle.match(/\/\*/g) ?? []).toEqual([]);

		// The host hands an app bundle these two and nothing else (rule 5 of the root AGENTS.md).
		const imported = [...bundle.matchAll(/\bimport\s*(?:[\w$*{},\s]+?\bfrom\s*)?["']([^"']+)["']/g)].map((match) => match[1]!);

		expect(imported.length).toBeGreaterThan(0);
		for (const source of imported) expect(['vue', '@directus/extensions-sdk']).toContain(source);
	});
});
