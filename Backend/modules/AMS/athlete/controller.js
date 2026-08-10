import * as services from "./services.js";
import {
  createBasicAthleteSchema,
  createCompleteAthleteSchema,
  adminCreateCompleteAthleteSchema,
  updateProfileSchema,
  adminUpdateProfileSchema,
  paginationSchema,
  uuidParamSchema,
  bulkDeleteSchema,
} from "./validation.js";
import pool from "../../../config/db.js";
import {
  getAthletesFromADEX,
  getAthleteLookupFromADEX,
  getAthleteByUuidFromADEX,
} from "./adexService.js";

// List ADEX Athletes with Pagination, Sorting, and Exporting
export async function listADEXAthletes(req, res) {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 10);
    const exportAll = req.query.export === "true";
    const sortColumn = req.query.sortColumn || "";
    const sortDirection = req.query.sortDirection || "asc";
    const search = req.query.search || "";

    const result = await getAthletesFromADEX(req.user.userId, page, pageSize, exportAll, sortColumn, sortDirection, search);

    res.json(result);
  } catch (error) {
    console.error("Error fetching ADEX athletes:", error);

    res.status(500).json({
      error: "Failed to fetch athletes from ADEX",
      message: error.message,
    });
  }
}

// List ADEX Athletes for Lookup with Sorting
export async function listADEXAthleteLookup(req, res) {
    try {
        const results = await getAthleteLookupFromADEX();

        res.json({data: results,});
    } catch (error) {
        console.error("Error fetching ADEX athlete lookup:", error);

        res.status(500).json({
            error: "Failed to fetch athlete lookup",
            message: error.message,
        });
    }
}

// List 1 Athlete based on UUID
export async function getADEXAthleteByUuid(req, res) {
  try {
    const { pk_athlete_uuid } = req.params;

    // const athlete = await getAthleteByUuidFromADEX(pk_athlete_uuid);

    // res.json(athlete);

    const [athlete, profile] = await Promise.all([
      getAthleteByUuidFromADEX(pk_athlete_uuid),
      services.getAthleteProfile(pk_athlete_uuid),
    ]);

    res.json({
      athlete,
      athlete_profile: profile,
      medical: null,
      coaches: [],
      nutritionists: [],
    });
  } catch (error) {
    console.error("Error fetching ADEX athlete:", error);

    res.status(500).json({
      error: "Failed to fetch athlete from ADEX",
      message: error.message,
    });
  }
}

// ============================================================================
// GET ATHLETE PROFILE (detail page card)
// ============================================================================

export async function getAthleteProfile(req, res) {
  try {
    const { id } = uuidParamSchema.parse(req.params);

    const [athlete, profile, medical, coaches, nutritionists] = await Promise.all([
      getAthleteByUuidFromADEX(id),
      services.getAthleteProfile(id),
      services.getAthleteMedical(id),
      services.getAthleteCoaches(id),
      services.getAthleteNutritionists(id),
    ]);

    res.json({
      athlete,
      athlete_profile: profile,
      medical,
      coaches,
      nutritionists,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Invalid athlete ID format",
        details: error.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    console.error("Error fetching athlete profile:", error);
    res.status(500).json({
      error: "Failed to fetch athlete profile",
      message: error.message,
    });
  }
}

// ============================================================================
// UPDATE ATHLETE PROFILE (regular user - no nutritionist control)
// ============================================================================

export async function updateAthleteProfile(req, res) {
  try {
    const { id } = uuidParamSchema.parse(req.params);
    const validated = updateProfileSchema.parse(req.body);

    // Validate coach IDs if provided
    if (validated.coach_ids && validated.coach_ids.length > 0) {
      const coachCheck = await pool.query(
        "SELECT id FROM AMS.Coach WHERE id = ANY($1::uuid[])",
        [validated.coach_ids],
      );
      if (coachCheck.rows.length !== validated.coach_ids.length) {
        const foundIds = coachCheck.rows.map((r) => r.id);
        const invalidIds = validated.coach_ids.filter(
          (cid) => !foundIds.includes(cid),
        );
        return res.status(400).json({
          error: "Invalid coach_ids",
          details: [
            {
              field: "coach_ids",
              message: `Coach(es) not found: ${invalidIds.join(", ")}`,
            },
          ],
        });
      }
    }

    const profile = await services.upsertAthleteProfile(
      id,
      validated,
      req.user?.userId
    );

    console.log("Updating athlete as:", req.user?.userId);
    await services.upsertAthleteMedical(
      id,
      validated,
      req.user?.userId
    )

    await services.upsertCoachAthleteMapping(
      id,
      validated.coach_ids,
      req.user?.userId
    );

    res.json({
      message: "Athlete profile updated successfully",
      data: profile,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Validation failed",
        details: error.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    console.error("Error updating athlete profile:", error);
    res.status(500).json({
      error: "Failed to update athlete profile",
      message: error.message,
    });
  }
}

// ============================================================================
// UPDATE ATHLETE PROFILE - ADMIN (can edit nutritionist mapping)
// ============================================================================

export async function adminUpdateAthleteProfile(req, res) {
  try {
    const { id } = uuidParamSchema.parse(req.params);
    const validated = adminUpdateProfileSchema.parse(req.body);

    // Validate coach IDs if provided
    if (validated.coach_ids && validated.coach_ids.length > 0) {
      const coachCheck = await pool.query(
        "SELECT id FROM AMS.Coach WHERE id = ANY($1::uuid[])",
        [validated.coach_ids],
      );
      if (coachCheck.rows.length !== validated.coach_ids.length) {
        const foundIds = coachCheck.rows.map((r) => r.id);
        const invalidIds = validated.coach_ids.filter(
          (cid) => !foundIds.includes(cid),
        );
        return res.status(400).json({
          error: "Invalid coach_ids",
          details: [
            {
              field: "coach_ids",
              message: `Coach(es) not found: ${invalidIds.join(", ")}`,
            },
          ],
        });
      }
    }

    // Validate nutritionist IDs if provided
    if (validated.nutritionist_ids && validated.nutritionist_ids.length > 0) {
      const nutritionistCheck = await pool.query(
        "SELECT id FROM AMS.Nutritionist WHERE id = ANY($1::uuid[])",
        [validated.nutritionist_ids],
      );
      if (nutritionistCheck.rows.length !== validated.nutritionist_ids.length) {
        const foundIds = nutritionistCheck.rows.map((r) => r.id);
        const invalidIds = validated.nutritionist_ids.filter(
          (nid) => !foundIds.includes(nid),
        );
        return res.status(400).json({
          error: "Invalid nutritionist_ids",
          details: [
            {
              field: "nutritionist_ids",
              message: `Nutritionist(s) not found: ${invalidIds.join(", ")}`,
            },
          ],
        });
      }
    }

    const profile = await services.upsertAthleteProfile(
      id,
      validated,
      req.user?.userId,
    );
    
    await services.upsertAthleteMedical(
      id,
      validated,
      req.user?.userId
    )

    await services.upsertNutritionistAthleteMapping(
      id,
      validated.nutritionist_ids,
      req.user?.userId
    );

    await services.upsertCoachAthleteMapping(
      id,
      validated.coach_ids,
      req.user?.userId
    );

    res.json({
      message: "Athlete profile updated successfully",
      data: profile,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Validation failed",
        details: error.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    console.error("Error updating athlete profile (admin):", error);
    res.status(500).json({
      error: "Failed to update athlete profile",
      message: error.message,
    });
  }
}
