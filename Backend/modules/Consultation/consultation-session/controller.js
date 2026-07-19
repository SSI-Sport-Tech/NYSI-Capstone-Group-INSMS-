import * as services from './services.js';
import { createSessionSchema, updateSessionSchema, updateStatusSchema, uuidParamSchema, athleteIdParamSchema } from './validation.js';
import pool from '../../../config/db.js';
import { createNOMSMondayItem, buildNOMSMondayColumnValues, updateMondayItem, MONDAY_COLUMNS } from "../../../utils/monday.js";

// ============================================================================
// GET CONSULTATION SESSION
// ============================================================================

export async function getConsultationSession(req, res) {
    try {
        const { id } = uuidParamSchema.parse(req.params);
        await services.expireOverdueScheduledSessions();

        const session = await services.getConsultationSession(id);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({ data: session });

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
        console.error('Error fetching consultation session:', error);
        res.status(500).json({ error: 'Failed to fetch consultation session', message: error.message });
    }
}

// ============================================================================
// GET LATEST CONSULTATION SESSION FOR AN ATHLETE
// ============================================================================

export async function getLatestConsultationSession(req, res) {
    try {
        const { athleteId } = athleteIdParamSchema.parse(req.params);
        await services.expireOverdueScheduledSessions();

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
                details: error.issues.map(e => ({
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
// GET ALL CONSULTATION SESSIONS
// ============================================================================

export async function getAllConsultationSessions(req, res) {
    try {
        const { athleteId } = athleteIdParamSchema.parse(req.params);
        await services.expireOverdueScheduledSessions();

        // Verify athlete exists
        const athleteCheck = await pool.query(
            'SELECT id FROM ams.athlete WHERE id = $1',
            [athleteId]
        );
        if (athleteCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Athlete not found' });
        }

        const sessions = await services.getAllConsultationSessions(athleteId);

        res.json({ data: sessions });

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
        console.error('Error fetching all consultation sessions:', error);
        res.status(500).json({ error: 'Failed to fetch consultation sessions', message: error.message });
    }
}

// ============================================================================
// GET PREVIOUS CONSULTATION SESSION
// ============================================================================

export async function getPreviousConsultationSession(req, res) {
    try {
        const { id } = req.params;
        await services.expireOverdueScheduledSessions();
        const data = await services.getPreviousConsultationSession(id);
        if (!data) {
            return res.status(404).json({ error: 'No previous session found' });
        }
        res.json({ data });
    } catch (error) {
        console.error('Error fetching previous consultation session:', error);
        res.status(500).json({ error: 'Failed to fetch previous session', message: error.message });
    }
}

// ============================================================================
// GET UPCOMING CONSULTATION SESSIONS
// ============================================================================

export async function getUpcomingConsultationSessions(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 20;
        await services.expireOverdueScheduledSessions();
        const sessions = await services.getUpcomingConsultationSessions(limit);
        res.json({ data: sessions });
    } catch (error) {
        console.error('Error fetching upcoming consultation sessions:', error);
        res.status(500).json({ error: 'Failed to fetch upcoming sessions', message: error.message });
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
                // Auto-create nutritionist profile for NUTRITIONIST/ADMIN users whose
                // profile was not created during registration (e.g. legacy accounts)
                if (req.user.role === 'NUTRITIONIST' || req.user.role === 'ADMIN' || req.user.role === 'IT_ADMIN') {
                    const userRow = await pool.query(
                        'SELECT first_name, last_name FROM auth.users WHERE id = $1',
                        [req.user.userId]
                    );
                    if (userRow.rows.length > 0) {
                        const { first_name, last_name } = userRow.rows[0];
                        const profile = await pool.query(
                            'INSERT INTO ams.nutritionist (name, user_id) VALUES ($1, $2) RETURNING id',
                            [`${first_name} ${last_name}`, req.user.userId]
                        );
                        nutritionistId = profile.rows[0].id;
                        console.log(`Auto-created nutritionist profile ${nutritionistId} for user ${req.user.userId}`);
                    }
                }
                if (!nutritionistId) {
                    return res.status(400).json({
                        error: 'Nutritionist not linked',
                        details: [{ field: 'user', message: 'Your account is not linked to a nutritionist profile' }],
                    });
                }
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
            end_time_of_consult: validated.end_time_of_consult,
            date_of_next_follow_up: validated.date_of_next_follow_up,
            time_of_next_follow_up: validated.time_of_next_follow_up,
            consultation_objective_id: validated.consultation_objective_id,
            is_scheduled_booking: validated.is_scheduled_booking ?? false,
            ssp: validated.ssp ?? false,
        }, req.user.userId);

        try {
            // await createNOMSMondayItem(session);
            const sessionRow = await pool.query(`
                SELECT * FROM consultation.v_session
                WHERE id = $1
                `, [session.id]);

            const fullSession = sessionRow.rows[0];

            const mondayResult = await createNOMSMondayItem(fullSession);
            console.log("Saved monday_item_id:", mondayResult?.monday_item_id);

            if (mondayResult?.monday_item_id) {
                await pool.query(
                    `UPDATE consultation.sessions
                    SET monday_item_id = $1
                    WHERE id = $2`,
                    [mondayResult.monday_item_id, session.id]
                );
            }
        } catch (err) {
            console.error("Monday sync failed:", err);
        }

        res.status(201).json({
            message: 'Consultation session created successfully',
            data: session,
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
        console.log("VALIDATED UPDATE BODY:", validated);

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

        const updated = await services.updateConsultationSession(id, validated, req.user.userId);

        if (!updated) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        try {
            const sessionRow = await pool.query(
                // `SELECT * FROM consultation.sessions WHERE id = $1`,
                `SELECT * FROM consultation.v_session WHERE id = $1`,
                [id]
            );

            const session = sessionRow.rows[0];

            if (session?.monday_item_id) {
                const mondayPayload = buildNOMSMondayColumnValues(session);

                console.log("FULL Monday sync payload:", mondayPayload);

                await updateMondayItem(session.monday_item_id, mondayPayload);
            }
        } catch (err) {
            console.error("Monday update failed:", err);
        }

        res.json({
            message: 'Consultation session updated successfully',
            data: updated,
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
        console.error('Error updating consultation session:', error);
        res.status(500).json({ error: 'Failed to update consultation session', message: error.message });
    }
}

// ============================================================================
// GET SESSIONS BY DATE RANGE (calendar view)
// ============================================================================

export async function getSessionsByDateRange(req, res) {
    try {
        const { from, to } = req.query;
        if (!from || !to) {
            return res.status(400).json({ error: 'Query params "from" and "to" (YYYY-MM-DD) are required' });
        }
        await services.expireOverdueScheduledSessions();
        const sessions = await services.getSessionsByDateRange(from, to);
        res.json({ data: sessions });
    } catch (error) {
        console.error('Error fetching sessions by date range:', error);
        res.status(500).json({ error: 'Failed to fetch sessions', message: error.message });
    }
}

// ============================================================================
// GET TODAY'S SESSIONS FOR LOGGED-IN NUTRITIONIST
// ============================================================================

export async function getTodaySessionsForNutritionist(req, res) {
    try {
        await services.expireOverdueScheduledSessions();
        const nutritionistId = await services.getNutritionistIdByUserId(req.user.userId);
        if (!nutritionistId) {
            return res.json({ data: [] });
        }
        // Accept optional ?date=YYYY-MM-DD; default to today (server local date)
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const date = req.query.date || todayStr;
        const sessions = await services.getTodaySessionsForNutritionist(nutritionistId, date);
        res.json({ data: sessions });
    } catch (error) {
        console.error('Error fetching today sessions:', error);
        res.status(500).json({ error: 'Failed to fetch today sessions', message: error.message });
    }
}

// ============================================================================
// UPDATE SESSION STATUS (PATCH /:id/status)
// ============================================================================

export async function updateSessionStatus(req, res) {
    try {
        const { id } = uuidParamSchema.parse(req.params);
        const { status } = updateStatusSchema.parse(req.body);
        await services.expireOverdueScheduledSessions();

        const exists = await pool.query('SELECT id FROM consultation.sessions WHERE id = $1', [id]);
        if (exists.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const updated = await services.updateSessionStatus(id, status, req.user.userId);
        res.json({ message: 'Session status updated', data: updated });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
            });
        }
        console.error('Error updating session status:', error);
        res.status(500).json({ error: 'Failed to update session status', message: error.message });
    }
}

// ============================================================================
// CANCEL CONSULTATION SESSION (sets status = 'cancelled')
// ============================================================================

export async function cancelConsultationSession(req, res) {
    try {
        const { id } = uuidParamSchema.parse(req.params);

        const exists = await pool.query('SELECT id FROM consultation.sessions WHERE id = $1', [id]);
        if (exists.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const updated = await services.updateSessionStatus(id, 'cancelled', req.user.userId);
        res.json({ message: 'Session cancelled', data: updated });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: 'Invalid session ID', message: error.message });
        }
        console.error('Error cancelling session:', error);
        res.status(500).json({ error: 'Failed to cancel session', message: error.message });
    }
}
