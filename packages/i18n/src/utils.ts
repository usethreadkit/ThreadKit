import type { TranslationStrings, LocaleCode } from '@threadkit/core';

import { en } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { de } from './locales/de';
import { pt } from './locales/pt';
import { ja } from './locales/ja';
import { zh } from './locales/zh';
import { ko } from './locales/ko';
import { it } from './locales/it';
import { nl } from './locales/nl';
import { ru } from './locales/ru';

/**
 * Map of locale codes to translation objects
 */
export type LocaleMap = Record<LocaleCode, TranslationStrings>;

/**
 * All available locales bundled together.
 * Use this when you want to support all languages and don't mind the bundle size.
 *
 * @example
 * import { locales } from '@threadkit/i18n';
 * const userLocale = navigator.language.split('-')[0];
 * const translations = locales[userLocale] || locales.en;
 */
export const locales: LocaleMap = {
  en,
  es,
  fr,
  de,
  pt,
  ja,
  zh,
  ko,
  it,
  nl,
  ru,
};

/**
 * List of supported locale codes.
 * Useful for building language selectors.
 *
 * @example
 * import { supportedLocales } from '@threadkit/i18n';
 * // ['en', 'es', 'fr', 'de', 'pt', 'ja', 'zh', 'ko', 'it', 'nl', 'ru']
 */
export const supportedLocales: LocaleCode[] = Object.keys(locales) as LocaleCode[];

/**
 * Get translations for a specific locale code.
 * Returns undefined if the locale is not supported.
 *
 * @example
 * import { getLocale } from '@threadkit/i18n';
 *
 * // Get Spanish translations
 * const spanish = getLocale('es');
 *
 * // Auto-detect from browser
 * const browserLocale = navigator.language.split('-')[0];
 * const translations = getLocale(browserLocale as LocaleCode);
 *
 * // With fallback
 * const t = getLocale(userPreference) ?? getLocale('en')!;
 */
export function getLocale(code: LocaleCode): TranslationStrings | undefined {
  return locales[code];
}
