import { z } from "zod";
import {
  uuidSchema,
  paginationSchema,
  uuidParamSchema,
  bulkDeleteSchema,
} from "../../SSS/shared/validation.js";

// ============================================================================
// REUSABLE DATE VALIDATOR
// ============================================================================

const dateSchema = z
  .string()
  .trim()
  .min(1, "Date is required")
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Must be a valid date (YYYY-MM-DD)",
  });

const optionalDateSchema = z
  .string()
  .trim()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Must be a valid date (YYYY-MM-DD)",
  })
  .optional();

// ============================================================================
// CREATE BASIC ATHLETE SCHEMA (athlete record only)
// ============================================================================

export const createBasicAthleteSchema = z
  .object({
    sport_id: uuidSchema.describe("Reference to AMS.Sport_Lookup"),
    sportsync_id: z.string().trim().min(1, "sportsync_id is required"),
    athlete_name_abbr: z
      .string()
      .trim()
      .min(1, "Athlete name abbreviation is required"),
    gender: z.enum(["Male", "Female", "Other"], {
      required_error: "Gender is required",
      invalid_type_error: "Gender must be one of: Male, Female, Other",
    }),
    date_of_birth: dateSchema,
    ethnicity: z.string().trim().optional(),
    target_event: z.string().trim().optional(),
    sport_start_date: z.number().int().min(0).max(99).optional(),

    // --- Reject system-managed fields ---
    id: z.never().optional(),
  })
  .strict();

// ============================================================================
// CREATE COMPLETE ATHLETE SCHEMA (athlete + registry + medical + assignments)
// ============================================================================

export const createCompleteAthleteSchema = z
  .object({
    // --- Athlete base fields ---
    sport_id: uuidSchema.describe("Reference to AMS.Sport_Lookup"),
    sportsync_id: z.string().trim().min(1, "sportsync_id is required"),
    athlete_name_abbr: z
      .string()
      .trim()
      .min(1, "Athlete name abbreviation is required"),
    gender: z.enum(["Male", "Female", "Other"], {
      required_error: "Gender is required",
      invalid_type_error: "Gender must be one of: Male, Female, Other",
    }),
    date_of_birth: dateSchema,
    ethnicity: z.string().trim().optional(),
    target_event: z.string().trim().optional(),
    sport_start_date: z.number().int().min(0).max(99).optional(),

    // --- Registry fields ---
    carding_status: z.string().trim().min(1, "Carding status is required"),
    athlete_notified_on: dateSchema,
    carding_start_date: dateSchema,
    carding_end_date: dateSchema,
    medical_clearance: z.boolean({
      required_error: "medical_clearance is required",
    }),
    approved_start_date: dateSchema,
    approved_end_date: dateSchema,

    // --- Medical fields (optional) ---
    medical_condition: z.string().trim().optional().default(""),
    food_allergy: z.string().trim().optional().default(""),
    drug_allergy: z.string().trim().optional().default(""),
    past_injury: z.string().trim().optional().default(""),
    medical_remarks: z.string().trim().optional().default(""),
    dietary_restriction: z.string().trim().optional().default(""),

    // --- Assignment arrays ---
    coach_ids: z.array(uuidSchema).optional().default([]),

    // --- Reject client-supplied nutritionist_ids (auto-assigned from logged-in user) ---
    nutritionist_ids: z.never().optional(),

    // --- Reject system-managed fields ---
    id: z.never().optional(),
    athlete_id: z.never().optional(),

    // --- AEMS integration fields ---
    initials: z.string().trim().min(1).max(10),
    initial_budget: z.number().positive().optional().default(1000),
    email: z.string().email().optional(),
    pin: z.string().regex(/^\d{6}$/).optional(),
  })
  .strict();

// ============================================================================
// CREATE COMPLETE ATHLETE SCHEMA - ADMIN (allows specifying nutritionist_id)
// ============================================================================

export const adminCreateCompleteAthleteSchema = z
  .object({
    // --- Athlete base fields ---
    sport_id: uuidSchema.describe("Reference to AMS.Sport_Lookup"),
    sportsync_id: z.string().trim().min(1, "sportsync_id is required"),
    athlete_name_abbr: z
      .string()
      .trim()
      .min(1, "Athlete name abbreviation is required"),
    gender: z.enum(["Male", "Female", "Other"], {
      required_error: "Gender is required",
      invalid_type_error: "Gender must be one of: Male, Female, Other",
    }),
    date_of_birth: dateSchema,
    ethnicity: z.string().trim().optional(),
    target_event: z.string().trim().optional(),
    sport_start_date: z.number().int().min(0).max(99).optional(),

    // --- Registry fields ---
    carding_status: z.string().trim().min(1, "Carding status is required"),
    athlete_notified_on: dateSchema,
    carding_start_date: dateSchema,
    carding_end_date: dateSchema,
    medical_clearance: z.boolean({
      required_error: "medical_clearance is required",
    }),
    approved_start_date: dateSchema,
    approved_end_date: dateSchema,

    // --- Medical fields (optional) ---
    medical_condition: z.string().trim().optional().default(""),
    food_allergy: z.string().trim().optional().default(""),
    drug_allergy: z.string().trim().optional().default(""),
    past_injury: z.string().trim().optional().default(""),
    medical_remarks: z.string().trim().optional().default(""),
    dietary_restriction: z.string().trim().optional().default(""),

    // --- Assignment ---
    coach_ids: z.array(uuidSchema).optional().default([]),
    nutritionist_id: uuidSchema
      .describe("Nutritionist UUID to assign")
      .optional(),

    // --- Reject system-managed fields ---
    id: z.never().optional(),
    athlete_id: z.never().optional(),

    // --- AEMS integration fields ---
    initials: z.string().trim().min(1).max(10),
    initial_budget: z.number().positive().optional().default(1000),
    email: z.string().email().optional(),
    pin: z.string().regex(/^\d{6}$/).optional(),
  })
  .strict();

// ============================================================================
// UPDATE SCHEMAS (separate for each sub-record)
// ============================================================================

export const updateAthleteSchema = z
  .object({
    sport_id: uuidSchema.optional(),
    sportsync_id: z
      .string()
      .trim()
      .min(1, "sportsync_id cannot be empty")
      .optional(),
    athlete_name_abbr: z
      .string()
      .trim()
      .min(1, "Name cannot be empty")
      .optional(),
    gender: z
      .enum(["Male", "Female", "Other"], {
        invalid_type_error: "Gender must be one of: Male, Female, Other",
      })
      .optional(),
    date_of_birth: optionalDateSchema,
    ethnicity: z.string().trim().optional(),
    target_event: z.string().trim().optional(),
    sport_start_date: z.number().int().min(0).max(99).optional(),
  })
  .strict();

export const updateRegistrySchema = z
  .object({
    carding_status: z
      .string()
      .trim()
      .min(1, "Carding status cannot be empty")
      .optional(),
    athlete_notified_on: optionalDateSchema,
    carding_start_date: optionalDateSchema,
    carding_end_date: optionalDateSchema,
    medical_clearance: z.boolean().optional(),
    approved_start_date: optionalDateSchema,
    approved_end_date: optionalDateSchema,
  })
  .strict();

export const updateMedicalSchema = z
  .object({
    medical_condition: z
      .string()
      .trim()
      .min(1, "Medical condition cannot be empty")
      .optional(),
    food_allergy: z
      .string()
      .trim()
      .min(1, "Food allergy cannot be empty")
      .optional(),
    drug_allergy: z
      .string()
      .trim()
      .min(1, "Drug allergy cannot be empty")
      .optional(),
    past_injury: z
      .string()
      .trim()
      .min(1, "Past injury cannot be empty")
      .optional(),
    medical_remarks: z.string().trim().optional(),
    dietary_restriction: z.string().trim().optional(),
  })
  .strict();

// ============================================================================
// UPDATE ATHLETE PROFILE SCHEMA (regular user - no nutritionist control)
// ============================================================================

export const updateProfileSchema = z
  .object({
    // --- Athlete base fields (all optional) ---
    sport_id: uuidSchema.optional(),
    sportsync_id: z
      .string()
      .trim()
      .min(1, "sportsync_id cannot be empty")
      .optional(),
    athlete_name_abbr: z
      .string()
      .trim()
      .min(1, "Name cannot be empty")
      .optional(),
    gender: z
      .enum(["Male", "Female", "Other"], {
        invalid_type_error: "Gender must be one of: Male, Female, Other",
      })
      .optional(),
    date_of_birth: optionalDateSchema,
    ethnicity: z.string().trim().optional(),
    target_event: z.string().trim().optional(),
    sport_start_date: z.number().int().min(0).max(99).optional(),

    // --- Registry fields (all optional) ---
    carding_status: z
      .string()
      .trim()
      .min(1, "Carding status cannot be empty")
      .optional(),
    athlete_notified_on: optionalDateSchema,
    carding_start_date: optionalDateSchema,
    carding_end_date: optionalDateSchema,
    medical_clearance: z.boolean().optional(),
    approved_start_date: optionalDateSchema,
    approved_end_date: optionalDateSchema,

    // --- Medical fields (all optional) ---
    medical_condition: z.string().trim().optional(),
    food_allergy: z.string().trim().optional(),
    drug_allergy: z.string().trim().optional(),
    past_injury: z.string().trim().optional(),
    medical_remarks: z.string().trim().optional(),
    dietary_restriction: z.string().trim().optional(),

    // --- Coach mapping replacement (optional) ---
    coach_ids: z.array(uuidSchema).optional(),

    // --- Reject nutritionist_ids for regular users ---
    nutritionist_ids: z.never().optional(),

    // --- Reject system-managed fields ---
    id: z.never().optional(),
    athlete_id: z.never().optional(),
  })
  .strict();

// ============================================================================
// UPDATE ATHLETE PROFILE SCHEMA - ADMIN (can edit nutritionist mapping)
// ============================================================================

export const adminUpdateProfileSchema = z
  .object({
    // --- Athlete base fields (all optional) ---
    sport_id: uuidSchema.optional(),
    sportsync_id: z
      .string()
      .trim()
      .min(1, "sportsync_id cannot be empty")
      .optional(),
    athlete_name_abbr: z
      .string()
      .trim()
      .min(1, "Name cannot be empty")
      .optional(),
    gender: z
      .enum(["Male", "Female", "Other"], {
        invalid_type_error: "Gender must be one of: Male, Female, Other",
      })
      .optional(),
    date_of_birth: optionalDateSchema,
    ethnicity: z.string().trim().optional(),
    target_event: z.string().trim().optional(),
    sport_start_date: z.number().int().min(0).max(99).optional(),

    // --- Registry fields (all optional) ---
    carding_status: z
      .string()
      .trim()
      .min(1, "Carding status cannot be empty")
      .optional(),
    athlete_notified_on: optionalDateSchema,
    carding_start_date: optionalDateSchema,
    carding_end_date: optionalDateSchema,
    medical_clearance: z.boolean().optional(),
    approved_start_date: optionalDateSchema,
    approved_end_date: optionalDateSchema,

    // --- Medical fields (all optional) ---
    medical_condition: z.string().trim().optional(),
    food_allergy: z.string().trim().optional(),
    drug_allergy: z.string().trim().optional(),
    past_injury: z.string().trim().optional(),
    medical_remarks: z.string().trim().optional(),
    dietary_restriction: z.string().trim().optional(),

    // --- Coach and nutritionist mapping replacement (optional) ---
    coach_ids: z.array(uuidSchema).optional(),
    nutritionist_ids: z.array(uuidSchema).optional(),

    // --- Reject system-managed fields ---
    id: z.never().optional(),
    athlete_id: z.never().optional(),
  })
  .strict();

// Re-export shared schemas for convenience
export { paginationSchema, uuidParamSchema, bulkDeleteSchema };
