import * as services from './services.js';
import {
    createBasicAthleteSchema,
    createCompleteAthleteSchema,
    updateAthleteSchema,
    updateRegistrySchema,
    updateMedicalSchema,
    paginationSchema,
    uuidParamSchema,
    bulkDeleteSchema,
} from './validation.js';
import pool from '../../../config/db.js';

// ============================================================================
// LIST ATHLETES
// ============================================================================

export async function listAthletes(req, res) {
    try {
        // Step 1: Parse query params
        const { page, search } = paginationSchema.parse(req.query);
        const pageSize = 10;

        let athletes, totalCount;

        if (search) {
            // Step 2a: Search athletes
            console.log(`Step 2: Searching athletes with query: "${search}"`);
            [athletes, totalCount] = await Promise.all([
                services.searchAthletes(search, page, pageSize),
                services.getSearchAthleteCount(search),
            ]);
        } else {
            // Step 2b: Get all athletes paginated
            console.log(`Step 2: Fetching athletes page ${page}`);
            [athletes, totalCount] = await Promise.all([
                services.getAthletesByPage(page, pageSize),
                services.getTotalAthleteCount(),
            ]);
        }

        const totalPages = Math.ceil(totalCount / pageSize);

        // Add target_event: null to each row
        const data = athletes.rows.map(row => ({
            ...row,
            target_event: null,
        }));

        res.json({
            data,
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
        console.error('Error listing athletes:', error);
        res.status(500).json({ error: 'Failed to fetch athletes', message: error.message });
    }
}

// ============================================================================
// GET ATHLETE DETAILS
// ============================================================================

export async function getAthleteDetails(req, res) {
    try {
        // Step 1: Validate ID
        const { id } = uuidParamSchema.parse(req.params);

        // Step 2: Fetch athlete and registry in parallel
        console.log(`Step 2: Fetching athlete details for ${id}`);
        const [athlete, registry] = await Promise.all([
            services.getAthleteById(id),
            services.getRegistryByAthleteId(id),
        ]);

        // Step 3: Check if athlete exists
        if (!athlete) {
            return res.status(404).json({ error: 'Athlete not found' });
        }

        // Step 4: Return composite response
        res.json({
            athlete: {
                ...athlete,
                target_event: null,
            },
            registry: registry || null,
        });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Invalid athlete ID format',
                details: error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        console.error('Error fetching athlete details:', error);
        res.status(500).json({ error: 'Failed to fetch athlete details', message: error.message });
    }
}

// ============================================================================
// CREATE BASIC ATHLETE (athlete record only)
// ============================================================================

export async function createBasicAthlete(req, res) {
    try {
        // Step 1: Validate request body
        console.log('Step 1: Validating request body');
        const validated = createBasicAthleteSchema.parse(req.body);

        // Step 2: Validate sport_id exists in Sport_Lookup
        console.log('Step 2: Validating sport_id');
        const sportCheck = await pool.query(
            'SELECT id FROM AMS.Sport_Lookup WHERE id = $1 AND is_active = true',
            [validated.sport_id]
        );
        if (sportCheck.rows.length === 0) {
            return res.status(400).json({
                error: 'Invalid sport_id',
                details: [{ field: 'sport_id', message: 'Sport not found or inactive' }],
            });
        }

        // Step 3: Check for duplicate sportsync_id
        console.log('Step 3: Checking for duplicate sportsync_id');
        const isDuplicate = await services.checkDuplicateAthlete(validated.sportsync_id);
        if (isDuplicate) {
            return res.status(409).json({
                error: 'Duplicate athlete',
                details: [{ field: 'sportsync_id', message: `Athlete with sportsync_id "${validated.sportsync_id}" already exists` }],
            });
        }

        // Step 4: Create athlete
        console.log('Step 4: Creating basic athlete');
        const athlete = await services.createBasicAthlete(validated);

        console.log(`Step 5: Athlete ${athlete.id} created successfully`);

        res.status(201).json({
            message: 'Athlete created successfully',
            data: athlete,
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
        console.error('Error creating athlete:', error);
        res.status(500).json({ error: 'Failed to create athlete', message: error.message });
    }
}

// ============================================================================
// CREATE COMPLETE ATHLETE (athlete + registry + medical + assignments)
// ============================================================================

export async function createCompleteAthlete(req, res) {
    try {
        // Step 1: Validate request body
        console.log('Step 1: Validating request body');
        const validated = createCompleteAthleteSchema.parse(req.body);

        // Step 2: Validate sport_id exists in Sport_Lookup
        console.log('Step 2: Validating sport_id');
        const sportCheck = await pool.query(
            'SELECT id FROM AMS.Sport_Lookup WHERE id = $1 AND is_active = true',
            [validated.sport_id]
        );
        if (sportCheck.rows.length === 0) {
            return res.status(400).json({
                error: 'Invalid sport_id',
                details: [{ field: 'sport_id', message: 'Sport not found or inactive' }],
            });
        }

        // Step 3: Check for duplicate sportsync_id
        console.log('Step 3: Checking for duplicate sportsync_id');
        const isDuplicate = await services.checkDuplicateAthlete(validated.sportsync_id);
        if (isDuplicate) {
            return res.status(409).json({
                error: 'Duplicate athlete',
                details: [{ field: 'sportsync_id', message: `Athlete with sportsync_id "${validated.sportsync_id}" already exists` }],
            });
        }

        // Step 4: Validate coach IDs exist
        if (validated.coach_ids.length > 0) {
            console.log('Step 4a: Validating coach IDs');
            const coachCheck = await pool.query(
                'SELECT id FROM AMS.Coach WHERE id = ANY($1::uuid[])',
                [validated.coach_ids]
            );
            if (coachCheck.rows.length !== validated.coach_ids.length) {
                const foundIds = coachCheck.rows.map(r => r.id);
                const invalidIds = validated.coach_ids.filter(id => !foundIds.includes(id));
                return res.status(400).json({
                    error: 'Invalid coach_ids',
                    details: [{ field: 'coach_ids', message: `Coach(es) not found: ${invalidIds.join(', ')}` }],
                });
            }
        }

        // Step 5: Validate nutritionist IDs exist
        if (validated.nutritionist_ids.length > 0) {
            console.log('Step 4b: Validating nutritionist IDs');
            const nutritionistCheck = await pool.query(
                'SELECT id FROM AMS.Nutritionist WHERE id = ANY($1::uuid[])',
                [validated.nutritionist_ids]
            );
            if (nutritionistCheck.rows.length !== validated.nutritionist_ids.length) {
                const foundIds = nutritionistCheck.rows.map(r => r.id);
                const invalidIds = validated.nutritionist_ids.filter(id => !foundIds.includes(id));
                return res.status(400).json({
                    error: 'Invalid nutritionist_ids',
                    details: [{ field: 'nutritionist_ids', message: `Nutritionist(s) not found: ${invalidIds.join(', ')}` }],
                });
            }
        }

        // Step 6: Separate data
        console.log('Step 5: Creating complete athlete with relations');
        const athleteData = {
            sport_id: validated.sport_id,
            sportsync_id: validated.sportsync_id,
            athlete_name_abbr: validated.athlete_name_abbr,
            gender: validated.gender,
            date_of_birth: validated.date_of_birth,
        };

        const registryData = {
            carding_status: validated.carding_status,
            athlete_notified_on: validated.athlete_notified_on,
            carding_start_date: validated.carding_start_date,
            carding_end_date: validated.carding_end_date,
            medical_clearance: validated.medical_clearance,
            approved_start_date: validated.approved_start_date,
            approved_end_date: validated.approved_end_date,
        };

        const medicalData = {
            medical_condition: validated.medical_condition,
            food_allergy: validated.food_allergy,
            drug_allergy: validated.drug_allergy,
            past_injury: validated.past_injury,
        };

        // Step 7: Create in transaction
        const result = await services.createCompleteAthlete(
            athleteData, registryData, medicalData,
            validated.coach_ids, validated.nutritionist_ids
        );

        console.log(`Step 6: Athlete ${result.athlete.id} created successfully with all relations`);

        res.status(201).json({
            message: 'Athlete created successfully with all relations',
            data: result,
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
        console.error('Error creating complete athlete:', error);
        res.status(500).json({ error: 'Failed to create athlete', message: error.message });
    }
}

// ============================================================================
// UPDATE ATHLETE
// ============================================================================

export async function updateAthlete(req, res) {
    try {
        // Step 1: Validate ID
        const { id } = uuidParamSchema.parse(req.params);

        // Step 2: Check athlete exists
        console.log(`Step 2: Checking athlete ${id} exists`);
        const existing = await services.getAthleteById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Athlete not found' });
        }

        // Step 3: Validate update data
        console.log('Step 3: Validating update data');
        const validated = updateAthleteSchema.parse(req.body);

        if (Object.keys(validated).length === 0) {
            return res.status(400).json({
                error: 'No fields to update',
                details: [{ field: 'body', message: 'At least one field must be provided' }],
            });
        }

        // Step 4: If sport_id changed, validate FK
        if (validated.sport_id) {
            console.log('Step 4: Validating new sport_id');
            const sportCheck = await pool.query(
                'SELECT id FROM AMS.Sport_Lookup WHERE id = $1 AND is_active = true',
                [validated.sport_id]
            );
            if (sportCheck.rows.length === 0) {
                return res.status(400).json({
                    error: 'Invalid sport_id',
                    details: [{ field: 'sport_id', message: 'Sport not found or inactive' }],
                });
            }
        }

        // Step 5: If sportsync_id changed, check for duplicate
        if (validated.sportsync_id) {
            console.log('Step 5: Checking for duplicate sportsync_id');
            const isDuplicate = await services.checkDuplicateAthlete(validated.sportsync_id, id);
            if (isDuplicate) {
                return res.status(409).json({
                    error: 'Duplicate sportsync_id',
                    details: [{ field: 'sportsync_id', message: `Another athlete with sportsync_id "${validated.sportsync_id}" already exists` }],
                });
            }
        }

        // Step 6: Update
        console.log('Step 6: Updating athlete');
        const updated = await services.updateAthlete(id, validated);

        res.json({
            message: 'Athlete updated successfully',
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
        console.error('Error updating athlete:', error);
        res.status(500).json({ error: 'Failed to update athlete', message: error.message });
    }
}

// ============================================================================
// DELETE ATHLETES
// ============================================================================

export async function deleteAthletes(req, res) {
    try {
        // Step 1: Validate IDs
        const { ids } = bulkDeleteSchema.parse(req.body);

        // Step 2: Delete (CASCADE handles registry/medical)
        console.log(`Step 2: Deleting ${ids.length} athlete(s)`);
        const deleted = await services.deleteAthletes(ids);

        res.json({
            message: `Successfully deleted ${deleted.length} athlete(s)`,
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
        console.error('Error deleting athletes:', error);
        res.status(500).json({ error: 'Failed to delete athletes', message: error.message });
    }
}

// ============================================================================
// UPDATE REGISTRY
// ============================================================================

export async function updateRegistryController(req, res) {
    try {
        // Step 1: Validate athlete ID
        const { id } = uuidParamSchema.parse(req.params);

        // Step 2: Check athlete exists
        console.log(`Step 2: Checking athlete ${id} exists`);
        const athlete = await services.getAthleteById(id);
        if (!athlete) {
            return res.status(404).json({ error: 'Athlete not found' });
        }

        // Step 3: Check registry exists
        console.log('Step 3: Checking registry exists');
        const existingRegistry = await services.getRegistryByAthleteId(id);
        if (!existingRegistry) {
            return res.status(404).json({ error: 'Registry not found for this athlete' });
        }

        // Step 4: Validate update data
        console.log('Step 4: Validating registry update data');
        const validated = updateRegistrySchema.parse(req.body);

        if (Object.keys(validated).length === 0) {
            return res.status(400).json({
                error: 'No fields to update',
                details: [{ field: 'body', message: 'At least one field must be provided' }],
            });
        }

        // Step 5: Update
        console.log('Step 5: Updating registry');
        const updated = await services.updateRegistry(id, validated);

        res.json({
            message: 'Registry updated successfully',
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
        console.error('Error updating registry:', error);
        res.status(500).json({ error: 'Failed to update registry', message: error.message });
    }
}

// ============================================================================
// UPDATE MEDICAL
// ============================================================================

export async function updateMedicalController(req, res) {
    try {
        // Step 1: Validate athlete ID
        const { id } = uuidParamSchema.parse(req.params);

        // Step 2: Check athlete exists
        console.log(`Step 2: Checking athlete ${id} exists`);
        const athlete = await services.getAthleteById(id);
        if (!athlete) {
            return res.status(404).json({ error: 'Athlete not found' });
        }

        // Step 3: Check medical exists
        console.log('Step 3: Checking medical record exists');
        const existingMedical = await services.getMedicalByAthleteId(id);
        if (!existingMedical) {
            return res.status(404).json({ error: 'Medical record not found for this athlete' });
        }

        // Step 4: Validate update data
        console.log('Step 4: Validating medical update data');
        const validated = updateMedicalSchema.parse(req.body);

        if (Object.keys(validated).length === 0) {
            return res.status(400).json({
                error: 'No fields to update',
                details: [{ field: 'body', message: 'At least one field must be provided' }],
            });
        }

        // Step 5: Update
        console.log('Step 5: Updating medical record');
        const updated = await services.updateMedical(id, validated);

        res.json({
            message: 'Medical record updated successfully',
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
        console.error('Error updating medical record:', error);
        res.status(500).json({ error: 'Failed to update medical record', message: error.message });
    }
}

