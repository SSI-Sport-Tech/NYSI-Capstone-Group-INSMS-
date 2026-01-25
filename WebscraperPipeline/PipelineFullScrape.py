import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

import PipelineListScrape
import PipelineProductScrape
import PipelineSearch
import PipelinePush
import PipelineOCR
import json
from datetime import datetime
from pathlib import Path
import psycopg
import os
from dotenv import load_dotenv
load_dotenv("env.txt")

openai_key = os.getenv("OPENAI_API_KEY")

conn = psycopg.connect(
    host=os.getenv("PGHOST"),
    port=os.getenv("PGPORT"),
    dbname=os.getenv("PGDATABASE"),
    user=os.getenv("PGUSER"),
    password=os.getenv("PGPASSWORD"),
    sslmode=os.getenv("PGSSLMODE", "require"),
)

# websites_to_scrape = [
#     {"url": "https://www.etixxsports.com/en-be/collections/all"},
#     {"url": "https://appliednutrition.uk/collections/best-sellers"},
#     {"url": "https://www.healthspanelite.co.uk/protein/"},
#     {"url": "https://www.healthspanelite.co.uk/sports-nutrition/"},
#     {"url": "https://www.healthspanelite.co.uk/vitamins-and-supplements/"}
# ]

# websites_to_scrape = [
#     {"url":  "https://www.healthspanelite.co.uk/sports-nutrition/"}
# ]

def getWebsitesToScrape(conn):
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


def scrapeAllWebsitesAndPush(openai_key):
    all_products = []
    all_errors = []


    websites_list = list(getWebsitesToScrape(conn))
    websites_list = ["https://appliednutrition.uk/collections/pre-workout"]

    for website in websites_list:
        products,errors = listFullScrapeAndPush(website, openai_key)
        all_products.extend(products)
        all_errors.extend(errors)

        print(f"Total products scraped so far: {len(all_products)}")

    print(all_errors)
    return all_products,all_errors

def listFullScrapeAndPush(list_url, openai_key):
    print(f"Scraping website: {list_url}")

    all_products = []
    all_errors = []

    product_urls = PipelineListScrape.scrape_all_pages(
        list_url,
        openai_key
    )

    if isinstance(product_urls, dict) and "items" in product_urls:
        product_urls = product_urls["items"]

    print(f"Found {len(product_urls)} product URLs")

    for product_url in product_urls:
        try:
            products,errors = productFullScrape(product_url, openai_key)
            all_errors.extend(errors)

            if products:
                all_products.extend(products)
                try:
                    PipelinePush.mapAndInsertMany(conn,products)
                except Exception as e:
                    error = f"Data push failed for {product_url}: {e}"
                    all_errors.append(error)
            
        except Exception as e:
            error = f"Product scrape failed for {product_url}: {e}"
            all_errors.append(error)

    return all_products,all_errors


def productFullScrape(product_url,openai_key):
    products = PipelineProductScrape.scrapeProduct(product_url,openai_key)
    output = []
    errors = []

    if not products:
        return [],[]

    for product in products:
        if "Rejected" in product:
            continue
        try:
            enriched = PipelineOCR.enrich_product_with_ocr(product)
            if enriched:
                print(f"OCR enriched: {product.get('Name')}")
        except Exception as e:
            errors.append(f"OCR failed for {product.get('Name')}: {e}")

        query = f"{product.get('Name','')} {product.get('Brand','')}".strip()
        try:

            batchtesting = PipelineSearch.batchTestSearch(
                query,
                openai_key,
                2
            )
            product["Batch_tested"] = batchtesting.get("Batch_tested")
            product["batch_testing_org"] = batchtesting.get("Organisation")
            product["batch_testing_sources"] = batchtesting.get("sources")   

        except Exception as e:
            product["Batch_tested"] = None
            product["batch_testing_org"] = None
            product["batch_testing_sources"] = []
            errors.append(f"Batch test failed for {query}: {e}")
        output.append(product)
    print(f"Scraped {len(output)} variants from {product_url}")
    return output,errors

def save_as_json(data, filename=None, folder="output"):
    Path(folder).mkdir(exist_ok=True)

    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"scraped_products_{timestamp}.json"

    filepath = Path(folder) / filename

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(data)} products to {filepath}")


results,errors = scrapeAllWebsitesAndPush(openai_key)
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

save_as_json(results)
save_as_json(errors,f"scraping_errors_{timestamp}.json")