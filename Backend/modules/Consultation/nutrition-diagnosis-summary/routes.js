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
 *       Returns the current text-based fields stored on `consultation.session_note`.
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
 *                     carbohydrates_review:
 *                       type: string
 *                       nullable: true
 *                     protein_review:
 *                       type: string
 *                       nullable: true
 *                     fat_review:
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
 *                 carbohydrates_review: "Adequate intake for current training load."
 *                 protein_review: "Slightly below target on rest days."
 *                 fat_review: "Adequate overall."
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
 *       If a session_note row already exists, the existing row is updated.
 *       Otherwise a new row is inserted.
 *       Review fields are plain text columns on `consultation.session_note`.
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
 *               carbohydrates_review:
 *                 type: string
 *                 nullable: true
 *                 description: Free-text carbohydrate review
 *               protein_review:
 *                 type: string
 *                 nullable: true
 *                 description: Free-text protein review
 *               fat_review:
 *                 type: string
 *                 nullable: true
 *                 description: Free-text fat review
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
 *             carbohydrates_review: "Below target on high-volume days"
 *             protein_review: "Adequate"
 *             fat_review: "Adequate"
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
 *                 main_nutrition_diagnosis: "Excessive carbohydrate intake related to frequent consumption of sugary snacks and large portions of white rice as evidenced by a 24-hour diet recall showing 400g of carbs and a fasting blood glucose of 7.2 mmol/L."
 *                 carbohydrates_review: "Adequate intake for current training load."
 *                 protein_review: "Slightly below target on rest days."
 *                 fat_review: "Adequate overall."
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
 *       Uses upsert pattern: if session_note doesn't exist yet, inserts; if it exists, updates.
 *       `sessions_id` cannot be changed through this endpoint.
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
 *               carbohydrates_review:
 *                 type: string
 *                 nullable: true
 *               protein_review:
 *                 type: string
 *                 nullable: true
 *               fat_review:
 *                 type: string
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
 *             carbohydrates_review: "Adequate intake for current training load."
 *             protein_review: "Slightly below target on rest days."
 *             fat_review: "Adequate overall."
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
 *                 main_nutrition_diagnosis: "Excessive carbohydrate intake related to frequent consumption of sugary snacks and large portions of white rice as evidenced by a 24-hour diet recall showing 400g of carbs and a fasting blood glucose of 7.2 mmol/L."
 *                 carbohydrates_review: "Adequate intake for current training load."
 *                 protein_review: "Slightly below target on rest days."
 *                 fat_review: "Adequate overall."
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
