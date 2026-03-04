import { param, body, validationResult } from "express-validator";

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array().map(e => ({ field: e.param, message: e.msg })),
    });
  }
  return next();
}

export const validateGetSessionId = [
  param("sessionId").isUUID().withMessage("sessionId must be a valid UUID"),
  handleValidation,
];

export const validatePatchAnthropometry = [
  param("sessionId").isUUID().withMessage("sessionId must be a valid UUID"),

  body("heightCm").optional().isFloat({ min: 0, max: 300 }).withMessage("heightCm must be a valid number"),
  body("weightKg").optional().isFloat({ min: 0, max: 500 }).withMessage("weightKg must be a valid number"),
  body("targetWeightKg").optional().isFloat({ min: 0, max: 500 }).withMessage("targetWeightKg must be a valid number"),
  body("fatMassKg").optional().isFloat({ min: 0, max: 300 }).withMessage("fatMassKg must be a valid number"),
  body("skeletalMuscleMassKg").optional().isFloat({ min: 0, max: 300 }).withMessage("skeletalMuscleMassKg must be a valid number"),

  body("bmiCategory").optional().isIn(["Normal", "Underweight", "Overweight", "Obese"]).withMessage("bmiCategory must be Normal/Underweight/Overweight/Obese"),
  body("sumOf8Skinfold").optional().isFloat({ min: 0, max: 500 }).withMessage("sumOf8Skinfold must be a valid number"),
  body("motherHeightCm").optional().isFloat({ min: 0, max: 300 }).withMessage("motherHeightCm must be a valid number"),
  body("fatherHeightCm").optional().isFloat({ min: 0, max: 300 }).withMessage("fatherHeightCm must be a valid number"),
  body("otherRemarks").optional().isString().isLength({ max: 4000 }).withMessage("otherRemarks must be <= 4000 chars"),
  body("dateRecorded").optional().isISO8601().withMessage("dateRecorded must be a valid date (YYYY-MM-DD)"),
  body("measuredBy").optional().isString().isLength({ max: 255 }).withMessage("measuredBy must be <= 255 chars"),

  handleValidation,
];