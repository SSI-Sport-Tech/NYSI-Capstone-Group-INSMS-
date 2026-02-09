import express from "express";
import multer from "multer";
import { analyzeLabel, extractInfo, verifySupplements, runOCR } from "./controller.js";
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from "./validation.js";

const router = express.Router();

// ============================================================================
// MULTER CONFIGURATION
// ============================================================================

// Memory storage - files stored as Buffer (no disk I/O)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
    }
};

// Single file upload (for /analyze and /upload)
const uploadSingle = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE }
}).single('file');

// Multiple file upload (for /extract)
const uploadMultiple = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE }
}).fields([
    { name: 'brand_image', maxCount: 1 },
    { name: 'batch_image', maxCount: 1 }
]);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * @swagger
 * /api/ocr/analyze:
 *   post:
 *     summary: Analyze nutrition label and find similar supplements
 *     description: |
 *       Upload a nutrition label image to:
 *       1. Extract structured supplement data using OCR + LLM
 *       2. Generate embedding vectors
 *       3. Find similar supplements in the database (60% similarity threshold)
 *     tags: [OCR]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Nutrition label image (jpg, png, webp - max 10MB)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for similar supplements
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Successfully analyzed nutrition label
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 extracted:
 *                   type: object
 *                   properties:
 *                     supplement_name:
 *                       type: string
 *                       example: "Generic"
 *                     supplement_brand:
 *                       type: string
 *                       example: "Generic"
 *                     nutritional_info_per_serving:
 *                       type: object
 *                     nutritional_info_per_100g:
 *                       type: object
 *                 similar_supplements:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           supplement_id:
 *                             type: string
 *                           supplement_name:
 *                             type: string
 *                           supplement_brand:
 *                             type: string
 *                           similarity_score:
 *                             type: string
 *                             example: "0.8542"
 *                           matched_vector:
 *                             type: string
 *                             enum: [per_100g, per_serving]
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         per_page:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         total_pages:
 *                           type: integer
 *       400:
 *         description: Invalid file or parameters
 *       503:
 *         description: Python OCR service unavailable
 *       504:
 *         description: Request timeout
 */
router.post("/analyze", uploadSingle, analyzeLabel);

/**
 * @swagger
 * /api/ocr/extract:
 *   post:
 *     summary: Extract brand, name, and batch ID from images
 *     description: |
 *       Upload product images to extract:
 *       - Brand and product name (from brand_image - required)
 *       - Batch/lot number (from batch_image - optional)
 *
 *       Returns extracted info for user verification before batch testing check.
 *     tags: [OCR]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - brand_image
 *             properties:
 *               brand_image:
 *                 type: string
 *                 format: binary
 *                 description: Image with product brand/name (required)
 *               batch_image:
 *                 type: string
 *                 format: binary
 *                 description: Image with batch/lot number (optional)
 *     responses:
 *       200:
 *         description: Successfully extracted information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 extracted:
 *                   type: object
 *                   properties:
 *                     supplement_brand:
 *                       type: string
 *                       example: "Optimum Nutrition"
 *                     supplement_name:
 *                       type: string
 *                       example: "Gold Standard Whey"
 *                     variant:
 *                       type: string
 *                       example: "Vanilla Ice Cream"
 *                     batch_id:
 *                       type: string
 *                       nullable: true
 *                       example: "BN108446"
 *                     batch_id_confidence:
 *                       type: string
 *                       nullable: true
 *                       enum: [high, medium, low]
 *                     batch_id_alternatives:
 *                       type: array
 *                       items:
 *                         type: string
 *                 ocr_text:
 *                   type: object
 *                   properties:
 *                     brand_image:
 *                       type: string
 *                     batch_image:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Missing or invalid brand_image
 *       503:
 *         description: Python OCR service unavailable
 */
router.post("/extract", uploadMultiple, extractInfo);

/**
 * @swagger
 * /api/ocr/verify:
 *   post:
 *     summary: Verify supplement batch testing status
 *     description: |
 *       Submit verified supplement info to check batch testing status
 *       across 6 certification databases:
 *       - Informed Sport
 *       - Informed Choice
 *       - HASTA
 *       - NSF Sport
 *       - Cologne List
 *       - BSCG
 *
 *       If batch_id is provided, verifies the specific batch.
 *       Otherwise, verifies the product is in the certification database.
 *     tags: [OCR]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplement_brand
 *               - supplement_name
 *             properties:
 *               supplement_brand:
 *                 type: string
 *                 example: "Optimum Nutrition"
 *               supplement_name:
 *                 type: string
 *                 example: "Gold Standard Whey"
 *               batch_id:
 *                 type: string
 *                 nullable: true
 *                 example: "BN108446"
 *                 description: Optional batch/lot number for batch-specific verification
 *     responses:
 *       200:
 *         description: Verification completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 verification:
 *                   type: object
 *                   properties:
 *                     supplement_brand:
 *                       type: string
 *                     supplement_name:
 *                       type: string
 *                     batch_id:
 *                       type: string
 *                       nullable: true
 *                     is_verified:
 *                       type: boolean
 *                       description: True if found on at least one certification site
 *                     is_batch_tested:
 *                       type: boolean
 *                     batch_id_verified:
 *                       type: boolean
 *                       description: True if specific batch ID was verified (only if batch_id provided)
 *                     found_count:
 *                       type: integer
 *                       example: 2
 *                     found_websites:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Informed Sport", "NSF Sport"]
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           website:
 *                             type: string
 *                           product_url:
 *                             type: string
 *                           product_name:
 *                             type: string
 *                           confidence:
 *                             type: string
 *                     quick_links:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Direct URLs to product on certification sites
 *       400:
 *         description: Invalid request body
 *       503:
 *         description: Verification service unavailable
 *       504:
 *         description: Verification timeout (certification sites may be slow)
 */
router.post("/verify", verifySupplements);

/**
 * @swagger
 * /api/ocr/upload:
 *   post:
 *     summary: Legacy OCR upload endpoint
 *     description: |
 *       Original OCR endpoint - kept for backwards compatibility.
 *       Use /api/ocr/analyze for the enhanced version with similarity search.
 *     tags: [OCR]
 *     deprecated: true
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: OCR analysis result
 *       400:
 *         description: Invalid file
 *       500:
 *         description: OCR failed
 */
router.post("/upload", uploadSingle, runOCR);

export default router;
