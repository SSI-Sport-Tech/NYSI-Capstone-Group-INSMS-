import pool, { withUserContext } from "../../../config/db.js";

// ============================================================================
// CUSTOM ERROR
// ============================================================================

export class InsufficientStockError extends Error {
    constructor(available) {
        super('Insufficient stock');
        this.name = 'InsufficientStockError';
        this.available = available;
    }
}

// ============================================================================
// SHARED SELECT
// ============================================================================

/**
 * Shared SELECT query for prescriptions with all joined fields.
 * prescribed_quantity is read from the linked inventory ticket.
 */
const PRESCRIPTION_SELECT = `
    SELECT
        sp.id,
        sp.sessions_id,
        sp.batch_id,
        ib.batch_number,
        ib.batch_price,
        ib.batch_expiration_date,
        s.id AS supplement_id,
        s.supplement_name,
        s.supplement_brand,
        s.batch_testing_org,
        it.quantity AS prescribed_quantity,
        sp.dosage,
        sp.dosage_unit,
        sp.dosage_frequency,
        sp.start_date,
        sp.projected_end_date,
        sp.follow_up_required,
        sp.other_remarks
    FROM consultation.session_prescription sp
    LEFT JOIN sss.inventory_batch ib ON sp.batch_id = ib.id
    LEFT JOIN sss.supplement s ON ib.supplement_id = s.id
    LEFT JOIN sss.inventory_ticket it ON it.prescription_id = sp.id
`;

// ============================================================================
// SHARED BATCH STATUS HELPER
// ============================================================================

/**
 * Recalculates and updates the stock status for a batch based on current ticket totals.
 * Rules:
 *   available = 0                     → OUT OF STOCK
 *   available / initial <= 0.2        → LOW STOCK
 *   else                              → AVAILABLE
 *
 * @param {import('pg').PoolClient} client - Transaction client
 * @param {string} batchId - UUID of the batch to update
 */
async function recalculateBatchStatus(client, batchId) {
    const batchResult = await client.query(`
        SELECT batch_initial_quantity FROM sss.inventory_batch WHERE id = $1
    `, [batchId]);

    const initial = batchResult.rows[0].batch_initial_quantity;

    const ticketSumResult = await client.query(`
        SELECT COALESCE(SUM(quantity), 0) AS booked
        FROM sss.inventory_ticket
        WHERE inventory_batch_id = $1
    `, [batchId]);

    const booked = parseInt(ticketSumResult.rows[0].booked);
    const available = initial - booked;

    let newStatusName;
    if (available === 0) {
        newStatusName = 'OUT OF STOCK';
    } else if (available / initial <= 0.2) {
        newStatusName = 'LOW STOCK';
    } else {
        newStatusName = 'AVAILABLE';
    }

    const statusResult = await client.query(`
        SELECT id FROM sss.batch_stock_status_lookup
        WHERE UPPER(batch_stock_status) = $1 AND is_active = true
        LIMIT 1
    `, [newStatusName]);

    if (statusResult.rows.length > 0) {
        await client.query(`
            UPDATE sss.inventory_batch SET batch_stock_status_id = $1 WHERE id = $2
        `, [statusResult.rows[0].id, batchId]);
    }
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get all prescriptions for a session
 * @param {string} sessionId - UUID of session
 * @returns {Promise<Array>} List of prescriptions with joined data
 */
export async function getPrescriptionsBySessionId(sessionId) {
    const result = await pool.query(
        `${PRESCRIPTION_SELECT} WHERE sp.sessions_id = $1 ORDER BY sp.id`,
        [sessionId]
    );
    return result.rows;
}

/**
 * Get a single prescription by ID
 * @param {string} id - UUID of prescription
 * @returns {Promise<Object|null>} Prescription with joined data or null
 */
export async function getPrescriptionById(id) {
    const result = await pool.query(
        `${PRESCRIPTION_SELECT} WHERE sp.id = $1`,
        [id]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
}

// ============================================================================
// CREATE PRESCRIPTION
// ============================================================================

/**
 * Create a prescription, then:
 *   1. Checks available stock — also corrects batch status if it is wrong
 *   2. Creates an inventory ticket (quantity = prescribed_quantity, status = BOOKED)
 *   3. Recalculates and updates the batch stock status
 *
 * All steps run in a single transaction with a row-level lock on the batch.
 *
 * @param {Object} data - Validated prescription fields
 * @returns {Promise<Object>} Created prescription with joined data
 * @throws {InsufficientStockError} If prescribed_quantity exceeds available stock
 */
export async function createPrescription(data, userId) {
    return withUserContext(userId, async (client) => {
        // 1. Lock the batch row and read initial quantity
        const batchResult = await client.query(`
            SELECT batch_initial_quantity
            FROM sss.inventory_batch
            WHERE id = $1
            FOR UPDATE
        `, [data.batch_id]);

        const initial = batchResult.rows[0].batch_initial_quantity;

        // 2. Sum existing tickets for this batch
        const ticketSumResult = await client.query(`
            SELECT COALESCE(SUM(quantity), 0) AS booked
            FROM sss.inventory_ticket
            WHERE inventory_batch_id = $1
        `, [data.batch_id]);

        const booked = parseInt(ticketSumResult.rows[0].booked);
        const available = initial - booked;

        // 3. Stock check
        if (data.prescribed_quantity > available) {
            throw new InsufficientStockError(available);
        }

        // 4. Create prescription row
        const prescriptionResult = await client.query(`
            INSERT INTO consultation.session_prescription (
                sessions_id, batch_id,
                dosage, dosage_unit, dosage_frequency,
                start_date, projected_end_date, follow_up_required, other_remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `, [
            data.sessions_id,
            data.batch_id,
            data.dosage ?? null,
            data.dosage_unit ?? null,
            data.dosage_frequency ?? null,
            data.start_date ?? null,
            data.projected_end_date ?? null,
            data.follow_up_required ?? false,
            data.other_remarks ?? null,
        ]);
        const prescriptionId = prescriptionResult.rows[0].id;

        // 5. Get athlete_id from the session
        const sessionResult = await client.query(`
            SELECT athlete_id FROM consultation.sessions WHERE id = $1
        `, [data.sessions_id]);
        const athleteId = sessionResult.rows[0].athlete_id;

        // 6. Get BOOKED ticket status UUID
        const ticketStatusResult = await client.query(`
            SELECT id FROM sss.ticket_status_lookup
            WHERE UPPER(ticket_status) = 'BOOKED' AND is_active = true
            LIMIT 1
        `);
        if (ticketStatusResult.rows.length === 0) {
            throw new Error('BOOKED ticket status not found in lookup table');
        }
        const ticketStatusId = ticketStatusResult.rows[0].id;

        // 7. Create inventory ticket
        await client.query(`
            INSERT INTO sss.inventory_ticket (
                inventory_batch_id, athlete_id, ticket_status_id, prescription_id, quantity
            ) VALUES ($1, $2, $3, $4, $5)
        `, [data.batch_id, athleteId, ticketStatusId, prescriptionId, data.prescribed_quantity]);

        // 8. Recalculate and correct batch stock status
        await recalculateBatchStatus(client, data.batch_id);

        return getPrescriptionById(prescriptionId);
    });
}

// ============================================================================
// UPDATE PRESCRIPTION
// ============================================================================

/**
 * Update prescription fields and optionally the prescribed quantity.
 * If prescribed_quantity is provided:
 *   - Performs a stock check (excluding the current ticket)
 *   - Updates sss.inventory_ticket.quantity
 *   - Recalculates batch stock status
 *
 * @param {string} id - UUID of prescription
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated prescription or null if no fields given
 * @throws {InsufficientStockError} If new prescribed_quantity exceeds available stock
 */
export async function updatePrescription(id, updateData, userId) {
    return withUserContext(userId, async (client) => {
        let didUpdate = false;

        // 1. Update prescription table fields (if any)
        const fieldMapping = {
            batch_id: updateData.batch_id,
            dosage: updateData.dosage,
            dosage_unit: updateData.dosage_unit,
            dosage_frequency: updateData.dosage_frequency,
            start_date: updateData.start_date,
            projected_end_date: updateData.projected_end_date,
            follow_up_required: updateData.follow_up_required,
            other_remarks: updateData.other_remarks,
        };

        const fields = [];
        const values = [];
        let paramCounter = 1;

        for (const [field, value] of Object.entries(fieldMapping)) {
            if (value !== undefined) {
                fields.push(`${field} = $${paramCounter}`);
                values.push(value);
                paramCounter++;
            }
        }

        if (fields.length > 0) {
            values.push(id);
            await client.query(`
                UPDATE consultation.session_prescription
                SET ${fields.join(', ')}
                WHERE id = $${paramCounter}
            `, values);
            didUpdate = true;
        }

        // 2. Handle prescribed_quantity (ticket update + batch status)
        if (updateData.prescribed_quantity !== undefined) {
            const ticketResult = await client.query(`
                SELECT it.id AS ticket_id, it.inventory_batch_id
                FROM sss.inventory_ticket it
                WHERE it.prescription_id = $1
                FOR UPDATE
            `, [id]);

            if (ticketResult.rows.length > 0) {
                const { ticket_id, inventory_batch_id: batchId } = ticketResult.rows[0];

                const batchResult = await client.query(`
                    SELECT batch_initial_quantity FROM sss.inventory_batch WHERE id = $1 FOR UPDATE
                `, [batchId]);
                const initial = batchResult.rows[0].batch_initial_quantity;

                const otherBookedResult = await client.query(`
                    SELECT COALESCE(SUM(quantity), 0) AS other_booked
                    FROM sss.inventory_ticket
                    WHERE inventory_batch_id = $1 AND prescription_id != $2
                `, [batchId, id]);
                const otherBooked = parseInt(otherBookedResult.rows[0].other_booked);
                const availableForThis = initial - otherBooked;

                if (updateData.prescribed_quantity > availableForThis) {
                    throw new InsufficientStockError(availableForThis);
                }

                await client.query(`
                    UPDATE sss.inventory_ticket SET quantity = $1 WHERE id = $2
                `, [updateData.prescribed_quantity, ticket_id]);

                await recalculateBatchStatus(client, batchId);

                didUpdate = true;
            }
        }

        if (!didUpdate) return null;
        return getPrescriptionById(id);
    });
}

// ============================================================================
// DELETE PRESCRIPTION
// ============================================================================

/**
 * Delete a prescription and its associated inventory ticket,
 * then recalculates the batch stock status.
 * Ticket is deleted first to satisfy the FK constraint.
 *
 * @param {string} id - UUID of prescription
 * @returns {Promise<string|null>} Deleted prescription ID or null
 */
export async function deletePrescription(id, userId) {
    return withUserContext(userId, async (client) => {
        // Get the batch_id from the linked ticket before deleting
        const ticketResult = await client.query(`
            SELECT inventory_batch_id FROM sss.inventory_ticket WHERE prescription_id = $1
        `, [id]);
        const batchId = ticketResult.rows.length > 0 ? ticketResult.rows[0].inventory_batch_id : null;

        // Delete the linked inventory ticket first (FK: ticket.prescription_id → prescription.id)
        await client.query(`
            DELETE FROM sss.inventory_ticket WHERE prescription_id = $1
        `, [id]);

        // Delete the prescription
        const result = await client.query(`
            DELETE FROM consultation.session_prescription WHERE id = $1 RETURNING id
        `, [id]);

        // Recalculate batch status now that the ticket quantity is freed
        if (batchId) {
            await recalculateBatchStatus(client, batchId);
        }

        return result.rows.length > 0 ? result.rows[0].id : null;
    });
}
