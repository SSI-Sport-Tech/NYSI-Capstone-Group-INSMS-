import * as services from './services.js';
import {
    createNoteSchema,
    updateNoteSchema,
    paginationSchema,
    uuidParamSchema,
    bulkDeleteSchema,
} from './validation.js';
import pool from '../../../config/db.js';

// ============================================================================
// LIST NOTES
// ============================================================================

export async function listNotes(req, res) {
    try {
        const { page, search } = paginationSchema.parse(req.query);
        const pageSize = 10;

        let notes, totalCount;

        if (search) {
            [notes, totalCount] = await Promise.all([
                services.searchNotes(search, page, pageSize),
                services.getSearchNoteCount(search),
            ]);
        } else {
            [notes, totalCount] = await Promise.all([
                services.getNotesByPage(page, pageSize),
                services.getTotalNoteCount(),
            ]);
        }

        const totalPages = Math.ceil(totalCount / pageSize);

        res.json({
            data: notes.rows,
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
        console.error('Error listing notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes', message: error.message });
    }
}

// ============================================================================
// GET NOTE BY ID
// ============================================================================

export async function getNote(req, res) {
    try {
        const { id } = uuidParamSchema.parse(req.params);

        const note = await services.getNoteById(id);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        res.json(note);
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Invalid note ID format',
                details: error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        console.error('Error fetching note:', error);
        res.status(500).json({ error: 'Failed to fetch note', message: error.message });
    }
}

// ============================================================================
// CREATE NOTE
// ============================================================================

export async function createNote(req, res) {
    try {
        const validated = createNoteSchema.parse(req.body);

        // FK validation: sessions_id exists
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

        const created = await services.createNote(validated);

        res.status(201).json({
            message: 'Note created successfully',
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
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Failed to create note', message: error.message });
    }
}

// ============================================================================
// UPDATE NOTE
// ============================================================================

export async function updateNote(req, res) {
    try {
        const { id } = uuidParamSchema.parse(req.params);

        // Check note exists
        const existing = await services.getNoteById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const validated = updateNoteSchema.parse(req.body);

        if (Object.keys(validated).length === 0) {
            return res.status(400).json({
                error: 'No fields to update',
                details: [{ field: 'body', message: 'At least one field must be provided' }],
            });
        }

        const updated = await services.updateNote(id, validated);

        res.json({
            message: 'Note updated successfully',
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
        console.error('Error updating note:', error);
        res.status(500).json({ error: 'Failed to update note', message: error.message });
    }
}

// ============================================================================
// DELETE NOTES (BULK)
// ============================================================================

export async function deleteNotes(req, res) {
    try {
        const { ids } = bulkDeleteSchema.parse(req.body);

        const deleted = await services.deleteNotes(ids);

        res.json({
            message: `Successfully deleted ${deleted.length} note(s)`,
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
        console.error('Error deleting notes:', error);
        res.status(500).json({ error: 'Failed to delete notes', message: error.message });
    }
}
