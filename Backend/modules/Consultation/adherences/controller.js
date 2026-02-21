import { getAdherencesBySessionId, patchAdherencesBySessionId } from "./services.js";

export async function getAdherences(req, res, next) {
  try {
    const { sessionId } = req.params;
    const data = await getAdherencesBySessionId(sessionId);
    return res.status(200).json({ data });
  } catch (err) {
    return next(err);
  }
}

export async function patchAdherences(req, res, next) {
  try {
    const { sessionId } = req.params;
    const payload = req.body;
    const data = await patchAdherencesBySessionId(sessionId, payload);
    return res.status(200).json({ data });
  } catch (err) {
    return next(err);
  }
}