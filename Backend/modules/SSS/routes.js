import express from "express";
import * as controller from "./controller.js";

const router = express.Router();

// ============================================================================
// SUPPLEMENT ROUTES
// ============================================================================

/**
 * @swagger
 * /api/SSS/supplements:
 *   get:
 *     summary: Get paginated list of supplements
 *     description: Retrieve supplements with optional search functionality
 *     tags: [Supplements]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/supplements", controller.listSupplements);

/**
 * @swagger
 * /api/SSS/supplements:
 *   post:
 *     summary: Create a new supplement
 *     description: Add a new supplement to the database
 *     tags: [Supplements]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplement_name
 *               - supplement_brand
 *             properties:
 *               supplement_name:
 *                 type: string
 *                 description: Name of the supplement
 *               supplement_brand:
 *                 type: string
 *                 description: Brand name
 *               supplement_packaging_form_id:
 *                 type: string
 *                 format: uuid
 *                 description: Packaging form ID
 *               supplement_status_id:
 *                 type: string
 *                 format: uuid
 *                 description: Status ID
 *               batch_testing_org:
 *                 type: string
 *                 description: Testing organization
 *               supplement_description:
 *                 type: string
 *                 description: Detailed description
 *     responses:
 *       201:
 *         description: Supplement created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Supplement'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/supplements", controller.createSupplement);

/**
 * @swagger
 * /api/SSS/supplements:
 *   delete:
 *     summary: Delete multiple supplements
 *     description: Bulk delete supplements by IDs
 *     tags: [Supplements]
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
 *                 description: Array of supplement IDs to delete
 *     responses:
 *       200:
 *         description: Supplements deleted successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete("/supplements", controller.deleteSupplements);

/**
 * @swagger
 * /api/SSS/supplements/{id}:
 *   patch:
 *     summary: Update a supplement
 *     description: Partially update supplement information
 *     tags: [Supplements]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Supplement ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               supplement_name:
 *                 type: string
 *               supplement_brand:
 *                 type: string
 *               supplement_description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Supplement updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Supplement'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch("/supplements/:id", controller.updateSupplement);

/**
 * @swagger
 * /api/SSS/supplements/{id}:
 *   get:
 *     summary: Get supplement details
 *     description: Retrieve detailed information about a specific supplement
 *     tags: [Supplements]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Supplement ID
 *     responses:
 *       200:
 *         description: Supplement details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Supplement'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/supplements/:id", controller.getSupplementDetails);

// ============================================================================
// BATCH/INVENTORY ROUTES
// ============================================================================

/**
 * @swagger
 * /api/SSS/batches:
 *   get:
 *     summary: Get paginated list of inventory batches
 *     description: Retrieve inventory batches with optional search functionality
 *     tags: [Inventory Batches]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Batch'
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
router.get("/batches", controller.listBatches);

export default router;
