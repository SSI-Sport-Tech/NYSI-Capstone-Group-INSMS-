import * as services from './services.js';

export async function getConsultTypes(req, res) {
    try {
        const data = await services.getConsultTypes();
        res.json({ data });
    } catch (error) {
        console.error('Error fetching consult types:', error);
        res.status(500).json({ error: 'Failed to fetch consult types', message: error.message });
    }
}

