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
  menuCategory: {
    findMany: jest.fn<AnyFn>(),
    findFirst: jest.fn<AnyFn>(),
    findUnique: jest.fn<AnyFn>(),
    create: jest.fn<AnyFn>(),
    update: jest.fn<AnyFn>(),
    delete: jest.fn<AnyFn>(),
  },
  menuItem: {
    count: jest.fn<AnyFn>(),
    findFirst: jest.fn<AnyFn>(),
    create: jest.fn<AnyFn>(),
    update: jest.fn<AnyFn>(),
    delete: jest.fn<AnyFn>(),
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
    name: "Owner",
    email: "owner@example.com",
    role,
  });
};

const asOwnerWithRestaurant = (): void => {
  asRole("RESTAURANT_OWNER");
  mockDb.restaurant.findUnique.mockResolvedValue({ id: "r1" });
};

const category = {
  id: "c1",
  restaurantId: "r1",
  name: "Starters",
  description: null,
  sortOrder: 0,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const item = {
  id: "i1",
  restaurantId: "r1",
  categoryId: "c1",
  name: "Tomato Soup",
  description: null,
  price: "5.50",
  image: null,
  isAvailable: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("Menu API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("GET /api/restaurants/:id/menu", () => {
    it("returns only visible categories with available items", async () => {
      mockDb.restaurant.findFirst.mockResolvedValue({ id: "r1" });
      mockDb.menuCategory.findMany.mockResolvedValue([
        {
          id: "c1",
          name: "Starters",
          description: null,
          sortOrder: 0,
          items: [
            {
              id: "i1",
              name: "Tomato Soup",
              description: null,
              price: "5.50",
              image: null,
            },
          ],
        },
      ]);

      const res = await request(app).get("/api/restaurants/r1/menu");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].items[0].price).toBe("5.50");
      expect(mockDb.menuCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            restaurantId: "r1",
            isActive: true,
            items: { some: { isAvailable: true } },
          },
        }),
      );
    });

    it("returns 404 for a restaurant that is not public", async () => {
      mockDb.restaurant.findFirst.mockResolvedValue(null);

      const res = await request(app).get("/api/restaurants/nope/menu");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Restaurant not found");
      expect(mockDb.menuCategory.findMany).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/restaurants/:id/categories", () => {
    it("returns visible categories", async () => {
      mockDb.restaurant.findFirst.mockResolvedValue({ id: "r1" });
      mockDb.menuCategory.findMany.mockResolvedValue([
        { id: "c1", name: "Starters", description: null, sortOrder: 0 },
      ]);

      const res = await request(app).get("/api/restaurants/r1/categories");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("returns 404 for a restaurant that is not public", async () => {
      mockDb.restaurant.findFirst.mockResolvedValue(null);

      const res = await request(app).get("/api/restaurants/nope/categories");

      expect(res.status).toBe(404);
    });
  });

  describe("auth guards on /api/partner/menu", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app)
        .post("/api/partner/menu/categories")
        .send({ name: "A" });

      expect(res.status).toBe(401);
    });

    it("returns 403 for a CUSTOMER", async () => {
      asRole("CUSTOMER");

      const res = await request(app)
        .post("/api/partner/menu/categories")
        .set(auth)
        .send({ name: "A" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Forbidden");
    });
  });

  describe("POST /api/partner/menu/categories", () => {
    it("creates a category", async () => {
      asOwnerWithRestaurant();
      mockDb.menuCategory.findUnique.mockResolvedValue(null);
      mockDb.menuCategory.create.mockResolvedValue(category);

      const res = await request(app)
        .post("/api/partner/menu/categories")
        .set(auth)
        .send({ name: "Starters" });

      expect(res.status).toBe(201);
      expect(mockDb.menuCategory.create).toHaveBeenCalledWith({
        data: { name: "Starters", restaurantId: "r1" },
      });
    });

    it("returns 409 for a duplicate name", async () => {
      asOwnerWithRestaurant();
      mockDb.menuCategory.findUnique.mockResolvedValue({ id: "c9" });

      const res = await request(app)
        .post("/api/partner/menu/categories")
        .set(auth)
        .send({ name: "Starters" });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Category name already exists");
    });

    it("returns 400 for an empty body", async () => {
      asOwnerWithRestaurant();

      const res = await request(app)
        .post("/api/partner/menu/categories")
        .set(auth)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Name is required");
    });

    it("returns 404 when the owner has no restaurant", async () => {
      asRole("RESTAURANT_OWNER");
      mockDb.restaurant.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/partner/menu/categories")
        .set(auth)
        .send({ name: "Starters" });

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/partner/menu/categories/:id", () => {
    it("updates a category", async () => {
      asOwnerWithRestaurant();
      mockDb.menuCategory.findFirst.mockResolvedValue(category);
      mockDb.menuCategory.update.mockResolvedValue({
        ...category,
        isActive: false,
      });

      const res = await request(app)
        .put("/api/partner/menu/categories/c1")
        .set(auth)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
      expect(mockDb.menuCategory.findFirst).toHaveBeenCalledWith({
        where: { id: "c1", restaurantId: "r1" },
      });
    });

    it("returns 404 for a category that is not owned", async () => {
      asOwnerWithRestaurant();
      mockDb.menuCategory.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/partner/menu/categories/other")
        .set(auth)
        .send({ isActive: false });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Category not found");
    });

    it("returns 400 for an empty body", async () => {
      asOwnerWithRestaurant();

      const res = await request(app)
        .put("/api/partner/menu/categories/c1")
        .set(auth)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("At least one field is required");
    });
  });

  describe("DELETE /api/partner/menu/categories/:id", () => {
    it("deletes an empty category", async () => {
      asOwnerWithRestaurant();
      mockDb.menuCategory.findFirst.mockResolvedValue(category);
      mockDb.menuItem.count.mockResolvedValue(0);
      mockDb.menuCategory.delete.mockResolvedValue(category);

      const res = await request(app)
        .delete("/api/partner/menu/categories/c1")
        .set(auth);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
      expect(mockDb.menuCategory.delete).toHaveBeenCalledWith({
        where: { id: "c1" },
      });
    });

    it("returns 409 when the category has items", async () => {
      asOwnerWithRestaurant();
      mockDb.menuCategory.findFirst.mockResolvedValue(category);
      mockDb.menuItem.count.mockResolvedValue(3);

      const res = await request(app)
        .delete("/api/partner/menu/categories/c1")
        .set(auth);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Category has menu items");
      expect(mockDb.menuCategory.delete).not.toHaveBeenCalled();
    });

    it("returns 404 for a category that is not owned", async () => {
      asOwnerWithRestaurant();
      mockDb.menuCategory.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .delete("/api/partner/menu/categories/other")
        .set(auth);

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/partner/menu/items", () => {
    const body = { categoryId: "c1", name: "Tomato Soup", price: 5.5 };

    it("creates an item", async () => {
      asOwnerWithRestaurant();
      mockDb.menuCategory.findFirst.mockResolvedValue(category);
      mockDb.menuItem.create.mockResolvedValue(item);

      const res = await request(app)
        .post("/api/partner/menu/items")
        .set(auth)
        .send(body);

      expect(res.status).toBe(201);
      expect(res.body.data.price).toBe("5.50");
      expect(mockDb.menuItem.create).toHaveBeenCalledWith({
        data: { ...body, restaurantId: "r1" },
      });
    });

    it("ignores isAvailable and restaurantId sent by the client", async () => {
      asOwnerWithRestaurant();
      mockDb.menuCategory.findFirst.mockResolvedValue(category);
      mockDb.menuItem.create.mockResolvedValue(item);

      await request(app)
        .post("/api/partner/menu/items")
        .set(auth)
        .send({ ...body, isAvailable: false, restaurantId: "hacker" });

      const arg = mockDb.menuItem.create.mock.calls[0]![0] as {
        data: Record<string, unknown>;
      };
      expect(arg.data.restaurantId).toBe("r1");
      expect(arg.data).not.toHaveProperty("isAvailable");
    });

    it("returns 404 when the category belongs to another restaurant", async () => {
      asOwnerWithRestaurant();
      mockDb.menuCategory.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/partner/menu/items")
        .set(auth)
        .send(body);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Category not found");
      expect(mockDb.menuItem.create).not.toHaveBeenCalled();
    });

    it("returns 400 for an empty body", async () => {
      asOwnerWithRestaurant();

      const res = await request(app)
        .post("/api/partner/menu/items")
        .set(auth)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Category is required");
      expect(res.body.message).toContain("Name is required");
      expect(res.body.message).toContain("Price is required");
    });

    it("returns 400 for an invalid price", async () => {
      asOwnerWithRestaurant();

      const res = await request(app)
        .post("/api/partner/menu/items")
        .set(auth)
        .send({ ...body, price: -1 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Price must be greater than 0");
    });
  });

  describe("PUT /api/partner/menu/items/:id", () => {
    it("updates an item", async () => {
      asOwnerWithRestaurant();
      mockDb.menuItem.findFirst.mockResolvedValue(item);
      mockDb.menuItem.update.mockResolvedValue({ ...item, price: "9.00" });

      const res = await request(app)
        .put("/api/partner/menu/items/i1")
        .set(auth)
        .send({ price: 9 });

      expect(res.status).toBe(200);
      expect(res.body.data.price).toBe("9.00");
      expect(mockDb.menuItem.findFirst).toHaveBeenCalledWith({
        where: { id: "i1", restaurantId: "r1" },
      });
    });

    it("returns 404 when moving to a category that is not owned", async () => {
      asOwnerWithRestaurant();
      mockDb.menuItem.findFirst.mockResolvedValue(item);
      mockDb.menuCategory.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/partner/menu/items/i1")
        .set(auth)
        .send({ categoryId: "other" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Category not found");
    });

    it("returns 404 for an item that is not owned", async () => {
      asOwnerWithRestaurant();
      mockDb.menuItem.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/partner/menu/items/other")
        .set(auth)
        .send({ name: "X" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Menu item not found");
    });

    it("returns 400 for an empty body", async () => {
      asOwnerWithRestaurant();

      const res = await request(app)
        .put("/api/partner/menu/items/i1")
        .set(auth)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/partner/menu/items/:id", () => {
    it("deletes an item", async () => {
      asOwnerWithRestaurant();
      mockDb.menuItem.findFirst.mockResolvedValue(item);
      mockDb.menuItem.delete.mockResolvedValue(item);

      const res = await request(app)
        .delete("/api/partner/menu/items/i1")
        .set(auth);

      expect(res.status).toBe(200);
      expect(mockDb.menuItem.delete).toHaveBeenCalledWith({
        where: { id: "i1" },
      });
    });

    it("returns 404 for an item that is not owned", async () => {
      asOwnerWithRestaurant();
      mockDb.menuItem.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .delete("/api/partner/menu/items/other")
        .set(auth);

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/partner/menu/items/:id/availability", () => {
    it("updates availability", async () => {
      asOwnerWithRestaurant();
      mockDb.menuItem.findFirst.mockResolvedValue(item);
      mockDb.menuItem.update.mockResolvedValue({ ...item, isAvailable: false });

      const res = await request(app)
        .patch("/api/partner/menu/items/i1/availability")
        .set(auth)
        .send({ isAvailable: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isAvailable).toBe(false);
      expect(mockDb.menuItem.update).toHaveBeenCalledWith({
        where: { id: "i1" },
        data: { isAvailable: false },
      });
    });

    it("returns 400 when isAvailable is missing", async () => {
      asOwnerWithRestaurant();

      const res = await request(app)
        .patch("/api/partner/menu/items/i1/availability")
        .set(auth)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("isAvailable is required");
    });

    it("returns 404 for an item that is not owned", async () => {
      asOwnerWithRestaurant();
      mockDb.menuItem.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/partner/menu/items/other/availability")
        .set(auth)
        .send({ isAvailable: true });

      expect(res.status).toBe(404);
    });
  });
});