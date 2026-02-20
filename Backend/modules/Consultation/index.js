import express from 'express';
import consultationUpdateRoutes from './consultation-update/routes.js';
import openItemsRoutes from './open-items/routes.js';
import consultationLookupsRoutes from './consultation-lookups/routes.js';
import consultationDetailsRoutes from './consultation-details/routes.js';
import medicalHistoryRoutes from './medical-history/routes.js';

const router = express.Router();

// Card-based routes
router.use(consultationUpdateRoutes);
router.use(openItemsRoutes);
router.use(consultationLookupsRoutes);
router.use(consultationDetailsRoutes);
router.use(medicalHistoryRoutes);

export default router;
