"""Clarification engine — core differentiator.

Asks only for the minimum missing information.
Uses AI-generated Tamil questions with template fallback.
"""

import logging
from app.core.ai_engine import gemini_engine
from app.models.schemas import ClarificationField, ClarificationResponse, GrievanceExtraction, ConfidenceScores

logger = logging.getLogger(__name__)


async def generate_clarification_questions(
    text: str,
    clarification: ClarificationResponse,
    language: str = "ta"
) -> ClarificationResponse:
    """Enhance clarification questions using AI-generated Tamil.
    
    Takes the rule-based clarification response and optionally
    enhances questions using Gemini for more natural Tamil.
    Falls back to template questions if AI fails (No-SPOF).
    """
    if not clarification.needs_clarification or not clarification.fields:
        return clarification
    
    try:
        # Build missing fields description for AI
        missing = [
            {
                "field": f.field,
                "status": f.status,
                "current_value": f.current_value,
            }
            for f in clarification.fields
        ]
        
        # Get AI-generated questions
        ai_questions = await gemini_engine.generate_clarification(text, missing, language=language)
        
        # Merge AI questions with rule-based ones
        if ai_questions:
            ai_map = {q.get("field"): q for q in ai_questions}
            enhanced_fields = []
            for field in clarification.fields:
                if field.field in ai_map:
                    ai_q = ai_map[field.field]
                    enhanced_fields.append(ClarificationField(
                        field=field.field,
                        status=field.status,
                        question_ta=ai_q.get("question_ta", field.question_ta),
                        question_en=ai_q.get("question_en", field.question_en),
                        options=ai_q.get("options") or field.options,
                        current_value=field.current_value,
                        confidence=field.confidence,
                    ))
                else:
                    enhanced_fields.append(field)
            
            clarification.fields = enhanced_fields
    
    except Exception as e:
        logger.warning(f"AI clarification enhancement failed, using templates: {e}")
        # Template questions already in place from confidence engine
    
    return clarification


def apply_clarification_answers(
    extraction: GrievanceExtraction,
    answers: list[dict],
) -> GrievanceExtraction:
    """Apply citizen's clarification answers to the extraction.
    
    Updates the extraction with provided answers.
    """
    data = extraction.model_dump()
    
    for answer in answers:
        field = answer.get("field")
        value = answer.get("value")
        
        if field and value and field in data:
            # Type conversion for specific fields
            if field == "duration_days":
                try:
                    # Parse Tamil/English duration answers
                    value = _parse_duration(value)
                except (ValueError, TypeError):
                    pass
            elif field == "affected_population":
                try:
                    value = _parse_population(value)
                except (ValueError, TypeError):
                    pass
            elif field == "previous_complaint":
                value = value.lower() in ("yes", "true", "ஆம்", "1")
            
            data[field] = value
    
    return GrievanceExtraction.model_validate(data)


def _parse_duration(value: str) -> int:
    """Parse duration from natural language to days."""
    value = str(value).lower().strip()
    
    # Direct number
    try:
        return int(value)
    except ValueError:
        pass
    
    # Common patterns (Multilingual)
    mappings = {
        "1 நாள்": 1, "ஒரு நாள்": 1, "one day": 1, "1 दिन": 1, "1 ದಿನ": 1, "1 ദിവസം": 1, "1 రోజు": 1, "1 দিন": 1, "1 دن": 1,
        "2-3 நாட்கள்": 3, "2 நாட்கள்": 2, "3 நாட்கள்": 3, "2-3 दिन": 3, "2-3 ದಿನಗಳು": 3, "2-3 ദിവസങ്ങൾ": 3, "2-3 రోజులు": 3, "2-3 দিন": 3, "2-3 دن": 3,
        "1 வாரம்": 7, "ஒரு வாரம்": 7, "one week": 7, "a week": 7, "1 सप्ताह": 7, "1 ವಾರ": 7, "1 ആഴ്ച": 7, "1 వారం": 7, "1 সপ্তাহ": 7, "1 ہفتہ": 7,
        "2 வாரங்கள்": 14, "இரண்டு வாரம்": 14, "two weeks": 14, "2 सप्ताह": 14, "2 ವಾರಗಳು": 14, "2 ആഴ്ചകൾ": 14, "2 వారాలు": 14, "2 সপ্তাহ": 14, "2 ہفتے": 14,
        "1 மாதம்": 30, "ஒரு மாதம்": 30, "one month": 30, "a month": 30, "1 महीना": 30, "1 ತಿಂಗಳು": 30, "1 മാസം": 30, "1 నెల": 30, "1 মাস": 30, "1 مہینہ": 30,
        "1 மாதம்+": 30, "1 महीना+": 30,
    }
    
    for pattern, days in mappings.items():
        if pattern in value:
            return days
    
    return 1  # Default


def _parse_population(value: str) -> int:
    """Parse population count from natural language."""
    value = str(value).lower().strip()
    
    try:
        return int(value)
    except ValueError:
        pass
    
    mappings = {
        "1-5": 5, "5-20": 15, "20-50": 35, "50+": 75,
        "1-5 குடும்பங்கள்": 5, "5-20 குடும்பங்கள்": 15,
        "20-50 குடும்பங்கள்": 35, "50+ குடும்பங்கள்": 75,
        "1-5 परिवार": 5, "5-20 परिवार": 15, "20-50 परिवार": 35, "50+ परिवार": 75,
        "1-5 ಕುಟುಂಬಗಳು": 5, "5-20 ಕುಟುಂಬಗಳು": 15, "20-50 ಕುಟುಂಬಗಳು": 35, "50+ ಕುಟುಂಬಗಳು": 75,
        "1-5 കുടുംബങ്ങൾ": 5, "5-20 കുടുംബങ്ങൾ": 15, "20-50 കുടുംബങ്ങൾ": 35, "50+ കുടുംബങ്ങൾ": 75,
        "1-5 కుటుంబాలు": 5, "5-20 కుటుంబాలు": 15, "20-50 కుటుంబాలు": 35, "50+ కుటుంబాలు": 75,
        "1-5 পরিবার": 5, "5-20 পরিবার": 15, "20-50 পরিবার": 35, "50+ পরিবার": 75,
        "1-5 خاندان": 5, "5-20 خاندان": 15, "20-50 خاندان": 35, "50+ خاندان": 75,
    }
    
    for pattern, count in mappings.items():
        if pattern in value:
            return count
    
    return 1
