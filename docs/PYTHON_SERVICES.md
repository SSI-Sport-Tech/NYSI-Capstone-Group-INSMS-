# Python Services Documentation

## Overview

The NYSI Python Services is a FastAPI microservice that handles AI/ML operations for the supplement management system.

**Version:** 2.0
**Port:** 8001
**Last Updated:** January 31, 2026

---

## Table of Contents
1. [Setup & Installation](#setup--installation)
2. [Architecture](#architecture)
3. [API Endpoints](#api-endpoints)
4. [Configuration](#configuration)
5. [Development Guide](#development-guide)
6. [Troubleshooting](#troubleshooting)

---

## Setup & Installation

### Prerequisites
- Python 3.11 (3.10 also works, avoid 3.12)
- Virtual environment tool (venv)
- Visual C++ Redistributable (Windows)
- OpenAI API key

### Installation Steps

**1. Navigate to Python Services:**
```bash
cd Python_Services
```

**2. Create Virtual Environment:**
```bash
python -m venv venv
```

**3. Activate Virtual Environment:**
```bash
# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

**4. Install Dependencies:**
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**5. Configure Environment:**
```bash
# Create .env file
cp .env.example .env

# Edit .env with your API keys
OPENAI_API_KEY=sk-proj-your-key-here
```

**6. Start Server:**
```bash
uvicorn app.main:app --reload --port 8001
```

**7. Verify:**
- Server: http://localhost:8001
- Swagger Docs: http://localhost:8001/docs
- Health Check: http://localhost:8001/health

---

## Architecture

### Component Overview
```
Python_Services/
├── app/
│   ├── main.py              # FastAPI app + CORS
│   ├── config/
│   │   └── settings.py      # Environment config
│   ├── routers/
│   │   ├── ocr.py          # OCR endpoints
│   │   ├── vectorization.py # Embedding endpoints
│   │   └── scraper.py      # Web scraper (placeholder)
│   ├── services/
│   │   ├── nutrition_workflow.py  # OCR + LLM workflow
│   │   └── vectorizer.py          # Embedding generation
│   └── schemas/
│       └── supplement.py   # Pydantic models
├── .env                    # API keys (not in git)
├── requirements.txt        # Locked dependencies
└── venv/                   # Virtual environment
```

### Technology Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Framework** | FastAPI | 0.109.0 | REST API |
| **OCR** | PaddleOCR | 2.8.1 | Text extraction |
| **OCR Engine** | PaddlePaddle | 2.6.2 | Inference |
| **LLM** | OpenAI GPT-4o-mini | Latest | Data parsing |
| **Embeddings** | BAAI/bge-small-en-v1.5 | - | Vectorization |
| **ML Framework** | PyTorch | 2.0.1 (CPU) | Tensor operations |
| **Validation** | Pydantic | 2.10.0 | Data validation |

---

## API Endpoints

### Base URL
```
Development: http://localhost:8001
Production: TBD
```

### Swagger Documentation
```
http://localhost:8001/docs
```

### Endpoints

#### **1. Vectorization**

**Generate Single Vector:**
```http
POST /api/vectorization/generate
Content-Type: application/json

{
  "ingredients": ["Vitamin D3", "MCT Oil"],
  "nutritional_info": {
    "nutrients": [
      {"name": "Vitamin D", "amount": "2000IU", "daily_value": "500%"}
    ]
  },
  "basis": "per_100g"
}
```

**Response:**
```json
{
  "success": true,
  "vector": [0.012, -0.034, ...],
  "dimension": 384,
  "basis": "per_100g"
}
```

**Batch Generate:**
```http
POST /api/vectorization/batch-generate
Content-Type: application/json

{
  "supplements": [
    {
      "ingredients": ["Vitamin D3"],
      "nutritional_info": {...},
      "basis": "per_100g"
    },
    ...
  ]
}
```

---

#### **2. OCR**

**Analyze Supplement Label:**
```http
POST /api/ocr/analyze
Content-Type: multipart/form-data

file: <image file>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "supplement_name": "Omega-3 Fish Oil",
    "supplement_brand": "Nature Made",
    "supplement_ingredient": [...],
    "nutritional_info_per_serving": {...},
    "nutritional_info_per_100g": {...}
  },
  "vectors": {
    "vector_per_serving": [...],
    "vector_per_100g": [...]
  }
}
```

---

#### **3. Web Scraper**

**Scrape Full Catalog (Called by Node.js):**
```http
POST /api/webscraper/scrape-full
Content-Type: application/json

{
  "catalog_url": "https://iherb.com/vitamins",
  "push_to_staging": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Scraping completed",
  "products_scraped": 25,
  "products_pushed": 25
}
```

**Notes:**
- This is an async fire-and-forget operation from Node.js perspective
- Results are pushed directly to `SSS.Supplement_Staging` table
- Uses Playwright/Selenium for dynamic page scraping
- Includes rate limiting to avoid being blocked

---

#### **4. Health Checks**

**Global Health:**
```http
GET /health
```

**OCR Health:**
```http
GET /api/ocr/health
```

**Vectorization Health:**
```http
GET /api/vectorization/health
```

**Webscraper Health:**
```http
GET /api/webscraper/health
```

---

## Configuration

### Environment Variables (.env)
```env
# OpenAI API
OPENAI_API_KEY=sk-proj-xxxxx

# Service Configuration
SERVICE_PORT=8001
SERVICE_HOST=0.0.0.0
BACKEND_URL=http://localhost:8000

# ML Configuration
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
VECTOR_DIMENSION=384
```

### Settings (app/config/settings.py)
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: str
    service_port: int = 8001
    service_host: str = "0.0.0.0"
    backend_url: str = "http://localhost:8000"
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    vector_dimension: int = 384
    
    class Config:
        env_file = ".env"
```

---

## Development Guide

### Adding New Endpoints

**1. Create Router (app/routers/new_feature.py):**
```python
from fastapi import APIRouter
router = APIRouter()

@router.post("/endpoint")
async def new_endpoint():
    return {"status": "ok"}
```

**2. Register in main.py:**
```python
from app.routers import new_feature

app.include_router(
    new_feature.router, 
    prefix="/api/new-feature",
    tags=["New Feature"]
)
```

### Testing

**Manual Testing:**
```bash
# Start server
uvicorn app.main:app --reload --port 8001

# Open Swagger UI
http://localhost:8001/docs

# Test endpoints interactively
```

**CLI Testing:**
```bash
# Health check
curl http://localhost:8001/health

# Vectorization
curl -X POST http://localhost:8001/api/vectorization/generate \
  -H "Content-Type: application/json" \
  -d '{"ingredients": ["Vitamin D3"], "nutritional_info": {...}, "basis": "per_100g"}'
```

---

## Troubleshooting

### Common Issues

**1. PyTorch DLL Error (Windows):**
```
OSError: Error loading "torch\lib\shm.dll"
```
**Solution:** Install Visual C++ Redistributable
```
https://aka.ms/vs/17/release/vc_redist.x64.exe
```

**2. Import Errors:**
```
ModuleNotFoundError: No module named 'app'
```
**Solution:** Run from Python_Services/ directory
```bash
cd Python_Services
uvicorn app.main:app --reload --port 8001
```

**3. Port Already in Use:**
```
Error: [Errno 48] Address already in use
```
**Solution:** Kill process on port 8001
```bash
# Windows
netstat -ano | findstr :8001
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:8001 | xargs kill -9
```

**4. Model Download Slow:**
First run downloads embedding model (~150MB)
**Solution:** Wait patiently, subsequent starts are fast

---

## Performance Notes

**First Startup:** ~30 seconds (loads models)  
**Subsequent Startups:** ~5 seconds  
**Vectorization:** ~1-2 seconds per request  
**OCR:** ~10-25 seconds per image  
**Memory Usage:** ~2-3 GB (models in memory)

---

## Next Steps

**Phase 3 (Completed):**
- [x] Integrate with Node.js backend (vectorization on create/update)
- [x] Web scraper integration with staging workflow
- [ ] Add authentication
- [ ] Implement caching
- [ ] Add monitoring

**Phase 4:**
- [ ] GPU support
- [ ] Batch processing queue
- [ ] Model versioning
- [ ] Performance optimization
- [ ] Scheduled scraping jobs

---

**Document Version:** 2.0
**Last Updated:** January 31, 2026
**Changes:** Added webscraper endpoints documentation, updated integration status
**Maintained By:** Development Team