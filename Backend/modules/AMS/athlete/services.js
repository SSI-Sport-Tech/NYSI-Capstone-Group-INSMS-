import pool, { withUserContext } from "../../../config/db.js";
import bcrypt from 'bcrypt';
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
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
export async function getAthleteById(athleteId) {
  const profileQuery = `
        SELECT
            a.id,
            a.sport_id,
            a.sportsync_id,
            a.initials,
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
  const targetEventQuery = `
        SELECT st.upcoming_major_competitions AS target_event, s.date_of_consult
        FROM consultation.sessions s
        JOIN consultation.session_training st ON st.sessions_id = s.id
        WHERE s.athlete_id = $1
        ORDER BY s.date_of_consult DESC
        LIMIT 1
    `;
  const [profileRes, eventRes] = await Promise.all([
    pool.query(profileQuery, [athleteId]),
    pool.query(targetEventQuery, [athleteId]),
  ]);
  if (profileRes.rows.length === 0) return null;
  const profile = profileRes.rows[0];
  if (eventRes.rows.length > 0) {
    profile.latest_target_event = eventRes.rows[0].target_event;
    profile.latest_consult_date = eventRes.rows[0].date_of_consult;
  } else {
    profile.latest_target_event = null;
    profile.latest_consult_date = null;
  }
  return profile;
}

export async function getAthletesByPage(pageNumber, pageSize = 10, userId = null) {
  const offset = (pageNumber - 1) * pageSize;
  // ── CHANGE: r.carding_status → cl.text_label AS carding_status, added JOIN ─
  const baseQuery = `
        SELECT
            a.id,
            a.sportsync_id,
            a.initials,
            sl.sport AS sport_name,
            a.gender,
            a.date_of_birth,
            a.target_event,
            cl.text_label AS carding_status,
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
        LEFT JOIN AMS.Athlete_Registry r ON a.id = r.athlete_id
        LEFT JOIN public.carding_levels cl ON r.carding_status_id = cl.id`;

  let query, params;
  if (userId) {
    query = baseQuery + `
        LEFT JOIN AMS.User_Athlete_Pins uap ON a.id = uap.athlete_id AND uap.user_id = $3
        ORDER BY COALESCE(uap.is_pinned, false) DESC, a.initials ASC
        LIMIT $1 OFFSET $2`;
    params = [pageSize, offset, userId];
  } else {
    query = baseQuery + `
        LEFT JOIN AMS.User_Athlete_Pins uap ON false
        ORDER BY a.initials ASC
        LIMIT $1 OFFSET $2`;
    params = [pageSize, offset];
  }
  try {
    return await pool.query(query, params);
  } catch (error) {
    if (error.code === "42P01") {
      await createUserAthletePinsTable();
      return await pool.query(query, params);
    }
    throw error;
  }
}

export async function searchAthletes(searchQuery, pageNumber, pageSize = 10, userId = null) {
  const offset = (pageNumber - 1) * pageSize;
  const words = searchQuery.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) {
    return getAthletesByPage(pageNumber, pageSize, userId);
  }
  const conditions = words.map((_, i) => {
    const paramIdx = i + 1;
    return `(
            a.initials ILIKE $${paramIdx}
            OR a.sportsync_id ILIKE $${paramIdx}
            OR sl.sport ILIKE $${paramIdx}
            OR a.gender ILIKE $${paramIdx}
        )`;
  });
  // ── CHANGE: r.carding_status → cl.text_label AS carding_status, added JOIN ─
  const baseQuery = `
        SELECT
            a.id,
            a.sportsync_id,
            a.initials,
            sl.sport AS sport_name,
            a.gender,
            a.date_of_birth,
            a.target_event,
            cl.text_label AS carding_status,
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
        LEFT JOIN AMS.Athlete_Registry r ON a.id = r.athlete_id
        LEFT JOIN public.carding_levels cl ON r.carding_status_id = cl.id`;

  let query, params;
  if (userId) {
    query = baseQuery + `
        LEFT JOIN AMS.User_Athlete_Pins uap ON a.id = uap.athlete_id AND uap.user_id = $${words.length + 3}
        WHERE ${conditions.join(" AND ")}
        ORDER BY COALESCE(uap.is_pinned, false) DESC, a.initials ASC
        LIMIT $${words.length + 1} OFFSET $${words.length + 2}`;
    params = [...words.map((w) => `%${w}%`), pageSize, offset, userId];
  } else {
    query = baseQuery + `
        LEFT JOIN AMS.User_Athlete_Pins uap ON false
        WHERE ${conditions.join(" AND ")}
        ORDER BY a.initials ASC
        LIMIT $${words.length + 1} OFFSET $${words.length + 2}`;
    params = [...words.map((w) => `%${w}%`), pageSize, offset];
  }
  try {
    return await pool.query(query, params);
  } catch (error) {
    if (error.code === "42P01") {
      await createUserAthletePinsTable();
      return await pool.query(query, params);
    }
    throw error;
  }
}

export async function getTotalAthleteCount() {
  const query = `SELECT COUNT(*) as count FROM AMS.Athlete`;
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
}

export async function getActiveAthleteCount() {
  // ── CHANGE: text filter → carding_status_id = 1 ─────────────────────────
  const query = `
    SELECT COUNT(DISTINCT a.id) AS count
    FROM AMS.Athlete a
    JOIN AMS.Athlete_Registry r ON a.id = r.athlete_id
    WHERE r.carding_status_id = 1
  `;
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
}

export async function getSearchAthleteCount(searchQuery) {
  const words = searchQuery.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) {
    return getTotalAthleteCount();
  }
  const conditions = words.map((_, i) => {
    const paramIdx = i + 1;
    return `(
            a.initials ILIKE $${paramIdx}
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

export async function createBasicAthlete(athleteData, userId) {
  return withUserContext(userId, async (client) => {
    const result = await client.query(`
        INSERT INTO AMS.Athlete (
            sport_id, sportsync_id, initials, gender, date_of_birth,
            ethnicity, target_event, sport_start_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
    `, [
      athleteData.sport_id,
      athleteData.sportsync_id,
      athleteData.initials,
      athleteData.gender,
      athleteData.date_of_birth,
      athleteData.ethnicity || null,
      athleteData.target_event || null,
      athleteData.sport_start_date || null,
    ]);
    return result.rows[0];
  });
}

export async function createCompleteAthlete(
  athleteData, registryData, medicalData, coachIds, nutritionistIds, userId,
) {
  return withUserContext(userId, async (client) => {
    // 1. Insert athlete
    const athleteResult = await client.query(`
            INSERT INTO AMS.Athlete (
                sport_id, sportsync_id, initials, gender, date_of_birth,
                ethnicity, target_event, sport_start_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
      athleteData.sport_id,
      athleteData.sportsync_id,
      athleteData.initials,
      athleteData.gender,
      athleteData.date_of_birth,
      athleteData.ethnicity || null,
      athleteData.target_event || null,
      athleteData.sport_start_date || null,
    ]);
    const athlete = athleteResult.rows[0];

    // 2. Insert registry
    // ── CHANGE: carding_status text → carding_status_id via subquery lookup ──
    const registryResult = await client.query(`
            INSERT INTO AMS.Athlete_Registry (
                athlete_id, carding_status_id, athlete_notified_on,
                carding_start_date, carding_end_date, medical_clearance,
                approved_start_date, approved_end_date
            ) VALUES (
                $1,
                (SELECT id FROM public.carding_levels WHERE LOWER(text_label) = LOWER($2) LIMIT 1),
                $3, $4, $5, $6, $7, $8
            )
            RETURNING *
        `, [
      athlete.id,
      registryData.carding_status,
      registryData.athlete_notified_on,
      registryData.carding_start_date,
      registryData.carding_end_date,
      registryData.medical_clearance,
      registryData.approved_start_date,
      registryData.approved_end_date,
    ]);
    const registry = registryResult.rows[0];

    // 3. Insert medical
    const medicalResult = await client.query(`
            INSERT INTO AMS.Athlete_Medical (
                athlete_id, medical_condition, food_allergy, drug_allergy,
                past_injury, medical_remarks, dietary_restriction
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [
      athlete.id,
      medicalData.medical_condition,
      medicalData.food_allergy,
      medicalData.drug_allergy,
      medicalData.past_injury,
      medicalData.medical_remarks,
      medicalData.dietary_restriction,
    ]);
    const medical = medicalResult.rows[0];

    // 4. Insert coach mappings
    const coachMappings = [];
    for (const coachId of coachIds) {
      const mappingResult = await client.query(`
                INSERT INTO AMS.Coach_Athlete_Mapping (athlete_id, coach_id, is_active)
                VALUES ($1, $2, true)
                RETURNING *
            `, [athlete.id, coachId]);
      coachMappings.push(mappingResult.rows[0]);
    }

    // 5. Insert nutritionist mappings and trigger auto-pinning
    const nutritionistMappings = [];
    for (const nutritionistId of nutritionistIds) {
      const mappingResult = await client.query(`
                INSERT INTO AMS.Nutritionist_Athlete_Mapping (athlete_id, nutritionist_id, is_active)
                VALUES ($1, $2, true)
                RETURNING *
            `, [athlete.id, nutritionistId]);
      nutritionistMappings.push(mappingResult.rows[0]);
      try {
        const nutritionistUserResult = await client.query(
          `SELECT user_id FROM AMS.Nutritionist WHERE id = $1`, [nutritionistId],
        );
        if (nutritionistUserResult.rows.length > 0 && nutritionistUserResult.rows[0].user_id) {
          const userId = nutritionistUserResult.rows[0].user_id;
          try {
            await client.query(`
              INSERT INTO AMS.User_Athlete_Pins (user_id, athlete_id, is_pinned, updated_at)
              VALUES ($1, $2, true, now())
              ON CONFLICT (user_id, athlete_id)
              DO UPDATE SET is_pinned = true, updated_at = now()
              `, [userId, athlete.id]);
          } catch (pinInsertError) {
            if (pinInsertError.code === "42P01") {
              await createUserAthletePinsTable(client);
              await client.query(`
                INSERT INTO AMS.User_Athlete_Pins (user_id, athlete_id, is_pinned, updated_at)
                VALUES ($1, $2, true, now())
                ON CONFLICT (user_id, athlete_id)
                DO UPDATE SET is_pinned = true, updated_at = now()
                `, [userId, athlete.id]);
            } else {
              throw pinInsertError;
            }
          }
        }
      } catch (pinError) {
        console.error("Error auto-pinning during athlete creation:", pinError);
      }
    }
    return { athlete, registry, medical, coachMappings, nutritionistMappings };
  });
}

export async function updateAthlete(athleteId, updateData, userId) {
  const fields = [];
  const values = [];
  let paramCounter = 1;
  const fieldMapping = {
    sport_id: updateData.sport_id,
    sportsync_id: updateData.sportsync_id,
    initials: updateData.initials,
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
  if (fields.length === 0) return null;
  values.push(athleteId);
  const query = `UPDATE AMS.Athlete SET ${fields.join(", ")} WHERE id = $${paramCounter} RETURNING *`;
  return withUserContext(userId, async (client) => {
    const result = await client.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  });
}

export async function deleteAthletes(athleteIds, userId) {
  return withUserContext(userId, async (client) => {
    await client.query(`DELETE FROM AMS.athlete_medical WHERE athlete_id = ANY($1::uuid[])`, [athleteIds]);
    await client.query(`DELETE FROM AMS.athlete_registry WHERE athlete_id = ANY($1::uuid[])`, [athleteIds]);
    await client.query(`DELETE FROM AMS.coach_athlete_mapping WHERE athlete_id = ANY($1::uuid[])`, [athleteIds]);
    await client.query(`DELETE FROM AMS.nutritionist_athlete_mapping WHERE athlete_id = ANY($1::uuid[])`, [athleteIds]);
    await client.query(`DELETE FROM AMS.user_athlete_pins WHERE athlete_id = ANY($1::uuid[])`, [athleteIds]);
    const result = await client.query(`
            DELETE FROM AMS.Athlete WHERE id = ANY($1::uuid[]) RETURNING id
        `, [athleteIds]);
    return result.rows;
  });
}

// ============================================================================
// ATHLETE PROFILE
// ============================================================================
export async function getAthleteProfile(athleteId) {
  const profileQuery = `
        SELECT a.id, a.sport_id, a.sportsync_id, a.initials, a.gender,
               a.date_of_birth, a.ethnicity, a.target_event, a.sport_start_date,
               sl.sport AS sport_name
        FROM AMS.Athlete a
        LEFT JOIN AMS.Sport_Lookup sl ON a.sport_id = sl.id
        WHERE a.id = $1
    `;
  // ── CHANGE: SELECT carding_status_id + JOIN to get text_label ────────────
  const registryQuery = `
        SELECT r.id, r.athlete_id, r.carding_status_id,
               cl.text_label AS carding_status,
               r.athlete_notified_on, r.carding_start_date, r.carding_end_date,
               r.medical_clearance, r.approved_start_date, r.approved_end_date
        FROM AMS.Athlete_Registry r
        LEFT JOIN public.carding_levels cl ON r.carding_status_id = cl.id
        WHERE r.athlete_id = $1
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
  const [profileRes, registryRes, medicalRes, coachRes, nutritionistRes] = await Promise.all([
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

export async function getNutritionistIdByUserId(userId) {
  const result = await pool.query(`SELECT id FROM AMS.Nutritionist WHERE user_id = $1`, [userId]);
  return result.rows.length > 0 ? result.rows[0].id : null;
}

// ============================================================================
// MAPPING SERVICES
// ============================================================================
export async function getCoachMappingsByAthleteId(athleteId) {
  const result = await pool.query(`
        SELECT cam.id, cam.athlete_id, cam.coach_id, cam.is_active, c.name AS coach_name
        FROM AMS.Coach_Athlete_Mapping cam
        JOIN AMS.Coach c ON cam.coach_id = c.id
        WHERE cam.athlete_id = $1
        ORDER BY c.name ASC
    `, [athleteId]);
  return result.rows;
}

export async function getNutritionistMappingsByAthleteId(athleteId) {
  const result = await pool.query(`
        SELECT nam.id, nam.athlete_id, nam.nutritionist_id, nam.is_active, n.name AS nutritionist_name
        FROM AMS.Nutritionist_Athlete_Mapping nam
        JOIN AMS.Nutritionist n ON nam.nutritionist_id = n.id
        WHERE nam.athlete_id = $1
        ORDER BY n.name ASC
    `, [athleteId]);
  return result.rows;
}

// ============================================================================
// REGISTRY SERVICES
// ============================================================================
export async function getRegistryByAthleteId(athleteId) {
  // ── CHANGE: JOIN to get text_label alongside carding_status_id ───────────
  const result = await pool.query(`
        SELECT r.id, r.athlete_id, r.carding_status_id,
               cl.text_label AS carding_status,
               r.athlete_notified_on, r.carding_start_date, r.carding_end_date,
               r.medical_clearance, r.approved_start_date, r.approved_end_date
        FROM AMS.Athlete_Registry r
        LEFT JOIN public.carding_levels cl ON r.carding_status_id = cl.id
        WHERE r.athlete_id = $1
    `, [athleteId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function updateRegistry(athleteId, updateData, userId) {
  const fields = [];
  const values = [];
  let paramCounter = 1;
  // ── CHANGE: carding_status → carding_status_id ───────────────────────────
  const fieldMapping = {
    carding_status_id: updateData.carding_status_id,
    athlete_notified_on: updateData.athlete_notified_on,
    carding_start_date: updateData.carding_start_date,
    carding_end_date: updateData.carding_end_date,
    medical_clearance: updateData.medical_clearance,
    approved_start_date: updateData.approved_start_date,
    approved_end_date: updateData.approved_end_date,
  };
  // If caller sends carding_status text, resolve it to an ID
  if (updateData.carding_status !== undefined && updateData.carding_status_id === undefined) {
    const res = await pool.query(
      `SELECT id FROM public.carding_levels WHERE LOWER(text_label) = LOWER($1) LIMIT 1`,
      [updateData.carding_status]
    );
    fieldMapping.carding_status_id = res.rows[0]?.id ?? 2;
  }
  for (const [field, value] of Object.entries(fieldMapping)) {
    if (value !== undefined) {
      fields.push(`${field} = $${paramCounter}`);
      values.push(value);
      paramCounter++;
    }
  }
  if (fields.length === 0) return null;
  values.push(athleteId);
  const query = `UPDATE AMS.Athlete_Registry SET ${fields.join(", ")} WHERE athlete_id = $${paramCounter} RETURNING *`;
  return withUserContext(userId, async (client) => {
    const result = await client.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  });
}

// ============================================================================
// MEDICAL SERVICES
// ============================================================================
export async function getMedicalByAthleteId(athleteId) {
  const result = await pool.query(`
        SELECT id, athlete_id, medical_condition, food_allergy, drug_allergy,
               past_injury, medical_remarks, dietary_restriction
        FROM AMS.Athlete_Medical WHERE athlete_id = $1
    `, [athleteId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

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
  if (fields.length === 0) return null;
  values.push(athleteId);
  const query = `UPDATE AMS.Athlete_Medical SET ${fields.join(", ")} WHERE athlete_id = $${paramCounter} RETURNING *`;
  return withUserContext(userId, async (client) => {
    const result = await client.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  });
}

// ============================================================================
// UPDATE ATHLETE PROFILE (transaction)
// ============================================================================
export async function updateAthleteProfile(athleteId, data, options = {}, userId) {
  return withUserContext(userId, async (client) => {
    // 1. Athlete base fields
    const athleteFields = {
      sport_id: data.sport_id,
      sportsync_id: data.sportsync_id,
      initials: data.initials,
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
      const athleteResult = await client.query(`
                UPDATE AMS.Athlete SET ${athleteSetClauses.join(", ")}
                WHERE id = $${paramCounter} RETURNING *
            `, athleteValues);
      athlete = athleteResult.rows[0];
    }

    // 2. Registry fields
    // ── CHANGE: carding_status → carding_status_id ───────────────────────
    const registrySetClauses = [];
    const registryValues = [];
    paramCounter = 1;

    // Resolve carding_status text to ID if provided
    let cardingStatusId = data.carding_status_id;
    if (data.carding_status !== undefined && cardingStatusId === undefined) {
      const res = await client.query(
        `SELECT id FROM public.carding_levels WHERE LOWER(text_label) = LOWER($1) LIMIT 1`,
        [data.carding_status]
      );
      cardingStatusId = res.rows[0]?.id ?? 2;
    }

    const registryFields = {
      carding_status_id: cardingStatusId,
      athlete_notified_on: data.athlete_notified_on,
      carding_start_date: data.carding_start_date,
      carding_end_date: data.carding_end_date,
      medical_clearance: data.medical_clearance,
      approved_start_date: data.approved_start_date,
      approved_end_date: data.approved_end_date,
    };
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
      const registryResult = await client.query(`
                UPDATE AMS.Athlete_Registry SET ${registrySetClauses.join(", ")}
                WHERE athlete_id = $${paramCounter} RETURNING *
            `, registryValues);
      registry = registryResult.rows[0];
    }

    // 3. Medical fields
    const medicalSetClauses = [];
    const medicalValues = [];
    paramCounter = 1;
    const medicalFields = {
      medical_condition: data.medical_condition,
      food_allergy: data.food_allergy,
      drug_allergy: data.drug_allergy,
      past_injury: data.past_injury,
      medical_remarks: data.medical_remarks,
      dietary_restriction: data.dietary_restriction,
    };
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
      const medicalResult = await client.query(`
                UPDATE AMS.Athlete_Medical SET ${medicalSetClauses.join(", ")}
                WHERE athlete_id = $${paramCounter} RETURNING *
            `, medicalValues);
      medical = medicalResult.rows[0];
    }

    // 4. Coach mappings
    let coachMappings;
    if (data.coach_ids !== undefined) {
      await client.query(`
                UPDATE AMS.Coach_Athlete_Mapping SET is_active = false
                WHERE athlete_id = $1 AND is_active = true
            `, [athleteId]);
      coachMappings = [];
      for (const coachId of data.coach_ids) {
        const result = await client.query(`
                    INSERT INTO AMS.Coach_Athlete_Mapping (athlete_id, coach_id, is_active)
                    VALUES ($1, $2, true)
                    ON CONFLICT (athlete_id, coach_id) DO UPDATE SET is_active = true
                    RETURNING *
                `, [athleteId, coachId]);
        coachMappings.push(result.rows[0]);
      }
    }

    // 5. Nutritionist mappings
    let nutritionistMappings;
    if (options.updateNutritionists && data.nutritionist_ids !== undefined) {
      await client.query(`
                UPDATE AMS.Nutritionist_Athlete_Mapping SET is_active = false
                WHERE athlete_id = $1 AND is_active = true
            `, [athleteId]);
      nutritionistMappings = [];
      for (const nutritionistId of data.nutritionist_ids) {
        const result = await client.query(`
                    INSERT INTO AMS.Nutritionist_Athlete_Mapping (athlete_id, nutritionist_id, is_active)
                    VALUES ($1, $2, true)
                    ON CONFLICT (athlete_id, nutritionist_id) DO UPDATE SET is_active = true
                    RETURNING *
                `, [athleteId, nutritionistId]);
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

// ============================================================================
// AEMS INTEGRATION
// ============================================================================
export async function createAEMSAthleteRecords({
  nomsAthleteId,
  nomsSportId,
  initials,
  cardingStatus,
  initialBudget,
  email = null,
  pin = null,
  performedBy,
}) {
  return withUserContext(performedBy, async (client) => {
    // 1. Create auth.users if credentials provided
    let authUserId = null;
    if (email && pin) {
      const pinHash = await bcrypt.hash(pin, 10);
      const ICS_PERMISSIONS = JSON.stringify([
        'auth:login', 'auth:change_own_pin', 'system:view_dashboard',
      ]);
      const authResult = await client.query(`
                INSERT INTO auth.users (
                    email, pin_hash, ics_pin_code,
                    role, is_admin, is_nutritionist, is_it_admin,
                    ics_role, ics_permissions,
                    is_active, is_email_verified, updated_at
                ) VALUES ($1,$2,$2,'ATHLETE',false,false,false,'Staff',$3,true,false,NOW())
                ON CONFLICT (email) DO NOTHING
                RETURNING id
            `, [email.toLowerCase(), pinHash, ICS_PERMISSIONS]);
      if (authResult.rows.length > 0) {
        authUserId = authResult.rows[0].id;
        await client.query(
          `UPDATE ams.athlete SET user_id = $1 WHERE id = $2`,
          [authUserId, nomsAthleteId]
        );
      }
    }

    // ── CHANGE: sport_id is now UUID referencing ams.sport_lookup directly ──
    // No conversion needed — nomsSportId IS the UUID for public.athletes.sport_id
    const aemsSportId = nomsSportId || null;

    // ── CHANGE: carding lookup via public.carding_levels text_label ──────────
    const cardingResult = await client.query(
      `SELECT id FROM public.carding_levels WHERE LOWER(text_label) = LOWER($1) LIMIT 1`,
      [cardingStatus || 'Inactive']
    );
    const cardingLevelId = cardingResult.rows[0]?.id || 2;

    // 4. Create public.athletes
    const aemsAthleteResult = await client.query(`
            INSERT INTO public.athletes (
                initials, sport_id, carding_level_id,
                is_active, created_date, created_at, updated_at
            ) VALUES ($1, $2, $3, true, CURRENT_DATE, NOW(), NOW())
            RETURNING *
        `, [initials, aemsSportId, cardingLevelId]);
    const aemsAthlete = aemsAthleteResult.rows[0];

    // 5. Create public.athlete_budgets
    const fyResult = await client.query(
      `SELECT id FROM public.financial_years WHERE is_active = true LIMIT 1`
    );
    let budget = null;
    if (fyResult.rows.length > 0) {
      const fyId = fyResult.rows[0].id;
      const budgetResult = await client.query(`
                INSERT INTO public.athlete_budgets (
                    athlete_id, financial_year_id, initial_budget, created_at, updated_at
                ) VALUES ($1, $2, $3, NOW(), NOW())
                RETURNING *
            `, [aemsAthlete.id, fyId, initialBudget || 1000.00]);
      budget = budgetResult.rows[0];
    }

    return {
      authUser: authUserId ? { id: authUserId, email } : null,
      aemsAthlete,
      budget,
    };
  });
}