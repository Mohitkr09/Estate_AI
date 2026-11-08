
import os
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from database import Base, SessionLocal, engine
from models import Lead
from data.store import normalize_project

from api.leads import router as leads_router
from api.visits import router as visits_router
from api.assistant import router as assistant_router
from api.handoffs import router as handoffs_router
from api.auth import router as auth_router
from api.recommendations import router as recommendations_router
from api.properties import router as properties_router
from api.analytics import router as analytics_router
from api.tracking import router as tracking_router


# ============================================================
# ENVIRONMENT CONFIGURATION
# ============================================================

APP_ENV = os.getenv("APP_ENV", "development").strip().lower()

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "https://estate-ai-blush.vercel.app",
).strip().rstrip("/")


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="EstateMate AI",
    description=(
        "AI-powered real estate lead management, "
        "property discovery, and site-visit booking"
    ),
    version="1.2.0",
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "https://estate-ai-blush.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Remove duplicate origins and empty values.
ALLOWED_ORIGINS = list(
    dict.fromkeys(
        origin for origin in ALLOWED_ORIGINS if origin
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

def initialize_database():
    """
    Create missing database tables without deleting existing data.
    Insert demonstration leads only when the leads table is empty.
    """
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        # Avoid duplicating demonstration leads.
        if db.scalar(select(Lead.id).limit(1)) is not None:
            return

        sample_leads = [
            {
                "id": "LD-58210",
                "name": "Hardik Patel",
                "phone": "9999900010",
                "source": "Property portal",
                "project": "Project 1",
                "bhk": "3 BHK",
                "status": "Contacted",
                "visit_status": "Booked",
                "visit_time": datetime.fromisoformat(
                    "2026-11-01T11:00:00"
                ),
                "created_at": datetime.fromisoformat(
                    "2026-11-01T09:00:00"
                ),
            },
            {
                "id": "LD-58211",
                "name": "Nidhi Shah",
                "phone": "9999900011",
                "source": "Social media ad",
                "project": "Project 2",
                "bhk": "2 BHK",
                "status": "New",
                "visit_status": "Not booked",
                "visit_time": None,
                "created_at": datetime.fromisoformat(
                    "2026-11-01T10:00:00"
                ),
            },
            {
                "id": "LD-58224",
                "name": "Kavita Joshi",
                "phone": "9999900024",
                "source": "Hoarding call",
                "project": "Project 2",
                "bhk": "2 BHK",
                "status": "Visited",
                "visit_status": "Visited",
                "visit_time": None,
                "created_at": datetime.fromisoformat(
                    "2026-10-30T12:00:00"
                ),
            },
        ]

        for item in sample_leads:
            item["project_key"] = normalize_project(
                item["project"]
            )
            item["budget"] = None
            item["assigned_to"] = None
            item["consent"] = False

            db.add(Lead(**item))

        db.commit()


# ============================================================
# APPLICATION STARTUP
# ============================================================

@app.on_event("startup")
def startup_event():
    """
    Initialize the database when the application starts.
    """
    initialize_database()


# ============================================================
# EXISTING API ROUTERS
# ============================================================

app.include_router(leads_router)
app.include_router(visits_router)
app.include_router(assistant_router)
app.include_router(handoffs_router)
app.include_router(auth_router)
app.include_router(recommendations_router)
app.include_router(properties_router)
app.include_router(analytics_router)
app.include_router(tracking_router)


# ============================================================
# DEVELOPMENT-ONLY PROPERTY PREVIEW
# ============================================================

if APP_ENV == "development":
    from routers.dev_properties import (
        router as dev_properties_router,
    )

    app.include_router(dev_properties_router)


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def home():
    return {
        "message": "EstateMate AI API is running",
        "status": "success",
        "environment": APP_ENV,
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "environment": APP_ENV,
    }
