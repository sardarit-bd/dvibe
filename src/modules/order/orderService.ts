import { randomBytes } from "node:crypto";
import AppError from "../../shared/utils/AppError.js";
import * as orderRepository from "./orderRepository.js";
import type {
  CreateOrderData,
  CreateOrderInput,
  ListOrdersQuery,
  OrderStatus,
  OrderWithItems,
  PaginatedOrders,
  UpdateOrderStatusInput,
  WhatsAppDetails,
} from "./orderTypes.js";

const MAX_ORDER_NUMBER_ATTEMPTS = 3;
const MAX_ITEM_QUANTITY = 99;

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY"],
  READY: ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

const toCents = (price: string): number => Math.round(Number(price) * 100);

const formatCents = (cents: number): string => (cents / 100).toFixed(2);

const generateOrderNumber = (): string => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomBytes(3).toString("hex").toUpperCase();

  return `ORD-${date}-${suffix}`;
};

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "P2002";

const getOwnerRestaurantId = async (ownerId: string): Promise<string> => {
  const restaurant = await orderRepository.findOwnerRestaurantId(ownerId);

  if (!restaurant) {
    throw new AppError("Restaurant not found", 404);
  }

  return restaurant.id;
};

const getOwnedOrder = async (
  restaurantId: string,
  id: string,
): Promise<OrderWithItems> => {
  const order = await orderRepository.findOwnedOrderById(id, restaurantId);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  return order;
};

/* ---------- public ---------- */

export const createOrder = async (
  customerId: string | null,
  data: CreateOrderInput,
): Promise<OrderWithItems> => {
  const restaurant = await orderRepository.findPublicRestaurant(
    data.restaurantId,
  );

  if (!restaurant) {
    throw new AppError("Restaurant not found", 404);
  }

  if (restaurant.status !== "OPEN") {
    throw new AppError("Restaurant is not accepting orders", 409);
  }

  const quantities = new Map<string, number>();

  for (const { menuItemId, quantity } of data.items) {
    quantities.set(menuItemId, (quantities.get(menuItemId) ?? 0) + quantity);
  }

  for (const quantity of quantities.values()) {
    if (quantity > MAX_ITEM_QUANTITY) {
      throw new AppError(
        `Quantity cannot exceed ${MAX_ITEM_QUANTITY} per item`,
        400,
      );
    }
  }

  const menuItems = await orderRepository.findOrderableItems(
    data.restaurantId,
    [...quantities.keys()],
  );

  if (menuItems.length !== quantities.size) {
    throw new AppError("One or more menu items are not available", 400);
  }

  const menuItemsById = new Map(menuItems.map((item) => [item.id, item]));

  let subtotalCents = 0;

  const items = [...quantities.entries()].map(([menuItemId, quantity]) => {
    const menuItem = menuItemsById.get(menuItemId)!;
    const unitCents = toCents(menuItem.price);
    const totalCents = unitCents * quantity;
    subtotalCents += totalCents;

    return {
      menuItemId,
      itemName: menuItem.name,
      quantity,
      unitPrice: formatCents(unitCents),
      totalPrice: formatCents(totalCents),
    };
  });

  const orderData: Omit<CreateOrderData, "orderNumber"> = {
    restaurantId: data.restaurantId,
    customerId,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    notes: data.notes ?? null,
    subtotal: formatCents(subtotalCents),
    total: formatCents(subtotalCents),
    items,
  };

  for (let attempt = 1; attempt <= MAX_ORDER_NUMBER_ATTEMPTS; attempt++) {
    try {
      return await orderRepository.createOrder({
        ...orderData,
        orderNumber: generateOrderNumber(),
      });
    } catch (error) {
      if (isUniqueViolation(error) && attempt < MAX_ORDER_NUMBER_ATTEMPTS) {
        continue;
      }

      throw error;
    }
  }

  throw new AppError("Could not generate order number", 500);
};

export const getOrder = async (id: string): Promise<OrderWithItems> => {
  const order = await orderRepository.findOrderById(id);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  return order;
};

export const getOrderWhatsApp = async (
  id: string,
): Promise<WhatsAppDetails> => {
  const order = await orderRepository.findOrderWhatsAppSource(id);

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  const whatsappNumber = (order.restaurant.whatsappNumber ?? "").replace(
    /\D/g,
    "",
  );

  if (!whatsappNumber) {
    throw new AppError("Restaurant WhatsApp number is not available", 404);
  }

  const lines = [
    `New takeaway order ${order.orderNumber}`,
    `Name: ${order.customerName}`,
    "Items:",
    ...order.items.map(
      (item) => `- ${item.quantity} x ${item.itemName} (${item.totalPrice})`,
    ),
    `Total: ${order.total}`,
  ];

  if (order.notes) {
    lines.push(`Notes: ${order.notes}`);
  }

  const message = lines.join("\n");

  return {
    orderNumber: order.orderNumber,
    whatsappNumber,
    message,
    url: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,
  };
};

/* ---------- partner ---------- */

export const listPartnerOrders = async (
  ownerId: string,
  query: ListOrdersQuery,
): Promise<PaginatedOrders> => {
  const restaurantId = await getOwnerRestaurantId(ownerId);
  const { orders, total } = await orderRepository.findRestaurantOrders(
    restaurantId,
    query,
  );

  return {
    orders,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const getPartnerOrder = async (
  ownerId: string,
  id: string,
): Promise<OrderWithItems> => {
  const restaurantId = await getOwnerRestaurantId(ownerId);

  return getOwnedOrder(restaurantId, id);
};

export const updateOrderStatus = async (
  ownerId: string,
  id: string,
  data: UpdateOrderStatusInput,
): Promise<OrderWithItems> => {
  const restaurantId = await getOwnerRestaurantId(ownerId);
  const order = await getOwnedOrder(restaurantId, id);

  if (!allowedTransitions[order.status].includes(data.status)) {
    throw new AppError(
      `Cannot change order status from ${order.status} to ${data.status}`,
      409,
    );
  }

  return orderRepository.updateOrderStatus(id, data.status);
};