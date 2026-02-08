import express from 'express';
import athleteRoutes from './athlete/routes.js';
import sportRoutes from './sport/routes.js';

const router = express.Router();
router.use(athleteRoutes);
router.use(sportRoutes);

export default router;
