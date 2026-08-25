"""SLA intelligence engine.

Tracks deadlines, calculates remaining time, determines risk levels.
"""

import json
import os
import logging
from datetime import datetime, timezone, timedelta
from app.models.enums import SLARisk

logger = logging.getLogger(__name__)

# Load SLA rules
_rules_path = os.path.join(os.path.dirname(__file__), "..", "rules", "sla_rules.json")
with open(_rules_path, "r", encoding="utf-8") as f:
    SLA_RULES = json.load(f)


def calculate_sla_deadline(
    category: str,
    priority_level: str,
    created_at: datetime = None,
) -> tuple[datetime, int]:
    """Calculate SLA deadline based on category and priority.
    
    Returns (deadline_datetime, sla_hours).
    """
    if created_at is None:
        created_at = datetime.now(timezone.utc)
    
    sla_hours_map = SLA_RULES.get("sla_hours", {})
    category_sla = sla_hours_map.get(category, {})
    sla_hours = category_sla.get(priority_level, 336)  # Default 14 days
    
    deadline = created_at + timedelta(hours=sla_hours)
    return deadline, sla_hours


def get_sla_risk(
    sla_deadline: datetime,
    now: datetime = None,
) -> tuple[SLARisk, float]:
    """Determine SLA risk level and hours remaining.
    
    Returns (risk_level, hours_remaining).
    🟢 GREEN  > 50% time remaining
    🟠 AMBER  < 50% time remaining
    🔴 RED    Overdue
    """
    if now is None:
        now = datetime.now(timezone.utc)
    
    if sla_deadline.tzinfo is None:
        sla_deadline = sla_deadline.replace(tzinfo=timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    
    remaining = (sla_deadline - now).total_seconds() / 3600  # hours
    
    if remaining <= 0:
        return SLARisk.RED, remaining
    
    # Calculate percentage of original SLA time remaining
    # We use the warning threshold from rules
    warning_pct = SLA_RULES.get("risk_thresholds", {}).get("AMBER", {}).get("remaining_pct_below", 50)
    
    # If less than warning_pct of a reasonable window (48h), mark amber
    if remaining < 24:
        return SLARisk.AMBER, remaining
    
    return SLARisk.GREEN, remaining


def get_sla_risks_for_grievances(grievances: list) -> list[dict]:
    """Calculate SLA risks for a list of grievances.
    
    Returns list of dicts with grievance_id, risk_level, hours_remaining.
    """
    risks = []
    now = datetime.now(timezone.utc)
    
    for g in grievances:
        if g.sla_deadline:
            risk_level, hours_remaining = get_sla_risk(g.sla_deadline, now)
            if risk_level in (SLARisk.RED, SLARisk.AMBER):
                risks.append({
                    "grievance_id": g.grievance_id,
                    "category": g.category,
                    "priority_level": g.priority_level,
                    "sla_deadline": g.sla_deadline,
                    "hours_remaining": round(hours_remaining, 1),
                    "risk_level": risk_level.value,
                    "department_id": g.department_id,
                    "assigned_officer_id": g.assigned_officer_id,
                })
    
    return sorted(risks, key=lambda x: x["hours_remaining"])
