import express from 'express';
import * as controller from './controller.js';
import { authenticateToken } from '../../Auth/authMiddleware.js';

const router = express.Router();

// ============================================================================
// CONSULTATION DETAILS CARD ROUTES
// ============================================================================

/**
 * @swagger
 * /api/Consultation/consultation-details/{sessionId}:
 *   get:
 *     summary: Get Consultation Details Card
 *     description: |
 *       Get the consultation details card data for a specific session.
 *       Returns session_note fields with joined nutrition diagnosis names.
 *       If the session exists but no note row exists yet, returns null fields.
 *     tags: [Consultation - Consultation Details]
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
 *         description: Consultation details data
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
 *                     medical_remarks:
 *                       type: string
 *                       nullable: true
 *                     other_remarks:
 *                       type: string
 *                       nullable: true
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/consultation-details/:sessionId', controller.getConsultationDetails);

/**
 * @swagger
 * /api/Consultation/consultation-details:
 *   post:
 *     summary: Create Consultation Details
 *     description: |
 *       Create or update consultation details for a session (upsert pattern).
 *       If a session_note row already exists (e.g. created by consultation-update with objective),
 *       the existing row is updated. Otherwise a new row is inserted.
 *       Validates that all review_id FKs exist and are active in nutrition_diagnosis_lookup.
 *     tags: [Consultation - Consultation Details]
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
 *               - main_nutrition_diagnosis
 *               - carbohydrates_review_id
 *               - protein_review_id
 *               - fat_review_id
 *               - fibre_review_id
 *               - iron_review_id
 *               - calcium_review_id
 *               - micronutrients_review_id
 *               - other_review
 *               - follow_up_note
 *               - intervention_note
 *               - medical_remarks
 *               - other_remarks
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
 *               medical_remarks:
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
 *             medical_remarks: "No medical issues"
 *             other_remarks: "Athlete is motivated"
 *     responses:
 *       201:
 *         description: Consultation details saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Consultation details saved successfully"
 *                 data:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/consultation-details', authenticateToken, controller.createConsultationDetails);

/**
 * @swagger
 * /api/Consultation/consultation-details/{sessionId}:
 *   patch:
 *     summary: Update Consultation Details
 *     description: |
 *       Update consultation details for a session. All fields are optional — only provided fields are modified.
 *       Uses upsert pattern: if session_note doesn't exist yet, inserts; if exists, updates.
 *       sessions_id and consultation_objective cannot be changed through this endpoint.
 *       Validates review_id FKs if provided.
 *     tags: [Consultation - Consultation Details]
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
 *               medical_remarks:
 *                 type: string
 *               other_remarks:
 *                 type: string
 *           example:
 *             main_nutrition_diagnosis: "Updated diagnosis"
 *             follow_up_note: "Check progress in 1 week"
 *     responses:
 *       200:
 *         description: Consultation details updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Consultation details updated successfully"
 *                 data:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/consultation-details/:sessionId', authenticateToken, controller.updateConsultationDetails);

export default router;
