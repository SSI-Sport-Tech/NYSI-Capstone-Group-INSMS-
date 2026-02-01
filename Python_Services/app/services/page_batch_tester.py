import os
from typing import List, Dict, Optional
from urllib.parse import urlparse, urlunparse
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from scrapegraphai import graphs
from pydantic import BaseModel
import time
from pathlib import Path
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
import json

class URLSchema(BaseModel):
    Found: bool
    URL: Optional[str] = None


def selenium_fetch_batch_test_url(
    url: str,
    search: str,
    wait_fn,
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
    # options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")

    driver = webdriver.Chrome(options=options)
    wait = WebDriverWait(driver, 10)


    try:
        driver.get(url)
        time.sleep(wait_time)

        search_input = wait_fn(driver,wait)
        search_input.clear()
        search_input.send_keys(search)
        search_input.send_keys(Keys.ENTER)
        wait.until(lambda d: search.lower() in d.page_source.lower())

        return driver.page_source

    finally:
        driver.quit()
        
def defaultwait(driver,wait):
    driver.execute_script("""
        document.querySelectorAll(
            '[role="dialog"], .modal, .popup, .overlay'
        ).forEach(el => el.remove());
        """)
    return wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "input[type='search']"))
    )

def NSFSportWait(driver,wait):
    driver.execute_script("""
        document.querySelectorAll(
            '[role="dialog"], .modal, .popup, .overlay'
        ).forEach(el => el.remove());
        """)
    return wait.until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "input.keyword__input.input--search"))
    )

def HASTAWait(driver,wait):
    driver.execute_script("""
        document.querySelectorAll(
            '[role="dialog"], .modal, .popup, .overlay'
        ).forEach(el => el.remove());
        """)
    
    elements = driver.find_elements(
    By.XPATH, "//input[@type='search' and @name='woof_text']"
)

    return next(
        el for el in elements
        if el.is_displayed() and el.is_enabled()
    )



def CologneListWait(driver,wait):
    checkbox = wait.until(
    EC.element_to_be_clickable((By.ID, "agree"))
    )
    if not checkbox.is_selected():  # only click if not already checked
        checkbox.click()
    continue_btn = wait.until(
    EC.element_to_be_clickable((By.ID, "submitconditions"))
    )
    continue_btn.click()
    deny_btn = wait.until(
    EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-cookieman-accept-none]"))
    )
    deny_btn.click()
    return wait.until(
    EC.element_to_be_clickable(
        (By.CSS_SELECTOR, "input[placeholder='find a product or company...']")
    )
)

async def scrape_url(
    supplementBrand: str,
    source,
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

    prompt = f"Find this product on the web page list and output the absolute URL if it exists:{supplementBrand}. The link must be a FULL ABSOLUTE URL (include https:// and domain)"
    
    # Create scraper with schema validation
    scraper = graphs.SmartScraperGraph(
        prompt=prompt,
        source=source,
        config=config,
        schema=URLSchema
    )
    
    # Run extraction
    result = scraper.run()
    print(result)
    # Normalize result (handle string response)
    if isinstance(result, str):
        result = json.loads(result)
    
    print(result)
    return result


urls = [
    "https://choice.wetestyoutrust.com/", #works
    "https://sport.wetestyoutrust.com/", #works
    "https://hasta.org.au/certified", #works with hastawait
    "https://www.bscg.org/certified-drug-free-database",#works
    "https://www.nsfsport.com/certified-products/",#works with nsfsportwait
    "https://www.koelnerliste.com/en/product-database" #works wit colognelistwait

]

import os
from dotenv import load_dotenv
load_dotenv()
openai_key = os.getenv("OPENAI_API_KEY")
import asyncio
if __name__ == "__main__":
    source = selenium_fetch_batch_test_url(urls[1],'endurance elite performance energy gel',defaultwait,2)
    result = asyncio.run(
        scrape_url("Applied Nutrition ENDURANCE ELITE PERFORMANCE ENERGY GEL",source,openai_api_key=openai_key)
    )
    print(result)