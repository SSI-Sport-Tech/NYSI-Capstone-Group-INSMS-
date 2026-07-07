import express from 'express';
import * as controller from './controller.js';
import { authenticateToken } from '../../Auth/authMiddleware.js';

const router = express.Router();

// ============================================================================
// NUTRITIONIST SCHEDULE ROUTES
// ============================================================================

/**
 * @swagger
 * /api/AMS/nutritionist-schedule/upcoming:
 *   get:
 *     summary: Get upcoming nutritionist schedules
 *     description: |
 *       Returns schedules that have not started yet (future + today's upcoming).
 *     tags: [Nutritionist - Schedule]
 *     parameters:
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Maximum number of results
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of upcoming schedules
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
    '/nutritionist-schedule/upcoming',
    authenticateToken,
    controller.getUpcomingNutritionistSchedules
);

// ============================================================================

/**
 * @swagger
 * /api/AMS/nutritionist-schedule/today:
 *   get:
 *     summary: Get today's schedules for logged-in nutritionist
 *     description: |
 *       Returns all schedules for the logged-in nutritionist for today.
 *       Optionally accepts a custom date.
 *     tags: [Nutritionist - Schedule]
 *     parameters:
 *       - name: date
 *         in: query
 *         required: false
 *         description: Date in YYYY-MM-DD format
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Today's schedules
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
    '/nutritionist-schedule/today',
    authenticateToken,
    controller.getTodaySchedulesForNutritionist
);

// ============================================================================

/**
 * @swagger
 * /api/AMS/nutritionist-schedule/range:
 *   get:
 *     summary: Get nutritionist schedules by date range
 *     description: |
 *       Returns schedules within a date range.
 *       Can optionally filter by nutritionist_id.
 *     tags: [Nutritionist - Schedule]
 *     parameters:
 *       - name: from
 *         in: query
 *         required: true
 *         description: Start date (YYYY-MM-DD)
 *         schema:
 *           type: string
 *       - name: to
 *         in: query
 *         required: true
 *         description: End date (YYYY-MM-DD)
 *         schema:
 *           type: string
 *       - name: nutritionist_id
 *         in: query
 *         required: false
 *         description: Filter by nutritionist UUID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of schedules in range
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
    '/nutritionist-schedule/range',
    authenticateToken,
    controller.getNutritionistSchedulesByRange
);

// ============================================================================

/**
 * @swagger
 * /api/AMS/nutritionist-schedule/{id}:
 *   get:
 *     summary: Get Nutritionist Schedule by ID
 *     description: |
 *       Get a single nutritionist schedule by UUID.
 *       Returns nutritionist name, schedule type, date, and time details.
 *     tags: [Nutritionist - Schedule]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Schedule UUID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Nutritionist schedule details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
    '/nutritionist-schedule/:id',
    authenticateToken,
    controller.getNutritionistSchedule
);

// ============================================================================
// CREATE
// ============================================================================

/**
 * @swagger
 * /api/AMS/nutritionist-schedule:
 *   post:
 *     summary: Create nutritionist schedule
 *     description: |
 *       Creates a new nutritionist schedule.
 *       If nutritionist_id is not provided, it defaults to logged-in user.
 *     tags: [Nutritionist - Schedule]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - schedule_type_id
 *               - schedule_date
 *               - start_time
 *               - end_time
 *             properties:
 *               nutritionist_id:
 *                 type: string
 *                 format: uuid
 *               schedule_type_id:
 *                 type: string
 *                 format: uuid
 *               schedule_date:
 *                 type: string
 *                 format: date
 *               start_time:
 *                 type: string
 *                 example: "09:00"
 *               end_time:
 *                 type: string
 *                 example: "10:00"
 *               remarks:
 *                 type: string
 *           example:
 *             schedule_type_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
 *             schedule_date: "2026-06-05"
 *             start_time: "09:00"
 *             end_time: "10:00"
 *             remarks: "Morning consultation slot"
 *     responses:
 *       201:
 *         description: Schedule created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
    '/nutritionist-schedule',
    authenticateToken,
    controller.createNutritionistSchedule
);

// ============================================================================
// UPDATE
// ============================================================================

/**
 * @swagger
 * /api/AMS/nutritionist-schedule/{id}:
 *   patch:
 *     summary: Update nutritionist schedule
 *     description: |
 *       Update a nutritionist schedule. Only provided fields are updated.
 *     tags: [Nutritionist - Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
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
 *               schedule_type_id:
 *                 type: string
 *                 format: uuid
 *               schedule_date:
 *                 type: string
 *                 format: date
 *               start_time:
 *                 type: string
 *               end_time:
 *                 type: string
 *               remarks:
 *                 type: string
 *           example:
 *             remarks: "Updated schedule notes"
 *     responses:
 *       200:
 *         description: Schedule updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch(
    '/nutritionist-schedule/:id',
    authenticateToken,
    controller.updateNutritionistSchedule
);

// ============================================================================
// DELETE
// ============================================================================

/**
 * @swagger
 * /api/AMS/nutritionist-schedule/{id}:
 *   delete:
 *     summary: Delete nutritionist schedule
 *     description: |
 *       Permanently deletes a nutritionist schedule.
 *     tags: [Nutritionist - Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Schedule deleted successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete(
    '/nutritionist-schedule/:id',
    authenticateToken,
    controller.deleteNutritionistSchedule
);

export default router;