import * as services from './services.js';

export async function getScheduleTypes(req, res) {
    try {
        const data = await services.getScheduleTypes();
        res.json({ data });
    } catch (error) {
        console.error('Error fetching schedule types:', error);
        res.status(500).json({ error: 'Failed to fetch schedule types', message: error.message });
    }
}