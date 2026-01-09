import express from 'express';
import * as controller from './controller.js';

const router = express.Router();

// Supplement routes
//Use Case: Show Supplement Library, Search Supplement
router.get('/supplements', controller.listSupplements);

// Batch routes
//Use Case: Show Inventory Library
router.get('/batches', controller.listBatches);

export default router;