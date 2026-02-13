import express from 'express';
import sessionRoutes from './session/routes.js';
import lookupRoutes from './consulttype/routes.js';
import noteRoutes from './note/routes.js';

const router = express.Router();
router.use(sessionRoutes);
router.use(lookupRoutes);
router.use(noteRoutes);

export default router;
