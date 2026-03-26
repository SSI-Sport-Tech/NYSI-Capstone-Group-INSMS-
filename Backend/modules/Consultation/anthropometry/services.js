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

async function getOrCreateAnthropometry(sessionId, client) {
  const q = client ?? pool;
  const existing = await q.query(
    `SELECT * FROM consultation.session_anthropometry WHERE sessions_id = $1 LIMIT 1`,
    [sessionId]
  );
  if (existing.rows.length) return existing.rows[0];

  const created = await q.query(
    `INSERT INTO consultation.session_anthropometry (sessions_id) VALUES ($1) RETURNING *`,
    [sessionId]
  );
  return created.rows[0];
}

function computeDerived(row) {
  const heightM = row.height_cm ? row.height_cm / 100 : null;
  const bmi =
    heightM && row.weight_kg
      ? +((row.weight_kg / (heightM * heightM)).toFixed(2))
      : null;
  const fatMassPct =
    row.fat_mass_kg && row.weight_kg
      ? +(((row.fat_mass_kg / row.weight_kg) * 100).toFixed(1))
      : null;
  const skeletalMuscleMassPct =
    row.skeletal_muscle_mass_kg && row.weight_kg
      ? +(((row.skeletal_muscle_mass_kg / row.weight_kg) * 100).toFixed(1))
      : null;
  const targetBmi =
    heightM && row.target_weight_kg
      ? +((row.target_weight_kg / (heightM * heightM)).toFixed(2))
      : null;
  return { bmi, fatMassPct, skeletalMuscleMassPct, targetBmi };
}

function mapResponse(row) {
  const { bmi, fatMassPct, skeletalMuscleMassPct, targetBmi } = computeDerived(row);
  return {
    id: row.id ?? null,
    sessionId: row.sessions_id,
    heightCm: row.height_cm ?? null,
    weightKg: row.weight_kg ?? null,
    bmi,
    bmiCategory: row.bmi_category ?? null,
    fatMassKg: row.fat_mass_kg ?? null,
    fatMassPct,
    skeletalMuscleMassKg: row.skeletal_muscle_mass_kg ?? null,
    skeletalMuscleMassPct,
    sumOf8Skinfold: row.sum_of_8_skinfold ?? null,
    targetWeightKg: row.target_weight_kg ?? null,
    targetBmi,
    motherHeightCm: row.mother_height ?? null,
    fatherHeightCm: row.father_height ?? null,
    athletePotentialAdultHeightCm: row.athlete_potential_adult_height ?? null,
    otherRemarks: row.other_remarks ?? null,
    dateRecorded: row.date_recorded ?? null,
    measuredBy: row.measured_by ?? null,
  };
}

export async function getAnthropometryBySessionId(sessionId) {
  await assertSessionExists(sessionId);
  await getOrCreateAnthropometry(sessionId);

  const result = await pool.query(
    `SELECT * FROM consultation.session_anthropometry WHERE sessions_id = $1 LIMIT 1`,
    [sessionId]
  );
  return mapResponse(result.rows[0]);
}

export async function patchAnthropometryBySessionId(sessionId, payload, userId) {
  await assertSessionExists(sessionId);

  const FIELDS = {
    height_cm: payload.heightCm,
    weight_kg: payload.weightKg,
    target_weight_kg: payload.targetWeightKg,
    fat_mass_kg: payload.fatMassKg,
    skeletal_muscle_mass_kg: payload.skeletalMuscleMassKg,
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
    await getOrCreateAnthropometry(sessionId, client);

    const setParts = [];
    const values = [sessionId];
    let idx = 2;
    for (const [col, val] of Object.entries(FIELDS)) {
      if (val !== undefined) {
        setParts.push(`${col} = $${idx++}`);
        values.push(val);
      }
    }
    if (setParts.length) {
      await client.query(
        `UPDATE consultation.session_anthropometry SET ${setParts.join(", ")} WHERE sessions_id = $1`,
        values
      );
    }
  });

  return getAnthropometryBySessionId(sessionId);
}
