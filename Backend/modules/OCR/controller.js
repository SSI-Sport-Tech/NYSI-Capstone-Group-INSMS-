import {
    analyzeNutritionLabel,
    identifySupplementFromImage,
    extractBatchIdFromImage,
    verifyBatchTesting,
    findSimilarSupplements
} from './services.js';
import {
    analyzeQuerySchema,
    verifyRequestSchema,
    validateImageFile,
    validateMultipleFiles,
    DEFAULT_PAGE_SIZE
} from './validation.js';

// ============================================================================
// UC1: ANALYZE NUTRITION LABEL
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
                error: fileValidation.error
            });
        }

        // Validate query parameters
        const queryValidation = analyzeQuerySchema.safeParse(req.query);
        if (!queryValidation.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid query parameters',
                details: queryValidation.error.errors
            });
        }

        const { page, per_page } = queryValidation.data;

        console.log(`[OCR] Analyzing nutrition label: ${req.file.originalname}`);

        // Step 1: Call Python OCR service
        const ocrResult = await analyzeNutritionLabel(req.file.buffer, req.file.originalname);

        if (!ocrResult.success) {
            return res.status(422).json({
                success: false,
                error: 'OCR analysis failed',
                details: ocrResult.error
            });
        }

        // Step 2: Extract vectors from OCR result
        const vectorPerServing = ocrResult.vectors?.vector_per_serving || null;
        const vectorPer100g = ocrResult.vectors?.vector_per_100g || null;

        // Step 3: Find similar supplements
        let similarSupplements = { supplements: [], total: 0, page: 1, per_page: DEFAULT_PAGE_SIZE, total_pages: 0 };

        if (vectorPerServing || vectorPer100g) {
            similarSupplements = await findSimilarSupplements(
                vectorPerServing,
                vectorPer100g,
                page,
                per_page
            );
        }

        console.log(`[OCR] Found ${similarSupplements.total} similar supplements`);

        res.json({
            success: true,
            extracted: {
                supplement_name: ocrResult.data?.supplement_name || 'Generic',
                supplement_brand: ocrResult.data?.supplement_brand || 'Generic',
                supplement_description: ocrResult.data?.supplement_description || null,
                supplement_ingredient: ocrResult.data?.supplement_ingredient || [],
                serving_size_text: ocrResult.data?.serving_size_text || null,
                serving_size_grams: ocrResult.data?.serving_size_grams || null,
                nutritional_info_per_serving: ocrResult.data?.nutritional_info_per_serving || null,
                nutritional_info_per_100g: ocrResult.data?.nutritional_info_per_100g || null,
                supplement_warning_label: ocrResult.data?.supplement_warning_label || null,
                supplement_certifications: ocrResult.data?.supplement_certifications || null,
                batch_testing_org: ocrResult.data?.batch_testing_org || null
            },
            similar_supplements: {
                data: similarSupplements.supplements,
                pagination: {
                    page: similarSupplements.page,
                    per_page: similarSupplements.per_page,
                    total: similarSupplements.total,
                    total_pages: similarSupplements.total_pages
                }
            },
            vectors: {
                has_per_serving: !!vectorPerServing,
                has_per_100g: !!vectorPer100g,
                per_100g_calculated: ocrResult.vectors?.per_100g_calculated || false
            },
            ocr_text: ocrResult.ocr_text || null
        });

    } catch (error) {
        console.error('[OCR] Analyze error:', error.message);

        // Handle timeout
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return res.status(504).json({
                success: false,
                error: 'OCR service timeout. Please try again.'
            });
        }

        // Handle Python service unavailable
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                error: 'OCR service unavailable. Please ensure Python service is running.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to analyze nutrition label',
            details: error.message
        });
    }
}

// ============================================================================
// UC2: EXTRACT BRAND/NAME/BATCH ID
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
            batch_image: { required: false }
        });

        if (!fileValidation.valid) {
            return res.status(400).json({
                success: false,
                error: fileValidation.error
            });
        }

        const brandImage = req.files.brand_image[0];
        const batchImage = req.files.batch_image?.[0] || null;

        console.log(`[OCR] Extracting info from images`);
        console.log(`  - Brand image: ${brandImage.originalname}`);
        if (batchImage) {
            console.log(`  - Batch image: ${batchImage.originalname}`);
        }

        // Step 1: Extract brand/name from brand image
        const identifyResult = await identifySupplementFromImage(
            brandImage.buffer,
            brandImage.originalname
        );

        if (!identifyResult.success) {
            return res.status(422).json({
                success: false,
                error: 'Failed to identify supplement from image',
                details: identifyResult.error
            });
        }

        // Step 2: Extract batch ID if batch image provided
        let batchResult = null;
        if (batchImage) {
            batchResult = await extractBatchIdFromImage(
                batchImage.buffer,
                batchImage.originalname
            );
        }

        console.log(`[OCR] Extracted: ${identifyResult.identification?.supplement_brand} - ${identifyResult.identification?.supplement_name}`);
        if (batchResult?.batch_id) {
            console.log(`[OCR] Batch ID: ${batchResult.batch_id} (confidence: ${batchResult.confidence})`);
        }

        res.json({
            success: true,
            extracted: {
                supplement_brand: identifyResult.identification?.supplement_brand || 'Unknown',
                supplement_name: identifyResult.identification?.supplement_name || 'Unknown',
                variant: identifyResult.identification?.variant || null,
                product_type: identifyResult.identification?.product_type || null,
                batch_id: batchResult?.batch_id || null,
                batch_id_confidence: batchResult?.confidence || null,
                batch_id_alternatives: batchResult?.possible_alternatives || []
            },
            ocr_text: {
                brand_image: identifyResult.ocr_text || null,
                batch_image: batchResult?.ocr_text || null
            }
        });

    } catch (error) {
        console.error('[OCR] Extract error:', error.message);

        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return res.status(504).json({
                success: false,
                error: 'OCR service timeout. Please try again.'
            });
        }

        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                error: 'OCR service unavailable. Please ensure Python service is running.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to extract information from images',
            details: error.message
        });
    }
}

// ============================================================================
// UC2: VERIFY BATCH TESTING
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
                error: 'Invalid request body',
                details: validation.error.errors
            });
        }

        const { supplement_brand, supplement_name, batch_id } = validation.data;

        console.log(`[OCR] Verifying: ${supplement_brand} - ${supplement_name}`);
        if (batch_id) {
            console.log(`[OCR] Batch ID: ${batch_id}`);
        }

        // Call Python batch verification service
        const verificationResult = await verifyBatchTesting(
            supplement_brand,
            supplement_name,
            batch_id
        );

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
                quick_links: verificationResult.quick_links || []
            },
            errors: verificationResult.errors || []
        });

    } catch (error) {
        console.error('[OCR] Verify error:', error.message);

        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return res.status(504).json({
                success: false,
                error: 'Verification service timeout. The certification sites may be slow. Please try again.'
            });
        }

        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                error: 'Verification service unavailable. Please ensure Python service is running.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to verify supplement',
            details: error.message
        });
    }
}

// ============================================================================
// LEGACY: ORIGINAL UPLOAD ENDPOINT
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
                error: fileValidation.error
            });
        }

        console.log(`[OCR] Legacy upload: ${req.file.originalname}`);

        const result = await analyzeNutritionLabel(req.file.buffer, req.file.originalname);
        res.json(result);

    } catch (error) {
        console.error('[OCR] Upload error:', error.message);
        res.status(500).json({
            success: false,
            error: 'OCR failed',
            details: error.message
        });
    }
}
