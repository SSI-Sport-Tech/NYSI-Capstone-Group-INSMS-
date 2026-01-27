"""
Vectorization service for supplement data.
Generates 384-dimensional embeddings using BAAI/bge-small-en-v1.5.

Aligned with Ryan's webscraper format:
- Flat nutrition dicts: {"Protein (g)": 24.0, "Energy (kcal)": 338}
- Vector field names: vector_100g_ingredient, vector_perserving_ingredient
"""

import json
from typing import List, Dict, Optional
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from app.config.settings import settings


# Singleton instance for reuse
_embed_model = None


def get_embed_model() -> HuggingFaceEmbedding:
    """Get or create singleton embedding model."""
    global _embed_model
    if _embed_model is None:
        _embed_model = HuggingFaceEmbedding(model_name=settings.embedding_model)
    return _embed_model


class SupplementVectorizer:
    """
    Vectorization service for supplement data.
    
    Generates embeddings from:
    - Ingredients list
    - Nutritional info (flat dict format)
    
    Output: 384-dimensional vector
    """
    
    def __init__(self):
        self.embed_model = get_embed_model()
        self.model_name = settings.embedding_model
        self.vector_dimension = settings.vector_dimension
    
    def generate_vector(
        self, 
        ingredients: List[str],
        nutritional_info: Dict[str, float],
        basis: str = "per_100g"
    ) -> List[float]:
        """
        Generate a vector from ingredients + nutritional data.
        
        Args:
            ingredients: List of ingredient names ["Whey Protein", "Cocoa"]
            nutritional_info: Flat dict {"Protein (g)": 24.0, "Energy (kcal)": 338}
            basis: 'per_100g' or 'per_serving'
        
        Returns:
            384-dimensional vector as list of floats
        """
        # Combine into single structure for embedding
        combined_data = {
            "ingredients": ingredients,
            "nutrients": nutritional_info
        }
        
        # Convert to JSON string for embedding
        data_str = json.dumps(combined_data, sort_keys=True)
        
        # Generate embedding
        vector = self.embed_model.get_text_embedding(data_str)
        
        # Verify dimension
        if len(vector) != self.vector_dimension:
            raise ValueError(
                f"Vector dimension mismatch: expected {self.vector_dimension}, "
                f"got {len(vector)}"
            )
        
        return vector
    
    def generate_vectors_for_product(
        self,
        ingredients: List[str],
        per_serving: Optional[Dict[str, float]] = None,
        per_100g: Optional[Dict[str, float]] = None
    ) -> Dict[str, Optional[List[float]]]:
        """
        Generate both vectors for a product (matching Ryan's field names).
        
        Args:
            ingredients: List of ingredient names
            per_serving: Flat nutrition dict per serving
            per_100g: Flat nutrition dict per 100g
            
        Returns:
            {
                "vector_perserving_ingredient": [...] or None,
                "vector_100g_ingredient": [...] or None
            }
        """
        result = {
            "vector_perserving_ingredient": None,
            "vector_100g_ingredient": None
        }
        
        # Generate per serving vector
        if per_serving and len(per_serving) > 0:
            result["vector_perserving_ingredient"] = self.generate_vector(
                ingredients=ingredients,
                nutritional_info=per_serving,
                basis="per_serving"
            )
        
        # Generate per 100g vector
        if per_100g and len(per_100g) > 0:
            result["vector_100g_ingredient"] = self.generate_vector(
                ingredients=ingredients,
                nutritional_info=per_100g,
                basis="per_100g"
            )
        
        return result


# --- Utility Functions ---

def nutrients_list_to_flat_dict(nutrients: List[Dict]) -> Dict[str, float]:
    """
    Convert nutrient list to flat dict (Ryan's format).
    
    Input:  [{"name": "Protein (g)", "amount": 24.0}, ...]
    Output: {"Protein (g)": 24.0, ...}
    """
    result = {}
    
    if not nutrients:
        return result
    
    for nutrient in nutrients:
        name = nutrient.get("name")
        amount = nutrient.get("amount")
        
        if name and amount is not None:
            try:
                result[name] = float(amount)
            except (ValueError, TypeError):
                continue
    
    return result


def flat_dict_to_nutrients_list(flat_dict: Dict[str, float]) -> List[Dict]:
    """
    Convert flat dict to nutrient list (reverse operation).
    
    Input:  {"Protein (g)": 24.0, ...}
    Output: [{"name": "Protein (g)", "amount": 24.0}, ...]
    """
    return [
        {"name": name, "amount": amount}
        for name, amount in flat_dict.items()
    ]