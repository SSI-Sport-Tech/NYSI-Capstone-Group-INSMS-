import dotenv from "dotenv";
dotenv.config();

import { generateAdexToken } from "../../../services/adexAuth.js";

/**
 * Get all sports from ADEX
 */
export async function getAllSports(activeOnly = true) {
    try {
        const token = await generateAdexToken();

        const response = await fetch(
            `${process.env.ADEX_API_URL}/api/v1/sports`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`ADEX API error ${response.status}: ${error}`);
        }

        const sports = await response.json();

        // Convert ADEX format to the format NOMS expects
        return {
            rows: sports.map(sport => ({
                id: sport.value,
                sport: sport.label,
                is_active: true,
            })),
        };
    } catch (err) {
        console.error("Error fetching sports from ADEX:", err);
        throw err;
    }
}