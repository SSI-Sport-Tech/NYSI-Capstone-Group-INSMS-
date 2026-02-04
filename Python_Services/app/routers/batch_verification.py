"""
NYSI Python Services - FastAPI Application
OCR, Vectorization, Web Scraping, and Batch Verification services
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import ocr, vectorization, webscraper, batch_verification
from app.config.settings import settings
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="NYSI Python Services",
    description="OCR, Vectorization, Web Scraping, and Batch Verification services for supplement management",
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.backend_url, 
        "http://localhost:8000",
        "http://localhost:3000"  # Optional: if you have a frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
# Note: webscraper.router already has prefix="/api/webscraper" defined
app.include_router(ocr.router, prefix="/api/ocr", tags=["OCR"])
app.include_router(vectorization.router, prefix="/api/vectorization", tags=["Vectorization"])
app.include_router(webscraper.router)  # No prefix (router has its own)
app.include_router(batch_verification.router, prefix="/api/batch-verification", tags=["Batch Verification"])

@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "NYSI Python Services",
        "status": "running",
        "version": "1.1.0",
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "health": "/health"
        },
        "services": [
            "OCR - /api/ocr/*",
            "Vectorization - /api/vectorization/*",
            "Web Scraper - /api/webscraper/*",
            "Batch Verification - /api/batch-verification/*"
        ]
    }

@app.get("/health")
async def health_check():
    """Global health check endpoint."""
    return {
        "status": "healthy",
        "services": {
            "ocr": "available",
            "vectorization": "available",
            "scraper": "available",
            "batch_verification": "available"
        },
        "config": {
            "embedding_model": settings.embedding_model,
            "vector_dimension": settings.vector_dimension,
            "service_port": settings.service_port
        }
    }

# Startup event (optional but useful)
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 NYSI Python Services starting...")
    logger.info(f"📊 Embedding Model: {settings.embedding_model}")
    logger.info(f"🔢 Vector Dimension: {settings.vector_dimension}")
    logger.info(f"🌐 Service running on port: {settings.service_port}")
    logger.info("✅ Batch Verification service enabled")

# Shutdown event (optional)
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("👋 NYSI Python Services shutting down...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.service_host,
        port=settings.service_port,
        reload=True
    )