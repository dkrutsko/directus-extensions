import { describe, expect, it } from 'vitest';
import { clean } from '../src/value';

describe('clean', () => {
	it('keeps text as it was typed', () => {
		expect(clean(' two words ')).toBe(' two words ');
	});

	it('stores nothing for an empty input', () => {
		expect(clean('')).toBeNull();
	});

	it('stores nothing for anything which is not text', () => {
		expect(clean(undefined)).toBeNull();
		expect(clean(12)).toBeNull();
	});
});
