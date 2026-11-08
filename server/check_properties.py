
from database import SessionLocal
from models import Property, Project

db = SessionLocal()

try:
    results = (
        db.query(Property, Project)
        .join(Project, Property.project_id == Project.id)
        .all()
    )

    print("Total joined properties:", len(results))

    for prop, project in results:
        print({
            "project_id": project.id,
            "project_name": project.name,
            "city": project.city,
            "bhk": prop.bhk,
            "price_inr": prop.price_inr,
            "property_verification": prop.verification_status,
            "project_verification": project.verification_status,
            "availability": prop.availability,
        })

except Exception as e:
    print("Diagnostic error:", repr(e))

finally:
    db.close()
