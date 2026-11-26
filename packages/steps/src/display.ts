import { defineDisplay } from '@directus/extensions-sdk';
import DisplayComponent from './display.vue';
import { textHandler } from './steps';

/**
 * The Steps display, for layouts and display templates: a pip per step,
 * filled up to the current one, and the name of the current step.
 *
 * Directus 11.17.4 hands a display the options of the field's interface as
 * `interfaceOptions` (app/src/views/private/components/render-display.vue:28-37),
 * and its `handler` the same in a context
 * (app/src/utils/render-string-template.ts:54-97). The steps are the `choices`
 * of those options, so the display has no options of its own and also reads
 * a field whose interface is the stock Dropdown or Radio Buttons.
 *
 * Interfaces and displays are registered apart, so this id can be the id of
 * the interface, as the stock `boolean` interface and display share theirs.
 * It is stored in the schema of every project which uses the display: never
 * rename it.
 */
export default defineDisplay({
	id: 'steps',
	name: 'Steps',
	description: 'The step a field is at: its name, and how far along the list it is',
	icon: 'step',
	types: ['string', 'integer'],
	component: DisplayComponent,
	handler: textHandler,
	options: null,
});
