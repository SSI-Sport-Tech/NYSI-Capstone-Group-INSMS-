import requests
from scrapegraphai import graphs
import json
from pydantic import BaseModel
from typing import Union, List, Dict

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
import time

def selenium_fetch(url, wait_time=5, scroll_pause=2):
    # Configure Selenium WebDriver
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    driver = webdriver.Chrome(options=options)

    try:
        # Open the URL
        driver.get(url)
        time.sleep(wait_time)  # Allow initial page load

        # Simulate scrolling to load more products
        last_height = driver.execute_script("return document.body.scrollHeight")
        while True:
            driver.find_element(By.TAG_NAME, "body").send_keys(Keys.END)
            time.sleep(scroll_pause)  # Allow time for additional products to load
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:  # Break if no new content is loaded
                break
            last_height = new_height

        # Return the full page source
        return driver.page_source

    finally:
        driver.quit()



openai_key = "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"

gpt4o = {
   "llm": {
      "api_key": openai_key,
      "model": "openai/gpt-4o",
   },
   "headless": False,
}

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

def scrape_all_pages(base_url):
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


scrape_all_pages("https://appliednutrition.uk/collections/best-sellers")
# scrape_all_pages("https://www.healthspanelite.co.uk/sports-nutrition/",1)

