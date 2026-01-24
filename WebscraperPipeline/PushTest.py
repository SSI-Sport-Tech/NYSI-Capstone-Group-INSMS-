import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

import PipelinePush
import PipelineProductScrape
import PipelineFullScrape
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

products,errors = PipelineFullScrape.productFullScrape("https://appliednutrition.uk/products/abe-all-black-everything-375g",openai_key)
mapped_products = [
    PipelinePush.map_extracted_product_to_staging(conn,product,"https://appliednutrition.uk/collections/best-sellers","0.6")
    for product in products
]

PipelinePush.insert_products_many(conn,mapped_products)
print(errors)