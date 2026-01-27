"""
Enhanced Nutrition Label OCR Workflow using PaddleOCR + GPT-4o-mini.
Replaces the existing nutrition_workflow.py with better implementation.
"""

import os
import json
import re
import cv2
import numpy as np
from dotenv import load_dotenv
from paddleocr import PaddleOCR
from llama_index.core.workflow import (
    StartEvent, StopEvent, Workflow, step, Context, Event
)
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

from app.schemas.ocr_schemas import SupplementStagingSchema

load_dotenv()


# --- Event Definitions ---
class ExtractionEvent(Event):
    """Event containing raw OCR text."""
    raw_text: str


class VectorizationEvent(Event):
    """Event containing structured data ready for vectorization."""
    structured_data: dict


class NutritionWorkflow(Workflow):
    """
    3-step workflow for nutrition label processing:
    1. OCR: Extract text from image using PaddleOCR
    2. Structure: Parse text into structured format using GPT-4o-mini
    3. Vectorize: Generate embeddings and calculate per 100g nutrition
    """
    
    def __init__(self, timeout: int = 120, verbose: bool = True):
        super().__init__(timeout=timeout, verbose=verbose)
        
        # Initialize PaddleOCR with v4 engine
        self.ocr = PaddleOCR(
            use_textline_orientation=True,
            lang='en',
            ocr_version='PP-OCRv4'
        )
        
        # Initialize LLM for text extraction
        self.llm = OpenAI(
            model="gpt-4o-mini", 
            temperature=0,
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Initialize embedding model (384-dimensional)
        self.embed_model = HuggingFaceEmbedding(
            model_name="BAAI/bge-small-en-v1.5"
        )

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
        if not serving_size_grams or serving_size_grams <= 0:
            print("   ⚠️ Cannot calculate per 100g: missing serving size")
            return None
        
        multiplier = 100 / serving_size_grams
        print(f"   📊 Calculating per 100g ({multiplier:.2f}x from {serving_size_grams}g)")
        
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
        Step 1: Extract text from nutrition label image using PaddleOCR.
        
        Process:
        1. Load image
        2. Upscale if too small (< 800px width)
        3. Run OCR with PaddleOCR v4
        4. Filter results by confidence (> 0.5)
        5. Return concatenated text
        """
        image_path = ev.get("image_path")
        
        if not image_path:
            print("❌ Error: No image_path provided")
            return StopEvent(result={"error": "No image_path provided"})

        print(f"\n👁️  [Step 1] Scanning image: {image_path}")
        
        # Load image
        img = cv2.imread(image_path)
        if img is None:
            return StopEvent(result={"error": "Could not read image file"})

        # Upscale if needed for better OCR accuracy
        height, width = img.shape[:2]
        print(f"   📐 Image size: {width}x{height}")
        
        if width < 800: 
            scale = 800 / width
            print(f"   🔎 Upscaling {scale:.1f}x for clarity...")
            img = cv2.resize(
                img, None, 
                fx=scale, fy=scale, 
                interpolation=cv2.INTER_CUBIC
            )

        # Run OCR using NEW predict() API (PaddleOCR v2.8+)
        result = self.ocr.predict(img)
        
        # Extract text from response structure
        if not result or len(result) == 0:
            print("⚠️ CRITICAL: PaddleOCR found NO text")
            return StopEvent(result={"error": "No text detected"})
        
        ocr_result = result[0]
        texts = ocr_result.get('rec_texts', [])
        scores = ocr_result.get('rec_scores', [])
        
        if not texts: 
            print("⚠️ CRITICAL: No text extracted")
            return StopEvent(result={"error": "No text detected"})
        
        # Filter by confidence score (> 0.5)
        filtered_texts = [
            text for text, score in zip(texts, scores)
            if score > 0.5 and len(text.strip()) > 0
        ]
        
        full_text = "\n".join(filtered_texts)
        
        print("-" * 40)
        print("📝 RAW OCR OUTPUT:")
        print(full_text)
        print(f"📊 Total lines: {len(filtered_texts)}")
        print("-" * 40)
            
        return ExtractionEvent(raw_text=full_text)

    @step
    async def structurize_text(
        self, 
        ctx: Context, 
        ev: ExtractionEvent
    ) -> VectorizationEvent: 
        """
        Step 2: Parse OCR text into structured format using GPT-4o-mini.
        
        Uses structured output to ensure consistent schema matching
        SSS.Supplement_Staging table.
        """
        print("🧠 [Step 2] Extracting structured data with GPT-4o-mini...")
        
        sllm = self.llm.as_structured_llm(SupplementStagingSchema)
        
        # Comprehensive extraction prompt with standardized nutrient names
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
{ev.raw_text}
"""
        
        response = sllm.complete(prompt)
        structured_data = json.loads(response.text)
        
        return VectorizationEvent(structured_data=structured_data)

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
        print("🔢 [Step 3] Generating vectors & processing nutrition...")
        
        data = ev.structured_data
        
        # --- NUTRITION PER SERVING ---
        per_serving = data.get('nutritional_info_per_serving', {})
        
        # --- NUTRITION PER 100G ---
        per_100g = data.get('nutritional_info_per_100g')
        serving_size_grams = data.get('serving_size_grams')
        
        # Calculate per 100g if not on label but serving size available
        per_100g_calculated = False
        if not per_100g or not per_100g.get('nutrients'):
            if serving_size_grams: 
                print(f"   🧮 Calculating per 100g from {serving_size_grams}g serving...")
                per_100g = self.calculate_per_100g(per_serving, serving_size_grams)
                per_100g_calculated = True
            else: 
                print("   ⚠️ Cannot calculate per 100g: No serving size")
                per_100g = None
        
        # --- VECTOR 1: Per Serving ---
        print("   🔷 Creating vector for PER SERVING...")
        per_serving_str = json.dumps({
            "nutrients": per_serving.get('nutrients', [])
        })
        vector_per_serving = self.embed_model.get_text_embedding(per_serving_str)
        
        # --- VECTOR 2: Per 100g ---
        if per_100g:
            print("   🔶 Creating vector for PER 100G...")
            per_100g_str = json.dumps({
                "nutrients": per_100g.get('nutrients', [])
            })
            vector_per_100g = self.embed_model.get_text_embedding(per_100g_str)
        else:
            print("   ⚠️ No per 100g data, skipping vector")
            vector_per_100g = None
        
        # --- BUILD FINAL PAYLOAD ---
        final_payload = {
            "supplement_name": data.get('supplement_name'),
            "supplement_brand": data.get('supplement_brand'),
            "supplement_ingredient": data.get('supplement_ingredient'),
            
            # Serving info
            "serving_size_text": data.get('serving_size_text'),
            "serving_size_grams": serving_size_grams,
            
            # Nutrition data
            "nutritional_info_per_serving": per_serving,
            "nutritional_info_per_100g": per_100g,
            "per_100g_calculated": per_100g_calculated,
            
            # TWO vectors (384-dimensional each)
            "vector_per_serving": vector_per_serving,
            "vector_per_100g": vector_per_100g
        }
        
        print("✅ [Step 3] Pipeline Complete!")
        return StopEvent(result=final_payload)