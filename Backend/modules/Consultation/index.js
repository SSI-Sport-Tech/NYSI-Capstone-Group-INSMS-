import express from "express";
import consultationSessionRoutes from "./consultation-session/routes.js";
import actionablesRoutes from "./actionables/routes.js";
import consultationLookupsRoutes from "./consultation-lookups/routes.js";
import nutritionDiagnosisSummaryRoutes from "./nutrition-diagnosis-summary/routes.js";
import trainingScheduleRoutes from "./trainingSchedule/routes.js"; // ✅ ADD
import mealLogRoutes from "./mealLog/routes.js";
import anthropometryRoutes from "./anthropometry/routes.js";
import nutritionRequirementsRoutes from "./nutrition-requirements/routes.js";
import medicalHistoryRoutes from './medical-history/routes.js';
import supplementDispensingRoutes from './supplement-dispensing/routes.js';

const router = express.Router();

// Card-based routes
router.use(consultationSessionRoutes);
router.use(actionablesRoutes);
router.use(consultationLookupsRoutes);
router.use(nutritionDiagnosisSummaryRoutes);
router.use(trainingScheduleRoutes); // ✅ ADD
router.use(mealLogRoutes);
router.use(anthropometryRoutes);
router.use(nutritionRequirementsRoutes);
router.use(medicalHistoryRoutes);
router.use(supplementDispensingRoutes);

export default router;