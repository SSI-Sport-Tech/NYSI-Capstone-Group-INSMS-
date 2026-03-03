import pool, { withUserContext } from "../../../config/db.js";

// ============================================================================
// CONSULTATION DETAILS CARD SERVICES
// ============================================================================

// Fields managed by this card (excludes consultation_objective which is owned by consultation-update)
const DETAIL_FIELDS = [
    'main_nutrition_diagnosis',
    'carbohydrates_review_id',
    'protein_review_id',
    'fat_review_id',
    'fibre_review_id',
    'iron_review_id',
    'calcium_review_id',
    'micronutrients_review_id',
    'other_review',
    'follow_up_note',
    'intervention_note',
    'other_remarks',
];

/**
 * Get consultation details for a session with joined diagnosis names
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
            sn.carbohydrates_review_id,
            carb.diagnosis AS carbohydrates_review_diagnosis,
            sn.protein_review_id,
            prot.diagnosis AS protein_review_diagnosis,
            sn.fat_review_id,
            fat.diagnosis AS fat_review_diagnosis,
            sn.fibre_review_id,
            fibre.diagnosis AS fibre_review_diagnosis,
            sn.iron_review_id,
            iron.diagnosis AS iron_review_diagnosis,
            sn.calcium_review_id,
            calc.diagnosis AS calcium_review_diagnosis,
            sn.micronutrients_review_id,
            micro.diagnosis AS micronutrients_review_diagnosis,
            sn.other_review,
            sn.follow_up_note,
            sn.intervention_note,
            sn.other_remarks
        FROM consultation.session_note sn
        LEFT JOIN consultation.nutrition_diagnosis_lookup carb ON sn.carbohydrates_review_id = carb.id
        LEFT JOIN consultation.nutrition_diagnosis_lookup prot ON sn.protein_review_id = prot.id
        LEFT JOIN consultation.nutrition_diagnosis_lookup fat ON sn.fat_review_id = fat.id
        LEFT JOIN consultation.nutrition_diagnosis_lookup fibre ON sn.fibre_review_id = fibre.id
        LEFT JOIN consultation.nutrition_diagnosis_lookup iron ON sn.iron_review_id = iron.id
        LEFT JOIN consultation.nutrition_diagnosis_lookup calc ON sn.calcium_review_id = calc.id
        LEFT JOIN consultation.nutrition_diagnosis_lookup micro ON sn.micronutrients_review_id = micro.id
        WHERE sn.sessions_id = $1
    `;

    const result = await pool.query(query, [sessionId]);

    if (result.rows.length === 0) {
        // Session exists but no note row yet — return empty fields
        return {
            id: null,
            sessions_id: sessionId,
            main_nutrition_diagnosis: null,
            carbohydrates_review_id: null,
            carbohydrates_review_diagnosis: null,
            protein_review_id: null,
            protein_review_diagnosis: null,
            fat_review_id: null,
            fat_review_diagnosis: null,
            fibre_review_id: null,
            fibre_review_diagnosis: null,
            iron_review_id: null,
            iron_review_diagnosis: null,
            calcium_review_id: null,
            calcium_review_diagnosis: null,
            micronutrients_review_id: null,
            micronutrients_review_diagnosis: null,
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

/**
 * Validate that review IDs exist and are active in nutrition_diagnosis_lookup
 * @param {Object} data - Fields to check
 * @returns {Promise<string[]>} List of validation error messages (empty if all valid)
 */
export async function validateReviewIds(data) {
    const reviewFields = [
        { field: 'carbohydrates_review_id', category: 'CARB' },
        { field: 'protein_review_id', category: 'PROTEIN' },
        { field: 'fat_review_id', category: 'FAT' },
        { field: 'fibre_review_id', category: 'FIBRE' },
        { field: 'iron_review_id', category: 'IRON' },
        { field: 'calcium_review_id', category: 'CALCIUM' },
        { field: 'micronutrients_review_id', category: 'MICRO' },
    ];

    const errors = [];

    for (const { field, category } of reviewFields) {
        if (data[field] !== undefined && data[field] !== null) {
            const result = await pool.query(
                'SELECT id FROM consultation.nutrition_diagnosis_lookup WHERE id = $1 AND is_active = true AND category = $2',
                [data[field], category]
            );
            if (result.rows.length === 0) {
                errors.push({ field, message: `Invalid or inactive ${category} nutrition diagnosis` });
            }
        }
    }

    return errors;
}
