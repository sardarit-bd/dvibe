import AppError from "../../shared/utils/AppError.js";
import * as languageRepository from "./languageRepository.js";
import type {
  Language,
  TranslationMap,
  UpdateTranslationsInput,
} from "./languageTypes.js";

export const getLanguages = async (): Promise<Language[]> => {
  return languageRepository.findActiveLanguages();
};

export const getTranslations = async (
  locale: string,
): Promise<TranslationMap> => {
  const language = await languageRepository.findLanguageByCode(locale);

  if (!language || !language.isActive) {
    throw new AppError("Language not found", 404);
  }

  return languageRepository.findTranslations(language.id);
};

export const updateTranslations = async (
  locale: string,
  data: UpdateTranslationsInput,
): Promise<TranslationMap> => {
  const language = await languageRepository.findLanguageByCode(locale);

  if (!language) {
    throw new AppError("Language not found", 404);
  }

  await languageRepository.upsertTranslations(language.id, data.translations);

  return languageRepository.findTranslations(language.id);
};