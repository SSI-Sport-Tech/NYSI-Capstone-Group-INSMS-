import asyncio
import logging
from urllib.parse import quote_plus

logging.basicConfig(level=logging.DEBUG)
logging.getLogger("app.services.certification_searcher").setLevel(logging.DEBUG)

from app.services.certification_searcher import (
    _run_scraper_async,
    _build_search_prompt,
    _extract_product_info,
    CERTIFICATION_DATABASES,
)


async def test_org(org_name: str, brand: str, product: str):
    print()
    print("=" * 60)
    print(f"TESTING: {org_name}")
    print("=" * 60)

    config = CERTIFICATION_DATABASES[org_name]

    prompt = _build_search_prompt(org_name, config, brand, product)
    url = config["search_url"] + config.get("search_param", "?search=") + quote_plus(brand)

    print(f"URL: {url}")

    result = await _run_scraper_async(prompt, url)
    print(f"Raw result: {result}")

    search_url = url
    product_info = _extract_product_info(result, config, search_url)
    print(f"Product info: {product_info}")

    # Simulate strict gate
    is_found_strict = (
        result.get("found") and
        result.get("page_has_results") and
        (product_info["has_valid_product"] or len(product_info["products_found"]) > 0)
    )

    # Simulate loose gate
    is_found_loose = result.get("found") is True

    print(f"found            = {result.get('found')}")
    print(f"page_has_results = {result.get('page_has_results')}")
    print(f"products_found   = {result.get('products_found')}")
    print(f"has_valid_product= {product_info['has_valid_product']}")
    print(f"is_found STRICT  = {is_found_strict}")
    print(f"is_found LOOSE   = {is_found_loose}")


async def main():
    brand = "Optimum Nutrition"
    product = "Gold Standard Whey"

    for org in ["NSF Sport", "HASTA", "BSCG"]:
        await test_org(org, brand, product)

    print()
    print("Done.")


asyncio.run(main())