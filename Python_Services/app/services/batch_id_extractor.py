"""
Batch ID Extractor.
Extracts batch/lot numbers from OCR text using LLM.
Handles various formats: numeric, alphanumeric, with separators.

Examples of batch IDs:
- 4020394
- 2527206
- 0001275000
- BN108446
- 8850:002
"""

import json
import logging
import re
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# ============================================================================
# SCHEMAS
# ============================================================================

class BatchIDExtraction(BaseModel):
    """Schema for batch ID extraction result."""
    batch_id: Optional[str] = Field(None, description="Extracted batch/lot ID")
    batch_id_type: Optional[str] = Field(None, description="Type: 'batch', 'lot', 'certification', 'unknown'")
    confidence: str = Field("low", description="Confidence: 'high', 'medium', 'low'")
    raw_match: Optional[str] = Field(None, description="The exact text matched from OCR")
    possible_alternatives: List[str] = Field(default_factory=list, description="Other potential batch IDs")


# ============================================================================
# REGEX-BASED EXTRACTION (FAST, NO LLM)
# ============================================================================

def extract_batch_id_regex(raw_text: str) -> Dict:
    """
    Extract batch ID using regex patterns (fast, no LLM needed).
    
    Looks for common batch ID patterns in supplement labels.
    """
    logger.info("🔍 Extracting batch ID using regex patterns...")
    
    # Common patterns for batch/lot numbers
    patterns = [
        # Labeled batch/lot numbers
        (r'(?:batch|batch\s*no|batch\s*#|batch\s*number)[\s:\.]*([A-Z0-9\-:]{5,20})', 'batch', 'high'),
        (r'(?:lot|lot\s*no|lot\s*#|lot\s*number)[\s:\.]*([A-Z0-9\-:]{5,20})', 'lot', 'high'),
        (r'(?:b/?n|l/?n)[\s:\.]*([A-Z0-9\-:]{5,20})', 'batch', 'medium'),
        
        # Alphanumeric codes (like BN108446)
        (r'\b(BN\d{5,10})\b', 'batch', 'high'),
        (r'\b(LN\d{5,10})\b', 'lot', 'high'),
        (r'\b(IS[\-]?\d{5,10})\b', 'certification', 'high'),  # Informed Sport
        (r'\b(NSF[\-]?\d{5,10})\b', 'certification', 'high'),  # NSF
        
        # Codes with colons (like 8850:002)
        (r'\b(\d{4,6}:\d{2,4})\b', 'batch', 'medium'),
        
        # Pure numeric (6-12 digits, common for batch numbers)
        (r'\b(0{2,4}\d{6,10})\b', 'batch', 'medium'),  # Leading zeros like 0001275000
        (r'\b(\d{7,10})\b', 'batch', 'low'),  # 7-10 digit numbers
    ]
    
    found_ids = []
    
    # Normalize text
    text_upper = raw_text.upper()
    text_clean = re.sub(r'\s+', ' ', text_upper)
    
    for pattern, id_type, confidence in patterns:
        matches = re.findall(pattern, text_clean, re.IGNORECASE)
        for match in matches:
            # Filter out dates, phone numbers, etc.
            if not _is_likely_date_or_phone(match):
                found_ids.append({
                    "batch_id": match.strip(),
                    "batch_id_type": id_type,
                    "confidence": confidence,
                    "pattern": pattern
                })
    
    if found_ids:
        # Sort by confidence
        confidence_order = {"high": 0, "medium": 1, "low": 2}
        found_ids.sort(key=lambda x: confidence_order.get(x["confidence"], 3))
        
        best = found_ids[0]
        alternatives = [x["batch_id"] for x in found_ids[1:5] if x["batch_id"] != best["batch_id"]]
        
        logger.info(f"✅ Found batch ID: {best['batch_id']} (confidence: {best['confidence']})")
        
        return {
            "batch_id": best["batch_id"],
            "batch_id_type": best["batch_id_type"],
            "confidence": best["confidence"],
            "raw_match": best["batch_id"],
            "possible_alternatives": alternatives
        }
    
    logger.warning("⚠️ No batch ID found with regex")
    return {
        "batch_id": None,
        "batch_id_type": None,
        "confidence": "low",
        "raw_match": None,
        "possible_alternatives": []
    }


def _is_likely_date_or_phone(text: str) -> bool:
    """Check if text looks like a date or phone number (not a batch ID)."""
    # Date patterns
    if re.match(r'^\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}$', text):
        return True
    if re.match(r'^\d{4}[/\-]\d{1,2}[/\-]\d{1,2}$', text):
        return True
    # Phone patterns
    if re.match(r'^\d{3}[\-\s]?\d{3}[\-\s]?\d{4}$', text):
        return True
    # Expiry date patterns (MM/YY, MM/YYYY)
    if re.match(r'^\d{2}/\d{2,4}$', text):
        return True
    return False


# ============================================================================
# LLM-BASED EXTRACTION (MORE ACCURATE)
# ============================================================================

def extract_batch_id_llm(raw_text: str) -> Dict:
    """
    Extract batch ID using LLM (more accurate but slower).
    """
    logger.info("🔍 Extracting batch ID using LLM...")
    
    from app.services import llm_structurer
    
    llm = llm_structurer.get_llm_instance()
    sllm = llm.as_structured_llm(BatchIDExtraction)
    
    prompt = f"""Extract the batch/lot number from this supplement label text.

BATCH ID FORMATS TO LOOK FOR:
1. Pure numeric: 4020394, 2527206, 0001275000
2. Alphanumeric: BN108446, IS2024001
3. With separators: 8850:002, LOT-2024-001

COMMON LABEL PATTERNS:
- "Batch: 4020394" or "Batch No: 4020394"
- "Lot: BN108446" or "Lot #: BN108446"
- "B/N: 8850:002"
- Sometimes just a number near "batch" or "lot" text

IGNORE THESE (NOT batch IDs):
- Dates (expiry, manufacture dates)
- Phone numbers
- Barcodes/UPC codes
- Serving sizes
- Nutritional values

CONFIDENCE:
- "high": Clear "Batch:" or "Lot:" label with ID
- "medium": Found alphanumeric code likely to be batch ID
- "low": Found a number but uncertain

TEXT:
{raw_text}
"""
    
    try:
        response = sllm.complete(prompt)
        result = json.loads(response.text)
        
        if result.get("batch_id"):
            logger.info(f"✅ LLM extracted batch ID: {result.get('batch_id')}")
        else:
            logger.warning("⚠️ LLM found no batch ID")
        
        return result
        
    except Exception as e:
        logger.error(f"LLM batch ID extraction failed: {str(e)}")
        return {
            "batch_id": None,
            "batch_id_type": None,
            "confidence": "low",
            "raw_match": None,
            "possible_alternatives": [],
            "error": str(e)
        }


# ============================================================================
# MAIN EXTRACTION FUNCTION
# ============================================================================

def extract_batch_id(raw_text: str, use_llm: bool = False) -> Dict:
    """
    Extract batch/lot ID from raw OCR text.
    
    Args:
        raw_text: Raw text from OCR
        use_llm: If True, use LLM for extraction (slower but more accurate)
        
    Returns:
        dict with batch_id, confidence, etc.
    """
    # First try regex (fast)
    result = extract_batch_id_regex(raw_text)
    
    # If regex found nothing or low confidence, try LLM
    if use_llm and (not result.get("batch_id") or result.get("confidence") == "low"):
        llm_result = extract_batch_id_llm(raw_text)
        
        # Use LLM result if it found something with better confidence
        if llm_result.get("batch_id"):
            if not result.get("batch_id"):
                result = llm_result
            elif llm_result.get("confidence") in ["high", "medium"]:
                result = llm_result
    
    return result


def extract_batch_id_from_image(image_path: str, use_llm: bool = False) -> Dict:
    """
    Extract batch ID from image using OCR + extraction.
    
    Args:
        image_path: Path to image file
        use_llm: If True, use LLM for extraction
        
    Returns:
        dict with batch_id, confidence, ocr_text
    """
    from app.services import ocr_engine
    
    logger.info(f"👁️ Extracting batch ID from image: {image_path}")
    
    # Step 1: OCR
    try:
        raw_text = ocr_engine.extract_text(image_path)
        logger.info(f"📝 OCR extracted {len(raw_text)} characters")
    except ValueError as e:
        return {
            "batch_id": None,
            "error": f"OCR failed: {str(e)}",
            "confidence": "low",
            "ocr_text": None
        }
    
    # Step 2: Extract batch ID
    result = extract_batch_id(raw_text, use_llm=use_llm)
    result["ocr_text"] = raw_text
    
    return result