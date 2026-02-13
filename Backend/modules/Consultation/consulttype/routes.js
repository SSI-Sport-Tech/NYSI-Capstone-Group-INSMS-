import express from 'express';
import * as controller from './controller.js';

const router = express.Router();

// ============================================================================
// CONSULT TYPE LOOKUP CRUD ROUTES
// ============================================================================

/**
 * @swagger
 * /api/Consultation/lookups/consult-types:
 *   get:
 *     summary: List Consult Types
 *     description: |
 *       Get all consult types from the type_of_consult_lookup table.
 *       By default returns only active consult types.
 *       Pass `includeInactive=true` to include inactive types.
 *     tags: [Consultation - Consult Types]
 *     parameters:
 *       - name: includeInactive
 *         in: query
 *         required: false
 *         description: Include inactive consult types
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: List of consult types
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
 *                       type_of_consult:
 *                         type: string
 *                       is_active:
 *                         type: boolean
 *             example:
 *               data:
 *                 - id: "uuid-1"
 *                   type_of_consult: "Initial Consultation"
 *                   is_active: true
 *                 - id: "uuid-2"
 *                   type_of_consult: "Follow-Up"
 *                   is_active: true
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/lookups/consult-types', controller.listConsultTypes);

/**
 * @swagger
 * /api/Consultation/lookups/consult-types:
 *   post:
 *     summary: Create Consult Type
 *     description: |
 *       Add a new consult type to the lookup table.
 *       Duplicate names (case-insensitive) are rejected with 409.
 *     tags: [Consultation - Consult Types]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type_of_consult]
 *             properties:
 *               type_of_consult:
 *                 type: string
 *                 description: Consult type name (must be unique)
 *                 example: "Initial Consultation"
 *     responses:
 *       201:
 *         description: Consult type created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Consult type created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     type_of_consult:
 *                       type: string
 *                     is_active:
 *                       type: boolean
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/lookups/consult-types', controller.createConsultType);

/**
 * @swagger
 * /api/Consultation/lookups/consult-types/{id}:
 *   patch:
 *     summary: Update Consult Type Status
 *     description: |
 *       Toggle the is_active status of a consult type.
 *     tags: [Consultation - Consult Types]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Consult type UUID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [is_active]
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 description: New active status
 *           example:
 *             is_active: false
 *     responses:
 *       200:
 *         description: Consult type updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Consult type updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     type_of_consult:
 *                       type: string
 *                     is_active:
 *                       type: boolean
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/lookups/consult-types/:id', controller.updateConsultType);

/**
 * @swagger
 * /api/Consultation/lookups/consult-types:
 *   delete:
 *     summary: Delete Consult Types (Bulk)
 *     description: |
 *       Delete one or more consult types from the lookup table.
 *       Consult types that are referenced by sessions cannot be deleted (409).
 *     tags: [Consultation - Consult Types]
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
 *                 description: Array of consult type UUIDs to delete
 *           example:
 *             ids: ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
 *     responses:
 *       200:
 *         description: Consult types deleted successfully
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
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/lookups/consult-types', controller.deleteConsultTypes);

export default router;
