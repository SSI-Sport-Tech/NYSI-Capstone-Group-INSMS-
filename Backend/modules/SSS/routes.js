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

//Use Case: Delete Supplement (Bulk delete)
router.delete('/supplements', controller.deleteSupplements);

//Use Case: Edit Supplement (PATCH for partial updates)
router.patch('/supplements/:id', controller.updateSupplement);

// Use Case: View Supplement Details (/:id must come after POST)
router.get('/supplements/:id', controller.getSupplementDetails);

// ============================================================================
// BATCH/INVENTORY ROUTES
// ============================================================================

//Use Case: Show Inventory Library, Search Inventory
router.get('/batches', controller.listBatches);

export default router;