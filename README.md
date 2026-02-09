# NYSI Capstone - Integrated Nutrition Supplement Management System (INSMS)

A web application for managing and searching sports nutrition supplements with AI-powered OCR capabilities for supplement fact extraction.

## Tech Stack

- **Frontend:** Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Backend:** Node.js (Express) + Python (FastAPI for OCR)
- **Database:** PostgreSQL
- **OCR Engine:** PaddleOCR (PP-OCRv5)

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.12+
- PostgreSQL database

### 1. Setup OCR Service (Python/FastAPI)

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn python-multipart paddleocr paddlepaddle pg python-dotenv

# Run OCR service
cd OCR_service
uvicorn ocr_server:app --reload --port 8001
```

The OCR service will run on `http://localhost:8001`

### 2. Setup Backend (Express)

```bash
cd Backend
npm install

# Create .env file with database credentials
# PGHOST=<your-db-host>
# PGPORT=<your-db-port>
# PGDATABASE=<your-db-name>
# PGUSER=<your-db-user>
# PGPASSWORD=<your-db-password>
# PGSSLMODE=require
# PORT=8000
# FRONTEND_URL=http://localhost:3000

# Run backend server
npx nodemon server.js  # with auto-reload
# or
node server.js         # without auto-reload
```

The backend API will run on `http://localhost:8000`

### 3. Setup Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`

## Features

### Supplement Search System
- Search supplements by name or ingredients
- Advanced filtering and pagination
- Real-time search results

### OCR Processing
- Upload custom supplement label images
- Pre-loaded sample images for testing
- AI-powered text extraction using PaddleOCR
- Real-time image preview

## Project Structure

```
NYSI-Capstone-Group-INSMS/
├── frontend/           # Next.js frontend application
├── Backend/            # Express API server
├── OCR_service/        # FastAPI OCR service
├── venv/              # Python virtual environment
```

## Development

Three servers must be running simultaneously for full functionality:
1. Frontend (Next.js) - Port 3000
2. Backend (Express) - Port 8000
3. OCR Service (FastAPI) - Port 8001

## Environment Variables

Create a `.env` file in the `Backend/` directory with your PostgreSQL credentials and configuration.

