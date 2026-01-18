import pool from "../../config/db.js";

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
      spf.supplement_packaging_form,
      ssl.supplement_status,
      s.batch_testing_org,
      s.supplement_website
    FROM SSS.Supplement s
    LEFT JOIN SSS.Supplement_Packaging_Form_Lookup spf 
      ON s.supplement_packaging_form_id = spf.id
    LEFT JOIN SSS.Supplement_Status_Lookup ssl
      ON s.supplement_status_id = ssl.id
    WHERE spf.is_active = true 
      AND ssl.is_active = true
    ORDER BY s.id DESC
    LIMIT $1 OFFSET $2
  `;

  return await pool.query(query, [pageSize, offset]);
}

// Use case: Search Supplement
export async function searchSupplements(
  searchQuery,
  pageNumber,
  pageSize = 10
) {
  const offset = (pageNumber - 1) * pageSize;
  const searchWords = searchQuery
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (searchWords.length === 0) {
    return await getSupplementsByPage(pageNumber, pageSize);
  }

  // Build WHERE conditions - each word must match in at least one field
  const whereConditions = searchWords
    .map((_, index) => {
      const paramIndex = index + 1;
      return `(
      s.supplement_name ILIKE $${paramIndex} OR 
      s.supplement_brand ILIKE $${paramIndex} OR 
      s.supplement_ingredient::text ILIKE $${paramIndex} OR
      spf.supplement_packaging_form ILIKE $${paramIndex} OR
      ssl.supplement_status ILIKE $${paramIndex}
    )`;
    })
    .join(" AND ");

  const searchParams = searchWords.map((word) => `%${word}%`);

  const query = `
    SELECT 
      s.id,
      s.supplement_name,
      s.supplement_brand,
      spf.supplement_packaging_form,
      ssl.supplement_status,
      s.batch_testing_org,
      s.supplement_website,
      CASE 
        WHEN ${searchWords
          .map((_, i) => `s.supplement_name ILIKE $${i + 1}`)
          .join(" AND ")} THEN 1
        WHEN ${searchWords
          .map((_, i) => `s.supplement_brand ILIKE $${i + 1}`)
          .join(" AND ")} THEN 2
        WHEN ${searchWords
          .map((_, i) => `s.supplement_ingredient::text ILIKE $${i + 1}`)
          .join(" AND ")} THEN 3
        WHEN ${searchWords
          .map((_, i) => `spf.supplement_packaging_form ILIKE $${i + 1}`)
          .join(" AND ")} THEN 4
        WHEN ${searchWords
          .map((_, i) => `ssl.supplement_status ILIKE $${i + 1}`)
          .join(" AND ")} THEN 5
        ELSE 6
      END AS relevance_order
    FROM SSS.Supplement s
    LEFT JOIN SSS.Supplement_Packaging_Form_Lookup spf 
      ON s.supplement_packaging_form_id = spf.id
    LEFT JOIN SSS.Supplement_Status_Lookup ssl
      ON s.supplement_status_id = ssl.id
    WHERE ${whereConditions}
      AND spf.is_active = true 
      AND ssl.is_active = true
    ORDER BY relevance_order, s.id DESC
    LIMIT $${searchParams.length + 1} OFFSET $${searchParams.length + 2}
  `;

  return await pool.query(query, [...searchParams, pageSize, offset]);
}

// Use case: Show Supplement Library (total count)
export async function getTotalSupplementCount() {
  const query = `
    SELECT COUNT(*) 
    FROM SSS.Supplement s
    JOIN SSS.Supplement_Packaging_Form_Lookup spf 
      ON s.supplement_packaging_form_id = spf.id
    JOIN SSS.Supplement_Status_Lookup ssl
      ON s.supplement_status_id = ssl.id
    WHERE spf.is_active = true 
      AND ssl.is_active = true
  `;
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
}

// Use case: Search Supplement (count results)
export async function getSearchResultCount(searchQuery) {
  const searchWords = searchQuery
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (searchWords.length === 0) {
    return await getTotalSupplementCount();
  }

  const whereConditions = searchWords
    .map((_, index) => {
      const paramIndex = index + 1;
      return `(
      s.supplement_name ILIKE $${paramIndex} OR 
      s.supplement_brand ILIKE $${paramIndex} OR 
      s.supplement_ingredient::text ILIKE $${paramIndex} OR
      spf.supplement_packaging_form ILIKE $${paramIndex} OR
      ssl.supplement_status ILIKE $${paramIndex}
    )`;
    })
    .join(" AND ");

  const searchParams = searchWords.map((word) => `%${word}%`);

  const query = `
    SELECT COUNT(*) 
    FROM SSS.Supplement s
    LEFT JOIN SSS.Supplement_Packaging_Form_Lookup spf 
      ON s.supplement_packaging_form_id = spf.id
    LEFT JOIN SSS.Supplement_Status_Lookup ssl
      ON s.supplement_status_id = ssl.id
    WHERE ${whereConditions}
      AND spf.is_active = true 
      AND ssl.is_active = true
  `;

  const result = await pool.query(query, searchParams);
  return parseInt(result.rows[0].count);
}

//Use Case: View Supplement Details - Supplement Information section
export async function getSupplementById(supplementId) {
  const query = `
    SELECT 
      s.id,
      s.supplement_name,
      s.supplement_brand,
      s.supplement_description,
      spf.supplement_packaging_form,
      ssl.supplement_status,
      s.supplement_ingredient,
      s.nutritional_info_per_100g,
      s.nutritional_info_per_serving,
      s.nutritional_info_per_serving_definition,
      s.supplement_additional_information,
      s.supplement_website,
      s.supplement_warning_label,
      s.supplement_certifications,
      s.batch_testing_org
    FROM SSS.Supplement s
    LEFT JOIN SSS.Supplement_Packaging_Form_Lookup spf 
      ON s.supplement_packaging_form_id = spf.id
    LEFT JOIN SSS.Supplement_Status_Lookup ssl
      ON s.supplement_status_id = ssl.id
    WHERE s.id = $1
  `;

  const result = await pool.query(query, [supplementId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

//Use Case: View Supplement Details - Stock Summary section
export async function getSupplementStockSummary(supplementId) {
  const query = `
    SELECT 
      COALESCE(SUM(ib.batch_initial_quantity), 0) AS total_stock,
      COALESCE(SUM(tickets.booked), 0) AS total_booked
    FROM SSS.Inventory_Batch ib
    LEFT JOIN (
      SELECT inventory_batch_id, SUM(quantity) as booked
      FROM SSS.Inventory_Ticket
      GROUP BY inventory_batch_id
    ) tickets ON ib.id = tickets.inventory_batch_id
    WHERE ib.supplement_id = $1
  `;

  const result = await pool.query(query, [supplementId]);
  const row = result.rows[0];

  const totalStock = parseInt(row.total_stock);
  const totalBooked = parseInt(row.total_booked);

  return {
    totalStock,
    totalBooked,
    available: totalStock - totalBooked,
  };
}

//Use Case: View Supplement Details - Inventory Batches section
export async function getBatchesBySupplementId(
  supplementId,
  pageNumber,
  pageSize = 10
) {
  const offset = (pageNumber - 1) * pageSize;

  const query = `
    SELECT 
      ib.id,
      ib.batch_number,
      ib.batch_initial_quantity,
      ib.batch_expiration_date,
      ib.batch_price,
      COALESCE(SUM(it.quantity), 0) AS booked,
      ib.batch_initial_quantity - COALESCE(SUM(it.quantity), 0) AS available,
      bssl.batch_stock_status AS batch_status
    FROM SSS.Inventory_Batch ib
    LEFT JOIN SSS.Inventory_Ticket it ON ib.id = it.inventory_batch_id
    LEFT JOIN SSS.Batch_Stock_Status_Lookup bssl ON ib.batch_stock_status_id = bssl.id
    WHERE ib.supplement_id = $1
      AND bssl.is_active = true
    GROUP BY ib.id, ib.batch_number, ib.batch_initial_quantity, 
             ib.batch_expiration_date, ib.batch_price, bssl.batch_stock_status
    ORDER BY ib.id DESC
    LIMIT $2 OFFSET $3
  `;

  return await pool.query(query, [supplementId, pageSize, offset]);
}

//Use Case: View Supplement Details - Inventory Batches section (total count)
export async function getBatchCountBySupplementId(supplementId) {
  const query = `
    SELECT COUNT(*) 
    FROM SSS.Inventory_Batch ib
    JOIN SSS.Batch_Stock_Status_Lookup bssl 
      ON ib.batch_stock_status_id = bssl.id
    WHERE ib.supplement_id = $1
      AND bssl.is_active = true
  `;

  const result = await pool.query(query, [supplementId]);
  return parseInt(result.rows[0].count);
}

//Use Case: Create New Supplement
export async function createSupplement(supplementData) {
  const query = `
    INSERT INTO SSS.Supplement (
      supplement_name,
      supplement_brand,
      supplement_packaging_form_id,
      supplement_status_id,
      approved_by,
      batch_testing_org,
      supplement_description,
      supplement_ingredient,
      nutritional_info_per_100g,
      nutritional_info_per_serving,
      nutritional_info_per_serving_definition,
      supplement_warning_label,
      supplement_certifications,
      supplement_additional_information,
      source_url,
      supplement_input_type
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
    )
    RETURNING 
      id,
      supplement_name,
      supplement_brand,
      supplement_packaging_form_id,
      supplement_status_id,
      approved_by,
      batch_testing_org,
      supplement_input_type
  `;

  const values = [
    supplementData.supplement_name, // $1
    supplementData.supplement_brand, // $2
    supplementData.supplement_packaging_form_id, // $3
    supplementData.supplement_status_id, // $4
    supplementData.approved_by, // $5
    supplementData.batch_testing_org, // $6
    supplementData.supplement_description, // $7
    JSON.stringify(supplementData.supplement_ingredient || []), // $8 - Convert to JSONB
    supplementData.nutritional_info_per_100g
      ? JSON.stringify(supplementData.nutritional_info_per_100g)
      : null, // $9 - Convert to JSONB
    supplementData.nutritional_info_per_serving
      ? JSON.stringify(supplementData.nutritional_info_per_serving)
      : null, // $10 - Convert to JSONB
    supplementData.nutritional_info_per_serving_definition, // $11
    supplementData.supplement_warning_label, // $12
    supplementData.supplement_certifications, // $13
    supplementData.supplement_additional_information, // $14
    supplementData.source_url, // $15
    supplementData.supplement_input_type || "Manual", // $16
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

//Use Case: Create New Supplement
//Check if a supplement with the same name and brand already exists
export async function checkDuplicateSupplement(name, brand, excludeId = null) {
  let query = `
    SELECT id FROM SSS.Supplement 
    WHERE LOWER(supplement_name) = LOWER($1)
  `;

  const params = [name];

  // If brand is provided, include in check
  if (brand) {
    query += ` AND LOWER(supplement_brand) = LOWER($2)`;
    params.push(brand);
  } else {
    query += ` AND supplement_brand IS NULL`;
  }

  // Exclude specific ID (useful for updates)
  if (excludeId) {
    query += ` AND id != $${params.length + 1}`;
    params.push(excludeId);
  }

  query += ` LIMIT 1`;

  const result = await pool.query(query, params);
  return result.rows.length > 0;
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

  // Build WHERE conditions for each search word - using CTE column names
  const whereConditions = searchWords
    .map((_, index) => {
      const paramIndex = index + 1;
      return `(
      batch_number ILIKE $${paramIndex} OR
      supplement_name ILIKE $${paramIndex} OR
      supplement_brand ILIKE $${paramIndex} OR
      batch_status ILIKE $${paramIndex}
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
