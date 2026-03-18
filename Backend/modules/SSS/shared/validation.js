import { z } from 'zod';

// ============================================================================
// REUSABLE VALIDATORS
// ============================================================================

// UUID validator (used for all foreign keys and IDs)
export const uuidSchema = z.string().uuid('Must be a valid UUID');

// JSONB validators
export const jsonbArraySchema = z.array(z.string().min(1, 'Array items cannot be empty'));

// Text field validator that preserves undefined for partial updates
export const optionalTextSchema = z.string()
    .trim()
    .optional()
    .nullable()
    .transform(val => {
        if (val === undefined) return undefined;
        return val || null;
    });

// URL validator - accepts string OR array, converts to array for database
export const urlSchema = z.preprocess(
    (val) => {
        if (!val) return null;
        if (typeof val === 'string') return [val]; // Single string -> array
        if (Array.isArray(val)) return val; // Array -> array
        return null;
    },
    z.array(z.string().url('Each URL must be valid'))
        .optional()
        .nullable()
);

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

/**
 * Schema for pagination and search query parameters
 * Used in GET /api/SSS/supplements and GET /api/SSS/batches
 */
export const paginationSchema = z.object({
    page: z.coerce.number()
        .int()
        .positive()
        .default(1)
        .describe('Page number (starts at 1)'),

    search: z.string()
        .trim()
        .optional()
        .describe('Search query string'),
});

/**
 * Schema for UUID parameter validation
 * Used in routes like GET /api/SSS/supplements/:id
 */
export const uuidParamSchema = z.object({
    id: uuidSchema,
});

// ============================================================================
// BULK DELETE SCHEMA
// ============================================================================

export const bulkDeleteSchema = z.object({
    ids: z.array(
        z.string().uuid('Each ID must be a valid UUID')
    )
        .min(1, 'At least one ID is required')
});

// ============================================================================
// HELPER FUNCTIONS FOR BUSINESS LOGIC
// ============================================================================

/**
 * Get supplement status name by ID
 * Used in controller to apply business logic for batch_testing_org
 */
export async function getSupplementStatusById(pool, statusId) {
    const query = `
    SELECT id, supplement_status, is_active
    FROM SSS.Supplement_Status_Lookup
    WHERE id = $1 AND is_active = true
  `;

    const result = await pool.query(query, [statusId]);

    if (result.rows.length === 0) {
        throw new Error('Invalid supplement status ID');
    }

    return result.rows[0];
}

/**
 * Validates batch_testing_org_id based on supplement status.
 * Throws if status is BATCH TESTED but no org ID is provided.
 * Clears the org ID if status is NOT BATCH TESTED.
 * Returns the (possibly nulled) org ID.
 */
export function validateBatchTestingOrgId(statusName, batchTestingOrgId) {
    const normalizedStatus = statusName?.toUpperCase().trim();

    if (normalizedStatus === 'BATCH TESTED') {
        if (!batchTestingOrgId) {
            throw new Error('A batch testing organisation must be selected when status is BATCH TESTED');
        }
        return batchTestingOrgId;
    }
    else if (normalizedStatus === 'NOT BATCH TESTED' || normalizedStatus === 'DISCONTINUED') {
        return null;
    }
    else {
        throw new Error(`Invalid supplement status: ${statusName}`);
    }
}

/**
 * Get batch stock status ID by name (for auto-setting "available")
 * Used in batch creation to auto-set batch_stock_status_id
 */
export async function getBatchStockStatusByName(pool, statusName = 'available') {
    const query = `
        SELECT id, batch_stock_status, is_active
        FROM SSS.Batch_Stock_Status_Lookup
        WHERE LOWER(batch_stock_status) = LOWER($1) AND is_active = true
    `;

    const result = await pool.query(query, [statusName]);

    if (result.rows.length === 0) {
        throw new Error(`Batch stock status "${statusName}" not found in lookup table`);
    }

    return result.rows[0];
}
