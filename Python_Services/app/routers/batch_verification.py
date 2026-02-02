"""
Batch Verification API Router.

Provides endpoints for verifying supplement batch testing status
via OCR image upload or direct name/brand input.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import tempfile
import shutil
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/verify-image")
async def verify_from_image(file: UploadFile = File(...)):
    """
    Upload a supplement image and verify batch testing status.
    
    **Workflow:**
    1. OCR extracts supplement name/brand from image
    2. Searches certification databases (HASTA, Informed Sport, etc.)
    3. Returns batch testing status with proof URLs
    
    **Accepted formats:** JPG, PNG, WEBP
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="File must be an image (jpg, png, webp)"
        )
    
    # Create temporary file
    tmp_dir = Path(tempfile.mkdtemp())
    img_path = tmp_dir / file.filename
    
    try:
        # Save uploaded file
        with open(img_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        logger.info(f"Processing image for batch verification: {file.filename}")
        
        # Import workflow here to avoid circular imports
        from app.services.batch_verification_workflow import BatchVerificationWorkflow
        
        workflow = BatchVerificationWorkflow(timeout=180, verbose=True)
        
        # Run workflow
        result = await workflow.run(image_path=str(img_path))
        
        # Check for errors
        if isinstance(result, dict) and "error" in result:
            raise HTTPException(
                status_code=422,
                detail=f"Processing failed: {result['error']}"
            )
        
        return {
            "success": True,
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing {file.filename}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal error: {str(e)}"
        )
    finally:
        # Cleanup temp files
        try:
            shutil.rmtree(tmp_dir)
        except Exception as e:
            logger.warning(f"Failed to cleanup temp dir: {e}")


@router.post("/verify")
async def verify_from_text(supplement_name: str, supplement_brand: str):
    """
    Verify batch testing status from supplement name/brand (no image).
    
    **Searches:**
    - Informed Sport
    - Informed Choice
    - HASTA
    - NSF Sport
    - Cologne List
    - BSCG
    """
    try:
        logger.info(f"Verifying batch testing: {supplement_brand} {supplement_name}")
        
        # Import here to avoid circular imports
        from app.services.batch_verification_workflow import verify_supplement_batch_testing
        
        result = await verify_supplement_batch_testing(
            supplement_name=supplement_name,
            supplement_brand=supplement_brand
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Verification failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Verification failed: {str(e)}"
        )


@router.get("/health")
async def batch_verification_health():
    """Health check for batch verification service."""
    return {
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
        "llm": "gpt-4o-mini"
    }