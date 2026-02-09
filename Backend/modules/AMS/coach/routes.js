import express from 'express';
import * as controller from './controller.js';

const router = express.Router();

// ============================================================================
// COACH CRUD ROUTES
// ============================================================================

/**
 * @swagger
 * /api/AMS/coaches:
 *   get:
 *     summary: List Coaches
 *     description: |
 *       Get all coaches with their associated sport name.
 *       Returns coaches sorted alphabetically by name.
 *     tags: [AMS - Coaches]
 *     responses:
 *       200:
 *         description: List of coaches
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
 *                       sport_id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       sport_name:
 *                         type: string
 *             example:
 *               data:
 *                 - id: "uuid-1"
 *                   sport_id: "uuid-sport-1"
 *                   name: "John Smith"
 *                   sport_name: "Swimming"
 *                 - id: "uuid-2"
 *                   sport_id: "uuid-sport-2"
 *                   name: "Jane Doe"
 *                   sport_name: "Athletics"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/coaches', controller.listCoaches);

/**
 * @swagger
 * /api/AMS/coaches:
 *   post:
 *     summary: Create Coach
 *     description: |
 *       Add a new coach. Requires a valid, active sport_id.
 *       Duplicate name + sport combinations (case-insensitive) are rejected with 409.
 *     tags: [AMS - Coaches]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sport_id, name]
 *             properties:
 *               sport_id:
 *                 type: string
 *                 format: uuid
 *                 description: Sport UUID from Sport_Lookup
 *               name:
 *                 type: string
 *                 description: Coach name
 *                 example: "John Smith"
 *     responses:
 *       201:
 *         description: Coach created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Coach created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     sport_id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/coaches', controller.createCoach);

/**
 * @swagger
 * /api/AMS/coaches/{id}:
 *   patch:
 *     summary: Update Coach
 *     description: |
 *       Update coach fields (name, sport_id). All fields are optional.
 *       If sport_id is changed, it must reference a valid active sport.
 *       Duplicate name + sport combinations are rejected with 409.
 *     tags: [AMS - Coaches]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Coach UUID
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
 *               sport_id:
 *                 type: string
 *                 format: uuid
 *                 description: New sport UUID
 *               name:
 *                 type: string
 *                 description: New coach name
 *     responses:
 *       200:
 *         description: Coach updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Coach updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     sport_id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/coaches/:id', controller.updateCoach);

/**
 * @swagger
 * /api/AMS/coaches:
 *   delete:
 *     summary: Delete Coaches (Bulk)
 *     description: |
 *       Delete one or more coaches by ID.
 *       Coach-athlete mappings are automatically cleaned up via CASCADE.
 *     tags: [AMS - Coaches]
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
 *                 description: Array of coach UUIDs to delete
 *           example:
 *             ids: ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
 *     responses:
 *       200:
 *         description: Coaches deleted successfully
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
router.delete('/coaches', controller.deleteCoaches);

export default router;
