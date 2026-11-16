export const ORDER_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string | null;
  itemName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  orderNumber: string;
  orderType: "TAKEAWAY";
  subtotal: string;
  total: string;
  notes: string | null;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface CreateOrderItemInput {
  menuItemId: string;
  quantity: number;
}

export interface CreateOrderInput {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  notes?: string | null;
  items: CreateOrderItemInput[];
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
}

export interface ListOrdersQuery {
  status?: OrderStatus;
  page: number;
  limit: number;
}

export interface PaginatedOrders {
  orders: OrderWithItems[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderableMenuItem {
  id: string;
  name: string;
  price: string;
}

export interface CreateOrderItemData {
  menuItemId: string;
  itemName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

export interface CreateOrderData {
  restaurantId: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  orderNumber: string;
  notes: string | null;
  subtotal: string;
  total: string;
  items: CreateOrderItemData[];
}

export interface OrderWhatsAppSource {
  orderNumber: string;
  customerName: string;
  total: string;
  notes: string | null;
  items: { itemName: string; quantity: number; totalPrice: string }[];
  restaurant: { name: string; whatsappNumber: string | null };
}

export interface WhatsAppDetails {
  orderNumber: string;
  whatsappNumber: string;
  message: string;
  url: string;
}