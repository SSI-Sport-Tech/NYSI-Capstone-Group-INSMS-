import {
  analyzeNutritionLabel,
  identifySupplementFromImage,
  extractBatchIdFromImage,
  verifyBatchTesting,
  findSimilarSupplements,
  extractTextOnlyFromImage,
  analyzeFromText,
  vectorizeStructuredData,
} from "./services.js";

import {
  analyzeQuerySchema,
  verifyRequestSchema,
  validateImageFile,
  validateMultipleFiles,
  DEFAULT_PAGE_SIZE,
} from "./validation.js";

// ============================================================================
// NEW: STAGE 1 OCR-ONLY (editable text flow)
// ============================================================================

/**
 * POST /api/ocr/ocr-only
 * Upload image -> OCR only -> returns raw_text for frontend editing
 */
export async function ocrOnly(req, res) {
  try {
    const fileValidation = validateImageFile(req.file);
    if (!fileValidation.valid) {
      return res.status(400).json({ success: false, error: fileValidation.error });
    }

    console.log(`[OCR] OCR-only: ${req.file.originalname}`);

    // Call Python OCR-only via Node services layer
    const ocrResult = await extractTextOnlyFromImage(req.file.buffer, req.file.originalname);

    if (!ocrResult?.success) {
      return res.status(422).json({
        success: false,
        error: "OCR-only failed",
        details: ocrResult?.error || ocrResult,
      });
    }

    return res.json({
      success: true,
      raw_text: ocrResult.raw_text || "",
      line_count: ocrResult.line_count ?? (ocrResult.raw_text ? ocrResult.raw_text.split("\n").length : 0),
      character_count: ocrResult.character_count ?? (ocrResult.raw_text ? ocrResult.raw_text.length : 0),
    });
  } catch (error) {
    console.error("[OCR] OCR-only error:", error.message);

    if (error.code === "ECONNRESET") {
      return res.status(503).json({
        success: false,
        error: "Connection to OCR service was reset. The service may be overloaded. Please try again.",
      });
    }

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT" || error.message.includes("timeout")) {
      return res.status(504).json({
        success: false,
        error: "OCR service timeout. Please try again with a smaller image or wait a moment.",
      });
    }

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        error: "OCR service unavailable. Please ensure Python service is running.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to OCR-only",
      details: error.message,
    });
  }
}

// ============================================================================
// NEW: STAGE 2 ANALYZE-TEXT (structure + optional vectors)
// ============================================================================

/**
 * POST /api/ocr/analyze-text
 * Body: { raw_text: string, generate_vectors?: boolean }
 * -> structured_data (+ optional vectors)
 */
export async function analyzeText(req, res) {
  try {
    const { raw_text, generate_vectors } = req.body || {};

    if (!raw_text || typeof raw_text !== "string" || raw_text.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: "raw_text is required (min length 5)",
      });
    }

    console.log(`[OCR] Analyze-text: ${raw_text.length} chars, vectors=${generate_vectors !== false}`);

    const result = await analyzeFromText(raw_text, generate_vectors !== false);

    if (!result?.success) {
      return res.status(422).json({
        success: false,
        error: "Analyze-text failed",
        details: result?.error || result,
      });
    }

    return res.json(result);
  } catch (error) {
    console.error("[OCR] Analyze-text error:", error.message);

    if (error.code === "ECONNRESET") {
      return res.status(503).json({
        success: false,
        error: "Connection to OCR service was reset. The service may be overloaded. Please try again.",
      });
    }

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT" || error.message.includes("timeout")) {
      return res.status(504).json({
        success: false,
        error: "OCR service timeout. Please try again.",
      });
    }

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        error: "OCR service unavailable. Please ensure Python service is running.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to analyze text",
      details: error.message,
    });
  }
}

// ============================================================================
// UC1: ANALYZE NUTRITION LABEL (existing)
// ============================================================================

/**
 * POST /api/ocr/analyze
 * Upload nutrition label image -> extract data -> find similar supplements
 */
export async function analyzeLabel(req, res) {
  try {
    // Validate file
    const fileValidation = validateImageFile(req.file);
    if (!fileValidation.valid) {
      return res.status(400).json({
        success: false,
        error: fileValidation.error,
      });
    }

    // Validate query parameters
    const queryValidation = analyzeQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: queryValidation.error.errors,
      });
    }

    const { page, per_page } = queryValidation.data;

    console.log(`[OCR] Analyzing nutrition label: ${req.file.originalname}`);

    // Step 1: Call Python OCR service
    const ocrResult = await analyzeNutritionLabel(req.file.buffer, req.file.originalname);

    if (!ocrResult.success) {
      return res.status(422).json({
        success: false,
        error: "OCR analysis failed",
        details: ocrResult.error,
      });
    }

    // Step 2: Extract vectors from OCR result
    const vectorPerServing = ocrResult.vectors?.vector_per_serving || null;
    const vectorPer100g = ocrResult.vectors?.vector_per_100g || null;

    // Step 3: Find similar supplements
    let similarSupplements = {
      supplements: [],
      total: 0,
      page: 1,
      per_page: DEFAULT_PAGE_SIZE,
      total_pages: 0,
    };

    if (vectorPerServing || vectorPer100g) {
      similarSupplements = await findSimilarSupplements(vectorPerServing, vectorPer100g, page, per_page);
    }

    console.log(`[OCR] Found ${similarSupplements.total} similar supplements`);

    res.json({
      success: true,
      extracted: {
        supplement_name: ocrResult.data?.supplement_name || "Generic",
        supplement_brand: ocrResult.data?.supplement_brand || "Generic",
        supplement_description: ocrResult.data?.supplement_description || null,
        supplement_ingredient: ocrResult.data?.supplement_ingredient || [],
        serving_size_text: ocrResult.data?.serving_size_text || null,
        serving_size_grams: ocrResult.data?.serving_size_grams || null,
        nutritional_info_per_serving: ocrResult.data?.nutritional_info_per_serving || null,
        nutritional_info_per_100g: ocrResult.data?.nutritional_info_per_100g || null,
        supplement_warning_label: ocrResult.data?.supplement_warning_label || null,
        supplement_certifications: ocrResult.data?.supplement_certifications || null,
        batch_testing_org: ocrResult.data?.batch_testing_org || null,
      },
      similar_supplements: {
        data: similarSupplements.supplements,
        pagination: {
          page: similarSupplements.page,
          per_page: similarSupplements.per_page,
          total: similarSupplements.total,
          total_pages: similarSupplements.total_pages,
        },
      },
      vectors: {
        has_per_serving: !!vectorPerServing,
        has_per_100g: !!vectorPer100g,
        per_100g_calculated: ocrResult.vectors?.per_100g_calculated || false,
      },
      ocr_text: ocrResult.ocr_text || null,
    });
  } catch (error) {
    console.error("[OCR] Analyze error:", error.message);
    console.error("[OCR] Error code:", error.code);
    console.error("[OCR] Error stack:", error.stack);

    if (error.code === "ECONNRESET") {
      return res.status(503).json({
        success: false,
        error: "Connection to OCR service was reset. The service may be overloaded. Please try again.",
      });
    }

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT" || error.message.includes("timeout")) {
      return res.status(504).json({
        success: false,
        error: "OCR service timeout. Please try again with a smaller image or wait a moment.",
      });
    }

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        error: "OCR service unavailable. Please ensure Python service is running.",
      });
    }

    if (error.message.includes("Python OCR service")) {
      return res.status(502).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to analyze nutrition label",
      details: error.message,
    });
  }
}

// ============================================================================
// UC2: EXTRACT BRAND/NAME/BATCH ID (existing)
// ============================================================================

/**
 * POST /api/ocr/extract
 * Upload brand/name image (required) + batch ID image (optional)
 * Returns extracted info for user verification
 */
export async function extractInfo(req, res) {
  try {
    // Validate files
    const fileValidation = validateMultipleFiles(req.files, {
      brand_image: { required: true },
      batch_image: { required: false },
    });

    if (!fileValidation.valid) {
      return res.status(400).json({
        success: false,
        error: fileValidation.error,
      });
    }

    const brandImage = req.files.brand_image[0];
    const batchImage = req.files.batch_image?.[0] || null;

    console.log(`[OCR] Extracting info from images`);
    console.log(`  - Brand image: ${brandImage.originalname}`);
    if (batchImage) console.log(`  - Batch image: ${batchImage.originalname}`);

    // Step 1: Extract brand/name from brand image
    const identifyResult = await identifySupplementFromImage(brandImage.buffer, brandImage.originalname);

    if (!identifyResult.success) {
      return res.status(422).json({
        success: false,
        error: "Failed to identify supplement from image",
        details: identifyResult.error,
      });
    }

    // Step 2: Extract batch ID if batch image provided
    let batchResult = null;
    if (batchImage) {
      batchResult = await extractBatchIdFromImage(batchImage.buffer, batchImage.originalname);
    }

    console.log(
      `[OCR] Extracted: ${identifyResult.identification?.supplement_brand} - ${identifyResult.identification?.supplement_name}`,
    );
    if (batchResult?.batch_id) {
      console.log(`[OCR] Batch ID: ${batchResult.batch_id} (confidence: ${batchResult.confidence})`);
    }

    res.json({
      success: true,
      extracted: {
        supplement_brand: identifyResult.identification?.supplement_brand || "Unknown",
        supplement_name: identifyResult.identification?.supplement_name || "Unknown",
        variant: identifyResult.identification?.variant || null,
        product_type: identifyResult.identification?.product_type || null,
        batch_id: batchResult?.batch_id || null,
        batch_id_confidence: batchResult?.confidence || null,
        batch_id_alternatives: batchResult?.possible_alternatives || [],
      },
      ocr_text: {
        brand_image: identifyResult.ocr_text || null,
        batch_image: batchResult?.ocr_text || null,
      },
    });
  } catch (error) {
    console.error("[OCR] Extract error:", error.message);

    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      return res.status(504).json({
        success: false,
        error: "OCR service timeout. Please try again.",
      });
    }

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        error: "OCR service unavailable. Please ensure Python service is running.",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to extract information from images",
      details: error.message,
    });
  }
}

// ============================================================================
// UC2: VERIFY BATCH TESTING (existing)
// ============================================================================

/**
 * POST /api/ocr/verify
 * Submit verified brand/name/batch_id -> check certification sites
 */
export async function verifySupplements(req, res) {
  try {
    // Validate request body
    const validation = verifyRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: validation.error.errors,
      });
    }

    const { supplement_brand, supplement_name, batch_id } = validation.data;

    console.log(`[OCR] Verifying: ${supplement_brand} - ${supplement_name}`);
    if (batch_id) console.log(`[OCR] Batch ID: ${batch_id}`);

    // Call Python batch verification service
    const verificationResult = await verifyBatchTesting(supplement_brand, supplement_name, batch_id);

    console.log(`[OCR] Verification result: is_verified=${verificationResult.is_verified}`);

    res.json({
      success: true,
      verification: {
        supplement_brand,
        supplement_name,
        batch_id: batch_id || null,
        is_verified: verificationResult.is_verified || false,
        is_batch_tested: verificationResult.is_batch_tested || false,
        batch_id_verified: verificationResult.batch_id_verified || false,
        found_count: verificationResult.found_count || 0,
        found_websites: verificationResult.found_websites || [],
        results: verificationResult.urls || verificationResult.all_results || [],
        quick_links: verificationResult.quick_links || [],
      },
      errors: verificationResult.errors || [],
    });
  } catch (error) {
    console.error("[OCR] Verify error:", error.message);
    console.error("[Route] 500 error stack:", error.stack); // not just error.message

    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      return res.status(504).json({
        success: false,
        error: "Verification service timeout. The certification sites may be slow. Please try again.",
      });
    }

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        error: "Verification service unavailable. Please ensure Python service is running.",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to verify supplement",
      details: error.message,
    });
  }
}

// ============================================================================
// LEGACY: ORIGINAL UPLOAD ENDPOINT (existing)
// ============================================================================

/**
 * POST /api/ocr/upload (legacy)
 * Original OCR upload endpoint - kept for backwards compatibility
 */
export async function runOCR(req, res) {
  try {
    const fileValidation = validateImageFile(req.file);
    if (!fileValidation.valid) {
      return res.status(400).json({
        success: false,
        error: fileValidation.error,
      });
    }

    console.log(`[OCR] Legacy upload: ${req.file.originalname}`);

    const result = await analyzeNutritionLabel(req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (error) {
    console.error("[OCR] Upload error:", error.message);
    res.status(500).json({
      success: false,
      error: "OCR failed",
      details: error.message,
    });
  }
}

// ============================================================================
// STEP 2: FIND ALTERNATIVES FROM STRUCTURED DATA
// ============================================================================

/**
 * POST /api/ocr/find-alternatives
 * Body: {
 *   ingredients: string[],
 *   nutritional_per_serving: { name, amount }[],
 *   nutritional_per_100g:    { name, amount }[],
 *   serving_size_grams?: number | null,
 *   page?: number,
 *   per_page?: number,
 * }
 * Vectorizes the user-verified nutritional data and returns similar supplements.
 */
export async function findAlternatives(req, res) {
  try {
    const {
      ingredients = [],
      nutritional_per_serving = [],
      nutritional_per_100g = [],
      serving_size_grams = null,
      page = 1,
      per_page = DEFAULT_PAGE_SIZE,
    } = req.body || {};

    // Helper: build the {nutrients:[]} shape Python vectorize expects
    const buildNutrientsObj = (rows) => {
      const filtered = rows.filter((n) => n?.name?.trim());
      if (filtered.length === 0) return null;
      return {
        nutrients: filtered.map((n) => ({
          name: n.name,
          amount: n.amount || "",
          daily_value: null,
        })),
      };
    };

    const structuredData = {
      supplement_ingredient: ingredients.filter(Boolean),
      nutritional_info_per_serving:
        buildNutrientsObj(nutritional_per_serving) || { nutrients: [] },
      nutritional_info_per_100g: buildNutrientsObj(nutritional_per_100g),
      serving_size_grams,
    };

    console.log("[OCR] Vectorizing structured data for alternative search");

    const vectorResult = await vectorizeStructuredData(structuredData);

    if (!vectorResult?.success) {
      return res.status(422).json({
        success: false,
        error: "Failed to generate vectors from nutritional data",
      });
    }

    const vectorPerServing = vectorResult.vectors?.vector_per_serving || null;
    const vectorPer100g = vectorResult.vectors?.vector_per_100g || null;

    if (!vectorPerServing && !vectorPer100g) {
      return res.json({
        success: true,
        similar_supplements: {
          data: [],
          pagination: { page: 1, per_page, total: 0, total_pages: 0 },
        },
        message:
          "Not enough nutritional data to find alternatives. Please add more ingredient or nutritional information.",
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const perPageNum = Math.min(
      50,
      Math.max(1, parseInt(per_page, 10) || DEFAULT_PAGE_SIZE),
    );

    const similarSupplements = await findSimilarSupplements(
      vectorPerServing,
      vectorPer100g,
      pageNum,
      perPageNum,
    );

    console.log(`[OCR] Found ${similarSupplements.total} similar supplements`);

    return res.json({
      success: true,
      similar_supplements: {
        data: similarSupplements.supplements,
        pagination: {
          page: similarSupplements.page,
          per_page: similarSupplements.per_page,
          total: similarSupplements.total,
          total_pages: similarSupplements.total_pages,
        },
      },
    });
  } catch (error) {
    console.error("[OCR] Find alternatives error:", error.message);

    if (error.code === "ECONNRESET") {
      return res.status(503).json({
        success: false,
        error: "Connection to OCR service was reset. Please try again.",
      });
    }

    if (
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT" ||
      error.message.includes("timeout")
    ) {
      return res.status(504).json({
        success: false,
        error: "Service timeout. Please try again.",
      });
    }

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        error:
          "OCR service unavailable. Please ensure Python service is running.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to find alternatives",
      details: error.message,
    });
  }
}