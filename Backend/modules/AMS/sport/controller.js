import * as services from './services.js';

// ============================================================================
// LIST SPORTS
// ============================================================================

export async function listSports(req, res) {
    try {
        const result = await services.getAllSports();

        res.json({ data: result.rows });
    } catch (error) {
        console.error('Error listing sports:', error);
        res.status(500).json({ error: 'Failed to fetch sports', message: error.message });
    }
}