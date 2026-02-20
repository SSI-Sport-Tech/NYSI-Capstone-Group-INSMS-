import express from 'express';
import * as controller from './controller.js';
import { authenticateToken } from '../../Auth/authMiddleware.js';

const router = express.Router();

// ============================================================================
// CONSULTATION UPDATE CARD ROUTES
// ============================================================================

/**
 * @swagger
 * /api/Consultation/consultation-update/{id}:
 *   get:
 *     summary: Get Consultation Update Card
 *     description: |
 *       Get the consultation update card data for a specific session.
 *       Returns session fields with joined nutritionist name, athlete name, and consult type.
 *     tags: [Consultation - Consultation Update]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Session UUID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Consultation update card data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     nutritionist_id:
 *                       type: string
 *                       format: uuid
 *                     nutritionist_name:
 *                       type: string
 *                     athlete_id:
 *                       type: string
 *                       format: uuid
 *                     athlete_name_abbr:
 *                       type: string
 *                     type_of_consult_id:
 *                       type: string
 *                       format: uuid
 *                     type_of_consult:
 *                       type: string
 *                     date_of_consult:
 *                       type: string
 *                       format: date
 *                     date_of_next_follow_up:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                     consultation_objective:
 *                       type: string
 *                       nullable: true
 *                       description: Objective from session_note table
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/consultation-update/:id', controller.getConsultationUpdate);

/**
 * @swagger
 * /api/Consultation/consultation-update:
 *   post:
 *     summary: Create Consultation Session
 *     description: |
 *       Create a new consultation session. The logged-in nutritionist is automatically
 *       assigned as the consulted-by nutritionist.
 *       Validates that athlete_id exists and type_of_consult_id is active.
 *       date_of_consult defaults to today if not provided.
 *     tags: [Consultation - Consultation Update]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - athlete_id
 *               - type_of_consult_id
 *             properties:
 *               athlete_id:
 *                 type: string
 *                 format: uuid
 *                 description: Athlete UUID
 *               type_of_consult_id:
 *                 type: string
 *                 format: uuid
 *                 description: Consult type UUID (must be active)
 *               date_of_consult:
 *                 type: string
 *                 format: date
 *                 description: Date of consultation (defaults to today)
 *               date_of_next_follow_up:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 description: Date of next follow-up (optional)
 *               consultation_objective:
 *                 type: string
 *                 description: Consultation objective (optional, stored in session_note)
 *           example:
 *             athlete_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *             type_of_consult_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
 *             date_of_consult: "2026-01-31"
 *             date_of_next_follow_up: "2026-02-15"
 *             consultation_objective: "To gain more muscles and strength. Ensure athlete is hydrated."
 *     responses:
 *       201:
 *         description: Consultation session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Consultation session created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     nutritionist_id:
 *                       type: string
 *                       format: uuid
 *                     athlete_id:
 *                       type: string
 *                       format: uuid
 *                     type_of_consult_id:
 *                       type: string
 *                       format: uuid
 *                     date_of_consult:
 *                       type: string
 *                       format: date
 *                     date_of_next_follow_up:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                     consultation_objective:
 *                       type: string
 *                       nullable: true
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/consultation-update', authenticateToken, controller.createConsultationSession);

/**
 * @swagger
 * /api/Consultation/consultation-update/{id}:
 *   patch:
 *     summary: Update Consultation Session
 *     description: |
 *       Update a consultation session. All fields are optional — only provided fields are modified.
 *       athlete_id and nutritionist_id cannot be changed after creation.
 *       Validates type_of_consult_id is active if provided.
 *     tags: [Consultation - Consultation Update]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Session UUID
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
 *               type_of_consult_id:
 *                 type: string
 *                 format: uuid
 *                 description: Consult type UUID (must be active)
 *               date_of_consult:
 *                 type: string
 *                 format: date
 *               date_of_next_follow_up:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *               consultation_objective:
 *                 type: string
 *                 description: Consultation objective (upserts into session_note)
 *           example:
 *             date_of_next_follow_up: "2026-03-01"
 *             consultation_objective: "To gain more muscles and strength."
 *     responses:
 *       200:
 *         description: Consultation session updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Consultation session updated successfully"
 *                 data:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/consultation-update/:id', authenticateToken, controller.updateConsultationSession);

export default router;
