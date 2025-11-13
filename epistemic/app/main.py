"""
Epistemic App Main Entry Point

Epistemological truth-seeking platform with concerns, quests, and evidence-based resolution.
"""

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, FileResponse
from contextlib import asynccontextmanager
from .beacon import BeaconClient
import os
import json
from pathlib import Path

# Initialize beacon client
beacon = BeaconClient(
    gateway_url=os.getenv("GATEWAY_URL", "http://gateway:3000")
)

# Load mockup HTML
MOCKUP_HTML_PATH = Path(__file__).parent.parent / "mockup.html"
MOCKUP_DATA_PATH = Path(__file__).parent / "mockup-data.json"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup: Register with gateway and start heartbeats
    await beacon.start()
    yield
    # Shutdown: Stop heartbeats
    beacon.stop()


app = FastAPI(
    title="Epistemic",
    description="Epistemological truth-seeking platform",
    version="0.1.0",
    lifespan=lifespan
)


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
