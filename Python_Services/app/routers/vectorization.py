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