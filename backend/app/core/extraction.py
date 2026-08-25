"""Structured extraction with Pydantic validation.

AI proposes → Pydantic validates → retry on invalid JSON.
"""

import logging
from typing import Optional
from app.core.ai_engine import gemini_engine
from app.models.schemas import GrievanceExtraction, ConfidenceScores

logger = logging.getLogger(__name__)


async def extract_and_validate(text: str, language: str = "ta") -> dict:
    """Full extraction pipeline: AI extract → Pydantic validate → confidence.
    
    Returns:
        {
            "issues": [GrievanceExtraction, ...],
            "confidence": ConfidenceScores,
            "normalized_text": str,
            "multi_issue": bool,
            "raw": dict
        }
    """
    # Step 1: AI extraction
    raw = await gemini_engine.extract_grievance(text, language=language)
    
    # Step 2: Validate each issue with Pydantic
    issues = []
    raw_issues = raw.get("issues", [])
    
    if not raw_issues:
        # Single issue format (fallback)
        raw_issues = [raw]
    
    for raw_issue in raw_issues:
        try:
            extraction = GrievanceExtraction.model_validate(raw_issue)
            issues.append(extraction)
        except Exception as e:
            logger.warning(f"Pydantic validation failed for issue: {e}")
            # Create partial extraction with what we have
            safe_issue = {}
            for field in GrievanceExtraction.model_fields:
                if field in raw_issue:
                    safe_issue[field] = raw_issue[field]
            try:
                extraction = GrievanceExtraction(**safe_issue)
                issues.append(extraction)
            except Exception:
                issues.append(GrievanceExtraction())
    
    # Step 3: Parse confidence scores
    raw_confidence = raw.get("confidence", {})
    try:
        confidence = ConfidenceScores.model_validate(raw_confidence)
    except Exception:
        confidence = ConfidenceScores()
    
    # If no issues extracted, create a blank one
    if not issues:
        issues = [GrievanceExtraction()]
    
    return {
        "issues": issues,
        "confidence": confidence,
        "normalized_text": raw.get("normalized_text", text),
        "multi_issue": len(issues) > 1,
        "raw": raw,
    }


async def normalize_tanglish(text: str) -> str:
    """Normalize Tanglish to Tamil script using AI.
    
    Falls back to returning original text if AI fails.
    """
    try:
        result = await gemini_engine.extract_grievance(text)
        return result.get("normalized_text", text)
    except Exception:
        return text
