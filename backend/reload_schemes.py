import json
import os
from datetime import datetime, timezone
from app.db.database import SessionLocal, init_db
from app.models.database import Scheme

def reload_schemes():
    db = SessionLocal()
    try:
        # Delete existing schemes
        db.query(Scheme).delete()
        print("Deleted existing schemes.")
        
        # Load from json
        schemes_path = os.path.join(os.path.dirname(__file__), "app", "rules", "schemes.json")
        with open(schemes_path, "r", encoding="utf-8") as f:
            schemes_data = json.load(f)["schemes"]
            
        now = datetime.now(timezone.utc)
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
        print(f"Successfully loaded {len(schemes_data)} schemes into the database.")
    finally:
        db.close()

if __name__ == "__main__":
    reload_schemes()
