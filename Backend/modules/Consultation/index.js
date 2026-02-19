import express from 'express';
import sessionRoutes from './session/routes.js';
import lookupRoutes from './consulttype/routes.js';
import noteRoutes from './note/routes.js';
import consultationUpdateRoutes from './consultation-update/routes.js';
import openItemsRoutes from './open-items/routes.js';

const router = express.Router();

// Deprecated routes (kept for reference)
router.use(sessionRoutes);
router.use(lookupRoutes);
router.use(noteRoutes);

// Card-based routes
router.use(consultationUpdateRoutes);
router.use(openItemsRoutes);

export default router;
