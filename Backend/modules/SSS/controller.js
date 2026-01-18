import * as services from './services.js';
import {
    createSupplementSchema,
    updateSupplementSchema,
    bulkDeleteSchema,
    getSupplementStatusById,
    validateBatchTestingOrg,
    paginationSchema,
    uuidParamSchema
} from './validation.js';
import { z } from 'zod';
import pool from '../../config/db.js';

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
        validatedData.approved_by = req.user?.id || null;
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
        console.log('✅ No duplicate found');

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