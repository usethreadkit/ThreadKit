import { getContext, setContext } from 'svelte';
import {
  createTranslator,
  defaultTranslations,
  type PartialTranslations,
  type TranslationStrings,
  type TranslatorFunction,
  type LocaleMetadata,
} from '@threadkit/core';

const TRANSLATION_KEY = Symbol('threadkit-translations');
const RTL_KEY = Symbol('threadkit-rtl');

/**
 * Set the translations in context (call in parent component)
 * @param translationsOrLocale - Partial translations or full LocaleMetadata with RTL info
 * @param rtlOverride - Optional RTL override (takes precedence over locale metadata)
 */
export function setTranslationContext(
  translationsOrLocale?: PartialTranslations | LocaleMetadata,
  rtlOverride?: boolean
): TranslatorFunction {
  const t = createTranslator(translationsOrLocale);
  const rtl = rtlOverride !== undefined ? rtlOverride : t.rtl;

  setContext(TRANSLATION_KEY, t);
  setContext(RTL_KEY, rtl);

  return t;
}

/**
 * Get the translator function from context
 */
export function getTranslation(): TranslatorFunction {
  const t = getContext<TranslatorFunction | undefined>(TRANSLATION_KEY);
  // Return default translator if not in context (standalone usage)
  return t ?? createTranslator();
}

/**
 * Get the RTL direction from context
 */
export function getRTL(): boolean {
  const rtl = getContext<boolean | undefined>(RTL_KEY);
  // Return false (LTR) if not in context
  return rtl ?? false;
}

// Re-export types and defaults for convenience
export { defaultTranslations };
export type { PartialTranslations, TranslationStrings, TranslatorFunction };
