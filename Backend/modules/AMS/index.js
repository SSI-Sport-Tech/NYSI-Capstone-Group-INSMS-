import express from 'express';
import athleteRoutes from './athlete/routes.js';
import sportRoutes from './sport/routes.js';
import coachRoutes from './coach/routes.js';
import nutritionistRoutes from './nutritionist/routes.js'; // ✅ 1. Import new routes

const router = express.Router();

router.use(athleteRoutes);
router.use(sportRoutes);
router.use(coachRoutes);
router.use(nutritionistRoutes); // ✅ 2. Use new routes

export default router;