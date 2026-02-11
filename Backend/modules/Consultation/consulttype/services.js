import pool from "../../../config/db.js";

/**
 * Get all consult types from lookup table
 * @param {boolean} activeOnly - Filter by is_active (default true)
 * @returns {Promise<Object>} Query result with rows
 */
export async function getAllConsultTypes(activeOnly = true) {
    const query = `
        SELECT id, type_of_consult, is_active
        FROM consultation.type_of_consult_lookup
        ${activeOnly ? 'WHERE is_active = true' : ''}
        ORDER BY type_of_consult ASC
    `;

    return await pool.query(query);
}

/**
 * Check if a consult type name already exists (case-insensitive)
 * @param {string} name - Consult type name to check
 * @returns {Promise<boolean>} True if duplicate exists
 */
export async function checkDuplicateConsultType(name) {
    const query = `
        SELECT id FROM consultation.type_of_consult_lookup
        WHERE LOWER(type_of_consult) = LOWER($1)
        LIMIT 1
    `;

    const result = await pool.query(query, [name]);
    return result.rows.length > 0;
}

/**
 * Create a new consult type
 * @param {string} name - Consult type name
 * @returns {Promise<Object>} Created consult type row
 */
export async function createConsultType(name) {
    const query = `
        INSERT INTO consultation.type_of_consult_lookup (type_of_consult)
        VALUES ($1)
        RETURNING id, type_of_consult, is_active
    `;

    const result = await pool.query(query, [name]);
    return result.rows[0];
}

/**
 * Get a consult type by ID
 * @param {string} id - UUID of consult type
 * @returns {Promise<Object|null>} Consult type object or null
 */
export async function getConsultTypeById(id) {
    const query = `
        SELECT id, type_of_consult, is_active
        FROM consultation.type_of_consult_lookup
        WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Update is_active status for a consult type
 * @param {string} id - UUID of consult type
 * @param {boolean} isActive - New is_active value
 * @returns {Promise<Object|null>} Updated consult type or null
 */
export async function updateConsultType(id, isActive) {
    const query = `
        UPDATE consultation.type_of_consult_lookup
        SET is_active = $1
        WHERE id = $2
        RETURNING id, type_of_consult, is_active
    `;

    const result = await pool.query(query, [isActive, id]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Check if any of the given consult type IDs are referenced by sessions
 * @param {Array<string>} ids - Array of UUIDs
 * @returns {Promise<Array<string>>} Array of IDs that are referenced
 */
export async function getReferencedConsultTypeIds(ids) {
    const query = `
        SELECT DISTINCT tl.id
        FROM consultation.type_of_consult_lookup tl
        WHERE tl.id = ANY($1::uuid[])
        AND EXISTS (SELECT 1 FROM consultation.sessions s WHERE s.type_of_consult_id = tl.id)
    `;

    const result = await pool.query(query, [ids]);
    return result.rows.map(r => r.id);
}

/**
 * Delete multiple consult types by ID
 * @param {Array<string>} ids - Array of UUIDs
 * @returns {Promise<Array>} Array of deleted rows
 */
export async function deleteConsultTypes(ids) {
    const query = `
        DELETE FROM consultation.type_of_consult_lookup
        WHERE id = ANY($1::uuid[])
        RETURNING id, type_of_consult
    `;

    const result = await pool.query(query, [ids]);
    return result.rows;
}
