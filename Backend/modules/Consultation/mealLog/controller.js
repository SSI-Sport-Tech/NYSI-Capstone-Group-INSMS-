import {
  sessionIdParamSchema,
  upsertMealLogAndSleepSchema,
} from "./validation.js";

import {
  getMealLogAndSleepBySessionId,
  upsertMealLogAndSleepBySessionId,
} from "./services.js";

export async function getMealLog(req, res, next) {
  try {
    const { sessionId } = sessionIdParamSchema.parse(req.params);
    const data = await getMealLogAndSleepBySessionId(sessionId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function upsertMealLog(req, res, next) {
  try {
    const { sessionId } = sessionIdParamSchema.parse(req.params);
    const payload = upsertMealLogAndSleepSchema.parse(req.body);
    const data = await upsertMealLogAndSleepBySessionId(
      sessionId,
      payload,
      req.user.userId
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
