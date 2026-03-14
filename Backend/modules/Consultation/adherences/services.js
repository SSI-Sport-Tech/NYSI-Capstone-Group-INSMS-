import pool, { withUserContext } from "../../../config/db.js";

async function assertSessionExists(sessionId) {
  const { rows } = await pool.query(
    `SELECT id FROM consultation.sessions WHERE id = $1`,
    [sessionId]
  );
  if (!rows.length) {
    const e = new Error("Consultation session not found");
    e.status = 404;
    throw e;
  }
}

async function getOrCreateNutritionReview(sessionId, client) {
  const q = client ?? pool;
  const existing = await q.query(
    `SELECT * FROM consultation.session_nutrition_review WHERE sessions_id = $1 LIMIT 1`,
    [sessionId]
  );
  if (existing.rows.length) return existing.rows[0];

  const created = await q.query(
    `INSERT INTO consultation.session_nutrition_review (sessions_id)
     VALUES ($1)
     RETURNING *`,
    [sessionId]
  );
  return created.rows[0];
}

function mapResponse(row, pal) {
  return {
    id: row.id ?? null,
    sessionId: row.sessions_id,

    // PAL is owned by training schedule (session_training), read-only here
    pal: pal ?? null,

    minCarbGkg: row.minimum_carbohydrate_requirment_g_kg_bw ?? null,
    maxCarbGkg: row.maximum_carbohydrate_requirment_g_kg_bw ?? null,
    minProteinGkg: row.minimum_protein_requirment_g_kg_bw ?? null,
    maxProteinGkg: row.maximum_protein_requirment_g_kg_bw ?? null,
    minFatGkg: row.minimum_fat_requirment_g_kg_bw ?? null,
    maxFatGkg: row.maximum_fat_requirment_g_kg_bw ?? null,

    estimatedCarbG: row.estimated_carbohydrate_intake_g ?? null,
    estimatedProteinG: row.estimated_protein_intake_g ?? null,
    estimatedFatG: row.estimated_fat_intake_g ?? null,

    commentsWeekday: row.comments_on_weekday_intake ?? null,
    commentsWeekend: row.comments_on_weekend_intake ?? null,
    otherRemarks: row.other_remarks ?? null,

    // computed (read-only on UI)
    minCarbG: row.minimum_carbohydrate_requirment_g ?? null,
    maxCarbG: row.maximum_carbohydrate_requirment_g ?? null,
    minProteinG: row.minimum_protein_requirment_g ?? null,
    maxProteinG: row.maximum_protein_requirment_g ?? null,
    minFatG: row.minimum_fat_requirment_g ?? null,
    maxFatG: row.maximum_fat_requirment_g ?? null,

    targetMinCarbG: row.target_minimum_carbohydrate_requirment_g ?? null,
    targetMaxCarbG: row.target_maximum_carbohydrate_requirment_g ?? null,
    targetMinProteinG: row.target_minimum_protein_requirment_g ?? null,
    targetMaxProteinG: row.target_maximum_protein_requirment_g ?? null,
    targetMinFatG: row.target_minimum_fat_requirment_g ?? null,
    targetMaxFatG: row.target_maximum_fat_requirment_g ?? null,

    pctMinCarb: row.percentage_of_min_carbohydrate_required ?? null,
    pctMinProtein: row.percentage_of_min_protein_required ?? null,
    pctMinFat: row.percentage_of_min_fat_required ?? null,

    rmrMale: row.rmr_male_resting_metabolic_rate ?? null,
    teeMale: row.tee_male_total_energy_expenditure ?? null,
    targetRmrMale: row.rmr_male_target_weight ?? null,
    targetTeeMale: row.tee_male_target_weight ?? null,

    rmrFemale: row.rmr_female_resting_metabolic_rate ?? null,
    teeFemale: row.tee_female_total_energy_expenditure ?? null,
    targetRmrFemale: row.rmr_female_target_weight ?? null,
    targetTeeFemale: row.tee_female_target_weight ?? null,
  };
}

async function getPalFromTraining(sessionId) {
  const { rows } = await pool.query(
    `SELECT physical_activity_level_pal
     FROM consultation.session_training
     WHERE sessions_id = $1
     LIMIT 1`,
    [sessionId]
  );
  return rows[0]?.physical_activity_level_pal ?? null;
}

export async function getAdherencesBySessionId(sessionId) {
  await assertSessionExists(sessionId);
  await getOrCreateNutritionReview(sessionId);

  const [{ rows }, pal] = await Promise.all([
    pool.query(
      `SELECT * FROM consultation.session_nutrition_review WHERE sessions_id = $1 LIMIT 1`,
      [sessionId]
    ),
    getPalFromTraining(sessionId),
  ]);

  return mapResponse(rows[0], pal);
}

export async function patchAdherencesBySessionId(sessionId, payload, userId) {
  await assertSessionExists(sessionId);

  const fields = {
    // pal is owned by training schedule (session_training) — not editable here
    minimum_carbohydrate_requirment_g_kg_bw: payload.minCarbGkg,
    maximum_carbohydrate_requirment_g_kg_bw: payload.maxCarbGkg,
    minimum_protein_requirment_g_kg_bw: payload.minProteinGkg,
    maximum_protein_requirment_g_kg_bw: payload.maxProteinGkg,
    minimum_fat_requirment_g_kg_bw: payload.minFatGkg,
    maximum_fat_requirment_g_kg_bw: payload.maxFatGkg,

    estimated_carbohydrate_intake_g: payload.estimatedCarbG,
    estimated_protein_intake_g: payload.estimatedProteinG,
    estimated_fat_intake_g: payload.estimatedFatG,

    comments_on_weekday_intake: payload.commentsWeekday,
    comments_on_weekend_intake: payload.commentsWeekend,
    other_remarks: payload.otherRemarks,
  };

  const setParts = [];
  const values = [sessionId];
  let idx = 2;

  for (const [col, val] of Object.entries(fields)) {
    if (val !== undefined) {
      setParts.push(`${col} = $${idx++}`);
      values.push(val);
    }
  }

  await withUserContext(userId, async (client) => {
    // Ensure row exists inside the transaction so INSERT inherits user context
    await getOrCreateNutritionReview(sessionId, client);

    if (setParts.length) {
      await client.query(
        `UPDATE consultation.session_nutrition_review
         SET ${setParts.join(", ")}
         WHERE sessions_id = $1`,
        values
      );
    }
  });

  return getAdherencesBySessionId(sessionId);
}