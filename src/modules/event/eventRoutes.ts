import { Router } from "express";
import * as eventController from "./eventController.js";

const eventRouter = Router();

/**
 * @openapi
 * /api/events:
 *   get:
 *     tags: [Events]
 *     summary: Get events
 *     description: Returns published and cancelled events ordered by date and start time. Upcoming events only (today onward) unless upcoming=false.
 *     parameters:
 *       - in: query
 *         name: upcoming
 *         schema: { type: boolean, default: true }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, minimum: 0, default: 0 }
 *     responses:
 *       200:
 *         description: Events fetched successfully
 *       400:
 *         description: Invalid query parameters
 */
eventRouter.get("/", eventController.getEvents);

/**
 * @openapi
 * /api/events/{id}:
 *   get:
 *     tags: [Events]
 *     summary: Get event details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Event fetched successfully
 *       404:
 *         description: Event not found
 */
eventRouter.get("/:id", eventController.getEvent);

export default eventRouter;