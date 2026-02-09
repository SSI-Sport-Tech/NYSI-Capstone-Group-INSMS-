import pool from "../../../config/db.js";

// ============================================================================
// ATHLETE CRUD SERVICES
// ============================================================================

/**
 * Get paginated list of athletes with sport name
 * @param {number} pageNumber - Page number (1-indexed)
 * @param {number} pageSize - Items per page (default 10)
 * @returns {Promise<Object>} Query result with rows
 */
export async function getAthletesByPage(pageNumber, pageSize = 10) {
    const offset = (pageNumber - 1) * pageSize;

    const query = `
        SELECT
            a.id,
            a.sportsync_id,
            a.athlete_name_abbr,
            sl.sport AS sport_name,
            a.gender,
            a.date_of_birth
        FROM AMS.Athlete a
        LEFT JOIN AMS.Sport_Lookup sl ON a.sport_id = sl.id
        ORDER BY a.athlete_name_abbr ASC
        LIMIT $1 OFFSET $2
    `;

    return await pool.query(query, [pageSize, offset]);
}

/**
 * Search athletes across name, sportsync_id, sport, and gender
 * @param {string} searchQuery - Search string
 * @param {number} pageNumber - Page number (1-indexed)
 * @param {number} pageSize - Items per page (default 10)
 * @returns {Promise<Object>} Query result with rows
 */
export async function searchAthletes(searchQuery, pageNumber, pageSize = 10) {
    const offset = (pageNumber - 1) * pageSize;
    const words = searchQuery.trim().split(/\s+/).filter(w => w.length > 0);

    if (words.length === 0) {
        return getAthletesByPage(pageNumber, pageSize);
    }

    // Each word must match at least one field (AND across words)
    const conditions = words.map((_, i) => {
        const paramIdx = i + 1;
        return `(
            a.athlete_name_abbr ILIKE $${paramIdx}
            OR a.sportsync_id ILIKE $${paramIdx}
            OR sl.sport ILIKE $${paramIdx}
            OR a.gender ILIKE $${paramIdx}
        )`;
    });

    const query = `
        SELECT
            a.id,
            a.sportsync_id,
            a.athlete_name_abbr,
            sl.sport AS sport_name,
            a.gender,
            a.date_of_birth
        FROM AMS.Athlete a
        LEFT JOIN AMS.Sport_Lookup sl ON a.sport_id = sl.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY a.athlete_name_abbr ASC
        LIMIT $${words.length + 1} OFFSET $${words.length + 2}
    `;

    const params = [
        ...words.map(w => `%${w}%`),
        pageSize,
        offset,
    ];

    return await pool.query(query, params);
}

/**
 * Get total count of athletes
 * @returns {Promise<number>} Total count
 */
export async function getTotalAthleteCount() {
    const query = `SELECT COUNT(*) as count FROM AMS.Athlete`;
    const result = await pool.query(query);
    return parseInt(result.rows[0].count);
}

/**
 * Get total count of athletes matching a search query
 * @param {string} searchQuery - Search string
 * @returns {Promise<number>} Total count
 */
export async function getSearchAthleteCount(searchQuery) {
    const words = searchQuery.trim().split(/\s+/).filter(w => w.length > 0);

    if (words.length === 0) {
        return getTotalAthleteCount();
    }

    const conditions = words.map((_, i) => {
        const paramIdx = i + 1;
        return `(
            a.athlete_name_abbr ILIKE $${paramIdx}
            OR a.sportsync_id ILIKE $${paramIdx}
            OR sl.sport ILIKE $${paramIdx}
            OR a.gender ILIKE $${paramIdx}
        )`;
    });

    const query = `
        SELECT COUNT(*) as count
        FROM AMS.Athlete a
        LEFT JOIN AMS.Sport_Lookup sl ON a.sport_id = sl.id
        WHERE ${conditions.join(' AND ')}
    `;

    const params = words.map(w => `%${w}%`);
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count);
}

/**
 * Get single athlete by ID with sport name
 * @param {string} athleteId - UUID of athlete
 * @returns {Promise<Object|null>} Athlete object or null
 */
export async function getAthleteById(athleteId) {
    const query = `
        SELECT
            a.id,
            a.sport_id,
            a.sportsync_id,
            a.athlete_name_abbr,
            a.gender,
            a.date_of_birth,
            sl.sport AS sport_name
        FROM AMS.Athlete a
        LEFT JOIN AMS.Sport_Lookup sl ON a.sport_id = sl.id
        WHERE a.id = $1
    `;

    const result = await pool.query(query, [athleteId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Check for duplicate athlete by sportsync_id
 * @param {string} sportsync_id - External system ID
 * @param {string|null} excludeId - Athlete ID to exclude (for updates)
 * @returns {Promise<boolean>} True if duplicate exists
 */
export async function checkDuplicateAthlete(sportsync_id, excludeId = null) {
    let query = `SELECT id FROM AMS.Athlete WHERE sportsync_id = $1`;
    const params = [sportsync_id];

    if (excludeId) {
        query += ` AND id != $2`;
        params.push(excludeId);
    }

    query += ` LIMIT 1`;

    const result = await pool.query(query, params);
    return result.rows.length > 0;
}

/**
 * Create basic athlete record (no relations)
 * @param {Object} athleteData - Athlete base fields
 * @returns {Promise<Object>} Created athlete record
 */
export async function createBasicAthlete(athleteData) {
    const result = await pool.query(`
        INSERT INTO AMS.Athlete (
            sport_id, sportsync_id, athlete_name_abbr, gender, date_of_birth
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `, [
        athleteData.sport_id,
        athleteData.sportsync_id,
        athleteData.athlete_name_abbr,
        athleteData.gender,
        athleteData.date_of_birth,
    ]);
    return result.rows[0];
}

/**
 * Create athlete with registry, medical, and coach/nutritionist mappings in a single transaction
 * @param {Object} athleteData - Athlete base fields
 * @param {Object} registryData - Registry fields
 * @param {Object} medicalData - Medical fields
 * @param {Array<string>} coachIds - Array of coach UUIDs to map
 * @param {Array<string>} nutritionistIds - Array of nutritionist UUIDs to map
 * @returns {Promise<Object>} Created records { athlete, registry, medical, coachMappings, nutritionistMappings }
 */
export async function createCompleteAthlete(athleteData, registryData, medicalData, coachIds, nutritionistIds) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Insert athlete
        const athleteResult = await client.query(`
            INSERT INTO AMS.Athlete (
                sport_id, sportsync_id, athlete_name_abbr, gender, date_of_birth
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            athleteData.sport_id,
            athleteData.sportsync_id,
            athleteData.athlete_name_abbr,
            athleteData.gender,
            athleteData.date_of_birth,
        ]);
        const athlete = athleteResult.rows[0];

        // 2. Insert registry
        const registryResult = await client.query(`
            INSERT INTO AMS.Athlete_Registry (
                athlete_id, carding_status, athlete_notified_on,
                carding_start_date, carding_end_date, medical_clearance,
                approved_start_date, approved_end_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            athlete.id,
            registryData.carding_status,
            registryData.athlete_notified_on,
            registryData.carding_start_date,
            registryData.carding_end_date,
            registryData.medical_clearance,
            registryData.approved_start_date,
            registryData.approved_end_date,
        ]);
        const registry = registryResult.rows[0];

        // 3. Insert medical
        const medicalResult = await client.query(`
            INSERT INTO AMS.Athlete_Medical (
                athlete_id, medical_condition, food_allergy, drug_allergy, past_injury
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            athlete.id,
            medicalData.medical_condition,
            medicalData.food_allergy,
            medicalData.drug_allergy,
            medicalData.past_injury,
        ]);
        const medical = medicalResult.rows[0];

        // 4. Insert coach mappings
        const coachMappings = [];
        for (const coachId of coachIds) {
            const mappingResult = await client.query(`
                INSERT INTO AMS.Coach_Athlete_Mapping (athlete_id, coach_id, is_active)
                VALUES ($1, $2, true)
                RETURNING *
            `, [athlete.id, coachId]);
            coachMappings.push(mappingResult.rows[0]);
        }

        // 5. Insert nutritionist mappings
        const nutritionistMappings = [];
        for (const nutritionistId of nutritionistIds) {
            const mappingResult = await client.query(`
                INSERT INTO AMS.Nutritionist_Athlete_Mapping (athlete_id, nutritionist_id, is_active)
                VALUES ($1, $2, true)
                RETURNING *
            `, [athlete.id, nutritionistId]);
            nutritionistMappings.push(mappingResult.rows[0]);
        }

        await client.query('COMMIT');
        return { athlete, registry, medical, coachMappings, nutritionistMappings };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Update athlete base fields (dynamic SET)
 * @param {string} athleteId - UUID of athlete
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated athlete or null
 */
export async function updateAthlete(athleteId, updateData) {
    const fields = [];
    const values = [];
    let paramCounter = 1;

    const fieldMapping = {
        sport_id: updateData.sport_id,
        sportsync_id: updateData.sportsync_id,
        athlete_name_abbr: updateData.athlete_name_abbr,
        gender: updateData.gender,
        date_of_birth: updateData.date_of_birth,
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

    values.push(athleteId);

    const query = `
        UPDATE AMS.Athlete
        SET ${fields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Delete multiple athletes (cascade deletes registry/medical)
 * @param {Array<string>} athleteIds - Array of UUIDs
 * @returns {Promise<Array>} Array of deleted rows
 */
export async function deleteAthletes(athleteIds) {
    const query = `
        DELETE FROM AMS.Athlete
        WHERE id = ANY($1::uuid[])
        RETURNING id
    `;

    const result = await pool.query(query, [athleteIds]);
    return result.rows;
}

// ============================================================================
// REGISTRY SERVICES
// ============================================================================

/**
 * Get registry by athlete ID
 * @param {string} athleteId - UUID of athlete
 * @returns {Promise<Object|null>} Registry object or null
 */
export async function getRegistryByAthleteId(athleteId) {
    const query = `
        SELECT id, athlete_id, carding_status, athlete_notified_on,
               carding_start_date, carding_end_date, medical_clearance,
               approved_start_date, approved_end_date
        FROM AMS.Athlete_Registry
        WHERE athlete_id = $1
    `;

    const result = await pool.query(query, [athleteId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Update registry by athlete ID (dynamic SET)
 * @param {string} athleteId - UUID of athlete
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated registry or null
 */
export async function updateRegistry(athleteId, updateData) {
    const fields = [];
    const values = [];
    let paramCounter = 1;

    const fieldMapping = {
        carding_status: updateData.carding_status,
        athlete_notified_on: updateData.athlete_notified_on,
        carding_start_date: updateData.carding_start_date,
        carding_end_date: updateData.carding_end_date,
        medical_clearance: updateData.medical_clearance,
        approved_start_date: updateData.approved_start_date,
        approved_end_date: updateData.approved_end_date,
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

    values.push(athleteId);

    const query = `
        UPDATE AMS.Athlete_Registry
        SET ${fields.join(', ')}
        WHERE athlete_id = $${paramCounter}
        RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
}

// ============================================================================
// MEDICAL SERVICES
// ============================================================================

/**
 * Get medical record by athlete ID
 * @param {string} athleteId - UUID of athlete
 * @returns {Promise<Object|null>} Medical object or null
 */
export async function getMedicalByAthleteId(athleteId) {
    const query = `
        SELECT id, athlete_id, medical_condition, food_allergy, drug_allergy, past_injury
        FROM AMS.Athlete_Medical
        WHERE athlete_id = $1
    `;

    const result = await pool.query(query, [athleteId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Update medical record by athlete ID (dynamic SET)
 * @param {string} athleteId - UUID of athlete
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated medical or null
 */
export async function updateMedical(athleteId, updateData) {
    const fields = [];
    const values = [];
    let paramCounter = 1;

    const fieldMapping = {
        medical_condition: updateData.medical_condition,
        food_allergy: updateData.food_allergy,
        drug_allergy: updateData.drug_allergy,
        past_injury: updateData.past_injury,
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

    values.push(athleteId);

    const query = `
        UPDATE AMS.Athlete_Medical
        SET ${fields.join(', ')}
        WHERE athlete_id = $${paramCounter}
        RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
}

