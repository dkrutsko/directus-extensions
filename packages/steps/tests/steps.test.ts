import { describe, expect, test } from 'vitest';
import {
	MAX_PIPS,
	chosen,
	focusTarget,
	indexOfValue,
	isCompact,
	isEmpty,
	isInert,
	keyOf,
	labelsShown,
	progressOf,
	progressText,
	readSteps,
	revealOffset,
	storedForm,
	textHandler,
	textOf,
	trackOf,
} from '../src/steps';

const STAGES = [
	{ text: 'Draft', value: 'draft' },
	{ text: 'In review', value: 'review' },
	{ text: 'Approved', value: 'approved' },
	{ text: 'Published', value: 'published' },
];

const numbered = (count: number) => Array.from({ length: count }, (_, index) => ({ text: `Step ${index + 1}`, value: index + 1 }));

describe('the steps of a field', () => {
	test('well-formed choices come out in order, counted from 1', () => {
		expect(readSteps(STAGES, 'string')).toEqual([
			{ value: 'draft', key: 'draft', name: 'Draft', label: 'Draft', icon: null, position: 1 },
			{ value: 'review', key: 'review', name: 'In review', label: 'In review', icon: null, position: 2 },
			{ value: 'approved', key: 'approved', name: 'Approved', label: 'Approved', icon: null, position: 3 },
			{ value: 'published', key: 'published', name: 'Published', label: 'Published', icon: null, position: 4 },
		]);
	});

	test('an entry without a value is left out, and the positions count the rest', () => {
		const steps = readSteps(
			[
				{ text: 'No value' },
				{ text: 'First', value: 'a' },
				{ text: 'Null', value: null },
				{ text: 'Empty', value: '' },
				{ text: 'Blank', value: '   ' },
				{ text: 'Second', value: 'b' },
				{ text: 'Not a number', value: Number.NaN },
				{ text: 'Endless', value: Number.POSITIVE_INFINITY },
				{ text: 'A flag', value: true },
				{ text: 'A list', value: ['c'] },
				{ text: 'An object', value: { c: 1 } },
			],
			'string',
		);

		expect(steps.map((step) => [step.position, step.name, step.value])).toEqual([
			[1, 'First', 'a'],
			[2, 'Second', 'b'],
		]);
	});

	test('of entries with the same value only the first is kept', () => {
		const steps = readSteps(
			[
				{ text: 'One', value: 'x' },
				{ text: 'Two', value: 'x' },
				{ text: 'Three', value: 2 },
				{ text: 'Four', value: '2' },
				{ text: 'Five', value: 'y' },
			],
			'string',
		);

		expect(steps.map((step) => step.name)).toEqual(['One', 'Three', 'Five']);
		expect(steps.map((step) => step.position)).toEqual([1, 2, 3]);
		expect(new Set(steps.map((step) => step.key)).size).toBe(steps.length);
	});

	test('on an integer field the same number in two spellings is one value', () => {
		const steps = readSteps(
			[
				{ text: 'Text', value: '2' },
				{ text: 'Number', value: 2 },
				{ text: 'Padded', value: '02' },
				{ text: 'Spaced', value: ' 2 ' },
			],
			'integer',
		);

		expect(steps).toEqual([{ value: 2, key: '2', name: 'Text', label: 'Text', icon: null, position: 1 }]);
	});

	test('on an integer field spaces around a number do not matter', () => {
		const steps = readSteps([{ text: 'Spaced', value: ' 3 ' }, { text: 'Tabbed', value: '\t-4\n' }, { text: 'Plain', value: '5' }], 'integer');

		expect(steps.map((step) => [step.name, step.value, step.key])).toEqual([
			['Spaced', 3, '3'],
			['Tabbed', -4, '-4'],
			['Plain', 5, '5'],
		]);

		expect(storedForm(' 3 ', 'integer')).toBe(3);
		expect(indexOfValue(steps, 3, 'integer')).toBe(0);
		expect(indexOfValue(steps, ' 3 ', 'integer')).toBe(0);

		// Spaces inside a number are not spaces around it.
		expect(storedForm('1 000', 'integer')).toBeNull();
	});

	test('on an integer field an entry which is not a whole number is left out', () => {
		const steps = readSteps(
			[
				{ text: 'Word', value: 'abc' },
				{ text: 'Fraction', value: 1.5 },
				{ text: 'Fraction as text', value: '1.5' },
				{ text: 'Exponent', value: '1e3' },
				{ text: 'Too large', value: 2 ** 60 },
				{ text: 'Digits', value: '3' },
				{ text: 'Number', value: 4 },
				{ text: 'Negative', value: '-5' },
				{ text: 'Zero', value: 0 },
			],
			'integer',
		);

		expect(steps.map((step) => step.value)).toEqual([3, 4, -5, 0]);
		expect(steps.map((step) => step.position)).toEqual([1, 2, 3, 4]);
		for (const step of steps) expect(typeof step.value).toBe('number');
	});

	test('on a string field a number is kept as its text', () => {
		const steps = readSteps([{ text: 'Three', value: 3 }, { text: 'Half', value: 1.5 }, { text: 'Word', value: 'abc' }], 'string');

		expect(steps.map((step) => step.value)).toEqual(['3', '1.5', 'abc']);
	});

	test('minus zero is zero', () => {
		const [step] = readSteps([{ text: 'Zero', value: -0 }], 'integer');

		expect(Object.is(step?.value, 0)).toBe(true);
		expect(step?.key).toBe('0');
	});

	test('a step is named by its text, or by its value when it has none', () => {
		const steps = readSteps(
			[{ text: 'Draft', value: 'a' }, { value: 'b' }, { text: null, value: 'c' }, { text: '', value: 'd' }, { text: '   ', value: 'e' }, { text: { en: 'F' }, value: 'f' }, { value: 7 }],
			'string',
		);

		expect(steps.map((step) => step.name)).toEqual(['Draft', 'b', 'c', 'd', 'e', 'f', '7']);
	});

	test('a step without a text has no label, only a name', () => {
		const steps = readSteps([{ text: 'Draft', value: 'a' }, { value: 'b' }, { text: '', value: 'c' }, { text: '  ', value: 'd' }, { text: null, value: 5 }], 'string');

		expect(steps.map((step) => step.label)).toEqual(['Draft', null, null, null, null]);
		for (const step of steps) expect(step.name).not.toBe('');
	});

	test('a text is trimmed, and a number is a text', () => {
		const steps = readSteps([{ text: '  Draft  ', value: 'a' }, { text: 2024, value: 'b' }], 'string');

		expect(steps.map((step) => step.name)).toEqual(['Draft', '2024']);
		expect(steps.map((step) => step.label)).toEqual(['Draft', '2024']);
	});

	test('the label of a step is its text and nothing else', () => {
		const steps = readSteps([{ text: 'Draft', value: 'a' }, { value: 'b' }, { text: 7, value: 'c' }], 'string');

		expect(steps.map((step) => step.label)).toEqual(['Draft', null, '7']);
	});

	test('a field which shows no labels has none, whatever the texts, and keeps the names', () => {
		const steps = readSteps(STAGES, 'string', false);

		expect(steps.map((step) => step.label)).toEqual([null, null, null, null]);
		expect(steps.map((step) => step.name)).toEqual(['Draft', 'In review', 'Approved', 'Published']);
		expect(steps.map((step) => step.value)).toEqual(['draft', 'review', 'approved', 'published']);
	});

	test('only the option switched off hides the labels', () => {
		expect(labelsShown(false)).toBe(false);

		// A field made before the option existed has none; the form hands that over as nothing, or as null.
		for (const option of [undefined, null, true, 'false', 0, '', {}]) {
			expect(labelsShown(option)).toBe(true);
			expect(readSteps(STAGES, 'string', option).map((step) => step.label)).toEqual(['Draft', 'In review', 'Approved', 'Published']);
		}

		expect(readSteps(STAGES, 'string').map((step) => step.label)).toEqual(['Draft', 'In review', 'Approved', 'Published']);
	});

	test('a key of an entry which once hid its label is ignored, like any key it does not know', () => {
		const steps = readSteps([{ text: 'Draft', value: 'draft', showLabel: false }, { text: 'Done', value: 'done', showLabel: true }], 'string');

		expect(steps.map((step) => step.label)).toEqual(['Draft', 'Done']);
		expect(isCompact(steps)).toBe(false);
	});

	test('a track without a single label is compact', () => {
		// The option off, with every text there.
		expect(isCompact(readSteps(STAGES, 'string', false))).toBe(true);

		// The option on, and no step with a text.
		expect(isCompact(readSteps([{ value: 'a' }, { text: '', value: 'b' }, { text: '  ', value: 'c' }], 'string', true))).toBe(true);
		expect(isCompact(readSteps([{ value: 'a' }, { value: 'b' }], 'string'))).toBe(true);

		// One text is enough for the row of labels.
		expect(isCompact(readSteps([{ value: 'a' }, { text: 'B', value: 'b' }], 'string'))).toBe(false);
		expect(isCompact(readSteps(STAGES, 'string'))).toBe(false);
		expect(isCompact(readSteps(STAGES, 'string', null))).toBe(false);

		// A field without steps is a notice, not a track.
		expect(isCompact([])).toBe(false);
		expect(isCompact(readSteps([], 'string', false))).toBe(false);
	});

	test('an icon which is missing, null or empty is no icon', () => {
		const steps = readSteps(
			[
				{ text: 'A', value: 'a' },
				{ text: 'B', value: 'b', icon: null },
				{ text: 'C', value: 'c', icon: '' },
				{ text: 'D', value: 'd', icon: '  ' },
				{ text: 'E', value: 'e', icon: 7 },
				{ text: 'F', value: 'f', icon: ' check ' },
				{ text: 'G', value: 'g', icon: 'no_such_icon' },
			],
			'string',
		);

		expect(steps.map((step) => step.icon)).toEqual([null, null, null, null, null, 'check', 'no_such_icon']);
	});

	test('anything which is not a list gives no steps, and nothing throws', () => {
		for (const choices of [undefined, null, '', 'draft', 0, 4, true, {}, { 0: STAGES[0], length: 1 }, () => STAGES]) {
			expect(readSteps(choices, 'string')).toEqual([]);
			expect(readSteps(choices, 'integer')).toEqual([]);
			expect(readSteps(choices)).toEqual([]);
		}
	});

	test('entries which are not objects are left out', () => {
		const steps = readSteps([null, undefined, 'draft', 3, true, [], ['a'], { text: 'Kept', value: 'kept' }], 'string');

		expect(steps.map((step) => step.name)).toEqual(['Kept']);
	});

	test('keys it does not know are ignored', () => {
		const steps = readSteps([{ text: 'Draft', value: 'draft', icon: 'edit', color: '#2ECDA7', foreground: '#FFFFFF', children: [] }], 'string');

		expect(steps).toEqual([{ value: 'draft', key: 'draft', name: 'Draft', label: 'Draft', icon: 'edit', position: 1 }]);
	});

	test('the option is not changed', () => {
		const choices = [{ text: ' Draft ', value: '1', icon: '' }, { text: 'Again', value: 1 }];
		const before = JSON.stringify(choices);

		readSteps(choices, 'integer');
		expect(JSON.stringify(choices)).toBe(before);
	});

	test('a field type it does not know is read as text', () => {
		expect(readSteps([{ text: 'One', value: 1 }], undefined).map((step) => step.value)).toEqual(['1']);
		expect(readSteps([{ text: 'One', value: 1 }], 'float').map((step) => step.value)).toEqual(['1']);
	});
});

describe('the form a field stores a value in', () => {
	test('an integer field stores a whole number', () => {
		expect(storedForm('3', 'integer')).toBe(3);
		expect(storedForm(3, 'integer')).toBe(3);
		expect(storedForm('-12', 'integer')).toBe(-12);
		expect(storedForm('abc', 'integer')).toBeNull();
		expect(storedForm('', 'integer')).toBeNull();
		expect(storedForm('+3', 'integer')).toBeNull();
		expect(storedForm('0x10', 'integer')).toBeNull();
		expect(storedForm(1.5, 'integer')).toBeNull();
		expect(storedForm(null, 'integer')).toBeNull();
		expect(storedForm(true, 'integer')).toBeNull();
	});

	test('any other field stores text', () => {
		expect(storedForm('draft', 'string')).toBe('draft');
		expect(storedForm(' draft ', 'string')).toBe(' draft ');
		expect(storedForm(3, 'string')).toBe('3');
		expect(storedForm('', 'string')).toBeNull();
		expect(storedForm(null, 'string')).toBeNull();
		expect(storedForm(undefined, 'string')).toBeNull();
		expect(storedForm(false, 'string')).toBeNull();
		expect(storedForm({}, 'string')).toBeNull();
	});
});

describe('matching a value', () => {
	test('a number and its text form are the same value, in both directions', () => {
		expect(keyOf(2, 'integer')).toBe(keyOf('2', 'integer'));
		expect(keyOf(2, 'string')).toBe(keyOf('2', 'string'));
		expect(keyOf(2)).toBe(keyOf('2'));
		expect(keyOf(2, 'integer')).not.toBe(keyOf(3, 'integer'));
	});

	test('nothing matches a field without a value', () => {
		for (const type of ['string', 'integer', undefined]) {
			expect(keyOf(null, type)).toBeNull();
			expect(keyOf(undefined, type)).toBeNull();
			expect(keyOf('', type)).toBeNull();
		}
	});

	test('the number 2 finds a step whose value is the text 2', () => {
		const steps = readSteps([{ text: 'One', value: '1' }, { text: 'Two', value: '2' }, { text: 'Three', value: '3' }], 'integer');

		expect(indexOfValue(steps, 2, 'integer')).toBe(1);
		expect(indexOfValue(steps, '2', 'integer')).toBe(1);
		expect(indexOfValue(steps, 4, 'integer')).toBe(-1);
		expect(indexOfValue(steps, null, 'integer')).toBe(-1);
	});

	test('the text 2 finds a step whose value is the number 2', () => {
		const steps = readSteps(numbered(3), 'string');

		expect(indexOfValue(steps, '2', 'string')).toBe(1);
		expect(indexOfValue(steps, 2, 'string')).toBe(1);
	});

	test('text is matched as it is, to the letter', () => {
		const steps = readSteps(STAGES, 'string');

		expect(indexOfValue(steps, 'review', 'string')).toBe(1);
		expect(indexOfValue(steps, 'Review', 'string')).toBe(-1);
		expect(indexOfValue(steps, ' review', 'string')).toBe(-1);
	});
});

describe('where a value stands in the steps', () => {
	test('the steps before the current one are done, those after it upcoming', () => {
		const steps = readSteps(STAGES, 'string');

		expect(trackOf(steps, 'approved', 'string')).toEqual({
			current: 2,
			states: ['done', 'done', 'current', 'upcoming'],
			unknown: null,
		});
	});

	test('the first and the last step', () => {
		const steps = readSteps(STAGES, 'string');

		expect(trackOf(steps, 'draft', 'string').states).toEqual(['current', 'upcoming', 'upcoming', 'upcoming']);
		expect(trackOf(steps, 'published', 'string').states).toEqual(['done', 'done', 'done', 'current']);
	});

	test('a number on a track of text values, and the other way around', () => {
		const texts = readSteps([{ text: 'One', value: '1' }, { text: 'Two', value: '2' }, { text: 'Three', value: '3' }], 'integer');
		const numbers = readSteps(numbered(3), 'integer');

		expect(trackOf(texts, 2, 'integer').states).toEqual(['done', 'current', 'upcoming']);
		expect(trackOf(numbers, '2', 'integer').states).toEqual(['done', 'current', 'upcoming']);
	});

	test('a field without a value has no current step and nothing to report', () => {
		const steps = readSteps(STAGES, 'string');

		for (const value of [null, undefined, '', '  ']) {
			expect(trackOf(steps, value, 'string')).toEqual({
				current: -1,
				states: ['upcoming', 'upcoming', 'upcoming', 'upcoming'],
				unknown: null,
			});
		}
	});

	test('a value which no step has leaves every step upcoming and is reported', () => {
		const steps = readSteps(STAGES, 'string');

		expect(trackOf(steps, 'archived', 'string')).toEqual({
			current: -1,
			states: ['upcoming', 'upcoming', 'upcoming', 'upcoming'],
			unknown: 'archived',
		});

		expect(trackOf(readSteps(numbered(3), 'integer'), 9, 'integer').unknown).toBe('9');
		expect(trackOf(readSteps(numbered(3), 'integer'), 'abc', 'integer').unknown).toBe('abc');
		expect(trackOf(steps, false, 'string').unknown).toBe('false');
		expect(trackOf(steps, { a: 1 }, 'string').unknown).toBe('{"a":1}');
	});

	test('there is never more than one current step', () => {
		const steps = readSteps([...STAGES, ...STAGES, { text: 'Review again', value: 'review' }], 'string');

		for (const value of ['draft', 'review', 'approved', 'published']) {
			expect(trackOf(steps, value, 'string').states.filter((state) => state === 'current')).toHaveLength(1);
		}
	});

	test('no steps, no states', () => {
		expect(trackOf([], 'draft', 'string')).toEqual({ current: -1, states: [], unknown: 'draft' });
		expect(trackOf([], null, 'string')).toEqual({ current: -1, states: [], unknown: null });
	});
});

describe('choosing a step', () => {
	test('writes the value of the step', () => {
		const steps = readSteps(STAGES, 'string');

		expect(chosen(steps[2]!, 'draft', 'string')).toBe('approved');
		expect(chosen(steps[0]!, 'approved', 'string')).toBe('draft');
		expect(chosen(steps[0]!, null, 'string')).toBe('draft');
		expect(chosen(steps[0]!, 'archived', 'string')).toBe('draft');
	});

	test('writes a number on an integer field, whatever the option holds', () => {
		const [low, high] = readSteps([{ text: 'Low', value: '1' }, { text: 'High', value: '3' }], 'integer');

		expect(chosen(high!, 1, 'integer')).toBe(3);
		expect(chosen(low!, 3, 'integer')).toBe(1);
	});

	test('writes text on a string field, whatever the option holds', () => {
		const [, , three] = readSteps(numbered(3), 'string');

		expect(chosen(three!, '1', 'string')).toBe('3');
	});

	test('writes nothing for the step which is already current', () => {
		const steps = readSteps(STAGES, 'string');
		const numbers = readSteps(numbered(3), 'integer');

		expect(chosen(steps[1]!, 'review', 'string')).toBeUndefined();
		expect(chosen(numbers[1]!, 2, 'integer')).toBeUndefined();
		expect(chosen(numbers[1]!, '2', 'integer')).toBeUndefined();
	});

	test('never writes null', () => {
		for (const step of readSteps([...STAGES, ...numbered(3)], 'string')) {
			for (const value of [null, undefined, '', 'draft', 2]) expect(chosen(step, value, 'string')).not.toBeNull();
		}
	});
});

describe('a track which stays as it is', () => {
	test('each of the three flags makes it inert', () => {
		expect(isInert({})).toBe(false);
		expect(isInert({ disabled: false, nonEditable: false, loading: false })).toBe(false);
		expect(isInert({ disabled: true })).toBe(true);
		expect(isInert({ nonEditable: true })).toBe(true);
		expect(isInert({ loading: true })).toBe(true);
	});
});

describe('moving the focus', () => {
	test('the arrows go to the neighbour and stop at the ends', () => {
		expect(focusTarget('ArrowRight', 0, 4)).toBe(1);
		expect(focusTarget('ArrowRight', 3, 4)).toBe(3);
		expect(focusTarget('ArrowLeft', 2, 4)).toBe(1);
		expect(focusTarget('ArrowLeft', 0, 4)).toBe(0);
	});

	test('in a right-to-left page the arrows are turned around', () => {
		expect(focusTarget('ArrowLeft', 0, 4, true)).toBe(1);
		expect(focusTarget('ArrowRight', 1, 4, true)).toBe(0);
		expect(focusTarget('ArrowRight', 0, 4, true)).toBe(0);
		expect(focusTarget('ArrowLeft', 3, 4, true)).toBe(3);
	});

	test('Home and End go to the first and the last step in either direction', () => {
		for (const rtl of [false, true]) {
			expect(focusTarget('Home', 2, 4, rtl)).toBe(0);
			expect(focusTarget('End', 1, 4, rtl)).toBe(3);
		}
	});

	test('any other key is none of its business', () => {
		for (const key of ['Enter', ' ', 'Tab', 'ArrowUp', 'ArrowDown', 'Escape', 'a', 'PageDown']) {
			expect(focusTarget(key, 1, 4)).toBeNull();
		}

		expect(focusTarget('ArrowRight', 0, 0)).toBeNull();
	});
});

describe('a value as text', () => {
	test('text stays, the rest is written out', () => {
		expect(textOf('draft')).toBe('draft');
		expect(textOf(3)).toBe('3');
		expect(textOf(false)).toBe('false');
		expect(textOf(null)).toBe('');
		expect(textOf(undefined)).toBe('');
		expect(textOf(['a', 1])).toBe('["a",1]');
		expect(textOf({ a: 1 })).toBe('{"a":1}');
	});

	test('a value which cannot be written out does not throw', () => {
		const loop: Record<string, unknown> = {};
		loop['self'] = loop;

		expect(() => textOf(loop)).not.toThrow();
		expect(typeof textOf(loop)).toBe('string');
	});
});

describe('the display', () => {
	test('shows the label of the step and a pip per step, filled up to the current one', () => {
		expect(progressOf('review', { choices: STAGES }, 'string')).toEqual({
			text: 'In review',
			position: 2,
			count: 4,
			pips: [true, true, false, false],
		});

		expect(progressOf('draft', { choices: STAGES }, 'string').pips).toEqual([true, false, false, false]);
		expect(progressOf('published', { choices: STAGES }, 'string').pips).toEqual([true, true, true, true]);
	});

	test('matches as loosely as the interface', () => {
		const options = { choices: [{ text: 'Low', value: '1' }, { text: 'High', value: '2' }] };

		expect(progressOf(2, options, 'integer').text).toBe('High');
		expect(progressOf('2', { choices: numbered(3) }, 'string').text).toBe('Step 2');
		expect(progressOf(2, { choices: numbered(3) }).text).toBe('Step 2');
	});

	test('draws pips for up to eight steps, and position and count beyond', () => {
		expect(MAX_PIPS).toBe(8);

		const eight = progressOf(5, { choices: numbered(8) }, 'integer');
		expect(eight.pips).toEqual([true, true, true, true, true, false, false, false]);

		const twelve = progressOf(5, { choices: numbered(12) }, 'integer');
		expect(twelve).toEqual({ text: 'Step 5', position: 5, count: 12, pips: null });
	});

	test('counts the steps which are kept', () => {
		const choices = [...numbered(8), { text: 'Again', value: 8 }, { text: 'No value' }];

		expect(progressOf(8, { choices }, 'integer').pips).toHaveLength(8);
	});

	test('reads the choices in the type of the field, as the interface does', () => {
		// On an integer field the second entry could never be saved, and the fourth is the third again.
		const choices = [
			{ text: 'One', value: 1 },
			{ text: 'Half', value: 1.5 },
			{ text: 'Two', value: '02' },
			{ text: 'Two again', value: 2 },
			{ text: 'Three', value: 3 },
		];

		expect(progressOf(2, { choices }, 'integer')).toEqual({ text: 'Two', position: 2, count: 3, pips: [true, true, false] });
		expect(progressOf(3, { choices }, 'integer')).toEqual({ text: 'Three', position: 3, count: 3, pips: [true, true, true] });
		expect(progressOf(1.5, { choices }, 'integer')).toEqual({ text: '1.5', position: null, count: 3, pips: null });

		// The track of the interface, from the same options, has the same steps and the same current one.
		const steps = readSteps(choices, 'integer');
		expect(steps.map((step) => step.name)).toEqual(['One', 'Two', 'Three']);
		expect(trackOf(steps, 2, 'integer').current + 1).toBe(progressOf(2, { choices }, 'integer').position);

		// On a string field all five are steps, since each is a text of its own.
		expect(progressOf('2', { choices }, 'string')).toEqual({ text: 'Two again', position: 4, count: 5, pips: [true, true, true, true, false] });
		expect(progressOf('02', { choices }, 'string').text).toBe('Two');
	});

	test('a field type decides between pips and a count', () => {
		// Nine entries, of which an integer field keeps eight.
		const choices = [...numbered(8), { text: 'Not a number', value: 'nine' }];

		expect(progressOf(8, { choices }, 'integer').pips).toHaveLength(8);
		expect(progressOf('8', { choices }, 'string')).toEqual({ text: 'Step 8', position: 8, count: 9, pips: null });
	});

	test('a value which is not a step shows as it is, without pips', () => {
		expect(progressOf('archived', { choices: STAGES }, 'string')).toEqual({ text: 'archived', position: null, count: 4, pips: null });
		expect(progressOf(7, { choices: STAGES }, 'string').text).toBe('7');
	});

	test('a field without choices shows the value', () => {
		for (const options of [undefined, null, {}, { choices: null }, { choices: 'draft' }, 'draft', 4]) {
			expect(progressOf('draft', options, 'string')).toEqual({ text: 'draft', position: null, count: 0, pips: null });
		}
	});

	test('goes by the name of the step, and knows nothing of the labels of the form', () => {
		const choices = [{ text: 'Draft', value: 'draft' }, { value: 'review' }, { text: '', value: 'approved' }];

		// The same with the labels of the field switched off: the option is the interface's, and the display does not read it.
		for (const options of [{ choices }, { choices, showLabels: false }, { choices, showLabels: true }]) {
			expect(progressOf('draft', options, 'string').text).toBe('Draft');
			expect(progressOf('review', options, 'string')).toEqual({ text: 'review', position: 2, count: 3, pips: [true, true, false] });
			expect(progressText('approved', options, 'string')).toBe('approved');
			expect(textHandler('draft', {}, { interfaceOptions: options, field: { type: 'string' } })).toBe('Draft');
		}
	});

	test('reads the choices of a stock Dropdown', () => {
		const options = {
			choices: [
				{ text: 'Ordered', value: 'ordered', icon: 'shopping_cart', color: '#2ECDA7' },
				{ text: 'Sent', value: 'sent', icon: null, color: null },
			],
			allowOther: false,
			allowNone: true,
			icon: 'local_shipping',
		};

		expect(progressOf('sent', options, 'string')).toEqual({ text: 'Sent', position: 2, count: 2, pips: [true, true] });
	});

	test('as plain text it is the label, or the value when it is not a step', () => {
		expect(progressText('approved', { choices: STAGES }, 'string')).toBe('Approved');
		expect(progressText(3, { choices: numbered(12) }, 'integer')).toBe('Step 3');
		expect(progressText('archived', { choices: STAGES }, 'string')).toBe('archived');
		expect(progressText(9, undefined, 'integer')).toBe('9');
	});
});

describe('the display as text, as the app asks for it', () => {
	const options = { choices: [{ text: 'Low', value: '1' }, { text: 'Half', value: 1.5 }, { text: 'High', value: '02' }] };

	test('takes the choices from the options of the interface, not from its own', () => {
		expect(textHandler('review', {}, { interfaceOptions: { choices: STAGES }, field: { type: 'string' } })).toBe('In review');
		expect(textHandler('review', { choices: [{ text: 'Wrong', value: 'review' }] }, { interfaceOptions: { choices: STAGES } })).toBe('In review');
		expect(textHandler('review', { choices: STAGES }, { interfaceOptions: {} })).toBe('review');
	});

	test('takes the type from the field', () => {
		// On an integer field "02" is the number 2; on a string field nothing is.
		expect(textHandler(2, {}, { interfaceOptions: options, field: { type: 'integer' } })).toBe('High');
		expect(textHandler(2, {}, { interfaceOptions: options, field: { type: 'string' } })).toBe('2');
		expect(textHandler(2, {}, { interfaceOptions: options })).toBe('2');
	});

	test('a value which is not a step is its own text', () => {
		expect(textHandler('archived', {}, { interfaceOptions: { choices: STAGES }, field: { type: 'string' } })).toBe('archived');
		expect(textHandler(7, {}, { interfaceOptions: options, field: { type: 'integer' } })).toBe('7');
	});

	test('a field without a value has no text', () => {
		const context = { interfaceOptions: { choices: STAGES }, field: { type: 'string' } };

		expect(textHandler(null, {}, context)).toBeNull();
		expect(textHandler(undefined, {}, context)).toBeNull();
		expect(textHandler('', {}, context)).toBeNull();
	});

	test('zero is a value', () => {
		const zero = { choices: [{ text: 'None', value: 0 }, { text: 'One', value: 1 }] };

		expect(textHandler(0, {}, { interfaceOptions: zero, field: { type: 'integer' } })).toBe('None');
		expect(isEmpty(0)).toBe(false);
		expect(isEmpty(false)).toBe(false);
	});

	test('works without a context, a field or options', () => {
		expect(textHandler('draft')).toBe('draft');
		expect(textHandler('draft', undefined, {})).toBe('draft');
		expect(textHandler('draft', null, { interfaceOptions: null, field: null })).toBe('draft');
	});
});

describe('bringing a step into view', () => {
	const view = { start: 100, end: 400 };

	test('a step which is wholly in view does not move the track, wherever in the view it is', () => {
		expect(revealOffset({ start: 100, end: 172 }, view, false)).toBe(0);
		expect(revealOffset({ start: 200, end: 272 }, view, false)).toBe(0);
		expect(revealOffset({ start: 328, end: 400 }, view, false)).toBe(0);
	});

	test('a step which is partly hidden moves the track by what is hidden, and no further', () => {
		expect(revealOffset({ start: 70, end: 142 }, view, false)).toBe(-30);
		expect(revealOffset({ start: 370, end: 442 }, view, false)).toBe(42);
	});

	test('a point on the visible part of a step is still on the step afterwards', () => {
		for (const step of [{ start: 70, end: 142 }, { start: 370, end: 442 }, { start: 99, end: 171 }, { start: 329, end: 401 }]) {
			const offset = revealOffset(step, view, false);

			// Every pixel of the step which showed before the move.
			for (let x = Math.max(step.start, view.start); x < Math.min(step.end, view.end); x++) {
				expect(x).toBeGreaterThanOrEqual(step.start - offset);
				expect(x).toBeLessThan(step.end - offset);
			}
		}
	});

	test('a step which is out of view altogether is brought to the nearer edge', () => {
		expect(revealOffset({ start: -200, end: -128 }, view, false)).toBe(-300);
		expect(revealOffset({ start: 600, end: 672 }, view, false)).toBe(272);
	});

	test('centred, the middle of the step goes to the middle of the view', () => {
		expect(revealOffset({ start: 214, end: 286 }, view, true)).toBe(0);
		expect(revealOffset({ start: 100, end: 172 }, view, true)).toBe(-114);
		expect(revealOffset({ start: 600, end: 672 }, view, true)).toBe(386);
	});
});
