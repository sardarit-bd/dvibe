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

const hasValidImageSignature = jest.fn<AnyFn>();
const removeFile = jest.fn<AnyFn>();

// Explicit mock of mediaStorage: no real multer / disk access.
// uploadSingleImage mimics multer: it sets req.file for multipart requests
// and always leaves req.body as an object.
jest.unstable_mockModule("../../mediaStorage.js", () => ({
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  getUploadDir: () => "uploads",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uploadSingleImage: (req: any, _res: unknown, next: () => void) => {
    const contentType = String(req.headers["content-type"] ?? "");
    if (contentType.includes("multipart/form-data")) {
      req.file = {
        path: "uploads/stored.jpg",
        filename: "stored.jpg",
        originalname: "test.jpg",
        mimetype: "image/jpeg",
        size: 4,
      };
    }
    req.body = req.body ?? {};
    next();
  },
  // 4 parameters so Express treats it as an error-handling middleware
  cleanupUploadOnError: (
    error: unknown,
    _req: unknown,
    _res: unknown,
    next: (error?: unknown) => void,
  ) => next(error),
  hasValidImageSignature,
  removeFile,
}));

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
    hasValidImageSignature.mockResolvedValue(true);
    removeFile.mockResolvedValue(true);
  });

  describe("POST /api/media/upload", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app)
        .post("/api/media/upload")
        .attach("file", Buffer.from("test"), "test.jpg");

      expect(res.status).toBe(401);
    });

    it("returns 403 for a CUSTOMER", async () => {
      asRole("CUSTOMER");

      const res = await request(app)
        .post("/api/media/upload")
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
        url: "/uploads/stored.jpg",
        fileName: "test.jpg",
        fileType: "image/jpeg",
        fileSize: 4,
        createdAt: new Date(),
      });

      const res = await request(app)
        .post("/api/media/upload")
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
            storageKey: "stored.jpg",
          }),
        }),
      );
    });

    it("returns 400 when no file is sent", async () => {
      asOwnerWithRestaurant();

      const res = await request(app)
        .post("/api/media/upload")
        .set(auth)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("File is required");
      expect(mockDb.media.create).not.toHaveBeenCalled();
    });

    it("returns 400 when the file content does not match its type", async () => {
      asOwnerWithRestaurant();
      hasValidImageSignature.mockResolvedValue(false);

      const res = await request(app)
        .post("/api/media/upload")
        .set(auth)
        .attach("file", Buffer.from("test"), "test.jpg");

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("File content does not match its image type");
      expect(mockDb.media.create).not.toHaveBeenCalled();
    });

    it("returns 404 when the owner has no restaurant", async () => {
      asRole("RESTAURANT_OWNER");
      mockDb.restaurant.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/media/upload")
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

  describe("DELETE /api/media/:id", () => {
    it("deletes media successfully", async () => {
      asOwnerWithRestaurant();
      mockDb.media.findFirst.mockResolvedValue({
        id: "m1",
        storageKey: "test.jpg",
      });
      mockDb.restaurantPhoto.findUnique.mockResolvedValue(null);
      mockDb.media.delete.mockResolvedValue({ id: "m1" });

      const res = await request(app).delete("/api/media/m1").set(auth);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Media deleted successfully");
      expect(mockDb.media.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
      expect(removeFile).toHaveBeenCalledWith("test.jpg");
    });

    it("returns 404 when media is not found", async () => {
      asOwnerWithRestaurant();
      mockDb.media.findFirst.mockResolvedValue(null);

      const res = await request(app).delete("/api/media/m1").set(auth);

      expect(res.status).toBe(404);
    });

    it("returns 409 when media is in use as a photo", async () => {
      asOwnerWithRestaurant();
      mockDb.media.findFirst.mockResolvedValue({
        id: "m1",
        storageKey: "test.jpg",
      });
      mockDb.restaurantPhoto.findUnique.mockResolvedValue({ id: "p1" });

      const res = await request(app).delete("/api/media/m1").set(auth);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Media is in use");
      expect(mockDb.media.delete).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/partner/restaurant/photos", () => {
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
        .post("/api/partner/restaurant/photos")
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
        .post("/api/partner/restaurant/photos")
        .set(auth)
        .send({ mediaId: "m1" });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Media is already a restaurant photo");
    });

    it("returns 400 for invalid payload", async () => {
      asOwnerWithRestaurant();

      const res = await request(app)
        .post("/api/partner/restaurant/photos")
        .set(auth)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Media is required");
    });
  });

  describe("DELETE /api/partner/restaurant/photos/:id", () => {
    it("removes a photo successfully", async () => {
      asOwnerWithRestaurant();
      mockDb.restaurantPhoto.findFirst.mockResolvedValue({ id: "p1" });
      mockDb.restaurantPhoto.delete.mockResolvedValue({ id: "p1" });

      const res = await request(app)
        .delete("/api/partner/restaurant/photos/p1")
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
        .delete("/api/partner/restaurant/photos/p1")
        .set(auth);

      expect(res.status).toBe(404);
    });
  });
});