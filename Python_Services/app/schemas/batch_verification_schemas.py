"""
Pydantic schemas for batch verification OCR workflow.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal


# ============================================================================
# OCR EXTRACTION SCHEMA
# ============================================================================

class SupplementIdentification(BaseModel):
    """Schema for LLM to extract supplement info from image."""
    supplement_name: str = Field(..., description="Product name from label")
    supplement_brand: str = Field(..., description="Brand name from label")
    variant: Optional[str] = Field(None, description="Flavor/variant if visible")


# ============================================================================
# CERTIFICATION SEARCH RESULTS
# ============================================================================

class CertificationResult(BaseModel):
    """Result from a single certification database search."""
    organisation: Literal[
        "Informed Sport", 
        "Informed Choice", 
        "HASTA", 
        "NSF Sport", 
        "Cologne List", 
        "BSCG"
    ]
    found: bool = Field(..., description="Whether supplement was found in database")
    batch_tested: bool = Field(False, description="Whether it's confirmed batch tested")
    product_url: Optional[str] = Field(None, description="Direct URL to product on certification site")
    search_url: Optional[str] = Field(None, description="Search URL used")
    confidence: Literal["high", "medium", "low"] = Field(
        "low", 
        description="Confidence level of the match"
    )
    notes: Optional[str] = Field(None, description="Additional notes about the match")


class CertificationSearchSchema(BaseModel):
    """Schema for LLM certification search output."""
    found: bool
    batch_tested: bool
    product_url: Optional[str] = None
    confidence: str = "low"


# ============================================================================
# API REQUEST/RESPONSE
# ============================================================================

class BatchVerificationRequest(BaseModel):
    """Request for batch verification (if not using image upload)."""
    supplement_name: str = Field(..., description="Name of the supplement")
    supplement_brand: str = Field(..., description="Brand of the supplement")


class BatchVerificationResponse(BaseModel):
    """Response from batch verification workflow."""
    success: bool
    
    # Extracted supplement info
    supplement_name: str
    supplement_brand: str
    variant: Optional[str] = None
    
    # Overall result
    is_batch_tested: bool = Field(
        ..., 
        description="True if found in ANY certification database"
    )
    
    # Individual certification results
    certifications: List[CertificationResult] = Field(default_factory=list)
    
    # Best match (highest confidence found result)
    primary_certification: Optional[CertificationResult] = None
    
    # Errors during processing
    errors: List[str] = Field(default_factory=list)


class OCRBatchVerificationResponse(BaseModel):
    """Response from OCR + batch verification workflow."""
    success: bool
    
    # OCR extraction
    ocr_extracted: SupplementIdentification
    
    # Verification results
    verification: BatchVerificationResponse