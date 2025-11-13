"""
Epistemic App Main Entry Point

Epistemological truth-seeking platform with concerns, quests, and evidence-based resolution.
"""

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from contextlib import asynccontextmanager
import os
import json
from pathlib import Path

from .beacon import BeaconClient
from .config import get_settings
from .database.connection import init_db, close_db
from .routers import auth, timeline

settings = get_settings()

# Initialize beacon client
beacon = BeaconClient(
    gateway_url=settings.gateway_url
)

# Load mockup HTML and data
MOCKUP_HTML_PATH = Path(__file__).parent.parent / "mockup.html"
MOCKUP_DATA_PATH = Path(__file__).parent / "mockup-data.json"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup: Initialize database and register with gateway
    await init_db()
    await beacon.start()
    yield
    # Shutdown: Close database and stop heartbeats
    await close_db()
    beacon.stop()


app = FastAPI(
    title="Epistemic",
    description="Epistemological truth-seeking platform",
    version="0.1.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add session middleware (required for OAuth)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.jwt_secret_key
)

# Include routers
app.include_router(auth.router)
app.include_router(timeline.router)


@app.get("/", response_class=HTMLResponse)
async def root():
    """App homepage - serve the mockup"""
    with open(MOCKUP_HTML_PATH, "r") as f:
        html_content = f.read()
    # Replace the fetch URL to use the API endpoint
    html_content = html_content.replace(
        "fetch('./mockup-data.json')",
        "fetch('/api/data')"
    )
    return html_content


@app.get("/app", response_class=HTMLResponse)
async def app_route():
    """Main app interface"""
    return await root()


@app.get("/api/data")
async def get_mockup_data():
    """Serve mockup data JSON"""
    with open(MOCKUP_DATA_PATH, "r") as f:
        return json.load(f)


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": beacon.app_metadata["name"],
        "version": beacon.app_metadata["version"]
    }


@app.get("/api/info")
async def app_info():
    """Return app metadata"""
    return beacon.app_metadata
