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
from app.schemas.supplement import SupplementStagingSchema
from app.config.settings import settings

load_dotenv()

# --- Event Definitions ---
class ExtractionEvent(Event):
    raw_text: str

class VectorizationEvent(Event):
    structured_data: dict

class NutritionWorkflow(Workflow):
    def __init__(self, timeout: int = 120, verbose: bool = True):
        super().__init__(timeout=timeout, verbose=verbose)
        
        # PaddleOCR 3.3.3 compatible initialization
        self.ocr = PaddleOCR(
            use_angle_cls=True,
            lang='en',
            use_gpu=False
        )
        
        self.llm = OpenAI(
            model="gpt-4o-mini", 
            temperature=0,
            api_key=settings.openai_api_key
        )
        
        self.embed_model = HuggingFaceEmbedding(
            model_name=settings.embedding_model
        )


    def parse_amount(self, amount_str: str) -> tuple: 
        """
        Parse an amount string like '8g', '160mg', '2mcg' into (value, unit).
        Returns (0, '') if parsing fails.
        """
        if not amount_str:
            return 0, ''
        
        # Match patterns like:  8g, 160mg, 2. 5mcg, 0.5g, <1g
        match = re.match(r'[<]? (\d+\. ?\d*)\s*(mg|g|mcg|ug|μg|kcal|cal)?', amount_str. lower().strip())
        if match:
            value = float(match.group(1))
            unit = match.group(2) or ''
            return value, unit
        return 0, ''

    def format_amount(self, value: float, unit: str) -> str:
        """Format a numeric value back to string with unit."""
        if value == int(value):
            return f"{int(value)}{unit}"
        return f"{value:. 2f}".rstrip('0').rstrip('. ') + unit

    def calculate_per_100g(self, per_serving: dict, serving_size_grams: float) -> dict:
        """
        Calculate per 100g nutrition from per serving data.
        Formula: per_100g = (per_serving / serving_size_grams) * 100
        """
        if not serving_size_grams or serving_size_grams <= 0:
            print("   ⚠️ Cannot calculate per 100g: missing serving size in grams")
            return None
        
        multiplier = 100 / serving_size_grams
        print(f"   📊 Calculating per 100g (multiplier: {multiplier:.2f}x from {serving_size_grams}g serving)")
        
        per_100g = {
            "calories": None,
            "nutrients": []
        }
        
        # Convert calories
        if per_serving. get('calories'):
            try:
                cal_value = float(str(per_serving['calories']).replace('kcal', '').strip())
                per_100g['calories'] = round(cal_value * multiplier)
            except (ValueError, TypeError):
                per_100g['calories'] = per_serving['calories']
        
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
                "daily_value":  None  # DV doesn't apply to per 100g
            })
        
        return per_100g

    @step
    async def ingest_and_ocr(self, ctx: Context, ev: StartEvent) -> ExtractionEvent:
        """Step 1: Ingest and OCR using the NEW PaddleOCR API."""
        image_path = ev.get("image_path")
        
        if not image_path:
             print("❌ Error: No image_path provided.")
             return None

        print(f"\n👁️  [Step 1] Scanning image: {image_path}")
        
        # 1. Read image
        img = cv2.imread(image_path)
        if img is None:
            return StopEvent(result={"error": "Could not read image file."})

        # 2. Upscale logic (if needed)
        height, width = img.shape[:2]
        print(f"   📐 Image size: {width}x{height}")
        
        if width < 800: 
            scale = 800 / width
            print(f"   🔎 Upscaling {scale:.1f}x for clarity...")  # FIXED: removed space
            img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

        # 3. Run OCR using NEW predict() method
        result = self.ocr.predict(img)
        
        # 4. Extract text from NEW API response structure
        if not result or len(result) == 0:
            print("⚠️ CRITICAL:  PaddleOCR found NO text.  Check image quality.")
            return StopEvent(result={"error": "No text detected."})
        
        # Get the first result (for single image)
        ocr_result = result[0]
        
        # Extract texts and scores
        texts = ocr_result.get('rec_texts', [])
        scores = ocr_result.get('rec_scores', [])
        
        if not texts: 
            print("⚠️ CRITICAL: No text extracted from image.")
            return StopEvent(result={"error": "No text detected."})
        
        # 5. Filter by confidence score
        filtered_texts = []
        for text, score in zip(texts, scores):
            if score > 0.5 and len(text. strip()) > 0:
                filtered_texts.append(text)
        
        full_text = "\n".join(filtered_texts)
        
        print("-" * 40)
        print("📝 RAW OCR OUTPUT:")
        print(full_text)
        print(f"📊 Total lines detected: {len(filtered_texts)}")
        print("-" * 40)
            
        return ExtractionEvent(raw_text=full_text)

    @step
    async def structurize_text(self, ctx: Context, ev: ExtractionEvent) -> VectorizationEvent: 
        """Step 2: Uses OpenAI to clean text into the SQL-matching Schema."""
        print("🧠 [Step 2] OpenAI is extracting metadata...")
        
        sllm = self.llm. as_structured_llm(SupplementStagingSchema)
        
        prompt = (
            f"You are a Data Extraction Engine.  Scrape data from the OCR text below.\n"
            f"Context: 'Nutrition Facts' (Food) or 'Supplement Facts'.\n\n"
            f"RULES:\n"
            f"1. BRAND/NAME:  Infer from text. If completely missing, use 'Generic'.\n"
            f"2. CALORIES: Find 'Calories' followed by a number.  EXTRACT IT as an integer.\n"
            f"3. NUTRIENTS: Map lines like 'Total Fat 8g' to 'nutritional_info_per_serving'.\n"
            f"   - 'name': 'Total Fat', 'amount': '8g'.\n"
            f"4. SERVING SIZE: CRITICAL - Extract the serving size in grams.\n"
            f"   - Look for patterns like '2/3 cup (55g)', '1 scoop (30g)', 'Serving Size 28g'\n"
            f"   - Extract ONLY the gram number into 'serving_size_grams' (e.g., 55, 30, 28)\n"
            f"   - Put the full text into 'serving_size_text' (e.g., '2/3 cup (55g)')\n"
            f"5. PER 100g: If the label explicitly shows 'per 100g' data, extract it.\n"
            f"   - If NOT explicitly shown, leave 'nutritional_info_per_100g' as null.\n"
            f"6. INGREDIENTS: Capture the full ingredient list.\n"
            f"7. RETURN DATA.  Do not return empty objects if text is visible.\n\n"
            f"RAW OCR TEXT:\n{ev. raw_text}"
        )
        
        response = sllm.complete(prompt)
        structured_data = json.loads(response. text)
        
        return VectorizationEvent(structured_data=structured_data)

    @step
    async def vectorize_ingredients(self, ctx: Context, ev: VectorizationEvent) -> StopEvent:
        """Step 3: Calculate per 100g if needed, then create TWO vector embeddings."""
        print("🔢 [Step 3] Processing Nutrition Data & Generating Vectors...")
        
        data = ev.structured_data
        
        # --- NUTRITION PER SERVING ---
        per_serving = data.get('nutritional_info_per_serving', {})
        
        # --- NUTRITION PER 100G ---
        per_100g = data.get('nutritional_info_per_100g')
        serving_size_grams = data. get('serving_size_grams')
        
        # Calculate per 100g if not provided but we have serving size
        per_100g_calculated = False
        if not per_100g or not per_100g.get('nutrients'):
            if serving_size_grams: 
                print(f"   🧮 Per 100g not on label.  Calculating from {serving_size_grams}g serving...")
                per_100g = self.calculate_per_100g(per_serving, serving_size_grams)
                per_100g_calculated = True
            else: 
                print("   ⚠️ Cannot calculate per 100g: No serving size in grams found")
                per_100g = None
        
        # --- VECTOR 1: Per Serving ---
        print("   🔷 Creating vector for PER SERVING...")
        per_serving_str = json.dumps({
            "calories": per_serving.get('calories'),
            "nutrients": per_serving.get('nutrients', [])
        })
        vector_per_serving = self.embed_model.get_text_embedding(per_serving_str)
        
        # --- VECTOR 2: Per 100g ---
        if per_100g:
            print("   🔶 Creating vector for PER 100G...")
            per_100g_str = json.dumps({
                "calories": per_100g.get('calories'),
                "nutrients":  per_100g.get('nutrients', [])
            })
            vector_per_100g = self.embed_model.get_text_embedding(per_100g_str)
        else:
            print("   ⚠️ No per 100g data available, skipping vector")
            vector_per_100g = None
        
        # --- BUILD FINAL PAYLOAD ---
        final_payload = {
            "supplement_name": data.get('supplement_name'),
            "supplement_brand": data.get('supplement_brand'),
            "supplement_ingredient":  data.get('supplement_ingredient'),
            
            # Serving info
            "serving_size_text": data.get('serving_size_text'),
            "serving_size_grams": serving_size_grams,
            
            # Nutrition data
            "nutritional_info_per_serving": per_serving,
            "nutritional_info_per_100g": per_100g,
            "per_100g_calculated": per_100g_calculated,
            
            # TWO vectors
            "vector_per_serving": vector_per_serving,
            "vector_per_100g": vector_per_100g
        }
        
        print("✅ [Step 3] Pipeline Finished.")
        return StopEvent(result=final_payload)