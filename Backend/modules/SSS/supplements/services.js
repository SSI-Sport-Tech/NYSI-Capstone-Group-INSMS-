import pool, { withUserContext } from "../../../config/db.js";
import { SIMILARITY_THRESHOLD } from './validation.js';

// ============================================================================
// SUPPLEMENT CRUD FUNCTIONS
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
      btol.batch_testing_org,
      s.product_source_url
    FROM SSS.Supplement s
    LEFT JOIN SSS.Supplement_Packaging_Form_Lookup spf
      ON s.supplement_packaging_form_id = spf.id
    LEFT JOIN SSS.Supplement_Status_Lookup ssl
      ON s.supplement_status_id = ssl.id
    LEFT JOIN SSS.Batch_Testing_Org_Lookup btol
      ON s.batch_testing_org_id = btol.id
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
      btol.batch_testing_org,
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
    LEFT JOIN SSS.Batch_Testing_Org_Lookup btol
      ON s.batch_testing_org_id = btol.id
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
      s.batch_testing_org_url,
      s.batch_testing_org_id,
      btol.batch_testing_org,
      s.supplement_packaging_form_id,
      s.supplement_status_id
    FROM SSS.Supplement s
    LEFT JOIN SSS.Supplement_Packaging_Form_Lookup spf
      ON s.supplement_packaging_form_id = spf.id
    LEFT JOIN SSS.Supplement_Status_Lookup ssl
      ON s.supplement_status_id = ssl.id
    LEFT JOIN SSS.Batch_Testing_Org_Lookup btol
      ON s.batch_testing_org_id = btol.id
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
      ib.batch_unit,
      ib.inv_batch_testing_org_id,
      btol.batch_testing_org AS inv_batch_testing_org,
      COALESCE(SUM(it.quantity), 0) AS booked,
      ib.batch_initial_quantity - COALESCE(SUM(it.quantity), 0) AS available,
      bssl.batch_stock_status AS batch_status,
      ib.date_added
    FROM SSS.Inventory_Batch ib
    LEFT JOIN SSS.Inventory_Ticket it ON ib.id = it.inventory_batch_id
    LEFT JOIN SSS.Batch_Stock_Status_Lookup bssl ON ib.batch_stock_status_id = bssl.id
    LEFT JOIN SSS.batch_testing_org_lookup btol ON ib.inv_batch_testing_org_id = btol.id
    WHERE ib.supplement_id = $1
      AND bssl.is_active = true
    GROUP BY ib.id, ib.batch_number, ib.batch_initial_quantity,
             ib.batch_expiration_date, ib.batch_price, ib.batch_unit,
             ib.inv_batch_testing_org_id,
             bssl.batch_stock_status, ib.date_added, btol.batch_testing_org
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
export async function createSupplement(supplementData, userId) {
  const query = `
    INSERT INTO SSS.Supplement (
      supplement_name,
      supplement_brand,
      supplement_packaging_form_id,
      supplement_status_id,
      approved_by,
      batch_testing_org_url,
      batch_testing_org_id,
      supplement_description,
      supplement_ingredient,
      nutritional_info_per_100g,
      nutritional_info_per_serving,
      nutritional_info_per_serving_definition,
      supplement_warning_label,
      supplement_certifications,
      supplement_additional_information,
      product_source_url,
      supplement_input_type,
      vector_100g_ingredient,
      vector_perserving_ingredient
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::vector, $19::vector
    )
    RETURNING
      id,
      supplement_name,
      supplement_brand,
      supplement_packaging_form_id,
      supplement_status_id,
      approved_by,
      batch_testing_org_url,
      batch_testing_org_id,
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
    supplementData.batch_testing_org_url || null, // $6
    supplementData.batch_testing_org_id || null, // $7
    supplementData.supplement_description || null, // $8
    supplementData.supplement_ingredient && supplementData.supplement_ingredient.length > 0
      ? JSON.stringify(supplementData.supplement_ingredient)
      : '[]', // $9 - JSONB: stringify array
    supplementData.nutritional_info_per_100g
      ? JSON.stringify(supplementData.nutritional_info_per_100g)
      : null, // $10 - JSONB: stringify object
    supplementData.nutritional_info_per_serving
      ? JSON.stringify(supplementData.nutritional_info_per_serving)
      : null, // $11 - JSONB: stringify object
    supplementData.nutritional_info_per_serving_definition || null, // $12
    supplementData.supplement_warning_label || null, // $13
    supplementData.supplement_certifications || null, // $14
    supplementData.supplement_additional_information || null, // $15
    urlArray, // $16 - TEXT[]: pg handles array conversion
    supplementData.supplement_input_type || "Manual", // $17
    supplementData.vector_100g_ingredient
      ? JSON.stringify(supplementData.vector_100g_ingredient)
      : null, // $18 - vector: stringify array for pgvector
    supplementData.vector_perserving_ingredient
      ? JSON.stringify(supplementData.vector_perserving_ingredient)
      : null, // $19 - vector: stringify array for pgvector
  ];

  return withUserContext(userId, async (client) => {
    const result = await client.query(query, values);
    return result.rows[0];
  });
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
export async function updateSupplement(supplementId, updateData, userId) {
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
    batch_testing_org_url: updateData.batch_testing_org_url,
    batch_testing_org_id: updateData.batch_testing_org_id,
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
    product_source_url: updateData.product_source_url
      ? (Array.isArray(updateData.product_source_url)
        ? updateData.product_source_url
        : [updateData.product_source_url])
      : undefined,
    vector_100g_ingredient: updateData.vector_100g_ingredient
      ? JSON.stringify(updateData.vector_100g_ingredient)
      : undefined,
    vector_perserving_ingredient: updateData.vector_perserving_ingredient
      ? JSON.stringify(updateData.vector_perserving_ingredient)
      : undefined
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
      batch_testing_org_url,
      batch_testing_org_id,
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

  return withUserContext(userId, async (client) => {
    const result = await client.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  });
}

//Use Case: Delete Supplement (Hard Delete - Bulk)
export async function deleteSupplements(supplementIds, userId) {
  const query = `
    DELETE FROM SSS.Supplement
    WHERE id = ANY($1::uuid[])
    RETURNING id
  `;

  return withUserContext(userId, async (client) => {
    const result = await client.query(query, [supplementIds]);
    return result.rows;
  });
}

// ============================================================================
// ALTERNATIVE SUPPLEMENTS (SIMILARITY SEARCH)
// ============================================================================

/**
 * Get stock status map for multiple supplements
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
 */
export async function getAlternativeSupplements(supplementId, pageNumber, pageSize = 10) {
  const offset = (pageNumber - 1) * pageSize;

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

  // STEP 4: Build similarity search query with dynamic parameter indices
  const hasVector100g = currentSupplement.vector_100g_ingredient !== null;
  const hasVectorPerServing = currentSupplement.vector_perserving_ingredient !== null;

  // Build params array and track indices dynamically (only include params actually used)
  const params = [];
  let paramIdx = 1;

  let v100gIdx = null;
  if (hasVector100g) {
    params.push(currentSupplement.vector_100g_ingredient);
    v100gIdx = paramIdx++;
  }

  let vServingIdx = null;
  if (hasVectorPerServing) {
    params.push(currentSupplement.vector_perserving_ingredient);
    vServingIdx = paramIdx++;
  }

  params.push(supplementId);
  const supplementIdIdx = paramIdx++;

  let discontinuedIdx = null;
  if (discontinuedStatusId) {
    params.push(discontinuedStatusId);
    discontinuedIdx = paramIdx++;
  }

  params.push(SIMILARITY_THRESHOLD);
  const thresholdIdx = paramIdx++;

  params.push(pageSize);
  const limitIdx = paramIdx++;

  params.push(offset);
  const offsetIdx = paramIdx++;

  const query = `
        WITH alternative_supplements AS (
            SELECT
                s.id,
                s.supplement_name,
                s.supplement_brand,
                ssl.supplement_status,
                s.supplement_status_id,
                ${hasVector100g
      ? `1 - (s.vector_100g_ingredient <=> $${v100gIdx}::vector) AS similarity_100g,`
      : 'NULL AS similarity_100g,'}
                ${hasVectorPerServing
      ? `1 - (s.vector_perserving_ingredient <=> $${vServingIdx}::vector) AS similarity_perserving,`
      : 'NULL AS similarity_perserving,'}
                GREATEST(
                    ${hasVector100g ? `COALESCE(1 - (s.vector_100g_ingredient <=> $${v100gIdx}::vector), 0)` : '0'},
                    ${hasVectorPerServing ? `COALESCE(1 - (s.vector_perserving_ingredient <=> $${vServingIdx}::vector), 0)` : '0'}
                ) AS max_similarity
            FROM SSS.Supplement s
            LEFT JOIN SSS.Supplement_Status_Lookup ssl
                ON s.supplement_status_id = ssl.id
            WHERE s.id != $${supplementIdIdx}
                AND ssl.is_active = true
                ${discontinuedIdx ? `AND s.supplement_status_id != $${discontinuedIdx}` : ''}
                AND (
                    ${hasVector100g
      ? `(s.vector_100g_ingredient IS NOT NULL
                           AND 1 - (s.vector_100g_ingredient <=> $${v100gIdx}::vector) >= $${thresholdIdx})`
      : 'FALSE'}
                    OR
                    ${hasVectorPerServing
      ? `(s.vector_perserving_ingredient IS NOT NULL
                           AND 1 - (s.vector_perserving_ingredient <=> $${vServingIdx}::vector) >= $${thresholdIdx})`
      : 'FALSE'}
                )
        )
        SELECT * FROM alternative_supplements
        ORDER BY max_similarity DESC
        LIMIT $${limitIdx}
        OFFSET $${offsetIdx}
    `;

  // Execute query
  const alternatives = await pool.query(query, params);

  // STEP 5: Get total count for pagination (reuse params up to threshold)
  const countParamCount = discontinuedIdx ? discontinuedIdx + 1 : supplementIdIdx + 1;
  const countParams = params.slice(0, countParamCount);

  const countQuery = `
        SELECT COUNT(*) as count
        FROM SSS.Supplement s
        LEFT JOIN SSS.Supplement_Status_Lookup ssl
            ON s.supplement_status_id = ssl.id
        WHERE s.id != $${supplementIdIdx}
            AND ssl.is_active = true
            ${discontinuedIdx ? `AND s.supplement_status_id != $${discontinuedIdx}` : ''}
            AND (
                ${hasVector100g
      ? `(s.vector_100g_ingredient IS NOT NULL
                       AND 1 - (s.vector_100g_ingredient <=> $${v100gIdx}::vector) >= $${thresholdIdx})`
      : 'FALSE'}
                OR
                ${hasVectorPerServing
      ? `(s.vector_perserving_ingredient IS NOT NULL
                       AND 1 - (s.vector_perserving_ingredient <=> $${vServingIdx}::vector) >= $${thresholdIdx})`
      : 'FALSE'}
            )
    `;

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
 * Get all batch testing org options for dropdowns
 */
export async function getBatchTestingOrgs(activeOnly = true) {
  const query = `
        SELECT
            id,
            batch_testing_org as label
        FROM SSS.batch_testing_org_lookup
        ${activeOnly ? 'WHERE is_active = true' : ''}
        ORDER BY batch_testing_org ASC
    `;

  return await pool.query(query);
}

/**
 * Get all batch stock status options for dropdowns
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
}
