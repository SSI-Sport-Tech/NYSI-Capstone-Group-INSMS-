// Backend/modules/Consultation/trainingSchedule/services.js

import pool, { withUserContext } from "../../../config/db.js";

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

function mapTrainingRow(training, scheduleRows, audit) {
  return {
    trainingInfo: {
      upcomingMajorCompetitions: training.upcoming_major_competitions ?? null,
      upcomingLocalCompetitions: training.upcoming_local_competitions ?? null,
      currentPerformance: training.current_performance ?? null,
      coachPerformanceGoals: training.coach_performance_goals ?? null,
      athletePerformanceGoals: training.athlete_performance_goals ?? null,
      otherRemarks: training.other_remarks ?? null,
      pal:
        training.physical_activity_level_pal !== null &&
        training.physical_activity_level_pal !== undefined
          ? Number(training.physical_activity_level_pal)
          : null,
      rpeWeek: training.rpe_week ?? null,
    },
    lastUpdatedAt: audit?.changed_on ?? training.updated_at ?? training.created_at ?? null,
    lastUpdatedBy: audit?.user_name ?? null,
    schedule: scheduleRows.map((r) => ({
      dayOfWeek: r.day_of_week,
      timeStart: r.time_start ?? null,
      timeEnd: r.time_end ?? null,
      activity: r.activity,
      rpe: r.rpe ?? null,
    })),
  };
}

async function getTrainingScheduleAudit(recordId, executor = pool) {
  const { rows } = await executor.query(
    `SELECT al.changed_on,
            COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email) AS user_name
     FROM audit.audit_log al
     LEFT JOIN auth.users u ON u.id = al.user_id
     WHERE al.table_name = 'consultation.session_training'
       AND al.record_id = $1
     ORDER BY al.changed_on DESC
     LIMIT 1`,
    [recordId],
  );

  return rows[0] ?? null;
}

export async function getTrainingScheduleBySessionId(sessionId) {
  const { rows: trainingRows } = await pool.query(
    `SELECT st.id, st.upcoming_major_competitions, st.upcoming_local_competitions,
            st.current_performance, st.coach_performance_goals, st.athlete_performance_goals,
            st.other_remarks, st.physical_activity_level_pal, st.rpe_week,
            st.created_at, st.updated_at
     FROM consultation.session_training st
     WHERE st.sessions_id = $1
     LIMIT 1`,
    [sessionId]
  );

  if (trainingRows.length === 0) return null;

  const training = trainingRows[0];

  const { rows: scheduleRows } = await pool.query(
    `SELECT day_of_week, time_start, time_end, activity, rpe
     FROM consultation.session_training_schedule
     WHERE session_training_id = $1
     ORDER BY
       CASE day_of_week
         WHEN 'monday'    THEN 1
         WHEN 'tuesday'   THEN 2
         WHEN 'wednesday' THEN 3
         WHEN 'thursday'  THEN 4
         WHEN 'friday'    THEN 5
         WHEN 'saturday'  THEN 6
         WHEN 'sunday'    THEN 7
       END,
       time_start ASC NULLS LAST`,
    [training.id]
  );

  const audit = await getTrainingScheduleAudit(training.id);
  return mapTrainingRow(training, scheduleRows, audit);
}

export async function upsertTrainingScheduleBySessionId(
  sessionId,
  payload,
  userId
) {
  await assertSessionExists(sessionId);

  const { trainingInfo, schedule } = payload;

  return await withUserContext(userId, async (client) => {
    // 1. Upsert session_training parent row
    const { rows: existing } = await client.query(
      `SELECT id FROM consultation.session_training WHERE sessions_id = $1 LIMIT 1`,
      [sessionId]
    );

    let trainingId;

    if (existing.length === 0) {
      const { rows } = await client.query(
        `INSERT INTO consultation.session_training
           (sessions_id, upcoming_major_competitions, upcoming_local_competitions,
            current_performance, coach_performance_goals, athlete_performance_goals,
            other_remarks, physical_activity_level_pal, rpe_week)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          sessionId,
          trainingInfo.upcomingMajorCompetitions ?? null,
          trainingInfo.upcomingLocalCompetitions ?? null,
          trainingInfo.currentPerformance ?? null,
          trainingInfo.coachPerformanceGoals ?? null,
          trainingInfo.athletePerformanceGoals ?? null,
          trainingInfo.otherRemarks ?? null,
          trainingInfo.pal ?? null,
          trainingInfo.rpeWeek,
        ]
      );
      trainingId = rows[0].id;
    } else {
      trainingId = existing[0].id;
      await client.query(
        `UPDATE consultation.session_training
         SET upcoming_major_competitions  = $1,
             upcoming_local_competitions  = $2,
             current_performance          = $3,
             coach_performance_goals      = $4,
             athlete_performance_goals    = $5,
             other_remarks                = $6,
             physical_activity_level_pal  = $7,
             rpe_week                     = $8
         WHERE id = $9`,
        [
          trainingInfo.upcomingMajorCompetitions ?? null,
          trainingInfo.upcomingLocalCompetitions ?? null,
          trainingInfo.currentPerformance ?? null,
          trainingInfo.coachPerformanceGoals ?? null,
          trainingInfo.athletePerformanceGoals ?? null,
          trainingInfo.otherRemarks ?? null,
          trainingInfo.pal ?? null,
          trainingInfo.rpeWeek,
          trainingId,
        ]
      );
    }

    // 2. Full replace: delete all existing schedule entries for this training row
    await client.query(
      `DELETE FROM consultation.session_training_schedule WHERE session_training_id = $1`,
      [trainingId]
    );

    // 3. Bulk insert new schedule entries (skip if empty)
    if (schedule.length > 0) {
      const vals = [];
      const placeholders = schedule.map((entry, i) => {
        const base = i * 6;
        vals.push(
          trainingId,
          entry.dayOfWeek,
          entry.timeStart ?? null,
          entry.timeEnd ?? null,
          entry.activity,
          entry.rpe ?? null
        );
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
      });

      await client.query(
        `INSERT INTO consultation.session_training_schedule
           (session_training_id, day_of_week, time_start, time_end, activity, rpe)
         VALUES ${placeholders.join(", ")}`,
        vals
      );
    }

    const { rows: savedTraining } = await client.query(
      `SELECT st.upcoming_major_competitions, st.upcoming_local_competitions,
              st.current_performance, st.coach_performance_goals, st.athlete_performance_goals,
              st.other_remarks, st.physical_activity_level_pal, st.rpe_week,
              st.created_at, st.updated_at
       FROM consultation.session_training st
       WHERE st.id = $1`,
      [trainingId]
    );
    const audit = await getTrainingScheduleAudit(trainingId, client);

    // 4. Fetch saved schedule to return consistent DB state
    const { rows: savedSchedule } = await client.query(
      `SELECT day_of_week, time_start, time_end, activity, rpe
       FROM consultation.session_training_schedule
       WHERE session_training_id = $1
       ORDER BY
         CASE day_of_week
           WHEN 'monday'    THEN 1
           WHEN 'tuesday'   THEN 2
           WHEN 'wednesday' THEN 3
           WHEN 'thursday'  THEN 4
           WHEN 'friday'    THEN 5
           WHEN 'saturday'  THEN 6
           WHEN 'sunday'    THEN 7
         END,
         time_start ASC NULLS LAST`,
      [trainingId]
    );

    return mapTrainingRow(
      savedTraining[0],
      savedSchedule,
      audit
    );
  });
}
