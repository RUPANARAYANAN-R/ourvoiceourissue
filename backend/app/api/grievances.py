"""Grievance CRUD and workflow API routes."""

import random
import string
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.db.database import get_db
from app.api.auth import get_current_user, get_optional_user
from app.models.database import Grievance, GrievanceEvent, Evidence, User, Department, GrievanceEmbedding, VoiceRecord
from app.models.schemas import (
    GrievanceCreateRequest, GrievanceUpdateRequest, GrievanceResponse,
    GrievanceListResponse, GrievanceEventResponse, EvidenceResponse,
    StatusUpdateRequest, ResolveRequest, ConfirmRequest,
    ClarificationAnswer, DashboardStats, PriorityCalculation, GrievanceExtraction,
)
from app.models.enums import GrievanceState, GrievanceCategory
from app.core.state_machine import transition, get_valid_transitions, StateMachineError
from app.core.priority import calculate_priority
from app.core.routing import route_grievance
from app.core.sla import calculate_sla_deadline, get_sla_risk
from app.core.escalation import assign_initial_authority, get_authority_chain
from app.core.extraction import extract_and_validate
from app.core.confidence import evaluate_confidence
from app.core.clarification import apply_clarification_answers, generate_clarification_questions
from app.core.ai_engine import gemini_engine

router = APIRouter(prefix="/grievances", tags=["Grievances"])


def _generate_grievance_id(category: str = None) -> str:
    """Generate display grievance ID like TN-WTR-10482."""
    prefix_map = {
        "WATER": "TN-WTR",
        "ROADS": "TN-RDS",
        "ELECTRICITY": "TN-ELC",
        "SANITATION": "TN-SAN",
        "GOVERNMENT_SERVICES": "TN-GOV",
    }
    prefix = prefix_map.get(category, "TN-GEN")
    num = random.randint(10000, 99999)
    return f"{prefix}-{num}"


def _to_response(g: Grievance, db: Session = None) -> GrievanceResponse:
    """Convert Grievance model to response schema."""
    dept_name = None
    officer_name = None
    citizen_name = None
    sla_risk = None

    if db:
        if g.department_id:
            dept = db.query(Department).filter(Department.id == g.department_id).first()
            dept_name = dept.name if dept else None
        if g.assigned_officer_id:
            officer = db.query(User).filter(User.id == g.assigned_officer_id).first()
            officer_name = officer.name if officer else None
        if g.citizen_id:
            citizen = db.query(User).filter(User.id == g.citizen_id).first()
            citizen_name = citizen.name if citizen else None

    if g.sla_deadline:
        risk, time_remaining = get_sla_risk(g.sla_deadline)
        sla_risk = risk.value
        time_remaining_hours = max(0, time_remaining)
        
        # Calculate progress pct
        if g.sla_started_at and g.sla_hours:
            elapsed = (datetime.now(timezone.utc) - g.sla_started_at.replace(tzinfo=timezone.utc)).total_seconds() / 3600
            sla_progress_pct = min(100.0, (elapsed / g.sla_hours) * 100.0)
        else:
            sla_progress_pct = 0.0
    else:
        time_remaining_hours = None
        sla_progress_pct = None

    events = [GrievanceEventResponse.model_validate(e) for e in g.events] if g.events else []
    evidence_list = [EvidenceResponse.model_validate(e) for e in g.evidence] if g.evidence else []
    
    from app.models.schemas import AuthorityAssignmentResponse
    auth_history = [AuthorityAssignmentResponse.model_validate(a) for a in g.authority_assignments] if getattr(g, "authority_assignments", None) else []
    
    auth_chain = get_authority_chain(g.category) if g.category else []

    return GrievanceResponse(
        id=g.id,
        grievance_id=g.grievance_id,
        state=g.state,
        intent=g.intent,
        category=g.category,
        subcategory=g.subcategory,
        issue=g.issue,
        issue_ta=g.issue_ta,
        location_name=g.location_name,
        location_ta=g.location_ta,
        latitude=g.latitude,
        longitude=g.longitude,
        district=g.district,
        duration_days=g.duration_days,
        affected_population=g.affected_population,
        previous_complaint=g.previous_complaint,
        transcript=g.transcript,
        normalized_text=g.normalized_text,
        extraction_json=g.extraction_json,
        confidence_json=g.confidence_json,
        clarification_json=g.clarification_json,
        priority_score=g.priority_score,
        priority_level=g.priority_level,
        priority_breakdown=g.priority_breakdown,
        department_id=g.department_id,
        department_name=dept_name,
        assigned_officer_id=g.assigned_officer_id,
        assigned_officer_name=officer_name,
        citizen_id=g.citizen_id,
        citizen_name=citizen_name,
        sla_deadline=g.sla_deadline,
        sla_hours=g.sla_hours,
        sla_risk=sla_risk,
        sla_started_at=g.sla_started_at,
        sla_status=g.sla_status,
        sla_breached_at=g.sla_breached_at,
        sla_progress_pct=sla_progress_pct,
        time_remaining_hours=time_remaining_hours,
        current_authority_level=g.current_authority_level,
        current_authority_name=g.current_authority_name,
        current_authority_name_ta=g.current_authority_name_ta,
        assigned_at=g.assigned_at,
        escalation_count=g.escalation_count,
        escalated_at=g.escalated_at,
        escalation_reason=g.escalation_reason,
        last_action_at=g.last_action_at,
        last_action_note=g.last_action_note,
        resolution_notes=g.resolution_notes,
        resolved_at=g.resolved_at,
        citizen_feedback=g.citizen_feedback,
        citizen_confirmed_at=g.citizen_confirmed_at,
        events=events,
        evidence=evidence_list,
        authority_history=auth_history,
        authority_chain=auth_chain,
        cluster_id=g.cluster_id,
        created_at=g.created_at,
        updated_at=g.updated_at,
    )


@router.post("", response_model=GrievanceResponse)
async def create_grievance(
    request: GrievanceCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_user),
):
    """Create a new grievance from extraction data.
    
    Full pipeline: create → classify → validate → route → assign priority + SLA.
    """
    extraction = request.extraction
    
    # Generate display ID
    category = extraction.category if extraction else None
    grievance_id = _generate_grievance_id(category)
    
    # Create grievance
    grievance = Grievance(
        grievance_id=grievance_id,
        state=GrievanceState.DRAFT.value,
        citizen_id=request.citizen_id or (user.id if user else None),
        operator_id=request.operator_id,
        transcript=request.transcript,
        normalized_text=request.normalized_text,
    )
    
    # Apply extraction data
    if extraction:
        grievance.intent = extraction.intent
        grievance.category = extraction.category
        grievance.subcategory = extraction.subcategory
        grievance.issue = extraction.issue
        grievance.issue_ta = extraction.issue_ta
        grievance.location_name = extraction.location_name
        grievance.district = extraction.district
        grievance.duration_days = extraction.duration_days
        grievance.affected_population = extraction.affected_population
        grievance.previous_complaint = extraction.previous_complaint
        grievance.extraction_json = extraction.model_dump()
    
    if request.confidence:
        grievance.confidence_json = request.confidence.model_dump()
    
    if request.latitude:
        grievance.latitude = request.latitude
    if request.longitude:
        grievance.longitude = request.longitude
    
    db.add(grievance)
    db.flush()
    
    # Transition: DRAFT → CREATED
    transition(db, grievance, GrievanceState.CREATED,
               actor_id=user.id if user else None,
               notes="Grievance created")
    
    # If we have a category, classify immediately
    if extraction and extraction.category:
        transition(db, grievance, GrievanceState.CLASSIFIED,
                   actor_id=user.id if user else None,
                   notes=f"Classified as {extraction.category}")
        
        # Calculate priority (deterministic)
        priority = calculate_priority(extraction)
        grievance.priority_score = priority.total_score
        grievance.priority_level = priority.level
        grievance.priority_breakdown = priority.model_dump()
        
        # Validate and route
        transition(db, grievance, GrievanceState.VALIDATED,
                   actor_id=user.id if user else None,
                   notes="AI extraction validated")
        
        routing = route_grievance(db, extraction.category, extraction.subcategory)
        grievance.department_id = routing.department_id
        grievance.assigned_officer_id = routing.officer_id
        
        transition(db, grievance, GrievanceState.ROUTED,
                   actor_id=user.id if user else None,
                   notes=f"Routed to {routing.department_name}")
        
        # Calculate SLA and assign initial authority
        assign_initial_authority(db, grievance)
        
    # Generate embedding for clustering (async, don't block)
    try:
        embed_text = f"{grievance.category} {grievance.subcategory} {grievance.issue} {grievance.location_name} {grievance.transcript}"
        embedding = await gemini_engine.generate_embedding(embed_text)
        if embedding:
            emb_record = GrievanceEmbedding(
                grievance_id=grievance.id,
                embedding_json=embedding,
            )
            db.add(emb_record)
    except Exception:
        pass  # Embedding failure must not block grievance creation
    
    db.commit()
    db.refresh(grievance)
    
    return _to_response(grievance, db)


@router.get("", response_model=GrievanceListResponse)
async def list_grievances(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str = None,
    state: str = None,
    priority: str = None,
    department_id: int = None,
    officer_id: int = None,
    search: str = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: Session = Depends(get_db),
):
    """List grievances with filtering, sorting, and pagination."""
    query = db.query(Grievance)
    
    if category:
        query = query.filter(Grievance.category == category)
    if state:
        query = query.filter(Grievance.state == state)
    if priority:
        query = query.filter(Grievance.priority_level == priority)
    if department_id:
        query = query.filter(Grievance.department_id == department_id)
    if officer_id:
        query = query.filter(Grievance.assigned_officer_id == officer_id)
    if search:
        query = query.filter(
            (Grievance.grievance_id.contains(search)) |
            (Grievance.transcript.contains(search)) |
            (Grievance.location_name.contains(search)) |
            (Grievance.issue.contains(search))
        )
    
    total = query.count()
    
    # Sorting
    sort_col = getattr(Grievance, sort_by, Grievance.created_at)
    if sort_order == "desc":
        query = query.order_by(desc(sort_col))
    else:
        query = query.order_by(sort_col)
    
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return GrievanceListResponse(
        items=[_to_response(g, db) for g in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
):
    """Get officer dashboard summary statistics."""
    total = db.query(Grievance).count()
    
    # By priority
    critical = db.query(Grievance).filter(Grievance.priority_level == "CRITICAL").count()
    high = db.query(Grievance).filter(Grievance.priority_level == "HIGH").count()
    medium = db.query(Grievance).filter(Grievance.priority_level == "MEDIUM").count()
    low = db.query(Grievance).filter(Grievance.priority_level == "LOW").count()
    
    # SLA risks
    now = datetime.now(timezone.utc)
    sla_at_risk = db.query(Grievance).filter(
        Grievance.sla_deadline.isnot(None),
        Grievance.sla_deadline <= now,
        Grievance.state.notin_([GrievanceState.CLOSED.value, GrievanceState.CITIZEN_CONFIRMED.value, GrievanceState.RESOLVED.value])
    ).count()
    
    # Pending clarification
    pending_clar = db.query(Grievance).filter(
        Grievance.state == GrievanceState.CLARIFICATION_REQUIRED.value
    ).count()
    
    # Resolved today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    resolved_today = db.query(Grievance).filter(
        Grievance.resolved_at >= today_start
    ).count()
    
    # Pending confirmation
    pending_confirm = db.query(Grievance).filter(
        Grievance.state == GrievanceState.RESOLVED.value
    ).count()
    
    # By category
    by_category = {}
    for cat in GrievanceCategory:
        count = db.query(Grievance).filter(Grievance.category == cat.value).count()
        if count > 0:
            by_category[cat.value] = count
    
    # By state
    by_state = {}
    for state in GrievanceState:
        count = db.query(Grievance).filter(Grievance.state == state.value).count()
        if count > 0:
            by_state[state.value] = count
    
    return DashboardStats(
        total_grievances=total,
        critical=critical,
        high=high,
        medium=medium,
        low=low,
        sla_risks=sla_at_risk,
        emerging_issues=0,  # Computed separately
        pending_clarification=pending_clar,
        resolved_today=resolved_today,
        pending_confirmation=pending_confirm,
        by_category=by_category,
        by_state=by_state,
    )


@router.get("/{grievance_id}", response_model=GrievanceResponse)
async def get_grievance(
    grievance_id: str,
    db: Session = Depends(get_db),
):
    """Get grievance by display ID (e.g., TN-WTR-10482)."""
    g = db.query(Grievance).filter(Grievance.grievance_id == grievance_id).first()
    if not g:
        # Try by numeric ID
        try:
            g = db.query(Grievance).filter(Grievance.id == int(grievance_id)).first()
        except ValueError:
            pass
    if not g:
        raise HTTPException(status_code=404, detail="Grievance not found")
    return _to_response(g, db)


@router.patch("/{grievance_id}", response_model=GrievanceResponse)
async def update_grievance(
    grievance_id: str,
    request: GrievanceUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update grievance fields."""
    g = db.query(Grievance).filter(Grievance.grievance_id == grievance_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grievance not found")
    
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(g, field, value)
    
    g.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(g)
    
    return _to_response(g, db)


@router.post("/{grievance_id}/clarification", response_model=GrievanceResponse)
async def submit_clarification(
    grievance_id: str,
    answers: list[ClarificationAnswer],
    db: Session = Depends(get_db),
):
    """Submit clarification answers and re-process extraction."""
    g = db.query(Grievance).filter(Grievance.grievance_id == grievance_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grievance not found")
    
    # Apply answers to extraction
    from app.models.schemas import GrievanceExtraction
    current_extraction = GrievanceExtraction(**(g.extraction_json or {}))
    
    answer_dicts = [a.model_dump() for a in answers]
    updated_extraction = apply_clarification_answers(current_extraction, answer_dicts)
    
    # Update grievance
    g.extraction_json = updated_extraction.model_dump()
    g.category = updated_extraction.category or g.category
    g.subcategory = updated_extraction.subcategory or g.subcategory
    g.issue = updated_extraction.issue or g.issue
    g.location_name = updated_extraction.location_name or g.location_name
    g.duration_days = updated_extraction.duration_days or g.duration_days
    g.affected_population = updated_extraction.affected_population or g.affected_population
    g.previous_complaint = updated_extraction.previous_complaint
    g.updated_at = datetime.now(timezone.utc)
    
    # Re-classify if we were in CLARIFICATION_REQUIRED
    if g.state == GrievanceState.CLARIFICATION_REQUIRED.value:
        try:
            transition(db, g, GrievanceState.CLASSIFIED, notes="Clarification provided")
        except StateMachineError:
            pass
    
    db.commit()
    db.refresh(g)
    
    return _to_response(g, db)


@router.post("/{grievance_id}/validate", response_model=GrievanceResponse)
async def validate_grievance(
    grievance_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_user),
):
    """Trigger validation, routing, priority, and SLA calculation."""
    g = db.query(Grievance).filter(Grievance.grievance_id == grievance_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grievance not found")
    
    extraction = GrievanceExtraction(**(g.extraction_json or {}))
    
    # Priority
    priority = calculate_priority(extraction)
    g.priority_score = priority.total_score
    g.priority_level = priority.level
    g.priority_breakdown = priority.model_dump()
    
    # Route
    routing = route_grievance(db, g.category, g.subcategory)
    g.department_id = routing.department_id
    g.assigned_officer_id = routing.officer_id
    
    # SLA and Authority Assignment
    assign_initial_authority(db, g)
    
    # State transitions
    try:
        if g.state == GrievanceState.CLASSIFIED.value:
            transition(db, g, GrievanceState.VALIDATED, actor_id=user.id if user else None, notes="Validated")
            transition(db, g, GrievanceState.ROUTED, actor_id=user.id if user else None, notes=f"Routed to {routing.department_name}")
    except StateMachineError:
        pass
    
    db.commit()
    db.refresh(g)
    
    return _to_response(g, db)


@router.post("/{grievance_id}/evidence", response_model=EvidenceResponse)
async def upload_evidence(
    grievance_id: str,
    file: UploadFile = File(...),
    evidence_type: str = Form("PHOTO"),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db: Session = Depends(get_db),
):
    """Upload evidence attachment."""
    import os, hashlib
    from app.config import get_settings
    
    settings = get_settings()
    
    g = db.query(Grievance).filter(Grievance.grievance_id == grievance_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grievance not found")
    
    # Save file
    content = await file.read()
    file_hash = hashlib.sha256(content).hexdigest()
    
    ext = os.path.splitext(file.filename)[1] if file.filename else ".bin"
    save_name = f"{g.grievance_id}_{file_hash[:8]}{ext}"
    save_path = os.path.join(settings.UPLOAD_DIR, "evidence", save_name)
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    
    with open(save_path, "wb") as f:
        f.write(content)
    
    evidence = Evidence(
        grievance_id=g.id,
        type=evidence_type,
        file_path=save_path,
        file_name=file.filename,
        mime_type=file.content_type,
        file_size=len(content),
        sha256=file_hash,
        captured_at=datetime.now(timezone.utc),
        captured_by="operator",
        latitude=latitude,
        longitude=longitude,
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    
    return EvidenceResponse.model_validate(evidence)


# ─── Workflow routes ──────────────────────────────────────

@router.post("/{grievance_id}/acknowledge", response_model=GrievanceResponse)
async def acknowledge_grievance(
    grievance_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_user),
):
    """Officer acknowledges the grievance."""
    g = db.query(Grievance).filter(Grievance.grievance_id == grievance_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grievance not found")
    
    try:
        transition(db, g, GrievanceState.ACKNOWLEDGED,
                   actor_id=user.id if user else None,
                   actor_role=user.role if user else None,
                   notes="Acknowledged by officer")
    except StateMachineError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    db.commit()
    db.refresh(g)
    return _to_response(g, db)


@router.post("/{grievance_id}/start", response_model=GrievanceResponse)
async def start_progress(
    grievance_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_user),
):
    """Move grievance to IN_PROGRESS."""
    g = db.query(Grievance).filter(Grievance.grievance_id == grievance_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grievance not found")
    
    try:
        transition(db, g, GrievanceState.IN_PROGRESS,
                   actor_id=user.id if user else None,
                   notes="Work started")
    except StateMachineError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    db.commit()
    db.refresh(g)
    return _to_response(g, db)


@router.post("/{grievance_id}/resolve", response_model=GrievanceResponse)
async def resolve_grievance(
    grievance_id: str,
    request: ResolveRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_user),
):
    """Officer resolves the grievance."""
    g = db.query(Grievance).filter(Grievance.grievance_id == grievance_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grievance not found")
    
    g.resolution_notes = request.resolution_notes
    
    try:
        transition(db, g, GrievanceState.RESOLVED,
                   actor_id=user.id if user else None,
                   actor_role=user.role if user else None,
                   notes=request.resolution_notes)
    except StateMachineError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    db.commit()
    db.refresh(g)
    return _to_response(g, db)


@router.post("/{grievance_id}/confirm", response_model=GrievanceResponse)
async def confirm_resolution(
    grievance_id: str,
    request: ConfirmRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_user),
):
    """Citizen confirms or rejects resolution."""
    g = db.query(Grievance).filter(Grievance.grievance_id == grievance_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grievance not found")
    
    g.citizen_feedback = request.feedback
    
    try:
        if request.confirmed:
            transition(db, g, GrievanceState.CITIZEN_CONFIRMED,
                       actor_id=user.id if user else None,
                       notes="Citizen confirmed resolution")
            transition(db, g, GrievanceState.CLOSED,
                       notes="Closed after citizen confirmation")
        else:
            transition(db, g, GrievanceState.REJECTED_BY_CITIZEN,
                       actor_id=user.id if user else None,
                       notes=f"Citizen rejected: {request.feedback}")
            transition(db, g, GrievanceState.REOPENED,
                       notes="Reopened after citizen rejection")
    except StateMachineError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    db.commit()
    db.refresh(g)
    return _to_response(g, db)
