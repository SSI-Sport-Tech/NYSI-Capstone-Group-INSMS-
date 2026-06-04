import pool from "../db";

export async function getSessionsFromPostgres() {
    const query = `
        SELECT *
        FROM consultation.sessions
        ORDER BY id ASC
    `;

    const result = await pool.query(query);
    return result.rows;
}