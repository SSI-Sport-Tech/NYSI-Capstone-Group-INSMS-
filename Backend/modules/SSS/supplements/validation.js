import { z } from 'zod';
import { uuidSchema, optionalTextSchema, urlSchema, jsonbArraySchema } from '../shared/validation.js';

// ============================================================================
// SUPPLEMENT SCHEMAS
// ============================================================================

/**
 * Schema for creating a new supplement (POST /api/SSS/supplements)
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
            if (val === undefined) return undefined;
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
            if (val === undefined) return undefined;
            return val || null;
        }),

    supplement_description: optionalTextSchema,

    supplement_warning_label: optionalTextSchema,

    supplement_certifications: optionalTextSchema,

    supplement_additional_information: optionalTextSchema,

    product_source_url: urlSchema,

    // ---- JSONB FIELDS (Required for vectorization) ----

    supplement_ingredient: jsonbArraySchema
        .min(1, 'At least one ingredient is required for vectorization')
        .describe('Array of ingredient names, e.g., ["Vitamin D3", "Calcium"]. Required for vectorization.'),

    nutritional_info_per_100g: z.record(z.string(), z.any())
        .optional()
        .nullable()
        .describe('Nutritional breakdown per 100g. At least one of per_100g or per_serving is required for vectorization.'),

    nutritional_info_per_serving: z.record(z.string(), z.any())
        .optional()
        .nullable()
        .describe('Nutritional breakdown per serving. At least one of per_100g or per_serving is required for vectorization.'),

    nutritional_info_per_serving_definition: optionalTextSchema
        .describe('Definition of serving size, e.g., "1 capsule"'),

    // ---- AUTO-SET FIELDS (user cannot provide these) ----

    supplement_input_type: z.literal('Manual')
        .default('Manual')
        .describe('Automatically set to "Manual" for user-created supplements'),

    // ---- FIELDS NOT ACCEPTED (handled by system) ----

    id: z.never().optional(),
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
// ALTERNATIVE SUPPLEMENTS
// ============================================================================

/**
 * Similarity threshold for alternative supplements
 * Supplements with similarity score >= this value will be returned
 * Range: 0.0 to 1.0 (e.g., 0.6 = 60% similarity)
 */
export const SIMILARITY_THRESHOLD = 0.6;