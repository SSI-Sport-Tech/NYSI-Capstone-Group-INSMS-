import pool, { withUserContext } from "../../../config/db.js";

// ============================================================================
// NUTRITIONIST SCHEDULE SERVICES
// ============================================================================

// Overlap check function
async function checkScheduleOverlap(
    client,
    nutritionistId,
    scheduleDate,
    startTime,
    endTime,
    excludeScheduleId = null
) {
    const query = `
        SELECT EXISTS (
            SELECT 1
            FROM ams.nutritionist_schedule
            WHERE nutritionist_id = $1
              AND schedule_date = $2
              AND ($5::uuid IS NULL OR id <> $5)
              AND start_time < $4
              AND end_time > $3
        ) AS has_overlap
    `;

    const result = await client.query(query, [
        nutritionistId,
        scheduleDate,
        startTime,
        endTime,
        excludeScheduleId,
    ]);

    return result.rows[0].has_overlap;
}

/**
 * Get nutritionist schedule data
 * Returns schedule fields with nutritionist name and schedule type name
 * @param {string} scheduleId - UUID of schedule
 * @returns {Promise<Object|null>} Schedule data or null
 */
export async function getNutritionistSchedule(scheduleId) {
    const query = `
        SELECT
            ns.id,
            ns.nutritionist_id,
            n.name AS nutritionist_name,
            ns.schedule_type_id,
            st.schedule_type AS schedule_type,
            ns.schedule_date,
            ns.start_time,
            ns.end_time,
            ns.remarks
        FROM ams.nutritionist_schedule ns
        LEFT JOIN ams.nutritionist n ON ns.nutritionist_id = n.id
        LEFT JOIN ams.schedule_type_lookup st ON ns.schedule_type_id = st.id
        WHERE ns.id = $1
    `;

    const result = await pool.query(query, [scheduleId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Create a new schedule for a nutritionist
 * @param {Object} data - { nutritionist_id, schedule_type_id, schedule_date, start_time, end_time, remarks }
 * @returns {Promise<Object>} Created schedule row
 */
export async function createNutritionistSchedule(data, userId) {
    const scheduleId = await withUserContext(userId, async (client) => {
        // 1. Check for overlapping schedule
        const hasOverlap = await checkScheduleOverlap(
            client,
            data.nutritionist_id,
            data.schedule_date,
            data.start_time,
            data.end_time
        );

        if (hasOverlap) {
            // throw new Error(
            //     "Nutritionist already has a schedule during this time period"
            // );
            const err = new Error("Nutritionist already has a schedule during this time period");
            err.code = "SCHEDULE_CONFLICT";
            err.status = 409;
            throw err;
        }

        // 2. Insert schedule
        const scheduleResult = await client.query(`
            INSERT INTO ams.nutritionist_schedule (
                nutritionist_id, schedule_type_id, schedule_date, start_time, end_time, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [
            data.nutritionist_id,
            data.schedule_type_id,
            data.schedule_date,
            data.start_time,
            data.end_time,
            data.remarks || null
        ]);
        return scheduleResult.rows[0].id;
    });

    return getNutritionistSchedule(scheduleId);
}

/**
 * Update nutritionist schedule fields (dynamic SET)
 * @param {string} scheduleId - UUID of schedule
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated schedule or null
 */
export async function updateNutritionistSchedule(scheduleId, updateData, userId) {
    return withUserContext(userId, async (client) => {
        // 1. Check for overlapping schedule
        const existing = await getNutritionistSchedule(scheduleId);
        if (!existing) {
            return null;
        }
        const nutritionistId = updateData.nutritionist_id ?? existing.nutritionist_id;
        const scheduleDate = updateData.schedule_date ?? existing.schedule_date;
        const startTime = updateData.start_time ?? existing.start_time;
        const endTime = updateData.end_time ?? existing.end_time;
        const hasOverlap = await checkScheduleOverlap(
            client,
            nutritionistId,
            scheduleDate,
            startTime,
            endTime,
            scheduleId
        );

        if (hasOverlap) {
            // throw new Error(
            //     "Nutritionist already has a schedule during this time period"
            // );
            const err = new Error("Nutritionist already has a schedule during this time period");
            err.code = "SCHEDULE_CONFLICT";
            err.status = 409;
            throw err;
        }

        // 2. Update schedule fields (if any provided)
        const fields = [];
        const values = [];
        let paramCounter = 1;

        const fieldMapping = {
            // nutritionist_id: updateData.nutritionist_id,
            schedule_type_id: updateData.schedule_type_id,
            schedule_date: updateData.schedule_date,
            start_time: updateData.start_time,
            end_time: updateData.end_time,
            remarks: updateData.remarks,
        };

        for (const [field, value] of Object.entries(fieldMapping)) {
            if (value !== undefined) {
                fields.push(`${field} = $${paramCounter}`);
                values.push(value);
                paramCounter++;
            }
        }
        
        if (fields.length === 0) {
            return existing;
        }

        values.push(scheduleId);
        const scheduleResult = await client.query(`
            UPDATE ams.nutritionist_schedule
            SET ${fields.join(', ')}
            WHERE id = $${paramCounter}
            RETURNING id
        `, values);
        if (scheduleResult.rows.length === 0) {
            return null;
        }

        // return { schedule };
        return getNutritionistSchedule(scheduleId);
    });
}

/**
 * Get upcoming nutritionist schedule that have not started yet and are not finished/cancelled.
 * @param {number} limit - Max rows to return (default 20)
 * @returns {Promise<Array>}
 */
export async function getUpcomingNutritionistSchedules(limit = 20) {
    const query = `
        SELECT
            ns.id,
            ns.nutritionist_id,
            n.name AS nutritionist_name,
            ns.schedule_type_id,
            st.schedule_type AS schedule_type,
            ns.schedule_date,
            ns.start_time,
            ns.end_time,
            ns.remarks
        FROM ams.nutritionist_schedule ns
        LEFT JOIN ams.nutritionist n ON ns.nutritionist_id = n.id
        LEFT JOIN ams.schedule_type_lookup st ON ns.schedule_type_id = st.id
        WHERE ns.schedule_date > CURRENT_DATE
           OR (ns.schedule_date = CURRENT_DATE AND ns.start_time >= CURRENT_TIME)
        ORDER BY ns.schedule_date, ns.start_time ASC
        LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
}

/**
 * Get nutritionist ID by auth user ID
 * @param {string} userId - UUID from auth.users
 * @returns {Promise<string|null>} Nutritionist UUID or null
 */
export async function getNutritionistIdByUserId(userId) {
    const result = await pool.query(
        `SELECT id FROM ams.nutritionist WHERE user_id = $1`,
        [userId]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
}

/**
 * Get today's schedules for a specific nutritionist
 * @param {string} nutritionistId - Nutritionist UUID
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {Promise<Array>}
 */
export async function getTodaySchedulesForNutritionist(nutritionistId, date) {
    const query = `
        SELECT
            ns.id,
            ns.nutritionist_id,
            n.name AS nutritionist_name,
            ns.schedule_type_id,
            st.schedule_type AS schedule_type,
            ns.schedule_date,
            ns.start_time,
            ns.end_time,
            ns.remarks
        FROM ams.nutritionist_schedule ns
        LEFT JOIN ams.nutritionist n ON ns.nutritionist_id = n.id
        LEFT JOIN ams.schedule_type_lookup st ON ns.schedule_type_id = st.id
        WHERE ns.schedule_date = $1::date
        ORDER BY ns.start_time
    `;
    const result = await pool.query(query, [date]);
    return result.rows;
}

/**
 * Get nutritionist schedules within a date range
 * Optionally filter by a specific nutritionist
 * @param {string} from - Start date (YYYY-MM-DD)
 * @param {string} to - End date (YYYY-MM-DD)
 * @param {string|null} nutritionistId - Nutritionist UUID (optional)
 * @returns {Promise<Array>} List of nutritionist schedules
 */
export async function getNutritionistSchedulesByRange(from, to, nutritionistId = null) {
    let query = `
        SELECT
            ns.id,
            ns.nutritionist_id,
            n.name AS nutritionist_name,
            ns.schedule_type_id,
            st.schedule_type,
            ns.schedule_date,
            ns.start_time,
            ns.end_time,
            ns.remarks
        FROM ams.nutritionist_schedule ns
        LEFT JOIN ams.nutritionist n ON ns.nutritionist_id = n.id
        LEFT JOIN ams.schedule_type_lookup st ON ns.schedule_type_id = st.id
        WHERE ns.schedule_date BETWEEN $1 AND $2
    `;

    const params = [from, to];

    if (nutritionistId) {
        query += ` AND ns.nutritionist_id = $${params.length + 1}`;
        params.push(nutritionistId);
    }

    query += ` ORDER BY ns.schedule_date, ns.start_time`;

    const result = await pool.query(query, params);
    return result.rows;
}

/**
 * Delete a nutritionist schedule by ID
 */
export async function deleteNutritionistSchedule(scheduleId, userId) {
    return withUserContext(userId, async (client) => {
        const result = await client.query(`
            DELETE FROM ams.nutritionist_schedule
            WHERE id = $1
            RETURNING id
        `, [scheduleId]);

        return result.rows[0] || null;
    });
}