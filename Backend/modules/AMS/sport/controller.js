import * as services from './services.js';
import { createSportSchema, bulkDeleteSchema } from './validation.js';

// ============================================================================
// LIST SPORTS
// ============================================================================

export async function listSports(req, res) {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const result = await services.getAllSports(!includeInactive);

        res.json({ data: result.rows });
    } catch (error) {
        console.error('Error listing sports:', error);
        res.status(500).json({ error: 'Failed to fetch sports', message: error.message });
    }
}

// ============================================================================
// CREATE SPORT
// ============================================================================

export async function createSport(req, res) {
    try {
        const validated = createSportSchema.parse(req.body);

        const isDuplicate = await services.checkDuplicateSport(validated.sport);
        if (isDuplicate) {
            return res.status(409).json({
                error: 'Duplicate sport',
                details: [{ field: 'sport', message: `Sport "${validated.sport}" already exists` }],
            });
        }

        const created = await services.createSport(validated.sport);

        res.status(201).json({
            message: 'Sport created successfully',
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
        console.error('Error creating sport:', error);
        res.status(500).json({ error: 'Failed to create sport', message: error.message });
    }
}

// ============================================================================
// DELETE SPORTS (BULK)
// ============================================================================

export async function deleteSports(req, res) {
    try {
        const { ids } = bulkDeleteSchema.parse(req.body);

        // Check if any are referenced by athletes or coaches
        const referencedIds = await services.getReferencedSportIds(ids);
        if (referencedIds.length > 0) {
            return res.status(409).json({
                error: 'Cannot delete referenced sports',
                details: [{
                    field: 'ids',
                    message: `The following sport IDs are referenced by athletes or coaches and cannot be deleted`,
                    referencedIds,
                }],
            });
        }

        const deleted = await services.deleteSports(ids);

        res.json({
            message: `Successfully deleted ${deleted.length} sport(s)`,
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
        console.error('Error deleting sports:', error);
        res.status(500).json({ error: 'Failed to delete sports', message: error.message });
    }
}
