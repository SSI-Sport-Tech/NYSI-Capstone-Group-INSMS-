"""
Product listing page scraper service.
Extracts product URLs from catalog/collection pages using Selenium + ScrapeGraphAI.
"""

import os
from typing import List, Dict
from urllib.parse import urlparse, urlunparse
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from scrapegraphai import graphs
from pydantic import BaseModel
import time
from pathlib import Path


class ProductListSchema(BaseModel):
    """Schema for product list extraction."""
    URLs: List[str]
    pages_no: int


def normalize_url(url: str) -> str:
    """
    Normalize URL by removing trailing slashes and fixing unicode dashes.
    
    Example:
        'https://example.com/path/' -> 'https://example.com/path'
    """
    # Fix unicode dashes that LLMs sometimes output instead of regular hyphens
    url = url.replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', '-')
    
    parsed = urlparse(url)
    path = parsed.path.rstrip("/")
    return urlunparse(parsed._replace(path=path))


def selenium_fetch(
    url: str,
    wait_time: int = 5,
    scroll_pause: int = 2,
    max_scrolls: int = 20
) -> tuple[str, str]:
    """
    Returns (page_html, final_url_after_redirects)
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
        driver.execute_script("""
        document.querySelectorAll(
            '[role="dialog"], .modal, .popup, .overlay'
        ).forEach(el => el.remove());
        """)
        last_height = driver.execute_script("return document.body.scrollHeight")
        for _ in range(max_scrolls):
            driver.execute_script("""
            document.querySelectorAll(
                '[role="dialog"], .modal, .popup, .overlay'
            ).forEach(el => el.remove());
            """)
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(scroll_pause)
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height

        final_url = driver.current_url  # ← capture after redirects
        return driver.page_source, final_url
    finally:
        driver.quit()


async def scrape_product_list(
    list_url: str,
    max_pages: int = None
) -> List[str]:
    """
    Scrape all product URLs from a listing page with pagination.

    Args:
        list_url: URL of product listing page
        max_pages: Maximum pages to scrape (None = all pages)

    Returns:
        List[str]: List of unique product URLs
    """
    # ScrapeGraphAI configuration
    config = {
        "llm": {
            "model": f"ollama/{os.environ.get('OLLAMA_MODEL', 'gpt-oss:20b')}",
            "base_url": os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434"),
            "model_tokens": 32000,
            "temperature": 0,
        },
        "verbose": False,
    }
    

    
    all_products = []
    current_page = 1
    detected_max_pages = 1

    while True:
        # Stop if we've reached max_pages limit
        if max_pages is not None and current_page > max_pages:
            print(f"✅ Reached max_pages limit ({max_pages})")
            break

        # Stop if we've scraped all detected pages
        if current_page > detected_max_pages:
            print(f"✅ Scraped all {detected_max_pages} page(s)")
            break

        # Build paginated URL
        if current_page == 1:
            url = list_url
        else:
            url = f"{list_url}?page={current_page}"

        try:
            print(f"\n📄 Scraping page {current_page}/{detected_max_pages}: {url}")
            
            # Fetch page with Selenium
            source, final_url = selenium_fetch(url)

            # Use actual domain after redirects for base URL
            parsed_final = urlparse(final_url)
            actual_base_url = f"{parsed_final.scheme}://{parsed_final.netloc}"
            print(f"   Base URL: {actual_base_url} (final after redirects)")

            # Extraction prompt
            prompt = f"""
            List all product information links on this page for passing to Python requests.

            BASE URL: {actual_base_url}
            
            REQUIREMENTS:
            1. Each link must be a FULL ABSOLUTE URL (include https:// and domain {actual_base_url}   )
            2. Do NOT include relative paths
            3. Only include links for SPECIFIC PRODUCTS (not category/filter links)
            4. Do NOT include non-nutritional products (clothing, accessories, etc.)
            5. Format as a list of URLs
            6. Indicate total pages available with ?page=x parameter
            
            OUTPUT FORMAT:
            {{
                "URLs": [f
                    "https://example.com/products/product-a",
                    "https://example.com/products/product-b",
                    ...
                ],
                "pages_no": 5
            }}
            
            If only 1 page exists, set "pages_no": 1
            """
            
            # Extract product URLs with ScrapeGraphAI
            scraper = graphs.SmartScraperGraph(
                prompt=prompt,
                source=source,
                config=config,
                schema=ProductListSchema
            )

            result = scraper.run()

            # Normalize output structure
            if "content" in result:
                page_data = result["content"][0]
            else:
                page_data = result

            products = page_data.get("URLs", [])

            if not products:
                print(f"⚠️ No products found on page {current_page}. Stopping.")
                break

            # Normalize URLs (remove trailing slashes)
            products = [normalize_url(u) for u in products]
            all_products.extend(products)
            print(f"✅ Found {len(products)} products on page {current_page}")

            # Update max_pages on first page
            if current_page == 1:
                detected_max_pages = page_data.get("pages_no", 1)
                print(f"📊 Total pages detected: {detected_max_pages}")

            current_page += 1

        except Exception as e:
            print(f"❌ Error scraping page {current_page}: {e}")
            break

    # Remove duplicates (preserve order)
    unique_products = list(dict.fromkeys(all_products))
    print(f"\n🎉 Total unique products found: {len(unique_products)}")
    
    return unique_products