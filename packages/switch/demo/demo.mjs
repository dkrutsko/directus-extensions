// The demo of the Switch interface: one form (a singleton) with every option of the README at least once. The
// sandbox builds it from this file; how a definition works is in sandbox/README.md, "Demos".
import { collection, field, group } from '../../../sandbox/demo/define.mjs';

/** A boolean field on the Switch, half as wide as the form, with the Boolean display the interface suggests. */
const toggle = (key, name, spec) => field(key, name, { type: 'boolean', interface: 'switch', display: 'boolean', width: 'half', ...spec });

export default collection('demo_switch', {
	name: 'Switch',
	icon: 'toggle_on',
	note: 'The Switch interface with every option',
	singleton: true,
	about:
		'**Switch** draws a boolean field as a box with a label and a line of description, and an on/off switch at its end. ' +
		'A click anywhere in the box flips it.',

	fields: [
		group('recipes', 'Recipes', { open: true, icon: 'menu_book', text: 'The set-ups most fields want.' }, [
			toggle('published', 'Label and description', {
				note: 'The usual set-up: a label, and a line which says what the switch does.',
				options: { label: 'Published', description: 'Visible to everyone on the public site.' },
				value: true,
			}),
			toggle('comments', 'Label only', {
				note: 'One line, as tall as a stock input.',
				options: { label: 'Allow comments' },
				value: false,
			}),
			toggle('plain', 'No options', {
				note: 'The label is "Enabled", in the language of the user.',
				options: {},
				value: true,
			}),
			toggle('newsletter', 'Not set yet', {
				note: 'A field which holds `null` shows its knob in the middle; the first click turns it on.',
				options: { label: 'Send the newsletter', description: 'Goes out on the first Monday of the month.' },
				value: null,
			}),
		]),

		group('looks', 'Icons and colors', { icon: 'palette', text: 'A color is a hex color or a theme variable such as `var(--theme--success)`.' }, [
			toggle('visible', 'Own icons and colors', {
				options: { label: 'Visible', iconOn: 'visibility', iconOff: 'visibility_off', colorOn: '#2ECDA7', colorOff: '#E35169' },
				value: true,
			}),
			toggle('bookings', 'Theme colors', {
				note: 'Theme variables follow the light and dark themes.',
				options: { label: 'Open for bookings', colorOn: 'var(--theme--success)', colorOff: 'var(--theme--danger)' },
				value: false,
			}),
			toggle('reminders', 'Other icons', {
				options: { label: 'Reminders', description: 'A message the day before.', iconOn: 'notifications_active', iconOff: 'notifications_off' },
				value: true,
			}),
			toggle('bare', 'Icons cleared', {
				note: 'A cleared icon is stored as `null` and leaves a plain knob.',
				options: { label: 'Plain knob', iconOn: null, iconOff: null },
				value: false,
			}),
		]),

		group('states', 'Read-only and long text', { icon: 'lock' }, [
			toggle('archived', 'Read-only', {
				note: 'Dimmed, passed by the Tab key, and never changed.',
				readonly: true,
				options: { label: 'Archived', description: 'Set by the nightly clean-up.' },
				value: true,
			}),
			toggle('wordy', 'Long text', {
				note: 'Label and description wrap, and the box grows with them.',
				options: {
					label: 'Send a reminder to every member of the hiking club before each walk',
					description: 'Two days ahead, with the meeting point, the route and what the weather is expected to be on the day.',
				},
				value: false,
			}),
		]),
	],
});
