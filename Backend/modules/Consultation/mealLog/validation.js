const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pushErr(details, field, message) {
  details.push({ field, message });
}

export function validateSessionIdParam(req, res, next) {
  const { sessionId } = req.params;
  if (!UUID_REGEX.test(sessionId)) {
    return res.status(400).json({
      error: "Validation failed",
      details: [{ field: "sessionId", message: "Invalid UUID format" }],
    });
  }
  next();
}

function isStringOrNull(v) {
  return v === null || v === undefined || typeof v === "string";
}

function isNumberOrNull(v) {
  return v === null || v === undefined || (typeof v === "number" && Number.isFinite(v));
}

function validateMealEntry(details, obj, path) {
  if (obj === null || obj === undefined) return; // optional
  if (typeof obj !== "object" || Array.isArray(obj)) {
    pushErr(details, path, "Must be an object");
    return;
  }
  if (!isStringOrNull(obj.food)) pushErr(details, `${path}.food`, "Must be a string or null");
  if (!isStringOrNull(obj.macro)) pushErr(details, `${path}.macro`, "Must be a string or null");

  if (typeof obj.food === "string" && obj.food.length > 4000)
    pushErr(details, `${path}.food`, "Max length is 4000");
  if (typeof obj.macro === "string" && obj.macro.length > 4000)
    pushErr(details, `${path}.macro`, "Max length is 4000");
}

export function validateMealLogBody(req, res, next) {
  const b = req.body || {};
  const details = [];

  validateMealEntry(details, b.amBreakfast, "amBreakfast");
  validateMealEntry(details, b.amTraining, "amTraining");
  validateMealEntry(details, b.pmLunch, "pmLunch");
  validateMealEntry(details, b.pmTraining, "pmTraining");
  validateMealEntry(details, b.pmDinner, "pmDinner");
  validateMealEntry(details, b.supper, "supper");

  if (!isNumberOrNull(b.totalCarbohydrateIntake))
    pushErr(details, "totalCarbohydrateIntake", "Must be a number or null");
  if (!isNumberOrNull(b.totalProteinIntake))
    pushErr(details, "totalProteinIntake", "Must be a number or null");
  if (!isNumberOrNull(b.totalFatIntake))
    pushErr(details, "totalFatIntake", "Must be a number or null");

  if (!isStringOrNull(b.otherRemarks))
    pushErr(details, "otherRemarks", "Must be a string or null");
  if (typeof b.otherRemarks === "string" && b.otherRemarks.length > 4000)
    pushErr(details, "otherRemarks", "Max length is 4000");

  if (details.length) {
    return res.status(400).json({ error: "Validation failed", details });
  }

  next();
}