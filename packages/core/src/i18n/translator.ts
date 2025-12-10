import type { TranslationStrings, PartialTranslations, LocaleMetadata } from './types';
import { defaultTranslations } from './defaults';

/**
 * Interpolate variables into a translation string.
 * Replaces {key} placeholders with values from the vars object.
 *
 * @example
 * interpolate('{n}m ago', { n: 5 }) // '5m ago'
 * interpolate('Hold for {seconds} more seconds...', { seconds: 10 }) // 'Hold for 10 more seconds...'
 */
export function interpolate(
  str: string,
  vars: Record<string, string | number>
): string {
  return str.replace(/\{(\w+)\}/g, (_, key) => {
    const value = vars[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

/**
 * Translator function type - looks up a translation key and returns the string.
 * Also exposes rtl property to check if the current locale is right-to-left.
 */
export type TranslatorFunction = {
  /**
   * Get a translation by key, with optional interpolation variables.
   *
   * @example
   * t('post') // 'Post' or translated value
   * t('minutesAgo', { n: 5 }) // '5m ago' or translated value
   */
  (key: keyof TranslationStrings, vars?: Record<string, string | number>): string;

  /**
   * Whether the current locale uses right-to-left text direction
   */
  rtl: boolean;
};

/**
 * Create a translator function with the given translations or locale metadata.
 * Returns a function that looks up translation keys and returns the translated string.
 * The function also exposes an rtl property to check text direction.
 *
 * @example
 * // Default English
 * const t = createTranslator();
 * t('post') // 'Post'
 * t.rtl // false
 *
 * // With Spanish locale metadata
 * import { es } from '@threadkit/i18n';
 * const t = createTranslator(es);
 * t('post') // 'Publicar'
 * t.rtl // false
 *
 * // With Arabic locale metadata (RTL)
 * import { ar } from '@threadkit/i18n';
 * const t = createTranslator(ar);
 * t('post') // 'نشر'
 * t.rtl // true
 *
 * // Partial overrides
 * const t = createTranslator({ post: 'Submit' });
 * t('post') // 'Submit'
 * t('cancel') // 'Cancel' (falls back to default)
 * t.rtl // false
 */
export function createTranslator(
  localeOrTranslations?: LocaleMetadata | PartialTranslations
): TranslatorFunction {
  // Check if input is LocaleMetadata or just translations
  const isLocaleMetadata = localeOrTranslations && 'translations' in localeOrTranslations && 'rtl' in localeOrTranslations;

  const merged: TranslationStrings = isLocaleMetadata
    ? { ...defaultTranslations, ...(localeOrTranslations as LocaleMetadata).translations }
    : localeOrTranslations
    ? { ...defaultTranslations, ...(localeOrTranslations as PartialTranslations) }
    : defaultTranslations;

  const rtl = isLocaleMetadata ? (localeOrTranslations as LocaleMetadata).rtl : false;

  const translatorFn = (
    key: keyof TranslationStrings,
    vars?: Record<string, string | number>
  ): string => {
    const value = merged[key];
    if (vars) {
      return interpolate(value, vars);
    }
    return value;
  };

  // Add rtl property to the function
  translatorFn.rtl = rtl;

  return translatorFn as TranslatorFunction;
}
