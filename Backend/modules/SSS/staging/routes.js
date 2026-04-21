// Routes for CRUD for staging, CRUD for Catalog Url, and starting scraping job

import express from 'express';
import * as controller from './controller.js';
import { authenticateToken } from '../../../modules/Auth/authMiddleware.js';

const router = express.Router();

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
 *     tags: [SSS - Staging]
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
// Lookup values for packaging form and status dropdowns (no auth required)
router.get('/staging-lookups', controller.listStagingLookups);

/**
 * @swagger
 * /api/SSS/staging-lookups:
 *   get:
 *     summary: Get Staging Lookup Values
 *     description: |
 *       Retrieve lookup values used for dropdowns in the Supplement Staging UI.
 *
 *       **Includes:**
 *       - Packaging forms (e.g., TUB, CAPSULE)
 *       - Supplement statuses (e.g., NOT BATCH TESTED, BATCH TESTED)
 *
 *       **Behavior:**
 *       - No authentication required
 *       - Values are sorted alphabetically
 *
 *       **Use Case:** Populate dropdown fields when creating/editing staging supplements
 *     tags: [SSS - Staging]
 *     responses:
 *       200:
 *         description: Successfully retrieved lookup values
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 packagingForms:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       supplement_packaging_form:
 *                         type: string
 *                 statuses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       supplement_status:
 *                         type: string
 *             example:
 *               packagingForms:
 *                 - id: "uuid-1"
 *                   supplement_packaging_form: "TUB"
 *                 - id: "uuid-2"
 *                   supplement_packaging_form: "CAPSULE"
 *               statuses:
 *                 - id: "uuid-1"
 *                   supplement_status: "NOT BATCH TESTED"
 *                 - id: "uuid-2"
 *                   supplement_status: "BATCH TESTED"
 *       500:
 *         description: Failed to fetch lookup values
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             example:
 *               error: "Internal server error"
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
 *     tags: [SSS - Staging]
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
 *     tags: [SSS - Staging]
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
router.patch('/staging-supplements/:id', authenticateToken, controller.updateStagingSupplement);

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
 *     tags: [SSS - Staging]
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
router.delete('/staging-supplements', authenticateToken, controller.deleteStagingSupplements);

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
 *       - `promoted_to_supplement_id` = Set on staging entry, linking to the created supplement
 *
 *       **Response Codes:**
 *       - 200: All succeeded
 *       - 207 Multi-Status: Mixed results (some succeeded, some failed)
 *       - 400: All failed
 *
 *       **Use Case:** Verifying Supplement Staging
 *     tags: [SSS - Staging]
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
router.post('/staging-supplements/approve', authenticateToken, controller.approveStagingSupplements);

// ============================================================================
// CATALOG URL MANAGEMENT ROUTES
// ============================================================================

/**
 * @swagger
 * /api/SSS/catalog-urls:
 *   get:
 *     summary: List Catalog URLs
 *     description: |
 *       Get paginated list of all catalog URLs for web scraping.
 *
 *       **Catalog URLs:**
 *       - Product listing pages to scrape (e.g., iHerb vitamins page)
 *       - Can be activated/deactivated
 *       - Users can select which ones to scrape
 *     tags: [SSS - Catalog URLs]
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
router.get('/catalog-urls', controller.listCatalogUrls);

/**
 * @swagger
 * /api/SSS/catalog-urls/{id}:
 *   get:
 *     summary: Get Catalog URL Details
 *     description: Retrieve details of a specific catalog URL
 *     tags: [SSS - Catalog URLs]
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
router.get('/catalog-urls/:id', controller.getCatalogUrlDetails);

/**
 * @swagger
 * /api/SSS/catalog-urls:
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
 *     tags: [SSS - Catalog URLs]
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
router.post('/catalog-urls', authenticateToken, controller.createCatalogUrl);

/**
 * @swagger
 * /api/SSS/catalog-urls/{id}:
 *   patch:
 *     summary: Update Catalog URL
 *     description: Update one or more fields of a catalog URL
 *     tags: [SSS - Catalog URLs]
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
router.patch('/catalog-urls/:id', authenticateToken, controller.updateCatalogUrl);

/**
 * @swagger
 * /api/SSS/catalog-urls:
 *   delete:
 *     summary: Delete Catalog URLs (Bulk)
 *     description: Permanently delete one or more catalog URLs
 *     tags: [SSS - Catalog URLs]
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
router.delete('/catalog-urls', authenticateToken, controller.deleteCatalogUrls);

// ============================================================================
// SCRAPING ROUTE
// ============================================================================

/**
 * @swagger
 * /api/SSS/scraping/start:
 *   post:
 *     summary: Start Web Scraping (Background)
 *     description: |
 *       Initiates web scraping in the background. Returns immediately.
 *
 *       **URL Selection:**
 *       - If `catalog_url_ids` not provided -> Scrapes ALL active catalog URLs
 *       - If `catalog_url_ids` provided -> Scrapes only selected URLs
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
 *     tags: [SSS - Scraping]
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
router.post('/scraping/start', controller.startScrapingJob);
router.get('/scraping/schedule', controller.getSchedulerConfig);
router.patch('/scraping/schedule', authenticateToken, controller.updateSchedulerConfig);

export default router;
