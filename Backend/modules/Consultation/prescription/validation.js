import { z } from 'zod';
import { uuidSchema, uuidParamSchema } from '../../SSS/shared/validation.js';

// ============================================================================
// REUSABLE DATE VALIDATOR
// ============================================================================

const optionalDateSchema = z.string()
    .trim()
    .refine(val => !isNaN(Date.parse(val)), { message: 'Must be a valid date (YYYY-MM-DD)' })
    .optional();

// ============================================================================
// CREATE PRESCRIPTION SCHEMA
// ============================================================================

export const createPrescriptionSchema = z.object({
    sessions_id: uuidSchema.describe('Session UUID'),
    batch_id: uuidSchema.describe('Inventory batch UUID'),
    prescribed_quantity: z.number().int().positive('Prescribed quantity must be a positive integer'),
    dosage: z.number().int().positive().optional(),
    dosage_unit: z.string().trim().optional(),
    dosage_frequency: z.string().trim().optional(),
    start_date: optionalDateSchema,
    projected_end_date: optionalDateSchema,
    follow_up_required: z.boolean().optional(),
    other_remarks: z.string().trim().optional(),

    // Reject system-managed fields
    id: z.never().optional(),
}).strict();

// ============================================================================
// UPDATE PRESCRIPTION SCHEMA (all fields optional)
// ============================================================================

export const updatePrescriptionSchema = z.object({
    batch_id: uuidSchema.optional(),
    prescribed_quantity: z.number().int().positive('Prescribed quantity must be a positive integer').optional(),
    dosage: z.number().int().positive().optional(),
    dosage_unit: z.string().trim().optional(),
    dosage_frequency: z.string().trim().optional(),
    start_date: optionalDateSchema,
    projected_end_date: optionalDateSchema,
    follow_up_required: z.boolean().optional(),
    other_remarks: z.string().trim().optional(),

    // Reject immutable fields
    id: z.never().optional(),
    sessions_id: z.never().optional(),
}).strict();

// ============================================================================
// PARAM SCHEMAS
// ============================================================================

export const sessionIdParamSchema = z.object({
    sessionId: uuidSchema,
});

// Re-export shared schemas
export { uuidParamSchema };
