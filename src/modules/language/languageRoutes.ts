import { Router } from "express";

import * as languageController from "./languageController.js";
import validate from "../../shared/middleware/validate.js";
import authMiddleware from "../../shared/middleware/authMiddleware.js";
import authorize from "../../shared/middleware/authorize.js";
import { updateTranslationsSchema } from "./languageValidators.js";

const languageRouter = Router();
const translationRouter = Router();
const adminTranslationRouter = Router();

/**
 * @openapi
 * /api/languages:
 *   get:
 *     tags: [Languages]
 *     summary: Get supported languages
 *     description: Returns all active languages.
 *     responses:
 *       200:
 *         description: Languages fetched successfully
 */
languageRouter.get("/", languageController.getLanguages);

/**
 * @openapi
 * /api/translations/{locale}:
 *   get:
 *     tags: [Languages]
 *     summary: Get translations for a locale
 *     description: Returns a flat map of translation key to translated text for an active language.
 *     parameters:
 *       - in: path
 *         name: locale
 *         required: true
 *         schema: { type: string }
 *         example: en
 *     responses:
 *       200:
 *         description: Translations fetched successfully
 *       404:
 *         description: Language not found
 */
translationRouter.get("/:locale", languageController.getTranslations);

adminTranslationRouter.use(authMiddleware, authorize("ADMIN"));

/**
 * @openapi
 * /api/admin/translations/{locale}:
 *   put:
 *     tags: [Admin Translations]
 *     summary: Update translations for a locale
 *     description: Creates or updates the given keys. Keys that are not sent are left unchanged.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: locale
 *         required: true
 *         schema: { type: string }
 *         example: en
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTranslationsRequest'
 *     responses:
 *       200:
 *         description: Translations updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Language not found
 */
adminTranslationRouter.put(
  "/:locale",
  validate(updateTranslationsSchema),
  languageController.updateTranslations,
);

export { translationRouter, adminTranslationRouter };
export default languageRouter;