import pool from "../../../config/db.js";

// ============================================================================
// LIST SESSIONS (paginated, with joined names)
// ============================================================================

/**
 * Get paginated list of sessions with joined names
 * @param {number} pageNumber - Page number (1-indexed)
 * @param {number} pageSize - Items per page
 * @returns {Promise<Object>} Query result with rows
 */
export async function getSessionsByPage(pageNumber, pageSize = 10) {
    const offset = (pageNumber - 1) * pageSize;

    const query = `
        SELECT
            s.id,
            s.nutritionist_id,
            n.name AS nutritionist_name,
            s.athlete_id,
            a.athlete_name_abbr,
            s.type_of_consult_id,
            tl.type_of_consult,
            s.date_of_consult,
            s.date_of_next_follow_up
        FROM consultation.sessions s
        LEFT JOIN ams.nutritionist n ON s.nutritionist_id = n.id
        LEFT JOIN ams.athlete a ON s.athlete_id = a.id
        LEFT JOIN consultation.type_of_consult_lookup tl ON s.type_of_consult_id = tl.id
        ORDER BY s.date_of_consult DESC
        LIMIT $1 OFFSET $2
    `;

    return await pool.query(query, [pageSize, offset]);
}

/**
 * Search sessions across athlete name, nutritionist name, and consult type
 * @param {string} searchQuery - Search string
 * @param {number} pageNumber - Page number (1-indexed)
 * @param {number} pageSize - Items per page
 * @returns {Promise<Object>} Query result with rows
 */
export async function searchSessions(searchQuery, pageNumber, pageSize = 10) {
    const offset = (pageNumber - 1) * pageSize;
    const words = searchQuery.trim().split(/\s+/).filter(w => w.length > 0);

    if (words.length === 0) {
        return getSessionsByPage(pageNumber, pageSize);
    }

    const conditions = words.map((_, i) => {
        const paramIdx = i + 1;
        return `(
            a.athlete_name_abbr ILIKE $${paramIdx}
            OR n.name ILIKE $${paramIdx}
            OR tl.type_of_consult ILIKE $${paramIdx}
        )`;
    });

    const query = `
        SELECT
            s.id,
            s.nutritionist_id,
            n.name AS nutritionist_name,
            s.athlete_id,
            a.athlete_name_abbr,
            s.type_of_consult_id,
            tl.type_of_consult,
            s.date_of_consult,
            s.date_of_next_follow_up
        FROM consultation.sessions s
        LEFT JOIN ams.nutritionist n ON s.nutritionist_id = n.id
        LEFT JOIN ams.athlete a ON s.athlete_id = a.id
        LEFT JOIN consultation.type_of_consult_lookup tl ON s.type_of_consult_id = tl.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY s.date_of_consult DESC
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
 * Get total count of sessions
 * @returns {Promise<number>} Total count
 */
export async function getTotalSessionCount() {
    const query = `SELECT COUNT(*) as count FROM consultation.sessions`;
    const result = await pool.query(query);
    return parseInt(result.rows[0].count);
}

/**
 * Get total count of sessions matching a search query
 * @param {string} searchQuery - Search string
 * @returns {Promise<number>} Total count
 */
export async function getSearchSessionCount(searchQuery) {
    const words = searchQuery.trim().split(/\s+/).filter(w => w.length > 0);

    if (words.length === 0) {
        return getTotalSessionCount();
    }

    const conditions = words.map((_, i) => {
        const paramIdx = i + 1;
        return `(
            a.athlete_name_abbr ILIKE $${paramIdx}
            OR n.name ILIKE $${paramIdx}
            OR tl.type_of_consult ILIKE $${paramIdx}
        )`;
    });

    const query = `
        SELECT COUNT(*) as count
        FROM consultation.sessions s
        LEFT JOIN ams.nutritionist n ON s.nutritionist_id = n.id
        LEFT JOIN ams.athlete a ON s.athlete_id = a.id
        LEFT JOIN consultation.type_of_consult_lookup tl ON s.type_of_consult_id = tl.id
        WHERE ${conditions.join(' AND ')}
    `;

    const params = words.map(w => `%${w}%`);
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count);
}

// ============================================================================
// GET SESSION BY ID (with joined names)
// ============================================================================

/**
 * Get single session by ID with joined names
 * @param {string} sessionId - UUID of session
 * @returns {Promise<Object|null>} Session object or null
 */
export async function getSessionById(sessionId) {
    const query = `
        SELECT
            s.id,
            s.nutritionist_id,
            n.name AS nutritionist_name,
            s.athlete_id,
            a.athlete_name_abbr,
            s.type_of_consult_id,
            tl.type_of_consult,
            s.date_of_consult,
            s.date_of_next_follow_up
        FROM consultation.sessions s
        LEFT JOIN ams.nutritionist n ON s.nutritionist_id = n.id
        LEFT JOIN ams.athlete a ON s.athlete_id = a.id
        LEFT JOIN consultation.type_of_consult_lookup tl ON s.type_of_consult_id = tl.id
        WHERE s.id = $1
    `;

    const result = await pool.query(query, [sessionId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

// ============================================================================
// CREATE SESSION
// ============================================================================

/**
 * Create a new session
 * @param {Object} data - Session data
 * @returns {Promise<Object>} Created session row
 */
export async function createSession(data) {
    const query = `
        INSERT INTO consultation.sessions (
            nutritionist_id, athlete_id, type_of_consult_id,
            date_of_consult, date_of_next_follow_up
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;

    const result = await pool.query(query, [
        data.nutritionist_id,
        data.athlete_id,
        data.type_of_consult_id,
        data.date_of_consult || null,
        data.date_of_next_follow_up || null,
    ]);
    return result.rows[0];
}

// ============================================================================
// UPDATE SESSION (dynamic field mapping)
// ============================================================================

/**
 * Update session fields (dynamic SET)
 * @param {string} sessionId - UUID of session
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated session or null
 */
export async function updateSession(sessionId, updateData) {
    const fields = [];
    const values = [];
    let paramCounter = 1;

    const fieldMapping = {
        nutritionist_id: updateData.nutritionist_id,
        athlete_id: updateData.athlete_id,
        type_of_consult_id: updateData.type_of_consult_id,
        date_of_consult: updateData.date_of_consult,
        date_of_next_follow_up: updateData.date_of_next_follow_up,
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

    values.push(sessionId);

    const query = `
        UPDATE consultation.sessions
        SET ${fields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
}

// ============================================================================
// DELETE SESSIONS (bulk)
// ============================================================================

/**
 * Delete multiple sessions by ID
 * @param {Array<string>} ids - Array of UUIDs
 * @returns {Promise<Array>} Array of deleted rows
 */
export async function deleteSessions(ids) {
    const query = `
        DELETE FROM consultation.sessions
        WHERE id = ANY($1::uuid[])
        RETURNING id
    `;

    const result = await pool.query(query, [ids]);
    return result.rows;
}

// ============================================================================
// TRAINING SCHEDULE / TARGET EVENT SERVICES - ✅ NEW
// ============================================================================

/**
 * UPSERT Training Schedule info (Target Event)
 * @param {string} sessionId - UUID of the session
 * @param {Object} data - fields from updateTrainingScheduleSchema
 */
export async function upsertTrainingSchedule(sessionId, data) {
    // 1. Check if a record exists for this session
    const checkQuery = `SELECT id FROM consultation.session_training_schedule WHERE sessions_id = $1`;
    const check = await pool.query(checkQuery, [sessionId]);
    
    if (check.rows.length > 0) {
        // 2. UPDATE existing
        const updateQuery = `
            UPDATE consultation.session_training_schedule
            SET upcoming_major_competitions = COALESCE($2, upcoming_major_competitions),
                upcoming_local_competitions = COALESCE($3, upcoming_local_competitions),
                other_remarks = COALESCE($4, other_remarks)
            WHERE sessions_id = $1
            RETURNING *
        `;
        const res = await pool.query(updateQuery, [
            sessionId, 
            data.upcoming_major_competitions, 
            data.upcoming_local_competitions, 
            data.other_remarks
        ]);
        return res.rows[0];
    } else {
        // 3. INSERT new
        const insertQuery = `
            INSERT INTO consultation.session_training_schedule
            (sessions_id, upcoming_major_competitions, upcoming_local_competitions, other_remarks)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const res = await pool.query(insertQuery, [
            sessionId, 
            data.upcoming_major_competitions, 
            data.upcoming_local_competitions, 
            data.other_remarks
        ]);
        return res.rows[0];
    }
}