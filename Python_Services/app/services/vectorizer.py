import json
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from typing import List, Dict
from app.config.settings import settings

class SupplementVectorizer:
    """Reusable vectorization service for supplement data"""
    
    def __init__(self):
        self.embed_model = HuggingFaceEmbedding(
            model_name=settings.embedding_model
        )
        self.model_name = settings.embedding_model
        self.vector_dimension = settings.vector_dimension
    
    def generate_vector(
        self, 
        ingredients: List[str],
        nutritional_info: Dict,
        basis: str
    ) -> List[float]:
        """
        Generate a single vector from ingredients + nutritional data.
        
        Args:
            ingredients: List of ingredient names
            nutritional_info: Dict with 'calories' and 'nutrients'
            basis: 'per_100g' or 'per_serving'
        
        Returns:
            384-dimensional vector as list of floats
        """
        
        # Combine ingredients + nutrition into single structure
        combined_data = {
            "ingredients": ingredients,
            "calories": nutritional_info.get('calories'),
            "nutrients": nutritional_info.get('nutrients', [])
        }
        
        # Convert to JSON string
        data_str = json.dumps(combined_data)
        
        # Generate embedding
        vector = self.embed_model.get_text_embedding(data_str)
        
        # Verify dimension
        if len(vector) != self.vector_dimension:
            raise ValueError(
                f"Vector dimension mismatch: expected {self.vector_dimension}, "
                f"got {len(vector)}"
            )
        
        return vector