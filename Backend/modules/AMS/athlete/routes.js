import express from "express";
import * as controller from "./controller.js";
import { authenticateToken, requireAdmin } from "../../Auth/authMiddleware.js";

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
 *       **List columns:** sportsync_id, athlete_name_abbr, sport, gender, date_of_birth
 *     tags: [AMS - Athletes]
 *     security:
 *       - bearerAuth: []
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
router.get("/athletes", authenticateToken, controller.listAthletes);

/**
 * @swagger
 * /api/AMS/athletes/{id}/profile:
 *   get:
 *     summary: Get Athlete Profile
 *     description: |
 *       Get the athlete profile card data for the detail page.
 *       Returns athlete base info, registry, coach mappings, and nutritionist mappings.
 *     tags: [AMS - Athletes]
 *     security:
 *       - bearerAuth: []
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
 *         description: Athlete profile data
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
 *                     ethnicity:
 *                       type: string
 *                       nullable: true
 *                     target_event:
 *                       type: string
 *                       nullable: true
 *                     sport_start_date:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                     sport_name:
 *                       type: string
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
 *                 coaches:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       coach_id:
 *                         type: string
 *                         format: uuid
 *                       is_active:
 *                         type: boolean
 *                       coach_name:
 *                         type: string
 *                 nutritionists:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       nutritionist_id:
 *                         type: string
 *                         format: uuid
 *                       is_active:
 *                         type: boolean
 *                       nutritionist_name:
 *                         type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/athletes/:id/profile", controller.getAthleteProfile);

/**
 * @swagger
 * /api/AMS/athletes/{id}/profile:
 *   patch:
 *     summary: Update Athlete Profile
 *     description: |
 *       Update an athlete's profile. All fields are optional — only provided fields are modified.
 *       If coach_ids is provided, active coach mappings are replaced (old deactivated, new activated).
 *       Nutritionist mappings cannot be modified by regular users.
 *     tags: [AMS - Athletes]
 *     security:
 *       - bearerAuth: []
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
 *               ethnicity:
 *                 type: string
 *                 description: Optional
 *               target_event:
 *                 type: string
 *                 description: Optional
 *               sport_start_date:
 *                 type: string
 *                 format: date
 *                 description: Optional
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
 *               medical_remarks:
 *                 type: string
 *               coach_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Replace active coach mappings with these coaches
 *           example:
 *             athlete_name_abbr: "J. Smith Jr."
 *             ethnicity: "Chinese"
 *             sport_start_date: "2015-01-01"
 *             carding_status: "Active"
 *             coach_ids: ["b2c3d4e5-f6a7-8901-bcde-f12345678901"]
 *     responses:
 *       200:
 *         description: Athlete profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Athlete profile updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     athlete:
 *                       type: object
 *                       nullable: true
 *                     registry:
 *                       type: object
 *                       nullable: true
 *                     medical:
 *                       type: object
 *                       nullable: true
 *                     coachMappings:
 *                       type: array
 *                       nullable: true
 *                       items:
 *                         type: object
 *                     nutritionistMappings:
 *                       nullable: true
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch(
  "/athletes/:id/profile",
  authenticateToken,
  controller.updateAthleteProfile,
);

/**
 * @swagger
 * /api/AMS/athletes/{id}/profile/admin:
 *   patch:
 *     summary: Update Athlete Profile [ADMIN ONLY]
 *     description: |
 *       Admin version of athlete profile update. All fields are optional — only provided fields are modified.
 *       If coach_ids is provided, active coach mappings are replaced (old deactivated, new activated).
 *       If nutritionist_ids is provided, active nutritionist mappings are replaced.
 *     tags: [AMS - Athletes]
 *     security:
 *       - bearerAuth: []
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
 *               ethnicity:
 *                 type: string
 *                 description: Optional
 *               target_event:
 *                 type: string
 *                 description: Optional
 *               sport_start_date:
 *                 type: string
 *                 format: date
 *                 description: Optional
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
 *               medical_remarks:
 *                 type: string
 *               coach_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Replace active coach mappings with these coaches
 *               nutritionist_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Replace active nutritionist mappings with these nutritionists
 *           example:
 *             athlete_name_abbr: "J. Smith Jr."
 *             ethnicity: "Chinese"
 *             sport_start_date: "2015-01-01"
 *             nutritionist_ids: ["c3d4e5f6-a7b8-9012-cdef-123456789012"]
 *     responses:
 *       200:
 *         description: Athlete profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Athlete profile updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     athlete:
 *                       type: object
 *                       nullable: true
 *                     registry:
 *                       type: object
 *                       nullable: true
 *                     medical:
 *                       type: object
 *                       nullable: true
 *                     coachMappings:
 *                       type: array
 *                       nullable: true
 *                       items:
 *                         type: object
 *                     nutritionistMappings:
 *                       type: array
 *                       nullable: true
 *                       items:
 *                         type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch(
  "/athletes/:id/profile/admin",
  authenticateToken,
  requireAdmin,
  controller.adminUpdateAthleteProfile,
);

/**
 * @swagger
 * /api/AMS/athletes/complete:
 *   post:
 *     summary: Create Complete Athlete
 *     description: |
 *       Create a new athlete with registry, medical, coach mappings, and nutritionist mapping
 *       in a single transaction. If any insert fails, the entire transaction is rolled back.
 *       The logged-in nutritionist is automatically assigned to the athlete and pinned by default.
 *       Medical fields are optional (default to empty string).
 *       coach_ids is optional (defaults to empty array). Gender is either MALE, FEMALE or OTHER.
 *     tags: [AMS - Athletes]
 *     security:
 *       - bearerAuth: []
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
 *               ethnicity:
 *                 type: string
 *                 description: Optional
 *               target_event:
 *                 type: string
 *                 description: Optional
 *               sport_start_date:
 *                 type: string
 *                 format: date
 *                 description: Optional
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
 *                 description: Optional (defaults to empty string)
 *               food_allergy:
 *                 type: string
 *                 description: Optional (defaults to empty string)
 *               drug_allergy:
 *                 type: string
 *                 description: Optional (defaults to empty string)
 *               past_injury:
 *                 type: string
 *                 description: Optional (defaults to empty string)
 *               medical_remarks:
 *                 type: string
 *                 description: Optional (defaults to empty string)
 *               coach_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of coach UUIDs to assign (optional)
 *           example:
 *             sport_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *             sportsync_id: "SS-12345"
 *             athlete_name_abbr: "J. Smith"
 *             gender: "MALE"
 *             date_of_birth: "1998-03-15"
 *             ethnicity: "Chinese"
 *             target_event: "100m Sprint"
 *             sport_start_date: "2015-01-01"
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
router.post(
  "/athletes/complete",
  authenticateToken,
  controller.createCompleteAthlete,
);

/**
 * @swagger
 * /api/AMS/athletes/complete/admin:
 *   post:
 *     summary: Create Complete Athlete [ADMIN ONLY]
 *     description: |
 *       Admin version of complete athlete creation. Allows specifying which nutritionist
 *       to assign instead of auto-assigning the logged-in user.
 *       The assigned nutritionist is pinned to the athlete by default.
 *       Medical fields are optional (default to empty string).
 *       coach_ids is optional (defaults to empty array). Gender is either MALE, FEMALE or OTHER.
 *     tags: [AMS - Athletes]
 *     security:
 *       - bearerAuth: []
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
 *               - nutritionist_id
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
 *               ethnicity:
 *                 type: string
 *                 description: Optional
 *               target_event:
 *                 type: string
 *                 description: Optional
 *               sport_start_date:
 *                 type: string
 *                 format: date
 *                 description: Optional
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
 *                 description: Optional (defaults to empty string)
 *               food_allergy:
 *                 type: string
 *                 description: Optional (defaults to empty string)
 *               drug_allergy:
 *                 type: string
 *                 description: Optional (defaults to empty string)
 *               past_injury:
 *                 type: string
 *                 description: Optional (defaults to empty string)
 *               medical_remarks:
 *                 type: string
 *                 description: Optional (defaults to empty string)
 *               coach_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of coach UUIDs to assign (optional)
 *               nutritionist_id:
 *                 type: string
 *                 format: uuid
 *                 description: Nutritionist UUID to assign (required)
 *           example:
 *             sport_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *             sportsync_id: "SS-12345"
 *             athlete_name_abbr: "J. Smith"
 *             gender: "MALE"
 *             date_of_birth: "1998-03-15"
 *             ethnicity: "Chinese"
 *             target_event: "100m Sprint"
 *             sport_start_date: "2015-01-01"
 *             carding_status: "Active"
 *             athlete_notified_on: "2024-01-01"
 *             carding_start_date: "2024-01-01"
 *             carding_end_date: "2025-12-31"
 *             medical_clearance: true
 *             approved_start_date: "2024-01-01"
 *             approved_end_date: "2025-12-31"
 *             coach_ids: ["b2c3d4e5-f6a7-8901-bcde-f12345678901"]
 *             nutritionist_id: "c3d4e5f6-a7b8-9012-cdef-123456789012"
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
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  "/athletes/complete/admin",
  authenticateToken,
  requireAdmin,
  controller.adminCreateCompleteAthlete,
);

/**
 * @swagger
 * /api/AMS/athletes:
 *   post:
 *     summary: Create Basic Athlete [DEV ONLY]
 *     description: |
 *       Create a new athlete record with only base fields.
 *       Does not create registry, medical, or assignment records.
 *       Gender is either MALE, FEMALE or OTHER.
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
 *               ethnicity:
 *                 type: string
 *                 description: Optional
 *               target_event:
 *                 type: string
 *                 description: Optional
 *               sport_start_date:
 *                 type: string
 *                 format: date
 *                 description: Optional
 *           example:
 *             sport_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *             sportsync_id: "SS-12345"
 *             athlete_name_abbr: "J. Smith"
 *             gender: "MALE"
 *             date_of_birth: "1998-03-15"
 *             ethnicity: "Chinese"
 *             target_event: "100m Sprint"
 *             sport_start_date: "2015-01-01"
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
router.post("/athletes", controller.createBasicAthlete);

/**
 * @swagger
 * /api/AMS/athletes:
 *   delete:
 *     summary: Delete Athletes (Bulk) [ADMIN ONLY]
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
router.delete("/athletes", controller.deleteAthletes);

export default router;
