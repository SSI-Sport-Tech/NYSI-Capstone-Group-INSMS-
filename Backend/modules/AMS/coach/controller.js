import * as services from './services.js';
import { createCoachSchema, updateCoachSchema, uuidParamSchema, bulkDeleteSchema, createMappingSchema, deleteMappingSchema, updateMappingSchema } from './validation.js';

// ============================================================================
// LIST COACHES
// ============================================================================

export async function listCoaches(req, res) {
    try {
        const result = await services.getAllCoaches();
        res.json({ data: result.rows });
    } catch (error) {
        console.error('Error listing coaches:', error);
        res.status(500).json({ error: 'Failed to fetch coaches', message: error.message });
    }
}

// ============================================================================
// CREATE COACH
// ============================================================================

export async function createCoach(req, res) {
    try {
        const validated = createCoachSchema.parse(req.body);

        // Validate sport_id exists and is active
        const sportExists = await services.checkSportExists(validated.sport_id);
        if (!sportExists) {
            return res.status(400).json({
                error: 'Validation failed',
                details: [{ field: 'sport_id', message: 'Sport not found or inactive' }],
            });
        }

        // Check duplicate name + sport combo
        const isDuplicate = await services.checkDuplicateCoach(validated.name, validated.sport_id);
        if (isDuplicate) {
            return res.status(409).json({
                error: 'Duplicate coach',
                details: [{ field: 'name', message: `Coach "${validated.name}" already exists for this sport` }],
            });
        }

        const created = await services.createCoach(validated.name, validated.sport_id, req.user?.userId);

        res.status(201).json({
            message: 'Coach created successfully',
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
        console.error('Error creating coach:', error);
        res.status(500).json({ error: 'Failed to create coach', message: error.message });
    }
}

// ============================================================================
// DELETE COACHES (BULK)
// ============================================================================

export async function deleteCoaches(req, res) {
    try {
        const { ids } = bulkDeleteSchema.parse(req.body);

        // Check if any coaches are referenced by athlete mappings
        const referencedIds = await services.getReferencedCoachIds(ids);
        if (referencedIds.length > 0) {
            return res.status(409).json({
                error: 'Cannot delete referenced coaches',
                details: [{
                    field: 'ids',
                    message: 'The following coaches have athlete mappings and cannot be deleted',
                    referencedIds,
                }],
            });
        }

        const deleted = await services.deleteCoaches(ids, req.user?.userId);

        res.json({
            message: `Successfully deleted ${deleted.length} coach(es)`,
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
        console.error('Error deleting coaches:', error);
        res.status(500).json({ error: 'Failed to delete coaches', message: error.message });
    }
}

// ============================================================================
// LIST COACH-ATHLETE MAPPINGS
// ============================================================================

export async function listMappings(req, res) {
    try {
        const result = await services.getAllMappings();
        res.json({ data: result.rows });
    } catch (error) {
        console.error('Error listing coach-athlete mappings:', error);
        res.status(500).json({ error: 'Failed to fetch mappings', message: error.message });
    }
}

// ============================================================================
// LIST MAPPINGS BY ATHLETE
// ============================================================================

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

        const result = await services.getMappingsByAthleteId(athleteId);
        res.json({ data: result.rows });
    } catch (error) {
        console.error('Error listing mappings by athlete:', error);
        res.status(500).json({ error: 'Failed to fetch mappings', message: error.message });
    }
}

// ============================================================================
// CREATE COACH-ATHLETE MAPPING
// ============================================================================

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

        // Validate coach exists
        const coachExists = await services.getCoachById(validated.coach_id);
        if (!coachExists) {
            return res.status(400).json({
                error: 'Validation failed',
                details: [{ field: 'coach_id', message: 'Coach not found' }],
            });
        }

        // Check duplicate composite key
        const exists = await services.checkMappingExists(validated.athlete_id, validated.coach_id);
        if (exists) {
            return res.status(409).json({
                error: 'Duplicate mapping',
                details: [{ message: 'This coach-athlete mapping already exists' }],
            });
        }

        const created = await services.createMapping(validated.athlete_id, validated.coach_id, validated.is_active, req.user?.userId);

        res.status(201).json({
            message: 'Coach-athlete mapping created successfully',
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
        console.error('Error creating coach-athlete mapping:', error);
        res.status(500).json({ error: 'Failed to create mapping', message: error.message });
    }
}

// ============================================================================
// DELETE COACH-ATHLETE MAPPINGS (BULK)
// ============================================================================

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
                details: error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        console.error('Error deleting coach-athlete mappings:', error);
        res.status(500).json({ error: 'Failed to delete mappings', message: error.message });
    }
}

// ============================================================================
// UPDATE COACH-ATHLETE MAPPING
// ============================================================================

export async function updateMapping(req, res) {
    try {
        const { athleteId, coachId } = req.params;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(athleteId)) {
            return res.status(400).json({
                error: 'Validation failed',
                details: [{ field: 'athleteId', message: 'athleteId must be a valid UUID' }],
            });
        }

        if (!uuidRegex.test(coachId)) {
            return res.status(400).json({
                error: 'Validation failed',
                details: [{ field: 'coachId', message: 'coachId must be a valid UUID' }],
            });
        }

        const validated = updateMappingSchema.parse(req.body);

        // Check mapping exists
        const exists = await services.checkMappingExists(athleteId, coachId);
        if (!exists) {
            return res.status(404).json({ error: 'Mapping not found' });
        }

        const updated = await services.updateMapping(athleteId, coachId, validated.is_active, req.user?.userId);

        res.json({
            message: 'Mapping updated successfully',
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
        console.error('Error updating coach-athlete mapping:', error);
        res.status(500).json({ error: 'Failed to update mapping', message: error.message });
    }
}
// UPDATE COACH
export async function updateCoach(req, res) {
    try {
        const { id } = uuidParamSchema.parse(req.params);
        const validated = updateCoachSchema.parse(req.body);

        // Check coach exists
        const existing = await services.getCoachById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        // If sport_id is being changed, validate it exists and is active
        if (validated.sport_id) {
            const sportExists = await services.checkSportExists(validated.sport_id);
            if (!sportExists) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: [{ field: 'sport_id', message: 'Sport not found or inactive' }],
                });
            }
        }
        // Check duplicate name + sport combo (use new values or fall back to existing)
        const checkName = validated.name || existing.name;
        const checkSportId = validated.sport_id || existing.sport_id;
        const isDuplicate = await services.checkDuplicateCoach(checkName, checkSportId, id);
        if (isDuplicate) {
            return res.status(409).json({
                error: 'Duplicate coach',
                details: [{ field: 'name', message: `Coach "${checkName}" already exists for this sport` }],
            });
        }
        const updated = await services.updateCoach(id, validated, req.user?.userId);
        if (!updated) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        res.json({
            message: 'Coach updated successfully',
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
        console.error('Error updating coach:', error);
        res.status(500).json({ error: 'Failed to update coach', message: error.message });
    }
}