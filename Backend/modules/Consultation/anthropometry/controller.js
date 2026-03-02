import {
    getAnthropometryBySessionId,
    patchAnthropometryBySessionId,
  } from "./services.js";
  
  export async function getAnthropometry(req, res, next) {
    try {
      const { sessionId } = req.params;
      const data = await getAnthropometryBySessionId(sessionId);
      return res.status(200).json({ data });
    } catch (err) {
      return next(err);
    }
  }
  
  export async function patchAnthropometry(req, res, next) {
    try {
      const { sessionId } = req.params;
      const payload = req.body;
      const data = await patchAnthropometryBySessionId(sessionId, payload, req.user.userId);
      return res.status(200).json({ data });
    } catch (err) {
      return next(err);
    }
  }