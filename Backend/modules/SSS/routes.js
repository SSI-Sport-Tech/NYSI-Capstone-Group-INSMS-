import express from 'express';
import * as controller from './controller.js';

const router = express.Router();

// ============================================================================
// SUPPLEMENT ROUTES
// ============================================================================

//Use Case: Show Supplement Library, Search Supplement
router.get('/supplements', controller.listSupplements);

//Use Case: Create New Supplement (POST must come before /:id)
router.post('/supplements', controller.createSupplement);

// Use Case: View Supplement Details (/:id must come after POST)
router.get('/supplements/:id', controller.getSupplementDetails);

// ============================================================================
// BATCH/INVENTORY ROUTES
// ============================================================================

//Use Case: Show Inventory Library, Search Inventory
router.get('/batches', controller.listBatches);

export default router;