import * as services from './services.js';
import {
    createSupplementSchema,
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
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const pageSize = 10;
        const searchQuery = req.query.search || '';

        let supplements, totalCount;

        if (searchQuery.trim()) {
            [supplements, totalCount] = await Promise.all([
                services.searchSupplements(searchQuery, page, pageSize),
                services.getSearchResultCount(searchQuery)
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
            searchQuery: searchQuery.trim() || null
        });
    } catch (error) {
        console.error('Error in listSupplements:', error);
        res.status(500).json({ error: error.message });
    }
}

//Use Case: Show Inventory Library, Search Inventory
export async function listBatches(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const searchQuery = req.query.search || '';
        const pageSize = 10;

        let batches, totalCount;

        // If search query exists, use search functions
        if (searchQuery.trim()) {
            [batches, totalCount] = await Promise.all([
                services.searchBatches(searchQuery, page, pageSize),
                services.getSearchBatchCount(searchQuery)
            ]);
        } else {
            // Otherwise, use regular list functions
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
            searchQuery: searchQuery.trim() || null
        });
    } catch (error) {
        console.error('Error in listBatches:', error);
        res.status(500).json({ error: error.message });
    }
}

//Use Case: View Supplement Details
export async function getSupplementDetails(req, res) {
    try {
        const supplementId = req.params.id;
        const batchPage = Math.max(1, parseInt(req.query.batchPage) || 1);
        const batchPageSize = 10;

        // Fetch all data in parallel for performance
        const [supplement, stockSummary, batches, batchCount] = await Promise.all([
            services.getSupplementById(supplementId),
            services.getSupplementStockSummary(supplementId),
            services.getBatchesBySupplementId(supplementId, batchPage, batchPageSize),
            services.getBatchCountBySupplementId(supplementId)
        ]);

        // Check if supplement exists
        if (!supplement) {
            return res.status(404).json({
                error: 'Supplement not found',
                message: `No supplement found with ID: ${supplementId}`
            });
        }

        // Calculate batch pagination
        const totalBatchPages = Math.ceil(batchCount / batchPageSize);

        // Return comprehensive response
        res.json({
            supplement: {
                id: supplement.id,
                supplement_name: supplement.supplement_name,
                supplement_brand: supplement.supplement_brand,
                supplement_description: supplement.supplement_description || null,
                supplement_packaging_form: supplement.supplement_packaging_form || null,  // UPDATED
                supplement_status: supplement.supplement_status || null,  // NEW FIELD
                supplement_ingredient: supplement.supplement_ingredient || [],
                nutritional_info_per_100g: supplement.nutritional_info_per_100g || null,
                nutritional_info_per_serving: supplement.nutritional_info_per_serving || null,
                nutritional_info_per_serving_definition: supplement.nutritional_info_per_serving_definition || null,
                supplement_additional_information: supplement.supplement_additional_information || null,
                supplement_website: supplement.supplement_website || null,
                supplement_warning_label: supplement.supplement_warning_label || null,
                supplement_certifications: supplement.supplement_certifications || null,
                batch_testing_org: supplement.batch_testing_org || null
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
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}

//Use case: Add New Supplement
export async function createSupplement(req, res) {
    try {
        console.log('📝 Creating new supplement...');
        console.log('Request body:', req.body);

        // STEP 1: Validate the request body against schema
        console.log('Step 1: Validating schema...');
        const validatedData = createSupplementSchema.parse(req.body);
        console.log('✅ Schema validation passed');

        // STEP 2: Get the supplement status to apply business logic
        console.log('Step 2: Getting supplement status...');
        const status = await getSupplementStatusById(pool, validatedData.supplement_status_id);
        console.log(`✅ Status: ${status.supplement_status}`);

        // STEP 3: Validate and set batch_testing_org based on status
        console.log('Step 3: Validating batch_testing_org...');
        try {
            validatedData.batch_testing_org = validateBatchTestingOrg(
                status.supplement_status,
                validatedData.batch_testing_org
            );
            console.log(`✅ batch_testing_org: ${validatedData.batch_testing_org}`);
        } catch (error) {
            console.log('❌ batch_testing_org validation failed:', error.message);
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
        // TODO: Replace with actual authenticated user ID from your auth system
        // For now, using a placeholder
        validatedData.approved_by = req.user?.id || 'SYSTEM_USER_PLACEHOLDER';
        console.log(`✅ approved_by: ${validatedData.approved_by}`);

        // STEP 5: Check for duplicate supplement (name + brand)
        console.log('Step 5: Checking for duplicates...');
        const existing = await services.checkDuplicateSupplement(
            validatedData.supplement_name,
            validatedData.supplement_brand
        );

        if (existing) {
            console.log('❌ Duplicate found');
            return res.status(409).json({
                error: 'Duplicate supplement',
                message: 'A supplement with this name and brand already exists in the library'
            });
        }
        console.log('✅ No duplicate found');

        // STEP 6: Insert supplement into database
        console.log('Step 6: Inserting into database...');
        const newSupplement = await services.createSupplement(validatedData);
        console.log('✅ Supplement created with ID:', newSupplement.id);

        // STEP 7: Return success response
        res.status(201).json({
            message: 'Supplement created successfully',
            data: newSupplement
        });

    } catch (error) {
        console.error('❌ Error creating supplement:', error);

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