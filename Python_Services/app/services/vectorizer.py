import json
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from typing import List, Dict
from app.config.settings import settings

def nutrients_list_to_flat_dict(nutrients) -> dict:
    """
    Converts various nutrient formats (list/dict) to flat dict: {"Protein (g)": 24.0}
    """
    if not nutrients:
        return {}
    if isinstance(nutrients, dict) and "nutrients" in nutrients:
        nutrients = nutrients.get("nutrients", [])
    if isinstance(nutrients, dict):
        # Already flat
        return {k: float(v) for k, v in nutrients.items() if v is not None}
    flat = {}
    for item in nutrients:
        if isinstance(item, dict):
            name = item.get("name")
            amount = item.get("amount")
            if name and amount is not None:
                try:
                    import re
                    match = re.search(r'[\d.]+', str(amount))
                    flat[name] = float(match.group()) if match else None
                except Exception:
                    continue
    return {k: v for k, v in flat.items() if v is not None}

class SupplementVectorizer:
    """Single-vector interface for supplement data."""
    def __init__(self):
        self.embed_model = HuggingFaceEmbedding(model_name=settings.embedding_model)
        self.model_name = settings.embedding_model
        self.vector_dimension = settings.vector_dimension

    def generate_vector(self, ingredients: List[str], nutritional_info: Dict) -> List[float]:
        """Generate a vector from ingredients and flat nutrition dict."""
        nutrients_flat = nutrients_list_to_flat_dict(nutritional_info)
        combined = {
            "ingredients": ingredients,
            "nutrients": nutrients_flat
        }
        data_str = json.dumps(combined, sort_keys=True)
        return self.embed_model.get_text_embedding(data_str)

vectorizer = SupplementVectorizer()