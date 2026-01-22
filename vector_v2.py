import pandas as pd
import numpy as np
import json
import torch
from transformers import AutoTokenizer, AutoModel
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler

# 1. SETUP & CONFIGURATION
# ==========================================
FILENAME = "supplements_full_schema_balanced_v3.csv"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# Fixed Nutrition Schema (Vector Dimensions)
FIXED_VECTOR_SCHEMA = [
    "energy_kcal", "protein_g", "carbohydrate_g", "sugar_g", "added_sugar_g",
    "fat_g", "saturated_fat_g", "trans_fat_g", "cholesterol_mg", "sodium_mg",
    "fiber_g", "caffeine_mg",
    "vitamin_a_mcg", "vitamin_c_mg", "vitamin_d_mcg", "vitamin_e_mg", "vitamin_k_mcg",
    "thiamin_mg", "riboflavin_mg", "niacin_mg", "vitamin_b6_mg", "folate_mcg", "vitamin_b12_mcg",
    "biotin_mcg", "pantothenic_acid_mg", "calcium_mg", "iron_mg", "magnesium_mg", "zinc_mg", "potassium_mg"
]

# 2. HUGGING FACE EMBEDDER (The Replacement)
# ==========================================
class HFEmbedder:
    def __init__(self, model_name):
        print(f"Loading HF Model: {model_name}...")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)

    def encode(self, texts):
        """Generates embeddings matching SentenceTransformer's output"""
        # 1. Tokenize
        inputs = self.tokenizer(texts, padding=True, truncation=True, return_tensors="pt")

        # 2. Model Inference (No Gradient needed for inference)
        with torch.no_grad():
            outputs = self.model(**inputs)

        # 3. Mean Pooling (Average of all token vectors)
        # attention_mask ensures we don't average padding tokens
        embeddings = self._mean_pooling(outputs, inputs['attention_mask'])

        # 4. Normalize (Cosine Similarity requires normalized vectors)
        embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)

        return embeddings.numpy()

    def _mean_pooling(self, model_output, attention_mask):
        token_embeddings = model_output.last_hidden_state
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

# Initialize AI
embedder = HFEmbedder(MODEL_NAME)

# Load Data
try:
    df = pd.read_csv(FILENAME)
    print(f"Loaded Database: {len(df)} products.")
except FileNotFoundError:
    print("Error: CSV not found."); exit()

# 3. LOGIC: MAPPING & NORMALIZATION
# ==========================================
def map_key_to_schema(raw_key):
    k = raw_key.lower().replace("-", "").replace(" ", "")

    # Macros
    if "energy" in k or "calor" in k: return "energy_kcal"
    if "added" in k and "sugar" in k: return "added_sugar_g"
    if "sugar" in k: return "sugar_g"
    if "fiber" in k: return "fiber_g"
    if "saturated" in k: return "saturated_fat_g"
    if "trans" in k: return "trans_fat_g"
    if "fat" in k: return "fat_g"
    if "protein" in k: return "protein_g"
    if "carb" in k: return "carbohydrate_g"

    # Micros
    if "cholesterol" in k: return "cholesterol_mg"
    if "sodium" in k: return "sodium_mg"
    if "potassium" in k: return "potassium_mg"
    if "caffeine" in k: return "caffeine_mg"

    # Vitamins
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

    # Minerals
    if "calcium" in k: return "calcium_mg"
    if "iron" in k: return "iron_mg"
    if "magnesium" in k: return "magnesium_mg"
    if "zinc" in k: return "zinc_mg"

    return None

def process_nutrition(input_data):
    vector_map = {key: 0.0 for key in FIXED_VECTOR_SCHEMA}
    rare_nutrients = []

    if not isinstance(input_data, dict): return list(vector_map.values()), ""

    for raw_key, value in input_data.items():
        try: val = float(value)
        except: continue

        clean_key = raw_key.lower().strip()
        target = map_key_to_schema(clean_key)

        # Unit Standardization
        mult = 1.0
        if "iu" in clean_key:
            if target == "vitamin_d_mcg": mult = 0.025
            elif target == "vitamin_a_mcg": mult = 0.3
            elif target == "vitamin_e_mg": mult = 0.67
            else: mult = 0
        elif "mcg" in clean_key:
            if target and "_mg" in target: mult = 0.001
        elif "mg" in clean_key:
            if target and "_mcg" in target: mult = 1000.0
        elif "g" in clean_key and "mg" not in clean_key:
            if target and "_mg" in target: mult = 1000.0

        if target:
            vector_map[target] = val * mult
        else:
            rare_nutrients.append(f"{raw_key}: {val}")

    return [vector_map[k] for k in FIXED_VECTOR_SCHEMA], ", ".join(rare_nutrients)

# 4. VECTORIZATION (DB PREP)
# ==========================================
print("Standardizing Database...")

nut_vecs_list = []
text_vecs_list = []

for _, row in df.iterrows():
    # 1. Get Nutrition (100g Priority)
    try: n100 = json.loads(row['nutritional_info_per_100g'])
    except: n100 = {}
    try: nserv = json.loads(row['nutritional_info_per_serving'])
    except: nserv = {}

    src = n100 if any(v > 0 for v in n100.values()) else nserv
    vec, rare_txt = process_nutrition(src)
    nut_vecs_list.append(vec)

    # 2. Get Text (Ingredients + Rare Nutrients)
    try:
        ing = json.loads(row['supplement_ingredient'])
        ing_s = ", ".join(ing.get("ingredients", [])) if isinstance(ing.get("ingredients"), list) else ""
    except: ing_s = ""

    text_vecs_list.append(f"{ing_s} {rare_txt}")

# Compute Vectors
scaler = MinMaxScaler()
db_nut_vecs = scaler.fit_transform(np.array(nut_vecs_list))
db_text_vecs = embedder.encode(text_vecs_list)

# Hybrid Combine (50/50)
db_hybrid_vecs = np.hstack([db_text_vecs * 0.5, db_nut_vecs * 0.5])

# 5. SEARCH FUNCTION
# ==========================================
def find_alternatives(json_payload, threshold=60.0, self_match_threshold=99.0):
    try:
        data = json.loads(json_payload)

        # Parse Inputs
        q_ing = data.get("ingredients", "")
        if isinstance(q_ing, list): q_ing = ", ".join(q_ing)
        q_nut = data.get("nutrition", {})

        # Process Query
        q_nut_raw, q_rare_text = process_nutrition(q_nut)
        q_nut_vec = scaler.transform(np.array([q_nut_raw]))

        q_text = f"{q_ing} {q_rare_text}"
        q_txt_vec = embedder.encode([q_text])

        q_hybrid = np.hstack([q_txt_vec * 0.5, q_nut_vec * 0.5])

        # Search
        scores = cosine_similarity(q_hybrid, db_hybrid_vecs)[0] * 100

        # Filter Results
        results = df.copy()
        results['score'] = scores

        # Separate Self vs Alternatives
        self_match = results[results['score'] >= self_match_threshold]
        alternatives = results[(results['score'] >= threshold) & (results['score'] < self_match_threshold)]

        # Display
        if not self_match.empty:
            top = self_match.iloc[0]
            print(f"\n[INFO] Identified Product: '{top['supplement_name']}' ({top['score']:.2f}%)")

        top_alts = alternatives.sort_values('score', ascending=False).head(5)

        if top_alts.empty:
            print(f"\nNo alternatives found (> {threshold}%).")
        else:
            print(f"\nFound {len(top_alts)} Alternatives:")
            for _, row in top_alts.iterrows():
                print(f"> {row['score']:.1f}% | {row['supplement_name']} ({row['supplement_brand']})")
                print(f"  Desc: {row['supplement_description'][:60]}...")
                print("-" * 30)

    except json.JSONDecodeError: print("Invalid JSON.")
    except Exception as e: print(f"Error: {e}")

# 6. RUN
# ==========================================
if __name__ == "__main__":
    print("\nPaste JSON Query below:")
    raw_input = input()
    find_alternatives(raw_input)