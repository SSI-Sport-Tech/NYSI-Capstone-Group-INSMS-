from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

from app.services import list_scraper, product_scraper, ocr_enricher, certification_searcher, staging_service
from app.utils.database import get_db_connection

load_dotenv()

scheduler = AsyncIOScheduler()

# ── Scheduler config DB helpers ───────────────────────────────────────────────

def get_config_from_db() -> dict:
    """Read scheduler config from DB. Falls back to defaults if table missing."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT is_enabled, interval_days, is_running,
                           last_run_at, next_run_at, updated_at
                    FROM sss.scraper_schedule_config
                    LIMIT 1
                """)
                row = cur.fetchone()
                if row:
                    return {
                        "is_enabled": row[0],
                        "interval_days": row[1],
                        "is_running": row[2],
                        "last_run_at": row[3],
                        "next_run_at": row[4],
                        "updated_at": row[5],
                    }
    except Exception as e:
        print(f"⚠️ Could not read scheduler config from DB: {e}")
    return {"is_enabled": True, "interval_days": 14, "is_running": False,
            "last_run_at": None, "next_run_at": None, "updated_at": None}


def update_run_timestamps_in_db(last_run_at: datetime, next_run_at):
    """Write last_run_at and next_run_at to DB after a run completes."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE sss.scraper_schedule_config
                    SET last_run_at = %s, next_run_at = %s,
                        is_running = false, updated_at = now()
                """, (last_run_at, next_run_at))
            conn.commit()
    except Exception as e:
        print(f"⚠️ Could not update run timestamps in DB: {e}")


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


def load_catalog_urls():
    try:
        catalog_urls = list(getWebsitesToScrape())
        print(f"Loaded {len(catalog_urls)} catalog URLs for scheduler")
        return catalog_urls
    except Exception as e:
        print(f"⚠️ Could not load catalog URLs at startup: {e}")
        return []

async def run_full_scrape_job():
    """Scheduled job: runs the full scraping pipeline for all catalog URLs."""

    catalog_urls = load_catalog_urls()
    if not catalog_urls:
        print("⚠️ Scheduler: No catalog URLs available — skipping run")
        return

    print(f"\n{'='*60}")
    print(f"⏰ SCHEDULED SCRAPE STARTED: {datetime.now().isoformat()}")
    print(f"{'='*60}\n")

    for catalog_url in catalog_urls:
        try:
            errors = []

            # Step 1: Scrape list
            print(f"📋 Scraping list: {catalog_url}")
            product_urls = await list_scraper.scrape_product_list(
                list_url=catalog_url,
                max_pages=None
            )
            print(f"  ✅ Found {len(product_urls)} URLs")

            # Step 2: Scrape products
            all_products, scrape_errors = await product_scraper.scrape_multiple_products(
                product_urls=product_urls,
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

    finished_at = datetime.now()
    print(f"\n⏰ SCHEDULED SCRAPE FINISHED: {finished_at.isoformat()}\n")

    # Write timestamps back to DB
    job = scheduler.get_job("full_scrape")
    next_run = job.next_run_time if job else None
    update_run_timestamps_in_db(finished_at, next_run)


def start_scheduler():
    config = get_config_from_db()
    interval_days = config.get("interval_days", 14)
    is_enabled = config.get("is_enabled", True)

    scheduler.add_job(
        run_full_scrape_job,
        trigger=IntervalTrigger(days=interval_days),
        id="full_scrape",
        name=f"Full catalog scrape every {interval_days} days",
        replace_existing=True,
        misfire_grace_time=3600  # allow 1hr late start if server was down
    )
    scheduler.start()

    if not is_enabled:
        scheduler.pause_job("full_scrape")
        print(f"✅ Scheduler started (PAUSED) — interval: {interval_days} days")
    else:
        print(f"✅ Scheduler started — full scrape every {interval_days} days")


def stop_scheduler():
    scheduler.shutdown()
