import os
from typing import List, Dict
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
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC



def selenium_fetch_informed_nutrition(
    url: str, 
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
        search_input.send_keys("protein powder")
        search_input.send_keys(Keys.ENTER)
        wait.until(
            EC.any_of(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".product-card")),
                EC.presence_of_element_located((By.CSS_SELECTOR, ".no-results"))
            )
        )

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


urls = [
    "https://choice.wetestyoutrust.com/", #works
    "https://sport.wetestyoutrust.com/", #works
    "https://hasta.org.au/certified", #works
    "https://www.bscg.org/certified-drug-free-database",#works
    "https://www.nsfsport.com/certified-products/",#works with nsfsportwait
    "https://www.koelnerliste.com/en/product-database" #works wit colognelistwait
    
]

selenium_fetch_informed_nutrition(urls[5],CologneListWait,2)