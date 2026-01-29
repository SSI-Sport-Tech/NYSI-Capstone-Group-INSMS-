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
 * /api/SSS/supplements/{id}/alternatives:
 *   get:
 *     summary: Get Alternative Supplements (Similarity Search)
 *     description: |
 *       Find similar supplements based on ingredient and nutritional vector embeddings.
 *       
 *       **Similarity Calculation:**
 *       - Uses cosine similarity on both `vector_100g_ingredient` and `vector_perserving_ingredient`
 *       - Shows BOTH similarity scores (per 100g and per serving)
 *       - Orders results by the HIGHER of the two scores
 *       - Minimum threshold: 60% similarity
 *       
 *       **Stock Status Logic:**
 *       - "Available": At least one batch with "AVAILABLE" status
 *       - "Low Stock": At least one batch with "LOW STOCK" status (no available)
 *       - "Out of Stock": No batches or no available/low stock batches
 *       
 *       **Exclusions:**
 *       - Current supplement (excluded from results)
 *       - Supplements with "DISCONTINUED" status
 *       
 *       **Use Case:** Find alternative supplements when primary is out of stock
 *     tags: [Supplements]
 *     parameters:
 *       - $ref: '#/components/parameters/SupplementIdParam'
 *       - name: page
 *         in: query
 *         description: Page number (default 1)
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *     responses:
 *       200:
 *         description: Successfully retrieved alternative supplements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currentSupplementId:
 *                   type: string
 *                   format: uuid
 *                   description: ID of the supplement being compared
 *                 currentSupplementName:
 *                   type: string
 *                   description: Name of the supplement being compared
 *                 alternatives:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       supplement_name:
 *                         type: string
 *                       supplement_brand:
 *                         type: string
 *                         nullable: true
 *                       similarity_score_100g:
 *                         type: string
 *                         description: Similarity based on per-100g nutrition (e.g., "87%")
 *                         nullable: true
 *                       similarity_score_perserving:
 *                         type: string
 *                         description: Similarity based on per-serving nutrition (e.g., "92%")
 *                         nullable: true
 *                       supplement_status:
 *                         type: string
 *                         description: Status from lookup table
 *                       stock_status:
 *                         type: string
 *                         enum: [Available, Low Stock, Out of Stock]
 *                         description: Calculated stock availability
 *                 currentPage:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalCount:
 *                   type: integer
 *                 threshold:
 *                   type: number
 *                   description: Minimum similarity threshold (0.6 = 60%)
 *                 message:
 *                   type: string
 *                   description: Optional message (e.g., when no results found)
 *             examples:
 *               withResults:
 *                 summary: Found alternative supplements
 *                 value:
 *                   currentSupplementId: "8483aa30-ff76-42e4-b8ba-3e03aae6de4e"
 *                   currentSupplementName: "Vitamin D3 2000 IU"
 *                   alternatives:
 *                     - id: "new-uuid-1"
 *                       supplement_name: "Vitamin D3 5000 IU"
 *                       supplement_brand: "NOW Foods"
 *                       similarity_score_100g: "92%"
 *                       similarity_score_perserving: "87%"
 *                       supplement_status: "BATCH TESTED"
 *                       stock_status: "Available"
 *                     - id: "new-uuid-2"
 *                       supplement_name: "Vitamin D3 1000 IU"
 *                       supplement_brand: "Nature Made"
 *                       similarity_score_100g: "85%"
 *                       similarity_score_perserving: null
 *                       supplement_status: "NOT BATCH TESTED"
 *                       stock_status: "Low Stock"
 *                   currentPage: 1
 *                   totalPages: 2
 *                   totalCount: 15
 *                   threshold: 0.6
 *               noResults:
 *                 summary: No alternatives found
 *                 value:
 *                   currentSupplementId: "8483aa30-ff76-42e4-b8ba-3e03aae6de4e"
 *                   currentSupplementName: "Unique Supplement"
 *                   alternatives: []
 *                   currentPage: 1
 *                   totalPages: 0
 *                   totalCount: 0
 *                   threshold: 0.6
 *                   message: "No alternative supplements found matching the similarity threshold (60%)"
 *       400:
 *         description: Supplement has no vectors for similarity matching
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
 *               error: "No vectors available"
 *               message: "This supplement does not have embedding vectors for similarity matching. Alternatives cannot be found."
 *       404:
 *         description: Supplement not found
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
 *               error: "Supplement not found"
 *               message: "No supplement found with ID: ..."
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/supplements/:id/alternatives', controller.getAlternativeSupplements);

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
// ============================================================================
// SUPPLEMENT STAGING ROUTES
// ============================================================================

/**
 * @swagger
 * /api/SSS/staging-supplements:
 *   get:
 *     summary: List Supplement Staging Entries
 *     description: |
 *       Retrieve a paginated list of unreviewed supplement staging entries.
 *       
 *       **Display Behavior:**
 *       - Only shows entries with `is_reviewed = false`
 *       - No search functionality (staging is pre-filtered)
 *       - Returns 10 items per page
 *       - Ordered by ID (newest first)
 *       
 *       **Use Case:** View Supplement Staging Library
 *     tags: [Staging]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *     responses:
 *       200:
 *         description: Successfully retrieved staging supplements
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedStagingSupplementsResponse'
 *             example:
 *               data:
 *                 - id: "staging-uuid-1"
 *                   supplement_name: "Protein Powder Vanilla"
 *                   supplement_brand: "Optimum Nutrition"
 *                   supplement_packaging_form: "TUB"
 *                   supplement_status: "NOT BATCH TESTED"
 *                   product_source_url: ["https://example.com/protein"]
 *                   is_reviewed: false
 *               currentPage: 1
 *               totalPages: 3
 *               totalCount: 25
 *               searchQuery: null
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/staging-supplements', controller.listStagingSupplements);

/**
 * @swagger
 * /api/SSS/staging-supplements/{id}:
 *   get:
 *     summary: Get Staging Supplement Details
 *     description: |
 *       Retrieve full details of a specific supplement staging entry.
 *       
 *       **Information Displayed:**
 *       - All editable fields (same as supplement details)
 *       - Display names AND IDs for dropdowns
 *       - No stock information (staging doesn't have batches)
 *       - Includes `is_reviewed` status
 *       
 *       **Use Case:** View Supplement Staging Details
 *     tags: [Staging]
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Staging Supplement UUID
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully retrieved staging supplement details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StagingSupplementDetail'
 *             example:
 *               id: "staging-uuid-1"
 *               supplement_name: "Protein Powder Vanilla"
 *               supplement_brand: "Optimum Nutrition"
 *               supplement_description: "High-quality whey protein isolate"
 *               supplement_packaging_form: "TUB"
 *               supplement_packaging_form_id: "6f7ae3f3-b451-4696-b4ca-8217e948f7a8"
 *               supplement_status: "NOT BATCH TESTED"
 *               supplement_status_id: "9b6fb269-6dc0-4843-ad42-9aeeae8d5d7d"
 *               supplement_ingredient: ["Whey Protein Isolate", "Natural Flavors"]
 *               nutritional_info_per_100g: {"protein": "80g", "fat": "2g"}
 *               nutritional_info_per_serving: {"protein": "24g", "calories": "120"}
 *               nutritional_info_per_serving_definition: "1 scoop (30g)"
 *               supplement_warning_label: null
 *               supplement_certifications: "Informed Sport"
 *               supplement_additional_information: null
 *               batch_testing_org: "NIL"
 *               product_source_url: ["https://example.com/protein"]
 *               scraper_version: "1.0.0"
 *               is_reviewed: false
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         description: Staging supplement not found
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
 *               error: "Staging supplement not found"
 *               message: "No staging supplement found with ID: ..."
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/staging-supplements/:id', controller.getStagingSupplementDetails);

/**
 * @swagger
 * /api/SSS/staging-supplements/{id}:
 *   patch:
 *     summary: Edit Staging Supplement
 *     description: |
 *       Update one or more fields of a supplement staging entry.
 *       
 *       **Partial Update:**
 *       - Only provide fields you want to change
 *       - All fields are optional (at least one required)
 *       - Unmodified fields remain unchanged
 *       - More flexible than production supplements (only name required)
 *       
 *       **Editable Fields:**
 *       Same as supplement, except:
 *       - Cannot edit: `scraper_catalog_url_id` (read-only)
 *       - Cannot edit: `is_reviewed` (managed by approval workflow)
 *       
 *       **Use Case:** Edit Supplement Staging
 *     tags: [Staging]
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Staging Supplement UUID
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStagingSupplementRequest'
 *           examples:
 *             updateName:
 *               summary: Update only name
 *               value:
 *                 supplement_name: "Whey Protein Isolate Vanilla"
 *             addMissingFields:
 *               summary: Add missing required fields for approval
 *               value:
 *                 supplement_packaging_form_id: "6f7ae3f3-b451-4696-b4ca-8217e948f7a8"
 *                 supplement_status_id: "9b6fb269-6dc0-4843-ad42-9aeeae8d5d7d"
 *             updateMultiple:
 *               summary: Update multiple fields
 *               value:
 *                 supplement_name: "Premium Whey Protein"
 *                 supplement_description: "Corrected description"
 *                 supplement_ingredient: ["Whey Protein Isolate", "Natural Flavors", "Stevia"]
 *     responses:
 *       200:
 *         description: Staging supplement updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Staging supplement updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/StagingSupplementDetail'
 *       400:
 *         description: Validation failed or no fields to update
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       404:
 *         description: Staging supplement not found
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
router.patch('/staging-supplements/:id', controller.updateStagingSupplement);

/**
 * @swagger
 * /api/SSS/staging-supplements:
 *   delete:
 *     summary: Delete Staging Supplements (Bulk)
 *     description: |
 *       Permanently delete one or more staging supplements (hard delete).
 *       
 *       **Important Notes:**
 *       - This is a PERMANENT deletion (not soft delete)
 *       - Supports bulk deletion (array of UUIDs)
 *       - Only unreviewed entries appear in the list (UI prevents selecting reviewed entries)
 *       - No validation checks needed (entries won't be in list if reviewed)
 *       
 *       **Use Case:** Delete Supplement Staging
 *     tags: [Staging]
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
 *                 description: Array of staging supplement UUIDs to delete
 *             required:
 *               - ids
 *           examples:
 *             singleDelete:
 *               summary: Delete single staging entry
 *               value:
 *                 ids:
 *                   - "staging-uuid-1"
 *             bulkDelete:
 *               summary: Delete multiple staging entries
 *               value:
 *                 ids:
 *                   - "staging-uuid-1"
 *                   - "staging-uuid-2"
 *                   - "staging-uuid-3"
 *     responses:
 *       200:
 *         description: Staging supplements deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Successfully deleted 2 staging supplement(s)"
 *                 deletedCount:
 *                   type: integer
 *                 deletedIds:
 *                   type: array
 *                   items:
 *                     type: string
 *                     format: uuid
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/staging-supplements', controller.deleteStagingSupplements);

/**
 * @swagger
 * /api/SSS/staging-supplements/approve:
 *   post:
 *     summary: Approve Staging Supplements (Bulk)
 *     description: |
 *       Approve one or more staging entries and create corresponding supplements.
 *       
 *       **Approval Process:**
 *       1. Validate required fields (packaging_form_id, status_id)
 *       2. Apply batch_testing_org business logic
 *       3. Create supplement with `supplement_input_type = 'Scraper'`
 *       4. Mark staging entry as reviewed (`is_reviewed = true`)
 *       5. Generate vectors (TODO - not implemented yet)
 *       
 *       **Auto-Set Fields:**
 *       - `approved_by` = System user (hardcoded)
 *       - `supplement_input_type` = 'Scraper'
 *       - `supplement_staging_id` = Links back to staging entry
 *       
 *       **Response Codes:**
 *       - 200: All succeeded
 *       - 207 Multi-Status: Mixed results (some succeeded, some failed)
 *       - 400: All failed
 *       
 *       **Use Case:** Verifying Supplement Staging
 *     tags: [Staging]
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
 *                 description: Array of staging supplement UUIDs to approve
 *             required:
 *               - ids
 *           examples:
 *             singleApproval:
 *               summary: Approve single staging entry
 *               value:
 *                 ids:
 *                   - "staging-uuid-1"
 *             batchApproval:
 *               summary: Approve multiple staging entries
 *               value:
 *                 ids:
 *                   - "staging-uuid-1"
 *                   - "staging-uuid-2"
 *                   - "staging-uuid-3"
 *     responses:
 *       200:
 *         description: All staging entries approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApprovalResponse'
 *             example:
 *               message: "Processed 2 staging entries: 2 succeeded, 0 failed"
 *               totalProcessed: 2
 *               succeeded: 2
 *               failed: 0
 *               results:
 *                 - staging_id: "staging-uuid-1"
 *                   staging_name: "Protein Powder Vanilla"
 *                   status: "success"
 *                   supplement_id: "new-supplement-uuid-1"
 *                   vectorization:
 *                     vector_100g: "not implemented - TODO"
 *                     vector_perserving: "not implemented - TODO"
 *                 - staging_id: "staging-uuid-2"
 *                   staging_name: "BCAA Capsules"
 *                   status: "success"
 *                   supplement_id: "new-supplement-uuid-2"
 *                   vectorization:
 *                     vector_100g: "not implemented - TODO"
 *                     vector_perserving: "not implemented - TODO"
 *       207:
 *         description: Mixed results - some succeeded, some failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApprovalResponse'
 *             example:
 *               message: "Processed 3 staging entries: 2 succeeded, 1 failed"
 *               totalProcessed: 3
 *               succeeded: 2
 *               failed: 1
 *               results:
 *                 - staging_id: "staging-uuid-1"
 *                   staging_name: "Protein Powder"
 *                   status: "success"
 *                   supplement_id: "new-supplement-uuid-1"
 *                   vectorization:
 *                     vector_100g: "not implemented - TODO"
 *                     vector_perserving: "not implemented - TODO"
 *                 - staging_id: "staging-uuid-2"
 *                   staging_name: "Incomplete Entry"
 *                   status: "failed"
 *                   reason: "Missing required fields: supplement_packaging_form_id, supplement_status_id"
 *                   supplement_id: null
 *                 - staging_id: "staging-uuid-3"
 *                   staging_name: "BCAA Batch Tested"
 *                   status: "failed"
 *                   reason: "batch_testing_org is required when status is BATCH TESTED"
 *                   supplement_id: null
 *       400:
 *         description: All entries failed or validation error
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationError'
 *                 - $ref: '#/components/schemas/ApprovalResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/staging-supplements/approve', controller.approveStagingSupplements);

// ============================================================================
// LOOKUP ROUTES
// ============================================================================

/**
 * @swagger
 * /api/SSS/lookups/packaging-forms:
 *   get:
 *     summary: Get Packaging Form Options
 *     description: |
 *       Returns list of packaging form options for dropdown selection.
 *       
 *       **Default Behavior:**
 *       - Returns only active packaging forms (`is_active = true`)
 *       - Sorted alphabetically by name
 *       
 *       **Use Case:** Populate dropdowns in supplement create/edit forms
 *     tags: [Lookups]
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include inactive packaging forms (default false)
 *         example: false
 *     responses:
 *       200:
 *         description: Successfully retrieved packaging forms
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         description: Packaging form ID
 *                       label:
 *                         type: string
 *                         description: Packaging form name
 *             example:
 *               data:
 *                 - id: "607b0fac-9720-4f54-9592-1e19d8e5776a"
 *                   label: "BOTTLE"
 *                 - id: "382749cb-383b-4949-b46c-c815ca2ebc73"
 *                   label: "BAR"
 *                 - id: "637d71cf-2992-4c11-b654-8f199f716df7"
 *                   label: "BOX"
 *                 - id: "257044dd-16eb-4c23-a676-abbfbc54ac7b"
 *                   label: "PACK"
 *                 - id: "92ed0e40-b010-44e8-8ab0-1435b7ce49a1"
 *                   label: "SACHET"
 *                 - id: "c39d8a4c-3e50-4f70-accd-fcbd1a6f12d0"
 *                   label: "TABLET"
 *                 - id: "6f7ae3f3-b451-4696-b4ca-8217e948f7a8"
 *                   label: "TUB"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/lookups/packaging-forms', controller.getPackagingFormsController);

/**
 * @swagger
 * /api/SSS/lookups/supplement-statuses:
 *   get:
 *     summary: Get Supplement Status Options
 *     description: |
 *       Returns list of supplement status options for dropdown selection.
 *       
 *       **Status Options:**
 *       - BATCH TESTED - Requires batch_testing_org
 *       - NOT BATCH TESTED - Auto-sets batch_testing_org to "NIL"
 *       - DISCONTINUED - Keeps existing batch_testing_org
 *       
 *       **Default Behavior:**
 *       - Returns only active statuses (`is_active = true`)
 *       - Sorted alphabetically by name
 *       
 *       **Use Case:** Populate dropdowns in supplement create/edit forms
 *     tags: [Lookups]
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include inactive statuses (default false)
 *         example: false
 *     responses:
 *       200:
 *         description: Successfully retrieved supplement statuses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         description: Status ID
 *                       label:
 *                         type: string
 *                         description: Status name
 *             example:
 *               data:
 *                 - id: "9f3c014d-79e3-4454-b78b-3bde2e22889d"
 *                   label: "BATCH TESTED"
 *                 - id: "28a9cdcc-19ef-4961-8479-9cc7abbc2065"
 *                   label: "DISCONTINUED"
 *                 - id: "9b6fb269-6dc0-4843-ad42-9aeeae8d5d7d"
 *                   label: "NOT BATCH TESTED"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/lookups/supplement-statuses', controller.getSupplementStatusesController);

/**
 * @swagger
 * /api/SSS/lookups/batch-statuses:
 *   get:
 *     summary: Get Batch Stock Status Options
 *     description: |
 *       Returns list of batch stock status options for dropdown selection.
 *       
 *       **Status Examples:**
 *       - Approved - Tested and ready for use
 *       - Pending - Awaiting testing
 *       - Quarantined - Quality issues
 *       - Expired - Past expiration date
 *       
 *       **Default Behavior:**
 *       - Returns only active statuses (`is_active = true`)
 *       - Sorted alphabetically by name
 *       - New batches auto-set to "available" status
 *       
 *       **Use Case:** Populate dropdowns in batch management interfaces
 *     tags: [Lookups]
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include inactive statuses (default false)
 *         example: false
 *     responses:
 *       200:
 *         description: Successfully retrieved batch stock statuses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         description: Status ID
 *                       label:
 *                         type: string
 *                         description: Status name
 *             example:
 *               data:
 *                 - id: "status-uuid-1"
 *                   label: "Approved"
 *                 - id: "status-uuid-2"
 *                   label: "Pending"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/lookups/batch-statuses', controller.getBatchStockStatusesController);

/**
 * @swagger
 * /api/SSS/lookups/ticket-statuses:
 *   get:
 *     summary: Get Ticket Status Options
 *     description: |
 *       Returns list of ticket status options for dropdown selection.
 *       
 *       **Status Examples:**
 *       - Confirmed - Ticket approved
 *       - Pending - Awaiting approval
 *       - Cancelled - Ticket cancelled
 *       - Fulfilled - Items distributed
 *       
 *       **Default Behavior:**
 *       - Returns only active statuses (`is_active = true`)
 *       - Sorted alphabetically by name
 *       
 *       **Use Case:** Populate dropdowns in ticket management interfaces
 *     tags: [Lookups]
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include inactive statuses (default false)
 *         example: false
 *     responses:
 *       200:
 *         description: Successfully retrieved ticket statuses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         description: Status ID
 *                       label:
 *                         type: string
 *                         description: Status name
 *             example:
 *               data:
 *                 - id: "status-uuid-1"
 *                   label: "Confirmed"
 *                 - id: "status-uuid-2"
 *                   label: "Pending"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/lookups/ticket-statuses', controller.getTicketStatusesController);

// ============================================================================
// ADMIN - CATALOG URL MANAGEMENT ROUTES
// ============================================================================

/**
 * @swagger
 * /api/SSS/admin/catalog-urls:
 *   get:
 *     summary: List Catalog URLs
 *     description: |
 *       Get paginated list of all catalog URLs for web scraping.
 *       
 *       **Catalog URLs:**
 *       - Product listing pages to scrape (e.g., iHerb vitamins page)
 *       - Can be activated/deactivated
 *       - Admin can select which ones to scrape
 *     tags: [Admin - Catalog URLs]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *     responses:
 *       200:
 *         description: Successfully retrieved catalog URLs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       product_catalog_website:
 *                         type: string
 *                       is_active:
 *                         type: boolean
 *                 currentPage:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalCount:
 *                   type: integer
 *             example:
 *               data:
 *                 - id: "uuid-1"
 *                   product_catalog_website: "https://iherb.com/vitamins"
 *                   is_active: true
 *               currentPage: 1
 *               totalPages: 1
 *               totalCount: 1
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/admin/catalog-urls', controller.listCatalogUrls);

/**
 * @swagger
 * /api/SSS/admin/catalog-urls/{id}:
 *   get:
 *     summary: Get Catalog URL Details
 *     description: Retrieve details of a specific catalog URL
 *     tags: [Admin - Catalog URLs]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully retrieved catalog URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 product_catalog_website:
 *                   type: string
 *                 is_active:
 *                   type: boolean
 *       404:
 *         description: Catalog URL not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/admin/catalog-urls/:id', controller.getCatalogUrlDetails);

/**
 * @swagger
 * /api/SSS/admin/catalog-urls:
 *   post:
 *     summary: Create Catalog URL
 *     description: |
 *       Add a new catalog URL for web scraping.
 *       
 *       **Required:**
 *       - product_catalog_website (must be unique)
 *       
 *       **Optional:**
 *       - is_active (default: true)
 *       
 *       **Note:** number_of_catalog_page is deprecated and set to NULL automatically
 *     tags: [Admin - Catalog URLs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               product_catalog_website:
 *                 type: string
 *                 format: uri
 *               is_active:
 *                 type: boolean
 *             required:
 *               - product_catalog_website
 *           examples:
 *             basic:
 *               summary: Add iHerb catalog
 *               value:
 *                 product_catalog_website: "https://iherb.com/vitamins"
 *                 is_active: true
 *             shopee:
 *               summary: Add Shopee catalog
 *               value:
 *                 product_catalog_website: "https://shopee.sg/Protein-Powders-cat.123"
 *                 is_active: true
 *     responses:
 *       201:
 *         description: Catalog URL created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     product_catalog_website:
 *                       type: string
 *                     is_active:
 *                       type: boolean
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Duplicate catalog URL
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/admin/catalog-urls', controller.createCatalogUrl);

/**
 * @swagger
 * /api/SSS/admin/catalog-urls/{id}:
 *   patch:
 *     summary: Update Catalog URL
 *     description: Update one or more fields of a catalog URL
 *     tags: [Admin - Catalog URLs]
 *     parameters:
 *       - name: id
 *         in: path
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
 *               product_catalog_website:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *           examples:
 *             deactivate:
 *               summary: Deactivate catalog
 *               value:
 *                 is_active: false
 *             updateUrl:
 *               summary: Update URL
 *               value:
 *                 product_catalog_website: "https://iherb.com/vitamins-updated"
 *     responses:
 *       200:
 *         description: Catalog URL updated successfully
 *       400:
 *         description: Validation failed or no fields to update
 *       404:
 *         description: Catalog URL not found
 *       409:
 *         description: Duplicate catalog URL
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/admin/catalog-urls/:id', controller.updateCatalogUrl);

/**
 * @swagger
 * /api/SSS/admin/catalog-urls:
 *   delete:
 *     summary: Delete Catalog URLs (Bulk)
 *     description: Permanently delete one or more catalog URLs
 *     tags: [Admin - Catalog URLs]
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
 *             required:
 *               - ids
 *           examples:
 *             singleDelete:
 *               summary: Delete single catalog
 *               value:
 *                 ids: ["uuid-1"]
 *             bulkDelete:
 *               summary: Delete multiple catalogs
 *               value:
 *                 ids: ["uuid-1", "uuid-2", "uuid-3"]
 *     responses:
 *       200:
 *         description: Catalog URLs deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedCount:
 *                   type: integer
 *                 deletedIds:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Validation failed
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/admin/catalog-urls', controller.deleteCatalogUrls);

// ============================================================================
// ADMIN - SCRAPING ROUTE
// ============================================================================

/**
 * @swagger
 * /api/SSS/admin/scraping/start:
 *   post:
 *     summary: Start Web Scraping (Background)
 *     description: |
 *       Initiates web scraping in the background. Returns immediately.
 *       
 *       **URL Selection:**
 *       - If `catalog_url_ids` not provided → Scrapes ALL active catalog URLs
 *       - If `catalog_url_ids` provided → Scrapes only selected URLs
 *       
 *       **Process:**
 *       1. Reads catalog URLs from database (all active or selected)
 *       2. Submits to Python webscraper service (one request per URL)
 *       3. Returns immediately (user can continue working)
 *       4. Scraper writes results to SSS.Supplement_Staging
 *       5. Check "Staging Supplements" page later to review results
 *       
 *       **Requirements:**
 *       - Python service must be running at PYTHON_SERVICE_URL (default: http://localhost:8001)
 *       - Catalog URLs must exist in webscraper_catalog_url table
 *       
 *       **No Job Tracking:**
 *       - Simple fire-and-forget approach
 *       - Results appear in Staging Supplements (is_reviewed = false)
 *     tags: [Admin - Scraping]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               catalog_url_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Optional array of catalog URL IDs to scrape
 *           examples:
 *             scrapeAll:
 *               summary: Scrape all active catalogs
 *               value: {}
 *             scrapeSelected:
 *               summary: Scrape specific catalogs
 *               value:
 *                 catalog_url_ids: ["uuid-1", "uuid-2"]
 *     responses:
 *       202:
 *         description: Scraping started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 catalogs_to_scrape:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       url:
 *                         type: string
 *                 total_catalogs:
 *                   type: integer
 *                 info:
 *                   type: string
 *             example:
 *               message: "Scraping started successfully"
 *               catalogs_to_scrape:
 *                 - id: "uuid-1"
 *                   url: "https://iherb.com/vitamins"
 *               total_catalogs: 1
 *               info: "Scraping is running in the background. Check 'Staging Supplements' page later to review results."
 *       400:
 *         description: No active catalog URLs or selected URLs not found
 *       500:
 *         description: Failed to start scraping
 */
router.post('/admin/scraping/start', controller.startScrapingJob);

export default router;