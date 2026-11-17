import * as yup from "yup";
import type { TranslationMap } from "./languageTypes.js";

/**
 * @openapi
 * components:
 *   schemas:
 *     UpdateTranslationsRequest:
 *       type: object
 *       required: [translations]
 *       properties:
 *         translations:
 *           type: object
 *           description: Map of translation key to translated text (1-200 keys per request).
 *           additionalProperties: { type: string }
 *           example: { "nav.home": "Home", "nav.menu": "Menu" }
 */

export const MAX_TRANSLATIONS_PER_REQUEST = 200;
const MAX_KEY_LENGTH = 200;
const MAX_TEXT_LENGTH = 2000;
const KEY_PATTERN = /^[A-Za-z0-9_.-]+$/;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// yup.mixed() is used on purpose: yup.object() without a shape would have its
// keys removed when the validate middleware strips unknown fields.
export const updateTranslationsSchema = yup.object({
  translations: yup
    .mixed<TranslationMap>()
    .required("Translations are required")
    .test(
      "is-object",
      "Translations must be an object of key/text pairs",
      (value) => isPlainObject(value),
    )
    .test(
      "not-empty",
      "At least one translation is required",
      (value) => !isPlainObject(value) || Object.keys(value).length > 0,
    )
    .test(
      "max-keys",
      `A maximum of ${MAX_TRANSLATIONS_PER_REQUEST} translations is allowed per request`,
      (value) =>
        !isPlainObject(value) ||
        Object.keys(value).length <= MAX_TRANSLATIONS_PER_REQUEST,
    )
    .test(
      "valid-keys",
      `Translation keys must be 1-${MAX_KEY_LENGTH} characters using letters, numbers, dots, dashes or underscores`,
      (value) =>
        !isPlainObject(value) ||
        Object.keys(value).every(
          (key) => key.length <= MAX_KEY_LENGTH && KEY_PATTERN.test(key),
        ),
    )
    .test(
      "valid-values",
      `Translation text must be a non-empty string up to ${MAX_TEXT_LENGTH} characters`,
      (value) =>
        !isPlainObject(value) ||
        Object.values(value).every(
          (text) =>
            typeof text === "string" &&
            text.trim().length > 0 &&
            text.length <= MAX_TEXT_LENGTH,
        ),
    ),
});