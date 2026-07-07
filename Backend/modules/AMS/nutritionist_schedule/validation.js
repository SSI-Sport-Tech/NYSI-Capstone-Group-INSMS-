import { z } from "zod";
import {
  uuidSchema,
  uuidParamSchema,
} from "../../SSS/shared/validation.js";

// ============================================================================
// NUTRITIONIST SCHEDULE CRUD SCHEMAS
// ============================================================================

export const createNutritionistScheduleSchema = z
  .object({
    nutritionist_id: uuidSchema,
    schedule_type_id: z.string().uuid("schedule_type_id must be a valid UUID"),
    schedule_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    remarks: z.string().optional(),
  })
  .strict()
  .refine((data) => {
  if (!data.start_time || !data.end_time) return true;

  const [sh, sm] = data.start_time.split(":").map(Number);
  const [eh, em] = data.end_time.split(":").map(Number);

  return eh * 60 + em > sh * 60 + sm;
}, {
  message: "end_time must be after start_time",
  path: ["end_time"],
});

export const updateNutritionistScheduleSchema = z
  .object({
    // nutritionist_id: z.never().optional(),
    nutritionist_id: uuidSchema,
    schedule_type_id: z.string().uuid().optional(),
    schedule_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    remarks: z.string().optional(),
  })
  .strict()
  .refine((data) => {
  if (!data.start_time || !data.end_time) return true;

  const [sh, sm] = data.start_time.split(":").map(Number);
  const [eh, em] = data.end_time.split(":").map(Number);

  return eh * 60 + em > sh * 60 + sm;
}, {
  message: "end_time must be after start_time",
  path: ["end_time"],
});

export const getNutritionistScheduleRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nutritionist_id: z.string().uuid().optional(),
}).strict();

export { uuidParamSchema };
