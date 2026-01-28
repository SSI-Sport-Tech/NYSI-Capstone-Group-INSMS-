import * as services from './services.js';
import {
    createSupplementSchema,
    updateSupplementSchema,
    bulkDeleteSchema,
    getSupplementStatusById,
    validateBatchTestingOrg,
    paginationSchema,
    uuidParamSchema,
    createBatchSchema,
    updateBatchSchema,
    getBatchStockStatusByName,
    updateStagingSupplementSchema,
    approveStagingSchema,
} from './validation.js';
import { z } from 'zod';
import pool from '../../config/db.js';

// ============================================================================
// SUPPLEMENT FUNCTIONS
// ============================================================================
//Use Case: Show Supplement Library, Search Supplement
export async function listSupplements(req, res) {
    try {
        // Use pagination schema for validation
        const { page, search } = paginationSchema.parse(req.query);
        const pageSize = 10;

        let supplements, totalCount;

        if (search && search.trim()) {
            [supplements, totalCount] = await Promise.all([
                services.searchSupplements(search, page, pageSize),
                services.getSearchResultCount(search)
            ]);
        } else {
            [supplements, totalCount] = await Promise.all([
                services.getSupplementsByPage(page, pageSize),
                services.getTotalSupplementCount()
            ]);
        }

        const totalPages = Math.ceil(totalCount / pageSize);

        res.json({
            data: supplements.rows,
            currentPage: page,
            totalPages,
            totalCount,
            searchQuery: search || null
        });
    } catch (error) {
        console.error('Error in listSupplements:', error);

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid query parameters',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        res.status(500).json({ error: error.message });
    }
}

//Use Case: View Supplement Details
export async function getSupplementDetails(req, res) {
    try {
        // Validate supplement ID
        const { id } = uuidParamSchema.parse(req.params);

        // Validate batch pagination
        const { page: batchPage } = paginationSchema.parse({
            page: req.query.batchPage || 1
        });
        const batchPageSize = 10;

        // Fetch all data in parallel for performance
        const [supplement, stockSummary, batches, batchCount] = await Promise.all([
            services.getSupplementById(id),
            services.getSupplementStockSummary(id),
            services.getBatchesBySupplementId(id, batchPage, batchPageSize),
            services.getBatchCountBySupplementId(id)
        ]);

        // Check if supplement exists
        if (!supplement) {
            return res.status(404).json({
                error: 'Supplement not found',
                message: `No supplement found with ID: ${id}`
            });
        }

        // Calculate batch pagination
        const totalBatchPages = Math.ceil(batchCount / batchPageSize);

        // Return comprehensive response - includes IDs for editing
        res.json({
            supplement: {
                id: supplement.id,
                supplement_name: supplement.supplement_name,
                supplement_brand: supplement.supplement_brand,
                supplement_description: supplement.supplement_description || null,
                supplement_packaging_form: supplement.supplement_packaging_form || null,
                supplement_packaging_form_id: supplement.supplement_packaging_form_id || null,
                supplement_status: supplement.supplement_status || null,
                supplement_status_id: supplement.supplement_status_id || null,
                supplement_ingredient: supplement.supplement_ingredient || [],
                nutritional_info_per_100g: supplement.nutritional_info_per_100g || null,
                nutritional_info_per_serving: supplement.nutritional_info_per_serving || null,
                nutritional_info_per_serving_definition: supplement.nutritional_info_per_serving_definition || null,
                supplement_additional_information: supplement.supplement_additional_information || null,
                supplement_website: supplement.product_source_url || null,
                supplement_warning_label: supplement.supplement_warning_label || null,
                supplement_certifications: supplement.supplement_certifications || null,
                batch_testing_org: supplement.batch_testing_org || null,
                product_source_url: supplement.product_source_url || null
            },
            stockSummary: {
                totalStock: stockSummary.totalStock,
                totalBooked: stockSummary.totalBooked,
                available: stockSummary.available
            },
            batches: {
                data: batches.rows.map(batch => ({
                    id: batch.id,
                    batch_number: batch.batch_number,
                    batch_status: batch.batch_status || 'Unknown',
                    batch_initial_quantity: batch.batch_initial_quantity,
                    booked: parseInt(batch.booked),
                    available: parseInt(batch.available),
                    batch_expiration_date: batch.batch_expiration_date,
                    batch_price: parseFloat(batch.batch_price) || null
                })),
                currentPage: batchPage,
                totalPages: totalBatchPages,
                totalCount: batchCount
            }
        });

    } catch (error) {
        console.error('Error in getSupplementDetails:', error);

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid parameters',
                details: error.errors.map(err => ({
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

//Use case: Add New Supplement
export async function createSupplement(req, res) {
    try {
        console.log('Creating new supplement...');
        console.log('Request body:', req.body);

        // STEP 1: Validate the request body against schema
        console.log('Step 1: Validating schema...');
        const validatedData = createSupplementSchema.parse(req.body);
        console.log('Schema validation passed');

        // STEP 2: Get the supplement status to apply business logic
        console.log('Step 2: Getting supplement status...');
        const status = await getSupplementStatusById(pool, validatedData.supplement_status_id);
        console.log(`Status: ${status.supplement_status}`);

        // STEP 3: Validate and set batch_testing_org based on status
        console.log('Step 3: Validating batch_testing_org...');
        try {
            validatedData.batch_testing_org = validateBatchTestingOrg(
                status.supplement_status,
                validatedData.batch_testing_org
            );
            console.log(`batch_testing_org: ${validatedData.batch_testing_org}`);
        } catch (error) {
            console.log('batch_testing_org validation failed:', error.message);
            return res.status(400).json({
                error: 'Validation failed',
                details: [{
                    field: 'batch_testing_org',
                    message: error.message
                }]
            });
        }

        // STEP 4: Set approved_by automatically
        console.log('Step 4: Setting approved_by...');
        const SYSTEM_USER_ID = 'e9e9f927-40f4-4f0a-bdca-a5503b5974da'; // HARDCODED SYSTEM USER ID
        validatedData.approved_by = req.user?.id || SYSTEM_USER_ID;
        console.log(`approved_by: ${validatedData.approved_by}`);

        // STEP 5: Check for duplicate supplement (name + brand)
        console.log('Step 5: Checking for duplicates...');
        const existing = await services.checkDuplicateSupplement(
            validatedData.supplement_name,
            validatedData.supplement_brand
        );

        if (existing) {
            console.log('Duplicate found');
            return res.status(409).json({
                error: 'Duplicate supplement',
                message: 'A supplement with this name and brand already exists in the library'
            });
        }
        console.log('No duplicate found');

        // STEP 6: Insert supplement into database
        console.log('Step 6: Inserting into database...');
        const newSupplement = await services.createSupplement(validatedData);
        console.log('Supplement created with ID:', newSupplement.id);

        // STEP 7: Return success response
        res.status(201).json({
            message: 'Supplement created successfully',
            data: newSupplement
        });

    } catch (error) {
        console.error('Error creating supplement:', error);

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    received: err.received
                }))
            });
        }

        // Handle database errors
        res.status(500).json({
            error: 'Failed to create supplement',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}

//Use Case: Edit Supplement
export async function updateSupplement(req, res) {
    try {
        console.log('Updating supplement...');
        console.log('Supplement ID:', req.params.id);
        console.log('Request body:', req.body);

        // STEP 1: Validate supplement ID format
        console.log('Step 1: Validating supplement ID...');
        const { id } = uuidParamSchema.parse(req.params);

        // STEP 2: Check if supplement exists
        console.log('Step 2: Checking if supplement exists...');
        const existingSupplement = await services.getSupplementById(id);

        if (!existingSupplement) {
            console.log('Supplement not found');
            return res.status(404).json({
                error: 'Supplement not found',
                message: `No supplement found with ID: ${id}`
            });
        }
        console.log('Supplement found');

        // STEP 3: Validate the request body (partial update)
        console.log('Step 3: Validating update data...');
        const validatedData = updateSupplementSchema.parse(req.body);
        console.log('Schema validation passed');

        // Check if there's anything to update
        if (Object.keys(validatedData).length === 0) {
            return res.status(400).json({
                error: 'No fields to update',
                message: 'Request body must contain at least one field to update'
            });
        }

        // STEP 4: Handle supplement_status_id change (business logic)
        console.log('Step 4: Applying business logic...');
        if (validatedData.supplement_status_id) {
            // Get the new status
            const newStatus = await getSupplementStatusById(pool, validatedData.supplement_status_id);
            console.log(`New status: ${newStatus.supplement_status}`);

            // Apply batch_testing_org logic based on new status
            try {
                validatedData.batch_testing_org = validateBatchTestingOrg(
                    newStatus.supplement_status,
                    validatedData.batch_testing_org || existingSupplement.batch_testing_org
                );
                console.log(`batch_testing_org: ${validatedData.batch_testing_org}`);
            } catch (error) {
                console.log('batch_testing_org validation failed:', error.message);
                return res.status(400).json({
                    error: 'Validation failed',
                    details: [{
                        field: 'batch_testing_org',
                        message: error.message
                    }]
                });
            }
        }

        // STEP 5: Update supplement in database
        console.log('Step 5: Updating database...');
        const updatedSupplement = await services.updateSupplement(id, validatedData);

        if (!updatedSupplement) {
            console.log('Update failed');
            return res.status(500).json({
                error: 'Failed to update supplement',
                message: 'No rows were updated'
            });
        }
        console.log('Supplement updated successfully');

        // STEP 6: Return success response
        res.json({
            message: 'Supplement updated successfully',
            data: updatedSupplement
        });

    } catch (error) {
        console.error('Error updating supplement:', error);

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    received: err.received
                }))
            });
        }

        // Handle database errors
        res.status(500).json({
            error: 'Failed to update supplement',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}

//Use Case: Delete Supplement (Hard Delete - Bulk)
export async function deleteSupplements(req, res) {
    try {
        console.log('🗑️ Deleting supplements...');
        console.log('Request body:', req.body);

        // STEP 1: Validate request body
        console.log('Step 1: Validating request...');
        const { ids } = bulkDeleteSchema.parse(req.body);
        console.log(`Validated ${ids.length} supplement ID(s)`);

        // STEP 2: Delete supplements from database
        console.log('Step 2: Deleting from database...');
        const deletedSupplements = await services.deleteSupplements(ids);
        console.log(`Deleted ${deletedSupplements.length} supplement(s)`);

        // STEP 3: Return success response
        res.json({
            message: `Successfully deleted ${deletedSupplements.length} supplement(s)`,
            deletedCount: deletedSupplements.length,
            deletedIds: deletedSupplements.map(s => s.id)
        });

    } catch (error) {
        console.error('Error deleting supplements:', error);

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    received: err.received
                }))
            });
        }

        // Handle database errors
        res.status(500).json({
            error: 'Failed to delete supplements',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}

// ============================================================================
// BATCH/INVENTORY FUNCTIONS
// ============================================================================

//Use Case: Show Inventory Library, Search Inventory
export async function listBatches(req, res) {
    try {
        // Use pagination schema for validation
        const { page, search } = paginationSchema.parse(req.query);
        const pageSize = 10;

        let batches, totalCount;

        if (search && search.trim()) {
            [batches, totalCount] = await Promise.all([
                services.searchBatches(search, page, pageSize),
                services.getSearchBatchCount(search)
            ]);
        } else {
            [batches, totalCount] = await Promise.all([
                services.getBatchesByPage(page, pageSize),
                services.getTotalBatchCount()
            ]);
        }

        const totalPages = Math.ceil(totalCount / pageSize);

        res.json({
            data: batches.rows,
            currentPage: page,
            totalPages,
            totalCount,
            searchQuery: search || null
        });
    } catch (error) {
        console.error('Error in listBatches:', error);

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid query parameters',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        res.status(500).json({ error: error.message });
    }
}
/**
 * Use Case: Create Batch (UC-SSS-012)
 * POST /api/SSS/batches
 * 
 * Creates a new inventory batch with auto-set batch_stock_status_id
 */
export async function createBatch(req, res) {
    try {
        console.log('Creating new batch...');
        console.log('Request body:', req.body);

        // STEP 1: Validate the request body against schema
        console.log('Step 1: Validating schema...');
        const validatedData = createBatchSchema.parse(req.body);
        console.log('Schema validation passed');

        // STEP 2: Auto-set batch_stock_status_id to "available"
        console.log('Step 2: Getting "available" status ID...');
        const availableStatus = await getBatchStockStatusByName(pool, 'available');
        validatedData.batch_stock_status_id = availableStatus.id;
        console.log(`batch_stock_status_id: ${validatedData.batch_stock_status_id}`);

        // STEP 3: Check if supplement exists
        console.log('Step 3: Checking if supplement exists...');
        const supplement = await services.getSupplementById(validatedData.supplement_id);

        if (!supplement) {
            console.log('Supplement not found');
            return res.status(400).json({
                error: 'Invalid supplement_id',
                message: `No supplement found with ID: ${validatedData.supplement_id}`
            });
        }
        console.log(`Supplement found: ${supplement.supplement_name}`);

        // STEP 4: Check for duplicate batch number (per supplement)
        console.log('Step 4: Checking for duplicate batch number...');
        const duplicate = await services.checkDuplicateBatchNumber(
            validatedData.supplement_id,
            validatedData.batch_number
        );

        if (duplicate) {
            console.log('Duplicate batch number found');
            return res.status(409).json({
                error: 'Duplicate batch number',
                message: `A batch with number "${validatedData.batch_number}" already exists for this supplement`
            });
        }
        console.log('No duplicate batch number found');

        // STEP 5: Insert batch into database
        console.log('Step 5: Inserting batch into database...');
        const newBatch = await services.createBatch(validatedData);
        console.log('Batch created with ID:', newBatch.id);

        // STEP 6: Return success response
        res.status(201).json({
            message: 'Batch created successfully',
            data: {
                id: newBatch.id,
                supplement_id: newBatch.supplement_id,
                batch_number: newBatch.batch_number,
                batch_initial_quantity: newBatch.batch_initial_quantity,
                batch_price: newBatch.batch_price,
                batch_expiration_date: newBatch.batch_expiration_date,
                batch_manufacture_date: newBatch.batch_manufacture_date,
                batch_stock_status_id: newBatch.batch_stock_status_id,
                batch_stock_status: availableStatus.batch_stock_status
            }
        });

    } catch (error) {
        console.error('Error creating batch:', error);

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    received: err.received
                }))
            });
        }

        // Handle database errors
        res.status(500).json({
            error: 'Failed to create batch',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}

/**
 * Use Case: Update Batch (UC-SSS-013)
 * PATCH /api/SSS/batches/:id
 * 
 * Update one or more fields of an existing batch (partial update)
 */
export async function updateBatch(req, res) {
    try {
        console.log('Updating batch...');
        console.log('Batch ID:', req.params.id);
        console.log('Request body:', req.body);

        // STEP 1: Validate batch ID format
        console.log('Step 1: Validating batch ID...');
        const { id } = uuidParamSchema.parse(req.params);

        // STEP 2: Check if batch exists
        console.log('Step 2: Checking if batch exists...');
        const existingBatch = await services.getBatchById(id);

        if (!existingBatch) {
            console.log('Batch not found');
            return res.status(404).json({
                error: 'Batch not found',
                message: `No batch found with ID: ${id}`
            });
        }
        console.log('Batch found:', existingBatch.batch_number);

        // STEP 3: Validate the request body (partial update)
        console.log('Step 3: Validating update data...');
        const validatedData = updateBatchSchema.parse(req.body);
        console.log('Schema validation passed');

        // Check if there's anything to update
        if (Object.keys(validatedData).length === 0) {
            return res.status(400).json({
                error: 'No fields to update',
                message: 'Request body must contain at least one field to update'
            });
        }

        // STEP 4: If updating batch_number, check for duplicates
        if (validatedData.batch_number && validatedData.batch_number !== existingBatch.batch_number) {
            console.log('Step 4: Checking for duplicate batch number...');
            const duplicate = await services.checkDuplicateBatchNumber(
                existingBatch.supplement_id,
                validatedData.batch_number,
                id // Exclude current batch
            );

            if (duplicate) {
                console.log('Duplicate batch number found');
                return res.status(409).json({
                    error: 'Duplicate batch number',
                    message: `A batch with number "${validatedData.batch_number}" already exists for this supplement`
                });
            }
        }

        // STEP 5: If updating supplement_id, check if new supplement exists
        if (validatedData.supplement_id && validatedData.supplement_id !== existingBatch.supplement_id) {
            console.log('Step 5: Checking if new supplement exists...');
            const supplement = await services.getSupplementById(validatedData.supplement_id);

            if (!supplement) {
                console.log('New supplement not found');
                return res.status(400).json({
                    error: 'Invalid supplement_id',
                    message: `No supplement found with ID: ${validatedData.supplement_id}`
                });
            }
            console.log(`New supplement found: ${supplement.supplement_name}`);
        }

        // STEP 6: Update batch in database
        console.log('Step 6: Updating database...');
        const updatedBatch = await services.updateBatch(id, validatedData);

        if (!updatedBatch) {
            console.log('Update failed');
            return res.status(500).json({
                error: 'Failed to update batch',
                message: 'No rows were updated'
            });
        }
        console.log('Batch updated successfully');

        // STEP 7: Return success response
        res.json({
            message: 'Batch updated successfully',
            data: updatedBatch
        });

    } catch (error) {
        console.error('Error updating batch:', error);

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    received: err.received
                }))
            });
        }

        // Handle database errors
        res.status(500).json({
            error: 'Failed to update batch',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}

/**
 * Use Case: Delete Batch (UC-SSS-014)
 * DELETE /api/SSS/batches
 * 
 * Permanently delete one or more batches from database (hard delete, bulk)
 * Prevents deletion if any batch has existing tickets
 */
export async function deleteBatches(req, res) {
    try {
        console.log('🗑️ Deleting batches...');
        console.log('Request body:', req.body);

        // STEP 1: Validate request body
        console.log('Step 1: Validating request...');
        const { ids } = bulkDeleteSchema.parse(req.body);
        console.log(`Validated ${ids.length} batch ID(s)`);

        // STEP 2: Check if any batch has tickets (prevent deletion)
        console.log('Step 2: Checking for existing tickets...');
        const batchesWithTickets = [];

        for (const batchId of ids) {
            const hasTickets = await services.checkBatchHasTickets(batchId);
            if (hasTickets) {
                const batch = await services.getBatchById(batchId);
                batchesWithTickets.push({
                    id: batchId,
                    batch_number: batch?.batch_number || 'Unknown'
                });
            }
        }

        if (batchesWithTickets.length > 0) {
            console.log('Some batches have existing tickets');
            return res.status(409).json({
                error: 'Cannot delete batches with existing tickets',
                message: 'One or more batches have inventory tickets assigned. Please remove tickets first.',
                batchesWithTickets: batchesWithTickets.map(b => ({
                    id: b.id,
                    batch_number: b.batch_number
                }))
            });
        }
        console.log('No tickets found, safe to delete');

        // STEP 3: Delete batches from database
        console.log('Step 3: Deleting from database...');
        const deletedBatches = await services.deleteBatches(ids);
        console.log(`Deleted ${deletedBatches.length} batch(es)`);

        // STEP 4: Return success response
        res.json({
            message: `Successfully deleted ${deletedBatches.length} batch(es)`,
            deletedCount: deletedBatches.length,
            deletedIds: deletedBatches.map(b => b.id)
        });

    } catch (error) {
        console.error('Error deleting batches:', error);

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    received: err.received
                }))
            });
        }

        // Handle database errors
        res.status(500).json({
            error: 'Failed to delete batches',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}

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
                details: error.errors.map(err => ({
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
                details: error.errors.map(err => ({
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
        const updatedStagingSupplement = await services.updateStagingSupplement(id, validatedData);

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

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors.map(err => ({
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
        console.log('🗑️ Deleting staging supplements...');
        console.log('Request body:', req.body);

        // STEP 1: Validate request body
        console.log('Step 1: Validating request...');
        const { ids } = bulkDeleteSchema.parse(req.body);
        console.log(`Validated ${ids.length} staging supplement ID(s)`);

        // STEP 2: Delete staging supplements from database
        console.log('Step 2: Deleting from database...');
        const deletedStagingSupplements = await services.deleteStagingSupplements(ids);
        console.log(`Deleted ${deletedStagingSupplements.length} staging supplement(s)`);

        // STEP 3: Return success response
        res.json({
            message: `Successfully deleted ${deletedStagingSupplements.length} staging supplement(s)`,
            deletedCount: deletedStagingSupplements.length,
            deletedIds: deletedStagingSupplements.map(s => s.id)
        });

    } catch (error) {
        console.error('Error deleting staging supplements:', error);

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors.map(err => ({
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
        console.log('✅ Approving staging supplements...');
        console.log('Request body:', req.body);

        // STEP 1: Validate request body
        console.log('Step 1: Validating request...');
        const { ids } = approveStagingSchema.parse(req.body);
        console.log(`Validated ${ids.length} staging supplement ID(s)`);

        // STEP 2: Process approval (service handles all business logic)
        console.log('Step 2: Processing approvals...');
        const approvalResults = await services.approveStagingSupplements(ids);
        console.log(`Processed ${approvalResults.totalProcessed} entries`);
        console.log(`Succeeded: ${approvalResults.succeeded}, Failed: ${approvalResults.failed}`);

        // STEP 3: Determine response status code
        // - 200 if all succeeded
        // - 207 Multi-Status if mixed results
        // - 400 if all failed
        let statusCode = 200;
        if (approvalResults.succeeded === 0) {
            statusCode = 400; // All failed
        } else if (approvalResults.failed > 0) {
            statusCode = 207; // Mixed results (Multi-Status)
        }

        // STEP 4: Return detailed response
        res.status(statusCode).json({
            message: `Processed ${approvalResults.totalProcessed} staging entries: ${approvalResults.succeeded} succeeded, ${approvalResults.failed} failed`,
            totalProcessed: approvalResults.totalProcessed,
            succeeded: approvalResults.succeeded,
            failed: approvalResults.failed,
            results: approvalResults.results
        });

    } catch (error) {
        console.error('Error approving staging supplements:', error);

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors.map(err => ({
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
// LOOKUP FUNCTIONS
// ============================================================================

/**
 * Get Packaging Form Options
 * GET /api/SSS/lookups/packaging-forms
 * 
 * Returns list of packaging forms for dropdown selection
 */
export async function getPackagingFormsController(req, res) {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const result = await services.getPackagingForms(!includeInactive);

        res.json({
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching packaging forms:', error);
        res.status(500).json({
            error: 'Failed to fetch packaging forms',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}

/**
 * Get Supplement Status Options
 * GET /api/SSS/lookups/supplement-statuses
 * 
 * Returns list of supplement statuses for dropdown selection
 */
export async function getSupplementStatusesController(req, res) {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const result = await services.getSupplementStatuses(!includeInactive);

        res.json({
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching supplement statuses:', error);
        res.status(500).json({
            error: 'Failed to fetch supplement statuses',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}

/**
 * Get Batch Stock Status Options
 * GET /api/SSS/lookups/batch-statuses
 * 
 * Returns list of batch stock statuses for dropdown selection
 */
export async function getBatchStockStatusesController(req, res) {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const result = await services.getBatchStockStatuses(!includeInactive);

        res.json({
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching batch stock statuses:', error);
        res.status(500).json({
            error: 'Failed to fetch batch stock statuses',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}

/**
 * Get Ticket Status Options
 * GET /api/SSS/lookups/ticket-statuses
 * 
 * Returns list of ticket statuses for dropdown selection
 */
export async function getTicketStatusesController(req, res) {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const result = await services.getTicketStatuses(!includeInactive);

        res.json({
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching ticket statuses:', error);
        res.status(500).json({
            error: 'Failed to fetch ticket statuses',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}