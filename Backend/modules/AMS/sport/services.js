import pool, { withUserContext } from "../../../config/db.js";

/**
 * Get all sports from lookup table
 * @param {boolean} activeOnly - Filter by is_active (default true)
 * @returns {Promise<Object>} Query result with rows
 */
export async function getAllSports(activeOnly = true) {
    const query = `
        SELECT id, sport, is_active
        FROM AMS.Sport_Lookup
        ${activeOnly ? 'WHERE is_active = true' : ''}
        ORDER BY sport ASC
    `;

    return await pool.query(query);
}

/**
 * Check if a sport name already exists (case-insensitive)
 * @param {string} sportName - Sport name to check
 * @returns {Promise<boolean>} True if duplicate exists
 */
export async function checkDuplicateSport(sportName) {
    const query = `
        SELECT id FROM AMS.Sport_Lookup
        WHERE LOWER(sport) = LOWER($1)
        LIMIT 1
    `;

    const result = await pool.query(query, [sportName]);
    return result.rows.length > 0;
}

/**
 * Create a new sport
 * @param {string} sportName - Sport name
 * @returns {Promise<Object>} Created sport row
 */
export async function createSport(sportName, userId) {
    const query = `
        INSERT INTO AMS.Sport_Lookup (sport)
        VALUES ($1)
        RETURNING id, sport, is_active
    `;

    return withUserContext(userId, async (client) => {
        const result = await client.query(query, [sportName]);
        return result.rows[0];
    });
}

/**
 * Get a sport by ID
 * @param {string} sportId - UUID of sport
 * @returns {Promise<Object|null>} Sport object or null
 */
export async function getSportById(sportId) {
    const query = `
        SELECT id, sport, is_active
        FROM AMS.Sport_Lookup
        WHERE id = $1
    `;

    const result = await pool.query(query, [sportId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Update is_active status for a sport
 * @param {string} sportId - UUID of sport
 * @param {boolean} isActive - New is_active value
 * @returns {Promise<Object|null>} Updated sport or null
 */
export async function updateSportStatus(sportId, isActive, userId) {
    const query = `
        UPDATE AMS.Sport_Lookup
        SET is_active = $1
        WHERE id = $2
        RETURNING id, sport, is_active
    `;

    return withUserContext(userId, async (client) => {
        const result = await client.query(query, [isActive, sportId]);
        return result.rows.length > 0 ? result.rows[0] : null;
    });
}

/**
 * Check if any of the given sport IDs are referenced by athletes or coaches
 * @param {Array<string>} sportIds - Array of UUIDs
 * @returns {Promise<Array<string>>} Array of sport IDs that are referenced
 */
export async function getReferencedSportIds(sportIds) {
    const query = `
        SELECT DISTINCT sl.id
        FROM AMS.Sport_Lookup sl
        WHERE sl.id = ANY($1::uuid[])
        AND (
            EXISTS (SELECT 1 FROM AMS.Athlete a WHERE a.sport_id = sl.id)
            OR EXISTS (SELECT 1 FROM AMS.Coach c WHERE c.sport_id = sl.id)
        )
    `;

    const result = await pool.query(query, [sportIds]);
    return result.rows.map(r => r.id);
}

/**
 * Delete multiple sports by ID
 * @param {Array<string>} sportIds - Array of UUIDs
 * @returns {Promise<Array>} Array of deleted rows
 */
export async function deleteSports(sportIds, userId) {
    const query = `
        DELETE FROM AMS.Sport_Lookup
        WHERE id = ANY($1::uuid[])
        RETURNING id, sport
    `;

    return withUserContext(userId, async (client) => {
        const result = await client.query(query, [sportIds]);
        return result.rows;
    });
}
