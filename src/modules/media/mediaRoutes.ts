import { Router } from "express";

import * as mediaController from "./mediaController.js";
import validate from "../../shared/middleware/validate.js";
import authMiddleware from "../../shared/middleware/authMiddleware.js";
import authorize from "../../shared/middleware/authorize.js";
import { uploadSingleImage, cleanupUploadOnError } from "./mediaStorage.js";
import { uploadMediaSchema, addPhotoSchema } from "./mediaValidators.js";

const mediaRouter = Router();
const partnerPhotoRouter = Router();

const partnerOnly = [authMiddleware, authorize("RESTAURANT_OWNER", "ADMIN")];

/**
 * @openapi
 * /api/media/upload:
 *   post:
 *     tags: [Media]
 *     summary: Upload image
 *     description: JPEG, PNG or WebP, max 5 MB. Stored under the caller's restaurant.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               menuItemId:
 *                 type: string
 *                 description: Optional menu item of the same restaurant
 *     responses:
 *       201:
 *         description: Media uploaded successfully
 *       400:
 *         description: Missing file, wrong type or invalid content
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Restaurant or menu item not found
 *       413:
 *         description: File too large
 */
mediaRouter.post(
  "/upload",
  ...partnerOnly,
  uploadSingleImage,
  validate(uploadMediaSchema),
  mediaController.upload,
  cleanupUploadOnError,
);

/**
 * @openapi
 * /api/media/{id}:
 *   get:
 *     tags: [Media]
 *     summary: Get media information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Media fetched successfully
 *       404:
 *         description: Media not found
 */
mediaRouter.get("/:id", mediaController.getOne);

/**
 * @openapi
 * /api/media/{id}:
 *   delete:
 *     tags: [Media]
 *     summary: Delete image
 *     description: Media that is still a restaurant photo cannot be deleted.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Media deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Media not found
 *       409:
 *         description: Media is in use
 */
mediaRouter.delete("/:id", ...partnerOnly, mediaController.remove);

partnerPhotoRouter.use(...partnerOnly);

/**
 * @openapi
 * /api/partner/restaurant/photos:
 *   post:
 *     tags: [Partner Restaurant]
 *     summary: Add restaurant photo
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddRestaurantPhotoRequest'
 *     responses:
 *       201:
 *         description: Restaurant photo added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Media not found
 *       409:
 *         description: Media is already a restaurant photo
 */
partnerPhotoRouter.post("/", validate(addPhotoSchema), mediaController.addPhoto);

/**
 * @openapi
 * /api/partner/restaurant/photos/{id}:
 *   delete:
 *     tags: [Partner Restaurant]
 *     summary: Remove restaurant photo
 *     description: Removes the gallery entry only. The media file stays until deleted through /api/media/{id}.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Restaurant photo removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Photo not found
 */
partnerPhotoRouter.delete("/:id", mediaController.removePhoto);

export { partnerPhotoRouter };
export default mediaRouter;