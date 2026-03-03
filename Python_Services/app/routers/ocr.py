"""
OCR API Router.
Provides endpoints for extracting nutrition data from supplement label images.

✅ Supports 2-stage (editable) OCR flow:
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
import re
import logging

# Modular services (lazy-loaded)
from app.services import ocr_engine, llm_structurer
from app.services.vectorizer import get_vectorizer

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class AnalyzeTextRequest(BaseModel):
    raw_text: str = Field(..., description="Raw text containing nutrition label information", min_length=5)
    generate_vectors: bool = Field(default=True, description="Whether to generate embedding vectors")


class StructureOnlyRequest(BaseModel):
    raw_text: str = Field(..., description="Raw text containing nutrition label information", min_length=5)


class VectorizeRequest(BaseModel):
    structured_data: Dict[str, Any] = Field(..., description="Structured nutrition data from the LLM")
    include_ingredients: bool = Field(default=True, description="Whether to include ingredients in the vector input")


class IdentifySupplementRequest(BaseModel):
    raw_text: str = Field(..., description="Raw text from supplement label", min_length=5)


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class OCROnlyResponse(BaseModel):
    success: bool
    raw_text: str
    line_count: int
    character_count: int


class StructureTextResponse(BaseModel):
    success: bool
    data: Dict[str, Any]


class VectorsPayload(BaseModel):
    vector_per_serving: Optional[List[float]] = None
    vector_per_100g: Optional[List[float]] = None
    per_100g_calculated: bool = False


class VectorizeResponse(BaseModel):
    success: bool
    vectors: VectorsPayload


class AnalyzeDataSubset(BaseModel):
    supplement_name: Optional[str] = None
    supplement_brand: Optional[str] = None
    supplement_description: Optional[str] = None
    supplement_ingredient: Optional[Any] = None
    serving_size_text: Optional[str] = None
    serving_size_grams: Optional[float] = None
    nutritional_info_per_serving: Optional[Dict[str, Any]] = None
    nutritional_info_per_100g: Optional[Dict[str, Any]] = None
    nutritional_info_per_serving_definition: Optional[str] = None
    supplement_warning_label: Optional[str] = None
    supplement_certifications: Optional[str] = None
    supplement_additional_information: Optional[str] = None
    batch_testing_org: Optional[str] = None


class AnalyzeTextResponse(BaseModel):
    success: bool
    data: AnalyzeDataSubset
    structured_data: Optional[Dict[str, Any]] = None
    vectors: Optional[VectorsPayload] = None


class AnalyzeImageResponse(BaseModel):
    success: bool
    data: AnalyzeDataSubset
    vectors: VectorsPayload
    ocr_text: str


class IdentifyResponse(BaseModel):
    success: bool
    identification: Dict[str, Any]


class HealthResponse(BaseModel):
    status: str
    model: str
    llm: str
    lazy_loading: Dict[str, Any]
    endpoints: List[str]


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/ocr-only", response_model=OCROnlyResponse)
async def extract_text_only(file: UploadFile = File(...)):
    """Stage 1: OCR only (editable text step)."""
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


@router.post("/structure-text", response_model=StructureTextResponse)
async def structure_from_text(request: StructureOnlyRequest):
    """Stage 2a: Structure edited text (no vectors)."""
    logger.info(f"Structuring text input ({len(request.raw_text)} chars)")
    try:
        structured_data = llm_structurer.structure_nutrition_text(request.raw_text)
        return {"success": True, "data": structured_data}
    except Exception as e:
        logger.error(f"Error structuring text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Text structuring failed: {str(e)}")


@router.post("/vectorize", response_model=VectorizeResponse)
async def vectorize_structured_payload(request: VectorizeRequest):
    """Stage 2b: Vectorize structured JSON (no OCR/LLM)."""
    try:
        vectors = _generate_vectors_from_structured(
            structured_data=request.structured_data,
            include_ingredients=request.include_ingredients,
        )
        return {"success": True, "vectors": vectors}
    except Exception as e:
        logger.error(f"Vectorize failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Vectorize failed: {str(e)}")


@router.post("/analyze-text", response_model=AnalyzeTextResponse)
async def analyze_from_text(request: AnalyzeTextRequest):
    """Stage 2: Structure text (+ optional vectors)."""
    logger.info(f"Analyzing text input ({len(request.raw_text)} chars)")
    try:
        structured_data = llm_structurer.structure_nutrition_text(request.raw_text)

        vectors = None
        if request.generate_vectors:
            vectors = _generate_vectors_from_structured(structured_data)

        subset = {
            "supplement_name": structured_data.get("supplement_name"),
            "supplement_brand": structured_data.get("supplement_brand"),
            "supplement_description": structured_data.get("supplement_description"),
            "supplement_ingredient": structured_data.get("supplement_ingredient"),
            "serving_size_text": structured_data.get("serving_size_text"),
            "serving_size_grams": structured_data.get("serving_size_grams"),
            "nutritional_info_per_serving": structured_data.get("nutritional_info_per_serving"),
            "nutritional_info_per_100g": structured_data.get("nutritional_info_per_100g"),
            "nutritional_info_per_serving_definition": structured_data.get("nutritional_info_per_serving_definition"),
            "supplement_warning_label": structured_data.get("supplement_warning_label"),
            "supplement_certifications": structured_data.get("supplement_certifications"),
            "supplement_additional_information": structured_data.get("supplement_additional_information"),
            "batch_testing_org": structured_data.get("batch_testing_org"),
        }

        return {
            "success": True,
            "data": subset,
            "structured_data": structured_data,
            "vectors": vectors,
        }

    except Exception as e:
        logger.error(f"Error analyzing text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Text analysis failed: {str(e)}")


@router.post("/analyze", response_model=AnalyzeImageResponse)
async def analyze_supplement_label(file: UploadFile = File(...)):
    """Convenience: Image → OCR → Structure → Vectors."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (jpg, png, etc.)")

    tmp_dir = Path(tempfile.mkdtemp())
    img_path = tmp_dir / file.filename

    try:
        with open(img_path, "wb") as f:
            f.write(await file.read())

        logger.info(f"Processing image: {file.filename}")

        try:
            raw_text = ocr_engine.extract_text(str(img_path))
        except ValueError as e:
            raise HTTPException(status_code=422, detail=f"OCR failed: {str(e)}")

        try:
            structured_data = llm_structurer.structure_nutrition_text(raw_text)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Text structuring failed: {str(e)}")

        vectors = _generate_vectors_from_structured(structured_data)

        subset = {
            "supplement_name": structured_data.get("supplement_name"),
            "supplement_brand": structured_data.get("supplement_brand"),
            "supplement_description": structured_data.get("supplement_description"),
            "supplement_ingredient": structured_data.get("supplement_ingredient"),
            "serving_size_text": structured_data.get("serving_size_text"),
            "serving_size_grams": structured_data.get("serving_size_grams"),
            "nutritional_info_per_serving": structured_data.get("nutritional_info_per_serving"),
            "nutritional_info_per_100g": structured_data.get("nutritional_info_per_100g"),
            "nutritional_info_per_serving_definition": structured_data.get("nutritional_info_per_serving_definition"),
            "supplement_warning_label": structured_data.get("supplement_warning_label"),
            "supplement_certifications": structured_data.get("supplement_certifications"),
            "supplement_additional_information": structured_data.get("supplement_additional_information"),
            "batch_testing_org": structured_data.get("batch_testing_org"),
        }

        return {"success": True, "data": subset, "vectors": vectors, "ocr_text": raw_text}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
    finally:
        try:
            shutil.rmtree(tmp_dir)
        except Exception:
            pass


@router.post("/identify", response_model=IdentifyResponse)
async def identify_supplement(request: IdentifySupplementRequest):
    """Extract ONLY supplement name/brand/variant from text."""
    logger.info(f"Identifying supplement from text ({len(request.raw_text)} chars)")
    try:
        identification = llm_structurer.identify_supplement(request.raw_text)
        return {"success": True, "identification": identification}
    except Exception as e:
        logger.error(f"Error identifying supplement: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Identification failed: {str(e)}")


@router.get("/health", response_model=HealthResponse)
async def ocr_health_check():
    return {
        "status": "healthy",
        "model": "PaddleOCR PP-OCRv4",
        "llm": "gpt-4o-mini",
        "lazy_loading": {
            "ocr_engine_loaded": ocr_engine.is_loaded(),
            "llm_loaded": llm_structurer.is_loaded(),
        },
        "endpoints": [
            "POST /ocr-only",
            "POST /structure-text",
            "POST /vectorize",
            "POST /analyze-text",
            "POST /analyze",
            "POST /identify",
        ],
    }


# ============================================================================
# HELPERS
# ============================================================================

def _generate_vectors_from_structured(structured_data: dict, include_ingredients: bool = True) -> VectorsPayload:
    vectorizer = get_vectorizer()

    ingredients = structured_data.get("supplement_ingredient") or []
    if not include_ingredients:
        ingredients = []

    per_serving = structured_data.get("nutritional_info_per_serving") or {}
    per_100g = structured_data.get("nutritional_info_per_100g")
    serving_size_grams = structured_data.get("serving_size_grams")

    vector_per_serving = vectorizer.generate_vector(ingredients=ingredients, nutritional_info=per_serving)

    vector_per_100g = None
    per_100g_calculated = False

    if isinstance(per_100g, dict) and per_100g.get("nutrients"):
        vector_per_100g = vectorizer.generate_vector(ingredients=ingredients, nutritional_info=per_100g)
    else:
        if serving_size_grams and serving_size_grams > 0:
            calculated = _calculate_per_100g(per_serving, serving_size_grams)
            if calculated and calculated.get("nutrients"):
                vector_per_100g = vectorizer.generate_vector(ingredients=ingredients, nutritional_info=calculated)
                per_100g_calculated = True

    return VectorsPayload(
        vector_per_serving=vector_per_serving,
        vector_per_100g=vector_per_100g,
        per_100g_calculated=per_100g_calculated,
    )


def _calculate_per_100g(per_serving: dict, serving_size_grams: float) -> Optional[dict]:
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
            {"name": (nutrient or {}).get("name"), "amount": new_amount, "daily_value": None}
        )

    return per_100g