import { Router } from "express";

import * as taxiController from "./taxiController.js";
import validate from "../../shared/middleware/validate.js";
import authMiddleware from "../../shared/middleware/authMiddleware.js";
import authorize from "../../shared/middleware/authorize.js";
import optionalAuth from "../../shared/middleware/optionalAuth.js";

import {
  createTaxiRequestSchema,
  updateDriverAvailabilitySchema,
} from "./taxiValidators.js";

const driverRouter = Router();
const taxiRequestRouter = Router();
const partnerTaxiRequestRouter = Router();
const partnerDriverRouter = Router();

/**
 * @openapi
 * /api/drivers:
 *   get:
 *     tags: [Drivers]
 *     summary: Get available drivers
 *     description: Returns only available drivers, sorted by name.
 *     parameters:
 *       - in: query
 *         name: serviceArea
 *         description: Case-insensitive partial match
 *         schema: { type: string }
 *       - in: query
 *         name: vehicleType
 *         description: Case-insensitive exact match
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Drivers fetched successfully
 *       400:
 *         description: Invalid query parameters
 */
driverRouter.get("/", taxiController.listDrivers);

/**
 * @openapi
 * /api/drivers/{id}:
 *   get:
 *     tags: [Drivers]
 *     summary: Get driver details
 *     description: Returns the driver even when currently unavailable; check isAvailable.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Driver fetched successfully
 *       404:
 *         description: Driver not found
 */
driverRouter.get("/:id", taxiController.getDriver);

/**
 * @openapi
 * /api/taxi-requests:
 *   post:
 *     tags: [Taxi Requests]
 *     summary: Create taxi request
 *     description: >
 *       Guests can request without a token. If a valid bearer token is sent,
 *       the request is linked to that user. The response includes the driver
 *       and a whatsapp object with a prefilled message and wa.me link.
 *     security:
 *       - {}
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaxiRequestBody'
 *     responses:
 *       201:
 *         description: Taxi request created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid or expired token
 *       404:
 *         description: Driver not found
 *       409:
 *         description: Driver is not available
 */
taxiRequestRouter.post(
  "/",
  optionalAuth,
  validate(createTaxiRequestSchema),
  taxiController.createTaxiRequest,
);

/**
 * @openapi
 * /api/taxi-requests/{id}:
 *   get:
 *     tags: [Taxi Requests]
 *     summary: Get taxi request details
 *     description: The request ID acts as the access token for guest requests.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Taxi request fetched successfully
 *       404:
 *         description: Taxi request not found
 */
taxiRequestRouter.get("/:id", taxiController.getTaxiRequest);

partnerTaxiRequestRouter.use(authMiddleware, authorize("ADMIN"));

/**
 * @openapi
 * /api/partner/taxi-requests:
 *   get:
 *     tags: [Partner Taxi]
 *     summary: Get taxi requests
 *     description: ADMIN only. Newest first.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACCEPTED, REJECTED, COMPLETED, CANCELLED]
 *       - in: query
 *         name: driverId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Taxi requests fetched successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
partnerTaxiRequestRouter.get("/", taxiController.listPartnerTaxiRequests);

partnerDriverRouter.use(authMiddleware, authorize("ADMIN"));

/**
 * @openapi
 * /api/partner/drivers/{id}/status:
 *   patch:
 *     tags: [Partner Taxi]
 *     summary: Update driver availability
 *     description: ADMIN only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDriverAvailabilityBody'
 *     responses:
 *       200:
 *         description: Driver availability updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Driver not found
 */
partnerDriverRouter.patch(
  "/:id/status",
  validate(updateDriverAvailabilitySchema),
  taxiController.updateDriverAvailability,
);

export { taxiRequestRouter, partnerTaxiRequestRouter, partnerDriverRouter };
export default driverRouter;