import express from "express";
import consultationUpdateRoutes from "./consultation-update/routes.js";
import openItemsRoutes from "./open-items/routes.js";
import consultationLookupsRoutes from "./consultation-lookups/routes.js";
import consultationDetailsRoutes from "./consultation-details/routes.js";
import trainingScheduleRoutes from "./trainingSchedule/routes.js"; // ✅ ADD
import mealLogRoutes from "./mealLog/routes.js";
import anthropometryRoutes from "./anthropometry/routes.js";
import adherencesRoutes from "./adherences/routes.js";

const router = express.Router();

// Card-based routes
router.use(consultationUpdateRoutes);
router.use(openItemsRoutes);
router.use(consultationLookupsRoutes);
router.use(consultationDetailsRoutes);
router.use(trainingScheduleRoutes); // ✅ ADD
router.use(mealLogRoutes);
router.use(anthropometryRoutes);
router.use(adherencesRoutes);

export default router;