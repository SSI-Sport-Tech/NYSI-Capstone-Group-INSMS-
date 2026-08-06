import express from 'express';
import * as controller from './controller.js';
import { authenticateToken } from '../../Auth/authMiddleware.js';

const router = express.Router();

// ============================================================================
// SPORT READ ROUTE
// ============================================================================

/**
 * @swagger
 * /api/AMS/sports:
 *   get:
 *     summary: List Sports
 *     description: |
 *       Retrieves the list of sports from the Athlete DEX (ADEX) master database.
 *       All sports returned by ADEX are considered active.
 *     tags: [AMS - Sports] 
 *     responses:
 *       200:
 *         description: List of sports
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
 *                       sport:
 *                         type: string
 *                       is_active:
 *                         type: boolean
 *             example:
 *               data:
 *                 - id: "uuid-1"
 *                   sport: "Swimming"
 *                   is_active: true
 *                 - id: "uuid-2"
 *                   sport: "Athletics"
 *                   is_active: true
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/sports', controller.listSports);

export default router;
