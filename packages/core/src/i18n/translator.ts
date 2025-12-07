import type { TranslationStrings, PartialTranslations } from './types';
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
};

/**
 * Create a translator function with the given translations merged with defaults.
 * Returns a function that looks up translation keys and returns the translated string.
 *
 * @example
 * // Default English
 * const t = createTranslator();
 * t('post') // 'Post'
 *
 * // With Spanish translations
 * import { es } from '@threadkit/i18n';
 * const t = createTranslator(es);
 * t('post') // 'Publicar'
 *
 * // Partial overrides
 * const t = createTranslator({ post: 'Submit' });
 * t('post') // 'Submit'
 * t('cancel') // 'Cancel' (falls back to default)
 */
export function createTranslator(
  translations?: PartialTranslations
): TranslatorFunction {
  // Merge provided translations with defaults (defaults as fallback)
  const merged: TranslationStrings = translations
    ? { ...defaultTranslations, ...translations }
    : defaultTranslations;

  return (
    key: keyof TranslationStrings,
    vars?: Record<string, string | number>
  ): string => {
    const value = merged[key];
    if (vars) {
      return interpolate(value, vars);
    }
    return value;
  };
}
