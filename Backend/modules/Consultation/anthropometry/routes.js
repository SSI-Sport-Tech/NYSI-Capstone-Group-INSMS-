import { Router } from "express";
import { getAnthropometry, patchAnthropometry } from "./controller.js";
import { validateGetSessionId, validatePatchAnthropometry } from "./validation.js";

const router = Router();

/**
 * @swagger
 * /api/Consultation/sessions/{sessionId}/anthropometry:
 *   get:
 *     summary: Retrieve anthropometry + related computed fields for a session
 *     tags: [Consultation - Anthropometry]
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
 *         description: Successfully retrieved anthropometry
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/AnthropometryResponse"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 *
 *   patch:
 *     summary: Update anthropometry fields for a session (partial update)
 *     tags: [Consultation - Anthropometry]
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
 *             $ref: "#/components/schemas/AnthropometryPatchRequest"
 *     responses:
 *       200:
 *         description: Successfully updated anthropometry
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/AnthropometryResponse"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */

router.get("/sessions/:sessionId/anthropometry", validateGetSessionId, getAnthropometry);
router.patch("/sessions/:sessionId/anthropometry", validatePatchAnthropometry, patchAnthropometry);

export default router;