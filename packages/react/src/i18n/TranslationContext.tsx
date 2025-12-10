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
 * Context for translations with RTL support
 */
interface TranslationContextValue {
  t: TranslatorFunction;
  rtl: boolean;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

/**
 * Props for the TranslationProvider
 */
export interface TranslationProviderProps {
  /**
   * Custom translations to merge with defaults.
   * Can be a full TranslationStrings object, partial overrides, or LocaleMetadata.
   */
  translations?: PartialTranslations;
  /**
   * Override RTL direction. If not provided, will be inferred from the translations locale metadata.
   */
  rtl?: boolean;
  children: ReactNode;
}

/**
 * Provider component for translations with RTL support.
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
 * // With Arabic (RTL automatically detected)
 * import { ar } from '@threadkit/i18n';
 * <TranslationProvider translations={ar}>
 *   <ThreadKit ... />
 * </TranslationProvider>
 *
 * // Partial overrides
 * <TranslationProvider translations={{ post: 'Submit' }}>
 *   <ThreadKit ... />
 * </TranslationProvider>
 *
 * // Manual RTL override
 * <TranslationProvider rtl={true}>
 *   <ThreadKit ... />
 * </TranslationProvider>
 */
export function TranslationProvider({
  translations,
  rtl: rtlProp,
  children,
}: TranslationProviderProps) {
  const value = useMemo(() => {
    const t = createTranslator(translations);
    // Use explicit rtl prop if provided, otherwise use the translator's rtl property
    const rtl = rtlProp !== undefined ? rtlProp : t.rtl;
    return { t, rtl };
  }, [translations, rtlProp]);

  return (
    <TranslationContext.Provider value={value}>
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
 *
 * // Checking RTL
 * function MyComponent() {
 *   const t = useTranslation();
 *   return <div dir={t.rtl ? 'rtl' : 'ltr'}>{t('post')}</div>;
 * }
 */
export function useTranslation(): TranslatorFunction {
  const context = useContext(TranslationContext);

  // If no provider, return a default translator (allows standalone usage)
  if (!context) {
    return createTranslator();
  }

  return context.t;
}

/**
 * Hook to check if the current locale is right-to-left.
 *
 * @example
 * function MyComponent() {
 *   const isRTL = useRTL();
 *   return <div style={{ textAlign: isRTL ? 'right' : 'left' }}>Content</div>;
 * }
 */
export function useRTL(): boolean {
  const context = useContext(TranslationContext);

  // If no provider, default to LTR
  if (!context) {
    return false;
  }

  return context.rtl;
}

// Re-export types for convenience
export type { TranslationStrings, PartialTranslations, TranslatorFunction };
export { defaultTranslations };
