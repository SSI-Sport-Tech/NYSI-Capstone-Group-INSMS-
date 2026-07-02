"""
LLM-powered text structuring with lazy-loaded Ollama qwen3:8b singleton.
Converts raw text strings into structured dicts. No OCR, no vectorization.
"""

import json
import logging
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from app.config.settings import settings

logger = logging.getLogger(__name__)

# Lazy singleton - only loads when first used
_llm_instance = None


def get_llm_instance():
    """
    Lazy-load Ollama LLM instance.

    Returns:
        Ollama: Initialized LLM
    """
    global _llm_instance

    if _llm_instance is None:
        logger.info("🔄 Initializing qwen3:8b LLM via Ollama (lazy load)...")
        from llama_index.llms.ollama import Ollama

        _llm_instance = Ollama(
            model="qwen3:8b",
            base_url="http://localhost:11434",
            temperature=0,
        )
        logger.info("✅ LLM initialized")

    return _llm_instance


def structure_nutrition_text(raw_text: str) -> Dict:
    """
    Parse raw OCR text into structured nutrition data.
    
    Args:
        raw_text: Raw text from OCR or manual input
        
    Returns:
        dict: Structured data matching SupplementStagingSchema
    """
    logger.info("🧠 Structuring nutrition text with LLM...")
    
    # Import here to avoid circular imports
    from app.schemas.supplement import SupplementStagingSchema
    
    llm = get_llm_instance()
    sllm = llm.as_structured_llm(SupplementStagingSchema)
    
    prompt = f"""You are a Data Extraction Engine. Extract nutrition data from OCR text.

Context: This is from a 'Nutrition Facts' or 'Supplement Facts' label.

EXTRACTION RULES:

1. BRAND/NAME: Infer from text. If missing, use 'Generic'.

2. NUTRIENTS: Map lines like 'Total Fat 8g' to 'nutritional_info_per_serving'.
   Format: {{"name": "Fats (g)", "amount": "8"}}

3. STANDARDIZED NUTRIENT NAMES: Use exact names from this list when applicable:
   Energy (kcal), Carbohydrates (g), Glucose (g), Fructose (g), Proteins (g),
   Fats (g), Saturated Fats (g), Fibre (g), Calcium (mg), Sodium (mg),
   Potassium (mg), Iron (mg), Zinc (mg), Vitamin B1 (mg), Vitamin B2 (mg),
   Vitamin B3 (mg), Vitamin B5 (mg), Vitamin B6 (mg), Vitamin B7 (µg),
   Vitamin B9 (µg), Vitamin B12 (µg), Vitamin A (µg), Vitamin C (mg),
   Vitamin D (µg), Vitamin E (mg), Vitamin K1 (µg), etc.

4. SERVING SIZE - CRITICAL:
   - Look for: '2/3 cup (55g)', '1 scoop (30g)', 'Serving Size 28g'
   - Extract gram number into 'serving_size_grams' (e.g., 55, 30, 28)
   - Full text into 'serving_size_text' (e.g., '2/3 cup (55g)')

5. PER 100G: Only extract if explicitly shown on label.
   If NOT shown, leave 'nutritional_info_per_100g' as null.

6. INGREDIENTS: Capture full ingredient list.

7. RETURN VALID DATA: Do not return empty objects if text is visible.

RAW OCR TEXT:
{raw_text}
"""
    
    response = sllm.complete(prompt)
    structured_data = json.loads(response.text)
    
    logger.info(f"✅ Structured: {structured_data.get('supplement_brand', 'Unknown')} - {structured_data.get('supplement_name', 'Unknown')}")
    return structured_data


# Schema for supplement identification (simpler than full nutrition extraction)
class SupplementIdentification(BaseModel):
    """Schema for extracting supplement identity from text."""
    supplement_name: str = Field(..., description="Product name from label")
    supplement_brand: str = Field(..., description="Brand name from label")
    variant: Optional[str] = Field(None, description="Flavor/variant if visible")
    product_type: Optional[str] = Field(None, description="e.g., Whey Protein, Creatine")
    key_identifiers: Optional[List[str]] = Field(None, description="Key identifying words")


def identify_supplement(raw_text: str) -> Dict:
    """
    Extract ONLY supplement name, brand, and variant from raw text.
    Faster than full nutrition extraction - use for batch verification.
    
    Args:
        raw_text: Raw text from OCR or manual input
        
    Returns:
        dict: {"supplement_name", "supplement_brand", "variant", "product_type", "key_identifiers"}
    """
    logger.info("🏷️ Identifying supplement from text...")
    
    llm = get_llm_instance()
    sllm = llm.as_structured_llm(SupplementIdentification)
    
    prompt = f"""Extract the supplement name and brand from this text.

RULES:
1. BRAND NAME: The company/manufacturer - this is CRITICAL for searching
   Examples: "Optimum Nutrition", "MyProtein", "fourfive", "Applied Nutrition", "PhD", "USN"
   
2. PRODUCT NAME: The specific product line/name
   Examples: "Gold Standard Whey", "Impact Whey", "Joint Gel", "Creatine Monohydrate"
   
3. VARIANT: Flavor if visible (e.g., "Vanilla Ice Cream", "Chocolate")

4. PRODUCT TYPE: Category (e.g., "Whey Protein", "Joint Support", "Creatine")

5. KEY IDENTIFIERS: Words that uniquely identify this product

TEXT:
{raw_text}
"""
    
    response = sllm.complete(prompt)
    result = json.loads(response.text)
    
    logger.info(f"✅ Identified: {result.get('supplement_brand')} - {result.get('supplement_name')}")
    return result


def is_loaded() -> bool:
    """Check if LLM is currently loaded in memory."""
    return _llm_instance is not None