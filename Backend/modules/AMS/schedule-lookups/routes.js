import express from 'express';
import * as controller from './controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/Schedule/lookups/schedule-types:
 *   get:
 *     summary: Get all active schedule types
 *     description: Returns all active schedule types for dropdown population.
 *     tags: [Schedule - Lookups]
 *     responses:
 *       200:
 *         description: List of active schedule types
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
 *                       schedule_type:
 *                         type: string
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/lookups/schedule-types', controller.getScheduleTypes);

export default router;
