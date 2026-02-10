import { z } from 'zod';
import { uuidParamSchema, bulkDeleteSchema } from '../../SSS/shared/validation.js';

// ============================================================================
// CREATE CONSULT TYPE SCHEMA
// ============================================================================

export const createConsultTypeSchema = z.object({
    type_of_consult: z.string()
        .trim()
        .min(1, 'Consult type name is required')
        .max(255, 'Consult type name must be 255 characters or less'),
}).strict();

// ============================================================================
// UPDATE CONSULT TYPE SCHEMA (toggle is_active)
// ============================================================================

export const updateConsultTypeSchema = z.object({
    is_active: z.boolean({ required_error: 'is_active is required' }),
}).strict();

// Re-export shared schemas
export { uuidParamSchema, bulkDeleteSchema };
