import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

const mockDb = {
  event: { findMany: jest.fn<AnyFn>(), findFirst: jest.fn<AnyFn>() },
};

jest.unstable_mockModule("../../../../config/database/index.js", () => ({
  db: mockDb,
}));

const { default: app } = await import("../../../../app.js");

const row = {
  id: "e1",
  title: "Friday Night Live",
  description: null,
  location: "Main Hall",
  eventDate: new Date("2026-12-01T00:00:00.000Z"),
  startTime: "20:00",
  endTime: null,
  image: null,
  status: "PUBLISHED",
  createdAt: new Date("2026-11-01T00:00:00.000Z"),
  updatedAt: new Date("2026-11-01T00:00:00.000Z"),
};

const publicStatuses = { in: ["PUBLISHED", "CANCELLED"] };

describe("Events API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("GET /api/events", () => {
    it("returns upcoming public events with a date string", async () => {
      mockDb.event.findMany.mockResolvedValue([row]);

      const res = await request(app).get("/api/events");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Events fetched successfully");
      expect(res.body.data[0].eventDate).toBe("2026-12-01");
      expect(mockDb.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: publicStatuses,
            eventDate: { gte: expect.any(Date) },
          },
          skip: 0,
          take: 20,
        }),
      );
    });

    it("includes past events when upcoming=false", async () => {
      mockDb.event.findMany.mockResolvedValue([]);

      const res = await request(app).get("/api/events?upcoming=false");

      expect(res.status).toBe(200);
      expect(mockDb.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: publicStatuses } }),
      );
    });

    it("applies limit and offset", async () => {
      mockDb.event.findMany.mockResolvedValue([]);

      await request(app).get("/api/events?limit=5&offset=10");

      expect(mockDb.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it("returns 400 for an invalid limit", async () => {
      const res = await request(app).get("/api/events?limit=500");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("limit cannot exceed 100");
      expect(mockDb.event.findMany).not.toHaveBeenCalled();
    });

    it("returns 400 for an invalid upcoming value", async () => {
      const res = await request(app).get("/api/events?upcoming=maybe");

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/events/:id", () => {
    it("returns the event", async () => {
      mockDb.event.findFirst.mockResolvedValue(row);

      const res = await request(app).get("/api/events/e1");

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe("e1");
      expect(res.body.data.eventDate).toBe("2026-12-01");
      expect(mockDb.event.findFirst).toHaveBeenCalledWith({
        where: { id: "e1", status: publicStatuses },
      });
    });

    it("returns 404 for a draft or unknown event", async () => {
      mockDb.event.findFirst.mockResolvedValue(null);

      const res = await request(app).get("/api/events/nope");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Event not found");
    });
  });
});