from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import tempfile
import shutil
import logging
from app.services.nutrition_workflow import NutritionWorkflow

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize workflow once (reuse for performance)
workflow = NutritionWorkflow(timeout=200, verbose=False)

@router.post("/analyze")
async def analyze_supplement_label(file: UploadFile = File(...)):
    """
    Upload a supplement label image and extract structured data + vectors.
    
    **Use Case:** OCR-based supplement identification (UC-SSS-006)
    
    **Returns:**
    - Structured supplement data (Ryan's webscraper format)
    - Vector embeddings (vector_perserving_ingredient + vector_100g_ingredient)
    """
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400, 
            detail="File must be an image (jpg, png, etc.)"
        )
    
    # Create temporary file
    tmp_dir = Path(tempfile.mkdtemp())
    img_path = tmp_dir / file.filename
    
    try:
        # Save uploaded file
        with open(img_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        logger.info(f"Processing image: {file.filename}")
        
        # Run the full workflow
        result = await workflow.run(image_path=str(img_path))
        
        # Check for errors
        if "error" in result:
            raise HTTPException(
                status_code=422,
                detail=f"OCR processing failed: {result['error']}"
            )
        
        # Return Ryan's format directly
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


@router.get("/health")
async def ocr_health_check():
    """Check if OCR service is healthy"""
    return {
        "status": "healthy",
        "model": "PaddleOCR PP-OCRv4",
        "llm": "gpt-4o-mini"
    }