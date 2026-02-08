from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import logging
from app.services.vectorizer import SupplementVectorizer

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize vectorizer once
vectorizer = SupplementVectorizer()

# --- Request/Response Schemas ---

class NutrientItem(BaseModel):
    name: str
    amount: str
    daily_value: Optional[str] = None

class NutritionData(BaseModel):
    calories: Optional[int] = None
    nutrients: List[NutrientItem] = []

class VectorizationRequest(BaseModel):
    ingredients: List[str] = Field(..., description="List of ingredient names")
    nutritional_info: NutritionData = Field(..., description="Nutrition facts data")
    basis: str = Field(..., description="Either 'per_100g' or 'per_serving'")

class VectorizationResponse(BaseModel):
    success: bool
    vector: List[float]
    dimension: int
    basis: str

# --- Endpoints ---

@router.post("/generate", response_model=VectorizationResponse)
async def generate_vector(request: VectorizationRequest):
    """
    Generate a vector embedding from supplement data.
    
    **Use Case:** Manual supplement creation, supplement updates
    
    **Input:**
    - ingredients: ["Vitamin D3", "MCT Oil"]
    - nutritional_info: {calories: 10, nutrients: [...]}
    - basis: "per_100g" or "per_serving"
    
    **Output:**
    - vector: [0.123, -0.456, ...] (384 dimensions)
    """
    
    try:
        logger.info(f"Generating vector for {request.basis}")
        
        # Validate basis
        if request.basis not in ['per_100g', 'per_serving']:
            raise HTTPException(
                status_code=400,
                detail="basis must be 'per_100g' or 'per_serving'"
            )
        
        # Generate vector
        vector = vectorizer.generate_vector(
            ingredients=request.ingredients,
            nutritional_info=request.nutritional_info.dict(),
            basis=request.basis
        )
        
        return VectorizationResponse(
            success=True,
            vector=vector,
            dimension=len(vector),
            basis=request.basis
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Vectorization failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Vectorization failed: {str(e)}"
        )


@router.post("/batch-generate")
async def batch_generate_vectors(supplements: List[VectorizationRequest]):
    """
    Generate vectors for multiple supplements at once.
    
    **Use Case:** Batch vectorization for existing supplements
    
    **Returns:** List of vectors in same order as input
    """
    
    try:
        results = []
        
        for idx, supplement in enumerate(supplements):
            logger.info(f"Processing supplement {idx+1}/{len(supplements)}")
            
            vector = vectorizer.generate_vector(
                ingredients=supplement.ingredients,
                nutritional_info=supplement.nutritional_info.dict(),
                basis=supplement.basis
            )
            
            results.append({
                "index": idx,
                "vector": vector,
                "dimension": len(vector),
                "basis": supplement.basis
            })
        
        return {
            "success": True,
            "count": len(results),
            "vectors": results
        }
        
    except Exception as e:
        logger.error(f"Batch vectorization failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch vectorization failed: {str(e)}"
        )


@router.get("/health")
async def vectorization_health_check():
    """Check if vectorization service is healthy"""
    return {
        "status": "healthy",
        "model": vectorizer.model_name,
        "dimension": vectorizer.vector_dimension
    }