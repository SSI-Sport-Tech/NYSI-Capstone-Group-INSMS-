import pool from "../../../config/db.js";

// ============================================================================
// NUTRITIONIST CRUD SERVICES
// ============================================================================

/**
 * Get all nutritionists
 * @returns {Promise<Object>} Query result with rows
 */
export async function getAllNutritionists() {
    const query = `
        SELECT id, name
        FROM AMS.Nutritionist
        ORDER BY name ASC
    `;

    return await pool.query(query);
}

/**
 * Check for duplicate nutritionist (case-insensitive name match)
 * @param {string} name - Nutritionist name
 * @returns {Promise<boolean>} True if duplicate exists
 */
export async function checkDuplicateNutritionist(name) {
    const query = `
        SELECT id FROM AMS.Nutritionist
        WHERE LOWER(name) = LOWER($1)
        LIMIT 1
    `;

    const result = await pool.query(query, [name]);
    return result.rows.length > 0;
}

/**
 * Create a new nutritionist
 * @param {string} name - Nutritionist name
 * @returns {Promise<Object>} Created nutritionist row
 */
export async function createNutritionist(name) {
    const query = `
        INSERT INTO AMS.Nutritionist (name)
        VALUES ($1)
        RETURNING *
    `;

    const result = await pool.query(query, [name]);
    return result.rows[0];
}

/**
 * Delete multiple nutritionists by ID
 * @param {Array<string>} nutritionistIds - Array of UUIDs
 * @returns {Promise<Array>} Array of deleted rows
 */
export async function deleteNutritionists(nutritionistIds) {
    const query = `
        DELETE FROM AMS.Nutritionist
        WHERE id = ANY($1::uuid[])
        RETURNING id
    `;

    const result = await pool.query(query, [nutritionistIds]);
    return result.rows;
}
