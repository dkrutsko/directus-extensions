import { getCurrentInstance } from 'vue';

export type Translate = (key: string, fallback: string) => string;

/**
 * The app's own translations, for the texts the track shares with it.
 *
 * The app installs vue-i18n in composition mode, which injects `$t` globally
 * (app/src/lang/index.ts:8-18 in Directus 11.17.4), so `$t` is on the app's
 * `globalProperties` and can be read from any component an extension
 * renders. That keeps `vue-i18n` out of the imports: an app bundle may import
 * only `vue` and the extensions SDK.
 *
 * The fallback is what the caller gets when the app has no `$t` or no such
 * key, so the text still reads correctly if a later release drops the key.
 * Call the result while rendering or in a computed value: the language is
 * then tracked, and a change of language draws the text again.
 */
export function useAppText(): Translate {
	const candidate: unknown = getCurrentInstance()?.appContext.config.globalProperties['$t'];
	const translate = typeof candidate === 'function' ? (candidate as (key: string) => unknown) : null;

	return (key, fallback) => {
		const text = translate?.(key);
		return typeof text === 'string' && text !== '' && text !== key ? text : fallback;
	};
}
