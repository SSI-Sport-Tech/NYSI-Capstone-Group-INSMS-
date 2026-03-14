import express from 'express';
import * as controller from './controller.js';
import { authenticateToken } from '../../Auth/authMiddleware.js';

const router = express.Router();

// ============================================================================
// PRESCRIPTION CARD ROUTES
// ============================================================================

/**
 * @swagger
 * /api/Consultation/supplement-dispensing/session/{sessionId}:
 *   get:
 *     summary: Get All Prescriptions for a Session
 *     description: |
 *       Returns all prescriptions linked to a consultation session.
 *       Each prescription includes joined batch details (batch_number, price, expiration_date)
 *       and supplement details (name, brand, batch_testing_org) auto-populated from the batch.
 *       The intervention_status represents the user-selected classification (e.g. Batch Tested / Not Batch Tested).
 *     tags: [Consultation - Supplement Dispensing]
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
 *         description: List of prescriptions for the session
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
 *                       sessions_id:
 *                         type: string
 *                         format: uuid
 *                       batch_id:
 *                         type: string
 *                         format: uuid
 *                       batch_number:
 *                         type: string
 *                         nullable: true
 *                       batch_price:
 *                         type: number
 *                         nullable: true
 *                         description: Auto-populated from selected batch
 *                       batch_expiration_date:
 *                         type: string
 *                         format: date
 *                         nullable: true
 *                         description: Auto-populated from selected batch
 *                       supplement_id:
 *                         type: string
 *                         format: uuid
 *                         nullable: true
 *                       supplement_name:
 *                         type: string
 *                         nullable: true
 *                         description: Auto-populated from supplement linked to batch
 *                       supplement_brand:
 *                         type: string
 *                         nullable: true
 *                         description: Auto-populated from supplement linked to batch
 *                       batch_testing_org:
 *                         type: string
 *                         nullable: true
 *                         description: Testing organisation, auto-populated from supplement
 *                       prescribed_quantity:
 *                         type: integer
 *                         nullable: true
 *                       dosage:
 *                         type: integer
 *                         nullable: true
 *                       dosage_unit:
 *                         type: string
 *                         nullable: true
 *                       dosage_frequency:
 *                         type: string
 *                         nullable: true
 *                       start_date:
 *                         type: string
 *                         format: date
 *                         nullable: true
 *                       projected_end_date:
 *                         type: string
 *                         format: date
 *                         nullable: true
 *                       follow_up_required:
 *                         type: boolean
 *                       other_remarks:
 *                         type: string
 *                         nullable: true
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/supplement-dispensing/session/:sessionId', controller.getPrescriptions);

/**
 * @swagger
 * /api/Consultation/supplement-dispensing:
 *   post:
 *     summary: Create Prescription
 *     description: |
 *       Add a new prescription to a consultation session.
 *       - `batch_id` links to an SSS inventory batch; price and expiration_date are derived from it.
 *       - `intervention_status_id` is the user-selected classification (e.g. Batch Tested / Not Batch Tested).
 *         Use `GET /api/Consultation/lookups/intervention-statuses` for available options.
 *       - `batch_testing_org` and supplement fields are stored in SSS and returned via GET.
 *     tags: [Consultation - Supplement Dispensing]
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
 *               - batch_id
 *               - prescribed_quantity
 *             properties:
 *               sessions_id:
 *                 type: string
 *                 format: uuid
 *                 description: Session UUID
 *               batch_id:
 *                 type: string
 *                 format: uuid
 *                 description: Inventory batch UUID (from SSS batch dropdown)
 *               prescribed_quantity:
 *                 type: integer
 *                 description: |
 *                   Total quantity prescribed (e.g. 60 tablets). Required — used to
 *                   create an inventory ticket and check available stock. Returns 409
 *                   if prescribed_quantity exceeds available stock for the batch.
 *                 example: 60
 *               dosage:
 *                 type: integer
 *                 description: Amount per dose (e.g. 2)
 *                 example: 2
 *               dosage_unit:
 *                 type: string
 *                 description: Unit of dosage (e.g. tablets, ml, mg)
 *                 example: "tablets"
 *               dosage_frequency:
 *                 type: string
 *                 description: How often to take (e.g. once daily, twice daily)
 *                 example: "once daily"
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Start date of prescription
 *               projected_end_date:
 *                 type: string
 *                 format: date
 *                 description: Projected end date
 *               follow_up_required:
 *                 type: boolean
 *                 description: Whether a follow-up is required
 *               other_remarks:
 *                 type: string
 *                 description: Additional remarks
 *           example:
 *             sessions_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *             batch_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
 *             prescribed_quantity: 60
 *             dosage: 2
 *             dosage_unit: "tablets"
 *             dosage_frequency: "once daily"
 *             start_date: "2026-02-21"
 *             projected_end_date: "2026-03-21"
 *             follow_up_required: false
 *             other_remarks: "Take with food"
 *     responses:
 *       201:
 *         description: Prescription created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Prescription created successfully"
 *                 data:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         description: Insufficient stock for this batch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Insufficient stock"
 *                 available:
 *                   type: integer
 *                   description: Current available units for the batch
 *                   example: 5
 *                 message:
 *                   type: string
 *                   example: "Only 5 unit(s) available for this batch"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/supplement-dispensing', authenticateToken, controller.createPrescription);

/**
 * @swagger
 * /api/Consultation/supplement-dispensing/{id}:
 *   patch:
 *     summary: Update Prescription
 *     description: |
 *       Partially update a prescription. All fields are optional — only provided fields are modified.
 *       sessions_id cannot be changed after creation.
 *     tags: [Consultation - Supplement Dispensing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Prescription UUID
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
 *               batch_id:
 *                 type: string
 *                 format: uuid
 *               prescribed_quantity:
 *                 type: integer
 *                 description: Updated total quantity — updates the linked inventory ticket and recalculates batch stock status. Returns 409 if new quantity exceeds available stock.
 *               dosage:
 *                 type: integer
 *               dosage_unit:
 *                 type: string
 *               dosage_frequency:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *               projected_end_date:
 *                 type: string
 *                 format: date
 *               follow_up_required:
 *                 type: boolean
 *               other_remarks:
 *                 type: string
 *           example:
 *             prescribed_quantity: 90
 *             dosage: 3
 *             dosage_frequency: "twice daily"
 *             other_remarks: "Increased dosage after follow-up"
 *     responses:
 *       200:
 *         description: Prescription updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Prescription updated successfully"
 *                 data:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Insufficient stock for this batch (only when prescribed_quantity is provided)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Insufficient stock"
 *                 available:
 *                   type: integer
 *                   example: 5
 *                 message:
 *                   type: string
 *                   example: "Only 5 unit(s) available for this batch"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/supplement-dispensing/:id', authenticateToken, controller.updatePrescription);

/**
 * @swagger
 * /api/Consultation/supplement-dispensing/{id}:
 *   delete:
 *     summary: Delete Prescription
 *     description: Permanently remove a prescription from a consultation session.
 *     tags: [Consultation - Supplement Dispensing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Prescription UUID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Prescription deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Prescription deleted successfully"
 *                 id:
 *                   type: string
 *                   format: uuid
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/supplement-dispensing/:id', authenticateToken, controller.deletePrescription);

export default router;
