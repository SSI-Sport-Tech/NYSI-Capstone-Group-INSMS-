import * as services from './services.js';
import { createNutritionistSchema, bulkDeleteSchema } from './validation.js';

// ============================================================================
// LIST NUTRITIONISTS
// ============================================================================

export async function listNutritionists(req, res) {
    try {
        const result = await services.getAllNutritionists();
        res.json({ data: result.rows });
    } catch (error) {
        console.error('Error listing nutritionists:', error);
        res.status(500).json({ error: 'Failed to fetch nutritionists', message: error.message });
    }
}

// ============================================================================
// CREATE NUTRITIONIST
// ============================================================================

export async function createNutritionist(req, res) {
    try {
        const validated = createNutritionistSchema.parse(req.body);

        // Check duplicate name
        const isDuplicate = await services.checkDuplicateNutritionist(validated.name);
        if (isDuplicate) {
            return res.status(409).json({
                error: 'Duplicate nutritionist',
                details: [{ field: 'name', message: `Nutritionist "${validated.name}" already exists` }],
            });
        }

        const created = await services.createNutritionist(validated.name);

        res.status(201).json({
            message: 'Nutritionist created successfully',
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
        console.error('Error creating nutritionist:', error);
        res.status(500).json({ error: 'Failed to create nutritionist', message: error.message });
    }
}

// ============================================================================
// DELETE NUTRITIONISTS (BULK)
// ============================================================================

export async function deleteNutritionists(req, res) {
    try {
        const { ids } = bulkDeleteSchema.parse(req.body);

        const deleted = await services.deleteNutritionists(ids);

        res.json({
            message: `Successfully deleted ${deleted.length} nutritionist(s)`,
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
        console.error('Error deleting nutritionists:', error);
        res.status(500).json({ error: 'Failed to delete nutritionists', message: error.message });
    }
}
