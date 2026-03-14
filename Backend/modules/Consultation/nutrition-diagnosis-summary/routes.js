import express from 'express';
import * as controller from './controller.js';
import { authenticateToken } from '../../Auth/authMiddleware.js';

const router = express.Router();

// ============================================================================
// NUTRITION DIAGNOSIS ROUTES
// ============================================================================

/**
 * @swagger
 * /api/Consultation/nutrition-diagnosis-summary/{sessionId}:
 *   get:
 *     summary: Get Nutrition Diagnosis
 *     description: |
 *       Get the consultation details card data for a specific session.
 *       Returns session_note fields with joined nutrition diagnosis names.
 *       If the session exists but no note row exists yet, returns null fields.
 *     tags: [Consultation - Nutrition Diagnosis Summary]
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
 *         description: Nutrition diagnosis data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     sessions_id:
 *                       type: string
 *                       format: uuid
 *                     main_nutrition_diagnosis:
 *                       type: string
 *                       nullable: true
 *                     carbohydrates_review_id:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     carbohydrates_review_diagnosis:
 *                       type: string
 *                       nullable: true
 *                     protein_review_id:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     protein_review_diagnosis:
 *                       type: string
 *                       nullable: true
 *                     fat_review_id:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     fat_review_diagnosis:
 *                       type: string
 *                       nullable: true
 *                     fibre_review_id:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     fibre_review_diagnosis:
 *                       type: string
 *                       nullable: true
 *                     iron_review_id:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     iron_review_diagnosis:
 *                       type: string
 *                       nullable: true
 *                     calcium_review_id:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     calcium_review_diagnosis:
 *                       type: string
 *                       nullable: true
 *                     micronutrients_review_id:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     micronutrients_review_diagnosis:
 *                       type: string
 *                       nullable: true
 *                     other_review:
 *                       type: string
 *                       nullable: true
 *                     follow_up_note:
 *                       type: string
 *                       nullable: true
 *                     intervention_note:
 *                       type: string
 *                       nullable: true
 *                     other_remarks:
 *                       type: string
 *                       nullable: true
 *             example:
 *               data:
 *                 id: "b3f1e2d4-a5c6-7890-bcde-f01234567890"
 *                 sessions_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 main_nutrition_diagnosis: "Excessive carbohydrate intake related to frequent consumption of sugary snacks and large portions of white rice as evidenced by a 24-hour diet recall showing 400g of carbs and a fasting blood glucose of 7.2 mmol/L."
 *                 carbohydrates_review_id: "019c4c05-c20e-76bf-84b9-38a6491d6f99"
 *                 carbohydrates_review_diagnosis: "Adequate"
 *                 protein_review_id: "019c4c05-c213-7e21-99d8-e92502c15119"
 *                 protein_review_diagnosis: "Adequate"
 *                 fat_review_id: "019c4c05-c215-76a5-8731-e7f9dd22804d"
 *                 fat_review_diagnosis: "Adequate"
 *                 fibre_review_id: "019c4c05-c215-735a-bc36-5f04b4ade82b"
 *                 fibre_review_diagnosis: "Adequate"
 *                 iron_review_id: "019c4c05-c216-7e84-ae47-5f4acf0de8ab"
 *                 iron_review_diagnosis: "Adequate"
 *                 calcium_review_id: "019c4c05-c216-72ce-98de-6ad756a4f29c"
 *                 calcium_review_diagnosis: "Adequate"
 *                 micronutrients_review_id: "019c4c05-c216-7143-8f34-75efa82f1e04"
 *                 micronutrients_review_diagnosis: "Adequate"
 *                 other_review: "Supplement Intake"
 *                 follow_up_note: "Adding a digestive enzyme prior to largest meal of the day to assist with protein absorption."
 *                 intervention_note: "The initial dosage of Magnesium caused minor GI distress. Patient transitioned to a glycinate form with much better tolerance."
 *                 other_remarks: null
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/nutrition-diagnosis-summary/:sessionId', controller.getConsultationDetails);

/**
 * @swagger
 * /api/Consultation/nutrition-diagnosis-summary:
 *   post:
 *     summary: Create Nutrition Diagnosis
 *     description: |
 *       Create or update consultation details for a session (upsert pattern).
 *       If a session_note row already exists (e.g. created by consultation-session with objective),
 *       the existing row is updated. Otherwise a new row is inserted.
 *       Validates that all review_id FKs exist and are active in nutrition_diagnosis_lookup.
 *     tags: [Consultation - Nutrition Diagnosis Summary]
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
 *                 description: Session UUID
 *               main_nutrition_diagnosis:
 *                 type: string
 *                 description: Free text main nutrition diagnosis
 *               carbohydrates_review_id:
 *                 type: string
 *                 format: uuid
 *                 description: FK to nutrition_diagnosis_lookup (CARB category)
 *               protein_review_id:
 *                 type: string
 *                 format: uuid
 *                 description: FK to nutrition_diagnosis_lookup (PROTEIN category)
 *               fat_review_id:
 *                 type: string
 *                 format: uuid
 *                 description: FK to nutrition_diagnosis_lookup (FAT category)
 *               fibre_review_id:
 *                 type: string
 *                 format: uuid
 *                 description: FK to nutrition_diagnosis_lookup (FIBRE category)
 *               iron_review_id:
 *                 type: string
 *                 format: uuid
 *                 description: FK to nutrition_diagnosis_lookup (IRON category)
 *               calcium_review_id:
 *                 type: string
 *                 format: uuid
 *                 description: FK to nutrition_diagnosis_lookup (CALCIUM category)
 *               micronutrients_review_id:
 *                 type: string
 *                 format: uuid
 *                 description: FK to nutrition_diagnosis_lookup (MICRO category)
 *               other_review:
 *                 type: string
 *                 description: Free text "Other" field
 *               follow_up_note:
 *                 type: string
 *               intervention_note:
 *                 type: string
 *               other_remarks:
 *                 type: string
 *           example:
 *             sessions_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *             main_nutrition_diagnosis: "Inadequate carbohydrate intake for training load"
 *             carbohydrates_review_id: "019c4c05-c20e-76bf-84b9-38a6491d6f99"
 *             protein_review_id: "019c4c05-c213-7e21-99d8-e92502c15119"
 *             fat_review_id: "019c4c05-c215-76a5-8731-e7f9dd22804d"
 *             fibre_review_id: "019c4c05-c215-735a-bc36-5f04b4ade82b"
 *             iron_review_id: "019c4c05-c216-7e84-ae47-5f4acf0de8ab"
 *             calcium_review_id: "019c4c05-c216-72ce-98de-6ad756a4f29c"
 *             micronutrients_review_id: "019c4c05-c216-7143-8f34-75efa82f1e04"
 *             other_review: "No other concerns"
 *             follow_up_note: "Review in 2 weeks"
 *             intervention_note: "Increase carb intake by 50g/day"
 *             other_remarks: "Athlete is motivated"
 *     responses:
 *       201:
 *         description: Nutrition diagnosis saved successfully
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
 *               message: "Nutrition diagnosis saved successfully"
 *               data:
 *                 id: "b3f1e2d4-a5c6-7890-bcde-f01234567890"
 *                 sessions_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 consultation_objective: null
 *                 main_nutrition_diagnosis: "Excessive carbohydrate intake related to frequent consumption of sugary snacks and large portions of white rice as evidenced by a 24-hour diet recall showing 400g of carbs and a fasting blood glucose of 7.2 mmol/L."
 *                 carbohydrates_review_id: "019c4c05-c20e-76bf-84b9-38a6491d6f99"
 *                 protein_review_id: "019c4c05-c213-7e21-99d8-e92502c15119"
 *                 fat_review_id: "019c4c05-c215-76a5-8731-e7f9dd22804d"
 *                 fibre_review_id: "019c4c05-c215-735a-bc36-5f04b4ade82b"
 *                 iron_review_id: "019c4c05-c216-7e84-ae47-5f4acf0de8ab"
 *                 calcium_review_id: "019c4c05-c216-72ce-98de-6ad756a4f29c"
 *                 micronutrients_review_id: "019c4c05-c216-7143-8f34-75efa82f1e04"
 *                 other_review: "Supplement Intake"
 *                 follow_up_note: "Adding a digestive enzyme prior to largest meal of the day to assist with protein absorption."
 *                 intervention_note: "The initial dosage of Magnesium caused minor GI distress. Patient transitioned to a glycinate form with much better tolerance."
 *                 other_remarks: null
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/nutrition-diagnosis-summary', authenticateToken, controller.createConsultationDetails);

/**
 * @swagger
 * /api/Consultation/nutrition-diagnosis-summary/{sessionId}:
 *   patch:
 *     summary: Update Nutrition Diagnosis
 *     description: |
 *       Update consultation details for a session. All fields are optional — only provided fields are modified.
 *       Uses upsert pattern: if session_note doesn't exist yet, inserts; if exists, updates.
 *       sessions_id and consultation_objective cannot be changed through this endpoint.
 *       Validates review_id FKs if provided.
 *     tags: [Consultation - Nutrition Diagnosis Summary]
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
 *               main_nutrition_diagnosis:
 *                 type: string
 *               carbohydrates_review_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               protein_review_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               fat_review_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               fibre_review_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               iron_review_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               calcium_review_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               micronutrients_review_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               other_review:
 *                 type: string
 *               follow_up_note:
 *                 type: string
 *               intervention_note:
 *                 type: string
 *               other_remarks:
 *                 type: string
 *           example:
 *             main_nutrition_diagnosis: "Excessive carbohydrate intake related to frequent consumption of sugary snacks and large portions of white rice as evidenced by a 24-hour diet recall showing 400g of carbs and a fasting blood glucose of 7.2 mmol/L."
 *             carbohydrates_review_id: "019c4c05-c20e-76bf-84b9-38a6491d6f99"
 *             protein_review_id: "019c4c05-c213-7e21-99d8-e92502c15119"
 *             fat_review_id: "019c4c05-c215-76a5-8731-e7f9dd22804d"
 *             fibre_review_id: "019c4c05-c215-735a-bc36-5f04b4ade82b"
 *             iron_review_id: "019c4c05-c216-7e84-ae47-5f4acf0de8ab"
 *             calcium_review_id: "019c4c05-c216-72ce-98de-6ad756a4f29c"
 *             micronutrients_review_id: "019c4c05-c216-7143-8f34-75efa82f1e04"
 *             other_review: "Supplement Intake"
 *             follow_up_note: "Adding a digestive enzyme prior to largest meal of the day to assist with protein absorption."
 *             intervention_note: "The initial dosage of Magnesium caused minor GI distress. Patient transitioned to a glycinate form with much better tolerance."
 *             other_remarks: null
 *     responses:
 *       200:
 *         description: Nutrition diagnosis updated successfully
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
 *               message: "Nutrition diagnosis updated successfully"
 *               data:
 *                 id: "b3f1e2d4-a5c6-7890-bcde-f01234567890"
 *                 sessions_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 consultation_objective: null
 *                 main_nutrition_diagnosis: "Excessive carbohydrate intake related to frequent consumption of sugary snacks and large portions of white rice as evidenced by a 24-hour diet recall showing 400g of carbs and a fasting blood glucose of 7.2 mmol/L."
 *                 carbohydrates_review_id: "019c4c05-c20e-76bf-84b9-38a6491d6f99"
 *                 protein_review_id: "019c4c05-c213-7e21-99d8-e92502c15119"
 *                 fat_review_id: "019c4c05-c215-76a5-8731-e7f9dd22804d"
 *                 fibre_review_id: "019c4c05-c215-735a-bc36-5f04b4ade82b"
 *                 iron_review_id: "019c4c05-c216-7e84-ae47-5f4acf0de8ab"
 *                 calcium_review_id: "019c4c05-c216-72ce-98de-6ad756a4f29c"
 *                 micronutrients_review_id: "019c4c05-c216-7143-8f34-75efa82f1e04"
 *                 other_review: "Supplement Intake"
 *                 follow_up_note: "Adding a digestive enzyme prior to largest meal of the day to assist with protein absorption."
 *                 intervention_note: "The initial dosage of Magnesium caused minor GI distress. Patient transitioned to a glycinate form with much better tolerance."
 *                 other_remarks: null
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/nutrition-diagnosis-summary/:sessionId', authenticateToken, controller.updateConsultationDetails);

export default router;
