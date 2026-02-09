import { z } from 'zod';
import { uuidParamSchema, bulkDeleteSchema } from '../../SSS/shared/validation.js';

// ============================================================================
// CREATE SPORT SCHEMA
// ============================================================================

export const createSportSchema = z.object({
    sport: z.string()
        .trim()
        .min(1, 'Sport name is required')
        .max(100, 'Sport name must be 100 characters or less'),
}).strict();

// ============================================================================
// UPDATE SPORT SCHEMA (toggle is_active)
// ============================================================================

export const updateSportSchema = z.object({
    is_active: z.boolean({ required_error: 'is_active is required' }),
}).strict();

// Re-export shared schemas
export { uuidParamSchema, bulkDeleteSchema };
