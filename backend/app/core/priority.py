"""Deterministic priority engine.

Don't let the LLM invent priority. Use configurable weighted scoring.
"""

import json
import os
import logging
from app.models.schemas import GrievanceExtraction, PriorityCalculation

logger = logging.getLogger(__name__)

# Load priority rules
_rules_path = os.path.join(os.path.dirname(__file__), "..", "rules", "priority_rules.json")
with open(_rules_path, "r", encoding="utf-8") as f:
    PRIORITY_RULES = json.load(f)

# Load categories for safety/essential flags
_cat_path = os.path.join(os.path.dirname(__file__), "..", "rules", "categories.json")
with open(_cat_path, "r", encoding="utf-8") as f:
    CATEGORIES = json.load(f)["categories"]


def calculate_priority(extraction: GrievanceExtraction) -> PriorityCalculation:
    """Calculate deterministic priority score from extraction data.
    
    Uses weighted scoring from configurable policy rules:
    - Safety risk: 30 points max
    - Essential service: 25 points max
    - Duration > thresholds: 15 points max
    - Previous complaint: 15 points max
    - Affected population: 10 points max
    """
    weights = PRIORITY_RULES["weights"]
    duration_thresh = PRIORITY_RULES["duration_thresholds"]
    pop_thresh = PRIORITY_RULES["population_thresholds"]
    levels = PRIORITY_RULES["levels"]
    
    # Get category metadata
    cat_meta = {}
    subcat_meta = {}
    if extraction.category and extraction.category in CATEGORIES:
        cat_data = CATEGORIES[extraction.category]
        subcats = cat_data.get("subcategories", {})
        if extraction.subcategory and extraction.subcategory in subcats:
            subcat_meta = subcats[extraction.subcategory]
    
    # Score: Safety risk
    safety_score = 0
    if subcat_meta.get("safety_impact", False):
        safety_score = weights["safety_risk"]
    elif extraction.urgency_signals:
        safety_score = weights["safety_risk"] // 2
    
    # Score: Essential service
    essential_score = 0
    if subcat_meta.get("essential_service", False):
        essential_score = weights["essential_service"]
    
    # Score: Duration
    duration_score = 0
    if extraction.duration_days is not None:
        if extraction.duration_days >= duration_thresh["critical"]:
            duration_score = weights["duration"]
        elif extraction.duration_days >= duration_thresh["high"]:
            duration_score = int(weights["duration"] * 0.75)
        elif extraction.duration_days >= duration_thresh["medium"]:
            duration_score = int(weights["duration"] * 0.5)
    
    # Score: Previous complaint
    previous_score = 0
    if extraction.previous_complaint:
        previous_score = weights["previous_complaint"]
    
    # Score: Affected population
    pop_score = 0
    if extraction.affected_population is not None:
        if extraction.affected_population >= pop_thresh["critical"]:
            pop_score = weights["affected_population"]
        elif extraction.affected_population >= pop_thresh["high"]:
            pop_score = int(weights["affected_population"] * 0.75)
        elif extraction.affected_population >= pop_thresh["medium"]:
            pop_score = int(weights["affected_population"] * 0.5)
    
    # Total
    total = safety_score + essential_score + duration_score + previous_score + pop_score
    total = min(total, 100)
    
    # Determine level
    level = "LOW"
    for level_name, bounds in levels.items():
        if bounds["min"] <= total <= bounds["max"]:
            level = level_name
            break
    
    return PriorityCalculation(
        safety_risk=safety_score,
        essential_service=essential_score,
        duration_score=duration_score,
        previous_complaint_score=previous_score,
        population_score=pop_score,
        total_score=total,
        level=level,
    )
