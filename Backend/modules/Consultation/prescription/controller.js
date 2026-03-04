import * as services from './services.js';
import { InsufficientStockError } from './services.js';
import {
    createPrescriptionSchema,
    updatePrescriptionSchema,
    sessionIdParamSchema,
    uuidParamSchema,
} from './validation.js';
import pool from '../../../config/db.js';

// ============================================================================
// GET PRESCRIPTIONS FOR A SESSION
// ============================================================================

export async function getPrescriptions(req, res) {
    try {
        const { sessionId } = sessionIdParamSchema.parse(req.params);

        const sessionCheck = await pool.query(
            'SELECT id FROM consultation.sessions WHERE id = $1',
            [sessionId]
        );
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const data = await services.getPrescriptionsBySessionId(sessionId);
        res.json({ data });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Invalid session ID format',
                details: error.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
            });
        }
        console.error('Error fetching prescriptions:', error);
        res.status(500).json({ error: 'Failed to fetch prescriptions', message: error.message });
    }
}

// ============================================================================
// CREATE PRESCRIPTION
// ============================================================================

export async function createPrescription(req, res) {
    try {
        const validated = createPrescriptionSchema.parse(req.body);

        // Validate session exists
        const sessionCheck = await pool.query(
            'SELECT id FROM consultation.sessions WHERE id = $1',
            [validated.sessions_id]
        );
        if (sessionCheck.rows.length === 0) {
            return res.status(400).json({
                error: 'Invalid sessions_id',
                details: [{ field: 'sessions_id', message: 'Session not found' }],
            });
        }

        // Validate batch exists
        const batchCheck = await pool.query(
            'SELECT id FROM sss.inventory_batch WHERE id = $1',
            [validated.batch_id]
        );
        if (batchCheck.rows.length === 0) {
            return res.status(400).json({
                error: 'Invalid batch_id',
                details: [{ field: 'batch_id', message: 'Inventory batch not found' }],
            });
        }

        // Resolve prescriber name from JWT user
        const userRow = await pool.query(
            'SELECT first_name, last_name FROM auth.users WHERE id = $1',
            [req.user.userId]
        );
        if (userRow.rows.length > 0) {
            const { first_name, last_name } = userRow.rows[0];
            validated.prescriber = `${first_name} ${last_name}`.trim();
        }

        const prescription = await services.createPrescription(validated, req.user.userId);
        res.status(201).json({
            message: 'Prescription created successfully',
            data: prescription,
        });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
            });
        }
        if (error instanceof InsufficientStockError) {
            return res.status(409).json({
                error: 'Insufficient stock',
                available: error.available,
                message: `Only ${error.available} unit(s) available for this batch`,
            });
        }
        console.error('Error creating prescription:', error);
        res.status(500).json({ error: 'Failed to create prescription', message: error.message });
    }
}

// ============================================================================
// UPDATE PRESCRIPTION
// ============================================================================

export async function updatePrescription(req, res) {
    try {
        const { id } = uuidParamSchema.parse(req.params);
        const validated = updatePrescriptionSchema.parse(req.body);

        // Check prescription exists
        const exists = await pool.query(
            'SELECT id FROM consultation.session_prescription WHERE id = $1',
            [id]
        );
        if (exists.rows.length === 0) {
            return res.status(404).json({ error: 'Prescription not found' });
        }

        // Validate batch_id if provided
        if (validated.batch_id) {
            const batchCheck = await pool.query(
                'SELECT id FROM sss.inventory_batch WHERE id = $1',
                [validated.batch_id]
            );
            if (batchCheck.rows.length === 0) {
                return res.status(400).json({
                    error: 'Invalid batch_id',
                    details: [{ field: 'batch_id', message: 'Inventory batch not found' }],
                });
            }
        }

        const updated = await services.updatePrescription(id, validated, req.user.userId);
        if (!updated) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        res.json({
            message: 'Prescription updated successfully',
            data: updated,
        });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
            });
        }
        console.error('Error updating prescription:', error);
        res.status(500).json({ error: 'Failed to update prescription', message: error.message });
    }
}

// ============================================================================
// DELETE PRESCRIPTION
// ============================================================================

export async function deletePrescription(req, res) {
    try {
        const { id } = uuidParamSchema.parse(req.params);

        // Check prescription exists
        const exists = await pool.query(
            'SELECT id FROM consultation.session_prescription WHERE id = $1',
            [id]
        );
        if (exists.rows.length === 0) {
            return res.status(404).json({ error: 'Prescription not found' });
        }

        await services.deletePrescription(id, req.user.userId);
        res.json({ message: 'Prescription deleted successfully', id });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Invalid prescription ID format',
                details: error.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
            });
        }
        console.error('Error deleting prescription:', error);
        res.status(500).json({ error: 'Failed to delete prescription', message: error.message });
    }
}
