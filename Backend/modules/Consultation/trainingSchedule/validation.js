// Backend/modules/Consultation/trainingSchedule/validation.js
import { z } from "zod";

export const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid(),
});

const DAY_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// HH:MM format (time without seconds)
const timeField = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}$/, "Must be a valid time in HH:MM format")
  .optional()
  .nullable();

const optionalInt = z.union([z.number(), z.string(), z.null()]).transform((value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}).pipe(z.number().int().optional().nullable());

const optionalNumber = z.union([z.number(), z.string(), z.null()]).transform((value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}).pipe(z.number().optional().nullable());

const scheduleEntrySchema = z
  .object({
    dayOfWeek: z.enum(DAY_OF_WEEK, {
      required_error: "dayOfWeek is required",
      invalid_type_error: `dayOfWeek must be one of: ${DAY_OF_WEEK.join(", ")}`,
    }),
    timeStart: timeField,
    timeEnd: timeField,
    activity: z.string().trim().min(1, "Activity is required").max(4000),
    rpe: optionalInt.pipe(z.number().int().min(1).max(10).optional().nullable()),
  })
  .strict();

export const upsertTrainingScheduleSchema = z
  .object({
    trainingInfo: z
      .object({
        upcomingMajorCompetitions: z
          .string()
          .trim()
          .max(4000)
          .optional()
          .nullable(),
        upcomingLocalCompetitions: z
          .string()
          .trim()
          .max(4000)
          .optional()
          .nullable(),
        currentPerformance: z.string().trim().max(4000).optional().nullable(),
        coachPerformanceGoals: z
          .string()
          .trim()
          .max(4000)
          .optional()
          .nullable(),
        athletePerformanceGoals: z
          .string()
          .trim()
          .max(4000)
          .optional()
          .nullable(),
        otherRemarks: z.string().trim().max(4000).optional().nullable(),
        pal: optionalNumber.pipe(z.number().min(0).max(5).optional().nullable()),
        rpeWeek: optionalInt.pipe(z.number().int().min(1).max(10).optional().nullable()),
      })
      .strict(),
    schedule: z.array(scheduleEntrySchema).default([]),
  })
  .strict();
