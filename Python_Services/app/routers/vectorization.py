from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import logging
from app.services.vectorizer import SupplementVectorizer

router = APIRouter()
logger = logging.getLogger(__name__)

vectorizer = SupplementVectorizer()

class NutrientItem(BaseModel):
    name: str
    amount: str

class VectorizationRequest(BaseModel):
    ingredients: List[str]
    nutritional_info: Dict  # Already flat or will be converted

class VectorizationResponse(BaseModel):
    success: bool
    vector: List[float]
    dimension: int

class ProductVectorizationRequest(BaseModel):
    ingredients: List[str] = Field(default_factory=list)
    per_serving: Optional[Dict] = None
    per_100g: Optional[Dict] = None

class ProductVectorizationResponse(BaseModel):
    success: bool
    vector_perserving_ingredient: Optional[List[float]] = None
    vector_100g_ingredient: Optional[List[float]] = None
    dimension: int

@router.post("/generate-product-vectors", response_model=ProductVectorizationResponse)
async def generate_product_vectors(request: ProductVectorizationRequest):
    """
    Generate two vector embeddings for a supplement product:
    - vector_perserving_ingredient: from ingredients + per_serving nutrition
    - vector_100g_ingredient: from ingredients + per_100g nutrition
    """
    try:
        vector_perserving = None
        vector_100g = None

        if request.ingredients or request.per_serving:
            per_serving_nutrition = request.per_serving or {}
            vector_perserving = vectorizer.generate_vector(
                ingredients=request.ingredients,
                nutritional_info=per_serving_nutrition
            )

        if request.ingredients or request.per_100g:
            per_100g_nutrition = request.per_100g or {}
            vector_100g = vectorizer.generate_vector(
                ingredients=request.ingredients,
                nutritional_info=per_100g_nutrition
            )

        return ProductVectorizationResponse(
            success=True,
            vector_perserving_ingredient=vector_perserving,
            vector_100g_ingredient=vector_100g,
            dimension=vectorizer.vector_dimension
        )
    except Exception as e:
        logger.error(f"Product vectorization failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Product vectorization failed: {str(e)}"
        )

@router.post("/generate", response_model=VectorizationResponse)
async def generate_vector(request: VectorizationRequest):
    """
    Generate a vector embedding from supplement data (ingredients + FLAT nutrition).
    - ingredients: ["Vitamin D3", "MCT Oil"]
    - nutritional_info: {"Protein (g)": 24.0, ...}
    """
    try:
        vector = vectorizer.generate_vector(
            ingredients=request.ingredients,
            nutritional_info=request.nutritional_info
        )
        return VectorizationResponse(
            success=True,
            vector=vector,
            dimension=len(vector)
        )
    except Exception as e:
        logger.error(f"Vectorization failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Vectorization failed: {str(e)}"
        )

@router.get("/health")
async def vectorization_health_check():
    return {
        "status": "healthy",
        "model": vectorizer.model_name,
        "dimension": vectorizer.vector_dimension
    }