import { getNutritionRequirementsBySessionId, patchNutritionRequirementsBySessionId } from "./services.js";

export async function getNutritionRequirements(req, res, next) {
  try {
    const { sessionId } = req.params;
    const data = await getNutritionRequirementsBySessionId(sessionId);
    return res.status(200).json({ data });
  } catch (err) {
    return next(err);
  }
}

export async function patchNutritionRequirements(req, res, next) {
  try {
    const { sessionId } = req.params;
    const payload = req.body;
    const data = await patchNutritionRequirementsBySessionId(sessionId, payload, req.user.userId);
    return res.status(200).json({ data });
  } catch (err) {
    return next(err);
  }
}
