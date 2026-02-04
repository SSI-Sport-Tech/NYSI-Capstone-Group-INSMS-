import express from 'express';
import supplementRoutes from './supplements/routes.js';
import inventoryRoutes from './inventory/routes.js';
import stagingRoutes from './staging/routes.js';

const router = express.Router();
router.use(supplementRoutes);
router.use(inventoryRoutes);
router.use(stagingRoutes);

export default router;
