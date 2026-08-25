"""Pydantic schemas for API request/response validation."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.enums import (
    GrievanceState, GrievanceCategory, Priority, UserRole,
    EvidenceType, Intent, SLARisk
)


# ─── Auth ────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


# ─── User ────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: int
    username: str
    name: str
    name_ta: Optional[str] = None
    role: str
    phone: Optional[str] = None
    email: Optional[str] = None
    department_id: Optional[int] = None

    class Config:
        from_attributes = True


# ─── Voice / ASR ─────────────────────────────────────────

class TranscribeRequest(BaseModel):
    """Direct text input as alternative to audio."""
    text: Optional[str] = None
    language: str = "ta"


class TranscribeResponse(BaseModel):
    text: str
    language: str = "ta"
    confidence: float = 0.0
    normalized_text: Optional[str] = None


class VoiceAnalyzeResponse(BaseModel):
    transcript: TranscribeResponse
    extraction: "GrievanceExtraction"
    confidence: "ConfidenceScores"
    clarification_needed: bool = False
    clarification: Optional["ClarificationResponse"] = None
    multi_issues: Optional[list["GrievanceExtraction"]] = None


# ─── AI Extraction ───────────────────────────────────────

class GrievanceExtraction(BaseModel):
    """Structured extraction from citizen speech — validated by Pydantic."""
    intent: str = Field(default="GRIEVANCE", description="GRIEVANCE or SERVICE_NEED")
    category: Optional[str] = Field(default=None, description="One of: WATER, ROADS, ELECTRICITY, SANITATION, GOVERNMENT_SERVICES")
    subcategory: Optional[str] = Field(default=None, description="Subcategory within the category")
    issue: Optional[str] = Field(default=None, description="Brief English issue description")
    issue_ta: Optional[str] = Field(default=None, description="Tamil issue description")
    location_name: Optional[str] = Field(default=None, description="Location name extracted")
    district: Optional[str] = Field(default=None)
    duration_days: Optional[int] = Field(default=None, ge=0)
    affected_population: Optional[int] = Field(default=None, ge=0)
    previous_complaint: bool = Field(default=False)
    urgency_signals: Optional[list[str]] = Field(default=None, description="Urgency indicators detected")
    entities: Optional[dict] = Field(default=None, description="Named entities extracted")


class ConfidenceScores(BaseModel):
    """Per-field confidence scores from AI extraction."""
    overall: float = Field(default=0.0, ge=0.0, le=1.0)
    transcript: float = Field(default=0.0, ge=0.0, le=1.0)
    category: float = Field(default=0.0, ge=0.0, le=1.0)
    subcategory: float = Field(default=0.0, ge=0.0, le=1.0)
    issue: float = Field(default=0.0, ge=0.0, le=1.0)
    location: float = Field(default=0.0, ge=0.0, le=1.0)
    duration: float = Field(default=0.0, ge=0.0, le=1.0)
    previous_complaint: float = Field(default=0.0, ge=0.0, le=1.0)


class ClarificationField(BaseModel):
    """A single field requiring clarification."""
    field: str
    status: str  # "missing", "low_confidence", "ambiguous"
    question_ta: str  # Tamil question to ask
    question_en: str  # English question
    options: Optional[list[str]] = None  # Multiple choice if applicable
    current_value: Optional[str] = None
    confidence: Optional[float] = None


class ClarificationResponse(BaseModel):
    """Clarification needs for a grievance."""
    needs_clarification: bool = False
    fields: list[ClarificationField] = []
    total_missing: int = 0
    total_low_confidence: int = 0


class ClarificationAnswer(BaseModel):
    """Citizen's answer to a clarification question."""
    field: str
    value: str
    source: str = "voice"  # "voice", "text", "selection"


# ─── Grievance CRUD ──────────────────────────────────────

class GrievanceCreateRequest(BaseModel):
    """Create a grievance from extraction data."""
    transcript: Optional[str] = None
    normalized_text: Optional[str] = None
    extraction: Optional[GrievanceExtraction] = None
    confidence: Optional[ConfidenceScores] = None
    citizen_id: Optional[int] = None
    operator_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class GrievanceUpdateRequest(BaseModel):
    """Update grievance fields."""
    category: Optional[str] = None
    subcategory: Optional[str] = None
    issue: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    duration_days: Optional[int] = None
    affected_population: Optional[int] = None
    previous_complaint: Optional[bool] = None


class GrievanceResponse(BaseModel):
    """Full grievance response."""
    id: int
    grievance_id: str
    state: str
    intent: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    issue: Optional[str] = None
    issue_ta: Optional[str] = None
    location_name: Optional[str] = None
    location_ta: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    district: Optional[str] = None
    duration_days: Optional[int] = None
    affected_population: Optional[int] = None
    previous_complaint: bool = False
    transcript: Optional[str] = None
    normalized_text: Optional[str] = None
    extraction_json: Optional[dict] = None
    confidence_json: Optional[dict] = None
    clarification_json: Optional[dict] = None
    priority_score: Optional[int] = None
    priority_level: Optional[str] = None
    priority_breakdown: Optional[dict] = None
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    assigned_officer_id: Optional[int] = None
    assigned_officer_name: Optional[str] = None
    citizen_id: Optional[int] = None
    citizen_name: Optional[str] = None
    sla_deadline: Optional[datetime] = None
    sla_hours: Optional[int] = None
    sla_risk: Optional[str] = None
    sla_started_at: Optional[datetime] = None
    sla_status: Optional[str] = None
    sla_breached_at: Optional[datetime] = None
    sla_progress_pct: Optional[float] = None
    time_remaining_hours: Optional[float] = None
    current_authority_level: Optional[int] = None
    current_authority_name: Optional[str] = None
    current_authority_name_ta: Optional[str] = None
    assigned_at: Optional[datetime] = None
    escalation_count: Optional[int] = None
    escalated_at: Optional[datetime] = None
    escalation_reason: Optional[str] = None
    last_action_at: Optional[datetime] = None
    last_action_note: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    citizen_feedback: Optional[str] = None
    citizen_confirmed_at: Optional[datetime] = None
    events: Optional[list["GrievanceEventResponse"]] = None
    evidence: Optional[list["EvidenceResponse"]] = None
    authority_history: Optional[list["AuthorityAssignmentResponse"]] = None
    authority_chain: Optional[list[dict]] = None
    similar_count: Optional[int] = None
    cluster_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GrievanceListResponse(BaseModel):
    """Paginated grievance list."""
    items: list[GrievanceResponse]
    total: int
    page: int = 1
    page_size: int = 20


class GrievanceEventResponse(BaseModel):
    """A single event in grievance history."""
    id: int
    from_state: Optional[str] = None
    to_state: str
    actor_id: Optional[int] = None
    actor_role: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Evidence ────────────────────────────────────────────

class EvidenceResponse(BaseModel):
    id: int
    grievance_id: int
    type: str
    file_name: Optional[str] = None
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    captured_at: Optional[datetime] = None
    captured_by: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AuthorityAssignmentResponse(BaseModel):
    """A record of authority ownership."""
    id: int
    authority_level: int
    authority_name: str
    authority_name_ta: Optional[str] = None
    assigned_officer_id: Optional[int] = None
    department_id: Optional[int] = None
    assigned_at: Optional[datetime] = None
    sla_hours: Optional[int] = None
    sla_deadline: Optional[datetime] = None
    sla_status: Optional[str] = None
    result: Optional[str] = None
    escalated_at: Optional[datetime] = None
    escalation_reason: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Priority ────────────────────────────────────────────

class PriorityCalculation(BaseModel):
    """Deterministic priority score breakdown."""
    safety_risk: int = 0
    essential_service: int = 0
    duration_score: int = 0
    previous_complaint_score: int = 0
    population_score: int = 0
    total_score: int = 0
    level: str = "LOW"


# ─── Routing ─────────────────────────────────────────────

class RoutingResult(BaseModel):
    """Department and officer assignment."""
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    department_code: Optional[str] = None
    officer_id: Optional[int] = None
    officer_name: Optional[str] = None
    confidence: float = 1.0
    rule_applied: Optional[str] = None


# ─── Intelligence ────────────────────────────────────────

class SimilarGrievance(BaseModel):
    """A similar grievance with similarity score."""
    grievance_id: str
    category: Optional[str] = None
    issue: Optional[str] = None
    location_name: Optional[str] = None
    similarity_score: float
    distance_km: Optional[float] = None
    created_at: Optional[datetime] = None


class ClusterInfo(BaseModel):
    """A complaint cluster."""
    cluster_id: int
    category: Optional[str] = None
    center_lat: Optional[float] = None
    center_lng: Optional[float] = None
    radius_km: Optional[float] = None
    complaint_count: int
    time_window_hours: Optional[float] = None
    is_emerging: bool = False
    severity: Optional[str] = None
    description: Optional[str] = None
    grievance_ids: list[str] = []


class EmergingIssue(BaseModel):
    """An emerging civic issue detected from clustering."""
    issue_id: int
    category: str
    location: str
    complaint_count: int
    growth_rate: float  # complaints per hour
    radius_km: float
    time_window_hours: float
    description: str
    description_ta: Optional[str] = None
    severity: str
    grievance_ids: list[str] = []


class HeatmapPoint(BaseModel):
    """A point for heatmap visualization."""
    latitude: float
    longitude: float
    weight: float = 1.0
    category: Optional[str] = None


class SLARiskItem(BaseModel):
    """A grievance with SLA risk info."""
    grievance_id: str
    category: Optional[str] = None
    priority_level: Optional[str] = None
    department: Optional[str] = None
    sla_deadline: Optional[datetime] = None
    hours_remaining: Optional[float] = None
    risk_level: str  # GREEN, AMBER, RED
    assigned_officer: Optional[str] = None


# ─── Schemes ─────────────────────────────────────────────

class SchemeMatchRequest(BaseModel):
    """Request to match citizen need to schemes."""
    text: Optional[str] = None
    category: Optional[str] = None
    citizen_input: Optional[dict] = None


class SchemeResponse(BaseModel):
    """A government scheme."""
    id: int
    scheme_id: str
    name: str
    name_ta: Optional[str] = None
    category: str
    description: Optional[str] = None
    description_ta: Optional[str] = None
    eligibility_rules: Optional[list] = None
    required_documents: Optional[list] = None
    application_channel: Optional[str] = None
    benefits: Optional[str] = None
    benefits_ta: Optional[str] = None
    is_active: bool = True

    class Config:
        from_attributes = True


class SchemeAssessmentResponse(BaseModel):
    """Preliminary eligibility assessment."""
    scheme: SchemeResponse
    result: str  # POTENTIALLY_ELIGIBLE, NOT_ELIGIBLE, INCOMPLETE
    matched_rules: list = []
    unmatched_rules: list = []
    missing_info: list = []
    explanation: Optional[str] = None
    explanation_ta: Optional[str] = None


# ─── Workflow ────────────────────────────────────────────

class StatusUpdateRequest(BaseModel):
    """Update grievance status."""
    status: str
    notes: Optional[str] = None


class ResolveRequest(BaseModel):
    """Resolve a grievance."""
    resolution_notes: str
    evidence_ids: Optional[list[int]] = None


class ConfirmRequest(BaseModel):
    """Citizen confirmation/rejection."""
    confirmed: bool
    feedback: Optional[str] = None


# ─── Dashboard ───────────────────────────────────────────

class DashboardStats(BaseModel):
    """Officer dashboard summary statistics."""
    total_grievances: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    sla_risks: int = 0
    emerging_issues: int = 0
    pending_clarification: int = 0
    resolved_today: int = 0
    pending_confirmation: int = 0
    by_category: dict = {}
    by_state: dict = {}
