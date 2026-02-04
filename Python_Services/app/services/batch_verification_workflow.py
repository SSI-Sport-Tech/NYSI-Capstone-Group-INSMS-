"""
Batch Verification OCR Workflow.

Takes an image of a supplement, extracts name/brand via OCR,
then searches certification databases to verify batch testing status.
"""

import os
import json
import cv2
import asyncio
import re
from typing import Dict, List, Optional
from urllib.parse import quote_plus
from dotenv import load_dotenv
from paddleocr import PaddleOCR
from pydantic import BaseModel, Field
from concurrent.futures import ThreadPoolExecutor
import functools

from llama_index.core.workflow import (
    StartEvent, StopEvent, Workflow, step, Context, Event
)
from llama_index.llms.openai import OpenAI

load_dotenv()

# Thread pool for running sync code
_executor = ThreadPoolExecutor(max_workers=6)


# ============================================================================
# SCHEMAS
# ============================================================================

class SupplementIdentification(BaseModel):
    """Schema for LLM to extract supplement info from image."""
    supplement_name: str = Field(..., description="Product name from label")
    supplement_brand: str = Field(..., description="Brand name from label")
    variant: Optional[str] = Field(None, description="Flavor/variant if visible")
    product_type: Optional[str] = Field(None, description="e.g., Whey Protein, Creatine, BCAA")
    key_identifiers: Optional[List[str]] = Field(None, description="Key words that identify this product")


class CertificationSearchResult(BaseModel):
    """Result from certification search."""
    found: bool = False
    batch_tested: bool = False
    product_url: Optional[str] = None
    confidence: str = "low"
    matched_product_name: Optional[str] = None


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
        # HASTA certified products page
        "search_url": "https://hasta.org.au/certified/",
        "search_param": "?_search=",
        "base_url": "https://hasta.org.au",
        "description": "Human and Supplement Testing Australia",
        "search_strategy": "brand_only"
    },
    "NSF Sport": {
        # NSF Sport search - use simple keyword search
        "search_url": "https://www.nsfsport.com/certified-products/",
        "search_param": "?keyword=",
        "base_url": "https://www.nsfsport.com",
        "description": "NSF Certified for Sport",
        "search_strategy": "brand_first"
    },
    "Cologne List": {
        # Cologne List - main database page with JS table
        "search_url": "https://www.koelnerliste.com/en/product-database",
        "base_url": "https://www.koelnerliste.com",
        "product_base": "https://www.koelnerliste.com/en/product/",
        "description": "Kölner Liste - German Sport University Cologne",
        "search_strategy": "browse_table"
    },
    "BSCG": {
        # BSCG certified database
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


def extract_search_terms(brand: str, product_name: str, variant: Optional[str] = None) -> List[str]:
    """
    Generate search terms prioritizing BRAND NAME.
    
    Strategy:
    1. Brand only (most important - find all products by this brand)
    2. Brand + key product words
    3. Full product name
    """
    terms = []
    
    brand_norm = normalize_text(brand)
    product_norm = normalize_text(product_name)
    
    # 1. BRAND ONLY (most important for finding products)
    terms.append(brand)
    
    # 2. Brand + key product identifier
    # Extract key words from product name
    key_words = []
    product_keywords = [
        "whey", "protein", "creatine", "bcaa", "amino", "pre-workout", 
        "preworkout", "mass", "casein", "isolate", "collagen",
        "gel", "joint", "recovery", "hydro", "omega", "vitamin",
        "energy", "endurance", "electrolyte", "caffeine"
    ]
    
    for kw in product_keywords:
        if kw in product_norm:
            key_words.append(kw)
    
    if key_words:
        terms.append(f"{brand} {key_words[0]}")
    
    # 3. Brand + product name (no variant)
    terms.append(f"{brand} {product_name}")
    
    # 4. Full query with variant
    if variant:
        terms.append(f"{brand} {product_name} {variant}")
    
    # 5. Just the product name (fallback)
    terms.append(product_name)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_terms = []
    for t in terms:
        t_norm = normalize_text(t)
        if t_norm not in seen and t_norm:
            seen.add(t_norm)
            unique_terms.append(t)
    
    return unique_terms


def run_scraper_sync(prompt: str, source: str, api_key: str) -> Dict:
    """Run ScrapeGraphAI scraper synchronously."""
    try:
        from scrapegraphai.graphs import SmartScraperGraph
        
        graph_config = {
            "llm": {
                "api_key": api_key,
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


async def run_scraper_async(prompt: str, source: str, api_key: str) -> Dict:
    """Run the synchronous scraper in a thread pool."""
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        _executor,
        functools.partial(run_scraper_sync, prompt, source, api_key)
    )
    return result


# ============================================================================
# EVENT DEFINITIONS
# ============================================================================

class OCRExtractionEvent(Event):
    """Event containing extracted supplement info from OCR."""
    supplement_name: str
    supplement_brand: str
    variant: Optional[str] = None
    product_type: Optional[str] = None
    key_identifiers: Optional[List[str]] = None


# ============================================================================
# WORKFLOW CLASS
# ============================================================================

class BatchVerificationWorkflow(Workflow):
    """
    2-step workflow for batch verification:
    1. OCR: Extract supplement name/brand from image
    2. Verify: Search certification databases for batch testing status
    """
    
    def __init__(self, timeout: int = 300, verbose: bool = True):
        super().__init__(timeout=timeout, verbose=verbose)
        
        self.ocr = PaddleOCR(
            use_angle_cls=False,
            lang='en',
            show_log=False
        )
        
        self.llm = OpenAI(
            model="gpt-4o-mini",
            temperature=0,
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
    
    def _normalize_url(self, url: str, base_url: str) -> str:
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
    
    @step
    async def extract_supplement_info(
        self, 
        ctx: Context, 
        ev: StartEvent
    ) -> OCRExtractionEvent:
        """Step 1: Extract supplement name and brand from image using OCR."""
        image_path = ev.get("image_path")
        
        if not image_path:
            print("❌ Error: No image_path provided")
            return StopEvent(result={"error": "No image_path provided"})
        
        print(f"\n👁️  [Step 1] Scanning image for supplement info: {image_path}")
        
        img = cv2.imread(image_path)
        if img is None:
            return StopEvent(result={"error": "Could not read image file"})
        
        height, width = img.shape[:2]
        print(f"   📐 Image size: {width}x{height}")
        
        if width < 800:
            scale = 800 / width
            img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        
        result = self.ocr.ocr(img, cls=False)
        
        if not result or len(result) == 0:
            return StopEvent(result={"error": "No text detected in image"})
        
        texts = []
        for line in result[0] or []:
            if line and len(line) >= 2:
                text = line[1][0] if isinstance(line[1], tuple) else str(line[1])
                score = line[1][1] if isinstance(line[1], tuple) else 1.0
                if score > 0.5:
                    texts.append(text)
                    print(f"   📝 {text}")
        
        full_text = "\n".join(texts)
        print(f"\n📝 OCR Text:\n{full_text}\n")
        
        sllm = self.llm.as_structured_llm(SupplementIdentification)
        
        prompt = f"""Extract the supplement name and brand from this OCR text.

RULES:
1. BRAND NAME: The company/manufacturer - this is CRITICAL for searching
   Examples: "Optimum Nutrition", "MyProtein", "fourfive", "Applied Nutrition", "PhD", "USN"
   
2. PRODUCT NAME: The specific product line/name
   Examples: "Gold Standard Whey", "Impact Whey", "Joint Gel", "Creatine Monohydrate"
   
3. VARIANT: Flavor if visible (e.g., "Vanilla Ice Cream", "Chocolate")

4. PRODUCT TYPE: Category (e.g., "Whey Protein", "Joint Support", "Creatine")

5. KEY IDENTIFIERS: Words that uniquely identify this product

OCR TEXT:
{full_text}
"""
        
        response = sllm.complete(prompt)
        supplement_info = json.loads(response.text)
        
        supplement_name = supplement_info.get('supplement_name', 'Unknown')
        supplement_brand = supplement_info.get('supplement_brand', 'Unknown')
        variant = supplement_info.get('variant')
        product_type = supplement_info.get('product_type')
        key_identifiers = supplement_info.get('key_identifiers', [])
        
        print(f"✅ Extracted: {supplement_brand} - {supplement_name}")
        if variant:
            print(f"   Variant: {variant}")
        if product_type:
            print(f"   Type: {product_type}")
        
        return OCRExtractionEvent(
            supplement_name=supplement_name,
            supplement_brand=supplement_brand,
            variant=variant,
            product_type=product_type,
            key_identifiers=key_identifiers
        )
    
    @step
    async def verify_certifications(
        self, 
        ctx: Context, 
        ev: OCRExtractionEvent
    ) -> StopEvent:
        """Step 2: Search certification databases for batch testing status."""
        print("\n🔍 [Step 2] Searching certification databases...")
        
        supplement_name = ev.supplement_name
        supplement_brand = ev.supplement_brand
        variant = ev.variant
        
        search_terms = extract_search_terms(supplement_brand, supplement_name, variant)
        
        print(f"   🏷️  Brand: {supplement_brand}")
        print(f"   📦 Product: {supplement_name}")
        print(f"   🔎 Search terms: {search_terms[:3]}")
        
        results = await self._search_all_certifications(
            search_terms, supplement_brand, supplement_name, variant
        )
        
        is_batch_tested = any(r.get("found") and r.get("batch_tested") for r in results)
        
        primary = None
        best_score = 0
        for r in results:
            if r.get("found") and r.get("batch_tested"):
                conf = r.get("confidence", "low")
                score = {"high": 3, "medium": 2, "low": 1}.get(conf, 0)
                if score > best_score:
                    best_score = score
                    primary = r
        
        response = {
            "success": True,
            "supplement_name": supplement_name,
            "supplement_brand": supplement_brand,
            "variant": variant,
            "is_batch_tested": is_batch_tested,
            "certifications": results,
            "primary_certification": primary,
            "search_terms_used": search_terms[:3],
            "errors": []
        }
        
        print("\n" + "=" * 60)
        print("🎉 VERIFICATION COMPLETE")
        print("=" * 60)
        print(f"Brand: {supplement_brand}")
        print(f"Product: {supplement_name}")
        if variant:
            print(f"Variant: {variant}")
        print(f"Batch Tested: {'✅ YES' if is_batch_tested else '❌ NO'}")
        if primary:
            print(f"Primary Certification: {primary.get('organisation')}")
            print(f"Matched Product: {primary.get('matched_product_name', 'N/A')}")
            print(f"Proof URL: {primary.get('product_url')}")
        print("=" * 60 + "\n")
        
        return StopEvent(result=response)
    
    async def _search_all_certifications(
        self, 
        search_terms: List[str],
        brand: str,
        product_name: str,
        variant: Optional[str]
    ) -> List[Dict]:
        """Search all certification databases concurrently."""
        
        tasks = []
        for org_name, config in CERTIFICATION_DATABASES.items():
            task = self._search_single_certification(
                org_name, config, search_terms, brand, product_name, variant
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        processed_results = []
        org_names = list(CERTIFICATION_DATABASES.keys())
        
        for i, result in enumerate(results):
            org_name = org_names[i]
            
            if isinstance(result, Exception):
                print(f"   ⚠️ {org_name}: Search failed - {str(result)}")
                processed_results.append({
                    "organisation": org_name,
                    "found": False,
                    "batch_tested": False,
                    "error": str(result)
                })
            else:
                processed_results.append(result)
                status = "✅ FOUND" if result.get("found") else "❌ Not found"
                print(f"   {status}: {org_name}")
                if result.get("matched_product_name"):
                    print(f"      📦 Matched: {result.get('matched_product_name')}")
                if result.get("product_url"):
                    print(f"      🔗 {result.get('product_url')}")
        
        return processed_results
    
    async def _search_single_certification(
        self,
        org_name: str,
        config: Dict,
        search_terms: List[str],
        brand: str,
        product_name: str,
        variant: Optional[str]
    ) -> Dict:
        """Search a single certification database with brand-focused strategy."""
        
        best_result = None
        best_confidence_score = 0
        
        # Determine search strategy
        strategy = config.get("search_strategy", "brand_first")
        
        # For brand_only strategy, just search by brand
        if strategy == "brand_only":
            terms_to_try = [brand]
        elif strategy == "browse_table":
            # For JS tables, search by brand only
            terms_to_try = [brand]
        else:
            # brand_first: try brand first, then brand+product
            terms_to_try = search_terms[:3]
        
        for i, search_term in enumerate(terms_to_try):
            
            # Build search URL
            if "search_param" in config:
                encoded_query = quote_plus(search_term)
                search_url = f"{config['search_url']}{config['search_param']}{encoded_query}"
            else:
                search_url = config["search_url"]
            
            if i == 0:
                print(f"   🌐 Searching {org_name}...")
                print(f"      URL: {search_url}")
            
            # Build the search prompt based on strategy
            prompt = self._build_search_prompt(
                org_name, config, search_term, brand, product_name, variant
            )
            
            try:
                result = await run_scraper_async(prompt, search_url, self.openai_api_key)
                
                if result.get("error"):
                    print(f"      ⚠️ Attempt {i+1} error: {result.get('error')[:50]}")
                    continue
                
                if result.get("found"):
                    conf = result.get("confidence", "low")
                    score = {"high": 3, "medium": 2, "low": 1}.get(conf, 0)
                    
                    if score > best_confidence_score:
                        best_confidence_score = score
                        
                        # Fix relative URLs
                        product_url = result.get("product_url")
                        if product_url:
                            product_url = self._normalize_url(product_url, config['base_url'])
                        
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
                        
                        if conf == "high":
                            break
                            
            except Exception as e:
                print(f"      ⚠️ Attempt {i+1} failed: {str(e)[:50]}")
                continue
        
        if best_result:
            return best_result
        else:
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
    
    def _build_search_prompt(
        self,
        org_name: str,
        config: Dict,
        search_term: str,
        brand: str,
        product_name: str,
        variant: Optional[str]
    ) -> str:
        """Build a customized search prompt for each certification database."""
        
        base_url = config['base_url']
        
        # Common prompt parts
        brand_info = f"""
TARGET PRODUCT TO FIND:
- Brand: "{brand}" (MUST MATCH - this is the most important)
- Product: "{product_name}"
- Variant/Flavor: "{variant or 'any flavor is OK'}"
- Search term used: "{search_term}"
"""
        
        # URL instructions
        url_instructions = f"""
URL REQUIREMENTS:
- Return the FULL absolute URL (must start with https://)
- Base URL for this site: {base_url}
- If you see a relative URL like "/product/xyz", convert it to: {base_url}/product/xyz
"""
        
        # Database-specific instructions
        if org_name == "Informed Sport" or org_name == "Informed Choice":
            specific_instructions = """
SEARCH INSTRUCTIONS:
1. Look through the list of certified supplements on this page
2. Find products where the BRAND NAME matches "{brand}"
3. Among those, find the product that best matches "{product_name}"
4. The page shows supplement cards with product names and brand names
5. Click/look for product details to get the specific product URL
"""
        
        elif org_name == "HASTA":
            specific_instructions = """
SEARCH INSTRUCTIONS FOR HASTA:
1. This is the HASTA certified products database for Australian supplements
2. Look for a searchable list or table of certified products
3. Search/filter by brand name "{brand}"
4. Find any product from this brand - HASTA certifies by brand/manufacturer
5. Products listed here have been batch tested for banned substances
6. The URL might be in format: https://hasta.org.au/certified/product-name/
"""
        
        elif org_name == "NSF Sport":
            specific_instructions = """
SEARCH INSTRUCTIONS FOR NSF SPORT:
1. This is NSF Certified for Sport database
2. Look for the product search results or certified products list
3. Search/filter by brand name "{brand}" or company name
4. Find the specific product "{product_name}" or any product from this brand
5. NSF Sport tests for 280+ substances banned in sport
6. Product URLs are typically: https://www.nsfsport.com/certified-products/product-name
"""
        
        elif org_name == "Cologne List":
            specific_instructions = """
SEARCH INSTRUCTIONS FOR COLOGNE LIST (Kölner Liste):
1. This page has a searchable TABLE of certified supplements
2. The table has columns: Company, Product, Product Category
3. Use the search box or filter to find brand "{brand}"
4. Look in the "Company" column for the brand name
5. Find the specific product in the "Product" column
6. Product URLs follow pattern: https://www.koelnerliste.com/en/product/product-slug
7. ALL products listed in this table ARE batch tested (that's why they're on the list)
"""
        
        elif org_name == "BSCG":
            specific_instructions = """
SEARCH INSTRUCTIONS FOR BSCG:
1. This is the BSCG Certified Drug Free database
2. Look for certified products list or search results
3. Search by brand name "{brand}"
4. Find products from this brand that match "{product_name}"
5. BSCG tests for 500+ drugs and banned substances
6. Product URLs may be: https://www.bscg.org/certified-drug-free-database/product/
"""
        
        else:
            specific_instructions = """
SEARCH INSTRUCTIONS:
1. Look through all product listings on this page
2. Find products where brand matches "{brand}"
3. Then match the product name "{product_name}"
"""
        
        # Matching rules
        matching_rules = f"""
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
        
        # Combine all parts
        full_prompt = f"""Analyze this certification database page to find batch-tested supplements.

{brand_info}

{specific_instructions.format(brand=brand, product_name=product_name)}

{url_instructions}

{matching_rules}
"""
        
        return full_prompt


# ============================================================================
# STANDALONE VERIFICATION (No OCR)
# ============================================================================

async def verify_supplement_batch_testing(
    supplement_name: str,
    supplement_brand: str,
    variant: Optional[str] = None
) -> Dict:
    """Verify batch testing status without OCR."""
    workflow = BatchVerificationWorkflow(timeout=300, verbose=True)
    
    search_terms = extract_search_terms(supplement_brand, supplement_name, variant)
    
    print(f"\n🔍 Verifying batch testing for: {supplement_brand} {supplement_name}")
    print(f"   Search terms: {search_terms[:3]}")
    
    results = await workflow._search_all_certifications(
        search_terms, supplement_brand, supplement_name, variant
    )
    
    is_batch_tested = any(r.get("found") and r.get("batch_tested") for r in results)
    
    primary = None
    best_score = 0
    for r in results:
        if r.get("found") and r.get("batch_tested"):
            conf = r.get("confidence", "low")
            score = {"high": 3, "medium": 2, "low": 1}.get(conf, 0)
            if score > best_score:
                best_score = score
                primary = r
    
    return {
        "success": True,
        "supplement_name": supplement_name,
        "supplement_brand": supplement_brand,
        "variant": variant,
        "is_batch_tested": is_batch_tested,
        "certifications": results,
        "primary_certification": primary,
        "search_terms_used": search_terms[:3],
        "errors": []
    }