from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import ocr, vectorization, scraper
from app.config.settings import settings
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="HPSI Python Services",
    description="OCR, Vectorization, and Web Scraping services for supplement management",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS for Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.backend_url, "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ocr.router, prefix="/api/ocr", tags=["OCR"])
app.include_router(vectorization.router, prefix="/api/vectorization", tags=["Vectorization"])
app.include_router(scraper.router, prefix="/api/scraper", tags=["Web Scraper"])

@app.get("/")
async def root():
    return {
        "service": "NYSI Python Services",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Global health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "ocr": "available",
            "vectorization": "available",
            "scraper": "planned"
        },
        "config": {
            "embedding_model": settings.embedding_model,
            "vector_dimension": settings.vector_dimension
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.service_host,
        port=settings.service_port,
        reload=True
    )