"""Escalation engine — configurable authority hierarchy and automatic escalation.

Reads escalation_rules.json for authority chains.
Performs idempotent escalation: checks before acting.
Preserves full ownership history in AuthorityAssignment table.
"""

import json
import os
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.database import Grievance, GrievanceEvent, AuthorityAssignment, Notification
from app.models.enums import GrievanceState
from app.core.state_machine import transition, can_transition, StateMachineError

logger = logging.getLogger(__name__)

# Load escalation rules
_rules_path = os.path.join(os.path.dirname(__file__), "..", "rules", "escalation_rules.json")
with open(_rules_path, "r", encoding="utf-8") as f:
    ESCALATION_RULES = json.load(f)


def get_authority_chain(category: str) -> list[dict]:
    """Get the full authority escalation chain for a category.
    
    Returns list of authority levels with name, name_ta, role, sla_hours.
    """
    chains = ESCALATION_RULES.get("authority_chains", {})
    chain_config = chains.get(category, chains.get("GOVERNMENT_SERVICES", {}))
    return chain_config.get("chain", [])


def get_authority_at_level(category: str, level: int) -> dict | None:
    """Get authority info for a specific level in the chain."""
    chain = get_authority_chain(category)
    for authority in chain:
        if authority["level"] == level:
            return authority
    return None


def get_next_authority(category: str, current_level: int) -> dict | None:
    """Get the next escalation target above the current level."""
    chain = get_authority_chain(category)
    for authority in chain:
        if authority["level"] > current_level:
            return authority
    return None  # Already at highest level


def get_max_level(category: str) -> int:
    """Get the highest authority level for a category."""
    chain = get_authority_chain(category)
    return max((a["level"] for a in chain), default=1)


def get_sla_for_level(category: str, level: int, priority_level: str) -> int:
    """Get the SLA hours for a specific authority level and priority."""
    authority = get_authority_at_level(category, level)
    if authority and "sla_hours" in authority:
        return authority["sla_hours"].get(priority_level, 168)
    return 168  # Default 7 days


def assign_initial_authority(
    db: Session,
    grievance: Grievance,
) -> AuthorityAssignment:
    """Assign the first authority level to a grievance.
    
    Called when a grievance is first routed.
    """
    category = grievance.category or "GOVERNMENT_SERVICES"
    priority = grievance.priority_level or "MEDIUM"
    authority = get_authority_at_level(category, 1)
    
    if not authority:
        authority = {
            "level": 1,
            "name": "Initial Authority",
            "name_ta": "ஆரம்ப அதிகாரம்",
            "role": "OFFICER",
        }
    
    sla_hours = get_sla_for_level(category, 1, priority)
    now = datetime.now(timezone.utc)
    sla_deadline = now + timedelta(hours=sla_hours)
    
    # Update grievance
    grievance.current_authority_level = 1
    grievance.current_authority_name = authority["name"]
    grievance.current_authority_name_ta = authority.get("name_ta")
    grievance.assigned_at = now
    grievance.sla_started_at = now
    grievance.sla_deadline = sla_deadline
    grievance.sla_hours = sla_hours
    grievance.sla_status = "WITHIN_SLA"
    grievance.last_action_at = now
    grievance.last_action_note = f"Assigned to {authority['name']}"
    
    # Create authority assignment record
    assignment = AuthorityAssignment(
        grievance_id=grievance.id,
        authority_level=1,
        authority_name=authority["name"],
        authority_name_ta=authority.get("name_ta"),
        assigned_officer_id=grievance.assigned_officer_id,
        department_id=grievance.department_id,
        assigned_at=now,
        sla_hours=sla_hours,
        sla_deadline=sla_deadline,
        sla_status="WITHIN_SLA",
        result="ACTIVE",
        notes=f"Initial assignment to {authority['name']}",
    )
    db.add(assignment)
    db.flush()
    
    logger.info(f"Grievance {grievance.grievance_id}: Assigned to Level 1 — {authority['name']}")
    return assignment


def escalate_grievance(
    db: Session,
    grievance: Grievance,
    reason: str = "SLA deadline exceeded",
) -> bool:
    """Escalate a grievance to the next authority level.
    
    Idempotent: checks current state before escalating.
    Preserves previous assignment history.
    Returns True if escalation was performed, False if skipped.
    """
    category = grievance.category or "GOVERNMENT_SERVICES"
    priority = grievance.priority_level or "MEDIUM"
    current_level = grievance.current_authority_level or 1
    max_level = get_max_level(category)
    
    # Guard: already at max level
    if current_level >= max_level:
        logger.warning(f"Grievance {grievance.grievance_id}: Already at max authority level {current_level}")
        return False
    
    next_authority = get_next_authority(category, current_level)
    if not next_authority:
        logger.warning(f"Grievance {grievance.grievance_id}: No next authority found above level {current_level}")
        return False
    
    now = datetime.now(timezone.utc)
    
    # ─── 1. Close out the current authority assignment ───────
    current_assignment = (
        db.query(AuthorityAssignment)
        .filter(
            AuthorityAssignment.grievance_id == grievance.id,
            AuthorityAssignment.authority_level == current_level,
            AuthorityAssignment.result == "ACTIVE",
        )
        .first()
    )
    if current_assignment:
        current_assignment.result = "SLA_BREACHED"
        current_assignment.sla_status = "BREACHED"
        current_assignment.escalated_at = now
        current_assignment.escalation_reason = reason
    
    # ─── 2. Create new authority assignment ─────────────────
    new_level = next_authority["level"]
    new_sla_hours = get_sla_for_level(category, new_level, priority)
    new_deadline = now + timedelta(hours=new_sla_hours)
    
    new_assignment = AuthorityAssignment(
        grievance_id=grievance.id,
        authority_level=new_level,
        authority_name=next_authority["name"],
        authority_name_ta=next_authority.get("name_ta"),
        assigned_officer_id=grievance.assigned_officer_id,
        department_id=grievance.department_id,
        assigned_at=now,
        sla_hours=new_sla_hours,
        sla_deadline=new_deadline,
        sla_status="WITHIN_SLA",
        result="ACTIVE",
        notes=f"Escalated from Level {current_level} due to: {reason}",
    )
    db.add(new_assignment)
    
    # ─── 3. Update grievance ───────────────────────────────
    prev_authority = grievance.current_authority_name or f"Level {current_level}"
    
    grievance.current_authority_level = new_level
    grievance.current_authority_name = next_authority["name"]
    grievance.current_authority_name_ta = next_authority.get("name_ta")
    grievance.assigned_at = now
    grievance.sla_started_at = now
    grievance.sla_deadline = new_deadline
    grievance.sla_hours = new_sla_hours
    grievance.sla_status = "WITHIN_SLA"
    grievance.sla_breached_at = now
    grievance.escalation_count = (grievance.escalation_count or 0) + 1
    grievance.escalated_at = now
    grievance.escalation_reason = reason
    grievance.last_action_at = now
    grievance.last_action_note = f"Escalated to {next_authority['name']}"
    
    # ─── 4. Create escalation event ────────────────────────
    event = GrievanceEvent(
        grievance_id=grievance.id,
        from_state=grievance.state,
        to_state="ESCALATED",
        notes=f"SLA Breached at Level {current_level} ({prev_authority}). Escalated to Level {new_level} ({next_authority['name']}). Reason: {reason}",
        metadata_json={
            "escalation_type": "auto",
            "from_level": current_level,
            "to_level": new_level,
            "from_authority": prev_authority,
            "to_authority": next_authority["name"],
            "reason": reason,
        },
        created_at=now,
    )
    db.add(event)
    
    # Try state transition if valid
    try:
        if can_transition(grievance, GrievanceState.ESCALATED):
            grievance.state = GrievanceState.ESCALATED.value
        elif can_transition(grievance, GrievanceState.SLA_WARNING):
            grievance.state = GrievanceState.SLA_WARNING.value
    except Exception:
        pass  # State transition is best-effort; escalation must succeed
    
    grievance.updated_at = now
    
    # ─── 5. Create notifications ───────────────────────────
    # Notify citizen
    if grievance.citizen_id:
        db.add(Notification(
            user_id=grievance.citizen_id,
            grievance_id=grievance.id,
            title="Complaint Escalated",
            message=f"Your complaint {grievance.grievance_id} has been escalated to {next_authority['name']} as it was not resolved within the deadline.",
            message_ta=f"உங்கள் புகார் {grievance.grievance_id} காலக்கெடுவிற்குள் தீர்க்கப்படாததால் {next_authority.get('name_ta', next_authority['name'])} -க்கு அனுப்பப்பட்டுள்ளது.",
            type="ESCALATION",
        ))
    
    # Notify assigned officer
    if grievance.assigned_officer_id:
        db.add(Notification(
            user_id=grievance.assigned_officer_id,
            grievance_id=grievance.id,
            title="Complaint Escalated — SLA Breached",
            message=f"Complaint {grievance.grievance_id} SLA breached at Level {current_level}. Escalated to Level {new_level} ({next_authority['name']}).",
            type="SLA_BREACH",
        ))
    
    db.flush()
    
    logger.info(
        f"Grievance {grievance.grievance_id}: ESCALATED Level {current_level} → Level {new_level} "
        f"({prev_authority} → {next_authority['name']})"
    )
    return True


def send_sla_warning(
    db: Session,
    grievance: Grievance,
) -> bool:
    """Send SLA warning notification when deadline is approaching.
    
    Idempotent: only sends if sla_status is still WITHIN_SLA.
    """
    if grievance.sla_status != "WITHIN_SLA":
        return False  # Already warned or breached
    
    now = datetime.now(timezone.utc)
    
    grievance.sla_status = "WARNING"
    grievance.last_action_at = now
    grievance.last_action_note = "SLA deadline approaching — warning issued"
    
    # Update current assignment
    current_assignment = (
        db.query(AuthorityAssignment)
        .filter(
            AuthorityAssignment.grievance_id == grievance.id,
            AuthorityAssignment.result == "ACTIVE",
        )
        .first()
    )
    if current_assignment:
        current_assignment.sla_status = "WARNING"
    
    # Try state transition
    try:
        if can_transition(grievance, GrievanceState.SLA_WARNING):
            event = GrievanceEvent(
                grievance_id=grievance.id,
                from_state=grievance.state,
                to_state=GrievanceState.SLA_WARNING.value,
                notes=f"SLA deadline approaching for {grievance.current_authority_name or 'current authority'}",
                created_at=now,
            )
            db.add(event)
            grievance.state = GrievanceState.SLA_WARNING.value
    except Exception:
        pass
    
    # Notify officer
    if grievance.assigned_officer_id:
        db.add(Notification(
            user_id=grievance.assigned_officer_id,
            grievance_id=grievance.id,
            title="⚠ SLA Deadline Approaching",
            message=f"Complaint {grievance.grievance_id} must be resolved within 24 hours.",
            type="SLA_WARNING",
        ))
    
    # Notify citizen
    if grievance.citizen_id:
        db.add(Notification(
            user_id=grievance.citizen_id,
            grievance_id=grievance.id,
            title="Resolution Update",
            message=f"Your complaint {grievance.grievance_id} is approaching its expected resolution date.",
            message_ta=f"உங்கள் புகார் {grievance.grievance_id} எதிர்பார்க்கப்படும் தீர்வு தேதியை நெருங்குகிறது.",
            type="SLA_WARNING",
        ))
    
    db.flush()
    logger.info(f"Grievance {grievance.grievance_id}: SLA WARNING issued")
    return True
