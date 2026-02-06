"""
Pydantic schemas for batch verification API.
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
# CERTIFICATION RESULTS
# ============================================================================

class CertificationResult(BaseModel):
    """Result from a single certification database search."""
    organisation: str = Field(..., description="Certification organization name")
    found: bool = Field(..., description="Whether supplement was found in database")
    batch_tested: bool = Field(False, description="Whether it's confirmed batch tested")
    product_url: Optional[str] = Field(None, description="Direct URL to product on certification site")
    search_url: Optional[str] = Field(None, description="Search URL used")
    confidence: Optional[Literal["high", "medium", "low"]] = Field(
        None,
        description="Confidence level of the match"
    )
    matched_product_name: Optional[str] = Field(None, description="Product name as shown on cert site")
    search_term_used: Optional[str] = Field(None, description="Search term that found the match")
    database_description: Optional[str] = Field(None, description="Description of the certification")


# ============================================================================
# API REQUEST SCHEMAS
# ============================================================================

class BatchVerificationRequest(BaseModel):
    """Request for batch verification from text (no image)."""
    supplement_name: str = Field(
        ...,
        description="Name of the supplement",
        min_length=2,
        examples=["Gold Standard Whey", "Creatine Monohydrate"]
    )
    supplement_brand: str = Field(
        ...,
        description="Brand of the supplement",
        min_length=2,
        examples=["Optimum Nutrition", "MyProtein", "Applied Nutrition"]
    )


# ============================================================================
# API RESPONSE SCHEMAS
# ============================================================================

class BatchVerificationResponse(BaseModel):
    """Response from batch verification."""
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


class OCRBatchVerificationResponse(BaseModel):
    """Response from OCR + batch verification (image input)."""
    success: bool
    
    # OCR extraction result
    ocr_extracted: SupplementIdentification = Field(
        ...,
        description="Supplement info extracted from image"
    )
    
    # Verification results
    verification: BatchVerificationResponse = Field(
        ...,
        description="Batch testing verification results"
    )