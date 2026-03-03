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
  
      // Return defaults if empty (frontend-friendly)
      res.json({
        data:
          data ??
          {
            id: null,
            sessionId,
            days: {
              monday: { am: null, pm: null, trainingHours: 0, rpe: 0 },
              tuesday: { am: null, pm: null, trainingHours: 0, rpe: 0 },
              wednesday: { am: null, pm: null, trainingHours: 0, rpe: 0 },
              thursday: { am: null, pm: null, trainingHours: 0, rpe: 0 },
              friday: { am: null, pm: null, trainingHours: 0, rpe: 0 },
              saturday: { am: null, pm: null, trainingHours: 0, rpe: 0 },
              sunday: { am: null, pm: null, trainingHours: 0, rpe: 0 },
            },
            totalTrainingHours: 0,
            pal: null,
            trainingDetails: {
              upcomingMajorCompetitions: null,
              upcomingLocalCompetitions: null,
            },
            performanceDetails: {
              currentPerformance: null,
              coachPerformanceGoals: null,
              athletePerformanceGoals: null,
              otherRemarks: null,
            },
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
  