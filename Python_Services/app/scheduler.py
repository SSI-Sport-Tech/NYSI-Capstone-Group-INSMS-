from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

from app.services import list_scraper, product_scraper, ocr_enricher, certification_searcher, staging_service
from app.utils.database import get_db_connection

load_dotenv()

scheduler = AsyncIOScheduler()

# ── Configure your catalog URLs here ──────────────────────────────────────────



def getWebsitesToScrape():
    with get_db_connection() as conn:
        sql = """
            SELECT
                id,
                LOWER(product_catalog_website) AS key
            FROM sss.webscraper_catalog_url;
        """

        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()

        return {key: id for id, key in rows}
    
CATALOG_URLS = list(getWebsitesToScrape())
print(CATALOG_URLS)

async def run_full_scrape_job():
    """Scheduled job: runs the full scraping pipeline for all catalog URLs."""
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        print("❌ Scheduler: OPENAI_API_KEY not set — skipping run")
        return

    print(f"\n{'='*60}")
    print(f"⏰ SCHEDULED SCRAPE STARTED: {datetime.now().isoformat()}")
    print(f"{'='*60}\n")

    for catalog_url in CATALOG_URLS:
        try:
            errors = []

            # Step 1: Scrape list
            print(f"📋 Scraping list: {catalog_url}")
            product_urls = await list_scraper.scrape_product_list(
                list_url=catalog_url,
                openai_api_key=openai_key,
                max_pages=None
            )
            print(f"  ✅ Found {len(product_urls)} URLs")

            # Step 2: Scrape products
            all_products, scrape_errors = await product_scraper.scrape_multiple_products(
                product_urls=product_urls,
                openai_api_key=openai_key
            )
            errors.extend(scrape_errors)

            # Step 3: OCR enrichment
            for product in all_products:
                try:
                    await ocr_enricher.enrich_product_with_ocr(product)
                except Exception as e:
                    errors.append(f"OCR failed: {e}")

            # Step 4: Batch testing
            for product in all_products:
                try:
                    results = await certification_searcher.search_all_certifications(
                        brand=product.get("Brand", ""),
                        product_name=product.get("Name", "")
                    )
                    summary = certification_searcher.build_verification_summary(results)
                    product["Batch_tested"] = summary["is_verified"]
                    product["batch_testing_org"] = ", ".join(summary["found_websites"])
                    product["batch_testing_sources"] = summary["quick_links"]
                except Exception as e:
                    errors.append(f"Batch test failed: {e}")
                    product["Batch_tested"] = False
                    product["batch_testing_org"] = "Unknown"

            # Step 5: Push to staging
            with get_db_connection() as conn:
                inserted_count, inserted_ids, push_errors = await staging_service.insert_products_to_staging(
                    conn=conn,
                    products=all_products,
                    catalog_url=catalog_url,
                    scraper_version="1.0"
                )
                errors.extend(push_errors)

            print(f"  ✅ Inserted {inserted_count} variants | Errors: {len(errors)}")

        except Exception as e:
            print(f"  ❌ Failed for {catalog_url}: {e}")

    print(f"\n⏰ SCHEDULED SCRAPE FINISHED: {datetime.now().isoformat()}\n")


def start_scheduler():
    scheduler.add_job(
        run_full_scrape_job,
        trigger=IntervalTrigger(weeks=2),
        id="full_scrape",
        name="Bi-weekly full catalog scrape",
        replace_existing=True,
        misfire_grace_time=3600  # allow 1hr late start if server was down
    )
    scheduler.start()
    print("✅ Scheduler started — full scrape every 2 weeks")


def stop_scheduler():
    scheduler.shutdown()