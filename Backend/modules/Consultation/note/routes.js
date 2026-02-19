import express from 'express';
import * as controller from './controller.js';

const router = express.Router();

// ============================================================================
// NOTE CRUD ROUTES
// ============================================================================

/**
 * @swagger
 * /api/Consultation/notes:
 *   get:
 *     summary: List Notes
 *     description: |
 *       Get all session notes with pagination and optional search.
 *       Search matches across all text note fields, athlete name, and nutritionist name.
 *     tags: [DEPRECATED - Consultation]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - name: search
 *         in: query
 *         required: false
 *         description: Search across note fields, athlete name, and nutritionist name
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of notes
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
 *                       sessions_id:
 *                         type: string
 *                         format: uuid
 *                       consultation_objective:
 *                         type: string
 *                         nullable: true
 *                       main_nutrition_diagnosis:
 *                         type: string
 *                         nullable: true
 *                       follow_up_note:
 *                         type: string
 *                         nullable: true
 *                       intervention_note:
 *                         type: string
 *                         nullable: true
 *                       medical_remarks:
 *                         type: string
 *                         nullable: true
 *                       other_remarks:
 *                         type: string
 *                         nullable: true
 *                       date_of_consult:
 *                         type: string
 *                         format: date
 *                       date_of_next_follow_up:
 *                         type: string
 *                         format: date
 *                         nullable: true
 *                       athlete_id:
 *                         type: string
 *                         format: uuid
 *                       athlete_name_abbr:
 *                         type: string
 *                       nutritionist_id:
 *                         type: string
 *                         format: uuid
 *                       nutritionist_name:
 *                         type: string
 *                       type_of_consult:
 *                         type: string
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
router.get('/notes', controller.listNotes);

/**
 * @swagger
 * /api/Consultation/notes/{id}:
 *   get:
 *     summary: Get Note Detail
 *     description: |
 *       Get a single session note by ID with joined session, athlete, and nutritionist info.
 *     tags: [DEPRECATED - Consultation]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Note UUID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Note detail with session context
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 sessions_id:
 *                   type: string
 *                   format: uuid
 *                 consultation_objective:
 *                   type: string
 *                   nullable: true
 *                 main_nutrition_diagnosis:
 *                   type: string
 *                   nullable: true
 *                 follow_up_note:
 *                   type: string
 *                   nullable: true
 *                 intervention_note:
 *                   type: string
 *                   nullable: true
 *                 medical_remarks:
 *                   type: string
 *                   nullable: true
 *                 other_remarks:
 *                   type: string
 *                   nullable: true
 *                 date_of_consult:
 *                   type: string
 *                   format: date
 *                 date_of_next_follow_up:
 *                   type: string
 *                   format: date
 *                   nullable: true
 *                 athlete_id:
 *                   type: string
 *                   format: uuid
 *                 athlete_name_abbr:
 *                   type: string
 *                 nutritionist_id:
 *                   type: string
 *                   format: uuid
 *                 nutritionist_name:
 *                   type: string
 *                 type_of_consult:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/notes/:id', controller.getNote);

/**
 * @swagger
 * /api/Consultation/notes:
 *   post:
 *     summary: Create Note
 *     description: |
 *       Create a new session note.
 *       Validates that sessions_id references an existing session.
 *     tags: [DEPRECATED - Consultation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessions_id]
 *             properties:
 *               sessions_id:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the consultation session
 *               consultation_objective:
 *                 type: string
 *                 nullable: true
 *               main_nutrition_diagnosis:
 *                 type: string
 *                 nullable: true
 *               follow_up_note:
 *                 type: string
 *                 nullable: true
 *               intervention_note:
 *                 type: string
 *                 nullable: true
 *               medical_remarks:
 *                 type: string
 *                 nullable: true
 *               other_remarks:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Note created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Note created successfully"
 *                 data:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/notes', controller.createNote);

/**
 * @swagger
 * /api/Consultation/notes/{id}:
 *   patch:
 *     summary: Update Note
 *     description: |
 *       Partially update a session note.
 *       Only provided fields will be updated.
 *       sessions_id cannot be changed.
 *     tags: [DEPRECATED - Consultation]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Note UUID
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
 *               consultation_objective:
 *                 type: string
 *                 nullable: true
 *               main_nutrition_diagnosis:
 *                 type: string
 *                 nullable: true
 *               follow_up_note:
 *                 type: string
 *                 nullable: true
 *               intervention_note:
 *                 type: string
 *                 nullable: true
 *               medical_remarks:
 *                 type: string
 *                 nullable: true
 *               other_remarks:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Note updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Note updated successfully"
 *                 data:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/notes/:id', controller.updateNote);

/**
 * @swagger
 * /api/Consultation/notes:
 *   delete:
 *     summary: Delete Notes (Bulk)
 *     description: |
 *       Delete one or more session notes.
 *     tags: [DEPRECATED - Consultation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 description: Array of note UUIDs to delete
 *           example:
 *             ids: ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
 *     responses:
 *       200:
 *         description: Notes deleted successfully
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
router.delete('/notes', controller.deleteNotes);

export default router;
