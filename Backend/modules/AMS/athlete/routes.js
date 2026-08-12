import express from "express";
import * as controller from "./controller.js";
import { authenticateToken, requireAdmin } from "../../Auth/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/AMS/athletes/adex:
 *   get:
 *     summary: List Athletes from ADEX
 *     description: |
 *       Retrieves athletes directly from the Athlete Data Exchange (ADEX).
 *       This endpoint does not query the local AMS.Athlete table.
 *
 *       Used during the ADEX migration to verify athlete synchronization.
 *     tags: [AMS - Athletes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of athletes per page
 *     responses:
 *       200:
 *         description: Successfully retrieved athletes from ADEX
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
 *                       pk_athlete_uuid:
 *                         type: string
 *                         format: uuid
 *                       first_name:
 *                         type: string
 *                       last_name:
 *                         type: string
 *                       anonymized_display_name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       date_of_birth:
 *                         type: string
 *                         format: date
 *                       gender:
 *                         type: string
 *                       fk_sport_uuid:
 *                         type: string
 *                         format: uuid
 *                       position:
 *                         type: string
 *                         nullable: true
 *                       race:
 *                         type: string
 *                         nullable: true
 *                       ethnicity:
 *                         type: string
 *                         nullable: true
 *                       nationality:
 *                         type: string
 *                         nullable: true
 *                       is_active:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                 meta:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/athletes/adex", authenticateToken, controller.listADEXAthletes);

/**
 * @swagger
 * /api/AMS/athletes/adex/lookup:
 *   get:
 *     summary: Get Athlete Lookup List from ADEX
 *     description: |
 *       Retrieves a simplified list of athletes directly from the
 *       Athlete Data Exchange (ADEX) for lookup and selection purposes.
 *
 *       This endpoint does not query the local AMS.Athlete table.
 *     tags: [AMS - Athletes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved athlete lookup list from ADEX
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
 *                       data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       pk_athlete_uuid:
 *                         type: string
 *                         format: uuid
 *                       first_name:
 *                         type: string
 *                       last_name:
 *                         type: string
 *                       anonymized_display_name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       date_of_birth:
 *                         type: string
 *                         format: date
 *                       gender:
 *                         type: string
 *                       fk_sport_uuid:
 *                         type: string
 *                         format: uuid
 *                       position:
 *                         type: string
 *                         nullable: true
 *                       race:
 *                         type: string
 *                         nullable: true
 *                       ethnicity:
 *                         type: string
 *                         nullable: true
 *                       nationality:
 *                         type: string
 *                         nullable: true
 *                       is_active:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/athletes/adex/lookup", authenticateToken, controller.listADEXAthleteLookup);

/**
 * @swagger
 * /api/AMS/athletes/adex/{pk_athlete_uuid}:
 *   get:
 *     summary: Get Athlete from ADEX by UUID
 *     description: |
 *       Retrieves a single athlete directly from the Athlete Data Exchange (ADEX)
 *       using the athlete's primary UUID.
 *
 *       This endpoint does not query the local AMS.Athlete table.
 *
 *       Used during the ADEX migration to retrieve the master athlete profile.
 *     tags: [AMS - Athletes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pk_athlete_uuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Primary UUID of the athlete in ADEX
 *     responses:
 *       200:
 *         description: Successfully retrieved athlete from ADEX
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pk_athlete_uuid:
 *                   type: string
 *                   format: uuid
 *                 first_name:
 *                   type: string
 *                 last_name:
 *                   type: string
 *                 anonymized_display_name:
 *                   type: string
 *                 email:
 *                   type: string
 *                   format: email
 *                 date_of_birth:
 *                   type: string
 *                   format: date
 *                 gender:
 *                   type: string
 *                 fk_sport_uuid:
 *                   type: string
 *                   format: uuid
 *                 sport_name:
 *                   type: string
 *                 position:
 *                   type: string
 *                   nullable: true
 *                 race:
 *                   type: string
 *                   nullable: true
 *                 ethnicity:
 *                   type: string
 *                   nullable: true
 *                 nationality:
 *                   type: string
 *                   nullable: true
 *                 sport_sync_id:
 *                   type: string
 *                   nullable: true
 *                 external_patient_id:
 *                   type: string
 *                   nullable: true
 *                 pnco:
 *                   type: string
 *                   nullable: true
 *                 team_uuid:
 *                   type: string
 *                   format: uuid
 *                   nullable: true
 *                 carding_uuid:
 *                   type: string
 *                   nullable: true
 *                 carding_name:
 *                   type: string
 *                   nullable: true
 *                 is_active:
 *                   type: boolean
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Athlete not found in ADEX
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/athletes/adex/:pk_athlete_uuid", authenticateToken, controller.getADEXAthleteByUuid);


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
 *                     initials:
 *                       type: string
 *                     gender:
 *                       type: string
 *                       enum: [Male, Female, Other]
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
 *               initials:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
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
 *             initials: "J. Smith Jr."
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
 *               initials:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
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
 *             initials: "J. Smith Jr."
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

export default router;
