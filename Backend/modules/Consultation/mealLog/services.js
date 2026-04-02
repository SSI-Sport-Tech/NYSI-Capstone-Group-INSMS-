import pool, { withUserContext } from "../../../config/db.js";

async function assertSessionExists(sessionId) {
  const { rowCount } = await pool.query(
    "SELECT 1 FROM consultation.sessions WHERE id = $1",
    [sessionId]
  );
  if (rowCount === 0) {
    const err = new Error("Consultation session not found");
    err.status = 404;
    throw err;
  }
}

function mapMealEntry(r) {
  return {
    foodTime: r.food_time ? String(r.food_time).substring(0, 5) : null,
    mealDescription: r.meal_description,
    lowerCarbG: r.lower_carbohydrate_g ?? null,
    upperCarbG: r.upper_carbohydrate_g ?? null,
    lowerProteinG: r.lower_protein_g ?? null,
    upperProteinG: r.upper_protein_g ?? null,
    lowerFatG: r.lower_fat_g ?? null,
    upperFatG: r.upper_fat_g ?? null,
  };
}

function mapSleep(r) {
  if (!r) return null;
  return {
    sleepDurationH:
      r.sleep_duration_h !== null && r.sleep_duration_h !== undefined
        ? Number(r.sleep_duration_h)
        : null,
    sleepQuality: r.sleep_quality ?? null,
    otherRemarks: r.other_remarks ?? null,
  };
}

async function getOrCreateMealParent(sessionId, client) {
  const q = client ?? pool;
  const existing = await q.query(
    "SELECT id, other_remarks FROM consultation.session_meal WHERE sessions_id = $1 LIMIT 1",
    [sessionId]
  );
  if (existing.rows.length) return existing.rows[0];
  const created = await q.query(
    "INSERT INTO consultation.session_meal (sessions_id) VALUES ($1) RETURNING id, other_remarks",
    [sessionId]
  );
  return created.rows[0];
}

async function getMealLogAudit(sessionId) {
  const { rows } = await pool.query(
    `SELECT al.changed_on,
            COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email) AS user_name
     FROM audit.audit_log al
     LEFT JOIN auth.users u ON u.id = al.user_id
     WHERE (
       al.table_name = 'consultation.session_meal'
       AND EXISTS (
         SELECT 1
         FROM consultation.session_meal sm
         WHERE sm.id = al.record_id
           AND sm.sessions_id = $1
       )
     ) OR (
       al.table_name = 'consultation.session_meal_log'
       AND EXISTS (
         SELECT 1
         FROM consultation.session_meal_log sml
         JOIN consultation.session_meal sm ON sm.id = sml.session_meal_id
         WHERE sml.id = al.record_id
           AND sm.sessions_id = $1
       )
     ) OR (
       al.table_name = 'consultation.session_sleep'
       AND EXISTS (
         SELECT 1
         FROM consultation.session_sleep ss
         WHERE ss.id = al.record_id
           AND ss.sessions_id = $1
       )
     )
     ORDER BY al.changed_on DESC
     LIMIT 1`,
    [sessionId],
  );

  return rows[0] ?? null;
}

export async function getMealLogAndSleepBySessionId(sessionId) {
  await assertSessionExists(sessionId);

  const mealRow = await getOrCreateMealParent(sessionId);

  const [entriesResult, sleepResult] = await Promise.all([
    pool.query(
      `SELECT food_time, meal_description,
              lower_carbohydrate_g, upper_carbohydrate_g,
              lower_protein_g, upper_protein_g,
              lower_fat_g, upper_fat_g
       FROM consultation.session_meal_log
       WHERE session_meal_id = $1
       ORDER BY food_time ASC NULLS LAST`,
      [mealRow.id]
    ),
    pool.query(
      `SELECT sleep_duration_h, sleep_quality, other_remarks
       FROM consultation.session_sleep
       WHERE sessions_id = $1
       LIMIT 1`,
      [sessionId]
    ),
  ]);

  const audit = await getMealLogAudit(sessionId);

  return {
    entries: entriesResult.rows.map(mapMealEntry),
    mealOtherRemarks: mealRow.other_remarks ?? null,
    sleep: mapSleep(sleepResult.rows[0] ?? null),
    lastUpdatedAt: audit?.changed_on ?? null,
    lastUpdatedBy: audit?.user_name ?? null,
  };
}

export async function upsertMealLogAndSleepBySessionId(
  sessionId,
  payload,
  userId
) {
  await assertSessionExists(sessionId);

  const { entries, mealOtherRemarks, sleep } = payload;

  return await withUserContext(userId, async (client) => {
    // 1. Upsert session_meal parent
    const existing = await client.query(
      "SELECT id FROM consultation.session_meal WHERE sessions_id = $1 LIMIT 1",
      [sessionId]
    );

    let mealId;
    if (existing.rows.length === 0) {
      const { rows } = await client.query(
        "INSERT INTO consultation.session_meal (sessions_id, other_remarks) VALUES ($1, $2) RETURNING id",
        [sessionId, mealOtherRemarks ?? null]
      );
      mealId = rows[0].id;
    } else {
      mealId = existing.rows[0].id;
      await client.query(
        "UPDATE consultation.session_meal SET other_remarks = $1 WHERE id = $2",
        [mealOtherRemarks ?? null, mealId]
      );
    }

    // 2. Full replace: delete all existing meal entries
    await client.query(
      "DELETE FROM consultation.session_meal_log WHERE session_meal_id = $1",
      [mealId]
    );

    // 3. Bulk insert new entries (skip if empty)
    if (entries.length > 0) {
      const vals = [];
      const placeholders = entries.map((e, i) => {
        const base = i * 9;
        vals.push(
          mealId,
          e.foodTime ?? null,
          e.mealDescription,
          e.lowerCarbG ?? null,
          e.upperCarbG ?? null,
          e.lowerProteinG ?? null,
          e.upperProteinG ?? null,
          e.lowerFatG ?? null,
          e.upperFatG ?? null
        );
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`;
      });

      await client.query(
        `INSERT INTO consultation.session_meal_log
           (session_meal_id, food_time, meal_description,
            lower_carbohydrate_g, upper_carbohydrate_g,
            lower_protein_g, upper_protein_g,
            lower_fat_g, upper_fat_g)
         VALUES ${placeholders.join(", ")}`,
        vals
      );
    }

    // 4. Upsert session_sleep (only if sleep payload provided)
    if (sleep !== undefined && sleep !== null) {
      const existingSleep = await client.query(
        "SELECT id FROM consultation.session_sleep WHERE sessions_id = $1 LIMIT 1",
        [sessionId]
      );

      if (existingSleep.rows.length === 0) {
        await client.query(
          `INSERT INTO consultation.session_sleep
             (sessions_id, sleep_duration_h, sleep_quality, other_remarks)
           VALUES ($1, $2, $3, $4)`,
          [
            sessionId,
            sleep.sleepDurationH ?? null,
            sleep.sleepQuality ?? null,
            sleep.otherRemarks ?? null,
          ]
        );
      } else {
        await client.query(
          `UPDATE consultation.session_sleep
           SET sleep_duration_h = $1, sleep_quality = $2, other_remarks = $3
           WHERE sessions_id = $4`,
          [
            sleep.sleepDurationH ?? null,
            sleep.sleepQuality ?? null,
            sleep.otherRemarks ?? null,
            sessionId,
          ]
        );
      }
    }

    // 5. Fetch and return saved state
    const [savedEntries, savedSleep] = await Promise.all([
      client.query(
        `SELECT food_time, meal_description,
                lower_carbohydrate_g, upper_carbohydrate_g,
                lower_protein_g, upper_protein_g,
                lower_fat_g, upper_fat_g
         FROM consultation.session_meal_log
         WHERE session_meal_id = $1
         ORDER BY food_time ASC NULLS LAST`,
        [mealId]
      ),
      client.query(
        `SELECT sleep_duration_h, sleep_quality, other_remarks
         FROM consultation.session_sleep
         WHERE sessions_id = $1
         LIMIT 1`,
        [sessionId]
      ),
    ]);

    const audit = await getMealLogAudit(sessionId);

    return {
      entries: savedEntries.rows.map(mapMealEntry),
      mealOtherRemarks: mealOtherRemarks ?? null,
      sleep: mapSleep(savedSleep.rows[0] ?? null),
      lastUpdatedAt: audit?.changed_on ?? null,
      lastUpdatedBy: audit?.user_name ?? null,
    };
  });
}
