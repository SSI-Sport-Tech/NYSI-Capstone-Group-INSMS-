import { z } from 'zod';

// ============================================================================
// SCHEMA UPDATES - January 2026
// ============================================================================
// 1. Renamed: supplement_dose_form_id → supplement_packaging_form_id
// 2. Added: supplement_status_id (REQUIRED) - Batch Tested / Not Batch Tested / Discontinued
// 3. batch_testing_org logic based on status:
//    - "Batch Tested" → user must provide org name (e.g., "NSF", "USP")
//    - "Not Batch Tested" → automatically set to "NIL" by backend
//    - "Discontinued" → keep existing value or user provides
// 4. approved_by set automatically by backend (not in form)
// 5. Removed: created_by, created_on, last_modified_by, last_modified_on
//    (Now tracked in admin.audit_log via database triggers)
// ============================================================================

// ============================================================================
// REUSABLE VALIDATORS
// ============================================================================

// UUID validator (used for all foreign keys and IDs)
const uuidSchema = z.string().uuid('Must be a valid UUID');

// JSONB validators
const jsonbArraySchema = z.array(z.string().min(1, 'Array items cannot be empty'));
const jsonbObjectSchema = z.record(z.unknown()); // For nutritional info objects

// URL validator (allows empty string or valid URL)
const urlSchema = z.string()
    .url('Invalid URL format')
    .or(z.literal(''))
    .optional()
    .nullable()
    .transform(val => val || null);

// Text field validator (trims and converts empty to null)
const optionalTextSchema = z.string()
    .trim()
    .optional()
    .nullable()
    .transform(val => val || null);

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

    supplement_packaging_form_id: uuidSchema  // ← RENAMED from supplement_dose_form_id
        .describe('Reference to Supplement_Packaging_Form_Lookup table'),

    supplement_status_id: uuidSchema  // ← NEW REQUIRED FIELD
        .describe('Reference to Supplement_Status_Lookup: Batch Tested / Not Batch Tested / Discontinued'),

    // ---- CONDITIONAL REQUIRED FIELD ----
    // batch_testing_org is validated in controller based on supplement_status_id

    batch_testing_org: z.string()
        .trim()
        .optional()
        .nullable()
        .transform(val => val || null)
        .describe('Organization name if Batch Tested (e.g., "NSF", "USP"), "NIL" if Not Batch Tested'),

    // ---- OPTIONAL TEXT FIELDS ----

    supplement_brand: z.string()
        .max(100, 'Brand name must be less than 100 characters')
        .trim()
        .optional()
        .nullable()
        .transform(val => val || null),

    supplement_description: optionalTextSchema,

    supplement_warning_label: optionalTextSchema,

    supplement_certifications: optionalTextSchema,

    supplement_additional_information: optionalTextSchema,

    source_url: urlSchema,

    // ---- JSONB FIELDS ----

    supplement_ingredient: jsonbArraySchema
        .optional()
        .nullable()
        .default([])
        .describe('Array of ingredient names, e.g., ["Vitamin D3", "Calcium"]'),

    nutritional_info_per_100g: jsonbObjectSchema
        .optional()
        .nullable()
        .describe('Nutritional breakdown per 100g'),

    nutritional_info_per_serving: jsonbObjectSchema
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
    approved_by: z.never().optional(), // Set by backend to current user
    vector_100g_ingredient: z.never().optional(),
    vector_perserving_ingredient: z.never().optional(),
    scraper_version: z.never().optional(),

    // Removed - now tracked in admin.audit_log
    created_on: z.never().optional(),
    created_by: z.never().optional(),
    last_modified_on: z.never().optional(),
    last_modified_by: z.never().optional(),
}).strict(); // Reject any extra fields not in schema

/**
 * Schema for updating a supplement (PUT/PATCH /api/SSS/supplements/:id)
 * All fields are optional (partial update)
 */
export const updateSupplementSchema = createSupplementSchema
    .partial()
    .omit({
        supplement_input_type: true, // Cannot change input type
        approved_by: true, // Cannot change approver
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
// BATCH/INVENTORY SCHEMAS
// ============================================================================

/**
 * Schema for creating a new inventory batch (POST /api/SSS/batches)
 * Based on SSS.Inventory_Batch table structure
 */
export const createBatchSchema = z.object({
    // ---- REQUIRED FIELDS ----

    supplement_id: uuidSchema
        .describe('Reference to Supplement table'),

    batch_stock_status_id: uuidSchema
        .describe('Reference to Batch_Stock_Status_Lookup table'),

    batch_number: z.string()
        .min(1, 'Batch number is required')
        .max(100, 'Batch number must be less than 100 characters')
        .trim(),

    batch_initial_quantity: z.coerce.number()
        .int('Quantity must be a whole number')
        .positive('Quantity must be greater than 0'),

    // ---- OPTIONAL FIELDS ----

    batch_price: z.coerce.number()
        .positive('Price must be greater than 0')
        .multipleOf(0.01, 'Price must have at most 2 decimal places')
        .optional()
        .nullable(),

    batch_expiration_date: z.coerce.date()
        .optional()
        .nullable()
        .refine(
            (date) => !date || date > new Date(),
            'Expiration date must be in the future'
        ),

    batch_manufacture_date: z.coerce.date()
        .optional()
        .nullable()
        .refine(
            (date) => !date || date <= new Date(),
            'Manufacture date cannot be in the future'
        ),

    // ---- FIELDS NOT ACCEPTED (handled by system) ----

    id: z.never().optional(),
    created_on: z.never().optional(),
    created_by: z.never().optional(),
    last_modified_on: z.never().optional(),
    last_modified_by: z.never().optional(),
}).strict();

/**
 * Schema for updating a batch (PUT/PATCH /api/SSS/batches/:id)
 */
export const updateBatchSchema = createBatchSchema
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
export function validateBatchTestingOrg(supplementStatus, batchTestingOrg) {
    switch (supplementStatus) {
        case 'Batch Tested':
            // Must have organization name
            if (!batchTestingOrg || batchTestingOrg === 'NIL') {
                throw new Error('Batch testing organization is required when status is "Batch Tested"');
            }
            return batchTestingOrg;

        case 'Not Batch Tested':
            // Automatically set to NIL
            return 'NIL';

        case 'Discontinued':
            // Keep existing value or set to what user provided
            return batchTestingOrg || 'NIL';

        default:
            throw new Error('Invalid supplement status');
    }
}

// ============================================================================
// CUSTOM VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates that a batch number is unique
 * Call this in your controller after schema validation
 */
export async function validateUniqueBatchNumber(batchNumber, excludeId = null) {
    // This will be implemented in the service layer
    // Returns true if unique, false if duplicate
}

/**
 * Validates that a supplement name + brand combination is unique
 * Call this in your controller after schema validation
 */
export async function validateUniqueSupplementCombo(name, brand, excludeId = null) {
    // This will be implemented in the service layer
    // Returns true if unique, false if duplicate
}