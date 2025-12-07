import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  createTranslator,
  defaultTranslations,
  type TranslationStrings,
  type PartialTranslations,
  type TranslatorFunction,
} from '@threadkit/core';

/**
 * Context for translations
 */
const TranslationContext = createContext<TranslatorFunction | null>(null);

/**
 * Props for the TranslationProvider
 */
export interface TranslationProviderProps {
  /**
   * Custom translations to merge with defaults.
   * Can be a full TranslationStrings object or partial overrides.
   */
  translations?: PartialTranslations;
  children: ReactNode;
}

/**
 * Provider component for translations.
 * Wrap your ThreadKit component with this to enable translations.
 *
 * @example
 * // Default English
 * <TranslationProvider>
 *   <ThreadKit ... />
 * </TranslationProvider>
 *
 * // With Spanish
 * import { es } from '@threadkit/i18n';
 * <TranslationProvider translations={es}>
 *   <ThreadKit ... />
 * </TranslationProvider>
 *
 * // Partial overrides
 * <TranslationProvider translations={{ post: 'Submit' }}>
 *   <ThreadKit ... />
 * </TranslationProvider>
 */
export function TranslationProvider({
  translations,
  children,
}: TranslationProviderProps) {
  const t = useMemo(() => createTranslator(translations), [translations]);

  return (
    <TranslationContext.Provider value={t}>
      {children}
    </TranslationContext.Provider>
  );
}

/**
 * Hook to access the translator function in components.
 *
 * @example
 * function MyComponent() {
 *   const t = useTranslation();
 *   return <button>{t('post')}</button>;
 * }
 *
 * // With interpolation
 * function TimeAgo({ minutes }: { minutes: number }) {
 *   const t = useTranslation();
 *   return <span>{t('minutesAgo', { n: minutes })}</span>;
 * }
 */
export function useTranslation(): TranslatorFunction {
  const context = useContext(TranslationContext);

  // If no provider, return a default translator (allows standalone usage)
  if (!context) {
    return createTranslator();
  }

  return context;
}

// Re-export types for convenience
export type { TranslationStrings, PartialTranslations, TranslatorFunction };
export { defaultTranslations };
