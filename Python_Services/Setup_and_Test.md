# 🚀 NYSI Python Services - Setup & Testing Guide

This guide covers how to set up and test the **OCR Vectorization** and **Batch Verification** services.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Environment Setup](#environment-setup)
4. [Running the Server](#running-the-server)
5. [Testing OCR Vectorization](#testing-ocr-vectorization)
6. [Testing Batch Verification](#testing-batch-verification)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

- **Python 3.10+** installed
- **Git** installed
- **OpenAI API Key** (required for LLM features)
- **PostgreSQL** (optional, for database features)

---

## 📦 Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/Mike-Umali/NYSI-Capstone-Group-INSMS-.git
cd NYSI-Capstone-Group-INSMS-
git checkout feature/vectorization-service
cd Python_Services
```

### Step 2: Create Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### Step 3: Install Dependencies

```bash
# Upgrade pip
pip install --upgrade pip

# Install all requirements
pip install -r requirements.txt
```

### Step 4: Install Playwright Browsers

**This is REQUIRED for web scraping in Batch Verification:**

```bash
playwright install
```

This downloads Chromium, Firefox, and WebKit browsers (~500MB).

---

## ⚙️ Environment Setup

### Step 1: Create `.env` File

Create a `.env` file in the `Python_Services` folder:

```bash
touch .env
```

### Step 2: Add Environment Variables

Edit `.env` with your credentials:

```env
# Required - OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here

# Service Configuration
SERVICE_PORT=8001
SERVICE_HOST=0.0.0.0
BACKEND_URL=http://localhost:8000

# Embedding Model Configuration
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
VECTOR_DIMENSION=384

# Database Configuration (optional)
PGHOST=localhost
PGPORT=5432
PGDATABASE=nysi_db
PGUSER=your_db_user
PGPASSWORD=your_db_password
PGSSLMODE=prefer
```

---

## 🚀 Running the Server

### Start the FastAPI Server

```bash
# Make sure venv is activated
source venv/bin/activate

# Run with auto-reload (development)
uvicorn app.main:app --port 8001 --reload

# Or run without reload (production)
uvicorn app.main:app --port 8001 --host 0.0.0.0
```

### Verify Server is Running

Open your browser and go to:
- **Swagger Docs:** http://localhost:8001/docs
- **Health Check:** http://localhost:8001/health
- **Root:** http://localhost:8001/

You should see:
```json
{
  "service": "NYSI Python Services",
  "status": "running",
  "version": "1.1.0",
  "services": [
    "OCR - /api/ocr/*",
    "Vectorization - /api/vectorization/*",
    "Web Scraper - /api/webscraper/*",
    "Batch Verification - /api/batch-verification/*"
  ]
}
```

---

## 🔬 Testing OCR Vectorization

The OCR Vectorization service extracts text from supplement images and creates vector embeddings.

### Test via Swagger UI

1. Go to http://localhost:8001/docs
2. Find the **OCR** section
3. Click on `POST /api/ocr/extract`
4. Click "Try it out"
5. Upload a supplement image
6. Click "Execute"

### Test via cURL

```bash
# Extract text from an image
curl -X POST "http://localhost:8001/api/ocr/extract" \
  -F "file=@/path/to/supplement_image.jpg"
```

### Test via Python

```python
import requests

url = "http://localhost:8001/api/ocr/extract"
files = {"file": open("supplement_image.jpg", "rb")}

response = requests.post(url, files=files)
print(response.json())
```

### Expected Response

```json
{
  "success": true,
  "extracted_text": "OPTIMUM NUTRITION\nGOLD STANDARD\nWHEY\n24G PROTEIN\nVANILLA ICE CREAM",
  "confidence": 0.95,
  "processing_time_ms": 1250
}
```

---

## ✅ Testing Batch Verification

The Batch Verification service checks if a supplement is batch-tested/certified by searching 6 certification databases:

- **Informed Sport** (sport.wetestyoutrust.com)
- **Informed Choice** (choice.wetestyoutrust.com)
- **HASTA** (hasta.org.au)
- **NSF Sport** (nsfsport.com)
- **Cologne List** (koelnerliste.com)
- **BSCG** (bscg.org)

### Method 1: Verify via Image Upload

Upload an image of a supplement and the system will:
1. Extract the brand/product name using OCR
2. Search all 6 certification databases
3. Return batch testing status with proof URLs

#### Test via Swagger UI

1. Go to http://localhost:8001/docs
2. Find **Batch Verification** section
3. Click on `POST /api/batch-verification/verify-image`
4. Click "Try it out"
5. Upload a supplement image (JPG, PNG, or WEBP)
6. Click "Execute"

#### Test via cURL

```bash
curl -X POST "http://localhost:8001/api/batch-verification/verify-image" \
  -F "file=@/path/to/supplement_image.jpg"
```

#### Test via Python

```python
import requests

url = "http://localhost:8001/api/batch-verification/verify-image"
files = {"file": open("gold_standard_whey.jpg", "rb")}

response = requests.post(url, files=files)
result = response.json()

print(f"Brand: {result['data']['supplement_brand']}")
print(f"Product: {result['data']['supplement_name']}")
print(f"Batch Tested: {result['data']['is_batch_tested']}")

if result['data']['primary_certification']:
    print(f"Certified by: {result['data']['primary_certification']['organisation']}")
    print(f"Proof URL: {result['data']['primary_certification']['product_url']}")
```

### Method 2: Verify via Text Input

If you already know the brand and product name:

#### Test via Swagger UI

1. Go to http://localhost:8001/docs
2. Find **Batch Verification** section
3. Click on `POST /api/batch-verification/verify`
4. Click "Try it out"
5. Enter:
   - `supplement_name`: "Gold Standard Whey"
   - `supplement_brand`: "Optimum Nutrition"
6. Click "Execute"

#### Test via cURL

```bash
curl -X POST "http://localhost:8001/api/batch-verification/verify" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "supplement_name=Gold Standard Whey&supplement_brand=Optimum Nutrition"
```

#### Test via Python

```python
import requests

url = "http://localhost:8001/api/batch-verification/verify"
data = {
    "supplement_name": "Joint Gel",
    "supplement_brand": "fourfive"
}

response = requests.post(url, data=data)
print(response.json())
```

### Expected Response

```json
{
  "success": true,
  "supplement_name": "Gold Standard Whey",
  "supplement_brand": "Optimum Nutrition",
  "variant": "Vanilla Ice Cream",
  "is_batch_tested": true,
  "certifications": [
    {
      "organisation": "Informed Sport",
      "found": true,
      "batch_tested": true,
      "product_url": "https://sport.wetestyoutrust.com/supplement/optimum-nutrition-gold-standard-whey",
      "confidence": "high",
      "matched_product_name": "Optimum Nutrition Gold Standard 100% Whey"
    },
    {
      "organisation": "Informed Choice",
      "found": false,
      "batch_tested": false
    },
    {
      "organisation": "HASTA",
      "found": false,
      "batch_tested": false
    },
    {
      "organisation": "NSF Sport",
      "found": true,
      "batch_tested": true,
      "product_url": "https://www.nsfsport.com/certified-products/optimum-nutrition-whey",
      "confidence": "medium"
    },
    {
      "organisation": "Cologne List",
      "found": false,
      "batch_tested": false
    },
    {
      "organisation": "BSCG",
      "found": false,
      "batch_tested": false
    }
  ],
  "primary_certification": {
    "organisation": "Informed Sport",
    "found": true,
    "batch_tested": true,
    "product_url": "https://sport.wetestyoutrust.com/supplement/optimum-nutrition-gold-standard-whey",
    "confidence": "high"
  },
  "search_terms_used": [
    "Optimum Nutrition",
    "Optimum Nutrition whey",
    "Optimum Nutrition Gold Standard Whey"
  ]
}
```

### Test Health Check

```bash
curl http://localhost:8001/api/batch-verification/health
```

Response:
```json
{
  "status": "healthy",
  "service": "Batch Verification",
  "certification_databases": [
    "Informed Sport",
    "Informed Choice",
    "HASTA",
    "NSF Sport",
    "Cologne List",
    "BSCG"
  ],
  "ocr_model": "PaddleOCR PP-OCRv4",
  "llm": f"ollama/{os.environ.get('OLLAMA_MODEL', 'qwen3:8b')}"
}
```

---

## 📚 API Endpoints Reference

### OCR Service

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ocr/extract` | POST | Extract text from image |
| `/api/ocr/health` | GET | OCR service health check |

### Vectorization Service

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/vectorization/embed` | POST | Generate embeddings for text |
| `/api/vectorization/health` | GET | Vectorization service health check |

### Web Scraper Service

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webscraper/scrape` | POST | Scrape webpage data |
| `/api/webscraper/health` | GET | Web scraper health check |

### Batch Verification Service

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/batch-verification/verify-image` | POST | Upload image → OCR → Search certifications |
| `/api/batch-verification/verify` | POST | Search certifications by brand/product name |
| `/api/batch-verification/health` | GET | Batch verification health check |

---

## 🔧 Troubleshooting

### Issue: `playwright install` fails

```bash
# Try with sudo
sudo playwright install

# Or install just Chromium
playwright install chromium
```

### Issue: `asyncio.run() cannot be called from a running event loop`

This is fixed in the latest code using `ThreadPoolExecutor`. Make sure you have the latest `batch_verification_workflow.py`.

### Issue: `ModuleNotFoundError: No module named 'paddleocr'`

```bash
pip install paddlepaddle paddleocr
```

### Issue: OpenAI API Key error

Make sure your `.env` file has:
```env
OPENAI_API_KEY=sk-your-actual-key-here
```

### Issue: Scraper returns no results

1. Check if Playwright browsers are installed: `playwright install`
2. Check your internet connection
3. Some websites may block scraping - the system will retry with different search terms

### Issue: Slow startup (loading HuggingFace models)

This is normal on first run. The embedding model (`BAAI/bge-small-en-v1.5`) needs to be downloaded (~130MB). Subsequent starts will be faster.

### Issue: Port 8001 already in use

```bash
# Find process using port 8001
lsof -i :8001

# Kill the process
kill -9 <PID>

# Or use a different port
uvicorn app.main:app --port 8002 --reload
```

---

## 🧪 Quick Test Script

Create a file called `test_services.py`:

```python
import requests
import json

BASE_URL = "http://localhost:8001"

def test_health():
    """Test all health endpoints"""
    endpoints = [
        "/health",
        "/api/ocr/health",
        "/api/batch-verification/health"
    ]
    
    print("🔍 Testing Health Endpoints...")
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}")
            status = "✅" if response.status_code == 200 else "❌"
            print(f"  {status} {endpoint}: {response.status_code}")
        except Exception as e:
            print(f"  ❌ {endpoint}: {str(e)}")

def test_batch_verification():
    """Test batch verification with text input"""
    print("\n🔍 Testing Batch Verification...")
    
    url = f"{BASE_URL}/api/batch-verification/verify"
    data = {
        "supplement_name": "Gold Standard Whey",
        "supplement_brand": "Optimum Nutrition"
    }
    
    try:
        response = requests.post(url, data=data, timeout=120)
        result = response.json()
        
        if result.get("is_batch_tested"):
            print("  ✅ Product IS batch tested!")
            if result.get("primary_certification"):
                print(f"     Certified by: {result['primary_certification']['organisation']}")
                print(f"     URL: {result['primary_certification'].get('product_url', 'N/A')}")
        else:
            print("  ⚠️ Product NOT found in certification databases")
            
    except Exception as e:
        print(f"  ❌ Error: {str(e)}")

if __name__ == "__main__":
    print("=" * 60)
    print("NYSI Python Services - Test Script")
    print("=" * 60)
    
    test_health()
    test_batch_verification()
    
    print("\n" + "=" * 60)
    print("Tests complete!")
    print("=" * 60)
```

Run with:
```bash
python test_services.py
```

---

## 📞 Support

If you encounter any issues:
1. Check the server logs for error messages
2. Ensure all environment variables are set correctly
3. Verify Playwright browsers are installed
4. Check your OpenAI API key is valid and has credits

---

*Last updated: 2026-02-02*