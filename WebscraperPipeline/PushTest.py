import PipelinePush
import PipelineProductScrape
import PipelineFullScrape
import psycopg
import os
from dotenv import load_dotenv


openai_key = os.getenv("OPENAI_API_KEY")

load_dotenv("env.txt")
conn = psycopg.connect(
    host=os.getenv("PGHOST"),
    port=os.getenv("PGPORT"),
    dbname=os.getenv("PGDATABASE"),
    user=os.getenv("PGUSER"),
    password=os.getenv("PGPASSWORD"),
    sslmode=os.getenv("PGSSLMODE", "require"),
)

products = PipelineFullScrape.productFullScrape("https://www.healthspanelite.co.uk/elite-all-blacks-ultimate-whey-protein-blend-chocolate/",openai_key)
mapped_products = [
    PipelinePush.map_extracted_product_to_staging(conn,product,"https://www.healthspanelite.co.uk/protein/","0.5")
    for product in products
]
print(mapped_products)

PipelinePush.insert_products_many(conn,mapped_products)