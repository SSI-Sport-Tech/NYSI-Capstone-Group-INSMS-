// Backend/modules/SSS/controller.js
import { searchSupplements } from "./services.js";

export async function getSearch(req, res) {
    try {
        const q = req.query.q;
        const scope = (req.query.scope || "all").toLowerCase();
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        if (!q || !q.trim()) {
            return res.status(400).json({ success: false, error: "Missing search query" });
        }

        const { rows, total } = await searchSupplements(q, scope, limit, offset);
        return res.json({ success: true, results: rows, total });
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ success: false, error: "Server error while searching" });
    }
}

// Use case: Show Supplement Library
async function listSupplements(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = 10;

        const [supplements, totalCount] = await Promise.all([
            services.getSupplementsByPage(page, pageSize),
            services.getTotalSupplementCount()
        ]);

        const totalPages = Math.ceil(totalCount / pageSize);

        res.json({
            data: supplements.rows,
            currentPage: page,
            totalPages,
            totalCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Use case: Show Inventory Library
async function listBatches(req, res) {
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