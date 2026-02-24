import * as services from './services.js';
import {
    sessionIdParamSchema,
    athleteIdParamSchema,
    createMedicalHistorySchema,
    updateMedicalHistorySchema,
} from './validation.js';
import pool from '../../../config/db.js';

// ============================================================================
// GET MEDICAL HISTORY
// ============================================================================

export async function getMedicalHistory(req, res) {
    try {
        const { sessionId } = sessionIdParamSchema.parse(req.params);

        const data = await services.getMedicalHistory(sessionId);
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
        console.error('Error fetching medical history:', error);
        res.status(500).json({ error: 'Failed to fetch medical history', message: error.message });
    }
}

// ============================================================================
// CREATE MEDICAL HISTORY (POST — upsert)
// ============================================================================

export async function createMedicalHistory(req, res) {
    try {
        const validated = createMedicalHistorySchema.parse(req.body);

        // Verify session exists
        const sessionCheck = await pool.query(
            'SELECT id FROM consultation.sessions WHERE id = $1',
            [validated.sessions_id]
        );
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const { sessions_id, ...restData } = validated;
        const data = await services.upsertMedicalHistory(sessions_id, restData);

        res.status(201).json({
            message: 'Medical history saved successfully',
            data,
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
        console.error('Error creating medical history:', error);
        res.status(500).json({ error: 'Failed to save medical history', message: error.message });
    }
}

// ============================================================================
// UPDATE MEDICAL HISTORY (PATCH — upsert)
// ============================================================================

export async function updateMedicalHistory(req, res) {
    try {
        const { sessionId } = sessionIdParamSchema.parse(req.params);
        const validated = updateMedicalHistorySchema.parse(req.body);

        // Verify session exists
        const sessionCheck = await pool.query(
            'SELECT id FROM consultation.sessions WHERE id = $1',
            [sessionId]
        );
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (Object.keys(validated).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const data = await services.upsertMedicalHistory(sessionId, validated);

        res.json({
            message: 'Medical history updated successfully',
            data,
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
        console.error('Error updating medical history:', error);
        res.status(500).json({ error: 'Failed to update medical history', message: error.message });
    }
}

// ============================================================================
// GET ATHLETE GENERAL MEDICAL (ams.athlete_medical)
// ============================================================================

export async function getAthleteGeneralMedical(req, res) {
    try {
        const { athleteId } = athleteIdParamSchema.parse(req.params);

        const data = await services.getAthleteGeneralMedical(athleteId);

        if (!data) {
            return res.status(404).json({ error: 'Athlete not found' });
        }

        res.json({ data });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Invalid athlete ID format',
                details: error.issues.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        console.error('Error fetching athlete general medical:', error);
        res.status(500).json({ error: 'Failed to fetch athlete general medical', message: error.message });
    }
}

// ============================================================================
// GET ATHLETE ELIGIBILITY (DOB + gender)
// ============================================================================

export async function getAthleteEligibility(req, res) {
    try {
        const { athleteId } = athleteIdParamSchema.parse(req.params);

        const result = await pool.query(
            `SELECT date_of_birth, gender,
                    EXTRACT(YEAR FROM AGE(NOW(), date_of_birth))::INT AS age
             FROM ams.athlete WHERE id = $1`,
            [athleteId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Athlete not found' });
        }

        res.json({ data: result.rows[0] });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Invalid athlete ID format',
                details: error.issues.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        console.error('Error fetching athlete eligibility:', error);
        res.status(500).json({ error: 'Failed to fetch athlete eligibility', message: error.message });
    }
}
