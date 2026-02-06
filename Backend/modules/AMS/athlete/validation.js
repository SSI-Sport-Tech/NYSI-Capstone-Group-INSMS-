import { z } from 'zod';
import { uuidSchema, paginationSchema, uuidParamSchema, bulkDeleteSchema } from '../../SSS/shared/validation.js';

// ============================================================================
// REUSABLE DATE VALIDATOR
// ============================================================================

const dateSchema = z.string()
    .trim()
    .min(1, 'Date is required')
    .refine(val => !isNaN(Date.parse(val)), { message: 'Must be a valid date (YYYY-MM-DD)' });

const optionalDateSchema = z.string()
    .trim()
    .refine(val => !isNaN(Date.parse(val)), { message: 'Must be a valid date (YYYY-MM-DD)' })
    .optional();

// ============================================================================
// CREATE ATHLETE SCHEMA (includes registry + medical)
// ============================================================================

export const createAthleteSchema = z.object({
    // --- Athlete base fields ---
    sport_id: uuidSchema.describe('Reference to AMS.Sport_Lookup'),
    sportsync_id: z.string().trim().min(1, 'sportsync_id is required'),
    athlete_name_abbr: z.string().trim().min(1, 'Athlete name abbreviation is required'),
    gender: z.string().trim().min(1, 'Gender is required'),
    date_of_birth: dateSchema,

    // --- Registry fields ---
    carding_status: z.string().trim().min(1, 'Carding status is required'),
    athlete_mathlid_on: dateSchema,
    carding_start_date: dateSchema,
    carding_end_date: dateSchema,
    medical_clearance: z.boolean({ required_error: 'medical_clearance is required' }),
    approved_start_date: dateSchema,
    approved_end_date: dateSchema,

    // --- Medical fields ---
    medical_condition: z.string().trim().min(1, 'Medical condition is required'),
    food_allergy: z.string().trim().min(1, 'Food allergy is required'),
    drug_allergy: z.string().trim().min(1, 'Drug allergy is required'),
    past_injury: z.string().trim().min(1, 'Past injury is required'),

    // --- Reject system-managed fields ---
    id: z.never().optional(),
    athlete_id: z.never().optional(),
}).strict();

// ============================================================================
// UPDATE SCHEMAS (separate for each sub-record)
// ============================================================================

export const updateAthleteSchema = z.object({
    sport_id: uuidSchema.optional(),
    sportsync_id: z.string().trim().min(1, 'sportsync_id cannot be empty').optional(),
    athlete_name_abbr: z.string().trim().min(1, 'Name cannot be empty').optional(),
    gender: z.string().trim().min(1, 'Gender cannot be empty').optional(),
    date_of_birth: optionalDateSchema,
}).strict();

export const updateRegistrySchema = z.object({
    carding_status: z.string().trim().min(1, 'Carding status cannot be empty').optional(),
    athlete_mathlid_on: optionalDateSchema,
    carding_start_date: optionalDateSchema,
    carding_end_date: optionalDateSchema,
    medical_clearance: z.boolean().optional(),
    approved_start_date: optionalDateSchema,
    approved_end_date: optionalDateSchema,
}).strict();

export const updateMedicalSchema = z.object({
    medical_condition: z.string().trim().min(1, 'Medical condition cannot be empty').optional(),
    food_allergy: z.string().trim().min(1, 'Food allergy cannot be empty').optional(),
    drug_allergy: z.string().trim().min(1, 'Drug allergy cannot be empty').optional(),
    past_injury: z.string().trim().min(1, 'Past injury cannot be empty').optional(),
}).strict();

// Re-export shared schemas for convenience
export { paginationSchema, uuidParamSchema, bulkDeleteSchema };
