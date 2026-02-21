// Backend/modules/Consultation/trainingSchedule/validation.js
import { z } from "zod";

export const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid(),
});

const textField = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .nullable();

const hoursField = z.number().min(0).max(24).optional().nullable();
const rpeField = z.number().min(0).max(10).optional().nullable();

const daySchema = z
  .object({
    am: textField,
    pm: textField,
    trainingHours: hoursField,
    rpe: rpeField,
  })
  .strict();

export const upsertTrainingScheduleSchema = z
  .object({
    days: z
      .object({
        monday: daySchema,
        tuesday: daySchema,
        wednesday: daySchema,
        thursday: daySchema,
        friday: daySchema,
        saturday: daySchema,
        sunday: daySchema,
      })
      .strict(),

    trainingDetails: z
      .object({
        upcomingMajorCompetitions: textField,
        upcomingLocalCompetitions: textField,
      })
      .strict()
      .optional(),

    performanceDetails: z
      .object({
        currentPerformance: textField,
        coachPerformanceGoals: textField,
        athletePerformanceGoals: textField,
        otherRemarks: textField,
      })
      .strict()
      .optional(),

    // Optional: stored in consultation.session_nutrition_review (not in training_schedule table)
    pal: z.number().min(0).max(5).optional().nullable(),
  })
  .strict();
