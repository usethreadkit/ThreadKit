// Re-export types from core for convenience
export type { TranslationStrings, PartialTranslations, LocaleCode, LocaleMetadata } from '@threadkit/core';

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
export { el } from './locales/el';
export { da } from './locales/da';
export { fi } from './locales/fi';
export { he } from './locales/he';
export { sk } from './locales/sk';
export { th } from './locales/th';
export { bg } from './locales/bg';
export { hr } from './locales/hr';
export { no } from './locales/no';
export { lt } from './locales/lt';
export { sr } from './locales/sr';
export { sl } from './locales/sl';
export { ca } from './locales/ca';
export { et } from './locales/et';
export { lv } from './locales/lv';
export { my } from './locales/my';

// Utilities for dynamic language selection
export { getLocale, locales, supportedLocales } from './utils';
export type { LocaleMap } from './utils';
