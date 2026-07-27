"""
Batch Verification API Router.
Endpoints for verifying supplement batch testing status.

KEY FEATURES:
- Returns URLs where products are found
- is_verified = True if at least ONE website found the product
- Supports brand/product search, batch ID search, and combined search
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pathlib import Path
from typing import Optional, List, Dict, Any
import tempfile
import shutil
import logging

from app.services import ocr_engine, llm_structurer, certification_searcher
from app.services.batch_id_extractor import extract_batch_id, extract_batch_id_from_image

router = APIRouter()
logger = logging.getLogger(__name__)




# ============================================================================
# BRAND/PRODUCT VERIFICATION ENDPOINTS
# ============================================================================

@router.post("/verify")
async def verify_from_text(
    supplement_brand: str,
    supplement_name: str
):
    """
    Verify batch testing by brand/product name (text input).
    
    **Returns:**
    - is_verified: True if product found on at least ONE certification site
    - found_websites: List of sites where product was found
    - urls: Direct links to product on certification sites
    """
    print(f"🔍 Verifying: {supplement_brand} - {supplement_name}")
    
    try:
        results = await certification_searcher.search_all_certifications(
            brand=supplement_brand,
            product_name=supplement_name
        )
        
        summary = certification_searcher.build_verification_summary(results)
        
        print(f"✅ Verified: {summary['is_verified']} (found on {summary['found_count']} sites)")
        
        return {
            "success": True,
            "supplement_brand": supplement_brand,
            "supplement_name": supplement_name,
            
            # MAIN RESULT
            "is_verified": summary["is_verified"],
            "is_batch_tested": summary["is_verified"],
            
            # WHERE IT WAS FOUND
            "found_count": summary["found_count"],
            "found_websites": summary["found_websites"],
            "urls": summary["urls"],
            "quick_links": summary["quick_links"],
            
            # DETAILED RESULTS
            "all_results": [
                {
                    "website": r.get("organisation"),
                    "found": r.get("found", False),
                    "batch_tested": r.get("batch_tested", False),
                    "product_url": r.get("product_url"),
                    "search_url": r.get("search_url"),
                    "product_name": r.get("matched_product_name"),
                    "confidence": r.get("confidence"),
                    "products_found": r.get("products_found", [])
                }
                for r in results
            ],
            
            "errors": [r.get("error") for r in results if r.get("error")]
        }
        
    except Exception as e:
        logger.error(f"Verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify-image")
async def verify_from_image(file: UploadFile = File(...)):
    """
    Upload supplement image → OCR → Verify on certification sites.
    
    **Returns:**
    - Extracted brand/product from image
    - is_verified: True if found on at least ONE site
    - urls: Direct links to product on certification sites
    """
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    tmp_dir = Path(tempfile.mkdtemp())
    img_path = tmp_dir / file.filename
    
    try:
        with open(img_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        print(f"🔍 Verifying from image: {file.filename}")
        
        # OCR
        try:
            raw_text = ocr_engine.extract_text(str(img_path))
        except ValueError as e:
            raise HTTPException(status_code=422, detail=f"OCR failed: {str(e)}")
        
        # Identify supplement
        identification = llm_structurer.identify_supplement(raw_text)
        
        brand = identification.get("supplement_brand", "Unknown")
        name = identification.get("supplement_name", "Unknown")
        variant = identification.get("variant")
        
        print(f"📦 Identified: {brand} - {name}")
        
        # Search certifications
        results = await certification_searcher.search_all_certifications(brand, name, variant)
        
        summary = certification_searcher.build_verification_summary(results)
        
        print(f"✅ Verified: {summary['is_verified']} (found on {summary['found_count']} sites)")
        
        return {
            "success": True,
            
            # EXTRACTED INFO
            "extracted": {
                "supplement_brand": brand,
                "supplement_name": name,
                "variant": variant,
                "ocr_text": raw_text[:500] + "..." if len(raw_text) > 500 else raw_text
            },
            
            # MAIN RESULT
            "is_verified": summary["is_verified"],
            "is_batch_tested": summary["is_verified"],
            
            # WHERE IT WAS FOUND
            "found_count": summary["found_count"],
            "found_websites": summary["found_websites"],
            "urls": summary["urls"],
            "quick_links": summary["quick_links"],
            
            # DETAILED RESULTS
            "all_results": [
                {
                    "website": r.get("organisation"),
                    "found": r.get("found", False),
                    "batch_tested": r.get("batch_tested", False),
                    "product_url": r.get("product_url"),
                    "search_url": r.get("search_url"),
                    "product_name": r.get("matched_product_name"),
                    "confidence": r.get("confidence")
                }
                for r in results
            ],
            
            "errors": [r.get("error") for r in results if r.get("error")]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ============================================================================
# BATCH ID VERIFICATION ENDPOINTS
# ============================================================================

@router.post("/verify-batch-id")
async def verify_batch_id(
    batch_id: str,
    supplement_brand: Optional[str] = None,
    supplement_name: Optional[str] = None
):
    """
    Verify by batch/lot number.
    
    **Strategy:**
    1. Check Informed Sport batch lookup (they have direct batch verification)
    2. If brand/product provided, also search by brand/product
    
    **Returns:**
    - batch_id_verified: True if batch ID found on Informed Sport
    - product_verified: True if product found on any site
    - urls: Direct links
    """
    print(f"🔍 Verifying batch ID: {batch_id}")
    
    try:
        results = await certification_searcher.search_by_batch_id(
            batch_id=batch_id,
            brand=supplement_brand,
            product_name=supplement_name
        )
        
        summary = certification_searcher.build_batch_id_summary(results)
        
        is_verified = summary["batch_id_verified"] and summary["product_found"]
        
        print(f"✅ Batch verified: {summary['batch_id_verified']}, Product found: {summary['product_found']}")
        
        return {
            "success": True,
            "batch_id": batch_id,
            "supplement_brand": supplement_brand,
            "supplement_name": supplement_name,
            
            # MAIN RESULTS
            "is_verified": is_verified,
            "batch_id_verified": summary["batch_id_verified"],
            "product_found": summary["product_found"],
            
            # BATCH ID VERIFICATION DETAILS
            "is_batch_tested": summary["batch_id_verified"],
            "batch_verified_on": summary["batch_verified_websites"],
            "batch_urls": summary["batch_verified_urls"],
            
            # PRODUCT VERIFICATION DETAILS
            "found": summary["product_found"],
            "found_websites": summary["product_found_websites"],
            "quick_links": summary["product_found_urls"],
            "found_count": summary["found_count"],
            
            # ALL URLS (easy access)
            "quick_links": summary["quick_links"],
            
            # DETAILED RESULTS
            "all_results": [
                {
                    "website": r.get("organisation"),
                    "found": r.get("found", False),
                    "batch_id_verified": r.get("batch_id_verified", False),
                    "product_url": r.get("product_url"),
                    "search_url": r.get("search_url"),
                    "product_name": r.get("matched_product_name"),
                    "note": r.get("note")
                }
                for r in results
            ],
            
            "errors": [r.get("error") for r in results if r.get("error")]
        }
        
    except Exception as e:
        print(f"Batch ID verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify-batch-id-image")
async def verify_batch_id_from_image(
    file: UploadFile = File(...),
    supplement_brand: Optional[str] = Form(None),
    supplement_name: Optional[str] = Form(None)
):
    """
    Extract batch ID from image → Verify on certification sites.
    
    **Returns:**
    - Extracted batch ID
    - is_verified: True if verified on any site
    - urls: Direct links
    """
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    tmp_dir = Path(tempfile.mkdtemp())
    img_path = tmp_dir / file.filename
    
    try:
        with open(img_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        print(f"🔍 Extracting batch ID from: {file.filename}")
        
        # Extract batch ID
        extraction = extract_batch_id_from_image(str(img_path))
        batch_id = extraction.get("batch_id")
        
        if not batch_id:
            return {
                "success": False,
                "error": "No batch ID found in image",
                "extraction": {
                    "batch_id": None,
                    "confidence": extraction.get("confidence", "low"),
                    "possible_alternatives": extraction.get("possible_alternatives", []),
                    "ocr_text": extraction.get("ocr_text", "")[:500]
                },
                "is_verified": False,
                "urls": []
            }
        
        print(f"📋 Extracted batch ID: {batch_id}")
        
        # Verify batch ID
        results = await certification_searcher.search_by_batch_id(
            batch_id=batch_id,
            brand=supplement_brand,
            product_name=supplement_name
        )
        
        summary = certification_searcher.build_batch_id_summary(results)
        is_verified = summary["batch_id_verified"] and summary["product_found"]
        
        return {
            "success": True,
            
            # EXTRACTED BATCH ID
            "extraction": {
                "batch_id": batch_id,
                "batch_id_type": extraction.get("batch_id_type"),
                "confidence": extraction.get("confidence", "low"),
                "possible_alternatives": extraction.get("possible_alternatives", []),
                "ocr_text": extraction.get("ocr_text", "")[:500]
            },
            
            # MAIN RESULT
            "is_verified": is_verified,
            "is_batch_tested": summary["batch_id_verified"],
            "product_found": summary["product_found"],
            
            # URLS
            "batch_verified_urls": summary["batch_verified_urls"],
            "product_found_urls": summary["product_found_urls"],
            "quick_links": summary["quick_links"],
            
            "errors": [r.get("error") for r in results if r.get("error")]
        }
        
    except Exception as e:
        logger.error(f"Batch ID image verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ============================================================================
# COMBINED VERIFICATION ENDPOINTS
# ============================================================================

@router.post("/verify-combined")
async def verify_combined(
    supplement_brand: str,
    supplement_name: str,
    batch_id: Optional[str] = None,
    variant: Optional[str] = None
):
    """
    Combined verification: Brand/product + optional batch ID.
    
    **Returns:**
    - is_verified: True if product found on at least ONE site
    - batch_id_verified: True if batch ID verified (if provided)
    - urls: All URLs where product/batch was found
    """
    print(f"🔍 Combined verification: {supplement_brand} - {supplement_name}, batch={batch_id}")
    
    try:
        results = await certification_searcher.search_combined(
            batch_id=batch_id,
            brand=supplement_brand,
            product_name=supplement_name,
            variant=variant
        )
        
        # Build summaries
        brand_summary = certification_searcher.build_verification_summary(results.get("brand_results", []))
        
        batch_summary = None
        if batch_id and results.get("batch_id_results"):
            batch_summary = certification_searcher.build_batch_id_summary(results.get("batch_id_results", []))
        
        # Overall verification
        is_verified = brand_summary["is_verified"]
        batch_verified = batch_summary["batch_id_verified"] if batch_summary else False
        
        # Combine all URLs
        all_urls = brand_summary["quick_links"].copy()
        if batch_summary:
            for url in batch_summary["quick_links"]:
                if url not in all_urls:
                    all_urls.append(url)
        
        print(f"✅ Product verified: {is_verified}, Batch verified: {batch_verified}")
        
        return {
            "success": True,
            "supplement_brand": supplement_brand,
            "supplement_name": supplement_name,
            "batch_id": batch_id,
            "variant": variant,
            
            # MAIN RESULTS
            "is_verified": is_verified,
            "is_batch_tested": is_verified,
            "batch_id_verified": batch_verified,
            "is_fully_verified": results.get("is_fully_verified", False),
            
            # PRODUCT VERIFICATION
            "batch_id_verified": brand_summary["is_verified"],
            "found_count": brand_summary["found_count"],
            "found_websites": brand_summary["found_websites"],
            "brand_urls": brand_summary["urls"],
            
            # BATCH ID VERIFICATION (if batch_id provided)
            "batch_id_verified": batch_verified if batch_id else None,
            "batch_verified_on": (batch_summary["batch_verified_websites"] if batch_summary else []) if batch_id else None,
            "batch_urls": (batch_summary["batch_verified_urls"] if batch_summary else []) if batch_id else None,
            
            # ALL URLS
            "quick_links": all_urls,
            
            # PRIMARY MATCH
            "primary_match": {
                "website": results["primary_certification"].get("organisation"),
                "product_url": results["primary_certification"].get("product_url"),
                "product_name": results["primary_certification"].get("matched_product_name")
            } if results.get("primary_certification") else None,
            
            "errors": []
        }
        
    except Exception as e:
        logger.error(f"Combined verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify-combined-images")
async def verify_combined_from_images(
    batch_id_image: UploadFile = File(..., description="Image with batch/lot number"),
    product_image: UploadFile = File(..., description="Image with product name/brand")
):
    """
    Full verification from TWO images:
    1. Batch ID image → Extract batch ID
    2. Product image → Extract brand/product
    3. Verify both
    
    **Returns:**
    - Extracted batch ID and brand/product
    - is_verified: True if found on at least ONE site
    - urls: All URLs
    """
    # Validate files
    for f, name in [(batch_id_image, "batch_id_image"), (product_image, "product_image")]:
        if not f.content_type or not f.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail=f"{name} must be an image")
    
    tmp_dir = Path(tempfile.mkdtemp())
    
    try:
        # Save images
        batch_path = tmp_dir / f"batch_{batch_id_image.filename}"
        product_path = tmp_dir / f"product_{product_image.filename}"
        
        with open(batch_path, "wb") as f:
            f.write(await batch_id_image.read())
        with open(product_path, "wb") as f:
            f.write(await product_image.read())
        
        print(f"🔍 Combined image verification")
        
        # Extract batch ID
        batch_extraction = extract_batch_id_from_image(str(batch_path))
        batch_id = batch_extraction.get("batch_id")
        
        print(f"   Batch ID: {batch_id or 'Not found'}")
        
        # Extract brand/product
        try:
            product_text = ocr_engine.extract_text(str(product_path))
            product_id = llm_structurer.identify_supplement(product_text)
        except Exception as e:
            logger.error(f"Product OCR failed: {str(e)}")
            product_id = {"supplement_brand": "Unknown", "supplement_name": "Unknown"}
        
        brand = product_id.get("supplement_brand", "Unknown")
        name = product_id.get("supplement_name", "Unknown")
        variant = product_id.get("variant")
        
        print(f"   Brand: {brand}, Product: {name}")
        
        # Run combined search
        results = await certification_searcher.search_combined(
            batch_id=batch_id,
            brand=brand,
            product_name=name,
            variant=variant
        )
        
        # Build summaries
        brand_summary = certification_searcher.build_verification_summary(results.get("brand_results", []))
        
        batch_summary = None
        if batch_id and results.get("batch_id_results"):
            batch_summary = certification_searcher.build_batch_id_summary(results.get("batch_id_results", []))
        
        is_verified = brand_summary["is_verified"]
        batch_verified = batch_summary["batch_id_verified"] if batch_summary else False
        
        # Combine URLs
        all_urls = brand_summary["quick_links"].copy()
        if batch_summary:
            for url in batch_summary["quick_links"]:
                if url not in all_urls:
                    all_urls.append(url)
        
        return {
            "success": True,
            
            # EXTRACTED INFO
            "extraction": {
                "batch_id": {
                    "value": batch_id,
                    "confidence": batch_extraction.get("confidence", "low"),
                    "alternatives": batch_extraction.get("possible_alternatives", [])
                },
                "product": {
                    "brand": brand,
                    "name": name,
                    "variant": variant
                }
            },
            
            # MAIN RESULTS
            "is_verified": is_verified,
            "is_batch_tested": is_verified,
            "batch_id_verified": batch_verified,
            
            # PRODUCT VERIFICATION
            "batch_id_verified": brand_summary["is_verified"],
            "found_count": brand_summary["found_count"],
            "found_websites": brand_summary["found_websites"],
            "brand_urls": brand_summary["urls"],
            
            # BATCH VERIFICATION
            "batch_id_verified": batch_verified if batch_id else None,
            "batch_verified_on": (batch_summary["batch_verified_websites"] if batch_summary else []) if batch_id else None,
            "batch_urls": (batch_summary["batch_verified_urls"] if batch_summary else []) if batch_id else None,
            
            # ALL URLS
            "quick_links": all_urls,
            
            # PRIMARY MATCH
            "primary_match": {
                "website": results["primary_certification"].get("organisation"),
                "product_url": results["primary_certification"].get("product_url"),
                "product_name": results["primary_certification"].get("matched_product_name")
            } if results.get("primary_certification") else None,
            
            "errors": []
        }
        
    except Exception as e:
        logger.error(f"Combined image verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ============================================================================
# UTILITY ENDPOINTS
# ============================================================================

@router.get("/databases")
async def list_databases():
    """List all supported certification databases."""
    return {
        "databases": certification_searcher.get_database_info(),
        "count": len(certification_searcher.CERTIFICATION_DATABASES)
    }


@router.get("/health")
async def health():
    """Health check."""
    return {
        "status": "healthy",
        "databases": certification_searcher.get_database_list(),
        "endpoints": [
            "POST /verify - Verify by brand/product (text)",
            "POST /verify-image - Verify by brand/product (image)",
            "POST /verify-batch-id - Verify by batch ID",
            "POST /verify-batch-id-image - Verify by batch ID (image)",
            "POST /verify-combined - Combined verification (text)",
            "POST /verify-combined-images - Combined verification (2 images)"
        ]
    }

@router.post("/debug-scrape")
async def debug_scrape(org_name: str, search_term: str):
    from app.services.certification_searcher import (
        CERTIFICATION_DATABASES, _fetch_informed_api_html,
        _run_scraper_sync, _build_search_prompt,
        selenium_fetch_search_results
    )

    config = CERTIFICATION_DATABASES.get(org_name)
    if not config:
        raise HTTPException(404, f"Unknown org: {org_name}")

    html = None
    source_method = "selenium"

    # Try API first for Informed Sport/Choice
    if config.get("use_api"):
        html = _fetch_informed_api_html(config["api_search_url"], search_term)
        if html:
            source_method = "api"

    # Fall back to Selenium
    if not html:
        selenium_url = config.get("selenium_base_url", config["search_url"])
        wait_fn = config.get("selenium_wait_fn")
        if wait_fn:
            try:
                html = selenium_fetch_search_results(
                    selenium_url, search_term, wait_fn,
                    wait_time=2, post_search_wait=3
                )
            except Exception as e:
                html = f"Selenium failed: {e}"

    if not html:
        html = ""

    prompt = _build_search_prompt(org_name, config, search_term, search_term)
    llm_result = _run_scraper_sync(prompt, html)

    return {
        "org_name": org_name,
        "search_term": search_term,
        "source_method": source_method,
        "html_length": len(html),
        "html_trimmed_length": min(len(html), 15000),
        "html_contains_search_term": search_term.lower() in html.lower(),
        "html_snippet_around_term": html[max(0, html.lower().find(search_term.lower())-100):html.lower().find(search_term.lower())+300] if search_term.lower() in html.lower() else "",
        "llm_result": llm_result,
    }