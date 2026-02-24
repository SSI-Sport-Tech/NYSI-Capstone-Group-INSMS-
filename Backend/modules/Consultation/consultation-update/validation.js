import { z } from 'zod';
import { uuidSchema, uuidParamSchema } from '../../SSS/shared/validation.js';

// Accepts any 8-4-4-4-12 hex UUID regardless of version/variant bits.
// Needed because the type_of_consult_lookup table was seeded with non-standard
// UUIDs (e.g. 00000000-0000-0000-0000-000000000023) that Zod v4's strict
// z.string().uuid() rejects.
const uuidFormatSchema = z.string().trim().regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Must be a valid UUID'
);

// ============================================================================
// REUSABLE DATE / TIME VALIDATORS
// ============================================================================

const optionalDateSchema = z.string()
    .trim()
    .refine(val => !isNaN(Date.parse(val)), { message: 'Must be a valid date (YYYY-MM-DD)' })
    .optional();

const optionalTimeSchema = z.string()
    .trim()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, { message: 'Must be a valid time (HH:MM or HH:MM:SS)' })
    .optional();

// ============================================================================
// CREATE SESSION SCHEMA
// ============================================================================

export const createSessionSchema = z.object({
    athlete_id: uuidSchema.describe('Athlete UUID'),
    type_of_consult_id: uuidFormatSchema.describe('Consult type UUID (must be active)'),
    title_description: z.string().trim().optional(),
    venue: z.string().trim().optional(),
    date_of_consult: z.string().trim()
        .refine(val => !isNaN(Date.parse(val)), { message: 'Must be a valid date (YYYY-MM-DD)' })
        .optional(),
    time_of_consult: optionalTimeSchema,
    date_of_next_follow_up: optionalDateSchema,
    time_of_next_follow_up: optionalTimeSchema,
    consultation_objective: z.string().trim().optional(),

    // --- Optional: override nutritionist (falls back to logged-in user if omitted) ---
    nutritionist_id: uuidSchema.optional(),

    // --- Reject system-managed fields ---
    id: z.never().optional(),
}).strict();

// ============================================================================
// UPDATE SESSION SCHEMA (all fields optional)
// ============================================================================

export const updateSessionSchema = z.object({
    type_of_consult_id: uuidFormatSchema.optional(),
    title_description: z.string().trim().optional(),
    venue: z.string().trim().optional(),
    date_of_consult: optionalDateSchema,
    time_of_consult: optionalTimeSchema,
    date_of_next_follow_up: optionalDateSchema,
    time_of_next_follow_up: optionalTimeSchema,
    consultation_objective: z.string().trim().optional(),

    // --- Reject immutable fields ---
    id: z.never().optional(),
    athlete_id: z.never().optional(),
    nutritionist_id: z.never().optional(),
}).strict();

// Athlete ID path param (for latest-session route)
export const athleteIdParamSchema = z.object({
    athleteId: uuidSchema,
});

// Re-export shared schemas
export { uuidParamSchema };
