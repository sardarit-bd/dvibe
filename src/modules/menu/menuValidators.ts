import * as yup from "yup";

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateCategoryRequest:
 *       type: object
 *       required: [name]
 *       properties:
 *         name: { type: string, example: Starters }
 *         description: { type: string, nullable: true }
 *         sortOrder: { type: integer, minimum: 0, example: 0 }
 *         isActive: { type: boolean, example: true }
 *     UpdateCategoryRequest:
 *       type: object
 *       description: Any subset of the create fields; at least one is required.
 *       properties:
 *         name: { type: string }
 *         description: { type: string, nullable: true }
 *         sortOrder: { type: integer, minimum: 0 }
 *         isActive: { type: boolean }
 *     CreateMenuItemRequest:
 *       type: object
 *       required: [categoryId, name, price]
 *       properties:
 *         categoryId: { type: string }
 *         name: { type: string, example: Tomato Soup }
 *         description: { type: string, nullable: true }
 *         price: { type: number, minimum: 0.01, example: 5.5 }
 *         image: { type: string, nullable: true }
 *     UpdateMenuItemRequest:
 *       type: object
 *       description: Any subset of the create fields; at least one is required.
 *       properties:
 *         categoryId: { type: string }
 *         name: { type: string }
 *         description: { type: string, nullable: true }
 *         price: { type: number, minimum: 0.01 }
 *         image: { type: string, nullable: true }
 *     UpdateMenuItemAvailabilityRequest:
 *       type: object
 *       required: [isAvailable]
 *       properties:
 *         isAvailable: { type: boolean }
 */

const sortOrderField = yup
  .number()
  .integer("Sort order must be an integer")
  .min(0, "Sort order cannot be negative");

const priceField = yup
  .number()
  .typeError("Price must be a number")
  .positive("Price must be greater than 0")
  .max(99999999.99, "Price is too large")
  .test(
    "max-2-decimals",
    "Price can have at most 2 decimal places",
    (value) =>
      value === undefined ||
      Math.abs(Math.round(value * 100) - value * 100) < 1e-6,
  );

const atLeastOne = (value: object | undefined): boolean =>
  !!value && Object.values(value).some((v) => v !== undefined);

export const createCategorySchema = yup.object({
  name: yup.string().trim().required("Name is required"),
  description: yup.string().nullable(),
  sortOrder: sortOrderField,
  isActive: yup.boolean(),
});

export const updateCategorySchema = yup
  .object({
    name: yup.string().trim().min(1, "Name cannot be empty"),
    description: yup.string().nullable(),
    sortOrder: sortOrderField,
    isActive: yup.boolean(),
  })
  .test("at-least-one-field", "At least one field is required", atLeastOne);

export const createItemSchema = yup.object({
  categoryId: yup.string().trim().required("Category is required"),
  name: yup.string().trim().required("Name is required"),
  description: yup.string().nullable(),
  price: priceField.required("Price is required"),
  image: yup.string().nullable(),
});

export const updateItemSchema = yup
  .object({
    categoryId: yup.string().trim().min(1, "Category cannot be empty"),
    name: yup.string().trim().min(1, "Name cannot be empty"),
    description: yup.string().nullable(),
    price: priceField,
    image: yup.string().nullable(),
  })
  .test("at-least-one-field", "At least one field is required", atLeastOne);

export const updateAvailabilitySchema = yup.object({
  isAvailable: yup.boolean().required("isAvailable is required"),
});
