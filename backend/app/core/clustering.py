"""Community complaint intelligence — clustering and emerging issues.

Three levels:
1. Similar complaint — semantic similarity > threshold
2. Related cluster — semantic + category + geographic + temporal
3. Emerging civic issue — cluster growing rapidly

Do not auto-merge. Surface candidates only.
"""

import logging
import math
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.models.database import Grievance, GrievanceEmbedding
from app.models.schemas import SimilarGrievance, ClusterInfo, EmergingIssue, HeatmapPoint
from app.core.ai_engine import gemini_engine

logger = logging.getLogger(__name__)

# Clustering weights: C = αS + βG + γK + δT
ALPHA = 0.4   # Semantic similarity
BETA = 0.25   # Geographic proximity
GAMMA = 0.2   # Category match
DELTA = 0.15  # Temporal proximity


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if not a or not b or len(a) != len(b):
        return 0.0
    
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
    
    return dot / (norm_a * norm_b)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in kilometers."""
    R = 6371  # Earth radius in km
    
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c


def geographic_score(lat1: float, lon1: float, lat2: float, lon2: float, max_km: float = 5.0) -> float:
    """Score geographic proximity. 1.0 = same location, 0.0 = beyond max_km."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 0.0
    
    dist = haversine_km(lat1, lon1, lat2, lon2)
    if dist >= max_km:
        return 0.0
    return 1.0 - (dist / max_km)


def temporal_score(t1: datetime, t2: datetime, max_hours: float = 168) -> float:
    """Score temporal proximity. 1.0 = same time, 0.0 = beyond max_hours."""
    if t1 is None or t2 is None:
        return 0.0
    
    if t1.tzinfo is None:
        t1 = t1.replace(tzinfo=timezone.utc)
    if t2.tzinfo is None:
        t2 = t2.replace(tzinfo=timezone.utc)
    
    diff_hours = abs((t2 - t1).total_seconds()) / 3600
    if diff_hours >= max_hours:
        return 0.0
    return 1.0 - (diff_hours / max_hours)


def category_score(cat1: str, cat2: str) -> float:
    """Score category match. 1.0 = same category."""
    if cat1 and cat2 and cat1 == cat2:
        return 1.0
    return 0.0


def composite_score(
    semantic: float,
    geographic: float,
    category: float,
    temporal: float,
) -> float:
    """C = αS + βG + γK + δT"""
    return (ALPHA * semantic + BETA * geographic + GAMMA * category + DELTA * temporal)


async def find_similar(
    db: Session,
    grievance_id: int,
    threshold: float = 0.6,
    limit: int = 20,
) -> list[SimilarGrievance]:
    """Find similar grievances using composite similarity score."""
    # Get target grievance
    target = db.query(Grievance).filter(Grievance.id == grievance_id).first()
    if not target:
        return []
    
    # Get target embedding
    target_emb = db.query(GrievanceEmbedding).filter(
        GrievanceEmbedding.grievance_id == grievance_id
    ).first()
    
    # Get all other grievance embeddings
    all_embeddings = db.query(GrievanceEmbedding).filter(
        GrievanceEmbedding.grievance_id != grievance_id
    ).all()
    
    results = []
    for emb in all_embeddings:
        other = db.query(Grievance).filter(Grievance.id == emb.grievance_id).first()
        if not other:
            continue
        
        # Calculate composite score
        sem_score = 0.0
        if target_emb and emb.embedding_json:
            sem_score = cosine_similarity(target_emb.embedding_json, emb.embedding_json)
        
        geo_score = geographic_score(
            target.latitude, target.longitude,
            other.latitude, other.longitude,
        )
        cat_score = category_score(target.category, other.category)
        temp_score = temporal_score(target.created_at, other.created_at)
        
        score = composite_score(sem_score, geo_score, cat_score, temp_score)
        
        if score >= threshold:
            dist = None
            if target.latitude and target.longitude and other.latitude and other.longitude:
                dist = round(haversine_km(target.latitude, target.longitude, other.latitude, other.longitude), 2)
            
            results.append(SimilarGrievance(
                grievance_id=other.grievance_id,
                category=other.category,
                issue=other.issue,
                location_name=other.location_name,
                similarity_score=round(score, 3),
                distance_km=dist,
                created_at=other.created_at,
            ))
    
    results.sort(key=lambda x: x.similarity_score, reverse=True)
    return results[:limit]


async def detect_clusters(
    db: Session,
    category: str = None,
    time_window_hours: float = 72,
    min_cluster_size: int = 3,
    max_radius_km: float = 5.0,
) -> list[ClusterInfo]:
    """Detect complaint clusters using geographic + category + temporal grouping."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=time_window_hours)
    
    query = db.query(Grievance).filter(
        Grievance.created_at >= cutoff,
        Grievance.latitude.isnot(None),
        Grievance.longitude.isnot(None),
    )
    if category:
        query = query.filter(Grievance.category == category)
    
    grievances = query.all()
    if len(grievances) < min_cluster_size:
        return []
    
    # Simple spatial clustering using distance threshold
    visited = set()
    clusters = []
    cluster_id = 1
    
    for i, g1 in enumerate(grievances):
        if i in visited:
            continue
        
        cluster_members = [g1]
        visited.add(i)
        
        for j, g2 in enumerate(grievances):
            if j in visited:
                continue
            
            dist = haversine_km(g1.latitude, g1.longitude, g2.latitude, g2.longitude)
            same_cat = (g1.category == g2.category) if g1.category and g2.category else False
            
            if dist <= max_radius_km and same_cat:
                cluster_members.append(g2)
                visited.add(j)
        
        if len(cluster_members) >= min_cluster_size:
            # Calculate cluster center
            center_lat = sum(m.latitude for m in cluster_members) / len(cluster_members)
            center_lng = sum(m.longitude for m in cluster_members) / len(cluster_members)
            
            # Calculate radius
            max_dist = max(
                haversine_km(center_lat, center_lng, m.latitude, m.longitude)
                for m in cluster_members
            )
            
            clusters.append(ClusterInfo(
                cluster_id=cluster_id,
                category=cluster_members[0].category,
                center_lat=round(center_lat, 6),
                center_lng=round(center_lng, 6),
                radius_km=round(max_dist, 2),
                complaint_count=len(cluster_members),
                time_window_hours=time_window_hours,
                is_emerging=len(cluster_members) >= min_cluster_size * 2,
                severity="HIGH" if len(cluster_members) >= 10 else "MEDIUM",
                description=f"{len(cluster_members)} {cluster_members[0].category} complaints within {round(max_dist, 1)} km",
                grievance_ids=[m.grievance_id for m in cluster_members],
            ))
            cluster_id += 1
    
    return clusters


async def detect_emerging_issues(
    db: Session,
    time_window_hours: float = 48,
    min_complaints: int = 5,
) -> list[EmergingIssue]:
    """Detect emerging civic issues — clusters growing rapidly."""
    clusters = await detect_clusters(db, time_window_hours=time_window_hours, min_cluster_size=min_complaints)
    
    emerging = []
    for i, cluster in enumerate(clusters):
        if cluster.complaint_count >= min_complaints:
            growth_rate = cluster.complaint_count / max(time_window_hours, 1)
            
            cat_names = {
                "WATER": "குடிநீர் வழங்கல் பிரச்சனை",
                "ROADS": "சாலை பிரச்சனை",
                "ELECTRICITY": "மின்சார பிரச்சனை",
                "SANITATION": "சுகாதார பிரச்சனை",
                "GOVERNMENT_SERVICES": "அரசு சேவை பிரச்சனை",
            }
            
            emerging.append(EmergingIssue(
                issue_id=i + 1,
                category=cluster.category or "UNKNOWN",
                location=f"Center: ({cluster.center_lat}, {cluster.center_lng})",
                complaint_count=cluster.complaint_count,
                growth_rate=round(growth_rate, 3),
                radius_km=cluster.radius_km,
                time_window_hours=time_window_hours,
                description=f"Potential emerging {(cluster.category or 'unknown').lower().replace('_', ' ')} issue",
                description_ta=cat_names.get(cluster.category, "வளர்ந்து வரும் பிரச்சனை"),
                severity="CRITICAL" if cluster.complaint_count >= 10 else "HIGH",
                grievance_ids=cluster.grievance_ids,
            ))
    
    return emerging


def get_heatmap_data(db: Session, category: str = None) -> list[HeatmapPoint]:
    """Get grievance heatmap data points."""
    query = db.query(Grievance).filter(
        Grievance.latitude.isnot(None),
        Grievance.longitude.isnot(None),
    )
    if category:
        query = query.filter(Grievance.category == category)
    
    grievances = query.all()
    
    priority_weights = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
    
    return [
        HeatmapPoint(
            latitude=g.latitude,
            longitude=g.longitude,
            weight=priority_weights.get(g.priority_level, 1),
            category=g.category,
        )
        for g in grievances
    ]
