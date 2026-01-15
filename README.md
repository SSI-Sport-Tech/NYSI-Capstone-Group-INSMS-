# Script Logic Breakdown

## 1. Development Context (Current Status)

This script (Test 6) represents the **Initial Development Phase**. It is designed to validate the search logic before deploying infrastructure.

### Key Architecture Decisions

* **Data Source:** Uses **Local Mock Data (CSV)** files for rapid testing, rather than a live production database.
* **Vector Engine:** Vectorization and similarity calculations are performed in-memory using the **Sentence-Transformers** Python library.
* **Database:** The script does **not yet** utilize **pgvector** or PostgreSQL. All math happens locally in the Python environment.

## 2. Mock Data Generation

The script includes a robust data generation module that creates a realistic testing environment for initial phase (before DB setup completely).

### Data Simulation Strategy

* **30-Item Inventory:** We generate 30 distinct products covering diverse categories like Protein Powders, Vitamins, Pre-Workouts, and Energy Bars.
* **Realistic Attributes:** Each item is populated with all the fields required by your schema, including:
* `supplement_input_type` (Manual vs Webscraper)
* `human_in_the_loop` flags
* Audit timestamps (`created_on`, `last_modified_by`)
* Detailed JSON blobs for `supplement_ingredient` and `nutritional_info_per_100g`.



### Simplified Nutrition Model

For this current develop,emt stage, we focus on the three core macronutrients to prove the "Hybrid Search" logic works.

* **Current Scope:** The script extracts and normalizes only **Protein**, **Carbohydrates**, and **Fat**.
* **Future Expansion:** In production, this can be easily expanded to include micronutrients (like Vitamin C, Zinc, or Caffeine) by simply adding them to the extraction function.

## 3. Technical Workflow

The script executes the following pipeline to process your mock data and perform searches:

**Step A: Feature Engineering (Data Prep)**

1. **Rich Text Creation:** It combines *Name*, *Brand*, *Description*, and *Ingredients* into a single text block for every product. This ensures the AI understands the full context of the product to achieve higher similarity scores.
2. **Macro Normalization:** It scales Protein, Carbs, and Fat values to a 0-1 range so they can be mathematically compared.
3. **Vectorization:** It converts the Rich Text into mathematical vectors using the AI model.

**Step B: The "Smart" Search Logic**
The script dynamically chooses how to search based on what the user provides:

* **Scenario A (Text Only):** If the user provides only text (e.g., scanning the product's name using OCR or manually trigger the "Check alternative" button in supplement detail page), the system compares **only text vectors**. This prevents penalizing products for having calories/macros when the user didn't specify a preference.
* **Scenario B (Hybrid):** If the user provides text *and* nutrition facts (e.g., scanning product's nutritional info/ingredients using OCR), the system compares a **50/50 mix** of the Text Vector and the Nutrition Vector to find the best all-around match.
