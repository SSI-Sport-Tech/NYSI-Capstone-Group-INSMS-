import express from 'express';
import * as controller from './controller.js';
import { authenticateToken } from '../../Auth/authMiddleware.js';

const router = express.Router();

// ============================================================================
// OPEN ITEM STATUS LOOKUP
// ============================================================================

/**
 * @swagger
 * /api/Consultation/open-items/statuses:
 *   get:
 *     summary: Get Open Item Statuses (Lookup)
 *     description: |
 *       Returns all active open item statuses for dropdown selection.
 *       Currently: "In Progress" and "Completed".
 *     tags: [Consultation - Open Items]
 *     responses:
 *       200:
 *         description: List of active statuses
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
 *                       open_item_status:
 *                         type: string
 *                         example: "In Progress"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/open-items/statuses', controller.getOpenItemStatuses);

// ============================================================================
// OPEN ITEMS CARD ROUTES
// ============================================================================

/**
 * @swagger
 * /api/Consultation/open-items/session/{sessionId}:
 *   get:
 *     summary: Get Open Items by Session
 *     description: |
 *       Get all open items for a specific consultation session.
 *       Returns items sorted by due date (earliest first, nulls last).
 *       Includes the joined status name from the lookup table.
 *     tags: [Consultation - Open Items]
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
 *         description: List of open items
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
 *                       open_item_status_id:
 *                         type: string
 *                         format: uuid
 *                       open_item_status:
 *                         type: string
 *                         description: Status name from lookup table
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       open_item:
 *                         type: string
 *                         nullable: true
 *                       owner:
 *                         type: string
 *                         nullable: true
 *                       due_date:
 *                         type: string
 *                         format: date
 *                         nullable: true
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
router.get('/open-items/session/:sessionId', controller.getOpenItems);

/**
 * @swagger
 * /api/Consultation/open-items:
 *   post:
 *     summary: Create Open Item
 *     description: |
 *       Create a new open item for a consultation session.
 *       Validates that sessions_id exists and open_item_status_id is active.
 *     tags: [Consultation - Open Items]
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
 *               - open_item_status_id
 *             properties:
 *               sessions_id:
 *                 type: string
 *                 format: uuid
 *                 description: Session UUID
 *               open_item_status_id:
 *                 type: string
 *                 format: uuid
 *                 description: Status UUID from open_item_status_lookup (must be active)
 *               description:
 *                 type: string
 *                 description: Description of the action item
 *               open_item:
 *                 type: string
 *                 description: The follow-up action to take
 *               owner:
 *                 type: string
 *                 description: Person responsible for the item
 *               due_date:
 *                 type: string
 *                 format: date
 *                 description: Due date for the item
 *               other_remarks:
 *                 type: string
 *                 description: Additional remarks
 *           example:
 *             sessions_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *             open_item_status_id: "019c765b-583a-7932-855b-5314c39aa72d"
 *             description: "Athlete complains of fatigue, suspect low iron"
 *             open_item: "Get a full blood count to check for low iron"
 *             owner: "Amy Tan"
 *             due_date: "2026-03-31"
 *     responses:
 *       201:
 *         description: Open item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Open item created successfully"
 *                 data:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/open-items', authenticateToken, controller.createOpenItem);

/**
 * @swagger
 * /api/Consultation/open-items/{id}:
 *   patch:
 *     summary: Update Open Item
 *     description: |
 *       Update an open item. All fields are optional — only provided fields are modified.
 *       Use this to change the status (e.g. mark as completed), update description, etc.
 *       sessions_id cannot be changed after creation.
 *     tags: [Consultation - Open Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Open item UUID
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
 *               open_item_status_id:
 *                 type: string
 *                 format: uuid
 *                 description: Status UUID (e.g. change to "Completed")
 *               description:
 *                 type: string
 *               open_item:
 *                 type: string
 *               owner:
 *                 type: string
 *               due_date:
 *                 type: string
 *                 format: date
 *               other_remarks:
 *                 type: string
 *           example:
 *             open_item_status_id: "c3d4e5f6-a7b8-9012-cdef-123456789012"
 *     responses:
 *       200:
 *         description: Open item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Open item updated successfully"
 *                 data:
 *                   type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/open-items/:id', authenticateToken, controller.updateOpenItem);

/**
 * @swagger
 * /api/Consultation/open-items:
 *   delete:
 *     summary: Delete Open Items (Bulk)
 *     description: |
 *       Delete one or more open items by ID.
 *     tags: [Consultation - Open Items]
 *     security:
 *       - bearerAuth: []
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
 *                 description: Array of open item UUIDs to delete
 *           example:
 *             ids: ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
 *     responses:
 *       200:
 *         description: Open items deleted successfully
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
router.delete('/open-items', authenticateToken, controller.deleteOpenItems);

export default router;
