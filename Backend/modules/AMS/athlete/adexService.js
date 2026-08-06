import dotenv from "dotenv";
dotenv.config();

import { generateAdexToken } from "../../../services/adexAuth.js";

// Helper Function
function mapAthlete(adexAthlete) {
    return {
        id: adexAthlete.pk_athlete_uuid,
        anonymized_display_name: adexAthlete.anonymized_display_name,
        gender: adexAthlete.gender,
        date_of_birth: adexAthlete.date_of_birth,
        fk_sport_uuid: adexAthlete.fk_sport_uuid,
        sport_name: adexAthlete.sport,
        carding_status: adexAthlete.carding_name,
        carding_start_date: adexAthlete.carding_start_date,
        carding_end_date: adexAthlete.carding_end_date,
        is_active: adexAthlete.is_active,
        email: adexAthlete.email,
        position: adexAthlete.position,
        race: adexAthlete.race,
        ethnicity: adexAthlete.ethnicity,
        nationality: adexAthlete.nationality,
        team_uuid: adexAthlete.team_uuid,
        assigned_nutritionist: "Not Assigned",
        is_pinned: false,
    };
}

// Get All Athletes
export async function getAthletesFromADEX(page = 1, pageSize = 10, exportAll = false) {
    try {
        const token = await generateAdexToken();

        const response = await fetch(
            `${process.env.ADEX_API_URL}/api/v1/athletes/all`,
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
        
        const result = await response.json();

        // Map ADEX response
        const mappedAthletes = result.data.map(mapAthlete);

        // Export all athletes (skip pagination)
        if (exportAll) {
            return mappedAthletes;
        }

        // Pagination
        const totalItems = mappedAthletes.length;
        const totalPages = Math.ceil(totalItems / pageSize);

        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;

        return {
            data: mappedAthletes.slice(startIndex, endIndex),
            meta: {
                currentPage: page,
                pageSize,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    } catch(err) {
        console.error(err);
        throw err;
    }
}

// Get 1 Athlete by pk_athlete_uuid
export async function getAthleteByUuidFromADEX(pkAthleteUuid) {
    try {
        const token = await generateAdexToken();

        const response = await fetch(
            `${process.env.ADEX_API_URL}/api/v1/athletes/${pkAthleteUuid}`,
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

        // return await response.json();
        const athlete = await response.json();

        return mapAthlete(athlete);
    } catch (err) {
        console.error(err);
        throw err;
    }
}