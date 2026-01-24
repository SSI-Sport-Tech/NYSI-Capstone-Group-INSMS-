from pydantic import BaseModel, Field
from typing import List, Optional, Union

# --- 1. Sub-Schemas for JSONB Columns ---

class Nutrient(BaseModel):
    name: str = Field(..., description="Nutrient name (e.g., 'Protein', 'Sodium')")
    amount: str = Field(..., description="Amount with unit (e.g., '24g', '150mg')")
    daily_value: Optional[str] = Field(None, description="% Daily Value if present")

class NutritionFacts(BaseModel):
    calories: Optional[Union[int, str]] = Field(None, description="Total calories")
    nutrients: List[Nutrient] = Field(default_factory=list, description="List of nutrients")

class Ingredient(BaseModel):
    name: str = Field(..., description="Ingredient name")
    amount: Optional[str] = Field(None, description="Amount if listed (e.g., '5g')")

# --- 2. Master Schema (Matches SSS. Supplement_Staging) ---

class SupplementStagingSchema(BaseModel):
    # Core Identifiers
    supplement_name: str = Field(..., description="The name of the product")
    supplement_brand: str = Field(..., description="The brand manufacturing the product")
    supplement_description: Optional[str] = Field(None, description="Marketing description or product summary found on label")
    
    # JSONB Data:  Ingredients
    supplement_ingredient: List[Ingredient] = Field(default_factory=list)
    
    # JSONB Data: Nutrition
    nutritional_info_per_serving: NutritionFacts = Field(... , description="Facts relative to one serving")
    nutritional_info_per_100g: Optional[NutritionFacts] = Field(None, description="Facts relative to 100g if explicitly stated")
    
    # Serving size info - CRITICAL for calculating per 100g
    serving_size_grams: Optional[float] = Field(None, description="Serving size in grams (e.g., 55 from '2/3 cup (55g)')")
    serving_size_text: Optional[str] = Field(None, description="The serving size text (e.g., '2/3 cup (55g)')")
    
    # Text Metadata
    nutritional_info_per_serving_definition: Optional[str] = Field(None, description="The serving size text (e.g., '1 Scoop (30g)')")
    supplement_warning_label: Optional[str] = Field(None, description="Warnings (e.g., 'Keep out of reach of children', 'Allergen info')")
    supplement_certifications: Optional[str] = Field(None, description="Certifications (e.g., 'NSF', 'GMP', 'Informed Choice')")
    supplement_additional_information: Optional[str] = Field(None, description="Storage instructions or other notes")
    batch_testing_org: Optional[str] = Field(None, description="Organization mentioned for testing (e.g., 'Informed Sport')")