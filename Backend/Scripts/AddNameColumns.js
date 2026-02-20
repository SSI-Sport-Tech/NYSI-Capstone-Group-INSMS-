import pool from "../config/db.js";

async function addNameColumns() {
  try {
    console.log("🔄 Adding first_name and last_name columns to auth.users...");

    await pool.query(`
            ALTER TABLE auth.users 
            ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
            ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)
        `);

    console.log("✅ Columns added successfully!");

    // Verify the structure
    const columnsResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'auth' AND table_name = 'users'
            ORDER BY ordinal_position
        `);

    console.log("\n📋 Updated table structure:");
    console.table(columnsResult.rows);
  } catch (error) {
    console.error("❌ Error adding columns:", error.message);
  } finally {
    await pool.end();
  }
}

addNameColumns();
