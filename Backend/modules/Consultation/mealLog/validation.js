import { z } from "zod";

export const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid(),
});

// HH:MM format (time without seconds)
const timeField = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}$/, "Must be a valid time in HH:MM format")
  .optional()
  .nullable();

const mealEntrySchema = z
  .object({
    foodTime: timeField,
    mealDescription: z
      .string()
      .trim()
      .min(1, "Description is required")
      .max(4000),
    lowerCarbG: z.number().min(0).optional().nullable(),
    upperCarbG: z.number().min(0).optional().nullable(),
    lowerProteinG: z.number().min(0).optional().nullable(),
    upperProteinG: z.number().min(0).optional().nullable(),
    lowerFatG: z.number().min(0).optional().nullable(),
    upperFatG: z.number().min(0).optional().nullable(),
  })
  .strict();

export const upsertMealLogAndSleepSchema = z
  .object({
    entries: z.array(mealEntrySchema).default([]),
    mealOtherRemarks: z.string().trim().max(4000).optional().nullable(),
    sleep: z
      .object({
        sleepDurationH: z.number().min(0).max(24).optional().nullable(),
        sleepQuality: z.number().int().min(1).max(10).optional().nullable(),
        otherRemarks: z.string().trim().max(4000).optional().nullable(),
      })
      .strict()
      .optional()
      .nullable(),
  })
  .strict();
