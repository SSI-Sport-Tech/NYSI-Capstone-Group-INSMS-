import * as services from './services.js';
import { createSessionSchema, updateSessionSchema, uuidParamSchema, athleteIdParamSchema } from './validation.js';
import pool from '../../../config/db.js';

// ============================================================================
// GET CONSULTATION UPDATE CARD
// ============================================================================

export async function getConsultationUpdate(req, res) {
    try {
        const { id } = uuidParamSchema.parse(req.params);

        const session = await services.getConsultationUpdate(id);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({ data: session });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Invalid session ID format',
                details: error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        console.error('Error fetching consultation update:', error);
        res.status(500).json({ error: 'Failed to fetch consultation update', message: error.message });
    }
}

// ============================================================================
// GET LATEST CONSULTATION SESSION FOR AN ATHLETE
// ============================================================================

export async function getLatestConsultationSession(req, res) {
    try {
        const { athleteId } = athleteIdParamSchema.parse(req.params);

        // Verify athlete exists
        const athleteCheck = await pool.query(
            'SELECT id FROM ams.athlete WHERE id = $1',
            [athleteId]
        );
        if (athleteCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Athlete not found' });
        }

        const session = await services.getLatestConsultationSession(athleteId);

        if (!session) {
            return res.status(404).json({ error: 'No consultation sessions found for this athlete' });
        }

        res.json({ data: session });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Invalid athlete ID format',
                details: error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        console.error('Error fetching latest consultation session:', error);
        res.status(500).json({ error: 'Failed to fetch latest consultation session', message: error.message });
    }
}

// ============================================================================
// CREATE CONSULTATION SESSION
// ============================================================================

export async function createConsultationSession(req, res) {
    try {
        const validated = createSessionSchema.parse(req.body);

        // Use provided nutritionist_id, or fall back to the logged-in user's nutritionist
        let nutritionistId = validated.nutritionist_id;
        if (!nutritionistId) {
            nutritionistId = await services.getNutritionistIdByUserId(req.user.userId);
            if (!nutritionistId) {
                return res.status(400).json({
                    error: 'Nutritionist not linked',
                    details: [{ field: 'user', message: 'Your account is not linked to a nutritionist profile' }],
                });
            }
        }

        // Validate provided nutritionist_id exists in ams.nutritionist
        if (validated.nutritionist_id) {
            const nutritionistCheck = await pool.query(
                'SELECT id FROM ams.nutritionist WHERE id = $1',
                [nutritionistId]
            );
            if (nutritionistCheck.rows.length === 0) {
                return res.status(400).json({
                    error: 'Invalid nutritionist_id',
                    details: [{ field: 'nutritionist_id', message: 'Nutritionist not found' }],
                });
            }
        }

        // Validate athlete_id exists
        const athleteCheck = await pool.query(
            'SELECT id FROM AMS.Athlete WHERE id = $1',
            [validated.athlete_id]
        );
        if (athleteCheck.rows.length === 0) {
            return res.status(400).json({
                error: 'Invalid athlete_id',
                details: [{ field: 'athlete_id', message: 'Athlete not found' }],
            });
        }

        // Validate type_of_consult_id exists and is active
        const consultTypeCheck = await pool.query(
            'SELECT id FROM consultation.type_of_consult_lookup WHERE id = $1 AND is_active = true',
            [validated.type_of_consult_id]
        );
        if (consultTypeCheck.rows.length === 0) {
            return res.status(400).json({
                error: 'Invalid type_of_consult_id',
                details: [{ field: 'type_of_consult_id', message: 'Consult type not found or inactive' }],
            });
        }

        const session = await services.createConsultationSession({
            nutritionist_id: nutritionistId,
            athlete_id: validated.athlete_id,
            type_of_consult_id: validated.type_of_consult_id,
            title_description: validated.title_description,
            venue: validated.venue,
            date_of_consult: validated.date_of_consult,
            time_of_consult: validated.time_of_consult,
            date_of_next_follow_up: validated.date_of_next_follow_up,
            time_of_next_follow_up: validated.time_of_next_follow_up,
            consultation_objective: validated.consultation_objective,
        });

        res.status(201).json({
            message: 'Consultation session created successfully',
            data: session,
        });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        console.error('Error creating consultation session:', error);
        res.status(500).json({ error: 'Failed to create consultation session', message: error.message });
    }
}

// ============================================================================
// UPDATE CONSULTATION SESSION
// ============================================================================

export async function updateConsultationSession(req, res) {
    try {
        const { id } = uuidParamSchema.parse(req.params);
        const validated = updateSessionSchema.parse(req.body);

        // Check session exists
        const exists = await pool.query('SELECT id FROM consultation.sessions WHERE id = $1', [id]);
        if (exists.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Validate type_of_consult_id if provided
        if (validated.type_of_consult_id) {
            const consultTypeCheck = await pool.query(
                'SELECT id FROM consultation.type_of_consult_lookup WHERE id = $1 AND is_active = true',
                [validated.type_of_consult_id]
            );
            if (consultTypeCheck.rows.length === 0) {
                return res.status(400).json({
                    error: 'Invalid type_of_consult_id',
                    details: [{ field: 'type_of_consult_id', message: 'Consult type not found or inactive' }],
                });
            }
        }

        const updated = await services.updateConsultationSession(id, validated);

        if (!updated) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        res.json({
            message: 'Consultation session updated successfully',
            data: updated,
        });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        console.error('Error updating consultation session:', error);
        res.status(500).json({ error: 'Failed to update consultation session', message: error.message });
    }
}
