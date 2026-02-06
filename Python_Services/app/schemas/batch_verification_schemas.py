"""
Pydantic schemas for batch verification API.
Supports:
1. Brand/product verification
2. Batch ID verification
3. Combined batch ID + brand verification
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal


# ============================================================================
# SUPPLEMENT IDENTIFICATION
# ============================================================================

class SupplementIdentification(BaseModel):
    """Schema for supplement identification (from OCR or manual input)."""
    supplement_name: str = Field(..., description="Product name")
    supplement_brand: str = Field(..., description="Brand name")
    variant: Optional[str] = Field(None, description="Flavor/variant if detected")


# ============================================================================
# BATCH ID EXTRACTION
# ============================================================================

class BatchIDExtraction(BaseModel):
    """Schema for batch ID extraction result from OCR."""
    batch_id: Optional[str] = Field(None, description="Extracted batch/lot ID")
    batch_id_type: Optional[str] = Field(
        None, 
        description="Type of ID: 'batch', 'lot', 'certification', 'unknown'"
    )
    confidence: str = Field("low", description="Confidence: 'high', 'medium', 'low'")
    raw_match: Optional[str] = Field(None, description="Exact text matched from OCR")
    possible_alternatives: List[str] = Field(
        default_factory=list, 
        description="Other potential batch IDs found in text"
    )
    ocr_text: Optional[str] = Field(None, description="Full OCR text (for debugging)")


# ============================================================================
# CERTIFICATION RESULTS
# ============================================================================

class CertificationResult(BaseModel):
    """Result from a single certification database search."""
    organisation: str = Field(..., description="Certification organization name")
    found: bool = Field(..., description="Whether supplement was found in database")
    batch_tested: bool = Field(False, description="Whether it's confirmed batch tested")
    
    # Batch ID specific fields
    batch_id_verified: Optional[bool] = Field(
        None, 
        description="Whether the specific batch ID was verified"
    )
    batch_id_searched: Optional[str] = Field(
        None, 
        description="The batch ID that was searched"
    )
    matched_batch_id: Optional[str] = Field(
        None, 
        description="Batch ID as displayed on the certification site"
    )
    
    # URL fields
    product_url: Optional[str] = Field(
        None, 
        description="Direct URL to product on certification site"
    )
    search_url: Optional[str] = Field(
        None, 
        description="Search URL used"
    )
    
    # Match details
    confidence: Optional[Literal["high", "medium", "low"]] = Field(
        None,
        description="Confidence level of the match"
    )
    matched_product_name: Optional[str] = Field(
        None, 
        description="Product name as shown on cert site"
    )
    search_term_used: Optional[str] = Field(
        None, 
        description="Search term that found the match"
    )
    search_terms_tried: Optional[List[str]] = Field(
        None,
        description="All search terms that were tried"
    )
    
    # Metadata
    database_description: Optional[str] = Field(
        None, 
        description="Description of the certification database"
    )
    note: Optional[str] = Field(
        None,
        description="Additional notes about the search"
    )
    error: Optional[str] = Field(
        None,
        description="Error message if search failed"
    )


# ============================================================================
# API REQUEST SCHEMAS
# ============================================================================

class BatchVerificationRequest(BaseModel):
    """Request for batch verification by brand/product (no image)."""
    supplement_name: str = Field(
        ...,
        description="Name of the supplement",
        min_length=2,
        examples=["Gold Standard Whey", "Creatine Monohydrate", "BCAA Energy"]
    )
    supplement_brand: str = Field(
        ...,
        description="Brand of the supplement",
        min_length=2,
        examples=["Optimum Nutrition", "MyProtein", "Applied Nutrition", "fourfive"]
    )


class BatchIDVerificationRequest(BaseModel):
    """Request for verification by batch ID (with optional brand/product)."""
    batch_id: str = Field(
        ...,
        description="Batch/Lot ID to verify",
        min_length=4,
        examples=["4020394", "BN108446", "8850:002", "0001275000"]
    )
    supplement_brand: Optional[str] = Field(
        None,
        description="Brand of the supplement (for additional verification)",
        min_length=2
    )
    supplement_name: Optional[str] = Field(
        None,
        description="Name of the supplement (for additional verification)",
        min_length=2
    )


class CombinedVerificationRequest(BaseModel):
    """Request for combined batch ID + brand/product verification."""
    batch_id: Optional[str] = Field(
        None,
        description="Batch/Lot ID to verify (optional)",
        min_length=4
    )
    supplement_brand: str = Field(
        ...,
        description="Brand of the supplement",
        min_length=2
    )
    supplement_name: str = Field(
        ...,
        description="Name of the supplement",
        min_length=2
    )
    variant: Optional[str] = Field(
        None,
        description="Flavor/variant (optional)"
    )


# ============================================================================
# API RESPONSE SCHEMAS
# ============================================================================

class BatchVerificationResponse(BaseModel):
    """Response from batch verification (brand/product search)."""
    success: bool
    
    # Supplement info
    supplement_name: str
    supplement_brand: str
    variant: Optional[str] = None
    
    # Overall result
    is_batch_tested: bool = Field(
        ...,
        description="True if found in ANY certification database"
    )
    
    # Individual certification results
    certifications: List[CertificationResult] = Field(
        default_factory=list,
        description="Results from each certification database"
    )
    
    # Best match
    primary_certification: Optional[CertificationResult] = Field(
        None,
        description="Highest confidence match (if any found)"
    )
    
    # Errors
    errors: List[str] = Field(
        default_factory=list,
        description="Any errors during processing"
    )


class BatchIDVerificationResponse(BaseModel):
    """Response from batch ID verification."""
    success: bool
    
    # Batch ID info
    batch_id: str
    batch_id_verified: bool = Field(
        ...,
        description="True if batch ID was found on ANY certification site"
    )
    
    # Optional brand/product (if provided)
    supplement_brand: Optional[str] = None
    supplement_name: Optional[str] = None
    
    # Individual certification results
    certifications: List[CertificationResult] = Field(
        default_factory=list,
        description="Results from each certification database"
    )
    
    # Best match
    primary_certification: Optional[CertificationResult] = Field(
        None,
        description="Best match (prefers batch ID verified results)"
    )
    
    # Errors
    errors: List[str] = Field(
        default_factory=list,
        description="Any errors during processing"
    )


class CombinedVerificationResponse(BaseModel):
    """Response from combined batch ID + brand verification."""
    success: bool
    
    # Input info
    batch_id: Optional[str] = None
    supplement_brand: str
    supplement_name: str
    variant: Optional[str] = None
    
    # Verification results
    is_batch_id_verified: bool = Field(
        False, 
        description="True if batch ID was verified on any site"
    )
    is_brand_verified: bool = Field(
        False, 
        description="True if brand/product was found on any site"
    )
    is_fully_verified: bool = Field(
        False, 
        description="True if all provided info was verified"
    )
    
    # Detailed results
    batch_id_results: List[CertificationResult] = Field(
        default_factory=list,
        description="Results from batch ID search"
    )
    brand_results: List[CertificationResult] = Field(
        default_factory=list,
        description="Results from brand/product search"
    )
    
    # Best match
    primary_certification: Optional[CertificationResult] = Field(
        None,
        description="Best overall match"
    )
    
    # Errors
    errors: List[str] = Field(
        default_factory=list,
        description="Any errors during processing"
    )


# ============================================================================
# OCR + VERIFICATION RESPONSE SCHEMAS
# ============================================================================

class OCRBatchVerificationResponse(BaseModel):
    """Response from OCR + batch verification (product label image)."""
    success: bool
    
    # OCR extraction result
    ocr_extracted: SupplementIdentification = Field(
        ...,
        description="Supplement info extracted from image via OCR"
    )
    
    # Verification results
    verification: BatchVerificationResponse = Field(
        ...,
        description="Batch testing verification results"
    )


class OCRBatchIDVerificationResponse(BaseModel):
    """Response from OCR batch ID extraction + verification."""
    success: bool
    
    # Batch ID extraction result
    batch_id_extraction: BatchIDExtraction = Field(
        ...,
        description="Batch ID extracted from image via OCR"
    )
    
    # Verification results
    verification: BatchIDVerificationResponse = Field(
        ...,
        description="Batch ID verification results"
    )


class CombinedImagesVerificationResponse(BaseModel):
    """Response from combined verification using TWO images."""
    success: bool
    
    # Extraction results
    batch_id_extraction: BatchIDExtraction = Field(
        ...,
        description="Batch ID extracted from first image"
    )
    product_extraction: SupplementIdentification = Field(
        ...,
        description="Brand/product extracted from second image"
    )
    
    # Verification results
    is_batch_id_verified: bool = Field(
        False,
        description="True if batch ID was verified"
    )
    is_brand_verified: bool = Field(
        False,
        description="True if brand/product was verified"
    )
    is_fully_verified: bool = Field(
        False,
        description="True if all checks passed"
    )
    
    # Detailed results
    batch_id_results: List[CertificationResult] = Field(
        default_factory=list,
        description="Results from batch ID search"
    )
    brand_results: List[CertificationResult] = Field(
        default_factory=list,
        description="Results from brand/product search"
    )
    
    # Best match
    primary_certification: Optional[CertificationResult] = Field(
        None,
        description="Best overall match"
    )
    
    # Errors
    errors: List[str] = Field(
        default_factory=list,
        description="Any errors during processing"
    )