import pool from "../../../config/db.js";

// ============================================================================
// COACH CRUD SERVICES
// ============================================================================

/**
 * Get all coaches with sport name
 * @returns {Promise<Object>} Query result with rows
 */
export async function getAllCoaches() {
    const query = `
        SELECT c.id, c.sport_id, c.name, sl.sport AS sport_name
        FROM AMS.Coach c
        LEFT JOIN AMS.Sport_Lookup sl ON c.sport_id = sl.id
        ORDER BY c.name ASC
    `;

    return await pool.query(query);
}

/**
 * Get single coach by ID with sport name
 * @param {string} coachId - UUID of coach
 * @returns {Promise<Object|null>} Coach object or null
 */
export async function getCoachById(coachId) {
    const query = `
        SELECT c.id, c.sport_id, c.name, sl.sport AS sport_name
        FROM AMS.Coach c
        LEFT JOIN AMS.Sport_Lookup sl ON c.sport_id = sl.id
        WHERE c.id = $1
    `;

    const result = await pool.query(query, [coachId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Check for duplicate coach (same name + sport combo, case-insensitive)
 * @param {string} name - Coach name
 * @param {string} sportId - Sport UUID
 * @param {string|null} excludeId - Coach ID to exclude (for updates)
 * @returns {Promise<boolean>} True if duplicate exists
 */
export async function checkDuplicateCoach(name, sportId, excludeId = null) {
    let query = `
        SELECT id FROM AMS.Coach
        WHERE LOWER(name) = LOWER($1) AND sport_id = $2
    `;
    const params = [name, sportId];

    if (excludeId) {
        query += ` AND id != $3`;
        params.push(excludeId);
    }

    query += ` LIMIT 1`;

    const result = await pool.query(query, params);
    return result.rows.length > 0;
}

/**
 * Check if a sport_id exists and is active in Sport_Lookup
 * @param {string} sportId - Sport UUID
 * @returns {Promise<boolean>} True if sport exists and is active
 */
export async function checkSportExists(sportId) {
    const query = `
        SELECT id FROM AMS.Sport_Lookup
        WHERE id = $1 AND is_active = true
        LIMIT 1
    `;

    const result = await pool.query(query, [sportId]);
    return result.rows.length > 0;
}

/**
 * Create a new coach
 * @param {string} name - Coach name
 * @param {string} sportId - Sport UUID
 * @returns {Promise<Object>} Created coach row
 */
export async function createCoach(name, sportId) {
    const query = `
        INSERT INTO AMS.Coach (name, sport_id)
        VALUES ($1, $2)
        RETURNING *
    `;

    const result = await pool.query(query, [name, sportId]);
    return result.rows[0];
}

/**
 * Update coach fields (dynamic SET)
 * @param {string} coachId - UUID of coach
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated coach or null
 */
export async function updateCoach(coachId, updateData) {
    const fields = [];
    const values = [];
    let paramCounter = 1;

    const fieldMapping = {
        name: updateData.name,
        sport_id: updateData.sport_id,
    };

    for (const [field, value] of Object.entries(fieldMapping)) {
        if (value !== undefined) {
            fields.push(`${field} = $${paramCounter}`);
            values.push(value);
            paramCounter++;
        }
    }

    if (fields.length === 0) {
        return null;
    }

    values.push(coachId);

    const query = `
        UPDATE AMS.Coach
        SET ${fields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Delete multiple coaches by ID (CASCADE handles mapping cleanup)
 * @param {Array<string>} coachIds - Array of UUIDs
 * @returns {Promise<Array>} Array of deleted rows
 */
export async function deleteCoaches(coachIds) {
    const query = `
        DELETE FROM AMS.Coach
        WHERE id = ANY($1::uuid[])
        RETURNING id
    `;

    const result = await pool.query(query, [coachIds]);
    return result.rows;
}

/**
 * Check if an athlete_id exists in the Athlete table
 * @param {string} athleteId - Athlete UUID
 * @returns {Promise<boolean>} True if athlete exists
 */
export async function checkAthleteExists(athleteId) {
    const query = `
        SELECT id FROM AMS.Athlete
        WHERE id = $1
        LIMIT 1
    `;

    const result = await pool.query(query, [athleteId]);
    return result.rows.length > 0;
}

// ============================================================================
// COACH-ATHLETE MAPPING SERVICES
// ============================================================================

/**
 * Get all coach-athlete mappings with coach and athlete names
 * @returns {Promise<Object>} Query result with rows
 */
export async function getAllMappings() {
    const query = `
        SELECT cam.id, cam.athlete_id, cam.coach_id, cam.is_active,
               c.name AS coach_name, a.athlete_name_abbr AS athlete_name
        FROM AMS.Coach_Athlete_Mapping cam
        JOIN AMS.Coach c ON cam.coach_id = c.id
        JOIN AMS.Athlete a ON cam.athlete_id = a.id
        ORDER BY a.athlete_name_abbr ASC, c.name ASC
    `;

    return await pool.query(query);
}

/**
 * Get all mappings for a specific athlete
 * @param {string} athleteId - UUID of athlete
 * @returns {Promise<Object>} Query result with rows
 */
export async function getMappingsByAthleteId(athleteId) {
    const query = `
        SELECT cam.id, cam.athlete_id, cam.coach_id, cam.is_active,
               c.name AS coach_name, a.athlete_name_abbr AS athlete_name
        FROM AMS.Coach_Athlete_Mapping cam
        JOIN AMS.Coach c ON cam.coach_id = c.id
        JOIN AMS.Athlete a ON cam.athlete_id = a.id
        WHERE cam.athlete_id = $1
        ORDER BY c.name ASC
    `;

    return await pool.query(query, [athleteId]);
}

/**
 * Check if a mapping already exists for the given composite key
 * @param {string} athleteId - Athlete UUID
 * @param {string} coachId - Coach UUID
 * @returns {Promise<boolean>} True if mapping exists
 */
export async function checkMappingExists(athleteId, coachId) {
    const query = `
        SELECT 1 FROM AMS.Coach_Athlete_Mapping
        WHERE athlete_id = $1 AND coach_id = $2
        LIMIT 1
    `;

    const result = await pool.query(query, [athleteId, coachId]);
    return result.rows.length > 0;
}

/**
 * Create a new coach-athlete mapping
 * @param {string} athleteId - Athlete UUID
 * @param {string} coachId - Coach UUID
 * @param {boolean} isActive - Whether the mapping is active
 * @returns {Promise<Object>} Created mapping row
 */
export async function createMapping(athleteId, coachId, isActive) {
    const query = `
        INSERT INTO AMS.Coach_Athlete_Mapping (athlete_id, coach_id, is_active)
        VALUES ($1, $2, $3)
        RETURNING *
    `;

    const result = await pool.query(query, [athleteId, coachId, isActive]);
    return result.rows[0];
}

/**
 * Delete mappings by composite key pairs
 * @param {Array<{athlete_id: string, coach_id: string}>} pairs - Array of composite key pairs
 * @returns {Promise<Array>} Array of deleted rows
 */
export async function deleteMappings(pairs) {
    const valueClauses = [];
    const params = [];
    let paramCounter = 1;

    for (const pair of pairs) {
        valueClauses.push(`($${paramCounter}::uuid, $${paramCounter + 1}::uuid)`);
        params.push(pair.athlete_id, pair.coach_id);
        paramCounter += 2;
    }

    const query = `
        DELETE FROM AMS.Coach_Athlete_Mapping
        WHERE (athlete_id, coach_id) IN (${valueClauses.join(', ')})
        RETURNING id, athlete_id, coach_id
    `;

    const result = await pool.query(query, params);
    return result.rows;
}

/**
 * Update mapping is_active status
 * @param {string} athleteId - Athlete UUID
 * @param {string} coachId - Coach UUID
 * @param {boolean} isActive - New is_active status
 * @returns {Promise<Object|null>} Updated mapping or null if not found
 */
export async function updateMapping(athleteId, coachId, isActive) {
    const query = `
        UPDATE AMS.Coach_Athlete_Mapping
        SET is_active = $3
        WHERE athlete_id = $1 AND coach_id = $2
        RETURNING *
    `;

    const result = await pool.query(query, [athleteId, coachId, isActive]);
    return result.rows.length > 0 ? result.rows[0] : null;
}
