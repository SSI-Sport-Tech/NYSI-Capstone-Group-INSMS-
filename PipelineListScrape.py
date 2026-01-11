import requests
from scrapegraphai import graphs
import json
from pydantic import BaseModel
from typing import Union, List, Dict



openai_key = "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"

gpt4o = {
   "llm": {
      "api_key": openai_key,
      "model": "openai/gpt-4o",
   },
}

product_list_prompt = """
        List me all the product information links on this page to pass to python requests. 
        Each link must be a full absolute URL (including the https:// prefix and domain name), not a relative path.
        Do not include any links that are not for specific products.
        Do not include links for non-nutritional products like clothing or accessories
        Format as a list of links, not a string
        Also indicate whether there is a next page after the current page with more products for this list accessible with ?page=x.
        Example output if there is a next page:
        {
            "URLs": [
            "https://example.com/products/product-a",
            "https://example.com/products/product-b",
            "https://example.com/products/product-c",
            "https://example.com/products/product-d",
            "https://example.com/products/product-e",
            "https://example.com/products/product-f"
            ],
            "Has_next_page": True
        }

        Example output if it is not paginated or this is the final page
        {
            "URLs": [
            "https://example.com/products/product-a",
            "https://example.com/products/product-b",
            "https://example.com/products/product-c",
            "https://example.com/products/product-d",
            "https://example.com/products/product-e",
            "https://example.com/products/product-f"
            ],
            "Has_next_page": False
        }
        """
        
class ProductListSchema(BaseModel):
    URLs: List[str]
    Has_next_page: bool

def scrape_all_pages(base_url, max_pages=None):
    """Scrape all pages with pagination"""
    all_products = []
    page = 1

    while True:
        # Hard stop if max_pages is specified
        if max_pages is not None and page > max_pages:
            print("Reached max_pages limit.")
            break

        url = f"{base_url}?page={page}"

        try:
            print(f"Scraping page {page}: {url}")
            response = requests.get(url, timeout=10)
            response.raise_for_status()

            smart_scraper_graph_gpt4o = graphs.SmartScraperGraph(
                prompt=product_list_prompt,
                source=response.text,
                config=gpt4o,
                schema=ProductListSchema
            )

            result_gpt4o = smart_scraper_graph_gpt4o.run()

            # Normalize output
            if "content" in result_gpt4o:
                page_data = result_gpt4o["content"][0]
            else:
                page_data = result_gpt4o

            products = page_data.get("URLs", [])

            if not products:
                print(f"No products found on page {page}. Stopping.")
                break

            all_products.extend(products)
            print(f"Found {len(products)} products on page {page}")

            # Only use pagination signal when max_pages is None
            if max_pages is None:
                has_next = page_data.get("Has_next_page", False)
                if not has_next:
                    print("No next page found. Pagination complete.")
                    break

            page += 1

        except requests.exceptions.RequestException as e:
            print(f"Error scraping page {page}: {e}")
            break

    print(f"Total products scraped: {len(all_products)}")
    return all_products


# scrape_all_pages("https://www.etixxsports.com/nl-be/collections/all",3)
# scrape_all_pages("https://www.healthspanelite.co.uk/sports-nutrition/",1)