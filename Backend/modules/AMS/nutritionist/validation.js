import { z } from 'zod';
import { bulkDeleteSchema } from '../../SSS/shared/validation.js';

// ============================================================================
// CREATE NUTRITIONIST SCHEMA
// ============================================================================

export const createNutritionistSchema = z.object({
    name: z.string()
        .trim()
        .min(1, 'Nutritionist name is required')
        .max(255, 'Nutritionist name must be 255 characters or less'),
}).strict();

// Re-export shared schemas
export { bulkDeleteSchema };
