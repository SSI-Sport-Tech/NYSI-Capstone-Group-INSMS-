import { z } from 'zod';
import { uuidParamSchema, bulkDeleteSchema } from '../../SSS/shared/validation.js';

// ============================================================================
// CREATE COACH SCHEMA
// ============================================================================

export const createCoachSchema = z.object({
    sport_id: z.string().uuid('sport_id must be a valid UUID'),
    name: z.string()
        .trim()
        .min(1, 'Coach name is required')
        .max(255, 'Coach name must be 255 characters or less'),
}).strict();

// ============================================================================
// UPDATE COACH SCHEMA
// ============================================================================

export const updateCoachSchema = z.object({
    sport_id: z.string().uuid('sport_id must be a valid UUID').optional(),
    name: z.string()
        .trim()
        .min(1, 'Coach name is required')
        .max(255, 'Coach name must be 255 characters or less')
        .optional(),
}).strict();

// Re-export shared schemas
export { uuidParamSchema, bulkDeleteSchema };
