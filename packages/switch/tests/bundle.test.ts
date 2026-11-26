import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

// The guards of the bundle which a script can check: the styles of the component name no colour of their own, so
// every theme works, and no comment reaches the bundle, which every page of the Data Studio loads.

const SOURCE = readFileSync(fileURLToPath(new URL('../src/interface.vue', import.meta.url)), 'utf8');
const BUNDLE = fileURLToPath(new URL('../dist/index.js', import.meta.url));

/** The style block of the component: what is between its `<style>` tags. */
function styles(): string {
	const blocks = [...SOURCE.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]!);

	expect(blocks, 'interface.vue has one style block').toHaveLength(1);
	return blocks[0]!;
}

/** The declarations of a piece of CSS, as pairs of property and value. A value may run over several lines. */
const declarationsOf = (css: string) =>
	[...css.matchAll(/(?:^|[{;])\s*([a-z-]+)\s*:\s*([^;{}]+);/gm)].map((match) => [match[1]!, match[2]!.replace(/\s+/g, ' ').trim()] as const);

/** A style block cut in two: the rules of forced-colours mode, and everything else. */
function cut(css: string): { forced: string; rest: string } {
	const start = css.indexOf('@media (forced-colors: active)');
	if (start < 0) return { forced: '', rest: css };

	// The block ends at the brace which closes the one the media query opens.
	let depth = 0;
	let end = css.indexOf('{', start);

	for (; end < css.length; end++) {
		if (css[end] === '{') depth++;
		if (css[end] === '}' && --depth === 0) break;
	}

	return { forced: css.slice(start, end + 1), rest: css.slice(0, start) + css.slice(end + 1) };
}

// The properties which can hold a colour, and the words their values may hold beside lengths and the tokens.
// `--v-icon-color` is the colour of the icon in the knob, which the stock icon component reads.
const BORDER = 'border(?:-(?:block|inline)(?:-(?:start|end))?)?(?:-color)?';
const PAINTED = new RegExp(`^(?:color|background(?:-color|-image)?|${BORDER}|outline(?:-color)?|box-shadow|text-shadow|fill|stroke|--v-icon-color)$`);
const PLAIN_WORDS = ['solid', 'dashed', 'dotted', 'none', 'transparent', 'inherit', 'currentcolor'];
const SYSTEM_COLORS = ['canvas', 'canvastext', 'highlight', 'highlighttext', 'graytext', 'linktext', 'buttonface', 'buttontext', 'field', 'fieldtext'];

// A colour written out: a hex colour, or one of the functions which make a colour.
const LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/i;

/**
 * The words of a value which are neither a token of the theme, a custom property of the component, a variable of
 * the app with its fallback, a function nor a length.
 */
function wordsOf(value: string): string[] {
	const bare = value
		.replace(/var\(--theme--[a-z0-9-]+\)/g, ' ')
		.replace(/var\(--sw-[a-z-]+\)/g, ' ')
		.replace(/var\(--[a-z-]+, -?[a-z0-9]+\)/g, ' ')
		.replace(/\bcalc\(/g, ' ');

	return (bare.match(/[a-z][a-z-]*/gi) ?? []).map((word) => word.toLowerCase()).filter((word) => !/^(?:px|rem|em|ms|s|deg)$/.test(word));
}

describe('the styles of the component', () => {
	test('have no comment, which the build would keep in the bundle', () => {
		const css = styles();

		expect(css).not.toContain('/*');
		expect(css).not.toContain('*/');
		expect(css).not.toMatch(/^\s*\/\//m);
	});

	test('name no colour but the tokens of the theme, and the system colours only under forced colours', () => {
		const { forced, rest } = cut(styles());

		expect(forced, 'the rules of forced-colours mode').not.toBe('');
		expect(rest).not.toMatch(LITERAL);
		expect(forced).not.toMatch(LITERAL);

		const painted = declarationsOf(rest).filter(([property]) => PAINTED.test(property));
		expect(painted.length).toBeGreaterThan(8);

		for (const [property, value] of painted) {
			for (const word of wordsOf(value)) expect(PLAIN_WORDS, `${property}: ${value}`).toContain(word);
		}

		// Under forced colours the system colours stand in, and nothing else does.
		const systemic = declarationsOf(forced).filter(([property]) => PAINTED.test(property));
		expect(systemic.length).toBeGreaterThan(8);

		for (const [property, value] of systemic) {
			for (const word of wordsOf(value)) expect([...PLAIN_WORDS, ...SYSTEM_COLORS], `${property}: ${value}`).toContain(word);
		}

		// A system colour outside that block would paint a switch in it for everyone.
		for (const [property, value] of declarationsOf(rest)) {
			for (const word of wordsOf(value)) expect(SYSTEM_COLORS, `${property}: ${value}`).not.toContain(word);
		}
	});

	test('paint the track and the knob under forced colours, and ask for them in print', () => {
		const { forced, rest } = cut(styles());
		const rules = (css: string) => css.replace(/\s+/g, ' ');

		// Without these a contrast theme leaves a switch with cleared icons no state to show.
		expect(rules(forced)).toMatch(/\.sw-track \{[^}]*background-color: Canvas;[^}]*outline: 1px solid CanvasText;[^}]*forced-color-adjust: none;/);
		expect(rules(forced)).toMatch(/\.switch:focus-visible \{[^}]*outline-color: Highlight;/);
		expect(rules(forced)).toMatch(/\.sw-on \.sw-track \{[^}]*background-color: Highlight;/);
		expect(rules(forced)).toMatch(/\.sw-unset \.sw-track \{[^}]*outline: 1px dashed GrayText;/);

		// The track asks for its background in print, and the knob has that from it. Nothing else may ask, the box least
		// of all: its own background would print as well, a black block for every switch of a dark theme.
		// The rule is read with its line breaks, which `declarationsOf` tells the declarations apart by.
		const track = /\}\s*\.sw-track \{([^}]*)\}/.exec(rest)?.[1] ?? '';
		expect(declarationsOf(track)).toContainEqual(['print-color-adjust', 'exact']);
		expect(declarationsOf(track)).toContainEqual(['-webkit-print-color-adjust', 'exact']);
		expect(declarationsOf(styles()).filter(([property]) => property.endsWith('print-color-adjust'))).toHaveLength(2);
	});

	test('the checks themselves tell a written colour and a named one from a token', () => {
		expect('color: #ff0000;').toMatch(LITERAL);
		expect('background: rgb(0 0 0 / 50%);').toMatch(LITERAL);
		expect('background-color: var(--theme--primary);').not.toMatch(LITERAL);
		expect(wordsOf('var(--theme--border-width) solid var(--theme--form--field--input--border-color)')).toEqual(['solid']);
		expect(wordsOf('1px solid red')).toEqual(['solid', 'red']);
		expect(wordsOf('var(--sw-color)')).toEqual([]);
		expect(wordsOf('var(--focus-ring-offset-invert, -2px)')).toEqual([]);
		expect(wordsOf('var(--fast, 125ms) var(--transition, ease)')).toEqual([]);
		expect(wordsOf('1px dashed GrayText')).toEqual(['dashed', 'graytext']);
		expect(PAINTED.test('--v-icon-color')).toBe(true);
		expect(PAINTED.test('--sw-track-width')).toBe(false);
		expect(declarationsOf('.a {\n\tcolor: red;\n\ttransition:\n\t\tcolor 150ms ease-out,\n\t\tinset 150ms ease-out;\n}')).toEqual([
			['color', 'red'],
			['transition', 'color 150ms ease-out, inset 150ms ease-out'],
		]);
		expect(cut('.a { color: red; } @media (forced-colors: active) { .a { color: Canvas; } } .b { color: blue; }')).toEqual({
			forced: '@media (forced-colors: active) { .a { color: Canvas; } }',
			rest: '.a { color: red; }  .b { color: blue; }',
		});
	});
});

describe('the built bundle', () => {
	test('holds no comment: not from the style block, and not from anywhere else', (context) => {
		if (!existsSync(BUNDLE)) {
			console.warn('dist/index.js is not there: the bundle was not checked for comments. Run `npm run build` first.');
			context.skip();
			return;
		}

		const bundle = readFileSync(BUNDLE, 'utf8');

		expect(bundle.length).toBeGreaterThan(5_000);
		expect(bundle.match(/\/\*/g) ?? []).toEqual([]);
	});
});
