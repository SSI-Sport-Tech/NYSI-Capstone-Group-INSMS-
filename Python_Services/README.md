# NYSI Python Services

FastAPI microservice providing OCR, vectorization, and web scraping capabilities for the NYSI supplement management system.

## Features

- **OCR Service**: Extract supplement data from label images
- **Vectorization Service**: Generate embeddings for similarity search
- **Web Scraper**: (Planned) Automated supplement data collection

## Setup

### Prerequisites
- Python 3.9+
- Virtual environment

### Installation

1. Create virtual environment:
\`\`\`bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
\`\`\`

2. Install dependencies:
\`\`\`bash
pip install -r requirements.txt
\`\`\`

3. Install Playwright browsers (required for batch verification):
\`\`\`bash
playwright install
\`\`\`
> **Note**: This downloads browser binaries (~500MB). For a smaller install, use `playwright install chromium` instead.

4. Configure environment:
\`\`\`bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
\`\`\`

## Running the Service

### Development
\`\`\`bash
uvicorn app.main:app --port 8001
\`\`\`

### Production
\`\`\`bash
python -m app.main
\`\`\`

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## Endpoints

### OCR
- `POST /api/ocr/analyze` - Full pipeline: image → OCR → structured data → vectors
- `POST /api/ocr/analyze-text` - Structure raw text (no image/OCR)
- `POST /api/ocr/identify` - Extract brand/name only (fast)
- `POST /api/ocr/ocr-only` - Extract raw text from image (no LLM)
- `GET /api/ocr/health` - OCR health check

### Vectorization
- `POST /api/vectorization/generate` - Generate single vector
- `POST /api/vectorization/batch-generate` - Generate multiple vectors
- `GET /api/vectorization/health` - Vectorization health check

### Batch Verification
- `POST /api/batch-verification/verify` - Verify by brand/product name
- `POST /api/batch-verification/verify-image` - Verify from product image
- `POST /api/batch-verification/verify-batch-id` - Verify by batch/lot number
- `POST /api/batch-verification/verify-combined` - Combined brand + batch ID verification
- `GET /api/batch-verification/databases` - List supported certification databases
- `GET /api/batch-verification/health` - Batch verification health check

> **Note**: Batch verification requires Playwright browsers to be installed (see Setup step 3).

### Web Scraper
- `POST /api/webscraper/*` - Web scraping endpoints

## Configuration

Environment variables in `.env`:
- `OPENAI_API_KEY` - OpenAI API key for LLM
- `SERVICE_PORT` - Port to run on (default: 8001)
- `BACKEND_URL` - Node.js backend URL for CORS
- `EMBEDDING_MODEL` - HuggingFace model name
- `VECTOR_DIMENSION` - Vector dimension (384 for bge-small)

## Architecture

\`\`\`
app/
├── main.py                    # FastAPI app entry point
├── config/
│   └── settings.py            # Configuration management
├── routers/
│   ├── ocr.py                 # OCR endpoints
│   ├── vectorization.py       # Vectorization endpoints
│   ├── batch_verification.py  # Batch testing verification
│   └── webscraper.py          # Web scraping endpoints
├── services/
│   ├── ocr_engine.py          # PaddleOCR wrapper (lazy-loaded)
│   ├── llm_structurer.py      # GPT-4o-mini text structuring
│   ├── vectorizer.py          # Embedding generation
│   ├── batch_id_extractor.py  # Batch ID extraction from text
│   ├── certification_searcher.py  # Search 6 certification databases
│   └── batch_tester.py        # Batch testing search with consensus
└── schemas/
    ├── supplement.py          # Supplement Pydantic models
    └── ocr_schemas.py         # OCR response schemas
\`\`\`

## Testing

\`\`\`bash
# Test OCR endpoint
curl -X POST "http://localhost:8001/api/ocr/analyze" \\
  -F "file=@test_image.jpg"

# Test vectorization endpoint
curl -X POST "http://localhost:8001/api/vectorization/generate" \\
  -H "Content-Type: application/json" \\
  -d '{
    "ingredients": ["Vitamin D3", "MCT Oil"],
    "nutritional_info": {
      "calories": 10,
      "nutrients": [{"name": "Vitamin D", "amount": "2000IU"}]
    },
    "basis": "per_100g"
  }'
\`\`\`