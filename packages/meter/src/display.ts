import { defineDisplay } from '@directus/extensions-sdk';
import DisplayComponent from './display.vue';
import { pageLanguage } from './i18n';
import { textHandler } from './meter';
import { optionFields } from './options';

/**
 * The Meter display, for layouts and display templates: a bar of a fixed
 * length, filled as far as the value has come in its range, and the value as
 * text.
 *
 * Directus 11.17.4 hands a display the options of the field's interface as
 * `interfaceOptions` (app/src/views/private/components/render-display.vue:28-37),
 * its `handler` the same in a context
 * (app/src/utils/render-string-template.ts:54-97), and its options form the
 * field. The display takes from them whatever its own options do not set, so
 * a field is configured once, in its interface.
 *
 * The dialog of a stock Repeater's field hands the options form a stand-in
 * without `meta` instead of the field. The form is then told that the options
 * of the interface are not known (`optionFields`).
 *
 * Interfaces and displays are registered apart, so this id can be the id of
 * the interface, as the stock `boolean` interface and display share theirs.
 * It is stored in the schema of every project which uses the display: never
 * rename it.
 */
export default defineDisplay({
	id: 'meter',
	name: 'Meter',
	description: 'A number as a short bar, filled as far as the value has come in its range, and the value beside it',
	icon: 'speed',
	types: ['integer', 'bigInteger', 'float', 'decimal'],
	component: DisplayComponent,
	handler: (value, options, context) => textHandler(value, options, context, pageLanguage()),
	options: ({ field }) => optionFields(field?.meta?.options ?? {}, true, undefined, field?.meta != null),
});
