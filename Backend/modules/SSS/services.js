import pool from "../../config/db.js";

// Configuration
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';


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
      s.product_source_url
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
      s.product_source_url,
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
      s.product_source_url,
      s.supplement_warning_label,
      s.supplement_certifications,
      s.batch_testing_org,
      s.supplement_packaging_form_id,
      s.supplement_status_id
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
      product_source_url,
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

  // Ensure URLs are in array format
  const urlArray = supplementData.product_source_url
    ? (Array.isArray(supplementData.product_source_url)
      ? supplementData.product_source_url
      : [supplementData.product_source_url])
    : null;

  const values = [
    supplementData.supplement_name, // $1
    supplementData.supplement_brand || null, // $2
    supplementData.supplement_packaging_form_id, // $3
    supplementData.supplement_status_id, // $4
    supplementData.approved_by, // $5
    supplementData.batch_testing_org || null, // $6
    supplementData.supplement_description || null, // $7
    supplementData.supplement_ingredient && supplementData.supplement_ingredient.length > 0
      ? JSON.stringify(supplementData.supplement_ingredient)
      : '[]', // $8 - ✅ JSONB: stringify array
    supplementData.nutritional_info_per_100g
      ? JSON.stringify(supplementData.nutritional_info_per_100g)
      : null, // $9 - ✅ JSONB: stringify object
    supplementData.nutritional_info_per_serving
      ? JSON.stringify(supplementData.nutritional_info_per_serving)
      : null, // $10 - ✅ JSONB: stringify object
    supplementData.nutritional_info_per_serving_definition || null, // $11
    supplementData.supplement_warning_label || null, // $12
    supplementData.supplement_certifications || null, // $13
    supplementData.supplement_additional_information || null, // $14
    urlArray, // $15 - TEXT[]: pg handles array conversion
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

//Use Case: Edit Supplement (Partial Update)
export async function updateSupplement(supplementId, updateData) {
  // Build dynamic UPDATE query based on provided fields
  const fields = [];
  const values = [];
  let paramCounter = 1;

  // Map of field names to their values
  const fieldMapping = {
    supplement_name: updateData.supplement_name,
    supplement_brand: updateData.supplement_brand,
    supplement_packaging_form_id: updateData.supplement_packaging_form_id,
    supplement_status_id: updateData.supplement_status_id,
    batch_testing_org: updateData.batch_testing_org,
    supplement_description: updateData.supplement_description,
    supplement_ingredient: updateData.supplement_ingredient
      ? JSON.stringify(updateData.supplement_ingredient)  // ✅ Stringify for JSONB
      : undefined,
    nutritional_info_per_100g: updateData.nutritional_info_per_100g
      ? JSON.stringify(updateData.nutritional_info_per_100g)  // ✅ Stringify for JSONB
      : undefined,
    nutritional_info_per_serving: updateData.nutritional_info_per_serving
      ? JSON.stringify(updateData.nutritional_info_per_serving)  // ✅ Stringify for JSONB
      : undefined,
    nutritional_info_per_serving_definition: updateData.nutritional_info_per_serving_definition,
    supplement_warning_label: updateData.supplement_warning_label,
    supplement_certifications: updateData.supplement_certifications,
    supplement_additional_information: updateData.supplement_additional_information,
    product_source_url: updateData.product_source_url
      ? (Array.isArray(updateData.product_source_url)
        ? updateData.product_source_url
        : [updateData.product_source_url])
      : undefined  // TEXT[]: pg handles array conversion
  };

  // Build SET clause dynamically
  for (const [field, value] of Object.entries(fieldMapping)) {
    if (value !== undefined) {
      fields.push(`${field} = $${paramCounter}`);
      values.push(value);
      paramCounter++;
    }
  }

  // If no fields to update, return null
  if (fields.length === 0) {
    return null;
  }

  // Add supplement ID as the last parameter
  values.push(supplementId);

  const query = `
    UPDATE SSS.Supplement 
    SET ${fields.join(', ')}
    WHERE id = $${paramCounter}
    RETURNING 
      id,
      supplement_name,
      supplement_brand,
      supplement_packaging_form_id,
      supplement_status_id,
      batch_testing_org,
      supplement_description,
      supplement_ingredient,
      nutritional_info_per_100g,
      nutritional_info_per_serving,
      nutritional_info_per_serving_definition,
      supplement_warning_label,
      supplement_certifications,
      supplement_additional_information,
      product_source_url
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
}

//Use Case: Delete Supplement (Hard Delete - Bulk)
export async function deleteSupplements(supplementIds) {
  const query = `
    DELETE FROM SSS.Supplement 
    WHERE id = ANY($1::uuid[])
    RETURNING id
  `;

  const result = await pool.query(query, [supplementIds]);
  return result.rows;
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

/**
 * Use Case: View Batch Details (Helper for Update/Delete)
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
 * Use Case: Create Batch
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

  // Exclude specific ID (useful for updates)
  if (excludeId) {
    query += ` AND id != $3`;
    params.push(excludeId);
  }

  query += ` LIMIT 1`;

  const result = await pool.query(query, params);
  return result.rows.length > 0;
}

/**
 * Use Case: Delete Batch
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
 * Use Case: Create Batch (UC-SSS-012)
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
    batchData.supplement_id,                    // $1
    batchData.batch_stock_status_id,            // $2 - auto-set by controller
    batchData.batch_number,                     // $3
    batchData.batch_initial_quantity,           // $4
    batchData.batch_price || null,              // $5
    batchData.batch_expiration_date || null,    // $6
    batchData.batch_manufacture_date || null    // $7
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Use Case: Update Batch (UC-SSS-013)
 * Update one or more fields of an existing batch (partial update)
 */
export async function updateBatch(batchId, updateData) {
  // Build dynamic UPDATE query based on provided fields
  const fields = [];
  const values = [];
  let paramCounter = 1;

  // Map of field names to their values
  const fieldMapping = {
    supplement_id: updateData.supplement_id,
    batch_number: updateData.batch_number,
    batch_initial_quantity: updateData.batch_initial_quantity,
    batch_price: updateData.batch_price,
    batch_expiration_date: updateData.batch_expiration_date,
    batch_manufacture_date: updateData.batch_manufacture_date
  };

  // Build SET clause dynamically
  for (const [field, value] of Object.entries(fieldMapping)) {
    if (value !== undefined) {
      fields.push(`${field} = $${paramCounter}`);
      values.push(value);
      paramCounter++;
    }
  }

  // If no fields to update, return null
  if (fields.length === 0) {
    return null;
  }

  // Add batch ID as the last parameter
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
 * Use Case: Delete Batch (UC-SSS-014)
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
// ============================================================================
// SUPPLEMENT STAGING SERVICES
// ============================================================================

/**
 * Get paginated list of unreviewed supplement staging entries
 * @param {number} pageNumber - Page number (1-indexed)
 * @param {number} pageSize - Items per page (default 10)
 * @returns {Promise<Object>} Query result with rows
 */
export async function getStagingSupplementsByPage(pageNumber, pageSize = 10) {
  const offset = (pageNumber - 1) * pageSize;

  const query = `
        SELECT 
            ss.id,
            ss.supplement_name,
            ss.supplement_brand,
            spf.supplement_packaging_form,
            ssl.supplement_status,
            ss.product_source_url,
            ss.is_reviewed
        FROM SSS.Supplement_Staging ss
        LEFT JOIN SSS.Supplement_Packaging_Form_Lookup spf 
            ON ss.supplement_packaging_form_id = spf.id
        LEFT JOIN SSS.Supplement_Status_Lookup ssl
            ON ss.supplement_status_id = ssl.id
        WHERE ss.is_reviewed = false
        ORDER BY ss.id DESC
        LIMIT $1 OFFSET $2
    `;

  return await pool.query(query, [pageSize, offset]);
}

/**
 * Get total count of unreviewed supplement staging entries
 * @returns {Promise<number>} Total count
 */
export async function getTotalStagingCount() {
  const query = `
        SELECT COUNT(*) as count
        FROM SSS.Supplement_Staging
        WHERE is_reviewed = false
    `;

  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
}

/**
 * Get single supplement staging entry by ID with all details
 * @param {string} stagingId - UUID of staging supplement
 * @returns {Promise<Object|null>} Staging supplement object or null if not found
 */
export async function getStagingSupplementById(stagingId) {
  const query = `
        SELECT 
            ss.id,
            ss.supplement_name,
            ss.supplement_brand,
            ss.supplement_description,
            ss.supplement_ingredient,
            ss.nutritional_info_per_100g,
            ss.nutritional_info_per_serving,
            ss.nutritional_info_per_serving_definition,
            ss.supplement_warning_label,
            ss.supplement_certifications,
            ss.supplement_additional_information,
            ss.batch_testing_org,
            ss.product_source_url,
            ss.scraper_version,
            ss.webscraper_catalog_url_id,
            ss.is_reviewed,
            ss.supplement_packaging_form_id,
            spf.supplement_packaging_form,
            ss.supplement_status_id,
            ssl.supplement_status
        FROM SSS.Supplement_Staging ss
        LEFT JOIN SSS.Supplement_Packaging_Form_Lookup spf 
            ON ss.supplement_packaging_form_id = spf.id
        LEFT JOIN SSS.Supplement_Status_Lookup ssl
            ON ss.supplement_status_id = ssl.id
        WHERE ss.id = $1
    `;

  const result = await pool.query(query, [stagingId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Update supplement staging entry with partial data
 * @param {string} stagingId - UUID of staging supplement
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated staging supplement or null if not found
 */
export async function updateStagingSupplement(stagingId, updateData) {
  const fields = [];
  const values = [];
  let paramCounter = 1;

  // Map of field names to their values
  const fieldMapping = {
    supplement_name: updateData.supplement_name,
    supplement_brand: updateData.supplement_brand,
    supplement_packaging_form_id: updateData.supplement_packaging_form_id,
    supplement_status_id: updateData.supplement_status_id,
    supplement_description: updateData.supplement_description,
    supplement_ingredient: updateData.supplement_ingredient
      ? JSON.stringify(updateData.supplement_ingredient)
      : undefined,
    nutritional_info_per_100g: updateData.nutritional_info_per_100g
      ? JSON.stringify(updateData.nutritional_info_per_100g)
      : undefined,
    nutritional_info_per_serving: updateData.nutritional_info_per_serving
      ? JSON.stringify(updateData.nutritional_info_per_serving)
      : undefined,
    nutritional_info_per_serving_definition: updateData.nutritional_info_per_serving_definition,
    supplement_warning_label: updateData.supplement_warning_label,
    supplement_certifications: updateData.supplement_certifications,
    supplement_additional_information: updateData.supplement_additional_information,
    batch_testing_org: updateData.batch_testing_org,
    product_source_url: updateData.product_source_url
      ? (Array.isArray(updateData.product_source_url)
        ? updateData.product_source_url
        : [updateData.product_source_url])
      : undefined,
    scraper_version: updateData.scraper_version,
  };

  // Build SET clause dynamically
  for (const [field, value] of Object.entries(fieldMapping)) {
    if (value !== undefined) {
      fields.push(`${field} = $${paramCounter}`);
      values.push(value);
      paramCounter++;
    }
  }

  // If no fields to update, return null
  if (fields.length === 0) {
    return null;
  }

  // Add staging ID as the last parameter
  values.push(stagingId);

  const query = `
        UPDATE SSS.Supplement_Staging 
        SET ${fields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
    `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Delete multiple supplement staging entries
 * @param {Array<string>} stagingIds - Array of UUIDs to delete
 * @returns {Promise<Array>} Array of deleted row objects with ids
 */
export async function deleteStagingSupplements(stagingIds) {
  const query = `
        DELETE FROM SSS.Supplement_Staging
        WHERE id = ANY($1::uuid[])
        RETURNING id
    `;

  const result = await pool.query(query, [stagingIds]);
  return result.rows;
}

/**
 * Generate vectors for a supplement using Python service
 * @param {Object} supplementData - Supplement data with ingredients and nutrition
 * @returns {Promise<Object>} Vectorization result or error status
 */
async function generateVectorsForSupplement(supplementData) {
  try {
    // Extract and prepare data
    const ingredients = supplementData.supplement_ingredient || [];
    const perServing = supplementData.nutritional_info_per_serving || {};
    const per100g = supplementData.nutritional_info_per_100g || {};

    // Skip vectorization if no data available
    if (ingredients.length === 0 && Object.keys(perServing).length === 0 && Object.keys(per100g).length === 0) {
      return {
        success: false,
        reason: 'No ingredients or nutritional data available',
        vector_perserving_ingredient: null,
        vector_100g_ingredient: null
      };
    }

    // Call Python service
    const response = await fetch(`${PYTHON_SERVICE_URL}/api/vectorization/generate-product-vectors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ingredients: ingredients,
        per_serving: perServing,
        per_100g: per100g
      }),
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Python service error:', errorText);
      return {
        success: false,
        reason: `Python service returned ${response.status}`,
        vector_perserving_ingredient: null,
        vector_100g_ingredient: null
      };
    }

    const result = await response.json();

    if (result.success) {
      return {
        success: true,
        vector_perserving_ingredient: result.vector_perserving_ingredient,
        vector_100g_ingredient: result.vector_100g_ingredient,
        dimension: result.dimension
      };
    } else {
      return {
        success: false,
        reason: 'Python service returned success=false',
        vector_perserving_ingredient: null,
        vector_100g_ingredient: null
      };
    }

  } catch (error) {
    console.error('Vectorization error:', error);
    return {
      success: false,
      reason: error.message,
      vector_perserving_ingredient: null,
      vector_100g_ingredient: null
    };
  }
}

/**
 * Approve staging entries and create supplements
 * @param {Array<string>} stagingIds - Array of staging UUIDs to approve
 * @returns {Promise<Object>} Approval results with success/failure details
 */
export async function approveStagingSupplements(stagingIds) {
  const results = [];

  for (const stagingId of stagingIds) {
    try {
      // 1. Get staging entry
      const staging = await getStagingSupplementById(stagingId);

      if (!staging) {
        results.push({
          staging_id: stagingId,
          staging_name: null,
          status: 'failed',
          reason: 'Staging entry not found',
          supplement_id: null
        });
        continue;
      }

      // 2. Validate required fields for Supplement table
      const missingFields = [];
      if (!staging.supplement_packaging_form_id) {
        missingFields.push('supplement_packaging_form_id');
      }
      if (!staging.supplement_status_id) {
        missingFields.push('supplement_status_id');
      }

      if (missingFields.length > 0) {
        results.push({
          staging_id: stagingId,
          staging_name: staging.supplement_name,
          status: 'failed',
          reason: `Missing required fields: ${missingFields.join(', ')}`,
          supplement_id: null
        });
        continue;
      }

      // 3. Apply batch_testing_org logic
      const statusResult = await pool.query(
        'SELECT supplement_status FROM SSS.Supplement_Status_Lookup WHERE id = $1',
        [staging.supplement_status_id]
      );
      const statusName = statusResult.rows[0]?.supplement_status;
      const normalizedStatus = statusName?.toUpperCase().trim();

      let finalBatchTestingOrg = staging.batch_testing_org;

      if (normalizedStatus === 'BATCH TESTED') {
        if (!finalBatchTestingOrg || finalBatchTestingOrg.trim() === '' || finalBatchTestingOrg === 'NIL') {
          results.push({
            staging_id: stagingId,
            staging_name: staging.supplement_name,
            status: 'failed',
            reason: 'batch_testing_org is required when status is BATCH TESTED',
            supplement_id: null
          });
          continue;
        }
      } else if (normalizedStatus === 'NOT BATCH TESTED') {
        finalBatchTestingOrg = 'NIL';
      }

      // 4. Create Supplement record
      const insertQuery = `
                INSERT INTO SSS.Supplement (
                    supplement_name,
                    supplement_brand,
                    supplement_packaging_form_id,
                    supplement_status_id,
                    supplement_description,
                    supplement_ingredient,
                    nutritional_info_per_100g,
                    nutritional_info_per_serving,
                    nutritional_info_per_serving_definition,
                    supplement_warning_label,
                    supplement_certifications,
                    supplement_additional_information,
                    batch_testing_org,
                    product_source_url,
                    scraper_version,
                    supplement_input_type,
                    approved_by,
                    supplement_staging_id
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
                )
                RETURNING *
            `;

      const insertValues = [
        staging.supplement_name,
        staging.supplement_brand || null,
        staging.supplement_packaging_form_id,
        staging.supplement_status_id,
        staging.supplement_description || null,
        staging.supplement_ingredient && staging.supplement_ingredient.length > 0
          ? JSON.stringify(staging.supplement_ingredient)
          : '[]',
        staging.nutritional_info_per_100g
          ? JSON.stringify(staging.nutritional_info_per_100g)
          : null,
        staging.nutritional_info_per_serving
          ? JSON.stringify(staging.nutritional_info_per_serving)
          : null,
        staging.nutritional_info_per_serving_definition || null,
        staging.supplement_warning_label || null,
        staging.supplement_certifications || null,
        staging.supplement_additional_information || null,
        finalBatchTestingOrg,
        staging.product_source_url || null,
        staging.scraper_version || null,
        'Scraper', // supplement_input_type
        'e9e9f927-40f4-4f0a-bdca-a5503b5974da', // approved_by (hardcoded Dr. Khoo)
        stagingId // supplement_staging_id
      ];

      const supplementResult = await pool.query(insertQuery, insertValues);
      const newSupplement = supplementResult.rows[0];

      // 5. Mark staging as reviewed
      await pool.query(
        'UPDATE SSS.Supplement_Staging SET is_reviewed = true WHERE id = $1',
        [stagingId]
      );

      // 6. Generate vectors using Python service
      console.log(`Generating vectors for supplement ${newSupplement.id}...`);
      const vectorizationResult = await generateVectorsForSupplement(staging);

      // 7. Update supplement with vectors if successful
      if (vectorizationResult.success) {
        try {
          const updateVectorQuery = `
            UPDATE SSS.Supplement
            SET 
              vector_100g_ingredient = $1::vector,
              vector_perserving_ingredient = $2::vector
            WHERE id = $3
          `;

          await pool.query(updateVectorQuery, [
            vectorizationResult.vector_100g_ingredient
              ? JSON.stringify(vectorizationResult.vector_100g_ingredient)
              : null,
            vectorizationResult.vector_perserving_ingredient
              ? JSON.stringify(vectorizationResult.vector_perserving_ingredient)
              : null,
            newSupplement.id
          ]);

          console.log(`✅ Vectors generated and stored for supplement ${newSupplement.id}`);
        } catch (updateError) {
          console.error(`Failed to update vectors for supplement ${newSupplement.id}:`, updateError);
          // Don't fail the entire approval - supplement still created
        }
      } else {
        console.warn(`⚠️ Vectorization failed for supplement ${newSupplement.id}: ${vectorizationResult.reason}`);
      }

      // 8. Build response
      results.push({
        staging_id: stagingId,
        staging_name: staging.supplement_name,
        status: 'success',
        supplement_id: newSupplement.id,
        vectorization: {
          status: vectorizationResult.success ? 'generated' : 'failed',
          reason: vectorizationResult.success ? undefined : vectorizationResult.reason,
          vector_100g: vectorizationResult.success
            ? `${vectorizationResult.dimension}d vector generated`
            : null,
          vector_perserving: vectorizationResult.success
            ? `${vectorizationResult.dimension}d vector generated`
            : null
        }
      });

    } catch (error) {
      console.error(`Failed to approve staging ${stagingId}:`, error);
      results.push({
        staging_id: stagingId,
        staging_name: null,
        status: 'failed',
        reason: `Database error: ${error.message}`,
        supplement_id: null
      });
    }
  }

  return {
    totalProcessed: results.length,
    succeeded: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'failed').length,
    results: results
  };
}

// ============================================================================
// ALTERNATIVE SUPPLEMENTS (SIMILARITY SEARCH)
// ============================================================================

/**
 * Get stock status map for multiple supplements
 * Determines stock availability based on batch statuses
 * Priority: AVAILABLE > LOW STOCK > OUT OF STOCK
 * 
 * @param {Array<string>} supplementIds - Array of supplement UUIDs
 * @returns {Promise<Object>} Map of supplement_id -> stock_status
 */
export async function getStockStatusMap(supplementIds) {
  if (!supplementIds || supplementIds.length === 0) {
    return {};
  }

  const query = `
        SELECT 
            ib.supplement_id,
            CASE
                WHEN COUNT(CASE WHEN bssl.batch_stock_status = 'AVAILABLE' THEN 1 END) > 0 
                    THEN 'Available'
                WHEN COUNT(CASE WHEN bssl.batch_stock_status = 'LOW STOCK' THEN 1 END) > 0 
                    THEN 'Low Stock'
                ELSE 'Out of Stock'
            END AS stock_status
        FROM SSS.Inventory_Batch ib
        LEFT JOIN SSS.Batch_Stock_Status_Lookup bssl 
            ON ib.batch_stock_status_id = bssl.id
        WHERE ib.supplement_id = ANY($1::uuid[])
            AND bssl.is_active = true
        GROUP BY ib.supplement_id
    `;

  const result = await pool.query(query, [supplementIds]);

  // Create a map for easy lookup
  const stockMap = {};
  result.rows.forEach(row => {
    stockMap[row.supplement_id] = row.stock_status;
  });

  // For supplements with no batches, set to "Out of Stock"
  supplementIds.forEach(id => {
    if (!stockMap[id]) {
      stockMap[id] = 'Out of Stock';
    }
  });

  return stockMap;
}

/**
 * Get alternative supplements using vector similarity search
 * Uses both vector_100g_ingredient and vector_perserving_ingredient
 * Orders by the higher similarity score
 * 
 * @param {string} supplementId - UUID of current supplement
 * @param {number} pageNumber - Page number (1-indexed)
 * @param {number} pageSize - Items per page (default 10)
 * @returns {Promise<Object>} Alternative supplements with pagination
 */
export async function getAlternativeSupplements(supplementId, pageNumber, pageSize = 10) {
  const offset = (pageNumber - 1) * pageSize;

  // Import threshold from validation
  const { SIMILARITY_THRESHOLD } = await import('./validation.js');

  // STEP 1: Get current supplement's vectors
  const currentQuery = `
        SELECT 
            id,
            supplement_name,
            vector_100g_ingredient,
            vector_perserving_ingredient,
            supplement_status_id
        FROM SSS.Supplement
        WHERE id = $1
    `;

  const currentResult = await pool.query(currentQuery, [supplementId]);

  if (currentResult.rows.length === 0) {
    return { error: 'SUPPLEMENT_NOT_FOUND' };
  }

  const currentSupplement = currentResult.rows[0];

  // STEP 2: Check if vectors exist
  if (!currentSupplement.vector_100g_ingredient && !currentSupplement.vector_perserving_ingredient) {
    return { error: 'NO_VECTORS' };
  }

  // STEP 3: Get DISCONTINUED status ID to exclude
  const discontinuedQuery = `
        SELECT id FROM SSS.Supplement_Status_Lookup 
        WHERE UPPER(supplement_status) = 'DISCONTINUED' 
            AND is_active = true
    `;
  const discontinuedResult = await pool.query(discontinuedQuery);
  const discontinuedStatusId = discontinuedResult.rows[0]?.id;

  // STEP 4: Build similarity search query
  // Calculate both similarities, use GREATEST for ordering
  const hasVector100g = currentSupplement.vector_100g_ingredient !== null;
  const hasVectorPerServing = currentSupplement.vector_perserving_ingredient !== null;

  const query = `
        WITH alternative_supplements AS (
            SELECT 
                s.id,
                s.supplement_name,
                s.supplement_brand,
                ssl.supplement_status,
                s.supplement_status_id,
                ${hasVector100g
      ? `1 - (s.vector_100g_ingredient <=> $1::vector) AS similarity_100g,`
      : 'NULL AS similarity_100g,'}
                ${hasVectorPerServing
      ? `1 - (s.vector_perserving_ingredient <=> $2::vector) AS similarity_perserving,`
      : 'NULL AS similarity_perserving,'}
                GREATEST(
                    ${hasVector100g ? `COALESCE(1 - (s.vector_100g_ingredient <=> $1::vector), 0)` : '0'},
                    ${hasVectorPerServing ? `COALESCE(1 - (s.vector_perserving_ingredient <=> $2::vector), 0)` : '0'}
                ) AS max_similarity
            FROM SSS.Supplement s
            LEFT JOIN SSS.Supplement_Status_Lookup ssl 
                ON s.supplement_status_id = ssl.id
            WHERE s.id != $3
                AND ssl.is_active = true
                ${discontinuedStatusId ? `AND s.supplement_status_id != $4` : ''}
                AND (
                    ${hasVector100g
      ? `(s.vector_100g_ingredient IS NOT NULL 
                           AND 1 - (s.vector_100g_ingredient <=> $1::vector) >= $${discontinuedStatusId ? '5' : '4'})`
      : 'FALSE'}
                    ${hasVector100g && hasVectorPerServing ? 'OR' : ''}
                    ${hasVectorPerServing
      ? `(s.vector_perserving_ingredient IS NOT NULL 
                           AND 1 - (s.vector_perserving_ingredient <=> $2::vector) >= $${discontinuedStatusId ? '5' : '4'})`
      : 'FALSE'}
                )
        )
        SELECT * FROM alternative_supplements
        ORDER BY max_similarity DESC
        LIMIT $${discontinuedStatusId ? '6' : '5'} 
        OFFSET $${discontinuedStatusId ? '7' : '6'}
    `;

  // Build parameters array
  const params = [
    hasVector100g ? currentSupplement.vector_100g_ingredient : null,
    hasVectorPerServing ? currentSupplement.vector_perserving_ingredient : null,
    supplementId
  ];

  if (discontinuedStatusId) {
    params.push(discontinuedStatusId);
  }

  params.push(SIMILARITY_THRESHOLD, pageSize, offset);

  // Execute query
  const alternatives = await pool.query(query, params);

  // STEP 5: Get total count for pagination
  const countQuery = `
        SELECT COUNT(*) as count
        FROM SSS.Supplement s
        LEFT JOIN SSS.Supplement_Status_Lookup ssl 
            ON s.supplement_status_id = ssl.id
        WHERE s.id != $3
            AND ssl.is_active = true
            ${discontinuedStatusId ? `AND s.supplement_status_id != $4` : ''}
            AND (
                ${hasVector100g
      ? `(s.vector_100g_ingredient IS NOT NULL 
                       AND 1 - (s.vector_100g_ingredient <=> $1::vector) >= $${discontinuedStatusId ? '5' : '4'})`
      : 'FALSE'}
                ${hasVector100g && hasVectorPerServing ? 'OR' : ''}
                ${hasVectorPerServing
      ? `(s.vector_perserving_ingredient IS NOT NULL 
                       AND 1 - (s.vector_perserving_ingredient <=> $2::vector) >= $${discontinuedStatusId ? '5' : '4'})`
      : 'FALSE'}
            )
    `;

  const countParams = params.slice(0, discontinuedStatusId ? 5 : 4);
  const countResult = await pool.query(countQuery, countParams);

  return {
    currentSupplement: {
      id: currentSupplement.id,
      name: currentSupplement.supplement_name
    },
    alternatives: alternatives.rows,
    totalCount: parseInt(countResult.rows[0].count)
  };
}

// ============================================================================
// LOOKUP SERVICES
// ============================================================================

/**
 * Get all packaging form options for dropdowns
 * @param {boolean} activeOnly - Filter by is_active (default true)
 * @returns {Promise<Object>} Query result with rows
 */
export async function getPackagingForms(activeOnly = true) {
  const query = `
        SELECT 
            id,
            supplement_packaging_form as label
        FROM SSS.Supplement_Packaging_Form_Lookup
        ${activeOnly ? 'WHERE is_active = true' : ''}
        ORDER BY supplement_packaging_form ASC
    `;

  return await pool.query(query);
}

/**
 * Get all supplement status options for dropdowns
 * @param {boolean} activeOnly - Filter by is_active (default true)
 * @returns {Promise<Object>} Query result with rows
 */
export async function getSupplementStatuses(activeOnly = true) {
  const query = `
        SELECT 
            id,
            supplement_status as label
        FROM SSS.Supplement_Status_Lookup
        ${activeOnly ? 'WHERE is_active = true' : ''}
        ORDER BY supplement_status ASC
    `;

  return await pool.query(query);
}

/**
 * Get all batch stock status options for dropdowns
 * @param {boolean} activeOnly - Filter by is_active (default true)
 * @returns {Promise<Object>} Query result with rows
 */
export async function getBatchStockStatuses(activeOnly = true) {
  const query = `
        SELECT 
            id,
            batch_stock_status as label
        FROM SSS.Batch_Stock_Status_Lookup
        ${activeOnly ? 'WHERE is_active = true' : ''}
        ORDER BY batch_stock_status ASC
    `;

  return await pool.query(query);
}

/**
 * Get all ticket status options for dropdowns
 * @param {boolean} activeOnly - Filter by is_active (default true)
 * @returns {Promise<Object>} Query result with rows
 */
export async function getTicketStatuses(activeOnly = true) {
  const query = `
        SELECT 
            id,
            ticket_status as label
        FROM SSS.Ticket_Status_Lookup
        ${activeOnly ? 'WHERE is_active = true' : ''}
        ORDER BY ticket_status ASC
    `;

  return await pool.query(query);
};

// ============================================================================
// CATALOG URL MANAGEMENT
// ============================================================================

/**
 * Get all catalog URLs (paginated)
 * @param {number} pageNumber - Page number (1-indexed)
 * @param {number} pageSize - Items per page (default 10)
 * @returns {Promise<Object>} Query result with rows
 */
export async function getCatalogUrls(pageNumber, pageSize = 10) {
  const offset = (pageNumber - 1) * pageSize;

  const query = `
        SELECT 
            id,
            product_catalog_website,
            is_active
        FROM webscraper_catalog_url
        ORDER BY id DESC
        LIMIT $1 OFFSET $2
    `;

  return await pool.query(query, [pageSize, offset]);
}

/**
 * Get total count of catalog URLs
 * @returns {Promise<number>} Total count
 */
export async function getTotalCatalogUrlCount() {
  const query = `SELECT COUNT(*) as count FROM webscraper_catalog_url`;
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
}

/**
 * Get catalog URL by ID
 * @param {string} catalogUrlId - UUID of catalog URL
 * @returns {Promise<Object|null>} Catalog URL object or null
 */
export async function getCatalogUrlById(catalogUrlId) {
  const query = `
        SELECT 
            id,
            product_catalog_website,
            is_active
        FROM webscraper_catalog_url
        WHERE id = $1
    `;

  const result = await pool.query(query, [catalogUrlId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Create new catalog URL
 * @param {Object} catalogUrlData - Catalog URL data
 * @returns {Promise<Object>} Created catalog URL
 */
export async function createCatalogUrl(catalogUrlData) {
  const query = `
        INSERT INTO webscraper_catalog_url (
            product_catalog_website,
            is_active,
            number_of_catalog_page
        ) VALUES ($1, $2, NULL)
        RETURNING 
            id,
            product_catalog_website,
            is_active
    `;

  const values = [
    catalogUrlData.product_catalog_website,
    catalogUrlData.is_active !== undefined ? catalogUrlData.is_active : true
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Check for duplicate catalog URL
 * @param {string} websiteUrl - URL to check
 * @param {string} excludeId - ID to exclude (for updates)
 * @returns {Promise<boolean>} True if duplicate exists
 */
export async function checkDuplicateCatalogUrl(websiteUrl, excludeId = null) {
  let query = `
        SELECT id FROM webscraper_catalog_url 
        WHERE product_catalog_website = $1
    `;

  const params = [websiteUrl];

  if (excludeId) {
    query += ` AND id != $2`;
    params.push(excludeId);
  }

  query += ` LIMIT 1`;

  const result = await pool.query(query, params);
  return result.rows.length > 0;
}

/**
 * Update catalog URL
 * @param {string} catalogUrlId - UUID of catalog URL
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object|null>} Updated catalog URL or null
 */
export async function updateCatalogUrl(catalogUrlId, updateData) {
  const fields = [];
  const values = [];
  let paramCounter = 1;

  const fieldMapping = {
    product_catalog_website: updateData.product_catalog_website,
    is_active: updateData.is_active
  };

  // Build SET clause dynamically
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

  values.push(catalogUrlId);

  const query = `
        UPDATE webscraper_catalog_url 
        SET ${fields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING 
            id,
            product_catalog_website,
            is_active
    `;

  const result = await pool.query(query, values);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Delete catalog URLs (bulk)
 * @param {Array<string>} catalogUrlIds - Array of UUIDs to delete
 * @returns {Promise<Array>} Array of deleted row objects
 */
export async function deleteCatalogUrls(catalogUrlIds) {
  const query = `
        DELETE FROM webscraper_catalog_url
        WHERE id = ANY($1::uuid[])
        RETURNING id, product_catalog_website
    `;

  const result = await pool.query(query, [catalogUrlIds]);
  return result.rows;
}

/**
 * Get active catalog URLs (all or selected)
 * @param {Array<string>} catalogUrlIds - Optional array of IDs to filter
 * @returns {Promise<Array>} Array of catalog URL objects with {id, product_catalog_website}
 */
export async function getActiveCatalogUrls(catalogUrlIds = null) {
  let query = `
        SELECT id, product_catalog_website
        FROM webscraper_catalog_url
        WHERE is_active = true
    `;

  const params = [];

  if (catalogUrlIds && catalogUrlIds.length > 0) {
    query += ` AND id = ANY($1::uuid[])`;
    params.push(catalogUrlIds);
  }

  query += ` ORDER BY id`;

  const result = await pool.query(query, params);
  return result.rows;
}
