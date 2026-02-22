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

async function populateSessionData() {
  const client = await pool.connect();
  try {
    console.log("Connecting to database...");

    // 1. Update/Insert SESSION NUTRITION REVIEW
    console.log("1. Populating nutrition review data...");

    // First delete existing record if any
    await client.query(
      "DELETE FROM consultation.session_nutrition_review WHERE sessions_id = $1",
      [SESSION_ID],
    );

    const nutritionResult = await client.query(
      `
            INSERT INTO consultation.session_nutrition_review (
                sessions_id,
                anthropometry_height_cm,
                anthropometry_weight_kg,
                anthropometry_target_weight_kg,
                anthropometry_fat_mass_kg,
                anthropometry_skeletal_muscle_mass_kg,
                training_physical_activity_level_pal,
                estimated_carbohydrate_intake_g,
                estimated_protein_intake_g,
                estimated_fat_intake_g,
                minimum_carbohydrate_requirment_g_kg_bw,
                maximum_carbohydrate_requirment_g_kg_bw,
                minimum_protein_requirment_g_kg_bw,
                maximum_protein_requirment_g_kg_bw,
                minimum_fat_requirment_g_kg_bw,
                maximum_fat_requirment_g_kg_bw,
                comments_on_weekday_intake,
                comments_on_weekend_intake,
                other_remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING id
        `,
      [
        SESSION_ID,
        181.0, // height_cm
        70.0, // weight_kg
        65.0, // target_weight_kg
        15.2, // fat_mass_kg
        33.5, // skeletal_muscle_mass_kg
        1.9, // PAL
        350.0, // carb_intake_g
        140.0, // protein_intake_g
        60.0, // fat_intake_g
        5.0, // min_carb_g_kg_bw
        8.0, // max_carb_g_kg_bw
        1.6, // min_protein_g_kg_bw
        2.2, // max_protein_g_kg_bw
        1.0, // min_fat_g_kg_bw
        1.5, // max_fat_g_kg_bw
        "Generally consistent with plan on weekdays. Pre-training fuelling needs improvement.",
        "Tends to eat more carbohydrates on weekends due to longer training sessions.",
        "Good overall dietary adherence. Focus on post-training recovery nutrition timing.",
      ],
    );

    console.log("✅ Nutrition review data updated");

    // 2. Insert SESSION ANTHROPOMETRY
    console.log("2. Populating anthropometry data...");

    // Delete existing record first
    await client.query(
      "DELETE FROM consultation.session_anthropometry WHERE sessions_id = $1",
      [SESSION_ID],
    );

    const anthropometryResult = await client.query(
      `
            INSERT INTO consultation.session_anthropometry (
                sessions_id,
                bmi_category,
                sum_of_8_skinfold,
                mother_height,
                father_height,
                other_remarks
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `,
      [
        SESSION_ID,
        "Normal",
        58.4,
        163.0,
        178.0,
        "Measurements taken post morning training, well hydrated.",
      ],
    );

    console.log("✅ Anthropometry data inserted");

    // 3. Insert SESSION MEAL LOG
    console.log("3. Populating meal log data...");

    await client.query(
      "DELETE FROM consultation.session_meal_log WHERE sessions_id = $1",
      [SESSION_ID],
    );

    const mealLogResult = await client.query(
      `
            INSERT INTO consultation.session_meal_log (
                sessions_id,
                am_breakfast_food, am_breakfast_macro,
                am_training_food, am_training_macro,
                pm_lunch_food, pm_lunch_macro,
                pm_training_food, pm_training_macro,
                pm_dinner_food, pm_dinner_macro,
                supper_food, supper_macro,
                total_carbohydrate_intake,
                total_protein_intake,
                total_fat_intake,
                other_remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING id
        `,
      [
        SESSION_ID,
        "Oatmeal with banana and milk",
        "CHO: 70g, PRO: 15g, FAT: 8g",
        "Sports drink + energy gel",
        "CHO: 45g, PRO: 0g, FAT: 0g",
        "Rice with grilled chicken and vegetables",
        "CHO: 80g, PRO: 40g, FAT: 10g",
        "Protein shake with banana",
        "CHO: 35g, PRO: 30g, FAT: 3g",
        "Pasta with lean beef mince and salad",
        "CHO: 90g, PRO: 40g, FAT: 12g",
        "Greek yogurt with mixed nuts",
        "CHO: 20g, PRO: 15g, FAT: 10g",
        340.0, // total carbs
        140.0, // total protein
        43.0, // total fat
        "Athlete tracks intake on MyFitnessPal. Good meal timing around training sessions.",
      ],
    );

    console.log("✅ Meal log data inserted");

    // 4. Additional tables for completeness
    console.log("4. Populating additional session data...");

    // Session Hydration
    await client.query(
      "DELETE FROM consultation.session_hydration WHERE sessions_id = $1",
      [SESSION_ID],
    );
    await client.query(
      `
            INSERT INTO consultation.session_hydration (
                sessions_id, water_intake_per_day, urine_colour, hydration_status, other_remarks
            ) VALUES ($1, $2, $3, $4, $5)
        `,
      [
        SESSION_ID,
        3.2,
        "Pale yellow (2-3 on urine colour chart)",
        "Well hydrated",
        "Good hydration habits. Carries water bottle to all sessions.",
      ],
    );

    console.log("✅ All session data populated successfully!");

    // Verify the data
    console.log("\n📋 Verifying data...");

    const verifyResult = await client.query(
      `
            SELECT 
                anthropometry_height_cm as height,
                anthropometry_weight_kg as weight,
                anthropometry_fat_mass_kg as fat_mass,
                training_physical_activity_level_pal as pal
            FROM consultation.session_nutrition_review 
            WHERE sessions_id = $1
        `,
      [SESSION_ID],
    );

    if (verifyResult.rows.length > 0) {
      const data = verifyResult.rows[0];
      console.log("Height:", data.height, "cm");
      console.log("Weight:", data.weight, "kg");
      console.log("Fat Mass:", data.fat_mass, "kg");
      console.log("PAL:", data.pal);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Full error:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
populateSessionData();
