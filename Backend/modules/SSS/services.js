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

// Use case: Showing Supplement Library
async function getSupplementsByPage(pageNumber, pageSize = 10) {
  const offset = (pageNumber - 1) * pageSize;

  const query = `
    SELECT 
      id,
      supplement_name,
      supplement_brand,
      supplement_input_type,
      supplement_website
    FROM SSS.Supplement
    LIMIT $1 OFFSET $2
  `;

  return await db.query(query, [pageSize, offset]);
}

// Use case: Showing Supplement Library
async function getTotalSupplementCount() {
  const query = 'SELECT COUNT(*) FROM SSS.Supplement';
  const result = await db.query(query);
  return parseInt(result.rows[0].count);
}

// Use case: Showing Inventory Library
async function getBatchesByPage(pageNumber, pageSize = 10) {
  const offset = (pageNumber - 1) * pageSize;

  const query = `
    SELECT 
      ib.id,
      ib.batch_number,
      ib.batch_initial_quantity,
      ib.batch_expiration_date,
      ib.batch_price,
      s.supplement_name,
      s.supplement_brand,
      COALESCE(SUM(it.quantity), 0) AS booked,
      ib.batch_initial_quantity - COALESCE(SUM(it.quantity), 0) AS available
    FROM SSS.Inventory_Batch ib
    INNER JOIN supplements s ON ib.supplement_id = s.id
    LEFT JOIN SSS.Inventory_Ticket it ON ib.id = it.batch_id
    GROUP BY ib.id, ib.batch_number, ib.batch_initial_quantity, 
             ib.batch_expiration_date, ib.batch_price, 
             s.supplement_name, s.supplement_brand
    ORDER BY ib.id
    LIMIT $1 OFFSET $2
  `;

  return await db.query(query, [pageSize, offset]);
}

// Use case: Showing Inventory Library
async function getTotalBatchCount() {
  const query = 'SELECT COUNT(*) FROM SSS.Inventory_Batch';
  const result = await db.query(query);
  return parseInt(result.rows[0].count);
}