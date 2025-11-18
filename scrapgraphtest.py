import os
from dotenv import load_dotenv
from scrapegraphai import graphs
from scrapegraphai.utils import prettify_exec_info

load_dotenv()

openai_key = "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"

graph_config = {
   "llm": {
      "api_key": openai_key,
      "model": "openai/gpt-4o",
   },
}

nutrients = []

# ************************************************
# Create the SmartScraperGraph instance and run it
# ************************************************

smart_scraper_graph = graphs.SmartScraperGraph(
   prompt="""
List me all the nutritional information for each flavour of the product in JSON format in English.

Requirements:
1. Each entry must include a `"flavour"` field.
2. Include `"Per 100g"` and `"Per serving size"` sub-objects.
3. Include all nutritional information on the website.
4. Flatten all nutrients so that vitamins and minerals appear on the same level as macronutrients (no nested objects inside "Vitamins" or "Minerals").
5. For any nutrient that matches the following standardized field names, use the exact field name as given below and convert units if neccessary:

Standardized nutrients:
Carbohydrates (g), Glucose (g), Fructose (g), Galactose (g), Ribose (g), Sucrose (g), Maltose (g), Lactose (g), Amylose (g), Amylopectin (g), Proteins (g), Histidine (g), Isoleucine (g), Leucine (g), Lysine (g), Methionine (g), Phenylalanine (g), Threonine (g), Tryptophan (g), Valine (g), Alanine (g), Arginine (g), Aspartic acid (g), Asparagine (g), Cysteine (g), Glutamic acid (g), Glutamine (g), Glycine (g), Proline (g), Serine (g), Tyrosine (g), Fats (g), Saturated Fats (g), Monounsaturated Fats (g), Polyunsaturated Fats (g), Fibre (g), Calcium (mg), Sulfur (mg), Phosphorus (mg), Magnesium (mg), Sodium (mg), Potassium (mg), Iron (mg), Zinc (mg), Boron (mg), Copper (mg), Chlorine (mg), Selenium (µg), Manganese (mg), Molybdenum (µg), Cobalt (µg), Fluorine (mg), Iodine (µg), Silicon (mg), Vitamin B1 (mg), Vitamin B2 (mg), Vitamin B3 (mg), Vitamin B5 (mg), Pyridoxine (mg), Pyridoxal-5-Phosphate (mg), Pyridoxamine (mg), Vitamin B7 (µg), Vitamin B9 (µg), Vitamin B12 (µg), Choline (mg), Vitamin A (µg), Vitamin C (mg), Vitamin D (µg), Vitamin E (mg), Vitamin K1 (µg), Vitamin K2 (µg), Vitamin K3 (mg), Alpha carotene (µg), Beta carotene (µg), Cryptoxanthin (µg), Lutein (µg), Lycopene (µg), Zeaxanthin (µg)

6. If a nutrient is not in the standardized list, use the given English name on the website and make sure it has its units
7. Example output:

[
  {
    "flavour": "Strawberry",
    "Per 100g": {
      "Energy (kcal)": "338",
      "Fat (g)": "<0.1",
      "Carbohydrates": "73",
      "Sugars": "72",
      "Proteins": "<0.1",
      "Vitamin C": "50",
      "Calcium": "20"
    },
    "Per 2 tablets": {
      "Energy (kcal)": "27",
      "Fat (g)": "<0.1",
      "Carbohydrates": "5.8",
      "Sugars": "5.7",
      "Proteins": "<0.1",
      "Vitamin C": "10",
      "Calcium": "1.5"
    }
  }
]
""",
   # also accepts a string with the already downloaded HTML code
   source="https://www.etixxsports.com/en/products/isotonic",
   config=graph_config
)

result = smart_scraper_graph.run()
