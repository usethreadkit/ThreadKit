// Re-export types from core for convenience
export type { TranslationStrings, PartialTranslations, LocaleCode } from './types';

// Language files - individually exported for tree-shaking
export { en } from './locales/en';
export { es } from './locales/es';
export { fr } from './locales/fr';
export { de } from './locales/de';
export { pt } from './locales/pt';
export { ja } from './locales/ja';
export { zh } from './locales/zh';
export { ko } from './locales/ko';
export { it } from './locales/it';
export { nl } from './locales/nl';
export { ru } from './locales/ru';

// Utilities for dynamic language selection
export { getLocale, locales, supportedLocales } from './utils';
export type { LocaleMap } from './utils';
