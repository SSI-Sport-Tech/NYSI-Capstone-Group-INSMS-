import pool from "../../../config/db.js";

/**
 * Get all active schedule types
 * @returns {Promise<Array>} List of { id, schedule_type }
 */
export async function getScheduleTypes() {
    const result = await pool.query(`
        SELECT id, schedule_type
        FROM ams.schedule_type_lookup
        ORDER BY schedule_type ASC
    `);
    return result.rows;
}