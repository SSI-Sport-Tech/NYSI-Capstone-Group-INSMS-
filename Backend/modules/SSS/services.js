import pool from '../../config/db.js';

// Supplement functions
// Use case: Show Supplement Library
export async function getSupplementsByPage(pageNumber, pageSize = 10) {
  const offset = (pageNumber - 1) * pageSize;

  const query = `
    SELECT 
      id,
      supplement_name,
      supplement_brand,
      supplement_input_type,
      supplement_website
    FROM SSS.Supplement
    ORDER BY id
    LIMIT $1 OFFSET $2
  `;

  return await pool.query(query, [pageSize, offset]);
}
// Use case: Search Supplement
export async function searchSupplements(searchQuery, pageNumber, pageSize = 10) {
  const offset = (pageNumber - 1) * pageSize;
  const searchWords = searchQuery.trim().toLowerCase().split(/\s+/);

  const whereConditions = searchWords.map((word, index) => {
    const paramIndex = index + 1;
    return `(
      supplement_name ILIKE $${paramIndex} OR 
      supplement_brand ILIKE $${paramIndex} OR 
      supplement_ingredient::text ILIKE $${paramIndex} OR
      supplement_status::text ILIKE $${paramIndex}
    )`;
  }).join(' AND ');

  const searchParams = searchWords.map(word => `%${word}%`);

  const query = `
    SELECT 
      id,
      supplement_name,
      supplement_brand,
      supplement_input_type,
      supplement_website,
      CASE 
        WHEN supplement_name ILIKE $1 THEN 1
        WHEN supplement_brand ILIKE $1 THEN 2
        WHEN supplement_ingredient::text ILIKE $1 THEN 3
        WHEN supplement_status::text ILIKE $1 THEN 4
        ELSE 5
      END AS relevance_order
    FROM SSS.Supplement
    WHERE ${whereConditions}
    ORDER BY relevance_order, id
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
  const searchWords = searchQuery.trim().toLowerCase().split(/\s+/);

  const whereConditions = searchWords.map((word, index) => {
    const paramIndex = index + 1;
    return `(
      supplement_name ILIKE $${paramIndex} OR 
      supplement_brand ILIKE $${paramIndex} OR 
      supplement_ingredient::text ILIKE $${paramIndex} OR
      supplement_status::text ILIKE $${paramIndex}
    )`;
  }).join(' AND ');

  const searchParams = searchWords.map(word => `%${word}%`);

  const query = `
    SELECT COUNT(*) 
    FROM SSS.Supplement
    WHERE ${whereConditions}
  `;

  const result = await pool.query(query, searchParams);
  return parseInt(result.rows[0].count);
}

// Batch functions
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
      CASE 
        WHEN ib.batch_initial_quantity - COALESCE(SUM(it.quantity), 0) = 0 
          THEN 'Out of Stock'
        WHEN ib.batch_initial_quantity - COALESCE(SUM(it.quantity), 0) < (ib.batch_initial_quantity * 0.2) 
          THEN 'Low Stock'
        ELSE 'Available'
      END AS batch_status
    FROM SSS.Inventory_Batch ib
    INNER JOIN SSS.Supplement s ON ib.supplement_id = s.id
    LEFT JOIN SSS.Inventory_Ticket it ON ib.id = it.batch_id
    GROUP BY ib.id, ib.batch_number, ib.batch_initial_quantity, 
             ib.batch_expiration_date, ib.batch_price, 
             s.supplement_name, s.supplement_brand
    ORDER BY ib.id
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

  // Split search query into individual words for AND logic
  const searchWords = searchQuery.trim().split(/\s+/).filter(word => word.length > 0);

  if (searchWords.length === 0) {
    // If empty search, return regular batches
    return await getBatchesByPage(pageNumber, pageSize);
  }

  // Build WHERE conditions for each search word (must match in at least one field)
  const whereConditions = searchWords.map((_, index) => {
    const paramIndex = index + 1;
    return `(
      ib.batch_number ILIKE $${paramIndex} OR
      s.supplement_name ILIKE $${paramIndex} OR
      s.supplement_brand ILIKE $${paramIndex} OR
      CASE 
        WHEN ib.batch_initial_quantity - COALESCE(SUM(it.quantity), 0) = 0 
          THEN 'Out of Stock'
        WHEN ib.batch_initial_quantity - COALESCE(SUM(it.quantity), 0) < (ib.batch_initial_quantity * 0.2) 
          THEN 'Low Stock'
        ELSE 'Available'
      END ILIKE $${paramIndex}
    )`;
  }).join(' AND ');

  // Parameters with wildcards for ILIKE
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
        CASE 
          WHEN ib.batch_initial_quantity - COALESCE(SUM(it.quantity), 0) = 0 
            THEN 'Out of Stock'
          WHEN ib.batch_initial_quantity - COALESCE(SUM(it.quantity), 0) < (ib.batch_initial_quantity * 0.2) 
            THEN 'Low Stock'
          ELSE 'Available'
        END AS batch_status
      FROM SSS.Inventory_Batch ib
      INNER JOIN SSS.Supplement s ON ib.supplement_id = s.id
      LEFT JOIN SSS.Inventory_Ticket it ON ib.id = it.batch_id
      GROUP BY ib.id, ib.batch_number, ib.batch_initial_quantity, 
               ib.batch_expiration_date, ib.batch_price, 
               s.supplement_name, s.supplement_brand
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

// Use case: Search Inventory - Get total count
export async function getSearchBatchCount(searchQuery) {
  const searchWords = searchQuery.trim().split(/\s+/).filter(word => word.length > 0);

  if (searchWords.length === 0) {
    return await getTotalBatchCount();
  }

  // Build WHERE conditions (same logic as searchBatches)
  const whereConditions = searchWords.map((_, index) => {
    const paramIndex = index + 1;
    return `(
      ib.batch_number ILIKE $${paramIndex} OR
      s.supplement_name ILIKE $${paramIndex} OR
      s.supplement_brand ILIKE $${paramIndex} OR
      CASE 
        WHEN ib.batch_initial_quantity - COALESCE(SUM(it.quantity), 0) = 0 
          THEN 'Out of Stock'
        WHEN ib.batch_initial_quantity - COALESCE(SUM(it.quantity), 0) < (ib.batch_initial_quantity * 0.2) 
          THEN 'Low Stock'
        ELSE 'Available'
      END ILIKE $${paramIndex}
    )`;
  }).join(' AND ');

  const searchParams = searchWords.map(word => `%${word}%`);

  const query = `
    SELECT COUNT(DISTINCT ib.id) as count
    FROM SSS.Inventory_Batch ib
    INNER JOIN SSS.Supplement s ON ib.supplement_id = s.id
    LEFT JOIN SSS.Inventory_Ticket it ON ib.id = it.batch_id
    GROUP BY ib.id, ib.batch_number, ib.batch_initial_quantity, s.supplement_name
    HAVING ${whereConditions}
  `;

  const result = await pool.query(query, searchParams);
  return result.rows.length; // Count the number of rows returned
}