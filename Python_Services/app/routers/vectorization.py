"""
Vectorization API endpoints.
Generates 384-dimensional embeddings for supplement data.
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Optional
from pydantic import BaseModel, Field

from app.services.vectorizer import SupplementVectorizer

router = APIRouter()

# Initialize vectorizer (singleton pattern via service)
vectorizer = SupplementVectorizer()


# --- Request/Response Schemas ---

class VectorizationRequest(BaseModel):
    """Single vectorization request."""
    ingredients: List[str] = Field(..., description="List of ingredient names")
    nutritional_info: Dict[str, float] = Field(
        ..., 
        description="Flat dict like {'Protein (g)': 24.0, 'Energy (kcal)': 338}"
    )
    basis: str = Field(..., description="'per_100g' or 'per_serving'")


class VectorizationResponse(BaseModel):
    """Vectorization response."""
    success: bool
    vector: List[float]
    dimension: int
    basis: str


class BatchVectorizationRequest(BaseModel):
    """Batch vectorization request."""
    supplements: List[VectorizationRequest]


class BatchVectorizationResponse(BaseModel):
    """Batch vectorization response."""
    success: bool
    results: List[VectorizationResponse]
    total: int


class ProductVectorizationRequest(BaseModel):
    """
    Full product vectorization request (generates both vectors).
    Matches Ryan's webscraper output format.
    """
    ingredients: List[str] = Field(default_factory=list)
    per_serving: Dict[str, float] = Field(
        default_factory=dict,
        description="Flat nutrition dict per serving"
    )
    per_100g: Dict[str, float] = Field(
        default_factory=dict,
        description="Flat nutrition dict per 100g"
    )


class ProductVectorizationResponse(BaseModel):
    """
    Full product vectorization response.
    Field names match database columns.
    """
    success: bool
    vector_perserving_ingredient: Optional[List[float]] = None
    vector_100g_ingredient: Optional[List[float]] = None
    dimension: int = 384


# --- Endpoints ---

@router.get("/health")
async def health_check():
    """Check vectorization service health."""
    return {
        "status": "healthy",
        "model": vectorizer.model_name,
        "dimension": vectorizer.vector_dimension
    }


@router.post("/generate", response_model=VectorizationResponse)
async def generate_vector(request: VectorizationRequest):
    """
    Generate a single vector from ingredients + nutrition data.
    
    Request body:
    ```json
    {
        "ingredients": ["Whey Protein", "Cocoa Powder"],
        "nutritional_info": {
            "Protein (g)": 24.0,
            "Energy (kcal)": 338,
            "Fats (g)": 5.0
        },
        "basis": "per_100g"
    }
    ```
    """
    try:
        vector = vectorizer.generate_vector(
            ingredients=request.ingredients,
            nutritional_info=request.nutritional_info,
            basis=request.basis
        )
        
        return VectorizationResponse(
            success=True,
            vector=vector,
            dimension=len(vector),
            basis=request.basis
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-generate", response_model=BatchVectorizationResponse)
async def batch_generate_vectors(request: BatchVectorizationRequest):
    """
    Generate vectors for multiple supplements.
    """
    results = []
    
    for supplement in request.supplements:
        try:
            vector = vectorizer.generate_vector(
                ingredients=supplement.ingredients,
                nutritional_info=supplement.nutritional_info,
                basis=supplement.basis
            )
            
            results.append(VectorizationResponse(
                success=True,
                vector=vector,
                dimension=len(vector),
                basis=supplement.basis
            ))
            
        except Exception as e:
            results.append(VectorizationResponse(
                success=False,
                vector=[],
                dimension=0,
                basis=supplement.basis
            ))
    
    return BatchVectorizationResponse(
        success=all(r.success for r in results),
        results=results,
        total=len(results)
    )


@router.post("/generate-product-vectors", response_model=ProductVectorizationResponse)
async def generate_product_vectors(request: ProductVectorizationRequest):
    """
    Generate both per_serving and per_100g vectors for a product.
    
    This matches Ryan's webscraper format and database schema.
    
    Request body:
    ```json
    {
        "ingredients": ["Whey Protein", "Cocoa Powder"],
        "per_serving": {
            "Protein (g)": 24.0,
            "Energy (kcal)": 120
        },
        "per_100g": {
            "Protein (g)": 80.0,
            "Energy (kcal)": 400
        }
    }
    ```
    
    Response:
    ```json
    {
        "success": true,
        "vector_perserving_ingredient": [0.012, -0.034, ...],
        "vector_100g_ingredient": [0.045, -0.067, ...],
        "dimension": 384
    }
    ```
    """
    try:
        vectors = vectorizer.generate_vectors_for_product(
            ingredients=request.ingredients,
            per_serving=request.per_serving,
            per_100g=request.per_100g
        )
        
        return ProductVectorizationResponse(
            success=True,
            vector_perserving_ingredient=vectors["vector_perserving_ingredient"],
            vector_100g_ingredient=vectors["vector_100g_ingredient"],
            dimension=384
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))