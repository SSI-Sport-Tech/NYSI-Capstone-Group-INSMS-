import pool from "../../../config/db.js";

// ============================================================================
// OPEN ITEMS CARD SERVICES
// ============================================================================

/**
 * Get all active open item statuses from lookup table
 * @returns {Promise<Array>} Array of { id, open_item_status }
 */
export async function getOpenItemStatuses() {
    const query = `
        SELECT id, open_item_status
        FROM consultation.open_item_status_lookup
        WHERE is_active = true
        ORDER BY open_item_status ASC
    `;

    const result = await pool.query(query);
    return result.rows;
}

/**
 * Get all open items for a session with joined status name
 * @param {string} sessionId - UUID of session
 * @returns {Promise<Array>} Array of open item rows
 */
export async function getOpenItemsBySessionId(sessionId) {
    const query = `
        SELECT
            oi.id,
            oi.sessions_id,
            oi.open_item_status_id,
            osl.open_item_status,
            oi.description,
            oi.open_item,
            oi.owner,
            oi.due_date,
            oi.other_remarks
        FROM consultation.session_open_item oi
        LEFT JOIN consultation.open_item_status_lookup osl ON oi.open_item_status_id = osl.id
        WHERE oi.sessions_id = $1
        ORDER BY oi.due_date ASC NULLS LAST
    `;

    const result = await pool.query(query, [sessionId]);
    return result.rows;
}

/**
 * Create a new open item
 * @param {Object} data - Open item fields
 * @returns {Promise<Object>} Created open item row
 */
export async function createOpenItem(data) {
    const query = `
        INSERT INTO consultation.session_open_item (
            sessions_id, open_item_status_id, description,
            open_item, owner, due_date, other_remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `;

    const result = await pool.query(query, [
        data.sessions_id,
        data.open_item_status_id,
        data.description || null,
        data.open_item || null,
        data.owner || null,
        data.due_date || null,
        data.other_remarks || null,
    ]);
    return result.rows[0];
}

/**
 * Update open item fields (dynamic SET)
 * @param {string} openItemId - UUID of open item
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated open item or null
 */
export async function updateOpenItem(openItemId, updateData) {
    const fields = [];
    const values = [];
    let paramCounter = 1;

    const fieldMapping = {
        open_item_status_id: updateData.open_item_status_id,
        description: updateData.description,
        open_item: updateData.open_item,
        owner: updateData.owner,
        due_date: updateData.due_date,
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

    values.push(openItemId);

    const query = `
        UPDATE consultation.session_open_item
        SET ${fields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Delete multiple open items by ID
 * @param {Array<string>} ids - Array of UUIDs
 * @returns {Promise<Array>} Array of deleted rows
 */
export async function deleteOpenItems(ids) {
    const query = `
        DELETE FROM consultation.session_open_item
        WHERE id = ANY($1::uuid[])
        RETURNING id
    `;

    const result = await pool.query(query, [ids]);
    return result.rows;
}
