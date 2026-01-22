import requests
from scrapegraphai import graphs
import json
from pydantic import BaseModel
from typing import Union, List, Dict, AnyStr
from urllib.parse import urlparse, urlunparse

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
import time

def normalize_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.rstrip("/")  # remove trailing slash
    return urlunparse(parsed._replace(path=path))

def selenium_fetch(url, wait_time=5, scroll_pause=2, max_scrolls=20):
    from selenium.webdriver.chrome.options import Options
    from selenium import webdriver
    import time
    from pathlib import Path

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

        # Remove overlays
        driver.execute_script("""
        document.querySelectorAll(
            '[role="dialog"], .modal, .popup, .overlay'
        ).forEach(el => el.remove());
        """)

        # Scroll in a loop
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

        # Optional: save snapshot for debugging
        Path("debug").mkdir(exist_ok=True)
        Path("debug/page.html").write_text(driver.page_source, encoding="utf-8")

        return driver.page_source

    finally:
        driver.quit()



product_list_prompt = """
        List me all the product information links on this page to pass to python requests. 
        Each link must be a full absolute URL (including the https:// prefix and domain name), not a relative path.
        Do not include any links that are not for specific products.
        Do not include links for non-nutritional products like clothing or accessories
        Format as a list of links, not a string
        Also indicate how many pages there are for this list accessible with ?page=x.
        Example output if there are 5 pages:
        {
            "URLs": [
            "https://example.com/products/product-a",
            "https://example.com/products/product-b",
            "https://example.com/products/product-c",
            "https://example.com/products/product-d",
            "https://example.com/products/product-e",
            "https://example.com/products/product-f"
            ],
            "pages_no": 5
        }

        Example output if there is only 1 page:
        {
            "URLs": [
            "https://example.com/products/product-a",
            "https://example.com/products/product-b",
            "https://example.com/products/product-c",
            "https://example.com/products/product-d",
            "https://example.com/products/product-e",
            "https://example.com/products/product-f"
            ],
            "pages_no": 1
        }
        """
        
class ProductListSchema(BaseModel):
    URLs: List[str]
    pages_no: int

def scrape_all_pages(base_url,openai_key):
    gpt4o = {
   "llm": {
      "api_key": openai_key,
      "model": "openai/gpt-4o",
   },
   "headless": False,
}
    
    """Scrape all pages with pagination"""
    all_products = []
    max_pages = 1
    page = 1

    while True:
        # Hard stop if max_pages is specified
        if max_pages is not None and page > max_pages:
            print("Reached max_pages limit.")
            break

        if page == 1:
            url = base_url
        else:
            url = f"{base_url}?page={page}"

        try:
            print(f"Scraping page {page}: {url}")
            source = selenium_fetch(url)
            smart_scraper_graph_gpt4o = graphs.SmartScraperGraph(
                prompt=product_list_prompt,
                source=source,
                config=gpt4o,
                schema=ProductListSchema
            )

            result_gpt4o = smart_scraper_graph_gpt4o.run()

            # Normalize output
            if "content" in result_gpt4o:
                page_data = result_gpt4o["content"][0]
            else:
                page_data = result_gpt4o

            products = page_data.get("URLs", [])

            if not products:
                print(f"No products found on page {page}. Stopping.")
                break

            products = [normalize_url(u) for u in page_data.get("URLs", [])]
            all_products.extend(products)
            print(f"Found {len(products)} products on page {page}")

            if page == 1:
                max_pages = page_data.get("pages_no")
            page += 1

        except requests.exceptions.RequestException as e:
            print(f"Error scraping page {page}: {e}")
            break

    all_uniques = list(dict.fromkeys(all_products))
    print(f"Total products scraped: {len(all_uniques)}")
    return all_uniques

openai_key = "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"

scrape_all_pages("https://www.etixxsports.com/nl-be/collections/all",openai_key)

