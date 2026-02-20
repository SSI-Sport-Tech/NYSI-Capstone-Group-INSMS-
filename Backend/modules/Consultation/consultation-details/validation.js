import { z } from 'zod';
import { uuidSchema, uuidParamSchema } from '../../SSS/shared/validation.js';

// ============================================================================
// SESSION ID PARAM SCHEMA (uses "sessionId" instead of "id")
// ============================================================================

export const sessionIdParamSchema = z.object({
    sessionId: uuidSchema,
});

// ============================================================================
// CREATE CONSULTATION DETAILS SCHEMA
// ============================================================================

export const createDetailsSchema = z.object({
    sessions_id: uuidSchema.describe('Session UUID'),
    main_nutrition_diagnosis: z.string().trim(),
    carbohydrates_review_id: uuidSchema,
    protein_review_id: uuidSchema,
    fat_review_id: uuidSchema,
    fibre_review_id: uuidSchema,
    iron_review_id: uuidSchema,
    calcium_review_id: uuidSchema,
    micronutrients_review_id: uuidSchema,
    other_review: z.string().trim(),
    follow_up_note: z.string().trim(),
    intervention_note: z.string().trim(),
    medical_remarks: z.string().trim(),
    other_remarks: z.string().trim(),
}).strict();

// ============================================================================
// UPDATE CONSULTATION DETAILS SCHEMA (all fields optional, sessions_id rejected)
// ============================================================================

export const updateDetailsSchema = z.object({
    main_nutrition_diagnosis: z.string().trim().optional(),
    carbohydrates_review_id: uuidSchema.optional().nullable(),
    protein_review_id: uuidSchema.optional().nullable(),
    fat_review_id: uuidSchema.optional().nullable(),
    fibre_review_id: uuidSchema.optional().nullable(),
    iron_review_id: uuidSchema.optional().nullable(),
    calcium_review_id: uuidSchema.optional().nullable(),
    micronutrients_review_id: uuidSchema.optional().nullable(),
    other_review: z.string().trim().optional(),
    follow_up_note: z.string().trim().optional(),
    intervention_note: z.string().trim().optional(),
    medical_remarks: z.string().trim().optional(),
    other_remarks: z.string().trim().optional(),

    // Reject immutable fields
    sessions_id: z.never().optional(),
    id: z.never().optional(),
    consultation_objective: z.never().optional(),
}).strict();

export { uuidParamSchema };
