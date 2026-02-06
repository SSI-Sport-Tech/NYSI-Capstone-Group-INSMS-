"""
Batch Verification API Router.
Endpoints for verifying supplement batch testing status.
Supports both image upload (OCR) and direct text/string input.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import tempfile
import shutil
import logging

from app.schemas.batch_verification_schemas import (
    BatchVerificationRequest,
    BatchVerificationResponse,
    OCRBatchVerificationResponse,
    CertificationResult,
    SupplementIdentification
)
from app.services import ocr_engine, llm_structurer, certification_searcher

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/verify-image", response_model=OCRBatchVerificationResponse)
async def verify_from_image(file: UploadFile = File(...)):
    """
    Upload supplement image → OCR → Search certification databases.
    
    **Use Case:** User takes photo of supplement label
    
    **Process:**
    1. OCR: Extract text from image (PaddleOCR)
    2. Identify: Extract brand/name/variant (GPT-4o-mini)
    3. Search: Query 6 certification databases concurrently
    
    **Returns:**
    - Extracted supplement info (name, brand, variant)
    - Batch testing verification results from 6 databases
    - Primary certification (highest confidence match)
    """
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    tmp_dir = Path(tempfile.mkdtemp())
    img_path = tmp_dir / file.filename
    
    try:
        # Save uploaded file
        with open(img_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        logger.info(f"🔍 Batch verification from image: {file.filename}")
        
        # Step 1: OCR - extract raw text (lazy-loaded)
        try:
            raw_text = ocr_engine.extract_text(str(img_path))
        except ValueError as e:
            raise HTTPException(status_code=422, detail=f"OCR failed: {str(e)}")
        
        # Step 2: LLM - identify supplement (lazy-loaded)
        identification = llm_structurer.identify_supplement(raw_text)
        
        brand = identification.get("supplement_brand", "Unknown")
        name = identification.get("supplement_name", "Unknown")
        variant = identification.get("variant")
        
        logger.info(f"📦 Identified: {brand} - {name}")
        
        # Step 3: Search certifications (concurrent)
        results = await certification_searcher.search_all_certifications(
            brand=brand,
            product_name=name,
            variant=variant
        )
        
        # Determine overall status
        is_batch_tested = any(r.get("found") and r.get("batch_tested") for r in results)
        primary = certification_searcher.pick_primary_certification(results)
        
        logger.info(f"✅ Batch tested: {is_batch_tested}")
        
        return OCRBatchVerificationResponse(
            success=True,
            ocr_extracted=SupplementIdentification(
                supplement_name=name,
                supplement_brand=brand,
                variant=variant
            ),
            verification=BatchVerificationResponse(
                success=True,
                supplement_name=name,
                supplement_brand=brand,
                variant=variant,
                is_batch_tested=is_batch_tested,
                certifications=[CertificationResult(**r) for r in results if not r.get("error")],
                primary_certification=CertificationResult(**primary) if primary else None,
                errors=[r.get("error") for r in results if r.get("error")]
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        try:
            shutil.rmtree(tmp_dir)
        except Exception:
            pass


@router.post("/verify", response_model=BatchVerificationResponse)
async def verify_from_text(request: BatchVerificationRequest):
    """
    Verify batch testing from supplement name/brand strings (NO OCR needed).
    
    **Use Case:** 
    - User manually enters supplement info
    - User edits OCR results before verification
    - Batch processing of known supplements
    
    **Input:**
    - supplement_name: "Gold Standard Whey"
    - supplement_brand: "Optimum Nutrition"
    
    **Returns:**
    - Batch testing verification results from 6 databases
    - Primary certification (highest confidence match)
    """
    
    logger.info(f"🔍 Batch verification from text: {request.supplement_brand} - {request.supplement_name}")
    
    try:
        # Search certifications directly (no OCR needed)
        results = await certification_searcher.search_all_certifications(
            brand=request.supplement_brand,
            product_name=request.supplement_name
        )
        
        is_batch_tested = any(r.get("found") and r.get("batch_tested") for r in results)
        primary = certification_searcher.pick_primary_certification(results)
        
        logger.info(f"✅ Batch tested: {is_batch_tested}")
        
        return BatchVerificationResponse(
            success=True,
            supplement_name=request.supplement_name,
            supplement_brand=request.supplement_brand,
            variant=None,
            is_batch_tested=is_batch_tested,
            certifications=[CertificationResult(**r) for r in results if not r.get("error")],
            primary_certification=CertificationResult(**primary) if primary else None,
            errors=[r.get("error") for r in results if r.get("error")]
        )
        
    except Exception as e:
        logger.error(f"Verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/databases")
async def list_certification_databases():
    """
    List all supported certification databases.
    
    **Returns:**
    - List of database names and descriptions
    """
    return {
        "databases": [
            {
                "name": name,
                "description": config.get("description", ""),
                "url": config.get("search_url", "")
            }
            for name, config in certification_searcher.CERTIFICATION_DATABASES.items()
        ]
    }


@router.get("/health")
async def batch_verification_health():
    """
    Health check for batch verification service.
    
    **Returns:**
    - Service status
    - List of supported databases
    - Lazy loading status
    """
    return {
        "status": "healthy",
        "databases": certification_searcher.get_database_list(),
        "database_count": len(certification_searcher.CERTIFICATION_DATABASES),
        "lazy_loading": {
            "ocr_loaded": ocr_engine.is_loaded(),
            "llm_loaded": llm_structurer.is_loaded()
        },
        "endpoints": [
            "POST /verify-image - Image → OCR → Certification search",
            "POST /verify - Text → Certification search (no OCR)",
            "GET /databases - List supported certification databases"
        ]
    }