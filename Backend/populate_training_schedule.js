#!/usr/bin/env node

import pg from "pg";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Create database connection
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl:
    process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
});

const SESSION_ID = "019c81ea-062b-7a88-b848-c5a41cc1874d";

const trainingScheduleData = {
  // Monday
  mon_am: "S&C (Max Training) 09:00-10:30",
  mon_pm: "BJJ (Hard Sparring) 15:00-17:00\nTraining with Coach 14:00-15:00",
  mon_training_hours: 3.5,
  mon_rpe: 7,

  // Tuesday
  tues_am: "S&C (Power) 09:00-10:30",
  tues_pm: "BJJ (No-Gi) 19:30-21:00",
  tues_training_hours: 2.5,
  tues_rpe: 8,

  // Wednesday
  wed_am: "S&C (Strength) 09:00-10:30",
  wed_pm: "Drilling (Gi) 13:00-14:30",
  wed_training_hours: 3.0,
  wed_rpe: 6,

  // Thursday
  thur_am: "Yoga/Mobility 09:00-11:00",
  thur_pm: "Comp Class (Gi) 19:00-21:00",
  thur_training_hours: 3.5,
  thur_rpe: 8,

  // Friday
  fri_am: null,
  fri_pm: "Positional Sparring 14:00-15:00",
  fri_training_hours: 3.0,
  fri_rpe: 5,

  // Saturday & Sunday - Rest days
  sat_am: null,
  sat_pm: null,
  sat_training_hours: 0,
  sat_rpe: 0,

  sun_am: null,
  sun_pm: null,
  sun_training_hours: 0,
  sun_rpe: 0,

  // Training details
  upcoming_major_competitions: "SEA Games 2025 (Thailand)",
  upcoming_local_competitions: "Singapore BJJ Open 2024 (December)",

  // Performance details
  current_performance:
    "Athlete has shown consistent improvement in competition performance over the past 6 months. Currently ranked top 3 in national Brazilian Jiu-Jitsu competitions. Main strengths include technical proficiency and tactical awareness during matches.",
  coach_performance_goals:
    "Focus on improving explosive power and strength for takedown defense. Enhance endurance capacity for longer competition matches. Work on mental preparation and competition mindset for international events.",
  athlete_performance_goals:
    "Achieve podium finish at SEA Games 2025. Improve submission defense against international competitors. Increase training consistency and reduce injury risk through better recovery protocols.",
  other_remarks:
    "Athlete demonstrates excellent work ethic and coachability. Shows strong leadership qualities within the team environment. May benefit from sport psychology support for high-pressure competition situations.",
};

async function populateTrainingSchedule() {
  const client = await pool.connect();
  try {
    console.log("Connecting to database...");

    // Check if training schedule record exists
    const checkResult = await client.query(
      "SELECT id FROM consultation.session_training_schedule WHERE sessions_id = $1",
      [SESSION_ID],
    );

    console.log(
      `Training schedule exists: ${checkResult.rows.length > 0 ? "Yes" : "No"}`,
    );

    if (checkResult.rows.length === 0) {
      console.log("Creating new training schedule record...");

      // Insert new training schedule record
      const insertResult = await client.query(
        `
                INSERT INTO consultation.session_training_schedule (
                    sessions_id, 
                    mon_am, mon_pm, mon_training_hours, mon_rpe,
                    tues_am, tues_pm, tues_training_hours, tues_rpe,
                    wed_am, wed_pm, wed_training_hours, wed_rpe,
                    thur_am, thur_pm, thur_training_hours, thur_rpe,
                    fri_am, fri_pm, fri_training_hours, fri_rpe,
                    sat_am, sat_pm, sat_training_hours, sat_rpe,
                    sun_am, sun_pm, sun_training_hours, sun_rpe,
                    upcoming_major_competitions, upcoming_local_competitions,
                    current_performance, coach_performance_goals, 
                    athlete_performance_goals, other_remarks
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
                    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 
                    $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, 
                    $31, $32, $33
                )
                RETURNING id
            `,
        [
          SESSION_ID,
          trainingScheduleData.mon_am,
          trainingScheduleData.mon_pm,
          trainingScheduleData.mon_training_hours,
          trainingScheduleData.mon_rpe,
          trainingScheduleData.tues_am,
          trainingScheduleData.tues_pm,
          trainingScheduleData.tues_training_hours,
          trainingScheduleData.tues_rpe,
          trainingScheduleData.wed_am,
          trainingScheduleData.wed_pm,
          trainingScheduleData.wed_training_hours,
          trainingScheduleData.wed_rpe,
          trainingScheduleData.thur_am,
          trainingScheduleData.thur_pm,
          trainingScheduleData.thur_training_hours,
          trainingScheduleData.thur_rpe,
          trainingScheduleData.fri_am,
          trainingScheduleData.fri_pm,
          trainingScheduleData.fri_training_hours,
          trainingScheduleData.fri_rpe,
          trainingScheduleData.sat_am,
          trainingScheduleData.sat_pm,
          trainingScheduleData.sat_training_hours,
          trainingScheduleData.sat_rpe,
          trainingScheduleData.sun_am,
          trainingScheduleData.sun_pm,
          trainingScheduleData.sun_training_hours,
          trainingScheduleData.sun_rpe,
          trainingScheduleData.upcoming_major_competitions,
          trainingScheduleData.upcoming_local_competitions,
          trainingScheduleData.current_performance,
          trainingScheduleData.coach_performance_goals,
          trainingScheduleData.athlete_performance_goals,
          trainingScheduleData.other_remarks,
        ],
      );

      console.log(
        "✅ Created new training schedule record:",
        insertResult.rows[0],
      );
    } else {
      console.log("Updating existing training schedule record...");

      // Update existing training schedule record
      const updateResult = await client.query(
        `
                UPDATE consultation.session_training_schedule 
                SET 
                    mon_am = $2, mon_pm = $3, mon_training_hours = $4, mon_rpe = $5,
                    tues_am = $6, tues_pm = $7, tues_training_hours = $8, tues_rpe = $9,
                    wed_am = $10, wed_pm = $11, wed_training_hours = $12, wed_rpe = $13,
                    thur_am = $14, thur_pm = $15, thur_training_hours = $16, thur_rpe = $17,
                    fri_am = $18, fri_pm = $19, fri_training_hours = $20, fri_rpe = $21,
                    sat_am = $22, sat_pm = $23, sat_training_hours = $24, sat_rpe = $25,
                    sun_am = $26, sun_pm = $27, sun_training_hours = $28, sun_rpe = $29,
                    upcoming_major_competitions = $30, upcoming_local_competitions = $31,
                    current_performance = $32, coach_performance_goals = $33,
                    athlete_performance_goals = $34, other_remarks = $35
                WHERE sessions_id = $1
                RETURNING id
            `,
        [
          SESSION_ID,
          trainingScheduleData.mon_am,
          trainingScheduleData.mon_pm,
          trainingScheduleData.mon_training_hours,
          trainingScheduleData.mon_rpe,
          trainingScheduleData.tues_am,
          trainingScheduleData.tues_pm,
          trainingScheduleData.tues_training_hours,
          trainingScheduleData.tues_rpe,
          trainingScheduleData.wed_am,
          trainingScheduleData.wed_pm,
          trainingScheduleData.wed_training_hours,
          trainingScheduleData.wed_rpe,
          trainingScheduleData.thur_am,
          trainingScheduleData.thur_pm,
          trainingScheduleData.thur_training_hours,
          trainingScheduleData.thur_rpe,
          trainingScheduleData.fri_am,
          trainingScheduleData.fri_pm,
          trainingScheduleData.fri_training_hours,
          trainingScheduleData.fri_rpe,
          trainingScheduleData.sat_am,
          trainingScheduleData.sat_pm,
          trainingScheduleData.sat_training_hours,
          trainingScheduleData.sat_rpe,
          trainingScheduleData.sun_am,
          trainingScheduleData.sun_pm,
          trainingScheduleData.sun_training_hours,
          trainingScheduleData.sun_rpe,
          trainingScheduleData.upcoming_major_competitions,
          trainingScheduleData.upcoming_local_competitions,
          trainingScheduleData.current_performance,
          trainingScheduleData.coach_performance_goals,
          trainingScheduleData.athlete_performance_goals,
          trainingScheduleData.other_remarks,
        ],
      );

      console.log("✅ Updated training schedule record:", updateResult.rows[0]);
    }

    // Also populate PAL (Physical Activity Level) in nutrition review table
    console.log("Updating Physical Activity Level (PAL)...");

    const palResult = await client.query(
      `
            INSERT INTO consultation.session_nutrition_review (
                sessions_id, training_physical_activity_level_pal
            ) 
            VALUES ($1, $2)
            ON CONFLICT (sessions_id) 
            DO UPDATE SET training_physical_activity_level_pal = EXCLUDED.training_physical_activity_level_pal
            RETURNING sessions_id, training_physical_activity_level_pal
        `,
      [SESSION_ID, 1.9],
    );

    console.log("✅ Updated PAL:", palResult.rows[0]);

    // Verify the data was populated
    const verifyResult = await client.query(
      `
            SELECT 
                total_training_hours,
                upcoming_major_competitions,
                upcoming_local_competitions,
                current_performance,
                coach_performance_goals,
                athlete_performance_goals,
                other_remarks
            FROM consultation.session_training_schedule 
            WHERE sessions_id = $1
        `,
      [SESSION_ID],
    );

    if (verifyResult.rows.length > 0) {
      console.log("\n✅ Successfully populated training schedule!");
      console.log("\n📋 Data verification:");
      const data = verifyResult.rows[0];
      console.log(
        "Total Training Hours:",
        data.total_training_hours,
        "hrs/week",
      );
      console.log("Major Competitions:", data.upcoming_major_competitions);
      console.log("Local Competitions:", data.upcoming_local_competitions);
      console.log(
        "Current Performance:",
        data.current_performance?.substring(0, 80) + "...",
      );
      console.log(
        "Coach Goals:",
        data.coach_performance_goals?.substring(0, 80) + "...",
      );
      console.log(
        "Athlete Goals:",
        data.athlete_performance_goals?.substring(0, 80) + "...",
      );
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
populateTrainingSchedule();
