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
 * /api/Consultation/lookups/consultation-objectives:
 *   get:
 *     summary: Get all active consultation objectives
 *     description: Returns all active consultation objectives for dropdown population.
 *     tags: [Consultation - Lookups]
 *     responses:
 *       200:
 *         description: List of active consultation objectives
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
 *                       consultation_objective:
 *                         type: string
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/lookups/consultation-objectives', controller.getConsultationObjectives);

export default router;
