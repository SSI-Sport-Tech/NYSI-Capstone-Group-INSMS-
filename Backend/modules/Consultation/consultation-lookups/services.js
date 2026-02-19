import pool from "../../../config/db.js";

/**
 * Get all active consult types
 * @returns {Promise<Array>} List of { id, type_of_consult }
 */
export async function getConsultTypes() {
    const result = await pool.query(`
        SELECT id, type_of_consult
        FROM consultation.type_of_consult_lookup
        WHERE is_active = true
        ORDER BY type_of_consult ASC
    `);
    return result.rows;
}

/**
 * Get all active nutrition diagnoses
 * @returns {Promise<Array>} List of { id, category, diagnosis }
 */
export async function getNutritionDiagnoses() {
    const result = await pool.query(`
        SELECT id, category, diagnosis
        FROM consultation.nutrition_diagnosis_lookup
        WHERE is_active = true
        ORDER BY category, diagnosis ASC
    `);
    return result.rows;
}
