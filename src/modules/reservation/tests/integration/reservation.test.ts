import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";

const SECRET = "test-secret";
process.env.JWT_SECRET = SECRET;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

const mockDb = {
  user: { findUnique: jest.fn<AnyFn>() },
  restaurant: { findFirst: jest.fn<AnyFn>(), findUnique: jest.fn<AnyFn>() },
  reservation: {
    create: jest.fn<AnyFn>(),
    findUnique: jest.fn<AnyFn>(),
    findFirst: jest.fn<AnyFn>(),
    findMany: jest.fn<AnyFn>(),
    count: jest.fn<AnyFn>(),
    update: jest.fn<AnyFn>(),
  },
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

const asOwnerWithRestaurant = (): void => {
  asRole("RESTAURANT_OWNER");
  mockDb.restaurant.findUnique.mockResolvedValue({ id: "r1" });
};

const dateOffset = (days: number): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const toDate = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

const futureDate = dateOffset(7);
const now = new Date().toISOString();

const reservationRecord = {
  id: "res1",
  restaurantId: "r1",
  customerId: null,
  customerName: "Sam",
  customerPhone: "+8801700000000",
  reservationDate: toDate(futureDate),
  reservationTime: "19:30",
  guestCount: 4,
  specialRequest: null,
  status: "PENDING",
  createdAt: now,
  updatedAt: now,
};

const body = {
  restaurantId: "r1",
  customerName: "Sam",
  customerPhone: "+8801700000000",
  reservationDate: futureDate,
  reservationTime: "19:30",
  guestCount: 4,
};

const createArg = (): { data: Record<string, unknown> } =>
  mockDb.reservation.create.mock.calls[0]![0] as {
    data: Record<string, unknown>;
  };

describe("Reservation API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("POST /api/reservations", () => {
    it("creates a guest reservation", async () => {
      mockDb.restaurant.findFirst.mockResolvedValue({ id: "r1" });
      mockDb.reservation.create.mockResolvedValue(reservationRecord);

      const res = await request(app).post("/api/reservations").send(body);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reservationDate).toBe(futureDate);
      expect(res.body.data.reservationTime).toBe("19:30");
      expect(res.body.data.status).toBe("PENDING");
      expect(mockDb.user.findUnique).not.toHaveBeenCalled();
      expect(mockDb.restaurant.findFirst).toHaveBeenCalledWith({
        where: { id: "r1", status: { in: ["OPEN", "CLOSED"] } },
        select: { id: true },
      });
      expect(createArg().data).toEqual({
        restaurantId: "r1",
        customerId: null,
        customerName: "Sam",
        customerPhone: "+8801700000000",
        reservationDate: toDate(futureDate),
        reservationTime: "19:30",
        guestCount: 4,
        specialRequest: null,
      });
    });

    it("stores the special request", async () => {
      mockDb.restaurant.findFirst.mockResolvedValue({ id: "r1" });
      mockDb.reservation.create.mockResolvedValue(reservationRecord);

      await request(app)
        .post("/api/reservations")
        .send({ ...body, specialRequest: "Window table" });

      expect(createArg().data.specialRequest).toBe("Window table");
    });

    it("links the reservation to the user when a valid token is sent", async () => {
      asRole("CUSTOMER");
      mockDb.restaurant.findFirst.mockResolvedValue({ id: "r1" });
      mockDb.reservation.create.mockResolvedValue({
        ...reservationRecord,
        customerId: "u1",
      });

      const res = await request(app)
        .post("/api/reservations")
        .set(auth)
        .send(body);

      expect(res.status).toBe(201);
      expect(createArg().data.customerId).toBe("u1");
    });

    it("returns 401 when an invalid token is sent", async () => {
      const res = await request(app)
        .post("/api/reservations")
        .set({ Authorization: "Bearer not-a-token" })
        .send(body);

      expect(res.status).toBe(401);
      expect(mockDb.reservation.create).not.toHaveBeenCalled();
    });

    it("ignores client-sent status and customerId", async () => {
      mockDb.restaurant.findFirst.mockResolvedValue({ id: "r1" });
      mockDb.reservation.create.mockResolvedValue(reservationRecord);

      await request(app)
        .post("/api/reservations")
        .send({ ...body, status: "CONFIRMED", customerId: "hacker" });

      const { data } = createArg();
      expect(data).not.toHaveProperty("status");
      expect(data.customerId).toBeNull();
    });

    it("accepts a reservation for today", async () => {
      mockDb.restaurant.findFirst.mockResolvedValue({ id: "r1" });
      mockDb.reservation.create.mockResolvedValue(reservationRecord);

      const res = await request(app)
        .post("/api/reservations")
        .send({ ...body, reservationDate: dateOffset(0) });

      expect(res.status).toBe(201);
    });

    it("returns 404 when the restaurant is not public", async () => {
      mockDb.restaurant.findFirst.mockResolvedValue(null);

      const res = await request(app).post("/api/reservations").send(body);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Restaurant not found");
      expect(mockDb.reservation.create).not.toHaveBeenCalled();
    });

    it("returns 400 for a date in the past", async () => {
      const res = await request(app)
        .post("/api/reservations")
        .send({ ...body, reservationDate: dateOffset(-1) });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Reservation date cannot be in the past");
      expect(mockDb.restaurant.findFirst).not.toHaveBeenCalled();
      expect(mockDb.reservation.create).not.toHaveBeenCalled();
    });

    it("returns 400 for a date more than 90 days ahead", async () => {
      const res = await request(app)
        .post("/api/reservations")
        .send({ ...body, reservationDate: dateOffset(91) });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Reservation date cannot be more than 90 days ahead",
      );
      expect(mockDb.reservation.create).not.toHaveBeenCalled();
    });

    it("returns 400 for an empty body", async () => {
      const res = await request(app).post("/api/reservations").send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Restaurant is required");
      expect(res.body.message).toContain("Customer name is required");
      expect(res.body.message).toContain("Customer phone is required");
      expect(res.body.message).toContain("Reservation date is required");
      expect(res.body.message).toContain("Reservation time is required");
      expect(res.body.message).toContain("Guest count is required");
    });

    it("returns 400 for an invalid time", async () => {
      const res = await request(app)
        .post("/api/reservations")
        .send({ ...body, reservationTime: "25:00" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain(
        "Reservation time must be in HH:mm format (24-hour)",
      );
    });

    it("returns 400 for an impossible calendar date", async () => {
      const res = await request(app)
        .post("/api/reservations")
        .send({ ...body, reservationDate: "2026-02-30" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Reservation date is invalid");
    });

    it("returns 400 for an invalid guest count", async () => {
      const zero = await request(app)
        .post("/api/reservations")
        .send({ ...body, guestCount: 0 });
      expect(zero.status).toBe(400);
      expect(zero.body.message).toContain("Guest count must be at least 1");

      const many = await request(app)
        .post("/api/reservations")
        .send({ ...body, guestCount: 21 });
      expect(many.status).toBe(400);
      expect(many.body.message).toContain("Guest count cannot exceed 20");
    });

    it("returns 400 for an invalid phone number", async () => {
      const res = await request(app)
        .post("/api/reservations")
        .send({ ...body, customerPhone: "abc" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Customer phone is invalid");
    });
  });

  describe("GET /api/reservations/:id", () => {
    it("returns the reservation with a plain date string", async () => {
      mockDb.reservation.findUnique.mockResolvedValue(reservationRecord);

      const res = await request(app).get("/api/reservations/res1");

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe("res1");
      expect(res.body.data.reservationDate).toBe(futureDate);
    });

    it("returns 404 for an unknown reservation", async () => {
      mockDb.reservation.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/api/reservations/nope");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Reservation not found");
    });
  });

  describe("auth guards on /api/partner/reservations", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app).get("/api/partner/reservations");

      expect(res.status).toBe(401);
    });

    it("returns 403 for a CUSTOMER", async () => {
      asRole("CUSTOMER");

      const res = await request(app)
        .get("/api/partner/reservations")
        .set(auth);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Forbidden");
    });
  });

  describe("GET /api/partner/reservations", () => {
    it("lists only the owner's restaurant reservations with filters", async () => {
      asOwnerWithRestaurant();
      mockDb.reservation.findMany.mockResolvedValue([reservationRecord]);
      mockDb.reservation.count.mockResolvedValue(1);

      const res = await request(app)
        .get(
          `/api/partner/reservations?status=PENDING&date=${futureDate}&page=1&limit=10`,
        )
        .set(auth);

      expect(res.status).toBe(200);
      expect(res.body.data.reservations).toHaveLength(1);
      expect(res.body.data.reservations[0].reservationDate).toBe(futureDate);
      expect(res.body.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
      expect(mockDb.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            restaurantId: "r1",
            status: "PENDING",
            reservationDate: toDate(futureDate),
          },
          skip: 0,
          take: 10,
        }),
      );
    });

    it("applies default pagination and no filters", async () => {
      asOwnerWithRestaurant();
      mockDb.reservation.findMany.mockResolvedValue([]);
      mockDb.reservation.count.mockResolvedValue(0);

      const res = await request(app)
        .get("/api/partner/reservations")
        .set(auth);

      expect(res.status).toBe(200);
      expect(mockDb.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { restaurantId: "r1" },
          skip: 0,
          take: 20,
        }),
      );
    });

    it("returns 400 for an invalid status filter", async () => {
      asOwnerWithRestaurant();

      const res = await request(app)
        .get("/api/partner/reservations?status=NOPE")
        .set(auth);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Invalid status");
    });

    it("returns 400 for an invalid date filter", async () => {
      asOwnerWithRestaurant();

      const res = await request(app)
        .get("/api/partner/reservations?date=12/01/2026")
        .set(auth);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Date must be in YYYY-MM-DD format");
    });

    it("returns 404 when the owner has no restaurant", async () => {
      asRole("RESTAURANT_OWNER");
      mockDb.restaurant.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/partner/reservations")
        .set(auth);

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/partner/reservations/:id", () => {
    it("returns an owned reservation", async () => {
      asOwnerWithRestaurant();
      mockDb.reservation.findFirst.mockResolvedValue(reservationRecord);

      const res = await request(app)
        .get("/api/partner/reservations/res1")
        .set(auth);

      expect(res.status).toBe(200);
      expect(mockDb.reservation.findFirst).toHaveBeenCalledWith({
        where: { id: "res1", restaurantId: "r1" },
      });
    });

    it("returns 404 for a reservation that is not owned", async () => {
      asOwnerWithRestaurant();
      mockDb.reservation.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/partner/reservations/other")
        .set(auth);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Reservation not found");
    });
  });

  describe("PATCH /api/partner/reservations/:id/status", () => {
    it("moves PENDING to CONFIRMED", async () => {
      asOwnerWithRestaurant();
      mockDb.reservation.findFirst.mockResolvedValue(reservationRecord);
      mockDb.reservation.update.mockResolvedValue({
        ...reservationRecord,
        status: "CONFIRMED",
      });

      const res = await request(app)
        .patch("/api/partner/reservations/res1/status")
        .set(auth)
        .send({ status: "CONFIRMED" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("CONFIRMED");
      expect(mockDb.reservation.update).toHaveBeenCalledWith({
        where: { id: "res1" },
        data: { status: "CONFIRMED" },
      });
    });

    it("returns 409 for an invalid transition", async () => {
      asOwnerWithRestaurant();
      mockDb.reservation.findFirst.mockResolvedValue(reservationRecord);

      const res = await request(app)
        .patch("/api/partner/reservations/res1/status")
        .set(auth)
        .send({ status: "COMPLETED" });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe(
        "Cannot change reservation status from PENDING to COMPLETED",
      );
      expect(mockDb.reservation.update).not.toHaveBeenCalled();
    });

    it("returns 409 when changing a final status", async () => {
      asOwnerWithRestaurant();
      mockDb.reservation.findFirst.mockResolvedValue({
        ...reservationRecord,
        status: "CANCELLED",
      });

      const res = await request(app)
        .patch("/api/partner/reservations/res1/status")
        .set(auth)
        .send({ status: "CONFIRMED" });

      expect(res.status).toBe(409);
    });

    it("returns 400 for a missing or invalid status", async () => {
      asOwnerWithRestaurant();

      const missing = await request(app)
        .patch("/api/partner/reservations/res1/status")
        .set(auth)
        .send({});
      expect(missing.status).toBe(400);
      expect(missing.body.message).toContain("Status is required");

      const invalid = await request(app)
        .patch("/api/partner/reservations/res1/status")
        .set(auth)
        .send({ status: "SEATED" });
      expect(invalid.status).toBe(400);
      expect(invalid.body.message).toContain("Invalid status");
    });

    it("returns 404 for a reservation that is not owned", async () => {
      asOwnerWithRestaurant();
      mockDb.reservation.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/partner/reservations/other/status")
        .set(auth)
        .send({ status: "CONFIRMED" });

      expect(res.status).toBe(404);
    });
  });
});