"""NammaKural — FastAPI Application Entry Point.

நம்ம குரல். நம்ம குறை. சரியான தீர்வை நோக்கி.
AI-powered Tamil Voice Governance Intelligence Platform.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging

from app.config import get_settings
from app.db.database import init_db, SessionLocal
from app.db.seed import seed_database
import asyncio
from app.core.sla_monitor import run_sla_monitor

# Import routers
from app.api.auth import router as auth_router
from app.api.voice import router as voice_router
from app.api.grievances import router as grievances_router
from app.api.intelligence import router as intelligence_router
from app.api.schemes import router as schemes_router

import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title="NammaKural API",
    description="நம்ம குரல். நம்ம குறை. சரியான தீர்வை நோக்கி. — AI-powered Tamil Voice Governance Intelligence Platform",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(voice_router)
app.include_router(grievances_router)
app.include_router(intelligence_router)
app.include_router(schemes_router)

# Static files for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.on_event("startup")
async def startup():
    """Initialize database and seed demo data on startup."""
    logger.info("🚀 Starting NammaKural API...")
    init_db()
    
    # Seed demo data
    db = SessionLocal()
    try:
        seed_database(db)
    except Exception as e:
        logger.error(f"Seeding failed: {e}")
    finally:
        db.close()
    
    # Start the background SLA monitor
    asyncio.create_task(run_sla_monitor())
    
    logger.info("✅ NammaKural API ready!")


@app.get("/")
async def root():
    """Health check / root endpoint."""
    return {
        "app": "NammaKural",
        "subtitle": "நம்ம குரல். நம்ம குறை. சரியான தீர்வை நோக்கி.",
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
