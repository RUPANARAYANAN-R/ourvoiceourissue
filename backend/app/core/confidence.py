"""Confidence evaluation engine.

Every important field gets a confidence score.
Low confidence → clarification, not hallucination.
"""

import logging
from app.config import get_settings
from app.models.schemas import GrievanceExtraction, ConfidenceScores, ClarificationField, ClarificationResponse

logger = logging.getLogger(__name__)
settings = get_settings()


def evaluate_confidence(
    extraction: GrievanceExtraction,
    confidence: ConfidenceScores,
    required_fields: list[str] = None,
) -> ClarificationResponse:
    """Evaluate extraction confidence and determine what needs clarification.
    
    Returns fields that are missing or below confidence threshold.
    The system prefers asking over hallucinating.
    """
    if required_fields is None:
        required_fields = ["location_name", "category"]
    
    fields_needing_clarification: list[ClarificationField] = []
    threshold = settings.CONFIDENCE_THRESHOLD_MEDIUM  # 0.6
    
    # Check each field
    field_checks = [
        ("category", extraction.category, confidence.category, True),
        ("subcategory", extraction.subcategory, confidence.subcategory, False),
        ("location_name", extraction.location_name, confidence.location, True),
        ("duration_days", extraction.duration_days, confidence.duration, False),
        ("affected_population", extraction.affected_population, 0.5, False),
    ]
    
    for field_name, value, conf_score, is_critical in field_checks:
        is_required = field_name in required_fields
        
        # Use lower threshold for non-critical fields to avoid annoying the citizen
        current_threshold = threshold if is_critical else 0.4
        
        if value is None and is_required:
            # Missing required field
            fields_needing_clarification.append(ClarificationField(
                field=field_name,
                status="missing",
                question_ta=_get_default_question_ta(field_name),
                question_en=_get_default_question_en(field_name),
                options=_get_default_options(field_name),
                current_value=None,
                confidence=0.0,
            ))
        elif value is not None and conf_score < current_threshold:
            # Low confidence on extracted value
            fields_needing_clarification.append(ClarificationField(
                field=field_name,
                status="low_confidence",
                question_ta=_get_confirmation_question_ta(field_name, str(value)),
                question_en=_get_confirmation_question_en(field_name, str(value)),
                options=None,
                current_value=str(value),
                confidence=conf_score,
            ))
    
    total_missing = sum(1 for f in fields_needing_clarification if f.status == "missing")
    total_low = sum(1 for f in fields_needing_clarification if f.status == "low_confidence")
    
    return ClarificationResponse(
        needs_clarification=len(fields_needing_clarification) > 0,
        fields=fields_needing_clarification,
        total_missing=total_missing,
        total_low_confidence=total_low,
    )


def _get_default_question_ta(field: str) -> str:
    """Default Tamil questions for missing fields."""
    questions = {
        "category": "உங்கள் புகாரின் வகை என்ன? (குடிநீர், சாலை, மின்சாரம், சுகாதாரம், அரசு சேவை)",
        "subcategory": "பிரச்சனையின் துல்லியமான வகையை குறிப்பிடுங்கள்.",
        "location_name": "உங்கள் பகுதி அல்லது ஊர் பெயர் என்ன?",
        "duration_days": "இந்த பிரச்சனை எத்தனை நாட்களாக உள்ளது?",
        "affected_population": "எத்தனை குடும்பங்கள் பாதிக்கப்பட்டுள்ளனர்?",
    }
    return questions.get(field, f"{field} பற்றிய தகவலை வழங்கவும்.")


def _get_default_question_en(field: str) -> str:
    """Default English questions for missing fields."""
    questions = {
        "category": "What category does your complaint belong to?",
        "subcategory": "What is the specific nature of the issue?",
        "location_name": "What is your area or village name?",
        "duration_days": "How many days has this problem been ongoing?",
        "affected_population": "How many families are affected?",
    }
    return questions.get(field, f"Please provide information about {field}.")


def _get_confirmation_question_ta(field: str, value: str) -> str:
    """Tamil confirmation questions for low-confidence fields."""
    questions = {
        "category": f"உங்கள் புகார் '{value}' வகையா? சரியா?",
        "location_name": f"உங்கள் ஊர் '{value}' சரியா?",
        "duration_days": f"பிரச்சனை {value} நாட்களாக உள்ளது என்பது சரியா?",
    }
    return questions.get(field, f"'{value}' சரியா?")


def _get_confirmation_question_en(field: str, value: str) -> str:
    """English confirmation for low-confidence fields."""
    return f"Is '{value}' correct for {field}?"


def _get_default_options(field: str) -> list[str] | None:
    """Multiple choice options for certain fields."""
    options = {
        "category": ["குடிநீர் (Water)", "சாலை (Roads)", "மின்சாரம் (Electricity)", "சுகாதாரம் (Sanitation)", "அரசு சேவை (Govt Services)"],
        "duration_days": ["1 நாள்", "2-3 நாட்கள்", "1 வாரம்", "2 வாரங்கள்", "1 மாதம்+"],
        "affected_population": ["1-5 குடும்பங்கள்", "5-20 குடும்பங்கள்", "20-50 குடும்பங்கள்", "50+ குடும்பங்கள்"],
    }
    return options.get(field)
