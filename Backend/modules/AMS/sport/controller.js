import * as services from './services.js';
import { createSportSchema, updateSportSchema, uuidParamSchema, bulkDeleteSchema } from './validation.js';

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
// UPDATE SPORT (toggle is_active)
// ============================================================================

export async function updateSport(req, res) {
    try {
        // Step 1: Validate ID
        const { id } = uuidParamSchema.parse(req.params);

        // Step 2: Check sport exists
        const existing = await services.getSportById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Sport not found' });
        }

        // Step 3: Validate body
        const validated = updateSportSchema.parse(req.body);

        // Step 4: Update
        const updated = await services.updateSportStatus(id, validated.is_active);

        res.json({
            message: 'Sport updated successfully',
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
        console.error('Error updating sport:', error);
        res.status(500).json({ error: 'Failed to update sport', message: error.message });
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
