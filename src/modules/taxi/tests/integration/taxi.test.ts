import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";

const SECRET = "test-secret";
process.env.JWT_SECRET = SECRET;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

const mockDb = {
  user: { findUnique: jest.fn<AnyFn>() },
  driver: {
    findMany: jest.fn<AnyFn>(),
    count: jest.fn<AnyFn>(),
    findUnique: jest.fn<AnyFn>(),
    update: jest.fn<AnyFn>(),
  },
  taxiRequest: {
    create: jest.fn<AnyFn>(),
    findUnique: jest.fn<AnyFn>(),
    findMany: jest.fn<AnyFn>(),
    count: jest.fn<AnyFn>(),
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

const now = new Date().toISOString();

const driverRecord = {
  id: "d1",
  name: "Rahim",
  phone: "+8801711111111",
  whatsappNumber: "+880 1711-111111",
  serviceArea: "Gazipur",
  vehicleType: "Car",
  vehicleDetails: "White Toyota Axio",
  profileImage: null,
  isAvailable: true,
  createdAt: now,
  updatedAt: now,
};

const requestRecord = {
  id: "t1",
  driverId: "d1",
  customerId: null,
  customerName: "Sam",
  customerPhone: "+8801700000000",
  pickupLocation: "Gazipur Chowrasta",
  destination: "Hazrat Shahjalal Airport",
  notes: null,
  status: "PENDING",
  createdAt: now,
  updatedAt: now,
  driver: driverRecord,
};

const body = {
  driverId: "d1",
  customerName: "Sam",
  customerPhone: "+8801700000000",
  pickupLocation: "Gazipur Chowrasta",
  destination: "Hazrat Shahjalal Airport",
};

const createArg = (): {
  data: Record<string, unknown>;
  include: unknown;
} =>
  mockDb.taxiRequest.create.mock.calls[0]![0] as {
    data: Record<string, unknown>;
    include: unknown;
  };

describe("Taxi API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("GET /api/drivers", () => {
    it("lists available drivers with pagination", async () => {
      mockDb.driver.findMany.mockResolvedValue([driverRecord]);
      mockDb.driver.count.mockResolvedValue(1);

      const res = await request(app).get("/api/drivers");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.drivers).toHaveLength(1);
      expect(res.body.data.drivers[0].whatsappNumber).toBe("+880 1711-111111");
      expect(res.body.data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(mockDb.driver.findMany).toHaveBeenCalledWith({
        where: { isAvailable: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: 0,
        take: 20,
      });
    });

    it("applies service area and vehicle type filters", async () => {
      mockDb.driver.findMany.mockResolvedValue([]);
      mockDb.driver.count.mockResolvedValue(0);

      const res = await request(app).get(
        "/api/drivers?serviceArea=Gazipur&vehicleType=Car&page=2&limit=5",
      );

      expect(res.status).toBe(200);
      expect(mockDb.driver.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isAvailable: true,
            serviceArea: { contains: "Gazipur", mode: "insensitive" },
            vehicleType: { equals: "Car", mode: "insensitive" },
          },
          skip: 5,
          take: 5,
        }),
      );
    });

    it("returns 400 for invalid pagination", async () => {
      const res = await request(app).get("/api/drivers?limit=101");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Limit cannot exceed 100");
      expect(mockDb.driver.findMany).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/drivers/:id", () => {
    it("returns the driver", async () => {
      mockDb.driver.findUnique.mockResolvedValue(driverRecord);

      const res = await request(app).get("/api/drivers/d1");

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Rahim");
    });

    it("still returns an unavailable driver", async () => {
      mockDb.driver.findUnique.mockResolvedValue({
        ...driverRecord,
        isAvailable: false,
      });

      const res = await request(app).get("/api/drivers/d1");

      expect(res.status).toBe(200);
      expect(res.body.data.isAvailable).toBe(false);
    });

    it("returns 404 for an unknown driver", async () => {
      mockDb.driver.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/api/drivers/nope");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Driver not found");
    });
  });

  describe("POST /api/taxi-requests", () => {
    it("creates a guest request and returns a whatsapp link", async () => {
      mockDb.driver.findUnique.mockResolvedValue(driverRecord);
      mockDb.taxiRequest.create.mockResolvedValue(requestRecord);

      const res = await request(app).post("/api/taxi-requests").send(body);

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("PENDING");
      expect(res.body.data.driver.name).toBe("Rahim");
      expect(res.body.data.whatsapp.whatsappNumber).toBe("8801711111111");
      expect(
        res.body.data.whatsapp.url.startsWith(
          "https://wa.me/8801711111111?text=",
        ),
      ).toBe(true);
      expect(res.body.data.whatsapp.message).toContain("Hello Rahim");
      expect(res.body.data.whatsapp.message).toContain(
        "Pickup: Gazipur Chowrasta",
      );
      expect(mockDb.user.findUnique).not.toHaveBeenCalled();

      const arg = createArg();
      expect(arg.data).toEqual({
        driverId: "d1",
        customerId: null,
        customerName: "Sam",
        customerPhone: "+8801700000000",
        pickupLocation: "Gazipur Chowrasta",
        destination: "Hazrat Shahjalal Airport",
        notes: null,
      });
      expect(arg.include).toEqual({ driver: true });
    });

    it("includes notes in the whatsapp message", async () => {
      mockDb.driver.findUnique.mockResolvedValue(driverRecord);
      mockDb.taxiRequest.create.mockResolvedValue({
        ...requestRecord,
        notes: "Two bags",
      });

      const res = await request(app)
        .post("/api/taxi-requests")
        .send({ ...body, notes: "Two bags" });

      expect(createArg().data.notes).toBe("Two bags");
      expect(res.body.data.whatsapp.message).toContain("Notes: Two bags");
    });

    it("returns whatsapp null when the driver number has no digits", async () => {
      mockDb.driver.findUnique.mockResolvedValue({
        ...driverRecord,
        whatsappNumber: "n/a",
      });
      mockDb.taxiRequest.create.mockResolvedValue({
        ...requestRecord,
        driver: { ...driverRecord, whatsappNumber: "n/a" },
      });

      const res = await request(app).post("/api/taxi-requests").send(body);

      expect(res.status).toBe(201);
      expect(res.body.data.whatsapp).toBeNull();
    });

    it("links the request to the user when a valid token is sent", async () => {
      asRole("CUSTOMER");
      mockDb.driver.findUnique.mockResolvedValue(driverRecord);
      mockDb.taxiRequest.create.mockResolvedValue({
        ...requestRecord,
        customerId: "u1",
      });

      const res = await request(app)
        .post("/api/taxi-requests")
        .set(auth)
        .send(body);

      expect(res.status).toBe(201);
      expect(createArg().data.customerId).toBe("u1");
    });

    it("returns 401 when an invalid token is sent", async () => {
      const res = await request(app)
        .post("/api/taxi-requests")
        .set({ Authorization: "Bearer not-a-token" })
        .send(body);

      expect(res.status).toBe(401);
      expect(mockDb.taxiRequest.create).not.toHaveBeenCalled();
    });

    it("ignores client-sent status and customerId", async () => {
      mockDb.driver.findUnique.mockResolvedValue(driverRecord);
      mockDb.taxiRequest.create.mockResolvedValue(requestRecord);

      await request(app)
        .post("/api/taxi-requests")
        .send({ ...body, status: "COMPLETED", customerId: "hacker" });

      const { data } = createArg();
      expect(data).not.toHaveProperty("status");
      expect(data.customerId).toBeNull();
    });

    it("returns 404 for an unknown driver", async () => {
      mockDb.driver.findUnique.mockResolvedValue(null);

      const res = await request(app).post("/api/taxi-requests").send(body);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Driver not found");
      expect(mockDb.taxiRequest.create).not.toHaveBeenCalled();
    });

    it("returns 409 for an unavailable driver", async () => {
      mockDb.driver.findUnique.mockResolvedValue({
        ...driverRecord,
        isAvailable: false,
      });

      const res = await request(app).post("/api/taxi-requests").send(body);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Driver is not available");
      expect(mockDb.taxiRequest.create).not.toHaveBeenCalled();
    });

    it("returns 400 for an empty body", async () => {
      const res = await request(app).post("/api/taxi-requests").send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Driver is required");
      expect(res.body.message).toContain("Customer name is required");
      expect(res.body.message).toContain("Customer phone is required");
      expect(res.body.message).toContain("Pickup location is required");
      expect(res.body.message).toContain("Destination is required");
    });

    it("returns 400 for an invalid phone number", async () => {
      const res = await request(app)
        .post("/api/taxi-requests")
        .send({ ...body, customerPhone: "abc" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Customer phone is invalid");
    });

    it("returns 400 for an over-long pickup location", async () => {
      const res = await request(app)
        .post("/api/taxi-requests")
        .send({ ...body, pickupLocation: "a".repeat(256) });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Pickup location is too long");
    });
  });

  describe("GET /api/taxi-requests/:id", () => {
    it("returns the request with driver and whatsapp details", async () => {
      mockDb.taxiRequest.findUnique.mockResolvedValue(requestRecord);

      const res = await request(app).get("/api/taxi-requests/t1");

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe("t1");
      expect(res.body.data.driver.id).toBe("d1");
      expect(res.body.data.whatsapp.whatsappNumber).toBe("8801711111111");
    });

    it("returns 404 for an unknown request", async () => {
      mockDb.taxiRequest.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/api/taxi-requests/nope");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Taxi request not found");
    });
  });

  describe("auth guards on partner taxi routes", () => {
    it("returns 401 without a token", async () => {
      const list = await request(app).get("/api/partner/taxi-requests");
      const patch = await request(app)
        .patch("/api/partner/drivers/d1/status")
        .send({ isAvailable: false });

      expect(list.status).toBe(401);
      expect(patch.status).toBe(401);
    });

    it.each(["CUSTOMER", "RESTAURANT_OWNER"])(
      "returns 403 for a %s",
      async (role) => {
        asRole(role);

        const list = await request(app)
          .get("/api/partner/taxi-requests")
          .set(auth);
        const patch = await request(app)
          .patch("/api/partner/drivers/d1/status")
          .set(auth)
          .send({ isAvailable: false });

        expect(list.status).toBe(403);
        expect(list.body.message).toBe("Forbidden");
        expect(patch.status).toBe(403);
        expect(mockDb.driver.update).not.toHaveBeenCalled();
      },
    );
  });

  describe("GET /api/partner/taxi-requests", () => {
    it("lists requests with filters and pagination for an ADMIN", async () => {
      asRole("ADMIN");
      mockDb.taxiRequest.findMany.mockResolvedValue([requestRecord]);
      mockDb.taxiRequest.count.mockResolvedValue(1);

      const res = await request(app)
        .get("/api/partner/taxi-requests?status=PENDING&driverId=d1&limit=10")
        .set(auth);

      expect(res.status).toBe(200);
      expect(res.body.data.taxiRequests).toHaveLength(1);
      expect(res.body.data.taxiRequests[0].driver.name).toBe("Rahim");
      expect(res.body.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
      expect(mockDb.taxiRequest.findMany).toHaveBeenCalledWith({
        where: { status: "PENDING", driverId: "d1" },
        include: { driver: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: 0,
        take: 10,
      });
    });

    it("applies default pagination and no filters", async () => {
      asRole("ADMIN");
      mockDb.taxiRequest.findMany.mockResolvedValue([]);
      mockDb.taxiRequest.count.mockResolvedValue(0);

      const res = await request(app)
        .get("/api/partner/taxi-requests")
        .set(auth);

      expect(res.status).toBe(200);
      expect(mockDb.taxiRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, skip: 0, take: 20 }),
      );
    });

    it("returns 400 for an invalid status filter", async () => {
      asRole("ADMIN");

      const res = await request(app)
        .get("/api/partner/taxi-requests?status=NOPE")
        .set(auth);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Invalid status");
    });
  });

  describe("PATCH /api/partner/drivers/:id/status", () => {
    it("updates driver availability for an ADMIN", async () => {
      asRole("ADMIN");
      mockDb.driver.findUnique.mockResolvedValue(driverRecord);
      mockDb.driver.update.mockResolvedValue({
        ...driverRecord,
        isAvailable: false,
      });

      const res = await request(app)
        .patch("/api/partner/drivers/d1/status")
        .set(auth)
        .send({ isAvailable: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isAvailable).toBe(false);
      expect(mockDb.driver.update).toHaveBeenCalledWith({
        where: { id: "d1" },
        data: { isAvailable: false },
      });
    });

    it("returns 404 for an unknown driver", async () => {
      asRole("ADMIN");
      mockDb.driver.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/partner/drivers/nope/status")
        .set(auth)
        .send({ isAvailable: true });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Driver not found");
      expect(mockDb.driver.update).not.toHaveBeenCalled();
    });

    it("returns 400 when isAvailable is missing", async () => {
      asRole("ADMIN");

      const res = await request(app)
        .patch("/api/partner/drivers/d1/status")
        .set(auth)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("isAvailable is required");
    });
  });
});