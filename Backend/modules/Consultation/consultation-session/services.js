import pool, { withUserContext } from "../../../config/db.js";

// ============================================================================
// CONSULTATION SESSION SERVICES
// ============================================================================

/**
 * Get consultation session data
 * Returns session fields with joined nutritionist name, athlete name, and consult type
 * @param {string} sessionId - UUID of session
 * @returns {Promise<Object|null>} Session card data or null
 */
export async function getConsultationSession(sessionId) {
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
            s.consultation_objective_id,
            col.consultation_objective,
            s.is_scheduled_booking,
            s.status
        FROM consultation.sessions s
        LEFT JOIN ams.nutritionist n ON s.nutritionist_id = n.id
        LEFT JOIN ams.athlete a ON s.athlete_id = a.id
        LEFT JOIN consultation.type_of_consult_lookup tl ON s.type_of_consult_id = tl.id
        LEFT JOIN consultation.consultation_objective_lookup col ON col.id = s.consultation_objective_id
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
export async function createConsultationSession(data, userId) {
    const sessionId = await withUserContext(userId, async (client) => {
        // 1. Insert session
        const sessionResult = await client.query(`
            INSERT INTO consultation.sessions (
                nutritionist_id, athlete_id, type_of_consult_id,
                title_description, venue,
                date_of_consult, time_of_consult,
                date_of_next_follow_up, time_of_next_follow_up,
                consultation_objective_id,
                is_scheduled_booking
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
            data.consultation_objective_id || null,
            data.is_scheduled_booking ?? false,
        ]);
        const session = sessionResult.rows[0];

        return session.id;
    });

    return getConsultationSession(sessionId);
}

/**
 * Update consultation session fields (dynamic SET)
 * @param {string} sessionId - UUID of session
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated session or null
 */
export async function updateConsultationSession(sessionId, updateData, userId) {
    return withUserContext(userId, async (client) => {
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
            consultation_objective_id: updateData.consultation_objective_id,
            is_scheduled_booking: updateData.is_scheduled_booking,
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

        if (!session) return null;

        return { session };
    });
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
            s.is_scheduled_booking,
            s.status
        FROM consultation.sessions s
        LEFT JOIN ams.nutritionist n ON s.nutritionist_id = n.id
        LEFT JOIN ams.athlete a ON s.athlete_id = a.id
        LEFT JOIN consultation.type_of_consult_lookup tl ON s.type_of_consult_id = tl.id
        WHERE s.athlete_id = $1
        ORDER BY s.date_of_consult DESC NULLS LAST, s.id DESC
        LIMIT 1
    `;

    const result = await pool.query(query, [athleteId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get the consultation session that occurred immediately before the given session (same athlete)
 * @param {string} sessionId - UUID of the current session
 * @returns {Promise<Object|null>} Previous session { id, date_of_consult } or null
 */
export async function getPreviousConsultationSession(sessionId) {
    const query = `
        WITH curr AS (
            SELECT athlete_id, created_at
            FROM consultation.sessions
            WHERE id = $1
        )
        SELECT s.id, s.date_of_consult
        FROM consultation.sessions s, curr
        WHERE s.athlete_id = curr.athlete_id
          AND s.id != $1
          AND s.created_at < curr.created_at
        ORDER BY s.created_at DESC
        LIMIT 1
    `;
    const result = await pool.query(query, [sessionId]);
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
            s.is_scheduled_booking,
            s.status,
            sup.supplement_name,
            ib.batch_number,
            sp.dosage,
            sp.dosage_unit,
            sp.dosage_frequency
        FROM consultation.sessions s
        LEFT JOIN ams.nutritionist n ON s.nutritionist_id = n.id
        LEFT JOIN ams.athlete a ON s.athlete_id = a.id
        LEFT JOIN consultation.type_of_consult_lookup tl ON s.type_of_consult_id = tl.id
        LEFT JOIN LATERAL (
            SELECT sp2.dosage, sp2.dosage_unit, sp2.dosage_frequency, sp2.batch_id
            FROM consultation.session_prescription sp2
            WHERE sp2.sessions_id = s.id
            LIMIT 1
        ) sp ON true
        LEFT JOIN sss.inventory_batch ib ON sp.batch_id = ib.id
        LEFT JOIN sss.supplement sup ON ib.supplement_id = sup.id
        WHERE s.athlete_id = $1
        ORDER BY s.date_of_consult DESC NULLS LAST
    `;

    const result = await pool.query(query, [athleteId]);
    return result.rows;
}

/**
 * Get upcoming consultation sessions (date_of_consult >= today), ordered by date ASC
 * @param {number} limit - Max rows to return (default 20)
 * @returns {Promise<Array>}
 */
export async function getUpcomingConsultationSessions(limit = 20) {
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
            s.is_scheduled_booking,
            s.status
        FROM consultation.sessions s
        LEFT JOIN ams.nutritionist n ON s.nutritionist_id = n.id
        LEFT JOIN ams.athlete a ON s.athlete_id = a.id
        LEFT JOIN consultation.type_of_consult_lookup tl ON s.type_of_consult_id = tl.id
        WHERE s.date_of_consult >= CURRENT_DATE
        ORDER BY s.date_of_consult ASC, s.time_of_consult ASC NULLS LAST
        LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
}

/**
 * Get sessions within a date range (for calendar view)
 * @param {string} from - Start date YYYY-MM-DD
 * @param {string} to - End date YYYY-MM-DD
 * @returns {Promise<Array>}
 */
export async function getSessionsByDateRange(from, to) {
    const query = `
        SELECT
            s.id,
            s.nutritionist_id,
            n.name AS nutritionist_name,
            s.athlete_id,
            a.athlete_name_abbr,
            s.type_of_consult_id,
            tl.type_of_consult,
            s.venue,
            s.date_of_consult,
            s.time_of_consult,
            s.is_scheduled_booking,
            s.status
        FROM consultation.sessions s
        LEFT JOIN ams.nutritionist n ON s.nutritionist_id = n.id
        LEFT JOIN ams.athlete a ON s.athlete_id = a.id
        LEFT JOIN consultation.type_of_consult_lookup tl ON s.type_of_consult_id = tl.id
        WHERE s.date_of_consult >= $1 AND s.date_of_consult <= $2
        ORDER BY s.date_of_consult, s.time_of_consult ASC NULLS LAST
    `;
    const result = await pool.query(query, [from, to]);
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

/**
 * Get today's consultation sessions for a specific nutritionist
 * @param {string} nutritionistId - Nutritionist UUID
 * @returns {Promise<Array>}
 */
export async function getTodaySessionsForNutritionist(nutritionistId, date) {
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
            s.is_scheduled_booking,
            s.status
        FROM consultation.sessions s
        LEFT JOIN ams.nutritionist n ON s.nutritionist_id = n.id
        LEFT JOIN ams.athlete a ON s.athlete_id = a.id
        LEFT JOIN consultation.type_of_consult_lookup tl ON s.type_of_consult_id = tl.id
        WHERE s.nutritionist_id = $1
          AND s.date_of_consult = $2::date
        ORDER BY s.time_of_consult ASC NULLS LAST
    `;
    const result = await pool.query(query, [nutritionistId, date]);
    return result.rows;
}

/**
 * Update the status of a consultation session
 * @param {string} sessionId - Session UUID
 * @param {string} status - New status ('scheduled' | 'in-progress' | 'completed' | 'cancelled')
 * @param {string} userId - Auth user UUID for audit
 * @returns {Promise<Object|null>} Updated session or null
 */
export async function updateSessionStatus(sessionId, status, userId) {
    return withUserContext(userId, async (client) => {
        const result = await client.query(
            `UPDATE consultation.sessions SET status = $1 WHERE id = $2 RETURNING *`,
            [status, sessionId]
        );
        return result.rows.length > 0 ? result.rows[0] : null;
    });
}
