// Backend/modules/SSS/services.js
import pool from "../../config/db.js";

/**
 * Search supplements by query and optional scope.
 * scope: "all" | "name" | "ingredients"
 * Note: in your DB the column is singular "ingredient" (TEXT).
 */
export async function searchSupplements(query, scope = "all", limit = 10, offset = 0) {
    if (!query || !query.trim()) return { rows: [], total: 0 };

    const q = `%${query.trim()}%`;
    limit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    offset = Math.max(Number(offset) || 0, 0);

    // Build WHERE clause per scope
    let where = "";
    if (scope === "name") {
        where = "name ILIKE $1";
    } else if (scope === "ingredients") {
        // column is singular "ingredient" in your schema
        where = "ingredient ILIKE $1";
    } else {
        // default: search both name OR ingredient
        where = "(name ILIKE $1 OR ingredient ILIKE $1)";
    }

    // Main list query — alias supplement_id as id for frontend convenience
    const listSql = `
    SELECT
      supplement_id AS id,
      name,
      brand,
      description,
      ingredient,
      website
    FROM supplement_schema.supplement
    WHERE ${where}
    ORDER BY name
    LIMIT $2 OFFSET $3;
  `;

    // Separate count for accurate pagination
    const countSql = `
    SELECT COUNT(*)::int AS count
    FROM supplement_schema.supplement
    WHERE ${where};
  `;

    const values = [q, limit, offset];
    const [listRes, countRes] = await Promise.all([
        pool.query(listSql, values),
        pool.query(countSql, [q]),
    ]);

    return { rows: listRes.rows, total: countRes.rows[0].count };
}
