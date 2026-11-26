import { describe, expect, test } from 'vitest';
import {
	DEFAULT_COLOR_OFF,
	DEFAULT_COLOR_ON,
	DEFAULT_ICON_OFF,
	DEFAULT_ICON_ON,
	DEFAULT_LABEL,
	UNSET_COLOR,
	UNSET_ICON,
	colorOr,
	descriptionText,
	fieldNameFor,
	iconOr,
	isColor,
	isDimmed,
	isInert,
	labelText,
	lookOf,
	readOptions,
	stateOf,
	toggled,
} from '../src/switch';
import type { State } from '../src/switch';

describe('the state of a value', () => {
	test('true is on and false is off', () => {
		expect(stateOf(true)).toBe('on');
		expect(stateOf(false)).toBe('off');
	});

	test('a field without an answer is neither', () => {
		expect(stateOf(null)).toBe('unset');
		expect(stateOf(undefined)).toBe('unset');
	});

	test('a value of another type is on where Directus reads it as true', () => {
		for (const value of [1, '1', 'true']) expect(stateOf(value)).toBe('on');
	});

	test('and off for everything else, text which says no included', () => {
		for (const value of [0, -0, '0', 'false', '']) expect(stateOf(value)).toBe('off');
		for (const value of [2, -1, Number.NaN, 1n, 'yes', 'on', 'True', 'TRUE', ' true', ' 1 ', '1.0']) expect(stateOf(value)).toBe('off');
		for (const value of [[], [true], {}, { value: true }, () => true]) expect(stateOf(value)).toBe('off');
	});
});

describe('a toggle', () => {
	test('turns on off and off on', () => {
		expect(toggled(true)).toBe(false);
		expect(toggled(false)).toBe(true);
	});

	test('turns a field without an answer on', () => {
		expect(toggled(null)).toBe(true);
		expect(toggled(undefined)).toBe(true);
	});

	test('always writes a boolean, whatever the field held', () => {
		for (const value of [true, false, null, undefined, 0, 1, '', 'text', Number.NaN, {}, []]) {
			expect(typeof toggled(value)).toBe('boolean');
		}
	});

	test('turns off what is drawn as on, and on what is drawn as off', () => {
		for (const value of [1, '1', 'true']) expect(toggled(value)).toBe(false);
		for (const value of [0, '0', 'false', '', 'yes', 2, {}, []]) expect(toggled(value)).toBe(true);
	});

	test('toggling twice from an answer comes back to it', () => {
		expect(toggled(toggled(true))).toBe(true);
		expect(toggled(toggled(false))).toBe(false);
	});
});

describe('a switch which may not change', () => {
	test('is one which is disabled, view-only or still loading', () => {
		expect(isInert({ disabled: true })).toBe(true);
		expect(isInert({ nonEditable: true })).toBe(true);
		expect(isInert({ loading: true })).toBe(true);
		expect(isInert({ disabled: true, nonEditable: true, loading: true })).toBe(true);
	});

	test('is no other', () => {
		expect(isInert({})).toBe(false);
		expect(isInert({ disabled: false, nonEditable: false, loading: false })).toBe(false);
	});
});

describe('a switch which is dimmed', () => {
	test('is one which is disabled', () => {
		expect(isDimmed({ disabled: true })).toBe(true);
		expect(isDimmed({ disabled: true, nonEditable: false })).toBe(true);
	});

	test('is not one in a comparison, which is there to be read', () => {
		expect(isDimmed({ disabled: true, nonEditable: true })).toBe(false);
		expect(isDimmed({ nonEditable: true })).toBe(false);
	});

	test('is no other: a form which is loading is inert, but not dimmed', () => {
		expect(isDimmed({})).toBe(false);
		expect(isDimmed({ disabled: false, nonEditable: false })).toBe(false);

		const loading = { loading: true };
		expect(isInert(loading)).toBe(true);
		expect(isDimmed(loading)).toBe(false);
	});

	test('is always inert as well', () => {
		for (const disabled of [true, false]) {
			for (const nonEditable of [true, false]) {
				const flags = { disabled, nonEditable };
				if (isDimmed(flags)) expect(isInert(flags)).toBe(true);
			}
		}
	});
});

describe('the name of the field in front of the label', () => {
	test('is the name the form gives, trimmed', () => {
		expect(fieldNameFor('Newsletter', 'Enabled')).toBe('Newsletter');
		expect(fieldNameFor('  Allow comments \n', 'Enabled')).toBe('Allow comments');
	});

	test('is left out where the form gives none', () => {
		for (const name of [undefined, null, '', '   ', 7, true, {}, ['Newsletter']]) expect(fieldNameFor(name, 'Enabled')).toBeNull();
	});

	test('is left out where it says what the label says', () => {
		expect(fieldNameFor('Published', 'Published')).toBeNull();
		expect(fieldNameFor('published', 'Published')).toBeNull();
		expect(fieldNameFor(' Published ', 'Published')).toBeNull();
		expect(fieldNameFor('Allow Comments', 'Allow comments')).toBeNull();
	});

	test('is kept where it only starts or ends like the label', () => {
		expect(fieldNameFor('Published', 'Published on the site')).toBe('Published');
		expect(fieldNameFor('Is published', 'Published')).toBe('Is published');
	});

	test('keeps markup as text', () => {
		expect(fieldNameFor('<b>Bold</b>', 'Enabled')).toBe('<b>Bold</b>');
	});
});

describe('the label', () => {
	test('is the text of the option, trimmed', () => {
		expect(labelText('Published')).toBe('Published');
		expect(labelText('  Send a notification \n')).toBe('Send a notification');
	});

	test('is the default when the option holds no text', () => {
		for (const label of [undefined, null, '', '   ', '\t\n', 7, true, {}, ['Published']]) {
			expect(labelText(label)).toBe(DEFAULT_LABEL);
		}
	});

	test('is the translation the app offers, when there is one', () => {
		expect(labelText(null, 'Aktiviert')).toBe('Aktiviert');
		expect(labelText('Published', 'Aktiviert')).toBe('Published');
	});

	test('keeps markup as text', () => {
		expect(labelText('<b>Bold</b> {{ 1 + 1 }}')).toBe('<b>Bold</b> {{ 1 + 1 }}');
	});
});

describe('the description', () => {
	test('is the text of the option, trimmed', () => {
		expect(descriptionText(' Visible to everyone. ')).toBe('Visible to everyone.');
	});

	test('is left out when the option holds no text', () => {
		for (const description of [undefined, null, '', '   ', '\n', 0, false, {}]) {
			expect(descriptionText(description)).toBeNull();
		}
	});
});

describe('a colour', () => {
	test('can be a hex colour of 3, 4, 6 or 8 digits', () => {
		for (const color of ['#abc', '#ABCD', '#6644ff', '#6644FF', '#6644ff80', '#000', '#FFFFFFFF']) {
			expect(isColor(color)).toBe(true);
			expect(colorOr(color, DEFAULT_COLOR_ON)).toBe(color);
		}
	});

	test('can be a theme variable', () => {
		const colors = [
			'var(--theme--primary)',
			'var(--theme--success)',
			'var(--theme--danger-accent)',
			'var(--theme--form--field--input--foreground-subdued)',
		];

		for (const color of colors) {
			expect(isColor(color)).toBe(true);
			expect(colorOr(color, DEFAULT_COLOR_ON)).toBe(color);
		}
	});

	test('may have spaces around it, which are dropped', () => {
		expect(colorOr('  #6644ff ', DEFAULT_COLOR_ON)).toBe('#6644ff');
		expect(colorOr('\tvar(--theme--danger)\n', DEFAULT_COLOR_ON)).toBe('var(--theme--danger)');
	});

	test('is the default when the option was never set, was cleared or is empty', () => {
		for (const color of [undefined, null, '', '   ']) {
			expect(colorOr(color, DEFAULT_COLOR_ON)).toBe(DEFAULT_COLOR_ON);
			expect(colorOr(color, DEFAULT_COLOR_OFF)).toBe(DEFAULT_COLOR_OFF);
		}
	});

	test('is the default for a hex colour of any other length or with other characters', () => {
		for (const color of ['#', '#ab', '#abcde', '#abcdefa', '#abcdefabc', '#ggg', 'abc', '6644ff', '##abc', '#abc;']) {
			expect(isColor(color)).toBe(false);
			expect(colorOr(color, DEFAULT_COLOR_ON)).toBe(DEFAULT_COLOR_ON);
		}
	});

	test('is the default for every other way to write a colour', () => {
		const colors = ['red', 'transparent', 'currentColor', 'rgb(255, 0, 0)', 'hsl(0 100% 50%)', 'color-mix(in srgb, red, blue)'];
		for (const color of colors) expect(colorOr(color, DEFAULT_COLOR_OFF)).toBe(DEFAULT_COLOR_OFF);
	});

	test('is the default for a variable which is not a theme variable, or has a fallback', () => {
		const colors = [
			'var(--primary)',
			'var(--theme)',
			'var(--theme--)',
			'var(--theme-primary)',
			'var(--theme--primary-)',
			'var(--theme--primary---accent)',
			'var(--theme--Primary)',
			'var( --theme--primary )',
			'var(--theme--primary, red)',
			'var(--theme--primary, url(https://example.com/a.png))',
			'var(--theme--primary',
			'--theme--primary',
		];

		for (const color of colors) {
			expect(isColor(color)).toBe(false);
			expect(colorOr(color, DEFAULT_COLOR_ON)).toBe(DEFAULT_COLOR_ON);
		}
	});

	test('cannot close the declaration, start another or load anything', () => {
		const colors = [
			'#abc; background: url(https://example.com/a.png)',
			'#abc} body { display: none',
			'var(--theme--primary); position: fixed',
			'var(--theme--primary)) url(https://example.com/a.png',
			'url(https://example.com/a.png)',
			'url("javascript:alert(1)")',
			'expression(alert(1))',
			'#abc/*',
			'#abc\n#def',
			'red !important',
			'</style><script>alert(1)</script>',
		];

		for (const color of colors) {
			expect(isColor(color)).toBe(false);
			expect(colorOr(color, DEFAULT_COLOR_ON)).toBe(DEFAULT_COLOR_ON);
		}
	});

	test('is the default for a string too long to be a colour, and for anything which is not a string', () => {
		expect(colorOr(`var(--theme--${'a'.repeat(100)})`, DEFAULT_COLOR_ON)).toBe(DEFAULT_COLOR_ON);

		for (const color of [0, 0xabc, true, {}, ['#abc'], { toString: () => '#abc' }]) {
			expect(isColor(color)).toBe(false);
			expect(colorOr(color, DEFAULT_COLOR_ON)).toBe(DEFAULT_COLOR_ON);
		}
	});

	test('the defaults and the colour of a field without an answer are colours themselves', () => {
		for (const color of [DEFAULT_COLOR_ON, DEFAULT_COLOR_OFF, UNSET_COLOR]) expect(isColor(color)).toBe(true);
	});
});

describe('an icon', () => {
	test('is the default when the option was never set', () => {
		expect(iconOr(undefined, DEFAULT_ICON_ON)).toBe('check');
		expect(iconOr(undefined, DEFAULT_ICON_OFF)).toBe('close');
	});

	test('is the name the option holds', () => {
		expect(iconOr('thumb_up', DEFAULT_ICON_ON)).toBe('thumb_up');
		expect(iconOr(' visibility_off ', DEFAULT_ICON_OFF)).toBe('visibility_off');
	});

	test('is left out when the option was cleared', () => {
		expect(iconOr(null, DEFAULT_ICON_ON)).toBeNull();
		expect(iconOr('', DEFAULT_ICON_ON)).toBeNull();
		expect(iconOr('  ', DEFAULT_ICON_OFF)).toBeNull();
	});

	test('is the default when the option holds anything else', () => {
		for (const icon of [0, 1, true, false, {}, ['check']]) expect(iconOr(icon, DEFAULT_ICON_OFF)).toBe('close');
	});
});

describe('the options', () => {
	test('of a field which has none are the defaults', () => {
		expect(readOptions({})).toEqual({
			label: 'Enabled',
			description: null,
			iconOn: 'check',
			iconOff: 'close',
			colorOn: 'var(--theme--primary)',
			colorOff: 'var(--theme--form--field--input--foreground-subdued)',
		});
	});

	test('are kept as they were set', () => {
		const options = {
			label: 'Published',
			description: 'Visible to everyone.',
			iconOn: 'visibility',
			iconOff: 'visibility_off',
			colorOn: '#2ECDA7',
			colorOff: 'var(--theme--danger)',
		};

		expect(readOptions(options)).toEqual(options);
	});

	test('written for the stock Toggle apply unchanged', () => {
		const options = readOptions({
			label: 'Featured',
			iconOn: 'check_box',
			iconOff: 'check_box_outline_blank',
			colorOn: '#6644FF',
			colorOff: '#A2B5CD',
		});

		expect(options).toEqual({
			label: 'Featured',
			description: null,
			iconOn: 'check_box',
			iconOff: 'check_box_outline_blank',
			colorOn: '#6644FF',
			colorOff: '#A2B5CD',
		});
	});

	test('which were cleared are null, and give the defaults except for the icons', () => {
		const cleared = { label: null, description: null, iconOn: null, iconOff: null, colorOn: null, colorOff: null };

		expect(readOptions(cleared, 'Activé')).toEqual({
			label: 'Activé',
			description: null,
			iconOn: null,
			iconOff: null,
			colorOn: DEFAULT_COLOR_ON,
			colorOff: DEFAULT_COLOR_OFF,
		});
	});

	test('are worked out one by one: a bad one does not spoil the others', () => {
		const options = readOptions({ label: 'Published', colorOn: 'red', colorOff: '#abc', iconOn: 7 });

		expect(options.label).toBe('Published');
		expect(options.colorOn).toBe(DEFAULT_COLOR_ON);
		expect(options.colorOff).toBe('#abc');
		expect(options.iconOn).toBe(DEFAULT_ICON_ON);
	});

	test('ignore keys which are not options', () => {
		const options = readOptions({ label: 'Published', value: true, disabled: true } as object);

		expect(Object.keys(options).sort()).toEqual(['colorOff', 'colorOn', 'description', 'iconOff', 'iconOn', 'label']);
	});
});

describe('the look of a state', () => {
	const options = readOptions({ iconOn: 'visibility', iconOff: 'visibility_off', colorOn: '#2ECDA7', colorOff: '#E35169' });

	test('on and off take their icon and colour from the options', () => {
		expect(lookOf('on', options)).toEqual({ icon: 'visibility', color: '#2ECDA7' });
		expect(lookOf('off', options)).toEqual({ icon: 'visibility_off', color: '#E35169' });
	});

	test('a field without an answer has a look which the options do not change', () => {
		expect(lookOf('unset', options)).toEqual({ icon: UNSET_ICON, color: UNSET_COLOR });
		expect(lookOf('unset', readOptions({ iconOn: null, iconOff: null }))).toEqual({ icon: 'remove', color: UNSET_COLOR });
	});

	test('a cleared icon gives a knob without one', () => {
		const plain = readOptions({ iconOn: null, iconOff: null });

		expect(lookOf('on', plain).icon).toBeNull();
		expect(lookOf('off', plain).icon).toBeNull();
	});

	test('the three states of the defaults differ', () => {
		const looks = (['on', 'off', 'unset'] as State[]).map((state) => lookOf(state, readOptions({})));

		expect(new Set(looks.map((look) => look.icon)).size).toBe(3);
		expect(looks[0]!.color).not.toBe(looks[1]!.color);
	});
});
