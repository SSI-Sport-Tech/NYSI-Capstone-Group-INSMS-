import PipelineListScrape
import PipelineProductScrape
import PipelineSearch
import json
from datetime import datetime
from pathlib import Path

openai_key = "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"

websites_to_scrape = [
    {"url": "https://www.etixxsports.com/nl-be/collections/all", "pages": 3},
    {"url": "https://appliednutrition.uk/collections/best-sellers", "pages": None},
    {"url": "https://www.healthspanelite.co.uk/protein/", "pages": None},
    {"url": "https://www.healthspanelite.co.uk/sports-nutrition/", "pages": None},
    {"url": "https://www.healthspanelite.co.uk/vitamins-and-supplements/", "pages": None}
]

websites_to_scrape = [
    {"url": "https://www.healthspanelite.co.uk/protein/", "pages": 1},
    {"url": "https://www.healthspanelite.co.uk/sports-nutrition/", "pages": 1}
]

def scrapeAllWebsites(websites_list):
    all_products = []

    for website in websites_list:
        print(f"Scraping website: {website['url']}")

        product_urls = PipelineListScrape.scrape_all_pages(
            website["url"],
            website["pages"]
        )

        print(f"Found {len(product_urls)} product URLs")

        for product_url in product_urls:
            try:
                products = PipelineProductScrape.scrapeProduct(product_url)

                if not products:
                    continue

                if isinstance(products, dict):
                    products = [products]

                for product in products:
                    try:
                        query = f"{product.get('Brand','')} {product.get('Name','')}".strip()

                        batchtesting = PipelineSearch.batchTestSearch(
                            query,
                            openai_key=openai_key
                        )

                        product["Batch_tested"] = batchtesting.get("Batch tested")
                        product["batch_testing_org"] = batchtesting.get("Organisation")
                        product["batch_testing_sources"] = batchtesting.get("sources")

                        all_products.append(product)

                    except Exception as e:
                        print(f"Batch test failed for {product_url}: {e}")

            except Exception as e:
                print(f"Product scrape failed for {product_url}: {e}")

        print(f"Total products scraped so far: {len(all_products)}")

    return all_products

def save_as_json(data, filename=None, folder="output"):
    Path(folder).mkdir(exist_ok=True)

    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"scraped_products_{timestamp}.json"

    filepath = Path(folder) / filename

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(data)} products to {filepath}")

results = scrapeAllWebsites(websites_to_scrape)
save_as_json(results)
    