import pool, { withUserContext } from "../../../config/db.js";
import { DUPLICATE_SIMILARITY_THRESHOLD, normalizeForComparison } from './validation.js';

// Configuration
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';

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
            ss.batch_testing_org,
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
 * @param {string|null} userId - auth.users.id for audit log
 * @returns {Promise<Object|null>} Updated staging supplement or null if not found
 */
export async function updateStagingSupplement(stagingId, updateData, userId) {
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

  return withUserContext(userId, async (client) => {
    const result = await client.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  });
}

/**
 * Delete multiple supplement staging entries
 * @param {Array<string>} stagingIds - Array of UUIDs to delete
 * @param {string|null} userId - auth.users.id for audit log
 * @returns {Promise<Array>} Array of deleted row objects with ids
 */
export async function deleteStagingSupplements(stagingIds, userId) {
  const query = `
        DELETE FROM SSS.Supplement_Staging
        WHERE id = ANY($1::uuid[])
        RETURNING id
    `;

  return withUserContext(userId, async (client) => {
    const result = await client.query(query, [stagingIds]);
    return result.rows;
  });
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
 * Check if a supplement with similar vectors and matching name+brand exists
 * @param {Object} vectors - Object with vector_100g_ingredient and vector_perserving_ingredient
 * @param {string} name - Supplement name to check
 * @param {string} brand - Supplement brand to check
 * @returns {Promise<Object|null>} Duplicate supplement if found, null otherwise
 */
async function checkForDuplicate(vectors, name, brand) {
  // Skip check if no vectors provided
  if (!vectors.vector_100g_ingredient && !vectors.vector_perserving_ingredient) {
    return null;
  }

  const hasVector100g = vectors.vector_100g_ingredient !== null;
  const hasVectorPerServing = vectors.vector_perserving_ingredient !== null;

  // Build SELECT columns for similarity scores
  const selectColumns = ['s.id', 's.supplement_name', 's.supplement_brand'];
  if (hasVector100g) {
    selectColumns.push('1 - (s.vector_100g_ingredient <=> $1::vector) AS similarity_100g');
  } else {
    selectColumns.push('NULL AS similarity_100g');
  }
  if (hasVectorPerServing) {
    selectColumns.push('1 - (s.vector_perserving_ingredient <=> $2::vector) AS similarity_perserving');
  } else {
    selectColumns.push('NULL AS similarity_perserving');
  }

  // Build WHERE conditions
  const whereConditions = [];
  if (hasVector100g) {
    whereConditions.push(`(s.vector_100g_ingredient IS NOT NULL AND 1 - (s.vector_100g_ingredient <=> $1::vector) >= $3)`);
  }
  if (hasVectorPerServing) {
    whereConditions.push(`(s.vector_perserving_ingredient IS NOT NULL AND 1 - (s.vector_perserving_ingredient <=> $2::vector) >= $3)`);
  }

  // Build ORDER BY for GREATEST similarity
  const orderByParts = [];
  if (hasVector100g) {
    orderByParts.push('COALESCE(1 - (s.vector_100g_ingredient <=> $1::vector), 0)');
  }
  if (hasVectorPerServing) {
    orderByParts.push('COALESCE(1 - (s.vector_perserving_ingredient <=> $2::vector), 0)');
  }

  const query = `
    SELECT ${selectColumns.join(', ')}
    FROM SSS.Supplement s
    WHERE (${whereConditions.join(' OR ')})
    ORDER BY GREATEST(${orderByParts.join(', ')}) DESC
    LIMIT 10
  `;

  const params = [
    hasVector100g ? JSON.stringify(vectors.vector_100g_ingredient) : null,
    hasVectorPerServing ? JSON.stringify(vectors.vector_perserving_ingredient) : null,
    DUPLICATE_SIMILARITY_THRESHOLD
  ];

  try {
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return null; // No similar supplements found
    }

    // Normalize the staging entry's name and brand for comparison
    const normalizedName = normalizeForComparison(name);
    const normalizedBrand = normalizeForComparison(brand);

    // Check each similar supplement for name+brand match
    for (const row of result.rows) {
      const existingNormalizedName = normalizeForComparison(row.supplement_name);
      const existingNormalizedBrand = normalizeForComparison(row.supplement_brand);

      if (normalizedName === existingNormalizedName && normalizedBrand === existingNormalizedBrand) {
        // Found a duplicate
        return {
          id: row.id,
          supplement_name: row.supplement_name,
          supplement_brand: row.supplement_brand,
          similarity_100g: row.similarity_100g,
          similarity_perserving: row.similarity_perserving
        };
      }
    }

    // No name+brand match found among similar vectors
    return null;

  } catch (error) {
    console.error('Error checking for duplicate:', error);
    // On error, don't block approval - return null (no duplicate)
    return null;
  }
}

/**
 * Approve staging entries and create supplements
 * Includes duplicate detection: generates vectors first, then checks for
 * existing supplements with similar vector similarity AND matching name+brand.
 * Duplicates are auto-removed from staging.
 *
 * @param {Array<string>} stagingIds - Array of staging UUIDs to approve
 * @param {string|null} userId - auth.users.id for audit log
 * @returns {Promise<Object>} Approval results with success/failure/duplicate details
 */
export async function approveStagingSupplements(stagingIds, userId) {
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

      // 4. Generate vectors FIRST (before creating supplement)
      console.log(`Generating vectors for staging entry ${stagingId}...`);
      const vectorizationResult = await generateVectorsForSupplement(staging);

      // 5. Check for duplicates if vectors were generated successfully
      if (vectorizationResult.success) {
        const duplicate = await checkForDuplicate(
          {
            vector_100g_ingredient: vectorizationResult.vector_100g_ingredient,
            vector_perserving_ingredient: vectorizationResult.vector_perserving_ingredient
          },
          staging.supplement_name,
          staging.supplement_brand
        );

        if (duplicate) {
          // Duplicate found - report it but do NOT auto-delete.
          // The frontend will ask the user whether to delete or keep editing.
          console.log(`Duplicate detected for "${staging.supplement_name}" - matches existing supplement ${duplicate.id}`);

          results.push({
            staging_id: stagingId,
            staging_name: staging.supplement_name,
            status: 'duplicate',
            reason: `Duplicate of existing supplement: "${duplicate.supplement_name}" (ID: ${duplicate.id})`,
            supplement_id: null,
            duplicate_of: {
              id: duplicate.id,
              name: duplicate.supplement_name,
              brand: duplicate.supplement_brand,
              similarity_100g: duplicate.similarity_100g
                ? `${(duplicate.similarity_100g * 100).toFixed(1)}%`
                : null,
              similarity_perserving: duplicate.similarity_perserving
                ? `${(duplicate.similarity_perserving * 100).toFixed(1)}%`
                : null
            }
          });
          continue;
        }
      }

      // 6. No duplicate found - Create Supplement record and mark staging as reviewed (atomic)
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
                    vector_100g_ingredient,
                    vector_perserving_ingredient
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
                    $18::vector, $19::vector
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
        // Include vectors in initial insert (if available)
        vectorizationResult.success && vectorizationResult.vector_100g_ingredient
          ? JSON.stringify(vectorizationResult.vector_100g_ingredient)
          : null,
        vectorizationResult.success && vectorizationResult.vector_perserving_ingredient
          ? JSON.stringify(vectorizationResult.vector_perserving_ingredient)
          : null
      ];

      // 7. Insert supplement + mark staging as reviewed in one transaction
      const newSupplement = await withUserContext(userId, async (client) => {
        const supplementResult = await client.query(insertQuery, insertValues);
        const newSup = supplementResult.rows[0];
        await client.query(
          'UPDATE SSS.Supplement_Staging SET is_reviewed = true, promoted_to_supplement_id = $1 WHERE id = $2',
          [newSup.id, stagingId]
        );
        return newSup;
      });

      if (vectorizationResult.success) {
        console.log(`Supplement ${newSupplement.id} created with vectors`);
      } else {
        console.warn(`Supplement ${newSupplement.id} created without vectors: ${vectorizationResult.reason}`);
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
          vector_100g: vectorizationResult.success && vectorizationResult.vector_100g_ingredient
            ? `${vectorizationResult.dimension}d vector generated`
            : null,
          vector_perserving: vectorizationResult.success && vectorizationResult.vector_perserving_ingredient
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
    duplicates: results.filter(r => r.status === 'duplicate').length,
    results: results
  };
}

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
        FROM SSS.webscraper_catalog_url
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
  const query = `SELECT COUNT(*) as count FROM SSS.webscraper_catalog_url`;
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
        FROM SSS.webscraper_catalog_url
        WHERE id = $1
    `;

  const result = await pool.query(query, [catalogUrlId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Create new catalog URL
 * @param {Object} catalogUrlData - Catalog URL data
 * @param {string|null} userId - auth.users.id for audit log
 * @returns {Promise<Object>} Created catalog URL
 */
export async function createCatalogUrl(catalogUrlData, userId) {
  const query = `
        INSERT INTO SSS.webscraper_catalog_url (
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

  return withUserContext(userId, async (client) => {
    const result = await client.query(query, values);
    return result.rows[0];
  });
}

/**
 * Check for duplicate catalog URL
 * @param {string} websiteUrl - URL to check
 * @param {string} excludeId - ID to exclude (for updates)
 * @returns {Promise<boolean>} True if duplicate exists
 */
export async function checkDuplicateCatalogUrl(websiteUrl, excludeId = null) {
  let query = `
        SELECT id FROM SSS.webscraper_catalog_url
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
 * @param {string|null} userId - auth.users.id for audit log
 * @returns {Promise<Object|null>} Updated catalog URL or null
 */
export async function updateCatalogUrl(catalogUrlId, updateData, userId) {
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
        UPDATE SSS.webscraper_catalog_url
        SET ${fields.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING
            id,
            product_catalog_website,
            is_active
    `;

  return withUserContext(userId, async (client) => {
    const result = await client.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  });
}

/**
 * Delete catalog URLs (bulk)
 * @param {Array<string>} catalogUrlIds - Array of UUIDs to delete
 * @param {string|null} userId - auth.users.id for audit log
 * @returns {Promise<Array>} Array of deleted row objects
 */
export async function deleteCatalogUrls(catalogUrlIds, userId) {
  const query = `
        DELETE FROM SSS.webscraper_catalog_url
        WHERE id = ANY($1::uuid[])
        RETURNING id, product_catalog_website
    `;

  return withUserContext(userId, async (client) => {
    const result = await client.query(query, [catalogUrlIds]);
    return result.rows;
  });
}

// ============================================================================
// LOOKUP SERVICES
// ============================================================================

/**
 * Get all supplement packaging form lookup values
 * @returns {Promise<Array>} Array of { id, supplement_packaging_form }
 */
export async function getPackagingFormLookups() {
  const result = await pool.query(`
    SELECT id, supplement_packaging_form
    FROM SSS.Supplement_Packaging_Form_Lookup
    ORDER BY supplement_packaging_form
  `);
  return result.rows;
}

/**
 * Get all supplement status lookup values
 * @returns {Promise<Array>} Array of { id, supplement_status }
 */
export async function getStatusLookups() {
  const result = await pool.query(`
    SELECT id, supplement_status
    FROM SSS.Supplement_Status_Lookup
    ORDER BY supplement_status
  `);
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
        FROM SSS.webscraper_catalog_url
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
