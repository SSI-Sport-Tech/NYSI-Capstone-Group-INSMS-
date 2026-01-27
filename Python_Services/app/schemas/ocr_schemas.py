"""
Pydantic schemas for OCR and vectorization.
Aligned with Ryan's webscraper format.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict


# --- 1. Sub-Schemas for LLM Extraction ---

class Nutrient(BaseModel):
    """Individual nutrient for LLM extraction."""
    name: str = Field(..., description="Nutrient name with unit (e.g., 'Protein (g)', 'Sodium (mg)')")
    amount: float = Field(..., description="Numeric amount (e.g., 24, 150)")
    daily_value: Optional[str] = Field(None, description="% Daily Value if present")


class NutritionFacts(BaseModel):
    """Nutrition facts from LLM extraction."""
    nutrients: List[Nutrient] = Field(default_factory=list, description="List of nutrients")


class Ingredient(BaseModel):
    """Individual ingredient."""
    name: str = Field(..., description="Ingredient name")
    amount: Optional[str] = Field(None, description="Amount if listed (e.g., '5g')")


# --- 2. LLM Extraction Schema (Used by OCR workflow) ---

class SupplementStagingSchema(BaseModel):
    """Schema for LLM structured output during OCR extraction."""
    
    # Core Identifiers
    supplement_name: str = Field(..., description="The name of the product")
    supplement_brand: str = Field(..., description="The brand manufacturing the product")
    supplement_description: Optional[str] = Field(None, description="Marketing description")
    
    # Ingredients
    supplement_ingredient: List[Ingredient] = Field(default_factory=list)
    
    # Nutrition (LLM extracts as list, we convert to flat dict later)
    nutritional_info_per_serving: NutritionFacts = Field(..., description="Facts per serving")
    nutritional_info_per_100g: Optional[NutritionFacts] = Field(None, description="Facts per 100g if on label")
    
    # Serving size - CRITICAL for calculating per 100g
    serving_size_grams: Optional[float] = Field(None, description="Serving size in grams (e.g., 55)")
    serving_size_text: Optional[str] = Field(None, description="Full serving size text (e.g., '2/3 cup (55g)')")
    
    # Text Metadata
    supplement_warning_label: Optional[str] = Field(None, description="Warnings/allergens")
    supplement_certifications: Optional[str] = Field(None, description="Certifications (NSF, GMP, etc.)")
    supplement_additional_information: Optional[str] = Field(None, description="Storage/usage instructions")


# --- 3. Vectorization Request Schemas (For API endpoints) ---

class VectorizationRequest(BaseModel):
    """Request schema for vectorization endpoint."""
    ingredients: List[str] = Field(..., description="List of ingredient names")
    nutritional_info: Dict[str, float] = Field(..., description="Flat dict like {'Protein (g)': 24.0}")
    basis: str = Field(..., description="'per_100g' or 'per_serving'")


class BatchVectorizationRequest(BaseModel):
    """Request schema for batch vectorization."""
    supplements: List[VectorizationRequest]


class VectorizationResponse(BaseModel):
    """Response schema for vectorization endpoint."""
    success: bool
    vector: List[float]
    dimension: int
    basis: str


class ProductVectorizationRequest(BaseModel):
    """Full product vectorization request (generates both vectors)."""
    ingredients: List[str] = Field(default_factory=list)
    per_serving: Dict[str, float] = Field(default_factory=dict, description="Flat nutrition dict per serving")
    per_100g: Dict[str, float] = Field(default_factory=dict, description="Flat nutrition dict per 100g")


class ProductVectorizationResponse(BaseModel):
    """Full product vectorization response."""
    success: bool
    vector_perserving_ingredient: Optional[List[float]] = None
    vector_100g_ingredient: Optional[List[float]] = None
    dimension: int = 384


# --- 4. OCR Response Schema ---

class OCRResponse(BaseModel):
    """Final OCR response matching Ryan's webscraper format."""
    success: bool
    data: Dict
    vectors: Dict