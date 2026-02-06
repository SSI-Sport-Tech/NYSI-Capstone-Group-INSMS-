"""
Standalone OCR engine with lazy-loaded PaddleOCR singleton.
Extracts raw text from images. No LLM, no vectorization.
"""

import cv2
import logging
from typing import List, Tuple
from app.config.settings import settings

logger = logging.getLogger(__name__)

# Lazy singleton - only loads when first used
_ocr_instance = None


def get_ocr_instance():
    """
    Lazy-load PaddleOCR instance (only when first called).
    Saves ~2GB RAM if OCR is never used.
    
    Returns:
        PaddleOCR: Initialized OCR engine
    """
    global _ocr_instance
    
    if _ocr_instance is None:
        logger.info("🔄 Initializing PaddleOCR engine (lazy load)...")
        from paddleocr import PaddleOCR
        
        _ocr_instance = PaddleOCR(
            use_textline_orientation=True,
            lang=settings.ocr_language,
            ocr_version='PP-OCRv4',
            use_gpu=settings.ocr_use_gpu,
            show_log=False
        )
        logger.info("✅ PaddleOCR initialized")
    
    return _ocr_instance


def extract_text(
    image_path: str,
    min_confidence: float = 0.5,
    upscale_threshold: int = 800
) -> str:
    """
    Extract text from image using PaddleOCR.
    
    Args:
        image_path: Path to image file
        min_confidence: Minimum confidence threshold (0-1)
        upscale_threshold: Upscale images smaller than this width
        
    Returns:
        str: Extracted text (newline-separated lines)
        
    Raises:
        ValueError: If image cannot be read or no text detected
    """
    logger.info(f"👁️ OCR scanning: {image_path}")
    
    # Load image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")
    
    height, width = img.shape[:2]
    logger.debug(f"Image size: {width}x{height}")
    
    # Upscale small images for better OCR accuracy
    actual_path = image_path
    if width < upscale_threshold:
        scale = upscale_threshold / width
        logger.debug(f"Upscaling {scale:.1f}x for better OCR")
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        
        # Save upscaled image temporarily
        temp_path = image_path.replace('.jpg', '_upscaled.jpg').replace('.png', '_upscaled.png')
        cv2.imwrite(temp_path, img)
        actual_path = temp_path
    
    # Run OCR
    ocr = get_ocr_instance()
    result = ocr.ocr(actual_path, cls=True)
    
    if not result or not result[0]:
        raise ValueError("No text detected in image")
    
    # Extract text lines above confidence threshold
    texts = []
    for line in result[0]:
        if line and len(line) >= 2:
            text_info = line[1]
            text = text_info[0]
            confidence = text_info[1]
            
            if confidence >= min_confidence and text.strip():
                texts.append(text)
    
    if not texts:
        raise ValueError(f"No text with confidence >= {min_confidence}")
    
    full_text = "\n".join(texts)
    logger.info(f"✅ Extracted {len(texts)} lines ({len(full_text)} chars)")
    
    return full_text


def extract_text_with_metadata(
    image_path: str,
    min_confidence: float = 0.5
) -> List[Tuple[str, float, List]]:
    """
    Extract text with bounding boxes and confidence scores.
    
    Args:
        image_path: Path to image file
        min_confidence: Minimum confidence threshold
        
    Returns:
        List of (text, confidence, bbox) tuples
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")
    
    ocr = get_ocr_instance()
    result = ocr.ocr(image_path, cls=True)
    
    if not result or not result[0]:
        return []
    
    output = []
    for line in result[0]:
        if line and len(line) >= 2:
            bbox = line[0]
            text = line[1][0]
            confidence = line[1][1]
            
            if confidence >= min_confidence and text.strip():
                output.append((text, confidence, bbox))
    
    return output


def is_loaded() -> bool:
    """Check if OCR engine is currently loaded in memory."""
    return _ocr_instance is not None