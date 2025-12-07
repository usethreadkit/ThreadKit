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
export { pl } from './locales/pl';
export { ru } from './locales/ru';
export { tr } from './locales/tr';
export { fa } from './locales/fa';
export { vi } from './locales/vi';
export { cs } from './locales/cs';
export { id } from './locales/id';
export { hu } from './locales/hu';
export { uk } from './locales/uk';
export { ar } from './locales/ar';
export { sv } from './locales/sv';
export { ro } from './locales/ro';

// Utilities for dynamic language selection
export { getLocale, locales, supportedLocales } from './utils';
export type { LocaleMap } from './utils';
