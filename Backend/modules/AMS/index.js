import express from 'express';
import athleteRoutes from './athlete/routes.js';
<<<<<<< HEAD
import sportRoutes from './sport/routes.js';
import coachRoutes from './coach/routes.js';

const router = express.Router();
router.use(athleteRoutes);
router.use(sportRoutes);
router.use(coachRoutes);
=======

const router = express.Router();
router.use(athleteRoutes);
>>>>>>> parent of e16bfa5 (Revert "Merge pull request #14 from Mike-Umali/Web-Portal")

export default router;
