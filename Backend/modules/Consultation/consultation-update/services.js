import pool from "../../../config/db.js";

// ============================================================================
// CONSULTATION UPDATE CARD SERVICES
// ============================================================================

/**
 * Get consultation update card data for a session
 * Returns session fields with joined nutritionist name, athlete name, and consult type
 * @param {string} sessionId - UUID of session
 * @returns {Promise<Object|null>} Session card data or null
 */
export async function getConsultationUpdate(sessionId) {
    const query = `
        SELECT
            s.id,
            s.nutritionist_id,
            n.name AS nutritionist_name,
            s.athlete_id,
            a.athlete_name_abbr,
            s.type_of_consult_id,
            tl.type_of_consult,
            s.title_description,
            s.venue,
            s.date_of_consult,
            s.time_of_consult,
            s.date_of_next_follow_up,
            s.time_of_next_follow_up,
            sn.consultation_objective
        FROM consultation.sessions s
        LEFT JOIN ams.nutritionist n ON s.nutritionist_id = n.id
        LEFT JOIN ams.athlete a ON s.athlete_id = a.id
        LEFT JOIN consultation.type_of_consult_lookup tl ON s.type_of_consult_id = tl.id
        LEFT JOIN consultation.session_note sn ON sn.sessions_id = s.id
        WHERE s.id = $1
    `;

    const result = await pool.query(query, [sessionId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Create a new consultation session
 * @param {Object} data - { nutritionist_id, athlete_id, type_of_consult_id, date_of_consult, date_of_next_follow_up }
 * @returns {Promise<Object>} Created session row
 */
export async function createConsultationSession(data) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Insert session
        const sessionResult = await client.query(`
            INSERT INTO consultation.sessions (
                nutritionist_id, athlete_id, type_of_consult_id,
                title_description, venue,
                date_of_consult, time_of_consult,
                date_of_next_follow_up, time_of_next_follow_up
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            data.nutritionist_id,
            data.athlete_id,
            data.type_of_consult_id,
            data.title_description || null,
            data.venue || null,
            data.date_of_consult || null,
            data.time_of_consult || null,
            data.date_of_next_follow_up || null,
            data.time_of_next_follow_up || null,
        ]);
        const session = sessionResult.rows[0];

        // 2. Insert session_note with consultation_objective (if provided)
        let note = null;
        if (data.consultation_objective !== undefined) {
            const noteResult = await client.query(`
                INSERT INTO consultation.session_note (sessions_id, consultation_objective)
                VALUES ($1, $2)
                RETURNING *
            `, [session.id, data.consultation_objective || null]);
            note = noteResult.rows[0];
        }

        await client.query('COMMIT');
        return getConsultationUpdate(session.id);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Update consultation session fields (dynamic SET)
 * @param {string} sessionId - UUID of session
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated session or null
 */
export async function updateConsultationSession(sessionId, updateData) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Update session fields (if any provided)
        const fields = [];
        const values = [];
        let paramCounter = 1;

        const fieldMapping = {
            type_of_consult_id: updateData.type_of_consult_id,
            title_description: updateData.title_description,
            venue: updateData.venue,
            date_of_consult: updateData.date_of_consult,
            time_of_consult: updateData.time_of_consult,
            date_of_next_follow_up: updateData.date_of_next_follow_up,
            time_of_next_follow_up: updateData.time_of_next_follow_up,
        };

        for (const [field, value] of Object.entries(fieldMapping)) {
            if (value !== undefined) {
                fields.push(`${field} = $${paramCounter}`);
                values.push(value);
                paramCounter++;
            }
        }

        let session = null;
        if (fields.length > 0) {
            values.push(sessionId);
            const sessionResult = await client.query(`
                UPDATE consultation.sessions
                SET ${fields.join(', ')}
                WHERE id = $${paramCounter}
                RETURNING *
            `, values);
            session = sessionResult.rows[0];
        }

        // 2. Upsert consultation_objective on session_note (if provided)
        let note = null;
        if (updateData.consultation_objective !== undefined) {
            // Check if session_note exists
            const noteCheck = await client.query(
                'SELECT id FROM consultation.session_note WHERE sessions_id = $1',
                [sessionId]
            );

            if (noteCheck.rows.length > 0) {
                const noteResult = await client.query(`
                    UPDATE consultation.session_note
                    SET consultation_objective = $1
                    WHERE sessions_id = $2
                    RETURNING *
                `, [updateData.consultation_objective, sessionId]);
                note = noteResult.rows[0];
            } else {
                const noteResult = await client.query(`
                    INSERT INTO consultation.session_note (sessions_id, consultation_objective)
                    VALUES ($1, $2)
                    RETURNING *
                `, [sessionId, updateData.consultation_objective]);
                note = noteResult.rows[0];
            }
        }

        await client.query('COMMIT');

        if (!session && !note) return null;

        return {
            session: session || null,
            note: note ? { consultation_objective: note.consultation_objective } : null,
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Get the latest consultation session for an athlete, ordered by date_of_consult DESC
 * @param {string} athleteId - Athlete UUID
 * @returns {Promise<Object|null>} Latest session card data or null if athlete has no sessions
 */
export async function getLatestConsultationSession(athleteId) {
    const query = `
        SELECT
            s.id,
            s.nutritionist_id,
            n.name AS nutritionist_name,
            s.athlete_id,
            a.athlete_name_abbr,
            s.type_of_consult_id,
            tl.type_of_consult,
            s.title_description,
            s.venue,
            s.date_of_consult,
            s.time_of_consult,
            s.date_of_next_follow_up,
            s.time_of_next_follow_up,
            sn.consultation_objective
        FROM consultation.sessions s
        LEFT JOIN ams.nutritionist n ON s.nutritionist_id = n.id
        LEFT JOIN ams.athlete a ON s.athlete_id = a.id
        LEFT JOIN consultation.type_of_consult_lookup tl ON s.type_of_consult_id = tl.id
        LEFT JOIN consultation.session_note sn ON sn.sessions_id = s.id
        WHERE s.athlete_id = $1
        ORDER BY s.date_of_consult DESC NULLS LAST
        LIMIT 1
    `;

    const result = await pool.query(query, [athleteId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get all consultation sessions for an athlete, ordered by date_of_consult DESC
 * @param {string} athleteId - Athlete UUID
 * @returns {Promise<Array>} All session card data rows
 */
export async function getAllConsultationSessions(athleteId) {
    const query = `
        SELECT
            s.id,
            s.nutritionist_id,
            n.name AS nutritionist_name,
            s.athlete_id,
            a.athlete_name_abbr,
            s.type_of_consult_id,
            tl.type_of_consult,
            s.title_description,
            s.venue,
            s.date_of_consult,
            s.time_of_consult,
            s.date_of_next_follow_up,
            s.time_of_next_follow_up,
            sn.consultation_objective
        FROM consultation.sessions s
        LEFT JOIN ams.nutritionist n ON s.nutritionist_id = n.id
        LEFT JOIN ams.athlete a ON s.athlete_id = a.id
        LEFT JOIN consultation.type_of_consult_lookup tl ON s.type_of_consult_id = tl.id
        LEFT JOIN consultation.session_note sn ON sn.sessions_id = s.id
        WHERE s.athlete_id = $1
        ORDER BY s.date_of_consult DESC NULLS LAST
    `;

    const result = await pool.query(query, [athleteId]);
    return result.rows;
}

/**
 * Get nutritionist ID by auth user ID
 * @param {string} userId - UUID from auth.users
 * @returns {Promise<string|null>} Nutritionist UUID or null
 */
export async function getNutritionistIdByUserId(userId) {
    const result = await pool.query(
        `SELECT id FROM AMS.Nutritionist WHERE user_id = $1`,
        [userId]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
}
