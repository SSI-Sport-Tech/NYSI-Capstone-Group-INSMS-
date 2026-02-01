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

import nest_asyncio  
nest_asyncio.apply()  

class URLSchema(BaseModel):
    Found: bool
    URL: Optional[str] = None

class batchNoTest(BaseModel):
    Found: bool
    Detail: Optional[str] = None

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
    # options.add_argument("--headless=new") #Disable for HASTA
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
    
    # Wait until the input element exists in the DOM and is displayed & enabled
    input_el = wait.until(lambda d: next(
        (el for el in d.find_elements(By.NAME, "woof_text")
         if el.is_displayed() and el.is_enabled()),
        None
    ))

    if input_el is None:
        raise Exception("HASTA search input not found")

    # Scroll and focus AFTER we know the element exists
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", input_el)
    driver.execute_script("arguments[0].focus();", input_el)

    return input_el


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
            "model": "openai/gpt-4o-mini",
        },
    }

    prompt = f"Find this product on the web page list and output the exact URL if it exists:{supplementBrand}."
    
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

async def scrape_batch_no_test(
    batchno: str,
    url,
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
            "model": "openai/gpt-4o-mini",
        },
    }

    prompt = f"Check if this batch number is on the web page list:{batchno}. Also output any details such as expiry date as a plain text if found."

    # Create scraper with schema validation
    scraper = graphs.SmartScraperGraph(
        prompt=prompt,
        source=url,
        config=config,
        schema=batchNoTest
    )
    
    # Run extraction
    result = scraper.run()
    print(result)
    # Normalize result (handle string response)
    if isinstance(result, str):
        result = json.loads(result)
    
    print(result)
    return result

url_dicts = [
    {
        "Name":"Informed Sport",
        "URL":"https://sport.wetestyoutrust.com/",
        "Domain":"https://sport.wetestyoutrust.com",
        "WaitFn":defaultwait,
        "Relative URL": True
    },
    {
        "Name":"Informed Choice",
        "URL":"https://choice.wetestyoutrust.com/",
        "Domain":"https://choice.wetestyoutrust.com",
        "WaitFn":defaultwait,
        "Relative URL": True
    },
    {
        "Name":"HASTA",
        "URL":"https://hasta.org.au/certified",
        "WaitFn":HASTAWait,
        "Relative URL": False
    },
    {
        "Name":"BSCG",
        "URL":"https://www.bscg.org/certified-drug-free-database",
        "WaitFn":defaultwait,
        "Relative URL": False
    },
    {
        "Name":"NSF Sport",
        "URL":"https://www.nsfsport.com/certified-products/",
        "Domain":"https://www.nsfsport.com/",
        "WaitFn":NSFSportWait,
        "Relative URL": True
    },
        {
        "Name":"Cologne List",
        "URL":"https://www.koelnerliste.com/en/product-database",
        "Domain":"https://www.koelnerliste.com/",
        "WaitFn":CologneListWait,
        "Relative URL": True
    }
]

async def check_batch_test_full(
    openai_api_key: str,
    supplement: str = "",
    brand: str = "",
    batch_no: str = ""
):
    out = {}
    for url_dict in url_dicts:
        source = None
        checked = None
        if batch_no:
            source = selenium_fetch_batch_test_url(url_dict["URL"],batch_no,url_dict["WaitFn"],2)
            checked = batch_no
        if source is None and supplement:
            source = selenium_fetch_batch_test_url(url_dict["URL"],brand + " " + supplement,url_dict["WaitFn"],2)
            checked = brand + " " + supplement
        if source is None and supplement:
            source = selenium_fetch_batch_test_url(url_dict["URL"],supplement,url_dict["WaitFn"],2)
            checked = brand + " " + supplement

        if source:
            url_result = await scrape_url(checked,source,openai_api_key)
            if url_dict["Relative URL"]:
                full_url = url_dict["Domain"] + url_result["URL"]
            else:
                full_url = url_result["URL"]
            out[url_dict["Name"]] = {"Product Found":url_result["Found"],"URL":full_url}
            if url_result["Found"] and batch_no:
                batch_no_result = await scrape_batch_no_test(batch_no,full_url,openai_api_key)
                out[url_dict["Name"]]["Batch Found"] = batch_no_result["Found"]
    return out
        

    


import os
from dotenv import load_dotenv
load_dotenv()
openai_key = os.getenv("OPENAI_API_KEY")
import asyncio
if __name__ == "__main__":
    source = selenium_fetch_batch_test_url(url_dicts[5]["URL"],'high fructose gel strawberry',url_dicts[5]["WaitFn"],2)
    result = asyncio.run(
        scrape_url("226ers sports things high fructose gel strawberry",source,openai_api_key=openai_key)
    )
    print(result)

# if __name__ == "__main__":
#     result = asyncio.run(
#         scrape_batch_no_test("G25325","https://sport.wetestyoutrust.com/supplement-search/endurance-elite-performance-energy-gel",openai_api_key=openai_key)
#     )
#     print(result)

# if __name__ == "__main__":
#     result = asyncio.run(
#         check_batch_test_full(batch_no="G25325",openai_api_key=openai_key)
#     )
#     print(result)