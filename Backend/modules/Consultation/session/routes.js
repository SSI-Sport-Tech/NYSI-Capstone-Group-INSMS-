import express from 'express';
import * as controller from './controller.js';
import { authenticateToken } from '../../Auth/authMiddleware.js';

const router = express.Router();

// ============================================================================
// TRAINING SCHEDULE ROUTES (Target Event)
// ============================================================================

/**
 * @swagger
 * /api/Consultation/sessions/{sessionId}/training:
 *   patch:
 *     summary: Update Training Schedule (Target Event)
 *     description: Update the training schedule details for a specific session. This includes the Target Event (upcoming_major_competitions). This performs an UPSERT.
 *     tags: [Consultation - Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         description: UUID of the session
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
 *               upcoming_major_competitions:
 *                 type: string
 *                 description: The primary target event
 *               upcoming_local_competitions:
 *                 type: string
 *               current_performance:
 *                 type: string
 *               total_training_hours:
 *                 type: number
 *               other_remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Training schedule updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/sessions/:sessionId/training', authenticateToken, controller.updateTrainingSchedule);

// ============================================================================
// SESSION CRUD ROUTES
// ============================================================================

/**
 * @swagger
 * /api/Consultation/sessions:
 *   get:
 *     summary: List Sessions
 *     description: Get all consultation sessions with pagination and optional search.
 *     tags: [Consultation - Sessions]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - name: search
 *         in: query
 *         required: false
 *         description: Search across athlete name, nutritionist name, and consult type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       nutritionist_id:
 *                         type: string
 *                         format: uuid
 *                       nutritionist_name:
 *                         type: string
 *                       athlete_id:
 *                         type: string
 *                         format: uuid
 *                       athlete_name_abbr:
 *                         type: string
 *                       type_of_consult_id:
 *                         type: string
 *                         format: uuid
 *                       type_of_consult:
 *                         type: string
 *                       date_of_consult:
 *                         type: string
 *                         format: date
 *                       date_of_next_follow_up:
 *                         type: string
 *                         format: date
 *                         nullable: true
 *                 currentPage:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalCount:
 *                   type: integer
 *                 searchQuery:
 *                   type: string
 *                   nullable: true
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/sessions', controller.listSessions);

/**
 * @swagger
 * /api/Consultation/sessions/{id}:
 *   get:
 *     summary: Get Session Detail
 *     description: Get a single consultation session by ID with joined names.
 *     tags: [Consultation - Sessions]
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
 *         description: Session detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 nutritionist_id:
 *                   type: string
 *                   format: uuid
 *                 nutritionist_name:
 *                   type: string
 *                 athlete_id:
 *                   type: string
 *                   format: uuid
 *                 athlete_name_abbr:
 *                   type: string
 *                 type_of_consult_id:
 *                   type: string
 *                   format: uuid
 *                 type_of_consult:
 *                   type: string
 *                 date_of_consult:
 *                   type: string
 *                   format: date
 *                 date_of_next_follow_up:
 *                   type: string
 *                   format: date
 *                   nullable: true
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/sessions/:id', controller.getSession);

/**
 * @swagger
 * /api/Consultation/sessions:
 *   post:
 *     summary: Create Session
 *     description: Create a new consultation session.
 *     tags: [Consultation - Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nutritionist_id
 *               - athlete_id
 *               - type_of_consult_id
 *             properties:
 *               nutritionist_id:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the nutritionist
 *               athlete_id:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the athlete
 *               type_of_consult_id:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the consult type (must be active)
 *               date_of_consult:
 *                 type: string
 *                 format: date
 *                 description: Date of consultation (defaults to today)
 *               date_of_next_follow_up:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 description: Date of next follow-up (optional)
 *     responses:
 *       201:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Session created successfully
 *                 data:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/sessions', authenticateToken, controller.createSession);

/**
 * @swagger
 * /api/Consultation/sessions/{id}:
 *   patch:
 *     summary: Update Session
 *     description: Partially update a consultation session.
 *     tags: [Consultation - Sessions]
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
 *               nutritionist_id:
 *                 type: string
 *                 format: uuid
 *               athlete_id:
 *                 type: string
 *                 format: uuid
 *               type_of_consult_id:
 *                 type: string
 *                 format: uuid
 *               date_of_consult:
 *                 type: string
 *                 format: date
 *               date_of_next_follow_up:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Session updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Session updated successfully
 *                 data:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/sessions/:id', authenticateToken, controller.updateSession);

/**
 * @swagger
 * /api/Consultation/sessions:
 *   delete:
 *     summary: Delete Sessions (Bulk)
 *     description: Delete one or more consultation sessions.
 *     tags: [Consultation - Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 description: Array of session UUIDs to delete
 *     responses:
 *       200:
 *         description: Sessions deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedCount:
 *                   type: integer
 *                 deletedIds:
 *                   type: array
 *                   items:
 *                     type: string
 *                     format: uuid
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/sessions', authenticateToken, controller.deleteSessions);

export default router;