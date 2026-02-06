"""
Certification database searcher.
Searches 6 certification databases to verify batch testing status.
Pure string input — no OCR, no image processing.
"""

import asyncio
import json
import re
import logging
import functools
from typing import Dict, List, Optional
from urllib.parse import quote_plus
from concurrent.futures import ThreadPoolExecutor
from app.config.settings import settings

logger = logging.getLogger(__name__)

# Thread pool for running sync scrapers
_executor = ThreadPoolExecutor(max_workers=6)


# ============================================================================
# CERTIFICATION DATABASE CONFIGURATIONS
# ============================================================================

CERTIFICATION_DATABASES = {
    "Informed Sport": {
        "search_url": "https://sport.wetestyoutrust.com/supplement-search",
        "search_param": "?search=",
        "base_url": "https://sport.wetestyoutrust.com",
        "description": "Informed Sport - for elite athletes, tests every batch",
        "search_strategy": "brand_first"
    },
    "Informed Choice": {
        "search_url": "https://choice.wetestyoutrust.com/supplement-search",
        "search_param": "?search=",
        "base_url": "https://choice.wetestyoutrust.com",
        "description": "Informed Choice - for general consumers, monthly testing",
        "search_strategy": "brand_first"
    },
    "HASTA": {
        "search_url": "https://hasta.org.au/certified/",
        "search_param": "?_search=",
        "base_url": "https://hasta.org.au",
        "description": "Human and Supplement Testing Australia",
        "search_strategy": "brand_only"
    },
    "NSF Sport": {
        "search_url": "https://www.nsfsport.com/certified-products/",
        "search_param": "?keyword=",
        "base_url": "https://www.nsfsport.com",
        "description": "NSF Certified for Sport",
        "search_strategy": "brand_first"
    },
    "Cologne List": {
        "search_url": "https://www.koelnerliste.com/en/product-database",
        "base_url": "https://www.koelnerliste.com",
        "product_base": "https://www.koelnerliste.com/en/product/",
        "description": "Kölner Liste - German Sport University Cologne",
        "search_strategy": "browse_table"
    },
    "BSCG": {
        "search_url": "https://www.bscg.org/certified-drug-free-database/",
        "search_param": "?_sf_s=",
        "base_url": "https://www.bscg.org",
        "description": "Banned Substances Control Group",
        "search_strategy": "brand_first"
    },
}


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
    """
    Generate search terms prioritizing BRAND NAME.
    
    Strategy:
    1. Brand only (most important - finds all products by this brand)
    2. Brand + key product word
    3. Brand + product name
    4. Full query with variant
    5. Product name only (fallback)
    """
    terms = []
    brand_norm = normalize_text(brand)
    product_norm = normalize_text(product_name)
    
    # 1. Brand only (most important for finding products)
    terms.append(brand)
    
    # 2. Brand + key product identifier
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
    
    # 3. Brand + product name
    terms.append(f"{brand} {product_name}")
    
    # 4. Full query with variant
    if variant:
        terms.append(f"{brand} {product_name} {variant}")
    
    # 5. Product name only (fallback)
    terms.append(product_name)
    
    # Remove duplicates while preserving order
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


def _normalize_url(url: str, base_url: str) -> Optional[str]:
    """Convert relative URLs to absolute URLs."""
    if not url:
        return None
    
    url = url.strip()
    
    # Already absolute
    if url.startswith('http://') or url.startswith('https://'):
        return url
    
    # Remove trailing slash from base
    base = base_url.rstrip('/')
    
    # Relative URL - prepend base
    if url.startswith('/'):
        return f"{base}{url}"
    else:
        return f"{base}/{url}"


def _build_search_prompt(
    org_name: str,
    config: Dict,
    brand: str,
    product_name: str,
    variant: Optional[str] = None
) -> str:
    """Build search prompt for certification database."""
    
    base_url = config['base_url']
    
    # Database-specific instructions
    if org_name == "Cologne List":
        specific = f"""
SEARCH INSTRUCTIONS FOR COLOGNE LIST (Kölner Liste):
1. This page has a searchable TABLE of certified supplements
2. The table has columns: Company, Product, Product Category
3. Use the search box or filter to find brand "{brand}"
4. Look in the "Company" column for the brand name
5. Find the specific product in the "Product" column
6. Product URLs follow pattern: {base_url}/en/product/product-slug
7. ALL products listed in this table ARE batch tested
"""
    elif org_name == "HASTA":
        specific = f"""
SEARCH INSTRUCTIONS FOR HASTA:
1. This is the HASTA certified products database for Australian supplements
2. Look for a searchable list or table of certified products
3. Search/filter by brand name "{brand}"
4. Find any product from this brand - HASTA certifies by brand/manufacturer
5. Products listed here have been batch tested for banned substances
"""
    elif org_name == "NSF Sport":
        specific = f"""
SEARCH INSTRUCTIONS FOR NSF SPORT:
1. This is NSF Certified for Sport database
2. Look for the product search results or certified products list
3. Search/filter by brand name "{brand}" or company name
4. Find the specific product "{product_name}" or any product from this brand
5. NSF Sport tests for 280+ substances banned in sport
"""
    elif org_name == "BSCG":
        specific = f"""
SEARCH INSTRUCTIONS FOR BSCG:
1. This is the BSCG Certified Drug Free database
2. Look for certified products list or search results
3. Search by brand name "{brand}"
4. Find products from this brand that match "{product_name}"
5. BSCG tests for 500+ drugs and banned substances
"""
    else:
        specific = f"""
SEARCH INSTRUCTIONS:
1. Look through the list of certified supplements on this page
2. Find products where the BRAND NAME matches "{brand}"
3. Among those, find the product that best matches "{product_name}"
4. The page shows supplement cards with product names and brand names
"""

    return f"""Analyze this certification database page to find batch-tested supplements.

TARGET PRODUCT TO FIND:
- Brand: "{brand}" (MUST MATCH - this is the most important)
- Product: "{product_name}"
- Variant/Flavor: "{variant or 'any flavor is OK'}"

{specific}

URL REQUIREMENTS:
- Return the FULL absolute URL (must start with https://)
- Base URL for this site: {base_url}
- If you see a relative URL like "/product/xyz", convert it to: {base_url}/product/xyz

MATCHING RULES:
1. BRAND MATCH IS REQUIRED - the brand "{brand}" must match exactly or be a known variation
2. Product name can be a partial match (e.g., "Joint Gel" matches "fourfive Joint Gel 200g")
3. Flavor/variant doesn't need to match exactly
4. If you find ANY product from brand "{brand}", that's a potential match

CONFIDENCE LEVELS:
- "high": Exact brand AND product name match
- "medium": Brand matches, product is similar or from same product line
- "low": Only brand matches, or uncertain match

Return JSON:
{{
    "found": true or false,
    "batch_tested": true or false (true if found on this certification database),
    "product_url": "FULL URL starting with https://" or null,
    "confidence": "high", "medium", or "low",
    "matched_product_name": "exact product name as shown on the page" or null
}}
"""


# ============================================================================
# PUBLIC API
# ============================================================================

async def search_all_certifications(
    brand: str,
    product_name: str,
    variant: Optional[str] = None
) -> List[Dict]:
    """
    Search ALL certification databases concurrently.
    
    Args:
        brand: Supplement brand name (e.g., "Optimum Nutrition")
        product_name: Product name (e.g., "Gold Standard Whey")
        variant: Optional flavor/variant (e.g., "Vanilla Ice Cream")
        
    Returns:
        List of results, one per database
    """
    search_terms = generate_search_terms(brand, product_name, variant)
    
    logger.info(f"🔍 Searching certifications for: {brand} - {product_name}")
    logger.debug(f"Search terms: {search_terms[:3]}")
    
    # Create concurrent tasks for all databases
    tasks = []
    for org_name, config in CERTIFICATION_DATABASES.items():
        task = _search_single_certification(
            org_name, config, search_terms, brand, product_name, variant
        )
        tasks.append(task)
    
    # Run all searches concurrently
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Process results
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
                "error": str(result)
            })
        else:
            processed.append(result)
            status = "✅ FOUND" if result.get("found") else "❌ Not found"
            logger.info(f"{status}: {org_name}")
            if result.get("matched_product_name"):
                logger.info(f"   📦 Matched: {result.get('matched_product_name')}")
    
    return processed


async def _search_single_certification(
    org_name: str,
    config: Dict,
    search_terms: List[str],
    brand: str,
    product_name: str,
    variant: Optional[str]
) -> Dict:
    """Search a single certification database with brand-focused strategy."""
    
    strategy = config.get("search_strategy", "brand_first")
    
    # Determine which terms to try based on strategy
    if strategy == "brand_only":
        terms_to_try = [brand]
    elif strategy == "browse_table":
        terms_to_try = [brand]
    else:
        terms_to_try = search_terms[:3]
    
    best_result = None
    best_score = 0
    
    for i, search_term in enumerate(terms_to_try):
        # Build search URL
        if "search_param" in config:
            encoded = quote_plus(search_term)
            search_url = f"{config['search_url']}{config['search_param']}{encoded}"
        else:
            search_url = config["search_url"]
        
        if i == 0:
            logger.info(f"🌐 Searching {org_name}: {search_url}")
        
        # Build prompt
        prompt = _build_search_prompt(org_name, config, brand, product_name, variant)
        
        try:
            result = await _run_scraper_async(prompt, search_url)
            
            if result.get("error"):
                logger.debug(f"Attempt {i+1} error: {result.get('error')[:50]}")
                continue
            
            if result.get("found"):
                conf = result.get("confidence", "low")
                score = {"high": 3, "medium": 2, "low": 1}.get(conf, 0)
                
                if score > best_score:
                    best_score = score
                    
                    # Fix relative URLs
                    product_url = _normalize_url(
                        result.get("product_url"),
                        config['base_url']
                    )
                    
                    best_result = {
                        "organisation": org_name,
                        "found": True,
                        "batch_tested": True,
                        "product_url": product_url,
                        "search_url": search_url,
                        "confidence": conf,
                        "matched_product_name": result.get("matched_product_name"),
                        "search_term_used": search_term,
                        "database_description": config.get("description", "")
                    }
                    
                    # Stop early if high confidence
                    if conf == "high":
                        break
                        
        except Exception as e:
            logger.debug(f"Attempt {i+1} failed: {str(e)[:50]}")
            continue
    
    if best_result:
        return best_result
    
    # Not found - return failure result
    search_url = config['search_url']
    if "search_param" in config:
        search_url = f"{search_url}{config['search_param']}{quote_plus(brand)}"
    
    return {
        "organisation": org_name,
        "found": False,
        "batch_tested": False,
        "search_url": search_url,
        "search_terms_tried": terms_to_try,
        "database_description": config.get("description", "")
    }


def pick_primary_certification(results: List[Dict]) -> Optional[Dict]:
    """
    Pick the best certification result from search results.
    
    Returns:
        The highest-confidence found result, or None
    """
    best = None
    best_score = 0
    
    for r in results:
        if r.get("found") and r.get("batch_tested"):
            conf = r.get("confidence", "low")
            score = {"high": 3, "medium": 2, "low": 1}.get(conf, 0)
            if score > best_score:
                best_score = score
                best = r
    
    return best


def get_database_list() -> List[str]:
    """Get list of all certification databases."""
    return list(CERTIFICATION_DATABASES.keys())