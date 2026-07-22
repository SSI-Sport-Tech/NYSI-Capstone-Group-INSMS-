import pool, { withUserContext } from "../../../config/db.js";

// ============================================================================
// BATCH/INVENTORY FUNCTIONS
// ============================================================================

// Columns that can be sorted
const SORT_COLUMNS = {
  product_name: "pm.product_name",
  brand: "pm.brand",
  category: "pm.category",
  description: "pm.description",
  batch_number: "ib.batch_number",
  quantity_on_hand: "ib.quantity_on_hand",
  unit_cost: "ib.unit_cost",
  expiry_date: "ib.expiry_date",
  barcode_sku: "ib.barcode_sku",
  supplier: "ib.supplier",
  created_on: "ib.created_on",
};

// Use case: Show Inventory Library
export async function getBatchesByPage(pageNumber, pageSize = 10, sortBy = "created_on", sortDirection = "desc") {
  const offset = (pageNumber - 1) * pageSize;
  const orderBy = SORT_COLUMNS[sortBy] || "ib.created_on";
  const direction = sortDirection.toLowerCase() === "asc" ? "ASC" : "DESC";

  const query = `
    SELECT
      ib.id,
      ib.product_id,
      pm.product_name,
      pm.brand,
      pm.unit,
      pm.category,
      pm.description,
      ib.batch_number,
      ib.barcode_sku,
      ib.original_stock_amount,
      ib.quantity_on_hand,
      ib.unit_cost,
      ib.expiry_date,
      ib.supplier,
      ib.received_date,
      ib.notes,
      ib.created_on,
      ib.last_modified_on,
      ib.is_active,
      '-' AS batch_status
    FROM ics.inventory_batch ib
    INNER JOIN ics.product_master pm ON ib.product_id = pm.id
    WHERE ib.is_active = true
    ORDER BY ${orderBy} ${direction}
    LIMIT $1 OFFSET $2
  `;

  return await pool.query(query, [pageSize, offset]);
}

// Use case: Show Inventory Library (total count)
export async function getTotalBatchCount() {
  const query = `
    SELECT COUNT(*) AS count
    FROM ics.inventory_batch
    WHERE is_active = true
  `;
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
}

// Use case: Search Inventory
export async function searchBatches(searchQuery, pageNumber, pageSize = 10, sortBy = "created_on", sortDirection = "desc") {
  const offset = (pageNumber - 1) * pageSize;
  const orderBy = SORT_COLUMNS[sortBy] || "ib.created_on";
  const direction = sortDirection.toLowerCase() === "asc" ? "ASC" : "DESC";
  const searchWords = searchQuery
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (searchWords.length === 0) {
    return await getBatchesByPage(pageNumber, pageSize, sortBy, sortDirection);
  }

  // Build WHERE conditions - each word must match in at least one field
  const whereConditions = searchWords
    .map((_, index) => {
      const paramIndex = index + 1;
      return `(
        pm.product_name ILIKE $${paramIndex}
        OR pm.brand ILIKE $${paramIndex}
        OR pm.category ILIKE $${paramIndex}
        OR pm.description ILIKE $${paramIndex}
        OR ib.batch_number ILIKE $${paramIndex}
        OR ib.barcode_sku ILIKE $${paramIndex}
        OR ib.supplier ILIKE $${paramIndex}
    )`;
    })
    .join(" AND ");

  const searchParams = searchWords.map((word) => `%${word}%`);

  const query = `
    SELECT
      ib.id,
      ib.product_id,
      pm.product_name,
      pm.brand,
      pm.unit,
      pm.category,
      pm.description,
      ib.batch_number,
      ib.barcode_sku,
      ib.original_stock_amount,
      ib.quantity_on_hand,
      ib.unit_cost,
      ib.expiry_date,
      ib.supplier,
      ib.received_date,
      ib.notes,
      ib.created_on,
      ib.last_modified_on,
      ib.is_active,
      '-' AS batch_status
    FROM ics.inventory_batch ib
    INNER JOIN ics.product_master pm
        ON ib.product_id = pm.id
    WHERE
        ib.is_active = true
        AND (${whereConditions})
    ORDER BY ${orderBy} ${direction}
    LIMIT $${searchWords.length + 1}
    OFFSET $${searchWords.length + 2}
  `;

  const params = [...searchParams, pageSize, offset];
  return await pool.query(query, params);
}

// Use case: Search Inventory (count results)
export async function getSearchBatchCount(searchQuery) {
  const searchWords = searchQuery
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (searchWords.length === 0) {
    return await getTotalBatchCount();
  }

  const whereConditions = searchWords
    .map((_, index) => {
      const paramIndex = index + 1;
      return `(
        pm.product_name ILIKE $${paramIndex}
        OR pm.brand ILIKE $${paramIndex}
        OR pm.category ILIKE $${paramIndex}
        OR pm.description ILIKE $${paramIndex}
        OR ib.batch_number ILIKE $${paramIndex}
        OR ib.barcode_sku ILIKE $${paramIndex}
        OR ib.supplier ILIKE $${paramIndex}
    )`;
    })
    .join(" AND ");

  const searchParams = searchWords.map((word) => `%${word}%`);

  const query = `
    SELECT COUNT(*) as count
    FROM ics.inventory_batch ib
    INNER JOIN ics.product_master pm ON ib.product_id = pm.id
    WHERE ib.is_active = true
      AND (${whereConditions})
  `;

  const result = await pool.query(query, searchParams);
  return parseInt(result.rows[0].count);
}

// Get Inventory Batch by ID
export async function getBatchById(batchId) {
  const query = `
    SELECT
        ib.id,
        ib.product_id,
        pm.product_name,
        pm.brand,
        pm.unit,
        pm.category,
        pm.description,
        ib.batch_number,
        ib.barcode_sku,
        ib.original_stock_amount,
        ib.quantity_on_hand,
        ib.unit_cost,
        ib.expiry_date,
        ib.supplier,
        ib.received_date,
        ib.notes,
        ib.created_on,
        ib.last_modified_on,
        ib.is_active,
        '-' AS batch_status
    FROM ics.inventory_batch ib
    INNER JOIN ics.product_master pm
        ON ib.product_id = pm.id
    WHERE ib.id = $1
      AND ib.is_active = true
  `;

  const result = await pool.query(query, [batchId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

// Export all inventory batches
export async function getAllBatches(sortBy = "product_name", sortDirection = "asc") {
  const orderBy = SORT_COLUMNS[sortBy] || "pm.product_name";
  const direction = sortDirection.toLowerCase() === "desc" ? "DESC" : "ASC";

  const query = `
    SELECT
      ib.id,
      ib.product_id,
      pm.product_name,
      pm.brand,
      pm.unit,
      pm.category,
      pm.description,
      ib.batch_number,
      ib.barcode_sku,
      ib.original_stock_amount,
      ib.quantity_on_hand,
      ib.unit_cost,
      ib.expiry_date,
      ib.supplier,
      ib.received_date,
      ib.notes,
      ib.created_on,
      ib.last_modified_on,
      ib.is_active,
      '-' AS batch_status
    FROM ics.inventory_batch ib
    INNER JOIN ics.product_master pm
      ON ib.product_id = pm.id
    WHERE ib.is_active = true
    ORDER BY ${orderBy} ${direction}
  `;

  return await pool.query(query);
}