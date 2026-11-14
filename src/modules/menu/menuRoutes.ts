import { Router } from "express";

import * as menuController from "./menuController.js";
import validate from "../../shared/middleware/validate.js";
import authMiddleware from "../../shared/middleware/authMiddleware.js";
import authorize from "../../shared/middleware/authorize.js";

import {
  createCategorySchema,
  updateCategorySchema,
  createItemSchema,
  updateItemSchema,
  updateAvailabilitySchema,
} from "./menuValidators.js";

const publicRouter = Router();
const partnerRouter = Router();

/**
 * @openapi
 * /api/restaurants/{id}/menu:
 *   get:
 *     tags: [Menu]
 *     summary: Get restaurant menu
 *     description: Returns active categories that have at least one available item, with only the available items.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Menu fetched successfully
 *       404:
 *         description: Restaurant not found
 */
publicRouter.get("/:id/menu", menuController.getMenu);

/**
 * @openapi
 * /api/restaurants/{id}/categories:
 *   get:
 *     tags: [Menu]
 *     summary: Get menu categories
 *     description: Returns active categories that have at least one available item.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Categories fetched successfully
 *       404:
 *         description: Restaurant not found
 */
publicRouter.get("/:id/categories", menuController.getCategories);

partnerRouter.use(authMiddleware, authorize("RESTAURANT_OWNER", "ADMIN"));

/**
 * @openapi
 * /api/partner/menu/categories:
 *   post:
 *     tags: [Partner Menu]
 *     summary: Create category
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategoryRequest'
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Restaurant not found
 *       409:
 *         description: Category name already exists
 */
partnerRouter.post(
  "/categories",
  validate(createCategorySchema),
  menuController.createCategory,
);

/**
 * @openapi
 * /api/partner/menu/categories/{id}:
 *   put:
 *     tags: [Partner Menu]
 *     summary: Update category
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
 *             $ref: '#/components/schemas/UpdateCategoryRequest'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category name already exists
 */
partnerRouter.put(
  "/categories/:id",
  validate(updateCategorySchema),
  menuController.updateCategory,
);

/**
 * @openapi
 * /api/partner/menu/categories/{id}:
 *   delete:
 *     tags: [Partner Menu]
 *     summary: Delete category
 *     description: A category that still has menu items cannot be deleted.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category has menu items
 */
partnerRouter.delete("/categories/:id", menuController.deleteCategory);

/**
 * @openapi
 * /api/partner/menu/items:
 *   post:
 *     tags: [Partner Menu]
 *     summary: Create menu item
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMenuItemRequest'
 *     responses:
 *       201:
 *         description: Menu item created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Restaurant or category not found
 */
partnerRouter.post(
  "/items",
  validate(createItemSchema),
  menuController.createItem,
);

/**
 * @openapi
 * /api/partner/menu/items/{id}:
 *   put:
 *     tags: [Partner Menu]
 *     summary: Update menu item
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
 *             $ref: '#/components/schemas/UpdateMenuItemRequest'
 *     responses:
 *       200:
 *         description: Menu item updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Menu item or category not found
 */
partnerRouter.put(
  "/items/:id",
  validate(updateItemSchema),
  menuController.updateItem,
);

/**
 * @openapi
 * /api/partner/menu/items/{id}:
 *   delete:
 *     tags: [Partner Menu]
 *     summary: Delete menu item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Menu item deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Menu item not found
 */
partnerRouter.delete("/items/:id", menuController.deleteItem);

/**
 * @openapi
 * /api/partner/menu/items/{id}/availability:
 *   patch:
 *     tags: [Partner Menu]
 *     summary: Update menu item availability
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
 *             $ref: '#/components/schemas/UpdateMenuItemAvailabilityRequest'
 *     responses:
 *       200:
 *         description: Menu item availability updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Menu item not found
 */
partnerRouter.patch(
  "/items/:id/availability",
  validate(updateAvailabilitySchema),
  menuController.updateItemAvailability,
);

export { partnerRouter };
export default publicRouter;