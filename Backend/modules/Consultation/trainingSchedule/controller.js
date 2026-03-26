// Backend/modules/Consultation/trainingSchedule/controller.js
import {
    sessionIdParamSchema,
    upsertTrainingScheduleSchema,
  } from "./validation.js";
  
  import {
    getTrainingScheduleBySessionId,
    upsertTrainingScheduleBySessionId,
    assertSessionExists,
  } from "./services.js";
  
  export async function getTrainingSchedule(req, res, next) {
    try {
      const { sessionId } = sessionIdParamSchema.parse(req.params);
  
      // Optional: ensure session exists even if schedule row doesn't yet
      await assertSessionExists(sessionId);
  
      const data = await getTrainingScheduleBySessionId(sessionId);
  
      // Return defaults if no training record exists yet (frontend-friendly)
      res.json({
        data: data ?? {
          trainingInfo: {
            upcomingMajorCompetitions: null,
            upcomingLocalCompetitions: null,
            currentPerformance: null,
            coachPerformanceGoals: null,
            athletePerformanceGoals: null,
            otherRemarks: null,
            pal: null,
            rpeWeek: 0,
          },
          schedule: [],
        },
      });
    } catch (err) {
      next(err);
    }
  }
  
  export async function upsertTrainingSchedule(req, res, next) {
    try {
      const { sessionId } = sessionIdParamSchema.parse(req.params);
      const payload = upsertTrainingScheduleSchema.parse(req.body);
  
      const data = await upsertTrainingScheduleBySessionId(sessionId, payload, req.user.userId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
  