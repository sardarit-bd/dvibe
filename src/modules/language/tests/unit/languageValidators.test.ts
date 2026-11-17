import { describe, it, expect } from "@jest/globals";
import {
  updateTranslationsSchema,
  MAX_TRANSLATIONS_PER_REQUEST,
} from "../../languageValidators.js";

describe("updateTranslationsSchema", () => {
  it("accepts a valid map and keeps its keys when unknown fields are stripped", async () => {
    const result = await updateTranslationsSchema.validate(
      { translations: { "nav.home": "Home" }, extra: 1 },
      { stripUnknown: true },
    );

    expect(result).toEqual({ translations: { "nav.home": "Home" } });
  });

  it("requires translations", async () => {
    await expect(updateTranslationsSchema.validate({})).rejects.toThrow(
      "Translations are required",
    );
  });

  it("rejects an empty map", async () => {
    await expect(
      updateTranslationsSchema.validate({ translations: {} }),
    ).rejects.toThrow("At least one translation is required");
  });

  it("rejects an array", async () => {
    await expect(
      updateTranslationsSchema.validate({ translations: ["a"] }),
    ).rejects.toThrow("Translations must be an object");
  });

  it("rejects invalid keys", async () => {
    await expect(
      updateTranslationsSchema.validate({ translations: { "bad key": "x" } }),
    ).rejects.toThrow("Translation keys must be");
  });

  it("rejects non-string and blank values", async () => {
    await expect(
      updateTranslationsSchema.validate({ translations: { a: 1 } }),
    ).rejects.toThrow("Translation text must be");
    await expect(
      updateTranslationsSchema.validate({ translations: { a: "  " } }),
    ).rejects.toThrow("Translation text must be");
  });

  it("rejects more keys than the per-request limit", async () => {
    const translations = Object.fromEntries(
      Array.from({ length: MAX_TRANSLATIONS_PER_REQUEST + 1 }, (_, i) => [
        `k${i}`,
        "v",
      ]),
    );

    await expect(
      updateTranslationsSchema.validate({ translations }),
    ).rejects.toThrow("A maximum of");
  });
});