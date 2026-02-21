import { z } from "zod";
import {
  bulkDeleteSchema,
  uuidParamSchema,
} from "../../SSS/shared/validation.js";

// ============================================================================
// NUTRITIONIST CRUD SCHEMAS
// ============================================================================

export const createNutritionistSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Nutritionist name is required")
      .max(255, "Nutritionist name must be 255 characters or less"),
  })
  .strict();

// ✅ NEW: Added for Update logic
export const updateNutritionistSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

// ============================================================================
// NUTRITIONIST-ATHLETE MAPPING & PINNING
// ============================================================================

// ✅ NEW: Added for Pinning logic
export const togglePinSchema = z
  .object({
    athlete_id: z.string().uuid("athlete_id must be a valid UUID"),
    is_pinned: z.boolean(),
  })
  .strict();

export const createMappingSchema = z
  .object({
    athlete_id: z.string().uuid("athlete_id must be a valid UUID"),
    nutritionist_id: z.string().uuid("nutritionist_id must be a valid UUID"),
    is_active: z.boolean().default(true),
  })
  .strict();

export const deleteMappingSchema = z
  .array(
    z
      .object({
        athlete_id: z.string().uuid("athlete_id must be a valid UUID"),
        nutritionist_id: z
          .string()
          .uuid("nutritionist_id must be a valid UUID"),
      })
      .strict(),
  )
  .min(1, "At least one mapping pair is required");

export const updateMappingSchema = z
  .object({
    is_active: z.boolean(),
  })
  .strict();

// Re-export shared schemas
export { bulkDeleteSchema, uuidParamSchema };
