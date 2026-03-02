import { z } from 'zod';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Similarity threshold for finding similar supplements
 * Supplements with similarity score >= this value will be returned
 */
export const SIMILARITY_THRESHOLD = 0.6;

/**
 * Default page size for paginated results
 */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Timeout for Python service calls (ms)
 * Matches OCR_TIMEOUT env var (default 5 minutes)
 */
export const PYTHON_TIMEOUT = parseInt(process.env.OCR_TIMEOUT || "300000", 10);

/**
 * Maximum file size for image uploads (bytes)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Allowed image MIME types
 */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

/**
 * Pagination query parameters for /analyze endpoint
 */
export const analyzeQuerySchema = z.object({
    page: z.string()
        .optional()
        .default('1')
        .transform(val => parseInt(val, 10))
        .refine(val => val >= 1, 'Page must be >= 1'),

    per_page: z.string()
        .optional()
        .default('10')
        .transform(val => parseInt(val, 10))
        .refine(val => val >= 1 && val <= 50, 'per_page must be between 1 and 50')
});

// ============================================================================
// REQUEST BODY SCHEMAS
// ============================================================================

/**
 * Schema for /verify endpoint - batch verification request
 */
export const verifyRequestSchema = z.object({
    supplement_brand: z.string()
        .min(1, 'Brand is required')
        .max(255, 'Brand must be less than 255 characters')
        .trim(),

    supplement_name: z.string()
        .min(1, 'Supplement name is required')
        .max(255, 'Supplement name must be less than 255 characters')
        .trim(),

    batch_id: z.string()
        .max(100, 'Batch ID must be less than 100 characters')
        .trim()
        .optional()
        .nullable()
        .transform(val => val || null)
}).strict();

// ============================================================================
// FILE VALIDATION HELPERS
// ============================================================================

/**
 * Validate uploaded file
 * @param {Object} file - Multer file object
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImageFile(file) {
    if (!file) {
        return { valid: false, error: 'No file uploaded' };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return {
            valid: false,
            error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`
        };
    }

    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
        };
    }

    return { valid: true };
}

/**
 * Validate multiple uploaded files
 * @param {Object} files - Object with file arrays keyed by field name
 * @param {Object} requirements - { fieldName: { required: boolean } }
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateMultipleFiles(files, requirements) {
    for (const [fieldName, config] of Object.entries(requirements)) {
        const fileArray = files[fieldName];

        if (config.required && (!fileArray || fileArray.length === 0)) {
            return { valid: false, error: `${fieldName} is required` };
        }

        if (fileArray && fileArray.length > 0) {
            const validation = validateImageFile(fileArray[0]);
            if (!validation.valid) {
                return { valid: false, error: `${fieldName}: ${validation.error}` };
            }
        }
    }

    return { valid: true };
}
