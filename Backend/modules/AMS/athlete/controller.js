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
  getAthleteByUuidFromADEX,
} from "./adexService.js";

// List ADEX Athletes
export async function listADEXAthletes(req, res) {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 10);
    const exportAll = req.query.export === "true";
    const sortColumn = req.query.sortColumn || "";
    const sortDirection = req.query.sortDirection || "asc";

    const result = await getAthletesFromADEX(req.user.userId, page, pageSize, exportAll, sortColumn, sortDirection);

    res.json(result);
  } catch (error) {
    console.error("Error fetching ADEX athletes:", error);

    res.status(500).json({
      error: "Failed to fetch athletes from ADEX",
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
// LIST ATHLETES
// ============================================================================

export async function listAthletes(req, res) {
  try {
    // Step 1: Parse query params
    const { page, search } = paginationSchema.parse(req.query);
    const pageSize = 10;

    console.log(`DEBUG: listAthletes called with userId: ${req.user?.userId}`);

    let athletes, totalCount, activeCount;

    if (search) {
      // Step 2a: Search athletes
      console.log(`Step 2: Searching athletes with query: "${search}"`);
      [athletes, totalCount, activeCount] = await Promise.all([
        services.searchAthletes(search, page, pageSize, req.user?.userId),
        services.getSearchAthleteCount(search),
        services.getActiveAthleteCount(),
      ]);
    } else {
      // Step 2b: Get all athletes paginated
      console.log(`Step 2: Fetching athletes page ${page}`);
      [athletes, totalCount, activeCount] = await Promise.all([
        services.getAthletesByPage(page, pageSize, req.user?.userId),
        services.getTotalAthleteCount(),
        services.getActiveAthleteCount(),
      ]);
    }

    const totalPages = Math.ceil(totalCount / pageSize);

    const data = athletes.rows;

    res.json({
      data,
      currentPage: page,
      totalPages,
      totalCount,
      activeCount,
      searchQuery: search || null,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: error.issues.map((e) => ({
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

    const [athlete, profile, nutritionists] = await Promise.all([
      getAthleteByUuidFromADEX(id),
      services.getAthleteProfile(id),
      services.getAthleteNutritionists(id),
    ]);

    res.json({
      athlete,
      athlete_profile: profile,
      medical: null,
      coaches: [],
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

// // ============================================================================
// // CREATE BASIC ATHLETE (athlete record only)
// // ============================================================================

// export async function createBasicAthlete(req, res) {
//   try {
//     // Step 1: Validate request body
//     console.log("Step 1: Validating request body");
//     const validated = createBasicAthleteSchema.parse(req.body);

//     // Step 2: Validate sport_id exists in Sport_Lookup
//     console.log("Step 2: Validating sport_id");
//     const sportCheck = await pool.query(
//       "SELECT id FROM AMS.Sport_Lookup WHERE id = $1 AND is_active = true",
//       [validated.sport_id],
//     );
//     if (sportCheck.rows.length === 0) {
//       return res.status(400).json({
//         error: "Invalid sport_id",
//         details: [
//           { field: "sport_id", message: "Sport not found or inactive" },
//         ],
//       });
//     }

//     // Step 3: Check for duplicate sportsync_id
//     console.log("Step 3: Checking for duplicate sportsync_id");
//     const isDuplicate = await services.checkDuplicateAthlete(
//       validated.sportsync_id,
//     );
//     if (isDuplicate) {
//       return res.status(409).json({
//         error: "Duplicate athlete",
//         details: [
//           {
//             field: "sportsync_id",
//             message: `Athlete with sportsync_id "${validated.sportsync_id}" already exists`,
//           },
//         ],
//       });
//     }

//     // Step 4: Create athlete
//     console.log("Step 4: Creating basic athlete");
//     const athlete = await services.createBasicAthlete(validated, req.user?.userId);

//     console.log(`Step 5: Athlete ${athlete.id} created successfully`);

//     res.status(201).json({
//       message: "Athlete created successfully",
//       data: athlete,
//     });
//   } catch (error) {
//     if (error.name === "ZodError") {
//       return res.status(400).json({
//         error: "Validation failed",
//         details: error.issues.map((e) => ({
//           field: e.path.join("."),
//           message: e.message,
//         })),
//       });
//     }
//     console.error("Error creating athlete:", error);
//     res
//       .status(500)
//       .json({ error: "Failed to create athlete", message: error.message });
//   }
// }

// ============================================================================
// CREATE COMPLETE ATHLETE (athlete + registry + medical + assignments)
// ============================================================================

// export async function createCompleteAthlete(req, res) {
//   try {
//     console.log("Step 1: Validating request body");
//     const validated = createCompleteAthleteSchema.parse(req.body);

//     console.log("Step 2: Validating sport_id");
//     const sportCheck = await pool.query(
//       "SELECT id, sport FROM AMS.Sport_Lookup WHERE id = $1 AND is_active = true",
//       [validated.sport_id],
//     );
//     if (sportCheck.rows.length === 0) {
//       return res.status(400).json({
//         error: "Invalid sport_id",
//         details: [{ field: "sport_id", message: "Sport not found or inactive" }],
//       });
//     }
//     const nomsSportName = sportCheck.rows[0].sport;

//     console.log("Step 3: Checking for duplicate sportsync_id");
//     const isDuplicate = await services.checkDuplicateAthlete(validated.sportsync_id);
//     if (isDuplicate) {
//       return res.status(409).json({
//         error: "Duplicate athlete",
//         details: [{ field: "sportsync_id", message: `Athlete with sportsync_id "${validated.sportsync_id}" already exists` }],
//       });
//     }

//     if (validated.coach_ids.length > 0) {
//       console.log("Step 4a: Validating coach IDs");
//       const coachCheck = await pool.query(
//         "SELECT id FROM AMS.Coach WHERE id = ANY($1::uuid[])",
//         [validated.coach_ids],
//       );
//       if (coachCheck.rows.length !== validated.coach_ids.length) {
//         const foundIds = coachCheck.rows.map((r) => r.id);
//         const invalidIds = validated.coach_ids.filter((id) => !foundIds.includes(id));
//         return res.status(400).json({
//           error: "Invalid coach_ids",
//           details: [{ field: "coach_ids", message: `Coach(es) not found: ${invalidIds.join(", ")}` }],
//         });
//       }
//     }

//     // Validate AEMS fields
//     if (!validated.initials) {
//       return res.status(400).json({ error: 'Initials are required for AEMS record' });
//     }
//     if (validated.email && (!validated.pin || !/^\d{6}$/.test(validated.pin))) {
//       return res.status(400).json({ error: 'A 6-digit PIN is required when providing an email' });
//     }

//     console.log("Step 5: Looking up nutritionist for logged-in user");
//     const nutritionistId = await services.getNutritionistIdByUserId(req.user.userId);
//     const nutritionistIds = nutritionistId ? [nutritionistId] : [];

//     console.log("Step 6: Creating complete athlete with relations");
//     const athleteData = {
//       sport_id: validated.sport_id,
//       sportsync_id: validated.sportsync_id,
//       initials: validated.initials,
//       gender: validated.gender,
//       date_of_birth: validated.date_of_birth,
//       ethnicity: validated.ethnicity,
//       target_event: validated.target_event,
//       sport_start_date: validated.sport_start_date,
//     };
//     const registryData = {
//       carding_status: validated.carding_status,
//       athlete_notified_on: validated.athlete_notified_on,
//       carding_start_date: validated.carding_start_date,
//       carding_end_date: validated.carding_end_date,
//       medical_clearance: validated.medical_clearance,
//       approved_start_date: validated.approved_start_date,
//       approved_end_date: validated.approved_end_date,
//       initial_budget: validated.initial_budget,
//     };
//     const medicalData = {
//       medical_condition: validated.medical_condition,
//       food_allergy: validated.food_allergy,
//       drug_allergy: validated.drug_allergy,
//       past_injury: validated.past_injury,
//       medical_remarks: validated.medical_remarks,
//       dietary_restriction: validated.dietary_restriction,
//     };

//     const result = await services.createCompleteAthlete(
//       athleteData, registryData, medicalData,
//       validated.coach_ids, nutritionistIds,
//       req.user?.userId,
//     );
//     console.log(`Step 7: Athlete ${result.athlete.id} created successfully`);

//     // ── AEMS Integration ──────────────────────────────────────────────────────
//     let aemsResult = null;
//     try {
//       aemsResult = await services.createAEMSAthleteRecords({
//         nomsAthleteId: result.athlete.id,
//         nomsSportId: validated.sport_id,
//         initials: validated.initials,
//         // nomsSportName removed
//         cardingStatus: validated.carding_status,
//         initialBudget: validated.initial_budget || 1000.00,
//         email: validated.email || null,
//         pin: validated.pin || null,
//         performedBy: req.user?.userId,
//       });
//     } catch (aemsError) {
//       console.error('⚠️  AEMS record creation failed (NOMS athlete still created):', aemsError.message);
//     }

//     res.status(201).json({
//       message: "Athlete created successfully with all relations",
//       data: { ...result, aems: aemsResult },
//     });
//   } catch (error) {
//     if (error.name === "ZodError") {
//       return res.status(400).json({
//         error: "Validation failed",
//         details: error.issues.map((e) => ({ field: e.path.join("."), message: e.message })),
//       });
//     }
//     console.error("Error creating complete athlete:", error);
//     res.status(500).json({ error: "Failed to create athlete", message: error.message });
//   }
// }

// // ============================================================================
// // CREATE COMPLETE ATHLETE - ADMIN (specify nutritionist_id)
// // ============================================================================

// export async function adminCreateCompleteAthlete(req, res) {
//   try {
//     console.log("Step 1: Validating request body");
//     const validated = adminCreateCompleteAthleteSchema.parse(req.body);

//     console.log("Step 2: Validating sport_id");
//     const sportCheck = await pool.query(
//       "SELECT id, sport FROM AMS.Sport_Lookup WHERE id = $1 AND is_active = true",
//       [validated.sport_id],
//     );
//     if (sportCheck.rows.length === 0) {
//       return res.status(400).json({
//         error: "Invalid sport_id",
//         details: [{ field: "sport_id", message: "Sport not found or inactive" }],
//       });
//     }
//     const nomsSportName = sportCheck.rows[0].sport;

//     console.log("Step 3: Checking for duplicate sportsync_id");
//     const isDuplicate = await services.checkDuplicateAthlete(validated.sportsync_id);
//     if (isDuplicate) {
//       return res.status(409).json({
//         error: "Duplicate athlete",
//         details: [{ field: "sportsync_id", message: `Athlete with sportsync_id "${validated.sportsync_id}" already exists` }],
//       });
//     }

//     if (validated.coach_ids.length > 0) {
//       console.log("Step 4: Validating coach IDs");
//       const coachCheck = await pool.query(
//         "SELECT id FROM AMS.Coach WHERE id = ANY($1::uuid[])",
//         [validated.coach_ids],
//       );
//       if (coachCheck.rows.length !== validated.coach_ids.length) {
//         const foundIds = coachCheck.rows.map((r) => r.id);
//         const invalidIds = validated.coach_ids.filter((id) => !foundIds.includes(id));
//         return res.status(400).json({
//           error: "Invalid coach_ids",
//           details: [{ field: "coach_ids", message: `Coach(es) not found: ${invalidIds.join(", ")}` }],
//         });
//       }
//     }

//     console.log("Step 5: Validating nutritionist_id");
//     if (validated.nutritionist_id) {
//       const nutritionistCheck = await pool.query(
//         "SELECT id FROM AMS.Nutritionist WHERE id = $1",
//         [validated.nutritionist_id],
//       );
//       if (nutritionistCheck.rows.length === 0) {
//         return res.status(400).json({
//           error: "Invalid nutritionist_id",
//           details: [{ field: "nutritionist_id", message: "Nutritionist not found" }],
//         });
//       }
//     }

//     // Validate AEMS fields
//     if (!validated.initials) {
//       return res.status(400).json({ error: 'Initials are required for AEMS record' });
//     }
//     if (validated.email && (!validated.pin || !/^\d{6}$/.test(validated.pin))) {
//       return res.status(400).json({ error: 'A 6-digit PIN is required when providing an email' });
//     }

//     console.log("Step 6: Creating complete athlete with relations");
//     const athleteData = {
//       sport_id: validated.sport_id,
//       sportsync_id: validated.sportsync_id,
//       initials: validated.initials,
//       gender: validated.gender,
//       date_of_birth: validated.date_of_birth,
//       ethnicity: validated.ethnicity,
//       target_event: validated.target_event,
//       sport_start_date: validated.sport_start_date,
//     };
//     const registryData = {
//       carding_status: validated.carding_status,
//       athlete_notified_on: validated.athlete_notified_on,
//       carding_start_date: validated.carding_start_date,
//       carding_end_date: validated.carding_end_date,
//       medical_clearance: validated.medical_clearance,
//       approved_start_date: validated.approved_start_date,
//       approved_end_date: validated.approved_end_date,
//       initial_budget: validated.initial_budget
//     };
//     const medicalData = {
//       medical_condition: validated.medical_condition,
//       food_allergy: validated.food_allergy,
//       drug_allergy: validated.drug_allergy,
//       past_injury: validated.past_injury,
//       medical_remarks: validated.medical_remarks,
//       dietary_restriction: validated.dietary_restriction,
//     };

//     const nutritionistIds = validated.nutritionist_id ? [validated.nutritionist_id] : [];
//     const result = await services.createCompleteAthlete(
//       athleteData, registryData, medicalData,
//       validated.coach_ids, nutritionistIds,
//       req.user?.userId,
//     );
//     console.log(`Step 7: Athlete ${result.athlete.id} created successfully (admin)`);

//     // ── AEMS Integration ──────────────────────────────────────────────────────
//     let aemsResult = null;
//     try {
//       aemsResult = await services.createAEMSAthleteRecords({
//         nomsAthleteId: result.athlete.id,
//         nomsSportId: validated.sport_id,
//         initials: validated.initials,
//         // nomsSportName removed
//         cardingStatus: validated.carding_status,
//         initialBudget: validated.initial_budget || 1000.00,
//         email: validated.email || null,
//         pin: validated.pin || null,
//         performedBy: req.user?.userId,
//       });
//     } catch (aemsError) {
//       console.error('⚠️  AEMS record creation failed (NOMS athlete still created):', aemsError.message);
//     }

//     res.status(201).json({
//       message: "Athlete created successfully with all relations",
//       data: { ...result, aems: aemsResult },
//     });
//   } catch (error) {
//     if (error.name === "ZodError") {
//       return res.status(400).json({
//         error: "Validation failed",
//         details: error.issues.map((e) => ({ field: e.path.join("."), message: e.message })),
//       });
//     }
//     console.error("Error creating complete athlete (admin):", error);
//     res.status(500).json({ error: "Failed to create athlete", message: error.message });
//   }
// }

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

    await services.upsertNutritionistAthleteMapping(
      id,
      validated.nutritionist_ids,
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
