"""
OCR API Router.
Provides endpoints for extracting nutrition data from supplement label images.
Supports both image upload AND raw text input for modularity.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from pathlib import Path
from typing import Optional
import tempfile
import shutil
import json
import re
import logging

# Import modular services (lazy-loaded)
from app.services import ocr_engine, llm_structurer
from app.services.vectorizer import SupplementVectorizer

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class AnalyzeTextRequest(BaseModel):
    """Request schema for text-based analysis (no image)."""
    raw_text: str = Field(
        ...,
        description="Raw text containing nutrition label information",
        min_length=10
    )
    generate_vectors: bool = Field(
        default=True,
        description="Whether to generate embedding vectors"
    )


class IdentifySupplementRequest(BaseModel):
    """Request schema for supplement identification."""
    raw_text: str = Field(
        ...,
        description="Raw text from supplement label",
        min_length=5
    )


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/analyze")
async def analyze_supplement_label(file: UploadFile = File(...)):
    """
    Upload a supplement label image and extract structured data + vectors.
    
    **Use Case:** OCR-based supplement identification (UC-SSS-006)
    
    **Process:**
    1. OCR: Extract text from image (PaddleOCR - lazy loaded)
    2. Structure: Parse text into structured format (GPT-4o-mini)
    3. Vectorize: Generate embeddings (BAAI/bge-small-en-v1.5)
    
    **Returns:**
    - Structured supplement data (name, brand, ingredients, nutrition)
    - Vector embeddings (per_serving + per_100g)
    - Raw OCR text (for debugging/editing)
    """
    
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="File must be an image (jpg, png, etc.)"
        )
    
    tmp_dir = Path(tempfile.mkdtemp())
    img_path = tmp_dir / file.filename
    
    try:
        with open(img_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        logger.info(f"Processing image: {file.filename}")
        
        # Step 1: OCR (lazy-loaded)
        try:
            raw_text = ocr_engine.extract_text(str(img_path))
            logger.info(f"OCR extracted {len(raw_text)} characters")
        except ValueError as e:
            raise HTTPException(status_code=422, detail=f"OCR failed: {str(e)}")
        
        # Step 2: Structure (lazy-loaded)
        try:
            structured_data = llm_structurer.structure_nutrition_text(raw_text)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Text structuring failed: {str(e)}")
        
        # Step 3: Vectorize
        vectors = _generate_vectors(structured_data)
        
        return {
            "success": True,
            "data": {
                "supplement_name": structured_data.get('supplement_name'),
                "supplement_brand": structured_data.get('supplement_brand'),
                "supplement_description": structured_data.get('supplement_description'),
                "supplement_ingredient": structured_data.get('supplement_ingredient'),
                "serving_size_text": structured_data.get('serving_size_text'),
                "serving_size_grams": structured_data.get('serving_size_grams'),
                "nutritional_info_per_serving": structured_data.get('nutritional_info_per_serving'),
                "nutritional_info_per_100g": structured_data.get('nutritional_info_per_100g'),
                "supplement_warning_label": structured_data.get('supplement_warning_label'),
                "supplement_certifications": structured_data.get('supplement_certifications'),
                "supplement_additional_information": structured_data.get('supplement_additional_information'),
                "batch_testing_org": structured_data.get('batch_testing_org')
            },
            "vectors": vectors,
            "ocr_text": raw_text
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
    
    finally:
        try:
            shutil.rmtree(tmp_dir)
        except Exception as e:
            logger.warning(f"Failed to cleanup temp dir: {e}")


@router.post("/analyze-text")
async def analyze_from_text(request: AnalyzeTextRequest):
    """
    Structure raw text into nutrition data (NO image/OCR needed).
    
    **Use Case:**
    - User has raw text from another source
    - User wants to correct OCR errors before structuring
    - Batch processing of text data
    """
    
    logger.info(f"Analyzing text input ({len(request.raw_text)} chars)")
    
    try:
        structured_data = llm_structurer.structure_nutrition_text(request.raw_text)
        
        vectors = None
        if request.generate_vectors:
            vectors = _generate_vectors(structured_data)
        
        return {
            "success": True,
            "data": {
                "supplement_name": structured_data.get('supplement_name'),
                "supplement_brand": structured_data.get('supplement_brand'),
                "supplement_description": structured_data.get('supplement_description'),
                "supplement_ingredient": structured_data.get('supplement_ingredient'),
                "serving_size_text": structured_data.get('serving_size_text'),
                "serving_size_grams": structured_data.get('serving_size_grams'),
                "nutritional_info_per_serving": structured_data.get('nutritional_info_per_serving'),
                "nutritional_info_per_100g": structured_data.get('nutritional_info_per_100g'),
                "supplement_warning_label": structured_data.get('supplement_warning_label'),
                "supplement_certifications": structured_data.get('supplement_certifications'),
                "supplement_additional_information": structured_data.get('supplement_additional_information'),
                "batch_testing_org": structured_data.get('batch_testing_org')
            },
            "vectors": vectors
        }
        
    except Exception as e:
        logger.error(f"Error analyzing text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Text analysis failed: {str(e)}")


@router.post("/identify")
async def identify_supplement(request: IdentifySupplementRequest):
    """
    Extract ONLY supplement name, brand, and variant from text.
    Faster than full nutrition extraction.
    """
    
    logger.info(f"Identifying supplement from text ({len(request.raw_text)} chars)")
    
    try:
        identification = llm_structurer.identify_supplement(request.raw_text)
        return {"success": True, "identification": identification}
    except Exception as e:
        logger.error(f"Error identifying supplement: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Identification failed: {str(e)}")


@router.post("/ocr-only")
async def extract_text_only(file: UploadFile = File(...)):
    """
    Extract raw text from image using OCR only (no LLM structuring).
    """
    
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    tmp_dir = Path(tempfile.mkdtemp())
    img_path = tmp_dir / file.filename
    
    try:
        with open(img_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        logger.info(f"OCR-only processing: {file.filename}")
        raw_text = ocr_engine.extract_text(str(img_path))
        
        return {
            "success": True,
            "raw_text": raw_text,
            "line_count": len(raw_text.split('\n')),
            "character_count": len(raw_text)
        }
        
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"OCR failed: {str(e)}")
    except Exception as e:
        logger.error(f"OCR error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            shutil.rmtree(tmp_dir)
        except Exception:
            pass


@router.get("/health")
async def ocr_health_check():
    """Check if OCR service is healthy."""
    
    return {
        "status": "healthy",
        "model": "PaddleOCR PP-OCRv4",
        "llm": "gpt-4o-mini",
        "lazy_loading": {
            "ocr_engine_loaded": ocr_engine.is_loaded(),
            "llm_loaded": llm_structurer.is_loaded()
        },
        "endpoints": [
            "POST /analyze - Image → structured data + vectors",
            "POST /analyze-text - Text → structured data + vectors",
            "POST /identify - Text → name/brand only",
            "POST /ocr-only - Image → raw text only"
        ]
    }


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _generate_vectors(structured_data: dict) -> dict:
    """Generate embedding vectors from structured nutrition data."""
    try:
        vectorizer = SupplementVectorizer()
        
        per_serving = structured_data.get('nutritional_info_per_serving', {})
        per_100g = structured_data.get('nutritional_info_per_100g')
        serving_size_grams = structured_data.get('serving_size_grams')
        
        # Vector for per-serving
        per_serving_str = json.dumps({"nutrients": per_serving.get('nutrients', [])})
        vector_per_serving = vectorizer.embed_model.get_text_embedding(per_serving_str)
        
        # Vector for per-100g
        vector_per_100g = None
        per_100g_calculated = False
        
        if per_100g and per_100g.get('nutrients'):
            per_100g_str = json.dumps({"nutrients": per_100g.get('nutrients', [])})
            vector_per_100g = vectorizer.embed_model.get_text_embedding(per_100g_str)
        elif serving_size_grams and serving_size_grams > 0:
            calculated = _calculate_per_100g(per_serving, serving_size_grams)
            if calculated:
                per_100g_str = json.dumps({"nutrients": calculated.get('nutrients', [])})
                vector_per_100g = vectorizer.embed_model.get_text_embedding(per_100g_str)
                per_100g_calculated = True
        
        return {
            "vector_per_serving": vector_per_serving,
            "vector_per_100g": vector_per_100g,
            "per_100g_calculated": per_100g_calculated
        }
        
    except Exception as e:
        logger.warning(f"Vector generation failed: {str(e)}")
        return {
            "vector_per_serving": None,
            "vector_per_100g": None,
            "per_100g_calculated": False,
            "error": str(e)
        }


def _calculate_per_100g(per_serving: dict, serving_size_grams: float) -> Optional[dict]:
    """Calculate per 100g nutrition from per serving data."""
    if not serving_size_grams or serving_size_grams <= 0:
        return None
    
    multiplier = 100 / serving_size_grams
    per_100g = {"nutrients": []}
    
    for nutrient in per_serving.get('nutrients', []):
        amount_str = nutrient.get('amount', '')
        match = re.match(r'[<]?\s*(\d+(?:\.\d+)?)\s*(mg|g|mcg|ug|μg|kcal|cal)?', str(amount_str).lower())
        
        if match:
            value = float(match.group(1))
            unit = match.group(2) or ''
            new_value = value * multiplier
            new_amount = f"{int(new_value)}{unit}" if new_value == int(new_value) else f"{new_value:.1f}{unit}"
        else:
            new_amount = amount_str
        
        per_100g['nutrients'].append({
            "name": nutrient.get('name'),
            "amount": new_amount,
            "daily_value": None
        })
    
    return per_100g