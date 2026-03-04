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

async function getOrCreateAnthropometry(sessionId, client) {
  const q = client ?? pool;
  const existing = await q.query(
    `SELECT * FROM consultation.session_anthropometry WHERE sessions_id = $1 LIMIT 1`,
    [sessionId]
  );
  if (existing.rows.length) return existing.rows[0];

  const created = await q.query(
    `INSERT INTO consultation.session_anthropometry (sessions_id)
     VALUES ($1)
     RETURNING *`,
    [sessionId]
  );
  return created.rows[0];
}

function mapResponse({ anthroRow, reviewRow }) {
  return {
    id: anthroRow?.id ?? null,
    sessionId: reviewRow.sessions_id,

    // Left card inputs (saved)
    heightCm: reviewRow.anthropometry_height_cm ?? null,
    weightKg: reviewRow.anthropometry_weight_kg ?? null,
    bmi: reviewRow.anthropometry_bmi ?? null, // generated
    bmiCategory: anthroRow.bmi_category ?? null,

    fatMassKg: reviewRow.anthropometry_fat_mass_kg ?? null,
    fatMassPct: reviewRow.anthropometry_fat_mass_percentage ?? null, // generated
    skeletalMuscleMassKg: reviewRow.anthropometry_skeletal_muscle_mass_kg ?? null,
    skeletalMuscleMassPct: reviewRow.anthropometry_skeletal_muscle_mass_percentage ?? null, // generated

    sumOf8Skinfold: anthroRow.sum_of_8_skinfold ?? null,
    targetWeightKg: reviewRow.anthropometry_target_weight_kg ?? null,
    targetBmi: reviewRow.anthropometry_target_bmi ?? null, // generated

    motherHeightCm: anthroRow.mother_height ?? null,
    fatherHeightCm: anthroRow.father_height ?? null,

    athletePotentialAdultHeightCm: anthroRow.athlete_potential_adult_height ?? null,

    otherRemarks: anthroRow.other_remarks ?? null,
    dateRecorded: anthroRow.date_recorded ?? null,
    measuredBy: anthroRow.measured_by ?? null,
  };
}

export async function getAnthropometryBySessionId(sessionId) {
  await assertSessionExists(sessionId);

  const reviewRow = await getOrCreateNutritionReview(sessionId);
  const anthroRow = await getOrCreateAnthropometry(sessionId);

  // re-read both to include generated columns after any inserts
  const anthro = await pool.query(
    `SELECT * FROM consultation.session_anthropometry WHERE sessions_id = $1 LIMIT 1`,
    [sessionId]
  );
  const review = await pool.query(
    `SELECT * FROM consultation.session_nutrition_review WHERE sessions_id = $1 LIMIT 1`,
    [sessionId]
  );

  return mapResponse({ anthroRow: anthro.rows[0], reviewRow: review.rows[0] });
}

export async function patchAnthropometryBySessionId(sessionId, payload, userId) {
  await assertSessionExists(sessionId);

  const reviewFields = {
    anthropometry_height_cm: payload.heightCm,
    anthropometry_weight_kg: payload.weightKg,
    anthropometry_target_weight_kg: payload.targetWeightKg,
    anthropometry_fat_mass_kg: payload.fatMassKg,
    anthropometry_skeletal_muscle_mass_kg: payload.skeletalMuscleMassKg,
  };

  const anthroFields = {
    bmi_category: payload.bmiCategory,
    sum_of_8_skinfold: payload.sumOf8Skinfold,
    mother_height: payload.motherHeightCm,
    father_height: payload.fatherHeightCm,
    other_remarks: payload.otherRemarks,
    date_recorded: payload.dateRecorded,
    measured_by: payload.measuredBy,
    athlete_potential_adult_height: payload.athletePotentialAdultHeightCm,
  };

  await withUserContext(userId, async (client) => {
    // Ensure rows exist inside the transaction so INSERTs inherit user context
    await getOrCreateNutritionReview(sessionId, client);
    await getOrCreateAnthropometry(sessionId, client);

    // PATCH style: only update provided keys
    const setPartsReview = [];
    const valuesReview = [sessionId];
    let idx = 2;
    for (const [col, val] of Object.entries(reviewFields)) {
      if (val !== undefined) {
        setPartsReview.push(`${col} = $${idx++}`);
        valuesReview.push(val);
      }
    }
    if (setPartsReview.length) {
      await client.query(
        `UPDATE consultation.session_nutrition_review
         SET ${setPartsReview.join(", ")}
         WHERE sessions_id = $1`,
        valuesReview
      );
    }

    const setPartsAnthro = [];
    const valuesAnthro = [sessionId];
    idx = 2;
    for (const [col, val] of Object.entries(anthroFields)) {
      if (val !== undefined) {
        setPartsAnthro.push(`${col} = $${idx++}`);
        valuesAnthro.push(val);
      }
    }
    if (setPartsAnthro.length) {
      await client.query(
        `UPDATE consultation.session_anthropometry
         SET ${setPartsAnthro.join(", ")}
         WHERE sessions_id = $1`,
        valuesAnthro
      );
    }
  });

  return getAnthropometryBySessionId(sessionId);
}