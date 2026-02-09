import express from 'express';
import athleteRoutes from './athlete/routes.js';
import sportRoutes from './sport/routes.js';
import coachRoutes from './coach/routes.js';

const router = express.Router();
router.use(athleteRoutes);
router.use(sportRoutes);
router.use(coachRoutes);

export default router;
