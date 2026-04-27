# NYSI Capstone - Integrated Nutrition Supplement Management System (INSMS)

A three-tier web application for managing sports nutrition supplements, athlete profiles, nutrition consultations, and inventory tracking - with AI-powered OCR, web scraping, and semantic search capabilities.

## Architecture

```
Frontend (Next.js 15, port 3000)
    | rewrites /api/*
Backend (Express 5, port 8000)
    |-> PostgreSQL (pgvector)
    '-> Python Services (FastAPI, port 8001)
           |-> PaddleOCR (text extraction)
           |-> OpenAI GPT-4o-mini (parsing)
           |-> Sentence Transformers (embeddings)
           '-> Playwright (scraping + batch verification)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Backend** | Express 5, Zod validation, Swagger/OpenAPI 3.0 |
| **Python Services** | FastAPI, PaddleOCR, sentence-transformers (BAAI/bge-small-en-v1.5) |
| **Database** | PostgreSQL 14+ with pgvector extension |
| **OCR** | PaddleOCR PP-OCRv5 + GPT-4o-mini for structured extraction |

## Modules

### SSS - Supplement Support System
- Supplement library CRUD with search and pagination
- Inventory batch tracking with stock calculations
- Vector similarity search for alternative supplements (pgvector, 384-dim embeddings)
- Web scraper staging workflow: scrape -> staging -> admin review -> approve -> library
- Duplicate detection on staging approval (95% vector similarity + name/brand matching)
- Auto-vectorization on create and update

### AMS - Athlete Management System
- Athlete CRUD with registry and medical records (single transaction)
- Athlete detail view (profile + registry)
- Consultation session management per athlete
- Sport lookup for dropdowns

### Consultation - Nutrition Consultation
- Card-based consultation workflow organized by clinical domain
- Session management: create, list, and view sessions per athlete
- 8 specialized data cards per session:
  - **Anthropometry** - Physical measurements (height, weight, body composition)
  - **Medical History** - Past conditions, dietary restrictions, medical remarks
  - **Nutrition Requirements** - Macros, energy needs, dietary targets
  - **Meal Logs** - Dietary intake records
  - **Training Schedule** - Exercise program with PAL (physical activity level)
  - **Supplement Dispensing** - Supplement allocation from inventory
  - **Nutrition Diagnosis & Summary** - Clinical assessment and recommendations
  - **Actionables** - Follow-up tasks and next steps
- Previous session tab on each card for comparison
- Nutritionist auto-assigned from JWT on session creation

### Dashboard
- Home page (`/`) for nutritionists
- Daily stats: today's session count, completed sessions, active athletes
- Calendar view with session scheduling and booking modal
- Today's schedule and upcoming sessions list
- Create, reschedule, cancel, and update session status directly from the dashboard

### Admin - Administration
- User management: create, edit, deactivate users with role assignment
- Sports & coaches management: CRUD for sports and coach records
- User audit log for tracking changes
- Email and password management for accounts

### OCR Services
- Supplement label image upload and text extraction
- AI-powered structured data parsing
- Batch ID and brand verification against 6 certification databases (Informed Sport, Informed Choice, HASTA, NSF Sport, Cologne List, BSCG)

## Quick Start

### Option A — Docker (Recommended)

The easiest way to run the full stack. Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
# 1. Copy the environment template and fill in your values
cp .env.example .env

# 2. Build and start all three services
docker compose up --build
```

> **First build takes 20–40 minutes** — PaddleOCR, PyTorch, and Playwright install inside the Python image. Subsequent builds use the layer cache and are much faster.

Once all containers are healthy:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| Python Service | http://localhost:8001 |

To stop: `docker compose down`

See [DOCKER.md](DOCKER.md) for full setup details and troubleshooting.

---

### Option B — Manual Setup

#### Prerequisites

- Node.js 18+
- Python 3.10+ (recommended: 3.10)
- PostgreSQL 14+ with pgvector extension

#### 1. Backend (Express)

```bash
cd Backend
npm install

# Create .env file (see Environment Variables below)

npx nodemon server.js   # dev with auto-reload
# or
node server.js           # production
```

Runs on `http://localhost:8000` | Swagger docs at `http://localhost:8000/docs`

#### 2. Python Services (FastAPI)

```bash
cd Python_Services

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate      # Linux/Mac
.\venv\Scripts\activate       # Windows

pip install -r requirements.txt

# Create .env file (see Environment Variables below)

uvicorn app.main:app --port 8001 --reload
```

Runs on `http://localhost:8001` | Docs at `http://localhost:8001/docs`

#### 3. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:3000`

## Environment Variables

### Docker Setup — One `.env` file at the root

When running with Docker, you only need **one `.env` file** placed at the project root (same folder as `docker-compose.yml`). Docker Compose reads it automatically and injects the correct values into each container.

```bash
# From the project root
cp .env.example .env
# Then open .env and fill in your values
```

The root `.env` looks like this (all values required unless marked optional):

```env
# ── Database (PostgreSQL / AWS RDS) ──────────────────────────────────────────
PGHOST=your-db-host.rds.amazonaws.com
PGPORT=5432
PGDATABASE=your_db_name
PGUSER=your_db_user
PGPASSWORD=your_db_password
PGSSLMODE=require
# Use PGSSLMODE=disable only if running a local containerised Postgres (no SSL)

# ── Authentication ────────────────────────────────────────────────────────────
JWT_SECRET=your_jwt_secret_here         # any long random string
JWT_EXPIRY=24h

# ── 2FA Email (Gmail app password) ───────────────────────────────────────────
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx     # Gmail app password (not your login password)
SKIP_2FA=false                          # Set to true to bypass 2FA during testing
CODE_EXPIRY_MINUTES=10
MAX_VERIFICATION_ATTEMPTS=3

# ── OpenAI (OCR parsing + web scraping) ──────────────────────────────────────
OPENAI_API_KEY=sk-proj-...

# ── ML / Vectorisation ───────────────────────────────────────────────────────
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
VECTOR_DIMENSION=384
```

> **Do not touch** `Backend/.env` or `Python_Services/.env` when using Docker — those are only used for local manual setup (Option B below).

---

### Manual Setup — Separate `.env` per service (Option B only)

#### Backend/.env

```env
PGHOST=<your-db-host>
PGPORT=5432
PGDATABASE=<your-db-name>
PGUSER=<your-db-user>
PGPASSWORD=<your-db-password>
PGSSLMODE=require
PORT=8000
FRONTEND_URL=http://localhost:3000
PYTHON_SERVICE_URL=http://localhost:8001
JWT_SECRET=<your-jwt-secret>
JWT_EXPIRY=24h
EMAIL_USER=<your-gmail>
EMAIL_PASSWORD=<your-gmail-app-password>
SKIP_2FA=false
```

#### Python_Services/.env

```env
OPENAI_API_KEY=sk-proj-xxxxx
SERVICE_PORT=8001
SERVICE_HOST=0.0.0.0
BACKEND_URL=http://localhost:8000
POSTGRES_HOST=<your-db-host>
POSTGRES_PORT=5432
POSTGRES_DB=<your-db-name>
POSTGRES_USER=<your-db-user>
POSTGRES_PASSWORD=<your-db-password>
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
VECTOR_DIMENSION=384
SCRAPER_HEADLESS=true
```

## Project Structure

```
NYSI-Capstone-Group-INSMS/
├── frontend/                     # Next.js 15 frontend
│   ├── app/
│   │   ├── page.tsx              # Dashboard home (stats, calendar, session booking)
│   │   ├── SSS/                  # Supplement Support System pages
│   │   │   ├── library/          # Supplement library
│   │   │   ├── inventory/        # Batch inventory management
│   │   │   ├── batch-testing/    # Batch certification testing
│   │   │   ├── search/           # Supplement search with OCR
│   │   │   ├── supplements/[id]/ # Supplement detail
│   │   │   ├── supplements/[id]/alternatives/ # Similar supplements
│   │   │   └── web-scraper/      # Web scraper management
│   │   ├── AMS/
│   │   │   └── athlete-management/
│   │   │       ├── page.tsx      # Athlete list
│   │   │       └── [id]/
│   │   │           ├── page.tsx  # Athlete detail
│   │   │           └── consultation/[sessionId]/page.tsx # Consultation view
│   │   ├── admin/
│   │   │   ├── users/            # User management
│   │   │   └── sports-coaches/   # Sports & coaches management
│   │   └── login/                # Authentication pages
│   ├── components/               # Shared React components
│   │   └── dashboard/            # Dashboard-specific components (stats, calendar, session cards)
│   ├── contexts/                 # AuthContext, ThemeContext
│   └── utils/                    # API clients, helpers
│
├── Backend/
│   ├── config/
│   │   ├── db.js                 # PostgreSQL connection pool
│   │   └── swagger.js            # Swagger/OpenAPI config
│   ├── modules/
│   │   ├── SSS/                  # Supplement Support System
│   │   │   ├── index.js          # Route aggregator
│   │   │   ├── supplements/      # Supplement CRUD, alternatives, lookups
│   │   │   ├── inventory/        # Batch CRUD
│   │   │   ├── staging/          # Staging review, approval, catalog URLs, scraping
│   │   │   └── shared/           # Reusable validators, vectorization helpers
│   │   ├── AMS/                  # Athlete Management System
│   │   │   ├── index.js          # Route aggregator
│   │   │   ├── athlete/          # Athlete CRUD, registry, medical
│   │   │   ├── coach/            # Coach management
│   │   │   ├── nutritionist/     # Nutritionist management
│   │   │   └── sport/            # Sport lookup
│   │   ├── Consultation/         # Nutrition Consultation
│   │   │   ├── index.js          # Route aggregator
│   │   │   ├── consultation-session/   # Session CRUD
│   │   │   ├── consultation-lookups/   # Reference data
│   │   │   ├── anthropometry/          # Physical measurements card
│   │   │   ├── medical-history/        # Medical history card
│   │   │   ├── nutrition-requirements/ # Nutritional needs card
│   │   │   ├── mealLog/                # Meal log card
│   │   │   ├── trainingSchedule/       # Training schedule card
│   │   │   ├── supplement-dispensing/  # Supplement dispensing card
│   │   │   ├── nutrition-diagnosis-summary/ # Diagnosis summary card
│   │   │   └── actionables/            # Actionables card
│   │   ├── Admin/                # Administration
│   │   │   ├── adminRoutes.js    # User, sport, coach management
│   │   │   ├── adminController.js
│   │   │   ├── adminServices.js
│   │   │   └── adminValidation.js
│   │   ├── Auth/                 # Authentication (2FA + JWT)
│   │   └── OCR/                  # OCR Services
│   └── server.js                 # Express entry point
│
├── Python_Services/              # FastAPI microservice
│   ├── app/
│   │   ├── main.py               # FastAPI entry point
│   │   ├── routers/              # ocr, vectorization, webscraper, batch_verification, scheduler
│   │   └── services/             # vectorizer, ocr_engine, llm_structurer, batch_tester, etc.
│   └── requirements.txt
│
└── docs/                         # Project documentation
    ├── PROJECT_ARCHITECTURE.md   # Full architecture details
    ├── DATABASE_SCHEMA.md        # Database schema reference
    ├── AMS_DATABASE_SCHEMA.md    # AMS schema reference
    ├── USE_CASES_IMPLEMENTATION.md
    ├── PYTHON_SERVICES.md
    └── ...
```

## API Overview

All three servers must be running for full functionality.

### Backend Endpoints (port 8000)

| Group | Prefix | Description |
|-------|--------|-------------|
| SSS - Supplements | `/api/SSS/supplements` | Library CRUD, search, alternatives |
| SSS - Inventory | `/api/SSS/batches` | Batch CRUD, stock tracking |
| SSS - Staging | `/api/SSS/staging-supplements` | Staging review and approval |
| SSS - Catalog URLs | `/api/SSS/catalog-urls` | Scraper target URL management |
| SSS - Scraping | `/api/SSS/scraping/start` | Fire-and-forget scraping jobs |
| SSS - Lookups | `/api/SSS/lookups/*` | Packaging forms, statuses |
| AMS - Athletes | `/api/AMS/athletes` | Athlete CRUD, registry, medical |
| AMS - Lookups | `/api/AMS/lookups/sports` | Sports dropdown |
| Consultation - Sessions | `/api/Consultation/sessions` | Create and list consultation sessions |
| Consultation - Anthropometry | `/api/Consultation/sessions/:id/anthropometry` | Physical measurements |
| Consultation - Medical History | `/api/Consultation/sessions/:id/medical-history` | Medical history |
| Consultation - Nutrition Req. | `/api/Consultation/sessions/:id/nutrition-requirements` | Nutritional needs |
| Consultation - Meal Logs | `/api/Consultation/sessions/:id/meal-log` | Dietary intake |
| Consultation - Training | `/api/Consultation/sessions/:id/training-schedule` | Training schedule |
| Consultation - Dispensing | `/api/Consultation/sessions/:id/supplement-dispensing` | Supplement allocation |
| Consultation - Diagnosis | `/api/Consultation/sessions/:id/nutrition-diagnosis-summary` | Clinical summary |
| Consultation - Actionables | `/api/Consultation/sessions/:id/actionables` | Follow-up tasks |
| Admin - Users | `/api/admin/users` | User CRUD and audit log |
| Admin - Sports & Coaches | `/api/admin/sports`, `/api/admin/coaches` | Sports and coach management |
| Auth | `/api/auth/*` | 2FA login, JWT, user profile |
| OCR | `/api/ocr/*` | Label analysis, batch verification |

### Python Service Endpoints (port 8001)

| Endpoint | Description |
|----------|-------------|
| `POST /api/ocr/analyze` | Image upload and supplement data extraction |
| `POST /api/vectorization/generate` | Single 384-dim vector generation |
| `POST /api/vectorization/generate-product-vectors` | Dual vector generation (per_serving + per_100g) |
| `POST /api/webscraper/scrape-full` | Scrape catalog URL to staging |

Full interactive API docs available at `http://localhost:8000/docs` (Swagger UI).

## Development

### Module Pattern

Each backend module follows MVC with:
- `routes.js` - Express routes + Swagger JSDoc annotations
- `controller.js` - Request validation (Zod) + business logic
- `services.js` - Database queries (parameterized SQL)
- `validation.js` - Zod schemas

### Key Patterns
- **Pagination**: Server-side, 10 items/page, 1-based
- **Search**: Multi-word AND matching across relevant fields
- **Bulk delete**: `DELETE` with `{ ids: [...] }` body
- **Dynamic PATCH**: Only provided fields are updated (field mapping pattern)
- **Transactions**: `pool.connect()` + `BEGIN/COMMIT/ROLLBACK` for multi-table creates

## Documentation

Detailed documentation lives in the `docs/` folder:
- **[PROJECT_ARCHITECTURE.md](docs/PROJECT_ARCHITECTURE.md)** - Full architecture, patterns, and design decisions
- **[DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)** - Complete database schema reference
- **[AMS_DATABASE_SCHEMA.md](docs/AMS_DATABASE_SCHEMA.md)** - AMS module schema
- **[PYTHON_SERVICES.md](docs/PYTHON_SERVICES.md)** - Python service architecture
- **[USE_CASES_IMPLEMENTATION.md](docs/USE_CASES_IMPLEMENTATION.md)** - Use case mapping
