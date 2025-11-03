// modules/SSS/routes.js
import express from "express";
import { getSearch } from "./controller.js";

const router = express.Router();

// e.g. /api/SSS/search?q=whey&scope=ingredients
router.get("/search", getSearch);

export default router;
