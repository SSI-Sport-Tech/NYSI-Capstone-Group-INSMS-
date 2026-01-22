import pandas as pd
import numpy as np
import json
import torch
import psycopg2
import re
from transformers import AutoTokenizer, AutoModel
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler

# ==========================================
# 1. SETUP & CONFIGURATION
# ==========================================

# DB CONFIGURATION
DB_CONFIG = {
    "dbname": "hpsicappy",
    "user": "hpsicappy",
    "password": "hpsicappy123",
    "host": "hspicappy.cdiq48iimwjc.ap-southeast-2.rds.amazonaws.com",
    "port": "5432"
}

# MODEL CONFIGURATION (512 Dim Support)
MODEL_NAME = "sentence-transformers/distiluse-base-multilingual-cased-v1" 

# Fixed Nutrition Schema (30 Dimensions)
FIXED_VECTOR_SCHEMA = [
    "energy_kcal", "protein_g", "carbohydrate_g", "sugar_g", "added_sugar_g",
    "fat_g", "saturated_fat_g", "trans_fat_g", "cholesterol_mg", "sodium_mg",
    "fiber_g", "caffeine_mg", 
    "vitamin_a_mcg", "vitamin_c_mg", "vitamin_d_mcg", "vitamin_e_mg", "vitamin_k_mcg",
    "thiamin_mg", "riboflavin_mg", "niacin_mg", "vitamin_b6_mg", "folate_mcg", "vitamin_b12_mcg",
    "biotin_mcg", "pantothenic_acid_mg", "calcium_mg", "iron_mg", "magnesium_mg", "zinc_mg", "potassium_mg"
]

# ==========================================
# 2. HUGGING FACE EMBEDDER
# ==========================================
class HFEmbedder:
    def __init__(self, model_name):
        print(f"Loading HF Model: {model_name}...")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)

    def encode(self, texts):
        inputs = self.tokenizer(texts, padding=True, truncation=True, return_tensors="pt")
        with torch.no_grad():
            outputs = self.model(**inputs)
        embeddings = self._mean_pooling(outputs, inputs['attention_mask'])
        embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)
        return embeddings.numpy()

    def _mean_pooling(self, model_output, attention_mask):
        token_embeddings = model_output.last_hidden_state
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

embedder = HFEmbedder(MODEL_NAME)

# ==========================================
# 3. DATABASE CONNECTION
# ==========================================
def load_data_from_db():
    print("Connecting to PostgreSQL...")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        # Fetching JSON columns as Text to handle formatting inconsistencies manually
        query = """
        SELECT 
            supplement_name, 
            supplement_brand, 
            supplement_description, 
            supplement_ingredient, 
            nutritional_info_per_100g::text, 
            nutritional_info_per_serving::text
        FROM sss.supplement;
        """
        df = pd.read_sql(query, conn)
        conn.close()
        print(f"Loaded Database: {len(df)} products.")
        return df
    except Exception as e:
        print(f"Database Error: {e}")
        exit()

df = load_data_from_db()

# ==========================================
# 4. ROBUST PARSING LOGIC (Regex + Mapping)
# ==========================================

def map_key_to_schema(raw_key):
    k = raw_key.lower().replace("-", "").replace(" ", "")
    # ... (Same Mapping Logic as before) ...
    if "energy" in k or "calor" in k: return "energy_kcal"
    if "added" in k and "sugar" in k: return "added_sugar_g"
    if "sugar" in k: return "sugar_g"
    if "fiber" in k: return "fiber_g"
    if "saturated" in k: return "saturated_fat_g"
    if "trans" in k: return "trans_fat_g"
    if "fat" in k: return "fat_g"
    if "protein" in k: return "protein_g"
    if "carb" in k: return "carbohydrate_g"
    if "cholesterol" in k: return "cholesterol_mg"
    if "sodium" in k: return "sodium_mg"
    if "potassium" in k: return "potassium_mg"
    if "caffeine" in k: return "caffeine_mg"
    
    if "vit" in k or "cholecalciferol" in k or "retinol" in k or "ascorbic" in k:
        if "d" in k: return "vitamin_d_mcg"
        if "a" in k and "panto" not in k: return "vitamin_a_mcg"
        if "c" in k and "calcium" not in k: return "vitamin_c_mg"
        if "e" in k: return "vitamin_e_mg"
        if "k" in k: return "vitamin_k_mcg"
        if "b12" in k: return "vitamin_b12_mcg"
        if "b6" in k: return "vitamin_b6_mg"
    
    if "thiamin" in k: return "thiamin_mg"
    if "riboflavin" in k: return "riboflavin_mg"
    if "niacin" in k: return "niacin_mg"
    if "folate" in k: return "folate_mcg"
    if "biotin" in k: return "biotin_mcg"
    if "calcium" in k: return "calcium_mg"
    if "iron" in k: return "iron_mg"
    if "magnesium" in k: return "magnesium_mg"
    if "zinc" in k: return "zinc_mg"
    return None

def parse_value_and_unit(value_str):
    """
    Extracts number and unit from strings like "10g", "500 kcal", "225mg"
    Returns: (float_value, unit_string)
    """
    if isinstance(value_str, (int, float)):
        return float(value_str), ""
        
    s = str(value_str).strip().lower()
    
    # Regex: Capture Number (Group 1) and Unit (Group 2)
    # Matches: "10.5 g", "10g", "500"
    match = re.match(r"([\d\.]+)\s*([a-zA-Z%]+)?", s)
    
    if match:
        try:
            val = float(match.group(1))
            unit = match.group(2) if match.group(2) else ""
            return val, unit
        except: return 0.0, ""
        
    return 0.0, ""

def process_nutrition(input_data):
    vector_map = {key: 0.0 for key in FIXED_VECTOR_SCHEMA}
    rare_nutrients = []
    
    # Handle JSON parsing locally if DB returns string
    if isinstance(input_data, str):
        try: input_data = json.loads(input_data)
        except: return list(vector_map.values()), ""
        
    if not isinstance(input_data, dict): 
        return list(vector_map.values()), ""

    for raw_key, raw_val in input_data.items():
        # 1. Parse Key
        clean_key = raw_key.lower().strip()
        target = map_key_to_schema(clean_key)
        
        # 2. Parse Value (Handle "10g", "500 kcal")
        val, unit_in_val = parse_value_and_unit(raw_val)
        
        if val == 0: continue

        # 3. Unit Normalization Strategy
        # We check the Found Unit (unit_in_val) OR Key hint (clean_key)
        
        # Priority: Unit in Value > Unit in Key
        detected_unit = unit_in_val if unit_in_val else clean_key
        
        mult = 1.0
        
        # IU Logic
        if "iu" in detected_unit:
            if target == "vitamin_d_mcg": mult = 0.025
            elif target == "vitamin_a_mcg": mult = 0.3
            elif target == "vitamin_e_mg": mult = 0.67
            else: mult = 0
            
        # Mass Logic (g / mg / mcg)
        elif "mcg" in detected_unit:
            if target and "_mg" in target: mult = 0.001
        elif "mg" in detected_unit:
            if target and "_mcg" in target: mult = 1000.0
            elif target and "_g" in target: mult = 0.001
        elif "g" in detected_unit or "gram" in detected_unit:
            if target and "_mg" in target: mult = 1000.0
            elif target and "_mcg" in target: mult = 1000000.0
            
        # If no unit found, we assume the input matches the target schema (Safe Default)

        if target:
            vector_map[target] = val * mult
        else:
            rare_nutrients.append(f"{raw_key}: {val}{unit_in_val}")

    return [vector_map[k] for k in FIXED_VECTOR_SCHEMA], ", ".join(rare_nutrients)

# ==========================================
# 5. VECTORIZATION (DB PREP)
# ==========================================
print("Standardizing Database...")

nut_vecs_list = []
text_vecs_list = []

for _, row in df.iterrows():
    # 1. Get Nutrition (100g Priority)
    n100 = row['nutritional_info_per_100g']
    nserv = row['nutritional_info_per_serving']
    
    # Priority Logic: Use 100g if valid, else Serving
    src = n100
    try:
        # Quick check if n100 has data
        if isinstance(n100, str): d = json.loads(n100)
        elif isinstance(n100, dict): d = n100
        else: d = {}
        
        if not d or not any(True for k in d): src = nserv
    except: src = nserv
        
    vec, rare_txt = process_nutrition(src)
    nut_vecs_list.append(vec)
    
    # 2. Get Text
    ing_raw = row['supplement_ingredient']
    ing_s = ""
    try:
        if isinstance(ing_raw, str): ing_d = json.loads(ing_raw)
        else: ing_d = ing_raw if isinstance(ing_raw, dict) else {}
        ing_l = ing_d.get("ingredients", [])
        ing_s = ", ".join(ing_l) if isinstance(ing_l, list) else str(ing_l)
    except: pass
        
    text_vecs_list.append(f"{ing_s} {rare_txt}")

scaler = MinMaxScaler()
db_nut_vecs = scaler.fit_transform(np.array(nut_vecs_list))
db_text_vecs = embedder.encode(text_vecs_list)
db_hybrid_vecs = np.hstack([db_text_vecs * 0.5, db_nut_vecs * 0.5])

# ==========================================
# 6. SEARCH FUNCTION (Unchanged Logic)
# ==========================================
def find_alternatives(json_payload, threshold=60.0):
    try:
        data = json.loads(json_payload)
        q_ing = data.get("ingredients", "")
        if isinstance(q_ing, list): q_ing = ", ".join(q_ing)
        q_nut = data.get("nutrition", {})
        
        q_nut_raw, q_rare_text = process_nutrition(q_nut)
        q_nut_vec = scaler.transform(np.array([q_nut_raw]))
        q_text = f"{q_ing} {q_rare_text}"
        q_txt_vec = embedder.encode([q_text])
        q_hybrid = np.hstack([q_txt_vec * 0.5, q_nut_vec * 0.5])
        
        scores = cosine_similarity(q_hybrid, db_hybrid_vecs)[0] * 100
        
        results = df.copy()
        results['score'] = scores
        # Self match filter at 99.0
        # results = results[results['score'] < 99.0]
        # results = results[results['score'] >= threshold]
        
        top_alts = results.sort_values('score', ascending=False).head(5)
        
        if top_alts.empty:
            print(f"\nNo alternatives found (> {threshold}%).")
        else:
            print(f"\nFound {len(top_alts)} Alternatives:")
            for _, row in top_alts.iterrows():
                print(f"> {row['score']:.1f}% | {row['supplement_name']} ({row['supplement_brand']})")
                print("-" * 30)
                
    except Exception as e: print(f"Error: {e}")

if __name__ == "__main__":
    print("\nPaste JSON Query below:")
    raw_input = input() 
    find_alternatives(raw_input)