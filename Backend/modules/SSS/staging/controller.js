import * as services from './services.js';
import {
    updateStagingSupplementSchema,
    approveStagingSchema,
    createCatalogUrlSchema,
    updateCatalogUrlSchema,
    startScrapingSchema,
} from './validation.js';
import {
    bulkDeleteSchema,
    paginationSchema,
    uuidParamSchema,
} from '../shared/validation.js';
import { z } from 'zod';

// ============================================================================
// SUPPLEMENT STAGING FUNCTIONS
// ============================================================================

/**
 * Use Case: View Supplement Staging Library
 * GET /api/SSS/staging-supplements?page={pageNumber}
 *
 * Retrieves paginated list of unreviewed supplement staging entries
 */
export async function listStagingSupplements(req, res) {
    try {
        // Use pagination schema for validation (no search for staging)
        const { page } = paginationSchema.parse(req.query);
        const pageSize = 10;

        const [stagingSupplements, totalCount] = await Promise.all([
            services.getStagingSupplementsByPage(page, pageSize),
            services.getTotalStagingCount()
        ]);

        const totalPages = Math.ceil(totalCount / pageSize);

        res.json({
            data: stagingSupplements.rows,
            currentPage: page,
            totalPages,
            totalCount,
            searchQuery: null
        });
    } catch (error) {
        console.error('Error in listStagingSupplements:', error);

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid query parameters',
                details: error.issues.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        res.status(500).json({ error: error.message });
    }
}

/**
 * Use Case: View Supplement Staging Details
 * GET /api/SSS/staging-supplements/:id
 *
 * Retrieves full details of a specific supplement staging entry
 */
export async function getStagingSupplementDetails(req, res) {
    try {
        // Validate staging supplement ID
        const { id } = uuidParamSchema.parse(req.params);

        // Fetch staging supplement details
        const stagingSupplement = await services.getStagingSupplementById(id);

        // Check if staging supplement exists
        if (!stagingSupplement) {
            return res.status(404).json({
                error: 'Staging supplement not found',
                message: `No staging supplement found with ID: ${id}`
            });
        }

        // Return comprehensive response - includes IDs for editing
        res.json({
            id: stagingSupplement.id,
            supplement_name: stagingSupplement.supplement_name,
            supplement_brand: stagingSupplement.supplement_brand,
            supplement_description: stagingSupplement.supplement_description || null,
            supplement_packaging_form: stagingSupplement.supplement_packaging_form || null,
            supplement_packaging_form_id: stagingSupplement.supplement_packaging_form_id || null,
            supplement_status: stagingSupplement.supplement_status || null,
            supplement_status_id: stagingSupplement.supplement_status_id || null,
            supplement_ingredient: stagingSupplement.supplement_ingredient || [],
            nutritional_info_per_100g: stagingSupplement.nutritional_info_per_100g || null,
            nutritional_info_per_serving: stagingSupplement.nutritional_info_per_serving || null,
            nutritional_info_per_serving_definition: stagingSupplement.nutritional_info_per_serving_definition || null,
            supplement_warning_label: stagingSupplement.supplement_warning_label || null,
            supplement_certifications: stagingSupplement.supplement_certifications || null,
            supplement_additional_information: stagingSupplement.supplement_additional_information || null,
            batch_testing_org: stagingSupplement.batch_testing_org || null,
            product_source_url: stagingSupplement.product_source_url || null,
            scraper_version: stagingSupplement.scraper_version || null,
            is_reviewed: stagingSupplement.is_reviewed
        });

    } catch (error) {
        console.error('Error in getStagingSupplementDetails:', error);

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid parameters',
                details: error.issues.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}

/**
 * Use Case: Edit Supplement Staging
 * PATCH /api/SSS/staging-supplements/:id
 *
 * Update one or more fields of a supplement staging entry (partial update)
 */
export async function updateStagingSupplement(req, res) {
    try {
        console.log('Updating supplement staging...');
        console.log('Staging ID:', req.params.id);
        console.log('Request body:', req.body);

        // STEP 1: Validate staging supplement ID format
        console.log('Step 1: Validating staging supplement ID...');
        const { id } = uuidParamSchema.parse(req.params);

        // STEP 2: Check if staging supplement exists
        console.log('Step 2: Checking if staging supplement exists...');
        const existingStagingSupplement = await services.getStagingSupplementById(id);

        if (!existingStagingSupplement) {
            console.log('Staging supplement not found');
            return res.status(404).json({
                error: 'Staging supplement not found',
                message: `No staging supplement found with ID: ${id}`
            });
        }
        console.log('Staging supplement found');

        // STEP 3: Validate the request body (partial update)
        console.log('Step 3: Validating update data...');
        const validatedData = updateStagingSupplementSchema.parse(req.body);
        console.log('Schema validation passed');

        // Check if there's anything to update
        if (Object.keys(validatedData).length === 0) {
            return res.status(400).json({
                error: 'No fields to update',
                message: 'Request body must contain at least one field to update'
            });
        }

        // STEP 4: Update staging supplement in database
        console.log('Step 4: Updating database...');
        const updatedStagingSupplement = await services.updateStagingSupplement(id, validatedData, req.user?.userId);

        if (!updatedStagingSupplement) {
            console.log('Update failed');
            return res.status(500).json({
                error: 'Failed to update staging supplement',
                message: 'No rows were updated'
            });
        }
        console.log('Staging supplement updated successfully');

        // STEP 5: Return success response
        res.json({
            message: 'Staging supplement updated successfully',
            data: updatedStagingSupplement
        });

    } catch (error) {
        console.error('Error updating staging supplement:', error);

        // Handle Zod validation errors (Zod v4 uses 'issues', older versions use 'errors')
        if (error instanceof z.ZodError) {
            const zodErrors = error.issues || error.errors || [];
            return res.status(400).json({
                error: 'Validation failed',
                details: zodErrors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    received: err.received
                }))
            });
        }

        // Handle database errors
        res.status(500).json({
            error: 'Failed to update staging supplement',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}

/**
 * Use Case: Delete Supplement Staging
 * DELETE /api/SSS/staging-supplements
 *
 * Permanently delete one or more staging supplements (hard delete, bulk)
 */
export async function deleteStagingSupplements(req, res) {
    try {
        console.log('Deleting staging supplements...');
        console.log('Request body:', req.body);

        // STEP 1: Validate request body
        console.log('Step 1: Validating request...');
        const { ids } = bulkDeleteSchema.parse(req.body);
        console.log(`Validated ${ids.length} staging supplement ID(s)`);

        // STEP 2: Delete staging supplements from database
        console.log('Step 2: Deleting from database...');
        const deletedStagingSupplements = await services.deleteStagingSupplements(ids, req.user?.userId);
        console.log(`Deleted ${deletedStagingSupplements.length} staging supplement(s)`);

        // STEP 3: Return success response
        res.json({
            message: `Successfully deleted ${deletedStagingSupplements.length} staging supplement(s)`,
            deletedCount: deletedStagingSupplements.length,
            deletedIds: deletedStagingSupplements.map(s => s.id)
        });

    } catch (error) {
        console.error('Error deleting staging supplements:', error);

        // Handle Zod validation errors (Zod v4 uses 'issues', older versions use 'errors')
        if (error instanceof z.ZodError) {
            const zodErrors = error.issues || error.errors || [];
            return res.status(400).json({
                error: 'Validation failed',
                details: zodErrors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    received: err.received
                }))
            });
        }

        // Handle database errors
        res.status(500).json({
            error: 'Failed to delete staging supplements',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}

/**
 * Use Case: Verifying Supplement Staging
 * POST /api/SSS/staging-supplements/approve
 *
 * Approve staging entries and create corresponding supplements
 * Supports batch approval (multiple staging entries at once)
 */
export async function approveStagingSupplements(req, res) {
    try {
        console.log('Approving staging supplements...');
        console.log('Request body:', req.body);

        // STEP 1: Validate request body
        console.log('Step 1: Validating request...');
        const { ids } = approveStagingSchema.parse(req.body);
        console.log(`Validated ${ids.length} staging supplement ID(s)`);

        // STEP 2: Process approval (service handles all business logic)
        console.log('Step 2: Processing approvals...');
        const approvalResults = await services.approveStagingSupplements(ids, req.user?.userId);
        console.log(`Processed ${approvalResults.totalProcessed} entries`);
        console.log(`Succeeded: ${approvalResults.succeeded}, Failed: ${approvalResults.failed}, Duplicates: ${approvalResults.duplicates}`);

        // STEP 3: Determine response status code
        // - 200 if no failures (all succeeded, all duplicates, or mix of success+duplicate)
        // - 207 Multi-Status if there are failures mixed with successes/duplicates
        // - 400 if all failed (no successes, no duplicates)
        let statusCode = 200;
        const hasSuccesses = approvalResults.succeeded > 0;
        const hasDuplicates = approvalResults.duplicates > 0;
        const hasFailures = approvalResults.failed > 0;

        if (hasFailures) {
            if (hasSuccesses || hasDuplicates) {
                statusCode = 207; // Mixed results
            } else {
                statusCode = 400; // All failed
            }
        }
        // else: 200 (no failures - could be all success, all duplicate, or mix)

        // STEP 4: Build response message
        const messageParts = [];
        if (approvalResults.succeeded > 0) {
            messageParts.push(`${approvalResults.succeeded} approved`);
        }
        if (approvalResults.duplicates > 0) {
            messageParts.push(`${approvalResults.duplicates} duplicate${approvalResults.duplicates > 1 ? 's' : ''} removed`);
        }
        if (approvalResults.failed > 0) {
            messageParts.push(`${approvalResults.failed} failed`);
        }

        // STEP 5: Return detailed response
        res.status(statusCode).json({
            message: `Processed ${approvalResults.totalProcessed} staging entries: ${messageParts.join(', ')}`,
            totalProcessed: approvalResults.totalProcessed,
            succeeded: approvalResults.succeeded,
            duplicates: approvalResults.duplicates,
            failed: approvalResults.failed,
            results: approvalResults.results
        });

    } catch (error) {
        console.error('Error approving staging supplements:', error);

        // Handle Zod validation errors (Zod v4 uses 'issues', older versions use 'errors')
        if (error instanceof z.ZodError) {
            const zodErrors = error.issues || error.errors || [];
            return res.status(400).json({
                error: 'Validation failed',
                details: zodErrors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    received: err.received
                }))
            });
        }

        // Handle database errors
        res.status(500).json({
            error: 'Failed to approve staging supplements',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}

// ============================================================================
// CATALOG URL MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * List all catalog URLs (paginated)
 * GET /api/admin/catalog-urls?page=1
 */
export async function listCatalogUrls(req, res) {
    try {
        const { page } = paginationSchema.parse(req.query);
        const pageSize = 10;

        const [catalogUrls, totalCount] = await Promise.all([
            services.getCatalogUrls(page, pageSize),
            services.getTotalCatalogUrlCount()
        ]);

        const totalPages = Math.ceil(totalCount / pageSize);

        res.json({
            data: catalogUrls.rows,
            currentPage: page,
            totalPages,
            totalCount
        });

    } catch (error) {
        console.error('Error listing catalog URLs:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid query parameters',
                details: error.issues.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        res.status(500).json({
            error: 'Failed to list catalog URLs',
            message: error.message
        });
    }
}

/**
 * Get catalog URL by ID
 * GET /api/admin/catalog-urls/:id
 */
export async function getCatalogUrlDetails(req, res) {
    try {
        const { id } = uuidParamSchema.parse(req.params);

        const catalogUrl = await services.getCatalogUrlById(id);

        if (!catalogUrl) {
            return res.status(404).json({
                error: 'Catalog URL not found',
                message: `No catalog URL found with ID: ${id}`
            });
        }

        res.json(catalogUrl);

    } catch (error) {
        console.error('Error getting catalog URL:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid parameters',
                details: error.issues.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        res.status(500).json({
            error: 'Failed to get catalog URL',
            message: error.message
        });
    }
}

/**
 * Create new catalog URL
 * POST /api/admin/catalog-urls
 */
export async function createCatalogUrl(req, res) {
    try {
        console.log('Creating new catalog URL...');
        console.log('Request body:', req.body);

        // Validate request
        const validatedData = createCatalogUrlSchema.parse(req.body);

        // Check for duplicate URL
        const duplicate = await services.checkDuplicateCatalogUrl(validatedData.product_catalog_website);

        if (duplicate) {
            return res.status(409).json({
                error: 'Duplicate catalog URL',
                message: 'This catalog URL already exists in the database'
            });
        }

        // Create catalog URL
        const newCatalogUrl = await services.createCatalogUrl(validatedData, req.user?.userId);

        console.log('Catalog URL created:', newCatalogUrl.id);

        res.status(201).json({
            message: 'Catalog URL created successfully',
            data: newCatalogUrl
        });

    } catch (error) {
        console.error('Error creating catalog URL:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        res.status(500).json({
            error: 'Failed to create catalog URL',
            message: error.message
        });
    }
}

/**
 * Update catalog URL
 * PATCH /api/admin/catalog-urls/:id
 */
export async function updateCatalogUrl(req, res) {
    try {
        console.log('Updating catalog URL...');
        console.log('Catalog URL ID:', req.params.id);
        console.log('Request body:', req.body);

        // Validate ID
        const { id } = uuidParamSchema.parse(req.params);

        // Check if exists
        const existingCatalogUrl = await services.getCatalogUrlById(id);

        if (!existingCatalogUrl) {
            return res.status(404).json({
                error: 'Catalog URL not found',
                message: `No catalog URL found with ID: ${id}`
            });
        }

        // Validate update data
        const validatedData = updateCatalogUrlSchema.parse(req.body);

        // Check if there's anything to update
        if (Object.keys(validatedData).length === 0) {
            return res.status(400).json({
                error: 'No fields to update',
                message: 'Request body must contain at least one field to update'
            });
        }

        // Check for duplicate URL if changing URL
        if (validatedData.product_catalog_website &&
            validatedData.product_catalog_website !== existingCatalogUrl.product_catalog_website) {
            const duplicate = await services.checkDuplicateCatalogUrl(validatedData.product_catalog_website, id);

            if (duplicate) {
                return res.status(409).json({
                    error: 'Duplicate catalog URL',
                    message: 'This catalog URL already exists in the database'
                });
            }
        }

        // Update catalog URL
        const updatedCatalogUrl = await services.updateCatalogUrl(id, validatedData, req.user?.userId);

        console.log('Catalog URL updated successfully');

        res.json({
            message: 'Catalog URL updated successfully',
            data: updatedCatalogUrl
        });

    } catch (error) {
        console.error('Error updating catalog URL:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        res.status(500).json({
            error: 'Failed to update catalog URL',
            message: error.message
        });
    }
}

/**
 * Delete catalog URLs (bulk)
 * DELETE /api/admin/catalog-urls
 */
export async function deleteCatalogUrls(req, res) {
    try {
        console.log('Deleting catalog URLs...');
        console.log('Request body:', req.body);

        // Validate request
        const { ids } = bulkDeleteSchema.parse(req.body);

        // Delete catalog URLs
        const deletedCatalogUrls = await services.deleteCatalogUrls(ids, req.user?.userId);

        console.log(`Deleted ${deletedCatalogUrls.length} catalog URL(s)`);

        res.json({
            message: `Successfully deleted ${deletedCatalogUrls.length} catalog URL(s)`,
            deletedCount: deletedCatalogUrls.length,
            deletedIds: deletedCatalogUrls.map(c => c.id)
        });

    } catch (error) {
        console.error('Error deleting catalog URLs:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        res.status(500).json({
            error: 'Failed to delete catalog URLs',
            message: error.message
        });
    }
}

// ============================================================================
// SCRAPING FUNCTION
// ============================================================================

/**
 * Start scraping job (fire-and-forget with URL selection)
 * POST /api/admin/scraping/start
 */
export async function startScrapingJob(req, res) {
    try {
        console.log('Starting scraping job...');
        console.log('Request body:', req.body);

        // Validate request (optional catalog_url_ids)
        const { catalog_url_ids } = startScrapingSchema.parse(req.body);

        // Get catalog URLs (all active, or selected)
        const catalogUrlRecords = await services.getActiveCatalogUrls(catalog_url_ids);

        if (catalogUrlRecords.length === 0) {
            return res.status(400).json({
                error: 'No catalog URLs to scrape',
                message: catalog_url_ids
                    ? 'Selected catalog URLs are either inactive or not found'
                    : 'No active catalog URLs found. Please add catalog URLs first.'
            });
        }

        console.log(`Found ${catalogUrlRecords.length} catalog URL(s) to scrape`);

        // Fire async requests to Python webscraper service
        const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';

        // Call your existing /scrape-full endpoint for each catalog URL
        const scrapePromises = catalogUrlRecords.map(record =>
            fetch(`${PYTHON_SERVICE_URL}/api/webscraper/scrape-full`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    catalog_url: record.product_catalog_website,
                    push_to_staging: true
                })
            })
                .then(response => {
                    if (!response.ok) {
                        console.error(`Failed to scrape ${record.product_catalog_website}: ${response.statusText}`);
                    }
                    return response;
                })
                .catch(err => {
                    console.error(`Failed to submit scraping for ${record.product_catalog_website}:`, err);
                })
        );

        // Fire all requests (don't await, fire-and-forget)
        Promise.all(scrapePromises);

        // Return immediately
        res.status(202).json({
            message: 'Scraping started successfully',
            catalogs_to_scrape: catalogUrlRecords.map(r => ({
                id: r.id,
                url: r.product_catalog_website
            })),
            total_catalogs: catalogUrlRecords.length,
            info: 'Scraping is running in the background. Check "Staging Supplements" page later to review results.'
        });

    } catch (error) {
        console.error('Error starting scraping job:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        res.status(500).json({
            error: 'Failed to start scraping job',
            message: error.message
        });
    }
}
