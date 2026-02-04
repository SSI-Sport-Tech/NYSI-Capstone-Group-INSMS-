import express from 'express';
import * as controller from './controller.js';

const router = express.Router();

// ============================================================================
// BATCH/INVENTORY ROUTES
// ============================================================================

/**
 * @swagger
 * /api/SSS/batches:
 *   get:
 *     summary: List or Search Inventory Batches
 *     description: |
 *       Retrieve a paginated list of inventory batches with optional search functionality.
 *     tags: [Inventory]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: Successfully retrieved batches
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedBatchesResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/batches', controller.listBatches);

/**
 * @swagger
 * /api/SSS/batches:
 *   post:
 *     summary: Create New Batch
 *     description: |
 *       Add a new inventory batch to the database.
 *       `batch_stock_status_id` is auto-set to "available" by backend.
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               supplement_id:
 *                 type: string
 *                 format: uuid
 *               batch_number:
 *                 type: string
 *               batch_initial_quantity:
 *                 type: integer
 *                 minimum: 1
 *               batch_price:
 *                 type: number
 *                 minimum: 0
 *               batch_expiration_date:
 *                 type: string
 *                 format: date
 *               batch_manufacture_date:
 *                 type: string
 *                 format: date
 *             required:
 *               - supplement_id
 *               - batch_number
 *               - batch_initial_quantity
 *     responses:
 *       201:
 *         description: Batch created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/batches', controller.createBatch);

/**
 * @swagger
 * /api/SSS/batches/{id}:
 *   patch:
 *     summary: Update Batch (Partial)
 *     description: Update one or more fields of an existing batch.
 *     tags: [Inventory]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
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
 *               supplement_id:
 *                 type: string
 *                 format: uuid
 *               batch_number:
 *                 type: string
 *               batch_initial_quantity:
 *                 type: integer
 *               batch_price:
 *                 type: number
 *               batch_expiration_date:
 *                 type: string
 *                 format: date
 *               batch_manufacture_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Batch updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/batches/:id', controller.updateBatch);

/**
 * @swagger
 * /api/SSS/batches:
 *   delete:
 *     summary: Delete Batches (Bulk)
 *     description: Permanently delete one or more batches. Prevents deletion if batch has existing tickets.
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *             required:
 *               - ids
 *     responses:
 *       200:
 *         description: Batches deleted successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         description: Cannot delete batches with existing tickets
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/batches', controller.deleteBatches);

export default router;
