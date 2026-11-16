import { Router } from "express";

import * as restaurantController from "./restaurantController.js";
import validate from "../../shared/middleware/validate.js";
import authMiddleware from "../../shared/middleware/authMiddleware.js";
import authorize from "../../shared/middleware/authorize.js";

import {
  createRestaurantSchema,
  updateRestaurantSchema,
  updateStatusSchema,
} from "./restaurantValidators.js";

const publicRouter = Router();
const partnerRouter = Router();

/**
 * @openapi
 * /api/restaurants:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get all public restaurants
 *     description: Returns restaurants with status OPEN or CLOSED.
 *     responses:
 *       200:
 *         description: Restaurants fetched successfully
 */
publicRouter.get("/", restaurantController.getAll);

/**
 * @openapi
 * /api/restaurants/{id}:
 *   get:
 *     tags: [Restaurants]
 *     summary: Get restaurant details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Restaurant fetched successfully
 *       404:
 *         description: Restaurant not found
 */
publicRouter.get("/:id", restaurantController.getById);

partnerRouter.use(authMiddleware, authorize("RESTAURANT_OWNER", "ADMIN"));

/**
 * @openapi
 * /api/partner/restaurant:
 *   get:
 *     tags: [Partner Restaurant]
 *     summary: Get the authenticated partner's restaurant
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Restaurant fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Restaurant not found
 */
partnerRouter.get("/", restaurantController.getMine);

/**
 * @openapi
 * /api/partner/restaurant:
 *   post:
 *     tags: [Partner Restaurant]
 *     summary: Create restaurant profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRestaurantRequest'
 *     responses:
 *       201:
 *         description: Restaurant created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Restaurant profile already exists
 */
partnerRouter.post(
  "/",
  validate(createRestaurantSchema),
  restaurantController.create,
);

/**
 * @openapi
 * /api/partner/restaurant:
 *   put:
 *     tags: [Partner Restaurant]
 *     summary: Update restaurant profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRestaurantRequest'
 *     responses:
 *       200:
 *         description: Restaurant updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Restaurant not found
 */
partnerRouter.put(
  "/",
  validate(updateRestaurantSchema),
  restaurantController.update,
);

/**
 * @openapi
 * /api/partner/restaurant/status:
 *   patch:
 *     tags: [Partner Restaurant]
 *     summary: Update restaurant status
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRestaurantStatusRequest'
 *     responses:
 *       200:
 *         description: Restaurant status updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Restaurant not found
 */
partnerRouter.patch(
  "/status",
  validate(updateStatusSchema),
  restaurantController.updateStatus,
);

export { partnerRouter };
export default publicRouter;
