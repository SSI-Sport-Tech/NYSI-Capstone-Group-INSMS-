import express from 'express';
import * as controller from './controller.js';
import { authenticateToken } from '../../Auth/authMiddleware.js';

const router = express.Router();

// ============================================================================
// MEDICAL HISTORY CARD ROUTES
// NOTE: athlete/:athleteId/eligibility MUST be registered before /:sessionId
//       to prevent Express matching "athlete" as a sessionId.
// ============================================================================

/**
 * @swagger
 * /api/Consultation/medical-history/athlete/{athleteId}/eligibility:
 *   get:
 *     summary: Get Athlete Eligibility (DOB + gender)
 *     description: |
 *       Returns date_of_birth and gender for the given athlete.
 *       Used to determine period-section eligibility on the medical history card.
 *     tags: [Consultation - Medical History]
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
 *         description: Athlete eligibility data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     date_of_birth:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                     gender:
 *                       type: string
 *                       nullable: true
 *             example:
 *               data:
 *                 date_of_birth: "2000-06-15"
 *                 gender: "Female"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/medical-history/athlete/:athleteId/eligibility', controller.getAthleteEligibility);

/**
 * @swagger
 * /api/Consultation/medical-history/{sessionId}:
 *   get:
 *     summary: Get Medical History Card
 *     description: |
 *       Returns the full medical history card for a session.
 *       Data is pulled from ams.athlete_medical (general section) and four
 *       consultation session tables (puberty, bowel_movement, hydration, period).
 *       Sections with no existing row return all fields as null (id: null).
 *       Hydration calculated fields (hydration_water_intake_for_target_weight,
 *       hydration_requirement_for_water_intake) are joined from consultation.nutrition_review.
 *     tags: [Consultation - Medical History]
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         description: Session UUID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Full medical history card
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     session_id:
 *                       type: string
 *                       format: uuid
 *                     athlete_id:
 *                       type: string
 *                       format: uuid
 *                     general:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           nullable: true
 *                         medical_condition:
 *                           type: string
 *                           nullable: true
 *                         food_allergy:
 *                           type: string
 *                           nullable: true
 *                         drug_allergy:
 *                           type: string
 *                           nullable: true
 *                         past_injury:
 *                           type: string
 *                           nullable: true
 *                         medical_remarks:
 *                           type: string
 *                           nullable: true
 *                     puberty:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           nullable: true
 *                         period_of_growth_spurt:
 *                           type: string
 *                           nullable: true
 *                         other_remarks:
 *                           type: string
 *                           nullable: true
 *                     bowel_movement:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           nullable: true
 *                         regular_bowel_movement:
 *                           type: boolean
 *                           nullable: true
 *                         frequency_of_bowel_movement:
 *                           type: string
 *                           nullable: true
 *                         stool_visual:
 *                           type: string
 *                           nullable: true
 *                         other_remarks:
 *                           type: string
 *                           nullable: true
 *                     hydration:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           nullable: true
 *                         water_intake_per_day:
 *                           type: number
 *                           nullable: true
 *                         urine_colour:
 *                           type: string
 *                           nullable: true
 *                         hydration_status:
 *                           type: string
 *                           nullable: true
 *                         other_remarks:
 *                           type: string
 *                           nullable: true
 *                         hydration_water_intake_for_target_weight:
 *                           type: number
 *                           nullable: true
 *                         hydration_requirement_for_water_intake:
 *                           type: number
 *                           nullable: true
 *                     period:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                           nullable: true
 *                         date_of_first_period:
 *                           type: string
 *                           format: date
 *                           nullable: true
 *                         age_of_menarchy:
 *                           type: number
 *                           nullable: true
 *                         regularity_of_period:
 *                           type: number
 *                           nullable: true
 *                         length_of_typical_menstrual_cycle:
 *                           type: number
 *                           nullable: true
 *                         length_of_period:
 *                           type: number
 *                           nullable: true
 *                         heaviness_of_menstrual_bleeding:
 *                           type: number
 *                           nullable: true
 *                         any_signs_and_symptoms:
 *                           type: string
 *                           nullable: true
 *                         other_remarks:
 *                           type: string
 *                           nullable: true
 *             example:
 *               data:
 *                 session_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 athlete_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
 *                 general:
 *                   id: null
 *                   medical_condition: null
 *                   food_allergy: null
 *                   drug_allergy: null
 *                   past_injury: null
 *                   medical_remarks: null
 *                 puberty:
 *                   id: null
 *                   period_of_growth_spurt: null
 *                   other_remarks: null
 *                 bowel_movement:
 *                   id: null
 *                   regular_bowel_movement: null
 *                   frequency_of_bowel_movement: null
 *                   stool_visual: null
 *                   other_remarks: null
 *                 hydration:
 *                   id: null
 *                   water_intake_per_day: null
 *                   urine_colour: null
 *                   hydration_status: null
 *                   other_remarks: null
 *                   hydration_water_intake_for_target_weight: null
 *                   hydration_requirement_for_water_intake: null
 *                 period:
 *                   id: null
 *                   date_of_first_period: null
 *                   age_of_menarchy: null
 *                   regularity_of_period: null
 *                   length_of_typical_menstrual_cycle: null
 *                   length_of_period: null
 *                   heaviness_of_menstrual_bleeding: null
 *                   any_signs_and_symptoms: null
 *                   other_remarks: null
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/medical-history/:sessionId', controller.getMedicalHistory);

/**
 * @swagger
 * /api/Consultation/medical-history:
 *   post:
 *     summary: Create/Upsert Medical History
 *     description: |
 *       Create or update the medical history card for a session (upsert pattern).
 *       The athlete_id is derived server-side from the sessions_id — do not supply it.
 *       Only the sections/fields provided are written; omitted sections are left untouched.
 *       General fields (medical_condition, food_allergy, etc.) are stored in ams.athlete_medical
 *       and are shared across all sessions for the same athlete.
 *     tags: [Consultation - Medical History]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessions_id
 *             properties:
 *               sessions_id:
 *                 type: string
 *                 format: uuid
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
 *               puberty:
 *                 type: object
 *                 properties:
 *                   period_of_growth_spurt:
 *                     type: string
 *                   other_remarks:
 *                     type: string
 *               bowel_movement:
 *                 type: object
 *                 properties:
 *                   regular_bowel_movement:
 *                     type: boolean
 *                   frequency_of_bowel_movement:
 *                     type: string
 *                   stool_visual:
 *                     type: string
 *                   other_remarks:
 *                     type: string
 *               hydration:
 *                 type: object
 *                 properties:
 *                   water_intake_per_day:
 *                     type: number
 *                   urine_colour:
 *                     type: string
 *                   hydration_status:
 *                     type: string
 *                   other_remarks:
 *                     type: string
 *               period:
 *                 type: object
 *                 properties:
 *                   date_of_first_period:
 *                     type: string
 *                     format: date
 *                   age_of_menarchy:
 *                     type: number
 *                   regularity_of_period:
 *                     type: number
 *                   length_of_typical_menstrual_cycle:
 *                     type: number
 *                   length_of_period:
 *                     type: number
 *                   heaviness_of_menstrual_bleeding:
 *                     type: number
 *                   any_signs_and_symptoms:
 *                     type: string
 *                   other_remarks:
 *                     type: string
 *           example:
 *             sessions_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *             medical_condition: "Asthma"
 *             food_allergy: "Peanuts"
 *             bowel_movement:
 *               regular_bowel_movement: true
 *               frequency_of_bowel_movement: "Once daily"
 *             hydration:
 *               water_intake_per_day: 2.5
 *               urine_colour: "Pale yellow"
 *     responses:
 *       201:
 *         description: Medical history saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *             example:
 *               message: "Medical history saved successfully"
 *               data:
 *                 session_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 athlete_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/medical-history', authenticateToken, controller.createMedicalHistory);

/**
 * @swagger
 * /api/Consultation/medical-history/{sessionId}:
 *   patch:
 *     summary: Update Medical History
 *     description: |
 *       Partially update the medical history card for a session.
 *       All fields are optional — only provided fields are modified.
 *       sessions_id and athlete_id cannot be changed through this endpoint.
 *       Omitted sections are left completely untouched.
 *     tags: [Consultation - Medical History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         description: Session UUID
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
 *               medical_remarks:
 *                 type: string
 *               puberty:
 *                 type: object
 *                 properties:
 *                   period_of_growth_spurt:
 *                     type: string
 *                   other_remarks:
 *                     type: string
 *               bowel_movement:
 *                 type: object
 *                 properties:
 *                   regular_bowel_movement:
 *                     type: boolean
 *                   frequency_of_bowel_movement:
 *                     type: string
 *                   stool_visual:
 *                     type: string
 *                   other_remarks:
 *                     type: string
 *               hydration:
 *                 type: object
 *                 properties:
 *                   water_intake_per_day:
 *                     type: number
 *                   urine_colour:
 *                     type: string
 *                   hydration_status:
 *                     type: string
 *                   other_remarks:
 *                     type: string
 *               period:
 *                 type: object
 *                 properties:
 *                   date_of_first_period:
 *                     type: string
 *                     format: date
 *                   age_of_menarchy:
 *                     type: number
 *                   regularity_of_period:
 *                     type: number
 *                   length_of_typical_menstrual_cycle:
 *                     type: number
 *                   length_of_period:
 *                     type: number
 *                   heaviness_of_menstrual_bleeding:
 *                     type: number
 *                   any_signs_and_symptoms:
 *                     type: string
 *                   other_remarks:
 *                     type: string
 *           example:
 *             drug_allergy: "Penicillin"
 *             period:
 *               age_of_menarchy: 12
 *               regularity_of_period: 28
 *     responses:
 *       200:
 *         description: Medical history updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *             example:
 *               message: "Medical history updated successfully"
 *               data:
 *                 session_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 athlete_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/medical-history/:sessionId', authenticateToken, controller.updateMedicalHistory);

export default router;
