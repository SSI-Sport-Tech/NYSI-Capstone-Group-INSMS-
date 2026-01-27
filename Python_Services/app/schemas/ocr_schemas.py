"""
OCR-specific Pydantic schemas for nutrition label extraction.
Based on SSS.Supplement_Staging table structure.
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class Nutrient(BaseModel):
    """Individual nutrient with amount and optional daily value."""
    name: str = Field(
        ..., 
        description="Nutrient name with unit (e.g., 'Protein (g)', 'Sodium (mg)')"
    )
    amount: str = Field(
        ..., 
        description="Amount as string (e.g., '24g', '150mg')"
    )
    daily_value: Optional[str] = Field(
        None, 
        description="% Daily Value if present (e.g., '30%')"
    )


class NutritionFacts(BaseModel):
    """Nutritional information block."""
    nutrients: List[Nutrient] = Field(
        default_factory=list, 
        description="List of nutrients with amounts"
    )


class Ingredient(BaseModel):
    """Single ingredient with optional amount."""
    name: str = Field(..., description="Ingredient name")
    amount: Optional[str] = Field(
        None, 
        description="Amount if listed (e.g., '5g')"
    )


class SupplementStagingSchema(BaseModel):
    """
    Master schema matching SSS.Supplement_Staging table structure.
    Used by OCR workflow to extract structured data from nutrition labels.
    """
    
    # Core Identifiers
    supplement_name: str = Field(
        ..., 
        description="Product name from label"
    )
    supplement_brand: str = Field(
        ..., 
        description="Brand name from label"
    )
    supplement_description: Optional[str] = Field(
        None, 
        description="Product description or marketing text"
    )
    
    # Ingredients (JSONB)
    supplement_ingredient: List[Ingredient] = Field(
        default_factory=list,
        description="List of ingredients"
    )
    
    # Nutrition Data (JSONB)
    nutritional_info_per_serving: NutritionFacts = Field(
        ..., 
        description="Nutrition facts per serving"
    )
    nutritional_info_per_100g: Optional[NutritionFacts] = Field(
        None, 
        description="Nutrition facts per 100g (if on label)"
    )
    
    # Serving Size - CRITICAL for per 100g calculation
    serving_size_grams: Optional[float] = Field(
        None, 
        description="Serving size in grams (e.g., 55 from '2/3 cup (55g)')"
    )
    serving_size_text: Optional[str] = Field(
        None, 
        description="Full serving size text (e.g., '2/3 cup (55g)')"
    )
    nutritional_info_per_serving_definition: Optional[str] = Field(
        None, 
        description="Alternative serving size text"
    )
    
    # Additional Text Fields
    supplement_warning_label: Optional[str] = Field(
        None, 
        description="Warnings (allergens, cautions)"
    )
    supplement_certifications: Optional[str] = Field(
        None, 
        description="Certifications (e.g., 'NSF', 'Informed Sport')"
    )
    supplement_additional_information: Optional[str] = Field(
        None, 
        description="Storage instructions or other notes"
    )
    batch_testing_org: Optional[str] = Field(
        None, 
        description="Testing organization (e.g., 'Informed Sport')"
    )


class OCRResponse(BaseModel):
    """Response from OCR analysis endpoint."""
    success: bool
    data: Optional[dict] = None
    vectors: Optional[dict] = None
    error: Optional[str] = None
    per_100g_calculated: bool = False


class OCRHealthResponse(BaseModel):
    """Health check response for OCR service."""
    status: str
    paddleocr_loaded: bool
    llm_available: bool
    embedding_model_loaded: bool