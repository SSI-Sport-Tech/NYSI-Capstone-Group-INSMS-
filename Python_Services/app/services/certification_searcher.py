"""
Enhanced Certification database searcher with Selenium integration.
Combines Ollama AI scraping with specific search bar interaction for each organization.
"""
import asyncio
import json
import re
import logging
import functools
import time
import os
import requests as _requests
from typing import Dict, List, Optional, Any
from urllib.parse import quote_plus, urlparse
from concurrent.futures import ThreadPoolExecutor
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from app.config.settings import settings
from pydantic import BaseModel, Field
from typing import List, Optional
from scrapegraphai import graphs

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=6)
_llm_semaphore = asyncio.Semaphore(2)

import queue
import threading

class CertProductResult(BaseModel):
    product_name: str
    brand: Optional[str] = None
    product_url: Optional[str] = None
    category: Optional[str] = None

class CertSearchResult(BaseModel):
    found: bool
    products_found: Optional[List[CertProductResult]] = None
    confidence: Optional[str] = None
    page_has_results: Optional[bool] = None


class ChromeDriverPool:
    def __init__(self, size=3):
        self._pool = queue.Queue()
        self._lock = threading.Lock()
        self._size = size
        self._initialize_pool()

    def _initialize_pool(self):
        for i in range(self._size):
            try:
                if i > 0:
                    time.sleep(2)
                driver = self._create_driver()
                self._pool.put(driver)
                logger.info(f"✅ ChromeDriver {i+1}/{self._size} created successfully")
            except Exception as e:
                logger.warning(f"⚠️ Failed to create driver {i+1}/{self._size}: {e}")

    def _create_driver(self):
        options = Options()
        if settings.scraper_headless:
            options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-extensions")
        options.add_argument("--single-process")
        options.add_argument("--disable-background-networking")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        options.add_argument(
            "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        )
        chrome_bin = os.environ.get("CHROME_BIN")
        if chrome_bin:
            options.binary_location = chrome_bin
        chromedriver_bin = os.environ.get("CHROMEDRIVER_BIN")
        if chromedriver_bin:
            from selenium.webdriver.chrome.service import Service
            driver = webdriver.Chrome(service=Service(chromedriver_bin), options=options)
        else:
            driver = webdriver.Chrome(options=options)
        driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": """
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
                window.chrome = { runtime: {} };
            """
        })
        return driver

    def acquire(self):
        return self._pool.get(timeout=30)

    def release(self, driver):
        try:
            driver.delete_all_cookies()
            self._pool.put(driver)
        except Exception:
            self._pool.put(self._create_driver())


_driver_pool = ChromeDriverPool(size=2)


# ============================================================================
# SELENIUM WAIT FUNCTIONS
# ============================================================================

def default_wait(driver, wait):
    driver.execute_script("""
        document.querySelectorAll('[role="dialog"], .modal, .popup, .overlay').forEach(el => el.remove());
    """)
    return wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "input[type='search']")))


def informed_sport_wait(driver, wait):
    time.sleep(8)
    driver.execute_script("""
        document.querySelectorAll('[role="dialog"], .modal, .popup, .overlay').forEach(el => el.remove());
    """)
    input_el = wait.until(lambda d: next(
        (el for el in d.find_elements("css selector", "input[name='search']")
         if el.is_displayed() and el.is_enabled()), None
    ))
    if input_el is None:
        raise Exception("Informed Sport search input not found")
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", input_el)
    return input_el


def informed_choice_wait(driver, wait):
    driver.execute_script("""
        document.querySelectorAll('[role="dialog"], .modal, .popup, .overlay').forEach(el => el.remove());
    """)
    input_el = wait.until(lambda d: next(
        (el for el in d.find_elements("css selector", "input[name='search']")
         if el.is_displayed() and el.is_enabled()), None
    ))
    if input_el is None:
        raise Exception("Informed Choice search input not found")
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", input_el)
    return input_el


def hasta_wait(driver, wait):
    driver.execute_script("""
        document.querySelectorAll('[role="dialog"], .modal, .popup, .overlay').forEach(el => el.remove());
    """)
    input_el = wait.until(lambda d: next(
        (el for el in d.find_elements(By.NAME, "woof_text")
         if el.is_displayed() and el.is_enabled()), None
    ))
    if input_el is None:
        raise Exception("HASTA search input not found")
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", input_el)
    driver.execute_script("arguments[0].focus();", input_el)
    return input_el


def nsf_sport_wait(driver, wait):
    driver.execute_script("""
        document.querySelectorAll('[role="dialog"], .modal, .popup, .overlay').forEach(el => el.remove());
    """)
    return wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "input.keyword__input.input--search")))


def cologne_list_wait(driver, wait):
    checkbox = wait.until(EC.element_to_be_clickable((By.ID, "agree")))
    if not checkbox.is_selected():
        checkbox.click()
    continue_btn = wait.until(EC.element_to_be_clickable((By.ID, "submitconditions")))
    continue_btn.click()
    deny_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[data-cookieman-accept-none]")))
    deny_btn.click()
    return wait.until(EC.element_to_be_clickable(
        (By.CSS_SELECTOR, "input[placeholder='find a product or company...']")
    ))


def bscg_wait(driver, wait):
    driver.execute_script("""
        document.querySelectorAll('[role="dialog"], .modal, .popup, .overlay').forEach(el => el.remove());
    """)
    return wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "input[type='search']")))


# ============================================================================
# CERTIFICATION DATABASE CONFIGURATIONS
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
        "cloudflare_protected": False,
        "supports_batch_search": True,
        "use_selenium": False,
        "selenium_wait_fn": informed_sport_wait,
        "selenium_base_url": "https://sport.wetestyoutrust.com/",
        "has_relative_urls": True,
        "use_api": True,
        "api_search_url": "https://sport.wetestyoutrust.com/views/ajax",
        "api_product_base": "https://sport.wetestyoutrust.com",
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
        "cloudflare_protected": False,
        "supports_batch_search": True,
        "use_selenium": False,
        "selenium_wait_fn": informed_choice_wait,
        "selenium_base_url": "https://choice.wetestyoutrust.com/",
        "has_relative_urls": True,
        "use_api": True,
        "api_search_url": "https://choice.wetestyoutrust.com/views/ajax",
        "api_product_base": "https://choice.wetestyoutrust.com",
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
        "has_relative_urls": False,
        "selenium_wait_time": 8,
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

def _get_cf_headers() -> dict:
    client_id = os.environ.get("CF_ACCESS_CLIENT_ID")
    client_secret = os.environ.get("CF_ACCESS_CLIENT_SECRET")
    if client_id and client_secret:
        return {
            "CF-Access-Client-Id": client_id,
            "CF-Access-Client-Secret": client_secret,
        }
    return {}

def _fetch_informed_api_html(api_url: str, search_term: str) -> Optional[str]:
    """Fetch HTML content from Informed Sport/Choice AJAX API."""
    try:
        params = {
            "search": search_term,
            "_wrapper_format": "drupal_ajax",
            "sort_bef_combine": "title_ASC",
            "field_date_certified": "All",
            "view_type": "grid_layout",
            "view_name": "search",
            "view_display_id": "product_search",
            "view_args": "grid_layout",
            "view_path": "/node/156426",
        }
        headers = {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }

        resp = _requests.get(api_url, params=params, headers=headers, timeout=15)
        resp.raise_for_status()

        # Extract HTML from Drupal AJAX insert commands
        html_content = ""
        for cmd in resp.json():
            if isinstance(cmd, dict) and cmd.get("command") == "insert":
                html_content += cmd.get("data", "")

        if not html_content:
            logger.debug("No HTML content in Informed API response")
            return None

        logger.info(f"🌐 Informed API returned {len(html_content)} chars of HTML for '{search_term}'")
        return html_content

    except Exception as e:
        logger.warning(f"Informed API fetch failed: {e}")
        return None

def selenium_fetch_search_results(url, search_term, wait_fn, wait_time=5, post_search_wait=3):
    driver = _driver_pool.acquire()
    wait = WebDriverWait(driver, 10)
    try:
        driver.execute_cdp_cmd("Network.enable", {})

        logger.debug(f"Navigating to {url}")
        driver.get(url)
        time.sleep(wait_time)
        search_input = wait_fn(driver, wait)
        search_input.clear()
        search_input.send_keys(search_term)
        search_input.send_keys(Keys.ENTER)
        wait.until(lambda d: search_term.lower() in d.page_source.lower())
        time.sleep(post_search_wait)
        return driver.page_source
    except Exception as e:
        logger.error(f"Selenium search failed: {str(e)}")
        raise
    finally:
        _driver_pool.release(driver)


async def selenium_search_async(url, search_term, wait_fn, wait_time=5, post_search_wait=3):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        _executor,
        functools.partial(selenium_fetch_search_results, url, search_term, wait_fn, wait_time, post_search_wait)
    )


# ============================================================================
# OLLAMA API - HTML ANALYSIS
# ============================================================================

def _run_scraper_sync(prompt: str, source: str) -> Dict:
    """Run ScrapeGraphAI scraper synchronously using Ollama."""
    try:

        is_html = source.strip().startswith("<")
        source_type = "HTML" if is_html else "URL"
        logger.info(f"🤖 Running ScrapeGraphAI on {source_type} ({len(source)} chars)...")

        config = {
            "llm": {
                "model": f"ollama/{os.environ.get('OLLAMA_MODEL', 'gpt-oss:20b')}",
                "base_url": os.environ.get("OLLAMA_BASE_URL", "http://host.docker.internal:11434"),
                # "format": "json",
                "model_tokens": 32000,
                "temperature": 0,
            },
            "verbose": False,
        }

        scraper = graphs.SmartScraperGraph(
            prompt=prompt,
            source=source,
            config=config,
            schema=CertSearchResult,
        )

        result = scraper.run()

        # Unwrap ScrapeGraphAI wrappers
        if isinstance(result, str):
            result = json.loads(result)
        if isinstance(result, dict) and list(result.keys()) == ["content"]:
            result = result["content"]
        if hasattr(result, "model_dump"):
            result = result.model_dump()

        logger.info(
            f"✅ ScrapeGraphAI result: found={result.get('found')}, "
            f"products={len(result.get('products_found') or [])}, "
            f"confidence={result.get('confidence')}"
        )
        return result

    except Exception as e:
        logger.error(f"❌ ScrapeGraphAI error: {type(e).__name__}: {str(e)[:200]}")
        return {"error": str(e), "found": False}


async def _run_scraper_async(prompt: str, source: str) -> Dict:
    """Run Ollama analysis in thread pool with concurrency limit."""
    async with _llm_semaphore:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _executor,
            functools.partial(_run_scraper_sync, prompt, source)
        )



# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'[®™©]', '', text)
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def generate_search_terms(brand: str, product_name: str, variant: Optional[str] = None) -> List[str]:
    terms = [brand]
    product_norm = normalize_text(product_name)
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
    if not url or url in ["NA", "N/A", "null", "None", ""]:
        return None
    url = url.strip()
    base_url = config.get("base_url", "")
    correct_domain = config.get("correct_domain", "")
    if not url.startswith('http://') and not url.startswith('https://'):
        base = base_url.rstrip('/')
        url = f"{base}{url}" if url.startswith('/') else f"{base}/{url}"
    if correct_domain:
        url = _fix_url_domain(url, correct_domain)
    return url


def _is_valid_product_url(url: str, search_url: str) -> bool:
    """Check if URL is a valid product URL (not just a search URL)."""
    if not url:
        return False
    product_patterns = ["/product/", "/supplement-search/", "/certified-products/", "-certified"]
    search_patterns = ["?search=", "?keyword=", "?_search=", "?_sf_s=", "?woof_text=", "?pro=", "search-results.php"]
    for pattern in search_patterns:
        if pattern in url:
            if not any(p in url for p in product_patterns):
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

CRITICAL OUTPUT REQUIREMENT:
Respond with ONLY a valid JSON object matching the structure above.
No explanation text, no markdown, no preamble. Just JSON.
If no products are found, still return the structure with found=false.

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
    2. Products appear in elements with CSS class "results__product-name" and "results__company-name"
    3. Product detail links follow this exact pattern: /certified-products/listing-detail.php?id=XXXXX
    4. Full URL should be: https://www.nsfsport.com/certified-products/listing-detail.php?id=XXXXX
    5. Check if brand "{brand}" or product "{product_name}" appears in results__company-name or results__product-name
    6. Each result card contains one product name and one company name
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
- Organisation: {org_name}

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


def _build_batch_id_search_prompt(org_name: str, config: Dict, batch_id: str, brand: Optional[str] = None, product_name: Optional[str] = None) -> str:
    brand_info = f'\nBrand context: "{brand}", Product: "{product_name or "any"}"\n' if brand else ""
    return f"""Analyze this certification database page for batch/lot ID verification.

BATCH ID TO FIND: "{batch_id}"
{brand_info}
INSTRUCTIONS:
1. Look for ANY products shown on this page
2. Check if batch ID "{batch_id}" appears anywhere
3. Report what products ARE visible on the page

CRITICAL: Only return "found": true if ACTUAL PRODUCTS are visible. Return "found": false if page shows no results.

Output ONLY valid JSON:
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
    "confidence": "high" | "medium" | "low",
    "page_has_results": true if any products shown
}}
"""


# ============================================================================
# PUBLIC API - BRAND/PRODUCT SEARCH
# ============================================================================

async def search_all_certifications(brand: str, product_name: str, variant: Optional[str] = None, use_selenium: bool = True) -> List[Dict]:
    search_terms = generate_search_terms(brand, product_name, variant)
    logger.info(f"🔍 Searching certifications for: {brand} - {product_name}")
    tasks = [
        _search_single_certification(org_name, config, search_terms, brand, product_name, variant, use_selenium)
        for org_name, config in CERTIFICATION_DATABASES.items()
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    processed = []
    for org_name, result in zip(CERTIFICATION_DATABASES.keys(), results):
        if isinstance(result, Exception):
            logger.warning(f"⚠️ {org_name}: Search failed - {str(result)}")
            processed.append({"organisation": org_name, "found": False, "batch_tested": False, "product_url": None, "error": str(result)})
        else:
            processed.append(result)
            status = "✅ FOUND" if result.get("found") else "❌ Not found"
            logger.info(f"{status}: {org_name}")
    return processed


async def _search_single_certification(org_name: str, config: Dict, search_terms: List[str], brand: str, product_name: str, variant: Optional[str], use_selenium: bool = True) -> Dict:

    strategy = config.get("search_strategy", "brand_first")
    terms_to_try = [brand] if strategy in ("brand_only", "browse_table") else search_terms[:3]
    best_result = None
    best_score = 0

    for i, search_term in enumerate(terms_to_try):
        if i == 0:
            logger.info(f"🌐 Searching {org_name}: {search_term}")

        source = None
        # Try API first for Informed Sport/Choice
        if config.get("use_api"):
            api_html = _fetch_informed_api_html(
                config["api_search_url"],
                search_term
            )
            if api_html:
                source = api_html  # pass directly to ScrapeGraphAI below
                logger.debug(f"✅ Using API HTML ({len(source)} chars) for {org_name}")

        if source is None and use_selenium and config.get("use_selenium"):
            try:
                wait_fn = config.get("selenium_wait_fn")
                if wait_fn:
                    source = await selenium_search_async(
                        config.get("selenium_base_url", config["search_url"]),
                        search_term, wait_fn,
                        wait_time=2,
                        post_search_wait=config.get("selenium_wait_time", 3)
                    )
            except Exception as e:
                logger.warning(f"Selenium failed for {org_name}: {str(e)}, falling back to URL")

        if source is None:
            encoded = quote_plus(search_term)
            source = f"{config['search_url']}{config.get('search_param', '?search=')}{encoded}" if "search_param" in config else config["search_url"]

        if source and not source.strip().startswith("<"):
            try:
                headers = _get_cf_headers()
                if headers:
                    resp = _requests.get(source, headers=headers, timeout=15)
                    if resp.ok:
                        source = resp.text
                        logger.debug(f"✅ Fetched URL with CF headers ({len(source)} chars)")
            except Exception as e:
                logger.debug(f"CF header fetch failed: {e}")

        prompt = _build_search_prompt(org_name, config, brand, product_name, variant)

        try:
            result = await _run_scraper_async(prompt, source)
            if result.get("error"):
                logger.debug(f"Attempt {i+1} error: {result.get('error')[:50]}")
                continue

            search_url = f"{config['search_url']}{config.get('search_param', '?search=')}{quote_plus(search_term)}" if "search_param" in config else config["search_url"]
            product_info = _extract_product_info(result, config, search_url)
            is_found = result.get("found") is True

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
                        "organisation": org_name, "found": True, "batch_tested": True,
                        "product_url": product_info["product_url"] or search_url,
                        "search_url": search_url, "confidence": conf,
                        "matched_product_name": product_info["matched_product_name"],
                        "products_found": product_info["products_found"],
                        "search_term_used": search_term,
                        "database_description": config.get("description", ""),
                        "has_direct_product_link": product_info["has_valid_product"],
                        "search_method": "selenium+ollama" if use_selenium and config.get("use_selenium") else "ollama_url"
                    }
                    if conf == "high" and product_info["has_valid_product"]:
                        break
        except Exception as e:
            logger.debug(f"Attempt {i+1} failed: {str(e)[:50]}")
            continue

    if best_result:
        return best_result

    search_url = config['search_url']
    if "search_param" in config:
        search_url = f"{search_url}{config['search_param']}{quote_plus(brand)}"
    return {
        "organisation": org_name, "found": False, "batch_tested": False,
        "product_url": None, "search_url": search_url,
        "search_terms_tried": terms_to_try, "database_description": config.get("description", "")
    }


# ============================================================================
# PUBLIC API - BATCH ID SEARCH
# ============================================================================

async def search_by_batch_id(batch_id: str, brand: Optional[str] = None, product_name: Optional[str] = None, use_selenium: bool = True) -> List[Dict]:
    logger.info(f"🔍 Batch ID verification for: {batch_id}")
    tasks = []
    for org_name, config in CERTIFICATION_DATABASES.items():
        if not config.get("supports_batch_search", False):
            continue
        tasks.append((org_name, _search_single_by_batch_id(org_name, config, batch_id, brand, product_name, use_selenium)))
    results = []
    responses = await asyncio.gather(*[t[1] for t in tasks], return_exceptions=True)
    for (org_name, _), response in zip(tasks, responses):
        if isinstance(response, Exception):
            logger.warning(f"⚠️ {org_name}: Search failed - {str(response)}")
            results.append({
                "organisation": org_name, "found": False, "batch_tested": False,
                "batch_id_verified": False, "batch_id_searched": batch_id,
                "product_url": None, "error": str(response)
            })
        else:
            results.append(response)
            status = "✅ BATCH VERIFIED" if response.get("batch_id_verified") else ("✅ FOUND" if response.get("found") else "❌ Not found")
            logger.info(f"{status}: {org_name}")
    results.append({
        "organisation": "Cologne List", "found": False, "batch_tested": False,
        "batch_id_verified": False, "batch_id_searched": batch_id, "product_url": None,
        "note": "Cologne List does not support batch ID search.",
        "search_url": "https://www.koelnerliste.com/en/product-database"
    })
    return results


async def _search_single_by_batch_id(org_name: str, config: Dict, batch_id: str, brand: Optional[str], product_name: Optional[str], use_selenium: bool = True) -> Dict:
    if config.get("cloudflare_protected"):
        search_url = f"{config.get('batch_search_url', config['search_url'])}{config.get('batch_search_param', '?search=')}{quote_plus(batch_id)}"
        return {
            "organisation": org_name, "found": False, "batch_tested": False,
            "batch_id_verified": False, "batch_id_searched": batch_id,
            "product_url": None, "search_url": search_url,
            "note": "Cloudflare protected — use the search URL to verify manually",
            "manual_verification_required": True
        }

    source = None
    if use_selenium and config.get("use_selenium"):
        try:
            wait_fn = config.get("selenium_wait_fn")
            if wait_fn:
                source = await selenium_search_async(
                    config.get("selenium_base_url", config["search_url"]),
                    batch_id, wait_fn, wait_time=2,
                    post_search_wait=config.get("selenium_wait_time", 3)
                )
        except Exception as e:
            logger.warning(f"Selenium failed for {org_name}: {str(e)}, falling back to URL")

    search_url = f"{config.get('batch_search_url', config['search_url'])}{config.get('batch_search_param', '?search=')}{quote_plus(batch_id)}"
    if source is None:
        source = search_url

    if source and not source.strip().startswith("<"):
        try:
            headers = _get_cf_headers()
            if headers:
                resp = _requests.get(source, headers=headers, timeout=15)
                if resp.ok:
                    source = resp.text
                    logger.debug(f"✅ Fetched URL with CF headers ({len(source)} chars)")
        except Exception as e:
            logger.debug(f"CF header fetch failed: {e}")

    logger.info(f"🌐 Searching {org_name} by batch ID: {search_url}")
    prompt = _build_batch_id_search_prompt(org_name, config, batch_id, brand, product_name)

    try:
        result = await _run_scraper_async(prompt, source)
        if result.get("error"):
            return {
                "organisation": org_name, "found": False, "batch_tested": False,
                "batch_id_verified": False, "batch_id_searched": batch_id,
                "product_url": None, "search_url": search_url, "error": result.get("error")
            }
        product_info = _extract_product_info(result, config, search_url)
        is_found = (
            result.get("found") and result.get("page_has_results") and
            (product_info["has_valid_product"] or len(product_info["products_found"]) > 0)
        )
        return {
            "organisation": org_name, "found": is_found, "batch_tested": is_found,
            "batch_id_verified": result.get("batch_id_found", False),
            "batch_id_searched": batch_id,
            "product_url": product_info["product_url"] if is_found else None,
            "search_url": search_url,
            "matched_product_name": product_info["matched_product_name"],
            "products_found": product_info["products_found"],
            "confidence": result.get("confidence", "low"),
            "database_description": config.get("description", ""),
            "has_direct_product_link": product_info["has_valid_product"],
            "search_method": "selenium+ollama" if use_selenium and config.get("use_selenium") else "ollama_url"
        }
    except Exception as e:
        logger.error(f"Batch ID search failed for {org_name}: {str(e)}")
        return {
            "organisation": org_name, "found": False, "batch_tested": False,
            "batch_id_verified": False, "batch_id_searched": batch_id,
            "product_url": None, "search_url": search_url, "error": str(e)
        }


# ============================================================================
# PUBLIC API - COMBINED SEARCH
# ============================================================================

async def search_combined(batch_id: Optional[str], brand: str, product_name: str, variant: Optional[str] = None, use_selenium: bool = True) -> Dict:
    results = {
        "batch_id_provided": batch_id is not None, "batch_id": batch_id,
        "brand": brand, "product_name": product_name, "variant": variant,
        "batch_id_results": [], "brand_results": [],
        "is_batch_verified": False, "is_brand_verified": False, "is_fully_verified": False,
        "primary_certification": None,
        "search_method": "selenium+ollama" if use_selenium else "ollama_url"
    }
    tasks = []
    if batch_id:
        tasks.append(("batch", search_by_batch_id(batch_id, brand, product_name, use_selenium)))
    tasks.append(("brand", search_all_certifications(brand, product_name, variant, use_selenium)))
    task_results = await asyncio.gather(*[t[1] for t in tasks], return_exceptions=True)
    for i, task_result in enumerate(task_results):
        if isinstance(task_result, Exception):
            continue
        task_type = tasks[i][0]
        if task_type == "batch":
            results["batch_id_results"] = task_result
            results["is_batch_verified"] = any(
                r.get("batch_id_verified") or (r.get("found") and r.get("batch_tested"))
                for r in task_result
            )
        elif task_type == "brand":
            results["brand_results"] = task_result
            results["is_brand_verified"] = any(
                r.get("found") and r.get("batch_tested") for r in task_result
            )
    results["is_fully_verified"] = results["is_brand_verified"] or results["is_batch_verified"]
    all_results = results["batch_id_results"] + results["brand_results"]
    results["primary_certification"] = pick_primary_certification(all_results)
    return results


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def pick_primary_certification(results: List[Dict]) -> Optional[Dict]:
    best, best_score = None, 0
    for r in results:
        if not r.get("found"):
            continue
        score = 0
        if r.get("batch_id_verified"): score += 100
        if r.get("batch_tested"): score += 10
        if r.get("has_direct_product_link"): score += 5
        elif r.get("product_url"): score += 2
        score += {"high": 3, "medium": 2, "low": 1}.get(r.get("confidence", "low"), 0)
        if score > best_score:
            best_score = score
            best = r
    return best


def get_database_list() -> List[str]:
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
            "cloudflare_protected": config.get("cloudflare_protected", False),
            "batch_search_url_pattern": f"{config.get('batch_search_url', '')}{config.get('batch_search_param', '')}{{batch_id}}" if config.get("supports_batch_search") else None
        }
        for name, config in CERTIFICATION_DATABASES.items()
    ]


def build_verification_summary(results: List[Dict]) -> Dict[str, Any]:
    """Build a clean summary from certification search results."""
    found_results = [r for r in results if r.get("found") and r.get("batch_tested")]
    found_urls = [
        {
            "website": r.get("organisation"),
            "product_url": r.get("product_url"),
            "search_url": r.get("search_url"),
            "product_name": r.get("matched_product_name"),
            "confidence": r.get("confidence", "low"),
            "search_method": r.get("search_method", "unknown"),
            **({"all_products": r.get("products_found")} if r.get("products_found") else {})
        }
        for r in found_results
    ]
    return {
        "is_verified": len(found_results) > 0,
        "found_count": len(found_results),
        "total_searched": len(results),
        "found_websites": [r.get("organisation") for r in found_results],
        "urls": found_urls,
        "quick_links": [u["product_url"] for u in found_urls if u.get("product_url")]
    }


def build_batch_id_summary(results: List[Dict]) -> Dict[str, Any]:
    batch_verified = [r for r in results if r.get("batch_id_verified")]
    found_results = [r for r in results if r.get("found")]
    return {
        "batch_id_verified": len(batch_verified) > 0,
        "batch_verified_count": len(batch_verified),
        "batch_verified_websites": [r.get("organisation") for r in batch_verified],
        "batch_verified_urls": [{"website": r.get("organisation"), "product_url": r.get("product_url"), "search_url": r.get("search_url"), "product_name": r.get("matched_product_name")} for r in batch_verified],
        "product_found": len(found_results) > 0,
        "found_count": len(found_results),
        "product_found_websites": [r.get("organisation") for r in found_results],
        "product_found_urls": [{"website": r.get("organisation"), "product_url": r.get("product_url"), "search_url": r.get("search_url"), "product_name": r.get("matched_product_name"), "batch_id_verified": r.get("batch_id_verified", False)} for r in found_results],
        "quick_links": [r.get("product_url") for r in found_results if r.get("product_url")]
    }