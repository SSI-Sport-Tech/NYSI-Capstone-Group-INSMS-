import * as services from './services.js';
import pool from '../../../config/db.js';
import {
    bulkDeleteSchema,
    paginationSchema,
    uuidParamSchema,
    getBatchStockStatusByName,
} from '../shared/validation.js';
import { z } from 'zod';

// ============================================================================
// BATCH/INVENTORY FUNCTIONS
// ============================================================================

// Use Case: Show Inventory Library, Search Inventory
export async function listBatches(req, res) {
    try {
        const { page, search } = paginationSchema.parse(req.query);
        const sortBy = req.query.sortBy || "created_on";
        const sortDirection = req.query.sortDirection || "desc";
        const pageSize = Number(req.query.pageSize) || 10;

        let batches, totalCount;

        if (search && search.trim()) {
            [batches, totalCount] = await Promise.all([
                services.searchBatches(search, page, pageSize, sortBy, sortDirection),
                services.getSearchBatchCount(search)
            ]);
        } else {
            [batches, totalCount] = await Promise.all([
                services.getBatchesByPage(page, pageSize, sortBy, sortDirection),
                services.getTotalBatchCount()
            ]);
        }

        const totalPages = Math.ceil(totalCount / pageSize);

        res.json({
            data: batches.rows,
            currentPage: page,
            totalPages,
            totalCount,
            searchQuery: search || null,
            sortBy,
            sortDirection
        });
    } catch (error) {
        console.error('Error listing inventory:', error);

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

// Export all inventory batches
export async function exportBatches(req, res, next) {
  try {
    const sortBy = req.query.sortBy || "product_name";
    const sortDirection = req.query.sortDirection || "asc";

    const result = await services.getAllBatches(
      sortBy,
      sortDirection
    );

    res.json({
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}
