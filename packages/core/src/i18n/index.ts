export type {
  TranslationStrings,
  PartialTranslations,
  LocaleCode,
  LocaleMetadata,
} from './types';

export { defaultTranslations } from './defaults';

export { createTranslator, interpolate } from './translator';
export type { TranslatorFunction } from './translator';
