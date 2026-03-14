import * as services from './services.js';
import { createDetailsSchema, updateDetailsSchema, sessionIdParamSchema } from './validation.js';
import pool from '../../../config/db.js';


// ============================================================================
// GET CONSULTATION DETAILS
// ============================================================================

export async function getConsultationDetails(req, res) {
    try {
        const { sessionId } = sessionIdParamSchema.parse(req.params);

        const data = await services.getConsultationDetails(sessionId);

        if (!data) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({ data });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Invalid session ID format',
                details: error.issues.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        console.error('Error fetching consultation details:', error);
        res.status(500).json({ error: 'Failed to fetch consultation details', message: error.message });
    }
}

// ============================================================================
// CREATE CONSULTATION DETAILS (POST - upsert)
// ============================================================================

export async function createConsultationDetails(req, res) {
    try {
        const validated = createDetailsSchema.parse(req.body);

        // Verify session exists
        const sessionCheck = await pool.query(
            'SELECT id FROM consultation.sessions WHERE id = $1',
            [validated.sessions_id]
        );
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const { sessions_id, ...detailFields } = validated;
        const result = await services.upsertConsultationDetails(sessions_id, detailFields, req.user.userId);

        res.status(201).json({
            message: 'Consultation details saved successfully',
            data: result,
        });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        console.error('Error creating consultation details:', error);
        res.status(500).json({ error: 'Failed to save consultation details', message: error.message });
    }
}

// ============================================================================
// PATCH CONSULTATION DETAILS (upsert)
// ============================================================================

export async function updateConsultationDetails(req, res) {
    try {
        const { sessionId } = sessionIdParamSchema.parse(req.params);
        const validated = updateDetailsSchema.parse(req.body);

        // Verify session exists
        const sessionCheck = await pool.query(
            'SELECT id FROM consultation.sessions WHERE id = $1',
            [sessionId]
        );
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const result = await services.upsertConsultationDetails(sessionId, validated, req.user.userId);

        if (!result) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        res.json({
            message: 'Consultation details updated successfully',
            data: result,
        });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        console.error('Error updating consultation details:', error);
        res.status(500).json({ error: 'Failed to update consultation details', message: error.message });
    }
}
