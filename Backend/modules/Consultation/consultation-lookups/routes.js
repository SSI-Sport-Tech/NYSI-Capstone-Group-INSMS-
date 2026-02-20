import express from 'express';
import * as controller from './controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/Consultation/lookups/consult-types:
 *   get:
 *     summary: Get all active consult types
 *     description: Returns all active consultation types for dropdown population.
 *     tags: [Consultation - Lookups]
 *     responses:
 *       200:
 *         description: List of active consult types
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
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/lookups/consult-types', controller.getConsultTypes);

/**
 * @swagger
 * /api/Consultation/lookups/nutrition-diagnoses:
 *   get:
 *     summary: Get all active nutrition diagnoses
 *     description: |
 *       Returns all active nutrition diagnosis options for dropdown population.
 *       Categories: CARB, PROTEIN, FAT, FIBRE, IRON, CALCIUM, MICRO
 *     tags: [Consultation - Lookups]
 *     responses:
 *       200:
 *         description: List of active nutrition diagnoses
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
 *                       category:
 *                         type: string
 *                         enum: [CARB, PROTEIN, FAT, FIBRE, IRON, CALCIUM, MICRO]
 *                       diagnosis:
 *                         type: string
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/lookups/nutrition-diagnoses', controller.getNutritionDiagnoses);

export default router;
