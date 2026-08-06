import dotenv from "dotenv";
dotenv.config();

import { generateAdexToken } from "../../../services/adexAuth.js";
import { getPinnedAthletes } from "./services.js";

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
    };
}

async function fetchAllAthletes(token) {
    let currentPage = 1;
    const limit = 100; // or the maximum ADEX supports
    let athletes = [];
    let hasNextPage = true;

    while (hasNextPage) {
        const response = await fetch(
            `${process.env.ADEX_API_URL}/api/v1/athletes/all/?page=${currentPage}&limit=${limit}`,
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

        athletes.push(...result.data.map(mapAthlete));

        hasNextPage = result.meta.hasNextPage;
        currentPage++;
    }

    return athletes;
}

// Get All Athletes
export async function getAthletesFromADEX(
    userId,
    page = 1,
    pageSize = 10,
    exportAll = false,
    sortColumn = "",
    sortDirection = "asc"
){
    try {
        const token = await generateAdexToken();

        // Export athletes into CSV
        if (exportAll) {
            return await fetchAllAthletes(token);
        }

        let athletes = await fetchAllAthletes(token);
        const pinnedAthletes = await getPinnedAthletes(userId);
        const pinnedSet = new Set(pinnedAthletes);

        athletes = athletes.map(a => ({
            ...a,
            is_pinned: pinnedSet.has(a.id),
        }));
        
        // Always keep pinned athletes at the top
        athletes.sort((a, b) => {

            // Pinned first
            if (a.is_pinned !== b.is_pinned) {
                return Number(b.is_pinned) - Number(a.is_pinned);
            }

            // Default sort by name if no sort selected
            if (!sortColumn) {
                return a.anonymized_display_name.localeCompare(
                    b.anonymized_display_name
                );
            }

            const aValue = a?.[sortColumn];
            const bValue = b?.[sortColumn];

            if (aValue == null && bValue == null) return 0;
            if (aValue == null) return 1;
            if (bValue == null) return -1;

            // Date sorting
            if (
                sortColumn === "date_of_birth" ||
                sortColumn === "carding_start_date" ||
                sortColumn === "carding_end_date"
            ) {
                const aDate = new Date(aValue).getTime();
                const bDate = new Date(bValue).getTime();

                return sortDirection === "asc"
                    ? aDate - bDate
                    : bDate - aDate;
            }

            // Boolean sorting
            if (typeof aValue === "boolean") {
                return sortDirection === "asc"
                    ? Number(aValue) - Number(bValue)
                    : Number(bValue) - Number(aValue);
            }

            // String sorting
            const comparison = String(aValue).localeCompare(
                String(bValue),
                undefined,
                {
                    numeric: true,
                    sensitivity: "base",
                }
            );

            return sortDirection === "asc"
                ? comparison
                : -comparison;
        });

        const totalItems = athletes.length;
        const totalPages = Math.ceil(totalItems / pageSize);

        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;

        return {
            data: athletes.slice(startIndex, endIndex),
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