import pool from '../../config/db.js';

// ============================================================================
// SUPPLEMENT FUNCTIONS
// ============================================================================

// Use case: Show Supplement Library
export async function getSupplementsByPage(pageNumber, pageSize = 10) {
  const offset = (pageNumber - 1) * pageSize;

  const query = `
    SELECT 
      s.id,
      s.supplement_name,
      s.supplement_brand,
      sdf.supplement_dose_form AS supplement_input_type,
      s.supplement_website
    FROM SSS.Supplement s
    LEFT JOIN SSS.Supplement_Dose_Form_Lookup sdf 
      ON s.supplement_dose_form_id = sdf.id
    ORDER BY s.created_on DESC
    LIMIT $1 OFFSET $2
  `;

  return await pool.query(query, [pageSize, offset]);
}

// Use case: Search Supplement
export async function searchSupplements(searchQuery, pageNumber, pageSize = 10) {
  const offset = (pageNumber - 1) * pageSize;
  const searchWords = searchQuery.trim().split(/\s+/).filter(word => word.length > 0);

  if (searchWords.length === 0) {
    return await getSupplementsByPage(pageNumber, pageSize);
  }

  // Build WHERE conditions - each word must match in at least one field
  const whereConditions = searchWords.map((_, index) => {
    const paramIndex = index + 1;
    return `(
      s.supplement_name ILIKE $${paramIndex} OR 
      s.supplement_brand ILIKE $${paramIndex} OR 
      s.supplement_ingredient::text ILIKE $${paramIndex} OR
      sdf.supplement_dose_form ILIKE $${paramIndex}
    )`;
  }).join(' AND ');

  const searchParams = searchWords.map(word => `%${word}%`);

  const query = `
    SELECT 
      s.id,
      s.supplement_name,
      s.supplement_brand,
      sdf.supplement_dose_form AS supplement_input_type,
      s.supplement_website,
      CASE 
        WHEN ${searchWords.map((_, i) => `s.supplement_name ILIKE $${i + 1}`).join(' AND ')} THEN 1
        WHEN ${searchWords.map((_, i) => `s.supplement_brand ILIKE $${i + 1}`).join(' AND ')} THEN 2
        WHEN ${searchWords.map((_, i) => `s.supplement_ingredient::text ILIKE $${i + 1}`).join(' AND ')} THEN 3
        WHEN ${searchWords.map((_, i) => `sdf.supplement_dose_form ILIKE $${i + 1}`).join(' AND ')} THEN 4
        ELSE 5
      END AS relevance_order
    FROM SSS.Supplement s
    LEFT JOIN SSS.Supplement_Dose_Form_Lookup sdf 
      ON s.supplement_dose_form_id = sdf.id
    WHERE ${whereConditions}
    ORDER BY relevance_order, s.created_on DESC
    LIMIT $${searchParams.length + 1} OFFSET $${searchParams.length + 2}
  `;

  return await pool.query(query, [...searchParams, pageSize, offset]);
}

// Use case: Show Supplement Library
export async function getTotalSupplementCount() {
  const query = 'SELECT COUNT(*) FROM SSS.Supplement';
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
}

// Use case: Search Supplement
export async function getSearchResultCount(searchQuery) {
  const searchWords = searchQuery.trim().split(/\s+/).filter(word => word.length > 0);

  if (searchWords.length === 0) {
    return await getTotalSupplementCount();
  }

  const whereConditions = searchWords.map((_, index) => {
    const paramIndex = index + 1;
    return `(
      s.supplement_name ILIKE $${paramIndex} OR 
      s.supplement_brand ILIKE $${paramIndex} OR 
      s.supplement_ingredient::text ILIKE $${paramIndex} OR
      sdf.supplement_dose_form ILIKE $${paramIndex}
    )`;
  }).join(' AND ');

  const searchParams = searchWords.map(word => `%${word}%`);

  const query = `
    SELECT COUNT(*) 
    FROM SSS.Supplement s
    LEFT JOIN SSS.Supplement_Dose_Form_Lookup sdf 
      ON s.supplement_dose_form_id = sdf.id
    WHERE ${whereConditions}
  `;

  const result = await pool.query(query, searchParams);
  return parseInt(result.rows[0].count);
}

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
    GROUP BY ib.id, ib.batch_number, ib.batch_initial_quantity, 
             ib.batch_expiration_date, ib.batch_price, 
             s.supplement_name, s.supplement_brand, bssl.batch_stock_status
    ORDER BY ib.created_on DESC
    LIMIT $1 OFFSET $2
  `;

  return await pool.query(query, [pageSize, offset]);
}

// Use case: Show Inventory Library
export async function getTotalBatchCount() {
  const query = 'SELECT COUNT(*) FROM SSS.Inventory_Batch';
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
}

// Use case: Search Inventory
export async function searchBatches(searchQuery, pageNumber, pageSize = 10) {
  const offset = (pageNumber - 1) * pageSize;
  const searchWords = searchQuery.trim().split(/\s+/).filter(word => word.length > 0);

  if (searchWords.length === 0) {
    return await getBatchesByPage(pageNumber, pageSize);
  }

  // Build WHERE conditions for each search word
  const whereConditions = searchWords.map((_, index) => {
    const paramIndex = index + 1;
    return `(
      ib.batch_number ILIKE $${paramIndex} OR
      s.supplement_name ILIKE $${paramIndex} OR
      s.supplement_brand ILIKE $${paramIndex} OR
      bssl.batch_stock_status ILIKE $${paramIndex}
    )`;
  }).join(' AND ');

  const searchParams = searchWords.map(word => `%${word}%`);

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
      GROUP BY ib.id, ib.batch_number, ib.batch_initial_quantity, 
               ib.batch_expiration_date, ib.batch_price, 
               s.supplement_name, s.supplement_brand, bssl.batch_stock_status
    )
    SELECT 
      *,
      CASE
        WHEN ${searchWords.map((_, i) => `batch_number ILIKE $${i + 1}`).join(' AND ')} THEN 1
        WHEN ${searchWords.map((_, i) => `supplement_name ILIKE $${i + 1}`).join(' AND ')} THEN 2
        WHEN ${searchWords.map((_, i) => `supplement_brand ILIKE $${i + 1}`).join(' AND ')} THEN 3
        WHEN ${searchWords.map((_, i) => `batch_status ILIKE $${i + 1}`).join(' AND ')} THEN 4
        ELSE 5
      END AS relevance_order
    FROM batch_data
    WHERE ${whereConditions}
    ORDER BY relevance_order, id
    LIMIT $${searchWords.length + 1} OFFSET $${searchWords.length + 2}
  `;

  const params = [...searchParams, pageSize, offset];
  return await pool.query(query, params);
}

// Use case: Search Inventory
export async function getSearchBatchCount(searchQuery) {
  const searchWords = searchQuery.trim().split(/\s+/).filter(word => word.length > 0);

  if (searchWords.length === 0) {
    return await getTotalBatchCount();
  }

  const whereConditions = searchWords.map((_, index) => {
    const paramIndex = index + 1;
    return `(
      ib.batch_number ILIKE $${paramIndex} OR
      s.supplement_name ILIKE $${paramIndex} OR
      s.supplement_brand ILIKE $${paramIndex} OR
      bssl.batch_stock_status ILIKE $${paramIndex}
    )`;
  }).join(' AND ');

  const searchParams = searchWords.map(word => `%${word}%`);

  const query = `
    SELECT COUNT(DISTINCT ib.id) as count
    FROM SSS.Inventory_Batch ib
    INNER JOIN SSS.Supplement s ON ib.supplement_id = s.id
    LEFT JOIN SSS.Inventory_Ticket it ON ib.id = it.inventory_batch_id
    LEFT JOIN SSS.Batch_Stock_Status_Lookup bssl ON ib.batch_stock_status_id = bssl.id
    GROUP BY ib.id, ib.batch_number, s.supplement_name, s.supplement_brand, bssl.batch_stock_status
    HAVING ${whereConditions}
  `;

  const result = await pool.query(query, searchParams);
  return result.rows.length;
}