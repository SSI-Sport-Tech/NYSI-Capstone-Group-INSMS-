"""
Nutrition Label OCR Workflow using modular services.
Now uses lazy-loaded ocr_engine, llm_structurer, and vectorizer singletons.

This workflow can accept either:
1. image_path - runs OCR → Structure → Vectorize
2. raw_text - skips OCR, runs Structure → Vectorize directly
"""

from llama_index.core.workflow import (
    StartEvent, StopEvent, Workflow, step, Context, Event
)
import json
import re
import logging

# Import modular services (lazy-loaded singletons)
from app.services import ocr_engine, llm_structurer
from app.services.vectorizer import SupplementVectorizer

logger = logging.getLogger(__name__)


# ============================================================================
# EVENT DEFINITIONS
# ============================================================================

class ExtractionEvent(Event):
    """Event containing raw OCR text."""
    raw_text: str


class VectorizationEvent(Event):
    """Event containing structured data ready for vectorization."""
    structured_data: dict


# ============================================================================
# WORKFLOW CLASS
# ============================================================================

class NutritionWorkflow(Workflow):
    """
    3-step workflow for nutrition label processing:
    1. OCR: Extract text from image (uses ocr_engine module - lazy loaded)
    2. Structure: Parse text into structured format (uses llm_structurer module - lazy loaded)
    3. Vectorize: Generate embeddings and calculate per 100g nutrition
    
    Now supports two input modes:
    - image_path: Full pipeline (OCR → Structure → Vectorize)
    - raw_text: Skip OCR (Structure → Vectorize only)
    """
    
    def __init__(self, timeout: int = 120, verbose: bool = True):
        super().__init__(timeout=timeout, verbose=verbose)
        
        # NO initialization of PaddleOCR, LLM, or embeddings here!
        # All components use lazy-loaded singletons from modular services
        
        # Vectorizer is lightweight, can initialize here or lazy-load
        self._vectorizer = None
    
    @property
    def vectorizer(self) -> SupplementVectorizer:
        """Lazy-load vectorizer on first use."""
        if self._vectorizer is None:
            logger.info("🔄 Initializing vectorizer (lazy load)...")
            self._vectorizer = SupplementVectorizer()
        return self._vectorizer

    def parse_amount(self, amount) -> tuple:
        """
        Parse nutrient amount string into (value, unit) tuple.
        
        Examples:
            '8g' -> (8.0, 'g')
            '160mg' -> (160.0, 'mg')
            '<1g' -> (1.0, 'g')
            '0.5g' -> (0.5, 'g')
        
        Returns:
            tuple: (float value, str unit) or (0, '') if parsing fails
        """
        if amount is None:
            return 0, ''

        # Handle numeric values (assume grams unless specified)
        if isinstance(amount, (int, float)):
            return float(amount), ''

        if not isinstance(amount, str):
            amount = str(amount)

        amount = amount.strip().lower()
        if not amount:
            return 0, ''

        # Match patterns: <1g, 8g, 160mg, 0.5g, 2mcg
        match = re.match(
            r'[<]?\s*(\d+(?:\.\d+)?)\s*(mg|g|mcg|ug|μg|kcal|cal)?',
            amount
        )

        if match:
            value = float(match.group(1))
            unit = match.group(2) or ''
            return value, unit
        
        return 0, ''

    def format_amount(self, value: float, unit: str) -> str:
        """Format numeric value back to string with unit."""
        if value == int(value):
            return f"{int(value)}{unit}"
        return f"{value:.2f}".rstrip('0').rstrip('.') + unit

    def calculate_per_100g(
        self, 
        per_serving: dict, 
        serving_size_grams: float
    ) -> dict:
        """
        Calculate per 100g nutrition from per serving data.
        
        Formula: per_100g = (per_serving / serving_size_grams) * 100
        
        Args:
            per_serving: Nutrition facts per serving
            serving_size_grams: Serving size in grams
            
        Returns:
            dict: Nutrition facts scaled to 100g or None if calculation fails
        """
        # Handle list input — wrap it
        if isinstance(per_serving, list):
            per_serving = {"nutrients": per_serving}
        if not per_serving or not isinstance(per_serving, dict):
            return {"nutrients": []}
        
        if not serving_size_grams or serving_size_grams <= 0:
            logger.warning("Cannot calculate per 100g: missing serving size")
            return None
            
        
        multiplier = 100 / serving_size_grams
        logger.info(f"📊 Calculating per 100g ({multiplier:.2f}x from {serving_size_grams}g)")
        
        per_100g = {"nutrients": []}
        
        # Convert each nutrient
        for nutrient in per_serving.get('nutrients', []):
            amount_str = nutrient.get('amount', '')
            value, unit = self.parse_amount(amount_str)
            
            if value > 0:
                new_value = value * multiplier
                # Format nicely
                if new_value == int(new_value):
                    new_amount = f"{int(new_value)}{unit}"
                else: 
                    new_amount = f"{new_value:.1f}{unit}"
            else:
                new_amount = amount_str  # Keep original if can't parse
            
            per_100g['nutrients'].append({
                "name": nutrient.get('name'),
                "amount": new_amount,
                "daily_value": None  # DV doesn't apply to per 100g
            })
        
        return per_100g

    @step
    async def ingest_and_ocr(
        self, 
        ctx: Context, 
        ev: StartEvent
    ) -> ExtractionEvent:
        """
        Step 1: Extract text from nutrition label image OR use provided text.
        
        Supports two input modes:
        - image_path: Run OCR using ocr_engine module (lazy-loaded PaddleOCR)
        - raw_text: Skip OCR entirely, use provided text
        
        This allows the workflow to be used both for image processing
        AND for re-processing edited/corrected text.
        """
        # Check if raw_text is provided directly (skip OCR)
        raw_text = ev.get("raw_text")
        if raw_text:
            logger.info("📝 [Step 1] Using provided raw text (skipping OCR)")
            logger.info(f"   Text length: {len(raw_text)} chars")
            return ExtractionEvent(raw_text=raw_text)
        
        # Otherwise, run OCR on image
        image_path = ev.get("image_path")
        
        if not image_path:
            logger.error("No image_path or raw_text provided")
            return StopEvent(result={"error": "No image_path or raw_text provided"})

        logger.info(f"👁️ [Step 1] Scanning image: {image_path}")
        
        try:
            # Use modular ocr_engine (lazy-loaded PaddleOCR singleton)
            full_text = ocr_engine.extract_text(image_path)
            
            logger.info("-" * 40)
            logger.info("📝 RAW OCR OUTPUT:")
            logger.info(full_text)
            logger.info(f"📊 Total lines: {len(full_text.split(chr(10)))}")
            logger.info("-" * 40)
            
            return ExtractionEvent(raw_text=full_text)
            
        except ValueError as e:
            logger.error(f"OCR failed: {str(e)}")
            return StopEvent(result={"error": f"OCR failed: {str(e)}"})
        except Exception as e:
            logger.error(f"Unexpected OCR error: {str(e)}")
            return StopEvent(result={"error": f"OCR error: {str(e)}"})

    @step
    async def structurize_text(
        self, 
        ctx: Context, 
        ev: ExtractionEvent
    ) -> VectorizationEvent: 
        """
        Step 2: Parse OCR text into structured format using GPT-4o-mini.
        
        Uses llm_structurer module (lazy-loaded LLM singleton).
        """
        logger.info("🧠 [Step 2] Extracting structured data with GPT-4o-mini...")
        
        try:
            # Use modular llm_structurer (lazy-loaded LLM singleton)
            structured_data = llm_structurer.structure_nutrition_text(ev.raw_text)
            
            logger.info(f"✅ Structured: {structured_data.get('supplement_brand', 'Unknown')} - {structured_data.get('supplement_name', 'Unknown')}")
            
            return VectorizationEvent(structured_data=structured_data)
            
        except Exception as e:
            logger.error(f"LLM structuring failed: {str(e)}")
            return StopEvent(result={"error": f"Text structuring failed: {str(e)}"})

    @step
    async def vectorize_ingredients(
        self, 
        ctx: Context, 
        ev: VectorizationEvent
    ) -> StopEvent:
        """
        Step 3: Generate vector embeddings and calculate per 100g if needed.
        
        Creates TWO vector embeddings:
        1. vector_per_serving: Based on per-serving nutrition
        2. vector_per_100g: Based on per-100g nutrition (calculated if needed)
        
        Embedding: BAAI/bge-small-en-v1.5 (384-dimensional)
        """
        logger.info("🔢 [Step 3] Generating vectors & processing nutrition...")
        
        data = ev.structured_data
        
        # --- NUTRITION PER SERVING ---
        per_serving = data.get('nutritional_info_per_serving', {})
        if isinstance(per_serving, list):
            per_serving = {"nutrients": per_serving}
        if not isinstance(per_serving, dict):
            per_serving = {"nutrients": []}
        
        # --- NUTRITION PER 100G ---
        per_100g = data.get('nutritional_info_per_100g')
        if isinstance(per_100g, list):
            per_100g = {"nutrients": per_100g}
        serving_size_grams = data.get('serving_size_grams')
        
        # Calculate per 100g if not on label but serving size available
        per_100g_calculated = False
        if not per_100g or not per_100g.get('nutrients'):
            if serving_size_grams: 
                logger.info(f"🧮 Calculating per 100g from {serving_size_grams}g serving...")
                per_100g = self.calculate_per_100g(per_serving, serving_size_grams)
                per_100g_calculated = True
            else: 
                logger.warning("Cannot calculate per 100g: No serving size")
                per_100g = None
        
        # --- VECTOR 1: Per Serving ---
        logger.info("🔷 Creating vector for PER SERVING...")
        vector_per_serving = self.vectorizer.generate_vector(
            ingredients=data.get('supplement_ingredient'),
            nutritional_info=per_serving
        )
        
        # --- VECTOR 2: Per 100g ---
        vector_per_100g = None
        if per_100g:
            logger.info("🔶 Creating vector for PER 100G...")
            vector_per_100g = self.vectorizer.generate_vector(
                ingredients=data.get('supplement_ingredient'),
                nutritional_info=per_100g
            )
        else:
            logger.warning("No per 100g data, skipping vector")
        
        # --- BUILD FINAL PAYLOAD ---
        final_payload = {
            "supplement_name": data.get('supplement_name'),
            "supplement_brand": data.get('supplement_brand'),
            "supplement_description": data.get('supplement_description'),
            "supplement_ingredient": data.get('supplement_ingredient'),
            
            # Serving info
            "serving_size_text": data.get('serving_size_text'),
            "serving_size_grams": serving_size_grams,
            "nutritional_info_per_serving_definition": data.get('nutritional_info_per_serving_definition'),
            
            # Nutrition data
            "nutritional_info_per_serving": per_serving,
            "nutritional_info_per_100g": per_100g,
            "per_100g_calculated": per_100g_calculated,
            
            # Additional fields
            "supplement_warning_label": data.get('supplement_warning_label'),
            "supplement_certifications": data.get('supplement_certifications'),
            "supplement_additional_information": data.get('supplement_additional_information'),
            "batch_testing_org": data.get('batch_testing_org'),
            
            # TWO vectors (384-dimensional each)
            "vector_per_serving": vector_per_serving,
            "vector_per_100g": vector_per_100g
        }
        
        logger.info("✅ [Step 3] Pipeline Complete!")
        return StopEvent(result=final_payload)


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

async def process_nutrition_image(image_path: str, timeout: int = 120) -> dict:
    """
    Convenience function to process a nutrition label image.
    
    Args:
        image_path: Path to the image file
        timeout: Workflow timeout in seconds
        
    Returns:
        dict: Processed nutrition data with vectors
    """
    workflow = NutritionWorkflow(timeout=timeout, verbose=False)
    result = await workflow.run(image_path=image_path)
    return result


async def process_nutrition_text(raw_text: str, timeout: int = 60) -> dict:
    """
    Convenience function to process raw nutrition text (no OCR).
    
    Args:
        raw_text: Raw text containing nutrition information
        timeout: Workflow timeout in seconds
        
    Returns:
        dict: Processed nutrition data with vectors
    """
    workflow = NutritionWorkflow(timeout=timeout, verbose=False)
    result = await workflow.run(raw_text=raw_text)
    return result