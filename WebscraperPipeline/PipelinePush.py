import psycopg
from dotenv import load_dotenv
import os
from psycopg.types.json import Json
from PipelineProductScrape import DEFAULT_MINIMUM_UNIT
import math


# load_dotenv("env.txt")
# conn = psycopg.connect(
#     host=os.getenv("PGHOST"),
#     port=os.getenv("PGPORT"),
#     dbname=os.getenv("PGDATABASE"),
#     user=os.getenv("PGUSER"),
#     password=os.getenv("PGPASSWORD"),
#     sslmode=os.getenv("PGSSLMODE", "require"),
# )


def load_packaging_form_lookup(conn) -> dict:
    sql = """
        SELECT
            id,
            LOWER(supplement_packaging_form) AS key
        FROM sss.supplement_packaging_form_lookup;
    """

    with conn.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()

    return {key: id for id, key in rows}

def load_status_lookup(conn) -> dict:
    sql = """
        SELECT
            id,
            LOWER(supplement_status) AS key
        FROM sss.supplement_status_lookup;
    """

    with conn.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()

    return {key: id for id, key in rows}

def load_catalogue_lookup(conn) -> dict:
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



def map_extracted_product_to_staging(
    conn,
    product: dict,
    webscraper_catalog_url: str,
    scraper_version: str,
) -> dict:
    """
    Maps a scraped product dictionary to the SSS.Supplement_Staging table schema.
    
    product: dict returned by scrapeProduct()
    packaging_form_lookup: dict mapping Minimum_Unit to supplement_packaging_form_id
    status_lookup: dict mapping status names to UUIDs
    webscraper_catalog_url_id: UUID of the main catalog page
    source_url: URL of the specific product page
    scraper_version: string identifying scraper version
    """

    packaging_form_lookup = load_packaging_form_lookup(conn)
    status_lookup = load_status_lookup(conn)
    catalog_lookup = load_catalogue_lookup(conn)


    Batch_tested_status_dict = {
        "yes": status_lookup.get("batch tested"),
        "no": status_lookup.get("not batch tested"),
        "unknown": status_lookup.get("not batch tested")
    }

    sources = list(product.get("batch_testing_sources") or [])
    url = product.get("URL")

    if url and url not in sources:
        sources.insert(0, url)

    
    
    return {
        # Lookup IDs
        "supplement_packaging_form_id": packaging_form_lookup.get(
            (product.get("Minimum Unit") or "").lower(),
            packaging_form_lookup.get(
                DEFAULT_MINIMUM_UNIT.lower())
        ),
        "supplement_status_id": Batch_tested_status_dict.get((product.get("Batch_tested") or "unknown").lower()),

        # Input info
        "supplement_input_type": "webscraper",
        "approved_by": None,  # not yet approved

        # Product info
        "supplement_name": product.get("Name"),
        "supplement_brand": product.get("Brand"),
        "supplement_description": product.get("Description"),

        "supplement_ingredient": Json(product.get("Ingredients") or []),
        "nutritional_info_per_100g": (
            Json(product.get("Per 100g"))
            if product.get("Per 100g") is not None
            else None
        ),
        "nutritional_info_per_serving": (
            Json(product.get("Per Serving Size"))
            if product.get("Per Serving Size") is not None
            else None
        ),
        "nutritional_info_per_serving_definition": product.get("Serving Size"),

        "supplement_warning_label": product.get("Warnings"),
        "supplement_certifications": product.get("Certifications"),
        "supplement_additional_information": product.get("Additional Information"),
        "batch_testing_org": product.get("batch_testing_org"),

        # Source info
        "webscraper_catalog_url_id": catalog_lookup.get(webscraper_catalog_url),
        "product_source_url": sources,
        "scraper_version": scraper_version,

        # Vectors (placeholders, generate separately)
        "vector_100g_ingredient": None,
        "vector_perserving_ingredient": None,
    }

INSERT_SUPPLEMENT_STAGING_SQL = """
INSERT INTO sss.supplement_staging (
    supplement_packaging_form_id,
    supplement_status_id,
    supplement_input_type,
    supplement_name,
    supplement_brand,
    supplement_description,
    supplement_ingredient,
    nutritional_info_per_100g,
    nutritional_info_per_serving,
    nutritional_info_per_serving_definition,
    supplement_warning_label,
    supplement_certifications,
    supplement_additional_information,
    batch_testing_org,
    webscraper_catalog_url_id,
    product_source_url,
    scraper_version
)
VALUES (
    %(supplement_packaging_form_id)s,
    %(supplement_status_id)s,
    %(supplement_input_type)s,
    %(supplement_name)s,
    %(supplement_brand)s,
    %(supplement_description)s,
    %(supplement_ingredient)s,
    %(nutritional_info_per_100g)s,
    %(nutritional_info_per_serving)s,
    %(nutritional_info_per_serving_definition)s,
    %(supplement_warning_label)s,
    %(supplement_certifications)s,
    %(supplement_additional_information)s,
    %(batch_testing_org)s,
    %(webscraper_catalog_url_id)s,
    %(product_source_url)s,
    %(scraper_version)s
)
RETURNING id;
"""

def insert_product(conn, mapped_product: dict) -> str:
    validate_mapped_product(mapped_product)

    try:
        with conn.cursor() as cur:
            cur.execute(INSERT_SUPPLEMENT_STAGING_SQL, mapped_product)
            new_id = cur.fetchone()[0]
        conn.commit()
        return new_id

    except Exception as e:
        conn.rollback()
        raise

def insert_products_many(conn, mapped_products: list[dict]) -> None:
    for i, p in enumerate(mapped_products):
        try:
            validate_mapped_product(p)

            with conn.cursor() as cur:
                cur.execute(INSERT_SUPPLEMENT_STAGING_SQL, p)

            conn.commit()

        except Exception as e:
            conn.rollback()
            print(f"❌ Insert failed for product {i}: {e}")


def validate_mapped_product(p: dict):
    required = [
        "supplement_packaging_form_id",
        "supplement_status_id",
        "supplement_name",
        "supplement_brand",
    ]

    missing = [k for k in required if p.get(k) is None]
    if missing:
        raise ValueError(f"Missing required fields: {missing}")
    

def sanitize_json(obj):
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj

    if isinstance(obj, dict):
        return {k: sanitize_json(v) for k, v in obj.items()}

    if isinstance(obj, list):
        return [sanitize_json(v) for v in obj]

    return obj
    
def mapAndInsertMany(conn,products):
    mapped_products = [
    map_extracted_product_to_staging(conn,product,"https://www.healthspanelite.co.uk/protein/","0.5")
    for product in products
    ]
    sanitized_products = sanitize_json(mapped_products)
    insert_products_many(conn,sanitized_products)