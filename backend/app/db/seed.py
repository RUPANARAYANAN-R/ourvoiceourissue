"""Seed data generator for NammaKural demo.

Creates 80-100 realistic grievances across Chennai, Coimbatore, Erode,
Sennimalai, Madurai with demo users, departments, and schemes.
Includes a water-supply cluster around Sennimalai for the demo narrative.
"""

import json
import os
import random
import logging
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.models.database import (
    User, Department, Grievance, GrievanceEvent, Evidence,
    GrievanceEmbedding, Scheme, Notification, AuditLog
)
from app.models.enums import GrievanceState, GrievanceCategory, Priority

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ─── Tamil Nadu Locations ─────────────────────────────────

LOCATIONS = [
    {"name": "Sennimalai", "name_ta": "சென்னிமலை", "lat": 11.3210, "lng": 77.5950, "district": "Erode"},
    {"name": "Sennimalai East", "name_ta": "சென்னிமலை கிழக்கு", "lat": 11.3235, "lng": 77.5980, "district": "Erode"},
    {"name": "Sennimalai South", "name_ta": "சென்னிமலை தெற்கு", "lat": 11.3185, "lng": 77.5930, "district": "Erode"},
    {"name": "Sennimalai West", "name_ta": "சென்னிமலை மேற்கு", "lat": 11.3200, "lng": 77.5910, "district": "Erode"},
    {"name": "Sennimalai North", "name_ta": "சென்னிமலை வடக்கு", "lat": 11.3245, "lng": 77.5965, "district": "Erode"},
    {"name": "Erode", "name_ta": "ஈரோடு", "lat": 11.3410, "lng": 77.7172, "district": "Erode"},
    {"name": "Bhavani", "name_ta": "பவானி", "lat": 11.4500, "lng": 77.6833, "district": "Erode"},
    {"name": "T. Nagar, Chennai", "name_ta": "தி. நகர், சென்னை", "lat": 13.0418, "lng": 80.2341, "district": "Chennai"},
    {"name": "Adyar, Chennai", "name_ta": "அடையாறு, சென்னை", "lat": 13.0063, "lng": 80.2574, "district": "Chennai"},
    {"name": "Anna Nagar, Chennai", "name_ta": "அண்ணா நகர், சென்னை", "lat": 13.0850, "lng": 80.2101, "district": "Chennai"},
    {"name": "Velachery, Chennai", "name_ta": "வேளச்சேரி, சென்னை", "lat": 12.9815, "lng": 80.2180, "district": "Chennai"},
    {"name": "Tambaram, Chennai", "name_ta": "தாம்பரம், சென்னை", "lat": 12.9249, "lng": 80.1000, "district": "Chennai"},
    {"name": "RS Puram, Coimbatore", "name_ta": "ஆர்.எஸ். புரம், கோயம்புத்தூர்", "lat": 11.0050, "lng": 76.9550, "district": "Coimbatore"},
    {"name": "Gandhipuram, Coimbatore", "name_ta": "காந்திபுரம், கோயம்புத்தூர்", "lat": 11.0168, "lng": 76.9558, "district": "Coimbatore"},
    {"name": "Peelamedu, Coimbatore", "name_ta": "பீளமேடு, கோயம்புத்தூர்", "lat": 11.0292, "lng": 77.0140, "district": "Coimbatore"},
    {"name": "Saravanampatti, Coimbatore", "name_ta": "சரவணம்பட்டி, கோயம்புத்தூர்", "lat": 11.0700, "lng": 77.0100, "district": "Coimbatore"},
    {"name": "Madurai Main", "name_ta": "மதுரை மையம்", "lat": 9.9252, "lng": 78.1198, "district": "Madurai"},
    {"name": "Thirunagar, Madurai", "name_ta": "திருநகர், மதுரை", "lat": 9.9100, "lng": 78.0900, "district": "Madurai"},
    {"name": "KK Nagar, Madurai", "name_ta": "கே.கே. நகர், மதுரை", "lat": 9.9350, "lng": 78.1050, "district": "Madurai"},
    {"name": "Vilankurichi, Coimbatore", "name_ta": "விளாங்குறிச்சி, கோயம்புத்தூர்", "lat": 11.0450, "lng": 76.9800, "district": "Coimbatore"},
]

# ─── Sample grievances data ──────────────────────────────

WATER_GRIEVANCES = [
    {"sub": "NO_SUPPLY", "issue": "No water supply for 3 days", "issue_ta": "3 நாட்களாக குடிநீர் வரவில்லை", "duration": 3, "transcript": "எங்க ஊர்ல மூணு நாளா தண்ணி வரல. முன்னாடியே சொல்லியும் நடவடிக்கை எடுக்கல."},
    {"sub": "NO_SUPPLY", "issue": "Water not coming since morning", "issue_ta": "காலை முதல் தண்ணி வரவில்லை", "duration": 1, "transcript": "இன்னைக்கு காலை முதல் தண்ணி வரல. குழந்தைகளுக்கு குளிக்க கூட வழி இல்லை."},
    {"sub": "CONTAMINATION", "issue": "Water smells bad and looks yellow", "issue_ta": "தண்ணி மஞ்சள் நிறமாகவும் துர்நாற்றமாகவும் வருகிறது", "duration": 5, "transcript": "எங்க பகுதில தண்ணி மஞ்சளா வருது, நாத்தமும் அடிக்குது."},
    {"sub": "LEAKAGE", "issue": "Pipeline leaking on main road", "issue_ta": "பிரதான சாலையில் குழாய் கசிவு", "duration": 7, "transcript": "மெயின் ரோட்டுல பைப் ஒடைஞ்சு தண்ணி வீணா ஓடுது."},
    {"sub": "NO_SUPPLY", "issue": "Irregular water supply", "issue_ta": "ஒழுங்கற்ற குடிநீர் வழங்கல்", "duration": 14, "transcript": "ரெண்டு வாரமா ஒழுங்கா தண்ணி வரல. வந்தாலும் ஒரு மணி நேரம் தான் வரும்."},
    {"sub": "NO_SUPPLY", "issue": "Complete water shutdown", "issue_ta": "முழு குடிநீர் நிறுத்தம்", "duration": 2, "transcript": "ரெண்டு நாளா அடிப்படையா தண்ணி வரல. குடிக்க தண்ணி இல்ல."},
]

ROAD_GRIEVANCES = [
    {"sub": "POTHOLE", "issue": "Large pothole causing accidents", "issue_ta": "பெரிய பள்ளம் விபத்துக்களை ஏற்படுத்துகிறது", "duration": 30, "transcript": "எங்க ரோட்டுல பெரிய பள்ளம் இருக்கு. ரெண்டு பேருக்கு ஆக்ஸிடெண்ட் ஆகிடுச்சு."},
    {"sub": "ROAD_DAMAGE", "issue": "Road completely damaged after rain", "issue_ta": "மழைக்குப் பிறகு சாலை முழுவதும் சேதமடைந்துள்ளது", "duration": 10, "transcript": "மழைக்கு அப்புறம் ரோடு முழுசா பாழாயிடுச்சு."},
    {"sub": "FLOODING", "issue": "Road waterlogged after rain", "issue_ta": "மழைக்குப் பிறகு சாலையில் தண்ணீர் தேங்குகிறது", "duration": 3, "transcript": "மழை பெய்தா ரோடு முழுக்க தண்ணி நிக்குது. போக வர முடியல."},
    {"sub": "ENCROACHMENT", "issue": "Shop encroaching on footpath", "issue_ta": "கடை நடைபாதையை ஆக்கிரமிக்கிறது", "duration": 60, "transcript": "கடைக்காரர் நடைபாதையை ஆக்கிரமிச்சிட்டாரு."},
]

ELECTRICITY_GRIEVANCES = [
    {"sub": "STREETLIGHT", "issue": "Streetlight not working for 2 weeks", "issue_ta": "2 வாரமாக தெரு விளக்கு வேலை செய்யவில்லை", "duration": 14, "transcript": "எங்க தெருவுல street light ரெண்டு வாரமா வேலை செய்யல."},
    {"sub": "POWER_CUT", "issue": "Frequent power cuts daily", "issue_ta": "தினமும் அடிக்கடி மின் தடை", "duration": 7, "transcript": "ஒரு வாரமா தினமும் 4-5 மணி நேரம் கரண்ட் போகுது."},
    {"sub": "TRANSFORMER", "issue": "Transformer sparking dangerously", "issue_ta": "மின் மாற்றியில் ஆபத்தான தீப்பொறி", "duration": 2, "transcript": "எங்க ஏரியாவுல transformer-ல sparkingnu sound வருது. பயமா இருக்கு."},
    {"sub": "STREETLIGHT", "issue": "All streetlights out in the area", "issue_ta": "பகுதியில் அனைத்து தெரு விளக்குகளும் அணைந்துள்ளன", "duration": 5, "transcript": "எங்க ஏரியா முழுக்க street light எல்லாம் அணைஞ்சு போயிடுச்சு."},
]

SANITATION_GRIEVANCES = [
    {"sub": "GARBAGE", "issue": "Garbage not collected for a week", "issue_ta": "ஒரு வாரமாக குப்பை அகற்றப்படவில்லை", "duration": 7, "transcript": "ஒரு வாரமா குப்பை வண்டி வரல. குப்பை மேடா போயிடுச்சு."},
    {"sub": "DRAINAGE", "issue": "Sewage overflowing on street", "issue_ta": "தெருவில் கழிவுநீர் வழிகிறது", "duration": 3, "transcript": "எங்க தெருவுல ஓடை வழிஞ்சு ஓடுது. நாத்தம் தாங்க முடியல."},
    {"sub": "DRAINAGE", "issue": "Blocked drainage causing flooding", "issue_ta": "அடைபட்ட வடிகால் வெள்ளத்தை ஏற்படுத்துகிறது", "duration": 5, "transcript": "டிரைனேஜ் அடைச்சிருக்கு. மழை பெய்தா வீட்டுக்குள்ள தண்ணி வருது."},
    {"sub": "PEST_CONTROL", "issue": "Mosquito breeding in stagnant water", "issue_ta": "தேங்கிய நீரில் கொசு பெருகுகிறது", "duration": 14, "transcript": "எங்க பக்கத்துல தண்ணி தேங்கி கொசு மொய்க்குது. டெங்கு பயம்."},
]

GOV_GRIEVANCES = [
    {"sub": "CERTIFICATE", "issue": "Community certificate delay", "issue_ta": "சமூகச் சான்றிதழ் தாமதம்", "duration": 30, "transcript": "கம்யூனிட்டி சர்டிபிகேட்டுக்கு 30 நாளா காத்திருக்கேன்."},
    {"sub": "PENSION", "issue": "Old age pension not received", "issue_ta": "முதியோர் ஓய்வூதியம் வரவில்லை", "duration": 60, "transcript": "ரெண்டு மாசமா ஓய்வூதியம் வரல. எங்க அம்மாவுக்கு வயசாயிடுச்சு."},
    {"sub": "RATION", "issue": "Ration shop not providing full quota", "issue_ta": "ரேஷன் கடையில் முழு ஒதுக்கீடு கிடைக்கவில்லை", "duration": 7, "transcript": "ரேஷன் கடையில சரியா பொருள் தரல. அரிசி 5 கிலோ தான் தருவாங்க."},
]

ALL_GRIEVANCES = {
    "WATER": WATER_GRIEVANCES,
    "ROADS": ROAD_GRIEVANCES,
    "ELECTRICITY": ELECTRICITY_GRIEVANCES,
    "SANITATION": SANITATION_GRIEVANCES,
    "GOVERNMENT_SERVICES": GOV_GRIEVANCES,
}

STATES_DISTRIBUTION = [
    (GrievanceState.ROUTED.value, 20),
    (GrievanceState.ACKNOWLEDGED.value, 15),
    (GrievanceState.IN_PROGRESS.value, 25),
    (GrievanceState.SLA_WARNING.value, 5),
    (GrievanceState.RESOLVED.value, 10),
    (GrievanceState.CITIZEN_CONFIRMED.value, 5),
    (GrievanceState.CLOSED.value, 10),
    (GrievanceState.ESCALATED.value, 5),
    (GrievanceState.REOPENED.value, 5),
]


def seed_database(db: Session):
    """Seed the database with demo data."""
    # Check if already seeded
    if db.query(User).count() > 0:
        return False
    
    logger.info("🌱 Seeding NammaKural database...")
    
    # ─── 1. Create Departments ─────────────────────────────
    departments = [
        Department(name="Water Supply & Drainage Board", name_ta="குடிநீர் வழங்கல் மற்றும் வடிகால் வாரியம்", code="WTR", category="WATER",
                   sla_hours={"CRITICAL": 24, "HIGH": 72, "MEDIUM": 168, "LOW": 336}),
        Department(name="Highways & Rural Roads Department", name_ta="நெடுஞ்சாலை மற்றும் கிராமச் சாலைகள் துறை", code="RDS", category="ROADS",
                   sla_hours={"CRITICAL": 48, "HIGH": 120, "MEDIUM": 240, "LOW": 480}),
        Department(name="Tamil Nadu Electricity Board", name_ta="தமிழ்நாடு மின் வாரியம்", code="ELC", category="ELECTRICITY",
                   sla_hours={"CRITICAL": 12, "HIGH": 48, "MEDIUM": 120, "LOW": 240}),
        Department(name="Street Lighting Division", name_ta="தெரு விளக்கு பிரிவு", code="ELC-STR", category="ELECTRICITY",
                   sla_hours={"CRITICAL": 24, "HIGH": 72, "MEDIUM": 168, "LOW": 336}),
        Department(name="Municipal Sanitation Department", name_ta="நகராட்சி சுகாதாரத் துறை", code="SAN", category="SANITATION",
                   sla_hours={"CRITICAL": 24, "HIGH": 72, "MEDIUM": 168, "LOW": 336}),
        Department(name="District Collectorate - Public Services", name_ta="மாவட்ட ஆட்சியர் - பொது சேவைகள்", code="GOV", category="GOVERNMENT_SERVICES",
                   sla_hours={"CRITICAL": 72, "HIGH": 168, "MEDIUM": 336, "LOW": 720}),
    ]
    for d in departments:
        db.add(d)
    db.flush()
    
    # ─── 2. Create Demo Users ──────────────────────────────
    password_hash = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjIQqiRQYq" # demo123
    
    users = [
        # Citizens
        User(username="citizen1", password_hash=password_hash, name="Rajesh Kumar", name_ta="ராஜேஷ் குமார்", role="CITIZEN", phone="9876543210"),
        User(username="citizen2", password_hash=password_hash, name="Lakshmi Devi", name_ta="லட்சுமி தேவி", role="CITIZEN", phone="9876543211"),
        User(username="citizen3", password_hash=password_hash, name="Murugan S", name_ta="முருகன் எஸ்", role="CITIZEN", phone="9876543212"),
        # Operators
        User(username="operator1", password_hash=password_hash, name="Priya Krishnan", name_ta="பிரியா கிருஷ்ணன்", role="OPERATOR", phone="9876543220"),
        User(username="operator2", password_hash=password_hash, name="Karthik R", name_ta="கார்த்திக் ஆர்", role="OPERATOR", phone="9876543221"),
        # Officers
        User(username="officer1", password_hash=password_hash, name="Anitha Sundaram", name_ta="அனிதா சுந்தரம்", role="OFFICER", phone="9876543230", department_id=departments[0].id),
        User(username="officer2", password_hash=password_hash, name="Senthil Murugan", name_ta="செந்தில் முருகன்", role="OFFICER", phone="9876543231", department_id=departments[1].id),
        User(username="officer3", password_hash=password_hash, name="Kavitha Rajan", name_ta="கவிதா ராஜன்", role="OFFICER", phone="9876543232", department_id=departments[2].id),
        User(username="officer4", password_hash=password_hash, name="Bala Subramaniam", name_ta="பாலா சுப்ரமணியம்", role="OFFICER", phone="9876543233", department_id=departments[4].id),
        User(username="officer5", password_hash=password_hash, name="Meena Kumari", name_ta="மீனா குமாரி", role="OFFICER", phone="9876543234", department_id=departments[5].id),
        # Supervisors
        User(username="supervisor1", password_hash=password_hash, name="Dr. Ramachandran K", name_ta="டாக்டர் ராமசந்திரன் கே", role="SUPERVISOR", phone="9876543240"),
        # Admin
        User(username="admin", password_hash=password_hash, name="System Administrator", name_ta="கணினி நிர்வாகி", role="ADMIN", phone="9876543250"),
    ]
    for u in users:
        db.add(u)
    db.flush()
    
    citizen_ids = [u.id for u in users if u.role == "CITIZEN"]
    operator_ids = [u.id for u in users if u.role == "OPERATOR"]
    
    # Map departments to officers
    dept_officer_map = {}
    for u in users:
        if u.role == "OFFICER" and u.department_id:
            dept_officer_map[u.department_id] = u.id
    
    # Category to department mapping
    cat_dept_map = {d.category: d for d in departments if "-" not in d.code}
    
    # ─── 3. Create Grievances ──────────────────────────────
    grievance_counter = 10000
    now = datetime.now(timezone.utc)
    
    all_created_grievances = []
    
    # 3a. Create Sennimalai water cluster (12 complaints for demo)
    logger.info("  💧 Creating Sennimalai water cluster (12 complaints)...")
    sennimalai_locs = LOCATIONS[:5]  # Sennimalai variants
    for i in range(12):
        loc = sennimalai_locs[i % len(sennimalai_locs)]
        template = WATER_GRIEVANCES[i % len(WATER_GRIEVANCES)]
        
        grievance_counter += 1
        created_at = now - timedelta(hours=random.randint(2, 48))
        
        g = Grievance(
            grievance_id=f"TN-WTR-{grievance_counter}",
            state=random.choice([GrievanceState.ROUTED.value, GrievanceState.IN_PROGRESS.value, GrievanceState.ACKNOWLEDGED.value]),
            citizen_id=random.choice(citizen_ids),
            operator_id=random.choice(operator_ids),
            intent="GRIEVANCE",
            category="WATER",
            subcategory=template["sub"],
            issue=template["issue"],
            issue_ta=template["issue_ta"],
            location_name=loc["name"],
            location_ta=loc["name_ta"],
            latitude=loc["lat"] + random.uniform(-0.005, 0.005),
            longitude=loc["lng"] + random.uniform(-0.005, 0.005),
            district=loc["district"],
            duration_days=template["duration"],
            affected_population=random.randint(5, 100),
            previous_complaint=random.random() > 0.5,
            transcript=template["transcript"],
            normalized_text=template["transcript"],
            priority_score=random.randint(65, 95),
            priority_level=random.choice(["HIGH", "CRITICAL"]),
            department_id=cat_dept_map.get("WATER", departments[0]).id,
            assigned_officer_id=dept_officer_map.get(cat_dept_map.get("WATER", departments[0]).id),
            sla_deadline=created_at + timedelta(hours=random.choice([24, 72])),
            sla_hours=random.choice([24, 72]),
            created_at=created_at,
            updated_at=created_at,
        )
        db.add(g)
        db.flush()
        all_created_grievances.append(g)
        
        # Add creation event
        db.add(GrievanceEvent(grievance_id=g.id, from_state=None, to_state="CREATED", notes="Grievance created", created_at=created_at))
        db.add(GrievanceEvent(grievance_id=g.id, from_state="CREATED", to_state="CLASSIFIED", notes="Auto-classified", created_at=created_at + timedelta(seconds=5)))
        db.add(GrievanceEvent(grievance_id=g.id, from_state="CLASSIFIED", to_state="VALIDATED", notes="Validated", created_at=created_at + timedelta(seconds=10)))
        db.add(GrievanceEvent(grievance_id=g.id, from_state="VALIDATED", to_state="ROUTED", notes="Routed to Water Supply", created_at=created_at + timedelta(seconds=15)))
    
    # 3b. Create diverse grievances across all categories and locations
    logger.info("  📋 Creating diverse grievances across Tamil Nadu...")
    
    # Build weighted state list
    state_pool = []
    for state_val, weight in STATES_DISTRIBUTION:
        state_pool.extend([state_val] * weight)
    
    for category, templates in ALL_GRIEVANCES.items():
        dept = cat_dept_map.get(category, departments[0])
        officer_id = dept_officer_map.get(dept.id)
        prefix_map = {"WATER": "TN-WTR", "ROADS": "TN-RDS", "ELECTRICITY": "TN-ELC", "SANITATION": "TN-SAN", "GOVERNMENT_SERVICES": "TN-GOV"}
        prefix = prefix_map.get(category, "TN-GEN")
        
        num_grievances = random.randint(10, 15)
        for i in range(num_grievances):
            template = templates[i % len(templates)]
            loc = random.choice(LOCATIONS[5:])  # Non-Sennimalai locations
            
            grievance_counter += 1
            created_hours_ago = random.randint(1, 720)  # Up to 30 days ago
            created_at = now - timedelta(hours=created_hours_ago)
            state = random.choice(state_pool)
            
            priority_score = random.randint(15, 95)
            if priority_score >= 81:
                priority_level = "CRITICAL"
            elif priority_score >= 61:
                priority_level = "HIGH"
            elif priority_score >= 31:
                priority_level = "MEDIUM"
            else:
                priority_level = "LOW"
            
            sla_hours = {"CRITICAL": 24, "HIGH": 72, "MEDIUM": 168, "LOW": 336}.get(priority_level, 168)
            sla_deadline = created_at + timedelta(hours=sla_hours)
            
            resolved_at = None
            citizen_confirmed_at = None
            resolution_notes = None
            if state in [GrievanceState.RESOLVED.value, GrievanceState.CITIZEN_CONFIRMED.value, GrievanceState.CLOSED.value]:
                resolved_at = created_at + timedelta(hours=random.randint(4, sla_hours))
                resolution_notes = "Issue has been addressed and resolved by the field team."
            if state in [GrievanceState.CITIZEN_CONFIRMED.value, GrievanceState.CLOSED.value]:
                citizen_confirmed_at = resolved_at + timedelta(hours=random.randint(1, 48)) if resolved_at else None
            
            g = Grievance(
                grievance_id=f"{prefix}-{grievance_counter}",
                state=state,
                citizen_id=random.choice(citizen_ids),
                operator_id=random.choice(operator_ids),
                intent="GRIEVANCE",
                category=category,
                subcategory=template["sub"],
                issue=template["issue"],
                issue_ta=template["issue_ta"],
                location_name=loc["name"],
                location_ta=loc["name_ta"],
                latitude=loc["lat"] + random.uniform(-0.01, 0.01),
                longitude=loc["lng"] + random.uniform(-0.01, 0.01),
                district=loc["district"],
                duration_days=template["duration"],
                affected_population=random.randint(1, 200),
                previous_complaint=random.random() > 0.6,
                transcript=template["transcript"],
                normalized_text=template["transcript"],
                priority_score=priority_score,
                priority_level=priority_level,
                department_id=dept.id,
                assigned_officer_id=officer_id,
                sla_deadline=sla_deadline,
                sla_hours=sla_hours,
                resolution_notes=resolution_notes,
                resolved_at=resolved_at,
                citizen_confirmed_at=citizen_confirmed_at,
                created_at=created_at,
                updated_at=created_at + timedelta(hours=random.randint(0, 24)),
            )
            db.add(g)
            db.flush()
            all_created_grievances.append(g)
            
            # Add events
            db.add(GrievanceEvent(grievance_id=g.id, from_state=None, to_state="CREATED", notes="Grievance created", created_at=created_at))
            db.add(GrievanceEvent(grievance_id=g.id, from_state="CREATED", to_state=state, notes=f"Current state: {state}", created_at=created_at + timedelta(minutes=5)))
    
    # ─── 4. Create Schemes ────────────────────────────────
    logger.info("  📜 Seeding government schemes...")
    schemes_path = os.path.join(os.path.dirname(__file__), "..", "rules", "schemes.json")
    with open(schemes_path, "r", encoding="utf-8") as f:
        schemes_data = json.load(f)["schemes"]
    
    for sd in schemes_data:
        scheme = Scheme(
            scheme_id=sd["scheme_id"],
            name=sd["name"],
            name_ta=sd.get("name_ta"),
            category=sd["category"],
            description=sd.get("description"),
            description_ta=sd.get("description_ta"),
            eligibility_rules=sd.get("eligibility_rules"),
            required_documents=sd.get("required_documents"),
            application_channel=sd.get("application_channel"),
            benefits=sd.get("benefits"),
            benefits_ta=sd.get("benefits_ta"),
            last_verified_at=now,
        )
        db.add(scheme)
    
    db.commit()
    
    total = db.query(Grievance).count()
    logger.info(f"  ✅ Seeded {total} grievances, {len(users)} users, {len(departments)} departments, {len(schemes_data)} schemes")
    return True

if __name__ == "__main__":
    from app.db.database import SessionLocal, init_db
    init_db()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
