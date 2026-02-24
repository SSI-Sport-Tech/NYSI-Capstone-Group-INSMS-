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

// ============================================================================
// COACH-ATHLETE MAPPING ROUTES
// ============================================================================

/**
 * @swagger
 * /api/AMS/coaches/mappings:
 *   get:
 *     summary: List Coach-Athlete Mappings [DEV ONLY]
 *     description: |
 *       Get all coach-athlete mappings with coach and athlete names.
 *       Returns mappings sorted by athlete name then coach name.
 *     tags: [AMS - Coaches]
 *     responses:
 *       200:
 *         description: List of coach-athlete mappings
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
 *                       coach_id:
 *                         type: string
 *                         format: uuid
 *                       is_active:
 *                         type: boolean
 *                       coach_name:
 *                         type: string
 *                       athlete_name:
 *                         type: string
 *             example:
 *               data:
 *                 - id: "uuid-mapping-1"
 *                   athlete_id: "uuid-athlete-1"
 *                   coach_id: "uuid-coach-1"
 *                   is_active: true
 *                   coach_name: "John Smith"
 *                   athlete_name: "Jane Doe"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/coaches/mappings', controller.listMappings);

/**
 * @swagger
 * /api/AMS/coaches/mappings/athlete/{athleteId}:
 *   get:
 *     summary: List Mappings by Athlete
 *     description: |
 *       Get all coach-athlete mappings for a specific athlete.
 *       Returns mappings sorted by coach name.
 *     tags: [AMS - Coaches]
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
 *                       coach_id:
 *                         type: string
 *                         format: uuid
 *                       is_active:
 *                         type: boolean
 *                       coach_name:
 *                         type: string
 *                       athlete_name:
 *                         type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/coaches/mappings/athlete/:athleteId', controller.listMappingsByAthlete);

/**
 * @swagger
 * /api/AMS/coaches/mappings:
 *   post:
 *     summary: Create Coach-Athlete Mapping
 *     description: |
 *       Create a new coach-athlete mapping.
 *       Both athlete_id and coach_id must reference existing records.
 *       Duplicate composite key (athlete_id + coach_id) is rejected with 409.
 *     tags: [AMS - Coaches]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [athlete_id, coach_id]
 *             properties:
 *               athlete_id:
 *                 type: string
 *                 format: uuid
 *                 description: Athlete UUID
 *               coach_id:
 *                 type: string
 *                 format: uuid
 *                 description: Coach UUID
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
 *                   example: "Coach-athlete mapping created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     athlete_id:
 *                       type: string
 *                       format: uuid
 *                     coach_id:
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
router.post('/coaches/mappings', controller.createMapping);

/**
 * @swagger
 * /api/AMS/coaches/mappings:
 *   delete:
 *     summary: Delete Coach-Athlete Mappings (Bulk) [DEV ONLY]
 *     description: |
 *       Delete one or more coach-athlete mappings by composite key pairs.
 *       Request body is an array of { athlete_id, coach_id } objects.
 *     tags: [AMS - Coaches]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required: [athlete_id, coach_id]
 *               properties:
 *                 athlete_id:
 *                   type: string
 *                   format: uuid
 *                 coach_id:
 *                   type: string
 *                   format: uuid
 *             minItems: 1
 *           example:
 *             - athlete_id: "uuid-athlete-1"
 *               coach_id: "uuid-coach-1"
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
 *                       coach_id:
 *                         type: string
 *                         format: uuid
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/coaches/mappings', controller.deleteMappings);

/**
 * @swagger
 * /api/AMS/coaches:
 *   delete:
 *     summary: Delete Coaches (Bulk) [ADMIN ONLY]
 *     description: |
 *       Delete one or more coaches by ID.
 *       Coaches that have athlete mappings cannot be deleted (409).
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
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/coaches', controller.deleteCoaches);

/**
 * @swagger
 * /api/AMS/coaches/mappings/{athleteId}/{coachId}:
 *   patch:
 *     summary: Update Mapping Status
 *     description: |
 *       Update the is_active status of a coach-athlete mapping.
 *       Use this to activate or deactivate a mapping.
 *     tags: [AMS - Coaches]
 *     parameters:
 *       - name: athleteId
 *         in: path
 *         required: true
 *         description: Athlete UUID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: coachId
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
 *             required: [is_active]
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 description: New active status
 *           example:
 *             is_active: false
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
 *                   example: "Mapping updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     athlete_id:
 *                       type: string
 *                       format: uuid
 *                     coach_id:
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
router.patch('/coaches/mappings/:athleteId/:coachId', controller.updateMapping);

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


export default router;
