import pool, { withUserContext } from "../../../config/db.js";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create the User_Athlete_Pins table if it doesn't exist
 * This table allows any user to pin any athlete for personal organization
 */
async function createUserAthletePinsTable() {
  const query = `
        CREATE TABLE IF NOT EXISTS AMS.User_Athlete_Pins (
            id UUID PRIMARY KEY DEFAULT public.uuid_generate_v7(),
            user_id UUID NOT NULL,
            athlete_id UUID NOT NULL,
            is_pinned BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            
            UNIQUE(user_id, athlete_id),
            
            FOREIGN KEY (athlete_id) REFERENCES AMS.Athlete(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_user_athlete_pins_user_id ON AMS.User_Athlete_Pins(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_athlete_pins_athlete_id ON AMS.User_Athlete_Pins(athlete_id);
        CREATE INDEX IF NOT EXISTS idx_user_athlete_pins_is_pinned ON AMS.User_Athlete_Pins(is_pinned);
    `;

  await pool.query(query);
}

// ============================================================================
// ATHLETE CRUD SERVICES
// ============================================================================

/**
 * Get single athlete by ID with sport name AND latest target event
 * @param {string} athleteId - UUID of athlete
 * @returns {Promise<Object|null>} Athlete object or null
 */
export async function getAthleteById(athleteId) {
  // 1. Fetch Basic Profile
  const profileQuery = `
        SELECT
            a.id,
            a.sport_id,
            a.sportsync_id,
            a.athlete_name_abbr,
            a.gender,
            a.date_of_birth,
            a.ethnicity,
            a.target_event,
            a.sport_start_date,
            sl.sport AS sport_name
        FROM AMS.Athlete a
        LEFT JOIN AMS.Sport_Lookup sl ON a.sport_id = sl.id
        WHERE a.id = $1
    `;

  // 2. Fetch Target Event from Latest Consultation
  // Joins Sessions -> Session Training to get 'upcoming_major_competitions'
  const targetEventQuery = `
        SELECT st.upcoming_major_competitions AS target_event, s.date_of_consult
        FROM consultation.sessions s
        JOIN consultation.session_training st ON st.sessions_id = s.id
        WHERE s.athlete_id = $1
        ORDER BY s.date_of_consult DESC
        LIMIT 1
    `;

  // Run both queries in parallel for efficiency
  const [profileRes, eventRes] = await Promise.all([
    pool.query(profileQuery, [athleteId]),
    pool.query(targetEventQuery, [athleteId]),
  ]);

  if (profileRes.rows.length === 0) return null;

  const profile = profileRes.rows[0];

  // Attach the dynamic target event data if a consultation exists
  if (eventRes.rows.length > 0) {
    profile.latest_target_event = eventRes.rows[0].target_event;
    profile.latest_consult_date = eventRes.rows[0].date_of_consult;
  } else {
    profile.latest_target_event = null;
    profile.latest_consult_date = null;
  }

  return profile;
}
// ADD THIS FUNCTION after getAthleteById (around line 60)

/**
 * Get paginated list of athletes with sport name
 * @param {number} pageNumber - Page number (1-indexed)
 * @param {number} pageSize - Items per page
 * @returns {Promise<Object>} Query result with rows
 */
export async function getAthletesByPage(
  pageNumber,
  pageSize = 10,
  userId = null,
) {
  const offset = (pageNumber - 1) * pageSize;

  const baseQuery = `
        SELECT
            a.id,
            a.sportsync_id,
            a.athlete_name_abbr,
            sl.sport AS sport_name,
            a.gender,
            a.date_of_birth,
            a.target_event,
            r.carding_status,
            COALESCE(
                (SELECT n.name FROM AMS.Nutritionist_Athlete_Mapping nam
                 JOIN AMS.Nutritionist n ON nam.nutritionist_id = n.id
                 WHERE nam.athlete_id = a.id AND nam.is_active = true
                 LIMIT 1),
                'Not Assigned'
            ) AS assigned_nutritionist,
            COALESCE(uap.is_pinned, false) AS is_pinned
        FROM AMS.Athlete a
        LEFT JOIN AMS.Sport_Lookup sl ON a.sport_id = sl.id
        LEFT JOIN AMS.Athlete_Registry r ON a.id = r.athlete_id`;

  let query, params;

  if (userId) {
    // Include user-specific pinning when userId is provided
    query =
      baseQuery +
      `
        LEFT JOIN AMS.User_Athlete_Pins uap ON a.id = uap.athlete_id AND uap.user_id = $3
        ORDER BY COALESCE(uap.is_pinned, false) DESC, a.athlete_name_abbr ASC
        LIMIT $1 OFFSET $2`;
    params = [pageSize, offset, userId];
  } else {
    // Default query without user-specific pinning
    query =
      baseQuery +
      `
        LEFT JOIN AMS.User_Athlete_Pins uap ON false -- No user context
        ORDER BY a.athlete_name_abbr ASC
        LIMIT $1 OFFSET $2`;
    params = [pageSize, offset];
  }

  try {
    return await pool.query(query, params);
  } catch (error) {
    // If table doesn't exist, create it and retry
    if (error.code === "42P01") {
      // relation does not exist
      await createUserAthletePinsTable();
      return await pool.query(query, params);
    }
    throw error;
  }
}
/**
 * Search athletes across name, sportsync_id, sport, and gender
 * @param {string} searchQuery - Search string
 * @param {number} pageNumber - Page number (1-indexed)
 * @param {number} pageSize - Items per page (default 10)
 * @returns {Promise<Object>} Query result with rows
 */
export async function searchAthletes(
  searchQuery,
  pageNumber,
  pageSize = 10,
  userId = null,
) {
  const offset = (pageNumber - 1) * pageSize;
  const words = searchQuery
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) {
    return getAthletesByPage(pageNumber, pageSize, userId);
  }

  const conditions = words.map((_, i) => {
    const paramIdx = i + 1;
    return `(
            a.athlete_name_abbr ILIKE $${paramIdx}
            OR a.sportsync_id ILIKE $${paramIdx}
            OR sl.sport ILIKE $${paramIdx}
            OR a.gender ILIKE $${paramIdx}
        )`;
  });

  const baseQuery = `
        SELECT
            a.id,
            a.sportsync_id,
            a.athlete_name_abbr,
            sl.sport AS sport_name,
            a.gender,
            a.date_of_birth,
            a.target_event,
            r.carding_status,
            COALESCE(
                (SELECT n.name FROM AMS.Nutritionist_Athlete_Mapping nam
                 JOIN AMS.Nutritionist n ON nam.nutritionist_id = n.id
                 WHERE nam.athlete_id = a.id AND nam.is_active = true
                 LIMIT 1),
                'Not Assigned'
            ) AS assigned_nutritionist,
            COALESCE(uap.is_pinned, false) AS is_pinned
        FROM AMS.Athlete a
        LEFT JOIN AMS.Sport_Lookup sl ON a.sport_id = sl.id
        LEFT JOIN AMS.Athlete_Registry r ON a.id = r.athlete_id`;

  let query, params;

  if (userId) {
    query =
      baseQuery +
      `
        LEFT JOIN AMS.User_Athlete_Pins uap ON a.id = uap.athlete_id AND uap.user_id = $${words.length + 3}
        WHERE ${conditions.join(" AND ")}
        ORDER BY COALESCE(uap.is_pinned, false) DESC, a.athlete_name_abbr ASC
        LIMIT $${words.length + 1} OFFSET $${words.length + 2}`;
    params = [...words.map((w) => `%${w}%`), pageSize, offset, userId];
  } else {
    query =
      baseQuery +
      `
        LEFT JOIN AMS.User_Athlete_Pins uap ON false
        WHERE ${conditions.join(" AND ")}
        ORDER BY a.athlete_name_abbr ASC
        LIMIT $${words.length + 1} OFFSET $${words.length + 2}`;
    params = [...words.map((w) => `%${w}%`), pageSize, offset];
  }

  try {
    return await pool.query(query, params);
  } catch (error) {
    // If table doesn't exist, create it and retry
    if (error.code === "42P01") {
      // relation does not exist
      await createUserAthletePinsTable();
      return await pool.query(query, params);
    }
    throw error;
  }
}

/**
 * Get total count of athletes
 * @returns {Promise<number>} Total count
 */
export async function getTotalAthleteCount() {
  const query = `SELECT COUNT(*) as count FROM AMS.Athlete`;
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
}

/**
 * Get total count of athletes matching a search query
 * @param {string} searchQuery - Search string
 * @returns {Promise<number>} Total count
 */
export async function getSearchAthleteCount(searchQuery) {
  const words = searchQuery
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) {
    return getTotalAthleteCount();
  }

  const conditions = words.map((_, i) => {
    const paramIdx = i + 1;
    return `(
            a.athlete_name_abbr ILIKE $${paramIdx}
            OR a.sportsync_id ILIKE $${paramIdx}
            OR sl.sport ILIKE $${paramIdx}
            OR a.gender ILIKE $${paramIdx}
        )`;
  });

  const query = `
        SELECT COUNT(*) as count
        FROM AMS.Athlete a
        LEFT JOIN AMS.Sport_Lookup sl ON a.sport_id = sl.id
        WHERE ${conditions.join(" AND ")}
    `;

  const params = words.map((w) => `%${w}%`);
  const result = await pool.query(query, params);
  return parseInt(result.rows[0].count);
}

/**
 * Check for duplicate athlete by sportsync_id
 * @param {string} sportsync_id - External system ID
 * @param {string|null} excludeId - Athlete ID to exclude (for updates)
 * @returns {Promise<boolean>} True if duplicate exists
 */
export async function checkDuplicateAthlete(sportsync_id, excludeId = null) {
  let query = `SELECT id FROM AMS.Athlete WHERE sportsync_id = $1`;
  const params = [sportsync_id];

  if (excludeId) {
    query += ` AND id != $2`;
    params.push(excludeId);
  }

  query += ` LIMIT 1`;

  const result = await pool.query(query, params);
  return result.rows.length > 0;
}

/**
 * Create basic athlete record (no relations)
 * @param {Object} athleteData - Athlete base fields
 * @returns {Promise<Object>} Created athlete record
 */
export async function createBasicAthlete(athleteData, userId) {
  return withUserContext(userId, async (client) => {
    const result = await client.query(
      `
        INSERT INTO AMS.Athlete (
            sport_id, sportsync_id, athlete_name_abbr, gender, date_of_birth,
            ethnicity, target_event, sport_start_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
    `,
      [
        athleteData.sport_id,
        athleteData.sportsync_id,
        athleteData.athlete_name_abbr,
        athleteData.gender,
        athleteData.date_of_birth,
        athleteData.ethnicity || null,
        athleteData.target_event || null,
        athleteData.sport_start_date || null,
      ],
    );
    return result.rows[0];
  });
}

/**
 * Create athlete with registry, medical, and coach/nutritionist mappings in a single transaction
 * @param {Object} athleteData - Athlete base fields
 * @param {Object} registryData - Registry fields
 * @param {Object} medicalData - Medical fields
 * @param {Array<string>} coachIds - Array of coach UUIDs to map
 * @param {Array<string>} nutritionistIds - Array of nutritionist UUIDs to map
 * @returns {Promise<Object>} Created records { athlete, registry, medical, coachMappings, nutritionistMappings }
 */
export async function createCompleteAthlete(
  athleteData,
  registryData,
  medicalData,
  coachIds,
  nutritionistIds,
  userId,
) {
  return withUserContext(userId, async (client) => {

    // 1. Insert athlete
    const athleteResult = await client.query(
      `
            INSERT INTO AMS.Athlete (
                sport_id, sportsync_id, athlete_name_abbr, gender, date_of_birth,
                ethnicity, target_event, sport_start_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `,
      [
        athleteData.sport_id,
        athleteData.sportsync_id,
        athleteData.athlete_name_abbr,
        athleteData.gender,
        athleteData.date_of_birth,
        athleteData.ethnicity || null,
        athleteData.target_event || null,
        athleteData.sport_start_date || null,
      ],
    );
    const athlete = athleteResult.rows[0];

    // 2. Insert registry
    const registryResult = await client.query(
      `
            INSERT INTO AMS.Athlete_Registry (
                athlete_id, carding_status, athlete_notified_on,
                carding_start_date, carding_end_date, medical_clearance,
                approved_start_date, approved_end_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `,
      [
        athlete.id,
        registryData.carding_status,
        registryData.athlete_notified_on,
        registryData.carding_start_date,
        registryData.carding_end_date,
        registryData.medical_clearance,
        registryData.approved_start_date,
        registryData.approved_end_date,
      ],
    );
    const registry = registryResult.rows[0];

    // 3. Insert medical
    const medicalResult = await client.query(
      `
            INSERT INTO AMS.Athlete_Medical (
                athlete_id, medical_condition, food_allergy, drug_allergy, past_injury, medical_remarks, dietary_restriction
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `,
      [
        athlete.id,
        medicalData.medical_condition,
        medicalData.food_allergy,
        medicalData.drug_allergy,
        medicalData.past_injury,
        medicalData.medical_remarks,
        medicalData.dietary_restriction,
      ],
    );
    const medical = medicalResult.rows[0];

    // 4. Insert coach mappings
    const coachMappings = [];
    for (const coachId of coachIds) {
      const mappingResult = await client.query(
        `
                INSERT INTO AMS.Coach_Athlete_Mapping (athlete_id, coach_id, is_active)
                VALUES ($1, $2, true)
                RETURNING *
            `,
        [athlete.id, coachId],
      );
      coachMappings.push(mappingResult.rows[0]);
    }

    // 5. Insert nutritionist mappings and trigger auto-pinning
    const nutritionistMappings = [];
    for (const nutritionistId of nutritionistIds) {
      const mappingResult = await client.query(
        `
                INSERT INTO AMS.Nutritionist_Athlete_Mapping (athlete_id, nutritionist_id, is_active)
                VALUES ($1, $2, true)
                RETURNING *
            `,
        [athlete.id, nutritionistId],
      );
      nutritionistMappings.push(mappingResult.rows[0]);

      // Auto-pin the athlete for the nutritionist user
      try {
        // Get the user_id for this nutritionist
        const nutritionistUserResult = await client.query(
          `SELECT user_id FROM AMS.Nutritionist WHERE id = $1`,
          [nutritionistId],
        );

        if (
          nutritionistUserResult.rows.length > 0 &&
          nutritionistUserResult.rows[0].user_id
        ) {
          const userId = nutritionistUserResult.rows[0].user_id;

          // Create or update pin record (with table creation fallback)
          try {
            await client.query(
              `
              INSERT INTO AMS.User_Athlete_Pins (user_id, athlete_id, is_pinned, updated_at)
              VALUES ($1, $2, true, now())
              ON CONFLICT (user_id, athlete_id) 
              DO UPDATE SET is_pinned = true, updated_at = now()
              `,
              [userId, athlete.id],
            );

            console.log(
              `Auto-pinned athlete ${athlete.id} for nutritionist ${nutritionistId} (user ${userId}) during creation`,
            );
          } catch (pinInsertError) {
            // If table doesn't exist, create it and retry
            if (pinInsertError.code === "42P01") {
              console.log("User_Athlete_Pins table not found, creating...");
              await createUserAthletePinsTable(client);

              await client.query(
                `
                INSERT INTO AMS.User_Athlete_Pins (user_id, athlete_id, is_pinned, updated_at)
                VALUES ($1, $2, true, now())
                ON CONFLICT (user_id, athlete_id) 
                DO UPDATE SET is_pinned = true, updated_at = now()
                `,
                [userId, athlete.id],
              );

              console.log(
                `Auto-pinned athlete ${athlete.id} for nutritionist ${nutritionistId} (user ${userId}) after table creation`,
              );
            } else {
              throw pinInsertError;
            }
          }
        }
      } catch (pinError) {
        console.error("Error auto-pinning during athlete creation:", pinError);
        // Don't fail the whole transaction for pinning errors
      }
    }

    return { athlete, registry, medical, coachMappings, nutritionistMappings };
  });
}

/**
 * Update athlete base fields (dynamic SET)
 * @param {string} athleteId - UUID of athlete
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated athlete or null
 */
export async function updateAthlete(athleteId, updateData, userId) {
  const fields = [];
  const values = [];
  let paramCounter = 1;

  const fieldMapping = {
    sport_id: updateData.sport_id,
    sportsync_id: updateData.sportsync_id,
    athlete_name_abbr: updateData.athlete_name_abbr,
    gender: updateData.gender,
    date_of_birth: updateData.date_of_birth,
    ethnicity: updateData.ethnicity,
    target_event: updateData.target_event,
    sport_start_date: updateData.sport_start_date,
  };

  for (const [field, value] of Object.entries(fieldMapping)) {
    if (value !== undefined) {
      fields.push(`${field} = $${paramCounter}`);
      values.push(value);
      paramCounter++;
    }
  }

  if (fields.length === 0) {
    return null;
  }

  values.push(athleteId);

  const query = `
        UPDATE AMS.Athlete
        SET ${fields.join(", ")}
        WHERE id = $${paramCounter}
        RETURNING *
    `;

  return withUserContext(userId, async (client) => {
    const result = await client.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  });
}

/**
 * Delete multiple athletes (cascade deletes registry/medical)
 * @param {Array<string>} athleteIds - Array of UUIDs
 * @returns {Promise<Array>} Array of deleted rows
 */
export async function deleteAthletes(athleteIds, userId) {
  const query = `
        DELETE FROM AMS.Athlete
        WHERE id = ANY($1::uuid[])
        RETURNING id
    `;

  return withUserContext(userId, async (client) => {
    const result = await client.query(query, [athleteIds]);
    return result.rows;
  });
}

// ============================================================================
// ATHLETE PROFILE (for detail page)
// ============================================================================

/**
 * Get athlete profile card data: base info + registry + coach/nutritionist mappings
 * @param {string} athleteId - UUID of athlete
 * @returns {Promise<Object|null>} Profile object or null if athlete not found
 */
export async function getAthleteProfile(athleteId) {
  const profileQuery = `
        SELECT
            a.id,
            a.sport_id,
            a.sportsync_id,
            a.athlete_name_abbr,
            a.gender,
            a.date_of_birth,
            a.ethnicity,
            a.target_event,
            a.sport_start_date,
            sl.sport AS sport_name
        FROM AMS.Athlete a
        LEFT JOIN AMS.Sport_Lookup sl ON a.sport_id = sl.id
        WHERE a.id = $1
    `;

  const registryQuery = `
        SELECT id, athlete_id, carding_status, athlete_notified_on,
               carding_start_date, carding_end_date, medical_clearance,
               approved_start_date, approved_end_date
        FROM AMS.Athlete_Registry
        WHERE athlete_id = $1
    `;

  const medicalQuery = `
        SELECT id, athlete_id, medical_condition, food_allergy, drug_allergy,
               past_injury, medical_remarks, dietary_restriction
        FROM AMS.Athlete_Medical
        WHERE athlete_id = $1
    `;

  const coachQuery = `
        SELECT cam.coach_id, cam.is_active, c.name AS coach_name
        FROM AMS.Coach_Athlete_Mapping cam
        JOIN AMS.Coach c ON cam.coach_id = c.id
        WHERE cam.athlete_id = $1 AND cam.is_active = true
        ORDER BY c.name ASC
    `;

  const nutritionistQuery = `
        SELECT nam.nutritionist_id, nam.is_active, n.name AS nutritionist_name
        FROM AMS.Nutritionist_Athlete_Mapping nam
        JOIN AMS.Nutritionist n ON nam.nutritionist_id = n.id
        WHERE nam.athlete_id = $1 AND nam.is_active = true
        ORDER BY n.name ASC
    `;

  const [profileRes, registryRes, medicalRes, coachRes, nutritionistRes] =
    await Promise.all([
      pool.query(profileQuery, [athleteId]),
      pool.query(registryQuery, [athleteId]),
      pool.query(medicalQuery, [athleteId]),
      pool.query(coachQuery, [athleteId]),
      pool.query(nutritionistQuery, [athleteId]),
    ]);

  if (profileRes.rows.length === 0) return null;

  return {
    athlete: profileRes.rows[0],
    registry: registryRes.rows.length > 0 ? registryRes.rows[0] : null,
    medical: medicalRes.rows.length > 0 ? medicalRes.rows[0] : null,
    coaches: coachRes.rows,
    nutritionists: nutritionistRes.rows,
  };
}

// ============================================================================
// USER-NUTRITIONIST LOOKUP
// ============================================================================

/**
 * Get nutritionist ID by auth user ID (via user_id column on AMS.Nutritionist)
 * @param {string} userId - UUID from auth.users
 * @returns {Promise<string|null>} Nutritionist UUID or null
 */
export async function getNutritionistIdByUserId(userId) {
  const result = await pool.query(
    `SELECT id FROM AMS.Nutritionist WHERE user_id = $1`,
    [userId],
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

// ============================================================================
// MAPPING SERVICES
// ============================================================================

/**
 * Get active coach mappings for an athlete (with coach name)
 * @param {string} athleteId - UUID of athlete
 * @returns {Promise<Array>} Array of coach mapping rows
 */
export async function getCoachMappingsByAthleteId(athleteId) {
  const query = `
        SELECT cam.id, cam.athlete_id, cam.coach_id, cam.is_active,
               c.name AS coach_name
        FROM AMS.Coach_Athlete_Mapping cam
        JOIN AMS.Coach c ON cam.coach_id = c.id
        WHERE cam.athlete_id = $1
        ORDER BY c.name ASC
    `;

  const result = await pool.query(query, [athleteId]);
  return result.rows;
}

/**
 * Get active nutritionist mappings for an athlete (with nutritionist name)
 * @param {string} athleteId - UUID of athlete
 * @returns {Promise<Array>} Array of nutritionist mapping rows
 */
export async function getNutritionistMappingsByAthleteId(athleteId) {
  const query = `
        SELECT nam.id, nam.athlete_id, nam.nutritionist_id, nam.is_active,
               n.name AS nutritionist_name
        FROM AMS.Nutritionist_Athlete_Mapping nam
        JOIN AMS.Nutritionist n ON nam.nutritionist_id = n.id
        WHERE nam.athlete_id = $1
        ORDER BY n.name ASC
    `;

  const result = await pool.query(query, [athleteId]);
  return result.rows;
}

// ============================================================================
// REGISTRY SERVICES
// ============================================================================

/**
 * Get registry by athlete ID
 * @param {string} athleteId - UUID of athlete
 * @returns {Promise<Object|null>} Registry object or null
 */
export async function getRegistryByAthleteId(athleteId) {
  const query = `
        SELECT id, athlete_id, carding_status, athlete_notified_on,
               carding_start_date, carding_end_date, medical_clearance,
               approved_start_date, approved_end_date
        FROM AMS.Athlete_Registry
        WHERE athlete_id = $1
    `;

  const result = await pool.query(query, [athleteId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Update registry by athlete ID (dynamic SET)
 * @param {string} athleteId - UUID of athlete
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated registry or null
 */
export async function updateRegistry(athleteId, updateData, userId) {
  const fields = [];
  const values = [];
  let paramCounter = 1;

  const fieldMapping = {
    carding_status: updateData.carding_status,
    athlete_notified_on: updateData.athlete_notified_on,
    carding_start_date: updateData.carding_start_date,
    carding_end_date: updateData.carding_end_date,
    medical_clearance: updateData.medical_clearance,
    approved_start_date: updateData.approved_start_date,
    approved_end_date: updateData.approved_end_date,
  };

  for (const [field, value] of Object.entries(fieldMapping)) {
    if (value !== undefined) {
      fields.push(`${field} = $${paramCounter}`);
      values.push(value);
      paramCounter++;
    }
  }

  if (fields.length === 0) {
    return null;
  }

  values.push(athleteId);

  const query = `
        UPDATE AMS.Athlete_Registry
        SET ${fields.join(", ")}
        WHERE athlete_id = $${paramCounter}
        RETURNING *
    `;

  return withUserContext(userId, async (client) => {
    const result = await client.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  });
}

// ============================================================================
// MEDICAL SERVICES
// ============================================================================

/**
 * Get medical record by athlete ID
 * @param {string} athleteId - UUID of athlete
 * @returns {Promise<Object|null>} Medical object or null
 */
export async function getMedicalByAthleteId(athleteId) {
  const query = `
        SELECT id, athlete_id, medical_condition, food_allergy, drug_allergy, past_injury, medical_remarks, dietary_restriction
        FROM AMS.Athlete_Medical
        WHERE athlete_id = $1
    `;

  const result = await pool.query(query, [athleteId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Update medical record by athlete ID (dynamic SET)
 * @param {string} athleteId - UUID of athlete
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated medical or null
 */
export async function updateMedical(athleteId, updateData, userId) {
  const fields = [];
  const values = [];
  let paramCounter = 1;

  const fieldMapping = {
    medical_condition: updateData.medical_condition,
    food_allergy: updateData.food_allergy,
    drug_allergy: updateData.drug_allergy,
    past_injury: updateData.past_injury,
    medical_remarks: updateData.medical_remarks,
    dietary_restriction: updateData.dietary_restriction,
  };

  for (const [field, value] of Object.entries(fieldMapping)) {
    if (value !== undefined) {
      fields.push(`${field} = $${paramCounter}`);
      values.push(value);
      paramCounter++;
    }
  }

  if (fields.length === 0) {
    return null;
  }

  values.push(athleteId);

  const query = `
        UPDATE AMS.Athlete_Medical
        SET ${fields.join(", ")}
        WHERE athlete_id = $${paramCounter}
        RETURNING *
    `;

  return withUserContext(userId, async (client) => {
    const result = await client.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  });
}

// ============================================================================
// UPDATE ATHLETE PROFILE (transaction)
// ============================================================================

/**
 * Update athlete profile in a single transaction.
 * Updates athlete base fields, registry, medical, and optionally replaces coach/nutritionist mappings.
 * Only provided fields are updated; undefined fields are left unchanged.
 *
 * For mappings: if coach_ids / nutritionist_ids is provided, all current active mappings
 * are deactivated and new ones are inserted (or reactivated via ON CONFLICT).
 *
 * @param {string} athleteId - UUID of athlete
 * @param {Object} data - Validated update data
 * @param {Object} options - { updateNutritionists: boolean }
 * @returns {Promise<Object>} Updated profile
 */
export async function updateAthleteProfile(athleteId, data, options = {}, userId) {
  return withUserContext(userId, async (client) => {

    // 1. Update athlete base fields
    const athleteFields = {
      sport_id: data.sport_id,
      sportsync_id: data.sportsync_id,
      athlete_name_abbr: data.athlete_name_abbr,
      gender: data.gender,
      date_of_birth: data.date_of_birth,
      ethnicity: data.ethnicity,
      target_event: data.target_event,
      sport_start_date: data.sport_start_date,
    };

    const athleteSetClauses = [];
    const athleteValues = [];
    let paramCounter = 1;

    for (const [field, value] of Object.entries(athleteFields)) {
      if (value !== undefined) {
        athleteSetClauses.push(`${field} = $${paramCounter}`);
        athleteValues.push(value);
        paramCounter++;
      }
    }

    let athlete;
    if (athleteSetClauses.length > 0) {
      athleteValues.push(athleteId);
      const athleteResult = await client.query(
        `
                UPDATE AMS.Athlete
                SET ${athleteSetClauses.join(", ")}
                WHERE id = $${paramCounter}
                RETURNING *
            `,
        athleteValues,
      );
      athlete = athleteResult.rows[0];
    }

    // 2. Update registry fields
    const registryFields = {
      carding_status: data.carding_status,
      athlete_notified_on: data.athlete_notified_on,
      carding_start_date: data.carding_start_date,
      carding_end_date: data.carding_end_date,
      medical_clearance: data.medical_clearance,
      approved_start_date: data.approved_start_date,
      approved_end_date: data.approved_end_date,
    };

    const registrySetClauses = [];
    const registryValues = [];
    paramCounter = 1;

    for (const [field, value] of Object.entries(registryFields)) {
      if (value !== undefined) {
        registrySetClauses.push(`${field} = $${paramCounter}`);
        registryValues.push(value);
        paramCounter++;
      }
    }

    let registry;
    if (registrySetClauses.length > 0) {
      registryValues.push(athleteId);
      const registryResult = await client.query(
        `
                UPDATE AMS.Athlete_Registry
                SET ${registrySetClauses.join(", ")}
                WHERE athlete_id = $${paramCounter}
                RETURNING *
            `,
        registryValues,
      );
      registry = registryResult.rows[0];
    }

    // 3. Update medical fields
    const medicalFields = {
      medical_condition: data.medical_condition,
      food_allergy: data.food_allergy,
      drug_allergy: data.drug_allergy,
      past_injury: data.past_injury,
      medical_remarks: data.medical_remarks,
      dietary_restriction: data.dietary_restriction,
    };

    const medicalSetClauses = [];
    const medicalValues = [];
    paramCounter = 1;

    for (const [field, value] of Object.entries(medicalFields)) {
      if (value !== undefined) {
        medicalSetClauses.push(`${field} = $${paramCounter}`);
        medicalValues.push(value);
        paramCounter++;
      }
    }

    let medical;
    if (medicalSetClauses.length > 0) {
      medicalValues.push(athleteId);
      const medicalResult = await client.query(
        `
                UPDATE AMS.Athlete_Medical
                SET ${medicalSetClauses.join(", ")}
                WHERE athlete_id = $${paramCounter}
                RETURNING *
            `,
        medicalValues,
      );
      medical = medicalResult.rows[0];
    }

    // 4. Replace coach mappings (if coach_ids provided)
    let coachMappings;
    if (data.coach_ids !== undefined) {
      // Deactivate all current active coach mappings
      await client.query(
        `
                UPDATE AMS.Coach_Athlete_Mapping
                SET is_active = false
                WHERE athlete_id = $1 AND is_active = true
            `,
        [athleteId],
      );

      // Insert or reactivate new coach mappings
      coachMappings = [];
      for (const coachId of data.coach_ids) {
        const result = await client.query(
          `
                    INSERT INTO AMS.Coach_Athlete_Mapping (athlete_id, coach_id, is_active)
                    VALUES ($1, $2, true)
                    ON CONFLICT (athlete_id, coach_id) DO UPDATE SET is_active = true
                    RETURNING *
                `,
          [athleteId, coachId],
        );
        coachMappings.push(result.rows[0]);
      }
    }

    // 5. Replace nutritionist mappings (if nutritionist_ids provided and allowed)
    let nutritionistMappings;
    if (options.updateNutritionists && data.nutritionist_ids !== undefined) {
      // Deactivate all current active nutritionist mappings
      await client.query(
        `
                UPDATE AMS.Nutritionist_Athlete_Mapping
                SET is_active = false
                WHERE athlete_id = $1 AND is_active = true
            `,
        [athleteId],
      );

      // Insert or reactivate new nutritionist mappings
      nutritionistMappings = [];
      for (const nutritionistId of data.nutritionist_ids) {
        const result = await client.query(
          `
                    INSERT INTO AMS.Nutritionist_Athlete_Mapping (athlete_id, nutritionist_id, is_active)
                    VALUES ($1, $2, true)
                    ON CONFLICT (athlete_id, nutritionist_id) DO UPDATE SET is_active = true
                    RETURNING *
                `,
          [athleteId, nutritionistId],
        );
        nutritionistMappings.push(result.rows[0]);
      }
    }

    return {
      athlete: athlete || null,
      registry: registry || null,
      medical: medical || null,
      coachMappings: coachMappings || null,
      nutritionistMappings: nutritionistMappings || null,
    };
  });
}
