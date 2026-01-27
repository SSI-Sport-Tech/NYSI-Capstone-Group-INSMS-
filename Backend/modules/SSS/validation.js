import { z } from 'zod';
// ============================================================================
// REUSABLE VALIDATORS
// ============================================================================

// UUID validator (used for all foreign keys and IDs)
const uuidSchema = z.string().uuid('Must be a valid UUID');

// JSONB validators
const jsonbArraySchema = z.array(z.string().min(1, 'Array items cannot be empty'));

// ✅ FIXED: Text field validator that preserves undefined for partial updates
const optionalTextSchema = z.string()
    .trim()
    .optional()
    .nullable()
    .transform(val => {
        if (val === undefined) return undefined;  // ✅ Keep undefined as undefined
        return val || null;  // Only convert empty string to null
    });

// URL validator - accepts string OR array, converts to array for database
const urlSchema = z.preprocess(
    (val) => {
        if (!val) return null;
        if (typeof val === 'string') return [val]; // Single string → array
        if (Array.isArray(val)) return val; // Array → array
        return null;
    },
    z.array(z.string().url('Each URL must be valid'))
        .optional()
        .nullable()
);

// ============================================================================
// SUPPLEMENT SCHEMAS
// ============================================================================

/**
 * Schema for creating a new supplement (POST /api/SSS/supplements)
 * UPDATED: New required fields and renamed fields
 */
export const createSupplementSchema = z.object({
    // ---- REQUIRED FIELDS ----

    supplement_name: z.string()
        .min(1, 'Supplement name is required')
        .max(255, 'Supplement name must be less than 255 characters')
        .trim(),

    supplement_packaging_form_id: uuidSchema
        .describe('Reference to Supplement_Packaging_Form_Lookup table'),

    supplement_status_id: uuidSchema
        .describe('Reference to Supplement_Status_Lookup: Batch Tested / Not Batch Tested / Discontinued'),

    // ---- CONDITIONAL REQUIRED FIELD ----
    // batch_testing_org is validated in controller based on supplement_status_id

    batch_testing_org: z.string()
        .trim()
        .optional()
        .nullable()
        .transform(val => {
            if (val === undefined) return undefined;  // ✅ Preserve undefined
            return val || null;
        })
        .describe('Organization name if Batch Tested (e.g., "NSF", "USP"), "NIL" if Not Batch Tested'),

    // ---- OPTIONAL TEXT FIELDS ----

    supplement_brand: z.string()
        .max(100, 'Brand name must be less than 100 characters')
        .trim()
        .optional()
        .nullable()
        .transform(val => {
            if (val === undefined) return undefined;  // ✅ Preserve undefined
            return val || null;
        }),

    supplement_description: optionalTextSchema,

    supplement_warning_label: optionalTextSchema,

    supplement_certifications: optionalTextSchema,

    supplement_additional_information: optionalTextSchema,

    product_source_url: urlSchema,

    // ---- JSONB FIELDS ----

    supplement_ingredient: jsonbArraySchema
        .optional()
        .nullable()
        .default([])
        .describe('Array of ingredient names, e.g., ["Vitamin D3", "Calcium"]'),

    nutritional_info_per_100g: z.record(z.string(), z.any())
        .optional()
        .nullable()
        .describe('Nutritional breakdown per 100g'),

    nutritional_info_per_serving: z.record(z.string(), z.any())
        .optional()
        .nullable()
        .describe('Nutritional breakdown per serving'),

    nutritional_info_per_serving_definition: optionalTextSchema
        .describe('Definition of serving size, e.g., "1 capsule"'),

    // ---- AUTO-SET FIELDS (user cannot provide these) ----

    supplement_input_type: z.literal('Manual')
        .default('Manual')
        .describe('Automatically set to "Manual" for user-created supplements'),

    // ---- FIELDS NOT ACCEPTED (handled by system) ----

    id: z.never().optional(),
    supplement_staging_id: z.never().optional(),
    approved_by: z.never().optional(),
    vector_100g_ingredient: z.never().optional(),
    vector_perserving_ingredient: z.never().optional(),
    scraper_version: z.never().optional(),

    // Removed - now tracked in admin.audit_log
    created_on: z.never().optional(),
    created_by: z.never().optional(),
    last_modified_on: z.never().optional(),
    last_modified_by: z.never().optional(),
}).strict();

/**
 * Schema for updating a supplement (PUT/PATCH /api/SSS/supplements/:id)
 * All fields are optional (partial update)
 */
export const updateSupplementSchema = createSupplementSchema
    .partial()
    .omit({
        supplement_input_type: true,
        approved_by: true,
        id: true,
        supplement_staging_id: true,
        vector_100g_ingredient: true,
        vector_perserving_ingredient: true,
        scraper_version: true,
        created_on: true,
        created_by: true,
        last_modified_on: true,
        last_modified_by: true,
    })
    .strict();

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
// BATCH/INVENTORY SCHEMAS - FIXED
// ============================================================================

/**
 * Schema for creating a new inventory batch (POST /api/SSS/batches)
 * Based on SSS.Inventory_Batch table structure
 * 
 * FIXES:
 * 1. Removed batch_stock_status_id (auto-set by backend to "available")
 * 2. Changed batch_price validation to allow zero (nonnegative instead of positive)
 * 3. Removed date validations (trust user input)
 */
export const createBatchSchema = z.object({
    // ---- REQUIRED FIELDS ----

    supplement_id: uuidSchema
        .describe('Reference to Supplement table'),

    batch_number: z.string()
        .min(1, 'Batch number is required')
        .max(100, 'Batch number must be less than 100 characters')
        .trim(),

    batch_initial_quantity: z.coerce.number()
        .int('Quantity must be a whole number')
        .positive('Quantity must be greater than 0'),

    // ---- OPTIONAL FIELDS ----

    batch_price: z.coerce.number()
        .nonnegative('Price cannot be negative')  // ✅ FIXED: Allows zero
        .multipleOf(0.01, 'Price must have at most 2 decimal places')
        .optional()
        .nullable(),

    batch_expiration_date: z.coerce.date()
        .optional()
        .nullable(),
    // ✅ FIXED: Removed .refine() - trust user input

    batch_manufacture_date: z.coerce.date()
        .optional()
        .nullable(),
    // ✅ FIXED: Removed .refine() - trust user input

    // ---- FIELDS NOT ACCEPTED (handled by system) ----

    id: z.never().optional(),
    batch_stock_status_id: z.never().optional(),  // ✅ FIXED: Auto-set by backend
    created_on: z.never().optional(),
    created_by: z.never().optional(),
    last_modified_on: z.never().optional(),
    last_modified_by: z.never().optional(),
}).strict();

/**
 * Schema for updating a batch (PUT/PATCH /api/SSS/batches/:id)
 * All fields optional for partial update
 */
export const updateBatchSchema = createBatchSchema
    .partial()
    .omit({
        id: true,
        batch_stock_status_id: true,  // ✅ Cannot update status via this endpoint
        created_on: true,
        created_by: true,
        last_modified_on: true,
        last_modified_by: true,
    })
    .strict();

// ============================================================================
// INVENTORY TICKET SCHEMAS
// ============================================================================

/**
 * Schema for creating an inventory ticket (POST /api/SSS/tickets)
 * Based on SSS.Inventory_Ticket table structure
 */
export const createTicketSchema = z.object({
    // ---- REQUIRED FIELDS ----

    inventory_batch_id: uuidSchema
        .describe('Reference to Inventory_Batch table'),

    athlete_id: uuidSchema
        .describe('Reference to Athlete table (AMS module)'),

    ticket_status_id: uuidSchema
        .describe('Reference to Ticket_Status_Lookup table'),

    quantity: z.coerce.number()
        .int('Quantity must be a whole number')
        .positive('Quantity must be greater than 0')
        .max(10000, 'Quantity seems unreasonably high'),

    // ---- FIELDS NOT ACCEPTED (handled by system) ----

    id: z.never().optional(),
    created_on: z.never().optional(),
    created_by: z.never().optional(),
    last_modified_on: z.never().optional(),
    last_modified_by: z.never().optional(),
}).strict();

/**
 * Schema for updating a ticket (PUT/PATCH /api/SSS/tickets/:id)
 */
export const updateTicketSchema = createTicketSchema
    .partial()
    .omit({
        id: true,
        created_on: true,
        created_by: true,
        last_modified_on: true,
        last_modified_by: true,
    })
    .strict();

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
 * Validates batch_testing_org based on supplement status
 * Returns validated/transformed data or throws error
 */
export function validateBatchTestingOrg(statusName, batchTestingOrg) {
    // Normalize to uppercase for comparison
    const normalizedStatus = statusName?.toUpperCase().trim();

    if (normalizedStatus === 'BATCH TESTED') {
        if (!batchTestingOrg || batchTestingOrg.trim() === '' || batchTestingOrg === 'NIL') {
            throw new Error('batch_testing_org is required when status is BATCH TESTED');
        }
        return batchTestingOrg;
    }
    else if (normalizedStatus === 'NOT BATCH TESTED') {
        return 'NIL'; // Auto-set to NIL
    }
    else if (normalizedStatus === 'DISCONTINUED') {
        return batchTestingOrg || null;
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

// ============================================================================
// SUPPLEMENT STAGING SCHEMAS
// ============================================================================

/**
 * Schema for updating supplement staging (PATCH /api/SSS/staging-supplements/:id)
 * Only supplement_name is required, all other fields optional
 */
export const updateStagingSupplementSchema = z.object({
    // ---- OPTIONAL FIELDS (only supplement_name required if provided) ----
    supplement_name: z.string()
        .min(1, 'Supplement name cannot be empty')
        .max(255, 'Supplement name must be less than 255 characters')
        .trim()
        .optional(),
    
    supplement_packaging_form_id: uuidSchema.optional().nullable(),
    supplement_status_id: uuidSchema.optional().nullable(),
    
    batch_testing_org: optionalTextSchema,
    
    supplement_brand: z.string()
        .max(100, 'Brand name must be less than 100 characters')
        .trim()
        .optional()
        .nullable()
        .transform(val => {
            if (val === undefined) return undefined;
            return val || null;
        }),

    supplement_description: optionalTextSchema,
    supplement_warning_label: optionalTextSchema,
    supplement_certifications: optionalTextSchema,
    supplement_additional_information: optionalTextSchema,
    
    product_source_url: urlSchema,
    scraper_version: optionalTextSchema,
    
    // ---- JSONB FIELDS ----
    supplement_ingredient: jsonbArraySchema
        .optional()
        .nullable()
        .default([])
        .describe('Array of ingredient names, e.g., ["Vitamin D3", "Calcium"]'),

    nutritional_info_per_100g: z.record(z.string(), z.any())
        .optional()
        .nullable()
        .describe('Nutritional breakdown per 100g'),

    nutritional_info_per_serving: z.record(z.string(), z.any())
        .optional()
        .nullable()
        .describe('Nutritional breakdown per serving'),

    nutritional_info_per_serving_definition: optionalTextSchema
        .describe('Definition of serving size, e.g., "1 capsule"'),

    // ---- FIELDS NOT ACCEPTED (system-managed) ----
    id: z.never().optional(),
    scraper_catalog_url_id: z.never().optional(), // Read-only
    is_reviewed: z.never().optional(), // Managed by approval workflow
    supplement_staging_id: z.never().optional(), // N/A
    approved_by: z.never().optional(), // N/A
    supplement_input_type: z.never().optional(), // Set during approval
    vector_100g_ingredient: z.never().optional(), // Generated during approval
    vector_perserving_ingredient: z.never().optional(), // Generated during approval
}).strict();

/**
 * Schema for approving staging entries (POST /api/SSS/staging-supplements/approve)
 * Bulk approval of multiple staging entries
 */
export const approveStagingSchema = z.object({
    ids: z.array(
        z.string().uuid('Each ID must be a valid UUID')
    )
        .min(1, 'At least one staging ID is required')
        .describe('Array of supplement_staging IDs to approve')
}).strict();