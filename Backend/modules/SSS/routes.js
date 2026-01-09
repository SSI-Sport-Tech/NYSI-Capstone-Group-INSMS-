// modules/SSS/routes.js
import express from "express";
import { getSearch } from "./controller.js";

const router = express.Router();

// e.g. /api/SSS/search?q=whey&scope=ingredients
router.get("/search", getSearch);

//Use Case: Show Supplement Library
router.get('/supplements', controller.listSupplements);

//Use Case: Show Inventory Library
router.get('/batches', controller.listBatches);

export default router;
