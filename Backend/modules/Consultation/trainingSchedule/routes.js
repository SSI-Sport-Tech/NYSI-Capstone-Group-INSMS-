// Backend/modules/Consultation/trainingSchedule/routes.js
import { Router } from "express";
import { getTrainingSchedule, upsertTrainingSchedule } from "./controller.js";

const router = Router();

// If you have auth middleware, mount it here, e.g.
// router.use(requireAuth);

/**
 * @swagger
 * /api/Consultation/sessions/{sessionId}/training-schedule:
 *   get:
 *     summary: Retrieve the training schedule for a specific session
 *     tags: [Consultation - Training Schedule]
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
 *         description: Successfully retrieved the training schedule
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/TrainingScheduleResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 *   put:
 *     summary: Upsert the training schedule for a specific session
 *     tags: [Consultation - Training Schedule]
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
 *             $ref: '#/components/schemas/TrainingSchedulePayload'
 *     responses:
 *       200:
 *         description: Successfully upserted the training schedule
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/TrainingScheduleResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

router.get("/sessions/:sessionId/training-schedule", getTrainingSchedule);
router.put("/sessions/:sessionId/training-schedule", upsertTrainingSchedule);

export default router;