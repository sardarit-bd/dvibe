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
  menuItem: { findMany: jest.fn<AnyFn>() },
  order: {
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

const now = new Date().toISOString();

const orderRecord = {
  id: "o1",
  restaurantId: "r1",
  customerId: null,
  customerName: "Sam",
  customerPhone: "+8801700000000",
  orderNumber: "ORD-20261116-ABC123",
  orderType: "TAKEAWAY",
  subtotal: "11.00",
  total: "11.00",
  notes: null,
  status: "PENDING",
  createdAt: now,
  updatedAt: now,
  items: [
    {
      id: "oi1",
      orderId: "o1",
      menuItemId: "i1",
      itemName: "Tomato Soup",
      quantity: 2,
      unitPrice: "5.50",
      totalPrice: "11.00",
    },
  ],
};

const menuRow = { id: "i1", name: "Tomato Soup", price: "5.50" };

const orderBody = {
  restaurantId: "r1",
  customerName: "Sam",
  customerPhone: "+8801700000000",
  items: [{ menuItemId: "i1", quantity: 2 }],
};

const createArg = (): { data: Record<string, unknown> } =>
  mockDb.order.create.mock.calls[0]![0] as { data: Record<string, unknown> };

const openRestaurant = (): void => {
  mockDb.restaurant.findFirst.mockResolvedValue({ id: "r1", status: "OPEN" });
};

describe("Order API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("POST /api/orders", () => {
    it("creates a guest order with price snapshots from the menu", async () => {
      openRestaurant();
      mockDb.menuItem.findMany.mockResolvedValue([menuRow]);
      mockDb.order.create.mockResolvedValue(orderRecord);

      const res = await request(app).post("/api/orders").send(orderBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderNumber).toBe("ORD-20261116-ABC123");
      expect(mockDb.user.findUnique).not.toHaveBeenCalled();
      expect(mockDb.menuItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: { in: ["i1"] },
            restaurantId: "r1",
            isAvailable: true,
            category: { isActive: true },
          },
        }),
      );

      const { data } = createArg();
      expect(data.customerId).toBeNull();
      expect(data.subtotal).toBe("11.00");
      expect(data.total).toBe("11.00");
      expect(data.orderNumber).toMatch(/^ORD-\d{8}-[0-9A-F]{6}$/);
      expect(data.items).toEqual({
        create: [
          {
            menuItemId: "i1",
            itemName: "Tomato Soup",
            quantity: 2,
            unitPrice: "5.50",
            totalPrice: "11.00",
          },
        ],
      });
    });

    it("links the order to the user when a valid token is sent", async () => {
      asRole("CUSTOMER");
      openRestaurant();
      mockDb.menuItem.findMany.mockResolvedValue([menuRow]);
      mockDb.order.create.mockResolvedValue({
        ...orderRecord,
        customerId: "u1",
      });

      const res = await request(app)
        .post("/api/orders")
        .set(auth)
        .send(orderBody);

      expect(res.status).toBe(201);
      expect(createArg().data.customerId).toBe("u1");
    });

    it("returns 401 when an invalid token is sent", async () => {
      const res = await request(app)
        .post("/api/orders")
        .set({ Authorization: "Bearer not-a-token" })
        .send(orderBody);

      expect(res.status).toBe(401);
      expect(mockDb.order.create).not.toHaveBeenCalled();
    });

    it("ignores client-sent prices, status and totals", async () => {
      openRestaurant();
      mockDb.menuItem.findMany.mockResolvedValue([menuRow]);
      mockDb.order.create.mockResolvedValue(orderRecord);

      await request(app)
        .post("/api/orders")
        .send({
          ...orderBody,
          status: "COMPLETED",
          total: 1,
          items: [{ menuItemId: "i1", quantity: 2, unitPrice: 1 }],
        });

      const { data } = createArg();
      expect(data).not.toHaveProperty("status");
      expect(data.total).toBe("11.00");
      expect(data.items).toEqual({
        create: [expect.objectContaining({ unitPrice: "5.50" })],
      });
    });

    it("merges duplicate menu items into one line", async () => {
      openRestaurant();
      mockDb.menuItem.findMany.mockResolvedValue([menuRow]);
      mockDb.order.create.mockResolvedValue(orderRecord);

      await request(app)
        .post("/api/orders")
        .send({
          ...orderBody,
          items: [
            { menuItemId: "i1", quantity: 2 },
            { menuItemId: "i1", quantity: 3 },
          ],
        });

      const { data } = createArg();
      expect(data.subtotal).toBe("27.50");
      expect(data.items).toEqual({
        create: [
          expect.objectContaining({ quantity: 5, totalPrice: "27.50" }),
        ],
      });
    });

    it("retries when the generated order number collides", async () => {
      openRestaurant();
      mockDb.menuItem.findMany.mockResolvedValue([menuRow]);
      mockDb.order.create
        .mockRejectedValueOnce({ code: "P2002" })
        .mockResolvedValueOnce(orderRecord);

      const res = await request(app).post("/api/orders").send(orderBody);

      expect(res.status).toBe(201);
      expect(mockDb.order.create).toHaveBeenCalledTimes(2);
    });

    it("returns 404 when the restaurant is not public", async () => {
      mockDb.restaurant.findFirst.mockResolvedValue(null);

      const res = await request(app).post("/api/orders").send(orderBody);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Restaurant not found");
    });

    it("returns 409 when the restaurant is closed", async () => {
      mockDb.restaurant.findFirst.mockResolvedValue({
        id: "r1",
        status: "CLOSED",
      });

      const res = await request(app).post("/api/orders").send(orderBody);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Restaurant is not accepting orders");
      expect(mockDb.order.create).not.toHaveBeenCalled();
    });

    it("returns 400 when a menu item is unavailable or from another restaurant", async () => {
      openRestaurant();
      mockDb.menuItem.findMany.mockResolvedValue([]);

      const res = await request(app).post("/api/orders").send(orderBody);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("One or more menu items are not available");
      expect(mockDb.order.create).not.toHaveBeenCalled();
    });

    it("returns 400 for an empty body", async () => {
      const res = await request(app).post("/api/orders").send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Restaurant is required");
      expect(res.body.message).toContain("Customer name is required");
      expect(res.body.message).toContain("Customer phone is required");
      expect(res.body.message).toContain("Items are required");
    });

    it("returns 400 for empty items and invalid quantity", async () => {
      const empty = await request(app)
        .post("/api/orders")
        .send({ ...orderBody, items: [] });
      expect(empty.status).toBe(400);
      expect(empty.body.message).toContain("At least one item is required");

      const bad = await request(app)
        .post("/api/orders")
        .send({ ...orderBody, items: [{ menuItemId: "i1", quantity: 0 }] });
      expect(bad.status).toBe(400);
      expect(bad.body.message).toContain("Quantity must be at least 1");
    });

    it("returns 400 for an invalid phone number", async () => {
      const res = await request(app)
        .post("/api/orders")
        .send({ ...orderBody, customerPhone: "abc" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Customer phone is invalid");
    });
  });

  describe("GET /api/orders/:id", () => {
    it("returns the order with its items", async () => {
      mockDb.order.findUnique.mockResolvedValue(orderRecord);

      const res = await request(app).get("/api/orders/o1");

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].itemName).toBe("Tomato Soup");
      expect(res.body.data.items[0].unitPrice).toBe("5.50");
    });

    it("returns 404 for an unknown order", async () => {
      mockDb.order.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/api/orders/nope");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Order not found");
    });
  });

  describe("GET /api/orders/:id/whatsapp", () => {
    const source = {
      orderNumber: "ORD-20261116-ABC123",
      customerName: "Sam",
      total: "11.00",
      notes: "No onions",
      items: [{ itemName: "Tomato Soup", quantity: 2, totalPrice: "11.00" }],
      restaurant: { name: "Dvibe Diner", whatsappNumber: "+880 1700-000000" },
    };

    it("returns a message and wa.me link with a normalized number", async () => {
      mockDb.order.findUnique.mockResolvedValue(source);

      const res = await request(app).get("/api/orders/o1/whatsapp");

      expect(res.status).toBe(200);
      expect(res.body.data.whatsappNumber).toBe("8801700000000");
      expect(res.body.data.url.startsWith("https://wa.me/8801700000000?text=")).toBe(
        true,
      );
      expect(res.body.data.message).toContain("ORD-20261116-ABC123");
      expect(res.body.data.message).toContain("2 x Tomato Soup");
      expect(res.body.data.message).toContain("Notes: No onions");
    });

    it("returns 404 when the restaurant has no WhatsApp number", async () => {
      mockDb.order.findUnique.mockResolvedValue({
        ...source,
        restaurant: { name: "Dvibe Diner", whatsappNumber: null },
      });

      const res = await request(app).get("/api/orders/o1/whatsapp");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Restaurant WhatsApp number is not available");
    });

    it("returns 404 for an unknown order", async () => {
      mockDb.order.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/api/orders/nope/whatsapp");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Order not found");
    });
  });

  describe("auth guards on /api/partner/orders", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app).get("/api/partner/orders");

      expect(res.status).toBe(401);
    });

    it("returns 403 for a CUSTOMER", async () => {
      asRole("CUSTOMER");

      const res = await request(app).get("/api/partner/orders").set(auth);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Forbidden");
    });
  });

  describe("GET /api/partner/orders", () => {
    it("lists only the owner's restaurant orders with pagination", async () => {
      asOwnerWithRestaurant();
      mockDb.order.findMany.mockResolvedValue([orderRecord]);
      mockDb.order.count.mockResolvedValue(1);

      const res = await request(app)
        .get("/api/partner/orders?status=PENDING&page=1&limit=10")
        .set(auth);

      expect(res.status).toBe(200);
      expect(res.body.data.orders).toHaveLength(1);
      expect(res.body.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
      expect(mockDb.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { restaurantId: "r1", status: "PENDING" },
          skip: 0,
          take: 10,
        }),
      );
    });

    it("applies default pagination and no status filter", async () => {
      asOwnerWithRestaurant();
      mockDb.order.findMany.mockResolvedValue([]);
      mockDb.order.count.mockResolvedValue(0);

      const res = await request(app).get("/api/partner/orders").set(auth);

      expect(res.status).toBe(200);
      expect(mockDb.order.findMany).toHaveBeenCalledWith(
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
        .get("/api/partner/orders?status=NOPE")
        .set(auth);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Invalid status");
    });

    it("returns 404 when the owner has no restaurant", async () => {
      asRole("RESTAURANT_OWNER");
      mockDb.restaurant.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/api/partner/orders").set(auth);

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/partner/orders/:id", () => {
    it("returns an owned order", async () => {
      asOwnerWithRestaurant();
      mockDb.order.findFirst.mockResolvedValue(orderRecord);

      const res = await request(app).get("/api/partner/orders/o1").set(auth);

      expect(res.status).toBe(200);
      expect(mockDb.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "o1", restaurantId: "r1" } }),
      );
    });

    it("returns 404 for an order that is not owned", async () => {
      asOwnerWithRestaurant();
      mockDb.order.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/partner/orders/other")
        .set(auth);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Order not found");
    });
  });

  describe("PATCH /api/partner/orders/:id/status", () => {
    it("moves PENDING to ACCEPTED", async () => {
      asOwnerWithRestaurant();
      mockDb.order.findFirst.mockResolvedValue(orderRecord);
      mockDb.order.update.mockResolvedValue({
        ...orderRecord,
        status: "ACCEPTED",
      });

      const res = await request(app)
        .patch("/api/partner/orders/o1/status")
        .set(auth)
        .send({ status: "ACCEPTED" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("ACCEPTED");
      expect(mockDb.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "o1" },
          data: { status: "ACCEPTED" },
        }),
      );
    });

    it("returns 409 for an invalid transition", async () => {
      asOwnerWithRestaurant();
      mockDb.order.findFirst.mockResolvedValue(orderRecord);

      const res = await request(app)
        .patch("/api/partner/orders/o1/status")
        .set(auth)
        .send({ status: "READY" });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe(
        "Cannot change order status from PENDING to READY",
      );
      expect(mockDb.order.update).not.toHaveBeenCalled();
    });

    it("returns 409 when changing a final status", async () => {
      asOwnerWithRestaurant();
      mockDb.order.findFirst.mockResolvedValue({
        ...orderRecord,
        status: "COMPLETED",
      });

      const res = await request(app)
        .patch("/api/partner/orders/o1/status")
        .set(auth)
        .send({ status: "CANCELLED" });

      expect(res.status).toBe(409);
    });

    it("returns 400 for a missing or invalid status", async () => {
      asOwnerWithRestaurant();

      const missing = await request(app)
        .patch("/api/partner/orders/o1/status")
        .set(auth)
        .send({});
      expect(missing.status).toBe(400);
      expect(missing.body.message).toContain("Status is required");

      const invalid = await request(app)
        .patch("/api/partner/orders/o1/status")
        .set(auth)
        .send({ status: "SHIPPED" });
      expect(invalid.status).toBe(400);
      expect(invalid.body.message).toContain("Invalid status");
    });

    it("returns 404 for an order that is not owned", async () => {
      asOwnerWithRestaurant();
      mockDb.order.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/partner/orders/other/status")
        .set(auth)
        .send({ status: "ACCEPTED" });

      expect(res.status).toBe(404);
    });
  });
});