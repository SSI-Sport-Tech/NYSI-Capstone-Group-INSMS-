import * as services from './services.js';
import { createConsultTypeSchema, updateConsultTypeSchema, uuidParamSchema, bulkDeleteSchema } from './validation.js';

// ============================================================================
// LIST CONSULT TYPES
// ============================================================================

export async function listConsultTypes(req, res) {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const result = await services.getAllConsultTypes(!includeInactive);

        res.json({ data: result.rows });
    } catch (error) {
        console.error('Error listing consult types:', error);
        res.status(500).json({ error: 'Failed to fetch consult types', message: error.message });
    }
}

// ============================================================================
// CREATE CONSULT TYPE
// ============================================================================

export async function createConsultType(req, res) {
    try {
        const validated = createConsultTypeSchema.parse(req.body);

        const isDuplicate = await services.checkDuplicateConsultType(validated.type_of_consult);
        if (isDuplicate) {
            return res.status(409).json({
                error: 'Duplicate consult type',
                details: [{ field: 'type_of_consult', message: `Consult type "${validated.type_of_consult}" already exists` }],
            });
        }

        const created = await services.createConsultType(validated.type_of_consult);

        res.status(201).json({
            message: 'Consult type created successfully',
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
        console.error('Error creating consult type:', error);
        res.status(500).json({ error: 'Failed to create consult type', message: error.message });
    }
}

// ============================================================================
// UPDATE CONSULT TYPE (toggle is_active)
// ============================================================================

export async function updateConsultType(req, res) {
    try {
        const { id } = uuidParamSchema.parse(req.params);

        const existing = await services.getConsultTypeById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Consult type not found' });
        }

        const validated = updateConsultTypeSchema.parse(req.body);

        const updated = await services.updateConsultType(id, validated.is_active);

        res.json({
            message: 'Consult type updated successfully',
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
        console.error('Error updating consult type:', error);
        res.status(500).json({ error: 'Failed to update consult type', message: error.message });
    }
}

// ============================================================================
// DELETE CONSULT TYPES (BULK)
// ============================================================================

export async function deleteConsultTypes(req, res) {
    try {
        const { ids } = bulkDeleteSchema.parse(req.body);

        const referencedIds = await services.getReferencedConsultTypeIds(ids);
        if (referencedIds.length > 0) {
            return res.status(409).json({
                error: 'Cannot delete referenced consult types',
                details: [{
                    field: 'ids',
                    message: 'The following consult type IDs are referenced by sessions and cannot be deleted',
                    referencedIds,
                }],
            });
        }

        const deleted = await services.deleteConsultTypes(ids);

        res.json({
            message: `Successfully deleted ${deleted.length} consult type(s)`,
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
        console.error('Error deleting consult types:', error);
        res.status(500).json({ error: 'Failed to delete consult types', message: error.message });
    }
}
