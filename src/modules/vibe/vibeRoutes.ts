import { Router } from "express";
import * as vibeController from "./vibeController.js";

const vibeRouter = Router();

/**
 * @openapi
 * /api/vibes:
 *   get:
 *     tags: [Vibes]
 *     summary: Get Vibe content
 *     description: Returns published vibes, newest first. Optionally filtered by category.
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [EVENT, LIVE_MUSIC, NIGHTLIFE] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, minimum: 0, default: 0 }
 *     responses:
 *       200:
 *         description: Vibes fetched successfully
 *       400:
 *         description: Invalid query parameters
 */
vibeRouter.get("/", vibeController.getVibes);

/**
 * @openapi
 * /api/vibes/{id}:
 *   get:
 *     tags: [Vibes]
 *     summary: Get Vibe details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Vibe fetched successfully
 *       404:
 *         description: Vibe not found
 */
vibeRouter.get("/:id", vibeController.getVibe);

export default vibeRouter;