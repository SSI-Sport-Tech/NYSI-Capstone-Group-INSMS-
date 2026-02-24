import * as services from './services.js';
import {
    createNutritionistSchema,
    bulkDeleteSchema,
    createMappingSchema,
    deleteMappingSchema,
    togglePinSchema,
    uuidParamSchema
} from './validation.js';

// ============================================================================
// NUTRITIONIST CRUD CONTROLLERS
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

        const created = await services.createNutritionist(validated.name, req.user?.userId);

        res.status(201).json({
            message: 'Nutritionist created successfully',
            data: created,
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
        console.error('Error creating nutritionist:', error);
        res.status(500).json({ error: 'Failed to create nutritionist', message: error.message });
    }
}

export async function deleteNutritionists(req, res) {
    try {
        const { ids } = bulkDeleteSchema.parse(req.body);

        const deleted = await services.deleteNutritionists(ids, req.user?.userId);

        res.json({
            message: `Successfully deleted ${deleted.length} nutritionist(s)`,
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
        console.error('Error deleting nutritionists:', error);
        res.status(500).json({ error: 'Failed to delete nutritionists', message: error.message });
    }
}

// ============================================================================
// NUTRITIONIST PERSONAL ROUTES (Pinning & My List)
// ============================================================================

export async function getMyAthletes(req, res) {
    try {
        // Allow override via query param for testing, otherwise look up from JWT
        let nutritionistId = req.query.nutritionist_id || null;

        if (!nutritionistId) {
            nutritionistId = await services.getNutritionistIdByUserId(req.user.userId);
            if (!nutritionistId) {
                return res.status(400).json({
                    error: 'Nutritionist not linked',
                    details: [{ field: 'user', message: 'Your account is not linked to a nutritionist profile' }],
                });
            }
        }

        const athletes = await services.getAssignedAthletes(nutritionistId);
        res.json({ data: athletes });
    } catch (error) {
        console.error("Error fetching my athletes:", error);
        res.status(500).json({ error: 'Failed to fetch assigned athletes' });
    }
}

export async function togglePin(req, res) {
    try {
        const { athlete_id, is_pinned } = togglePinSchema.parse(req.body);

        // Use the authenticated user's ID directly for pinning
        const userId = req.user.userId;

        const result = await services.toggleAthletePin(userId, athlete_id, is_pinned);
        
        res.json({ 
            message: is_pinned ? 'Athlete pinned' : 'Athlete unpinned', 
            data: { is_pinned } 
        });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: error.issues.map(e => ({ field: e.path.join('.'), message: e.message }))
            });
        }
        res.status(500).json({ error: 'Failed to toggle pin' });
    }
}

// ============================================================================
// NUTRITIONIST-ATHLETE MAPPING CONTROLLERS
// ============================================================================

export async function listMappings(req, res) {
    try {
        // Parse optional is_active query parameter
        let isActive = null;
        if (req.query.is_active !== undefined) {
            const value = req.query.is_active.toLowerCase();
            if (value === 'true') {
                isActive = true;
            } else if (value === 'false') {
                isActive = false;
            } else {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: [{ field: 'is_active', message: 'is_active must be true or false' }],
                });
            }
        }

        const result = await services.getAllMappings(isActive);
        res.json({ data: result.rows });
    } catch (error) {
        console.error('Error listing nutritionist-athlete mappings:', error);
        res.status(500).json({ error: 'Failed to fetch mappings', message: error.message });
    }
}

export async function listMappingsByAthlete(req, res) {
    try {
        const athleteId = req.params.athleteId;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(athleteId)) {
            return res.status(400).json({
                error: 'Validation failed',
                details: [{ field: 'athleteId', message: 'athleteId must be a valid UUID' }],
            });
        }

        // Parse optional is_active query parameter
        let isActive = null;
        if (req.query.is_active !== undefined) {
            const value = req.query.is_active.toLowerCase();
            if (value === 'true') {
                isActive = true;
            } else if (value === 'false') {
                isActive = false;
            } else {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: [{ field: 'is_active', message: 'is_active must be true or false' }],
                });
            }
        }

        const result = await services.getMappingsByAthleteId(athleteId, isActive);
        res.json({ data: result.rows });
    } catch (error) {
        console.error('Error listing mappings by athlete:', error);
        res.status(500).json({ error: 'Failed to fetch mappings', message: error.message });
    }
}

export async function createMapping(req, res) {
    try {
        const validated = createMappingSchema.parse(req.body);

        // Validate athlete exists
        const athleteExists = await services.checkAthleteExists(validated.athlete_id);
        if (!athleteExists) {
            return res.status(400).json({
                error: 'Validation failed',
                details: [{ field: 'athlete_id', message: 'Athlete not found' }],
            });
        }

        // Validate nutritionist exists
        const nutritionistExists = await services.getNutritionistById(validated.nutritionist_id);
        if (!nutritionistExists) {
            return res.status(400).json({
                error: 'Validation failed',
                details: [{ field: 'nutritionist_id', message: 'Nutritionist not found' }],
            });
        }

        // Check duplicate composite key
        const exists = await services.checkMappingExists(validated.athlete_id, validated.nutritionist_id);
        if (exists) {
            return res.status(409).json({
                error: 'Duplicate mapping',
                details: [{ message: 'This nutritionist-athlete mapping already exists' }],
            });
        }

        const created = await services.createMapping(validated.athlete_id, validated.nutritionist_id, validated.is_active, req.user?.userId);

        res.status(201).json({
            message: 'Nutritionist-athlete mapping created successfully',
            data: created,
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
        console.error('Error creating nutritionist-athlete mapping:', error);
        res.status(500).json({ error: 'Failed to create mapping', message: error.message });
    }
}

export async function deleteMappings(req, res) {
    try {
        const validated = deleteMappingSchema.parse(req.body);

        const deleted = await services.deleteMappings(validated, req.user?.userId);

        res.json({
            message: `Successfully deleted ${deleted.length} mapping(s)`,
            deletedCount: deleted.length,
            deleted,
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
        console.error('Error deleting nutritionist-athlete mappings:', error);
        res.status(500).json({ error: 'Failed to delete mappings', message: error.message });
    }
}