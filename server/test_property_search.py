
from database import SessionLocal
from models import Property, Project

CITY = "Ahmedabad"
BHK = "3 BHK"
MAX_BUDGET = 9_000_000  # Inclusive: ₹90 lakh

db = SessionLocal()

try:
    results = (
        db.query(Property, Project)
        .join(Project, Property.project_id == Project.id)
        .filter(
            Project.city.ilike(CITY),
            Property.bhk == BHK,
            Property.price_inr <= MAX_BUDGET,
            Property.availability == "available",
        )
        .order_by(Property.price_inr.asc())
        .all()
    )

    print("DEVELOPMENT TEST — includes pending sample data")
    print(f"Search: {BHK}, {CITY}, up to ₹90 lakh")
    print(f"Matches found: {len(results)}\n")

    for prop, project in results:
        print({
            "project": project.name,
            "unit": prop.unit_number,
            "bhk": prop.bhk,
            "price_inr": prop.price_inr,
            "property_verification": prop.verification_status,
            "project_verification": project.verification_status,
        })

    verified_results = [
        (prop, project)
        for prop, project in results
        if prop.verification_status == "verified"
        and project.verification_status == "verified"
    ]

    print(f"\nProduction-eligible matches: {len(verified_results)}")

except Exception as exc:
    print("Search test failed:", repr(exc))
    raise

finally:
    db.close()
