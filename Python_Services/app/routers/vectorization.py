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


class ProductVectorsRequest(BaseModel):
    """Request for generating both per_100g and per_serving vectors"""
    ingredients: List[str] = Field(default=[], description="List of ingredient names")
    per_serving: Optional[dict] = Field(default=None, description="Nutritional info per serving")
    per_100g: Optional[dict] = Field(default=None, description="Nutritional info per 100g")


def has_useful_data(nutritional_dict: Optional[dict], ingredients: List[str]) -> bool:
    """Check if there's enough data to generate a meaningful vector"""
    if ingredients and len(ingredients) > 0:
        return True
    if nutritional_dict:
        nutrients = nutritional_dict.get("nutrients", [])
        if nutrients and len(nutrients) > 0:
            return True
    return False


@router.post("/generate-product-vectors")
async def generate_product_vectors(request: ProductVectorsRequest):
    """
    Generate both per_100g and per_serving vectors for a supplement.

    **Use Case:** Staging supplement approval - generates both vectors in one call

    **Input:**
    - ingredients: ["Vitamin D3", "MCT Oil"]
    - per_serving: {calories: 10, nutrients: [...]} (optional)
    - per_100g: {calories: 100, nutrients: [...]} (optional)

    **Output:**
    - vector_100g_ingredient: [...] or null
    - vector_perserving_ingredient: [...] or null
    - dimension: 384

    **Notes:**
    - At least one of per_100g or per_serving must have data
    - If only one is provided, only that vector is generated
    - Ingredients are combined with nutritional data for vectorization
    """

    try:
        vector_100g = None
        vector_perserving = None
        dimension = vectorizer.vector_dimension

        # Check if we have per_100g data to vectorize
        can_generate_100g = request.per_100g is not None and has_useful_data(request.per_100g, request.ingredients)

        # Check if we have per_serving data to vectorize
        can_generate_perserving = request.per_serving is not None and has_useful_data(request.per_serving, request.ingredients)

        logger.info(f"Vectorization request - ingredients: {len(request.ingredients)}, "
                   f"can_generate_100g: {can_generate_100g}, can_generate_perserving: {can_generate_perserving}")

        # Generate per_100g vector if data available
        if can_generate_100g:
            try:
                nutrition_data = {
                    "calories": request.per_100g.get("calories"),
                    "nutrients": request.per_100g.get("nutrients", [])
                }
                vector_100g = vectorizer.generate_vector(
                    ingredients=request.ingredients,
                    nutritional_info=nutrition_data,
                    basis="per_100g"
                )
                logger.info(f"Generated per_100g vector with {len(vector_100g)} dimensions")
            except Exception as e:
                logger.warning(f"Failed to generate per_100g vector: {e}")

        # Generate per_serving vector if data available
        if can_generate_perserving:
            try:
                nutrition_data = {
                    "calories": request.per_serving.get("calories"),
                    "nutrients": request.per_serving.get("nutrients", [])
                }
                vector_perserving = vectorizer.generate_vector(
                    ingredients=request.ingredients,
                    nutritional_info=nutrition_data,
                    basis="per_serving"
                )
                logger.info(f"Generated per_serving vector with {len(vector_perserving)} dimensions")
            except Exception as e:
                logger.warning(f"Failed to generate per_serving vector: {e}")

        # Check if at least one vector was generated
        if vector_100g is None and vector_perserving is None:
            return {
                "success": False,
                "reason": "No nutritional data available to generate vectors (need ingredients or nutrients in per_100g/per_serving)",
                "vector_100g_ingredient": None,
                "vector_perserving_ingredient": None,
                "dimension": dimension
            }

        return {
            "success": True,
            "vector_100g_ingredient": vector_100g,
            "vector_perserving_ingredient": vector_perserving,
            "dimension": dimension
        }

    except Exception as e:
        logger.error(f"Product vectorization failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Product vectorization failed: {str(e)}"
        )


@router.get("/health")
async def vectorization_health_check():
    """Check if vectorization service is healthy"""
    return {
        "status": "healthy",
        "model": vectorizer.model_name,
        "dimension": vectorizer.vector_dimension
    }