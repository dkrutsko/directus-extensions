import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parse } from './helpers';

/** The values written out in a Markdown file: its JSON blocks which have a version. */
function values(file: string): unknown[] {
	const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
	const blocks = [...text.matchAll(/```json\n([\s\S]*?)```/g)].map((match) => match[1]!);

	return blocks.filter((block) => block.includes('"version"')).map((block) => JSON.parse(block));
}

describe('the values in the documentation', () => {
	test('the example in the README is a valid table', async () => {
		const [value] = values('README.md');
		const result = await parse(value);

		expect(result.kind).toBe('valid');
		if (result.kind !== 'valid') return;

		expect(result.table.columns).toHaveLength(3);
		expect(result.table.rows).toHaveLength(4);
		expect(result.table.rows[3]![2]!.lines).toEqual([[{ text: '12' }], [{ text: 'per seat', italic: true }]]);
	});

	test('the example in docs/format.md is a valid table, and reads as the text says', async () => {
		const [value] = values('docs/format.md');
		const result = await parse(value);

		expect(result.kind).toBe('valid');
		if (result.kind !== 'valid') return;

		expect(result.table.columns).toHaveLength(4);
		expect(result.table.rows).toHaveLength(3);
		expect(result.table.rows[0]).toHaveLength(1);
		expect(result.table.rows[2]![3]!.lines!.map((line) => line.map((piece) => piece.text))).toEqual([['+1', '-1']]);
	});

	test('the compressed values in the documentation are placeholders, not tables', async () => {
		const compressed = [...values('README.md'), ...values('docs/format.md')].filter((value) => (value as { encoding?: string }).encoding === 'gzip');

		expect(compressed.length).toBeGreaterThan(0);
		for (const value of compressed) expect((await parse(value)).kind).toBe('invalid');
	});
});
