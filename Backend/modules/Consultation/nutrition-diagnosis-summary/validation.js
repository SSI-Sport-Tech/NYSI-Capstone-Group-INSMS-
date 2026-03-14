import { z } from 'zod';
import { uuidSchema, uuidParamSchema } from '../../SSS/shared/validation.js';

// ============================================================================
// SESSION ID PARAM SCHEMA (uses "sessionId" instead of "id")
// ============================================================================

export const sessionIdParamSchema = z.object({
    sessionId: uuidSchema,
});

// ============================================================================
// CREATE NUTRITION DIAGNOSIS SCHEMA
// ============================================================================

export const createDetailsSchema = z.object({
    sessions_id: uuidSchema.describe('Session UUID'),
    main_nutrition_diagnosis: z.string().trim().optional(),
    carbohydrates_review: z.string().trim().optional().nullable(),
    protein_review: z.string().trim().optional().nullable(),
    fat_review: z.string().trim().optional().nullable(),
    other_review: z.string().trim().optional(),
    follow_up_note: z.string().trim().optional(),
    intervention_note: z.string().trim().optional(),
    other_remarks: z.string().trim().optional(),
}).strict();

// ============================================================================
// UPDATE NUTRITION DIAGNOSIS SCHEMA (all fields optional, sessions_id rejected)
// ============================================================================

export const updateDetailsSchema = z.object({
    main_nutrition_diagnosis: z.string().trim().optional(),
    carbohydrates_review: z.string().trim().optional().nullable(),
    protein_review: z.string().trim().optional().nullable(),
    fat_review: z.string().trim().optional().nullable(),
    other_review: z.string().trim().optional(),
    follow_up_note: z.string().trim().optional(),
    intervention_note: z.string().trim().optional(),
    other_remarks: z.string().trim().optional(),

    // Reject immutable fields
    sessions_id: z.never().optional(),
    id: z.never().optional(),
    consultation_objective: z.never().optional(),
}).strict();

export { uuidParamSchema };
