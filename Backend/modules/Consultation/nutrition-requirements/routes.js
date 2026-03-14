import { Router } from "express";
import { getNutritionRequirements, patchNutritionRequirements } from "./controller.js";
import { validateGetSessionId, validatePatchNutritionRequirements } from "./validation.js";
import { authenticateToken } from "../../Auth/authMiddleware.js";

const router = Router();

/**
 * @swagger
 * /api/Consultation/sessions/{sessionId}/nutrition-requirements:
 *   get:
 *     summary: Retrieve nutrition requirements (nutrition review inputs + computed outputs) for a session
 *     tags: [Consultation - Nutrition Requirements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         description: The UUID of the session
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully retrieved nutrition requirements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/NutritionRequirementsResponse"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 *
 *   patch:
 *     summary: Update nutrition requirements inputs for a session (partial update)
 *     tags: [Consultation - Nutrition Requirements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         description: The UUID of the session
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/NutritionRequirementsPatchRequest"
 *     responses:
 *       200:
 *         description: Successfully updated nutrition requirements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/NutritionRequirementsResponse"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */

router.get("/sessions/:sessionId/nutrition-requirements", validateGetSessionId, getNutritionRequirements);
router.patch("/sessions/:sessionId/nutrition-requirements", authenticateToken, validatePatchNutritionRequirements, patchNutritionRequirements);

export default router;
