import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

/**
 * What a script can check of the bundle, which every page of the Data Studio
 * loads. The build keeps the comments of a style block, so the styles have
 * none (AGENTS.md, invariant 7). And the styles name no colour of their own,
 * only tokens of the theme, so every theme works (invariant 9); the colours
 * of the system stand in under forced colours, and only there.
 */
const SOURCE = new URL('../src/', import.meta.url);
const BUNDLE = new URL('../dist/index.js', import.meta.url);

const components = readdirSync(SOURCE).filter((name) => name.endsWith('.vue'));

/** The style blocks of a component. */
function stylesOf(component: string): string[] {
	const source = readFileSync(new URL(component, SOURCE), 'utf8');

	return [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]!);
}

/** A piece of CSS without the block of one at-rule, and that block. */
function split(css: string, rule: string): { inside: string; outside: string } {
	const start = css.indexOf(rule);
	if (start === -1) return { inside: '', outside: css };

	let depth = 0;
	let end = css.indexOf('{', start);

	for (; end < css.length; end++) {
		if (css[end] === '{') depth++;
		if (css[end] === '}' && --depth === 0) break;
	}

	return { inside: css.slice(start, end + 1), outside: css.slice(0, start) + css.slice(end + 1) };
}

/** What each `:deep()` of a piece of CSS holds between its brackets. */
function reached(css: string): string[] {
	const found: string[] = [];

	for (let start = css.indexOf(':deep('); start !== -1; start = css.indexOf(':deep(', start + 1)) {
		const open = start + ':deep('.length;
		let depth = 1;
		let end = open;

		for (; end < css.length && depth > 0; end++) {
			if (css[end] === '(') depth++;
			if (css[end] === ')') depth--;
		}

		found.push(css.slice(open, end - 1));
	}

	return found;
}

/** Every `property: value` of a piece of CSS. */
function declarations(css: string): [string, string][] {
	return [...css.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g)].map((match) => [match[1]!, match[2]!.replace(/\s+/g, ' ').trim()]);
}

// The properties which paint, and what their values may hold beside a token.
const PAINTS = /^(color|background|background-color|background-image|outline|outline-color|border(-(block|inline))?(-(start|end))?(-color)?|box-shadow)$/;
const WRITTEN_COLOUR = /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/i;
const KEYWORDS = ['none', 'inherit', 'solid', 'px', 'rem', 'linear-gradient'];
const SYSTEM = ['canvas', 'canvastext', 'highlight', 'highlighttext', 'graytext', 'linktext', 'buttonface', 'buttontext', 'field', 'fieldtext'];

/** The words of a value which are not a token of the theme or a custom property of the component. */
function words(value: string): string[] {
	const bare = value.replace(/var\(--(theme|jt)-[a-z0-9-]+\)/g, ' ');

	return (bare.match(/[a-z][a-z-]*/gi) ?? []).map((word) => word.toLowerCase());
}

describe('the styles', () => {
	test('interface.vue is the one component with styles, in one block', () => {
		expect(components.sort()).toEqual(['drawer.vue', 'interface.vue']);
		expect(stylesOf('interface.vue')).toHaveLength(1);
		expect(stylesOf('drawer.vue')).toHaveLength(0);
	});

	test('have no comment, which the build would keep in the bundle', () => {
		for (const css of components.flatMap(stylesOf)) {
			expect(css).not.toContain('/*');
			expect(css).not.toContain('*/');
			expect(css).not.toMatch(/^\s*\/\//m);
		}
	});

	// A rule inside `:deep()` is not held to the elements of this component. One which names nothing of the package
	// also styles what the app draws inside the field: `[data-icon]` alone drew the icon of the notice a second time.
	test('reach past their scope only for the elements of the package, and for the text of the notice', () => {
		const selectors = reached(stylesOf('interface.vue')[0]!);

		expect(selectors.length).toBeGreaterThan(5);

		for (const selector of selectors) expect(selector).toMatch(/\.jt-[a-z]|^\.v-notice-content$/);
	});

	test('name no colour but the tokens of the theme', () => {
		const { outside } = split(stylesOf('interface.vue')[0]!, '@media (forced-colors: active)');
		const painted = declarations(outside).filter(([property]) => PAINTS.test(property));

		expect(outside).not.toMatch(WRITTEN_COLOUR);
		expect(painted.length).toBeGreaterThan(15);

		for (const [property, value] of painted) {
			for (const word of words(value)) expect(KEYWORDS, `${property}: ${value}`).toContain(word);
		}

		// A colour of the system outside forced colours would paint in it for everyone.
		for (const [property, value] of declarations(outside)) {
			for (const word of words(value)) expect(SYSTEM, `${property}: ${value}`).not.toContain(word);
		}
	});

	test('use the colours of the system under forced colours, and nothing else there', () => {
		const { inside } = split(stylesOf('interface.vue')[0]!, '@media (forced-colors: active)');
		const painted = declarations(inside).filter(([property]) => PAINTS.test(property));

		expect(inside).not.toMatch(WRITTEN_COLOUR);
		expect(painted.length).toBeGreaterThan(3);

		for (const [property, value] of painted) {
			for (const word of words(value)) expect([...KEYWORDS, ...SYSTEM], `${property}: ${value}`).toContain(word);
		}
	});

	test('keep the backgrounds of the cells in print', () => {
		expect(declarations(stylesOf('interface.vue')[0]!)).toContainEqual(['print-color-adjust', 'exact']);
	});

	test('the checks tell a written colour and a named one from a token', () => {
		expect('color: #ff0000;').toMatch(WRITTEN_COLOUR);
		expect('background: rgb(0 0 0 / 50%);').toMatch(WRITTEN_COLOUR);
		expect('background-color: var(--theme--primary);').not.toMatch(WRITTEN_COLOUR);
		expect(words('1px solid var(--jt-line)')).toEqual(['px', 'solid']);
		expect(words('1px solid red')).toEqual(['px', 'solid', 'red']);
		expect(words('linear-gradient(var(--jt-fill), var(--jt-fill))')).toEqual(['linear-gradient']);
		expect(words('2px solid CanvasText')).toEqual(['px', 'solid', 'canvastext']);
		expect(declarations('.a {\n\tcolor: red;\n\tborder-block-end: 1px\n\t\tsolid;\n}')).toEqual([
			['color', 'red'],
			['border-block-end', '1px solid'],
		]);
		expect(reached('.a :deep(.b) { c: d; } .a :deep(:is(.e, .f)[g])::before { h: i; }')).toEqual(['.b', ':is(.e, .f)[g]']);
		expect(split('a { b: c; } @media x { d { e: f; } } g { h: i; }', '@media x')).toEqual({
			inside: '@media x { d { e: f; } }',
			outside: 'a { b: c; }  g { h: i; }',
		});
	});
});

describe('the built bundle', () => {
	test('holds no comment, from the styles, the templates or anywhere else', (context) => {
		if (!existsSync(BUNDLE)) {
			console.warn('dist/index.js is not there, so the bundle was not checked for comments. Run `npm run build` first.');
			context.skip();
			return;
		}

		const bundle = readFileSync(BUNDLE, 'utf8');

		expect(bundle.length).toBeGreaterThan(10_000);
		expect(bundle.match(/\/\*|<!--/g) ?? []).toEqual([]);
	});

	test('imports nothing but vue and the extensions SDK', (context) => {
		if (!existsSync(BUNDLE)) {
			context.skip();
			return;
		}

		const bundle = readFileSync(BUNDLE, 'utf8');
		const imported = [...bundle.matchAll(/\bfrom\s*["']([^"']+)["']/g)].map((match) => match[1]!);

		expect(imported.length).toBeGreaterThan(0);
		expect([...new Set(imported)].sort()).toEqual(['@directus/extensions-sdk', 'vue']);
	});
});
