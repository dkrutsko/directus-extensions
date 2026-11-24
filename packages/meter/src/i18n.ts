import { getCurrentInstance } from 'vue';

export type Translate = (key: string, fallback: string) => string;

/**
 * The app's own translations, for the texts the meter shares with it.
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

/**
 * The language of the page, such as `de-DE`, which the app writes on the root
 * element whenever the user's language changes
 * (app/src/lang/set-language.ts:30 in Directus 11.17.4).
 * `undefined` when there is none, which is the language of the browser to the
 * number formatting.
 */
export function pageLanguage(): string | undefined {
	return document.documentElement.lang || undefined;
}

/**
 * The language the numbers are written in: that of the user. vue-i18n puts
 * `$i18n` beside `$t`, and its `locale` is tracked like a translation, so a
 * change of language writes the numbers again. Without it, the language of
 * the page.
 */
export function useLanguage(): () => string | undefined {
	const i18n: unknown = getCurrentInstance()?.appContext.config.globalProperties['$i18n'];

	return () => {
		const locale: unknown = typeof i18n === 'object' && i18n !== null ? (i18n as { locale?: unknown }).locale : undefined;
		return typeof locale === 'string' && locale !== '' ? locale : pageLanguage();
	};
}
