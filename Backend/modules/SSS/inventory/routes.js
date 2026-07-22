import express from 'express';
import * as controller from './controller.js';
import { authenticateToken } from '../../../modules/Auth/authMiddleware.js';

const router = express.Router();

// ============================================================================
// BATCH/INVENTORY ROUTES
// ============================================================================

/**
 * @swagger
 * /api/SSS/batches/export:
 *   get:
 *     summary: Export Inventory Batches
 *     description: |
 *       Retrieves inventory batches from the ICS Inventory
 *       This endpoint is for exporting inventory supplements into CSV
 *     tags: [SSS - Inventory]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: Successfully retrieved inventory batches
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedBatchesResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/batches/export", controller.exportBatches);

/**
 * @swagger
 * /api/SSS/batches:
 *   get:
 *     summary: List or Search Inventory Batches
 *     description: |
 *       Retrieves inventory batches from the ICS Inventory
 *       This endpoint is read-only and supports pagination and searching
 *     tags: [SSS - Inventory]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: Successfully retrieved inventory batches
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

export default router;
