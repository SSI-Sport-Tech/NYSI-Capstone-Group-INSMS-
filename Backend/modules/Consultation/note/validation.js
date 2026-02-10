import { z } from 'zod';
import { uuidSchema, uuidParamSchema, bulkDeleteSchema, paginationSchema } from '../../SSS/shared/validation.js';

// ============================================================================
// CREATE NOTE SCHEMA
// ============================================================================

export const createNoteSchema = z.object({
    sessions_id: uuidSchema,
    consultation_objective: z.string().trim().optional().nullable(),
    main_nutrition_diagnosis: z.string().trim().optional().nullable(),
    follow_up_note: z.string().trim().optional().nullable(),
    intervention_note: z.string().trim().optional().nullable(),
    medical_remarks: z.string().trim().optional().nullable(),
    other_remarks: z.string().trim().optional().nullable(),
}).strict();

// ============================================================================
// UPDATE NOTE SCHEMA (all fields optional, no sessions_id)
// ============================================================================

export const updateNoteSchema = z.object({
    consultation_objective: z.string().trim().optional().nullable(),
    main_nutrition_diagnosis: z.string().trim().optional().nullable(),
    follow_up_note: z.string().trim().optional().nullable(),
    intervention_note: z.string().trim().optional().nullable(),
    medical_remarks: z.string().trim().optional().nullable(),
    other_remarks: z.string().trim().optional().nullable(),
}).strict();

// Re-export shared schemas
export { paginationSchema, uuidParamSchema, bulkDeleteSchema };
