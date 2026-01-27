"""
Nutrition Label OCR Workflow using PaddleOCR + GPT-4o-mini.
Output format aligned with Ryan's webscraper schema.
"""

import os
import json
import re
import cv2
from dotenv import load_dotenv
from paddleocr import PaddleOCR
from app.schemas.ocr_schemas import SupplementStagingSchema
from app.services.vectorizer import nutrients_list_to_flat_dict
from llama_index.core.workflow import (
    StartEvent, StopEvent, Workflow, step, Context, Event
)
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

from app.schemas.ocr_schemas import SupplementStagingSchema
from app.services.vectorizer import nutrients_list_to_flat_dict

load_dotenv()


# --- Event Definitions ---
class ExtractionEvent(Event):
    raw_text: str


class VectorizationEvent(Event):
    structured_data: dict


class NutritionWorkflow(Workflow):
    """
    3-step workflow for nutrition label processing:
    1. OCR: Extract text from image using PaddleOCR
    2. Structure: Parse text into structured format using GPT-4o-mini
    3. Vectorize: Generate embeddings and calculate per 100g nutrition
    
    Output format matches Ryan's webscraper schema.
    """
    
    def __init__(self, timeout: int = 120, verbose: bool = True):
        super().__init__(timeout=timeout, verbose=verbose)
        
        self.ocr = PaddleOCR(
            use_textline_orientation=True,
            lang='en',
            ocr_version='PP-OCRv4'
        )
        
        self.llm = OpenAI(
            model="gpt-4o-mini", 
            temperature=0,
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        self.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")

    def parse_amount(self, amount) -> tuple:
        """Parse amount string into (value, unit) tuple."""
        if amount is None:
            return 0, ''
        
        if isinstance(amount, (int, float)):
            return float(amount), ''
        
        if not isinstance(amount, str):
            amount = str(amount)
        
        amount = amount.strip().lower()
        if not amount:
            return 0, ''
        
        match = re.match(
            r'[<]?\s*(\d+(?:\.\d+)?)\s*(mg|g|mcg|ug|μg|kcal|cal)?',
            amount
        )
        
        if match:
            value = float(match.group(1))
            unit = match.group(2) or ''
            return value, unit
        return 0, ''

    def calculate_per_100g(
        self, 
        per_serving: dict, 
        serving_size_grams: float
    ) -> dict:
        """
        Calculate per 100g nutrition from per serving data.
        Returns FLAT dict format matching Ryan's schema.
        """
        if not serving_size_grams or serving_size_grams <= 0:
            print("   ⚠️ Cannot calculate per 100g: missing serving size")
            return {}
        
        multiplier = 100 / serving_size_grams
        print(f"   📊 Calculating per 100g (multiplier: {multiplier:.2f}x from {serving_size_grams}g)")
        
        per_100g = {}
        
        for nutrient in per_serving.get('nutrients', []):
            name = nutrient.get('name')
            amount = nutrient.get('amount')
            
            if not name:
                continue
            
            value, unit = self.parse_amount(amount)
            
            if value > 0:
                new_value = value * multiplier
                # Round to 1 decimal place
                per_100g[name] = round(new_value, 1)
        
        return per_100g

    @step
    async def ingest_and_ocr(self, ctx: Context, ev: StartEvent) -> ExtractionEvent:
        """Step 1: Extract text from image using PaddleOCR."""
        image_path = ev.get("image_path")
        
        if not image_path:
            print("❌ Error: No image_path provided")
            return StopEvent(result={"error": "No image_path provided"})

        print(f"\n👁️  [Step 1] Scanning image: {image_path}")
        
        img = cv2.imread(image_path)
        if img is None:
            return StopEvent(result={"error": "Could not read image file"})

        height, width = img.shape[:2]
        print(f"   📐 Image size: {width}x{height}")
        
        if width < 800:
            scale = 800 / width
            print(f"   🔎 Upscaling {scale:.1f}x for clarity...")
            img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

        result = self.ocr.predict(img)
        
        if not result or len(result) == 0:
            print("⚠️ CRITICAL: PaddleOCR found NO text")
            return StopEvent(result={"error": "No text detected"})
        
        ocr_result = result[0]
        texts = ocr_result.get('rec_texts', [])
        scores = ocr_result.get('rec_scores', [])
        
        if not texts:
            print("⚠️ CRITICAL: No text extracted")
            return StopEvent(result={"error": "No text detected"})
        
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
    async def structurize_text(self, ctx: Context, ev: ExtractionEvent) -> VectorizationEvent:
        """Step 2: Parse OCR text into structured format using GPT-4o-mini."""
        print("🧠 [Step 2] Extracting structured data...")
        
        sllm = self.llm.as_structured_llm(SupplementStagingSchema)
        
        prompt = f"""You are a Data Extraction Engine. Extract nutrition data from OCR text.

RULES:

1. BRAND/NAME: Infer from text. If missing, use 'Generic'.

2. NUTRIENTS: Extract as list with standardized names.
   Format: {{"name": "Protein (g)", "amount": 24.0}}

3. STANDARDIZED NUTRIENT NAMES (use exact names, convert units):
   Energy (kcal), Carbohydrates (g), Glucose (g), Fructose (g), Proteins (g),
   Fats (g), Saturated Fats (g), Fibre (g), Calcium (mg), Sodium (mg),
   Potassium (mg), Iron (mg), Zinc (mg), Vitamin B1 (mg), Vitamin B2 (mg),
   Vitamin B3 (mg), Vitamin B5 (mg), Vitamin B6 (mg), Vitamin B7 (µg),
   Vitamin B9 (µg), Vitamin B12 (µg), Vitamin A (µg), Vitamin C (mg),
   Vitamin D (µg), Vitamin E (mg), Vitamin K1 (µg), Vitamin K2 (µg)

4. SERVING SIZE - CRITICAL:
   - Extract gram number into 'serving_size_grams' (e.g., 55, 30, 28)
   - Full text into 'serving_size_text' (e.g., '2/3 cup (55g)')

5. PER 100g: Only extract if explicitly shown on label.

6. INGREDIENTS: Capture full ingredient list.

RAW OCR TEXT:
{ev.raw_text}
"""
        
        response = sllm.complete(prompt)
        structured_data = json.loads(response.text)
        
        return VectorizationEvent(structured_data=structured_data)

    @step
    async def vectorize_ingredients(self, ctx: Context, ev: VectorizationEvent) -> StopEvent:
        """
        Step 3: Generate vectors and format output to match Ryan's schema.
        
        Output format:
        - Per 100g / Per Serving Size: FLAT dicts like {"Protein (g)": 24.0}
        - Vectors: vector_100g_ingredient, vector_perserving_ingredient
        """
        print("🔢 [Step 3] Processing nutrition & generating vectors...")
        
        data = ev.structured_data
        
        # --- Extract ingredients as list of strings ---
        ingredients_raw = data.get('supplement_ingredient', [])
        ingredients = [
            ing.get('name') if isinstance(ing, dict) else str(ing)
            for ing in ingredients_raw
        ]
        
        # --- NUTRITION PER SERVING (convert to flat dict) ---
        per_serving_raw = data.get('nutritional_info_per_serving', {})
        per_serving_flat = nutrients_list_to_flat_dict(
            per_serving_raw.get('nutrients', [])
        )
        
        # --- NUTRITION PER 100G ---
        per_100g_raw = data.get('nutritional_info_per_100g')
        serving_size_grams = data.get('serving_size_grams')
        per_100g_calculated = False
        
        # Try to get from label first
        if per_100g_raw and per_100g_raw.get('nutrients'):
            per_100g_flat = nutrients_list_to_flat_dict(
                per_100g_raw.get('nutrients', [])
            )
        # Otherwise calculate from per serving
        elif serving_size_grams and per_serving_flat:
            print(f"   🧮 Calculating per 100g from {serving_size_grams}g serving...")
            per_100g_flat = self.calculate_per_100g(per_serving_raw, serving_size_grams)
            per_100g_calculated = True
        else:
            print("   ⚠️ Cannot calculate per 100g: No serving size")
            per_100g_flat = {}
        
        # --- VECTOR 1: Per Serving ---
        vector_perserving = None
        if per_serving_flat:
            print("   🔷 Creating vector for PER SERVING...")
            per_serving_str = json.dumps({
                "ingredients": ingredients,
                "nutrients": per_serving_flat
            }, sort_keys=True)
            vector_perserving = self.embed_model.get_text_embedding(per_serving_str)
        
        # --- VECTOR 2: Per 100g ---
        vector_100g = None
        if per_100g_flat:
            print("   🔶 Creating vector for PER 100G...")
            per_100g_str = json.dumps({
                "ingredients": ingredients,
                "nutrients": per_100g_flat
            }, sort_keys=True)
            vector_100g = self.embed_model.get_text_embedding(per_100g_str)
        else:
            print("   ⚠️ No per 100g data, skipping vector")
        
        # --- BUILD FINAL PAYLOAD (Ryan's format) ---
        final_payload = {
            # Product info
            "Name": data.get('supplement_name'),
            "Brand": data.get('supplement_brand'),
            "Description": data.get('supplement_description'),
            "Ingredients": ingredients,
            
            # Serving info
            "Serving Size": data.get('serving_size_text'),
            "serving_size_grams": serving_size_grams,
            
            # Nutrition data (FLAT dicts - Ryan's format)
            "Per Serving Size": per_serving_flat,
            "Per 100g": per_100g_flat,
            "per_100g_calculated": per_100g_calculated,
            
            # Metadata
            "Warnings": data.get('supplement_warning_label'),
            "Certifications": data.get('supplement_certifications'),
            "Additional Information": data.get('supplement_additional_information'),
            
            # Vectors (Ryan's field names)
            "vector_perserving_ingredient": vector_perserving,
            "vector_100g_ingredient": vector_100g,
            
            # Source marker
            "Nutrition_Source": "OCR"
        }
        
        print("✅ [Step 3] Pipeline Complete!")
        return StopEvent(result=final_payload)