// Configuration
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';

/**
 * Transform nutritional info from JSONB format to Python vectorization service format
 *
 * Input format (flexible JSONB):
 *   { "protein": "10g", "calories": 100, "vitamin_d": "2000 IU" }
 *   OR
 *   { "nutrients": [...], "calories": 100 }
 *
 * Output format (Python service expects):
 *   { "calories": 100, "nutrients": [{ "name": "protein", "amount": "10g" }, ...] }
 *
 * @param {Object} nutritionalInfo - JSONB nutritional data from database
 * @returns {Object} Transformed data for Python service
 */
export function transformNutritionalDataForVectorization(nutritionalInfo) {
    if (!nutritionalInfo || typeof nutritionalInfo !== 'object') {
        return { calories: null, nutrients: [] };
    }

    // If already in the expected format with nutrients array, return as-is
    if (Array.isArray(nutritionalInfo.nutrients)) {
        return {
            calories: nutritionalInfo.calories || null,
            nutrients: nutritionalInfo.nutrients
        };
    }

    // Transform flat object to nutrients array format
    const nutrients = [];
    let calories = null;

    for (const [key, value] of Object.entries(nutritionalInfo)) {
        if (key.toLowerCase() === 'calories') {
            calories = typeof value === 'number' ? value : parseInt(value) || null;
        } else if (value !== null && value !== undefined) {
            nutrients.push({
                name: key,
                amount: String(value),
                daily_value: null
            });
        }
    }

    return { calories, nutrients };
}

/**
 * Generate a single vector using the Python vectorization service
 *
 * @param {Array<string>} ingredients - List of ingredient names
 * @param {Object} nutritionalInfo - Nutritional data (JSONB from database)
 * @param {string} basis - Either 'per_100g' or 'per_serving'
 * @returns {Promise<Object>} Result with success status and vector
 */
export async function generateVector(ingredients, nutritionalInfo, basis) {
    try {
        // Transform nutritional data to expected format
        const transformedNutrition = transformNutritionalDataForVectorization(nutritionalInfo);

        const requestBody = {
            ingredients: ingredients || [],
            nutritional_info: transformedNutrition,
            basis: basis
        };

        console.log(`Calling vectorization service for ${basis}...`);

        const response = await fetch(`${PYTHON_SERVICE_URL}/api/vectorization/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Vectorization service error (${response.status}):`, errorText);
            throw new Error(`Vectorization service returned ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error('Vectorization service returned success=false');
        }

        console.log(`Vector generated for ${basis} (${result.dimension} dimensions)`);

        return {
            success: true,
            vector: result.vector,
            dimension: result.dimension
        };

    } catch (error) {
        console.error(`Vectorization error for ${basis}:`, error.message);
        throw error; // Re-throw to be handled by caller (strict error handling)
    }
}

/**
 * Generate vectors for a supplement based on available nutritional data
 *
 * @param {Array<string>} ingredients - List of ingredient names
 * @param {Object|null} nutritionalInfoPer100g - Per 100g nutritional data
 * @param {Object|null} nutritionalInfoPerServing - Per serving nutritional data
 * @returns {Promise<Object>} Object with vector_100g_ingredient and vector_perserving_ingredient
 */
export async function generateSupplementVectors(ingredients, nutritionalInfoPer100g, nutritionalInfoPerServing) {
    const result = {
        vector_100g_ingredient: null,
        vector_perserving_ingredient: null
    };

    // Generate per_100g vector if data exists
    if (nutritionalInfoPer100g && Object.keys(nutritionalInfoPer100g).length > 0) {
        const vectorResult = await generateVector(ingredients, nutritionalInfoPer100g, 'per_100g');
        result.vector_100g_ingredient = vectorResult.vector;
    }

    // Generate per_serving vector if data exists
    if (nutritionalInfoPerServing && Object.keys(nutritionalInfoPerServing).length > 0) {
        const vectorResult = await generateVector(ingredients, nutritionalInfoPerServing, 'per_serving');
        result.vector_perserving_ingredient = vectorResult.vector;
    }

    return result;
}

export { PYTHON_SERVICE_URL };
