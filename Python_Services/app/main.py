"""
NYSI Python Services - FastAPI Application
OCR, Vectorization, Web Scraping, and Batch Verification services

Version: 1.2.0
- Modular services with lazy loading
- OCR now supports a 2-stage editable flow (OCR-only -> analyze text)
- Batch verification endpoints
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging

from app.routers import ocr, vectorization, webscraper, batch_verification
from app.config.settings import settings
from app.scheduler import start_scheduler, stop_scheduler


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan: runs on startup and shutdown ────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 NYSI Python Services starting...")
    logger.info(f"📊 Embedding Model: {settings.embedding_model}")
    logger.info(f"🔢 Vector Dimension: {settings.vector_dimension}")
    logger.info(f"🌐 Service running on port: {settings.service_port}")
    logger.info("✅ Modular services with lazy loading enabled")
    logger.info("✅ OCR supports 2-stage editable flow: /api/ocr/ocr-only -> /api/ocr/analyze-text")
    logger.info("✅ Batch Verification service enabled")

    start_scheduler()

    async def _prewarm():
        loop = asyncio.get_event_loop()
        try:
            logger.info("🔥 Pre-warming OCR engine (background)...")
            from app.services.ocr_engine import get_ocr_instance
            await loop.run_in_executor(None, get_ocr_instance)
            logger.info("✅ OCR engine pre-warmed and ready")
        except Exception as e:
            logger.warning(f"⚠️ OCR pre-warm failed: {e}")
        try:
            logger.info("🔥 Pre-warming embedding model (background)...")
            from app.services.vectorizer import _get_embed_model
            await loop.run_in_executor(None, _get_embed_model)
            logger.info("✅ Embedding model pre-warmed and ready")
        except Exception as e:
            logger.warning(f"⚠️ Embedding model pre-warm failed: {e}")

    asyncio.create_task(_prewarm())

    yield  # App runs here

    # Shutdown
    logger.info("👋 NYSI Python Services shutting down...")
    stop_scheduler()


# ── App init (single instance, with lifespan) ─────────────────────────────────
app = FastAPI(
    title="NYSI Python Services",
    description="OCR, Vectorization, Web Scraping, and Batch Verification services for supplement management",
    version="1.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ── CORS middleware ───────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.backend_url,
        "http://localhost:8000",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(ocr.router, prefix="/api/ocr", tags=["OCR"])
app.include_router(vectorization.router, prefix="/api/vectorization", tags=["Vectorization"])
app.include_router(webscraper.router)  # Webscraper router has its own prefix internally
app.include_router(batch_verification.router, prefix="/api/batch-verification", tags=["Batch Verification"])


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "NYSI Python Services",
        "status": "running",
        "version": app.version,
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "health": "/health",
        },
        "services": [
            "OCR - /api/ocr/* (includes editable OCR flow)",
            "Vectorization - /api/vectorization/*",
            "Web Scraper - /api/webscraper/*",
            "Batch Verification - /api/batch-verification/*",
        ],
    }


@app.get("/health")
async def health_check():
    """Global health check endpoint."""
    from app.services import ocr_engine, llm_structurer

    return {
        "status": "healthy",
        "services": {
            "ocr": "available",
            "vectorization": "available",
            "scraper": "available",
            "batch_verification": "available",
        },
        "config": {
            "embedding_model": settings.embedding_model,
            "vector_dimension": settings.vector_dimension,
            "service_port": settings.service_port,
        },
        "lazy_loading": {
            "ocr_engine_loaded": ocr_engine.is_loaded(),
            "llm_loaded": llm_structurer.is_loaded(),
            "description": "Components load on first use to save memory",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.service_host,
        port=settings.service_port,
        reload=True,
    )