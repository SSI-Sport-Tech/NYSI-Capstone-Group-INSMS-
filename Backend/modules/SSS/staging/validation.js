import { z } from 'zod';
import { uuidSchema, optionalTextSchema, urlSchema, jsonbArraySchema } from '../shared/validation.js';

// ============================================================================
// SUPPLEMENT STAGING SCHEMAS
// ============================================================================

/**
 * Schema for updating supplement staging (PATCH /api/SSS/staging-supplements/:id)
 */
export const updateStagingSupplementSchema = z.object({
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
    scraper_catalog_url_id: z.never().optional(),
    is_reviewed: z.never().optional(),
    promoted_to_supplement_id: z.never().optional(),
    approved_by: z.never().optional(),
    supplement_input_type: z.never().optional(),
    vector_100g_ingredient: z.never().optional(),
    vector_perserving_ingredient: z.never().optional(),
}).strict();

// ============================================================================
// APPROVAL SCHEMA
// ============================================================================

/**
 * Schema for approving staging entries (POST /api/SSS/staging-supplements/approve)
 */
export const approveStagingSchema = z.object({
    ids: z.array(
        z.string().uuid('Each ID must be a valid UUID')
    )
        .min(1, 'At least one staging ID is required')
        .describe('Array of supplement_staging IDs to approve')
}).strict();

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

/**
 * Similarity threshold for duplicate detection during staging approval
 */
export const DUPLICATE_SIMILARITY_THRESHOLD = 0.95;

/**
 * Normalize a string for duplicate comparison
 */
export function normalizeForComparison(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// ============================================================================
// CATALOG URL SCHEMAS
// ============================================================================

/**
 * Schema for creating a new catalog URL
 */
export const createCatalogUrlSchema = z.object({
    product_catalog_website: z.string()
        .url('Must be a valid URL')
        .min(1, 'Website URL is required')
        .describe('URL of the product catalog page'),

    is_active: z.boolean()
        .default(true)
        .describe('Whether this catalog should be scraped'),

    number_of_catalog_page: z.never().optional(),
    id: z.never().optional(),
}).strict();

/**
 * Schema for updating a catalog URL
 */
export const updateCatalogUrlSchema = z.object({
    product_catalog_website: z.string()
        .url('Must be a valid URL')
        .optional()
        .describe('URL of the product catalog page'),

    is_active: z.boolean()
        .optional()
        .describe('Whether this catalog should be scraped'),

    number_of_catalog_page: z.never().optional(),
    id: z.never().optional(),
}).strict();

/**
 * Schema for starting scraping job with URL selection
 */
export const startScrapingSchema = z.object({
    catalog_url_ids: z.array(
        z.string().uuid('Each ID must be a valid UUID')
    )
        .optional()
        .describe('Array of catalog URL IDs to scrape. If not provided, scrapes all active URLs.'),
}).strict();
