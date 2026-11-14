import * as yup from "yup";

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateRestaurantRequest:
 *       type: object
 *       required: [name, address, phone]
 *       properties:
 *         name: { type: string, example: Spice Garden }
 *         description: { type: string, nullable: true }
 *         address: { type: string, example: "House 12, Road 5, Dhanmondi, Dhaka" }
 *         latitude: { type: number, nullable: true, example: 23.7461 }
 *         longitude: { type: number, nullable: true, example: 90.3742 }
 *         phone: { type: string, example: "+8801712345678" }
 *         whatsappNumber: { type: string, nullable: true }
 *         email: { type: string, format: email, nullable: true }
 *         openingHours:
 *           type: object
 *           nullable: true
 *           additionalProperties: { type: string }
 *           example: { mon: "09:00-22:00", fri: "14:00-23:00" }
 *         coverImage: { type: string, nullable: true }
 *     UpdateRestaurantRequest:
 *       type: object
 *       description: Any subset of the create fields; at least one is required.
 *       properties:
 *         name: { type: string }
 *         description: { type: string, nullable: true }
 *         address: { type: string }
 *         latitude: { type: number, nullable: true }
 *         longitude: { type: number, nullable: true }
 *         phone: { type: string }
 *         whatsappNumber: { type: string, nullable: true }
 *         email: { type: string, format: email, nullable: true }
 *         openingHours:
 *           type: object
 *           nullable: true
 *           additionalProperties: { type: string }
 *         coverImage: { type: string, nullable: true }
 *     UpdateRestaurantStatusRequest:
 *       type: object
 *       required: [status]
 *       properties:
 *         status: { type: string, enum: [OPEN, CLOSED] }
 */

const openingHoursField = yup
  .mixed<Record<string, string>>()
  .nullable()
  .test(
    "opening-hours",
    "openingHours must be an object of string values",
    (value) =>
      value == null ||
      (typeof value === "object" &&
        !Array.isArray(value) &&
        Object.values(value).every((v) => typeof v === "string")),
  );

export const createRestaurantSchema = yup.object({
  name: yup.string().trim().required("Name is required"),
  description: yup.string().nullable(),
  address: yup.string().trim().required("Address is required"),
  latitude: yup
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90")
    .nullable(),
  longitude: yup
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180")
    .nullable(),
  phone: yup.string().trim().required("Phone is required"),
  whatsappNumber: yup.string().nullable(),
  email: yup.string().email("Invalid email format").nullable(),
  openingHours: openingHoursField,
  coverImage: yup.string().nullable(),
});

export const updateRestaurantSchema = yup
  .object({
    name: yup.string().trim().min(1, "Name cannot be empty"),
    description: yup.string().nullable(),
    address: yup.string().trim().min(1, "Address cannot be empty"),
    latitude: yup
      .number()
      .min(-90, "Latitude must be between -90 and 90")
      .max(90, "Latitude must be between -90 and 90")
      .nullable(),
    longitude: yup
      .number()
      .min(-180, "Longitude must be between -180 and 180")
      .max(180, "Longitude must be between -180 and 180")
      .nullable(),
    phone: yup.string().trim().min(1, "Phone cannot be empty"),
    whatsappNumber: yup.string().nullable(),
    email: yup.string().email("Invalid email format").nullable(),
    openingHours: openingHoursField,
    coverImage: yup.string().nullable(),
  })
  .test(
    "at-least-one-field",
    "At least one field is required",
    (value) =>
      !!value && Object.values(value).some((v) => v !== undefined),
  );

export const updateStatusSchema = yup.object({
  status: yup
    .string()
    .oneOf(["OPEN", "CLOSED"], "Status must be OPEN or CLOSED")
    .required("Status is required"),
});