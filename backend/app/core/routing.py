"""Deterministic routing engine.

Category → Department mapping from configurable rules.
LLM does not decide routing — rules do.
"""

import json
import os
import logging
from sqlalchemy.orm import Session
from app.models.database import Department, User
from app.models.schemas import RoutingResult

logger = logging.getLogger(__name__)

# Load routing rules
_rules_path = os.path.join(os.path.dirname(__file__), "..", "rules", "routing_rules.json")
with open(_rules_path, "r", encoding="utf-8") as f:
    ROUTING_RULES = json.load(f)["routing"]


def route_grievance(
    db: Session,
    category: str,
    subcategory: str = None,
    location: str = None,
) -> RoutingResult:
    """Route a grievance to the correct department and officer.
    
    Uses deterministic rules: category → department → officer queue.
    """
    if not category or category not in ROUTING_RULES:
        return RoutingResult(confidence=0.0, rule_applied="no_matching_rule")
    
    rule = ROUTING_RULES[category]
    dept_code = rule["department_code"]
    dept_name = rule["department_name"]
    
    # Check subcategory overrides
    if subcategory and "subcategory_overrides" in rule:
        override = rule["subcategory_overrides"].get(subcategory)
        if override:
            dept_code = override.get("department_code", dept_code)
            dept_name = override.get("department_name", dept_name)
    
    # Find department in DB
    department = db.query(Department).filter(Department.code == dept_code).first()
    if not department:
        # Try parent department code
        parent_code = dept_code.split("-")[0] if "-" in dept_code else dept_code
        department = db.query(Department).filter(Department.code == parent_code).first()
    
    dept_id = department.id if department else None
    
    # Find available officer in department
    officer = None
    if department:
        officer = (
            db.query(User)
            .filter(User.department_id == department.id, User.role == "OFFICER", User.is_active == True)
            .first()
        )
    
    return RoutingResult(
        department_id=dept_id,
        department_name=dept_name,
        department_code=dept_code,
        officer_id=officer.id if officer else None,
        officer_name=officer.name if officer else None,
        confidence=1.0 if department else 0.5,
        rule_applied=f"category={category}, subcategory={subcategory}",
    )
