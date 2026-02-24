import * as services from './services.js';
import {
    createOpenItemSchema,
    updateOpenItemSchema,
    sessionIdParamSchema,
    uuidParamSchema,
    bulkDeleteSchema,
} from './validation.js';
import pool from '../../../config/db.js';

// ============================================================================
// GET OPEN ITEM STATUSES (LOOKUP)
// ============================================================================

export async function getOpenItemStatuses(req, res) {
    try {
        const statuses = await services.getOpenItemStatuses();
        res.json({ data: statuses });
    } catch (error) {
        console.error('Error fetching open item statuses:', error);
        res.status(500).json({ error: 'Failed to fetch open item statuses', message: error.message });
    }
}

// ============================================================================
// GET OPEN ITEMS BY SESSION
// ============================================================================

export async function getOpenItems(req, res) {
    try {
        const { sessionId } = sessionIdParamSchema.parse(req.params);

        // Check session exists
        const sessionCheck = await pool.query(
            'SELECT id FROM consultation.sessions WHERE id = $1',
            [sessionId]
        );
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const items = await services.getOpenItemsBySessionId(sessionId);

        res.json({ data: items });

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
        console.error('Error fetching open items:', error);
        res.status(500).json({ error: 'Failed to fetch open items', message: error.message });
    }
}

// ============================================================================
// CREATE OPEN ITEM
// ============================================================================

export async function createOpenItem(req, res) {
    try {
        const validated = createOpenItemSchema.parse(req.body);

        // Validate session exists
        const sessionCheck = await pool.query(
            'SELECT id FROM consultation.sessions WHERE id = $1',
            [validated.sessions_id]
        );
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Validate open_item_status_id exists and is active
        const statusCheck = await pool.query(
            'SELECT id FROM consultation.open_item_status_lookup WHERE id = $1 AND is_active = true',
            [validated.open_item_status_id]
        );
        if (statusCheck.rows.length === 0) {
            return res.status(400).json({
                error: 'Invalid open_item_status_id',
                details: [{ field: 'open_item_status_id', message: 'Status not found or inactive' }],
            });
        }

        // Resolve nutritionist name to auto-assign as owner
        let owner = null;
        if (validated.nutritionist_id) {
            // Explicit nutritionist_id provided (for testing)
            const nutritionistResult = await pool.query(
                'SELECT name FROM ams.nutritionist WHERE id = $1',
                [validated.nutritionist_id]
            );
            if (nutritionistResult.rows.length === 0) {
                return res.status(400).json({
                    error: 'Invalid nutritionist_id',
                    details: [{ field: 'nutritionist_id', message: 'Nutritionist not found' }],
                });
            }
            owner = nutritionistResult.rows[0].name;
        } else {
            // Fall back to the logged-in user's nutritionist profile
            const nutritionistResult = await pool.query(
                'SELECT name FROM ams.nutritionist WHERE user_id = $1',
                [req.user.userId]
            );
            if (nutritionistResult.rows.length === 0) {
                return res.status(400).json({
                    error: 'Nutritionist not linked',
                    details: [{ field: 'user', message: 'Your account is not linked to a nutritionist profile' }],
                });
            }
            owner = nutritionistResult.rows[0].name;
        }

        const item = await services.createOpenItem({ ...validated, owner });

        res.status(201).json({
            message: 'Open item created successfully',
            data: item,
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
        console.error('Error creating open item:', error);
        res.status(500).json({ error: 'Failed to create open item', message: error.message });
    }
}

// ============================================================================
// UPDATE OPEN ITEM (e.g. mark as completed)
// ============================================================================

export async function updateOpenItem(req, res) {
    try {
        const { id } = uuidParamSchema.parse(req.params);
        const validated = updateOpenItemSchema.parse(req.body);

        // Check open item exists
        const exists = await pool.query(
            'SELECT id FROM consultation.session_open_item WHERE id = $1',
            [id]
        );
        if (exists.rows.length === 0) {
            return res.status(404).json({ error: 'Open item not found' });
        }

        // Validate open_item_status_id if provided
        if (validated.open_item_status_id) {
            const statusCheck = await pool.query(
                'SELECT id FROM consultation.open_item_status_lookup WHERE id = $1 AND is_active = true',
                [validated.open_item_status_id]
            );
            if (statusCheck.rows.length === 0) {
                return res.status(400).json({
                    error: 'Invalid open_item_status_id',
                    details: [{ field: 'open_item_status_id', message: 'Status not found or inactive' }],
                });
            }
        }

        const updated = await services.updateOpenItem(id, validated);

        if (!updated) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        res.json({
            message: 'Open item updated successfully',
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
        console.error('Error updating open item:', error);
        res.status(500).json({ error: 'Failed to update open item', message: error.message });
    }
}

// ============================================================================
// DELETE OPEN ITEMS (BULK)
// ============================================================================

export async function deleteOpenItems(req, res) {
    try {
        const { ids } = bulkDeleteSchema.parse(req.body);

        const deleted = await services.deleteOpenItems(ids);

        res.json({
            message: `Successfully deleted ${deleted.length} open item(s)`,
            deletedCount: deleted.length,
            deletedIds: deleted.map(r => r.id),
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
        console.error('Error deleting open items:', error);
        res.status(500).json({ error: 'Failed to delete open items', message: error.message });
    }
}
