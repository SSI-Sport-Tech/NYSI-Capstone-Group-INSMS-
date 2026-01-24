from dotenv import load_dotenv
from scrapegraphai import graphs
from scrapegraphai.docloaders import ChromiumLoader
import json
from typing import List, Optional, Dict, Union, Literal
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict
import os

load_dotenv()
load_dotenv("env.txt")

class BaseProduct(BaseModel):
    Name: str
    Brand: str
    Description: Optional[str] = None

class NutritionalProduct(BaseProduct):
    Minimum_Unit: Literal[
        "Tub", "Sleeve", "Tube", "Sachet", "Bottle", 
        "Bar", "Tablet", "Packet", "Box", "Bag", "Pack"
    ] = Field(..., alias="Minimum Unit")
    Additional_Information: Optional[str] = Field(None, alias="Additional Information")
    Certifications: Optional[str] = None
    Warnings: Optional[str] = None
    Serving_Size: Optional[str] = Field(None, alias="Serving Size")
    Ingredients: Optional[List[str]] = None

    Per_100g: Optional[Dict[str, float]] = Field(None, alias="Per 100g")
    Per_Serving_Size: Optional[Dict[str, float]] = Field(None, alias="Per Serving Size")

    Nutritional_Information_Image: Optional[str] = Field(
        None, alias="Nutritional Information Image"
    )

class NonNutritionalProduct(BaseProduct):
    Rejected: Literal["Not nutritional"]

class ProductInfoResponse(BaseModel):
    """
    THIS is what you pass into with_structured_output().
    """
    items: List[Union[NutritionalProduct, NonNutritionalProduct]]

product_info_prompt = """
You are a data extraction model. Always output a valid JSON array. 
Never include explanations or text outside of the JSON.
Task: List me all the nutritional information for each flavour of the product in JSON format in English. If nutritional information is stored in a image, give me the exact absolute URL to the image. If the product is not nutritional, give me the other details of the product."

Requirements:
1. Create a separate entry in the list for each flavour or variation, if there is only 1 variation, create a list with only 1 entry. Only include variations that have their nutritional information on the page, do not include variations that are on links to other pages.
2. Include general information and usage instructions in the description field in English.
3. Include the brand of the supplement.
4. Include any important information such as allergens or cautionary information in English.
5. Include any certificates that the product is stated to have. If none, indicate "NA".
6. Include the minimum dispensable unit for the supplement, using the exact field names as given below:
[Tub, Sleeve, Tube, Sachet, Bottle, Bar, Tablet, Packet, Box, Bag, Pack]
7. Include `"Per 100g"` and `"Per Serving Size"` sub-objects.
8. Include all nutritional information on the website.
9. Flatten all nutrients so that vitamins and minerals appear on the same level as macronutrients (no nested objects inside "Vitamins" or "Minerals").
10. For any nutrient that matches the following standardized field names, use the exact field name as given below and convert units if neccessary:

Standardized nutrients:
Carbohydrates (g), Glucose (g), Fructose (g), Galactose (g), Ribose (g), Sucrose (g), Maltose (g), Lactose (g), Amylose (g), Amylopectin (g), Proteins (g), Histidine (g), Isoleucine (g), Leucine (g), Lysine (g), Methionine (g), Phenylalanine (g), Threonine (g), Tryptophan (g), Valine (g), Alanine (g), Arginine (g), Aspartic acid (g), Asparagine (g), Cysteine (g), Glutamic acid (g), Glutamine (g), Glycine (g), Proline (g), Serine (g), Tyrosine (g), Fats (g), Saturated Fats (g), Monounsaturated Fats (g), Polyunsaturated Fats (g), Fibre (g), Calcium (mg), Sulfur (mg), Phosphorus (mg), Magnesium (mg), Sodium (mg), Potassium (mg), Iron (mg), Zinc (mg), Boron (mg), Copper (mg), Chlorine (mg), Selenium (µg), Manganese (mg), Molybdenum (µg), Cobalt (µg), Fluorine (mg), Iodine (µg), Silicon (mg), Vitamin B1 (mg), Vitamin B2 (mg), Vitamin B3 (mg), Vitamin B5 (mg), Pyridoxine (mg), Pyridoxal-5-Phosphate (mg), Pyridoxamine (mg), Vitamin B7 (µg), Vitamin B9 (µg), Vitamin B12 (µg), Choline (mg), Vitamin A (µg), Vitamin C (mg), Vitamin D (µg), Vitamin E (mg), Vitamin K1 (µg), Vitamin K2 (µg), Vitamin K3 (mg), Alpha carotene (µg), Beta carotene (µg), Cryptoxanthin (µg), Lutein (µg), Lycopene (µg), Zeaxanthin (µg)

11. If a nutrient is not in the standardized list, use the given English name on the website and make sure it has its units
12. Give all nutritient values as numerical values. Substitute non-numerical values with appropriate numerical ones. For example: "<0.1" to 0.1, "trace" to 0.0
13. Example output for supplement page with supplement information text:

[
  {
    "Name": "Hydration Water (Lemon)",
    "Brand": "Company A",
    "Minimum Unit": "Tube",
    "Description": "Ideal isotonic thirst quencher in warm weather. With a neutral pH so that no stomach upset occurs. Effervescent tablet with sugar and sweetener for the preparation of an isotonic drink for athletes enriched with minerals.",
    "Warnings": "Do not to exceed the daily recommended dose. Suitable for persons as of 13 years of age. Contains gluten - vegetarians √ -vegetarians √",
    "Additional Information": "Dissolve 2 effervescent tablets in 500ml of water. Drink at least 500ml per hour of exercise. In warmer temperatures and during intensive exercise it is recommended to drink up to 750ml or 1L per hour.",
    "Certifications": "ISO 22000, BRC, GMP & Halal accredited",
    "Serving Size": "2 tablets",
    "Ingredients": ["Dextrose","citric acid","sodium hydrogen carbonate","potassium hydrogen carbonate","calcium carbonate","maltodextrin","lime flavouring","magnesium carbonate","sodium chloride","sweetener: sucralose","L-ascorbic acid","colourant: riboflavin","thiamine hydrochloride"],
    "Per 100g": {
      "Energy (kcal)": 338,
      "Fat (g)": 0.1,
      "Carbohydrates (g)": 73,
      "Sugars (g)": 72,
      "Proteins (g)": 0.1,
      "Vitamin C (mg)": 50,
      "Calcium (mg)": 20
    },
    "Per Serving Size": {
      "Energy (kcal)": 27,
      "Fat (g)": 0.1,
      "Carbohydrates (g)": 5.8,
      "Sugars (g)": 5.7,
      "Proteins (g)": 0.1,
      "Vitamin C (mg)": 10,
      "Calcium (mg)": 1.5
    },
    "Nutritional Information Image": "NA"
  },
  {
    "Name": "Hydration Water (Blackcurrant)",
    "Brand": "Company A",
    "Minimum Unit": "Tube",
    "Description": "Ideal isotonic thirst quencher in warm weather. With a neutral pH so that no stomach upset occurs. Effervescent tablet with sugar and sweetener for the preparation of an isotonic drink for athletes enriched with minerals.",
    "Warnings": "Do not to exceed the daily recommended dose. Suitable for persons as of 13 years of age. Contains gluten - vegetarians √ -vegetarians √",
    "Additional Information": "Dissolve 2 effervescent tablets in 500ml of water. Drink at least 500ml per hour of exercise. In warmer temperatures and during intensive exercise it is recommended to drink up to 750ml or 1L per hour.",
    "Certifications": "ISO 22000, BRC, GMP & Halal accredited",
    "Serving Size": "2 tablets",
    "Ingredients": ["Dextrose","acidifier: citric acid","sodium hydrogen carbonate","potassium hydrogen carbonate","calcium carbonate","maltodextrin","flavouring: blackcurrant","magnesium carbonate","sodium chloride","sweetener: sucralose","L-ascorbic acid","colouring agent: anthocyanins","thiamine hydrochloride"],
    "Per 100g": {
      "Energy (kcal)": 338,
      "Fat (g)": 0.1,
      "Carbohydrates (g)": 73,
      "Sugars (g)": 72,
      "Proteins (g)": 0.1,
      "Vitamin C (mg)": 50,
      "Calcium (mg)": 20
    },
    "Per Serving Size": {
      "Energy (kcal)": 27,
      "Fat (g)": 0.1,
      "Carbohydrates (g)": 5.8,
      "Sugars (g)": 5.7,
      "Proteins (g)": 0.1,
      "Vitamin C (mg)": 10,
      "Calcium (mg)": 1.5
    },
    "Nutritional Information Image": "NA"
  }
]
14. Example output for supplement page with supplement information image:
[
  {
    "Name": "Hydration Water (Lemon)",
    "Brand": "Company A",
    "Minimum Unit": "Tube",
    "Description": "Ideal isotonic thirst quencher in warm weather. With a neutral pH so that no stomach upset occurs. Effervescent tablet with sugar and sweetener for the preparation of an isotonic drink for athletes enriched with minerals.",
    "Warnings": "Do not to exceed the daily recommended dose. Suitable for persons as of 13 years of age. Contains gluten - vegetarians √ -vegetarians √",
    "Additional Information": "Dissolve 2 effervescent tablets in 500ml of water. Drink at least 500ml per hour of exercise. In warmer temperatures and during intensive exercise it is recommended to drink up to 750ml or 1L per hour.",
    "Certifications": "ISO 22000, BRC, GMP & Halal accredited",
    "Serving Size": "2 tablets",
    "Ingredients": ["Dextrose","citric acid","sodium hydrogen carbonate","potassium hydrogen carbonate","calcium carbonate","maltodextrin","lime flavouring","magnesium carbonate","sodium chloride","sweetener: sucralose","L-ascorbic acid","colourant: riboflavin","thiamine hydrochloride"],
    "Per 100g": {
    },
    "Per Serving Size": {
    },
    "Nutritional Information Image": "https://cdn.shopify.com/s/files/1/0454/0871/4919/files/Isotonic_drinkNutritionals1000x1000_42163958-d2cb-4bf5-ad4e-6bd9d63221fa.jpg?v=1742482293"
  }
]
15. Example output for non-supplement page:
[
  {
    "Name": "Cycling Shorts",
    "Brand": "Company A",
    "Description": "The ideal cycling shorts for comfortable long bike rides in the sun, designed by Bioracer®.",
    "Rejected": "Not nutritional"
  }
]


"""



def scrapeProduct(url, openai_key):
    gpt4o = {
   "llm": {
      "api_key": openai_key,
      "model": "openai/gpt-4o",
   },
}
    
    smart_scraper_graph_gpt4o = graphs.SmartScraperGraph(
    prompt=product_info_prompt,
    # also accepts a string with the already downloaded HTML code
    source=url,
    config=gpt4o,
    schema=ProductInfoResponse
)
    result_gpt4o = smart_scraper_graph_gpt4o.run()
    if isinstance(result_gpt4o, str):
      result_gpt4o = json.loads(result_gpt4o)
    for product in result_gpt4o["items"]:
        if isinstance(product, str):
          product = json.loads(product)
        product["URL"] = url
    if isinstance(result_gpt4o, dict):
        result_gpt4o = result_gpt4o["items"]
    return result_gpt4o
# openai_key = os.getenv("OPENAI_API_KEY")
# print(scrapeProduct("https://www.etixxsports.com/en-be/products/energy-bar-marzipan?variant=52733565763930",openai_key))