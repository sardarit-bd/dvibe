import * as yup from "yup";
import AppError from "../../shared/utils/AppError.js";
import { TAXI_REQUEST_STATUSES } from "./taxiTypes.js";
import type {
  ListDriversQuery,
  ListTaxiRequestsQuery,
} from "./taxiTypes.js";

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateTaxiRequestBody:
 *       type: object
 *       required: [driverId, customerName, customerPhone, pickupLocation, destination]
 *       properties:
 *         driverId: { type: string }
 *         customerName: { type: string, example: Sam }
 *         customerPhone: { type: string, example: "+8801700000000" }
 *         pickupLocation: { type: string, example: Gazipur Chowrasta }
 *         destination: { type: string, example: Hazrat Shahjalal Airport }
 *         notes: { type: string, nullable: true, example: Two bags }
 *     UpdateDriverAvailabilityBody:
 *       type: object
 *       required: [isAvailable]
 *       properties:
 *         isAvailable: { type: boolean }
 */

const PHONE_REGEX = /^\+?[0-9][0-9\s-]{6,19}$/;

export const createTaxiRequestSchema = yup.object({
  driverId: yup.string().trim().required("Driver is required"),
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
  pickupLocation: yup
    .string()
    .trim()
    .max(255, "Pickup location is too long")
    .required("Pickup location is required"),
  destination: yup
    .string()
    .trim()
    .max(255, "Destination is too long")
    .required("Destination is required"),
  notes: yup.string().trim().max(500, "Notes are too long").nullable(),
});

export const updateDriverAvailabilitySchema = yup.object({
  isAvailable: yup.boolean().required("isAvailable is required"),
});

const pageField = yup
  .number()
  .typeError("Page must be a number")
  .integer("Page must be an integer")
  .min(1, "Page must be at least 1")
  .default(1);

const limitField = yup
  .number()
  .typeError("Limit must be a number")
  .integer("Limit must be an integer")
  .min(1, "Limit must be at least 1")
  .max(100, "Limit cannot exceed 100")
  .default(20);

const listDriversQuerySchema = yup.object({
  serviceArea: yup.string().trim().max(100, "Service area is too long"),
  vehicleType: yup.string().trim().max(50, "Vehicle type is too long"),
  page: pageField,
  limit: limitField,
});

const listTaxiRequestsQuerySchema = yup.object({
  status: yup.string().oneOf([...TAXI_REQUEST_STATUSES], "Invalid status"),
  driverId: yup.string().trim(),
  page: pageField,
  limit: limitField,
});

const parseQuery = async <T>(
  schema: yup.AnySchema,
  query: unknown,
): Promise<T> => {
  try {
    const parsed = await schema.validate(query, {
      abortEarly: false,
      stripUnknown: true,
    });

    return parsed as T;
  } catch (error: unknown) {
    if (error instanceof yup.ValidationError) {
      throw new AppError(error.errors.join(", "), 400);
    }

    throw error;
  }
};

export const parseListDriversQuery = (
  query: unknown,
): Promise<ListDriversQuery> =>
  parseQuery<ListDriversQuery>(listDriversQuerySchema, query);

export const parseListTaxiRequestsQuery = (
  query: unknown,
): Promise<ListTaxiRequestsQuery> =>
  parseQuery<ListTaxiRequestsQuery>(listTaxiRequestsQuerySchema, query);