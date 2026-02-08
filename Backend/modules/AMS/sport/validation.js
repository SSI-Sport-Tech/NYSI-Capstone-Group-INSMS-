import { z } from 'zod';
import { bulkDeleteSchema } from '../../SSS/shared/validation.js';

// ============================================================================
// CREATE SPORT SCHEMA
// ============================================================================

export const createSportSchema = z.object({
    sport: z.string()
        .trim()
        .min(1, 'Sport name is required')
        .max(100, 'Sport name must be 100 characters or less'),
}).strict();

// Re-export shared schemas
export { bulkDeleteSchema };
