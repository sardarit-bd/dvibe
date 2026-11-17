import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>;
const mockFn = () => jest.fn<AnyAsyncFn>();

const repo = {
  findActiveLanguages: mockFn(),
  findLanguageByCode: mockFn(),
  findTranslations: mockFn(),
  upsertTranslations: mockFn(),
};

jest.unstable_mockModule("../../languageRepository.js", () => ({ ...repo }));

const service = await import("../../languageService.js");

describe("languageService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns the active languages", async () => {
    repo.findActiveLanguages.mockResolvedValue([{ id: "l1", code: "en" }]);

    await expect(service.getLanguages()).resolves.toEqual([
      { id: "l1", code: "en" },
    ]);
  });

  describe("getTranslations", () => {
    it("throws 404 for an unknown locale", async () => {
      repo.findLanguageByCode.mockResolvedValue(null);

      await expect(service.getTranslations("xx")).rejects.toMatchObject({
        statusCode: 404,
        message: "Language not found",
      });
      expect(repo.findTranslations).not.toHaveBeenCalled();
    });

    it("throws 404 for an inactive language", async () => {
      repo.findLanguageByCode.mockResolvedValue({ id: "l1", isActive: false });

      await expect(service.getTranslations("en")).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(repo.findTranslations).not.toHaveBeenCalled();
    });

    it("returns the translation map", async () => {
      repo.findLanguageByCode.mockResolvedValue({ id: "l1", isActive: true });
      repo.findTranslations.mockResolvedValue({ "nav.home": "Home" });

      await expect(service.getTranslations("en")).resolves.toEqual({
        "nav.home": "Home",
      });
      expect(repo.findTranslations).toHaveBeenCalledWith("l1");
    });
  });

  describe("updateTranslations", () => {
    it("throws 404 for an unknown locale", async () => {
      repo.findLanguageByCode.mockResolvedValue(null);

      await expect(
        service.updateTranslations("xx", { translations: { a: "b" } }),
      ).rejects.toMatchObject({ statusCode: 404, message: "Language not found" });
      expect(repo.upsertTranslations).not.toHaveBeenCalled();
    });

    it("upserts and returns the updated map, even for an inactive language", async () => {
      repo.findLanguageByCode.mockResolvedValue({ id: "l1", isActive: false });
      repo.upsertTranslations.mockResolvedValue(undefined);
      repo.findTranslations.mockResolvedValue({ a: "b" });

      await expect(
        service.updateTranslations("en", { translations: { a: "b" } }),
      ).resolves.toEqual({ a: "b" });
      expect(repo.upsertTranslations).toHaveBeenCalledWith("l1", { a: "b" });
    });
  });
});