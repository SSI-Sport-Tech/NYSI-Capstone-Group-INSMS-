import * as services from './services.js';
import {
    createSupplementSchema,
    updateSupplementSchema,
    SIMILARITY_THRESHOLD,
} from './validation.js';
import {
    bulkDeleteSchema,
    paginationSchema,
    uuidParamSchema,
    getSupplementStatusById,
    validateBatchTestingOrg,
} from '../shared/validation.js';
import {
    generateVector,
    generateSupplementVectors,
} from '../shared/vectorization.js';
import { z } from 'zod';
import pool from '../../../config/db.js';

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
                details: error.issues.map(err => ({
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
                    batch_price: parseFloat(batch.batch_price) || null,
                    date_added: batch.date_added
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

        // STEP 6: Validate nutritional data exists (at least one required for vectorization)
        console.log('Step 6: Checking nutritional data for vectorization...');
        const hasNutritionalPer100g = validatedData.nutritional_info_per_100g &&
            Object.keys(validatedData.nutritional_info_per_100g).length > 0;
        const hasNutritionalPerServing = validatedData.nutritional_info_per_serving &&
            Object.keys(validatedData.nutritional_info_per_serving).length > 0;

        if (!hasNutritionalPer100g && !hasNutritionalPerServing) {
            console.log('No nutritional data provided - vectorization requires at least one');
            return res.status(400).json({
                error: 'Validation failed',
                details: [{
                    field: 'nutritional_info',
                    message: 'At least one of nutritional_info_per_100g or nutritional_info_per_serving is required for vectorization'
                }]
            });
        }
        console.log(`Nutritional data: per_100g=${hasNutritionalPer100g}, per_serving=${hasNutritionalPerServing}`);

        // STEP 7: Generate vectors using Python vectorization service
        console.log('Step 7: Generating vectors...');
        try {
            const vectors = await generateSupplementVectors(
                validatedData.supplement_ingredient || [],
                validatedData.nutritional_info_per_100g,
                validatedData.nutritional_info_per_serving
            );

            // Add vectors to validated data
            validatedData.vector_100g_ingredient = vectors.vector_100g_ingredient;
            validatedData.vector_perserving_ingredient = vectors.vector_perserving_ingredient;

            console.log(`Vectors generated: per_100g=${vectors.vector_100g_ingredient ? 'yes' : 'no'}, per_serving=${vectors.vector_perserving_ingredient ? 'yes' : 'no'}`);
        } catch (vectorError) {
            console.error('Vectorization failed:', vectorError.message);
            return res.status(500).json({
                error: 'Vectorization failed',
                message: `Failed to generate vectors: ${vectorError.message}`,
                details: [{
                    field: 'vectorization',
                    message: 'The Python vectorization service failed. Please ensure the service is running on port 8001.'
                }]
            });
        }

        // STEP 8: Insert supplement into database
        console.log('Step 8: Inserting into database...');
        const newSupplement = await services.createSupplement(validatedData, req.user?.userId);
        console.log('Supplement created with ID:', newSupplement.id);

        // STEP 9: Return success response
        res.status(201).json({
            message: 'Supplement created successfully',
            data: newSupplement,
            vectorization: {
                vector_100g_ingredient: validatedData.vector_100g_ingredient ? 'generated' : null,
                vector_perserving_ingredient: validatedData.vector_perserving_ingredient ? 'generated' : null
            }
        });

    } catch (error) {
        console.error('Error creating supplement:', error);

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

        // STEP 5: Check if vectorization is needed (only if relevant fields are updated)
        console.log('Step 5: Checking if vectorization is needed...');
        const ingredientsUpdated = validatedData.supplement_ingredient !== undefined;
        const nutritionPer100gUpdated = validatedData.nutritional_info_per_100g !== undefined;
        const nutritionPerServingUpdated = validatedData.nutritional_info_per_serving !== undefined;

        const needsVectorization = ingredientsUpdated || nutritionPer100gUpdated || nutritionPerServingUpdated;
        let vectorizationResult = null;

        if (needsVectorization) {
            console.log(`Vectorization needed: ingredients=${ingredientsUpdated}, per_100g=${nutritionPer100gUpdated}, per_serving=${nutritionPerServingUpdated}`);

            // Merge updated data with existing data for vectorization
            const mergedIngredients = validatedData.supplement_ingredient ?? existingSupplement.supplement_ingredient ?? [];
            const mergedNutritionPer100g = validatedData.nutritional_info_per_100g ?? existingSupplement.nutritional_info_per_100g;
            const mergedNutritionPerServing = validatedData.nutritional_info_per_serving ?? existingSupplement.nutritional_info_per_serving;

            // Check if at least one nutritional info exists for vectorization
            const hasNutritionalPer100g = mergedNutritionPer100g && Object.keys(mergedNutritionPer100g).length > 0;
            const hasNutritionalPerServing = mergedNutritionPerServing && Object.keys(mergedNutritionPerServing).length > 0;

            if (!hasNutritionalPer100g && !hasNutritionalPerServing) {
                console.log('No nutritional data available after merge - vectorization requires at least one');
                return res.status(400).json({
                    error: 'Validation failed',
                    details: [{
                        field: 'nutritional_info',
                        message: 'At least one of nutritional_info_per_100g or nutritional_info_per_serving is required for vectorization'
                    }]
                });
            }

            try {
                // Determine which vectors to regenerate
                const regeneratePer100g = ingredientsUpdated || nutritionPer100gUpdated;
                const regeneratePerServing = ingredientsUpdated || nutritionPerServingUpdated;

                console.log(`Regenerating vectors: per_100g=${regeneratePer100g}, per_serving=${regeneratePerServing}`);

                vectorizationResult = { vector_100g_ingredient: null, vector_perserving_ingredient: null };

                // Generate per_100g vector if needed and data exists
                if (regeneratePer100g && hasNutritionalPer100g) {
                    const vectorResult = await generateVector(mergedIngredients, mergedNutritionPer100g, 'per_100g');
                    validatedData.vector_100g_ingredient = vectorResult.vector;
                    vectorizationResult.vector_100g_ingredient = 'regenerated';
                }

                // Generate per_serving vector if needed and data exists
                if (regeneratePerServing && hasNutritionalPerServing) {
                    const vectorResult = await generateVector(mergedIngredients, mergedNutritionPerServing, 'per_serving');
                    validatedData.vector_perserving_ingredient = vectorResult.vector;
                    vectorizationResult.vector_perserving_ingredient = 'regenerated';
                }

                console.log('Vectorization completed successfully');

            } catch (vectorError) {
                console.error('Vectorization failed:', vectorError.message);
                return res.status(500).json({
                    error: 'Vectorization failed',
                    message: `Failed to generate vectors: ${vectorError.message}`,
                    details: [{
                        field: 'vectorization',
                        message: 'The Python vectorization service failed. Please ensure the service is running on port 8001.'
                    }]
                });
            }
        } else {
            console.log('No vectorization needed - no relevant fields updated');
        }

        // STEP 6: Update supplement in database
        console.log('Step 6: Updating database...');
        const updatedSupplement = await services.updateSupplement(id, validatedData, req.user?.userId);

        if (!updatedSupplement) {
            console.log('Update failed');
            return res.status(500).json({
                error: 'Failed to update supplement',
                message: 'No rows were updated'
            });
        }
        console.log('Supplement updated successfully');

        // STEP 7: Return success response
        const response = {
            message: 'Supplement updated successfully',
            data: updatedSupplement
        };

        // Include vectorization info if vectors were regenerated
        if (vectorizationResult) {
            response.vectorization = vectorizationResult;
        }

        res.json(response);

    } catch (error) {
        console.error('Error updating supplement:', error);

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
            error: 'Failed to update supplement',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}

//Use Case: Delete Supplement (Hard Delete - Bulk)
export async function deleteSupplements(req, res) {
    try {
        console.log('Deleting supplements...');
        console.log('Request body:', req.body);

        // STEP 1: Validate request body
        console.log('Step 1: Validating request...');
        const { ids } = bulkDeleteSchema.parse(req.body);
        console.log(`Validated ${ids.length} supplement ID(s)`);

        // STEP 2: Delete supplements from database
        console.log('Step 2: Deleting from database...');
        const deletedSupplements = await services.deleteSupplements(ids, req.user?.userId);
        console.log(`Deleted ${deletedSupplements.length} supplement(s)`);

        // STEP 3: Return success response
        res.json({
            message: `Successfully deleted ${deletedSupplements.length} supplement(s)`,
            deletedCount: deletedSupplements.length,
            deletedIds: deletedSupplements.map(s => s.id)
        });

    } catch (error) {
        console.error('Error deleting supplements:', error);

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
            error: 'Failed to delete supplements',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}

// ============================================================================
// ALTERNATIVE SUPPLEMENTS FUNCTION
// ============================================================================

export async function getAlternativeSupplements(req, res) {
    try {
        console.log('Finding alternative supplements...');
        console.log('Supplement ID:', req.params.id);

        // STEP 1: Validate supplement ID
        console.log('Step 1: Validating supplement ID...');
        const { id } = uuidParamSchema.parse(req.params);

        // STEP 2: Validate pagination
        const { page } = paginationSchema.parse({ page: req.query.page || 1 });
        const pageSize = 10;

        // STEP 3: Perform similarity search
        console.log('Step 3: Performing similarity search...');
        const result = await services.getAlternativeSupplements(id, page, pageSize);

        // STEP 4: Handle errors
        if (result.error === 'SUPPLEMENT_NOT_FOUND') {
            console.log('Supplement not found');
            return res.status(404).json({
                error: 'Supplement not found',
                message: `No supplement found with ID: ${id}`
            });
        }

        if (result.error === 'NO_VECTORS') {
            console.log('No vectors available for similarity search');
            return res.status(400).json({
                error: 'No vectors available',
                message: 'This supplement does not have embedding vectors for similarity matching. Alternatives cannot be found.'
            });
        }

        // STEP 5: If no alternatives found, return empty results
        if (result.alternatives.length === 0) {
            console.log('No alternatives found matching criteria');
            return res.json({
                currentSupplementId: result.currentSupplement.id,
                currentSupplementName: result.currentSupplement.name,
                alternatives: [],
                currentPage: page,
                totalPages: 0,
                totalCount: 0,
                threshold: SIMILARITY_THRESHOLD,
                message: `No alternative supplements found matching the similarity threshold (${SIMILARITY_THRESHOLD * 100}%)`
            });
        }

        // STEP 6: Get stock status for all alternatives
        console.log('Step 6: Calculating stock status...');
        const supplementIds = result.alternatives.map(alt => alt.id);
        const stockStatusMap = await services.getStockStatusMap(supplementIds);

        // STEP 7: Format response with stock status and percentage similarities
        console.log('Step 7: Formatting response...');
        const totalPages = Math.ceil(result.totalCount / pageSize);

        const formattedAlternatives = result.alternatives.map(alt => ({
            id: alt.id,
            supplement_name: alt.supplement_name,
            supplement_brand: alt.supplement_brand || null,
            similarity_score_100g: alt.similarity_100g !== null
                ? `${Math.round(alt.similarity_100g * 100)}%`
                : null,
            similarity_score_perserving: alt.similarity_perserving !== null
                ? `${Math.round(alt.similarity_perserving * 100)}%`
                : null,
            supplement_status: alt.supplement_status,
            stock_status: stockStatusMap[alt.id] || 'Out of Stock'
        }));

        console.log(`Found ${result.alternatives.length} alternatives on page ${page}`);

        res.json({
            currentSupplementId: result.currentSupplement.id,
            currentSupplementName: result.currentSupplement.name,
            alternatives: formattedAlternatives,
            currentPage: page,
            totalPages,
            totalCount: result.totalCount,
            threshold: 0.6
        });

    } catch (error) {
        console.error('Error finding alternative supplements:', error);

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
            message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to find alternative supplements'
        });
    }
}

// ============================================================================
// LOOKUP FUNCTIONS
// ============================================================================

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
