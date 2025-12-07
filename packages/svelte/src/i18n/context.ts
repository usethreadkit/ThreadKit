import { getContext, setContext } from 'svelte';
import {
  createTranslator,
  defaultTranslations,
  type PartialTranslations,
  type TranslationStrings,
  type TranslatorFunction,
} from '@threadkit/core';

const TRANSLATION_KEY = Symbol('threadkit-translations');

/**
 * Set the translations in context (call in parent component)
 */
export function setTranslationContext(translations?: PartialTranslations): TranslatorFunction {
  const t = createTranslator(translations);
  setContext(TRANSLATION_KEY, t);
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

// Re-export types and defaults for convenience
export { defaultTranslations };
export type { PartialTranslations, TranslationStrings, TranslatorFunction };
