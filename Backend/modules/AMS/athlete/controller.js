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

// ============================================================================
// LIST ATHLETES
// ============================================================================

export async function listAthletes(req, res) {
  try {
    // Step 1: Parse query params
    const { page, search } = paginationSchema.parse(req.query);
    const pageSize = 10;

    console.log(`DEBUG: listAthletes called with userId: ${req.user?.userId}`);

    let athletes, totalCount;

    if (search) {
      // Step 2a: Search athletes
      console.log(`Step 2: Searching athletes with query: "${search}"`);
      [athletes, totalCount] = await Promise.all([
        services.searchAthletes(search, page, pageSize, req.user?.userId),
        services.getSearchAthleteCount(search),
      ]);
    } else {
      // Step 2b: Get all athletes paginated
      console.log(`Step 2: Fetching athletes page ${page}`);
      [athletes, totalCount] = await Promise.all([
        services.getAthletesByPage(page, pageSize, req.user?.userId),
        services.getTotalAthleteCount(),
      ]);
    }

    const totalPages = Math.ceil(totalCount / pageSize);

    const data = athletes.rows;

    res.json({
      data,
      currentPage: page,
      totalPages,
      totalCount,
      searchQuery: search || null,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    console.error("Error listing athletes:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch athletes", message: error.message });
  }
}

// ============================================================================
// GET ATHLETE PROFILE (detail page card)
// ============================================================================

export async function getAthleteProfile(req, res) {
  try {
    const { id } = uuidParamSchema.parse(req.params);

    const profile = await services.getAthleteProfile(id);

    if (!profile) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    res.json(profile);
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Invalid athlete ID format",
        details: error.errors.map((e) => ({
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
// CREATE BASIC ATHLETE (athlete record only)
// ============================================================================

export async function createBasicAthlete(req, res) {
  try {
    // Step 1: Validate request body
    console.log("Step 1: Validating request body");
    const validated = createBasicAthleteSchema.parse(req.body);

    // Step 2: Validate sport_id exists in Sport_Lookup
    console.log("Step 2: Validating sport_id");
    const sportCheck = await pool.query(
      "SELECT id FROM AMS.Sport_Lookup WHERE id = $1 AND is_active = true",
      [validated.sport_id],
    );
    if (sportCheck.rows.length === 0) {
      return res.status(400).json({
        error: "Invalid sport_id",
        details: [
          { field: "sport_id", message: "Sport not found or inactive" },
        ],
      });
    }

    // Step 3: Check for duplicate sportsync_id
    console.log("Step 3: Checking for duplicate sportsync_id");
    const isDuplicate = await services.checkDuplicateAthlete(
      validated.sportsync_id,
    );
    if (isDuplicate) {
      return res.status(409).json({
        error: "Duplicate athlete",
        details: [
          {
            field: "sportsync_id",
            message: `Athlete with sportsync_id "${validated.sportsync_id}" already exists`,
          },
        ],
      });
    }

    // Step 4: Create athlete
    console.log("Step 4: Creating basic athlete");
    const athlete = await services.createBasicAthlete(validated, req.user?.userId);

    console.log(`Step 5: Athlete ${athlete.id} created successfully`);

    res.status(201).json({
      message: "Athlete created successfully",
      data: athlete,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Validation failed",
        details: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    console.error("Error creating athlete:", error);
    res
      .status(500)
      .json({ error: "Failed to create athlete", message: error.message });
  }
}

// ============================================================================
// CREATE COMPLETE ATHLETE (athlete + registry + medical + assignments)
// ============================================================================

export async function createCompleteAthlete(req, res) {
  try {
    // Step 1: Validate request body
    console.log("Step 1: Validating request body");
    const validated = createCompleteAthleteSchema.parse(req.body);

    // Step 2: Validate sport_id exists in Sport_Lookup
    console.log("Step 2: Validating sport_id");
    const sportCheck = await pool.query(
      "SELECT id FROM AMS.Sport_Lookup WHERE id = $1 AND is_active = true",
      [validated.sport_id],
    );
    if (sportCheck.rows.length === 0) {
      return res.status(400).json({
        error: "Invalid sport_id",
        details: [
          { field: "sport_id", message: "Sport not found or inactive" },
        ],
      });
    }

    // Step 3: Check for duplicate sportsync_id
    console.log("Step 3: Checking for duplicate sportsync_id");
    const isDuplicate = await services.checkDuplicateAthlete(
      validated.sportsync_id,
    );
    if (isDuplicate) {
      return res.status(409).json({
        error: "Duplicate athlete",
        details: [
          {
            field: "sportsync_id",
            message: `Athlete with sportsync_id "${validated.sportsync_id}" already exists`,
          },
        ],
      });
    }

    // Step 4: Validate coach IDs exist
    if (validated.coach_ids.length > 0) {
      console.log("Step 4a: Validating coach IDs");
      const coachCheck = await pool.query(
        "SELECT id FROM AMS.Coach WHERE id = ANY($1::uuid[])",
        [validated.coach_ids],
      );
      if (coachCheck.rows.length !== validated.coach_ids.length) {
        const foundIds = coachCheck.rows.map((r) => r.id);
        const invalidIds = validated.coach_ids.filter(
          (id) => !foundIds.includes(id),
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

    // Step 5: Look up nutritionist from logged-in user for auto-assignment (optional)
    console.log("Step 5: Looking up nutritionist for logged-in user");
    const nutritionistId = await services.getNutritionistIdByUserId(
      req.user.userId,
    );

    // Make nutritionist assignment optional - if user doesn't have a nutritionist profile,
    // we'll still allow athlete creation but without nutritionist assignment
    const nutritionistIds = nutritionistId ? [nutritionistId] : [];

    // Step 6: Separate data
    console.log("Step 6: Creating complete athlete with relations");
    const athleteData = {
      sport_id: validated.sport_id,
      sportsync_id: validated.sportsync_id,
      athlete_name_abbr: validated.athlete_name_abbr,
      gender: validated.gender,
      date_of_birth: validated.date_of_birth,
      ethnicity: validated.ethnicity,
      target_event: validated.target_event,
      sport_start_date: validated.sport_start_date,
    };

    const registryData = {
      carding_status: validated.carding_status,
      athlete_notified_on: validated.athlete_notified_on,
      carding_start_date: validated.carding_start_date,
      carding_end_date: validated.carding_end_date,
      medical_clearance: validated.medical_clearance,
      approved_start_date: validated.approved_start_date,
      approved_end_date: validated.approved_end_date,
    };

    const medicalData = {
      medical_condition: validated.medical_condition,
      food_allergy: validated.food_allergy,
      drug_allergy: validated.drug_allergy,
      past_injury: validated.past_injury,
      medical_remarks: validated.medical_remarks,
      dietary_restriction: validated.dietary_restriction,
    };

    // Step 7: Create in transaction
    const result = await services.createCompleteAthlete(
      athleteData,
      registryData,
      medicalData,
      validated.coach_ids,
      nutritionistIds,
      req.user?.userId,
    );

    console.log(
      `Step 7: Athlete ${result.athlete.id} created successfully with all relations`,
    );

    res.status(201).json({
      message: "Athlete created successfully with all relations",
      data: result,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Validation failed",
        details: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    console.error("Error creating complete athlete:", error);
    res
      .status(500)
      .json({ error: "Failed to create athlete", message: error.message });
  }
}

// ============================================================================
// CREATE COMPLETE ATHLETE - ADMIN (specify nutritionist_id)
// ============================================================================

export async function adminCreateCompleteAthlete(req, res) {
  try {
    // Step 1: Validate request body
    console.log("Step 1: Validating request body");
    const validated = adminCreateCompleteAthleteSchema.parse(req.body);

    // Step 2: Validate sport_id exists in Sport_Lookup
    console.log("Step 2: Validating sport_id");
    const sportCheck = await pool.query(
      "SELECT id FROM AMS.Sport_Lookup WHERE id = $1 AND is_active = true",
      [validated.sport_id],
    );
    if (sportCheck.rows.length === 0) {
      return res.status(400).json({
        error: "Invalid sport_id",
        details: [
          { field: "sport_id", message: "Sport not found or inactive" },
        ],
      });
    }

    // Step 3: Check for duplicate sportsync_id
    console.log("Step 3: Checking for duplicate sportsync_id");
    const isDuplicate = await services.checkDuplicateAthlete(
      validated.sportsync_id,
    );
    if (isDuplicate) {
      return res.status(409).json({
        error: "Duplicate athlete",
        details: [
          {
            field: "sportsync_id",
            message: `Athlete with sportsync_id "${validated.sportsync_id}" already exists`,
          },
        ],
      });
    }

    // Step 4: Validate coach IDs exist
    if (validated.coach_ids.length > 0) {
      console.log("Step 4: Validating coach IDs");
      const coachCheck = await pool.query(
        "SELECT id FROM AMS.Coach WHERE id = ANY($1::uuid[])",
        [validated.coach_ids],
      );
      if (coachCheck.rows.length !== validated.coach_ids.length) {
        const foundIds = coachCheck.rows.map((r) => r.id);
        const invalidIds = validated.coach_ids.filter(
          (id) => !foundIds.includes(id),
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

    // Step 5: Validate nutritionist_id exists (if provided)
    console.log("Step 5: Validating nutritionist_id");
    if (validated.nutritionist_id) {
      const nutritionistCheck = await pool.query(
        "SELECT id FROM AMS.Nutritionist WHERE id = $1",
        [validated.nutritionist_id],
      );
      if (nutritionistCheck.rows.length === 0) {
        return res.status(400).json({
          error: "Invalid nutritionist_id",
          details: [
            { field: "nutritionist_id", message: "Nutritionist not found" },
          ],
        });
      }
    }

    // Step 6: Separate data
    console.log("Step 6: Creating complete athlete with relations");
    const athleteData = {
      sport_id: validated.sport_id,
      sportsync_id: validated.sportsync_id,
      athlete_name_abbr: validated.athlete_name_abbr,
      gender: validated.gender,
      date_of_birth: validated.date_of_birth,
      ethnicity: validated.ethnicity,
      target_event: validated.target_event,
      sport_start_date: validated.sport_start_date,
    };

    const registryData = {
      carding_status: validated.carding_status,
      athlete_notified_on: validated.athlete_notified_on,
      carding_start_date: validated.carding_start_date,
      carding_end_date: validated.carding_end_date,
      medical_clearance: validated.medical_clearance,
      approved_start_date: validated.approved_start_date,
      approved_end_date: validated.approved_end_date,
    };

    const medicalData = {
      medical_condition: validated.medical_condition,
      food_allergy: validated.food_allergy,
      drug_allergy: validated.drug_allergy,
      past_injury: validated.past_injury,
      medical_remarks: validated.medical_remarks,
      dietary_restriction: validated.dietary_restriction,
    };

    // Step 7: Create in transaction
    const nutritionistIds = validated.nutritionist_id
      ? [validated.nutritionist_id]
      : [];
    const result = await services.createCompleteAthlete(
      athleteData,
      registryData,
      medicalData,
      validated.coach_ids,
      nutritionistIds,
      req.user?.userId,
    );

    console.log(
      `Step 7: Athlete ${result.athlete.id} created successfully with all relations (admin)`,
    );

    res.status(201).json({
      message: "Athlete created successfully with all relations",
      data: result,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Validation failed",
        details: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    console.error("Error creating complete athlete (admin):", error);
    res
      .status(500)
      .json({ error: "Failed to create athlete", message: error.message });
  }
}

// ============================================================================
// UPDATE ATHLETE PROFILE (regular user - no nutritionist control)
// ============================================================================

export async function updateAthleteProfile(req, res) {
  try {
    const { id } = uuidParamSchema.parse(req.params);
    const validated = updateProfileSchema.parse(req.body);

    // Check athlete exists
    const exists = await pool.query(
      "SELECT id FROM AMS.Athlete WHERE id = $1",
      [id],
    );
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    // Validate sport_id if provided
    if (validated.sport_id) {
      const sportCheck = await pool.query(
        "SELECT id FROM AMS.Sport_Lookup WHERE id = $1 AND is_active = true",
        [validated.sport_id],
      );
      if (sportCheck.rows.length === 0) {
        return res.status(400).json({
          error: "Invalid sport_id",
          details: [
            { field: "sport_id", message: "Sport not found or inactive" },
          ],
        });
      }
    }

    // Validate sportsync_id uniqueness if provided (exclude current athlete)
    if (validated.sportsync_id) {
      const isDuplicate = await services.checkDuplicateAthlete(
        validated.sportsync_id,
        id,
      );
      if (isDuplicate) {
        return res.status(409).json({
          error: "Duplicate athlete",
          details: [
            {
              field: "sportsync_id",
              message: `Athlete with sportsync_id "${validated.sportsync_id}" already exists`,
            },
          ],
        });
      }
    }

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

    const result = await services.updateAthleteProfile(id, validated, {
      updateNutritionists: false,
    }, req.user?.userId);

    res.json({
      message: "Athlete profile updated successfully",
      data: result,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Validation failed",
        details: error.errors.map((e) => ({
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

    // Check athlete exists
    const exists = await pool.query(
      "SELECT id FROM AMS.Athlete WHERE id = $1",
      [id],
    );
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    // Validate sport_id if provided
    if (validated.sport_id) {
      const sportCheck = await pool.query(
        "SELECT id FROM AMS.Sport_Lookup WHERE id = $1 AND is_active = true",
        [validated.sport_id],
      );
      if (sportCheck.rows.length === 0) {
        return res.status(400).json({
          error: "Invalid sport_id",
          details: [
            { field: "sport_id", message: "Sport not found or inactive" },
          ],
        });
      }
    }

    // Validate sportsync_id uniqueness if provided (exclude current athlete)
    if (validated.sportsync_id) {
      const isDuplicate = await services.checkDuplicateAthlete(
        validated.sportsync_id,
        id,
      );
      if (isDuplicate) {
        return res.status(409).json({
          error: "Duplicate athlete",
          details: [
            {
              field: "sportsync_id",
              message: `Athlete with sportsync_id "${validated.sportsync_id}" already exists`,
            },
          ],
        });
      }
    }

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

    const result = await services.updateAthleteProfile(id, validated, {
      updateNutritionists: true,
    }, req.user?.userId);

    res.json({
      message: "Athlete profile updated successfully",
      data: result,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Validation failed",
        details: error.errors.map((e) => ({
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

// ============================================================================
// DELETE ATHLETES
// ============================================================================

export async function deleteAthletes(req, res) {
  try {
    // Step 1: Validate IDs
    const { ids } = bulkDeleteSchema.parse(req.body);

    // Step 2: Delete (CASCADE handles registry/medical)
    console.log(`Step 2: Deleting ${ids.length} athlete(s)`);
    const deleted = await services.deleteAthletes(ids, req.user?.userId);

    res.json({
      message: `Successfully deleted ${deleted.length} athlete(s)`,
      deletedCount: deleted.length,
      deletedIds: deleted.map((r) => r.id),
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Validation failed",
        details: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    console.error("Error deleting athletes:", error);
    res
      .status(500)
      .json({ error: "Failed to delete athletes", message: error.message });
  }
}
