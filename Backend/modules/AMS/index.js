import express from 'express';
import athleteRoutes from './athlete/routes.js';

const router = express.Router();
router.use(athleteRoutes);

export default router;
