import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

const mockDb = {
  vibe: { findMany: jest.fn<AnyFn>(), findFirst: jest.fn<AnyFn>() },
};

jest.unstable_mockModule("../../../../config/database/index.js", () => ({
  db: mockDb,
}));

const { default: app } = await import("../../../../app.js");

const vibe = {
  id: "v1",
  title: "After Dark",
  description: null,
  category: "NIGHTLIFE",
  image: null,
  location: "Rooftop Lounge",
  status: "PUBLISHED",
  createdAt: new Date("2026-11-01T00:00:00.000Z"),
  updatedAt: new Date("2026-11-01T00:00:00.000Z"),
};

describe("Vibes API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("GET /api/vibes", () => {
    it("returns published vibes", async () => {
      mockDb.vibe.findMany.mockResolvedValue([vibe]);

      const res = await request(app).get("/api/vibes");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Vibes fetched successfully");
      expect(res.body.data).toHaveLength(1);
      expect(mockDb.vibe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "PUBLISHED" },
          skip: 0,
          take: 20,
        }),
      );
    });

    it("filters by category", async () => {
      mockDb.vibe.findMany.mockResolvedValue([vibe]);

      const res = await request(app).get("/api/vibes?category=NIGHTLIFE");

      expect(res.status).toBe(200);
      expect(mockDb.vibe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "PUBLISHED", category: "NIGHTLIFE" },
        }),
      );
    });

    it("returns 400 for an invalid category", async () => {
      const res = await request(app).get("/api/vibes?category=JAZZ");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("category must be one of");
      expect(mockDb.vibe.findMany).not.toHaveBeenCalled();
    });

    it("returns 400 for an invalid limit", async () => {
      const res = await request(app).get("/api/vibes?limit=0");

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/vibes/:id", () => {
    it("returns the vibe", async () => {
      mockDb.vibe.findFirst.mockResolvedValue(vibe);

      const res = await request(app).get("/api/vibes/v1");

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe("v1");
      expect(mockDb.vibe.findFirst).toHaveBeenCalledWith({
        where: { id: "v1", status: "PUBLISHED" },
      });
    });

    it("returns 404 for a draft or unknown vibe", async () => {
      mockDb.vibe.findFirst.mockResolvedValue(null);

      const res = await request(app).get("/api/vibes/nope");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Vibe not found");
    });
  });
});