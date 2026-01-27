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
    Normalize URL by removing trailing slashes.
    
    Example:
        'https://example.com/path/' -> 'https://example.com/path'
    """
    parsed = urlparse(url)
    path = parsed.path.rstrip("/")
    return urlunparse(parsed._replace(path=path))


def selenium_fetch(
    url: str, 
    wait_time: int = 5, 
    scroll_pause: int = 2, 
    max_scrolls: int = 20
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

        # Remove overlay popups/modals
        driver.execute_script("""
        document.querySelectorAll(
            '[role="dialog"], .modal, .popup, .overlay'
        ).forEach(el => el.remove());
        """)

        # Infinite scroll to load all products
        last_height = driver.execute_script("return document.body.scrollHeight")

        for _ in range(max_scrolls):
            # Remove popups again (they sometimes reappear)
            driver.execute_script("""
            document.querySelectorAll(
                '[role="dialog"], .modal, .popup, .overlay'
            ).forEach(el => el.remove());
            """)
            
            # Scroll to bottom
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(scroll_pause)

            # Check if page height changed (new content loaded)
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break  # No more content
            last_height = new_height

        return driver.page_source

    finally:
        driver.quit()


async def scrape_product_list(
    list_url: str,
    openai_api_key: str,
    max_pages: int = None
) -> List[str]:
    """
    Scrape all product URLs from a listing page with pagination.
    
    Args:
        list_url: URL of product listing page
        openai_api_key: OpenAI API key for GPT-4o
        max_pages: Maximum pages to scrape (None = all pages)
        
    Returns:
        List[str]: List of unique product URLs
    """
    # ScrapeGraphAI configuration
    config = {
        "llm": {
            "api_key": openai_api_key,
            "model": "openai/gpt-4o",
        },
        "headless": False,
    }
    
    # Extraction prompt
    prompt = """
    List all product information links on this page for passing to Python requests.
    
    REQUIREMENTS:
    1. Each link must be a FULL ABSOLUTE URL (include https:// and domain)
    2. Do NOT include relative paths
    3. Only include links for SPECIFIC PRODUCTS (not category/filter links)
    4. Do NOT include non-nutritional products (clothing, accessories, etc.)
    5. Format as a list of URLs
    6. Indicate total pages available with ?page=x parameter
    
    OUTPUT FORMAT:
    {
        "URLs": [
            "https://example.com/products/product-a",
            "https://example.com/products/product-b",
            ...
        ],
        "pages_no": 5
    }
    
    If only 1 page exists, set "pages_no": 1
    """
    
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
            source = selenium_fetch(url)
            
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