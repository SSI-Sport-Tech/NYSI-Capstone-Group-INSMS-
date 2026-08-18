"""
OCR enrichment service for products with nutritional images.
Downloads images and runs OCR workflow to extract nutrition data.
"""

import os
import uuid
import requests
from typing import Dict, Optional
import asyncio
from app.services.ocr_subprocess import run_ocr_in_subprocess

from app.services.nutrition_workflow import NutritionWorkflow


# Initialize OCR workflow (reuse across requests)
ocr_workflow = NutritionWorkflow(timeout=200, verbose=False)


def flatten_nutrients(nutrients_block: dict) -> dict:
    import re
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

        amount_str = str(amount).strip()

        # Parse value and unit from strings like "5000mg", "3.4g", "5000"
        match = re.match(
            r'^[<]?\s*(\d+(?:\.\d+)?)\s*(mg|g|mcg|ug|µg|μg|kcal|cal|ml|l)?',
            amount_str.lower()
        )
        if match:
            value = float(match.group(1))
            unit = match.group(2) or ''
            # Append unit to name if unit found and name doesn't already have one
            if unit and '(' not in name:
                name = f"{name} ({unit})"
        else:
            try:
                value = float(amount_str)
            except (ValueError, TypeError):
                continue

        output[name] = value

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
    image_url = product.get("Nutritional Information Image")

    if not image_url or image_url == "NA":
        product["Nutrition_Source"] = "Scraped"
        return False

    lower_url = image_url.lower()
    if any(x in lower_url for x in [".svg", "logo", "icon", "badge", "banner"]):
        print(f"⏭️ Skipping non-nutrition image: {image_url}")
        product["Nutrition_Source"] = "Scraped"
        return False

    image_path = None
    try:
        os.makedirs("tmp_images", exist_ok=True)
        image_path = f"tmp_images/{uuid.uuid4().hex}.jpg"

        content = fetch_image_with_fallback(image_url)
        # Resize large images before OCR to reduce memory and processing time
        try:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(content))
            w, h = img.size
            if w > 1500 or h > 1500:
                scale = 1500 / max(w, h)
                img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
                # Convert RGBA to RGB before saving as JPEG
                if img.mode in ("RGBA", "P", "LA"):
                    img = img.convert("RGB")
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=85)
                content = buf.getvalue()
                print(f"  📐 Resized image from {w}x{h} to {img.size}")
        except Exception as e:
            print(f"  ⚠️ Could not resize image: {e}")
        
        with open(image_path, "wb") as f:
            f.write(content)

        # Run OCR in subprocess — memory freed completely on exit
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, run_ocr_in_subprocess, image_path
        )

        if not result or result.get("error"):
            return False

        import json
        print(f"   OCR raw per_serving: {json.dumps(result.get('nutritional_info_per_serving'), ensure_ascii=False)[:300]}")
        print(f"   OCR raw per_100g: {json.dumps(result.get('nutritional_info_per_100g'), ensure_ascii=False)[:300]}")

        product["Per 100g"] = flatten_nutrients(result.get("nutritional_info_per_100g", {}))
        product["Per Serving Size"] = flatten_nutrients(result.get("nutritional_info_per_serving", {}))
        product["Serving Size"] = product.get("Serving Size") or result.get("serving_size_text")
        product["Nutrition_Source"] = "OCR"

        print(f"✅ OCR enriched: {product.get('Name')}")
        return True

    except Exception as e:
        import traceback
        print(f"⚠️ OCR failed for {product.get('Name')}: {e}")
        traceback.print_exc()
        return False

    finally:
        if image_path and os.path.exists(image_path):
            os.remove(image_path)