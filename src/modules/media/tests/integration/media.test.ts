import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";

const SECRET = "test-secret";
process.env.JWT_SECRET = SECRET;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

const mockDb = {
  user: { findUnique: jest.fn<AnyFn>() },
  restaurant: { findUnique: jest.fn<AnyFn>() },
  media: {
    create: jest.fn<AnyFn>(),
    findUnique: jest.fn<AnyFn>(),
    findFirst: jest.fn<AnyFn>(),
    delete: jest.fn<AnyFn>(),
  },
  menuItem: { findFirst: jest.fn<AnyFn>() },
  restaurantPhoto: {
    findUnique: jest.fn<AnyFn>(),
    findFirst: jest.fn<AnyFn>(),
    create: jest.fn<AnyFn>(),
    delete: jest.fn<AnyFn>(),
    aggregate: jest.fn<AnyFn>(),
  },
};

jest.unstable_mockModule("../../../../config/database/index.js", () => ({
  db: mockDb,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockStorage = new Proxy<Record<string, any>>(
  {},
  {
    get: (_target, prop: string) => {
      // Default to resolving undefined, but customize known functions as needed
      if (prop === "hasValidImageSignature") {
        return jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
      }
      return jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    },
  },
);

jest.unstable_mockModule("../../mediaStorage.js", () => mockStorage);

const { default: app } = await import("../../../../app.js");

const auth = { Authorization: `Bearer ${jwt.sign({ id: "u1" }, SECRET)}` };

const asRole = (role: string): void => {
  mockDb.user.findUnique.mockResolvedValue({
    id: "u1",
    name: "Owner",
    email: "owner@example.com",
    role,
  });
};

const asOwnerWithRestaurant = (): void => {
  asRole("RESTAURANT_OWNER");
  mockDb.restaurant.findUnique.mockResolvedValue({ id: "r1" });
};

describe("Media API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("POST /api/partner/media", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app)
        .post("/api/partner/media")
        .attach("file", Buffer.from("test"), "test.jpg");
      expect(res.status).toBe(401);
    });

    it("returns 403 for a CUSTOMER", async () => {
      asRole("CUSTOMER");
      const res = await request(app)
        .post("/api/partner/media")
        .set(auth)
        .attach("file", Buffer.from("test"), "test.jpg");
      expect(res.status).toBe(403);
    });

    it("uploads media successfully", async () => {
      asOwnerWithRestaurant();
      mockDb.media.create.mockResolvedValue({
        id: "m1",
        restaurantId: "r1",
        menuItemId: null,
        url: "/uploads/test.jpg",
        fileName: "test.jpg",
        fileType: "image/jpeg",
        fileSize: 4,
        createdAt: new Date(),
      });

      const res = await request(app)
        .post("/api/partner/media")
        .set(auth)
        .attach("file", Buffer.from("test"), "test.jpg");

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Media uploaded successfully");
      expect(mockDb.media.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            restaurantId: "r1",
            fileName: "test.jpg",
          }),
        }),
      );
    });

    it("returns 404 when owner has no restaurant", async () => {
      asRole("RESTAURANT_OWNER");
      mockDb.restaurant.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/partner/media")
        .set(auth)
        .attach("file", Buffer.from("test"), "test.jpg");

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/media/:id", () => {
    it("returns media info", async () => {
      mockDb.media.findUnique.mockResolvedValue({
        id: "m1",
        restaurantId: "r1",
        url: "/uploads/test.jpg",
      });

      const res = await request(app).get("/api/media/m1");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("m1");
    });

    it("returns 404 when media is not found", async () => {
      mockDb.media.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/api/media/m1");

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/partner/media/:id", () => {
    it("deletes media successfully", async () => {
      asOwnerWithRestaurant();
      mockDb.media.findFirst.mockResolvedValue({
        id: "m1",
        storageKey: "test.jpg",
      });
      mockDb.restaurantPhoto.findUnique.mockResolvedValue(null);
      mockDb.media.delete.mockResolvedValue({ id: "m1" });

      const res = await request(app).delete("/api/partner/media/m1").set(auth);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Media deleted successfully");
      expect(mockDb.media.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
    });

    it("returns 404 when media is not found", async () => {
      asOwnerWithRestaurant();
      mockDb.media.findFirst.mockResolvedValue(null);

      const res = await request(app).delete("/api/partner/media/m1").set(auth);

      expect(res.status).toBe(404);
    });

    it("returns 409 when media is in use as a photo", async () => {
      asOwnerWithRestaurant();
      mockDb.media.findFirst.mockResolvedValue({
        id: "m1",
        storageKey: "test.jpg",
      });
      mockDb.restaurantPhoto.findUnique.mockResolvedValue({ id: "p1" });

      const res = await request(app).delete("/api/partner/media/m1").set(auth);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Media is in use");
    });
  });

  describe("POST /api/partner/media/photos", () => {
    it("adds a photo successfully", async () => {
      asOwnerWithRestaurant();
      mockDb.media.findFirst.mockResolvedValue({ id: "m1" });
      mockDb.restaurantPhoto.findUnique.mockResolvedValue(null);
      mockDb.restaurantPhoto.aggregate.mockResolvedValue({
        _max: { sortOrder: 0 },
      });
      mockDb.restaurantPhoto.create.mockResolvedValue({
        id: "p1",
        restaurantId: "r1",
        mediaId: "m1",
        sortOrder: 1,
        createdAt: new Date(),
        media: { id: "m1", url: "/uploads/test.jpg" },
      });

      const res = await request(app)
        .post("/api/partner/media/photos")
        .set(auth)
        .send({ mediaId: "m1", sortOrder: 1 });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Restaurant photo added successfully");
    });

    it("returns 409 when media is already a photo", async () => {
      asOwnerWithRestaurant();
      mockDb.media.findFirst.mockResolvedValue({ id: "m1" });
      mockDb.restaurantPhoto.findUnique.mockResolvedValue({ id: "p1" });

      const res = await request(app)
        .post("/api/partner/media/photos")
        .set(auth)
        .send({ mediaId: "m1" });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Media is already a restaurant photo");
    });

    it("returns 400 for invalid payload", async () => {
      asOwnerWithRestaurant();

      const res = await request(app)
        .post("/api/partner/media/photos")
        .set(auth)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Media is required");
    });
  });

  describe("DELETE /api/partner/media/photos/:id", () => {
    it("removes a photo successfully", async () => {
      asOwnerWithRestaurant();
      mockDb.restaurantPhoto.findFirst.mockResolvedValue({ id: "p1" });
      mockDb.restaurantPhoto.delete.mockResolvedValue({ id: "p1" });

      const res = await request(app)
        .delete("/api/partner/media/photos/p1")
        .set(auth);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Restaurant photo removed successfully");
      expect(mockDb.restaurantPhoto.delete).toHaveBeenCalledWith({
        where: { id: "p1" },
      });
    });

    it("returns 404 when photo is not found", async () => {
      asOwnerWithRestaurant();
      mockDb.restaurantPhoto.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .delete("/api/partner/media/photos/p1")
        .set(auth);

      expect(res.status).toBe(404);
    });
  });
});
