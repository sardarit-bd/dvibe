import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
} from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";

const SECRET = "test-secret";
process.env.JWT_SECRET = SECRET;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

const mockDb = {
  user: { findUnique: jest.fn<AnyFn>() },
  restaurant: {
    findMany: jest.fn<AnyFn>(),
    findFirst: jest.fn<AnyFn>(),
    findUnique: jest.fn<AnyFn>(),
    create: jest.fn<AnyFn>(),
    update: jest.fn<AnyFn>(),
  },
};

jest.unstable_mockModule("../../../../config/database/index.js", () => ({
  db: mockDb,
}));

const { default: app } = await import("../../../../app.js");

const token = jwt.sign({ id: "u1" }, SECRET);
const auth = { Authorization: `Bearer ${token}` };

const asRole = (role: string): void => {
  mockDb.user.findUnique.mockResolvedValue({
    id: "u1",
    name: "Owner",
    email: "owner@example.com",
    role,
  });
};

const restaurant = {
  id: "r1",
  ownerId: "u1",
  name: "Spice Garden",
  slug: "spice-garden",
  description: null,
  address: "Dhanmondi, Dhaka",
  latitude: null,
  longitude: null,
  phone: "+8801712345678",
  whatsappNumber: null,
  email: null,
  openingHours: null,
  coverImage: null,
  status: "INACTIVE",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const validBody = {
  name: "Spice Garden",
  address: "Dhanmondi, Dhaka",
  phone: "+8801712345678",
};

describe("Restaurant API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("GET /api/restaurants", () => {
    it("returns public restaurants without authentication", async () => {
      mockDb.restaurant.findMany.mockResolvedValue([{ id: "r1" }]);

      const res = await request(app).get("/api/restaurants");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([{ id: "r1" }]);
      expect(mockDb.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ["OPEN", "CLOSED"] } },
        }),
      );
    });
  });

  describe("GET /api/restaurants/:id", () => {
    it("returns 200 for a public restaurant", async () => {
      mockDb.restaurant.findFirst.mockResolvedValue({ id: "r1" });

      const res = await request(app).get("/api/restaurants/r1");

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ id: "r1" });
    });

    it("returns 404 for an unknown or inactive restaurant", async () => {
      mockDb.restaurant.findFirst.mockResolvedValue(null);

      const res = await request(app).get("/api/restaurants/nope");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Restaurant not found");
    });
  });

  describe("auth guards on /api/partner/restaurant", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app).get("/api/partner/restaurant");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 with an invalid token", async () => {
      const res = await request(app)
        .get("/api/partner/restaurant")
        .set("Authorization", "Bearer not.a.token");

      expect(res.status).toBe(401);
    });

    it("returns 403 for a CUSTOMER", async () => {
      asRole("CUSTOMER");

      const res = await request(app)
        .get("/api/partner/restaurant")
        .set(auth);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Forbidden");
    });

    it("returns 403 for STAFF", async () => {
      asRole("STAFF");

      const res = await request(app)
        .post("/api/partner/restaurant")
        .set(auth)
        .send(validBody);

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/partner/restaurant", () => {
    it("returns the owner's restaurant", async () => {
      asRole("RESTAURANT_OWNER");
      mockDb.restaurant.findUnique.mockResolvedValue(restaurant);

      const res = await request(app)
        .get("/api/partner/restaurant")
        .set(auth);

      expect(res.status).toBe(200);
      expect(res.body.data.ownerId).toBe("u1");
      expect(mockDb.restaurant.findUnique).toHaveBeenCalledWith({
        where: { ownerId: "u1" },
      });
    });

    it("returns 404 when the owner has no restaurant", async () => {
      asRole("RESTAURANT_OWNER");
      mockDb.restaurant.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/partner/restaurant")
        .set(auth);

      expect(res.status).toBe(404);
    });

    it("allows ADMIN", async () => {
      asRole("ADMIN");
      mockDb.restaurant.findUnique.mockResolvedValue(restaurant);

      const res = await request(app)
        .get("/api/partner/restaurant")
        .set(auth);

      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/partner/restaurant", () => {
    it("creates a restaurant and returns 201", async () => {
      asRole("RESTAURANT_OWNER");
      mockDb.restaurant.findUnique
        .mockResolvedValueOnce(null) // owner has no restaurant
        .mockResolvedValueOnce(null); // slug is free
      mockDb.restaurant.create.mockResolvedValue(restaurant);

      const res = await request(app)
        .post("/api/partner/restaurant")
        .set(auth)
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockDb.restaurant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...validBody,
          ownerId: "u1",
          slug: "spice-garden",
        }),
      });
    });

    it("ignores ownerId, slug and status sent by the client", async () => {
      asRole("RESTAURANT_OWNER");
      mockDb.restaurant.findUnique.mockResolvedValue(null);
      mockDb.restaurant.create.mockResolvedValue(restaurant);

      await request(app)
        .post("/api/partner/restaurant")
        .set(auth)
        .send({ ...validBody, ownerId: "hacker", slug: "x", status: "OPEN" });

      const arg = mockDb.restaurant.create.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      expect(arg.data.ownerId).toBe("u1");
      expect(arg.data.slug).toBe("spice-garden");
      expect(arg.data).not.toHaveProperty("status");
    });

    it("returns 409 when the owner already has a restaurant", async () => {
      asRole("RESTAURANT_OWNER");
      mockDb.restaurant.findUnique.mockResolvedValue(restaurant);

      const res = await request(app)
        .post("/api/partner/restaurant")
        .set(auth)
        .send(validBody);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Restaurant profile already exists");
      expect(mockDb.restaurant.create).not.toHaveBeenCalled();
    });

    it("returns 400 for an empty body", async () => {
      asRole("RESTAURANT_OWNER");

      const res = await request(app)
        .post("/api/partner/restaurant")
        .set(auth)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Name is required");
      expect(res.body.message).toContain("Address is required");
      expect(res.body.message).toContain("Phone is required");
    });

    it("returns 400 for invalid email and latitude", async () => {
      asRole("RESTAURANT_OWNER");

      const res = await request(app)
        .post("/api/partner/restaurant")
        .set(auth)
        .send({ ...validBody, email: "bad", latitude: 200 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Invalid email format");
      expect(res.body.message).toContain("Latitude must be between -90 and 90");
    });

    it("returns 400 for invalid openingHours", async () => {
      asRole("RESTAURANT_OWNER");

      const res = await request(app)
        .post("/api/partner/restaurant")
        .set(auth)
        .send({ ...validBody, openingHours: { mon: 9 } });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("openingHours");
    });
  });

  describe("PUT /api/partner/restaurant", () => {
    it("updates the restaurant", async () => {
      asRole("RESTAURANT_OWNER");
      mockDb.restaurant.findUnique.mockResolvedValue(restaurant);
      mockDb.restaurant.update.mockResolvedValue({
        ...restaurant,
        phone: "+8801799999999",
      });

      const res = await request(app)
        .put("/api/partner/restaurant")
        .set(auth)
        .send({ phone: "+8801799999999" });

      expect(res.status).toBe(200);
      expect(res.body.data.phone).toBe("+8801799999999");
      expect(mockDb.restaurant.update).toHaveBeenCalledWith({
        where: { ownerId: "u1" },
        data: { phone: "+8801799999999" },
      });
    });

    it("returns 400 for an empty body", async () => {
      asRole("RESTAURANT_OWNER");

      const res = await request(app)
        .put("/api/partner/restaurant")
        .set(auth)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("At least one field is required");
    });

    it("returns 404 when the owner has no restaurant", async () => {
      asRole("RESTAURANT_OWNER");
      mockDb.restaurant.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/partner/restaurant")
        .set(auth)
        .send({ phone: "1" });

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/partner/restaurant/status", () => {
    it("updates the status to OPEN", async () => {
      asRole("RESTAURANT_OWNER");
      mockDb.restaurant.findUnique.mockResolvedValue(restaurant);
      mockDb.restaurant.update.mockResolvedValue({
        ...restaurant,
        status: "OPEN",
      });

      const res = await request(app)
        .patch("/api/partner/restaurant/status")
        .set(auth)
        .send({ status: "OPEN" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("OPEN");
      expect(mockDb.restaurant.update).toHaveBeenCalledWith({
        where: { ownerId: "u1" },
        data: { status: "OPEN" },
      });
    });

    it("returns 400 for INACTIVE", async () => {
      asRole("RESTAURANT_OWNER");

      const res = await request(app)
        .patch("/api/partner/restaurant/status")
        .set(auth)
        .send({ status: "INACTIVE" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Status must be OPEN or CLOSED");
    });

    it("returns 404 when the owner has no restaurant", async () => {
      asRole("RESTAURANT_OWNER");
      mockDb.restaurant.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/partner/restaurant/status")
        .set(auth)
        .send({ status: "CLOSED" });

      expect(res.status).toBe(404);
    });
  });
});