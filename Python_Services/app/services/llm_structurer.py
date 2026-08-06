import os
import re
import json
import logging
import requests
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


def _call_ollama(system_prompt: str, user_prompt: str) -> str:
    """Call Ollama chat API and return response text."""
    ollama_base_url = os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
    ollama_model = os.environ.get("OLLAMA_MODEL", "qwen3:8b")

    response = requests.post(
        f"{ollama_base_url}/api/chat",
        json={
            "model": ollama_model,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0,
                "num_ctx": 32768,
                "num_predict": 4096,
                "think": False,
            },
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
        },
        timeout=120
    )
    response.raise_for_status()
    text = response.json().get("message", {}).get("content", "").strip()

    # Strip thinking tags and markdown fences
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    if text.startswith("```"):
        text = re.sub(r"```(?:json)?\n?", "", text).strip().rstrip("```").strip()

    return text


def structure_nutrition_text(raw_text: str) -> Dict:
    logger.info("🧠 Structuring nutrition text with Ollama...")
    from app.schemas.supplement import SupplementStagingSchema

    schema_fields = list(SupplementStagingSchema.model_fields.keys())

    text = _call_ollama(
        system_prompt="You are a JSON extraction API. Output ONLY raw JSON with no explanation, no reasoning, no markdown.",
        user_prompt=f"""Extract nutrition data from this OCR text. Return ONLY valid JSON.

Context: This is from a 'Nutrition Facts' or 'Supplement Facts' label.

EXTRACTION RULES:

1. BRAND/NAME: Infer from text. If missing, use 'Generic'.

2. NUTRIENTS: Map lines like 'Total Fat 8g' to 'nutritional_info_per_serving'.
   Format: {{"name": "Fats (g)", "amount": "8"}}
   CRITICAL: The "amount" field MUST always include the unit (e.g. "8g", "160mg", "5000mg", "2.5kcal").
   Never return a bare number — always append the unit: "5000mg" not "5000", "5g" not "5".
   If the label shows milligrams, use "mg". If grams, use "g". If kcal, use "kcal".

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
    )

    structured_data = json.loads(text)
    logger.info(f"✅ Structured: {structured_data.get('supplement_brand', 'Unknown')} - {structured_data.get('supplement_name', 'Unknown')}")
    return structured_data


class SupplementIdentification(BaseModel):
    supplement_name: str = Field(..., description="Product name from label")
    supplement_brand: str = Field(..., description="Brand name from label")
    variant: Optional[str] = Field(None, description="Flavor/variant if visible")
    product_type: Optional[str] = Field(None, description="e.g., Whey Protein, Creatine")
    key_identifiers: Optional[List[str]] = Field(None, description="Key identifying words")


def identify_supplement(raw_text: str) -> Dict:
    logger.info("🏷️ Identifying supplement from text with Ollama...")

    text = _call_ollama(
        system_prompt="You are a JSON extraction API. Output ONLY raw JSON with no explanation, no reasoning, no markdown.",
        user_prompt=f"""Extract supplement name and brand from this text. Return ONLY valid JSON.

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
    )

    result = json.loads(text)
    logger.info(f"✅ Identified: {result.get('supplement_brand')} - {result.get('supplement_name')}")
    return result


def is_loaded() -> bool:
    """Check if Ollama is reachable."""
    try:
        ollama_base_url = os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
        requests.get(f"{ollama_base_url}/api/tags", timeout=3)
        return True
    except Exception:
        return False