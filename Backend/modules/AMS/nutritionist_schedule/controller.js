import * as services from './services.js';
import { createNutritionistScheduleSchema, updateNutritionistScheduleSchema, getNutritionistScheduleRangeSchema, uuidParamSchema } from './validation.js';
import pool from '../../../config/db.js';

// ============================================================================
// GET NUTRITIONIST SCHEDULE
// ============================================================================

export async function getNutritionistSchedule(req, res) {
    try {
        const { id } = uuidParamSchema.parse(req.params);
        await services.expireOverdueScheduledSessions();

        const schedule = await services.getNutritionistSchedule(id);

        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        res.json({ data: schedule });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Invalid schedule ID format',
                details: error.issues.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        console.error('Error fetching nutritionist schedule:', error);
        res.status(500).json({ error: 'Failed to fetch nutritionist schedule', message: error.message });
    }
}

// ============================================================================
// GET UPCOMING NUTRITIONIST SCHEDULES
// ============================================================================

export async function getUpcomingNutritionistSchedules(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const schedules = await services.getUpcomingNutritionistSchedules(limit);
        res.json({ data: schedules });
    } catch (error) {
        console.error('Error fetching upcoming nutritionist schedules:', error);
        res.status(500).json({ error: 'Failed to fetch upcoming schedules', message: error.message });
    }
}

// ============================================================================
// CREATE NUTRITIONIST SCHEDULE
// ============================================================================

export async function createNutritionistSchedule(req, res) {
    try {
        const validated = createNutritionistScheduleSchema.parse(req.body);

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

        // Validate schedule_type_id exists
        const scheduleTypeCheck = await pool.query(
            'SELECT id FROM ams.schedule_type_lookup WHERE id = $1',
            [validated.schedule_type_id]
        );
        if (scheduleTypeCheck.rows.length === 0) {
            return res.status(400).json({
                error: 'Invalid schedule_type_id',
                details: [{ field: 'schedule_type_id', message: 'Schedule type not found' }],
            });
        }

        const schedule = await services.createNutritionistSchedule({
            nutritionist_id: nutritionistId,
            schedule_type_id: validated.schedule_type_id,
            schedule_date: validated.schedule_date,
            start_time: validated.start_time,
            end_time: validated.end_time,
            remarks: validated.remarks,
        }, req.user.userId);

        res.status(201).json({
            message: 'Nutritionist schedule created successfully',
            data: schedule,
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
        console.error('Error creating nutritionist schedule:', error);
        res.status(500).json({ error: 'Failed to create nutritionist schedule', message: error.message });
    }
}

// ============================================================================
// UPDATE NUTRITIONIST SCHEDULE
// ============================================================================

export async function updateNutritionistSchedule(req, res) {
    try {
        const { id } = uuidParamSchema.parse(req.params);
        const validated = updateNutritionistScheduleSchema.parse(req.body);
        console.log("VALIDATED UPDATE BODY:", validated);

        // Check schedule exists
        const exists = await pool.query('SELECT id FROM ams.nutritionist_schedule WHERE id = $1', [id]);
        if (exists.rows.length === 0) {
            return res.status(404).json({ error: 'Nutritionist schedule not found' });
        }

        // Validate schedule_type_id if provided
        if (validated.schedule_type_id) {
            const scheduleTypeCheck = await pool.query(
                'SELECT id FROM ams.schedule_type_lookup WHERE id = $1',
                [validated.schedule_type_id]
            );
            if (scheduleTypeCheck.rows.length === 0) {
                return res.status(400).json({
                    error: 'Invalid schedule_type_id',
                    details: [{ field: 'schedule_type_id', message: 'Schedule type not found' }],
                });
            }
        }

        const updated = await services.updateNutritionistSchedule(id, validated, req.user.userId);

        if (!updated) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        res.json({
            message: 'Nutritionist schedule updated successfully',
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
        console.error('Error updating nutritionist schedule:', error);
        res.status(500).json({ error: 'Failed to update nutritionist schedule', message: error.message });
    }
}

// ============================================================================
// GET TODAY'S SESSIONS FOR LOGGED-IN NUTRITIONIST
// ============================================================================

export async function getTodaySchedulesForNutritionist(req, res) {
    try {
        const nutritionistId = await services.getNutritionistIdByUserId(req.user.userId);
        if (!nutritionistId) {
            return res.json({ data: [] });
        }
        // Accept optional ?date=YYYY-MM-DD; default to today (server local date)
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const date = req.query.date || todayStr;
        const schedules = await services.getTodaySchedulesForNutritionist(nutritionistId, date);
        res.json({ data: schedules });
    } catch (error) {
        console.error('Error fetching today schedules:', error);
        res.status(500).json({ error: 'Failed to fetch today schedules', message: error.message });
    }
}

// ============================================================================
// GET NUTRITIONIST SCHEDULES BY RANGE
// ============================================================================

export async function getNutritionistSchedulesByRange(req, res) {
    try {
        const { from, to, nutritionist_id } =
            getNutritionistScheduleRangeSchema.parse(req.query);

        if (new Date(from) > new Date(to)) {
            return res.status(400).json({
                error: '"from" date must be before or equal to "to" date',
            });
        }

        const schedules = await services.getNutritionistSchedulesByRange(
            from,
            to,
            nutritionist_id || null
        );

        res.json({ data: schedules });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Invalid date range parameters',
                details: error.issues.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }

        console.error('Error fetching schedules by range:', error);
        res.status(500).json({
            error: 'Failed to fetch schedules by range',
            message: error.message
        });
    }
}

// ============================================================================
// DELETE NUTRITIONIST SCHEDULE
// ============================================================================

export async function deleteNutritionistSchedule(req, res) {
    try {
        const { id } = uuidParamSchema.parse(req.params);

        const deleted = await services.deleteNutritionistSchedule(
            id,
            req.user.userId
        );

        if (!deleted) {
            return res.status(404).json({error: 'Nutritionist schedule not found'}); 
        }

        res.json({
            message: 'Nutritionist schedule deleted successfully',
            data: deleted,
        });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Invalid schedule ID format',
                details: error.issues.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }

        console.error('Error deleting nutritionist schedule:', error);
        res.status(500).json({
            error: 'Failed to delete nutritionist schedule',
            message: error.message
        });
    }
}