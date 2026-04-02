"""
Enhanced Certification database searcher with Selenium integration.
Combines AI scraping with specific search bar interaction for each organization.

FEATURES:
- Selenium-based search for accurate results
- Organization-specific wait functions and search strategies
- Batch ID verification with proper search input handling
- Falls back to AI scraping if needed
"""

import asyncio
import json
import re
import logging
import functools
import time
from typing import Dict, List, Optional, Any
from urllib.parse import quote_plus, urlparse
from concurrent.futures import ThreadPoolExecutor

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os

from app.config.settings import settings

logger = logging.getLogger(__name__)

# Thread pool for running sync scrapers
_executor = ThreadPoolExecutor(max_workers=6)

from fake_headers import Headers
import queue
import threading

class ChromeDriverPool:
    def __init__(self, size=6):
        self._pool = queue.Queue()
        self._lock = threading.Lock()
        for _ in range(size):
            self._pool.put(self._create_driver())

    def _create_driver(self):
        options = Options()
        if settings.scraper_headless:
            options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")
        # Skip fake_headers overhead — set a static UA
        options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

        # Use system-installed Chromium when running in Docker (ARM64/amd64)
        chrome_bin = os.environ.get("CHROME_BIN")
        if chrome_bin:
            options.binary_location = chrome_bin

        chromedriver_bin = os.environ.get("CHROMEDRIVER_BIN")
        if chromedriver_bin:
            from selenium.webdriver.chrome.service import Service
            return webdriver.Chrome(service=Service(chromedriver_bin), options=options)
        return webdriver.Chrome(options=options)

    def acquire(self):
        return self._pool.get(timeout=30)

    def release(self, driver):
        try:
            driver.delete_all_cookies()  # Clean state between uses
            self._pool.put(driver)
        except Exception:
            # Driver died — replace it
            self._pool.put(self._create_driver())

# Module-level singleton
_driver_pool = ChromeDriverPool(size=6)


# ============================================================================
# SELENIUM WAIT FUNCTIONS (Organization-specific)
# ============================================================================

def default_wait(driver, wait):
    """Default search input wait - works for most sites."""
    driver.execute_script("""
        document.querySelectorAll(
            '[role="dialog"], .modal, .popup, .overlay'
        ).forEach(el => el.remove());
    """)
    return wait.until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "input[type='search']"))
    )


def informed_sport_wait(driver, wait):
    """Informed Sport specific wait function."""
    driver.execute_script("""
        document.querySelectorAll(
            '[role="dialog"], .modal, .popup, .overlay'
        ).forEach(el => el.remove());
    """)
    return wait.until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "input[type='search']"))
    )


def informed_choice_wait(driver, wait):
    """Informed Choice specific wait function."""
    driver.execute_script("""
        document.querySelectorAll(
            '[role="dialog"], .modal, .popup, .overlay'
        ).forEach(el => el.remove());
    """)
    return wait.until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "input[type='search']"))
    )


def hasta_wait(driver, wait):
    """HASTA specific wait function - handles their custom search."""
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


def nsf_sport_wait(driver, wait):
    """NSF Sport specific wait function."""
    driver.execute_script("""
        document.querySelectorAll(
            '[role="dialog"], .modal, .popup, .overlay'
        ).forEach(el => el.remove());
    """)
    return wait.until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "input.keyword__input.input--search"))
    )


def cologne_list_wait(driver, wait):
    """Cologne List specific wait function - handles consent forms."""
    # Accept conditions checkbox
    checkbox = wait.until(
        EC.element_to_be_clickable((By.ID, "agree"))
    )
    if not checkbox.is_selected():
        checkbox.click()
    
    # Click continue
    continue_btn = wait.until(
        EC.element_to_be_clickable((By.ID, "submitconditions"))
    )
    continue_btn.click()
    
    # Deny cookies
    deny_btn = wait.until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-cookieman-accept-none]"))
    )
    deny_btn.click()
    
    # Return search input
    return wait.until(
        EC.element_to_be_clickable(
            (By.CSS_SELECTOR, "input[placeholder='find a product or company...']")
        )
    )


def bscg_wait(driver, wait):
    """BSCG specific wait function."""
    driver.execute_script("""
        document.querySelectorAll(
            '[role="dialog"], .modal, .popup, .overlay'
        ).forEach(el => el.remove());
    """)
    return wait.until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "input[type='search']"))
    )


# ============================================================================
# CERTIFICATION DATABASE CONFIGURATIONS (Enhanced with Selenium)
# ============================================================================

CERTIFICATION_DATABASES = {
    "Informed Sport": {
        "search_url": "https://sport.wetestyoutrust.com/supplement-search",
        "search_param": "?search=",
        "batch_search_url": "https://sport.wetestyoutrust.com/supplement-search",
        "batch_search_param": "?search=",
        "base_url": "https://sport.wetestyoutrust.com",
        "correct_domain": "sport.wetestyoutrust.com",
        "description": "Informed Sport - for elite athletes, tests every batch",
        "search_strategy": "brand_first",
        "supports_batch_search": True,
        "use_selenium": True,
        "selenium_wait_fn": informed_sport_wait,
        "selenium_base_url": "https://sport.wetestyoutrust.com/",
        "has_relative_urls": True
    },
    "Informed Choice": {
        "search_url": "https://choice.wetestyoutrust.com/supplement-search",
        "search_param": "?search=",
        "batch_search_url": "https://choice.wetestyoutrust.com/supplement-search",
        "batch_search_param": "?search=",
        "base_url": "https://choice.wetestyoutrust.com",
        "correct_domain": "choice.wetestyoutrust.com",
        "description": "Informed Choice - for general consumers, monthly testing",
        "search_strategy": "brand_first",
        "supports_batch_search": True,
        "use_selenium": True,
        "selenium_wait_fn": informed_choice_wait,
        "selenium_base_url": "https://choice.wetestyoutrust.com/",
        "has_relative_urls": True
    },
    "HASTA": {
        "search_url": "https://hasta.org.au/certified/",
        "search_param": "?_search=",
        "batch_search_url": "https://hasta.org.au/certified/",
        "batch_search_param": "?woof_text=",
        "base_url": "https://hasta.org.au",
        "correct_domain": "hasta.org.au",
        "description": "Human and Supplement Testing Australia",
        "search_strategy": "brand_only",
        "supports_batch_search": True,
        "use_selenium": True,
        "selenium_wait_fn": hasta_wait,
        "selenium_base_url": "https://hasta.org.au/certified",
        "has_relative_urls": False
    },
    "NSF Sport": {
        "search_url": "https://www.nsfsport.com/certified-products/",
        "search_param": "?keyword=",
        "batch_search_url": "https://www.nsfsport.com/certified-products/search-results.php",
        "batch_search_param": "?keyword=",
        "base_url": "https://www.nsfsport.com",
        "correct_domain": "www.nsfsport.com",
        "description": "NSF Certified for Sport",
        "search_strategy": "brand_first",
        "supports_batch_search": True,
        "use_selenium": True,
        "selenium_wait_fn": nsf_sport_wait,
        "selenium_base_url": "https://www.nsfsport.com/certified-products/",
        "has_relative_urls": True
    },
    "Cologne List": {
        "search_url": "https://www.koelnerliste.com/en/product-database",
        "base_url": "https://www.koelnerliste.com",
        "correct_domain": "www.koelnerliste.com",
        "product_url_pattern": "https://www.koelnerliste.com/en/product/",
        "description": "Kölner Liste - German Sport University Cologne",
        "search_strategy": "browse_table",
        "supports_batch_search": False,
        "use_selenium": True,
        "selenium_wait_fn": cologne_list_wait,
        "selenium_base_url": "https://www.koelnerliste.com/en/product-database",
        "has_relative_urls": True
    },
    "BSCG": {
        "search_url": "https://www.bscg.org/certified-drug-free-database/",
        "search_param": "?_sf_s=",
        "batch_search_url": "https://www.bscg.org/certified-drug-free-database",
        "batch_search_param": "?pro=",
        "base_url": "https://www.bscg.org",
        "correct_domain": "www.bscg.org",
        "description": "Banned Substances Control Group",
        "search_strategy": "brand_first",
        "supports_batch_search": True,
        "use_selenium": True,
        "selenium_wait_fn": bscg_wait,
        "selenium_base_url": "https://www.bscg.org/certified-drug-free-database",
        "has_relative_urls": False
    },
}


# ============================================================================
# SELENIUM SEARCH FUNCTIONS
# ============================================================================




def selenium_fetch_search_results(url, search_term, wait_fn, wait_time=5):
    driver = _driver_pool.acquire()
    try:
        driver.get(url)
        wait = WebDriverWait(driver, 10)
        wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        time.sleep(0.3)  # Minimal buffer for JS frameworks to mount
        search_input = wait_fn(driver, wait)
        search_input.clear()
        search_input.send_keys(search_term)
        search_input.send_keys(Keys.ENTER)
        wait.until(lambda d: search_term.lower() in d.page_source.lower())
        return driver.page_source
    except Exception as e:
        logger.error(f"Selenium search failed: {str(e)}")
        raise
    finally:
        _driver_pool.release(driver)


async def selenium_search_async(
    url: str,
    search_term: str,
    wait_fn,
    wait_time: int = 5
) -> str:
    """Run selenium search in thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        _executor,
        functools.partial(
            selenium_fetch_search_results,
            url,
            search_term,
            wait_fn,
            wait_time
        )
    )


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def normalize_text(text: str) -> str:
    """Normalize text for comparison."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'[®™©]', '', text)
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def generate_search_terms(
    brand: str,
    product_name: str,
    variant: Optional[str] = None
) -> List[str]:
    """Generate search terms prioritizing BRAND NAME."""
    terms = []
    brand_norm = normalize_text(brand)
    product_norm = normalize_text(product_name)
    
    terms.append(brand)
    
    product_keywords = [
        "whey", "protein", "creatine", "bcaa", "amino", "pre-workout",
        "preworkout", "mass", "casein", "isolate", "collagen", "gel",
        "joint", "recovery", "omega", "vitamin", "energy", "electrolyte",
        "hydro", "caffeine", "endurance"
    ]
    
    for kw in product_keywords:
        if kw in product_norm:
            terms.append(f"{brand} {kw}")
            break
    
    terms.append(f"{brand} {product_name}")
    
    if variant:
        terms.append(f"{brand} {product_name} {variant}")
    
    terms.append(product_name)
    
    seen = set()
    unique = []
    for t in terms:
        t_norm = normalize_text(t)
        if t_norm and t_norm not in seen:
            seen.add(t_norm)
            unique.append(t)
    
    return unique


def _run_scraper_sync(prompt: str, source: str) -> Dict:
    """Run ScrapeGraphAI scraper synchronously."""
    try:
        from scrapegraphai.graphs import SmartScraperGraph
        
        graph_config = {
            "llm": {
                "api_key": settings.openai_api_key,
                "model": "openai/gpt-4o-mini",
            },
            "verbose": False,
        }
        
        scraper = SmartScraperGraph(
            prompt=prompt,
            source=source,
            config=graph_config,
        )
        
        result = scraper.run()
        
        if isinstance(result, str):
            result = json.loads(result)
        
        return result
        
    except Exception as e:
        return {"error": str(e), "found": False}


async def _run_scraper_async(prompt: str, source: str) -> Dict:
    """Run the synchronous scraper in a thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        _executor,
        functools.partial(_run_scraper_sync, prompt, source)
    )


def _fix_url_domain(url: str, correct_domain: str) -> str:
    """Fix URL to use the correct domain."""
    if not url:
        return url
    
    parsed = urlparse(url)
    current_domain = parsed.netloc
    
    wrong_domains = ["www.wetestyoutrust.com", "wetestyoutrust.com"]
    if current_domain in wrong_domains:
        corrected_url = url.replace(current_domain, correct_domain)
        logger.debug(f"🔧 Fixed URL: {current_domain} → {correct_domain}")
        return corrected_url
    
    return url


def _normalize_url(url: str, config: Dict) -> Optional[str]:
    """Normalize URL and fix domain issues."""
    if not url or url in ["NA", "N/A", "null", "None", ""]:
        return None
    
    url = url.strip()
    base_url = config.get("base_url", "")
    correct_domain = config.get("correct_domain", "")
    
    # Make relative URLs absolute
    if not url.startswith('http://') and not url.startswith('https://'):
        base = base_url.rstrip('/')
        if url.startswith('/'):
            url = f"{base}{url}"
        else:
            url = f"{base}/{url}"
    
    # Fix domain
    if correct_domain:
        url = _fix_url_domain(url, correct_domain)
    
    return url


def _is_valid_product_url(url: str, search_url: str) -> bool:
    """Check if URL is a valid product URL (not just a search URL)."""
    if not url:
        return False
    
    if url == search_url:
        return False
    
    product_patterns = [
        "/product/",
        "/supplement-search/",
        "/certified-products/",
        "-certified",
    ]
    
    search_patterns = [
        "?search=",
        "?keyword=",
        "?_search=",
        "?_sf_s=",
        "?woof_text=",
        "?pro=",
        "search-results.php",
    ]
    
    for pattern in search_patterns:
        if pattern in url:
            has_product_path = any(p in url for p in product_patterns)
            if not has_product_path:
                return False
    
    return True


def _extract_product_info(result: Dict, config: Dict, search_url: str) -> Dict:
    """Extract product URL and name from scraper result."""
    product_url = None
    matched_name = None
    products_found = []
    
    if result.get("products_found"):
        for product in result["products_found"]:
            url = product.get("product_url")
            name = product.get("product_name")
            
            if url and url not in ["NA", "N/A", "null", "None", ""]:
                url = _normalize_url(url, config)
                
                if name and name not in ["NA", "N/A", "null", "None", ""]:
                    products_found.append({
                        "product_name": name,
                        "product_url": url,
                        "brand": product.get("brand"),
                        "category": product.get("category")
                    })
                    
                    if not product_url and _is_valid_product_url(url, search_url):
                        product_url = url
                        matched_name = name
    
    if not product_url:
        url = result.get("product_url")
        if url and url not in ["NA", "N/A", "null", "None", ""]:
            url = _normalize_url(url, config)
            if _is_valid_product_url(url, search_url):
                product_url = url
    
    if not matched_name:
        name = result.get("matched_product_name")
        if name and name not in ["NA", "N/A", "null", "None", ""]:
            matched_name = name
    
    return {
        "product_url": product_url,
        "matched_product_name": matched_name,
        "products_found": products_found,
        "has_valid_product": product_url is not None and _is_valid_product_url(product_url, search_url)
    }


def _build_search_prompt(
    org_name: str,
    config: Dict,
    brand: str,
    product_name: str,
    variant: Optional[str] = None
) -> str:
    """Build search prompt for certification database."""
    
    base_url = config['base_url']
    
    common_instructions = f"""
CRITICAL VALIDATION:
- Only return "found": true if you can see ACTUAL PRODUCTS listed on the page
- If the page shows "No results" or "No products found", return "found": false
- Do NOT return found=true just because the page loaded
- A valid product must have a NAME and ideally a link to its product page

URL REQUIREMENTS:
- Product URLs should be SPECIFIC product pages, not search result pages
- Valid product URL example: {base_url}/supplement-search/product-name-here
- Invalid: Just the search URL with parameters
"""

    if org_name == "Informed Sport":
        specific = f"""
SEARCH INSTRUCTIONS FOR INFORMED SPORT:
1. Look for product CARDS showing certified supplements
2. Each card should have: Product name, Brand name, Category
3. Check if brand "{brand}" or product "{product_name}" appears
4. Get the URL to the specific product page (not the search page)
5. Product URLs look like: https://sport.wetestyoutrust.com/supplement-search/product-slug
"""
    elif org_name == "Informed Choice":
        specific = f"""
SEARCH INSTRUCTIONS FOR INFORMED CHOICE:
1. Look for product CARDS showing certified supplements
2. Check if brand "{brand}" or product "{product_name}" appears
3. Product URLs look like: https://choice.wetestyoutrust.com/supplement-search/product-slug
"""
    elif org_name == "HASTA":
        specific = f"""
SEARCH INSTRUCTIONS FOR HASTA:
1. Look for certified products in a list or grid
2. Check if brand "{brand}" appears
3. Product URLs should point to specific product pages
"""
    elif org_name == "NSF Sport":
        specific = f"""
SEARCH INSTRUCTIONS FOR NSF SPORT:
1. Look for certified products in search results
2. Check if brand "{brand}" or product "{product_name}" appears
3. Product URLs should point to specific product detail pages
"""
    elif org_name == "BSCG":
        specific = f"""
SEARCH INSTRUCTIONS FOR BSCG:
1. Look for certified products in the database
2. Check if brand "{brand}" or product "{product_name}" appears
3. Product URLs should point to specific product pages
"""
    elif org_name == "Cologne List":
        specific = f"""
SEARCH INSTRUCTIONS FOR COLOGNE LIST:
1. Look in the product TABLE for certified supplements
2. Find brand "{brand}" in the Company column
3. Find product "{product_name}" in the Product column
4. Product URLs look like: https://www.koelnerliste.com/en/product/product-slug
"""
    else:
        specific = f"""
SEARCH INSTRUCTIONS:
1. Look for certified products
2. Find brand "{brand}" and product "{product_name}"
"""

    return f"""Analyze this certification database page to find certified supplements.

TARGET:
- Brand: "{brand}"
- Product: "{product_name}"
- Variant: "{variant or 'any'}"

{specific}

{common_instructions}

Return JSON:
{{
    "found": true ONLY if actual products are visible (not empty results),
    "products_found": [
        {{
            "product_name": "exact product name shown on page",
            "brand": "brand name",
            "product_url": "FULL URL to specific product page",
            "category": "product category if shown"
        }}
    ],
    "confidence": "high" (exact match), "medium" (partial match), "low" (uncertain),
    "page_has_results": true if products are shown, false if "no results" message
}}
"""


def _build_batch_id_search_prompt(
    org_name: str,
    config: Dict,
    batch_id: str,
    brand: Optional[str] = None,
    product_name: Optional[str] = None
) -> str:
    """Build search prompt for batch ID verification."""
    
    base_url = config['base_url']
    
    brand_info = ""
    if brand:
        brand_info = f"""
ADDITIONAL CONTEXT:
- Brand should be: "{brand}"
- Product should be: "{product_name or 'any'}"
"""

    return f"""Analyze this certification database page to find products matching batch/lot ID.

BATCH ID TO FIND: "{batch_id}"

SEARCH INSTRUCTIONS:
1. Look for ANY products shown on this page
2. Check if batch ID "{batch_id}" appears anywhere
3. Check if any product names or numbers match or contain "{batch_id}"
4. Report what products ARE visible on the page

{brand_info}

CRITICAL VALIDATION:
- Only return "found": true if you can see ACTUAL PRODUCTS on the page
- If page shows "No results" or is empty, return "found": false
- The batch ID might be part of a product name or registration number

Return JSON:
{{
    "found": true ONLY if actual products are visible,
    "batch_id_found": true if "{batch_id}" specifically appears on page,
    "products_found": [
        {{
            "product_name": "product name shown",
            "brand": "brand if shown",
            "product_url": "URL to product page",
            "batch_or_registration_number": "any ID number shown"
        }}
    ],
    "confidence": "high/medium/low",
    "page_has_results": true if any products shown
}}
"""


# ============================================================================
# PUBLIC API - BRAND/PRODUCT SEARCH (Enhanced with Selenium)
# ============================================================================

async def search_all_certifications(
    brand: str,
    product_name: str,
    variant: Optional[str] = None,
    use_selenium: bool = True
) -> List[Dict]:
    """
    Search ALL certification databases by brand/product concurrently.
    
    Args:
        brand: Brand name
        product_name: Product name
        variant: Optional variant/flavor
        use_selenium: Use Selenium for search (more accurate)
    """
    search_terms = generate_search_terms(brand, product_name, variant)
    
    logger.info(f"🔍 Searching certifications for: {brand} - {product_name}")
    logger.info(f"   Method: {'Selenium + AI' if use_selenium else 'AI only'}")
    
    tasks = []
    for org_name, config in CERTIFICATION_DATABASES.items():
        task = _search_single_certification(
            org_name, config, search_terms, brand, product_name, variant, use_selenium
        )
        tasks.append(task)
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    processed = []
    org_names = list(CERTIFICATION_DATABASES.keys())
    
    for i, result in enumerate(results):
        org_name = org_names[i]
        
        if isinstance(result, Exception):
            logger.warning(f"⚠️ {org_name}: Search failed - {str(result)}")
            processed.append({
                "organisation": org_name,
                "found": False,
                "batch_tested": False,
                "product_url": None,
                "error": str(result)
            })
        else:
            processed.append(result)
            status = "✅ FOUND" if result.get("found") else "❌ Not found"
            logger.info(f"{status}: {org_name}")
            if result.get("matched_product_name"):
                logger.info(f"   📦 {result.get('matched_product_name')}")
            if result.get("product_url"):
                logger.info(f"   🔗 {result.get('product_url')}")
    
    return processed


async def _search_single_certification(
    org_name: str,
    config: Dict,
    search_terms: List[str],
    brand: str,
    product_name: str,
    variant: Optional[str],
    use_selenium: bool = True
) -> Dict:
    """Search a single certification database (with Selenium option)."""
    
    strategy = config.get("search_strategy", "brand_first")
    
    if strategy == "brand_only":
        terms_to_try = [brand]
    elif strategy == "browse_table":
        terms_to_try = [brand]
    else:
        terms_to_try = search_terms[:3]
    
    best_result = None
    best_score = 0
    
    for i, search_term in enumerate(terms_to_try):
        if i == 0:
            logger.info(f"🌐 Searching {org_name}: {search_term}")
        
        # OPTION 1: Use Selenium for more accurate search
        if use_selenium and config.get("use_selenium"):
            try:
                selenium_url = config.get("selenium_base_url", config["search_url"])
                wait_fn = config.get("selenium_wait_fn")
                
                if not wait_fn:
                    logger.warning(f"No Selenium wait function for {org_name}, falling back to AI")
                    source = None
                else:
                    # Use Selenium to search
                    logger.debug(f"Using Selenium search for {org_name}")
                    source = await selenium_search_async(
                        selenium_url,
                        search_term,
                        wait_fn,
                        wait_time=2
                    )
            except Exception as e:
                logger.warning(f"Selenium failed for {org_name}: {str(e)}, falling back to AI")
                source = None
        else:
            source = None
        
        # OPTION 2: Fall back to direct URL search (AI scraping)
        if source is None:
            if "search_param" in config:
                encoded = quote_plus(search_term)
                source = f"{config['search_url']}{config['search_param']}{encoded}"
            else:
                source = config["search_url"]
        
        prompt = _build_search_prompt(org_name, config, brand, product_name, variant)
        
        try:
            result = await _run_scraper_async(prompt, source)
            
            if result.get("error"):
                logger.debug(f"Attempt {i+1} error: {result.get('error')[:50]}")
                continue
            
            # Build search URL for reference
            if "search_param" in config:
                search_url = f"{config['search_url']}{config['search_param']}{quote_plus(search_term)}"
            else:
                search_url = config["search_url"]
            
            # Extract and validate product info
            product_info = _extract_product_info(result, config, search_url)
            
            # Only count as "found" if we have actual products
            is_found = (
                result.get("found") and 
                result.get("page_has_results") and
                (product_info["has_valid_product"] or len(product_info["products_found"]) > 0)
            )
            
            if is_found:
                conf = result.get("confidence", "low")
                if conf in ["NA", "N/A"]:
                    conf = "medium" if product_info["products_found"] else "low"
                
                score = {"high": 3, "medium": 2, "low": 1}.get(conf, 0)
                if product_info["has_valid_product"]:
                    score += 2
                
                if score > best_score:
                    best_score = score
                    
                    best_result = {
                        "organisation": org_name,
                        "found": True,
                        "batch_tested": True,
                        "product_url": product_info["product_url"] or search_url,
                        "search_url": search_url,
                        "confidence": conf,
                        "matched_product_name": product_info["matched_product_name"],
                        "products_found": product_info["products_found"],
                        "search_term_used": search_term,
                        "database_description": config.get("description", ""),
                        "has_direct_product_link": product_info["has_valid_product"],
                        "search_method": "selenium" if use_selenium and config.get("use_selenium") else "ai_direct"
                    }
                    
                    if conf == "high" and product_info["has_valid_product"]:
                        break
                        
        except Exception as e:
            logger.debug(f"Attempt {i+1} failed: {str(e)[:50]}")
            continue
    
    if best_result:
        return best_result
    
    # Not found
    search_url = config['search_url']
    if "search_param" in config:
        search_url = f"{search_url}{config['search_param']}{quote_plus(brand)}"
    
    return {
        "organisation": org_name,
        "found": False,
        "batch_tested": False,
        "product_url": None,
        "search_url": search_url,
        "search_terms_tried": terms_to_try,
        "database_description": config.get("description", "")
    }


# ============================================================================
# PUBLIC API - BATCH ID SEARCH (Enhanced with Selenium)
# ============================================================================

async def search_by_batch_id(
    batch_id: str,
    brand: Optional[str] = None,
    product_name: Optional[str] = None,
    use_selenium: bool = True
) -> List[Dict]:
    """
    Search certification databases by BATCH ID.
    
    Args:
        batch_id: Batch/lot ID to search
        brand: Optional brand name for context
        product_name: Optional product name for context
        use_selenium: Use Selenium for search (more accurate)
    """
    logger.info(f"🔍 Batch ID verification for: {batch_id}")
    logger.info(f"   Method: {'Selenium + AI' if use_selenium else 'AI only'}")
    
    tasks = []
    
    for org_name, config in CERTIFICATION_DATABASES.items():
        if not config.get("supports_batch_search", False):
            logger.info(f"⏭️ Skipping {org_name} (doesn't support batch search)")
            continue
        
        task = _search_single_by_batch_id(
            org_name, config, batch_id, brand, product_name, use_selenium
        )
        tasks.append((org_name, task))
    
    # Run all searches concurrently
    results = []
    task_list = [t[1] for t in tasks]
    org_names = [t[0] for t in tasks]
    
    responses = await asyncio.gather(*task_list, return_exceptions=True)
    
    for i, response in enumerate(responses):
        org_name = org_names[i]
        
        if isinstance(response, Exception):
            logger.warning(f"⚠️ {org_name}: Search failed - {str(response)}")
            results.append({
                "organisation": org_name,
                "found": False,
                "batch_tested": False,
                "batch_id_verified": False,
                "batch_id_searched": batch_id,
                "product_url": None,
                "error": str(response)
            })
        else:
            results.append(response)
            if response.get("found"):
                status = "✅ FOUND"
                if response.get("batch_id_verified"):
                    status = "✅ BATCH VERIFIED"
            else:
                status = "❌ Not found"
            logger.info(f"{status}: {org_name}")
            if response.get("product_url"):
                logger.info(f"   🔗 {response.get('product_url')}")
    
    # Add Cologne List as "not supported"
    results.append({
        "organisation": "Cologne List",
        "found": False,
        "batch_tested": False,
        "batch_id_verified": False,
        "batch_id_searched": batch_id,
        "product_url": None,
        "note": "Cologne List does not support batch ID search. Search by brand/product instead.",
        "search_url": "https://www.koelnerliste.com/en/product-database"
    })
    
    return results


async def _search_single_by_batch_id(
    org_name: str,
    config: Dict,
    batch_id: str,
    brand: Optional[str],
    product_name: Optional[str],
    use_selenium: bool = True
) -> Dict:
    """Search a single certification database by batch ID (with Selenium option)."""
    
    # OPTION 1: Use Selenium for more accurate search
    if use_selenium and config.get("use_selenium"):
        try:
            selenium_url = config.get("selenium_base_url", config["search_url"])
            wait_fn = config.get("selenium_wait_fn")
            
            if not wait_fn:
                logger.warning(f"No Selenium wait function for {org_name}, falling back to AI")
                source = None
            else:
                # Use Selenium to search by batch ID
                logger.debug(f"Using Selenium batch search for {org_name}")
                source = await selenium_search_async(
                    selenium_url,
                    batch_id,
                    wait_fn,
                    wait_time=2
                )
        except Exception as e:
            logger.warning(f"Selenium failed for {org_name}: {str(e)}, falling back to AI")
            source = None
    else:
        source = None
    
    # OPTION 2: Fall back to direct URL search (AI scraping)
    if source is None:
        batch_search_url = config.get("batch_search_url", config["search_url"])
        batch_search_param = config.get("batch_search_param", config.get("search_param", "?search="))
        encoded_batch_id = quote_plus(batch_id)
        source = f"{batch_search_url}{batch_search_param}{encoded_batch_id}"
    
    search_url = f"{config.get('batch_search_url', config['search_url'])}{config.get('batch_search_param', '?search=')}{quote_plus(batch_id)}"
    
    logger.info(f"🌐 Searching {org_name} by batch ID: {search_url}")
    
    prompt = _build_batch_id_search_prompt(org_name, config, batch_id, brand, product_name)
    
    try:
        result = await _run_scraper_async(prompt, source)
        
        if result.get("error"):
            return {
                "organisation": org_name,
                "found": False,
                "batch_tested": False,
                "batch_id_verified": False,
                "batch_id_searched": batch_id,
                "product_url": None,
                "search_url": search_url,
                "error": result.get("error")
            }
        
        # Extract product info
        product_info = _extract_product_info(result, config, search_url)
        
        # Validate that we actually found something
        is_found = (
            result.get("found") and 
            result.get("page_has_results") and
            (product_info["has_valid_product"] or len(product_info["products_found"]) > 0)
        )
        
        batch_id_verified = result.get("batch_id_found", False)
        
        return {
            "organisation": org_name,
            "found": is_found,
            "batch_tested": is_found,
            "batch_id_verified": batch_id_verified,
            "batch_id_searched": batch_id,
            "product_url": product_info["product_url"] if is_found else None,
            "search_url": search_url,
            "matched_product_name": product_info["matched_product_name"],
            "products_found": product_info["products_found"],
            "confidence": result.get("confidence", "low"),
            "database_description": config.get("description", ""),
            "has_direct_product_link": product_info["has_valid_product"],
            "search_method": "selenium" if use_selenium and config.get("use_selenium") else "ai_direct"
        }
        
    except Exception as e:
        logger.error(f"Batch ID search failed for {org_name}: {str(e)}")
        return {
            "organisation": org_name,
            "found": False,
            "batch_tested": False,
            "batch_id_verified": False,
            "batch_id_searched": batch_id,
            "product_url": None,
            "search_url": search_url,
            "error": str(e)
        }


# ============================================================================
# PUBLIC API - COMBINED SEARCH
# ============================================================================

async def search_combined(
    batch_id: Optional[str],
    brand: str,
    product_name: str,
    variant: Optional[str] = None,
    use_selenium: bool = True
) -> Dict:
    """Combined search: Batch ID search + Brand/product search."""
    logger.info(f"🔍 Combined search:")
    logger.info(f"   Batch ID: {batch_id or 'Not provided'}")
    logger.info(f"   Brand: {brand}")
    logger.info(f"   Product: {product_name}")
    logger.info(f"   Method: {'Selenium + AI' if use_selenium else 'AI only'}")
    
    results = {
        "batch_id_provided": batch_id is not None,
        "batch_id": batch_id,
        "brand": brand,
        "product_name": product_name,
        "variant": variant,
        "batch_id_results": [],
        "brand_results": [],
        "is_batch_verified": False,
        "is_brand_verified": False,
        "is_fully_verified": False,
        "primary_certification": None,
        "search_method": "selenium" if use_selenium else "ai_direct"
    }
    
    # Run both searches concurrently
    tasks = []
    
    if batch_id:
        tasks.append(("batch", search_by_batch_id(batch_id, brand, product_name, use_selenium)))
    
    tasks.append(("brand", search_all_certifications(brand, product_name, variant, use_selenium)))
    
    # Execute
    task_results = await asyncio.gather(*[t[1] for t in tasks], return_exceptions=True)
    
    for i, task_result in enumerate(task_results):
        task_type = tasks[i][0]
        
        if isinstance(task_result, Exception):
            logger.error(f"{task_type} search failed: {str(task_result)}")
            continue
        
        if task_type == "batch":
            results["batch_id_results"] = task_result
            results["is_batch_verified"] = any(
                r.get("batch_id_verified") or (r.get("found") and r.get("batch_tested"))
                for r in task_result
            )
        elif task_type == "brand":
            results["brand_results"] = task_result
            results["is_brand_verified"] = any(
                r.get("found") and r.get("batch_tested")
                for r in task_result
            )
    
    # Overall status
    results["is_fully_verified"] = results["is_brand_verified"] or results["is_batch_verified"]
    
    # Primary certification
    all_results = results["batch_id_results"] + results["brand_results"]
    results["primary_certification"] = pick_primary_certification(all_results)
    
    return results


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def pick_primary_certification(results: List[Dict]) -> Optional[Dict]:
    """Pick the best certification result."""
    best = None
    best_score = 0
    
    for r in results:
        if not r.get("found"):
            continue
        
        score = 0
        
        if r.get("batch_id_verified"):
            score += 100
        
        if r.get("batch_tested"):
            score += 10
        
        if r.get("has_direct_product_link"):
            score += 5
        elif r.get("product_url"):
            score += 2
        
        conf = r.get("confidence", "low")
        score += {"high": 3, "medium": 2, "low": 1}.get(conf, 0)
        
        if score > best_score:
            best_score = score
            best = r
    
    return best


def get_database_list() -> List[str]:
    """Get list of all certification database names."""
    return list(CERTIFICATION_DATABASES.keys())


def get_database_info() -> List[Dict]:
    """Get detailed info about all certification databases."""
    return [
        {
            "name": name,
            "description": config.get("description", ""),
            "search_url": config.get("search_url", ""),
            "supports_batch_search": config.get("supports_batch_search", False),
            "supports_selenium": config.get("use_selenium", False),
            "batch_search_url_pattern": f"{config.get('batch_search_url', '')}{config.get('batch_search_param', '')}{{batch_id}}" if config.get("supports_batch_search") else None
        }
        for name, config in CERTIFICATION_DATABASES.items()
    ]


def build_verification_summary(results: List[Dict]) -> Dict[str, Any]:
    """Build a clean summary from certification search results."""
    found_results = [r for r in results if r.get("found") and r.get("batch_tested")]
    
    found_urls = []
    for r in found_results:
        url_info = {
            "website": r.get("organisation"),
            "product_url": r.get("product_url"),
            "search_url": r.get("search_url"),
            "product_name": r.get("matched_product_name"),
            "confidence": r.get("confidence", "low"),
            "search_method": r.get("search_method", "unknown")
        }
        
        if r.get("products_found"):
            url_info["all_products"] = r.get("products_found")
        
        found_urls.append(url_info)
    
    quick_links = [
        u["product_url"] for u in found_urls 
        if u.get("product_url")
    ]
    
    return {
        "is_verified": len(found_results) > 0,
        "found_count": len(found_results),
        "total_searched": len(results),
        "found_websites": [r.get("organisation") for r in found_results],
        "urls": found_urls,
        "quick_links": quick_links
    }


def build_batch_id_summary(results: List[Dict]) -> Dict[str, Any]:
    """Build summary for batch ID verification results."""
    batch_verified_results = [r for r in results if r.get("batch_id_verified")]
    found_results = [r for r in results if r.get("found")]
    
    batch_verified_urls = []
    for r in batch_verified_results:
        batch_verified_urls.append({
            "website": r.get("organisation"),
            "product_url": r.get("product_url"),
            "search_url": r.get("search_url"),
            "product_name": r.get("matched_product_name"),
            "matched_batch_id": r.get("matched_batch_id"),
            "search_method": r.get("search_method", "unknown")
        })
    
    found_urls = []
    for r in found_results:
        found_urls.append({
            "website": r.get("organisation"),
            "product_url": r.get("product_url"),
            "search_url": r.get("search_url"),
            "product_name": r.get("matched_product_name"),
            "batch_id_verified": r.get("batch_id_verified", False),
            "search_method": r.get("search_method", "unknown")
        })
    
    return {
        "batch_id_verified": len(batch_verified_results) > 0,
        "batch_verified_count": len(batch_verified_results),
        "batch_verified_websites": [r.get("organisation") for r in batch_verified_results],
        "batch_verified_urls": batch_verified_urls,
        "product_found": len(found_results) > 0,
        "found_count": len(found_results),
        "product_found_websites": [r.get("organisation") for r in found_results],
        "product_found_urls": found_urls,
        "quick_links": [u["product_url"] for u in found_urls if u.get("product_url")]
    }