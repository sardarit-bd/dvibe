import { db } from "../../config/database/index.js";
import type { Language, LanguageRef, TranslationMap } from "./languageTypes.js";

export const findActiveLanguages = async (): Promise<Language[]> => {
  return db.language.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true, isActive: true },
    orderBy: { name: "asc" },
  });
};

export const findLanguageByCode = async (
  code: string,
): Promise<LanguageRef | null> => {
  return db.language.findUnique({
    where: { code },
    select: { id: true, isActive: true },
  });
};

export const findTranslations = async (
  languageId: string,
): Promise<TranslationMap> => {
  const rows = await db.translation.findMany({
    where: { languageId },
    select: { translationKey: true, translatedText: true },
    orderBy: { translationKey: "asc" },
  });

  return Object.fromEntries(
    rows.map((row) => [row.translationKey, row.translatedText]),
  );
};

export const upsertTranslations = async (
  languageId: string,
  translations: TranslationMap,
): Promise<void> => {
  await db.$transaction(
    Object.entries(translations).map(([translationKey, translatedText]) =>
      db.translation.upsert({
        where: { languageId_translationKey: { languageId, translationKey } },
        create: { languageId, translationKey, translatedText },
        update: { translatedText },
      }),
    ),
  );
};