"""
Webscraper API Router
Provides endpoints for scraping supplement data from e-commerce websites.
"""

import os
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List
from dotenv import load_dotenv

from app.schemas.webscraper_schemas import (
    ScrapeListRequest, ScrapeListResponse,
    ScrapeProductRequest, ScrapeProductResponse,
    ScrapeFullRequest, ScrapeFullResponse,
    PushStagingRequest, PushStagingResponse,
    WebscraperHealthResponse
)
from app.services import list_scraper, product_scraper, batch_tester, ocr_enricher, staging_service
from app.utils.database import get_db_connection, test_db_connection

load_dotenv()

router = APIRouter(
    prefix="/api/webscraper",
    tags=["Webscraper"]
)


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/health", response_model=WebscraperHealthResponse)
async def health_check():
    """
    Check health status of webscraper service.
    
    Returns:
        WebscraperHealthResponse: Status of all dependencies
    """
    # Test database
    db_connected = test_db_connection()
    
    # Test Selenium (basic check)
    selenium_available = True
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        options = Options()
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        driver = webdriver.Chrome(options=options)
        driver.quit()
    except Exception:
        selenium_available = False
    
    # Test ScrapeGraphAI
    scrapegraphai_available = True
    try:
        from scrapegraphai import graphs
    except Exception:
        scrapegraphai_available = False
    
    # Test OCR
    ocr_available = True
    try:
        from paddleocr import PaddleOCR
    except Exception:
        ocr_available = False
    
    status = "healthy" if all([
        db_connected,
        selenium_available,
        scrapegraphai_available,
        ocr_available
    ]) else "degraded"
    
    return WebscraperHealthResponse(
        status=status,
        selenium_available=selenium_available,
        scrapegraphai_available=scrapegraphai_available,
        database_connected=db_connected,
        ocr_available=ocr_available
    )


@router.post("/scrape-list", response_model=ScrapeListResponse)
async def scrape_product_list(request: ScrapeListRequest):
    """
    Scrape product URLs from a catalog/listing page.
    
    Args:
        request: ScrapeListRequest with list_url and optional max_pages
        
    Returns:
        ScrapeListResponse: List of product URLs found
    """
    try:
        openai_key = os.getenv("OPENAI_API_KEY")
        if not openai_key:
            raise HTTPException(500, "OPENAI_API_KEY not configured")
        
        print(f"📋 Scraping product list: {request.list_url}")
        
        product_urls = await list_scraper.scrape_product_list(
            list_url=request.list_url,
            openai_api_key=openai_key,
            max_pages=request.max_pages
        )
        
        return ScrapeListResponse(
            success=True,
            catalog_url=request.list_url,
            product_urls=product_urls,
            total_products=len(product_urls),
            pages_scraped=request.max_pages or len(product_urls) // 10 + 1,
            errors=None
        )
        
    except Exception as e:
        print(f"❌ Scrape list failed: {e}")
        raise HTTPException(500, f"Scraping failed: {str(e)}")


@router.post("/scrape-product", response_model=ScrapeProductResponse)
async def scrape_single_product(request: ScrapeProductRequest):
    """
    Scrape detailed information from a single product page.
    
    Args:
        request: ScrapeProductRequest with product_url and enrichment options
        
    Returns:
        ScrapeProductResponse: Extracted product data
    """
    try:
        openai_key = os.getenv("OPENAI_API_KEY")
        if not openai_key:
            raise HTTPException(500, "OPENAI_API_KEY not configured")
        
        print(f"🛒 Scraping product: {request.product_url}")
        
        # Scrape product details
        products = await product_scraper.scrape_product_details(
            product_url=request.product_url,
            openai_api_key=openai_key
        )
        
        errors = []
        
        # Enrich with OCR if requested
        if request.enrich_with_ocr:
            for product in products:
                try:
                    await ocr_enricher.enrich_product_with_ocr(product)
                except Exception as e:
                    errors.append(f"OCR failed for {product.get('Name')}: {str(e)}")
        
        # Verify batch testing if requested
        if request.verify_batch_testing:
            for product in products:
                try:
                    query = f"{product.get('Brand', '')} {product.get('Name', '')}".strip()
                    result = await batch_tester.search_batch_testing(
                        brand_supplement=query,
                        openai_api_key=openai_key,
                        max_tries=2
                    )
                    product["Batch_tested"] = result.get("Batch_tested")
                    product["batch_testing_org"] = result.get("Organisation")
                    product["batch_testing_sources"] = result.get("sources", [])
                except Exception as e:
                    errors.append(f"Batch test failed for {query}: {str(e)}")
                    product["Batch_tested"] = "Unknown"
                    product["batch_testing_org"] = "Unknown"
        
        return ScrapeProductResponse(
            success=True,
            product_url=request.product_url,
            products=products,
            total_variants=len(products),
            errors=errors if errors else None
        )
        
    except Exception as e:
        print(f"❌ Scrape product failed: {e}")
        raise HTTPException(500, f"Scraping failed: {str(e)}")


@router.post("/scrape-full", response_model=ScrapeFullResponse)
async def scrape_full_catalog(
    request: ScrapeFullRequest,
    background_tasks: BackgroundTasks
):
    """
    Run full scraping pipeline: list → products → enrichment → staging.
    
    This is a comprehensive endpoint that:
    1. Scrapes product URLs from catalog page
    2. Scrapes each product's details
    3. Enriches with OCR (if nutrition image present)
    4. Verifies batch testing certifications
    5. Optionally pushes to staging table
    
    Args:
        request: ScrapeFullRequest with catalog_url and options
        background_tasks: FastAPI background tasks (for async processing)
        
    Returns:
        ScrapeFullResponse: Summary of scraping results
    """
    try:
        openai_key = os.getenv("OPENAI_API_KEY")
        if not openai_key:
            raise HTTPException(500, "OPENAI_API_KEY not configured")
        
        print(f"\n{'='*60}")
        print(f"🚀 FULL SCRAPING PIPELINE: {request.catalog_url}")
        print(f"{'='*60}\n")
        
        errors = []
        
        # Step 1: Scrape product list
        print("📋 Step 1: Scraping product list...")
        product_urls = await list_scraper.scrape_product_list(
            list_url=request.catalog_url,
            openai_api_key=openai_key,
            max_pages=None  # Get all pages
        )
        
        if request.max_products:
            product_urls = product_urls[:request.max_products]
        
        print(f"✅ Found {len(product_urls)} product(s)")
        
        # Step 2: Scrape all products
        print("\n🛒 Step 2: Scraping product details...")
        all_products, scrape_errors = await product_scraper.scrape_multiple_products(
            product_urls=product_urls,
            openai_api_key=openai_key
        )
        errors.extend(scrape_errors)
        
        print(f"✅ Scraped {len(all_products)} variant(s)")
        
        # Step 3: OCR enrichment
        print("\n👁️ Step 3: OCR enrichment...")
        for product in all_products:
            try:
                enriched = await ocr_enricher.enrich_product_with_ocr(product)
                if enriched:
                    print(f"  ✅ OCR: {product.get('Name')}")
            except Exception as e:
                errors.append(f"OCR failed for {product.get('Name')}: {str(e)}")
        
        # Step 4: Batch testing verification
        print("\n🔍 Step 4: Verifying batch testing...")
        for product in all_products:
            try:
                query = f"{product.get('Brand', '')} {product.get('Name', '')}".strip()
                result = await batch_tester.search_batch_testing(
                    brand_supplement=query,
                    openai_api_key=openai_key,
                    max_tries=2
                )
                product["Batch_tested"] = result.get("Batch_tested")
                product["batch_testing_org"] = result.get("Organisation")
                product["batch_testing_sources"] = result.get("sources", [])
                
                if result.get("Batch_tested") == "Yes":
                    print(f"  ✅ Batch tested: {query} ({result.get('Organisation')})")
            except Exception as e:
                errors.append(f"Batch test failed for {query}: {str(e)}")
                product["Batch_tested"] = "Unknown"
                product["batch_testing_org"] = "Unknown"
        
        # Step 5: Push to staging (if requested)
        inserted_count = 0
        if request.push_to_staging and all_products:
            print("\n💾 Step 5: Pushing to staging table...")
            
            with get_db_connection() as conn:
                inserted_count, inserted_ids, push_errors = await staging_service.insert_products_to_staging(
                    conn=conn,
                    products=all_products,
                    catalog_url=request.catalog_url,
                    scraper_version=request.scraper_version
                )
                errors.extend(push_errors)
            
            print(f"✅ Inserted {inserted_count} product(s)")
        
        # Summary
        print(f"\n{'='*60}")
        print("🎉 PIPELINE COMPLETE")
        print(f"{'='*60}")
        print(f"Products scraped: {len(all_products)}")
        print(f"Inserted to staging: {inserted_count}")
        print(f"Errors: {len(errors)}")
        print(f"{'='*60}\n")
        
        return ScrapeFullResponse(
            success=True,
            catalog_url=request.catalog_url,
            total_products_scraped=len(product_urls),
            total_variants_extracted=len(all_products),
            pushed_to_staging=request.push_to_staging,
            staging_count=inserted_count if request.push_to_staging else None,
            errors=errors,
            summary={
                "urls_found": len(product_urls),
                "variants_extracted": len(all_products),
                "ocr_enriched": sum(1 for p in all_products if p.get("Nutrition_Source") == "OCR"),
                "batch_tested": sum(1 for p in all_products if p.get("Batch_tested") == "Yes"),
                "inserted": inserted_count,
                "failed": len(errors)
            }
        )
        
    except Exception as e:
        print(f"❌ Full scrape failed: {e}")
        raise HTTPException(500, f"Full scraping pipeline failed: {str(e)}")


@router.post("/push-staging", response_model=PushStagingResponse)
async def push_to_staging(request: PushStagingRequest):
    """
    Push scraped products to SSS.Supplement_Staging table.
    
    Args:
        request: PushStagingRequest with products and metadata
        
    Returns:
        PushStagingResponse: Insertion results
    """
    try:
        if not request.products:
            raise HTTPException(400, "No products provided")
        
        print(f"💾 Pushing {len(request.products)} product(s) to staging...")
        
        with get_db_connection() as conn:
            inserted_count, inserted_ids, errors = await staging_service.insert_products_to_staging(
                conn=conn,
                products=request.products,
                catalog_url=request.catalog_url,
                scraper_version=request.scraper_version
            )
        
        return PushStagingResponse(
            success=inserted_count > 0,
            total_products=len(request.products),
            inserted_count=inserted_count,
            failed_count=len(errors),
            inserted_ids=inserted_ids,
            errors=errors
        )
        
    except Exception as e:
        print(f"❌ Push to staging failed: {e}")
        raise HTTPException(500, f"Database insertion failed: {str(e)}")