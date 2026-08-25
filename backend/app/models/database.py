"""SQLAlchemy database models for NammaKural."""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, DateTime, JSON,
    ForeignKey, Enum as SAEnum, Index
)
from sqlalchemy.orm import DeclarativeBase, relationship
from datetime import datetime, timezone


class Base(DeclarativeBase):
    """Base class for all models."""
    pass


class User(Base):
    """System users across all roles."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(200), nullable=False)
    name_ta = Column(String(200))  # Tamil name
    role = Column(String(20), nullable=False, index=True)
    phone = Column(String(20))
    email = Column(String(200))
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    department = relationship("Department", back_populates="users")
    grievances_created = relationship("Grievance", foreign_keys="Grievance.citizen_id", back_populates="citizen")
    grievances_assigned = relationship("Grievance", foreign_keys="Grievance.assigned_officer_id", back_populates="assigned_officer")


class Department(Base):
    """Government departments that handle grievances."""
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    name_ta = Column(String(200))  # Tamil name
    code = Column(String(20), unique=True, nullable=False)
    category = Column(String(50), nullable=False, index=True)
    head_officer_id = Column(Integer, nullable=True)
    sla_hours = Column(JSON)  # {"CRITICAL": 24, "HIGH": 72, "MEDIUM": 168, "LOW": 336}
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    users = relationship("User", back_populates="department")
    grievances = relationship("Grievance", back_populates="department")


class Grievance(Base):
    """Core grievance record."""
    __tablename__ = "grievances"

    id = Column(Integer, primary_key=True, autoincrement=True)
    grievance_id = Column(String(20), unique=True, nullable=False, index=True)  # e.g., TN-WTR-10482
    
    # People
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    
    # State
    state = Column(String(30), nullable=False, default="DRAFT", index=True)
    
    # Classification
    intent = Column(String(20), default="GRIEVANCE")
    category = Column(String(30), nullable=True, index=True)
    subcategory = Column(String(30), nullable=True)
    issue = Column(String(200), nullable=True)
    issue_ta = Column(String(200), nullable=True)  # Tamil description
    
    # Location
    location_name = Column(String(200), nullable=True)
    location_ta = Column(String(200), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    district = Column(String(100), nullable=True)
    ward = Column(String(100), nullable=True)
    
    # Details
    duration_days = Column(Integer, nullable=True)
    affected_population = Column(Integer, nullable=True)
    previous_complaint = Column(Boolean, default=False)
    previous_complaint_id = Column(String(20), nullable=True)
    
    # AI extraction
    transcript = Column(Text, nullable=True)
    normalized_text = Column(Text, nullable=True)
    extraction_json = Column(JSON, nullable=True)  # Raw AI extraction
    confidence_json = Column(JSON, nullable=True)  # Per-field confidence scores
    clarification_json = Column(JSON, nullable=True)  # Missing fields + questions
    
    # Priority (deterministic)
    priority_score = Column(Integer, nullable=True)
    priority_level = Column(String(10), nullable=True, index=True)
    priority_breakdown = Column(JSON, nullable=True)  # Score breakdown
    
    # SLA
    sla_deadline = Column(DateTime, nullable=True)
    sla_hours = Column(Integer, nullable=True)
    sla_started_at = Column(DateTime, nullable=True)
    sla_status = Column(String(20), default="WITHIN_SLA")  # WITHIN_SLA, WARNING, BREACHED
    sla_breached_at = Column(DateTime, nullable=True)
    
    # Authority tracking
    current_authority_level = Column(Integer, default=1)
    current_authority_name = Column(String(200), nullable=True)
    current_authority_name_ta = Column(String(200), nullable=True)
    assigned_at = Column(DateTime, nullable=True)
    
    # Escalation
    escalation_count = Column(Integer, default=0)
    escalated_at = Column(DateTime, nullable=True)
    escalation_reason = Column(Text, nullable=True)
    
    # Last meaningful action
    last_action_at = Column(DateTime, nullable=True)
    last_action_note = Column(Text, nullable=True)
    
    # Resolution
    resolution_notes = Column(Text, nullable=True)
    resolution_evidence_id = Column(Integer, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    citizen_feedback = Column(Text, nullable=True)
    citizen_confirmed_at = Column(DateTime, nullable=True)
    
    # Clustering
    cluster_id = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    citizen = relationship("User", foreign_keys=[citizen_id], back_populates="grievances_created")
    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id], back_populates="grievances_assigned")
    department = relationship("Department", back_populates="grievances")
    events = relationship("GrievanceEvent", back_populates="grievance", order_by="GrievanceEvent.created_at")
    evidence = relationship("Evidence", back_populates="grievance")
    voice_records = relationship("VoiceRecord", back_populates="grievance")
    embedding = relationship("GrievanceEmbedding", back_populates="grievance", uselist=False)
    authority_assignments = relationship("AuthorityAssignment", back_populates="grievance", order_by="AuthorityAssignment.assigned_at")

    # Indexes
    __table_args__ = (
        Index("ix_grievance_category_state", "category", "state"),
        Index("ix_grievance_location", "latitude", "longitude"),
        Index("ix_grievance_created", "created_at"),
    )


class GrievanceEvent(Base):
    """Audit trail of every state transition."""
    __tablename__ = "grievance_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    grievance_id = Column(Integer, ForeignKey("grievances.id"), nullable=False, index=True)
    from_state = Column(String(30), nullable=True)
    to_state = Column(String(30), nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_role = Column(String(20), nullable=True)
    notes = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    grievance = relationship("Grievance", back_populates="events")


class Evidence(Base):
    """Evidence attachments for grievances."""
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, autoincrement=True)
    grievance_id = Column(Integer, ForeignKey("grievances.id"), nullable=False, index=True)
    type = Column(String(20), nullable=False)  # VOICE, PHOTO, VIDEO, DOCUMENT, TRANSCRIPT
    file_path = Column(String(500), nullable=True)
    file_name = Column(String(200), nullable=True)
    mime_type = Column(String(100), nullable=True)
    file_size = Column(Integer, nullable=True)
    sha256 = Column(String(64), nullable=True)
    captured_at = Column(DateTime, nullable=True)
    captured_by = Column(String(20), nullable=True)  # "operator", "citizen", "officer"
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    grievance = relationship("Grievance", back_populates="evidence")


class VoiceRecord(Base):
    """Voice recordings with transcription data."""
    __tablename__ = "voice_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    grievance_id = Column(Integer, ForeignKey("grievances.id"), nullable=False, index=True)
    audio_path = Column(String(500), nullable=True)
    transcript = Column(Text, nullable=True)
    language = Column(String(10), default="ta")
    confidence = Column(Float, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    grievance = relationship("Grievance", back_populates="voice_records")


class GrievanceEmbedding(Base):
    """Vector embeddings for semantic similarity."""
    __tablename__ = "grievance_embeddings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    grievance_id = Column(Integer, ForeignKey("grievances.id"), nullable=False, unique=True, index=True)
    embedding_json = Column(JSON, nullable=False)  # Store as JSON array of floats
    model = Column(String(50), default="text-embedding-004")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    grievance = relationship("Grievance", back_populates="embedding")


class Scheme(Base):
    """Government schemes database."""
    __tablename__ = "schemes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scheme_id = Column(String(20), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    name_ta = Column(String(200), nullable=True)
    category = Column(String(30), nullable=False, index=True)
    description = Column(Text, nullable=True)
    description_ta = Column(Text, nullable=True)
    eligibility_rules = Column(JSON, nullable=True)  # Versioned rules
    required_documents = Column(JSON, nullable=True)
    application_channel = Column(String(200), nullable=True)
    benefits = Column(Text, nullable=True)
    benefits_ta = Column(Text, nullable=True)
    version = Column(Integer, default=1)
    effective_from = Column(DateTime, nullable=True)
    effective_to = Column(DateTime, nullable=True)
    source_url = Column(String(500), nullable=True)
    last_verified_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SchemeAssessment(Base):
    """Preliminary scheme eligibility assessments."""
    __tablename__ = "scheme_assessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scheme_id = Column(Integer, ForeignKey("schemes.id"), nullable=False)
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    citizen_input = Column(JSON, nullable=True)
    matched_rules = Column(JSON, nullable=True)
    unmatched_rules = Column(JSON, nullable=True)
    missing_info = Column(JSON, nullable=True)
    result = Column(String(30), nullable=True)  # POTENTIALLY_ELIGIBLE, NOT_ELIGIBLE, INCOMPLETE
    explanation = Column(Text, nullable=True)
    explanation_ta = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Notification(Base):
    """User notifications."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    grievance_id = Column(Integer, ForeignKey("grievances.id"), nullable=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    message_ta = Column(Text, nullable=True)
    type = Column(String(30), default="INFO")
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AuthorityAssignment(Base):
    """Tracks every authority that owned a grievance — preserves escalation history."""
    __tablename__ = "authority_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    grievance_id = Column(Integer, ForeignKey("grievances.id"), nullable=False, index=True)
    authority_level = Column(Integer, nullable=False)
    authority_name = Column(String(200), nullable=False)
    authority_name_ta = Column(String(200), nullable=True)
    assigned_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    assigned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    sla_hours = Column(Integer, nullable=True)
    sla_deadline = Column(DateTime, nullable=True)
    sla_status = Column(String(20), default="WITHIN_SLA")  # WITHIN_SLA, WARNING, BREACHED
    result = Column(String(30), nullable=True)  # ACTIVE, RESOLVED, SLA_BREACHED, ESCALATED
    escalated_at = Column(DateTime, nullable=True)
    escalation_reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    grievance = relationship("Grievance", back_populates="authority_assignments")

    __table_args__ = (
        Index("ix_auth_assign_grievance_level", "grievance_id", "authority_level"),
    )


class AuditLog(Base):
    """Comprehensive audit trail."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_role = Column(String(20), nullable=True)
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(50), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_audit_entity", "entity_type", "entity_id"),
        Index("ix_audit_actor", "actor_id", "created_at"),
    )
