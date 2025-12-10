import type { LocaleMetadata, LocaleCode } from '@threadkit/core';

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
import { pl } from './locales/pl';
import { ru } from './locales/ru';
import { tr } from './locales/tr';
import { fa } from './locales/fa';
import { vi } from './locales/vi';
import { cs } from './locales/cs';
import { id } from './locales/id';
import { hu } from './locales/hu';
import { uk } from './locales/uk';
import { ar } from './locales/ar';
import { sv } from './locales/sv';
import { ro } from './locales/ro';
import { el } from './locales/el';
import { da } from './locales/da';
import { fi } from './locales/fi';
import { he } from './locales/he';
import { sk } from './locales/sk';
import { th } from './locales/th';
import { bg } from './locales/bg';
import { hr } from './locales/hr';
import { no } from './locales/no';
import { lt } from './locales/lt';
import { sr } from './locales/sr';
import { sl } from './locales/sl';
import { ca } from './locales/ca';
import { et } from './locales/et';
import { lv } from './locales/lv';
import { my } from './locales/my';

/**
 * Map of locale codes to locale metadata objects (includes translations and RTL info)
 */
export type LocaleMap = Record<LocaleCode, LocaleMetadata>;

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
  pl,
  ru,
  tr,
  fa,
  vi,
  cs,
  id,
  hu,
  uk,
  ar,
  sv,
  ro,
  el,
  da,
  fi,
  he,
  sk,
  th,
  bg,
  hr,
  no,
  lt,
  sr,
  sl,
  ca,
  et,
  lv,
  my,
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
 * Get locale metadata for a specific locale code.
 * Returns undefined if the locale is not supported.
 *
 * @example
 * import { getLocale } from '@threadkit/i18n';
 *
 * // Get Spanish locale metadata
 * const spanish = getLocale('es');
 * console.log(spanish.rtl); // false
 * console.log(spanish.translations.post); // 'Publicar'
 *
 * // Auto-detect from browser
 * const browserLocale = navigator.language.split('-')[0];
 * const locale = getLocale(browserLocale as LocaleCode);
 *
 * // With fallback
 * const locale = getLocale(userPreference) ?? getLocale('en')!;
 */
export function getLocale(code: LocaleCode): LocaleMetadata | undefined {
  return locales[code];
}
