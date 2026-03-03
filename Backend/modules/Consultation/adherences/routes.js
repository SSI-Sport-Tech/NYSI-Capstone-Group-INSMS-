import { Router } from "express";
import { getAdherences, patchAdherences } from "./controller.js";
import { validateGetSessionId, validatePatchAdherences } from "./validation.js";
import { authenticateToken } from "../../Auth/authMiddleware.js";

const router = Router();

/**
 * @swagger
 * /api/Consultation/sessions/{sessionId}/adherences:
 *   get:
 *     summary: Retrieve adherences (nutrition review inputs + computed outputs) for a session
 *     tags: [Consultation - Adherences]
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
 *         description: Successfully retrieved adherences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/AdherencesResponse"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 *
 *   patch:
 *     summary: Update adherences inputs for a session (partial update)
 *     tags: [Consultation - Adherences]
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
 *             $ref: "#/components/schemas/AdherencesPatchRequest"
 *     responses:
 *       200:
 *         description: Successfully updated adherences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: "#/components/schemas/AdherencesResponse"
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */

router.get("/sessions/:sessionId/adherences", validateGetSessionId, getAdherences);
router.patch("/sessions/:sessionId/adherences", authenticateToken, validatePatchAdherences, patchAdherences);

export default router;