import * as services from './services.js';
import {
    createSessionSchema,
    updateSessionSchema,
    paginationSchema,
    uuidParamSchema,
    bulkDeleteSchema,
} from './validation.js';
import pool from '../../../config/db.js';

// ============================================================================
// LIST SESSIONS
// ============================================================================

export async function listSessions(req, res) {
    try {
        const { page, search } = paginationSchema.parse(req.query);
        const pageSize = 10;

        let sessions, totalCount;

        if (search) {
            [sessions, totalCount] = await Promise.all([
                services.searchSessions(search, page, pageSize),
                services.getSearchSessionCount(search),
            ]);
        } else {
            [sessions, totalCount] = await Promise.all([
                services.getSessionsByPage(page, pageSize),
                services.getTotalSessionCount(),
            ]);
        }

        const totalPages = Math.ceil(totalCount / pageSize);

        res.json({
            data: sessions.rows,
            currentPage: page,
            totalPages,
            totalCount,
            searchQuery: search || null,
        });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Invalid query parameters',
                details: error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        console.error('Error listing sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions', message: error.message });
    }
}

// ============================================================================
// GET SESSION BY ID
// ============================================================================

export async function getSession(req, res) {
    try {
        const { id } = uuidParamSchema.parse(req.params);

        const session = await services.getSessionById(id);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json(session);
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
        console.error('Error fetching session:', error);
        res.status(500).json({ error: 'Failed to fetch session', message: error.message });
    }
}

// ============================================================================
// CREATE SESSION
// ============================================================================

export async function createSession(req, res) {
    try {
        const validated = createSessionSchema.parse(req.body);

        // FK validation: nutritionist exists
        const nutritionistCheck = await pool.query(
            'SELECT id FROM ams.nutritionist WHERE id = $1',
            [validated.nutritionist_id]
        );
        if (nutritionistCheck.rows.length === 0) {
            return res.status(400).json({
                error: 'Invalid nutritionist_id',
                details: [{ field: 'nutritionist_id', message: 'Nutritionist not found' }],
            });
        }

        // FK validation: athlete exists
        const athleteCheck = await pool.query(
            'SELECT id FROM ams.athlete WHERE id = $1',
            [validated.athlete_id]
        );
        if (athleteCheck.rows.length === 0) {
            return res.status(400).json({
                error: 'Invalid athlete_id',
                details: [{ field: 'athlete_id', message: 'Athlete not found' }],
            });
        }

        // FK validation: consult type exists and is active
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

        const created = await services.createSession(validated);

        res.status(201).json({
            message: 'Session created successfully',
            data: created,
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
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session', message: error.message });
    }
}

// ============================================================================
// UPDATE SESSION
// ============================================================================

export async function updateSession(req, res) {
    try {
        const { id } = uuidParamSchema.parse(req.params);

        // Check session exists
        const existing = await services.getSessionById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const validated = updateSessionSchema.parse(req.body);

        if (Object.keys(validated).length === 0) {
            return res.status(400).json({
                error: 'No fields to update',
                details: [{ field: 'body', message: 'At least one field must be provided' }],
            });
        }

        // FK validation: nutritionist exists (if changed)
        if (validated.nutritionist_id) {
            const nutritionistCheck = await pool.query(
                'SELECT id FROM ams.nutritionist WHERE id = $1',
                [validated.nutritionist_id]
            );
            if (nutritionistCheck.rows.length === 0) {
                return res.status(400).json({
                    error: 'Invalid nutritionist_id',
                    details: [{ field: 'nutritionist_id', message: 'Nutritionist not found' }],
                });
            }
        }

        // FK validation: athlete exists (if changed)
        if (validated.athlete_id) {
            const athleteCheck = await pool.query(
                'SELECT id FROM ams.athlete WHERE id = $1',
                [validated.athlete_id]
            );
            if (athleteCheck.rows.length === 0) {
                return res.status(400).json({
                    error: 'Invalid athlete_id',
                    details: [{ field: 'athlete_id', message: 'Athlete not found' }],
                });
            }
        }

        // FK validation: consult type exists and is active (if changed)
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

        const updated = await services.updateSession(id, validated);

        res.json({
            message: 'Session updated successfully',
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
        console.error('Error updating session:', error);
        res.status(500).json({ error: 'Failed to update session', message: error.message });
    }
}

// ============================================================================
// DELETE SESSIONS (BULK)
// ============================================================================

export async function deleteSessions(req, res) {
    try {
        const { ids } = bulkDeleteSchema.parse(req.body);

        const deleted = await services.deleteSessions(ids);

        res.json({
            message: `Successfully deleted ${deleted.length} session(s)`,
            deletedCount: deleted.length,
            deletedIds: deleted.map(r => r.id),
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
        console.error('Error deleting sessions:', error);
        res.status(500).json({ error: 'Failed to delete sessions', message: error.message });
    }
}
