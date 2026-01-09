import * as services from './services.js';

//Use Case: Show Supplement Library, Search Supplement
export async function listSupplements(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
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
        res.status(500).json({ error: error.message });
    }
}

//Use Case: Show Inventory Library
export async function listBatches(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = 10;

        const [batches, totalCount] = await Promise.all([
            services.getBatchesByPage(page, pageSize),
            services.getTotalBatchCount()
        ]);

        const totalPages = Math.ceil(totalCount / pageSize);

        res.json({
            data: batches.rows,
            currentPage: page,
            totalPages,
            totalCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}