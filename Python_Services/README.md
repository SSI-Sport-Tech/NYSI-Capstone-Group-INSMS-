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

3. Configure environment:
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
- `POST /api/ocr/analyze` - Analyze supplement label image
- `GET /api/ocr/health` - OCR health check

### Vectorization
- `POST /api/vectorization/generate` - Generate single vector
- `POST /api/vectorization/batch-generate` - Generate multiple vectors
- `GET /api/vectorization/health` - Vectorization health check

### Web Scraper (Placeholder)
- `POST /api/scraper/scrape` - Scrape supplement page
- `GET /api/scraper/health` - Scraper status

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
├── main.py              # FastAPI app entry point
├── config/
│   └── settings.py      # Configuration management
├── routers/
│   ├── ocr.py          # OCR endpoints
│   ├── vectorization.py # Vectorization endpoints
│   └── scraper.py      # Scraper endpoints
├── services/
│   ├── nutrition_workflow.py  # OCR workflow
│   └── vectorizer.py   # Vector generation
└── schemas/
    └── supplement.py   # Pydantic models
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