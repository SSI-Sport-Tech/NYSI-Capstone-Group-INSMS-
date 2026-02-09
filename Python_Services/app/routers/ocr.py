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
    - Structured supplement data
    - Vector embeddings (per_serving + per_100g)
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
        
        # Return structured result
        return {
            "success": True,
            "data": {
                "supplement_name": result.get('supplement_name'),
                "supplement_brand": result.get('supplement_brand'),
                "supplement_ingredient": result.get('supplement_ingredient'),
                "serving_size_text": result.get('serving_size_text'),
                "serving_size_grams": result.get('serving_size_grams'),
                "nutritional_info_per_serving": result.get('nutritional_info_per_serving'),
                "nutritional_info_per_100g": result.get('nutritional_info_per_100g'),
                "per_100g_calculated": result.get('per_100g_calculated', False)
            },
            "vectors": {
                "vector_per_serving": result.get('vector_per_serving'),
                "vector_per_100g": result.get('vector_per_100g')
            }
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