import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type {
  CreateOrderData,
  CreateOrderInput,
  OrderStatus,
  OrderWithItems,
} from "../../orderTypes.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

const mockRepo = {
  findPublicRestaurant: jest.fn<AnyFn>(),
  findOwnerRestaurantId: jest.fn<AnyFn>(),
  findOrderableItems: jest.fn<AnyFn>(),
  createOrder: jest.fn<AnyFn>(),
  findOrderById: jest.fn<AnyFn>(),
  findOrderWhatsAppSource: jest.fn<AnyFn>(),
  findRestaurantOrders: jest.fn<AnyFn>(),
  findOwnedOrderById: jest.fn<AnyFn>(),
  updateOrderStatus: jest.fn<AnyFn>(),
};

jest.unstable_mockModule("../../orderRepository.js", () => mockRepo);

const orderService = await import("../../orderService.js");

const makeOrder = (status: OrderStatus): OrderWithItems => ({
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
  status,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [],
});

const baseInput: CreateOrderInput = {
  restaurantId: "r1",
  customerName: "Sam",
  customerPhone: "+8801700000000",
  items: [{ menuItemId: "i1", quantity: 2 }],
};

const soup = { id: "i1", name: "Tomato Soup", price: "5.50" };
const bread = { id: "i2", name: "Garlic Bread", price: "19.99" };

const createdWith = (): CreateOrderData =>
  mockRepo.createOrder.mock.calls[0]![0] as CreateOrderData;

describe("orderService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("createOrder", () => {
    beforeEach(() => {
      mockRepo.findPublicRestaurant.mockResolvedValue({
        id: "r1",
        status: "OPEN",
      });
      mockRepo.findOrderableItems.mockResolvedValue([soup]);
      mockRepo.createOrder.mockResolvedValue(makeOrder("PENDING"));
    });

    it("snapshots names and prices from the menu and totals them", async () => {
      await orderService.createOrder(null, baseInput);

      const data = createdWith();
      expect(data.items).toEqual([
        {
          menuItemId: "i1",
          itemName: "Tomato Soup",
          quantity: 2,
          unitPrice: "5.50",
          totalPrice: "11.00",
        },
      ]);
      expect(data.subtotal).toBe("11.00");
      expect(data.total).toBe("11.00");
    });

    it("does money math in cents without float drift", async () => {
      mockRepo.findOrderableItems.mockResolvedValue([bread]);

      await orderService.createOrder(null, {
        ...baseInput,
        items: [{ menuItemId: "i2", quantity: 3 }],
      });

      const data = createdWith();
      expect(data.items[0]!.totalPrice).toBe("59.97");
      expect(data.subtotal).toBe("59.97");
    });

    it("keeps request order and sums subtotal across lines", async () => {
      mockRepo.findOrderableItems.mockResolvedValue([soup, bread]);

      await orderService.createOrder(null, {
        ...baseInput,
        items: [
          { menuItemId: "i2", quantity: 1 },
          { menuItemId: "i1", quantity: 2 },
        ],
      });

      const data = createdWith();
      expect(data.items.map((item) => item.menuItemId)).toEqual(["i2", "i1"]);
      expect(data.subtotal).toBe("30.99");
    });

    it("merges duplicate menu items into one line", async () => {
      await orderService.createOrder(null, {
        ...baseInput,
        items: [
          { menuItemId: "i1", quantity: 2 },
          { menuItemId: "i1", quantity: 3 },
        ],
      });

      expect(mockRepo.findOrderableItems).toHaveBeenCalledWith("r1", ["i1"]);
      const data = createdWith();
      expect(data.items).toHaveLength(1);
      expect(data.items[0]!.quantity).toBe(5);
      expect(data.items[0]!.totalPrice).toBe("27.50");
    });

    it("passes customerId and defaults notes to null", async () => {
      await orderService.createOrder("u1", baseInput);

      const data = createdWith();
      expect(data.customerId).toBe("u1");
      expect(data.notes).toBeNull();
    });

    it("throws 404 when the restaurant is not public", async () => {
      mockRepo.findPublicRestaurant.mockResolvedValue(null);

      await expect(
        orderService.createOrder(null, baseInput),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Restaurant not found",
      });
    });

    it("throws 409 when the restaurant is closed", async () => {
      mockRepo.findPublicRestaurant.mockResolvedValue({
        id: "r1",
        status: "CLOSED",
      });

      await expect(
        orderService.createOrder(null, baseInput),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Restaurant is not accepting orders",
      });
      expect(mockRepo.findOrderableItems).not.toHaveBeenCalled();
    });

    it("throws 400 when an item is not orderable", async () => {
      mockRepo.findOrderableItems.mockResolvedValue([]);

      await expect(
        orderService.createOrder(null, baseInput),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "One or more menu items are not available",
      });
      expect(mockRepo.createOrder).not.toHaveBeenCalled();
    });

    it("throws 400 when merged quantity exceeds 99", async () => {
      await expect(
        orderService.createOrder(null, {
          ...baseInput,
          items: [
            { menuItemId: "i1", quantity: 60 },
            { menuItemId: "i1", quantity: 50 },
          ],
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Quantity cannot exceed 99 per item",
      });
      expect(mockRepo.findOrderableItems).not.toHaveBeenCalled();
    });

    it("generates an order number in the expected format", async () => {
      await orderService.createOrder(null, baseInput);

      expect(createdWith().orderNumber).toMatch(/^ORD-\d{8}-[0-9A-F]{6}$/);
    });

    it("retries with a new order number on a unique violation", async () => {
      mockRepo.createOrder
        .mockRejectedValueOnce({ code: "P2002" })
        .mockResolvedValueOnce(makeOrder("PENDING"));

      const order = await orderService.createOrder(null, baseInput);

      expect(order.status).toBe("PENDING");
      expect(mockRepo.createOrder).toHaveBeenCalledTimes(2);
    });

    it("gives up after three unique violations", async () => {
      mockRepo.createOrder.mockRejectedValue({ code: "P2002" });

      await expect(
        orderService.createOrder(null, baseInput),
      ).rejects.toEqual({ code: "P2002" });
      expect(mockRepo.createOrder).toHaveBeenCalledTimes(3);
    });

    it("does not retry on other errors", async () => {
      mockRepo.createOrder.mockRejectedValue(new Error("db down"));

      await expect(orderService.createOrder(null, baseInput)).rejects.toThrow(
        "db down",
      );
      expect(mockRepo.createOrder).toHaveBeenCalledTimes(1);
    });
  });

  describe("getOrder", () => {
    it("returns the order", async () => {
      mockRepo.findOrderById.mockResolvedValue(makeOrder("PENDING"));

      const order = await orderService.getOrder("o1");

      expect(order.id).toBe("o1");
    });

    it("throws 404 when missing", async () => {
      mockRepo.findOrderById.mockResolvedValue(null);

      await expect(orderService.getOrder("nope")).rejects.toMatchObject({
        statusCode: 404,
        message: "Order not found",
      });
    });
  });

  describe("getOrderWhatsApp", () => {
    const source = {
      orderNumber: "ORD-20261116-ABC123",
      customerName: "Sam",
      total: "11.00",
      notes: "No onions",
      items: [{ itemName: "Tomato Soup", quantity: 2, totalPrice: "11.00" }],
      restaurant: { name: "Dvibe Diner", whatsappNumber: "+880 1700-000000" },
    };

    it("builds a message and a wa.me link with a digits-only number", async () => {
      mockRepo.findOrderWhatsAppSource.mockResolvedValue(source);

      const result = await orderService.getOrderWhatsApp("o1");

      expect(result.whatsappNumber).toBe("8801700000000");
      expect(result.message).toContain("New takeaway order ORD-20261116-ABC123");
      expect(result.message).toContain("- 2 x Tomato Soup (11.00)");
      expect(result.message).toContain("Total: 11.00");
      expect(result.message).toContain("Notes: No onions");
      expect(result.url).toBe(
        `https://wa.me/8801700000000?text=${encodeURIComponent(result.message)}`,
      );
    });

    it("omits the notes line when there are no notes", async () => {
      mockRepo.findOrderWhatsAppSource.mockResolvedValue({
        ...source,
        notes: null,
      });

      const result = await orderService.getOrderWhatsApp("o1");

      expect(result.message).not.toContain("Notes:");
    });

    it("throws 404 when the order is missing", async () => {
      mockRepo.findOrderWhatsAppSource.mockResolvedValue(null);

      await expect(orderService.getOrderWhatsApp("nope")).rejects.toMatchObject(
        { statusCode: 404, message: "Order not found" },
      );
    });

    it.each([null, "", "---"])(
      "throws 404 when the WhatsApp number is %p",
      async (whatsappNumber) => {
        mockRepo.findOrderWhatsAppSource.mockResolvedValue({
          ...source,
          restaurant: { name: "Dvibe Diner", whatsappNumber },
        });

        await expect(orderService.getOrderWhatsApp("o1")).rejects.toMatchObject(
          {
            statusCode: 404,
            message: "Restaurant WhatsApp number is not available",
          },
        );
      },
    );
  });

  describe("listPartnerOrders", () => {
    it("scopes to the owner's restaurant and computes pagination", async () => {
      mockRepo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      mockRepo.findRestaurantOrders.mockResolvedValue({
        orders: [makeOrder("PENDING")],
        total: 45,
      });

      const query = { status: "PENDING" as const, page: 2, limit: 20 };
      const result = await orderService.listPartnerOrders("u1", query);

      expect(mockRepo.findOwnerRestaurantId).toHaveBeenCalledWith("u1");
      expect(mockRepo.findRestaurantOrders).toHaveBeenCalledWith("r1", query);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
      });
    });

    it("returns zero pages when there are no orders", async () => {
      mockRepo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      mockRepo.findRestaurantOrders.mockResolvedValue({ orders: [], total: 0 });

      const result = await orderService.listPartnerOrders("u1", {
        page: 1,
        limit: 20,
      });

      expect(result.pagination.totalPages).toBe(0);
    });

    it("throws 404 when the owner has no restaurant", async () => {
      mockRepo.findOwnerRestaurantId.mockResolvedValue(null);

      await expect(
        orderService.listPartnerOrders("u1", { page: 1, limit: 20 }),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(mockRepo.findRestaurantOrders).not.toHaveBeenCalled();
    });
  });

  describe("getPartnerOrder", () => {
    it("looks the order up within the owner's restaurant", async () => {
      mockRepo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      mockRepo.findOwnedOrderById.mockResolvedValue(makeOrder("PENDING"));

      await orderService.getPartnerOrder("u1", "o1");

      expect(mockRepo.findOwnedOrderById).toHaveBeenCalledWith("o1", "r1");
    });

    it("throws 404 for an order that is not owned", async () => {
      mockRepo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
      mockRepo.findOwnedOrderById.mockResolvedValue(null);

      await expect(
        orderService.getPartnerOrder("u1", "other"),
      ).rejects.toMatchObject({ statusCode: 404, message: "Order not found" });
    });
  });

  describe("updateOrderStatus", () => {
    beforeEach(() => {
      mockRepo.findOwnerRestaurantId.mockResolvedValue({ id: "r1" });
    });

    const validTransitions: [OrderStatus, OrderStatus][] = [
      ["PENDING", "ACCEPTED"],
      ["PENDING", "REJECTED"],
      ["PENDING", "CANCELLED"],
      ["ACCEPTED", "PREPARING"],
      ["ACCEPTED", "CANCELLED"],
      ["PREPARING", "READY"],
      ["READY", "COMPLETED"],
    ];

    it.each(validTransitions)("allows %s -> %s", async (from, to) => {
      mockRepo.findOwnedOrderById.mockResolvedValue(makeOrder(from));
      mockRepo.updateOrderStatus.mockResolvedValue(makeOrder(to));

      const order = await orderService.updateOrderStatus("u1", "o1", {
        status: to,
      });

      expect(order.status).toBe(to);
      expect(mockRepo.updateOrderStatus).toHaveBeenCalledWith("o1", to);
    });

    const invalidTransitions: [OrderStatus, OrderStatus][] = [
      ["PENDING", "READY"],
      ["PENDING", "PENDING"],
      ["ACCEPTED", "READY"],
      ["PREPARING", "CANCELLED"],
      ["READY", "CANCELLED"],
      ["COMPLETED", "PENDING"],
      ["REJECTED", "ACCEPTED"],
      ["CANCELLED", "PENDING"],
    ];

    it.each(invalidTransitions)("rejects %s -> %s", async (from, to) => {
      mockRepo.findOwnedOrderById.mockResolvedValue(makeOrder(from));

      await expect(
        orderService.updateOrderStatus("u1", "o1", { status: to }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: `Cannot change order status from ${from} to ${to}`,
      });
      expect(mockRepo.updateOrderStatus).not.toHaveBeenCalled();
    });

    it("throws 404 for an order that is not owned", async () => {
      mockRepo.findOwnedOrderById.mockResolvedValue(null);

      await expect(
        orderService.updateOrderStatus("u1", "other", { status: "ACCEPTED" }),
      ).rejects.toMatchObject({ statusCode: 404, message: "Order not found" });
    });

    it("throws 404 when the owner has no restaurant", async () => {
      mockRepo.findOwnerRestaurantId.mockResolvedValue(null);

      await expect(
        orderService.updateOrderStatus("u1", "o1", { status: "ACCEPTED" }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Restaurant not found",
      });
    });
  });
});