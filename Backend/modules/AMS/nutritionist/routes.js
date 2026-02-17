import express from 'express';
import * as controller from './controller.js';
import { authenticateToken } from '../../Auth/authMiddleware.js';

const router = express.Router();

// ============================================================================
// NUTRITIONIST PERSONAL ROUTES (For Logged-in User)
// ============================================================================

/**
 * @swagger
 * /api/AMS/nutritionists/my-athletes:
 *   get:
 *     summary: Get My Assigned Athletes (Sorted by Pin)
 *     description: Returns a list of athletes assigned to the logged-in nutritionist. Athletes with 'is_pinned = true' appear at the top.
 *     tags: [AMS - Nutritionists]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned athletes
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/my-athletes', authenticateToken, controller.getMyAthletes);

/**
 * @swagger
 * /api/AMS/nutritionists/pin:
 *   patch:
 *     summary: Pin/Unpin an Athlete
 *     description: Toggles the pinned status of an athlete for the logged-in nutritionist.
 *     tags: [AMS - Nutritionists]
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
 *               - is_pinned
 *             properties:
 *               athlete_id:
 *                 type: string
 *                 format: uuid
 *               is_pinned:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Pin status updated
 *       404:
 *         description: Mapping not found
 */
router.patch('/pin', authenticateToken, controller.togglePin);

// ============================================================================
// NUTRITIONIST CRUD ROUTES
// ============================================================================

/**
 * @swagger
 * /api/AMS/nutritionists:
 *   get:
 *     summary: List Nutritionists
 *     description: Get all nutritionists. Returns nutritionists sorted alphabetically by name.
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
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/nutritionists', controller.listNutritionists);

/**
 * @swagger
 * /api/AMS/nutritionists:
 *   post:
 *     summary: Create Nutritionist
 *     description: Add a new nutritionist. Duplicate names (case-insensitive) are rejected with 409.
 *     tags: [AMS - Nutritionists]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nutritionist name
 *                 example: Alice Johnson
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
 *                   example: Nutritionist created successfully
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
 * /api/AMS/nutritionists/{id}:
 *   patch:
 *     summary: Update Nutritionist (Rename)
 *     description: Update an existing nutritionist's name.
 *     tags: [AMS - Nutritionists]
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
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nutritionist updated
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/nutritionists/:id', controller.updateNutritionist);

/**
 * @swagger
 * /api/AMS/nutritionists:
 *   delete:
 *     summary: Delete Nutritionists (Bulk)
 *     description: Delete one or more nutritionists by ID.
 *     tags: [AMS - Nutritionists]
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
 *                 description: Array of nutritionist UUIDs to delete
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

// ============================================================================
// NUTRITIONIST-ATHLETE MAPPING ROUTES
// ============================================================================

/**
 * @swagger
 * /api/AMS/nutritionists/mappings:
 *   get:
 *     summary: List Nutritionist-Athlete Mappings
 *     description: Get all nutritionist-athlete mappings with nutritionist and athlete names.
 *     tags: [AMS - Nutritionists]
 *     parameters:
 *       - name: is_active
 *         in: query
 *         required: false
 *         description: Filter by active status (true or false)
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of nutritionist-athlete mappings
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
 *                       athlete_id:
 *                         type: string
 *                         format: uuid
 *                       nutritionist_id:
 *                         type: string
 *                         format: uuid
 *                       is_active:
 *                         type: boolean
 *                       nutritionist_name:
 *                         type: string
 *                       athlete_name:
 *                         type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/nutritionists/mappings', controller.listMappings);

/**
 * @swagger
 * /api/AMS/nutritionists/mappings/athlete/{athleteId}:
 *   get:
 *     summary: List Mappings by Athlete
 *     description: Get all nutritionist-athlete mappings for a specific athlete.
 *     tags: [AMS - Nutritionists]
 *     parameters:
 *       - name: athleteId
 *         in: path
 *         required: true
 *         description: Athlete UUID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: is_active
 *         in: query
 *         required: false
 *         description: Filter by active status (true or false)
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of mappings for the athlete
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
 *                       athlete_id:
 *                         type: string
 *                         format: uuid
 *                       nutritionist_id:
 *                         type: string
 *                         format: uuid
 *                       is_active:
 *                         type: boolean
 *                       nutritionist_name:
 *                         type: string
 *                       athlete_name:
 *                         type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/nutritionists/mappings/athlete/:athleteId', controller.listMappingsByAthlete);

/**
 * @swagger
 * /api/AMS/nutritionists/mappings:
 *   post:
 *     summary: Create Nutritionist-Athlete Mapping
 *     description: Create a new nutritionist-athlete mapping.
 *     tags: [AMS - Nutritionists]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - athlete_id
 *               - nutritionist_id
 *             properties:
 *               athlete_id:
 *                 type: string
 *                 format: uuid
 *                 description: Athlete UUID
 *               nutritionist_id:
 *                 type: string
 *                 format: uuid
 *                 description: Nutritionist UUID
 *               is_active:
 *                 type: boolean
 *                 default: true
 *                 description: Whether the mapping is active
 *     responses:
 *       201:
 *         description: Mapping created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Nutritionist-athlete mapping created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     athlete_id:
 *                       type: string
 *                       format: uuid
 *                     nutritionist_id:
 *                       type: string
 *                       format: uuid
 *                     is_active:
 *                       type: boolean
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/nutritionists/mappings', controller.createMapping);

/**
 * @swagger
 * /api/AMS/nutritionists/mappings/{athleteId}/{nutritionistId}:
 *   patch:
 *     summary: Update Mapping Status
 *     description: Update the is_active status of a nutritionist-athlete mapping.
 *     tags: [AMS - Nutritionists]
 *     parameters:
 *       - name: athleteId
 *         in: path
 *         required: true
 *         description: Athlete UUID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: nutritionistId
 *         in: path
 *         required: true
 *         description: Nutritionist UUID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 description: New active status
 *     responses:
 *       200:
 *         description: Mapping updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Mapping updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     athlete_id:
 *                       type: string
 *                       format: uuid
 *                     nutritionist_id:
 *                       type: string
 *                       format: uuid
 *                     is_active:
 *                       type: boolean
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/nutritionists/mappings/:athleteId/:nutritionistId', controller.updateMapping);

/**
 * @swagger
 * /api/AMS/nutritionists/mappings:
 *   delete:
 *     summary: Delete Nutritionist-Athlete Mappings (Bulk)
 *     description: Delete one or more nutritionist-athlete mappings by composite key pairs.
 *     tags: [AMS - Nutritionists]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - athlete_id
 *                 - nutritionist_id
 *               properties:
 *                 athlete_id:
 *                   type: string
 *                   format: uuid
 *                 nutritionist_id:
 *                   type: string
 *                   format: uuid
 *             minItems: 1
 *     responses:
 *       200:
 *         description: Mappings deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedCount:
 *                   type: integer
 *                 deleted:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       athlete_id:
 *                         type: string
 *                         format: uuid
 *                       nutritionist_id:
 *                         type: string
 *                         format: uuid
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/nutritionists/mappings', controller.deleteMappings);

export default router;