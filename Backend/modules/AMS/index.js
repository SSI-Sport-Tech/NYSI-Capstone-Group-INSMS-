import express from "express";
import athleteRoutes from "./athlete/routes.js";
import sportRoutes from "./sport/routes.js";
import coachRoutes from "./coach/routes.js";
import nutritionistRoutes from "./nutritionist/routes.js"; // ✅ 1. Import new routes
import scheduleLookupsRoutes from "./schedule-lookups/routes.js";
import nutritionistScheduleRoutes from "./nutritionist_schedule/routes.js";

const router = express.Router();

router.use(athleteRoutes);
router.use(sportRoutes);
router.use(coachRoutes);
// router.use("/nutritionists", nutritionistRoutes); // ✅ 2. Use new routes with proper prefix
router.use(nutritionistRoutes); // ✅ 2. Use new routes with proper prefix
router.use(scheduleLookupsRoutes);
router.use(nutritionistScheduleRoutes);
export default router;
