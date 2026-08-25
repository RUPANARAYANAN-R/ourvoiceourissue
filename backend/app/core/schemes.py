"""Scheme intelligence engine.

Matches citizen needs to government schemes using data-driven rules.
Says "Potentially eligible" — NEVER "Eligible".
LLM is never the eligibility authority.
"""

import json
import os
import logging
from sqlalchemy.orm import Session
from app.models.database import Scheme, SchemeAssessment
from app.models.schemas import SchemeResponse, SchemeAssessmentResponse, SchemeMatchRequest
from app.core.ai_engine import gemini_engine

logger = logging.getLogger(__name__)

# Load schemes data
_schemes_path = os.path.join(os.path.dirname(__file__), "..", "rules", "schemes.json")
with open(_schemes_path, "r", encoding="utf-8") as f:
    SCHEMES_DATA = json.load(f)["schemes"]


def match_schemes_by_category(
    db: Session,
    category: str,
) -> list[SchemeResponse]:
    """Find schemes related to a grievance category."""
    schemes = db.query(Scheme).filter(
        Scheme.category == category,
        Scheme.is_active == True,
    ).all()
    
    return [SchemeResponse.model_validate(s) for s in schemes]


async def match_schemes_by_text(
    db: Session,
    text: str,
) -> dict:
    """Use AI to detect citizen need and match to schemes.
    
    AI identifies the need category; rules do the matching.
    """
    # Step 1: AI detects need
    ai_result = await gemini_engine.match_scheme(text)
    
    category = ai_result.get("category")
    need = ai_result.get("need_detected", "")
    need_ta = ai_result.get("need_ta", "")
    missing_info = ai_result.get("missing_info_for_eligibility", [])
    
    # Step 2: Rules match schemes
    matched_schemes = []
    if category:
        schemes = db.query(Scheme).filter(
            Scheme.category == category,
            Scheme.is_active == True,
        ).all()
        matched_schemes = [SchemeResponse.model_validate(s) for s in schemes]
    
    return {
        "need_detected": need,
        "need_ta": need_ta,
        "category": category,
        "matched_schemes": matched_schemes,
        "missing_info": missing_info,
        "disclaimer": "These are preliminary matches. Actual eligibility must be verified by the relevant authority.",
        "disclaimer_ta": "இவை ஆரம்பகட்ட பொருத்தங்கள். உண்மையான தகுதியை சம்பந்தப்பட்ட அதிகாரி சரிபார்க்க வேண்டும்.",
    }


def assess_eligibility(
    scheme: Scheme,
    citizen_input: dict,
) -> dict:
    """Assess preliminary eligibility against scheme rules.
    
    Returns POTENTIALLY_ELIGIBLE, NOT_ELIGIBLE, or INCOMPLETE.
    Never says simply "ELIGIBLE".
    """
    rules = scheme.eligibility_rules or []
    
    matched = []
    unmatched = []
    missing = []
    
    for rule in rules:
        field = rule.get("field")
        operator = rule.get("operator")
        expected = rule.get("value")
        desc = rule.get("description", "")
        
        if field not in citizen_input:
            missing.append({"field": field, "description": desc, "rule": rule})
            continue
        
        actual = citizen_input[field]
        is_match = _evaluate_rule(actual, operator, expected)
        
        if is_match:
            matched.append({"field": field, "description": desc, "status": "matched"})
        else:
            unmatched.append({"field": field, "description": desc, "status": "not_matched", "expected": expected, "actual": actual})
    
    # Determine result
    if missing:
        result = "INCOMPLETE"
    elif unmatched:
        result = "NOT_ELIGIBLE"
    else:
        result = "POTENTIALLY_ELIGIBLE"
    
    return {
        "result": result,
        "matched_rules": matched,
        "unmatched_rules": unmatched,
        "missing_info": missing,
    }


def _evaluate_rule(actual, operator: str, expected) -> bool:
    """Evaluate a single eligibility rule."""
    try:
        if operator == "==":
            return actual == expected
        elif operator == "!=":
            return actual != expected
        elif operator == ">=":
            return float(actual) >= float(expected)
        elif operator == "<=":
            return float(actual) <= float(expected)
        elif operator == ">":
            return float(actual) > float(expected)
        elif operator == "<":
            return float(actual) < float(expected)
        elif operator == "in":
            return actual in expected
        elif operator == "not_in":
            return actual not in expected
        else:
            return False
    except (ValueError, TypeError):
        return False
