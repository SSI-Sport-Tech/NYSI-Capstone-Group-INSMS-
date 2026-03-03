"""
Vectorizer service for supplements.

✅ Updated for editable OCR flow:
- Keep vectorization separate from OCR (vectorize structured JSON only)
- Lazy-load embedding model (avoid loading HF model at import time)
- Robust handling of ingredients (string/list) + nutrient formats

Embedding model: settings.embedding_model
Vector dimension: settings.vector_dimension
"""

from __future__ import annotations

import json
import re
import logging
from typing import Any, Dict, List, Optional, Union

from app.config.settings import settings

logger = logging.getLogger(__name__)

# Lazy singleton for heavy embedding model
_embed_model = None


def _get_embed_model():
    global _embed_model
    if _embed_model is None:
        logger.info("🔄 Loading embedding model (lazy load): %s", settings.embedding_model)
        from llama_index.embeddings.huggingface import HuggingFaceEmbedding
        _embed_model = HuggingFaceEmbedding(model_name=settings.embedding_model)
        logger.info("✅ Embedding model loaded")
    return _embed_model


def _parse_numeric_amount(amount: Any) -> Optional[float]:
    """
    Best-effort numeric parsing from '8g', '160mg', '<1g', '0.5', etc.
    Returns float or None.
    """
    if amount is None:
        return None
    if isinstance(amount, (int, float)):
        return float(amount)

    s = str(amount).strip().lower()
    if not s:
        return None

    # Find first number (supports decimals)
    m = re.search(r"(\d+(?:\.\d+)?)", s)
    if not m:
        return None
    try:
        return float(m.group(1))
    except Exception:
        return None


def nutrients_list_to_flat_dict(nutrients: Any) -> Dict[str, float]:
    """
    Converts common nutrient formats into a flat dict:

    Accepts:
    - {"nutrients":[{"name":"Protein","amount":"24g"}]}
    - [{"name":"Protein","amount":"24g"}]
    - {"Protein": 24, "Fat": "3g"}  (already flat)

    Returns:
    - {"Protein": 24.0, "Fat": 3.0}
    """
    if not nutrients:
        return {}

    # Case: dict with "nutrients" list inside
    if isinstance(nutrients, dict) and "nutrients" in nutrients:
        nutrients = nutrients.get("nutrients", [])

    # Case: already flat dict
    if isinstance(nutrients, dict):
        flat: Dict[str, float] = {}
        for k, v in nutrients.items():
            num = _parse_numeric_amount(v)
            if num is not None:
                flat[str(k)] = float(num)
        return flat

    # Case: list of nutrient objects
    if isinstance(nutrients, list):
        flat = {}
        for item in nutrients:
            if not isinstance(item, dict):
                continue
            name = item.get("name")
            amount = item.get("amount")
            if not name:
                continue
            num = _parse_numeric_amount(amount)
            if num is None:
                continue
            flat[str(name)] = float(num)
        return flat

    return {}


def _normalize_ingredients(ingredients: Union[str, List[Any], None]) -> List[str]:
    """
    Normalize ingredients into a list of clean strings.
    Handles:
    - None
    - "Water, Sugar, Salt"
    - ["Water", "Sugar", "Salt"]
    """
    if ingredients is None:
        return []

    if isinstance(ingredients, list):
        out = []
        for x in ingredients:
            if x is None:
                continue
            s = str(x).strip()
            if s:
                out.append(s)
        return out

    # string → split on commas/semicolons/newlines
    s = str(ingredients).strip()
    if not s:
        return []
    parts = re.split(r"[,\n;]+", s)
    return [p.strip() for p in parts if p.strip()]


class SupplementVectorizer:
    """
    Single-vector interface for supplement data.
    Produces embeddings from:
      - ingredients (list)
      - nutrients (flat dict derived from label)
    """
    def __init__(self):
        # Do NOT load the model here (lazy)
        self.model_name = settings.embedding_model
        self.vector_dimension = settings.vector_dimension

    def generate_vector(
        self,
        ingredients: Union[str, List[Any], None],
        nutritional_info: Any,
    ) -> List[float]:
        """
        Generate a vector from ingredients + nutrition.

        Args:
            ingredients: list or comma-separated string
            nutritional_info: dict/list in common formats

        Returns:
            embedding vector (list of floats)
        """
        embed_model = _get_embed_model()

        ingredients_norm = _normalize_ingredients(ingredients)
        nutrients_flat = nutrients_list_to_flat_dict(nutritional_info)

        combined = {
            "ingredients": ingredients_norm,
            "nutrients": nutrients_flat,
        }

        # Stable stringify
        data_str = json.dumps(combined, sort_keys=True, ensure_ascii=False)
        return embed_model.get_text_embedding(data_str)


# Optional singleton accessor (recommended for API usage)
_vectorizer_instance: Optional[SupplementVectorizer] = None


def get_vectorizer() -> SupplementVectorizer:
    global _vectorizer_instance
    if _vectorizer_instance is None:
        _vectorizer_instance = SupplementVectorizer()
    return _vectorizer_instance