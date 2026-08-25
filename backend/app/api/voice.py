"""Voice API routes — Multilingual ASR and analysis pipeline.

Supports: Tamil, Hindi, Kannada, Malayalam, Telugu, Bengali, Urdu.
"""

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.ai_engine import gemini_engine
from app.core.extraction import extract_and_validate
from app.core.confidence import evaluate_confidence
from app.core.clarification import generate_clarification_questions
from app.models.schemas import TranscribeResponse, VoiceAnalyzeResponse

router = APIRouter(prefix="/voice", tags=["Voice"])

# Supported language codes
SUPPORTED_LANGUAGES = {"ta", "hi", "kn", "ml", "te", "bn", "ur", "en"}


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    audio: UploadFile = File(None),
    text: str = Form(None),
    language: str = Form("ta"),
):
    """Transcribe audio or process direct text input.
    
    Accepts audio file (webm, wav, mp3) or direct text.
    Supports: Tamil (ta), Hindi (hi), Kannada (kn), Malayalam (ml),
    Telugu (te), Bengali (bn), Urdu (ur), English (en).
    Returns transcript with confidence score.
    """
    lang = language if language in SUPPORTED_LANGUAGES else "ta"
    
    if audio:
        # Audio input — use Gemini multimodal ASR with text fallback
        audio_bytes = await audio.read()
        mime_type = audio.content_type or "audio/webm"
        
        result = await gemini_engine.transcribe_audio(
            audio_bytes, mime_type, fallback_text=text, language=lang
        )
        
        if "error" in result and not result.get("text"):
            raise HTTPException(status_code=500, detail=f"ASR failed: {result['error']}")
        
        return TranscribeResponse(
            text=result.get("text", ""),
            language=result.get("language", lang),
            confidence=result.get("confidence", 0.0),
            normalized_text=result.get("normalized_text"),
        )
    elif text:
        # Direct text input — normalize if needed
        return TranscribeResponse(
            text=text,
            language=lang,
            confidence=1.0,
            normalized_text=text,
        )
    else:
        raise HTTPException(status_code=400, detail="Provide either audio file or text")


@router.post("/analyze", response_model=VoiceAnalyzeResponse)
async def analyze_voice(
    audio: UploadFile = File(None),
    text: str = Form(None),
    language: str = Form("ta"),
):
    """Full voice analysis pipeline.
    
    Audio/Text → Transcribe → Extract → Confidence → Clarification
    
    This is the main intake endpoint that powers the citizen desk.
    Supports all 7 Indian languages + English.
    """
    lang = language if language in SUPPORTED_LANGUAGES else "ta"
    
    # Step 1: Get transcript
    transcript_text = ""
    transcript_confidence = 1.0
    detected_language = lang
    normalized = ""
    
    if audio:
        audio_bytes = await audio.read()
        mime_type = audio.content_type or "audio/webm"
        asr_result = await gemini_engine.transcribe_audio(
            audio_bytes, mime_type, fallback_text=text, language=lang
        )
        transcript_text = asr_result.get("text", "")
        transcript_confidence = asr_result.get("confidence", 0.0)
        detected_language = asr_result.get("language", lang)
        normalized = asr_result.get("normalized_text", transcript_text)
    elif text:
        transcript_text = text
        normalized = text
    else:
        raise HTTPException(status_code=400, detail="Provide either audio file or text")
    
    if not transcript_text:
        raise HTTPException(status_code=400, detail="Could not transcribe audio")
    
    # Step 2: Extract structured data (pass language for multilingual prompts)
    extraction_result = await extract_and_validate(
        normalized or transcript_text, language=lang
    )
    
    primary_issue = extraction_result["issues"][0]
    confidence = extraction_result["confidence"]
    confidence.transcript = transcript_confidence
    
    # Step 3: Evaluate confidence and determine clarification needs
    # Get required fields from category rules
    clarification = evaluate_confidence(primary_issue, confidence)
    
    # Step 4: Enhance clarification with AI-generated questions in user's language
    if clarification.needs_clarification:
        clarification = await generate_clarification_questions(
            transcript_text, clarification, language=lang
        )
    
    # Build response
    transcript_resp = TranscribeResponse(
        text=transcript_text,
        language=detected_language,
        confidence=transcript_confidence,
        normalized_text=normalized,
    )
    
    multi_issues = None
    if extraction_result["multi_issue"]:
        multi_issues = extraction_result["issues"]
    
    return VoiceAnalyzeResponse(
        transcript=transcript_resp,
        extraction=primary_issue,
        confidence=confidence,
        clarification_needed=clarification.needs_clarification,
        clarification=clarification if clarification.needs_clarification else None,
        multi_issues=multi_issues,
    )

@router.post("/analyze-image", response_model=VoiceAnalyzeResponse)
async def analyze_image(
    image: UploadFile = File(...),
    language: str = Form("ta"),
    latitude: float = Form(None),
    longitude: float = Form(None),
):
    """Full image analysis pipeline.
    
    Image → Gemini Vision → Extract → Confidence → Clarification
    """
    lang = language if language in SUPPORTED_LANGUAGES else "ta"
    
    image_bytes = await image.read()
    mime_type = image.content_type or "image/jpeg"
    
    location_hint = None
    if latitude and longitude:
        location_hint = f"Lat: {latitude}, Lng: {longitude}"
        
    extraction_result = await gemini_engine.analyze_image(
        image_bytes, mime_type, language=lang, location_hint=location_hint
    )
    
    primary_issue_dict = extraction_result.get("issues", [{}])[0]
    confidence_dict = extraction_result.get("confidence", {})
    transcript_text = extraction_result.get("text", "Visual proof submitted.")
    normalized = extraction_result.get("normalized_text", "Visual proof submitted.")
    
    # Convert to Pydantic models for the confidence evaluation
    from app.models.schemas import GrievanceExtraction, ConfidenceScores
    primary_issue = GrievanceExtraction(**primary_issue_dict)
    confidence = ConfidenceScores(**confidence_dict)
    
    # Evaluate confidence and determine clarification needs
    clarification = evaluate_confidence(primary_issue, confidence)
    if clarification.needs_clarification:
        clarification = await generate_clarification_questions(
            transcript_text, clarification, language=lang
        )
        
    transcript_resp = TranscribeResponse(
        text=transcript_text,
        language=lang,
        confidence=confidence.overall if hasattr(confidence, 'overall') else 0.8,
        normalized_text=normalized,
    )
    
    multi_issues = None
    if extraction_result.get("multi_issue"):
        multi_issues = extraction_result["issues"]
        
    return VoiceAnalyzeResponse(
        transcript=transcript_resp,
        extraction=primary_issue,
        confidence=confidence,
        clarification_needed=clarification.needs_clarification,
        clarification=clarification if clarification.needs_clarification else None,
        multi_issues=multi_issues,
    )
