import * as services from './services.js';

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
                supplement_dose_form: supplement.supplement_dose_form || null,
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