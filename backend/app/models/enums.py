"""NammaKural enumerations for states, categories, roles, and types."""

from enum import Enum


class GrievanceState(str, Enum):
    """Grievance lifecycle state machine states."""
    DRAFT = "DRAFT"
    CREATED = "CREATED"
    CLASSIFIED = "CLASSIFIED"
    CLARIFICATION_REQUIRED = "CLARIFICATION_REQUIRED"
    VALIDATED = "VALIDATED"
    ROUTED = "ROUTED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    IN_PROGRESS = "IN_PROGRESS"
    SLA_WARNING = "SLA_WARNING"
    ESCALATED = "ESCALATED"
    RESOLVED = "RESOLVED"
    CITIZEN_CONFIRMED = "CITIZEN_CONFIRMED"
    CLOSED = "CLOSED"
    REJECTED_BY_CITIZEN = "REJECTED_BY_CITIZEN"
    REOPENED = "REOPENED"


class GrievanceCategory(str, Enum):
    """The five core grievance categories for MVP."""
    WATER = "WATER"
    ROADS = "ROADS"
    ELECTRICITY = "ELECTRICITY"
    SANITATION = "SANITATION"
    GOVERNMENT_SERVICES = "GOVERNMENT_SERVICES"


class WaterSubcategory(str, Enum):
    NO_SUPPLY = "NO_SUPPLY"
    CONTAMINATION = "CONTAMINATION"
    LEAKAGE = "LEAKAGE"
    BILLING = "BILLING"
    NEW_CONNECTION = "NEW_CONNECTION"


class RoadsSubcategory(str, Enum):
    POTHOLE = "POTHOLE"
    ROAD_DAMAGE = "ROAD_DAMAGE"
    FLOODING = "FLOODING"
    ENCROACHMENT = "ENCROACHMENT"
    MISSING_SIGNAGE = "MISSING_SIGNAGE"


class ElectricitySubcategory(str, Enum):
    POWER_CUT = "POWER_CUT"
    STREETLIGHT = "STREETLIGHT"
    TRANSFORMER = "TRANSFORMER"
    BILLING = "BILLING"
    NEW_CONNECTION = "NEW_CONNECTION"


class SanitationSubcategory(str, Enum):
    GARBAGE = "GARBAGE"
    DRAINAGE = "DRAINAGE"
    OPEN_DEFECATION = "OPEN_DEFECATION"
    PEST_CONTROL = "PEST_CONTROL"
    PUBLIC_TOILET = "PUBLIC_TOILET"


class GovServicesSubcategory(str, Enum):
    CERTIFICATE = "CERTIFICATE"
    PENSION = "PENSION"
    RATION = "RATION"
    HOUSING = "HOUSING"
    EDUCATION = "EDUCATION"


class Priority(str, Enum):
    """Deterministic priority levels based on scored criteria."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class UserRole(str, Enum):
    """System roles with RBAC."""
    CITIZEN = "CITIZEN"
    OPERATOR = "OPERATOR"
    OFFICER = "OFFICER"
    SUPERVISOR = "SUPERVISOR"
    ADMIN = "ADMIN"


class EvidenceType(str, Enum):
    """Types of evidence attachments."""
    VOICE = "VOICE"
    PHOTO = "PHOTO"
    VIDEO = "VIDEO"
    DOCUMENT = "DOCUMENT"
    TRANSCRIPT = "TRANSCRIPT"


class Intent(str, Enum):
    """Detected intent from citizen speech."""
    GRIEVANCE = "GRIEVANCE"
    SERVICE_NEED = "SERVICE_NEED"
    INQUIRY = "INQUIRY"
    FOLLOWUP = "FOLLOWUP"


class SLARisk(str, Enum):
    """SLA risk levels for dashboard."""
    GREEN = "GREEN"       # > 50% time remaining
    AMBER = "AMBER"       # < 50% time remaining
    RED = "RED"           # Overdue


# Valid state transitions - the directed graph
VALID_TRANSITIONS: dict[GrievanceState, list[GrievanceState]] = {
    GrievanceState.DRAFT: [GrievanceState.CREATED],
    GrievanceState.CREATED: [GrievanceState.CLASSIFIED],
    GrievanceState.CLASSIFIED: [
        GrievanceState.CLARIFICATION_REQUIRED,
        GrievanceState.VALIDATED,
    ],
    GrievanceState.CLARIFICATION_REQUIRED: [GrievanceState.CLASSIFIED],
    GrievanceState.VALIDATED: [GrievanceState.ROUTED],
    GrievanceState.ROUTED: [GrievanceState.ACKNOWLEDGED, GrievanceState.ESCALATED],
    GrievanceState.ACKNOWLEDGED: [GrievanceState.IN_PROGRESS],
    GrievanceState.IN_PROGRESS: [
        GrievanceState.SLA_WARNING,
        GrievanceState.RESOLVED,
        GrievanceState.ESCALATED,
    ],
    GrievanceState.SLA_WARNING: [
        GrievanceState.ESCALATED,
        GrievanceState.RESOLVED,
    ],
    GrievanceState.ESCALATED: [
        GrievanceState.IN_PROGRESS,
        GrievanceState.RESOLVED,
    ],
    GrievanceState.RESOLVED: [
        GrievanceState.CITIZEN_CONFIRMED,
        GrievanceState.REJECTED_BY_CITIZEN,
    ],
    GrievanceState.CITIZEN_CONFIRMED: [GrievanceState.CLOSED],
    GrievanceState.REJECTED_BY_CITIZEN: [GrievanceState.REOPENED],
    GrievanceState.REOPENED: [GrievanceState.IN_PROGRESS, GrievanceState.ESCALATED],
    GrievanceState.CLOSED: [],  # Terminal state
}
