"""Grievance state machine — validates all state transitions.

Prevents invalid transitions. Creates audit trail events.
LLM cannot directly change state — only deterministic rules.
"""

import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.enums import GrievanceState, VALID_TRANSITIONS
from app.models.database import Grievance, GrievanceEvent

logger = logging.getLogger(__name__)


class StateMachineError(Exception):
    """Raised when an invalid state transition is attempted."""
    pass


def transition(
    db: Session,
    grievance: Grievance,
    new_state: GrievanceState,
    actor_id: int = None,
    actor_role: str = None,
    notes: str = None,
    metadata: dict = None,
) -> Grievance:
    """Transition a grievance to a new state.
    
    Validates the transition against the state machine graph.
    Creates an audit event. Raises StateMachineError if invalid.
    """
    current_state = GrievanceState(grievance.state)
    
    # Validate transition
    valid_next = VALID_TRANSITIONS.get(current_state, [])
    if new_state not in valid_next:
        raise StateMachineError(
            f"Invalid transition: {current_state.value} → {new_state.value}. "
            f"Valid transitions from {current_state.value}: {[s.value for s in valid_next]}"
        )
    
    # Create event
    event = GrievanceEvent(
        grievance_id=grievance.id,
        from_state=current_state.value,
        to_state=new_state.value,
        actor_id=actor_id,
        actor_role=actor_role,
        notes=notes,
        metadata_json=metadata,
        created_at=datetime.now(timezone.utc),
    )
    db.add(event)
    
    # Update grievance
    grievance.state = new_state.value
    grievance.updated_at = datetime.now(timezone.utc)
    
    # Handle special state transitions
    if new_state == GrievanceState.RESOLVED:
        grievance.resolved_at = datetime.now(timezone.utc)
    elif new_state == GrievanceState.CITIZEN_CONFIRMED:
        grievance.citizen_confirmed_at = datetime.now(timezone.utc)
    
    db.flush()
    logger.info(f"Grievance {grievance.grievance_id}: {current_state.value} → {new_state.value}")
    
    return grievance


def can_transition(grievance: Grievance, new_state: GrievanceState) -> bool:
    """Check if a transition is valid without performing it."""
    current_state = GrievanceState(grievance.state)
    valid_next = VALID_TRANSITIONS.get(current_state, [])
    return new_state in valid_next


def get_valid_transitions(grievance: Grievance) -> list[str]:
    """Get list of valid next states for a grievance."""
    current_state = GrievanceState(grievance.state)
    return [s.value for s in VALID_TRANSITIONS.get(current_state, [])]
