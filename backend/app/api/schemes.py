"""Scheme API routes — service discovery and eligibility assessment."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.database import Scheme
from app.models.schemas import SchemeResponse, SchemeMatchRequest
from app.core.schemes import match_schemes_by_category, match_schemes_by_text, assess_eligibility

router = APIRouter(prefix="/schemes", tags=["Schemes"])


@router.get("", response_model=list[SchemeResponse])
async def list_schemes(
    category: str = None,
    db: Session = Depends(get_db),
):
    """List all active schemes, optionally filtered by category."""
    query = db.query(Scheme).filter(Scheme.is_active == True)
    if category:
        query = query.filter(Scheme.category == category)
    schemes = query.all()
    return [SchemeResponse.model_validate(s) for s in schemes]


@router.get("/{scheme_id}", response_model=SchemeResponse)
async def get_scheme(
    scheme_id: str,
    db: Session = Depends(get_db),
):
    """Get scheme details by scheme_id."""
    scheme = db.query(Scheme).filter(Scheme.scheme_id == scheme_id).first()
    if not scheme:
        try:
            scheme = db.query(Scheme).filter(Scheme.id == int(scheme_id)).first()
        except ValueError:
            pass
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return SchemeResponse.model_validate(scheme)


@router.post("/match")
async def match_schemes(
    request: SchemeMatchRequest,
    db: Session = Depends(get_db),
):
    """Match citizen need to relevant schemes.
    
    AI identifies need category; rules match schemes.
    Says 'Potentially eligible' — never 'Eligible'.
    """
    if request.text:
        result = await match_schemes_by_text(db, request.text)
        return result
    elif request.category:
        schemes = match_schemes_by_category(db, request.category)
        return {
            "matched_schemes": [s.model_dump() for s in schemes],
            "disclaimer": "These are preliminary matches based on category.",
        }
    else:
        raise HTTPException(status_code=400, detail="Provide text or category")


@router.post("/{scheme_id}/assess")
async def assess_scheme_eligibility(
    scheme_id: str,
    citizen_input: dict,
    db: Session = Depends(get_db),
):
    """Preliminary eligibility assessment against scheme rules.
    
    Returns POTENTIALLY_ELIGIBLE, NOT_ELIGIBLE, or INCOMPLETE.
    This is NOT official eligibility determination.
    """
    scheme = db.query(Scheme).filter(Scheme.scheme_id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    
    result = assess_eligibility(scheme, citizen_input)
    result["scheme"] = SchemeResponse.model_validate(scheme).model_dump()
    result["disclaimer"] = "This is a preliminary assessment. Official eligibility must be verified by the relevant authority."
    result["disclaimer_ta"] = "இது ஒரு ஆரம்பகட்ட மதிப்பீடு. உத்தியோகபூர்வ தகுதி சம்பந்தப்பட்ட அதிகாரியால் சரிபார்க்கப்பட வேண்டும்."
    
    return result
