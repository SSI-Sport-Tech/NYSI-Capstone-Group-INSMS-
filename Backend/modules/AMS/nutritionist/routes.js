import express from 'express';
import * as controller from './controller.js';

const router = express.Router();

// ============================================================================
// NUTRITIONIST CRUD ROUTES
// ============================================================================

/**
 * @swagger
 * /api/AMS/nutritionists:
 *   get:
 *     summary: List Nutritionists
 *     description: |
 *       Get all nutritionists.
 *       Returns nutritionists sorted alphabetically by name.
 *     tags: [AMS - Nutritionists]
 *     responses:
 *       200:
 *         description: List of nutritionists
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
 *                       name:
 *                         type: string
 *             example:
 *               data:
 *                 - id: "uuid-1"
 *                   name: "Alice Johnson"
 *                 - id: "uuid-2"
 *                   name: "Bob Williams"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/nutritionists', controller.listNutritionists);

/**
 * @swagger
 * /api/AMS/nutritionists:
 *   post:
 *     summary: Create Nutritionist
 *     description: |
 *       Add a new nutritionist.
 *       Duplicate names (case-insensitive) are rejected with 409.
 *     tags: [AMS - Nutritionists]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nutritionist name
 *                 example: "Alice Johnson"
 *     responses:
 *       201:
 *         description: Nutritionist created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Nutritionist created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
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
router.post('/nutritionists', controller.createNutritionist);

/**
 * @swagger
 * /api/AMS/nutritionists:
 *   delete:
 *     summary: Delete Nutritionists (Bulk)
 *     description: |
 *       Delete one or more nutritionists by ID.
 *     tags: [AMS - Nutritionists]
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
 *                 description: Array of nutritionist UUIDs to delete
 *           example:
 *             ids: ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
 *     responses:
 *       200:
 *         description: Nutritionists deleted successfully
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
router.delete('/nutritionists', controller.deleteNutritionists);

export default router;
