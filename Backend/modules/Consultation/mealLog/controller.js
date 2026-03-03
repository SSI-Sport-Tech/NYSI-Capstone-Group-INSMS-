import {
    getMealLogBySessionId,
    upsertMealLogBySessionId,
  } from "./services.js";
  
  export async function getMealLog(req, res, next) {
    try {
      const { sessionId } = req.params;
      const data = await getMealLogBySessionId(sessionId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
  
  export async function upsertMealLog(req, res, next) {
    try {
      const { sessionId } = req.params;
      const payload = req.body;
      const data = await upsertMealLogBySessionId(sessionId, payload, req.user.userId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }