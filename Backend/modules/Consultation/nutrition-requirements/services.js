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

async function getComputedNutritionReview(sessionId) {
  const { rows } = await pool.query(
    `SELECT *
     FROM consultation.v_session_nutrition_review
     WHERE sessions_id = $1
     LIMIT 1`,
    [sessionId]
  );
  return rows[0] ?? null;
}

async function getAthleteGender(sessionId) {
  const { rows } = await pool.query(
    `SELECT a.gender
     FROM consultation.sessions s
     JOIN ams.athlete a ON a.id = s.athlete_id
     WHERE s.id = $1
     LIMIT 1`,
    [sessionId]
  );
  return rows[0]?.gender ?? null;
}

function mapResponse(baseRow, computedRow, pal, gender) {
  const normalizedGender = gender?.toLowerCase?.() ?? null;
  const computedRmr = computedRow?.resting_metabolic_rate ?? null;
  const computedTee = computedRow?.total_energy_expenditure ?? null;
  const isMale = normalizedGender === "male";
  const isFemale = normalizedGender === "female";

  return {
    id: baseRow.id ?? computedRow?.nutrition_review_id ?? null,
    sessionId: baseRow.sessions_id,

    // PAL is owned by training schedule (session_training), read-only here
    pal: pal ?? null,

    minCarbGkg: baseRow.minimum_carbohydrate_requirment_g_kg_bw ?? null,
    maxCarbGkg: baseRow.maximum_carbohydrate_requirment_g_kg_bw ?? null,
    minProteinGkg: baseRow.minimum_protein_requirment_g_kg_bw ?? null,
    maxProteinGkg: baseRow.maximum_protein_requirment_g_kg_bw ?? null,
    minFatGkg: baseRow.minimum_fat_requirment_g_kg_bw ?? null,
    maxFatGkg: baseRow.maximum_fat_requirment_g_kg_bw ?? null,

    estimatedCarbG: baseRow.estimated_carbohydrate_intake_g ?? null,
    estimatedProteinG: baseRow.estimated_protein_intake_g ?? null,
    estimatedFatG: baseRow.estimated_fat_intake_g ?? null,

    commentsWeekday: baseRow.comments_on_weekday_intake ?? null,
    commentsWeekend: baseRow.comments_on_weekend_intake ?? null,
    otherRemarks: baseRow.other_remarks ?? null,

    // computed (read-only on UI)
    minCarbG: computedRow?.minimum_carbohydrate_requirment_g ?? null,
    maxCarbG: computedRow?.maximum_carbohydrate_requirment_g ?? null,
    minProteinG: computedRow?.minimum_protein_requirment_g ?? null,
    maxProteinG: computedRow?.maximum_protein_requirment_g ?? null,
    minFatG: computedRow?.minimum_fat_requirment_g ?? null,
    maxFatG: computedRow?.maximum_fat_requirment_g ?? null,

    // Preserve the existing frontend response shape while sourcing the
    // actual value from the DB's target-weight-first calculation view.
    targetMinCarbG: computedRow?.minimum_carbohydrate_requirment_g ?? null,
    targetMaxCarbG: computedRow?.maximum_carbohydrate_requirment_g ?? null,
    targetMinProteinG: computedRow?.minimum_protein_requirment_g ?? null,
    targetMaxProteinG: computedRow?.maximum_protein_requirment_g ?? null,
    targetMinFatG: computedRow?.minimum_fat_requirment_g ?? null,
    targetMaxFatG: computedRow?.maximum_fat_requirment_g ?? null,

    pctMinCarb: computedRow?.percentage_of_min_carbohydrate_required ?? null,
    pctMinProtein: computedRow?.percentage_of_min_protein_required ?? null,
    pctMinFat: computedRow?.percentage_of_min_fat_required ?? null,

    rmrMale: isMale ? computedRmr : null,
    teeMale: isMale ? computedTee : null,
    targetRmrMale: isMale ? computedRmr : null,
    targetTeeMale: isMale ? computedTee : null,

    rmrFemale: isFemale ? computedRmr : null,
    teeFemale: isFemale ? computedTee : null,
    targetRmrFemale: isFemale ? computedRmr : null,
    targetTeeFemale: isFemale ? computedTee : null,
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

export async function getNutritionRequirementsBySessionId(sessionId) {
  await assertSessionExists(sessionId);
  const baseRow = await getOrCreateNutritionReview(sessionId);

  const [computedRow, pal, gender] = await Promise.all([
    getComputedNutritionReview(sessionId),
    getPalFromTraining(sessionId),
    getAthleteGender(sessionId),
  ]);

  return mapResponse(baseRow, computedRow, pal, gender);
}

export async function patchNutritionRequirementsBySessionId(sessionId, payload, userId) {
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

  return getNutritionRequirementsBySessionId(sessionId);
}
