import axios from "axios";
import FormData from "form-data";
import http from "http";
import pool from "../../config/db.js";
import { SIMILARITY_THRESHOLD, PYTHON_TIMEOUT } from "./validation.js";

// ============================================================================
// CONFIGURATION
// ============================================================================

const PYTHON_SERVICE_URL =
  process.env.PYTHON_SERVICE_URL || "http://localhost:8001";

// Create axios instance with default timeout and improved connection handling
const pythonClient = axios.create({
  baseURL: PYTHON_SERVICE_URL,
  timeout: PYTHON_TIMEOUT,
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  headers: {
    Connection: "keep-alive",
    Accept: "application/json",
  },
  // Improved connection handling
  httpAgent: new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 5,
    maxFreeSockets: 2,
    timeout: 300000,
  }),
});

// Add request interceptor for logging
pythonClient.interceptors.request.use(
  (config) => {
    console.log(
      `[Python Client] Making request to ${config.baseURL}${config.url}`,
    );
    return config;
  },
  (error) => {
    console.error("[Python Client] Request error:", error.message);
    return Promise.reject(error);
  },
);

// Add response interceptor for error handling
pythonClient.interceptors.response.use(
  (response) => {
    console.log(`[Python Client] Response received: ${response.status}`);
    return response;
  },
  (error) => {
    if (error.code === "ECONNRESET") {
      console.error(
        "[Python Client] Connection reset - Python service may be overloaded",
      );
    } else if (error.code === "ETIMEDOUT") {
      console.error(
        "[Python Client] Request timeout - OCR processing took too long",
      );
    }
    return Promise.reject(error);
  },
);

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Resolve MIME type from filename extension
 */
function getMimeType(filename) {
  const ext = (filename || "").split(".").pop()?.toLowerCase();
  const map = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return map[ext] || "image/jpeg";
}

// ============================================================================
// PYTHON SERVICE CALLS
// ============================================================================

/**
 * UC1: Analyze nutrition label image
 * Calls Python /api/ocr/analyze endpoint
 *
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} filename - Original filename
 * @returns {Promise<Object>} Structured data + vectors
 */
export async function analyzeNutritionLabel(fileBuffer, filename) {
  try {
    const form = new FormData();
    form.append("file", fileBuffer, {
      filename: filename,
      contentType: getMimeType(filename),
    });

    console.log(`[OCR Service] Calling Python service for file: ${filename}`);
    const response = await pythonClient.post("/api/ocr/analyze", form, {
      headers: form.getHeaders(),
    });

    console.log(`[OCR Service] Python service responded successfully`);
    return response.data;
  } catch (error) {
    console.error("[OCR Service] Error calling Python service:", error.message);

    // Handle different types of errors
    if (error.code === "ECONNRESET" || error.code === "ECONNREFUSED") {
      throw new Error(
        "Python OCR service is not available. Please ensure it is running on port 8001.",
      );
    } else if (error.code === "ETIMEDOUT") {
      throw new Error(
        "Python OCR service timed out. The image might be too complex to process.",
      );
    } else if (error.response) {
      // The request was made and the server responded with a status code
      throw new Error(
        `Python OCR service error: ${error.response.status} - ${error.response.data?.detail || "Unknown error"}`,
      );
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error(
        "No response from Python OCR service. Please check if it is running.",
      );
    } else {
      // Something else happened
      throw new Error(`OCR service error: ${error.message}`);
    }
  }
}

/**
 * UC2: Extract brand/name from product image
 * Calls Python /api/ocr/identify endpoint
 *
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} filename - Original filename
 * @returns {Promise<Object>} { supplement_brand, supplement_name, variant, ... }
 */
export async function identifySupplementFromImage(fileBuffer, filename) {
  // First, run OCR to get raw text
  const form = new FormData();
  form.append("file", fileBuffer, {
    filename: filename,
    contentType: getMimeType(filename),
  });

  const ocrResponse = await pythonClient.post("/api/ocr/ocr-only", form, {
    headers: form.getHeaders(),
  });

  if (!ocrResponse.data.success) {
    throw new Error("OCR extraction failed");
  }

  const rawText = ocrResponse.data.raw_text;

  // Then, identify supplement from the text
  const identifyResponse = await pythonClient.post("/api/ocr/identify", {
    raw_text: rawText,
  });

  return {
    ...identifyResponse.data,
    ocr_text: rawText,
  };
}

/**
 * UC2: Extract batch ID from image using regex
 * Calls Python batch ID extraction (via batch-verification endpoint)
 *
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} filename - Original filename
 * @returns {Promise<Object>} { batch_id, confidence, ... }
 */
export async function extractBatchIdFromImage(fileBuffer, filename) {
  const form = new FormData();
  form.append("file", fileBuffer, {
    filename: filename,
    contentType: getMimeType(filename),
  });

  // Use OCR-only first, then extract batch ID from text
  const ocrResponse = await pythonClient.post("/api/ocr/ocr-only", form, {
    headers: form.getHeaders(),
  });

  if (!ocrResponse.data.success) {
    throw new Error("OCR extraction failed");
  }

  const rawText = ocrResponse.data.raw_text;

  // Extract batch ID using regex patterns (matching Python's batch_id_extractor logic)
  const batchIdResult = extractBatchIdFromText(rawText);

  return {
    ...batchIdResult,
    ocr_text: rawText,
  };
}

/**
 * Extract batch ID from text using regex patterns
 * Mirrors Python's batch_id_extractor.py regex logic
 *
 * @param {string} text - Raw OCR text
 * @returns {Object} { batch_id, batch_id_type, confidence, possible_alternatives }
 */
function extractBatchIdFromText(text) {
  const textUpper = text.toUpperCase();
  const textClean = textUpper.replace(/\s+/g, " ");

  const patterns = [
    // Labeled batch/lot numbers
    {
      regex:
        /(?:BATCH|BATCH\s*NO|BATCH\s*#|BATCH\s*NUMBER)[\s:\.]*([A-Z0-9\-:]{5,20})/i,
      type: "batch",
      confidence: "high",
    },
    {
      regex:
        /(?:LOT|LOT\s*NO|LOT\s*#|LOT\s*NUMBER)[\s:\.]*([A-Z0-9\-:]{5,20})/i,
      type: "lot",
      confidence: "high",
    },
    {
      regex: /(?:B\/?N|L\/?N)[\s:\.]*([A-Z0-9\-:]{5,20})/i,
      type: "batch",
      confidence: "medium",
    },

    // Alphanumeric codes
    { regex: /\b(BN\d{5,10})\b/, type: "batch", confidence: "high" },
    { regex: /\b(LN\d{5,10})\b/, type: "lot", confidence: "high" },
    {
      regex: /\b(IS[\-]?\d{5,10})\b/,
      type: "certification",
      confidence: "high",
    },
    {
      regex: /\b(NSF[\-]?\d{5,10})\b/,
      type: "certification",
      confidence: "high",
    },

    // Codes with colons
    { regex: /\b(\d{4,6}:\d{2,4})\b/, type: "batch", confidence: "medium" },

    // Pure numeric
    { regex: /\b(0{2,4}\d{6,10})\b/, type: "batch", confidence: "medium" },
    { regex: /\b(\d{7,10})\b/, type: "batch", confidence: "low" },
  ];

  const foundIds = [];

  for (const { regex, type, confidence } of patterns) {
    const matches = textClean.match(new RegExp(regex, "gi"));
    if (matches) {
      for (const match of matches) {
        const extracted = match.match(regex);
        if (extracted && extracted[1]) {
          const batchId = extracted[1].trim();
          // Filter out dates and phone numbers
          if (!isLikelyDateOrPhone(batchId)) {
            foundIds.push({
              batch_id: batchId,
              batch_id_type: type,
              confidence,
            });
          }
        }
      }
    }
  }

  if (foundIds.length > 0) {
    // Sort by confidence
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    foundIds.sort(
      (a, b) => confidenceOrder[a.confidence] - confidenceOrder[b.confidence],
    );

    const best = foundIds[0];
    const alternatives = foundIds
      .slice(1, 5)
      .filter((x) => x.batch_id !== best.batch_id)
      .map((x) => x.batch_id);

    return {
      batch_id: best.batch_id,
      batch_id_type: best.batch_id_type,
      confidence: best.confidence,
      possible_alternatives: alternatives,
    };
  }

  return {
    batch_id: null,
    batch_id_type: null,
    confidence: "low",
    possible_alternatives: [],
  };
}

/**
 * Check if text looks like a date or phone number
 */
function isLikelyDateOrPhone(text) {
  // Date patterns
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(text)) return true;
  if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(text)) return true;
  // Phone patterns
  if (/^\d{3}[\-\s]?\d{3}[\-\s]?\d{4}$/.test(text)) return true;
  // Expiry date patterns
  if (/^\d{2}\/\d{2,4}$/.test(text)) return true;
  return false;
}

/**
 * UC2: Verify supplement on certification sites
 * Calls Python /api/batch-verification/verify or /verify-combined
 *
 * @param {string} brand - Supplement brand
 * @param {string} name - Supplement name
 * @param {string|null} batchId - Optional batch ID
 * @returns {Promise<Object>} Verification results
 */
export async function verifyBatchTesting(brand, name, batchId = null) {
  let endpoint, params;

  if (batchId && (!brand || !name)) {
    // Batch-ID-only search
    endpoint = "/api/batch-verification/verify-combined";
    params = {
      supplement_brand: brand || "",
      supplement_name: name || "",
      batch_id: batchId,
    };
  } else if (batchId) {
    // Full combined verification
    endpoint = "/api/batch-verification/verify-combined";
    params = {
      supplement_brand: brand,
      supplement_name: name,
      batch_id: batchId,
    };
  } else {
    // Brand/product verification only
    endpoint = "/api/batch-verification/verify";
    params = {
      supplement_brand: brand,
      supplement_name: name,
    };
  }

  const response = await pythonClient.post(endpoint, null, { params });

  return response.data;
}

// ============================================================================
// DATABASE QUERIES - SIMILARITY SEARCH
// ============================================================================

/**
 * Find similar supplements using vector similarity
 * Compares both per_100g and per_serving vectors
 *
 * @param {Array<number>} vectorPerServing - Per serving vector from OCR
 * @param {Array<number>|null} vectorPer100g - Per 100g vector from OCR
 * @param {number} page - Page number (1-indexed)
 * @param {number} pageSize - Results per page
 * @returns {Promise<Object>} { supplements, total, page, totalPages }
 */
export async function findSimilarSupplements(
  vectorPerServing,
  vectorPer100g,
  page = 1,
  pageSize = 10,
) {
  const offset = (page - 1) * pageSize;

  // Check which vectors we have
  const hasVectorPerServing = vectorPerServing && vectorPerServing.length > 0;
  const hasVectorPer100g = vectorPer100g && vectorPer100g.length > 0;

  if (!hasVectorPerServing && !hasVectorPer100g) {
    return {
      supplements: [],
      total: 0,
      page,
      per_page: pageSize,
      total_pages: 0,
    };
  }

  // Convert vectors to PostgreSQL array format string
  const vectorServingStr = hasVectorPerServing
    ? `[${vectorPerServing.join(",")}]`
    : null;
  const vector100gStr = hasVectorPer100g
    ? `[${vectorPer100g.join(",")}]`
    : null;

  // Get DISCONTINUED status ID to exclude
  const discontinuedQuery = `
        SELECT id FROM SSS.Supplement_Status_Lookup
        WHERE UPPER(supplement_status) = 'DISCONTINUED'
            AND is_active = true
    `;
  const discontinuedResult = await pool.query(discontinuedQuery);
  const discontinuedStatusId = discontinuedResult.rows[0]?.id;

  // Build query based on which vectors are available
  // Using a simpler approach: always pass both vectors, use COALESCE for missing ones
  const params = [];
  let paramIndex = 1;

  // $1 = vector for comparison (use whichever is available, prefer per_100g)
  const primaryVector = vector100gStr || vectorServingStr;
  params.push(primaryVector);
  const primaryVectorParam = paramIndex++;

  // $2 = secondary vector (if both exist)
  let secondaryVectorParam = null;
  if (hasVectorPer100g && hasVectorPerServing) {
    params.push(vectorServingStr);
    secondaryVectorParam = paramIndex++;
  }

  // $3 = similarity threshold
  params.push(SIMILARITY_THRESHOLD);
  const thresholdParam = paramIndex++;

  // $4 = discontinued status ID (optional)
  let discontinuedParam = null;
  if (discontinuedStatusId) {
    params.push(discontinuedStatusId);
    discontinuedParam = paramIndex++;
  }

  // $5, $6 = pagination
  params.push(pageSize);
  const limitParam = paramIndex++;
  params.push(offset);
  const offsetParam = paramIndex++;

  // Build similarity expressions based on what vectors we have
  let similarity100gExpr,
    similarityServingExpr,
    maxSimilarityExpr,
    matchedVectorExpr;

  if (hasVectorPer100g && hasVectorPerServing) {
    // Both vectors available
    similarity100gExpr = `1 - (s.vector_100g_ingredient <=> $1::vector)`;
    similarityServingExpr = `1 - (s.vector_perserving_ingredient <=> $2::vector)`;
    maxSimilarityExpr = `GREATEST(
            COALESCE(1 - (s.vector_100g_ingredient <=> $1::vector), 0),
            COALESCE(1 - (s.vector_perserving_ingredient <=> $2::vector), 0)
        )`;
    matchedVectorExpr = `CASE
            WHEN COALESCE(1 - (s.vector_100g_ingredient <=> $1::vector), 0)
                 >= COALESCE(1 - (s.vector_perserving_ingredient <=> $2::vector), 0)
            THEN 'per_100g' ELSE 'per_serving'
        END`;
  } else if (hasVectorPer100g) {
    // Only per_100g vector
    similarity100gExpr = `1 - (s.vector_100g_ingredient <=> $1::vector)`;
    similarityServingExpr = `NULL`;
    maxSimilarityExpr = `COALESCE(1 - (s.vector_100g_ingredient <=> $1::vector), 0)`;
    matchedVectorExpr = `'per_100g'`;
  } else {
    // Only per_serving vector
    similarity100gExpr = `NULL`;
    similarityServingExpr = `1 - (s.vector_perserving_ingredient <=> $1::vector)`;
    maxSimilarityExpr = `COALESCE(1 - (s.vector_perserving_ingredient <=> $1::vector), 0)`;
    matchedVectorExpr = `'per_serving'`;
  }

  // Build WHERE conditions for similarity threshold
  let similarityConditions = [];
  if (hasVectorPer100g) {
    similarityConditions.push(
      `(s.vector_100g_ingredient IS NOT NULL AND 1 - (s.vector_100g_ingredient <=> $1::vector) >= $${thresholdParam})`,
    );
  }
  if (hasVectorPerServing) {
    const vectorParam = hasVectorPer100g ? secondaryVectorParam : 1;
    similarityConditions.push(
      `(s.vector_perserving_ingredient IS NOT NULL AND 1 - (s.vector_perserving_ingredient <=> $${vectorParam}::vector) >= $${thresholdParam})`,
    );
  }

  const query = `
        WITH similar_supplements AS (
            SELECT
                s.id,
                s.supplement_name,
                s.supplement_brand,
                ssl.supplement_status,
                spf.supplement_packaging_form,
                s.batch_testing_org,
                ${similarity100gExpr} AS similarity_100g,
                ${similarityServingExpr} AS similarity_perserving,
                ${maxSimilarityExpr} AS max_similarity,
                ${matchedVectorExpr} AS matched_vector
            FROM SSS.Supplement s
            LEFT JOIN SSS.Supplement_Status_Lookup ssl
                ON s.supplement_status_id = ssl.id
            LEFT JOIN SSS.Supplement_Packaging_Form_Lookup spf
                ON s.supplement_packaging_form_id = spf.id
            WHERE ssl.is_active = true
                AND spf.is_active = true
                ${discontinuedParam ? `AND s.supplement_status_id != $${discontinuedParam}` : ""}
                AND (${similarityConditions.join(" OR ")})
        )
        SELECT * FROM similar_supplements
        ORDER BY max_similarity DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
    `;

  console.log("[OCR] Executing similarity query with params:", params.length);

  const result = await pool.query(query, params);

  // Get total count (reuse most params but not limit/offset)
  const countParams = params.slice(0, -2); // Remove limit and offset
  const countQuery = `
        SELECT COUNT(*) as count
        FROM SSS.Supplement s
        LEFT JOIN SSS.Supplement_Status_Lookup ssl
            ON s.supplement_status_id = ssl.id
        LEFT JOIN SSS.Supplement_Packaging_Form_Lookup spf
            ON s.supplement_packaging_form_id = spf.id
        WHERE ssl.is_active = true
            AND spf.is_active = true
            ${discontinuedParam ? `AND s.supplement_status_id != $${discontinuedParam}` : ""}
            AND (${similarityConditions.join(" OR ")})
    `;

  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count);

  return {
    supplements: result.rows.map((row) => ({
      supplement_id: row.id,
      supplement_name: row.supplement_name,
      supplement_brand: row.supplement_brand,
      supplement_status: row.supplement_status,
      supplement_packaging_form: row.supplement_packaging_form,
      batch_testing_org: row.batch_testing_org,
      similarity_score: row.max_similarity
        ? parseFloat(row.max_similarity).toFixed(4)
        : "0",
      matched_vector: row.matched_vector,
      similarity_details: {
        per_100g: row.similarity_100g
          ? parseFloat(row.similarity_100g).toFixed(4)
          : null,
        per_serving: row.similarity_perserving
          ? parseFloat(row.similarity_perserving).toFixed(4)
          : null,
      },
    })),
    total,
    page,
    per_page: pageSize,
    total_pages: Math.ceil(total / pageSize),
  };
}

// ============================================================================
// 2-STAGE OCR FLOW
// ============================================================================

/**
 * Stage 1: Extract raw text only from an image (no LLM structuring or vectors)
 * Calls Python /api/ocr/ocr-only endpoint
 *
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} filename - Original filename
 * @returns {Promise<Object>} { success, raw_text, line_count, character_count }
 */
export async function extractTextOnlyFromImage(fileBuffer, filename) {
  try {
    const form = new FormData();
    form.append("file", fileBuffer, {
      filename: filename,
      contentType: getMimeType(filename),
    });

    console.log(`[OCR Service] Calling Python OCR-only for file: ${filename}`);
    const response = await pythonClient.post("/api/ocr/ocr-only", form, {
      headers: form.getHeaders(),
    });

    console.log(`[OCR Service] Python OCR-only responded successfully`);
    return response.data;
  } catch (error) {
    console.error("[OCR Service] Error calling Python OCR-only:", error.message);

    if (error.code === "ECONNRESET" || error.code === "ECONNREFUSED") {
      throw new Error(
        "Python OCR service is not available. Please ensure it is running on port 8001.",
      );
    } else if (error.code === "ETIMEDOUT") {
      throw new Error(
        "Python OCR service timed out. The image might be too complex to process.",
      );
    } else if (error.response) {
      throw new Error(
        `Python OCR service error: ${error.response.status} - ${error.response.data?.detail || "Unknown error"}`,
      );
    } else if (error.request) {
      throw new Error(
        "No response from Python OCR service. Please check if it is running.",
      );
    } else {
      throw new Error(`OCR service error: ${error.message}`);
    }
  }
}

/**
 * Stage 2: Analyze raw text — structure via LLM + optionally generate vectors
 * Calls Python /api/ocr/analyze-text endpoint
 *
 * @param {string} rawText - Raw OCR text (possibly edited by the user)
 * @param {boolean} generateVectors - Whether to generate embedding vectors
 * @returns {Promise<Object>} { success, data, vectors, ... }
 */
export async function analyzeFromText(rawText, generateVectors = true) {
  try {
    console.log(
      `[OCR Service] Calling Python analyze-text (${rawText.length} chars, vectors=${generateVectors})`,
    );
    const response = await pythonClient.post("/api/ocr/analyze-text", {
      raw_text: rawText,
      generate_vectors: generateVectors,
    });

    console.log(`[OCR Service] Python analyze-text responded successfully`);
    return response.data;
  } catch (error) {
    console.error(
      "[OCR Service] Error calling Python analyze-text:",
      error.message,
    );

    if (error.code === "ECONNRESET" || error.code === "ECONNREFUSED") {
      throw new Error(
        "Python OCR service is not available. Please ensure it is running on port 8001.",
      );
    } else if (error.code === "ETIMEDOUT") {
      throw new Error("Python OCR service timed out. Please try again.");
    } else if (error.response) {
      throw new Error(
        `Python OCR service error: ${error.response.status} - ${error.response.data?.detail || "Unknown error"}`,
      );
    } else if (error.request) {
      throw new Error(
        "No response from Python OCR service. Please check if it is running.",
      );
    } else {
      throw new Error(`OCR service error: ${error.message}`);
    }
  }
}

/**
 * Vectorize pre-structured nutrition data (no OCR or LLM step)
 * Calls Python /api/ocr/vectorize endpoint
 *
 * @param {Object} structuredData - Structured data matching the LLM output shape:
 *   { supplement_ingredient, nutritional_info_per_serving, nutritional_info_per_100g, serving_size_grams }
 * @returns {Promise<Object>} { success, vectors: { vector_per_serving, vector_per_100g, per_100g_calculated } }
 */
export async function vectorizeStructuredData(structuredData) {
  try {
    console.log(`[OCR Service] Calling Python vectorize`);
    const response = await pythonClient.post("/api/ocr/vectorize", {
      structured_data: structuredData,
      include_ingredients: true,
    });

    console.log(`[OCR Service] Python vectorize responded successfully`);
    return response.data;
  } catch (error) {
    console.error("[OCR Service] Error calling Python vectorize:", error.message);

    if (error.code === "ECONNRESET" || error.code === "ECONNREFUSED") {
      throw new Error(
        "Python OCR service is not available. Please ensure it is running on port 8001.",
      );
    } else if (error.code === "ETIMEDOUT") {
      throw new Error("Python OCR service timed out. Please try again.");
    } else if (error.response) {
      throw new Error(
        `Python OCR service error: ${error.response.status} - ${error.response.data?.detail || "Unknown error"}`,
      );
    } else if (error.request) {
      throw new Error(
        "No response from Python OCR service. Please check if it is running.",
      );
    } else {
      throw new Error(`OCR service error: ${error.message}`);
    }
  }
}
