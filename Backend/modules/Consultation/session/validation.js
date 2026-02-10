import { z } from 'zod';
import { uuidSchema, uuidParamSchema, bulkDeleteSchema, paginationSchema } from '../../SSS/shared/validation.js';

// ============================================================================
// CREATE SESSION SCHEMA
// ============================================================================

export const createSessionSchema = z.object({
    nutritionist_id: uuidSchema,
    athlete_id: uuidSchema,
    type_of_consult_id: uuidSchema,
    date_of_consult: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'date_of_consult must be in YYYY-MM-DD format')
        .optional(),
    date_of_next_follow_up: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'date_of_next_follow_up must be in YYYY-MM-DD format')
        .optional()
        .nullable(),
}).strict();

// ============================================================================
// UPDATE SESSION SCHEMA (all fields optional)
// ============================================================================

export const updateSessionSchema = z.object({
    nutritionist_id: uuidSchema.optional(),
    athlete_id: uuidSchema.optional(),
    type_of_consult_id: uuidSchema.optional(),
    date_of_consult: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'date_of_consult must be in YYYY-MM-DD format')
        .optional(),
    date_of_next_follow_up: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'date_of_next_follow_up must be in YYYY-MM-DD format')
        .optional()
        .nullable(),
}).strict();

// Re-export shared schemas
export { paginationSchema, uuidParamSchema, bulkDeleteSchema };
