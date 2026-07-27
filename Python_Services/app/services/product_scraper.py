"""
Product detail page scraper service.
Extracts comprehensive product information including nutrition data.
"""

import nest_asyncio
nest_asyncio.apply()
from typing import List, Dict, Optional, Union, Literal
from pydantic import BaseModel, Field
import requests
from scrapegraphai import graphs
import json
import os
import re


# ============================================================================
# PRODUCT SCHEMAS
# ============================================================================

class BaseProduct(BaseModel):
    """Base product information."""
    Name: str
    Brand: str
    Description: Optional[str] = None


DEFAULT_MINIMUM_UNIT = "Pack"


class NutritionalProduct(BaseProduct):
    """Nutritional supplement product with full data."""
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
        None, 
        alias="Nutritional Information Image"
    )


class NonNutritionalProduct(BaseProduct):
    """Non-nutritional product (rejected)."""
    Rejected: Literal["Not nutritional"]


class ProductInfoResponse(BaseModel):
    """Response schema for product extraction."""
    items: List[Union[NutritionalProduct, NonNutritionalProduct]]


# ============================================================================
# EXTRACTION PROMPT
# ============================================================================

PRODUCT_INFO_PROMPT = """
You are a data extraction model. Always output a valid JSON array. 
Never include explanations or text outside of the JSON.
Task: List me all the nutritional information for each flavour of the product in JSON format in English. If nutritional information is stored in a image, give me the exact absolute URL to the image and do NOT reformat, normalize, correct, or rewrite the URL. If the product is not nutritional, give me the other details of the product."

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
    "Nutritional Information Image": "https://exampleimageurl/Hydration_Water.com"
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
import time
from selenium.webdriver.chrome.options import Options
from selenium import webdriver

def selenium_fetch(url: str, wait_time: int = 5) -> str:
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    driver = webdriver.Chrome(options=options)
    try:
        driver.get(url)
        time.sleep(wait_time)

        # Expand collapsed nutrition/ingredient tabs
        driver.execute_script("""
            document.querySelectorAll(
                '[aria-expanded="false"], .accordion__button, details summary, .tab__trigger'
            ).forEach(el => {
                if (/nutri|ingredient|info|fact/i.test(el.textContent)) {
                    el.click();
                }
            });
        """)
        time.sleep(1)

        # Scroll slowly to trigger lazy-loaded images
        total_height = driver.execute_script("return document.body.scrollHeight")
        for pos in range(0, total_height, 300):
            driver.execute_script(f"window.scrollTo(0, {pos});")
            time.sleep(0.1)

        # Force all lazy images to load
        driver.execute_script("""
            document.querySelectorAll('img[data-src], img[data-lazy], img[loading="lazy"]').forEach(img => {
                if (img.dataset.src) img.src = img.dataset.src;
                if (img.dataset.lazy) img.src = img.dataset.lazy;
            });
        """)
        time.sleep(1)

        # Scroll back to top
        driver.execute_script("window.scrollTo(0, 0);")

        return driver.page_source
    finally:
        driver.quit()

# ============================================================================
# SCRAPER FUNCTION
# ============================================================================

async def scrape_product_details(
    product_url: str,
) -> List[Dict]:
    """
    Scrape detailed product information from a product page.

    Args:
        product_url: URL of product detail page

    Returns:
        List[Dict]: List of product variants (can be multiple flavors)
    """
    # ScrapeGraphAI configuration
    config = {
        "llm": {
            "model": f"ollama/{os.environ.get('OLLAMA_MODEL', 'qwen3:8b')}",
            "base_url": os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434"),
            "format": "json",
            "model_tokens": 32000,
            "temperature": 0,
            "think": False,
        },
    }

    source = selenium_fetch(product_url)
        
    # Create scraper with schema validation
    scraper = graphs.SmartScraperGraph(
        prompt=PRODUCT_INFO_PROMPT,
        source=product_url,
        config=config,
        schema=ProductInfoResponse
    )
    
    # Run extraction
    try:
        result = scraper.run()
    except Exception as e:
        # Model output valid JSON but with reasoning prefix — extract it
        error_text = str(e)
        # Find last JSON object in the error message
        json_matches = list(re.finditer(r'\{.*\}', error_text, re.DOTALL))
        if json_matches:
            try:
                result = json.loads(json_matches[-1].group(0))
                print(f"⚠️ Recovered JSON from exception")
            except json.JSONDecodeError:
                raise
        else:
            raise
    # Normalize result (handle string response)
    if isinstance(result, str):
        result = json.loads(result)
    
    # Extract items list
    if isinstance(result, dict):
      result = result["items"]
    
    for product in result:
        if isinstance(product, str):
            product = json.loads(product)
        
        per_100g = product.get("Per 100g")
        if not isinstance(per_100g, dict):
            product["Per 100g"] = {}

        per_serving = product.get("Per Serving Size")
        if not isinstance(per_serving, dict):
            product["Per Serving Size"] = {}
        product["URL"] = product_url
    
    print(result)
    return result


async def scrape_multiple_products(
    product_urls: List[str],
) -> tuple[List[Dict], List[str]]:
    """
    Scrape multiple product pages.

    Args:
        product_urls: List of product URLs

    Returns:
        tuple: (list of products, list of errors)
    """
    all_products = []
    errors = []

    for i, url in enumerate(product_urls):
        print(f"\n[{i+1}/{len(product_urls)}] Scraping: {url}")

        try:
            products = await scrape_product_details(url)
            
            # Filter out rejected products
            nutritional_products = [
                p for p in products 
                if "Rejected" not in p
            ]
            
            all_products.extend(nutritional_products)
            print(f"✅ Found {len(nutritional_products)} variant(s)")
            
        except Exception as e:
            error_msg = f"Failed to scrape {url}: {str(e)}"
            errors.append(error_msg)
            print(f"❌ {error_msg}")
    
    return all_products, errors