import { z } from 'zod';
import { uuidSchema } from '../../SSS/shared/validation.js';

// ============================================================================
// PARAM SCHEMAS
// ============================================================================

export const sessionIdParamSchema = z.object({
    sessionId: uuidSchema,
});

export const athleteIdParamSchema = z.object({
    athleteId: uuidSchema,
});

// ============================================================================
// CREATE MEDICAL HISTORY SCHEMA
// ============================================================================

export const createMedicalHistorySchema = z.object({
    // Required: sessions_id (athlete_id derived server-side)
    sessions_id: uuidSchema.describe('Session UUID'),

    // General fields (stored in ams.athlete_medical)
    medical_condition: z.string().trim().optional(),
    food_allergy: z.string().trim().optional(),
    drug_allergy: z.string().trim().optional(),
    past_injury: z.string().trim().optional(),
    medical_remarks: z.string().trim().optional(),

    // Puberty section (consultation.session_puberty)
    puberty: z.object({
        period_of_growth_spurt: z.string().trim().optional(),
        other_remarks: z.string().trim().optional(),
    }).optional(),

    // Bowel movement section (consultation.session_bowel_movement)
    bowel_movement: z.object({
        regular_bowel_movement: z.boolean().optional(),
        frequency_of_bowel_movement: z.string().trim().optional(),
        stool_visual: z.string().trim().optional(),
        other_remarks: z.string().trim().optional(),
    }).optional(),

    // Hydration section (consultation.session_hydration)
    hydration: z.object({
        water_intake_per_day: z.number().optional(),
        urine_colour: z.string().trim().optional(),
        hydration_status: z.string().trim().optional(),
        other_remarks: z.string().trim().optional(),
    }).optional(),

    // Period section (consultation.session_period)
    period: z.object({
        date_of_first_period: z.string().trim().optional(),
        age_of_menarchy: z.number().optional(),
        regularity_of_period: z.number().optional(),
        length_of_typical_menstrual_cycle: z.number().optional(),
        length_of_period: z.number().optional(),
        heaviness_of_menstrual_bleeding: z.number().optional(),
        any_signs_and_symptoms: z.string().trim().optional(),
        other_remarks: z.string().trim().optional(),
    }).optional(),

    // Reject system-managed fields
    id: z.never().optional(),
    athlete_id: z.never().optional(),
}).strict();

// ============================================================================
// UPDATE MEDICAL HISTORY SCHEMA (all fields optional)
// ============================================================================

export const updateMedicalHistorySchema = z.object({
    // General fields (stored in ams.athlete_medical)
    medical_condition: z.string().trim().optional(),
    food_allergy: z.string().trim().optional(),
    drug_allergy: z.string().trim().optional(),
    past_injury: z.string().trim().optional(),
    medical_remarks: z.string().trim().optional(),

    // Puberty section
    puberty: z.object({
        period_of_growth_spurt: z.string().trim().optional(),
        other_remarks: z.string().trim().optional(),
    }).optional(),

    // Bowel movement section
    bowel_movement: z.object({
        regular_bowel_movement: z.boolean().optional(),
        frequency_of_bowel_movement: z.string().trim().optional(),
        stool_visual: z.string().trim().optional(),
        other_remarks: z.string().trim().optional(),
    }).optional(),

    // Hydration section
    hydration: z.object({
        water_intake_per_day: z.number().optional(),
        urine_colour: z.string().trim().optional(),
        hydration_status: z.string().trim().optional(),
        other_remarks: z.string().trim().optional(),
    }).optional(),

    // Period section
    period: z.object({
        date_of_first_period: z.string().trim().optional(),
        age_of_menarchy: z.number().optional(),
        regularity_of_period: z.number().optional(),
        length_of_typical_menstrual_cycle: z.number().optional(),
        length_of_period: z.number().optional(),
        heaviness_of_menstrual_bleeding: z.number().optional(),
        any_signs_and_symptoms: z.string().trim().optional(),
        other_remarks: z.string().trim().optional(),
    }).optional(),

    // Reject immutable fields
    id: z.never().optional(),
    sessions_id: z.never().optional(),
    athlete_id: z.never().optional(),
}).strict();
