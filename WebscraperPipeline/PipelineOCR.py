import uuid
import os
import requests
from OCR.agent import NutritionWorkflow
import asyncio
import nest_asyncio
nest_asyncio.apply()

ocr_workflow = NutritionWorkflow(timeout=200, verbose=False)

def download_image(url, save_dir="tmp_images"):
    os.makedirs(save_dir, exist_ok=True)


    path = os.path.join(save_dir, f"{uuid.uuid4().hex}.jpg")
    r = requests.get(url, timeout=30)
    r.raise_for_status()


    with open(path, "wb") as f:
        f.write(r.content)


    return path

def flatten_nutrients(nutrients_block: dict) -> dict:
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

def enrich_product_with_ocr(product: dict) -> bool:
    image_url = product.get("Nutritional Information Image")

    if not image_url or image_url == "NA":
        return False

    # Skip if nutrition already exists
    if product.get("Per 100g") or product.get("Per Serving Size"):
        return False

    os.makedirs("tmp_images", exist_ok=True)
    image_path = f"tmp_images/{uuid.uuid4().hex}.jpg"

    try:
        content = fetch_image_with_fallback(image_url)

        with open(image_path, "wb") as f:
            f.write(content)

        result = run_ocr_blocking(image_path)

        if not result or "error" in result:
            return False

        # 🔗 MERGE OCR DATA
        product["Per 100g"] = flatten_nutrients(result.get("nutritional_info_per_100g",{}))
        product["Per Serving Size"] = flatten_nutrients(result.get("nutritional_info_per_serving",{}))
        product["Serving Size"] = (
            product.get("Serving Size")
            or result.get("serving_size_text")
        )
        product["Nutrition_Source"] = "OCR"

        return True

    finally:
        if os.path.exists(image_path):
            os.remove(image_path)


def swap_dash_underscore(url: str) -> str | None:
    if "-_" in url:
        return url.replace("-_", "_-", 1)
    if "_-" in url:
        return url.replace("_-", "-_", 1)
    return None

def fetch_image_with_fallback(url: str, timeout: int = 30) -> bytes:
    # 1️⃣ Try original
    r = requests.get(url, timeout=timeout)
    if r.status_code == 200:
        return r.content

    # 2️⃣ Only fallback on 404
    if r.status_code != 404:
        r.raise_for_status()

    # 3️⃣ Try swapped version
    swapped = swap_dash_underscore(url)
    if not swapped:
        raise requests.exceptions.HTTPError(
            f"404 and no swappable pattern in URL: {url}"
        )

    r2 = requests.get(swapped, timeout=timeout)
    if r2.status_code == 200:
        return r2.content

    r2.raise_for_status()

def run_ocr_blocking(image_path: str) -> dict | None:
    try:
        return asyncio.run(_run_ocr_async(image_path))
    except RuntimeError as e:
        # This happens if a loop already exists (VSCode, notebooks)
        if "asyncio.run() cannot be called" in str(e):
            loop = asyncio.get_event_loop()
            return loop.create_task(
                _run_ocr_async(image_path)
            )
        raise

async def _run_ocr_async(image_path: str) -> dict:
    return await ocr_workflow.run(image_path=image_path)

# download_image("https://cdn.shopify.com/s/files/1/0454/0871/4919/files/protein_wafers_milk_chocolate_peanut_nutritional_panel.jpg?v=1768317175")