"""
OCR enrichment service for products with nutritional images.
Downloads images and runs OCR workflow to extract nutrition data.
"""

import os
import uuid
import requests
from typing import Dict, Optional
import asyncio

from app.services.nutrition_workflow import NutritionWorkflow


# Initialize OCR workflow (reuse across requests)
ocr_workflow = NutritionWorkflow(timeout=200, verbose=False)


def flatten_nutrients(nutrients_block: dict) -> dict:
    """
    Flatten nutrients from OCR format to simple key-value dict.
    
    Input: {"nutrients": [{"name": "Protein (g)", "amount": "24"}, ...]}
    Output: {"Protein (g)": 24.0, ...}
    """
    output = {}
    
    if not nutrients_block or not isinstance(nutrients_block, dict):
        return {}
    
    nutrients = nutrients_block.get("nutrients") or []
    if not isinstance(nutrients, list):
        return {}
    
    for item in nutrients:
        if not isinstance(item, dict):
            continue
        
        name = item.get("name")
        amount = item.get("amount")
        
        if not name or amount is None:
            continue
        
        try:
            output[name] = float(amount)
        except ValueError:
            continue
    
    return output


def download_image(url: str, save_dir: str = "tmp_images") -> str:
    """
    Download image from URL to temporary directory.
    
    Args:
        url: Image URL
        save_dir: Directory to save image
        
    Returns:
        str: Path to downloaded image
    """
    os.makedirs(save_dir, exist_ok=True)
    path = os.path.join(save_dir, f"{uuid.uuid4().hex}.jpg")
    
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    
    with open(path, "wb") as f:
        f.write(response.content)
    
    return path


def swap_dash_underscore(url: str) -> Optional[str]:
    """
    Swap -_ with _- in URL (common CDN URL pattern).
    
    Example: 
        'url_-123.jpg' -> 'url-_123.jpg'
    """
    if "-_" in url:
        return url.replace("-_", "_-", 1)
    if "_-" in url:
        return url.replace("_-", "-_", 1)
    return None


def fetch_image_with_fallback(url: str, timeout: int = 30) -> bytes:
    """
    Fetch image with fallback to swapped URL pattern.
    
    Some CDNs use different URL patterns for the same image.
    This tries the original URL, then a swapped version if 404.
    """
    # Try original URL
    response = requests.get(url, timeout=timeout)
    if response.status_code == 200:
        return response.content
    
    # Only fallback on 404
    if response.status_code != 404:
        response.raise_for_status()
    
    # Try swapped URL pattern
    swapped = swap_dash_underscore(url)
    if not swapped:
        raise requests.exceptions.HTTPError(
            f"404 and no swappable pattern in URL: {url}"
        )
    
    response2 = requests.get(swapped, timeout=timeout)
    if response2.status_code == 200:
        return response2.content
    
    response2.raise_for_status()


async def enrich_product_with_ocr(product: Dict) -> bool:
    """
    Enrich product with OCR-extracted nutrition data.
    
    Args:
        product: Product dictionary (modified in-place)
        
    Returns:
        bool: True if enrichment successful, False otherwise
    """
    image_url = product.get("Nutritional Information Image")
    
    # Skip if no image or already has nutrition data
    if not image_url or image_url == "NA":
        product["Nutrition_Source"] = "Scraped"
        return False
    
    image_path = None
    
    try:
        # Download image
        os.makedirs("tmp_images", exist_ok=True)
        image_path = f"tmp_images/{uuid.uuid4().hex}.jpg"
        
        content = fetch_image_with_fallback(image_url)
        with open(image_path, "wb") as f:
            f.write(content)
        
        # Run OCR workflow
        result = await ocr_workflow.run(image_path=image_path)
        
        if not result or "error" in result:
            return False
        
        # Merge OCR data into product
        product["Per 100g"] = flatten_nutrients(
            result.get("nutritional_info_per_100g", {})
        )
        product["Per Serving Size"] = flatten_nutrients(
            result.get("nutritional_info_per_serving", {})
        )
        product["Serving Size"] = (
            product.get("Serving Size") 
            or result.get("serving_size_text")
        )
        product["Nutrition_Source"] = "OCR"
        
        print(f"✅ OCR enriched: {product.get('Name')}")
        return True
        
    except Exception as e:
        print(f"⚠️ OCR failed for {product.get('Name')}: {e}")
        return False
        
    finally:
        # Cleanup
        if image_path and os.path.exists(image_path):
            os.remove(image_path)