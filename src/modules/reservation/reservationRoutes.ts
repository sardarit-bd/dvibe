import { Router } from "express";

import * as reservationController from "./reservationController.js";
import validate from "../../shared/middleware/validate.js";
import authMiddleware from "../../shared/middleware/authMiddleware.js";
import authorize from "../../shared/middleware/authorize.js";
import optionalAuth from "../../shared/middleware/optionalAuth.js";

import {
  createReservationSchema,
  updateReservationStatusSchema,
} from "./reservationValidators.js";

const publicRouter = Router();
const partnerRouter = Router();

/**
 * @openapi
 * /api/reservations:
 *   post:
 *     tags: [Reservations]
 *     summary: Create reservation
 *     description: >
 *       Guests can reserve without a token. If a valid bearer token is sent,
 *       the reservation is linked to that user. The date must be today or
 *       later and within 90 days. New reservations start as PENDING.
 *     security:
 *       - {}
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReservationRequest'
 *     responses:
 *       201:
 *         description: Reservation created successfully
 *       400:
 *         description: Validation error or date out of range
 *       401:
 *         description: Invalid or expired token
 *       404:
 *         description: Restaurant not found
 */
publicRouter.post(
  "/",
  optionalAuth,
  validate(createReservationSchema),
  reservationController.createReservation,
);

/**
 * @openapi
 * /api/reservations/{id}:
 *   get:
 *     tags: [Reservations]
 *     summary: Get reservation details
 *     description: The reservation ID acts as the access token for guest reservations.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Reservation fetched successfully
 *       404:
 *         description: Reservation not found
 */
publicRouter.get("/:id", reservationController.getReservation);

partnerRouter.use(authMiddleware, authorize("RESTAURANT_OWNER", "ADMIN"));

/**
 * @openapi
 * /api/partner/reservations:
 *   get:
 *     tags: [Partner Reservations]
 *     summary: Get restaurant reservations
 *     description: Sorted by reservation date and time, earliest first.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, REJECTED, CANCELLED, COMPLETED]
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date, example: "2026-12-01" }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Reservations fetched successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Restaurant not found
 */
partnerRouter.get("/", reservationController.listPartnerReservations);

/**
 * @openapi
 * /api/partner/reservations/{id}:
 *   get:
 *     tags: [Partner Reservations]
 *     summary: Get individual reservation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Reservation fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Reservation or restaurant not found
 */
partnerRouter.get("/:id", reservationController.getPartnerReservation);

/**
 * @openapi
 * /api/partner/reservations/{id}/status:
 *   patch:
 *     tags: [Partner Reservations]
 *     summary: Update reservation status
 *     description: >
 *       Allowed transitions: PENDING to CONFIRMED, REJECTED or CANCELLED;
 *       CONFIRMED to COMPLETED or CANCELLED.
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
 *             $ref: '#/components/schemas/UpdateReservationStatusRequest'
 *     responses:
 *       200:
 *         description: Reservation status updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Reservation or restaurant not found
 *       409:
 *         description: Invalid status transition
 */
partnerRouter.patch(
  "/:id/status",
  validate(updateReservationStatusSchema),
  reservationController.updateReservationStatus,
);

export { partnerRouter };
export default publicRouter;