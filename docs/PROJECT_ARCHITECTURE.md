# NYSI Nutritionist Web Application - Project Architecture

## Document Purpose
This document provides a comprehensive overview of the project architecture, technology stack, design patterns, and structural organization.

**Last Updated:** February 5, 2026
**Version:** 4.0
**Status:** Active Development - Phase 2.5 Complete, AMS Phase 1 Implemented

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Patterns](#architecture-patterns)
4. [Project Structure](#project-structure)
5. [Module Architecture](#module-architecture)
6. [Database Architecture](#database-architecture)
7. [API Design](#api-design)
8. [Data Flow](#data-flow)
9. [Security Architecture](#security-architecture)
10. [Future Architecture Plans](#future-architecture-plans)

---

## Project Overview

### Mission
Develop a comprehensive supplement management system for the New York Sports Institute (NYSI) to streamline supplement inventory, athlete nutrition tracking, and supplement verification through OCR technology.

### Core Modules
1. **SSS (Supplement Support System)** - Primary module for supplement management, inventory, staging, and web scraping
2. **AMS (Athlete Management System)** - Athlete profile CRUD with registry and medical records (Phase 1 Implemented)
3. **OCR Services** - Optical Character Recognition for supplement label scanning (In Progress)

### Current Phase
**Phase 2.5: Vectorization & Webscraper Integration** - ✅ Complete
- Full supplement lifecycle management
- Inventory batch tracking
- Search and filtering capabilities
- Swagger API documentation
- **Vectorization integration** - Auto-generate vectors on create/update
- **Alternative supplements** - Vector similarity search
- **Webscraper integration** - Catalog URLs, scraping, staging workflow
- **Admin endpoints** - Catalog URL CRUD, staging management

---

## Technology Stack

### Backend
```
Runtime:      Node.js v18+
Framework:    Express.js 4.x
Language:     JavaScript (ES6+ with ES Modules)
Validation:   Zod v3.x
Documentation: Swagger/OpenAPI 3.0
```

### Database
```
DBMS:         PostgreSQL 14+
Client:       pg (node-postgres)
UUID:         gen_random_uuid() (built-in)
Extensions:   pgcrypto (public schema)
              pgvector (planned)
```

### Development Tools
```
Package Manager: npm
Environment:     dotenv
API Testing:     Swagger UI
Linting:         ESLint (planned)
```

### External Services
```
OCR Engine:   PaddleOCR (Python)
OCR API:      FastAPI server
AI Agent:     Planned for text parsing
```

---

## Architecture Patterns

### 1. Layered Architecture (MVC-inspired)

```
┌─────────────────────────────────────────┐
│         Client (Swagger UI)             │
└─────────────────┬───────────────────────┘
                  │ HTTP Requests
┌─────────────────▼───────────────────────┐
│         Routes Layer                     │
│  - HTTP method routing                   │
│  - Swagger documentation                 │
│  - Parameter extraction                  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│       Controller Layer                   │
│  - Request validation (Zod)              │
│  - Business logic                        │
│  - Error handling                        │
│  - Response formatting                   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│        Service Layer                     │
│  - Database queries                      │
│  - Data transformation                   │
│  - Complex operations                    │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│       Database Layer                     │
│  - PostgreSQL                            │
│  - Schema: SSS, audit                    │
└─────────────────────────────────────────┘
```

### 2. Module Pattern

Each feature module is self-contained with:
- `routes.js` - API endpoints and Swagger docs
- `controller.js` - Business logic and validation
- `services.js` - Database operations
- `validation.js` - Zod schemas

### 3. Validation Strategy

**Two-tier validation:**
1. **Schema validation** (Zod) - Data structure and types
2. **Business validation** (Controller) - Business rules and constraints

Example:
```javascript
// Tier 1: Schema validation
createSupplementSchema.parse(req.body);

// Tier 2: Business validation
if (status === "BATCH TESTED" && !batch_testing_org) {
  throw new Error("batch_testing_org required");
}
```

---

## Project Structure

```
NYSI-Capstone-Group-INSMS-/
├── Backend/
│   ├── config/
│   │   ├── db.js                 # PostgreSQL connection pool
│   │   └── swagger.js            # Swagger/OpenAPI configuration
│   │
│   ├── modules/
│   │   ├── SSS/                  # Supplement Support System
│   │   │   ├── index.js          # Route aggregator (supplements + inventory + staging)
│   │   │   ├── supplements/      # Supplement CRUD, alternatives, lookups
│   │   │   │   ├── routes.js
│   │   │   │   ├── controller.js
│   │   │   │   ├── services.js
│   │   │   │   └── validation.js
│   │   │   ├── inventory/        # Batch CRUD
│   │   │   │   ├── routes.js
│   │   │   │   ├── controller.js
│   │   │   │   ├── services.js
│   │   │   │   └── validation.js
│   │   │   ├── staging/          # Staging review, approval, catalog URLs, scraping
│   │   │   │   ├── routes.js
│   │   │   │   ├── controller.js
│   │   │   │   ├── services.js
│   │   │   │   └── validation.js
│   │   │   └── shared/           # Reusable validators and helpers
│   │   │       ├── validation.js # uuidSchema, paginationSchema, bulkDeleteSchema, business logic helpers
│   │   │       └── vectorization.js # Python service integration helpers
│   │   │
│   │   ├── AMS/                  # Athlete Management System
│   │   │   ├── index.js          # Route aggregator
│   │   │   └── athlete/          # Athlete CRUD, registry, medical, lookups
│   │   │       ├── routes.js
│   │   │       ├── controller.js
│   │   │       ├── services.js
│   │   │       └── validation.js
│   │   │
│   │   └── OCR/                  # OCR Services (In Progress)
│   │
│   ├── server.js                 # Express app entry point
│   ├── package.json              # Dependencies
│   ├── .env                      # Environment variables
│   └── .gitignore
│
├── Python_Services/              # Python FastAPI microservice
│   ├── app/
│   │   ├── main.py               # FastAPI entry point
│   │   ├── config/settings.py    # Pydantic settings
│   │   ├── routers/
│   │   │   ├── ocr.py            # OCR endpoints
│   │   │   ├── vectorization.py  # Vectorization endpoints
│   │   │   └── webscraper.py     # Web scraper endpoints
│   │   └── services/
│   │       ├── vectorizer.py     # Embedding generation (BAAI/bge-small-en-v1.5)
│   │       └── nutrition_workflow.py  # OCR workflow
│   ├── requirements.txt
│   └── .env
│
├── frontend/                     # Next.js 15 frontend
│   └── app/                      # App Router pages
│
└── docs/
    ├── PROJECT_ARCHITECTURE.md
    ├── DATABASE_SCHEMA.md
    ├── AMS_DATABASE_SCHEMA.md
    ├── USE_CASES_IMPLEMENTATION.md
    ├── AI_ASSISTANT_GUIDELINES.md
    ├── PROJECT_INSTRUCTIONS.md
    └── PYTHON_SERVICES.md
```

---

## Module Architecture

### SSS Module (Supplement Support System)

#### Responsibility
Complete supplement lifecycle management: CRUD, inventory batch tracking, web scraper staging/approval, vectorization, and similarity search.

#### Sub-Module Structure
The SSS module is split into sub-modules, each with its own routes/controller/services/validation:

```
SSS/
├── index.js              # Aggregates all sub-module routes
├── supplements/          # Supplement CRUD, alternatives, lookups
├── inventory/            # Batch CRUD
├── staging/              # Staging review, approval, catalog URLs, scraping
└── shared/               # Reusable validators, vectorization helpers
```

**`index.js`** imports and mounts routes from each sub-module:
```javascript
import supplementRoutes from './supplements/routes.js';
import inventoryRoutes from './inventory/routes.js';
import stagingRoutes from './staging/routes.js';
router.use(supplementRoutes);
router.use(inventoryRoutes);
router.use(stagingRoutes);
```

#### supplements/ Sub-Module
- **CRUD**: list (paginated + search), get details (with stock summary + batches), create, update, delete
- **Alternatives**: Vector similarity search (60% threshold, cosine similarity via pgvector)
- **Lookups**: Packaging forms, supplement statuses, batch statuses, ticket statuses
- **Vectorization on create**: Generates both `vector_100g_ingredient` and `vector_perserving_ingredient`
- **Vectorization on update**: Re-generates vectors only if ingredients or nutritional info changed (merges existing data with updates)

#### inventory/ Sub-Module
- **Batch CRUD**: list (paginated + search), create (auto-sets status to "available"), update, delete
- **Deletion guard**: Cannot delete batches that have inventory tickets
- **Calculated fields**: `booked` (sum of ticket quantities) and `available` (initial - booked)

#### staging/ Sub-Module
- **Staging CRUD**: list unreviewed entries, get details, edit, bulk delete
- **Approval workflow**: Validates → generates vectors → checks for duplicates → promotes to main library
- **Duplicate detection**: 95% vector similarity + normalized name/brand comparison; duplicates auto-deleted from staging
- **Catalog URL CRUD**: Manage scraper target URLs
- **Scraping**: Fire-and-forget requests to Python service (`POST /api/webscraper/scrape-full`)

#### shared/ Sub-Module
- **validation.js**: Reusable Zod validators (`uuidSchema`, `paginationSchema`, `bulkDeleteSchema`), business logic helpers (`validateBatchTestingOrg`, `getSupplementStatusById`)
- **vectorization.js**: Python service integration helpers (`generateVector`, `generateSupplementVectors`, `transformNutritionalDataForVectorization`)
## Python Services Architecture

### Overview
A separate FastAPI microservice handles AI/ML operations that are resource-intensive or require Python-specific libraries.

**Port:** 8001  
**Framework:** FastAPI  
**Purpose:** OCR, Vectorization, Web Scraping (future)

### Architecture Diagram
```
┌─────────────────────────────────────────┐
│   Node.js Backend (Express)             │
│   Port: 8000                            │
│   - Supplement CRUD                     │
│   - Batch CRUD                          │
│   - Database operations                 │
│   - Calls Python for AI tasks ────┐    │
└─────────────────────────────────────│───┘
                                      │
                                      │ HTTP
                                      ↓
                    ┌─────────────────────────────────┐
                    │   Python FastAPI Service        │
                    │   Port: 8001                    │
                    │   - OCR (PaddleOCR + GPT-4o)   │
                    │   - Vectorization (BGE-small)   │
                    │   - Web Scraping (future)       │
                    └─────────────────────────────────┘
                                      │
                                      ↓
                    ┌─────────────────────────────────┐
                    │   PostgreSQL Database           │
                    │   - SSS.Supplement table        │
                    │   - vector(384) columns         │
                    └─────────────────────────────────┘
```

### Technology Stack
```
Runtime:      Python 3.11
Framework:    FastAPI 0.109.0
OCR:          PaddleOCR 2.8.1 + PaddlePaddle 2.6.2
LLM:          OpenAI GPT-4o-mini (via llama-index)
Embeddings:   BAAI/bge-small-en-v1.5 (384-dim)
ML:           PyTorch 2.0.1 (CPU), sentence-transformers
```

### Project Structure
```
Python_Services/
├── .env                    # API keys, configuration
├── requirements.txt        # Python dependencies (locked versions)
├── venv/                   # Virtual environment
└── app/
    ├── __init__.py
    ├── main.py            # FastAPI entry point
    ├── config/
    │   ├── __init__.py
    │   └── settings.py    # Pydantic settings
    ├── routers/
    │   ├── __init__.py
    │   ├── ocr.py              # OCR endpoints
    │   ├── vectorization.py    # Vectorization endpoints (/generate, /generate-product-vectors, /health)
    │   ├── webscraper.py       # Web scraper endpoints (/scrape-full)
    │   └── batch_verification.py # Batch verification endpoints
    ├── services/
    │   ├── __init__.py
    │   ├── nutrition_workflow.py  # OCR workflow
    │   └── vectorizer.py          # Embedding generation
    └── schemas/
        ├── __init__.py
        └── supplement.py  # Pydantic models
```

### Key Design Decisions

#### Why Separate Python Service?

**Reason 1: Vector Consistency**
- All vectors must use same embedding model
- Centralizing in Python ensures consistency
- JavaScript embeddings would create incompatible vectors

**Reason 2: Library Ecosystem**
- PaddleOCR, PyTorch, HuggingFace are Python-first
- Better ML library support in Python
- Easier to maintain one implementation

**Reason 3: Resource Isolation**
- OCR/vectorization are CPU-intensive
- Separate service prevents blocking Node.js event loop
- Can scale independently if needed

#### Why FastAPI?

- ✅ Async support (like Express)
- ✅ Automatic API documentation (Swagger)
- ✅ Pydantic validation (like Zod)
- ✅ Similar patterns to Express routing
- ✅ Easy integration with Node.js

### API Endpoints

**Python Service Base URL:** `http://localhost:8001`
```
POST   /api/ocr/analyze                            - Upload image → Extract supplement data
GET    /api/ocr/health                             - OCR service health check

POST   /api/vectorization/generate                 - Generate single 384-dim vector (used by manual supplement create/update)
POST   /api/vectorization/generate-product-vectors - Generate both per_serving and per_100g vectors (used by staging approval)
GET    /api/vectorization/health                   - Vectorization health check

POST   /api/webscraper/scrape-full                 - Scrape catalog URL → push to staging
GET    /api/webscraper/health                      - Scraper status

GET    /health                                     - Global health check
```

**Node.js Endpoints:** `http://localhost:8000`
```
# SSS - Supplements
GET    /api/SSS/supplements                        - List/search supplements (paginated)
GET    /api/SSS/supplements/:id                    - Get supplement details + stock + batches
GET    /api/SSS/supplements/:id/alternatives       - Find similar supplements (vector similarity)
POST   /api/SSS/supplements                        - Create supplement (with vectorization)
PATCH  /api/SSS/supplements/:id                    - Update supplement (re-vectorize if needed)
DELETE /api/SSS/supplements                        - Bulk delete supplements

# SSS - Inventory
GET    /api/SSS/batches                            - List/search batches (paginated)
POST   /api/SSS/batches                            - Create batch
PATCH  /api/SSS/batches/:id                        - Update batch
DELETE /api/SSS/batches                            - Bulk delete batches

# SSS - Staging
GET    /api/SSS/staging-supplements                - List unreviewed staging entries
GET    /api/SSS/staging-supplements/:id            - Get staging details
PATCH  /api/SSS/staging-supplements/:id            - Edit staging entry
POST   /api/SSS/staging-supplements/approve        - Approve (vectorize + duplicate check + promote)
DELETE /api/SSS/staging-supplements                - Bulk delete staging entries

# SSS - Catalog URLs
GET    /api/SSS/catalog-urls                       - List catalog URLs (paginated)
GET    /api/SSS/catalog-urls/:id                   - Get catalog URL details
POST   /api/SSS/catalog-urls                       - Create catalog URL
PATCH  /api/SSS/catalog-urls/:id                   - Update catalog URL
DELETE /api/SSS/catalog-urls                       - Bulk delete catalog URLs

# SSS - Scraping
POST   /api/SSS/scraping/start                     - Start scraping job (fire-and-forget)

# SSS - Lookups
GET    /api/SSS/lookups/packaging-forms            - Packaging form options
GET    /api/SSS/lookups/supplement-statuses         - Supplement status options
GET    /api/SSS/lookups/batch-statuses             - Batch stock status options
GET    /api/SSS/lookups/ticket-statuses            - Ticket status options

# AMS - Athletes
GET    /api/AMS/athletes                           - List/search athletes (paginated)
GET    /api/AMS/athletes/:id                       - Athlete detail (athlete + registry)
POST   /api/AMS/athletes                           - Create athlete + registry + medical (transaction)
PATCH  /api/AMS/athletes/:id                       - Update athlete base fields
DELETE /api/AMS/athletes                           - Bulk delete athletes
PATCH  /api/AMS/athletes/:id/registry              - Update registry
PATCH  /api/AMS/athletes/:id/medical               - Update medical record

# AMS - Lookups
GET    /api/AMS/lookups/sports                     - Sports dropdown
```

### Integration Pattern (Implemented January 2026)

**Node.js → Python Communication:**
```javascript
// In Node.js (modules/SSS/controller.js)

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8001';

// Transform nutritional data to Python service format
function transformNutritionalDataForVectorization(nutritionalInfo) {
    if (!nutritionalInfo || typeof nutritionalInfo !== 'object') {
        return { calories: null, nutrients: [] };
    }
    const nutrients = [];
    let calories = null;
    for (const [key, value] of Object.entries(nutritionalInfo)) {
        if (key.toLowerCase() === 'calories') {
            calories = typeof value === 'number' ? value : parseInt(value) || null;
        } else if (value !== null && value !== undefined) {
            nutrients.push({ name: key, amount: String(value), daily_value: null });
        }
    }
    return { calories, nutrients };
}

// Generate single vector
async function generateVector(ingredients, nutritionalInfo, basis) {
    const transformedNutrition = transformNutritionalDataForVectorization(nutritionalInfo);
    const response = await fetch(`${PYTHON_SERVICE_URL}/api/vectorization/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ingredients: ingredients || [],
            nutritional_info: transformedNutrition,
            basis: basis  // 'per_100g' or 'per_serving'
        })
    });
    if (!response.ok) throw new Error(`Vectorization failed: ${response.status}`);
    const result = await response.json();
    return { success: true, vector: result.vector, dimension: result.dimension };
}

// Generate both vectors for a supplement
async function generateSupplementVectors(ingredients, per100g, perServing) {
    const result = { vector_100g_ingredient: null, vector_perserving_ingredient: null };
    if (per100g && Object.keys(per100g).length > 0) {
        const vectorResult = await generateVector(ingredients, per100g, 'per_100g');
        result.vector_100g_ingredient = vectorResult.vector;
    }
    if (perServing && Object.keys(perServing).length > 0) {
        const vectorResult = await generateVector(ingredients, perServing, 'per_serving');
        result.vector_perserving_ingredient = vectorResult.vector;
    }
    return result;
}

export async function createSupplement(req, res) {
    // 1. Validate supplement data
    const validated = createSupplementSchema.parse(req.body);

    // 2. Validate ingredients exist (required for vectorization)
    if (!validated.supplement_ingredient || validated.supplement_ingredient.length === 0) {
        return res.status(400).json({ error: 'At least one ingredient is required' });
    }

    // 3. Validate at least one nutritional info exists
    const has100g = validated.nutritional_info_per_100g &&
                    Object.keys(validated.nutritional_info_per_100g).length > 0;
    const hasServing = validated.nutritional_info_per_serving &&
                       Object.keys(validated.nutritional_info_per_serving).length > 0;
    if (!has100g && !hasServing) {
        return res.status(400).json({
            error: 'At least one nutritional info type is required'
        });
    }

    // 4. Generate vectors (call Python service)
    const vectors = await generateSupplementVectors(
        validated.supplement_ingredient,
        validated.nutritional_info_per_100g,
        validated.nutritional_info_per_serving
    );

    // 5. Store supplement + vectors in database
    const result = await services.createSupplement({
        ...validated,
        vector_100g_ingredient: vectors.vector_100g_ingredient,
        vector_perserving_ingredient: vectors.vector_perserving_ingredient
    });

    return res.status(201).json({
        message: 'Supplement created successfully',
        data: result,
        vectorization: {
            vector_100g_ingredient: vectors.vector_100g_ingredient ? 'generated' : null,
            vector_perserving_ingredient: vectors.vector_perserving_ingredient ? 'generated' : null
        }
    });
}
```

**Webscraper Integration:**
```javascript
// Fire-and-forget scraping job
export async function startScrapingJob(req, res) {
    const { catalog_url_ids } = startScrapingSchema.parse(req.body);

    // Get active catalog URLs (all or filtered by IDs)
    const catalogs = await services.getActiveCatalogUrls(catalog_url_ids);

    // Submit each catalog to Python scraper (async, no await)
    for (const catalog of catalogs) {
        fetch(`${PYTHON_SERVICE_URL}/api/webscraper/scrape-full`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                catalog_url: catalog.product_catalog_website,
                push_to_staging: true
            })
        }).catch(err => console.error('Scraping error:', err));
    }

    return res.status(202).json({
        message: 'Scraping started successfully',
        catalogs_to_scrape: catalogs,
        total_catalogs: catalogs.length,
        info: 'Check staging supplements page later for results'
    });
}
```

### Environment Configuration

**Python_Services/.env:**
```env
OPENAI_API_KEY=sk-proj-xxxxx
SERVICE_PORT=8001
SERVICE_HOST=0.0.0.0
BACKEND_URL=http://localhost:8000
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
VECTOR_DIMENSION=384
```

### Deployment Considerations

**Development:**
- Node.js: `npm start` (port 8000)
- Python: `uvicorn app.main:app --reload --port 8001`
- Both must run simultaneously

**Production (Future):**
- Docker containers for each service
- Nginx reverse proxy
- Service discovery (Consul/etcd)
- Load balancing

### Error Handling

**Network Errors:**
```javascript
// Node.js side
try {
    const response = await fetch('http://localhost:8001/api/vectorization/generate', {...});
    if (!response.ok) {
        throw new Error(`Python service error: ${response.status}`);
    }
} catch (error) {
    console.error('Failed to generate vector:', error);
    // Graceful degradation: Create supplement without vector
    await services.createSupplement({ ...validated, vector_100g_ingredient: null });
}
```

**Service Unavailable:**
- Implement retry logic (3 attempts)
- Circuit breaker pattern (future)
- Fallback: Store supplement without vectors
- Background job to regenerate vectors later

### Performance Considerations

**Model Loading:**
- Models loaded once on startup (~30 seconds)
- Kept in memory for fast inference
- First request: ~2-5 seconds (includes model initialization)
- Subsequent requests: ~1-2 seconds

**Vectorization:**
- Single vector: ~1-2 seconds
- Batch of 10: ~5-10 seconds
- CPU-bound (could add GPU support later)

**OCR:**
- Image processing: ~5-10 seconds
- LLM extraction: ~5-15 seconds
- Total: ~10-25 seconds per image

### Future Enhancements

**Phase 3:**
- [ ] GPU support for faster inference
- [ ] Caching for frequently-accessed vectors
- [ ] Batch processing queue
- [ ] Redis for job management

**Phase 4:**
- [ ] Model versioning
- [ ] A/B testing different embedding models
- [ ] Vector similarity search optimization
- [ ] Monitoring and observability

---

## Database Architecture

### Schema Organization

```
PostgreSQL Database
├── SSS (Supplement Support System)
│   ├── Supplement                    # Main supplement data (with vector columns)
│   ├── Supplement_Staging            # Web scraper staging area
│   ├── Inventory_Batch               # Batch/lot tracking
│   ├── Inventory_Ticket              # Supplement allocations
│   ├── webscraper_catalog_url        # Scraper target URLs
│   ├── Supplement_Packaging_Form_Lookup
│   ├── Supplement_Status_Lookup
│   ├── Batch_Stock_Status_Lookup
│   └── Ticket_Status_Lookup
│
├── AMS (Athlete Management System)
│   ├── Athlete                       # Main athlete profile
│   ├── Athlete_Registry              # Carding status (1:1 with Athlete)
│   ├── Athlete_Medical               # Medical info (1:1 with Athlete)
│   ├── Coach_Athlete_Mapping         # M:M athlete-coach
│   ├── Nutritionist_Athlete_Mapping  # M:M athlete-nutritionist
│   ├── Coach                         # Coach catalog
│   ├── Nutritionist                  # Nutritionist catalog
│   └── Sport_Lookup                  # Sports reference
│
└── audit (Admin Schema)
    └── audit_log                     # Centralized audit trail
```

### Key Design Decisions

**1. UUID Primary Keys**
- Uses PostgreSQL built-in `gen_random_uuid()`
- No extension dependencies
- Version 4 UUIDs

**2. JSONB for Structured Data**
```sql
supplement_ingredient              JSONB  -- Array of strings
nutritional_info_per_100g          JSONB  -- Nutritional object
nutritional_info_per_serving       JSONB  -- Nutritional object
```

**3. TEXT[] for URL Arrays**
```sql
product_source_url                 TEXT[] -- Multiple product pages
```

**4. Lookup Tables**
- Soft delete via `is_active` flag
- Centralized reference data
- Prevents data inconsistency

**5. Audit Logging**
- Centralized in `audit.audit_log`
- Tracks all table changes
- JSONB old/new values
- Can be implemented via triggers or application code

---

## API Design

### REST Principles

**Resource-oriented URLs:**
```
/api/SSS/supplements              # Collection
/api/SSS/supplements/:id          # Individual resource
/api/SSS/batches                  # Collection
```

**HTTP Methods:**
```
GET     - Retrieve resources
POST    - Create new resources
PATCH   - Partial update (preferred)
PUT     - Full replacement (not used)
DELETE  - Remove resources
```

**Status Codes:**
```
200 OK              - Successful GET/PATCH/DELETE
201 Created         - Successful POST
400 Bad Request     - Validation failed
404 Not Found       - Resource doesn't exist
409 Conflict        - Duplicate resource
500 Server Error    - Internal error
```

### Response Format Standard

**Success Response:**
```json
{
  "data": [...],
  "currentPage": 1,
  "totalPages": 10,
  "totalCount": 100,
  "searchQuery": "vitamin"
}
```

**Error Response:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "supplement_name",
      "message": "Supplement name is required"
    }
  ]
}
```

### Pagination

**Server-side pagination:**
- Page size: 10 items (fixed)
- 1-based page numbering
- Metadata included in response

**Query parameters:**
```
?page=1               # Page number
?search=vitamin       # Search query
```

---

## Data Flow

### Create Supplement Flow

```
┌─────────────┐
│   Client    │ POST /api/SSS/supplements
└──────┬──────┘
       │ 1. HTTP Request
       ▼
┌─────────────────────────────────────────┐
│            Routes Layer                 │
│  - Extract body                         │
│  - Call controller.createSupplement()   │
└──────┬──────────────────────────────────┘
       │ 2. Request Object
       ▼
┌─────────────────────────────────────────┐
│         Controller Layer                │
│  - Validate with Zod schema             │
│  - Get status from lookup table         │
│  - Apply batch_testing_org logic        │
│  - Set approved_by (system user)        │
│  - Check for duplicates                 │
└──────┬──────────────────────────────────┘
       │ 3. Validated Data
       ▼
┌─────────────────────────────────────────┐
│          Service Layer                  │
│  - Build INSERT query                   │
│  - Transform JSONB fields               │
│  - Transform TEXT[] fields              │
│  - Execute query                        │
└──────┬──────────────────────────────────┘
       │ 4. SQL Query
       ▼
┌─────────────────────────────────────────┐
│          Database                       │
│  - Insert record                        │
│  - Generate UUID                        │
│  - Return new record                    │
└──────┬──────────────────────────────────┘
       │ 5. Database Result
       ▼
┌─────────────────────────────────────────┐
│          Service Layer                  │
│  - Return created record                │
└──────┬──────────────────────────────────┘
       │ 6. Supplement Object
       ▼
┌─────────────────────────────────────────┐
│         Controller Layer                │
│  - Format response                      │
│  - Set HTTP status 201                  │
└──────┬──────────────────────────────────┘
       │ 7. HTTP Response
       ▼
┌─────────────┐
│   Client    │ 201 Created + Supplement Data
└─────────────┘
```

### Search Flow

```
Client → Routes → Controller → Service → Database
                                  ↓
                        Build WHERE conditions
                        Apply AND logic for words
                        Calculate relevance ranking
                                  ↓
                              PostgreSQL
                                  ↓
                        Return ranked results
                                  ↓
Client ← Routes ← Controller ← Service
```

---

## Security Architecture

### Current State: ⚠️ Development Only

**Not Implemented:**
- ❌ Authentication
- ❌ Authorization
- ❌ Rate limiting
- ❌ Input sanitization (beyond validation)
- ❌ SQL injection protection (using parameterized queries, but no additional layer)
- ❌ XSS protection
- ❌ CSRF protection

**Implemented:**
- ✅ Parameterized SQL queries (prevents SQL injection)
- ✅ Input validation (Zod schemas)
- ✅ UUID validation
- ✅ Environment variable usage

### Planned Security Measures

**Phase 2:**
1. JWT-based authentication
2. Role-based access control (RBAC)
3. API rate limiting
4. Request logging
5. Input sanitization middleware

**Phase 3:**
6. Helmet.js security headers
7. CORS configuration
8. Password hashing (bcrypt)
9. Session management
10. Audit logging enhancement

---

## Future Architecture Plans

### Completed Phases

**Phase 1: Core CRUD** - ✅ Complete
- Supplement CRUD with validation
- Inventory batch CRUD with stock calculations
- Lookup tables and dropdowns

**Phase 2: Vectorization & Webscraper** - ✅ Complete
- Vector similarity search (pgvector, 384-dim BAAI/bge-small-en-v1.5)
- Alternative supplement recommendations (60% threshold)
- Vectorization on create and update (re-vectorize when ingredients/nutrition change)
- Web scraper integration (catalog URLs, fire-and-forget scraping)
- Staging workflow with duplicate detection (95% vector similarity + name/brand)
- Staging approval promotes to main library with vectors

**Phase 2.5: AMS Phase 1** - ✅ Complete
- Athlete CRUD with registry + medical in single transaction
- Athlete detail page (athlete + registry)
- Sport lookup for dropdowns

### Upcoming Phases

**Phase 3: AMS Phase 2**
```
Features:
- Coach/Nutritionist CRUD
- Coach-Athlete and Nutritionist-Athlete assignment management
- Additional lookup endpoints
```

**Phase 4: Authentication & Security**
```
Components:
- User table
- JWT tokens
- Login/logout endpoints
- Role-based access control
```

**Phase 5: Inventory Tickets & OCR**
```
Features:
- Ticket creation and fulfillment
- OCR integration for supplement labels
- File upload for supplement images
```

---

## Design Principles

### 1. Separation of Concerns
Each layer has a single, well-defined responsibility.

### 2. DRY (Don't Repeat Yourself)
- Reusable Zod schemas
- Shared validation functions
- Common response formatters

### 3. Explicit Over Implicit
- Clear function names
- Detailed error messages
- Comprehensive logging

### 4. Database-First Design
- Schema drives API design
- Enforce constraints at DB level
- Use lookup tables for reference data

### 5. API-First Development
- Swagger docs before implementation
- Contract-driven development
- Client-agnostic design

---

## Performance Considerations

### Current Optimizations
1. **Connection Pooling** - PostgreSQL connection pool (pg)
2. **Pagination** - Server-side, 10 items per page
3. **Indexed Queries** - Primary keys and foreign keys
4. **Selective Fields** - Return only needed fields

### Planned Optimizations
1. **Caching** - Redis for frequently accessed data
2. **Database Indexes** - GIN indexes for JSONB/TEXT[] searches
3. **Query Optimization** - Explain/analyze slow queries
4. **Compression** - gzip response compression

---

## Error Handling Strategy

### Validation Errors (400)
```javascript
try {
  createSupplementSchema.parse(req.body);
} catch (error) {
  return res.status(400).json({
    error: "Validation failed",
    details: error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }))
  });
}
```

### Business Logic Errors (400/409)
```javascript
if (await checkDuplicateSupplement(name, brand)) {
  return res.status(409).json({
    error: "Supplement already exists"
  });
}
```

### Database Errors (500)
```javascript
try {
  await services.createSupplement(data);
} catch (error) {
  console.error('Database error:', error);
  return res.status(500).json({
    error: "Failed to create supplement"
  });
}
```

---

## Testing Strategy

### Current State
- ✅ Manual testing via Swagger UI
- ❌ Unit tests
- ❌ Integration tests
- ❌ E2E tests

### Planned Testing

**Unit Tests (Jest)**
```
Test Coverage:
- Validation schemas
- Controller logic
- Service functions
- Helper functions
```

**Integration Tests**
```
Test Coverage:
- API endpoints
- Database operations
- Authentication flow
```

**E2E Tests (Cypress)**
```
Test Coverage:
- User workflows
- CRUD operations
- Error scenarios
```

---

## Deployment Architecture (Future)

```
┌─────────────────────────────────────────┐
│          Load Balancer (NGINX)          │
└────────┬──────────────────────┬─────────┘
         │                      │
    ┌────▼────┐            ┌────▼────┐
    │ Node.js │            │ Node.js │
    │ Server  │            │ Server  │
    │  (PM2)  │            │  (PM2)  │
    └────┬────┘            └────┬────┘
         │                      │
         └──────────┬───────────┘
                    │
         ┌──────────▼──────────┐
         │   PostgreSQL        │
         │   (Primary)         │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │   PostgreSQL        │
         │   (Replica)         │
         └─────────────────────┘
```

---

## Key Architectural Decisions

### 1. Why ES Modules over CommonJS?
- Modern JavaScript standard
- Better tree-shaking
- Native browser compatibility (future)
- Cleaner import/export syntax

### 2. Why Zod over Joi?
- TypeScript-first (future migration)
- Better type inference
- More modern API
- Smaller bundle size

### 3. Why PostgreSQL over MongoDB?
- ACID compliance critical for inventory
- Complex relationships (supplements ↔ batches ↔ tickets)
- Strong typing
- Better analytics capabilities

### 4. Why Parameterized Queries over ORM?
- Full SQL control
- Better performance
- No abstraction overhead
- Learning value

### 5. Why Swagger over Postman Collections?
- Interactive documentation
- Auto-generated from code
- Standards-based (OpenAPI)
- Client SDK generation possible

---

## Migration Paths

### To TypeScript
```
Phase 1: Add type checking
- Install @types packages
- Add JSDoc comments
- Enable checkJs in tsconfig

Phase 2: Gradual migration
- Rename .js to .ts
- Fix type errors
- Add interfaces

Phase 3: Strict mode
- Enable strict typing
- Remove any types
- Add generics
```

### To Microservices
```
Current: Monolith
↓
Step 1: Extract OCR service (Done)
↓
Step 2: Extract AMS module
↓
Step 3: API Gateway
↓
Step 4: Service mesh
```

---

## Maintenance Guidelines

### Code Organization
- One responsibility per function
- Max 50 lines per function
- Descriptive variable names
- Comments for complex logic

### Git Workflow
```
main (production)
  ↑
develop (staging)
  ↑
feature/* (new features)
bugfix/* (bug fixes)
hotfix/* (urgent production fixes)
```

### Versioning
```
API Version: v1
Format: /api/v1/SSS/supplements

Increment:
- Major: Breaking changes
- Minor: New features
- Patch: Bug fixes
```

---

## Documentation Standards

### Code Documentation
- JSDoc for all exported functions
- Swagger annotations for all routes
- README in each module directory

### API Documentation
- Swagger UI at /docs
- Request/response examples
- Error code documentation

### Database Documentation
- ER diagrams (dbdiagram.io)
- Field descriptions
- Constraint documentation

---

## Contact & Support

**Development Team:**
- Backend Lead: [Name]
- Database Admin: [Name]
- API Designer: [Name]

**Resources:**
- Swagger Docs: http://localhost:8000/docs
- Database Schema: See DATABASE_SCHEMA.md
- Use Cases: See USE_CASES.md
- Onboarding: See ONBOARDING_GUIDE.md

---

**Document Version:** 4.0
**Last Updated:** February 5, 2026
**Changes:** Updated SSS to subfolder structure, added staging duplicate detection, vectorization on update, AMS module, complete endpoint listing
**Next Review:** After AMS Phase 2 (assignments)
**Maintained By:** Development Team
