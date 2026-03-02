// Backend/modules/Consultation/trainingSchedule/services.js

import pool, { withUserContext } from "../../../config/db.js";

function toNumberOrNull(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapRowToApi(row, pal) {
  if (!row) return null;

  return {
    id: row.id,
    sessionId: row.sessions_id,
    days: {
      monday:    { am: row.mon_am,  pm: row.mon_pm,  trainingHours: toNumberOrNull(row.mon_training_hours),  rpe: toNumberOrNull(row.mon_rpe) },
      tuesday:   { am: row.tues_am, pm: row.tues_pm, trainingHours: toNumberOrNull(row.tues_training_hours), rpe: toNumberOrNull(row.tues_rpe) },
      wednesday: { am: row.wed_am,  pm: row.wed_pm,  trainingHours: toNumberOrNull(row.wed_training_hours),  rpe: toNumberOrNull(row.wed_rpe) },
      thursday:  { am: row.thur_am, pm: row.thur_pm, trainingHours: toNumberOrNull(row.thur_training_hours), rpe: toNumberOrNull(row.thur_rpe) },
      friday:    { am: row.fri_am,  pm: row.fri_pm,  trainingHours: toNumberOrNull(row.fri_training_hours),  rpe: toNumberOrNull(row.fri_rpe) },
      saturday:  { am: row.sat_am,  pm: row.sat_pm,  trainingHours: toNumberOrNull(row.sat_training_hours),  rpe: toNumberOrNull(row.sat_rpe) },
      sunday:    { am: row.sun_am,  pm: row.sun_pm,  trainingHours: toNumberOrNull(row.sun_training_hours),  rpe: toNumberOrNull(row.sun_rpe) },
    },
    totalTrainingHours: toNumberOrNull(row.total_training_hours),
    pal: pal ?? null,
    trainingDetails: {
      upcomingMajorCompetitions: row.upcoming_major_competitions,
      upcomingLocalCompetitions: row.upcoming_local_competitions,
    },
    performanceDetails: {
      currentPerformance: row.current_performance,
      coachPerformanceGoals: row.coach_performance_goals,
      athletePerformanceGoals: row.athlete_performance_goals,
      otherRemarks: row.other_remarks,
    },
  };
}

function flattenPayload(sessionId, payload) {
  const d = payload.days;
  const td = payload.trainingDetails ?? {};
  const pd = payload.performanceDetails ?? {};

  return {
    sessions_id: sessionId,

    mon_am: d.monday.am, mon_pm: d.monday.pm, mon_training_hours: d.monday.trainingHours, mon_rpe: d.monday.rpe,
    tues_am: d.tuesday.am, tues_pm: d.tuesday.pm, tues_training_hours: d.tuesday.trainingHours, tues_rpe: d.tuesday.rpe,
    wed_am: d.wednesday.am, wed_pm: d.wednesday.pm, wed_training_hours: d.wednesday.trainingHours, wed_rpe: d.wednesday.rpe,
    thur_am: d.thursday.am, thur_pm: d.thursday.pm, thur_training_hours: d.thursday.trainingHours, thur_rpe: d.thursday.rpe,
    fri_am: d.friday.am, fri_pm: d.friday.pm, fri_training_hours: d.friday.trainingHours, fri_rpe: d.friday.rpe,
    sat_am: d.saturday.am, sat_pm: d.saturday.pm, sat_training_hours: d.saturday.trainingHours, sat_rpe: d.saturday.rpe,
    sun_am: d.sunday.am, sun_pm: d.sunday.pm, sun_training_hours: d.sunday.trainingHours, sun_rpe: d.sunday.rpe,

    upcoming_major_competitions: td.upcomingMajorCompetitions ?? null,
    upcoming_local_competitions: td.upcomingLocalCompetitions ?? null,

    current_performance: pd.currentPerformance ?? null,
    coach_performance_goals: pd.coachPerformanceGoals ?? null,
    athlete_performance_goals: pd.athletePerformanceGoals ?? null,
    other_remarks: pd.otherRemarks ?? null,
  };
}

export async function assertSessionExists(sessionId) {
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

export async function getPal(sessionId) {
  const { rows } = await pool.query(
    `SELECT training_physical_activity_level_pal
     FROM consultation.session_nutrition_review
     WHERE sessions_id = $1
     LIMIT 1`,
    [sessionId]
  );
  return rows[0]?.training_physical_activity_level_pal ?? null;
}

async function upsertPal(client, sessionId, pal) {
  // application-level upsert (no guaranteed unique constraint)
  const { rows: existing } = await client.query(
    `SELECT id FROM consultation.session_nutrition_review
     WHERE sessions_id = $1
     LIMIT 1`,
    [sessionId]
  );

  if (existing.length === 0) {
    await client.query(
      `INSERT INTO consultation.session_nutrition_review (sessions_id, training_physical_activity_level_pal)
       VALUES ($1, $2)`,
      [sessionId, pal]
    );
  } else {
    await client.query(
      `UPDATE consultation.session_nutrition_review
       SET training_physical_activity_level_pal = $2
       WHERE id = $1`,
      [existing[0].id, pal]
    );
  }
}

export async function getTrainingScheduleBySessionId(sessionId) {
  const { rows } = await pool.query(
    `SELECT *
     FROM consultation.session_training_schedule
     WHERE sessions_id = $1
     LIMIT 1`,
    [sessionId]
  );

  const pal = await getPal(sessionId);
  return mapRowToApi(rows[0] ?? null, pal);
}

export async function upsertTrainingScheduleBySessionId(sessionId, payload, userId) {
  await assertSessionExists(sessionId);

  const flat = flattenPayload(sessionId, payload);

  const cols = [
    "mon_am","mon_pm","mon_training_hours","mon_rpe",
    "tues_am","tues_pm","tues_training_hours","tues_rpe",
    "wed_am","wed_pm","wed_training_hours","wed_rpe",
    "thur_am","thur_pm","thur_training_hours","thur_rpe",
    "fri_am","fri_pm","fri_training_hours","fri_rpe",
    "sat_am","sat_pm","sat_training_hours","sat_rpe",
    "sun_am","sun_pm","sun_training_hours","sun_rpe",
    "upcoming_major_competitions","upcoming_local_competitions",
    "current_performance","coach_performance_goals","athlete_performance_goals","other_remarks",
  ];

  const savedRow = await withUserContext(userId, async (client) => {
    const { rows: existing } = await client.query(
      `SELECT id
       FROM consultation.session_training_schedule
       WHERE sessions_id = $1
       LIMIT 1`,
      [sessionId]
    );

    let row;

    if (existing.length === 0) {
      const insertCols = ["sessions_id", ...cols];
      const values = [flat.sessions_id, ...cols.map((c) => flat[c] ?? null)];
      const placeholders = insertCols.map((_, i) => `$${i + 1}`).join(", ");

      const { rows } = await client.query(
        `INSERT INTO consultation.session_training_schedule (${insertCols.join(", ")})
         VALUES (${placeholders})
         RETURNING *`,
        values
      );
      row = rows[0];
    } else {
      const values = [...cols.map((c) => flat[c] ?? null), existing[0].id];
      const setExpr = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");

      const { rows } = await client.query(
        `UPDATE consultation.session_training_schedule
         SET ${setExpr}
         WHERE id = $${cols.length + 1}
         RETURNING *`,
        values
      );
      row = rows[0];
    }

    if (payload.pal !== undefined) {
      await upsertPal(client, sessionId, payload.pal);
    }

    return row;
  });

  const pal = await getPal(sessionId);
  return mapRowToApi(savedRow, pal);
}
