import * as yup from "yup";
import AppError from "../../shared/utils/AppError.js";
import { RESERVATION_STATUSES } from "./reservationTypes.js";
import type { ListReservationsQuery } from "./reservationTypes.js";

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateReservationRequest:
 *       type: object
 *       required: [restaurantId, customerName, customerPhone, reservationDate, reservationTime, guestCount]
 *       properties:
 *         restaurantId: { type: string }
 *         customerName: { type: string, example: Sam }
 *         customerPhone: { type: string, example: "+8801700000000" }
 *         reservationDate: { type: string, format: date, example: "2026-12-01" }
 *         reservationTime: { type: string, example: "19:30", description: 24-hour HH:mm }
 *         guestCount: { type: integer, minimum: 1, maximum: 20, example: 4 }
 *         specialRequest: { type: string, nullable: true, example: Window table please }
 *     UpdateReservationStatusRequest:
 *       type: object
 *       required: [status]
 *       properties:
 *         status:
 *           type: string
 *           enum: [PENDING, CONFIRMED, REJECTED, CANCELLED, COMPLETED]
 */

const PHONE_REGEX = /^\+?[0-9][0-9\s-]{6,19}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const isRealDate = (value: string): boolean => {
  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const createReservationSchema = yup.object({
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
  reservationDate: yup
    .string()
    .trim()
    .matches(DATE_REGEX, "Reservation date must be in YYYY-MM-DD format")
    .test(
      "real-date",
      "Reservation date is invalid",
      (value) => !value || !DATE_REGEX.test(value) || isRealDate(value),
    )
    .required("Reservation date is required"),
  reservationTime: yup
    .string()
    .trim()
    .matches(TIME_REGEX, "Reservation time must be in HH:mm format (24-hour)")
    .required("Reservation time is required"),
  guestCount: yup
    .number()
    .typeError("Guest count must be a number")
    .integer("Guest count must be an integer")
    .min(1, "Guest count must be at least 1")
    .max(20, "Guest count cannot exceed 20")
    .required("Guest count is required"),
  specialRequest: yup
    .string()
    .trim()
    .max(500, "Special request is too long")
    .nullable(),
});

export const updateReservationStatusSchema = yup.object({
  status: yup
    .string()
    .oneOf([...RESERVATION_STATUSES], "Invalid status")
    .required("Status is required"),
});

const listReservationsQuerySchema = yup.object({
  status: yup.string().oneOf([...RESERVATION_STATUSES], "Invalid status"),
  date: yup
    .string()
    .matches(DATE_REGEX, "Date must be in YYYY-MM-DD format")
    .test(
      "real-date",
      "Date is invalid",
      (value) => !value || !DATE_REGEX.test(value) || isRealDate(value),
    ),
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

export const parseListReservationsQuery = async (
  query: unknown,
): Promise<ListReservationsQuery> => {
  try {
    const parsed = await listReservationsQuerySchema.validate(query, {
      abortEarly: false,
      stripUnknown: true,
    });

    return parsed as ListReservationsQuery;
  } catch (error: unknown) {
    if (error instanceof yup.ValidationError) {
      throw new AppError(error.errors.join(", "), 400);
    }

    throw error;
  }
};