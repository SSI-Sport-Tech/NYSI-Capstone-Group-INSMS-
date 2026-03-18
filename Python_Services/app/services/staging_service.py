"""
Database staging service for inserting scraped products.
Handles mapping from scraped format to SSS.Supplement_Staging schema.
"""

import math
from typing import Dict, List
from psycopg.types.json import Json
import psycopg


# Default packaging unit if not specified
DEFAULT_MINIMUM_UNIT = "Pack"


def load_packaging_form_lookup(conn) -> dict:
    """Load packaging form ID mappings from database."""
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
    """Load supplement status ID mappings from database."""
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
    """Load webscraper catalog URL ID mappings from database."""
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


def map_product_to_staging(
    conn,
    product: dict,
    catalog_url: str,
    scraper_version: str,
) -> dict:
    """
    Map scraped product to SSS.Supplement_Staging schema.
    
    Args:
        conn: Database connection
        product: Scraped product dictionary
        catalog_url: Source catalog URL
        scraper_version: Scraper version identifier
        
    Returns:
        dict: Mapped product ready for database insertion
    """
    # Load lookup tables
    packaging_lookup = load_packaging_form_lookup(conn)
    status_lookup = load_status_lookup(conn)
    catalog_lookup = load_catalogue_lookup(conn)
    
    # Map batch testing status
    batch_status_map = {
        True: status_lookup.get("batch tested"),
        False: status_lookup.get("not batch tested"),
        None: status_lookup.get("not batch tested"),  # or "unknown" if you have it
    }
    
    # Collect all source URLs
    sources = list(product.get("batch_testing_sources") or [])
    url = product.get("URL")
    if url and url not in sources:
        sources.insert(0, url)
    
    return {
        # Lookup IDs
        "supplement_packaging_form_id": packaging_lookup.get(
            (product.get("Minimum Unit") or "").lower(),
            packaging_lookup.get(DEFAULT_MINIMUM_UNIT.lower())
        ),
        "supplement_status_id":batch_status_map.get(
            product.get("Batch_tested"),
            status_lookup.get("not batch tested")
        ),
        
        # Input info
        "supplement_input_type": "webscraper",
        "approved_by": None,  # Not yet approved
        
        # Product info
        "supplement_name": product.get("Name"),
        "supplement_brand": product.get("Brand"),
        "supplement_description": product.get("Description"),
        
        # JSONB columns
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
        
        # Text fields
        "supplement_warning_label": product.get("Warnings"),
        "supplement_certifications": product.get("Certifications"),
        "supplement_additional_information": product.get("Additional Information"),
        "batch_testing_org": product.get("batch_testing_org"),
        "batch_testing_org_url": (product.get("batch_testing_sources") or [None])[0],

        # Source info
        "webscraper_catalog_url_id": catalog_lookup.get(catalog_url.lower()),
        "product_source_url": sources,
        "scraper_version": scraper_version,
        
        # Vectors (to be generated separately)
        "vector_100g_ingredient": None,
        "vector_perserving_ingredient": None,
        
        # Review status
        "is_reviewed": False,
    }


INSERT_STAGING_SQL = """
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
    batch_testing_org_url,
    webscraper_catalog_url_id,
    product_source_url,
    scraper_version,
    is_reviewed
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
    %(batch_testing_org_url)s,
    %(webscraper_catalog_url_id)s,
    %(product_source_url)s,
    %(scraper_version)s,
    %(is_reviewed)s
)
RETURNING id;
"""


def sanitize_json(obj):
    """Remove NaN and Infinity values from JSON data."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    
    if isinstance(obj, dict):
        return {k: sanitize_json(v) for k, v in obj.items()}
    
    if isinstance(obj, list):
        return [sanitize_json(v) for v in obj]
    
    return obj


async def insert_products_to_staging(
    conn,
    products: List[Dict],
    catalog_url: str,
    scraper_version: str
) -> tuple[int, List[str], List[str]]:
    """
    Insert multiple products into staging table.
    
    Args:
        conn: Database connection
        products: List of scraped products
        catalog_url: Source catalog URL
        scraper_version: Scraper version
        
    Returns:
        tuple: (inserted_count, inserted_ids, errors)
    """
    inserted_ids = []
    errors = []
    
    for i, product in enumerate(products):
        try:
            # Map to staging schema
            mapped = map_product_to_staging(
                conn,
                product,
                catalog_url,
                scraper_version
            )
            
            # Sanitize JSON
            mapped = sanitize_json(mapped)
            
            # Validate required fields
            required = [
                "supplement_packaging_form_id",
                "supplement_status_id",
                "supplement_name",
                "supplement_brand"
            ]
            missing = [k for k in required if mapped.get(k) is None]
            if missing:
                raise ValueError(f"Missing required fields: {missing}")
            
            # Insert
            with conn.cursor() as cur:
                cur.execute(INSERT_STAGING_SQL, mapped)
                new_id = cur.fetchone()[0]
                inserted_ids.append(str(new_id))
            
            conn.commit()
            print(f"✅ Inserted: {mapped['supplement_name']}")
            
        except Exception as e:
            conn.rollback()
            error_msg = f"Insert failed for product {i}: {str(e)}"
            errors.append(error_msg)
            print(f"❌ {error_msg}")
    
    return len(inserted_ids), inserted_ids, errors