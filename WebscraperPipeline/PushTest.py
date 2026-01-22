import PipelinePush
import PipelineProductScrape
import PipelineFullScrape
import psycopg
import os


openai_key = "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"

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