import { Router } from "express";
import { getMealLog, upsertMealLog } from "./controller.js";
import { authenticateToken } from "../../Auth/authMiddleware.js";

const router = Router();

/**
 * @swagger
 * /api/Consultation/sessions/{sessionId}/meal-log:
 *   get:
 *     summary: Retrieve the meal log and sleep data for a specific session
 *     tags: [Consultation - Meal Log]
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
 *         description: Successfully retrieved the meal log and sleep data
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 *
 *   put:
 *     summary: Upsert the meal log and sleep data for a specific session
 *     tags: [Consultation - Meal Log]
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
 *             type: object
 *             properties:
 *               entries:
 *                 type: array
 *               mealOtherRemarks:
 *                 type: string
 *                 nullable: true
 *               sleep:
 *                 type: object
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Successfully upserted the meal log and sleep data
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/InternalServerError"
 */

router.get("/sessions/:sessionId/meal-log", getMealLog);

router.put(
  "/sessions/:sessionId/meal-log",
  authenticateToken,
  upsertMealLog
);

export default router;
