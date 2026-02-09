# NYSI Use Cases & Implementation Status

**Last Updated:** January 31, 2026
**Version:** 3.0
**Current Phase:** Phase 2 Complete, Vectorization & Webscraper Integration Complete

---

## Status Legend
- ✅ **Implemented & Tested** - Feature complete and working
- 🔄 **In Progress** - Currently being developed
- 📋 **Planned** - Scheduled for future development
- ⚠️ **Blocked** - Waiting on dependencies

---

## Table of Contents
1. [Supplement Management](#supplement-management)
2. [Inventory Management](#inventory-management)
3. [Advanced Features](#advanced-features)
4. [Catalog URL Management](#catalog-url-management)
5. [Staging Supplements](#staging-supplements)
6. [Athlete Management](#athlete-management)

---

## Supplement Management

### UC-SSS-001: List Supplements
**Status:** ✅ Implemented  
**Priority:** High  
**Tested:** Yes

**Description:**  
Display paginated list of supplements from database. Users can browse supplements 10 at a time using pagination controls.

**Implementation:**
- **Endpoint:** `GET /api/SSS/supplements?page={pageNumber}`
- **Files:**
  - `modules/SSS/services.js` - `getSupplementsByPage()`
  - `modules/SSS/controller.js` - `listSupplements()`
  - `modules/SSS/routes.js` - Route registration + Swagger docs
- **Pagination:** Server-side, 10 items per page
- **Ordering:** By ID DESC (newest first)

**Request:**
```
GET /api/SSS/supplements?page=1
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "supplement_name": "Vitamin D3 2000 IU",
      "supplement_brand": "Nature Made",
      "supplement_packaging_form": "BOTTLE",
      "supplement_status": "BATCH TESTED",
      "batch_testing_org": "NSF Certified",
      "product_source_url": ["https://product-url.com"]
    }
  ],
  "currentPage": 1,
  "totalPages": 5,
  "totalCount": 47,
  "searchQuery": null
}
```

**Business Rules:**
- Only show active packaging forms (`is_active = true`)
- Only show active statuses (`is_active = true`)

---

### UC-SSS-002: Search Supplements
**Status:** ✅ Implemented  
**Priority:** High  
**Tested:** Yes

**Description:**  
Search supplements across multiple fields with relevance ranking. Supports multi-word AND logic.

**Implementation:**
- **Endpoint:** `GET /api/SSS/supplements?search={query}&page={pageNumber}`
- **Files:**
  - `modules/SSS/services.js` - `searchSupplements()`, `getSearchResultCount()`
  - `modules/SSS/controller.js` - `listSupplements()` (enhanced)
  - `modules/SSS/routes.js` - Same endpoint handles both list and search

**Search Fields:**
1. Supplement Name (priority 1)
2. Supplement Brand (priority 2)
3. Ingredient (JSONB array) (priority 3)
4. Packaging Form (via JOIN) (priority 4)
5. Status (via JOIN) (priority 5)

**Search Behavior:**
- **Match Type:** Partial, case-insensitive
- **Multiple Words:** ALL must match (AND logic)
- **Empty Search:** Returns full library

**Request:**
```
GET /api/SSS/supplements?search=vitamin%20d3&page=1
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "supplement_name": "Vitamin D3 2000 IU",
      "relevance_order": 1
    }
  ],
  "currentPage": 1,
  "totalPages": 1,
  "totalCount": 3,
  "searchQuery": "vitamin d3"
}
```

**Example Queries:**
- `search=vitamin` → All supplements with "vitamin"
- `search=vitamin%20bottle` → "vitamin" AND "bottle"
- `search=batch%20tested` → Status search

---

### UC-SSS-005: View Supplement Details
**Status:** ✅ Implemented  
**Priority:** High  
**Tested:** Yes

**Description:**  
Display comprehensive information about a specific supplement including full details, stock summary, and related batches.

**Implementation:**
- **Endpoint:** `GET /api/SSS/supplements/:id?batchPage={pageNumber}`
- **Files:**
  - `modules/SSS/services.js` - `getSupplementById()`, `getSupplementStockSummary()`, `getSupplementBatches()`
  - `modules/SSS/controller.js` - `getSupplementDetails()`
  - `modules/SSS/routes.js` - Route registration + Swagger docs

**Request:**
```
GET /api/SSS/supplements/8483aa30-ff76-42e4-b8ba-3e03aae6de4e?batchPage=1
```

**Response:**
```json
{
  "supplement": {
    "id": "uuid",
    "supplement_name": "Vitamin D3 2000 IU",
    "supplement_brand": "Nature Made",
    "supplement_packaging_form": "BOTTLE",
    "supplement_packaging_form_id": "uuid",
    "supplement_status": "BATCH TESTED",
    "supplement_status_id": "uuid",
    "batch_testing_org": "NSF Certified",
    "product_source_url": ["https://url.com"],
    "supplement_description": "...",
    "supplement_ingredient": ["Vitamin D3", "MCT Oil"],
    "nutritional_info_per_100g": {"protein": "10g"},
    "nutritional_info_per_serving": {"vitamin_d": "2000 IU"},
    "nutritional_info_per_serving_definition": "1 softgel",
    "supplement_warning_label": "...",
    "supplement_certifications": "NSF Certified",
    "supplement_additional_information": "..."
  },
  "stockSummary": {
    "totalStock": 500,
    "totalBooked": 150,
    "available": 350
  },
  "batches": {
    "data": [
      {
        "id": "uuid",
        "batch_number": "BATCH-001",
        "batch_initial_quantity": 100,
        "booked": 25,
        "available": 75,
        "batch_status": "Approved"
      }
    ],
    "currentPage": 1,
    "totalPages": 2,
    "totalCount": 15
  }
}
```

**Features:**
- Shows ALL 14 editable fields
- Includes both display names AND IDs (for editing)
- Calculates real-time stock summary
- Paginates related batches

---
### UC-SSS-006: OCR-Based Supplement Identification
**Status:** ðŸ"„ In Progress (Infrastructure Complete, Integration Pending)  
**Priority:** Medium

**Description:**  
Upload supplement label image, extract text via OCR, parse with AI, generate vectors, and find similar supplements in database.

**Implementation:**
- **Python Service:** âœ… Complete (FastAPI service running on port 8001)
- **OCR Workflow:** âœ… Complete (PaddleOCR + GPT-4o-mini)
- **Vectorization:** âœ… Complete (BAAI/bge-small-en-v1.5)
- **Node.js Integration:** ðŸ"‹ Pending
- **Database Vectors:** âœ… Complete (vector(384) columns with indexes)

**Tech Stack:**
```
Python Service (Port 8001):
├── PaddleOCR 2.8.1      - Text extraction from images
├── PaddlePaddle 2.6.2   - OCR inference engine
├── GPT-4o-mini          - Structured data extraction
├── BGE-small-en-v1.5    - 384-dim embeddings
└── FastAPI              - REST API framework
```

**Current Capabilities:**

**1. OCR Endpoint:** `POST /api/ocr/analyze`
```bash
curl -X POST http://localhost:8001/api/ocr/analyze \
  -F "file=@supplement_label.jpg"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "supplement_name": "Omega-3 Fish Oil",
    "supplement_brand": "Nature Made",
    "supplement_ingredient": [
      {"name": "Fish Oil", "amount": null},
      {"name": "Gelatin", "amount": null}
    ],
    "nutritional_info_per_serving": {...},
    "nutritional_info_per_100g": {...}
  },
  "vectors": {
    "vector_per_serving": [0.123, -0.456, ...],  // 384 numbers
    "vector_per_100g": [0.234, -0.567, ...]      // 384 numbers
  }
}
```

**2. Vectorization Endpoint:** `POST /api/vectorization/generate`
```bash
curl -X POST http://localhost:8001/api/vectorization/generate \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": ["Vitamin D3", "MCT Oil"],
    "nutritional_info": {
      "nutrients": [
        {"name": "Vitamin D", "amount": "2000IU"}
      ]
    },
    "basis": "per_100g"
  }'
```

**Response:**
```json
{
  "success": true,
  "vector": [0.012, -0.034, 0.056, ...],  // 384 numbers
  "dimension": 384,
  "basis": "per_100g"
}
```

**Pending Integration:**

**Node.js Side (modules/SSS/controller.js):**
```javascript
// TODO: Call Python service when creating/updating supplements
export async function createSupplement(req, res) {
    const validated = createSupplementSchema.parse(req.body);
    
    // Generate vector
    const vectorResponse = await fetch('http://localhost:8001/api/vectorization/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ingredients: validated.supplement_ingredient,
            nutritional_info: validated.nutritional_info_per_100g,
            basis: 'per_100g'
        })
    });
    
    const { vector } = await vectorResponse.json();
    
    // Store with vector
    await services.createSupplement({
        ...validated,
        vector_100g_ingredient: vector
    });
}
```

**Testing Steps:**

**1. Test Python Service:**
```bash
# Start Python service
cd Python_Services
venv\Scripts\activate  # Windows
uvicorn app.main:app --reload --port 8001

# Access Swagger docs
http://localhost:8001/docs

# Test vectorization
POST /api/vectorization/generate with sample data

# Test OCR (if you have image)
POST /api/ocr/analyze with supplement label image
```

**2. Test Node.js Integration (Future):**
```bash
# Start both services
Terminal 1: cd Backend && npm start
Terminal 2: cd Python_Services && uvicorn app.main:app --reload --port 8001

# Create supplement via Node.js
POST http://localhost:8000/api/SSS/supplements

# Verify vector stored in database
SELECT vector_100g_ingredient FROM SSS.Supplement WHERE id = '...';
```

---

### UC-SSS-007: Find Alternative Supplements
**Status:** ✅ Implemented
**Priority:** Medium
**Tested:** Yes

**Description:**
Find similar supplements using vector similarity search (cosine similarity) when primary supplement is unavailable or out of stock.

**Prerequisites:**
- ✅ Database vector columns (vector_100g_ingredient, vector_perserving_ingredient)
- ✅ pgvector extension installed
- ✅ IVFFlat indexes created
- ✅ Python vectorization service running
- ✅ Supplements have vectors generated

**Implementation:**
- **Endpoint:** `GET /api/SSS/supplements/:id/alternatives?page={pageNumber}`
- **Files:**
  - `modules/SSS/controller.js` - `getAlternativeSupplements()`
  - `modules/SSS/services.js` - `getAlternativeSupplements()`
  - `modules/SSS/routes.js` - Route registration + Swagger docs
  - `modules/SSS/validation.js` - `SIMILARITY_THRESHOLD` constant (0.6)

**Similarity Calculation:**
- Uses cosine similarity on BOTH `vector_100g_ingredient` and `vector_perserving_ingredient`
- Shows BOTH similarity scores (per 100g and per serving)
- Orders results by the HIGHER of the two scores
- **Minimum threshold:** 60% similarity (configurable in validation.js)

**Stock Status Logic:**
- "Available": At least one batch with "AVAILABLE" status
- "Low Stock": At least one batch with "LOW STOCK" status (no available)
- "Out of Stock": No batches or no available/low stock batches

**Exclusions:**
- Current supplement (excluded from results)
- Supplements with "DISCONTINUED" status

**Request:**
```
GET /api/SSS/supplements/8483aa30-ff76-42e4-b8ba-3e03aae6de4e/alternatives?page=1
```

**Response (200 OK):**
```json
{
  "currentSupplementId": "8483aa30-ff76-42e4-b8ba-3e03aae6de4e",
  "currentSupplementName": "Vitamin D3 2000 IU",
  "alternatives": [
    {
      "id": "new-uuid-1",
      "supplement_name": "Vitamin D3 5000 IU",
      "supplement_brand": "NOW Foods",
      "similarity_score_100g": "92%",
      "similarity_score_perserving": "87%",
      "supplement_status": "BATCH TESTED",
      "stock_status": "Available"
    },
    {
      "id": "new-uuid-2",
      "supplement_name": "Vitamin D3 1000 IU",
      "supplement_brand": "Nature Made",
      "similarity_score_100g": "85%",
      "similarity_score_perserving": null,
      "supplement_status": "NOT BATCH TESTED",
      "stock_status": "Low Stock"
    }
  ],
  "currentPage": 1,
  "totalPages": 2,
  "totalCount": 15,
  "threshold": 0.6
}
```

**Response (No Results):**
```json
{
  "currentSupplementId": "8483aa30-ff76-42e4-b8ba-3e03aae6de4e",
  "currentSupplementName": "Unique Supplement",
  "alternatives": [],
  "currentPage": 1,
  "totalPages": 0,
  "totalCount": 0,
  "threshold": 0.6,
  "message": "No alternative supplements found matching the similarity threshold (60%)"
}
```

**Error Handling:**
- 400 Bad Request: Supplement has no vectors for similarity matching
- 404 Not Found: Supplement not found
- 500 Internal Server Error: Database error
```

### UC-SSS-009: Create Supplement (with Vectorization)
**Status:** ✅ Implemented + Vectorization Integration
**Priority:** High
**Tested:** Yes

**Description:**
Add new supplement to the library with comprehensive validation, business logic, and automatic vector generation for similarity search.

**Implementation:**
- **Endpoint:** `POST /api/SSS/supplements`
- **Files:**
  - `modules/SSS/validation.js` - `createSupplementSchema`
  - `modules/SSS/controller.js` - `createSupplement()`, `generateSupplementVectors()`
  - `modules/SSS/services.js` - `createSupplement()`, `checkDuplicateSupplement()`
  - `modules/SSS/routes.js` - Route registration + Swagger docs
- **External Service:** Python vectorization service (port 8001)

**Required Fields (Updated January 2026):**
- `supplement_name` (string, 1-255 chars)
- `supplement_packaging_form_id` (UUID)
- `supplement_status_id` (UUID)
- `supplement_ingredient` (array of strings, **min 1 item - required for vectorization**)
- At least ONE of: `nutritional_info_per_100g` OR `nutritional_info_per_serving` (**required for vectorization**)

**Request Body:**
```json
{
  "supplement_name": "Omega-3 Fish Oil 1000mg",
  "supplement_brand": "Nordic Naturals",
  "supplement_packaging_form_id": "607b0fac-9720-4f54-9592-1e19d8e5776a",
  "supplement_status_id": "9f3c014d-79e3-4454-b78b-3bde2e22889d",
  "batch_testing_org": "NSF Certified for Sport",
  "supplement_description": "High-quality omega-3 fish oil",
  "supplement_ingredient": ["Fish Oil", "EPA", "DHA", "Gelatin", "Glycerin"],
  "nutritional_info_per_100g": {"protein": "10g", "fat": "5g", "energy": "500 kcal"},
  "nutritional_info_per_serving": {"epa": "325mg", "dha": "225mg", "calories": "10"},
  "nutritional_info_per_serving_definition": "2 softgels",
  "supplement_warning_label": "Consult physician if pregnant",
  "supplement_certifications": "NSF Certified for Sport",
  "supplement_additional_information": "Third-party tested",
  "product_source_url": "https://nordicnaturals.com/omega-3"
}
```

**Response (201 Created):**
```json
{
  "message": "Supplement created successfully",
  "data": {
    "id": "newly-generated-uuid",
    "supplement_name": "Omega-3 Fish Oil 1000mg",
    "approved_by": "e9e9f927-40f4-4f0a-bdca-a5503b5974da",
    "supplement_input_type": "Manual",
    ...
  },
  "vectorization": {
    "vector_100g_ingredient": "generated",
    "vector_perserving_ingredient": "generated"
  }
}
```

**Business Logic:**
1. **Validation (Zod):**
   - Required: name, packaging_form_id, status_id, **supplement_ingredient (min 1)**
   - Required: **At least one nutritional info type**
   - Optional: All other fields
   - URL validation for product_source_url
   - UUID validation for IDs

2. **batch_testing_org Auto-Set:**
   - If status = "BATCH TESTED" → batch_testing_org REQUIRED
   - If status = "NOT BATCH TESTED" → batch_testing_org = "NIL" (auto-set)
   - If status = "DISCONTINUED" → batch_testing_org keeps value

3. **Duplicate Check:**
   - Check for existing supplement with same name + brand (case-insensitive)
   - Return 409 Conflict if duplicate found

4. **Vectorization (New - January 2026):**
   - Calls Python service at `POST http://localhost:8001/api/vectorization/generate`
   - Generates `vector_100g_ingredient` if `nutritional_info_per_100g` provided
   - Generates `vector_perserving_ingredient` if `nutritional_info_per_serving` provided
   - Transforms nutritional data to Python service format before sending
   - **Strict error handling:** Creation fails if vectorization fails

5. **Auto-Set Fields:**
   - `id` = gen_random_uuid()
   - `approved_by` = 'e9e9f927-40f4-4f0a-bdca-a5503b5974da' (system user)
   - `supplement_input_type` = 'Manual'
   - `vector_100g_ingredient` = Generated by Python service
   - `vector_perserving_ingredient` = Generated by Python service

**Vectorization Process:**
```
1. Validate ingredients exist (required)
2. Validate at least one nutritional info exists
3. Transform nutritional data → Python service format
4. Call Python service for per_100g vector (if data exists)
5. Call Python service for per_serving vector (if data exists)
6. Store supplement with vectors in database
```

**Error Handling:**
- 400 Bad Request: Validation failed, missing ingredients, missing nutritional info
- 409 Conflict: Duplicate supplement
- 500 Internal Server Error: Database error or vectorization service failure

---

### UC-SSS-010: Update Supplement (with Conditional Vectorization)
**Status:** ✅ Implemented + Vectorization Integration
**Priority:** High
**Tested:** Yes

**Description:**
Update one or more fields of an existing supplement. Supports partial updates with conditional vector regeneration.

**Implementation:**
- **Endpoint:** `PATCH /api/SSS/supplements/:id`
- **Files:**
  - `modules/SSS/validation.js` - `updateSupplementSchema` (with partial update fix)
  - `modules/SSS/controller.js` - `updateSupplement()`, `generateSupplementVectors()`
  - `modules/SSS/services.js` - `updateSupplement()`, `getSupplementById()`
  - `modules/SSS/routes.js` - Route registration + Swagger docs
- **External Service:** Python vectorization service (port 8001)

**14 Editable Fields:**
1. supplement_name
2. supplement_brand
3. supplement_packaging_form_id
4. supplement_status_id
5. batch_testing_org
6. supplement_description
7. supplement_ingredient (**triggers vectorization**)
8. nutritional_info_per_100g (**triggers vectorization**)
9. nutritional_info_per_serving (**triggers vectorization**)
10. nutritional_info_per_serving_definition
11. supplement_warning_label
12. supplement_certifications
13. supplement_additional_information
14. product_source_url

**Request Body (only fields to update):**
```json
{
  "supplement_name": "Omega-3 Fish Oil 1200mg",
  "supplement_description": "Updated description"
}
```

**Response (200 OK):**
```json
{
  "message": "Supplement updated successfully",
  "data": {
    "id": "uuid",
    "supplement_name": "Omega-3 Fish Oil 1200mg",
    "supplement_description": "Updated description",
    ...
  },
  "vectorization": {
    "vector_100g_ingredient": null,
    "vector_perserving_ingredient": null
  }
}
```

**Business Logic:**
- Only provided fields are updated (partial update)
- Unmodified fields remain unchanged
- Same batch_testing_org logic as create
- Dynamic SQL query generation

**Conditional Vectorization (New - January 2026):**
Vectors are only regenerated if specific fields change:

| Field Changed | Vector Action |
|---------------|---------------|
| `supplement_ingredient` | Regenerate BOTH vectors |
| `nutritional_info_per_100g` only | Regenerate only `vector_100g_ingredient` |
| `nutritional_info_per_serving` only | Regenerate only `vector_perserving_ingredient` |
| Other fields only | No vectorization |

**Vectorization Logic:**
```javascript
// Determine what needs regeneration
const ingredientsChanged = validated.supplement_ingredient !== undefined;
const per100gChanged = validated.nutritional_info_per_100g !== undefined;
const perServingChanged = validated.nutritional_info_per_serving !== undefined;

// If ingredients change, regenerate both vectors
if (ingredientsChanged) {
    regenerate100g = true;
    regeneratePerServing = true;
} else {
    // Only regenerate affected vectors
    regenerate100g = per100gChanged;
    regeneratePerServing = perServingChanged;
}
```

**Merged Data for Vectorization:**
When regenerating vectors, the system merges:
- Updated data from request
- Existing data from database (for fields not being updated)

**⚠️ Important Fix (January 2026):**
Fixed Zod transform to preserve `undefined` values during partial updates:
```javascript
// Prevents unprovided fields from being set to NULL
.transform(val => {
    if (val === undefined) return undefined;  // Preserve undefined
    return val || null;  // Only convert empty string to null
})
```

**Error Handling:**
- 400 Bad Request: Validation failed, no fields to update, or missing nutritional data for vectorization
- 404 Not Found: Supplement doesn't exist
- 500 Internal Server Error: Database error or vectorization service failure

---

### UC-SSS-011: Delete Supplement
**Status:** ✅ Implemented  
**Priority:** High  
**Tested:** Yes

**Description:**  
Permanently delete one or more supplements from database (hard delete). Supports bulk deletion.

**Implementation:**
- **Endpoint:** `DELETE /api/SSS/supplements`
- **Files:**
  - `modules/SSS/validation.js` - `bulkDeleteSchema`
  - `modules/SSS/controller.js` - `deleteSupplements()`
  - `modules/SSS/services.js` - `deleteSupplements()`
  - `modules/SSS/routes.js` - Route registration + Swagger docs

**Request Body:**
```json
{
  "ids": [
    "uuid-1",
    "uuid-2",
    "uuid-3"
  ]
}
```

**Response (200 OK):**
```json
{
  "message": "Successfully deleted 3 supplement(s)",
  "deletedCount": 3,
  "deletedIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Important Notes:**
- ⚠️ **PERMANENT deletion** - Cannot be recovered
- May fail if foreign key constraints exist (batches)
- Consider deleting batches first, or use CASCADE
- Future enhancement: Implement soft delete

**Error Handling:**
- 400 Bad Request: Invalid UUID format or empty array
- 500 Internal Server Error: Database error (e.g., FK constraint)

---

## Inventory Management

### UC-SSS-003: List Inventory Batches
**Status:** ✅ Implemented  
**Priority:** High  
**Tested:** Yes

**Description:**  
Display paginated list of inventory batches with stock calculations.

**Implementation:**
- **Endpoint:** `GET /api/SSS/batches?page={pageNumber}`
- **Files:**
  - `modules/SSS/services.js` - `getBatchesByPage()`, `getTotalBatchCount()`
  - `modules/SSS/controller.js` - `listBatches()`
  - `modules/SSS/routes.js` - Route registration + Swagger docs

**Stock Calculation:**
```javascript
booked = SUM(all Inventory_Ticket.quantity for this batch)
available = batch_initial_quantity - booked
batch_status = Retrieved from Batch_Stock_Status_Lookup (STORED)
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "batch_number": "BATCH-001",
      "batch_initial_quantity": 100,
      "batch_price": 29.99,
      "batch_expiration_date": "2026-12-31",
      "supplement_name": "Vitamin D3 2000 IU",
      "supplement_brand": "Nature Made",
      "booked": 35,
      "available": 65,
      "batch_status": "Approved"
    }
  ],
  "currentPage": 1,
  "totalPages": 10,
  "totalCount": 95,
  "searchQuery": null
}
```

**Note:** `batch_status` is stored in database, not calculated (e.g., "Approved", "Quarantined", "Pending", "Expired")

---

### UC-SSS-004: Search Inventory
**Status:** ✅ Implemented  
**Priority:** High  
**Tested:** Yes

**Description:**  
Search inventory batches across batch number, supplement name/brand, and batch status.

**Implementation:**
- **Endpoint:** `GET /api/SSS/batches?search={query}&page={pageNumber}`
- **Files:**
  - `modules/SSS/services.js` - `searchBatches()`, `getSearchBatchCount()`
  - `modules/SSS/controller.js` - `listBatches()` (enhanced)
  - `modules/SSS/routes.js` - Same endpoint handles both list and search

**Search Fields:**
1. Batch Number (priority 1)
2. Supplement Name (priority 2)
3. Supplement Brand (priority 3)
4. Batch Status (priority 4)

**Example Queries:**
- `search=vitamin` → Batches with "vitamin" in supplement name
- `search=BATCH-001` → Specific batch
- `search=approved` → All approved batches
- `search=vitamin%20approved` → "vitamin" AND "approved"

---

### UC-SSS-012: Create Batch
**Status:** ✅ Implemented  
**Priority:** High  
**Tested:** Yes

**Description:**  
Add a new inventory batch to the database. Each batch is unique and tracks a specific lot of supplement inventory.

**Implementation:**
- **Endpoint:** `POST /api/SSS/batches`
- **Files:**
  - `modules/SSS/validation.js` - `createBatchSchema`, `getBatchStockStatusByName()`
  - `modules/SSS/controller.js` - `createBatch()`
  - `modules/SSS/services.js` - `createBatch()`, `checkDuplicateBatchNumber()`, `getSupplementById()`
  - `modules/SSS/routes.js` - Route registration + Swagger docs

**Required Fields:**
- `supplement_id` (UUID)
- `batch_number` (string, 1-100 chars)
- `batch_initial_quantity` (integer, min 1)

**Optional Fields:**
- `batch_price` (decimal, can be 0, not negative)
- `batch_expiration_date` (date)
- `batch_manufacture_date` (date)

**Auto-Set Fields:**
- `batch_stock_status_id` → Dynamically looked up for "available" status

**Request Example:**
```json
{
  "supplement_id": "8483aa30-ff76-42e4-b8ba-3e03aae6de4e",
  "batch_number": "BATCH-015",
  "batch_initial_quantity": 200,
  "batch_price": 24.99,
  "batch_expiration_date": "2027-06-30",
  "batch_manufacture_date": "2026-01-15"
}
```

**Response (201 Created):**
```json
{
  "message": "Batch created successfully",
  "data": {
    "id": "newly-generated-uuid",
    "supplement_id": "8483aa30-ff76-42e4-b8ba-3e03aae6de4e",
    "batch_number": "BATCH-015",
    "batch_initial_quantity": 200,
    "batch_price": 24.99,
    "batch_expiration_date": "2027-06-30",
    "batch_manufacture_date": "2026-01-15",
    "batch_stock_status_id": "status-uuid",
    "batch_stock_status": "available"
  }
}
```

**Business Logic:**
1. **Validation (Zod):**
   - Required: supplement_id, batch_number, batch_initial_quantity
   - Optional: batch_price (≥0), expiration_date, manufacture_date
   - No date validation (trust user input)

2. **batch_stock_status_id Auto-Set:**
   - Dynamically look up "available" status from `Batch_Stock_Status_Lookup`
   - Auto-set to this status for all new batches

3. **Duplicate Check:**
   - Check for existing batch with same `batch_number` for the same `supplement_id`
   - Return 409 Conflict if duplicate found

4. **Supplement Validation:**
   - Verify `supplement_id` exists in database
   - Return 400 Bad Request if supplement not found

**Error Handling:**
- 400 Bad Request: Validation failed or invalid supplement_id
- 409 Conflict: Duplicate batch number for this supplement
- 500 Internal Server Error: Database error

---

### UC-SSS-013: Update Batch
**Status:** ✅ Implemented  
**Priority:** High  
**Tested:** Yes

**Description:**  
Update one or more fields of an existing batch. Supports partial updates.

**Implementation:**
- **Endpoint:** `PATCH /api/SSS/batches/:id`
- **Files:**
  - `modules/SSS/validation.js` - `updateBatchSchema`
  - `modules/SSS/controller.js` - `updateBatch()`
  - `modules/SSS/services.js` - `updateBatch()`, `getBatchById()`
  - `modules/SSS/routes.js` - Route registration + Swagger docs

**Editable Fields:**
1. supplement_id
2. batch_number
3. batch_initial_quantity (no validation - trust user)
4. batch_price
5. batch_expiration_date
6. batch_manufacture_date

**Cannot Update:**
- `id` (primary key)
- `batch_stock_status_id` (managed by system based on stock levels)

**Request Body (only fields to update):**
```json
{
  "batch_number": "BATCH-015-REVISED",
  "batch_price": 27.99,
  "batch_expiration_date": "2027-12-31"
}
```

**Response (200 OK):**
```json
{
  "message": "Batch updated successfully",
  "data": {
    "id": "uuid",
    "supplement_id": "8483aa30-ff76-42e4-b8ba-3e03aae6de4e",
    "batch_number": "BATCH-015-REVISED",
    "batch_initial_quantity": 200,
    "batch_price": 27.99,
    "batch_expiration_date": "2027-12-31",
    "batch_manufacture_date": "2026-01-15",
    "batch_stock_status_id": "status-uuid"
  }
}
```

**Business Logic:**
- Only provided fields are updated (partial update)
- Unmodified fields remain unchanged
- No validation on quantity updates (trust user knows what they're doing)
- Check for duplicate batch_number if updating this field
- Verify new supplement_id exists if changing supplement

**Error Handling:**
- 400 Bad Request: Validation failed, no fields to update, or invalid supplement_id
- 404 Not Found: Batch doesn't exist
- 409 Conflict: Duplicate batch number for supplement
- 500 Internal Server Error: Database error

---

### UC-SSS-014: Delete Batch
**Status:** ✅ Implemented  
**Priority:** High  
**Tested:** Yes

**Description:**  
Permanently delete one or more batches from database (hard delete). Supports bulk deletion. Prevents deletion if batch has existing tickets.

**Implementation:**
- **Endpoint:** `DELETE /api/SSS/batches`
- **Files:**
  - `modules/SSS/validation.js` - `bulkDeleteSchema`
  - `modules/SSS/controller.js` - `deleteBatches()`
  - `modules/SSS/services.js` - `deleteBatches()`, `checkBatchHasTickets()`, `getBatchById()`
  - `modules/SSS/routes.js` - Route registration + Swagger docs

**Request Body:**
```json
{
  "ids": [
    "batch-uuid-1",
    "batch-uuid-2",
    "batch-uuid-3"
  ]
}
```

**Response (200 OK):**
```json
{
  "message": "Successfully deleted 3 batch(es)",
  "deletedCount": 3,
  "deletedIds": ["batch-uuid-1", "batch-uuid-2", "batch-uuid-3"]
}
```

**Response (409 Conflict - Has Tickets):**
```json
{
  "error": "Cannot delete batches with existing tickets",
  "message": "One or more batches have inventory tickets assigned. Please remove tickets first.",
  "batchesWithTickets": [
    {
      "id": "batch-uuid-1",
      "batch_number": "BATCH-001"
    },
    {
      "id": "batch-uuid-2",
      "batch_number": "BATCH-005"
    }
  ]
}
```

**Business Logic:**
1. **Validation (Zod):**
   - Array of UUIDs required
   - Minimum 1 ID

2. **Ticket Check:**
   - For each batch, check if tickets exist in `Inventory_Ticket` table
   - If ANY batch has tickets, prevent deletion of ALL batches
   - Return list of batches that have tickets

3. **Bulk Delete:**
   - If no tickets found, delete all batches at once
   - Hard delete (permanent)

**Important Notes:**
- ⚠️ **PERMANENT deletion** - Cannot be recovered
- ⚠️ **Prevents deletion if tickets exist** - Must remove tickets first
- ✅ Supports bulk deletion (multiple IDs)

**Error Handling:**
- 400 Bad Request: Invalid UUID format or empty array
- 409 Conflict: One or more batches have existing tickets
- 500 Internal Server Error: Database error

---

## Advanced Features

### UC-SSS-006: OCR-Based Supplement Identification
**Status:** 📋 Planned  
**Priority:** Medium

**Description:**  
Upload supplement label image, extract text via OCR, parse with AI, and find similar supplements in database.

**Dependencies:**
- ⚠️ OCR service (exists but not integrated)
- ⚠️ AI agent for text parsing
- ⚠️ pgvector for similarity search
- ⚠️ Embedding model selection

**Planned Flow:**
1. User uploads supplement label image
2. Image sent to OCR service (FastAPI + PaddleOCR)
3. Text extracted from image
4. AI agent parses text to extract:
   - Supplement name
   - Brand
   - Ingredients
   - Nutritional info
5. Generate embedding vector from parsed data
6. Compare vector with database supplement vectors
7. Return top matching supplements with similarity scores

**Planned Endpoint:**
```
POST /api/SSS/supplements/ocr
Content-Type: multipart/form-data
```

**Planned Response:**
```json
{
  "extracted_text": "...",
  "parsed_data": {
    "name": "Vitamin D3 2000 IU",
    "brand": "Nature Made",
    "ingredients": ["Vitamin D3", "MCT Oil"]
  },
  "matches": [
    {
      "id": "uuid",
      "supplement_name": "Vitamin D3 2000 IU",
      "supplement_brand": "Nature Made",
      "similarity": 0.95
    }
  ]
}
```

---

### UC-SSS-007: Find Alternative Supplements
**Status:** 📋 Planned  
**Priority:** Medium

**Description:**  
Find similar supplements to a selected supplement from database. Useful when primary supplement is out of stock.

**Dependencies:**
- ⚠️ pgvector extension configured
- ⚠️ Embedding vectors generated for all supplements
- ⚠️ Similarity threshold defined

**Planned Flow:**
1. User views supplement detail page
2. User clicks "Find Alternatives" button
3. System retrieves supplement's embedding vector
4. System performs vector similarity search
5. Returns top 10 most similar supplements
6. Display alternatives with similarity percentages

**Planned Endpoint:**
```
GET /api/SSS/supplements/:id/similar
```

**Planned Response:**
```json
{
  "sourceSupplementId": "uuid",
  "sourceSupplementName": "Vitamin D3 2000 IU",
  "alternatives": [
    {
      "id": "uuid",
      "supplement_name": "Vitamin D3 5000 IU",
      "supplement_brand": "NOW Foods",
      "similarity": 92,
      "price_difference": "+$3.00",
      "in_stock": true
    }
  ]
}
```

---

### UC-SSS-008: Web Scraping for Supplement Data
**Status:** ✅ Implemented (Backend Complete)
**Priority:** Medium
**Tested:** Yes

**Description:**
Automated collection of supplement data from external sources. Data flows to staging table for admin review before approval to main library.

**Implementation:**
- **Endpoint:** `POST /api/SSS/scraping/start`
- **Files:**
  - `modules/SSS/controller.js` - `startScrapingJob()`
  - `modules/SSS/services.js` - `getActiveCatalogUrls()`
  - `modules/SSS/validation.js` - `startScrapingSchema`
  - `modules/SSS/routes.js` - Route registration + Swagger docs
- **External Service:** Python webscraper service (port 8001)

**Data Flow:**
```
Catalog URLs → Python Scraper → Staging Table → Admin Review → Approve → Main Library
```

**Request Body:**
```json
{
  "catalog_url_ids": ["uuid-1", "uuid-2"]
}
```

**Response (202 Accepted - Fire and Forget):**
```json
{
  "message": "Scraping started successfully",
  "catalogs_to_scrape": [
    {
      "id": "uuid-1",
      "url": "https://iherb.com/vitamins"
    }
  ],
  "total_catalogs": 1,
  "info": "Scraping is running in the background. Check 'Staging Supplements' page later to review results."
}
```

**Features:**
- ✅ Select specific catalog URLs to scrape
- ✅ Scrape all active URLs if none specified
- ✅ Fire-and-forget async processing
- ✅ Results written to `SSS.Supplement_Staging`
- ✅ All staging entries marked `is_reviewed = false`

**Error Handling:**
- 400 Bad Request: No active catalog URLs found
- 500 Internal Server Error: Scraping submission failed

---

## Catalog URL Management

### UC-ADMIN-001: List Catalog URLs
**Status:** ✅ Implemented
**Priority:** High
**Tested:** Yes

**Description:**
Display paginated list of catalog URLs configured for web scraping.

**Implementation:**
- **Endpoint:** `GET /api/SSS/catalog-urls?page={pageNumber}`
- **Files:**
  - `modules/SSS/controller.js` - `listCatalogUrls()`
  - `modules/SSS/services.js` - `getCatalogUrls()`, `getTotalCatalogUrlCount()`
  - `modules/SSS/routes.js` - Route registration + Swagger docs

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "product_catalog_website": "https://iherb.com/vitamins",
      "is_active": true
    }
  ],
  "currentPage": 1,
  "totalPages": 1,
  "totalCount": 1
}
```

---

### UC-ADMIN-002: Get Catalog URL Details
**Status:** ✅ Implemented
**Priority:** High
**Tested:** Yes

**Description:**
Retrieve details of a specific catalog URL.

**Implementation:**
- **Endpoint:** `GET /api/SSS/catalog-urls/:id`
- **Files:**
  - `modules/SSS/controller.js` - `getCatalogUrlDetails()`
  - `modules/SSS/services.js` - `getCatalogUrlById()`

**Response (200 OK):**
```json
{
  "id": "uuid",
  "product_catalog_website": "https://iherb.com/vitamins",
  "is_active": true
}
```

**Error Handling:**
- 400 Bad Request: Invalid UUID format
- 404 Not Found: Catalog URL not found

---

### UC-ADMIN-003: Create Catalog URL
**Status:** ✅ Implemented
**Priority:** High
**Tested:** Yes

**Description:**
Add a new catalog URL for web scraping.

**Implementation:**
- **Endpoint:** `POST /api/SSS/catalog-urls`
- **Files:**
  - `modules/SSS/controller.js` - `createCatalogUrl()`
  - `modules/SSS/services.js` - `createCatalogUrl()`, `checkDuplicateCatalogUrl()`
  - `modules/SSS/validation.js` - `createCatalogUrlSchema`

**Request Body:**
```json
{
  "product_catalog_website": "https://iherb.com/vitamins",
  "is_active": true
}
```

**Response (201 Created):**
```json
{
  "message": "Catalog URL created successfully",
  "data": {
    "id": "newly-generated-uuid",
    "product_catalog_website": "https://iherb.com/vitamins",
    "is_active": true
  }
}
```

**Validation:**
- URL format validation
- Duplicate URL check (returns 409 Conflict if exists)

**Error Handling:**
- 400 Bad Request: Invalid URL format
- 409 Conflict: Duplicate URL
- 500 Internal Server Error: Database error

---

### UC-ADMIN-004: Update Catalog URL
**Status:** ✅ Implemented
**Priority:** High
**Tested:** Yes

**Description:**
Update an existing catalog URL (partial update supported).

**Implementation:**
- **Endpoint:** `PATCH /api/SSS/catalog-urls/:id`
- **Files:**
  - `modules/SSS/controller.js` - `updateCatalogUrl()`
  - `modules/SSS/services.js` - `updateCatalogUrl()`, `getCatalogUrlById()`
  - `modules/SSS/validation.js` - `updateCatalogUrlSchema`

**Request Body (only fields to update):**
```json
{
  "is_active": false
}
```

**Response (200 OK):**
```json
{
  "message": "Catalog URL updated successfully",
  "data": {
    "id": "uuid",
    "product_catalog_website": "https://iherb.com/vitamins",
    "is_active": false
  }
}
```

**Error Handling:**
- 400 Bad Request: No fields to update or invalid data
- 404 Not Found: Catalog URL not found
- 409 Conflict: Duplicate URL (if changing URL)
- 500 Internal Server Error: Database error

---

### UC-ADMIN-005: Delete Catalog URLs (Bulk)
**Status:** ✅ Implemented
**Priority:** High
**Tested:** Yes

**Description:**
Permanently delete one or more catalog URLs.

**Implementation:**
- **Endpoint:** `DELETE /api/SSS/catalog-urls`
- **Files:**
  - `modules/SSS/controller.js` - `deleteCatalogUrls()`
  - `modules/SSS/services.js` - `deleteCatalogUrls()`
  - `modules/SSS/validation.js` - `bulkDeleteSchema`

**Request Body:**
```json
{
  "ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Response (200 OK):**
```json
{
  "message": "Successfully deleted 3 catalog URL(s)",
  "deletedCount": 3,
  "deletedIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Error Handling:**
- 400 Bad Request: Invalid UUID format or empty array
- 500 Internal Server Error: Database error

---

## Staging Supplements

### UC-ADMIN-006: List Staging Supplements
**Status:** ✅ Implemented
**Priority:** High
**Tested:** Yes

**Description:**
Display paginated list of supplements in staging (from web scraper) pending admin review.

**Implementation:**
- **Endpoint:** `GET /api/SSS/staging-supplements?page={pageNumber}`
- **Files:**
  - `modules/SSS/controller.js` - `listStagingSupplements()`
  - `modules/SSS/services.js` - `getStagingSupplements()`, `getTotalStagingCount()`

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "supplement_name": "Scraped Vitamin D3",
      "supplement_brand": "Some Brand",
      "is_reviewed": false,
      "scraper_version": "1.0",
      "product_source_url": ["https://source.com/product"]
    }
  ],
  "currentPage": 1,
  "totalPages": 5,
  "totalCount": 45
}
```

---

### UC-ADMIN-007: Update Staging Supplement
**Status:** ✅ Implemented
**Priority:** High
**Tested:** Yes

**Description:**
Edit a staging supplement before approval (fix scraper errors, add missing data).

**Implementation:**
- **Endpoint:** `PATCH /api/SSS/staging-supplements/:id`
- **Files:**
  - `modules/SSS/controller.js` - `updateStagingSupplement()`
  - `modules/SSS/services.js` - `updateStagingSupplement()`
  - `modules/SSS/validation.js` - `updateStagingSupplementSchema`

**Request Body (only fields to update):**
```json
{
  "supplement_name": "Corrected Vitamin D3 Name",
  "supplement_ingredient": ["Vitamin D3", "MCT Oil"]
}
```

**Response (200 OK):**
```json
{
  "message": "Staging supplement updated successfully",
  "data": { ... }
}
```

---

### UC-ADMIN-008: Approve Staging Supplements (Bulk)
**Status:** ✅ Implemented
**Priority:** High
**Tested:** Yes

**Description:**
Approve one or more staging supplements to move them to the main supplement library with vector generation.

**Implementation:**
- **Endpoint:** `POST /api/SSS/staging-supplements/approve`
- **Files:**
  - `modules/SSS/controller.js` - `approveStagingSupplements()`
  - `modules/SSS/services.js` - `moveStagingToSupplement()`
  - `modules/SSS/validation.js` - `approveStagingSchema`

**Request Body:**
```json
{
  "ids": ["staging-uuid-1", "staging-uuid-2"]
}
```

**Response (200 OK - All Succeeded):**
```json
{
  "message": "Successfully approved 2 supplement(s)",
  "approvedCount": 2,
  "approvedIds": ["staging-uuid-1", "staging-uuid-2"]
}
```

**Response (207 Multi-Status - Mixed Results):**
```json
{
  "message": "Partial approval: 1 succeeded, 1 failed",
  "succeeded": [
    {
      "stagingId": "staging-uuid-1",
      "supplementId": "new-supplement-uuid"
    }
  ],
  "failed": [
    {
      "stagingId": "staging-uuid-2",
      "error": "Missing required ingredient data"
    }
  ]
}
```

**Approval Process:**
1. Validate staging supplement has required fields
2. Generate vectors via Python service
3. Insert into main `supplement_library` table
4. Mark staging entry as `is_reviewed = true`
5. Set `supplement_input_type = 'Scraped'`

**Error Handling:**
- 400 Bad Request: Empty IDs array
- 207 Multi-Status: Some approvals failed
- 500 Internal Server Error: Database error

---

### UC-ADMIN-009: Delete Staging Supplements (Bulk)
**Status:** ✅ Implemented
**Priority:** High
**Tested:** Yes

**Description:**
Permanently delete staging supplements (reject scraped data).

**Implementation:**
- **Endpoint:** `DELETE /api/SSS/staging-supplements`
- **Files:**
  - `modules/SSS/controller.js` - `deleteStagingSupplements()`
  - `modules/SSS/services.js` - `deleteStagingSupplements()`

**Request Body:**
```json
{
  "ids": ["staging-uuid-1", "staging-uuid-2"]
}
```

**Response (200 OK):**
```json
{
  "message": "Successfully deleted 2 staging supplement(s)",
  "deletedCount": 2,
  "deletedIds": ["staging-uuid-1", "staging-uuid-2"]
}
```

---

## Athlete Management

### AMS Module
**Status:** 📋 Planned - Structure exists, features not implemented  
**Priority:** Medium

**Planned Capabilities:**
1. **Athlete Profile Management**
   - Create/update/delete athlete profiles
   - Store personal information
   - Track health metrics
   - Document allergies and restrictions

2. **Supplement Assignment Tracking**
   - Assign supplements to athletes
   - Create inventory tickets
   - Track consumption patterns
   - Monitor adherence

3. **Progress Monitoring**
   - Health metrics over time
   - Supplement effectiveness tracking
   - Before/after comparisons
   - Generate progress reports

**Planned Endpoints:**
```
GET    /api/AMS/athletes
GET    /api/AMS/athletes/:id
POST   /api/AMS/athletes
PATCH  /api/AMS/athletes/:id
DELETE /api/AMS/athletes

GET    /api/AMS/athletes/:id/supplements
POST   /api/AMS/athletes/:id/supplements
DELETE /api/AMS/athletes/:id/supplements/:supplementId
```

---

## Implementation Roadmap

### Phase 1: Supplement CRUD ✅ COMPLETE
- ✅ UC-SSS-001: List Supplements
- ✅ UC-SSS-002: Search Supplements
- ✅ UC-SSS-003: List Batches
- ✅ UC-SSS-004: Search Batches
- ✅ UC-SSS-005: View Supplement Details
- ✅ UC-SSS-009: Create Supplement
- ✅ UC-SSS-010: Update Supplement (with partial update fix)
- ✅ UC-SSS-011: Delete Supplement

### Phase 2: Batch CRUD ✅ COMPLETE
- ✅ UC-SSS-012: Create Batch
- ✅ UC-SSS-013: Update Batch
- ✅ UC-SSS-014: Delete Batch

### Phase 2.5: Vectorization & Webscraper Integration ✅ COMPLETE
- ✅ UC-SSS-007: Find Alternatives (Vector Similarity Search)
- ✅ UC-SSS-009: Create Supplement (with vectorization)
- ✅ UC-SSS-010: Update Supplement (with conditional vectorization)
- ✅ UC-SSS-008: Web Scraping for Supplement Data
- ✅ UC-ADMIN-001 to UC-ADMIN-005: Catalog URL CRUD
- ✅ UC-ADMIN-006 to UC-ADMIN-009: Staging Supplements Management

### Phase 3: Authentication & Advanced Features (Next)
- 📋 Authentication & Authorization
- 📋 UC-SSS-006: OCR Integration (Infrastructure ready)
- 📋 File Upload for Images
- 📋 Batch status updates based on stock levels

### Phase 4: Athlete Management (3-6 months)
- 📋 AMS Module Implementation
- 📋 Athlete Profiles
- 📋 Supplement Assignments
- 📋 Progress Tracking

### Phase 5: Automation & Optimization (6+ months)
- 📋 Scheduled scraping jobs
- 📋 Price Monitoring
- 📋 Inventory Forecasting
- 📋 GPU support for faster vectorization

---

## Testing Coverage

### Implemented Features (Tested via Swagger)

**Supplement CRUD:**
- ✅ List supplements with pagination
- ✅ Search supplements (multi-field)
- ✅ View supplement details with stock
- ✅ Create supplement (minimal & complete, with vectorization)
- ✅ Update supplement (single & multiple fields, partial update fix, conditional vectorization)
- ✅ Delete supplement (single & bulk)
- ✅ Business logic (batch_testing_org auto-set)
- ✅ Validation (required fields, UUIDs, URLs, ingredients, nutritional info)
- ✅ Error cases (400, 404, 409, 500)

**Batch CRUD:**
- ✅ List batches with stock calculations
- ✅ Search batches
- ✅ Create batch (minimal & complete)
- ✅ Update batch (single & multiple fields)
- ✅ Delete batch (single & bulk, with ticket validation)

**Vectorization & Alternatives:**
- ✅ Vector generation on supplement create
- ✅ Conditional vector regeneration on update
- ✅ Find alternative supplements (similarity search)
- ✅ Similarity threshold filtering (60%)
- ✅ Stock status in alternatives

**Admin - Catalog URLs:**
- ✅ List catalog URLs with pagination
- ✅ Get catalog URL details
- ✅ Create catalog URL (with duplicate check)
- ✅ Update catalog URL (partial update)
- ✅ Delete catalog URLs (bulk)

**Admin - Staging & Scraping:**
- ✅ List staging supplements
- ✅ Update staging supplement
- ✅ Approve staging supplements (bulk, with vectorization)
- ✅ Delete staging supplements (bulk)
- ✅ Start scraping job (selective or all)

### Pending Testing
- ❌ Unit tests
- ❌ Integration tests
- ❌ Load testing
- ❌ Security testing

---

## Known Limitations

### Current Phase
1. **No Authentication** - All endpoints publicly accessible
2. **Hard Delete Only** - No soft delete / recovery option
3. **Fixed Pagination** - Always 10 items per page
4. **No File Upload** - Cannot upload supplement images
5. **No Caching** - Every request hits database

### Future Enhancements
1. Implement soft delete for supplements
2. Configurable pagination size
3. Real-time stock alerts
4. Bulk import from CSV/Excel
5. Export to PDF/Excel
6. Advanced filtering (date ranges, price ranges)
7. Automated expiration notifications

---

## Known Issues & Fixes

### Issue: Partial Update Setting Fields to NULL (Fixed - January 2026)

**Problem:** When updating only one field (e.g., supplement_name), other optional fields were being set to NULL.

**Root Cause:** Zod transform was converting `undefined` to `null`:
```javascript
// ❌ BEFORE (WRONG)
.transform(val => val || null)  // undefined || null = null
```

**Fix Applied:** Updated `optionalTextSchema` in validation.js:
```javascript
// ✅ AFTER (CORRECT)
.transform(val => {
    if (val === undefined) return undefined;  // Preserve undefined
    return val || null;  // Only convert empty string to null
})
```

**Result:**
- Fields not provided → `undefined` → not included in UPDATE ✅
- Empty string provided → `null` → included in UPDATE ✅
- Value provided → stored as-is ✅

**Affected Fields (All Fixed):**
- supplement_brand
- supplement_description
- nutritional_info_per_serving_definition
- supplement_additional_information
- supplement_warning_label
- supplement_certifications
- batch_testing_org

---

## API Conventions

### Base URL
```
Development: http://localhost:8000
Production: TBD
```

### Module Routes
- SSS: `/api/SSS/*`
- AMS: `/api/AMS/*` (planned)
- OCR: `/api/ocr/*` (planned)

### Response Format Standard

**Success Response:**
```json
{
  "data": [...],
  "currentPage": 1,
  "totalPages": 10,
  "totalCount": 100,
  "searchQuery": "search-term"
}
```

**Error Response:**
```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": [
    {
      "field": "field_name",
      "message": "Specific error"
    }
  ]
}
```

### HTTP Status Codes
- `200 OK` - Successful GET, PATCH, DELETE
- `201 Created` - Successful POST
- `400 Bad Request` - Validation failed
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate resource
- `500 Internal Server Error` - Database/server error

---

**Document Version:** 3.0
**Last Updated:** January 31, 2026
**Changes:** Added vectorization integration for supplement create/update, catalog URL CRUD, staging supplements management, webscraper integration, find alternatives feature
**Next Review:** After Phase 3 (Authentication) implementation
**Maintained By:** Development Team
