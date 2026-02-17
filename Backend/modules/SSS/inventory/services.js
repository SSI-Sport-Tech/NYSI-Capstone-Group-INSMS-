import pool from "../../../config/db.js";

// ============================================================================
// BATCH/INVENTORY FUNCTIONS
// ============================================================================

// Use case: Show Inventory Library
export async function getBatchesByPage(pageNumber, pageSize = 10) {
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
      ib.batch_initial_quantity - COALESCE(SUM(it.quantity), 0) AS available,
      bssl.batch_stock_status AS batch_status
    FROM SSS.Inventory_Batch ib
    INNER JOIN SSS.Supplement s ON ib.supplement_id = s.id
    LEFT JOIN SSS.Inventory_Ticket it ON ib.id = it.inventory_batch_id
    LEFT JOIN SSS.Batch_Stock_Status_Lookup bssl ON ib.batch_stock_status_id = bssl.id
    WHERE bssl.is_active = true
    GROUP BY ib.id, ib.batch_number, ib.batch_initial_quantity,
             ib.batch_expiration_date, ib.batch_price,
             s.supplement_name, s.supplement_brand, bssl.batch_stock_status
    ORDER BY ib.id DESC
    LIMIT $1 OFFSET $2
  `;

  return await pool.query(query, [pageSize, offset]);
}

// Use case: Show Inventory Library (total count)
export async function getTotalBatchCount() {
  const query = `
    SELECT COUNT(*)
    FROM SSS.Inventory_Batch ib
    JOIN SSS.Batch_Stock_Status_Lookup bssl
      ON ib.batch_stock_status_id = bssl.id
    WHERE bssl.is_active = true
  `;
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
}

// Use case: Search Inventory
export async function searchBatches(searchQuery, pageNumber, pageSize = 10) {
  const offset = (pageNumber - 1) * pageSize;
  const searchWords = searchQuery
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (searchWords.length === 0) {
    return await getBatchesByPage(pageNumber, pageSize);
  }

    // Build WHERE conditions - each word must match in at least one field
  // Note: These reference table aliases inside the CTE
  const whereConditions = searchWords
    .map((_, index) => {
      const paramIndex = index + 1;
      return `(
      ib.batch_number ILIKE $${paramIndex} OR
      s.supplement_name ILIKE $${paramIndex} OR
      s.supplement_brand ILIKE $${paramIndex} OR
      bssl.batch_stock_status ILIKE $${paramIndex}
    )`;
    })
    .join(" AND ");

  const searchParams = searchWords.map((word) => `%${word}%`);

  const query = `
    WITH batch_data AS (
      SELECT
        ib.id,
        ib.batch_number,
        ib.batch_initial_quantity,
        ib.batch_expiration_date,
        ib.batch_price,
        s.supplement_name,
        s.supplement_brand,
        COALESCE(SUM(it.quantity), 0) AS booked,
        ib.batch_initial_quantity - COALESCE(SUM(it.quantity), 0) AS available,
        bssl.batch_stock_status AS batch_status
      FROM SSS.Inventory_Batch ib
      INNER JOIN SSS.Supplement s ON ib.supplement_id = s.id
      LEFT JOIN SSS.Inventory_Ticket it ON ib.id = it.inventory_batch_id
      LEFT JOIN SSS.Batch_Stock_Status_Lookup bssl ON ib.batch_stock_status_id = bssl.id
      WHERE bssl.is_active = true
      GROUP BY ib.id, ib.batch_number, ib.batch_initial_quantity,
               ib.batch_expiration_date, ib.batch_price,
               s.supplement_name, s.supplement_brand, bssl.batch_stock_status
    )
    SELECT
      *,
      CASE
        WHEN ${searchWords
      .map((_, i) => `batch_number ILIKE $${i + 1}`)
      .join(" AND ")} THEN 1
        WHEN ${searchWords
      .map((_, i) => `supplement_name ILIKE $${i + 1}`)
      .join(" AND ")} THEN 2
        WHEN ${searchWords
      .map((_, i) => `supplement_brand ILIKE $${i + 1}`)
      .join(" AND ")} THEN 3
        WHEN ${searchWords
      .map((_, i) => `batch_status ILIKE $${i + 1}`)
      .join(" AND ")} THEN 4
        ELSE 5
      END AS relevance_order
    FROM batch_data
    WHERE ${whereConditions}
    ORDER BY relevance_order, id DESC
    LIMIT $${searchWords.length + 1} OFFSET $${searchWords.length + 2}
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
      ib.batch_number ILIKE $${paramIndex} OR
      s.supplement_name ILIKE $${paramIndex} OR
      s.supplement_brand ILIKE $${paramIndex} OR
      bssl.batch_stock_status ILIKE $${paramIndex}
    )`;
    })
    .join(" AND ");

  const searchParams = searchWords.map((word) => `%${word}%`);

  const query = `
    SELECT COUNT(DISTINCT ib.id) as count
    FROM SSS.Inventory_Batch ib
    INNER JOIN SSS.Supplement s ON ib.supplement_id = s.id
    LEFT JOIN SSS.Batch_Stock_Status_Lookup bssl ON ib.batch_stock_status_id = bssl.id
    WHERE ${whereConditions}
      AND bssl.is_active = true
  `;

  const result = await pool.query(query, searchParams);
  return parseInt(result.rows[0].count);
}

/**
 * Get batch by ID with full details
 */
export async function getBatchById(batchId) {
  const query = `
        SELECT
            ib.id,
            ib.supplement_id,
            ib.batch_number,
            ib.batch_initial_quantity,
            ib.batch_price,
            ib.batch_expiration_date,
            ib.batch_manufacture_date,
            ib.batch_stock_status_id,
            bssl.batch_stock_status,
            s.supplement_name,
            s.supplement_brand
        FROM SSS.Inventory_Batch ib
        LEFT JOIN SSS.Batch_Stock_Status_Lookup bssl
            ON ib.batch_stock_status_id = bssl.id
        LEFT JOIN SSS.Supplement s
            ON ib.supplement_id = s.id
        WHERE ib.id = $1
    `;

  const result = await pool.query(query, [batchId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Check if batch number already exists for the same supplement
 */
export async function checkDuplicateBatchNumber(supplementId, batchNumber, excludeId = null) {
  let query = `
        SELECT id
        FROM SSS.Inventory_Batch
        WHERE supplement_id = $1
          AND LOWER(batch_number) = LOWER($2)
    `;

  const params = [supplementId, batchNumber];

  if (excludeId) {
    query += ` AND id != $3`;
    params.push(excludeId);
  }

  query += ` LIMIT 1`;

  const result = await pool.query(query, params);
  return result.rows.length > 0;
}

/**
 * Check if batch has any tickets (prevent deletion if tickets exist)
 */
export async function checkBatchHasTickets(batchId) {
  const query = `
        SELECT COUNT(*) as ticket_count
        FROM SSS.Inventory_Ticket
        WHERE inventory_batch_id = $1
    `;

  const result = await pool.query(query, [batchId]);
  return parseInt(result.rows[0].ticket_count) > 0;
}

/**
 * Add a new inventory batch to the database
 */
export async function createBatch(batchData) {
  const query = `
        INSERT INTO SSS.Inventory_Batch (
            supplement_id,
            batch_stock_status_id,
            batch_number,
            batch_initial_quantity,
            batch_price,
            batch_expiration_date,
            batch_manufacture_date
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7
        )
        RETURNING
            id,
            supplement_id,
            batch_stock_status_id,
            batch_number,
            batch_initial_quantity,
            batch_price,
            batch_expiration_date,
            batch_manufacture_date
    `;

  const values = [
    batchData.supplement_id,
    batchData.batch_stock_status_id,
    batchData.batch_number,
    batchData.batch_initial_quantity,
    batchData.batch_price || null,
    batchData.batch_expiration_date || null,
    batchData.batch_manufacture_date || null
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Update one or more fields of an existing batch (partial update)
 */
export async function updateBatch(batchId, updateData) {
  const fields = [];
  const values = [];
  let paramCounter = 1;

  const fieldMapping = {
    supplement_id: updateData.supplement_id,
    batch_number: updateData.batch_number,
    batch_initial_quantity: updateData.batch_initial_quantity,
    batch_price: updateData.batch_price,
    batch_expiration_date: updateData.batch_expiration_date,
    batch_manufacture_date: updateData.batch_manufacture_date
  };

  for (const [field, value] of Object.entries(fieldMapping)) {
    if (value !== undefined) {
      fields.push(`${field} = $${paramCounter}`);
      values.push(value);
      paramCounter++;
    }
  }

  if (fields.length === 0) {
    return null;
  }

  values.push(batchId);

  const query = `
        UPDATE SSS.Inventory_Batch
        SET ${fields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING
            id,
            supplement_id,
            batch_stock_status_id,
            batch_number,
            batch_initial_quantity,
            batch_price,
            batch_expiration_date,
            batch_manufacture_date
    `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Permanently delete one or more batches from database (hard delete, bulk)
 */
export async function deleteBatches(batchIds) {
  const query = `
        DELETE FROM SSS.Inventory_Batch
        WHERE id = ANY($1::uuid[])
        RETURNING id
    `;

  const result = await pool.query(query, [batchIds]);
  return result.rows;
}
