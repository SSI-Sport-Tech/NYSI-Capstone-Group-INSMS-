"""
OCR API Router.
Provides endpoints for extracting nutrition data from supplement label images.

✅ Updated to support a 2-stage (editable) OCR flow:
1) OCR-only → returns raw_text (user can edit in frontend)
2) Analyze edited text → structure + (optional) vectorization

Also keeps a convenience endpoint that runs the full pipeline in one call.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from pathlib import Path
from typing import Optional, Any, Dict, List
import tempfile
import shutil
import json
import re
import logging

# Modular services (lazy-loaded)
from app.services import ocr_engine, llm_structurer
from app.services.vectorizer import SupplementVectorizer

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================================
# REQUEST / RESPONSE SCHEMAS
# ============================================================================

class AnalyzeTextRequest(BaseModel):
    """Request schema for text-based analysis (no image)."""
    raw_text: str = Field(..., description="Raw text containing nutrition label information", min_length=5)
    generate_vectors: bool = Field(default=True, description="Whether to generate embedding vectors")


class StructureOnlyRequest(BaseModel):
    """Structure raw text into JSON fields (no vectors)."""
    raw_text: str = Field(..., description="Raw text containing nutrition label information", min_length=5)


class VectorizeRequest(BaseModel):
    """
    Vectorize already-structured data (optionally passed from frontend after user edits).
    If you prefer, you can call /analyze-text instead (structure + vectorize).
    """
    structured_data: Dict[str, Any] = Field(..., description="Structured nutrition data from the LLM")
    include_ingredients: bool = Field(default=True, description="Whether to include ingredients in the vector input")


class IdentifySupplementRequest(BaseModel):
    """Request schema for supplement identification."""
    raw_text: str = Field(..., description="Raw text from supplement label", min_length=5)


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/ocr-only")
async def extract_text_only(file: UploadFile = File(...)):
    """
    ✅ Stage 1 (recommended): Extract raw OCR text ONLY (no LLM, no vectors).

    Frontend flow:
    - Call this endpoint
    - Show raw_text in a textarea so user can correct OCR errors
    - Then call /structure-text or /analyze-text using the edited text
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    tmp_dir = Path(tempfile.mkdtemp())
    img_path = tmp_dir / file.filename

    try:
        with open(img_path, "wb") as f:
            f.write(await file.read())

        logger.info(f"OCR-only processing: {file.filename}")
        raw_text = ocr_engine.extract_text(str(img_path))

        return {
            "success": True,
            "raw_text": raw_text,
            "line_count": len(raw_text.split("\n")),
            "character_count": len(raw_text),
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


@router.post("/structure-text")
async def structure_from_text(request: StructureOnlyRequest):
    """
    ✅ Stage 2a (optional split): Structure edited raw text into JSON fields (NO vectors).

    Use this if you want the user to review/edit the structured JSON before vectorization.
    Otherwise, use /analyze-text for structure + vectors in one shot.
    """
    logger.info(f"Structuring text input ({len(request.raw_text)} chars)")

    try:
        structured_data = llm_structurer.structure_nutrition_text(request.raw_text)
        return {
            "success": True,
            "data": structured_data,
        }
    except Exception as e:
        logger.error(f"Error structuring text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Text structuring failed: {str(e)}")


@router.post("/vectorize")
async def vectorize_structured_payload(request: VectorizeRequest):
    """
    ✅ Stage 2b (optional split): Generate vectors from structured JSON (NO OCR, NO LLM).

    This is useful when:
    - you already structured the text (or user edited the JSON)
    - you only want embeddings for similarity search
    """
    try:
        vectors = _generate_vectors_from_structured(
            structured_data=request.structured_data,
            include_ingredients=request.include_ingredients,
        )
        return {"success": True, "vectors": vectors}
    except Exception as e:
        logger.error(f"Vectorize failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Vectorize failed: {str(e)}")


@router.post("/analyze-text")
async def analyze_from_text(request: AnalyzeTextRequest):
    """
    ✅ Stage 2 (recommended after OCR-only): Structure raw text into nutrition data.
    Optionally generates vectors.

    Typical flow:
    1) /ocr-only  -> raw_text
    2) user edits raw_text in UI
    3) /analyze-text -> structured_data (+ vectors if generate_vectors=true)
    """
    logger.info(f"Analyzing text input ({len(request.raw_text)} chars)")

    try:
        structured_data = llm_structurer.structure_nutrition_text(request.raw_text)

        vectors = None
        if request.generate_vectors:
            vectors = _generate_vectors_from_structured(structured_data)

        # Return a stable subset for frontend + full structured in case you need it
        return {
            "success": True,
            "data": {
                "supplement_name": structured_data.get("supplement_name"),
                "supplement_brand": structured_data.get("supplement_brand"),
                "supplement_description": structured_data.get("supplement_description"),
                "supplement_ingredient": structured_data.get("supplement_ingredient"),
                "serving_size_text": structured_data.get("serving_size_text"),
                "serving_size_grams": structured_data.get("serving_size_grams"),
                "nutritional_info_per_serving": structured_data.get("nutritional_info_per_serving"),
                "nutritional_info_per_100g": structured_data.get("nutritional_info_per_100g"),
                "nutritional_info_per_serving_definition": structured_data.get(
                    "nutritional_info_per_serving_definition"
                ),
                "supplement_warning_label": structured_data.get("supplement_warning_label"),
                "supplement_certifications": structured_data.get("supplement_certifications"),
                "supplement_additional_information": structured_data.get("supplement_additional_information"),
                "batch_testing_org": structured_data.get("batch_testing_org"),
            },
            "structured_data": structured_data,  # full payload (useful for debugging / future fields)
            "vectors": vectors,
        }

    except Exception as e:
        logger.error(f"Error analyzing text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Text analysis failed: {str(e)}")


@router.post("/analyze")
async def analyze_supplement_label(file: UploadFile = File(...)):
    """
    Convenience endpoint: Image → OCR → Structure → Vectors.

    ⚠️ If you need editable OCR text before vector search:
    use /ocr-only then /analyze-text instead.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (jpg, png, etc.)")

    tmp_dir = Path(tempfile.mkdtemp())
    img_path = tmp_dir / file.filename

    try:
        with open(img_path, "wb") as f:
            f.write(await file.read())

        logger.info(f"Processing image: {file.filename}")

        # Step 1: OCR
        try:
            raw_text = ocr_engine.extract_text(str(img_path))
            logger.info(f"OCR extracted {len(raw_text)} characters")
        except ValueError as e:
            raise HTTPException(status_code=422, detail=f"OCR failed: {str(e)}")

        # Step 2: Structure
        try:
            structured_data = llm_structurer.structure_nutrition_text(raw_text)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Text structuring failed: {str(e)}")

        # Step 3: Vectorize (uses updated SupplementVectorizer.generate_vector)
        vectors = _generate_vectors_from_structured(structured_data)

        return {
            "success": True,
            "data": {
                "supplement_name": structured_data.get("supplement_name"),
                "supplement_brand": structured_data.get("supplement_brand"),
                "supplement_description": structured_data.get("supplement_description"),
                "supplement_ingredient": structured_data.get("supplement_ingredient"),
                "serving_size_text": structured_data.get("serving_size_text"),
                "serving_size_grams": structured_data.get("serving_size_grams"),
                "nutritional_info_per_serving": structured_data.get("nutritional_info_per_serving"),
                "nutritional_info_per_100g": structured_data.get("nutritional_info_per_100g"),
                "nutritional_info_per_serving_definition": structured_data.get(
                    "nutritional_info_per_serving_definition"
                ),
                "supplement_warning_label": structured_data.get("supplement_warning_label"),
                "supplement_certifications": structured_data.get("supplement_certifications"),
                "supplement_additional_information": structured_data.get("supplement_additional_information"),
                "batch_testing_org": structured_data.get("batch_testing_org"),
            },
            "vectors": vectors,
            "ocr_text": raw_text,  # still returned for debugging / optional editing
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


@router.post("/identify")
async def identify_supplement(request: IdentifySupplementRequest):
    """
    Extract ONLY supplement name/brand/variant from text.
    Faster than full nutrition extraction.
    """
    logger.info(f"Identifying supplement from text ({len(request.raw_text)} chars)")

    try:
        identification = llm_structurer.identify_supplement(request.raw_text)
        return {"success": True, "identification": identification}
    except Exception as e:
        logger.error(f"Error identifying supplement: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Identification failed: {str(e)}")


@router.get("/health")
async def ocr_health_check():
    """Check if OCR service is healthy."""
    return {
        "status": "healthy",
        "model": "PaddleOCR PP-OCRv4",
        "llm": "gpt-4o-mini",
        "lazy_loading": {
            "ocr_engine_loaded": ocr_engine.is_loaded(),
            "llm_loaded": llm_structurer.is_loaded(),
        },
        "endpoints": [
            "POST /ocr-only - Image → raw text only (editable step)",
            "POST /structure-text - Text → structured JSON (no vectors)",
            "POST /vectorize - Structured JSON → vectors (no OCR/LLM)",
            "POST /analyze-text - Text → structured data (+ optional vectors)",
            "POST /analyze - Image → structured data + vectors (one-shot)",
            "POST /identify - Text → name/brand only",
        ],
    }


# ============================================================================
# HELPERS (aligned with updated vectorizer.py)
# ============================================================================

def _generate_vectors_from_structured(structured_data: dict, include_ingredients: bool = True) -> dict:
    """
    Generate vectors using the UPDATED SupplementVectorizer.generate_vector(ingredients, nutritional_info).

    Produces:
    - vector_per_serving
    - vector_per_100g (from label, or calculated if missing and serving_size_grams exists)
    - per_100g_calculated flag
    """
    vectorizer = SupplementVectorizer()

    ingredients = structured_data.get("supplement_ingredient") or []
    if not include_ingredients:
        ingredients = []

    per_serving = structured_data.get("nutritional_info_per_serving") or {}
    per_100g = structured_data.get("nutritional_info_per_100g")
    serving_size_grams = structured_data.get("serving_size_grams")

    # Vector: per serving
    vector_per_serving = vectorizer.generate_vector(ingredients=ingredients, nutritional_info=per_serving)

    # Vector: per 100g
    vector_per_100g = None
    per_100g_calculated = False

    if per_100g and (isinstance(per_100g, dict)) and per_100g.get("nutrients"):
        vector_per_100g = vectorizer.generate_vector(ingredients=ingredients, nutritional_info=per_100g)
    else:
        # try calculate from per_serving + serving_size_grams
        if serving_size_grams and serving_size_grams > 0:
            calculated = _calculate_per_100g(per_serving, serving_size_grams)
            if calculated and calculated.get("nutrients"):
                vector_per_100g = vectorizer.generate_vector(ingredients=ingredients, nutritional_info=calculated)
                per_100g_calculated = True

    return {
        "vector_per_serving": vector_per_serving,
        "vector_per_100g": vector_per_100g,
        "per_100g_calculated": per_100g_calculated,
    }


def _calculate_per_100g(per_serving: dict, serving_size_grams: float) -> Optional[dict]:
    """Calculate per 100g nutrition from per serving data."""
    if not serving_size_grams or serving_size_grams <= 0:
        return None

    multiplier = 100 / serving_size_grams
    per_100g = {"nutrients": []}

    nutrients = per_serving.get("nutrients", []) if isinstance(per_serving, dict) else []
    for nutrient in nutrients:
        amount_str = (nutrient or {}).get("amount", "")
        match = re.match(
            r"[<]?\s*(\d+(?:\.\d+)?)\s*(mg|g|mcg|ug|μg|kcal|cal)?",
            str(amount_str).lower(),
        )

        if match:
            value = float(match.group(1))
            unit = match.group(2) or ""
            new_value = value * multiplier
            new_amount = f"{int(new_value)}{unit}" if new_value == int(new_value) else f"{new_value:.1f}{unit}"
        else:
            new_amount = amount_str

        per_100g["nutrients"].append(
            {
                "name": (nutrient or {}).get("name"),
                "amount": new_amount,
                "daily_value": None,
            }
        )

    return per_100g