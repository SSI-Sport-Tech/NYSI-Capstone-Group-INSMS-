import express from 'express';
import * as controller from './controller.js';

const router = express.Router();

// ============================================================================
// SUPPLEMENT ROUTES
// ============================================================================

/**
 * @swagger
 * /api/SSS/supplements:
 *   get:
 *     summary: List or Search Supplements
 *     description: |
 *       Retrieve a paginated list of supplements with optional search functionality.
 *       
 *       **Search Behavior:**
 *       - Searches across: name, brand, ingredients, packaging form, and status
 *       - Multiple words require ALL matches (AND logic)
 *       - Results are ranked by relevance
 *       - Returns 10 items per page
 *       
 *       **Use Cases:** UC-SSS-001 (Show Library), UC-SSS-002 (Search)
 *     tags: [Supplements]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: Successfully retrieved supplements
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedSupplementsResponse'
 *             examples:
 *               withoutSearch:
 *                 summary: Full library (no search)
 *                 value:
 *                   data:
 *                     - id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                       supplement_name: "Vitamin D3 2000 IU"
 *                       supplement_brand: "Nature Made"
 *                       supplement_packaging_form: "BOTTLE"
 *                       supplement_status: "BATCH TESTED"
 *                       batch_testing_org: "NSF Certified for Sport"
 *                       product_source_url: "https://naturemade.com/vitamin-d3"
 *                   currentPage: 1
 *                   totalPages: 15
 *                   totalCount: 147
 *                   searchQuery: null
 *               withSearch:
 *                 summary: Search results for "vitamin"
 *                 value:
 *                   data:
 *                     - id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                       supplement_name: "Vitamin D3 2000 IU"
 *                       supplement_brand: "Nature Made"
 *                       supplement_packaging_form: "BOTTLE"
 *                       supplement_status: "BATCH TESTED"
 *                       batch_testing_org: "NSF Certified for Sport"
 *                       product_source_url: "https://naturemade.com/vitamin-d3"
 *                   currentPage: 1
 *                   totalPages: 3
 *                   totalCount: 27
 *                   searchQuery: "vitamin"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/supplements', controller.listSupplements);

/**
 * @swagger
 * /api/SSS/supplements/{id}:
 *   get:
 *     summary: Get Supplement Details
 *     description: |
 *       Retrieve comprehensive information about a specific supplement including:
 *       - Full supplement details (all 14 editable fields)
 *       - Stock summary (total, booked, available)
 *       - Paginated list of related inventory batches
 *       
 *       **Use Case:** UC-SSS-005 (View Supplement Details)
 *     tags: [Supplements]
 *     parameters:
 *       - $ref: '#/components/parameters/SupplementIdParam'
 *       - name: batchPage
 *         in: query
 *         description: Page number for batches list (default 1)
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *     responses:
 *       200:
 *         description: Successfully retrieved supplement details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 supplement:
 *                   allOf:
 *                     - $ref: '#/components/schemas/SupplementDetail'
 *                     - type: object
 *                       properties:
 *                         supplement_website:
 *                           type: string
 *                           description: "(Deprecated) Same as product_source_url"
 *                 stockSummary:
 *                   type: object
 *                   properties:
 *                     totalStock:
 *                       type: integer
 *                       description: Sum of all batch quantities
 *                     totalBooked:
 *                       type: integer
 *                       description: Sum of all booked quantities
 *                     available:
 *                       type: integer
 *                       description: Total available (totalStock - totalBooked)
 *                 batches:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Batch'
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalCount:
 *                       type: integer
 *             example:
 *               supplement:
 *                 id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 supplement_name: "Vitamin D3 2000 IU"
 *                 supplement_brand: "Nature Made"
 *                 supplement_packaging_form: "BOTTLE"
 *                 supplement_packaging_form_id: "p1p2p3p4-p5p6-7890-pqrs-tu1234567890"
 *                 supplement_status: "BATCH TESTED"
 *                 supplement_status_id: "9f3c014d-79e3-4454-b78b-3bde2e22889d"
 *                 batch_testing_org: "NSF Certified for Sport"
 *                 product_source_url: "https://naturemade.com/vitamin-d3"
 *                 supplement_description: "High-quality vitamin D supplement"
 *                 supplement_ingredient: ["Vitamin D3", "Gelatin", "Soybean Oil"]
 *               stockSummary:
 *                 totalStock: 500
 *                 totalBooked: 150
 *                 available: 350
 *               batches:
 *                 data:
 *                   - id: "b1b2b3b4-b5b6-7890-bcde-fg1234567890"
 *                     batch_number: "BATCH-001"
 *                     batch_status: "Approved"
 *                     batch_initial_quantity: 100
 *                     booked: 35
 *                     available: 65
 *                     batch_expiration_date: "2026-12-31"
 *                     batch_price: 29.99
 *                 currentPage: 1
 *                 totalPages: 5
 *                 totalCount: 50
 *       400:
 *         description: Invalid supplement ID format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid parameters"
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *             example:
 *               error: "Invalid parameters"
 *               details:
 *                 - field: "id"
 *                   message: "Invalid UUID format"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/supplements/:id', controller.getSupplementDetails);

/**
 * @swagger
 * /api/SSS/supplements:
 *   post:
 *     summary: Create New Supplement
 *     description: |
 *       Add a new supplement to the library.
 *       
 *       **Business Logic:**
 *       - `supplement_name` is required
 *       - `supplement_packaging_form_id` and `supplement_status_id` are required (UUIDs from lookup tables)
 *       - `approved_by` is auto-set by the backend
 *       
 *       **batch_testing_org Logic:**
 *       - If status is "BATCH TESTED" → `batch_testing_org` is REQUIRED (e.g., "NSF", "USP")
 *       - If status is "NOT BATCH TESTED" → `batch_testing_org` is auto-set to "NIL"
 *       - If status is "DISCONTINUED" → `batch_testing_org` keeps provided value
 *       
 *       **Duplicate Check:**
 *       - System checks for existing supplement with same name + brand
 *       - Returns 409 Conflict if duplicate found
 *       
 *       **Use Case:** UC-SSS-009 (Create Supplement)
 *     tags: [Supplements]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSupplementRequest'
 *           examples:
 *             minimal:
 *               summary: Minimal required fields
 *               value:
 *                 supplement_name: "Vitamin D3 2000 IU"
 *                 supplement_packaging_form_id: "607b0fac-9720-4f54-9592-1e19d8e5776a"
 *                 supplement_status_id: "9f3c014d-79e3-4454-b78b-3bde2e22889d"
 *                 batch_testing_org: "NSF Certified for Sport"
 *             complete:
 *               summary: Complete supplement with all fields
 *               value:
 *                 supplement_name: "Omega-3 Fish Oil 1000mg"
 *                 supplement_brand: "Nordic Naturals"
 *                 supplement_packaging_form_id: "607b0fac-9720-4f54-9592-1e19d8e5776a"
 *                 supplement_status_id: "9f3c014d-79e3-4454-b78b-3bde2e22889d"
 *                 batch_testing_org: "NSF Certified for Sport"
 *                 supplement_description: "High-quality omega-3 fish oil for heart health"
 *                 supplement_ingredient: ["Fish Oil", "EPA", "DHA", "Gelatin", "Glycerin"]
 *                 nutritional_info_per_100g:
 *                   energy: "500 kcal"
 *                   protein: "10g"
 *                   fat: "5g"
 *                 nutritional_info_per_serving:
 *                   calories: "10"
 *                   total_fat: "1g"
 *                   epa: "325mg"
 *                   dha: "225mg"
 *                 nutritional_info_per_serving_definition: "2 softgels"
 *                 supplement_warning_label: "Consult physician if pregnant. Keep refrigerated."
 *                 supplement_certifications: "NSF Certified for Sport, Friend of the Sea"
 *                 supplement_additional_information: "Third-party tested for purity and freshness"
 *                 product_source_url: "https://www.nordicnaturals.com/products/omega-3"
 *             notBatchTested:
 *               summary: Not batch tested supplement
 *               value:
 *                 supplement_name: "Vitamin C 1000mg"
 *                 supplement_brand: "Generic Brand"
 *                 supplement_packaging_form_id: "c39d8a4c-3e50-4f70-accd-fcbd1a6f12d0"
 *                 supplement_status_id: "9b6fb269-6dc0-4843-ad42-9aeeae8d5d7d"
 *             discontinued:
 *               summary: Discontinued supplement
 *               value:
 *                 supplement_name: "Old Formula Multivitamin"
 *                 supplement_brand: "Legacy Brand"
 *                 supplement_packaging_form_id: "607b0fac-9720-4f54-9592-1e19d8e5776a"
 *                 supplement_status_id: "28a9cdcc-19ef-4961-8479-9cc7abbc2065"
 *                 batch_testing_org: "Previously NSF Certified"
 *     responses:
 *       201:
 *         description: Supplement created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Supplement created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     supplement_name:
 *                       type: string
 *                     supplement_brand:
 *                       type: string
 *                     supplement_packaging_form_id:
 *                       type: string
 *                       format: uuid
 *                     supplement_status_id:
 *                       type: string
 *                       format: uuid
 *                     approved_by:
 *                       type: string
 *                     batch_testing_org:
 *                       type: string
 *                     supplement_input_type:
 *                       type: string
 *             example:
 *               message: "Supplement created successfully"
 *               data:
 *                 id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 supplement_name: "Vitamin D3 2000 IU"
 *                 supplement_brand: "Nature Made"
 *                 supplement_packaging_form_id: "607b0fac-9720-4f54-9592-1e19d8e5776a"
 *                 supplement_status_id: "9f3c014d-79e3-4454-b78b-3bde2e22889d"
 *                 approved_by: "SYSTEM_USER_PLACEHOLDER"
 *                 batch_testing_org: "NSF Certified for Sport"
 *                 supplement_input_type: "Manual"
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               missingRequired:
 *                 summary: Missing required fields
 *                 value:
 *                   error: "Validation failed"
 *                   details:
 *                     - field: "supplement_name"
 *                       message: "Supplement name is required"
 *               batchTestingOrgMissing:
 *                 summary: Batch testing org required for BATCH TESTED status
 *                 value:
 *                   error: "Validation failed"
 *                   details:
 *                     - field: "batch_testing_org"
 *                       message: "batch_testing_org is required when status is BATCH TESTED"
 *               invalidUUID:
 *                 summary: Invalid UUID format
 *                 value:
 *                   error: "Validation failed"
 *                   details:
 *                     - field: "supplement_packaging_form_id"
 *                       message: "Invalid UUID format"
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/supplements', controller.createSupplement);
/**
 * @swagger
 * /api/SSS/supplements/{id}:
 *   patch:
 *     summary: Update Supplement (Partial)
 *     description: |
 *       Update one or more fields of an existing supplement.
 *       
 *       **Partial Update:**
 *       - Only provide fields you want to change
 *       - All fields are optional (at least one required)
 *       - Unmodified fields remain unchanged
 *       
 *       **14 Editable Fields:**
 *       1. supplement_name
 *       2. supplement_brand
 *       3. supplement_packaging_form_id
 *       4. supplement_status_id
 *       5. batch_testing_org
 *       6. supplement_description
 *       7. supplement_ingredient
 *       8. nutritional_info_per_100g
 *       9. nutritional_info_per_serving
 *       10. nutritional_info_per_serving_definition
 *       11. supplement_warning_label
 *       12. supplement_certifications
 *       13. supplement_additional_information
 *       14. product_source_url
 *       
 *       **Business Logic on Status Change:**
 *       - If changing to "BATCH TESTED" → `batch_testing_org` becomes required
 *       - If changing to "NOT BATCH TESTED" → `batch_testing_org` auto-set to "NIL"
 *       - If changing to "DISCONTINUED" → `batch_testing_org` keeps value
 *       
 *       **Use Case:** UC-SSS-010 (Edit Supplement)
 *     tags: [Supplements]
 *     parameters:
 *       - $ref: '#/components/parameters/SupplementIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSupplementRequest'
 *           examples:
 *             updateName:
 *               summary: Update only name
 *               value:
 *                 supplement_name: "Vitamin D3 5000 IU"
 *             updateStatus:
 *               summary: Update status to NOT BATCH TESTED
 *               value:
 *                 supplement_status_id: "9b6fb269-6dc0-4843-ad42-9aeeae8d5d7d"
 *             updateMultiple:
 *               summary: Update multiple fields
 *               value:
 *                 supplement_name: "Vitamin D3 5000 IU"
 *                 supplement_description: "Updated description with more details"
 *                 product_source_url: "https://newurl.com/vitamin-d3"
 *             changeToDiscontinued:
 *               summary: Change status to DISCONTINUED
 *               value:
 *                 supplement_status_id: "28a9cdcc-d0e6-4801-8a05-b74bdd86d03c"
 *                 batch_testing_org: "Previously NSF Certified"
 *     responses:
 *       200:
 *         description: Supplement updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Supplement updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/SupplementDetail'
 *       400:
 *         description: Validation failed or no fields to update
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               noFields:
 *                 summary: No fields provided to update
 *                 value:
 *                   error: "No fields to update"
 *                   message: "Request body must contain at least one field to update"
 *               invalidUUID:
 *                 summary: Invalid UUID format
 *                 value:
 *                   error: "Validation failed"
 *                   details:
 *                     - field: "supplement_packaging_form_id"
 *                       message: "Invalid UUID format"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/supplements/:id', controller.updateSupplement);

/**
 * @swagger
 * /api/SSS/supplements:
 *   delete:
 *     summary: Delete Supplements (Bulk)
 *     description: |
 *       Permanently delete one or more supplements from the database (hard delete).
 *       
 *       **Important Notes:**
 *       - This is a PERMANENT deletion (not soft delete)
 *       - Supports bulk deletion (array of UUIDs)
 *       - May fail if foreign key constraints exist (e.g., associated batches)
 *       - Consider deleting related batches first, or use CASCADE constraints
 *       
 *       **Use Case:** UC-SSS-011 (Delete Supplement)
 *     tags: [Supplements]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 description: Array of supplement UUIDs to delete
 *             required:
 *               - ids
 *           examples:
 *             singleDelete:
 *               summary: Delete single supplement
 *               value:
 *                 ids:
 *                   - "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *             bulkDelete:
 *               summary: Delete multiple supplements
 *               value:
 *                 ids:
 *                   - "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                   - "b2c3d4e5-f6a7-8901-bcde-fg2345678901"
 *                   - "c3d4e5f6-a7b8-9012-cdef-gh3456789012"
 *     responses:
 *       200:
 *         description: Supplements deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Successfully deleted 3 supplement(s)"
 *                 deletedCount:
 *                   type: integer
 *                   description: Number of supplements deleted
 *                 deletedIds:
 *                   type: array
 *                   items:
 *                     type: string
 *                     format: uuid
 *                   description: UUIDs of deleted supplements
 *             example:
 *               message: "Successfully deleted 3 supplement(s)"
 *               deletedCount: 3
 *               deletedIds:
 *                 - "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 - "b2c3d4e5-f6a7-8901-bcde-fg2345678901"
 *                 - "c3d4e5f6-a7b8-9012-cdef-gh3456789012"
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               emptyArray:
 *                 summary: Empty IDs array
 *                 value:
 *                   error: "Validation failed"
 *                   details:
 *                     - field: "ids"
 *                       message: "Array must contain at least 1 element(s)"
 *               invalidUUID:
 *                 summary: Invalid UUID format
 *                 value:
 *                   error: "Validation failed"
 *                   details:
 *                     - field: "ids.0"
 *                       message: "Invalid UUID format"
 *       500:
 *         description: Failed to delete (possibly due to foreign key constraints)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 message:
 *                   type: string
 *             example:
 *               error: "Failed to delete supplements"
 *               message: "Cannot delete supplement because it has associated inventory batches"
 */
router.delete('/supplements', controller.deleteSupplements);

// ============================================================================
// BATCH/INVENTORY ROUTES
// ============================================================================

/**
 * @swagger
 * /api/SSS/batches:
 *   get:
 *     summary: List or Search Inventory Batches
 *     description: |
 *       Retrieve a paginated list of inventory batches with optional search functionality.
 *       
 *       **Stock Calculations:**
 *       - `booked` = Sum of all ticket quantities for the batch
 *       - `available` = batch_initial_quantity - booked
 *       - `batch_status` = Retrieved from database (not calculated)
 *       
 *       **Search Behavior:**
 *       - Searches across: batch number, supplement name, supplement brand, batch status
 *       - Multiple words require ALL matches (AND logic)
 *       - Results are ranked by relevance
 *       - Returns 10 items per page
 *       
 *       **Use Cases:** UC-SSS-003 (Show Inventory), UC-SSS-004 (Search Inventory)
 *     tags: [Inventory]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: Successfully retrieved batches
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedBatchesResponse'
 *             examples:
 *               withoutSearch:
 *                 summary: Full inventory (no search)
 *                 value:
 *                   data:
 *                     - id: "b1b2b3b4-b5b6-7890-bcde-fg1234567890"
 *                       batch_number: "BATCH-001"
 *                       batch_initial_quantity: 100
 *                       batch_expiration_date: "2026-12-31"
 *                       batch_price: 29.99
 *                       supplement_name: "Vitamin D3 2000 IU"
 *                       supplement_brand: "Nature Made"
 *                       booked: 35
 *                       available: 65
 *                       batch_status: "Approved"
 *                   currentPage: 1
 *                   totalPages: 15
 *                   totalCount: 147
 *                   searchQuery: null
 *               withSearch:
 *                 summary: Search results for "vitamin approved"
 *                 value:
 *                   data:
 *                     - id: "b1b2b3b4-b5b6-7890-bcde-fg1234567890"
 *                       batch_number: "BATCH-001"
 *                       batch_initial_quantity: 100
 *                       batch_expiration_date: "2026-12-31"
 *                       batch_price: 29.99
 *                       supplement_name: "Vitamin D3 2000 IU"
 *                       supplement_brand: "Nature Made"
 *                       booked: 35
 *                       available: 65
 *                       batch_status: "Approved"
 *                   currentPage: 1
 *                   totalPages: 2
 *                   totalCount: 18
 *                   searchQuery: "vitamin approved"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/batches', controller.listBatches);

export default router;