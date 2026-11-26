import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

// The guards of the bundle which a script can check: the styles of the two components name no colour of their own,
// so every theme works, and no comment reaches the bundle, which every Data Studio page loads.

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const COMPONENTS = ['interface.vue', 'display.vue'];
const BUNDLE = fileURLToPath(new URL('../dist/app.js', import.meta.url));

/** The style block of a component: what is between its `<style>` tags. */
function styleOf(component: string): string {
	const source = read(`../src/${component}`);
	const blocks = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]!);

	expect(blocks, `${component} has one style block`).toHaveLength(1);
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
const PAINTED =
	/^(?:color|background(?:-color|-image)?|border(?:-(?:block|inline)(?:-(?:start|end))?)?(?:-color)?|outline(?:-color)?|box-shadow|text-shadow|fill|stroke)$/;
const PLAIN_WORDS = ['solid', 'dashed', 'dotted', 'none', 'transparent', 'inherit', 'currentcolor', 'to', 'right', 'left', 'important'];
const SYSTEM_COLORS = ['canvas', 'canvastext', 'highlight', 'highlighttext', 'graytext', 'linktext', 'buttonface', 'buttontext', 'field', 'fieldtext'];

// A colour written out: a hex colour, or one of the functions which make a colour.
const LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/i;

/** The words of a value which are neither a token of the theme, a custom property of the component, a function nor a length. */
function wordsOf(value: string): string[] {
	const bare = value
		.replace(/var\(--theme--[a-z0-9-]+\)/g, ' ')
		.replace(/var\(--m[td]-[a-z-]+\)/g, ' ')
		.replace(/\b(?:calc|linear-gradient)\(/g, ' ');

	return (bare.match(/[a-z][a-z-]*/gi) ?? []).map((word) => word.toLowerCase()).filter((word) => !/^(?:px|rem|em|ms|s|deg)$/.test(word));
}

describe('the styles of the components', () => {
	for (const component of COMPONENTS) {
		test(`${component}: no comment, which the build would keep in the bundle`, () => {
			const css = styleOf(component);

			expect(css).not.toContain('/*');
			expect(css).not.toContain('*/');
			expect(css).not.toMatch(/^\s*\/\//m);
		});

		test(`${component}: no colour but the tokens of the theme, and the system colours only under forced colours`, () => {
			const { forced, rest } = cut(styleOf(component));

			expect(forced, 'the rules of forced-colours mode').not.toBe('');
			expect(rest).not.toMatch(LITERAL);
			expect(forced).not.toMatch(LITERAL);

			const painted = declarationsOf(rest).filter(([property]) => PAINTED.test(property));
			expect(painted.length).toBeGreaterThan(5);

			for (const [property, value] of painted) {
				for (const word of wordsOf(value)) expect(PLAIN_WORDS, `${property}: ${value}`).toContain(word);
			}

			// Under forced colours the system colours stand in, and nothing else does.
			const systemic = declarationsOf(forced).filter(([property]) => PAINTED.test(property));
			expect(systemic.length).toBeGreaterThan(3);

			for (const [property, value] of systemic) {
				for (const word of wordsOf(value)) expect([...PLAIN_WORDS, ...SYSTEM_COLORS], `${property}: ${value}`).toContain(word);
			}

			// A system colour outside that block would paint a meter in it for everyone.
			for (const [property, value] of declarationsOf(rest)) {
				for (const word of wordsOf(value)) expect(SYSTEM_COLORS, `${property}: ${value}`).not.toContain(word);
			}
		});
	}

	test('the checks themselves tell a written colour and a named one from a token', () => {
		expect('color: #ff0000;').toMatch(LITERAL);
		expect('background: rgb(0 0 0 / 50%);').toMatch(LITERAL);
		expect('background-color: var(--theme--primary);').not.toMatch(LITERAL);
		expect(wordsOf('1px dashed var(--theme--foreground-subdued)')).toEqual(['dashed']);
		expect(wordsOf('1px solid red')).toEqual(['solid', 'red']);
		expect(wordsOf('linear-gradient(to right, var(--mt-stops))')).toEqual(['to', 'right']);
		expect(wordsOf('Highlight !important')).toEqual(['highlight', 'important']);
		expect(declarationsOf('.a {\n\tcolor: red;\n\ttransition:\n\t\ttransform 150ms ease-out,\n\t\tborder-radius 150ms ease-out;\n}')).toEqual([
			['color', 'red'],
			['transition', 'transform 150ms ease-out, border-radius 150ms ease-out'],
		]);
	});
});

describe('the built bundle', () => {
	test('holds no comment: not from a style block, and not from anywhere else', (context) => {
		if (!existsSync(BUNDLE)) {
			console.warn('dist/app.js is not there: the bundle was not checked for comments. Run `npm run build` first.');
			context.skip();
			return;
		}

		const bundle = readFileSync(BUNDLE, 'utf8');

		expect(bundle.length).toBeGreaterThan(10_000);
		expect(bundle.match(/\/\*/g) ?? []).toEqual([]);
	});
});
