import * as yup from "yup";

/**
 * @openapi
 * components:
 *   schemas:
 *     AddRestaurantPhotoRequest:
 *       type: object
 *       required: [mediaId]
 *       properties:
 *         mediaId: { type: string }
 *         sortOrder: { type: integer, minimum: 0, example: 0 }
 */

export const uploadMediaSchema = yup.object({
  menuItemId: yup.string().trim(),
});

export const addPhotoSchema = yup.object({
  mediaId: yup.string().trim().required("Media is required"),
  sortOrder: yup
    .number()
    .integer("Sort order must be an integer")
    .min(0, "Sort order cannot be negative"),
});