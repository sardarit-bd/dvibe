import { db } from "../../config/database/index.js";
import type {
  CreateOrderData,
  ListOrdersQuery,
  OrderableMenuItem,
  OrderItem,
  OrderStatus,
  OrderWhatsAppSource,
  OrderWithItems,
} from "./orderTypes.js";

type Money = { toString(): string };

type DecimalOrder = Omit<OrderWithItems, "subtotal" | "total" | "items"> & {
  subtotal: Money;
  total: Money;
  items: Array<
    Omit<OrderItem, "unitPrice" | "totalPrice"> & {
      unitPrice: Money;
      totalPrice: Money;
    }
  >;
};

const toOrder = (order: DecimalOrder): OrderWithItems => ({
  ...order,
  subtotal: order.subtotal.toString(),
  total: order.total.toString(),
  items: order.items.map((item) => ({
    ...item,
    unitPrice: item.unitPrice.toString(),
    totalPrice: item.totalPrice.toString(),
  })),
});

/* ---------- restaurant lookups ---------- */

export const findPublicRestaurant = async (
  id: string,
): Promise<{ id: string; status: string } | null> => {
  return db.restaurant.findFirst({
    where: { id, status: { in: ["OPEN", "CLOSED"] } },
    select: { id: true, status: true },
  });
};

export const findOwnerRestaurantId = async (
  ownerId: string,
): Promise<{ id: string } | null> => {
  return db.restaurant.findUnique({
    where: { ownerId },
    select: { id: true },
  });
};

/* ---------- order creation ---------- */

export const findOrderableItems = async (
  restaurantId: string,
  ids: string[],
): Promise<OrderableMenuItem[]> => {
  const items = await db.menuItem.findMany({
    where: {
      id: { in: ids },
      restaurantId,
      isAvailable: true,
      category: { isActive: true },
    },
    select: { id: true, name: true, price: true },
  });

  return items.map((item) => ({ ...item, price: item.price.toString() }));
};

export const createOrder = async (
  data: CreateOrderData,
): Promise<OrderWithItems> => {
  const { items, ...order } = data;

  return toOrder(
    await db.order.create({
      data: { ...order, items: { create: items } },
      include: { items: true },
    }),
  );
};

/* ---------- order lookups ---------- */

export const findOrderById = async (
  id: string,
): Promise<OrderWithItems | null> => {
  const order = await db.order.findUnique({
    where: { id },
    include: { items: true },
  });

  return order ? toOrder(order) : null;
};

export const findOrderWhatsAppSource = async (
  id: string,
): Promise<OrderWhatsAppSource | null> => {
  const order = await db.order.findUnique({
    where: { id },
    select: {
      orderNumber: true,
      customerName: true,
      total: true,
      notes: true,
      items: {
        select: { itemName: true, quantity: true, totalPrice: true },
      },
      restaurant: { select: { name: true, whatsappNumber: true } },
    },
  });

  if (!order) {
    return null;
  }

  return {
    ...order,
    total: order.total.toString(),
    items: order.items.map((item) => ({
      ...item,
      totalPrice: item.totalPrice.toString(),
    })),
  };
};

/* ---------- partner ---------- */

export const findRestaurantOrders = async (
  restaurantId: string,
  query: ListOrdersQuery,
): Promise<{ orders: OrderWithItems[]; total: number }> => {
  const where = {
    restaurantId,
    ...(query.status ? { status: query.status } : {}),
  };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    db.order.count({ where }),
  ]);

  return { orders: orders.map(toOrder), total };
};

export const findOwnedOrderById = async (
  id: string,
  restaurantId: string,
): Promise<OrderWithItems | null> => {
  const order = await db.order.findFirst({
    where: { id, restaurantId },
    include: { items: true },
  });

  return order ? toOrder(order) : null;
};

export const updateOrderStatus = async (
  id: string,
  status: OrderStatus,
): Promise<OrderWithItems> => {
  return toOrder(
    await db.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    }),
  );
};