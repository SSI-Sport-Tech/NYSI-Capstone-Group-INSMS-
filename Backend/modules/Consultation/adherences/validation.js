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

export const validatePatchAdherences = [
  param("sessionId").isUUID().withMessage("sessionId must be a valid UUID"),

  body("pal").optional().isFloat({ min: 0, max: 9.99 }).withMessage("pal must be a number"),

  body("minCarbGkg").optional().isFloat({ min: 0, max: 50 }).withMessage("minCarbGkg must be a number"),
  body("maxCarbGkg").optional().isFloat({ min: 0, max: 50 }).withMessage("maxCarbGkg must be a number"),
  body("minProteinGkg").optional().isFloat({ min: 0, max: 50 }).withMessage("minProteinGkg must be a number"),
  body("maxProteinGkg").optional().isFloat({ min: 0, max: 50 }).withMessage("maxProteinGkg must be a number"),
  body("minFatGkg").optional().isFloat({ min: 0, max: 50 }).withMessage("minFatGkg must be a number"),
  body("maxFatGkg").optional().isFloat({ min: 0, max: 50 }).withMessage("maxFatGkg must be a number"),

  body("estimatedCarbG").optional().isFloat({ min: 0, max: 9999 }).withMessage("estimatedCarbG must be a number"),
  body("estimatedProteinG").optional().isFloat({ min: 0, max: 9999 }).withMessage("estimatedProteinG must be a number"),
  body("estimatedFatG").optional().isFloat({ min: 0, max: 9999 }).withMessage("estimatedFatG must be a number"),

  body("commentsWeekday").optional({ nullable: true }).isString().isLength({ max: 4000 }).withMessage("commentsWeekday must be <= 4000 chars"),
  body("commentsWeekend").optional({ nullable: true }).isString().isLength({ max: 4000 }).withMessage("commentsWeekend must be <= 4000 chars"),
  body("otherRemarks").optional({ nullable: true }).isString().isLength({ max: 4000 }).withMessage("otherRemarks must be <= 4000 chars"),

  handleValidation,
];