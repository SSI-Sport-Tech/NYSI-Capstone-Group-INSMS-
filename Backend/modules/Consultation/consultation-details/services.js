import pool, { withUserContext } from "../../../config/db.js";

// ============================================================================
// CONSULTATION DETAILS CARD SERVICES
// ============================================================================

// Fields managed by this card (excludes consultation_objective which is owned by consultation-update)
const DETAIL_FIELDS = [
    'main_nutrition_diagnosis',
    'carbohydrates_review',
    'protein_review',
    'fat_review',
    'other_review',
    'follow_up_note',
    'intervention_note',
    'other_remarks',
];

/**
 * Get consultation details for a session
 * @param {string} sessionId - UUID of session
 * @returns {Promise<Object|null>} Details data or null if session doesn't exist
 */
export async function getConsultationDetails(sessionId) {
    // First check the session exists
    const sessionCheck = await pool.query(
        'SELECT id FROM consultation.sessions WHERE id = $1',
        [sessionId]
    );
    if (sessionCheck.rows.length === 0) return null;

    const query = `
        SELECT
            sn.id,
            sn.sessions_id,
            sn.main_nutrition_diagnosis,
            sn.carbohydrates_review,
            sn.protein_review,
            sn.fat_review,
            sn.other_review,
            sn.follow_up_note,
            sn.intervention_note,
            sn.other_remarks
        FROM consultation.session_note sn
        WHERE sn.sessions_id = $1
    `;

    const result = await pool.query(query, [sessionId]);

    if (result.rows.length === 0) {
        // Session exists but no note row yet — return empty fields
        return {
            id: null,
            sessions_id: sessionId,
            main_nutrition_diagnosis: null,
            carbohydrates_review: null,
            protein_review: null,
            fat_review: null,
            other_review: null,
            follow_up_note: null,
            intervention_note: null,
            other_remarks: null,
        };
    }

    return result.rows[0];
}

/**
 * Create or update consultation details (upsert pattern)
 * If session_note already exists (e.g. created by consultation-update with objective), UPDATE.
 * Otherwise INSERT.
 * @param {string} sessionId - UUID of session
 * @param {Object} data - Fields to set
 * @param {string} userId - UUID of user (for audit trail)
 * @returns {Promise<Object>} Upserted session_note row
 */
export async function upsertConsultationDetails(sessionId, data, userId) {
    return withUserContext(userId, async (client) => {
        const noteCheck = await client.query(
            'SELECT id FROM consultation.session_note WHERE sessions_id = $1',
            [sessionId]
        );

        if (noteCheck.rows.length > 0) {
            return updateSessionNote(client, sessionId, data);
        } else {
            return insertSessionNote(client, sessionId, data);
        }
    });
}

/**
 * Insert a new session_note row
 */
async function insertSessionNote(client, sessionId, data) {
    const columns = ['sessions_id'];
    const placeholders = ['$1'];
    const values = [sessionId];
    let paramCounter = 2;

    for (const field of DETAIL_FIELDS) {
        if (data[field] !== undefined) {
            columns.push(field);
            placeholders.push(`$${paramCounter}`);
            values.push(data[field]);
            paramCounter++;
        }
    }

    const result = await client.query(`
        INSERT INTO consultation.session_note (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
    `, values);

    return result.rows[0];
}

/**
 * Update an existing session_note row (dynamic SET)
 */
async function updateSessionNote(client, sessionId, data) {
    const fields = [];
    const values = [];
    let paramCounter = 1;

    for (const field of DETAIL_FIELDS) {
        if (data[field] !== undefined) {
            fields.push(`${field} = $${paramCounter}`);
            values.push(data[field]);
            paramCounter++;
        }
    }

    if (fields.length === 0) return null;

    values.push(sessionId);
    const result = await client.query(`
        UPDATE consultation.session_note
        SET ${fields.join(', ')}
        WHERE sessions_id = $${paramCounter}
        RETURNING *
    `, values);

    return result.rows.length > 0 ? result.rows[0] : null;
}
