import express from 'express';
import * as controller from './controller.js';

const router = express.Router();

// ============================================================================
// SPORT CRUD ROUTES
// ============================================================================

/**
 * @swagger
 * /api/AMS/sports:
 *   get:
 *     summary: List Sports
 *     description: |
 *       Get all sports from the Sport_Lookup table.
 *       By default returns only active sports.
 *       Pass `includeInactive=true` to include inactive sports.
 *     tags: [AMS - Sports]
 *     parameters:
 *       - name: includeInactive
 *         in: query
 *         required: false
 *         description: Include inactive sports
 *         schema:
 *           type: boolean
 *           default: false
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

/**
 * @swagger
 * /api/AMS/sports:
 *   post:
 *     summary: Create Sport
 *     description: |
 *       Add a new sport to the Sport_Lookup table.
 *       Duplicate sport names (case-insensitive) are rejected with 409.
 *     tags: [AMS - Sports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sport]
 *             properties:
 *               sport:
 *                 type: string
 *                 description: Sport name (must be unique)
 *                 example: "Badminton"
 *     responses:
 *       201:
 *         description: Sport created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sport created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     sport:
 *                       type: string
 *                     is_active:
 *                       type: boolean
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/sports', controller.createSport);

/**
 * @swagger
 * /api/AMS/sports:
 *   delete:
 *     summary: Delete Sports (Bulk)
 *     description: |
 *       Delete one or more sports from the Sport_Lookup table.
 *       Sports that are referenced by athletes or coaches cannot be deleted (409).
 *     tags: [AMS - Sports]
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
 *                 description: Array of sport UUIDs to delete
 *           example:
 *             ids: ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
 *     responses:
 *       200:
 *         description: Sports deleted successfully
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
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/sports', controller.deleteSports);

export default router;
