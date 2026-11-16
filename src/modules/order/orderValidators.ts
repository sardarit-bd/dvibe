import * as yup from "yup";
import AppError from "../../shared/utils/AppError.js";
import { ORDER_STATUSES } from "./orderTypes.js";
import type { ListOrdersQuery } from "./orderTypes.js";

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateOrderRequest:
 *       type: object
 *       required: [restaurantId, customerName, customerPhone, items]
 *       properties:
 *         restaurantId: { type: string }
 *         customerName: { type: string, example: Sam }
 *         customerPhone: { type: string, example: "+8801700000000" }
 *         notes: { type: string, nullable: true, example: No onions }
 *         items:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
 *             required: [menuItemId, quantity]
 *             properties:
 *               menuItemId: { type: string }
 *               quantity: { type: integer, minimum: 1, maximum: 99, example: 2 }
 *     UpdateOrderStatusRequest:
 *       type: object
 *       required: [status]
 *       properties:
 *         status:
 *           type: string
 *           enum: [PENDING, ACCEPTED, PREPARING, READY, COMPLETED, REJECTED, CANCELLED]
 */

const PHONE_REGEX = /^\+?[0-9][0-9\s-]{6,19}$/;

export const createOrderSchema = yup.object({
  restaurantId: yup.string().trim().required("Restaurant is required"),
  customerName: yup
    .string()
    .trim()
    .max(100, "Customer name is too long")
    .required("Customer name is required"),
  customerPhone: yup
    .string()
    .trim()
    .matches(PHONE_REGEX, "Customer phone is invalid")
    .required("Customer phone is required"),
  notes: yup.string().trim().max(500, "Notes are too long").nullable(),
  items: yup
    .array()
    .of(
      yup.object({
        menuItemId: yup.string().trim().required("Menu item is required"),
        quantity: yup
          .number()
          .typeError("Quantity must be a number")
          .integer("Quantity must be an integer")
          .min(1, "Quantity must be at least 1")
          .max(99, "Quantity cannot exceed 99")
          .required("Quantity is required"),
      }),
    )
    .min(1, "At least one item is required")
    .max(50, "Too many items")
    .required("Items are required"),
});

export const updateOrderStatusSchema = yup.object({
  status: yup
    .string()
    .oneOf([...ORDER_STATUSES], "Invalid status")
    .required("Status is required"),
});

const listOrdersQuerySchema = yup.object({
  status: yup.string().oneOf([...ORDER_STATUSES], "Invalid status"),
  page: yup
    .number()
    .typeError("Page must be a number")
    .integer("Page must be an integer")
    .min(1, "Page must be at least 1")
    .default(1),
  limit: yup
    .number()
    .typeError("Limit must be a number")
    .integer("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(20),
});

export const parseListOrdersQuery = async (
  query: unknown,
): Promise<ListOrdersQuery> => {
  try {
    const parsed = await listOrdersQuerySchema.validate(query, {
      abortEarly: false,
      stripUnknown: true,
    });

    return parsed as ListOrdersQuery;
  } catch (error: unknown) {
    if (error instanceof yup.ValidationError) {
      throw new AppError(error.errors.join(", "), 400);
    }

    throw error;
  }
};