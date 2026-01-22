# Vectorisation Similarity Search

Latest testing phase: `vector_v3.py` script.

<del> This script operates on local mock data to validate the search logic before migration to a production PostgreSQL (`pgvector`) environment. </del>

This script has now been connected to the `sss.supplement` table in the DB.

## Key Features

* **Hybrid Search:** Combines **Semantic Text Similarity** (Ingredients) and **Mathematical Similarity** (Nutrition) into a single score.
* **Smart Normalization:** Automatically handles different units (e.g., converting `mg`, `mcg`, and `IU` to standard grams).
* **Scalable Schema:** Capable of mapping fuzzy OCR keys (e.g., "Vit D3") to a fixed internal schema of ~30 common nutrients.
* **Self-Exclusion:** Automatically detects if the user scanned a product that already exists in the database (Score > 99%) and excludes it from the "Alternatives" list. (Will activate this once the model is verified to work properly)

---

## Mock Data Generation

The script includes a robust data generation module that creates a realistic testing environment for initial phase (before DB setup completely).

### Data Simulation Strategy

* **50-Item Inventory:** We generate 50 distinct products covering diverse categories like Protein Powders, Vitamins, Pre-Workouts, and Energy Bars.
* **Realistic Attributes:** Each item is populated with all the fields required by your schema, including:
* `supplement_input_type` (Manual vs Webscraper)
* `human_in_the_loop` flags
* Audit timestamps (`created_on`, `last_modified_by`)
* Detailed JSON blobs for `supplement_ingredient` and `nutritional_info_per_100g`.

## Technical Architecture

### 1. The Vectorization Strategy

The core of this engine is the **Hybrid Vector**. Every product is represented by two distinct vectors that are concatenated (50/50 weight):

| Component | Weight | Logic |
| --- | --- | --- |
| **A. Text Vector** | 50% | generated from the Ingredient List + Rare Nutrients. We use the Hugging Face model to capture the semantic meaning (e.g., knowing that "Whey" is related to "Milk"). |
| **B. Nutrition Vector** | 50% | generated from **30+ Standardized Nutrients** (Protein, Carbs, Fat, Vitamins). We use `MinMaxScaler` to normalize values between 0 and 1 so that large numbers (Sodium) don't overpower small numbers (Vitamin D). |

### 2. Search Workflow (Use Cases)

The script supports two primary inputs via a JSON payload:

* **Use Case A (Manual Trigger):** User is viewing a product page (e.g., "Gold Standard Whey"). The app sends that product's JSON data to find similar items.
* **Use Case B (OCR Scan):** User scans a physical label. The app sends the clean extracted text (Ingredients) and numbers (Nutrition Table) via agent.

---

## How It Works (The Algorithm)

1. **Input Parsing:** The script accepts a JSON payload containing `ingredients` (string or list) and `nutrition` (dictionary).
2. **Fuzzy Mapping:** It runs the `map_key_to_schema` function to clean up messy input keys (e.g., converting "Vitamin-C (as ascorbic acid)"  `vitamin_c_mg`).
3. **Unit Conversion:** It standardizes all values (IU  mcg, mg  g) to ensure mathematical consistency.
4. **Vector Generation:** It generates the Hybrid Vector for the query using the HF Embedder.
5. **Similarity Search:** It calculates the Cosine Distance between the Query Vector and every Product Vector in the database.
6. **Filtering:**
* **Self-Match Filter:** If Score > 99.0%, the item is flagged as "The Scanned Product" and removed from results.
* **Relevance Threshold:** Items with Score < 60% are discarded as irrelevant.


---

## Installation & Usage

1. **Install Dependencies:**
```bash
pip install pandas numpy scikit-learn transformers torch psycopg2-binary

```
* _`torch` is required for the Hugging Face model execution._


2. **Run the Search:**
Run `vector_v3.py` script in your own source-code editor (e.g. VSCode)


3. **Interactive Mode:**
Paste a JSON query when prompted.
"[COPY AND PASTE _supplement_ingredient_ VALUE], "nutrition": {COPY AND PASTE _nutritional_info_per_100g_ or _nutritional_info_per_serving_ VALUE HERE}}

Example:
```json
{"ingredients": ["Almonds", "Soluble Corn Fiber", "Cocoa Butter", "Stevia", "Erythritol", "Milk Protein Isolate", "Peanuts"],
    "nutrition": {"energy_kcal": 332.3, "protein_g": 30.3, "fat_g": 13.5, "saturated_fat_g": 4.9, "carbohydrate_g": 34.2, "sugar_g": 2.2, "added_sugar_g": 0, "sodium_mg": 368.5, "cholesterol_mg": 5.0}}

```


---

## Future Roadmap

* **Migration to PostgreSQL (`pgvector`):** Moving the vector storage and similarity calculation to the database layer for production scalability.
* **OCR Integration:** Connecting the Python script directly to the Tesseract/Google Vision API output.
* **Micronutrient Expansion:** Adding rare herbal extracts (Ashwagandha, Caffeine types) to the fixed vector schema.
