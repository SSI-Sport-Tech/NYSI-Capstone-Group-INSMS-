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

export async function getNutritionDiagnoses(req, res) {
    try {
        const data = await services.getNutritionDiagnoses();
        res.json({ data });
    } catch (error) {
        console.error('Error fetching nutrition diagnoses:', error);
        res.status(500).json({ error: 'Failed to fetch nutrition diagnoses', message: error.message });
    }
}
