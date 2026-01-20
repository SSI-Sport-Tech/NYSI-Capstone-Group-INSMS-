import PipelineListScrape
import PipelineProductScrape
import PipelineSearch
import json
from datetime import datetime
from pathlib import Path

openai_key = "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"

websites_to_scrape = [
    {"url": "https://www.etixxsports.com/nl-be/collections/all"},
    {"url": "https://appliednutrition.uk/collections/best-sellers"},
    {"url": "https://www.healthspanelite.co.uk/protein/"},
    {"url": "https://www.healthspanelite.co.uk/sports-nutrition/"},
    {"url": "https://www.healthspanelite.co.uk/vitamins-and-supplements/"}
]

websites_to_scrape = [
    {"url":  "https://www.healthspanelite.co.uk/sports-nutrition/"}
]

def scrapeAllWebsites(websites_list, openai_key):
    all_products = []

    for website in websites_list:
        products = listFullScrape(website["url"], openai_key)
        all_products.extend(products)

        print(f"Total products scraped so far: {len(all_products)}")

    return all_products

def listFullScrape(list_url, openai_key):
    print(f"Scraping website: {list_url}")

    all_products = []

    product_urls = PipelineListScrape.scrape_all_pages(
        list_url,
        openai_key
    )

    if isinstance(product_urls, dict) and "items" in product_urls:
        product_urls = product_urls["items"]

    print(f"Found {len(product_urls)} product URLs")

    for product_url in product_urls:
        try:
            products = productFullScrape(product_url, openai_key)

            if products:
                all_products.extend(products)

        except Exception as e:
            print(f"Product scrape failed for {product_url}: {e}")

    return all_products


def productFullScrape(product_url,openai_key):
    products = PipelineProductScrape.scrapeProduct(product_url,openai_key)
    output = []

    if not products:
        return []

    if isinstance(products, dict):
        products = products["items"]

    for product in products:
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
            print(f"Batch test failed for {query}: {e}")
        output.append(product)
    print(output)
    return output

def save_as_json(data, filename=None, folder="output"):
    Path(folder).mkdir(exist_ok=True)

    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"scraped_products_{timestamp}.json"

    filepath = Path(folder) / filename

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(data)} products to {filepath}")

# results = scrapeAllWebsites(websites_to_scrape,openai_key)
# save_as_json(results)
    