
"""
EstateMate AI — Development Sample Property Seeder

Creates 5 fictional projects and 20 sample apartment listings
across Ahmedabad, Mumbai, Pune, Bengaluru, and Patna.

Run from the server directory:
    python seed_properties.py

All newly created records remain pending verification.
Use only with a development database.
"""

import uuid
from datetime import date, datetime, timezone

from sqlalchemy.exc import SQLAlchemyError

from database import SessionLocal
from models import Project, Property


PROJECTS = [
    {
        "name": "EstateMate DEV Sample Ahmedabad",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "address": "Fictional development location — Shela, Ahmedabad",
        "description": (
            "Fictional sample residential project for development "
            "testing only. Not a real property offer."
        ),
        "amenities": [
            "Parking", "Lift", "Security", "Garden",
            "Gym", "Clubhouse",
        ],
    },
    {
        "name": "EstateMate DEV Sample Mumbai",
        "city": "Mumbai",
        "state": "Maharashtra",
        "address": "Fictional development location — Thane, Mumbai",
        "description": (
            "Fictional sample residential project for development "
            "testing only. Not a real property offer."
        ),
        "amenities": [
            "Parking", "Lift", "Security", "Gym",
            "Swimming Pool", "Power Backup",
        ],
    },
    {
        "name": "EstateMate DEV Sample Pune",
        "city": "Pune",
        "state": "Maharashtra",
        "address": "Fictional development location — Wakad, Pune",
        "description": (
            "Fictional sample residential project for development "
            "testing only. Not a real property offer."
        ),
        "amenities": [
            "Parking", "Garden", "Security", "Gym",
            "Clubhouse", "Children's Play Area",
        ],
    },
    {
        "name": "EstateMate DEV Sample Bengaluru",
        "city": "Bengaluru",
        "state": "Karnataka",
        "address": (
            "Fictional development location — Whitefield, Bengaluru"
        ),
        "description": (
            "Fictional sample residential project for development "
            "testing only. Not a real property offer."
        ),
        "amenities": [
            "Parking", "Lift", "Security", "Gym",
            "Swimming Pool", "Power Backup",
        ],
    },
    {
        "name": "EstateMate DEV Sample Patna",
        "city": "Patna",
        "state": "Bihar",
        "address": "Fictional development location — Danapur, Patna",
        "description": (
            "Fictional sample residential project for development "
            "testing only. Not a real property offer."
        ),
        "amenities": [
            "Parking", "Lift", "Security", "Garden",
            "Power Backup", "Children's Play Area",
        ],
    },
]


# Each tuple:
# (project name, unit number, BHK, price INR, area sqft, floor)
UNITS = [
    # Ahmedabad — 4 listings
    (
        "EstateMate DEV Sample Ahmedabad",
        "TEST-AH-101", "1 BHK", 2800000, 550, 1,
    ),
    (
        "EstateMate DEV Sample Ahmedabad",
        "TEST-AH-202", "2 BHK", 4800000, 900, 2,
    ),
    (
        "EstateMate DEV Sample Ahmedabad",
        "TEST-AH-303", "3 BHK", 7800000, 1350, 3,
    ),
    (
        "EstateMate DEV Sample Ahmedabad",
        "TEST-AH-404", "4 BHK", 12500000, 2100, 4,
    ),

    # Mumbai — 4 listings
    (
        "EstateMate DEV Sample Mumbai",
        "TEST-MU-101", "1 BHK", 6500000, 450, 1,
    ),
    (
        "EstateMate DEV Sample Mumbai",
        "TEST-MU-202", "2 BHK", 10500000, 800, 2,
    ),
    (
        "EstateMate DEV Sample Mumbai",
        "TEST-MU-303", "3 BHK", 17500000, 1200, 3,
    ),
    (
        "EstateMate DEV Sample Mumbai",
        "TEST-MU-404", "4 BHK", 28000000, 1900, 4,
    ),

    # Pune — 4 listings
    (
        "EstateMate DEV Sample Pune",
        "TEST-PU-101", "1 BHK", 3200000, 550, 1,
    ),
    (
        "EstateMate DEV Sample Pune",
        "TEST-PU-202", "2 BHK", 5800000, 950, 2,
    ),
    (
        "EstateMate DEV Sample Pune",
        "TEST-PU-303", "3 BHK", 9200000, 1450, 3,
    ),
    (
        "EstateMate DEV Sample Pune",
        "TEST-PU-404", "4 BHK", 14500000, 2200, 4,
    ),

    # Bengaluru — 4 listings
    (
        "EstateMate DEV Sample Bengaluru",
        "TEST-BE-101", "1 BHK", 4200000, 550, 1,
    ),
    (
        "EstateMate DEV Sample Bengaluru",
        "TEST-BE-202", "2 BHK", 7500000, 1000, 2,
    ),
    (
        "EstateMate DEV Sample Bengaluru",
        "TEST-BE-303", "3 BHK", 12500000, 1550, 3,
    ),
    (
        "EstateMate DEV Sample Bengaluru",
        "TEST-BE-404", "4 BHK", 21000000, 2400, 4,
    ),

    # Patna — 4 listings
    (
        "EstateMate DEV Sample Patna",
        "TEST-PA-101", "1 BHK", 2200000, 500, 1,
    ),
    (
        "EstateMate DEV Sample Patna",
        "TEST-PA-202", "2 BHK", 3900000, 850, 2,
    ),
    (
        "EstateMate DEV Sample Patna",
        "TEST-PA-303", "3 BHK", 6200000, 1250, 3,
    ),
    (
        "EstateMate DEV Sample Patna",
        "TEST-PA-404", "4 BHK", 9800000, 1900, 4,
    ),
]


def seed_properties():
    db = SessionLocal()

    projects_created = 0
    properties_created = 0
    properties_skipped = 0

    try:
        project_by_name = {}

        # ----------------------------------------------------
        # 1. Create missing projects; reuse existing projects.
        # ----------------------------------------------------
        for data in PROJECTS:
            project = (
                db.query(Project)
                .filter(Project.name == data["name"])
                .first()
            )

            if project is None:
                project = Project(
                    id=str(uuid.uuid4()),
                    **data,
                    rera_number=None,
                    possession_date=date(2028, 12, 31),
                    verification_status="pending",
                    verified_at=None,
                    created_at=datetime.now(timezone.utc),
                )

                db.add(project)
                db.flush()

                projects_created += 1

            # Do not overwrite an existing project's verification
            # status; it may have been reviewed by an administrator.
            project_by_name[data["name"]] = project

        # ----------------------------------------------------
        # 2. Add missing apartment units.
        # ----------------------------------------------------
        for (
            project_name,
            unit_number,
            bhk,
            price,
            area,
            floor,
        ) in UNITS:
            project = project_by_name.get(project_name)

            if project is None:
                raise ValueError(
                    f"Project not found in seed configuration: "
                    f"{project_name}"
                )

            existing = (
                db.query(Property)
                .filter(
                    Property.project_id == project.id,
                    Property.unit_number == unit_number,
                )
                .first()
            )

            if existing is not None:
                properties_skipped += 1
                continue

            property_data = Property(
                id=str(uuid.uuid4()),
                project_id=project.id,
                unit_number=unit_number,
                bhk=bhk,
                price_inr=price,
                area_sqft=area,
                floor_number=floor,
                availability="available",
                verification_status="pending",
                verified_at=None,
                created_at=datetime.now(timezone.utc),
            )

            db.add(property_data)
            properties_created += 1

        # ----------------------------------------------------
        # 3. Commit all changes together.
        # ----------------------------------------------------
        db.commit()

        print("\nEstateMate AI sample seed completed.")
        print("------------------------------------")
        print("Projects created:", projects_created)
        print("Properties created:", properties_created)
        print("Existing properties skipped:", properties_skipped)
        print("Configured property listings:", len(UNITS))
        print("Cities covered:", len(PROJECTS))
        print("Newly seeded properties remain pending verification.")
        print("Sample prices are fictional development data.")

    except (SQLAlchemyError, ValueError):
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_properties()
