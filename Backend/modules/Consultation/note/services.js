import pool from "../../../config/db.js";

// ============================================================================
// LIST NOTES (paginated, with joined session + athlete + nutritionist)
// ============================================================================

/**
 * Get paginated list of notes with joined context
 * @param {number} pageNumber - Page number (1-indexed)
 * @param {number} pageSize - Items per page
 * @returns {Promise<Object>} Query result with rows
 */
export async function getNotesByPage(pageNumber, pageSize = 10) {
    const offset = (pageNumber - 1) * pageSize;

    const query = `
        SELECT
            sn.id,
            sn.sessions_id,
            sn.consultation_objective,
            sn.main_nutrition_diagnosis,
            sn.follow_up_note,
            sn.intervention_note,
            sn.medical_remarks,
            sn.other_remarks,
            s.date_of_consult,
            s.date_of_next_follow_up,
            s.athlete_id,
            a.athlete_name_abbr,
            s.nutritionist_id,
            n.name AS nutritionist_name,
            tl.type_of_consult
        FROM consultation.session_note sn
        LEFT JOIN consultation.sessions s ON sn.sessions_id = s.id
        LEFT JOIN ams.athlete a ON s.athlete_id = a.id
        LEFT JOIN ams.nutritionist n ON s.nutritionist_id = n.id
        LEFT JOIN consultation.type_of_consult_lookup tl ON s.type_of_consult_id = tl.id
        ORDER BY s.date_of_consult DESC
        LIMIT $1 OFFSET $2
    `;

    return await pool.query(query, [pageSize, offset]);
}

/**
 * Search notes across text fields + athlete/nutritionist names
 * @param {string} searchQuery - Search string
 * @param {number} pageNumber - Page number (1-indexed)
 * @param {number} pageSize - Items per page
 * @returns {Promise<Object>} Query result with rows
 */
export async function searchNotes(searchQuery, pageNumber, pageSize = 10) {
    const offset = (pageNumber - 1) * pageSize;
    const words = searchQuery.trim().split(/\s+/).filter(w => w.length > 0);

    if (words.length === 0) {
        return getNotesByPage(pageNumber, pageSize);
    }

    const conditions = words.map((_, i) => {
        const paramIdx = i + 1;
        return `(
            sn.consultation_objective ILIKE $${paramIdx}
            OR sn.main_nutrition_diagnosis ILIKE $${paramIdx}
            OR sn.follow_up_note ILIKE $${paramIdx}
            OR sn.intervention_note ILIKE $${paramIdx}
            OR sn.medical_remarks ILIKE $${paramIdx}
            OR sn.other_remarks ILIKE $${paramIdx}
            OR a.athlete_name_abbr ILIKE $${paramIdx}
            OR n.name ILIKE $${paramIdx}
        )`;
    });

    const query = `
        SELECT
            sn.id,
            sn.sessions_id,
            sn.consultation_objective,
            sn.main_nutrition_diagnosis,
            sn.follow_up_note,
            sn.intervention_note,
            sn.medical_remarks,
            sn.other_remarks,
            s.date_of_consult,
            s.date_of_next_follow_up,
            s.athlete_id,
            a.athlete_name_abbr,
            s.nutritionist_id,
            n.name AS nutritionist_name,
            tl.type_of_consult
        FROM consultation.session_note sn
        LEFT JOIN consultation.sessions s ON sn.sessions_id = s.id
        LEFT JOIN ams.athlete a ON s.athlete_id = a.id
        LEFT JOIN ams.nutritionist n ON s.nutritionist_id = n.id
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
 * Get total count of notes
 * @returns {Promise<number>} Total count
 */
export async function getTotalNoteCount() {
    const query = `SELECT COUNT(*) as count FROM consultation.session_note`;
    const result = await pool.query(query);
    return parseInt(result.rows[0].count);
}

/**
 * Get total count of notes matching a search query
 * @param {string} searchQuery - Search string
 * @returns {Promise<number>} Total count
 */
export async function getSearchNoteCount(searchQuery) {
    const words = searchQuery.trim().split(/\s+/).filter(w => w.length > 0);

    if (words.length === 0) {
        return getTotalNoteCount();
    }

    const conditions = words.map((_, i) => {
        const paramIdx = i + 1;
        return `(
            sn.consultation_objective ILIKE $${paramIdx}
            OR sn.main_nutrition_diagnosis ILIKE $${paramIdx}
            OR sn.follow_up_note ILIKE $${paramIdx}
            OR sn.intervention_note ILIKE $${paramIdx}
            OR sn.medical_remarks ILIKE $${paramIdx}
            OR sn.other_remarks ILIKE $${paramIdx}
            OR a.athlete_name_abbr ILIKE $${paramIdx}
            OR n.name ILIKE $${paramIdx}
        )`;
    });

    const query = `
        SELECT COUNT(*) as count
        FROM consultation.session_note sn
        LEFT JOIN consultation.sessions s ON sn.sessions_id = s.id
        LEFT JOIN ams.athlete a ON s.athlete_id = a.id
        LEFT JOIN ams.nutritionist n ON s.nutritionist_id = n.id
        WHERE ${conditions.join(' AND ')}
    `;

    const params = words.map(w => `%${w}%`);
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count);
}

// ============================================================================
// GET NOTE BY ID (with joined session + athlete + nutritionist)
// ============================================================================

/**
 * Get single note by ID with joined context
 * @param {string} noteId - UUID of note
 * @returns {Promise<Object|null>} Note object or null
 */
export async function getNoteById(noteId) {
    const query = `
        SELECT
            sn.id,
            sn.sessions_id,
            sn.consultation_objective,
            sn.main_nutrition_diagnosis,
            sn.follow_up_note,
            sn.intervention_note,
            sn.medical_remarks,
            sn.other_remarks,
            s.date_of_consult,
            s.date_of_next_follow_up,
            s.athlete_id,
            a.athlete_name_abbr,
            s.nutritionist_id,
            n.name AS nutritionist_name,
            tl.type_of_consult
        FROM consultation.session_note sn
        LEFT JOIN consultation.sessions s ON sn.sessions_id = s.id
        LEFT JOIN ams.athlete a ON s.athlete_id = a.id
        LEFT JOIN ams.nutritionist n ON s.nutritionist_id = n.id
        LEFT JOIN consultation.type_of_consult_lookup tl ON s.type_of_consult_id = tl.id
        WHERE sn.id = $1
    `;

    const result = await pool.query(query, [noteId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

// ============================================================================
// CREATE NOTE
// ============================================================================

/**
 * Create a new session note
 * @param {Object} data - Note data
 * @returns {Promise<Object>} Created note row
 */
export async function createNote(data) {
    const query = `
        INSERT INTO consultation.session_note (
            sessions_id, consultation_objective, main_nutrition_diagnosis,
            follow_up_note, intervention_note, medical_remarks, other_remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `;

    const result = await pool.query(query, [
        data.sessions_id,
        data.consultation_objective || null,
        data.main_nutrition_diagnosis || null,
        data.follow_up_note || null,
        data.intervention_note || null,
        data.medical_remarks || null,
        data.other_remarks || null,
    ]);
    return result.rows[0];
}

// ============================================================================
// UPDATE NOTE (dynamic field mapping)
// ============================================================================

/**
 * Update note fields (dynamic SET)
 * @param {string} noteId - UUID of note
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated note or null
 */
export async function updateNote(noteId, updateData) {
    const fields = [];
    const values = [];
    let paramCounter = 1;

    const fieldMapping = {
        consultation_objective: updateData.consultation_objective,
        main_nutrition_diagnosis: updateData.main_nutrition_diagnosis,
        follow_up_note: updateData.follow_up_note,
        intervention_note: updateData.intervention_note,
        medical_remarks: updateData.medical_remarks,
        other_remarks: updateData.other_remarks,
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

    values.push(noteId);

    const query = `
        UPDATE consultation.session_note
        SET ${fields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
}

// ============================================================================
// DELETE NOTES (bulk)
// ============================================================================

/**
 * Delete multiple notes by ID
 * @param {Array<string>} ids - Array of UUIDs
 * @returns {Promise<Array>} Array of deleted rows
 */
export async function deleteNotes(ids) {
    const query = `
        DELETE FROM consultation.session_note
        WHERE id = ANY($1::uuid[])
        RETURNING id
    `;

    const result = await pool.query(query, [ids]);
    return result.rows;
}
