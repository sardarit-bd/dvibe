export interface Language {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface LanguageRef {
  id: string;
  isActive: boolean;
}

export type TranslationMap = Record<string, string>;

export interface UpdateTranslationsInput {
  translations: TranslationMap;
}