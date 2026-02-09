# NYSI Capstone - Integrated Nutrition Supplement Management System (INSMS)

A three-tier web application for managing sports nutrition supplements, athlete profiles, and inventory tracking - with AI-powered OCR, web scraping, and semantic search capabilities.

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
           '-> Playwright/Selenium (scraping)
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
- Sport lookup for dropdowns

### OCR Services
- Supplement label image upload and text extraction
- AI-powered structured data parsing

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+ (recommended: 3.10)
- PostgreSQL 14+ with pgvector extension

### 1. Backend (Express)

```bash
cd Backend
npm install

# Create .env file (see Environment Variables below)

npx nodemon server.js   # dev with auto-reload
# or
node server.js           # production
```

Runs on `http://localhost:8000` | Swagger docs at `http://localhost:8000/docs`

### 2. Python Services (FastAPI)

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

### 3. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:3000`

## Environment Variables

### Backend/.env

```env
PGHOST=<your-db-host>
PGPORT=<your-db-port>
PGDATABASE=<your-db-name>
PGUSER=<your-db-user>
PGPASSWORD=<your-db-password>
PGSSLMODE=require
PORT=8000
FRONTEND_URL=http://localhost:3000
PYTHON_SERVICE_URL=http://localhost:8001
```

### Python_Services/.env

```env
OPENAI_API_KEY=sk-proj-xxxxx
SERVICE_PORT=8001
SERVICE_HOST=0.0.0.0
BACKEND_URL=http://localhost:8000
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
VECTOR_DIMENSION=384
SCRAPER_HEADLESS=true
```

## Project Structure

```
NYSI-Capstone-Group-INSMS/
├── frontend/                     # Next.js 15 frontend
│   └── app/                      # App Router pages
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
│   │   │   └── athlete/          # Athlete CRUD, registry, medical, lookups
│   │   └── OCR/                  # OCR Services
│   └── server.js                 # Express entry point
│
├── Python_Services/              # FastAPI microservice
│   ├── app/
│   │   ├── main.py               # FastAPI entry point
│   │   ├── routers/              # ocr, vectorization, webscraper
│   │   └── services/             # vectorizer, OCR workflow
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
