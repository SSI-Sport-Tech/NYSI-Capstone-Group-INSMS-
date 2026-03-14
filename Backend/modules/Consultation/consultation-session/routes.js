import express from 'express';
import * as controller from './controller.js';
import { authenticateToken } from '../../Auth/authMiddleware.js';

const router = express.Router();

// ============================================================================
// CONSULTATION UPDATE CARD ROUTES
// ============================================================================

/**
 * @swagger
 * /api/Consultation/consultation-session/athlete/{athleteId}/latest:
 *   get:
 *     summary: Get Latest Consultation Session for an Athlete
 *     description: |
 *       Returns the most recent consultation session for a given athlete,
 *       ordered by date_of_consult DESC. Includes joined nutritionist name,
 *       athlete name, consult type, and consultation objective.
 *       Returns 404 if the athlete has no sessions yet.
 *     tags: [Consultation - Consultation Session]
 *     parameters:
 *       - name: athleteId
 *         in: path
 *         required: true
 *         description: Athlete UUID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Latest consultation session
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
 *                     title_description:
 *                       type: string
 *                       nullable: true
 *                     venue:
 *                       type: string
 *                       nullable: true
 *                     date_of_consult:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                     time_of_consult:
 *                       type: string
 *                       example: "09:00"
 *                       nullable: true
 *                     date_of_next_follow_up:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                     time_of_next_follow_up:
 *                       type: string
 *                       example: "10:00"
 *                       nullable: true
 *                     consultation_objective:
 *                       type: string
 *                       nullable: true
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/consultation-session/upcoming', controller.getUpcomingConsultationSessions);
router.get('/consultation-session/today', authenticateToken, controller.getTodaySessionsForNutritionist);
router.get('/consultation-session/range', controller.getSessionsByDateRange);
router.get('/consultation-session/athlete/:athleteId/latest', controller.getLatestConsultationSession);
router.get('/consultation-session/athlete/:athleteId/all', controller.getAllConsultationSessions);
router.get('/consultation-session/:id/previous', controller.getPreviousConsultationSession);

/**
 * @swagger
 * /api/Consultation/consultation-session/{id}:
 *   get:
 *     summary: Get Consultation Session
 *     description: |
 *       Get the consultation session data for a specific session.
 *       Returns session fields with joined nutritionist name, athlete name, and consult type.
 *     tags: [Consultation - Consultation Session]
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
 *                     title_description:
 *                       type: string
 *                       nullable: true
 *                     venue:
 *                       type: string
 *                       nullable: true
 *                     date_of_consult:
 *                       type: string
 *                       format: date
 *                     time_of_consult:
 *                       type: string
 *                       example: "09:00"
 *                       nullable: true
 *                     date_of_next_follow_up:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                     time_of_next_follow_up:
 *                       type: string
 *                       example: "10:00"
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
router.get('/consultation-session/:id', controller.getConsultationSession);

/**
 * @swagger
 * /api/Consultation/consultation-session:
 *   post:
 *     summary: Create Consultation Session
 *     description: |
 *       Create a new consultation session.
 *       The logged-in nutritionist is automatically assigned unless nutritionist_id is explicitly provided
 *       (useful for Swagger testing when not authenticated as a nutritionist).
 *       Validates that athlete_id exists and type_of_consult_id is active.
 *       date_of_consult defaults to today if not provided.
 *     tags: [Consultation - Consultation Session]
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
 *               nutritionist_id:
 *                 type: string
 *                 format: uuid
 *                 description: Nutritionist UUID (optional — defaults to the logged-in user's nutritionist)
 *               type_of_consult_id:
 *                 type: string
 *                 format: uuid
 *                 description: Consult type UUID (must be active)
 *               title_description:
 *                 type: string
 *                 description: Title or description for the booking (optional)
 *               venue:
 *                 type: string
 *                 description: Venue of the consultation (optional)
 *               date_of_consult:
 *                 type: string
 *                 format: date
 *                 description: Date of consultation (optional)
 *               time_of_consult:
 *                 type: string
 *                 example: "09:00"
 *                 description: Time of consultation in HH:MM or HH:MM:SS (optional)
 *               date_of_next_follow_up:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 description: Date of next follow-up (optional)
 *               time_of_next_follow_up:
 *                 type: string
 *                 example: "10:00"
 *                 description: Time of next follow-up in HH:MM or HH:MM:SS (optional)
 *               consultation_objective:
 *                 type: string
 *                 description: Consultation objective (optional, stored in session_note)
 *           example:
 *             athlete_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *             nutritionist_id: "c3d4e5f6-a7b8-9012-cdef-123456789012"
 *             type_of_consult_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
 *             title_description: "Initial Nutrition Assessment"
 *             venue: "Room 3, NYSI"
 *             date_of_consult: "2026-02-20"
 *             time_of_consult: "09:00"
 *             date_of_next_follow_up: "2026-03-06"
 *             time_of_next_follow_up: "10:00"
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
 *                     title_description:
 *                       type: string
 *                       nullable: true
 *                     venue:
 *                       type: string
 *                       nullable: true
 *                     date_of_consult:
 *                       type: string
 *                       format: date
 *                     time_of_consult:
 *                       type: string
 *                       nullable: true
 *                     date_of_next_follow_up:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                     time_of_next_follow_up:
 *                       type: string
 *                       nullable: true
 *                     consultation_objective:
 *                       type: string
 *                       nullable: true
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/consultation-session', authenticateToken, controller.createConsultationSession);

/**
 * @swagger
 * /api/Consultation/consultation-session/{id}:
 *   patch:
 *     summary: Update Consultation Session
 *     description: |
 *       Update a consultation session. All fields are optional — only provided fields are modified.
 *       athlete_id and nutritionist_id cannot be changed after creation.
 *       Validates type_of_consult_id is active if provided.
 *     tags: [Consultation - Consultation Session]
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
 *               title_description:
 *                 type: string
 *                 description: Title or description for the booking
 *               venue:
 *                 type: string
 *                 description: Venue of the consultation
 *               date_of_consult:
 *                 type: string
 *                 format: date
 *               time_of_consult:
 *                 type: string
 *                 example: "09:00"
 *                 description: Time of consultation in HH:MM or HH:MM:SS
 *               date_of_next_follow_up:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *               time_of_next_follow_up:
 *                 type: string
 *                 example: "10:00"
 *                 description: Time of next follow-up in HH:MM or HH:MM:SS
 *               consultation_objective:
 *                 type: string
 *                 description: Consultation objective (upserts into session_note)
 *           example:
 *             title_description: "Follow-up Session"
 *             venue: "Room 3, NYSI"
 *             date_of_next_follow_up: "2026-03-01"
 *             time_of_next_follow_up: "10:00"
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
router.patch('/consultation-session/:id', authenticateToken, controller.updateConsultationSession);
router.patch('/consultation-session/:id/status', authenticateToken, controller.updateSessionStatus);
router.delete('/consultation-session/:id', authenticateToken, controller.cancelConsultationSession);

export default router;
