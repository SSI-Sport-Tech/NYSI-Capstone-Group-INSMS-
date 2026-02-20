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
// CREATE SESSION SCHEMA
// ============================================================================

export const createSessionSchema = z.object({
    athlete_id: uuidSchema.describe('Athlete UUID'),
    type_of_consult_id: uuidSchema.describe('Consult type UUID (must be active)'),
    date_of_consult: z.string().trim()
        .refine(val => !isNaN(Date.parse(val)), { message: 'Must be a valid date (YYYY-MM-DD)' })
        .optional(),
    date_of_next_follow_up: optionalDateSchema,
    consultation_objective: z.string().trim().optional(),

    // --- Reject client-supplied nutritionist_id (auto-assigned from logged-in user) ---
    nutritionist_id: z.never().optional(),

    // --- Reject system-managed fields ---
    id: z.never().optional(),
}).strict();

// ============================================================================
// UPDATE SESSION SCHEMA (all fields optional)
// ============================================================================

export const updateSessionSchema = z.object({
    type_of_consult_id: uuidSchema.optional(),
    date_of_consult: optionalDateSchema,
    date_of_next_follow_up: optionalDateSchema,
    consultation_objective: z.string().trim().optional(),

    // --- Reject immutable fields ---
    id: z.never().optional(),
    athlete_id: z.never().optional(),
    nutritionist_id: z.never().optional(),
}).strict();

// Re-export shared schemas
export { uuidParamSchema };
