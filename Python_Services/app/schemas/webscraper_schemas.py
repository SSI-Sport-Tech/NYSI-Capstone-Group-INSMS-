"""
Pydantic schemas for webscraper API requests and responses.
"""

from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any, Literal


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class ScrapeListRequest(BaseModel):
    """Request to scrape a product listing page."""
    list_url: str = Field(
        ...,
        description="URL of the product listing page",
        examples=["https://appliednutrition.uk/collections/best-sellers"]
    )
    max_pages: Optional[int] = Field(
        None,
        description="Maximum pages to scrape (None = all pages)",
        ge=1
    )


class ScrapeProductRequest(BaseModel):
    """Request to scrape a single product page."""
    product_url: str = Field(
        ...,
        description="URL of the product detail page",
        examples=["https://appliednutrition.uk/products/abe-all-black-everything-375g"]
    )
    enrich_with_ocr: bool = Field(
        default=True,
        description="Whether to enrich with OCR if nutritional image found"
    )
    verify_batch_testing: bool = Field(
        default=True,
        description="Whether to search for batch testing certification"
    )


class ScrapeFullRequest(BaseModel):
    """Request to run full scraping pipeline (list → products → enrichment)."""
    catalog_url: str = Field(
        ...,
        description="URL of the product catalog/listing page",
        examples=["https://appliednutrition.uk/collections/pre-workout"]
    )
    max_products: Optional[int] = Field(
        None,
        description="Maximum products to scrape (None = all)",
        ge=1
    )
    push_to_staging: bool = Field(
        default=True,
        description="Whether to automatically push results to staging table"
    )
    scraper_version: str = Field(
        default="0.7",
        description="Scraper version identifier"
    )


class PushStagingRequest(BaseModel):
    """Request to push scraped products to staging table."""
    products: List[Dict[str, Any]] = Field(
        ...,
        description="List of scraped product dictionaries"
    )
    catalog_url: str = Field(
        ...,
        description="Source catalog URL for tracking"
    )
    scraper_version: str = Field(
        default="0.7",
        description="Scraper version identifier"
    )


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class ProductURL(BaseModel):
    """Single product URL from list scraping."""
    url: str
    index: int = Field(..., description="Position in the list")


class ScrapeListResponse(BaseModel):
    """Response from scraping a product listing page."""
    success: bool
    catalog_url: str
    product_urls: List[str]
    total_products: int
    pages_scraped: int
    errors: Optional[List[str]] = None


class BatchTestingResult(BaseModel):
    """Batch testing certification search result."""
    batch_tested: Literal["Yes", "No", "Unknown"]
    organisation: Optional[str] = None
    sources: List[str] = Field(default_factory=list)


class ScrapedProduct(BaseModel):
    """Scraped product data (before database mapping)."""
    name: str = Field(..., alias="Name")
    brand: str = Field(..., alias="Brand")
    minimum_unit: str = Field(..., alias="Minimum Unit")
    description: Optional[str] = Field(None, alias="Description")
    ingredients: Optional[List[str]] = Field(None, alias="Ingredients")
    per_100g: Optional[Dict[str, float]] = Field(None, alias="Per 100g")
    per_serving_size: Optional[Dict[str, float]] = Field(None, alias="Per Serving Size")
    serving_size: Optional[str] = Field(None, alias="Serving Size")
    warnings: Optional[str] = Field(None, alias="Warnings")
    certifications: Optional[str] = Field(None, alias="Certifications")
    additional_information: Optional[str] = Field(None, alias="Additional Information")
    nutritional_information_image: Optional[str] = Field(
        None, 
        alias="Nutritional Information Image"
    )
    url: str = Field(..., alias="URL")
    
    # Batch testing (added by PipelineSearch)
    batch_tested: Optional[bool] = Field(None, alias="Batch_tested")
    batch_testing_org: Optional[str] = None
    batch_testing_sources: List[str] = Field(default_factory=list)
    
    # OCR enrichment flag
    nutrition_source: Optional[Literal["OCR", "Scraped"]] = Field(
        None, 
        alias="Nutrition_Source"
    )

    class Config:
        populate_by_name = True


class ScrapeProductResponse(BaseModel):
    """Response from scraping a single product page."""
    success: bool
    product_url: str
    products: List[ScrapedProduct]  # Multiple variants possible
    total_variants: int
    errors: Optional[List[str]] = None


class ScrapeFullResponse(BaseModel):
    """Response from full scraping pipeline."""
    success: bool
    catalog_url: str
    total_products_scraped: int
    total_variants_extracted: int
    pushed_to_staging: bool
    staging_count: Optional[int] = None
    errors: List[str] = Field(default_factory=list)
    summary: Dict[str, Any]


class PushStagingResponse(BaseModel):
    """Response from pushing products to staging table."""
    success: bool
    total_products: int
    inserted_count: int
    failed_count: int
    inserted_ids: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)


class WebscraperHealthResponse(BaseModel):
    """Health check response for webscraper service."""
    status: str
    selenium_available: bool
    scrapegraphai_available: bool
    database_connected: bool
    ocr_available: bool


# ============================================================================
# DATABASE MAPPING SCHEMA
# ============================================================================

class StagingProductSchema(BaseModel):
    """
    Schema for product ready to insert into SSS.Supplement_Staging.
    Matches database column names exactly.
    """
    # Lookup IDs
    supplement_packaging_form_id: str
    supplement_status_id: str
    
    # Input info
    supplement_input_type: Literal["webscraper"] = "webscraper"
    approved_by: Optional[str] = None
    
    # Product info
    supplement_name: str
    supplement_brand: str
    supplement_description: Optional[str] = None
    
    # JSONB columns
    supplement_ingredient: List[str]
    nutritional_info_per_100g: Optional[Dict[str, Any]] = None
    nutritional_info_per_serving: Optional[Dict[str, Any]] = None
    nutritional_info_per_serving_definition: Optional[str] = None
    
    # Text fields
    supplement_warning_label: Optional[str] = None
    supplement_certifications: Optional[str] = None
    supplement_additional_information: Optional[str] = None
    batch_testing_org: Optional[str] = None
    
    # Source info
    webscraper_catalog_url_id: str
    product_source_url: List[str]
    scraper_version: str
    
    # Vectors (generated separately)
    vector_100g_ingredient: Optional[List[float]] = None
    vector_perserving_ingredient: Optional[List[float]] = None
    
    # Review status
    is_reviewed: bool = False