

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
        r = requests.get(image_url, timeout=30)
        r.raise_for_status()

        with open(image_path, "wb") as f:
            f.write(r.content)

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