import express from 'express';
import * as controller from './controller.js';
import { authenticateToken } from '../../../modules/Auth/authMiddleware.js';

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
 *     tags: [SSS - Supplements]
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
 *     tags: [SSS - Supplements]
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
 *     tags: [SSS - Supplements]
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
 *       Add a new supplement to the library with automatic vectorization.
 *
 *       **Required Fields:**
 *       - `supplement_name` - Name of the supplement
 *       - `supplement_packaging_form_id` - UUID from packaging form lookup
 *       - `supplement_status_id` - UUID from status lookup
 *       - `supplement_ingredient` - Array of ingredient names (required for vectorization)
 *       - At least ONE of `nutritional_info_per_100g` OR `nutritional_info_per_serving` (required for vectorization)
 *
 *       **Vectorization:**
 *       - Vectors are automatically generated for similarity search
 *       - Python vectorization service must be running on port 8001
 *       - `vector_100g_ingredient` generated if `nutritional_info_per_100g` provided
 *       - `vector_perserving_ingredient` generated if `nutritional_info_per_serving` provided
 *
 *       **batch_testing_org Logic:**
 *       - If status is "BATCH TESTED" -> `batch_testing_org` is REQUIRED (e.g., "NSF", "USP")
 *       - If status is "NOT BATCH TESTED" -> `batch_testing_org` is auto-set to "NIL"
 *       - If status is "DISCONTINUED" -> `batch_testing_org` keeps provided value
 *
 *       **Auto-Set Fields:**
 *       - `approved_by` - Set by backend
 *       - `supplement_input_type` - Set to "Manual"
 *       - `vector_100g_ingredient` / `vector_perserving_ingredient` - Generated by vectorization service
 *
 *       **Duplicate Check:**
 *       - System checks for existing supplement with same name + brand
 *       - Returns 409 Conflict if duplicate found
 *
 *       **Use Case:** UC-SSS-009 (Create Supplement)
 *     tags: [SSS - Supplements]
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
 *                 supplement_ingredient: ["Vitamin D3", "MCT Oil", "Gelatin"]
 *                 nutritional_info_per_serving:
 *                   vitamin_d: "2000 IU"
 *                   calories: "10"
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
 *                 supplement_ingredient: ["Ascorbic Acid", "Citrus Bioflavonoids", "Rose Hips"]
 *                 nutritional_info_per_serving:
 *                   vitamin_c: "1000mg"
 *                   calories: "5"
 *             discontinued:
 *               summary: Discontinued supplement
 *               value:
 *                 supplement_name: "Old Formula Multivitamin"
 *                 supplement_brand: "Legacy Brand"
 *                 supplement_packaging_form_id: "607b0fac-9720-4f54-9592-1e19d8e5776a"
 *                 supplement_status_id: "28a9cdcc-19ef-4961-8479-9cc7abbc2065"
 *                 batch_testing_org: "Previously NSF Certified"
 *                 supplement_ingredient: ["Vitamin A", "Vitamin C", "Vitamin D", "Zinc"]
 *                 nutritional_info_per_serving:
 *                   vitamin_a: "900mcg"
 *                   vitamin_c: "90mg"
 *                   vitamin_d: "20mcg"
 *                   zinc: "11mg"
 *             proteinPowder:
 *               summary: Protein Powder in TUB
 *               value:
 *                 supplement_name: "Whey Protein Isolate"
 *                 supplement_brand: "Optimum Nutrition"
 *                 supplement_packaging_form_id: "6f7ae3f3-b451-4696-b4ca-8217e948f7a8"
 *                 supplement_status_id: "9f3c014d-79e3-4454-b78b-3bde2e22889d"
 *                 batch_testing_org: "Informed Sport"
 *                 supplement_description: "Premium whey protein isolate"
 *                 supplement_ingredient: ["Whey Protein Isolate", "Lecithin", "Natural Flavors"]
 *                 nutritional_info_per_100g:
 *                   protein: "90g"
 *                   carbohydrates: "3g"
 *                   fat: "1g"
 *                   calories: "380"
 *                 nutritional_info_per_serving:
 *                   protein: "25g"
 *                   carbohydrates: "1g"
 *                   fat: "0g"
 *                   calories: "110"
 *                 nutritional_info_per_serving_definition: "1 scoop (30g)"
 *             proteinBar:
 *               summary: Protein Bar
 *               value:
 *                 supplement_name: "Quest Protein Bar Chocolate Chip"
 *                 supplement_brand: "Quest Nutrition"
 *                 supplement_packaging_form_id: "382749cb-383b-4949-b46c-c815ca2ebc73"
 *                 supplement_status_id: "9b6fb269-6dc0-4843-ad42-9aeeae8d5d7d"
 *                 supplement_ingredient: ["Protein Blend", "Soluble Corn Fiber", "Almonds", "Chocolate Chips"]
 *                 nutritional_info_per_serving:
 *                   protein: "21g"
 *                   carbohydrates: "21g"
 *                   fiber: "14g"
 *                   fat: "9g"
 *                   calories: "200"
 *                 nutritional_info_per_serving_definition: "1 bar (60g)"
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
 *               vectorization:
 *                 vector_100g_ingredient: null
 *                 vector_perserving_ingredient: "generated"
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
 *               missingIngredients:
 *                 summary: Missing required ingredients
 *                 value:
 *                   error: "Validation failed"
 *                   details:
 *                     - field: "supplement_ingredient"
 *                       message: "At least one ingredient is required for vectorization"
 *               missingNutritionalInfo:
 *                 summary: Missing nutritional info (at least one type required)
 *                 value:
 *                   error: "Validation failed"
 *                   details:
 *                     - field: "nutritional_info"
 *                       message: "At least one of nutritional_info_per_100g or nutritional_info_per_serving is required for vectorization"
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
router.post('/supplements', authenticateToken, controller.createSupplement);

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
 *       - If changing to "BATCH TESTED" -> `batch_testing_org` becomes required
 *       - If changing to "NOT BATCH TESTED" -> `batch_testing_org` auto-set to "NIL"
 *       - If changing to "DISCONTINUED" -> `batch_testing_org` keeps value
 *
 *       **Use Case:** UC-SSS-010 (Edit Supplement)
 *     tags: [SSS - Supplements]
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
router.patch('/supplements/:id', authenticateToken, controller.updateSupplement);



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
 *     tags: [SSS - Supplements]
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
router.delete('/supplements', authenticateToken, controller.deleteSupplements);

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
 *     tags: [SSS - Lookups]
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
 *     tags: [SSS - Lookups]
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
 *     tags: [SSS - Lookups]
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
 *     tags: [SSS - Lookups]
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

/**
 * @swagger
 * /api/SSS/lookups/batch-testing-orgs:
 *   get:
 *     summary: Get Batch Testing Organisations
 *     description: Returns all active batch testing organisation options from the lookup table.
 *     tags: [SSS - Lookups]
 *     responses:
 *       200:
 *         description: Successfully retrieved batch testing organisations
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/lookups/batch-testing-orgs', controller.getBatchTestingOrgsController);

export default router;
