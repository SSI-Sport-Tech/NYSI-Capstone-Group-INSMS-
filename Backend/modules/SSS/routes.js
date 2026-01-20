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
 *                     - id: "8483aa30-ff76-42e4-b8ba-3e03aae6de4e"
 *                       supplement_name: "Vitamin D3 1000 IU"
 *                       supplement_brand: "KHOO Foods"
 *                       supplement_packaging_form: "BOTTLE"
 *                       supplement_status: "BATCH TESTED"
 *                       batch_testing_org: "TrustMeBro"
 *                       product_source_url: "https://www.nowfoods.com/products/vitamin-d3-1000-iu"
 *                   currentPage: 1
 *                   totalPages: 1
 *                   totalCount: 1
 *                   searchQuery: null
 *               withSearch:
 *                 summary: Search results for "vitamin"
 *                 value:
 *                   data:
 *                     - id: "8483aa30-ff76-42e4-b8ba-3e03aae6de4e"
 *                       supplement_name: "Vitamin D3 1000 IU"
 *                       supplement_brand: "KHOO Foods"
 *                       supplement_packaging_form: "BOTTLE"
 *                       supplement_status: "BATCH TESTED"
 *                       batch_testing_org: "TrustMeBro"
 *                       product_source_url: "https://www.nowfoods.com/products/vitamin-d3-1000-iu"
 *                   currentPage: 1
 *                   totalPages: 1
 *                   totalCount: 1
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
 *                 id: "8483aa30-ff76-42e4-b8ba-3e03aae6de4e"
 *                 supplement_name: "Vitamin D3 1000 IU"
 *                 supplement_brand: "KHOO Foods"
 *                 supplement_packaging_form: "BOTTLE"
 *                 supplement_packaging_form_id: "607b0fac-9720-4f54-9592-1e19d8e5776a"
 *                 supplement_status: "BATCH TESTED"
 *                 supplement_status_id: "9f3c014d-79e3-4454-b78b-3bde2e22889d"
 *                 batch_testing_org: "TrustMeBro"
 *                 product_source_url: "https://www.nowfoods.com/products/vitamin-d3-1000-iu"
 *                 supplement_description: "Vitamin D3 supports bone health and immune function."
 *                 supplement_ingredient: ["Vitamin D3 (Cholecalciferol)"]
 *                 nutritional_info_per_100g: {"fat_g": 0, "protein_g": 0, "energy_kcal": 0, "carbohydrate_g": 0}
 *                 nutritional_info_per_serving: {"vitamin_d_iu": 1000, "vitamin_d_mcg": 25}
 *                 nutritional_info_per_serving_definition: "Per 1 softgel serving"
 *                 supplement_warning_label: "Not suitable for children under 12."
 *                 supplement_certifications: "GMP Certified; Non-GMO"
 *                 supplement_additional_information: "Store in a cool, dry place."
 *               stockSummary:
 *                 totalStock: 0
 *                 totalBooked: 0
 *                 available: 0
 *               batches:
 *                 data: []
 *                 currentPage: 1
 *                 totalPages: 0
 *                 totalCount: 0
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
 *               summary: Minimal required fields (BATCH TESTED in BOTTLE)
 *               value:
 *                 supplement_name: "Vitamin D3 2000 IU"
 *                 supplement_packaging_form_id: "607b0fac-9720-4f54-9592-1e19d8e5776a"
 *                 supplement_status_id: "9f3c014d-79e3-4454-b78b-3bde2e22889d"
 *                 batch_testing_org: "NSF Certified for Sport"
 *                 product_source_url: ["https://example.com/vitamin-d3"]
 *             complete:
 *               summary: Complete supplement with all fields (Omega-3 Fish Oil)
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
 *                 product_source_url: ["https://www.nordicnaturals.com/products/omega-3"]
 *             notBatchTested:
 *               summary: Not batch tested supplement (TABLET)
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
 *             proteinPowder:
 *               summary: Protein Powder in TUB
 *               value:
 *                 supplement_name: "Whey Protein Isolate"
 *                 supplement_brand: "Optimum Nutrition"
 *                 supplement_packaging_form_id: "6f7ae3f3-b451-4696-b4ca-8217e948f7a8"
 *                 supplement_status_id: "9f3c014d-79e3-4454-b78b-3bde2e22889d"
 *                 batch_testing_org: "Informed Sport"
 *                 supplement_description: "Premium whey protein isolate"
 *             proteinBar:
 *               summary: Protein Bar
 *               value:
 *                 supplement_name: "Quest Protein Bar Chocolate Chip"
 *                 supplement_brand: "Quest Nutrition"
 *                 supplement_packaging_form_id: "382749cb-383b-4949-b46c-c815ca2ebc73"
 *                 supplement_status_id: "9b6fb269-6dc0-4843-ad42-9aeeae8d5d7d"
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
 *                 id: "new-uuid-generated"
 *                 supplement_name: "Vitamin D3 2000 IU"
 *                 supplement_brand: null
 *                 supplement_packaging_form_id: "607b0fac-9720-4f54-9592-1e19d8e5776a"
 *                 supplement_status_id: "9f3c014d-79e3-4454-b78b-3bde2e22889d"
 *                 approved_by: "e9e9f927-40f4-4f0a-bdca-a5503b5974da"
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
 *                 supplement_status_id: "28a9cdcc-19ef-4961-8479-9cc7abbc2065"
 *                 batch_testing_org: "Previously NSF Certified"
 *             changePackaging:
 *               summary: Change packaging form to TABLET
 *               value:
 *                 supplement_packaging_form_id: "c39d8a4c-3e50-4f70-accd-fcbd1a6f12d0"
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
 *               summary: Delete single supplement (use real ID from your database)
 *               value:
 *                 ids:
 *                   - "8483aa30-ff76-42e4-b8ba-3e03aae6de4e"
 *             bulkDelete:
 *               summary: Delete multiple supplements (replace with real IDs)
 *               value:
 *                 ids:
 *                   - "uuid-1-here"
 *                   - "uuid-2-here"
 *                   - "uuid-3-here"
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
 *                   example: "Successfully deleted 1 supplement(s)"
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
 *               message: "Successfully deleted 1 supplement(s)"
 *               deletedCount: 1
 *               deletedIds:
 *                 - "8483aa30-ff76-42e4-b8ba-3e03aae6de4e"
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
 *                   data: []
 *                   currentPage: 1
 *                   totalPages: 0
 *                   totalCount: 0
 *                   searchQuery: null
 *               withSearch:
 *                 summary: Search results for "vitamin"
 *                 value:
 *                   data: []
 *                   currentPage: 1
 *                   totalPages: 0
 *                   totalCount: 0
 *                   searchQuery: "vitamin"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/batches', controller.listBatches);


/**
 * @swagger
 * /api/SSS/batches:
 *   post:
 *     summary: Create New Batch
 *     description: |
 *       Add a new inventory batch to the database.
 *       
 *       **Business Logic:**
 *       - `supplement_id`, `batch_number`, and `batch_initial_quantity` are required
 *       - `batch_stock_status_id` is auto-set to "available" by backend
 *       - `batch_number` must be unique per supplement (409 if duplicate)
 *       - `batch_price` can be zero but not negative
 *       - No validation on dates (trust user input)
 *       
 *       **Use Case:** UC-SSS-012 (Create Batch)
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               supplement_id:
 *                 type: string
 *                 format: uuid
 *                 description: Reference to Supplement table
 *               batch_number:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Unique batch/lot number
 *                 example: "BATCH-001"
 *               batch_initial_quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Initial quantity in batch
 *                 example: 100
 *               batch_price:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0
 *                 description: Price per unit (can be 0, not negative)
 *                 example: 29.99
 *               batch_expiration_date:
 *                 type: string
 *                 format: date
 *                 description: Expiration date (no validation)
 *                 example: "2026-12-31"
 *               batch_manufacture_date:
 *                 type: string
 *                 format: date
 *                 description: Manufacturing date (no validation)
 *                 example: "2026-01-15"
 *             required:
 *               - supplement_id
 *               - batch_number
 *               - batch_initial_quantity
 *           examples:
 *             minimal:
 *               summary: Minimal required fields
 *               value:
 *                 supplement_id: "8483aa30-ff76-42e4-b8ba-3e03aae6de4e"
 *                 batch_number: "BATCH-001"
 *                 batch_initial_quantity: 100
 *             complete:
 *               summary: Complete batch with all optional fields
 *               value:
 *                 supplement_id: "8483aa30-ff76-42e4-b8ba-3e03aae6de4e"
 *                 batch_number: "BATCH-015"
 *                 batch_initial_quantity: 200
 *                 batch_price: 24.99
 *                 batch_expiration_date: "2027-06-30"
 *                 batch_manufacture_date: "2026-01-15"
 *             zeroPrice:
 *               summary: Batch with zero price (free sample)
 *               value:
 *                 supplement_id: "8483aa30-ff76-42e4-b8ba-3e03aae6de4e"
 *                 batch_number: "SAMPLE-001"
 *                 batch_initial_quantity: 50
 *                 batch_price: 0
 *     responses:
 *       201:
 *         description: Batch created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Batch created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     supplement_id:
 *                       type: string
 *                       format: uuid
 *                     batch_number:
 *                       type: string
 *                     batch_initial_quantity:
 *                       type: integer
 *                     batch_price:
 *                       type: number
 *                     batch_expiration_date:
 *                       type: string
 *                       format: date
 *                     batch_manufacture_date:
 *                       type: string
 *                       format: date
 *                     batch_stock_status_id:
 *                       type: string
 *                       format: uuid
 *                     batch_stock_status:
 *                       type: string
 *                       example: "available"
 *       400:
 *         description: Validation failed or invalid supplement_id
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
 *                     - field: "batch_number"
 *                       message: "Batch number is required"
 *               invalidSupplement:
 *                 summary: Invalid supplement_id
 *                 value:
 *                   error: "Invalid supplement_id"
 *                   message: "No supplement found with ID: ..."
 *               negativePrice:
 *                 summary: Negative price not allowed
 *                 value:
 *                   error: "Validation failed"
 *                   details:
 *                     - field: "batch_price"
 *                       message: "Price cannot be negative"
 *       409:
 *         description: Duplicate batch number for this supplement
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
 *               error: "Duplicate batch number"
 *               message: 'A batch with number "BATCH-001" already exists for this supplement'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/batches', controller.createBatch);

/**
 * @swagger
 * /api/SSS/batches/{id}:
 *   patch:
 *     summary: Update Batch (Partial)
 *     description: |
 *       Update one or more fields of an existing batch.
 *       
 *       **Partial Update:**
 *       - Only provide fields you want to change
 *       - All fields are optional (at least one required)
 *       - Unmodified fields remain unchanged
 *       - Cannot update `batch_stock_status_id` via this endpoint
 *       
 *       **Editable Fields:**
 *       1. supplement_id
 *       2. batch_number
 *       3. batch_initial_quantity (no validation - trusts user)
 *       4. batch_price
 *       5. batch_expiration_date
 *       6. batch_manufacture_date
 *       
 *       **Use Case:** UC-SSS-013 (Edit Batch)
 *     tags: [Inventory]
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Batch UUID
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               supplement_id:
 *                 type: string
 *                 format: uuid
 *               batch_number:
 *                 type: string
 *               batch_initial_quantity:
 *                 type: integer
 *               batch_price:
 *                 type: number
 *               batch_expiration_date:
 *                 type: string
 *                 format: date
 *               batch_manufacture_date:
 *                 type: string
 *                 format: date
 *           examples:
 *             updateQuantity:
 *               summary: Update only quantity
 *               value:
 *                 batch_initial_quantity: 150
 *             updatePrice:
 *               summary: Update only price
 *               value:
 *                 batch_price: 34.99
 *             updateMultiple:
 *               summary: Update multiple fields
 *               value:
 *                 batch_number: "BATCH-001-REVISED"
 *                 batch_price: 27.99
 *                 batch_expiration_date: "2027-12-31"
 *             updateSupplement:
 *               summary: Move batch to different supplement
 *               value:
 *                 supplement_id: "new-supplement-uuid-here"
 *     responses:
 *       200:
 *         description: Batch updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Batch updated successfully"
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation failed or no fields to update
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Batch not found
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
 *               error: "Batch not found"
 *               message: "No batch found with ID: ..."
 *       409:
 *         description: Duplicate batch number for this supplement
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 message:
 *                   type: string
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/batches/:id', controller.updateBatch);

/**
 * @swagger
 * /api/SSS/batches:
 *   delete:
 *     summary: Delete Batches (Bulk)
 *     description: |
 *       Permanently delete one or more batches from the database (hard delete).
 *       
 *       **Important Notes:**
 *       - This is a PERMANENT deletion (not soft delete)
 *       - Supports bulk deletion (array of UUIDs)
 *       - **Prevents deletion if batch has existing tickets** (409 Conflict)
 *       - Returns list of batches that couldn't be deleted due to tickets
 *       
 *       **Use Case:** UC-SSS-014 (Delete Batch)
 *     tags: [Inventory]
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
 *                 description: Array of batch UUIDs to delete
 *             required:
 *               - ids
 *           examples:
 *             singleDelete:
 *               summary: Delete single batch
 *               value:
 *                 ids:
 *                   - "batch-uuid-here"
 *             bulkDelete:
 *               summary: Delete multiple batches
 *               value:
 *                 ids:
 *                   - "batch-uuid-1"
 *                   - "batch-uuid-2"
 *                   - "batch-uuid-3"
 *     responses:
 *       200:
 *         description: Batches deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Successfully deleted 2 batch(es)"
 *                 deletedCount:
 *                   type: integer
 *                   description: Number of batches deleted
 *                 deletedIds:
 *                   type: array
 *                   items:
 *                     type: string
 *                     format: uuid
 *                   description: UUIDs of deleted batches
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
 *       409:
 *         description: Cannot delete batches with existing tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 message:
 *                   type: string
 *                 batchesWithTickets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       batch_number:
 *                         type: string
 *             example:
 *               error: "Cannot delete batches with existing tickets"
 *               message: "One or more batches have inventory tickets assigned. Please remove tickets first."
 *               batchesWithTickets:
 *                 - id: "batch-uuid-1"
 *                   batch_number: "BATCH-001"
 *                 - id: "batch-uuid-2"
 *                   batch_number: "BATCH-005"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/batches', controller.deleteBatches);

export default router;