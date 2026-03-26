import pool, { withUserContext } from "../../../config/db.js";

// ============================================================================
// FIELD LISTS PER SECTION
// ============================================================================

const GENERAL_FIELDS = [
    'medical_condition',
    'food_allergy',
    'drug_allergy',
    'past_injury',
    'medical_remarks',
    'dietary_restriction',
];

const PUBERTY_FIELDS = [
    'period_of_growth_spurt',
    'other_remarks',
];

const BOWEL_FIELDS = [
    'regular_bowel_movement',
    'frequency_of_bowel_movement',
    'stool_visual',
    'other_remarks',
];

const HYDRATION_FIELDS = [
    'water_intake_per_day',
    'urine_colour',
    'hydration_status',
    'other_remarks',
];

const PERIOD_FIELDS = [
    'date_of_first_period',
    'age_of_menarchy',
    'regularity_of_period',
    'length_of_typical_menstrual_cycle',
    'length_of_period',
    'heaviness_of_menstrual_bleeding',
    'any_signs_and_symptoms',
    'other_remarks',
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get general medical data for an athlete from ams.athlete_medical
 * Returns null fields if no row exists yet for this athlete.
 * @param {string} athleteId - Athlete UUID
 * @returns {Promise<Object|null>} Medical data or null if athlete not found
 */
export async function getAthleteGeneralMedical(athleteId) {
    // Verify athlete exists
    const athleteCheck = await pool.query(
        'SELECT id FROM ams.athlete WHERE id = $1',
        [athleteId]
    );
    if (athleteCheck.rows.length === 0) return null;

    const result = await pool.query(
        `SELECT id, medical_condition, food_allergy, drug_allergy, past_injury, medical_remarks, dietary_restriction
         FROM ams.athlete_medical
         WHERE athlete_id = $1`,
        [athleteId]
    );

    if (result.rows.length === 0) {
        return {
            id: null,
            athlete_id: athleteId,
            medical_condition: null,
            food_allergy: null,
            drug_allergy: null,
            past_injury: null,
            medical_remarks: null,
            dietary_restriction: null,
        };
    }

    return { ...result.rows[0], athlete_id: athleteId };
}

/**
 * Get athlete_id from a session
 * @param {string} sessionId - UUID of session
 * @returns {Promise<string|null>} Athlete UUID or null if session not found
 */
export async function getAthleteIdFromSession(sessionId) {
    const result = await pool.query(
        'SELECT athlete_id FROM consultation.sessions WHERE id = $1',
        [sessionId]
    );
    return result.rows.length > 0 ? result.rows[0].athlete_id : null;
}

// ============================================================================
// GET MEDICAL HISTORY
// ============================================================================

/**
 * Get full medical history card for a session
 * @param {string} sessionId - UUID of session
 * @returns {Promise<Object|null>} Structured medical history or null if session not found
 */
export async function getMedicalHistory(sessionId) {
    const athleteId = await getAthleteIdFromSession(sessionId);
    if (!athleteId) return null;

    // Fetch general medical data from ams.athlete_medical
    const generalResult = await pool.query(
        `SELECT id, medical_condition, food_allergy, drug_allergy, past_injury, medical_remarks, dietary_restriction
         FROM ams.athlete_medical
         WHERE athlete_id = $1`,
        [athleteId]
    );
    const generalRow = generalResult.rows.length > 0 ? generalResult.rows[0] : null;

    // Fetch all session-specific sections in one query
    const sessionQuery = `
        SELECT
            p.id                            AS puberty_id,
            p.period_of_growth_spurt,
            p.other_remarks                 AS puberty_other_remarks,

            bm.id                           AS bowel_movement_id,
            bm.regular_bowel_movement,
            bm.frequency_of_bowel_movement,
            bm.stool_visual,
            bm.other_remarks                AS bowel_other_remarks,

            h.id                            AS hydration_id,
            h.water_intake_per_day,
            h.urine_colour,
            h.hydration_status,
            h.other_remarks                 AS hydration_other_remarks,

            per.id                          AS period_id,
            per.date_of_first_period,
            per.age_of_menarchy,
            per.regularity_of_period,
            per.length_of_typical_menstrual_cycle,
            per.length_of_period,
            per.heaviness_of_menstrual_bleeding,
            per.any_signs_and_symptoms,
            per.other_remarks               AS period_other_remarks

        FROM (SELECT $1::uuid AS sid) s
        LEFT JOIN consultation.session_puberty p         ON p.sessions_id  = s.sid
        LEFT JOIN consultation.session_bowel_movement bm ON bm.sessions_id = s.sid
        LEFT JOIN consultation.session_hydration h       ON h.sessions_id  = s.sid
        LEFT JOIN consultation.session_period per        ON per.sessions_id = s.sid
    `;

    const sessionResult = await pool.query(sessionQuery, [sessionId]);
    const row = sessionResult.rows[0] || {};

    return {
        session_id: sessionId,
        athlete_id: athleteId,
        general: {
            id: generalRow?.id ?? null,
            medical_condition: generalRow?.medical_condition ?? null,
            food_allergy: generalRow?.food_allergy ?? null,
            drug_allergy: generalRow?.drug_allergy ?? null,
            past_injury: generalRow?.past_injury ?? null,
            medical_remarks: generalRow?.medical_remarks ?? null,
            dietary_restriction: generalRow?.dietary_restriction ?? null,
        },
        puberty: {
            id: row.puberty_id ?? null,
            period_of_growth_spurt: row.period_of_growth_spurt ?? null,
            other_remarks: row.puberty_other_remarks ?? null,
        },
        bowel_movement: {
            id: row.bowel_movement_id ?? null,
            regular_bowel_movement: row.regular_bowel_movement ?? null,
            frequency_of_bowel_movement: row.frequency_of_bowel_movement ?? null,
            stool_visual: row.stool_visual ?? null,
            other_remarks: row.bowel_other_remarks ?? null,
        },
        hydration: {
            id: row.hydration_id ?? null,
            water_intake_per_day: row.water_intake_per_day ?? null,
            urine_colour: row.urine_colour ?? null,
            hydration_status: row.hydration_status ?? null,
            other_remarks: row.hydration_other_remarks ?? null,
            hydration_water_intake_for_target_weight: null,
            hydration_requirement_for_water_intake: null,
        },
        period: {
            id: row.period_id ?? null,
            date_of_first_period: row.date_of_first_period ?? null,
            age_of_menarchy: row.age_of_menarchy ?? null,
            regularity_of_period: row.regularity_of_period ?? null,
            length_of_typical_menstrual_cycle: row.length_of_typical_menstrual_cycle ?? null,
            length_of_period: row.length_of_period ?? null,
            heaviness_of_menstrual_bleeding: row.heaviness_of_menstrual_bleeding ?? null,
            any_signs_and_symptoms: row.any_signs_and_symptoms ?? null,
            other_remarks: row.period_other_remarks ?? null,
        },
    };
}

// ============================================================================
// UPSERT HELPERS
// ============================================================================

/**
 * Upsert general athlete medical data into ams.athlete_medical
 * Uses the provided transaction client for atomicity
 * @param {import('pg').PoolClient} client - Transaction client
 * @param {string} athleteId - Athlete UUID
 * @param {Object} data - Fields to upsert
 */
async function upsertAthleteGeneral(client, athleteId, data) {
    const fields = GENERAL_FIELDS.filter(f => data[f] !== undefined);
    if (fields.length === 0) return;

    const existCheck = await client.query(
        'SELECT id FROM ams.athlete_medical WHERE athlete_id = $1',
        [athleteId]
    );

    if (existCheck.rows.length > 0) {
        // Dynamic UPDATE
        const setClauses = [];
        const values = [];
        let i = 1;
        for (const field of fields) {
            setClauses.push(`${field} = $${i}`);
            values.push(data[field]);
            i++;
        }
        values.push(athleteId);
        await client.query(
            `UPDATE ams.athlete_medical SET ${setClauses.join(', ')} WHERE athlete_id = $${i}`,
            values
        );
    } else {
        // INSERT
        const columns = ['athlete_id', ...fields];
        const placeholders = ['$1', ...fields.map((_, idx) => `$${idx + 2}`)];
        const values = [athleteId, ...fields.map(f => data[f])];
        await client.query(
            `INSERT INTO ams.athlete_medical (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
            values
        );
    }
}

/**
 * Upsert a single session-scoped section into the given table
 * @param {import('pg').PoolClient} client - Transaction client
 * @param {string} tableName - Fully-qualified table name (e.g. 'consultation.session_puberty')
 * @param {string} sessionId - Session UUID
 * @param {string[]} fieldList - Allowed field names for this table
 * @param {Object} data - Section data object (may be undefined — caller handles the guard)
 */
async function upsertSessionSection(client, tableName, sessionId, fieldList, data) {
    if (!data) return;

    const fields = fieldList.filter(f => data[f] !== undefined);
    if (fields.length === 0) return;

    const existCheck = await client.query(
        `SELECT id FROM ${tableName} WHERE sessions_id = $1`,
        [sessionId]
    );

    if (existCheck.rows.length > 0) {
        // Dynamic UPDATE
        const setClauses = [];
        const values = [];
        let i = 1;
        for (const field of fields) {
            setClauses.push(`${field} = $${i}`);
            values.push(data[field]);
            i++;
        }
        values.push(sessionId);
        await client.query(
            `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE sessions_id = $${i}`,
            values
        );
    } else {
        // INSERT
        const columns = ['sessions_id', ...fields];
        const placeholders = ['$1', ...fields.map((_, idx) => `$${idx + 2}`)];
        const values = [sessionId, ...fields.map(f => data[f])];
        await client.query(
            `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
            values
        );
    }
}

// ============================================================================
// UPSERT MEDICAL HISTORY (orchestrator)
// ============================================================================

/**
 * Create or update the full medical history card for a session.
 * Runs all section upserts inside a single DB transaction.
 * @param {string} sessionId - Session UUID
 * @param {Object} data - Validated body (sessions_id already stripped by caller)
 * @returns {Promise<Object|null>} Full medical history after upsert
 */
export async function upsertMedicalHistory(sessionId, data, userId) {
    const athleteId = await getAthleteIdFromSession(sessionId);
    if (!athleteId) return null;

    await withUserContext(userId, async (client) => {
        // 1. General fields → ams.athlete_medical
        const generalData = {};
        for (const f of GENERAL_FIELDS) {
            if (data[f] !== undefined) generalData[f] = data[f];
        }
        if (Object.keys(generalData).length > 0) {
            await upsertAthleteGeneral(client, athleteId, generalData);
        }

        // 2. Puberty section
        if (data.puberty !== undefined) {
            await upsertSessionSection(
                client,
                'consultation.session_puberty',
                sessionId,
                PUBERTY_FIELDS,
                data.puberty
            );
        }

        // 3. Bowel movement section
        if (data.bowel_movement !== undefined) {
            await upsertSessionSection(
                client,
                'consultation.session_bowel_movement',
                sessionId,
                BOWEL_FIELDS,
                data.bowel_movement
            );
        }

        // 4. Hydration section
        if (data.hydration !== undefined) {
            await upsertSessionSection(
                client,
                'consultation.session_hydration',
                sessionId,
                HYDRATION_FIELDS,
                data.hydration
            );
        }

        // 5. Period section
        if (data.period !== undefined) {
            await upsertSessionSection(
                client,
                'consultation.session_period',
                sessionId,
                PERIOD_FIELDS,
                data.period
            );
        }
    });

    // Return the fresh full card
    return getMedicalHistory(sessionId);
}
