import pool, { withUserContext } from "../../../config/db.js";
import { generateAdexToken } from "../../../services/adexAuth.js";

async function getAdexJson(path, notFoundValue = null) {
  const token = await generateAdexToken();
  const response = await fetch(
    `${process.env.ADEX_API_URL}/api/v1/${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (response.status === 404 && notFoundValue !== null) return notFoundValue;

  if (!response.ok) {
    const error = new Error("Unable to retrieve measurement data from ADEX");
    error.status = response.status >= 400 && response.status < 500 ? response.status : 502;
    throw error;
  }

  return response.json();
}

async function postAdexJson(path, payload) {
  const token = await generateAdexToken();
  const response = await fetch(`${process.env.ADEX_API_URL}/api/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const responseBody = await response.json().catch(() => ({}));
    const error = new Error(
      responseBody.message || responseBody.error || "Unable to save anthropometry data to ADEX",
    );
    error.status = response.status >= 400 && response.status < 500 ? response.status : 502;
    throw error;
  }

  return response.json();
}

export async function getBiaMeasurementsByAthleteId(athleteId) {
  const measurements = await getAdexJson(
    `measurements?athlete_uuid=${encodeURIComponent(athleteId)}`,
    [],
  );
  return Array.isArray(measurements) ? measurements : [];
}

export async function getAdexAnthropometriesByAthleteId(athleteId) {
  const measurements = await getAdexJson(
    `anthropometries?athlete_uuid=${encodeURIComponent(athleteId)}`,
    [],
  );
  return Array.isArray(measurements) ? measurements : [];
}

export async function getAdexAnthropometryById(anthropometryId) {
  return getAdexJson(
    `anthropometries/${encodeURIComponent(anthropometryId)}`,
  );
}

export async function calculateAdexAnthropometry(athleteId, payload) {
  return postAdexJson("anthropometries/calculate", {
    ...payload,
    fk_athlete_uuid: athleteId,
  });
}

export async function createAdexAnthropometry(athleteId, payload) {
  return postAdexJson("anthropometries", {
    ...payload,
    fk_athlete_uuid: athleteId,
  });
}

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

function mapResponse(row, audit) {
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
    lastUpdatedAt: audit?.changed_on ?? row.updated_at ?? row.created_at ?? null,
    lastUpdatedBy: audit?.user_name ?? null,
  };
}

async function getAnthropometryAudit(rowId) {
  const { rows } = await pool.query(
    `SELECT al.changed_on,
            COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email) AS user_name
     FROM audit.audit_log al
     LEFT JOIN auth.users u ON u.id = al.user_id
     WHERE al.table_name = 'consultation.session_anthropometry'
       AND al.record_id = $1
     ORDER BY al.changed_on DESC
     LIMIT 1`,
    [rowId],
  );

  return rows[0] ?? null;
}

export async function getAnthropometryBySessionId(sessionId) {
  await assertSessionExists(sessionId);
  await getOrCreateAnthropometry(sessionId);

  const result = await pool.query(
    `SELECT sa.*
     FROM consultation.session_anthropometry sa
     WHERE sa.sessions_id = $1
     LIMIT 1`,
    [sessionId]
  );
  const row = result.rows[0];
  const audit = await getAnthropometryAudit(row.id);
  return mapResponse(row, audit);
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
