import pool, { withUserContext } from "../../../config/db.js";
import bcrypt from 'bcrypt';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
export async function getPinnedAthletes(userId) {
    try {
        const result = await pool.query(
            `
            SELECT athlete_id
            FROM ams.user_athlete_pins
            WHERE user_id = $1
              AND is_pinned = true
            `,
            [userId]
        );
        return result.rows.map(r => r.athlete_id);
    } catch (err) {
        if (err.code === "42P01") {
            await createUserAthletePinsTable();

            const result = await pool.query(
                `
                SELECT athlete_id
                FROM ams.user_athlete_pins
                WHERE user_id = $1
                  AND is_pinned = true
                `,
                [userId]
            );

            return result.rows.map(r => r.athlete_id);
        }
        throw err;
    }
}

export async function toggleAthletePin(userId, athleteId, isPinned) {
    const query = `
        INSERT INTO ams.user_athlete_pins
            (user_id, athlete_id, is_pinned)
        VALUES ($1,$2,$3)
        ON CONFLICT (user_id, athlete_id)
        DO UPDATE SET
            is_pinned = EXCLUDED.is_pinned,
            updated_at = NOW()
    `;

    try {
        await pool.query(query, [userId, athleteId, isPinned]);
    } catch (err) {
        if (err.code === "42P01") {
            await createUserAthletePinsTable();
            await pool.query(query, [userId, athleteId, isPinned]);
            return;
        }

        throw err;
    }
}

// ============================================================================
// ATHLETE PROFILE CRUD
// ============================================================================
//ams.athlete_profile
export async function getAthleteProfiles() {
  const result = await pool.query(`
    SELECT
      athlete_uuid,
      target_event,
      sport_start_date,
      athlete_group_id,
      medical_clearance
    FROM ams.athlete_profile
  `);

  return result.rows;
}

export async function getAthleteProfile(athleteUuid) {
  const result = await pool.query(
    `
    SELECT
      athlete_uuid,
      target_event,
      sport_start_date,
      athlete_group_id,
      medical_clearance
    FROM ams.athlete_profile
    WHERE athlete_uuid = $1
    `,
    [athleteUuid]
  );

  if (result.rows.length === 0) {
    return {
      athlete_uuid: athleteUuid,
      target_event: "",
      sport_start_date: null,
      athlete_group_id: null,
      medical_clearance: false,
    };
  }

  return result.rows[0];
}

export async function upsertAthleteProfile(athleteUuid, data, userId) {
  return withUserContext(userId, async (client) => {
    const query = `
      INSERT INTO ams.athlete_profile (
        athlete_uuid,
        target_event,
        sport_start_date,
        athlete_group_id,
        medical_clearance,
        created_by,
        updated_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$6)

      ON CONFLICT (athlete_uuid)
      DO UPDATE SET
        target_event = EXCLUDED.target_event,
        sport_start_date = EXCLUDED.sport_start_date,
        athlete_group_id = EXCLUDED.athlete_group_id,
        medical_clearance = EXCLUDED.medical_clearance,
        updated_by = EXCLUDED.updated_by

      RETURNING *;
    `;

    const result = await client.query(query, [
      athleteUuid,
      data.target_event,
      data.sport_start_date,
      data.athlete_group_id,
      data.medical_clearance,
      userId,
    ]);

    return result.rows[0];
  });
}

// ams.athlete_medical
export async function getAthleteMedical(athleteUuid) {
  const result = await pool.query(
    `
    SELECT
      athlete_id,
      medical_condition,
      food_allergy,
      drug_allergy,
      past_injury,
      medical_remarks,
      dietary_restriction
    FROM ams.athlete_medical
    WHERE athlete_id = $1
    `,
    [athleteUuid]
  );

  if (result.rows.length === 0) {
    return {
      athlete_id: athleteUuid,
      medical_condition: "",
      food_allergy: "",
      drug_allergy: "",
      past_injury: "",
      medical_remarks: "",
      dietary_restriction: "",
    };
  }

  return result.rows[0];
}

export async function upsertAthleteMedical(
  athleteUuid,
  data,
  userId
) {
  return withUserContext(userId, async (client) => {
    const query = `
        INSERT INTO ams.athlete_medical (
        athlete_id,
        medical_condition,
        food_allergy,
        drug_allergy,
        past_injury,
        medical_remarks,
        dietary_restriction,
        created_by,
        updated_by
        )
        VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $8
        )

        ON CONFLICT (athlete_id)
        DO UPDATE SET
        medical_condition = EXCLUDED.medical_condition,
        food_allergy = EXCLUDED.food_allergy,
        drug_allergy = EXCLUDED.drug_allergy,
        past_injury = EXCLUDED.past_injury,
        medical_remarks = EXCLUDED.medical_remarks,
        dietary_restriction = EXCLUDED.dietary_restriction,
        updated_by = EXCLUDED.updated_by

        RETURNING *;
        `;

        const result = await client.query(query, [
        athleteUuid,
        data.medical_condition,
        data.food_allergy,
        data.drug_allergy,
        data.past_injury,
        data.medical_remarks,
        data.dietary_restriction,
        userId,
        ]);

    return result.rows[0];
  });
}

// ams.nutritionist_athlete_mapping
export async function getAthleteNutritionists(athleteUuid) {
  const result = await pool.query(
    `
    SELECT
      nam.nutritionist_id,
      nam.is_active,
      n.name AS nutritionist_name
    FROM ams.nutritionist_athlete_mapping nam
    JOIN ams.nutritionist n
      ON n.id = nam.nutritionist_id
    WHERE nam.athlete_id = $1
      AND nam.is_active = true
    ORDER BY n.name;
    `,
    [athleteUuid]
  );

  return result.rows;
}

export async function upsertNutritionistAthleteMapping(
  athleteUuid,
  nutritionistIds,
  userId
) {
  return withUserContext(userId, async (client) => {
    if (!Array.isArray(nutritionistIds)) {
      return;
    }

    if (nutritionistIds.length === 0) {
      await client.query(
        `
        UPDATE ams.nutritionist_athlete_mapping
        SET is_active = false
        WHERE athlete_id = $1
        `,
        [athleteUuid]
      );

      return;
    }

    // Deactivate removed mappings
    await client.query(
      `
      UPDATE ams.nutritionist_athlete_mapping
      SET is_active = false
      WHERE athlete_id = $1
        AND nutritionist_id <> ALL($2::uuid[])
      `,
      [athleteUuid, nutritionistIds]
    );

    // Insert new mappings or reactivate existing ones
    await client.query(
      `
      INSERT INTO ams.nutritionist_athlete_mapping (
        athlete_id,
        nutritionist_id,
        is_active
      )
      SELECT
        $1,
        unnest($2::uuid[]),
        true

      ON CONFLICT (athlete_id, nutritionist_id)
      DO UPDATE
      SET is_active = true;
      `,
      [athleteUuid, nutritionistIds]
    );
  });
}

export async function getAllAthleteNutritionists() {
  const result = await pool.query(`
    SELECT
      nam.athlete_id,
      STRING_AGG(n.name, ', ' ORDER BY n.name) AS assigned_nutritionist
    FROM ams.nutritionist_athlete_mapping nam
    JOIN ams.nutritionist n
      ON n.id = nam.nutritionist_id
    WHERE nam.is_active = true
    GROUP BY nam.athlete_id
  `);

  return result.rows;
}

// ams.coach_athlete_mapping
export async function getAthleteCoaches(athleteUuid) {
  const result = await pool.query(
    `
    SELECT
      cam.coach_id,
      cam.is_active,
      c.name AS coach_name
    FROM ams.coach_athlete_mapping cam
    JOIN ams.coach c
      ON c.id = cam.coach_id
    WHERE cam.athlete_id = $1
      AND cam.is_active = true
    ORDER BY c.name;
    `,
    [athleteUuid]
  );

  return result.rows;
}

export async function upsertCoachAthleteMapping(
  athleteUuid,
  coachIds,
  userId
) {
  return withUserContext(userId, async (client) => {
    if (!Array.isArray(coachIds)) {
      return;
    }

    // No coaches selected
    if (coachIds.length === 0) {
      await client.query(
        `
        UPDATE ams.coach_athlete_mapping
        SET is_active = false
        WHERE athlete_id = $1
        `,
        [athleteUuid]
      );

      return;
    }

    // Deactivate removed coaches
    await client.query(
      `
      UPDATE ams.coach_athlete_mapping
      SET is_active = false
      WHERE athlete_id = $1
        AND coach_id <> ALL($2::uuid[])
      `,
      [athleteUuid, coachIds]
    );

    // Insert or reactivate selected coaches
    await client.query(
      `
      INSERT INTO ams.coach_athlete_mapping (
        athlete_id,
        coach_id,
        is_active
      )
      SELECT
        $1,
        unnest($2::uuid[]),
        true

      ON CONFLICT (athlete_id, coach_id)
      DO UPDATE
      SET is_active = true;
      `,
      [athleteUuid, coachIds]
    );
  });
}
