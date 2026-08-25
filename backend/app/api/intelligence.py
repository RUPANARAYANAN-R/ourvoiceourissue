"""Intelligence API routes — clusters, emerging issues, heatmap, SLA risks, similarity."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.clustering import find_similar, detect_clusters, detect_emerging_issues, get_heatmap_data
from app.core.sla import get_sla_risks_for_grievances
from app.models.database import Grievance
from app.models.enums import GrievanceState

router = APIRouter(prefix="/intelligence", tags=["Intelligence"])


@router.get("/similar/{grievance_id}")
async def get_similar_grievances(
    grievance_id: str,
    threshold: float = Query(0.5, ge=0.0, le=1.0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Find similar grievances using composite similarity score."""
    g = db.query(Grievance).filter(Grievance.grievance_id == grievance_id).first()
    if not g:
        return {"items": [], "total": 0}
    
    results = await find_similar(db, g.id, threshold=threshold, limit=limit)
    return {"items": [r.model_dump() for r in results], "total": len(results)}


@router.get("/clusters")
async def get_clusters(
    category: str = None,
    time_window_hours: float = Query(72, ge=1),
    min_cluster_size: int = Query(3, ge=2),
    db: Session = Depends(get_db),
):
    """Get active complaint clusters."""
    clusters = await detect_clusters(
        db,
        category=category,
        time_window_hours=time_window_hours,
        min_cluster_size=min_cluster_size,
    )
    return {"items": [c.model_dump() for c in clusters], "total": len(clusters)}


@router.get("/emerging-issues")
async def get_emerging_issues(
    time_window_hours: float = Query(48, ge=1),
    min_complaints: int = Query(5, ge=2),
    db: Session = Depends(get_db),
):
    """Detect emerging civic issues from clustering patterns."""
    issues = await detect_emerging_issues(
        db,
        time_window_hours=time_window_hours,
        min_complaints=min_complaints,
    )
    return {"items": [i.model_dump() for i in issues], "total": len(issues)}


@router.get("/heatmap")
async def get_heatmap(
    category: str = None,
    db: Session = Depends(get_db),
):
    """Get grievance heatmap data points."""
    points = get_heatmap_data(db, category=category)
    return {"points": [p.model_dump() for p in points], "total": len(points)}


@router.get("/sla-risks")
async def get_sla_risks(
    db: Session = Depends(get_db),
):
    """Get grievances with SLA risk (approaching or overdue)."""
    active_states = [
        GrievanceState.ROUTED.value, GrievanceState.ACKNOWLEDGED.value,
        GrievanceState.IN_PROGRESS.value, GrievanceState.SLA_WARNING.value,
        GrievanceState.ESCALATED.value,
    ]
    grievances = db.query(Grievance).filter(
        Grievance.sla_deadline.isnot(None),
        Grievance.state.in_(active_states),
    ).all()
    
    risks = get_sla_risks_for_grievances(grievances)
    return {"items": risks, "total": len(risks)}
