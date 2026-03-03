import pool, { withUserContext } from "../../../config/db.js";

async function assertSessionExists(sessionId) {
  const r = await pool.query(
    `SELECT 1 FROM consultation.sessions WHERE id = $1`,
    [sessionId]
  );

  if (r.rowCount === 0) {
    const err = new Error("Consultation session not found");
    err.status = 404;
    throw err;
  }
}

function dbRowToApi(row) {
  if (!row) return null;

  return {
    id: row.id,
    sessionId: row.sessions_id,

    amBreakfast: { food: row.am_breakfast_food, macro: row.am_breakfast_macro },
    amTraining: { food: row.am_training_food, macro: row.am_training_macro },
    pmLunch: { food: row.pm_lunch_food, macro: row.pm_lunch_macro },
    pmTraining: { food: row.pm_training_food, macro: row.pm_training_macro },
    pmDinner: { food: row.pm_dinner_food, macro: row.pm_dinner_macro },
    supper: { food: row.supper_food, macro: row.supper_macro },

    totalCarbohydrateIntake: row.total_carbohydrate_intake,
    totalProteinIntake: row.total_protein_intake,
    totalFatIntake: row.total_fat_intake,
    otherRemarks: row.other_remarks,
  };
}

export async function getMealLogBySessionId(sessionId) {
  await assertSessionExists(sessionId);

  const r = await pool.query(
    `SELECT *
     FROM consultation.session_meal_log
     WHERE sessions_id = $1
     LIMIT 1`,
    [sessionId]
  );

  // Return a consistent shape even if empty (frontend can still render)
  if (r.rowCount === 0) {
    return {
      id: null,
      sessionId,
      amBreakfast: { food: null, macro: null },
      amTraining: { food: null, macro: null },
      pmLunch: { food: null, macro: null },
      pmTraining: { food: null, macro: null },
      pmDinner: { food: null, macro: null },
      supper: { food: null, macro: null },
      totalCarbohydrateIntake: null,
      totalProteinIntake: null,
      totalFatIntake: null,
      otherRemarks: null,
    };
  }

  return dbRowToApi(r.rows[0]);
}

export async function upsertMealLogBySessionId(sessionId, payload, userId) {
  await assertSessionExists(sessionId);

  const values = {
    am_breakfast_food: payload?.amBreakfast?.food ?? null,
    am_breakfast_macro: payload?.amBreakfast?.macro ?? null,
    am_training_food: payload?.amTraining?.food ?? null,
    am_training_macro: payload?.amTraining?.macro ?? null,
    pm_lunch_food: payload?.pmLunch?.food ?? null,
    pm_lunch_macro: payload?.pmLunch?.macro ?? null,
    pm_training_food: payload?.pmTraining?.food ?? null,
    pm_training_macro: payload?.pmTraining?.macro ?? null,
    pm_dinner_food: payload?.pmDinner?.food ?? null,
    pm_dinner_macro: payload?.pmDinner?.macro ?? null,
    supper_food: payload?.supper?.food ?? null,
    supper_macro: payload?.supper?.macro ?? null,
    total_carbohydrate_intake: payload?.totalCarbohydrateIntake ?? null,
    total_protein_intake: payload?.totalProteinIntake ?? null,
    total_fat_intake: payload?.totalFatIntake ?? null,
    other_remarks: payload?.otherRemarks ?? null,
  };

  const row = await withUserContext(userId, async (client) => {
    const existing = await client.query(
      `SELECT id FROM consultation.session_meal_log WHERE sessions_id = $1 LIMIT 1`,
      [sessionId]
    );

    if (existing.rowCount === 0) {
      const r = await client.query(
        `INSERT INTO consultation.session_meal_log (
          sessions_id,
          am_breakfast_food, am_breakfast_macro,
          am_training_food, am_training_macro,
          pm_lunch_food, pm_lunch_macro,
          pm_training_food, pm_training_macro,
          pm_dinner_food, pm_dinner_macro,
          supper_food, supper_macro,
          total_carbohydrate_intake, total_protein_intake, total_fat_intake,
          other_remarks
        ) VALUES (
          $1,
          $2, $3,
          $4, $5,
          $6, $7,
          $8, $9,
          $10, $11,
          $12, $13,
          $14, $15, $16,
          $17
        )
        RETURNING *`,
        [
          sessionId,
          values.am_breakfast_food, values.am_breakfast_macro,
          values.am_training_food, values.am_training_macro,
          values.pm_lunch_food, values.pm_lunch_macro,
          values.pm_training_food, values.pm_training_macro,
          values.pm_dinner_food, values.pm_dinner_macro,
          values.supper_food, values.supper_macro,
          values.total_carbohydrate_intake,
          values.total_protein_intake,
          values.total_fat_intake,
          values.other_remarks,
        ]
      );
      return r.rows[0];
    } else {
      const r = await client.query(
        `UPDATE consultation.session_meal_log
         SET
           am_breakfast_food = $2, am_breakfast_macro = $3,
           am_training_food  = $4, am_training_macro  = $5,
           pm_lunch_food     = $6, pm_lunch_macro     = $7,
           pm_training_food  = $8, pm_training_macro  = $9,
           pm_dinner_food    = $10, pm_dinner_macro   = $11,
           supper_food       = $12, supper_macro      = $13,
           total_carbohydrate_intake = $14,
           total_protein_intake      = $15,
           total_fat_intake          = $16,
           other_remarks             = $17
         WHERE sessions_id = $1
         RETURNING *`,
        [
          sessionId,
          values.am_breakfast_food, values.am_breakfast_macro,
          values.am_training_food, values.am_training_macro,
          values.pm_lunch_food, values.pm_lunch_macro,
          values.pm_training_food, values.pm_training_macro,
          values.pm_dinner_food, values.pm_dinner_macro,
          values.supper_food, values.supper_macro,
          values.total_carbohydrate_intake,
          values.total_protein_intake,
          values.total_fat_intake,
          values.other_remarks,
        ]
      );
      return r.rows[0];
    }
  });

  return dbRowToApi(row);
}