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
 * Update an existing nutritionist
 * @param {string} id - Nutritionist UUID
 * @param {string} name - New name
 * @returns {Promise<Object|null>} Updated row or null
 */
export async function updateNutritionist(id, name) {
    const query = `
        UPDATE AMS.Nutritionist 
        SET name = $1 
        WHERE id = $2 
        RETURNING *
    `;

    const result = await pool.query(query, [name, id]);
    return result.rows.length > 0 ? result.rows[0] : null;
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

/**
 * Get nutritionist by ID
 * @param {string} nutritionistId - UUID of nutritionist
 * @returns {Promise<Object|null>} Nutritionist object or null
 */
export async function getNutritionistById(nutritionistId) {
    const query = `
        SELECT id, name
        FROM AMS.Nutritionist
        WHERE id = $1
    `;

    const result = await pool.query(query, [nutritionistId]);
    return result.rows.length > 0 ? result.rows[0] : null;
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
// NUTRITIONIST-ATHLETE MAPPING & PINNING SERVICES
// ============================================================================

/**
 * Get "My Athletes" for a logged-in nutritionist
 * Sorts by PINNED status first, then by name.
 * @param {string} nutritionistId 
 */
export async function getAssignedAthletes(nutritionistId) {
    const query = `
        SELECT 
            a.id, 
            a.athlete_name_abbr, 
            a.sportsync_id,
            sl.sport AS sport_name,
            nam.is_pinned,
            nam.is_active,
            nam.start_date
        FROM AMS.Nutritionist_Athlete_Mapping nam
        JOIN AMS.Athlete a ON nam.athlete_id = a.id
        LEFT JOIN AMS.Sport_Lookup sl ON a.sport_id = sl.id
        WHERE nam.nutritionist_id = $1 AND nam.is_active = TRUE
        ORDER BY nam.is_pinned DESC, a.athlete_name_abbr ASC
    `;
    const result = await pool.query(query, [nutritionistId]);
    return result.rows;
}

/**
 * Toggle the pinned status of an athlete for a nutritionist
 * @param {string} nutritionistId 
 * @param {string} athleteId 
 * @param {boolean} isPinned 
 */
export async function toggleAthletePin(nutritionistId, athleteId, isPinned) {
    const query = `
        UPDATE AMS.Nutritionist_Athlete_Mapping
        SET is_pinned = $3
        WHERE nutritionist_id = $1 AND athlete_id = $2
        RETURNING is_pinned
    `;
    const result = await pool.query(query, [nutritionistId, athleteId, isPinned]);
    return result.rows[0];
}

/**
 * Get all nutritionist-athlete mappings with nutritionist and athlete names
 * @param {boolean|null} isActive - Optional filter for is_active status
 * @returns {Promise<Object>} Query result with rows
 */
export async function getAllMappings(isActive = null) {
    let query = `
        SELECT nam.id, nam.athlete_id, nam.nutritionist_id, nam.is_active,
               n.name AS nutritionist_name, a.athlete_name_abbr AS athlete_name
        FROM AMS.Nutritionist_Athlete_Mapping nam
        JOIN AMS.Nutritionist n ON nam.nutritionist_id = n.id
        JOIN AMS.Athlete a ON nam.athlete_id = a.id
    `;

    const params = [];
    if (isActive !== null) {
        query += ` WHERE nam.is_active = $1`;
        params.push(isActive);
    }

    query += ` ORDER BY a.athlete_name_abbr ASC, n.name ASC`;

    return await pool.query(query, params);
}

/**
 * Get all mappings for a specific athlete
 * @param {string} athleteId - UUID of athlete
 * @param {boolean|null} isActive - Optional filter for is_active status
 * @returns {Promise<Object>} Query result with rows
 */
export async function getMappingsByAthleteId(athleteId, isActive = null) {
    let query = `
        SELECT nam.id, nam.athlete_id, nam.nutritionist_id, nam.is_active,
               n.name AS nutritionist_name, a.athlete_name_abbr AS athlete_name
        FROM AMS.Nutritionist_Athlete_Mapping nam
        JOIN AMS.Nutritionist n ON nam.nutritionist_id = n.id
        JOIN AMS.Athlete a ON nam.athlete_id = a.id
        WHERE nam.athlete_id = $1
    `;

    const params = [athleteId];
    if (isActive !== null) {
        query += ` AND nam.is_active = $2`;
        params.push(isActive);
    }

    query += ` ORDER BY n.name ASC`;

    return await pool.query(query, params);
}

/**
 * Check if a mapping already exists for the given composite key
 * @param {string} athleteId - Athlete UUID
 * @param {string} nutritionistId - Nutritionist UUID
 * @returns {Promise<boolean>} True if mapping exists
 */
export async function checkMappingExists(athleteId, nutritionistId) {
    const query = `
        SELECT 1 FROM AMS.Nutritionist_Athlete_Mapping
        WHERE athlete_id = $1 AND nutritionist_id = $2
        LIMIT 1
    `;

    const result = await pool.query(query, [athleteId, nutritionistId]);
    return result.rows.length > 0;
}

/**
 * Create a new nutritionist-athlete mapping
 * @param {string} athleteId - Athlete UUID
 * @param {string} nutritionistId - Nutritionist UUID
 * @param {boolean} isActive - Whether the mapping is active
 * @returns {Promise<Object>} Created mapping row
 */
export async function createMapping(athleteId, nutritionistId, isActive) {
    const query = `
        INSERT INTO AMS.Nutritionist_Athlete_Mapping (athlete_id, nutritionist_id, is_active)
        VALUES ($1, $2, $3)
        RETURNING *
    `;

    const result = await pool.query(query, [athleteId, nutritionistId, isActive]);
    return result.rows[0];
}

/**
 * Update mapping is_active status
 * @param {string} athleteId - Athlete UUID
 * @param {string} nutritionistId - Nutritionist UUID
 * @param {boolean} isActive - New is_active status
 * @returns {Promise<Object|null>} Updated mapping or null if not found
 */
export async function updateMapping(athleteId, nutritionistId, isActive) {
    const query = `
        UPDATE AMS.Nutritionist_Athlete_Mapping
        SET is_active = $3
        WHERE athlete_id = $1 AND nutritionist_id = $2
        RETURNING *
    `;

    const result = await pool.query(query, [athleteId, nutritionistId, isActive]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Delete mappings by composite key pairs
 * @param {Array<{athlete_id: string, nutritionist_id: string}>} pairs - Array of composite key pairs
 * @returns {Promise<Array>} Array of deleted rows
 */
export async function deleteMappings(pairs) {
    const valueClauses = [];
    const params = [];
    let paramCounter = 1;

    for (const pair of pairs) {
        valueClauses.push(`($${paramCounter}::uuid, $${paramCounter + 1}::uuid)`);
        params.push(pair.athlete_id, pair.nutritionist_id);
        paramCounter += 2;
    }

    const query = `
        DELETE FROM AMS.Nutritionist_Athlete_Mapping
        WHERE (athlete_id, nutritionist_id) IN (${valueClauses.join(', ')})
        RETURNING id, athlete_id, nutritionist_id
    `;

    const result = await pool.query(query, params);
    return result.rows;
}