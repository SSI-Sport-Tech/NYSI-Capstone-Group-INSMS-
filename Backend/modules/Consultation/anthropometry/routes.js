import { Router } from "express";
import {
  calculateAdexAnthropometryData,
  createAdexAnthropometryData,
  getAdexAnthropometries,
  getAdexAnthropometryDetail,
  getAnthropometry,
  getBiaMeasurements,
  patchAnthropometry,
} from "./controller.js";
import {
  validateAdexAnthropometryId,
  validateAthleteId,
  validateGetSessionId,
  validatePatchAnthropometry,
} from "./validation.js";
import { authenticateToken } from "../../Auth/authMiddleware.js";

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
router.get("/athletes/:athleteId/bia-measurements", authenticateToken, validateAthleteId, getBiaMeasurements);
router.get("/athletes/:athleteId/adex-anthropometries", authenticateToken, validateAthleteId, getAdexAnthropometries);
router.post("/athletes/:athleteId/adex-anthropometries/calculate", authenticateToken, validateAthleteId, calculateAdexAnthropometryData);
router.post("/athletes/:athleteId/adex-anthropometries", authenticateToken, validateAthleteId, createAdexAnthropometryData);
router.get("/adex-anthropometries/:anthropometryId", authenticateToken, validateAdexAnthropometryId, getAdexAnthropometryDetail);
router.patch("/sessions/:sessionId/anthropometry", authenticateToken, validatePatchAnthropometry, patchAnthropometry);

export default router;