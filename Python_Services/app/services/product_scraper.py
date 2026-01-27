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
You are a data extraction model. Always output valid JSON. 
Never include explanations or text outside of JSON.

TASK: Extract nutritional information for EACH FLAVOR/VARIANT of the product.

REQUIREMENTS:

1. CREATE SEPARATE ENTRY FOR EACH FLAVOR:
   - If only 1 variant exists, create list with 1 entry
   - Only include variants with nutrition data visible on THIS PAGE
   - Do not include links to other product pages

2. GENERAL INFORMATION:
   - Include full description and usage instructions in English
   - Include brand name
   - Include allergens and warnings
   - Include certifications (or "NA" if none)

3. MINIMUM UNIT:
   Use exact field name from: [Tub, Sleeve, Tube, Sachet, Bottle, Bar, 
   Tablet, Packet, Box, Bag, Pack]

4. NUTRITION DATA:
   - Include "Per 100g" and "Per Serving Size" objects
   - Flatten ALL nutrients (no nested "Vitamins" or "Minerals" objects)
   - Use standardized nutrient names when possible

5. STANDARDIZED NUTRIENT NAMES (use exact names, convert units):
   Energy (kcal), Carbohydrates (g), Glucose (g), Fructose (g), Proteins (g),
   Fats (g), Saturated Fats (g), Fibre (g), Calcium (mg), Sodium (mg),
   Potassium (mg), Iron (mg), Zinc (mg), Vitamin B1 (mg), Vitamin B2 (mg),
   Vitamin B3 (mg), Vitamin B5 (mg), Vitamin B6 (mg), Vitamin B7 (µg),
   Vitamin B9 (µg), Vitamin B12 (µg), Vitamin A (µg), Vitamin C (mg),
   Vitamin D (µg), Vitamin E (mg), Vitamin K1 (µg), Vitamin K2 (µg), etc.

6. NON-STANDARDIZED NUTRIENTS:
   - Use English name from website with units
   - Include all nutritional info found

7. NUMERIC VALUES ONLY:
   - Convert non-numeric to numeric: "<0.1" → 0.1, "trace" → 0.0
   - Provide amounts as numbers, not strings

8. NUTRITIONAL IMAGE:
   - If nutrition stored in image, provide EXACT ABSOLUTE URL
   - Do NOT reformat, normalize, or rewrite the URL
   - If no image, use "NA"

9. NON-NUTRITIONAL PRODUCTS:
   - For non-supplements (e.g., clothing), mark as "Rejected": "Not nutritional"

OUTPUT EXAMPLES:

Example 1 - Nutritional product with text data:
[
  {
    "Name": "Hydration Water (Lemon)",
    "Brand": "Company A",
    "Minimum Unit": "Tube",
    "Description": "Isotonic drink for hydration...",
    "Warnings": "Do not exceed daily dose. Contains gluten.",
    "Additional Information": "Dissolve 2 tablets in 500ml water...",
    "Certifications": "ISO 22000, BRC, GMP & Halal",
    "Serving Size": "2 tablets",
    "Ingredients": ["Dextrose", "citric acid", "sodium hydrogen carbonate"],
    "Per 100g": {
      "Energy (kcal)": 338,
      "Fats (g)": 0.1,
      "Carbohydrates (g)": 73,
      "Sugars (g)": 72,
      "Proteins (g)": 0.1,
      "Vitamin C (mg)": 50,
      "Calcium (mg)": 20
    },
    "Per Serving Size": {
      "Energy (kcal)": 27,
      "Fats (g)": 0.1,
      "Carbohydrates (g)": 5.8,
      "Sugars (g)": 5.7,
      "Proteins (g)": 0.1,
      "Vitamin C (mg)": 10,
      "Calcium (mg)": 1.5
    },
    "Nutritional Information Image": "NA"
  }
]

Example 2 - Nutritional product with image:
[
  {
    "Name": "Protein Powder (Chocolate)",
    "Brand": "Brand X",
    "Minimum Unit": "Tub",
    "Description": "High-quality whey protein...",
    "Warnings": "Contains milk. May contain soy.",
    "Additional Information": "Mix 1 scoop with 250ml water or milk.",
    "Certifications": "Informed Sport",
    "Serving Size": "1 scoop (30g)",
    "Ingredients": ["Whey Protein Concentrate", "Cocoa Powder", "Natural Flavors"],
    "Per 100g": {},
    "Per Serving Size": {},
    "Nutritional Information Image": "https://cdn.example.com/images/nutrition-panel.jpg"
  }
]

Example 3 - Non-nutritional product:
[
  {
    "Name": "Cycling Shorts",
    "Brand": "Company A",
    "Description": "Comfortable cycling shorts for long rides.",
    "Rejected": "Not nutritional"
  }
]
"""
import time
from selenium.webdriver.chrome.options import Options
from selenium import webdriver

def selenium_fetch(
    url: str, 
    wait_time: int = 5, 
) -> str:
    """
    Fetch page content using Selenium with infinite scroll handling.
    
    Args:
        url: URL to fetch
        wait_time: Initial page load wait time (seconds)
        scroll_pause: Pause between scrolls (seconds)
        max_scrolls: Maximum number of scroll attempts
        
    Returns:
        str: Page HTML source
    """
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

        return driver.page_source

    finally:
        driver.quit()

# ============================================================================
# SCRAPER FUNCTION
# ============================================================================

async def scrape_product_details(
    product_url: str,
    openai_api_key: str
) -> List[Dict]:
    """
    Scrape detailed product information from a product page.
    
    Args:
        product_url: URL of product detail page
        openai_api_key: OpenAI API key for GPT-4o
        
    Returns:
        List[Dict]: List of product variants (can be multiple flavors)
    """
    # ScrapeGraphAI configuration
    config = {
        "llm": {
            "api_key": openai_api_key,
            "model": "openai/gpt-4o",
        },
    }

    source = selenium_fetch(product_url)
    
    # Create scraper with schema validation
    scraper = graphs.SmartScraperGraph(
        prompt=PRODUCT_INFO_PROMPT,
        source=source,
        config=config,
        schema=ProductInfoResponse
    )
    
    # Run extraction
    result = scraper.run()
    
    # Normalize result (handle string response)
    if isinstance(result, str):
        result = json.loads(result)
    
    # Extract items list
    products = result.get("items", [])
    
    # Parse string items if needed
    parsed_products = []
    for product in products:
        if isinstance(product, str):
            product = json.loads(product)
        
        # Add source URL to each product
        product["URL"] = product_url
        parsed_products.append(product)
    
    return parsed_products


async def scrape_multiple_products(
    product_urls: List[str],
    openai_api_key: str
) -> tuple[List[Dict], List[str]]:
    """
    Scrape multiple product pages.
    
    Args:
        product_urls: List of product URLs
        openai_api_key: OpenAI API key
        
    Returns:
        tuple: (list of products, list of errors)
    """
    all_products = []
    errors = []
    
    for i, url in enumerate(product_urls):
        print(f"\n[{i+1}/{len(product_urls)}] Scraping: {url}")
        
        try:
            products = await scrape_product_details(url, openai_api_key)
            
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