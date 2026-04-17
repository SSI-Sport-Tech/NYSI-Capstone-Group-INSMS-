# NYSI Integrated Nutrition & Supplement Management System (INSMS)
## Term 8 Technical Documentation

**Project:** NYSI Capstone — INSMS  
**Institution:** New York Sports Institute (NYSI)  
**Last Updated:** April 2026  
**Status:** Production — All Core Modules Complete

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Module Documentation](#5-module-documentation)
   - 5.1 [SSS — Supplement Support System](#51-sss--supplement-support-system)
   - 5.2 [AMS — Athlete Management System](#52-ams--athlete-management-system)
   - 5.3 [Consultation Module](#53-consultation-module)
   - 5.4 [Admin Module](#54-admin-module)
   - 5.5 [Auth Module](#55-auth-module)
   - 5.6 [OCR Services](#56-ocr-services)
6. [Database Design](#6-database-design)
7. [API Reference](#7-api-reference)
8. [Security Architecture](#8-security-architecture)
9. [Setup & Deployment](#9-setup--deployment)
10. [Design Decisions & Patterns](#10-design-decisions--patterns)

---

## 1. Project Overview

### 1.1 Background

The New York Sports Institute (NYSI) required a centralized platform to manage the supplement lifecycle for its athletes. Previously, nutritionists tracked supplement inventory, athlete consultations, and batch certification compliance through disconnected tools and manual processes. The INSMS consolidates these workflows into a single, role-based web application.

### 1.2 Objectives

- Provide a searchable supplement library with inventory and batch tracking
- Enable structured nutrition consultations linked to athlete profiles
- Automate supplement discovery via web scraping and AI-assisted OCR label scanning
- Verify supplement batch certification against six international databases
- Enforce role-based access control for nutritionists and administrators

### 1.3 Scope

The system covers the following functional areas:

| Module | Description |
|--------|-------------|
| **SSS** | Supplement library, inventory batches, web scraper staging, vector similarity search |
| **AMS** | Athlete profiles, registry, medical records, consultation session linking |
| **Consultation** | Card-based clinical workflow — 8 data cards per session |
| **Admin** | User account management, sports and coach records, audit logging |
| **Auth** | Email-based two-factor authentication with JWT |
| **OCR Services** | Supplement label scanning, batch certification verification |

---

## 2. System Architecture

### 2.1 Overview

INSMS is a **three-tier web application** composed of three independently running services:

```
┌──────────────────────────────────┐
│   Frontend — Next.js 15          │  Port 3000
│   (TypeScript, React, Tailwind)  │
└────────────────┬─────────────────┘
                 │ /api/* (proxy rewrite)
┌────────────────▼─────────────────┐
│   Backend — Express 5 (Node.js)  │  Port 8000
│   (REST API, Swagger, Zod, JWT)  │
└──────────┬───────────┬───────────┘
           │           │
  PostgreSQL│           │ HTTP
  (pgvector)│   ┌───────▼────────────────────┐
           │   │  Python Services — FastAPI  │  Port 8001
           │   │  (OCR, Vectorisation,       │
           │   │   Web Scraping, LLM)        │
           │   └────────────────────────────┘
┌──────────▼──────────────────────┐
│   PostgreSQL 14+                │  Port 5432
│   (pgvector, pgcrypto)          │
└─────────────────────────────────┘
```

### 2.2 Communication Patterns

**Frontend → Backend**  
The Next.js frontend calls relative API paths (e.g. `/api/SSS/supplements`). A rewrite rule in `next.config.ts` transparently proxies these requests to `http://localhost:8000/api/*`, so no CORS handling is needed from the browser.

**Backend → Python Services**  
The Express backend delegates AI/ML tasks to the Python FastAPI microservice via HTTP. These calls are made for:
- OCR text extraction and LLM-based structuring
- Supplement embedding vector generation
- Web scraper job execution
- Certification database verification (via Playwright)

**Backend → Database**  
All database access uses the `pg` (node-postgres) library with a connection pool and parameterised SQL queries. No ORM is used.

### 2.3 Architectural Patterns

#### Layered Architecture (MVC-inspired)

Each backend module is structured across four layers:

| Layer | File | Responsibility |
|-------|------|----------------|
| Routes | `routes.js` | HTTP method + path routing, Swagger JSDoc annotations |
| Controller | `controller.js` | Input validation (Zod), business logic, response formatting |
| Service | `services.js` | Parameterised SQL queries, data transformation |
| Validation | `validation.js` | Reusable Zod schemas and business rule validators |

#### Module Pattern

Every feature is self-contained in its own directory under `Backend/modules/`. Complex modules (SSS, AMS, Consultation) further split into sub-modules, each with its own routes/controller/services/validation.

#### Two-Tier Validation

```
Tier 1 (Zod schema)  — enforces data types, required fields, formats
Tier 2 (Controller)  — enforces business rules (e.g. batch_testing_org required when status = BATCH TESTED)
```

---

## 3. Technology Stack

### 3.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15 (App Router) | React framework, file-based routing, API proxying |
| React | 19 | UI component library |
| TypeScript | 5.x | Static typing |
| Tailwind CSS | 3.x | Utility-first styling |
| JWT (client-side) | — | Authentication state via `AuthContext` |

### 3.2 Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| Express | 5.x | HTTP server and routing |
| Zod | 3.x | Schema validation |
| jsonwebtoken | — | JWT generation and verification |
| bcrypt | — | Password hashing |
| Nodemailer | — | 2FA email delivery |
| express-rate-limit | — | Brute-force protection on auth endpoints |
| Swagger / OpenAPI | 3.0 | Interactive API documentation |
| pg (node-postgres) | — | PostgreSQL client with connection pooling |

### 3.3 Database

| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | 14+ | Relational database |
| pgvector | — | 384-dim vector storage and cosine similarity search |
| pgcrypto | — | `gen_random_uuid()` for UUID primary keys |

### 3.4 Python Services

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.10+ | Runtime |
| FastAPI | 0.109.0 | HTTP microservice framework |
| PaddleOCR | 2.8.1 | Supplement label text extraction |
| PaddlePaddle | 2.6.2 | Deep learning backend for PaddleOCR |
| OpenAI GPT-4o-mini | — | Structured data extraction from raw OCR text |
| sentence-transformers | — | BAAI/bge-small-en-v1.5 (384-dim) embedding generation |
| PyTorch | 2.0.1 (CPU) | Model inference backend |
| Playwright | — | Headless browser for scraping and certification verification |

---

## 4. Project Structure

```
NYSI-Capstone-Group-INSMS-/
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                         # Dashboard / home
│   │   ├── login/                           # Login and 2FA verification pages
│   │   ├── unauthorized/                    # 403 access denied page
│   │   ├── SSS/
│   │   │   ├── library/                     # Supplement library listing
│   │   │   ├── inventory/                   # Batch inventory management
│   │   │   ├── batch-testing/               # Batch certification testing
│   │   │   ├── search/                      # AI-assisted supplement search (OCR)
│   │   │   ├── web-scraper/                 # Web scraper management
│   │   │   └── supplements/[id]/            # Supplement detail + alternatives
│   │   ├── AMS/
│   │   │   └── athlete-management/
│   │   │       ├── page.tsx                 # Athlete list
│   │   │       └── [id]/
│   │   │           ├── page.tsx             # Athlete profile
│   │   │           └── consultation/[sessionId]/page.tsx
│   │   ├── admin/
│   │   │   ├── users/                       # User account management
│   │   │   └── sports-coaches/              # Sports and coach management
│   │   └── api/ocr/                         # Next.js API route (OCR proxy)
│   ├── components/
│   │   ├── SSS/                             # Supplement, inventory, OCR components
│   │   ├── AMS/                             # Athlete and consultation card components
│   │   ├── Admin/                           # Admin UI components
│   │   └── Dashboard/                       # Dashboard, calendar, session widgets
│   ├── contexts/
│   │   └── AuthContext.tsx                  # Global authentication state
│   └── utils/
│       ├── consultationApi.ts               # Consultation API client functions
│       └── dashboardApi.ts                  # Dashboard API client functions
│
├── Backend/
│   ├── config/
│   │   ├── db.js                            # PostgreSQL connection pool
│   │   └── swagger.js                       # Swagger/OpenAPI configuration
│   ├── modules/
│   │   ├── SSS/                             # Supplement Support System
│   │   │   ├── index.js                     # Sub-module route aggregator
│   │   │   ├── supplements/                 # CRUD, alternatives, lookups
│   │   │   ├── inventory/                   # Batch CRUD
│   │   │   ├── staging/                     # Staging review, approval, scraping
│   │   │   └── shared/                      # Shared validators and vectorization helpers
│   │   ├── AMS/                             # Athlete Management System
│   │   │   ├── index.js
│   │   │   ├── athlete/
│   │   │   ├── coach/
│   │   │   ├── nutritionist/
│   │   │   └── sport/
│   │   ├── Consultation/                    # Nutrition Consultation
│   │   │   ├── index.js
│   │   │   ├── consultation-session/
│   │   │   ├── consultation-lookups/
│   │   │   ├── anthropometry/
│   │   │   ├── medical-history/
│   │   │   ├── nutrition-requirements/
│   │   │   ├── mealLog/
│   │   │   ├── trainingSchedule/
│   │   │   ├── supplement-dispensing/
│   │   │   ├── nutrition-diagnosis-summary/
│   │   │   └── actionables/
│   │   ├── Admin/
│   │   ├── Auth/
│   │   └── OCR/
│   └── server.js                            # Express application entry point
│
├── Python_Services/
│   └── app/
│       ├── main.py                          # FastAPI entry point + CORS
│       ├── config/settings.py               # Pydantic settings
│       ├── routers/
│       │   ├── ocr.py
│       │   ├── vectorization.py
│       │   ├── webscraper.py
│       │   └── batch_verification.py
│       └── services/
│           ├── ocr_engine.py                # PaddleOCR wrapper (lazy-loaded)
│           ├── llm_structurer.py            # GPT-4o-mini text structuring
│           ├── vectorizer.py                # Embedding generation
│           ├── batch_tester.py              # Consensus-based certification check
│           └── certification_searcher.py    # Per-database Playwright search
│
└── docs/                                    # Project documentation
```

---

## 5. Module Documentation

### 5.1 SSS — Supplement Support System

#### Overview

The SSS module is the core of the application. It manages the full supplement lifecycle from discovery (web scraping) through review (staging) to the active library (supplements), as well as inventory batch tracking and AI-powered alternative finding.

#### Sub-Module Breakdown

| Sub-Module | Responsibility |
|------------|----------------|
| `supplements/` | Supplement CRUD, vector similarity search for alternatives, lookup tables |
| `inventory/` | Batch/lot CRUD, stock calculations (booked vs. available) |
| `staging/` | Staging review, approval workflow, catalog URL management, scraping jobs |
| `shared/` | Reusable Zod validators, vectorization helpers |

#### Supplement CRUD

- List supplements with server-side pagination (10/page) and multi-field search
- Search ranks results across: supplement name, brand, ingredients (JSONB), packaging form, and status
- Detail view returns full supplement data, current stock summary, and linked inventory batches
- Create and update generate 384-dim embedding vectors by calling the Python vectorization service
- Vectors are only regenerated on update when ingredients or nutritional info fields change

#### Staging & Approval Workflow

```
Web Scraper (Python) → Supplement_Staging table
         ↓
Admin reviews staging entries (edit fields if needed)
         ↓
Approve → (1) Generate vectors → (2) Duplicate check → (3) Promote to Supplement table
```

**Duplicate detection** during approval uses two independent checks:
- Vector cosine similarity ≥ 95% (pgvector `<=>` operator)
- Normalised name and brand string match

If a duplicate is detected, the staging entry is automatically deleted and no promotion occurs.

#### Alternative Supplement Search

For any supplement, `/api/SSS/supplements/:id/alternatives` performs a pgvector cosine similarity query against all non-discontinued supplements. Results with similarity ≥ 60% are returned, ranked by relevance. Vectors are compared on both per-100g and per-serving nutritional bases.

#### Inventory & Stock

`Inventory_Batch` stores each physical batch/lot. The available stock for any batch is computed as:

```
available = initial_quantity − SUM(ticket quantities for that batch)
```

Batches with associated inventory tickets cannot be deleted (deletion guard enforced in the service layer).

---

### 5.2 AMS — Athlete Management System

#### Overview

Manages athlete profiles and their linked registry, medical, and consultation records.

#### Atomic Athlete Creation

`POST /api/AMS/athletes` creates three related records in a single database transaction:

1. `Athlete` — base profile (name, DOB, gender, sport, ethnicity, target event)
2. `Athlete_Registry` — carding and eligibility status
3. `Athlete_Medical` — medical conditions, dietary restrictions, medical remarks

If any insert fails, the entire transaction is rolled back.

#### Key Design Points

- The athlete detail page returns athlete + registry data only (medical is accessed via a separate PATCH endpoint)
- `target_event`, `ethnicity`, and `start_of_sporting_date` are stored as real database columns (not JSONB)
- Bulk delete is supported: `DELETE /api/AMS/athletes` with `{ ids: [...] }` body
- Consultation sessions are linked to athletes via `sessions.athlete_id`

---

### 5.3 Consultation Module

#### Overview

A card-based clinical workflow. Each consultation session contains 8 independent data cards that nutritionists can complete in any order.

#### Session Lifecycle

```
1. Create session → consultation-session (athlete_id, date, type, title, etc.)
   - Nutritionist is auto-assigned from the JWT claim
2. Fill in cards independently:
   - Anthropometry, Medical History, Nutrition Requirements,
     Meal Log, Training Schedule, Supplement Dispensing,
     Nutrition Diagnosis & Summary, Actionables
3. Each card exposes GET / POST / PATCH (or GET / PUT for training schedule)
4. Previous session tab on each card compares with the prior session
```

#### Card Summary

| Card | Sub-Module | Key Data |
|------|-----------|---------|
| Anthropometry | `anthropometry/` | Height, weight, BMI, body fat %, muscle mass |
| Medical History | `medical-history/` | Medical conditions, dietary restrictions |
| Nutrition Requirements | `nutrition-requirements/` | Energy needs, macro targets |
| Meal Log | `mealLog/` | Food intake records |
| Training Schedule | `trainingSchedule/` | PAL, training activities per day of week |
| Supplement Dispensing | `supplement-dispensing/` | Supplements allocated from inventory |
| Nutrition Diagnosis & Summary | `nutrition-diagnosis-summary/` | Clinical diagnosis and recommendations |
| Actionables | `actionables/` | Follow-up tasks |

#### Training Schedule Schema

`session_training` is the parent record (one per session) and holds the Physical Activity Level (PAL). `session_training_schedule` rows are children that each represent a single training activity with a `day_of_week` value constrained to title-case day names (`'Monday'` through `'Sunday'`).

#### session_note Upsert Pattern

The first card that writes to `session_note` (the diagnosis/summary card) inserts the row. All subsequent cards that update `session_note` fields must check for an existing row and use `UPDATE`, never `INSERT` — this prevents duplicate primary key violations.

---

### 5.4 Admin Module

#### Overview

Provides platform administration for user accounts, sports, and coach records.

#### Features

- **User management**: Create accounts with roles (Nutritionist, Admin), update credentials, deactivate accounts
- **Audit log**: Every change to a user account is recorded in `audit.audit_log` with old/new JSONB snapshots
- **Sports management**: CRUD for the `Sport_Lookup` reference table
- **Coach management**: CRUD for coach records

---

### 5.5 Auth Module

#### Overview

Email-based two-factor authentication with JWT bearer tokens.

#### Authentication Flow

```
Step 1 — POST /api/auth/login
  • Validate email and password (bcrypt comparison)
  • Generate a 6-digit OTP code
  • Send code to registered email via Nodemailer (expires in 10 minutes)
  • Return masked email address for the verification UI

Step 2 — POST /api/auth/verify-code
  • Validate the 6-digit code
  • Issue a JWT token (24-hour expiry, contains user ID and role)
  • Return token + user profile

Subsequent requests
  • Include: Authorization: Bearer <token>
  • authMiddleware.js verifies the JWT and attaches req.user
```

#### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `POST /api/auth/login` | 5 attempts per 15 minutes |
| `POST /api/auth/verify-code` | 3 attempts per minute |
| `POST /api/auth/resend-code` | 2 requests per 5 minutes |
| `POST /api/auth/register` | 3 attempts per hour |

---

### 5.6 OCR Services

#### Overview

Two distinct use cases handled by the OCR module:

**UC1 — Nutrition Label Analysis (2-step)**

```
Step 1:
  POST /api/ocr/ocr-only        → PaddleOCR extracts raw text from image
  POST /api/ocr/analyze-text    → GPT-4o-mini structures raw text into supplement fields
                                  (ingredients, nutritional info, brand, etc.)
  → User reviews and edits the extracted data in a form

Step 2:
  POST /api/ocr/find-alternatives → Vectorise structured data
                                    → cosine similarity search against supplement library
                                    → Return similar supplements (≥ 60% similarity)
```

**UC2 — Batch Certification Verification**

```
POST /api/ocr/extract   → Upload brand/product image (+ optional batch image)
                          → OCR + LLM extracts brand, product name, batch ID
                          → User confirms or corrects extracted info

POST /api/ocr/verify    → Submit confirmed brand/name/batch_id
                          → Playwright searches 6 certification databases:
                             Informed Sport, Informed Choice, HASTA,
                             NSF Sport, Cologne List, BSCG
                          → Return verification results with quick links
```

#### File Upload Constraints

| Parameter | Value |
|-----------|-------|
| Maximum file size | 10 MB |
| Accepted MIME types | image/jpeg, image/png, image/webp |
| Similarity threshold | 60% cosine similarity |
| Python service timeout | 120 seconds |

---

## 6. Database Design

### 6.1 Schema Organisation

The PostgreSQL database is partitioned into four named schemas:

| Schema | Purpose |
|--------|---------|
| `SSS` | Supplement and inventory data |
| `AMS` | Athlete profiles, registry, medical, coaches, nutritionists |
| `Consultation` | Session records and all 8 clinical card tables |
| `auth` | User accounts |
| `audit` | Centralised audit trail |

### 6.2 Core Tables

#### SSS Schema

| Table | Description |
|-------|-------------|
| `SSS.Supplement` | Main product catalog — includes JSONB ingredient and nutritional fields, plus two `vector(384)` columns for similarity search |
| `SSS.Supplement_Staging` | Scraped supplements awaiting admin review and approval |
| `SSS.Inventory_Batch` | Batch/lot records with initial quantity |
| `SSS.Inventory_Ticket` | Supplement allocation records (links batch to dispensing) |
| `SSS.webscraper_catalog_url` | Target URLs for the web scraper |
| `SSS.Supplement_Packaging_Form_Lookup` | Packaging type reference (Bottle, Tub, Tablet, Bar) |
| `SSS.Supplement_Status_Lookup` | Batch testing status reference (BATCH TESTED, NOT BATCH TESTED, DISCONTINUED) |

#### AMS Schema

| Table | Description |
|-------|-------------|
| `AMS.Athlete` | Core athlete profile |
| `AMS.Athlete_Registry` | Carding and eligibility status (1:1 with Athlete) |
| `AMS.Athlete_Medical` | Medical history and dietary restrictions (1:1 with Athlete) |
| `AMS.Coach` | Coach records |
| `AMS.Nutritionist` | Nutritionist records |
| `AMS.Sport_Lookup` | Sports reference data |
| `AMS.Coach_Athlete_Mapping` | Many-to-many coach ↔ athlete |
| `AMS.Nutritionist_Athlete_Mapping` | Many-to-many nutritionist ↔ athlete |

#### Consultation Schema

| Table | Description |
|-------|-------------|
| `Consultation.sessions` | Session record linking athlete, nutritionist, date, and type |
| `Consultation.session_note` | Clinical notes: objective, diagnosis, recommendations |
| `Consultation.anthropometry` | Physical measurement records per session |
| `Consultation.session_training` | Training parent record with PAL per session |
| `Consultation.session_training_schedule` | Individual training activities (child of session_training) |
| `Consultation.meal_log` | Dietary intake records |
| `Consultation.supplement_dispensing` | Supplement allocations per session |
| `Consultation.actionables` | Follow-up tasks per session |

#### auth / audit Schemas

| Table | Description |
|-------|-------------|
| `auth.users` | User accounts (email, hashed password, role, is_active) |
| `audit.audit_log` | Centralised change log with JSONB old/new value snapshots |

### 6.3 Key Design Decisions

**UUID Primary Keys** — All tables use `gen_random_uuid()` (built-in PostgreSQL, no extension required).

**JSONB for Semi-Structured Data** — Supplement ingredients and nutritional information are stored as JSONB to accommodate variable nutrient lists without schema migrations.

**pgvector Columns** — `SSS.Supplement` carries two vector columns:
- `vector_100g_ingredient` — embedding of ingredients + per-100g nutrition
- `vector_perserving_ingredient` — embedding of ingredients + per-serving nutrition

Cosine distance operator `<=>` is used for similarity queries. Similarity = `1 − distance`. Only supplements with similarity ≥ 0.60 are returned as alternatives.

**Lookup Tables** — Reference data (packaging forms, supplement statuses, etc.) is stored in lookup tables with an `is_active` flag rather than hard-coded enums. This allows safe additions without schema changes.

**Audit Logging** — All write operations on user accounts are recorded in `audit.audit_log` with JSONB snapshots of the before/after state.

---

## 7. API Reference

### 7.1 Backend Endpoints (port 8000)

Full interactive documentation is available at `http://localhost:8000/docs` (Swagger UI).

#### SSS — Supplements

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/SSS/supplements` | List / search supplements (paginated) |
| `GET` | `/api/SSS/supplements/:id` | Supplement detail with stock and batches |
| `GET` | `/api/SSS/supplements/:id/alternatives` | Find similar supplements via vector search |
| `POST` | `/api/SSS/supplements` | Create supplement (auto-vectorises) |
| `PATCH` | `/api/SSS/supplements/:id` | Update supplement (re-vectorises if needed) |
| `DELETE` | `/api/SSS/supplements` | Bulk delete by ID array |

#### SSS — Inventory

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/SSS/batches` | List batches (paginated) |
| `POST` | `/api/SSS/batches` | Create batch |
| `PATCH` | `/api/SSS/batches/:id` | Update batch |
| `DELETE` | `/api/SSS/batches` | Bulk delete batches |

#### SSS — Staging & Catalog

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/SSS/staging-supplements` | List unreviewed staging entries |
| `GET` | `/api/SSS/staging-supplements/:id` | Staging entry detail |
| `PATCH` | `/api/SSS/staging-supplements/:id` | Edit staging entry |
| `POST` | `/api/SSS/staging-supplements/approve` | Approve → vectorise → duplicate check → promote |
| `DELETE` | `/api/SSS/staging-supplements` | Bulk delete staging entries |
| `GET/POST/PATCH/DELETE` | `/api/SSS/catalog-urls` | Catalog URL CRUD |
| `POST` | `/api/SSS/scraping/start` | Start fire-and-forget scraping job |

#### AMS — Athletes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/AMS/athletes` | List / search athletes |
| `GET` | `/api/AMS/athletes/:id` | Athlete detail (profile + registry) |
| `POST` | `/api/AMS/athletes` | Create athlete + registry + medical (transaction) |
| `PATCH` | `/api/AMS/athletes/:id` | Update athlete base fields |
| `DELETE` | `/api/AMS/athletes` | Bulk delete athletes |
| `PATCH` | `/api/AMS/athletes/:id/registry` | Update registry record |
| `PATCH` | `/api/AMS/athletes/:id/medical` | Update medical record |

#### Consultation

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/Consultation/sessions` | List sessions for an athlete |
| `POST` | `/api/Consultation/sessions` | Create session (auto-assigns nutritionist) |
| `GET/POST/PATCH` | `/api/Consultation/sessions/:id/anthropometry` | Anthropometry card |
| `GET/POST/PATCH` | `/api/Consultation/sessions/:id/medical-history` | Medical history card |
| `GET/POST/PATCH` | `/api/Consultation/sessions/:id/nutrition-requirements` | Nutrition requirements card |
| `GET/POST/PATCH` | `/api/Consultation/sessions/:id/meal-log` | Meal log card |
| `GET/PUT` | `/api/Consultation/sessions/:id/training-schedule` | Training schedule card |
| `GET/POST/PATCH` | `/api/Consultation/sessions/:id/supplement-dispensing` | Supplement dispensing card |
| `GET/POST/PATCH` | `/api/Consultation/sessions/:id/nutrition-diagnosis-summary` | Diagnosis summary card |
| `GET/POST/PATCH` | `/api/Consultation/sessions/:id/actionables` | Actionables card |

#### Admin

| Method | Path | Description |
|--------|------|-------------|
| `GET/POST` | `/api/admin/users` | List / create users |
| `PATCH/DELETE` | `/api/admin/users/:id` | Update / delete user |
| `GET` | `/api/admin/users/:id/audit` | User audit log |
| `GET/POST/PATCH/DELETE` | `/api/admin/sports` | Sports management |
| `GET/POST/PATCH/DELETE` | `/api/admin/coaches` | Coach management |

#### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Step 1: validate credentials, send OTP |
| `POST` | `/api/auth/verify-code` | Step 2: verify OTP, receive JWT |
| `POST` | `/api/auth/resend-code` | Resend OTP |
| `GET` | `/api/auth/me` | Get current user profile (auth required) |
| `POST` | `/api/auth/logout` | Logout (auth required) |
| `POST` | `/api/auth/register` | Register new user |

#### OCR

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ocr/ocr-only` | Stage 1: image → raw OCR text |
| `POST` | `/api/ocr/analyze-text` | Stage 2: raw text → structured supplement data |
| `POST` | `/api/ocr/find-alternatives` | Find similar supplements from structured data |
| `POST` | `/api/ocr/extract` | Extract brand/name/batch ID from image |
| `POST` | `/api/ocr/verify` | Verify supplement on certification sites |
| `POST` | `/api/ocr/analyze` | Legacy single-stage full pipeline |

### 7.2 Python Service Endpoints (port 8001)

Full interactive documentation at `http://localhost:8001/docs`.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ocr/ocr-only` | PaddleOCR text extraction from image |
| `POST` | `/api/ocr/analyze-text` | GPT-4o-mini structured data extraction |
| `POST` | `/api/ocr/analyze` | Full OCR pipeline (image → structured data + vectors) |
| `POST` | `/api/vectorization/generate` | Generate a single 384-dim vector |
| `POST` | `/api/vectorization/generate-product-vectors` | Dual vector (per-serving + per-100g) |
| `POST` | `/api/webscraper/scrape-full` | Scrape a catalog URL and push results to staging |
| `POST` | `/api/batch-verification/verify` | Verify supplement by brand/name on 6 certification DBs |

### 7.3 Response Format Standards

**Success (paginated list):**
```json
{
  "data": [...],
  "currentPage": 1,
  "totalPages": 5,
  "totalCount": 47,
  "searchQuery": "vitamin"
}
```

**Error:**
```json
{
  "error": "Validation failed",
  "details": [
    { "field": "supplement_name", "message": "Supplement name is required" }
  ]
}
```

**HTTP Status Codes:**

| Code | Meaning |
|------|---------|
| `200` | Successful GET / PATCH / DELETE |
| `201` | Successful POST (resource created) |
| `202` | Accepted — fire-and-forget job started |
| `400` | Validation or business rule failure |
| `401` | Missing or invalid JWT |
| `404` | Resource not found |
| `409` | Conflict — duplicate resource |
| `500` | Internal server error |

---

## 8. Security Architecture

### 8.1 Implemented Controls

| Control | Implementation |
|---------|---------------|
| Password hashing | bcrypt with salt rounds |
| Two-factor authentication | 6-digit OTP via Nodemailer, expires in 10 minutes |
| Session tokens | JWT (24-hour expiry), Bearer scheme |
| Brute-force protection | `express-rate-limit` on all auth endpoints |
| SQL injection prevention | Parameterised queries throughout (no string interpolation) |
| Input validation | Zod schemas on all API inputs |
| UUID validation | Validated before DB queries to prevent malformed lookups |
| Environment secrets | All credentials in `.env` files, never committed |
| CORS | Configured to allow only the frontend origin |

### 8.2 Planned Controls

| Control | Status |
|---------|--------|
| Role-based access control (RBAC) enforcement | Roles stored but not enforced at route level yet |
| Helmet.js security headers | Planned |
| CSRF protection | Planned |
| JWT refresh tokens | Planned |
| Token blacklisting on logout | Planned |

### 8.3 Authentication Flow Diagram

```
User enters email + password
          ↓
POST /api/auth/login
  → bcrypt.compare(password, hash)
  → Generate 6-digit OTP
  → Send OTP via Nodemailer
  → Return { maskedEmail }
          ↓
User enters OTP
          ↓
POST /api/auth/verify-code
  → Compare OTP + expiry check
  → jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '24h' })
  → Return { token, user }
          ↓
Subsequent API requests
  → Authorization: Bearer <token>
  → authMiddleware.js verifies token
  → Attaches req.user = { id, role }
```

---

## 9. Setup & Deployment

### 9.1 Option A — Docker (Recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
# 1. Copy the environment template and fill in your values
cp .env.example .env

# 2. Build and start all services
docker compose up --build
```

> **First build takes 20–40 minutes** — PaddleOCR, PyTorch, and Playwright install inside the Python image. Subsequent builds use the layer cache.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| Python Service | http://localhost:8001 |

### 9.2 Option B — Manual Setup

#### Prerequisites

- Node.js 18+
- Python 3.10 (avoid 3.12)
- PostgreSQL 14+ with `pgvector` and `pgcrypto` extensions
- Visual C++ Redistributable (Windows, required by PaddlePaddle)

#### Backend

```bash
cd Backend
npm install
# Configure Backend/.env (see Environment Variables below)
npx nodemon server.js   # development
node server.js          # production
```

#### Python Services

```bash
cd Python_Services
python -m venv venv
source venv/bin/activate          # Linux/Mac
.\venv\Scripts\activate           # Windows

pip install --upgrade pip
pip install -r requirements.txt
playwright install chromium       # browser binaries for Playwright

# Configure Python_Services/.env
uvicorn app.main:app --port 8001 --reload
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

### 9.3 Environment Variables

#### Root `.env` (Docker)

```env
PGHOST=your-db-host
PGPORT=5432
PGDATABASE=your_db_name
PGUSER=your_db_user
PGPASSWORD=your_db_password
PGSSLMODE=require

JWT_SECRET=your_long_random_secret
JWT_EXPIRY=24h

EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx    # Gmail app password
SKIP_2FA=false
CODE_EXPIRY_MINUTES=10

OPENAI_API_KEY=sk-proj-...
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
VECTOR_DIMENSION=384
```

#### Backend/.env (Manual Only)

```env
PGHOST=<db-host>
PGPORT=5432
PGDATABASE=<db-name>
PGUSER=<db-user>
PGPASSWORD=<db-password>
PGSSLMODE=require
PORT=8000
FRONTEND_URL=http://localhost:3000
PYTHON_SERVICE_URL=http://localhost:8001
JWT_SECRET=<secret>
JWT_EXPIRY=24h
EMAIL_USER=<gmail>
EMAIL_PASSWORD=<app-password>
SKIP_2FA=false
```

#### Python_Services/.env (Manual Only)

```env
OPENAI_API_KEY=sk-proj-xxxxx
SERVICE_PORT=8001
SERVICE_HOST=0.0.0.0
BACKEND_URL=http://localhost:8000
POSTGRES_HOST=<db-host>
POSTGRES_PORT=5432
POSTGRES_DB=<db-name>
POSTGRES_USER=<db-user>
POSTGRES_PASSWORD=<db-password>
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
VECTOR_DIMENSION=384
SCRAPER_HEADLESS=true
```

---

## 10. Design Decisions & Patterns

### 10.1 Why a Separate Python Service?

Three reasons drove the decision to run AI/ML as a separate FastAPI microservice rather than integrating it into the Node.js backend:

1. **Vector consistency** — All supplement embeddings must be generated by the same model instance. Centralising generation in Python prevents the model drift that would occur if Node.js and Python produced incompatible vectors.

2. **Python library ecosystem** — PaddleOCR, PyTorch, Playwright, and sentence-transformers are Python-first. Their Node.js bindings are either absent or significantly less mature.

3. **Resource isolation** — OCR and vectorisation are CPU-intensive operations. Running them in a separate process prevents blocking the Node.js event loop during inference.

### 10.2 Why PostgreSQL with pgvector over a Dedicated Vector DB?

Supplement similarity search operates on a relatively small dataset (hundreds to low thousands of records). Using pgvector within the existing PostgreSQL instance avoids introducing a second database technology (e.g. Pinecone, Weaviate) while still supporting efficient cosine similarity queries. The `<=>` operator and vector(384) columns integrate naturally with the existing SQL queries.

### 10.3 Why Parameterised Queries over an ORM?

The team chose raw parameterised SQL over an ORM (e.g. Prisma, TypeORM) to maintain full control over query structure, enable complex JOINs across multiple schemas, and avoid ORM abstraction overhead. This is appropriate for a capstone project where learning SQL is a stated goal.

### 10.4 Why Zod over Joi?

Zod's TypeScript-first design provides better type inference and a more modern API. It also prepares the backend for a potential future TypeScript migration, where Zod schemas can be shared between frontend and backend.

### 10.5 Common Code Patterns

**Dynamic PATCH (field mapping)**
Controllers build update queries by iterating over a field map and appending only the fields present in the request body. This prevents accidental nullification of unrelated columns.

**Bulk delete**
All delete endpoints accept `{ ids: ["uuid1", "uuid2"] }` in the request body, validated against a reusable `bulkDeleteSchema`.

**Fire-and-forget scraping**
`POST /api/SSS/scraping/start` immediately returns `202 Accepted` and submits scrape requests to the Python service without awaiting their completion. Results are later found in the staging table.

**Transaction pattern for multi-table creates**
```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... multiple inserts ...
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

---

*End of Technical Documentation*
