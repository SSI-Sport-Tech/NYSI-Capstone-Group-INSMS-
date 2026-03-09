import { z } from 'zod';
import { uuidSchema } from '../shared/validation.js';

// ============================================================================
// BATCH/INVENTORY SCHEMAS
// ============================================================================

/**
 * Schema for creating a new inventory batch (POST /api/SSS/batches)
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
        .nonnegative('Price cannot be negative')
        .multipleOf(0.01, 'Price must have at most 2 decimal places')
        .optional()
        .nullable(),

    batch_expiration_date: z.coerce.date()
        .optional()
        .nullable(),

    batch_manufacture_date: z.coerce.date()
        .optional()
        .nullable(),

    inv_batch_testing_org: z.string()
        .max(255, 'Testing organisation must be less than 255 characters')
        .trim()
        .optional()
        .nullable(),

    batch_unit: z.string()
        .max(50, 'Unit must be less than 50 characters')
        .trim()
        .optional()
        .nullable(),

    // ---- FIELDS NOT ACCEPTED (handled by system) ----

    id: z.never().optional(),
    batch_stock_status_id: z.never().optional(),
    date_added: z.never().optional(),
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
        batch_stock_status_id: true,
        created_on: true,
        created_by: true,
        last_modified_on: true,
        last_modified_by: true,
    })
    .strict();
