# NYSI Nutritionist Web Application - Project Architecture

## Document Purpose
This document provides a comprehensive overview of the project architecture, technology stack, design patterns, and structural organization.

**Last Updated:** March 21, 2026
**Version:** 6.0
**Status:** Active Development - Consultation Module Complete, Admin Module Complete, AMS Phase 1 Complete

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Patterns](#architecture-patterns)
4. [Project Structure](#project-structure)
5. [Module Architecture](#module-architecture)
   - [SSS Module](#sss-module-supplement-support-system)
   - [Auth Module](#auth-module-authentication)
   - [OCR Module](#ocr-module)
   - [Consultation Module](#consultation-module)
   - [Admin Module](#admin-module)
   - [AMS Module](#ams-module-athlete-management-system)
6. [Python Services Architecture](#python-services-architecture)
7. [Database Architecture](#database-architecture)
8. [API Design](#api-design)
9. [Data Flow](#data-flow)
10. [Security Architecture](#security-architecture)
11. [Future Architecture Plans](#future-architecture-plans)

---

## Project Overview

### Mission
Develop a comprehensive supplement management system for the New York Sports Institute (NYSI) to streamline supplement inventory, athlete nutrition tracking, and supplement verification through OCR technology.

### Core Modules
1. **SSS (Supplement Support System)** - Primary module for supplement management, inventory, staging, and web scraping
2. **AMS (Athlete Management System)** - Athlete profile CRUD with registry, medical records, and consultation session management
3. **Consultation** - Card-based nutrition consultation workflow with 8 clinical data cards per session
4. **Admin** - User management, sports and coach records, audit logging
5. **Auth** - Email-based two-factor authentication with JWT
6. **OCR Services** - Supplement label scanning, brand/batch verification against certification databases

### Current Phase
**Phase 3: Consultation & Admin Complete** - ✅ Complete
- Full supplement lifecycle management (SSS)
- Inventory batch tracking and stock calculations
- Vectorization and semantic search for alternatives
- Webscraper integration with staging workflow
- Athlete management with consultation session support (AMS)
- **Consultation module** - 8-card clinical workflow per session, previous session comparison
- **Admin module** - User CRUD with role management, sports/coach management, audit log
- 2FA authentication and JWT authorization
- OCR label analysis and batch certification verification

---

## Technology Stack

### Frontend
```
Framework:    Next.js 15 (App Router)
Language:     TypeScript
UI:           React 19, Tailwind CSS
Auth:         JWT (stored client-side), AuthContext
```

### Backend
```
Runtime:      Node.js v18+
Framework:    Express.js 5.x
Language:     JavaScript (ES6+ with ES Modules)
Validation:   Zod v3.x
Documentation: Swagger/OpenAPI 3.0
Auth:         bcrypt, JWT, Nodemailer (2FA)
```

### Database
```
DBMS:         PostgreSQL 14+
Client:       pg (node-postgres)
UUID:         gen_random_uuid() (built-in)
Extensions:   pgcrypto, pgvector (384-dim vectors)
```

### Python Services
```
Runtime:      Python 3.10+
Framework:    FastAPI 0.109.0
OCR:          PaddleOCR 2.8.1 + PaddlePaddle 2.6.2
LLM:          OpenAI GPT-4o-mini
Embeddings:   BAAI/bge-small-en-v1.5 (384-dim, sentence-transformers)
ML:           PyTorch 2.0.1 (CPU)
Scraping:     Playwright (browser automation)
```

### Development Tools
```
Package Manager: npm (Node), pip (Python)
Environment:     dotenv
API Testing:     Swagger UI (both Express and FastAPI)
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
├── frontend/                     # Next.js 15 frontend
│   ├── app/
│   │   ├── page.tsx              # Home / dashboard
│   │   ├── login/                # Login + 2FA verify
│   │   ├── unauthorized/         # Access denied page
│   │   ├── SSS/                  # Supplement Support System
│   │   │   ├── library/          # Supplement library
│   │   │   ├── inventory/        # Batch inventory management
│   │   │   ├── batch-testing/    # Batch certification testing
│   │   │   ├── search/           # Supplement search with OCR
│   │   │   ├── web-scraper/      # Web scraper management
│   │   │   └── supplements/[id]/ # Supplement detail + alternatives
│   │   ├── AMS/
│   │   │   └── athlete-management/
│   │   │       ├── page.tsx      # Athlete list
│   │   │       └── [id]/
│   │   │           ├── page.tsx  # Athlete detail profile
│   │   │           └── consultation/[sessionId]/page.tsx  # Consultation session view
│   │   ├── admin/
│   │   │   ├── users/            # User management
│   │   │   └── sports-coaches/   # Sports & coaches management
│   │   └── api/ocr/              # Frontend Next.js API routes for OCR
│   ├── components/               # Shared React components by module
│   │   ├── SSS/                  # Supplement, inventory, OCR components
│   │   ├── AMS/                  # Athlete, consultation card components
│   │   ├── Admin/                # User, sport, coach management components
│   │   └── Dashboard/            # Dashboard, calendar, session components
│   ├── contexts/
│   │   └── AuthContext.tsx       # Global authentication state
│   └── utils/
│       ├── consultationApi.ts    # Consultation API client
│       └── dashboardApi.ts       # Dashboard API client
│
├── Backend/
│   ├── config/
│   │   ├── db.js                 # PostgreSQL connection pool
│   │   └── swagger.js            # Swagger/OpenAPI configuration
│   │
│   ├── modules/
│   │   ├── SSS/                  # Supplement Support System
│   │   │   ├── index.js          # Route aggregator
│   │   │   ├── supplements/      # Supplement CRUD, alternatives, lookups
│   │   │   ├── inventory/        # Batch CRUD
│   │   │   ├── staging/          # Staging review, approval, catalog URLs, scraping
│   │   │   └── shared/           # Reusable validators, vectorization helpers
│   │   │
│   │   ├── AMS/                  # Athlete Management System
│   │   │   ├── index.js          # Route aggregator
│   │   │   ├── athlete/          # Athlete CRUD, registry, medical
│   │   │   ├── coach/            # Coach management
│   │   │   ├── nutritionist/     # Nutritionist management
│   │   │   └── sport/            # Sport lookup
│   │   │
│   │   ├── Consultation/         # Nutrition Consultation
│   │   │   ├── index.js          # Route aggregator
│   │   │   ├── consultation-session/    # Session CRUD, athlete history
│   │   │   ├── consultation-lookups/    # Reference data (consultation types, etc.)
│   │   │   ├── anthropometry/           # Physical measurements card
│   │   │   ├── medical-history/         # Medical history card
│   │   │   ├── nutrition-requirements/  # Nutritional needs card
│   │   │   ├── mealLog/                 # Meal log card
│   │   │   ├── trainingSchedule/        # Training schedule card (session_training + schedule)
│   │   │   ├── supplement-dispensing/   # Supplement allocation card
│   │   │   ├── nutrition-diagnosis-summary/  # Diagnosis & summary card
│   │   │   └── actionables/             # Follow-up actionables card
│   │   │
│   │   ├── Admin/                # Administration
│   │   │   ├── adminRoutes.js    # User, sport, coach endpoints
│   │   │   ├── adminController.js
│   │   │   ├── adminServices.js
│   │   │   └── adminValidation.js
│   │   │
│   │   ├── Auth/                 # Authentication (2FA + JWT)
│   │   │   ├── routes.js
│   │   │   ├── controller.js
│   │   │   ├── services.js
│   │   │   ├── validation.js
│   │   │   ├── authMiddleware.js # JWT verification middleware
│   │   │   └── emailService.js   # Nodemailer for 2FA codes
│   │   │
│   │   └── OCR/                  # OCR Services
│   │       ├── routes.js
│   │       ├── controller.js
│   │       ├── services.js
│   │       └── validation.js
│   │
│   ├── server.js                 # Express app entry point
│   ├── package.json
│   └── .env
│
├── Python_Services/              # FastAPI microservice
│   ├── app/
│   │   ├── main.py               # FastAPI entry point + CORS
│   │   ├── config/settings.py    # Pydantic settings
│   │   ├── routers/
│   │   │   ├── ocr.py                  # OCR analysis endpoints
│   │   │   ├── vectorization.py        # Embedding generation endpoints
│   │   │   ├── webscraper.py           # Web scraper endpoints
│   │   │   ├── batch_verification.py   # Certification database search
│   │   │   └── scheduler.py            # Background job scheduler
│   │   ├── services/
│   │   │   ├── ocr_engine.py           # PaddleOCR wrapper (lazy-loaded)
│   │   │   ├── llm_structurer.py       # GPT-4o-mini text structuring
│   │   │   ├── vectorizer.py           # Embedding generation
│   │   │   ├── batch_tester.py         # Certification search with consensus
│   │   │   ├── certification_searcher.py  # Per-database Playwright search
│   │   │   ├── product_scraper.py      # Product page scraping
│   │   │   └── staging_service.py      # Push scraped results to staging
│   │   └── schemas/                    # Pydantic request/response models
│   ├── requirements.txt
│   └── .env
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

---

### Auth Module (Authentication)

#### Responsibility
Email-based 2FA authentication with JWT tokens.

#### Structure
```
Auth/
├── routes.js         # Auth endpoints with rate limiting
├── controller.js     # Request handling
├── services.js       # User CRUD, code management
├── validation.js     # Zod schemas
├── authMiddleware.js # JWT verification middleware
└── emailService.js   # Nodemailer for 2FA codes
```

#### Key Features
- **2FA Flow**: Login → Send code via email → Verify code → Get JWT
- **Rate Limiting**: Prevents brute force attacks
- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: 24-hour expiry, includes user ID and role

#### Endpoints
```
POST /api/auth/register      - Create new user (rate limited: 3/hour)
POST /api/auth/login         - Step 1: Validate credentials, send code (5/15min)
POST /api/auth/verify-code   - Step 2: Verify code, get token (3/min)
POST /api/auth/resend-code   - Resend verification code (2/5min)
GET  /api/auth/me            - Get current user (requires auth)
POST /api/auth/logout        - Logout (requires auth)
```

---

### OCR Module

#### Responsibility
Nutrition label analysis and batch testing verification via Python services.

#### Structure
```
OCR/
├── routes.js         # OCR endpoints with Multer file upload
├── controller.js     # Request handling, error responses
├── services.js       # Python service calls, similarity search
└── validation.js     # File validation, query schemas
```

#### Use Cases

**UC1: Nutrition Label Analysis**
```
POST /api/ocr/analyze
- Upload nutrition label image (jpg, png, webp - max 10MB)
- Python service extracts text via PaddleOCR
- GPT-4o-mini structures data
- Generate embedding vectors (384-dim)
- Find similar supplements in DB (60% cosine similarity)
- Return extracted data + similar supplements (paginated)
```

**UC2: Brand/Batch Verification**
```
POST /api/ocr/extract
- Upload brand image (required) + batch image (optional)
- Extract brand/product name via OCR + LLM
- Extract batch ID via regex patterns (if batch image provided)
- Return extracted info for user verification

POST /api/ocr/verify
- Submit verified brand/name/batch_id
- Search 6 certification databases via Playwright:
  - Informed Sport, Informed Choice, HASTA
  - NSF Sport, Cologne List, BSCG
- Return verification results with quick links
```

#### Configuration
- **File Size Limit**: 10MB
- **Allowed Types**: image/jpeg, image/png, image/webp
- **Similarity Threshold**: 60%
- **Python Service Timeout**: 60 seconds

---

### Consultation Module

#### Responsibility
Card-based nutrition consultation workflow. Each session has 8 independent clinical cards that can be filled in any order. Organized by sub-module, each corresponding to one card in the frontend UI.

#### Structure
```
Consultation/
├── index.js                      # Route aggregator
├── consultation-session/         # Session CRUD and athlete session history
├── consultation-lookups/         # Reference data (consultation types, etc.)
├── anthropometry/                # Physical measurements (height, weight, BMI, body comp)
├── medical-history/              # Medical conditions, dietary restrictions, medical remarks
├── nutrition-requirements/       # Macros, energy needs, dietary targets
├── mealLog/                      # Dietary intake records
├── trainingSchedule/             # Training schedule (session_training + session_training_schedule)
├── supplement-dispensing/        # Supplement allocation from inventory
├── nutrition-diagnosis-summary/  # Clinical diagnosis and recommendations
└── actionables/                  # Follow-up tasks and action items
```

#### Key Design Decisions

**Card-based organization**: Each sub-module maps to one UI card. Routes, controllers, services, and validation are colocated per card, making it easy to extend or modify individual cards without affecting others.

**Session lifecycle**: A session is created first (`consultation-session`), then each card's data is written independently via GET/POST/PATCH on `sessions/:sessionId/<card>`.

**Nutritionist auto-assignment**: `POST /api/Consultation/sessions` automatically assigns the logged-in nutritionist from the JWT — no manual input required.

**Training schedule schema**: `session_training` (parent, one per session) holds `physical_activity_level_pal` and session metadata. `session_training_schedule` (children) holds individual activities with `day_of_week` (title case: 'Monday'...'Sunday', enforced by DB constraint).

**session_note upsert pattern**: The consultation-update card (objective) creates a `session_note` row. All subsequent cards that update `session_note` fields must check for an existing row and UPDATE, never INSERT a duplicate.

**Previous session tab**: Each card in the frontend supports a "Previous Session" tab (gated on `prevSessionId`) for comparing with the prior consultation. History views do not include this tab.

#### Endpoints
```
# Session management
GET    /api/Consultation/sessions                        - List sessions for an athlete
POST   /api/Consultation/sessions                        - Create session (auto-assigns nutritionist)

# Card endpoints (all scoped to :sessionId)
GET/POST/PATCH  /api/Consultation/sessions/:id/anthropometry
GET/POST/PATCH  /api/Consultation/sessions/:id/medical-history
GET/POST/PATCH  /api/Consultation/sessions/:id/nutrition-requirements
GET/POST/PATCH  /api/Consultation/sessions/:id/meal-log
GET/PUT         /api/Consultation/sessions/:id/training-schedule
GET/POST/PATCH  /api/Consultation/sessions/:id/supplement-dispensing
GET/POST/PATCH  /api/Consultation/sessions/:id/nutrition-diagnosis-summary
GET/POST/PATCH  /api/Consultation/sessions/:id/actionables

# Lookups
GET    /api/Consultation/lookups/*                       - Reference data for dropdowns
```

---

### Admin Module

#### Responsibility
Platform administration: user account management, sports catalog, and coach records.

#### Structure
```
Admin/
├── adminRoutes.js      # All admin endpoints
├── adminController.js  # Request handling and business logic
├── adminServices.js    # Database queries
└── adminValidation.js  # Zod schemas
```

#### Key Features
- **User management**: Create, edit, deactivate users with role assignment (Nutritionist, Admin, etc.)
- **Audit log**: Track changes to user accounts (`audit.audit_log` table)
- **Email and password management**: Admins can update credentials for any user
- **Sports management**: CRUD for the `Sport_Lookup` table
- **Coach management**: CRUD for coach records

#### Endpoints
```
# User management
GET    /api/admin/users            - List users (paginated + search)
POST   /api/admin/users            - Create user
PATCH  /api/admin/users/:id        - Update user
DELETE /api/admin/users            - Bulk delete users
GET    /api/admin/users/:id/audit  - User audit log

# Sports management
GET    /api/admin/sports           - List sports
POST   /api/admin/sports           - Create sport
PATCH  /api/admin/sports/:id       - Update sport
DELETE /api/admin/sports           - Delete sport

# Coach management
GET    /api/admin/coaches          - List coaches
POST   /api/admin/coaches          - Create coach
PATCH  /api/admin/coaches/:id      - Update coach
DELETE /api/admin/coaches          - Delete coach
```

---

### AMS Module (Athlete Management System)

#### Responsibility
Athlete profile management with registry, medical records, and links to consultation sessions.

#### Structure
```
AMS/
├── index.js          # Route aggregator
├── athlete/          # Athlete CRUD, registry, medical, lookups
├── coach/            # Coach management (Phase 2)
├── nutritionist/     # Nutritionist management (Phase 2)
└── sport/            # Sport lookup reference data
```

#### Key Features
- **Atomic creation**: POST `/api/AMS/athletes` creates athlete + registry + medical in a single DB transaction (`pool.connect()` + `BEGIN/COMMIT/ROLLBACK`)
- **Detail view**: Returns athlete profile + registry data (no medical on the detail page)
- **target_event**: Stored as a real DB column on the `athlete` table
- **Additional columns**: `ethnicity`, `start_of_sporting_date` on `athlete`; `medical_remarks` and `dietary_restriction` on `athlete_medical`

#### Endpoints
```
GET    /api/AMS/athletes           - List/search athletes (paginated)
GET    /api/AMS/athletes/:id       - Athlete detail (athlete + registry)
POST   /api/AMS/athletes           - Create athlete + registry + medical (transaction)
PATCH  /api/AMS/athletes/:id       - Update athlete base fields
DELETE /api/AMS/athletes           - Bulk delete athletes
PATCH  /api/AMS/athletes/:id/registry  - Update registry record
PATCH  /api/AMS/athletes/:id/medical   - Update medical record

GET    /api/AMS/lookups/sports     - Sports dropdown
```

---

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
    │   ├── ocr.py                  # OCR endpoints (/analyze, /analyze-text, /identify, /ocr-only)
    │   ├── vectorization.py        # Vectorization endpoints (/generate, /batch-generate)
    │   ├── webscraper.py           # Web scraper endpoints (/scrape-full)
    │   └── batch_verification.py   # Batch verification (Playwright-based)
    ├── services/
    │   ├── __init__.py
    │   ├── ocr_engine.py           # PaddleOCR wrapper (lazy-loaded)
    │   ├── llm_structurer.py       # GPT-4o-mini text structuring
    │   ├── vectorizer.py           # Embedding generation
    │   ├── batch_id_extractor.py   # Batch ID extraction from text
    │   ├── certification_searcher.py  # Search certification databases
    │   └── batch_tester.py         # Batch testing with consensus
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
# OCR Endpoints
POST   /api/ocr/analyze                            - Full pipeline: image → OCR → structured data → vectors
POST   /api/ocr/analyze-text                       - Structure raw text (no image/OCR)
POST   /api/ocr/identify                           - Extract brand/name only (fast)
POST   /api/ocr/ocr-only                           - Extract raw text from image (no LLM)
GET    /api/ocr/health                             - OCR service health check

# Vectorization Endpoints
POST   /api/vectorization/generate                 - Generate single 384-dim vector
POST   /api/vectorization/batch-generate           - Generate multiple vectors
GET    /api/vectorization/health                   - Vectorization health check

# Batch Verification Endpoints (requires Playwright)
POST   /api/batch-verification/verify              - Verify by brand/product name
POST   /api/batch-verification/verify-image        - Verify from product image
POST   /api/batch-verification/verify-batch-id     - Verify by batch/lot number
POST   /api/batch-verification/verify-combined     - Combined brand + batch ID verification
GET    /api/batch-verification/databases           - List supported certification databases
GET    /api/batch-verification/health              - Batch verification health check

# Web Scraper Endpoints
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

# Auth - Authentication (2FA)
POST   /api/auth/register                          - Register new user
POST   /api/auth/login                             - Step 1: Validate credentials, send 2FA code
POST   /api/auth/verify-code                       - Step 2: Verify 2FA code, get JWT token
POST   /api/auth/resend-code                       - Resend 2FA verification code
GET    /api/auth/me                                - Get current user profile (requires auth)
POST   /api/auth/logout                            - Logout (requires auth)

# OCR - Nutrition Label Analysis
POST   /api/ocr/analyze                            - Upload label → extract data → find similar supplements
POST   /api/ocr/extract                            - Extract brand/name from image + optional batch ID
POST   /api/ocr/verify                             - Verify supplement on certification sites
POST   /api/ocr/upload                             - Legacy OCR endpoint (deprecated)
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

**Performance:**
- [ ] GPU support for faster OCR and vectorization inference
- [ ] Caching for frequently-accessed vectors
- [ ] Batch processing queue with Redis for job management

**Reliability:**
- [ ] Circuit breaker pattern for Python service calls
- [ ] Background job to regenerate vectors for supplements created when Python service was unavailable

**Observability:**
- [ ] Monitoring and alerting for Python service health
- [ ] Model versioning for embeddings
- [ ] Vector similarity search optimization

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
│   ├── Athlete                       # Main athlete profile (target_event, ethnicity, start_of_sporting_date)
│   ├── Athlete_Registry              # Carding status (1:1 with Athlete)
│   ├── Athlete_Medical               # Medical info (medical_remarks, dietary_restriction)
│   ├── Coach_Athlete_Mapping         # M:M athlete-coach
│   ├── Nutritionist_Athlete_Mapping  # M:M athlete-nutritionist
│   ├── Coach                         # Coach catalog
│   ├── Nutritionist                  # Nutritionist catalog
│   └── Sport_Lookup                  # Sports reference
│
├── Consultation
│   ├── sessions                      # Consultation session (links athlete + nutritionist)
│   ├── session_note                  # Clinical notes: objective, diagnosis, recommendations
│   ├── anthropometry                 # Physical measurements per session
│   ├── session_training              # Training info per session (incl. PAL)
│   ├── session_training_schedule     # Individual training activities (child of session_training)
│   ├── meal_log                      # Dietary intake records per session
│   ├── supplement_dispensing         # Supplement allocations per session
│   └── actionables                   # Follow-up tasks per session
│
├── auth (Authentication)
│   └── users                         # User accounts (nutritionists, admins)
│
└── audit (Audit Schema)
    └── audit_log                     # Centralized audit trail for all write operations
```

> **Note on schema drift**: The live database may differ from the SQL scripts in `docs/Database_stuff/`. Key known drifts are tracked in `memory/db_drift.md`. Notable drifts: `users.name` column was dropped; `consultation.sessions` has additional `venue`, `time`, `description`, `title` columns; `consultation_type` values are now `'initial'`/`'review'` (not `'Initial'`/`'Review'`); `session_note.medical_remarks` was moved to `athlete_medical`.

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

### Current State: ✅ Authentication Implemented

**Implemented (February 2026):**
- ✅ 2FA Email-based authentication (6-digit codes via Nodemailer)
- ✅ JWT-based authorization (jsonwebtoken)
- ✅ Password hashing (bcrypt)
- ✅ Rate limiting on auth endpoints (express-rate-limit)
  - Login: 5 attempts per 15 minutes
  - Code verification: 3 attempts per minute
  - Code resend: 2 requests per 5 minutes
  - Registration: 3 attempts per hour
- ✅ Parameterized SQL queries (prevents SQL injection)
- ✅ Input validation (Zod schemas)
- ✅ UUID validation
- ✅ Environment variable usage
- ✅ CORS configuration

**Not Yet Implemented:**
- ❌ Role-based access control (RBAC) - roles exist but not enforced
- ❌ Helmet.js security headers
- ❌ CSRF protection
- ❌ Token refresh mechanism
- ❌ Token blacklisting on logout

### Authentication Flow (2FA)

```
1. POST /api/auth/login
   - Validate email + password
   - Generate 6-digit code
   - Send code via email (expires in 10 minutes)
   - Return masked email for UI

2. POST /api/auth/verify-code
   - Validate 6-digit code
   - Generate JWT token (24h expiry)
   - Return token + user info

3. Subsequent requests
   - Include token: Authorization: Bearer <token>
   - Middleware validates JWT
   - Attaches user to req.user
```

### Planned Security Measures

**Phase 3:**
1. Role-based access control (RBAC) enforcement
2. Helmet.js security headers
3. Token refresh mechanism
4. Audit logging enhancement

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

**Phase 3: Authentication & OCR** - ✅ Complete (February 2026)
- Email-based 2FA authentication (nodemailer, bcrypt, jsonwebtoken)
- Rate limiting on auth endpoints
- OCR nutrition label analysis (PaddleOCR + GPT-4o-mini)
- Vector similarity search for similar supplements
- Batch testing verification (6 certification databases via Playwright)
- Brand/name/batch ID extraction from images

### Upcoming Phases

**Phase 4: AMS Phase 2**
```
Features:
- Coach/Nutritionist CRUD
- Coach-Athlete and Nutritionist-Athlete assignment management
- Additional lookup endpoints
```

**Phase 5: RBAC & Token Management**
```
Features:
- Role-based access control enforcement
- Token refresh mechanism
- Token blacklisting
- Protected routes by role
```

**Phase 6: Inventory Tickets**
```
Features:
- Ticket creation and fulfillment
- Athlete supplement allocation tracking
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

**Document Version:** 5.0
**Last Updated:** February 7, 2026
**Changes:** Added Auth module (2FA), OCR module (nutrition analysis, batch verification), updated Security Architecture, updated Python Services endpoints
**Next Review:** After AMS Phase 2 (assignments)
**Maintained By:** Development Team
