import { z } from 'zod';
import { uuidSchema, uuidParamSchema } from '../../SSS/shared/validation.js';

// ============================================================================
// REUSABLE DATE VALIDATOR
// ============================================================================

const optionalDateSchema = z.string()
    .trim()
    .refine(val => !isNaN(Date.parse(val)), { message: 'Must be a valid date (YYYY-MM-DD)' })
    .optional();

// ============================================================================
// SESSION ID PARAM SCHEMA (for GET by session)
// ============================================================================

export const sessionIdParamSchema = z.object({
    sessionId: uuidSchema,
}).strict();

// ============================================================================
// CREATE OPEN ITEM SCHEMA
// ============================================================================

export const createOpenItemSchema = z.object({
    sessions_id: uuidSchema.describe('Session UUID'),
    open_item_status_id: uuidSchema.describe('Open item status UUID'),
    description: z.string().trim().optional(),
    open_item: z.string().trim().optional(),
    due_date: optionalDateSchema,
    other_remarks: z.string().trim().optional(),

    // --- Optional: override nutritionist for testing (falls back to logged-in user) ---
    nutritionist_id: uuidSchema.optional(),

    // --- Reject auto-assigned / system-managed fields ---
    owner: z.never().optional(),
    id: z.never().optional(),
}).strict();

// ============================================================================
// UPDATE OPEN ITEM SCHEMA (all fields optional)
// ============================================================================

export const updateOpenItemSchema = z.object({
    open_item_status_id: uuidSchema.optional(),
    description: z.string().trim().optional(),
    open_item: z.string().trim().optional(),
    owner: z.string().trim().optional(),
    due_date: optionalDateSchema,
    other_remarks: z.string().trim().optional(),

    // --- Reject immutable fields ---
    id: z.never().optional(),
    sessions_id: z.never().optional(),
}).strict();

// ============================================================================
// BULK DELETE SCHEMA
// ============================================================================

export const bulkDeleteSchema = z.object({
    ids: z.array(uuidSchema).min(1, 'At least one ID is required'),
}).strict();

// Re-export shared schemas
export { uuidParamSchema };
