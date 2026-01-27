import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

import PipelineProductScrape
import PipelineOCR
import os
from dotenv import load_dotenv

load_dotenv("env.txt")
openai_key = os.getenv("OPENAI_API_KEY")
output = []
errors = []

products = PipelineProductScrape.scrapeProduct("https://www.etixxsports.com/en-be/products/endurance-tasting-pack?variant=53111029989722",openai_key)
for product in products:
    enriched = PipelineOCR.enrich_product_with_ocr(product)
    if enriched:
        print(f"OCR enriched: {product.get('Name')}")
    output.append(product)

print(output)
print(errors)