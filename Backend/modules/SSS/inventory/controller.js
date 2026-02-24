import * as services from './services.js';
import { getSupplementById } from '../supplements/services.js';
import {
    createBatchSchema,
    updateBatchSchema,
} from './validation.js';
import {
    bulkDeleteSchema,
    paginationSchema,
    uuidParamSchema,
    getBatchStockStatusByName,
} from '../shared/validation.js';
import { z } from 'zod';
import pool from '../../../config/db.js';

// ============================================================================
// BATCH/INVENTORY FUNCTIONS
// ============================================================================

//Use Case: Show Inventory Library, Search Inventory
export async function listBatches(req, res) {
    try {
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
 * POST /api/SSS/batches
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
        const supplement = await getSupplementById(validatedData.supplement_id);

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
        const newBatch = await services.createBatch(validatedData, req.user?.userId);
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
                batch_stock_status: availableStatus.batch_stock_status,
                date_added: newBatch.date_added
            }
        });

    } catch (error) {
        console.error('Error creating batch:', error);

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

        res.status(500).json({
            error: 'Failed to create batch',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}

/**
 * PATCH /api/SSS/batches/:id
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
                id
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
            const supplement = await getSupplementById(validatedData.supplement_id);

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
        const updatedBatch = await services.updateBatch(id, validatedData, req.user?.userId);

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

        res.status(500).json({
            error: 'Failed to update batch',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}

/**
 * DELETE /api/SSS/batches
 */
export async function deleteBatches(req, res) {
    try {
        console.log('Deleting batches...');
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
        const deletedBatches = await services.deleteBatches(ids, req.user?.userId);
        console.log(`Deleted ${deletedBatches.length} batch(es)`);

        // STEP 4: Return success response
        res.json({
            message: `Successfully deleted ${deletedBatches.length} batch(es)`,
            deletedCount: deletedBatches.length,
            deletedIds: deletedBatches.map(b => b.id)
        });

    } catch (error) {
        console.error('Error deleting batches:', error);

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

        res.status(500).json({
            error: 'Failed to delete batches',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}
