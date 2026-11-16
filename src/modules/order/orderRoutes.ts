import { Router } from "express";

import * as orderController from "./orderController.js";
import validate from "../../shared/middleware/validate.js";
import authMiddleware from "../../shared/middleware/authMiddleware.js";
import authorize from "../../shared/middleware/authorize.js";
import optionalAuth from "../../shared/middleware/optionalAuth.js";

import { createOrderSchema, updateOrderStatusSchema } from "./orderValidators.js";

const publicRouter = Router();
const partnerRouter = Router();

/**
 * @openapi
 * /api/orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create takeaway order
 *     description: >
 *       Guests can order without a token. If a valid bearer token is sent,
 *       the order is linked to that user. Names and prices are read from the
 *       menu and stored as snapshots.
 *     security:
 *       - {}
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Validation error or unavailable menu item
 *       401:
 *         description: Invalid or expired token
 *       404:
 *         description: Restaurant not found
 *       409:
 *         description: Restaurant is not accepting orders
 */
publicRouter.post(
  "/",
  optionalAuth,
  validate(createOrderSchema),
  orderController.createOrder,
);

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get order details
 *     description: The order ID acts as the access token for guest orders.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order fetched successfully
 *       404:
 *         description: Order not found
 */
publicRouter.get("/:id", orderController.getOrder);

/**
 * @openapi
 * /api/orders/{id}/whatsapp:
 *   get:
 *     tags: [Orders]
 *     summary: Generate WhatsApp message details
 *     description: Returns a prefilled message and a wa.me link to the restaurant's WhatsApp number.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: WhatsApp details generated successfully
 *       404:
 *         description: Order not found or restaurant has no WhatsApp number
 */
publicRouter.get("/:id/whatsapp", orderController.getOrderWhatsApp);

partnerRouter.use(authMiddleware, authorize("RESTAURANT_OWNER", "ADMIN"));

/**
 * @openapi
 * /api/partner/orders:
 *   get:
 *     tags: [Partner Orders]
 *     summary: Get restaurant orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACCEPTED, PREPARING, READY, COMPLETED, REJECTED, CANCELLED]
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Orders fetched successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Restaurant not found
 */
partnerRouter.get("/", orderController.listPartnerOrders);

/**
 * @openapi
 * /api/partner/orders/{id}:
 *   get:
 *     tags: [Partner Orders]
 *     summary: Get individual order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Order or restaurant not found
 */
partnerRouter.get("/:id", orderController.getPartnerOrder);

/**
 * @openapi
 * /api/partner/orders/{id}/status:
 *   patch:
 *     tags: [Partner Orders]
 *     summary: Update order status
 *     description: >
 *       Allowed transitions: PENDING to ACCEPTED, REJECTED or CANCELLED;
 *       ACCEPTED to PREPARING or CANCELLED; PREPARING to READY; READY to COMPLETED.
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
 *             $ref: '#/components/schemas/UpdateOrderStatusRequest'
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Order or restaurant not found
 *       409:
 *         description: Invalid status transition
 */
partnerRouter.patch(
  "/:id/status",
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus,
);

export { partnerRouter };
export default publicRouter;