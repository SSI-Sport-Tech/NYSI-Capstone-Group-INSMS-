import express from 'express';
import consultationUpdateRoutes from './consultation-update/routes.js';
import openItemsRoutes from './open-items/routes.js';

const router = express.Router();

// Card-based routes
router.use(consultationUpdateRoutes);
router.use(openItemsRoutes);

export default router;
