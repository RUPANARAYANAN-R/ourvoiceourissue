import asyncio
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.database import Grievance
from app.models.enums import GrievanceState
from app.core.escalation import escalate_grievance, send_sla_warning

logger = logging.getLogger(__name__)

async def run_sla_monitor():
    """Background task to continuously monitor SLAs and trigger escalations."""
    logger.info("Starting background SLA Monitor...")
    
    while True:
        try:
            # We run the check every 1 minute
            check_slas()
        except Exception as e:
            logger.error(f"Error in SLA monitor: {e}")
            
        await asyncio.sleep(60)


def check_slas():
    """Check database for approaching or breached SLAs and act."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        warning_threshold = now + timedelta(hours=24)
        
        # 1. Find breached SLAs (deadline in past, not yet escalated/resolved)
        # We exclude CLOSED, RESOLVED, CITIZEN_CONFIRMED, REJECTED_BY_CITIZEN
        terminal_states = [
            GrievanceState.CLOSED.value, 
            GrievanceState.RESOLVED.value, 
            GrievanceState.CITIZEN_CONFIRMED.value,
            GrievanceState.REJECTED_BY_CITIZEN.value,
            GrievanceState.DRAFT.value,
            GrievanceState.CREATED.value,
            GrievanceState.CLASSIFIED.value,
            GrievanceState.CLARIFICATION_REQUIRED.value,
        ]
        
        breached = db.query(Grievance).filter(
            Grievance.sla_deadline <= now,
            Grievance.sla_status != "BREACHED",
            Grievance.state.notin_(terminal_states)
        ).all()
        
        for g in breached:
            logger.info(f"SLA Monitor: Grievance {g.grievance_id} breached SLA deadline ({g.sla_deadline}). Triggering escalation.")
            escalated = escalate_grievance(db, g, reason="Automated SLA timeout")
            if escalated:
                db.commit()
            
        # 2. Find approaching SLAs (< 24h away, not yet warned/breached)
        warnings = db.query(Grievance).filter(
            Grievance.sla_deadline > now,
            Grievance.sla_deadline <= warning_threshold,
            Grievance.sla_status == "WITHIN_SLA",
            Grievance.state.notin_(terminal_states)
        ).all()
        
        for g in warnings:
            logger.info(f"SLA Monitor: Grievance {g.grievance_id} approaching SLA deadline ({g.sla_deadline}). Issuing warning.")
            warned = send_sla_warning(db, g)
            if warned:
                db.commit()
                
    finally:
        db.close()
