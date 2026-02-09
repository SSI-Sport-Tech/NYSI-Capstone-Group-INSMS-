import express from 'express';
import * as controller from './controller.js';

const router = express.Router();

// ============================================================================
// ATHLETE CRUD ROUTES
// ============================================================================

/**
 * @swagger
 * /api/AMS/athletes:
 *   get:
 *     summary: List Athletes
 *     description: |
 *       Get a paginated list of athletes with optional search.
 *       Search matches across athlete name, sportsync_id, sport, and gender.
 *
 *       **List columns:** sportsync_id, athlete_name_abbr, sport, gender, date_of_birth, target_event (always null)
 *     tags: [AMS - Athletes]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: Paginated athlete list
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
 *                       sportsync_id:
 *                         type: string
 *                       athlete_name_abbr:
 *                         type: string
 *                       sport_name:
 *                         type: string
 *                       gender:
 *                         type: string
 *                         enum: [MALE, FEMALE, OTHER]
 *                       date_of_birth:
 *                         type: string
 *                         format: date
 *                       target_event:
 *                         type: string
 *                         nullable: true
 *                         example: null
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
router.get('/athletes', controller.listAthletes);

/**
 * @swagger
 * /api/AMS/athletes/complete:
 *   post:
 *     summary: Create Complete Athlete
 *     description: |
 *       Create a new athlete with registry, medical, coach mappings, and nutritionist mappings
 *       in a single transaction. If any insert fails, the entire transaction is rolled back.
 *       coach_ids and nutritionist_ids are optional (default to empty arrays).
 *     tags: [AMS - Athletes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sport_id
 *               - sportsync_id
 *               - athlete_name_abbr
 *               - gender
 *               - date_of_birth
 *               - carding_status
 *               - athlete_notified_on
 *               - carding_start_date
 *               - carding_end_date
 *               - medical_clearance
 *               - approved_start_date
 *               - approved_end_date
 *               - medical_condition
 *               - food_allergy
 *               - drug_allergy
 *               - past_injury
 *             properties:
 *               sport_id:
 *                 type: string
 *                 format: uuid
 *                 description: Reference to Sport_Lookup
 *               sportsync_id:
 *                 type: string
 *                 description: External system ID (must be unique)
 *               athlete_name_abbr:
 *                 type: string
 *                 description: Athlete abbreviated name
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               carding_status:
 *                 type: string
 *               athlete_notified_on:
 *                 type: string
 *                 format: date
 *               carding_start_date:
 *                 type: string
 *                 format: date
 *               carding_end_date:
 *                 type: string
 *                 format: date
 *               medical_clearance:
 *                 type: boolean
 *               approved_start_date:
 *                 type: string
 *                 format: date
 *               approved_end_date:
 *                 type: string
 *                 format: date
 *               medical_condition:
 *                 type: string
 *               food_allergy:
 *                 type: string
 *               drug_allergy:
 *                 type: string
 *               past_injury:
 *                 type: string
 *               coach_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of coach UUIDs to assign (optional)
 *               nutritionist_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of nutritionist UUIDs to assign (optional)
 *           example:
 *             sport_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *             sportsync_id: "SS-12345"
 *             athlete_name_abbr: "J. Smith"
 *             gender: "MALE"
 *             date_of_birth: "1998-03-15"
 *             carding_status: "Active"
 *             athlete_notified_on: "2024-01-01"
 *             carding_start_date: "2024-01-01"
 *             carding_end_date: "2025-12-31"
 *             medical_clearance: true
 *             approved_start_date: "2024-01-01"
 *             approved_end_date: "2025-12-31"
 *             medical_condition: "None"
 *             food_allergy: "Shellfish"
 *             drug_allergy: "None"
 *             past_injury: "ACL tear (2022)"
 *             coach_ids: ["b2c3d4e5-f6a7-8901-bcde-f12345678901"]
 *             nutritionist_ids: ["c3d4e5f6-a7b8-9012-cdef-123456789012"]
 *     responses:
 *       201:
 *         description: Athlete created successfully with all relations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Athlete created successfully with all relations"
 *                 data:
 *                   type: object
 *                   properties:
 *                     athlete:
 *                       type: object
 *                     registry:
 *                       type: object
 *                     medical:
 *                       type: object
 *                     coachMappings:
 *                       type: array
 *                       items:
 *                         type: object
 *                     nutritionistMappings:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/athletes/complete', controller.createCompleteAthlete);

/**
 * @swagger
 * /api/AMS/athletes/{id}:
 *   get:
 *     summary: Get Athlete Details
 *     description: |
 *       Get full athlete profile including base info and registry data.
 *     tags: [AMS - Athletes]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Athlete UUID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Full athlete profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 athlete:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     sport_id:
 *                       type: string
 *                       format: uuid
 *                     sport_name:
 *                       type: string
 *                     sportsync_id:
 *                       type: string
 *                     athlete_name_abbr:
 *                       type: string
 *                     gender:
 *                       type: string
 *                       enum: [MALE, FEMALE, OTHER]
 *                     date_of_birth:
 *                       type: string
 *                       format: date
 *                     target_event:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                 registry:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     athlete_id:
 *                       type: string
 *                       format: uuid
 *                     carding_status:
 *                       type: string
 *                     athlete_notified_on:
 *                       type: string
 *                       format: date
 *                     carding_start_date:
 *                       type: string
 *                       format: date
 *                     carding_end_date:
 *                       type: string
 *                       format: date
 *                     medical_clearance:
 *                       type: boolean
 *                     approved_start_date:
 *                       type: string
 *                       format: date
 *                     approved_end_date:
 *                       type: string
 *                       format: date
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/athletes/:id', controller.getAthleteDetails);

/**
 * @swagger
 * /api/AMS/athletes:
 *   post:
 *     summary: Create Basic Athlete
 *     description: |
 *       Create a new athlete record with only base fields.
 *       Does not create registry, medical, or assignment records.
 *     tags: [AMS - Athletes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sport_id
 *               - sportsync_id
 *               - athlete_name_abbr
 *               - gender
 *               - date_of_birth
 *             properties:
 *               sport_id:
 *                 type: string
 *                 format: uuid
 *                 description: Reference to Sport_Lookup
 *               sportsync_id:
 *                 type: string
 *                 description: External system ID (must be unique)
 *               athlete_name_abbr:
 *                 type: string
 *                 description: Athlete abbreviated name
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 description: Date of birth (YYYY-MM-DD)
 *           example:
 *             sport_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *             sportsync_id: "SS-12345"
 *             athlete_name_abbr: "J. Smith"
 *             gender: "MALE"
 *             date_of_birth: "1998-03-15"
 *     responses:
 *       201:
 *         description: Athlete created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Athlete created successfully"
 *                 data:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/athletes', controller.createBasicAthlete);

/**
 * @swagger
 * /api/AMS/athletes/{id}:
 *   patch:
 *     summary: Update Athlete
 *     description: |
 *       Partial update of athlete base fields.
 *       Only provided fields are updated.
 *     tags: [AMS - Athletes]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Athlete UUID
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
 *               sportsync_id:
 *                 type: string
 *               athlete_name_abbr:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Athlete updated successfully
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
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/athletes/:id', controller.updateAthlete);

/**
 * @swagger
 * /api/AMS/athletes:
 *   delete:
 *     summary: Delete Athletes (Bulk)
 *     description: |
 *       Permanently delete one or more athletes.
 *       Registry and medical records are automatically deleted via CASCADE.
 *     tags: [AMS - Athletes]
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
 *                 description: Array of athlete UUIDs to delete
 *           example:
 *             ids: ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
 *     responses:
 *       200:
 *         description: Athletes deleted successfully
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
router.delete('/athletes', controller.deleteAthletes);

// ============================================================================
// REGISTRY & MEDICAL UPDATE ROUTES
// ============================================================================

/**
 * @swagger
 * /api/AMS/athletes/{id}/registry:
 *   patch:
 *     summary: Update Athlete Registry
 *     description: |
 *       Partial update of athlete registry (carding status, dates, clearance).
 *       Only provided fields are updated.
 *     tags: [AMS - Athletes]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Athlete UUID
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
 *               carding_status:
 *                 type: string
 *               athlete_notified_on:
 *                 type: string
 *                 format: date
 *               carding_start_date:
 *                 type: string
 *                 format: date
 *               carding_end_date:
 *                 type: string
 *                 format: date
 *               medical_clearance:
 *                 type: boolean
 *               approved_start_date:
 *                 type: string
 *                 format: date
 *               approved_end_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Registry updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/athletes/:id/registry', controller.updateRegistryController);

/**
 * @swagger
 * /api/AMS/athletes/{id}/medical:
 *   patch:
 *     summary: Update Athlete Medical Record
 *     description: |
 *       Partial update of athlete medical record.
 *       Only provided fields are updated.
 *     tags: [AMS - Athletes]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Athlete UUID
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
 *               medical_condition:
 *                 type: string
 *               food_allergy:
 *                 type: string
 *               drug_allergy:
 *                 type: string
 *               past_injury:
 *                 type: string
 *     responses:
 *       200:
 *         description: Medical record updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/athletes/:id/medical', controller.updateMedicalController);

export default router;
