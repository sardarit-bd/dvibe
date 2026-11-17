import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";

const SECRET = "test-secret";
process.env.JWT_SECRET = SECRET;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

const mockDb = {
  user: { findUnique: jest.fn<AnyFn>() },
  language: { findMany: jest.fn<AnyFn>(), findUnique: jest.fn<AnyFn>() },
  translation: { findMany: jest.fn<AnyFn>(), upsert: jest.fn<AnyFn>() },
  $transaction: jest.fn<AnyFn>(),
};

jest.unstable_mockModule("../../../../config/database/index.js", () => ({
  db: mockDb,
}));

const { default: app } = await import("../../../../app.js");

const auth = { Authorization: `Bearer ${jwt.sign({ id: "u1" }, SECRET)}` };

const asRole = (role: string): void => {
  mockDb.user.findUnique.mockResolvedValue({
    id: "u1",
    name: "User",
    email: "user@example.com",
    role,
  });
};

describe("Language API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockDb.$transaction.mockImplementation(async (ops: unknown[]) =>
      Promise.all(ops),
    );
  });

  describe("GET /api/languages", () => {
    it("returns the active languages", async () => {
      mockDb.language.findMany.mockResolvedValue([
        { id: "l1", code: "en", name: "English", isActive: true },
      ]);

      const res = await request(app).get("/api/languages");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(mockDb.language.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });
  });

  describe("GET /api/translations/:locale", () => {
    it("returns a flat translation map", async () => {
      mockDb.language.findUnique.mockResolvedValue({ id: "l1", isActive: true });
      mockDb.translation.findMany.mockResolvedValue([
        { translationKey: "nav.home", translatedText: "Home" },
        { translationKey: "nav.menu", translatedText: "Menu" },
      ]);

      const res = await request(app).get("/api/translations/en");

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ "nav.home": "Home", "nav.menu": "Menu" });
      expect(res.headers["cache-control"]).toBe("public, max-age=60");
    });

    it("returns 404 for an unknown locale", async () => {
      mockDb.language.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/api/translations/xx");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Language not found");
      expect(mockDb.translation.findMany).not.toHaveBeenCalled();
    });

    it("returns 404 for an inactive language", async () => {
      mockDb.language.findUnique.mockResolvedValue({
        id: "l1",
        isActive: false,
      });

      const res = await request(app).get("/api/translations/en");

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/admin/translations/:locale", () => {
    const body = { translations: { "nav.home": "Home" } };

    it("returns 401 without a token", async () => {
      const res = await request(app)
        .put("/api/admin/translations/en")
        .send(body);

      expect(res.status).toBe(401);
    });

    it("returns 403 for a CUSTOMER", async () => {
      asRole("CUSTOMER");

      const res = await request(app)
        .put("/api/admin/translations/en")
        .set(auth)
        .send(body);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Forbidden");
    });

    it("returns 403 for a RESTAURANT_OWNER", async () => {
      asRole("RESTAURANT_OWNER");

      const res = await request(app)
        .put("/api/admin/translations/en")
        .set(auth)
        .send(body);

      expect(res.status).toBe(403);
    });

    it("upserts translations and returns the updated map", async () => {
      asRole("ADMIN");
      mockDb.language.findUnique.mockResolvedValue({ id: "l1", isActive: true });
      mockDb.translation.upsert.mockResolvedValue({});
      mockDb.translation.findMany.mockResolvedValue([
        { translationKey: "nav.home", translatedText: "Home" },
      ]);

      const res = await request(app)
        .put("/api/admin/translations/en")
        .set(auth)
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ "nav.home": "Home" });
      expect(mockDb.translation.upsert).toHaveBeenCalledWith({
        where: {
          languageId_translationKey: {
            languageId: "l1",
            translationKey: "nav.home",
          },
        },
        create: {
          languageId: "l1",
          translationKey: "nav.home",
          translatedText: "Home",
        },
        update: { translatedText: "Home" },
      });
    });

    it("returns 404 for an unknown locale", async () => {
      asRole("ADMIN");
      mockDb.language.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/admin/translations/xx")
        .set(auth)
        .send(body);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Language not found");
      expect(mockDb.translation.upsert).not.toHaveBeenCalled();
    });

    it("returns 400 for an empty body", async () => {
      asRole("ADMIN");

      const res = await request(app)
        .put("/api/admin/translations/en")
        .set(auth)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Translations are required");
    });

    it("returns 400 for an empty translations object", async () => {
      asRole("ADMIN");

      const res = await request(app)
        .put("/api/admin/translations/en")
        .set(auth)
        .send({ translations: {} });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("At least one translation is required");
    });

    it("returns 400 for a non-string value", async () => {
      asRole("ADMIN");

      const res = await request(app)
        .put("/api/admin/translations/en")
        .set(auth)
        .send({ translations: { "nav.home": 5 } });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Translation text must be");
    });

    it("returns 400 when more than 200 keys are sent", async () => {
      asRole("ADMIN");
      const translations = Object.fromEntries(
        Array.from({ length: 201 }, (_, i) => [`k${i}`, "v"]),
      );

      const res = await request(app)
        .put("/api/admin/translations/en")
        .set(auth)
        .send({ translations });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("A maximum of 200");
    });
  });
});