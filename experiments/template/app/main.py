"""
Template App Main Entry Point

This is a minimal FastAPI app with beacon integration.
Copy this template and modify for your experimental app.
"""

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from contextlib import asynccontextmanager
from .beacon import BeaconClient
import os

# Initialize beacon client
beacon = BeaconClient(
    gateway_url=os.getenv("GATEWAY_URL", "http://gateway:3000")
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup: Register with gateway and start heartbeats
    await beacon.start()
    yield
    # Shutdown: Stop heartbeats
    beacon.stop()


app = FastAPI(
    title="Template App",
    description="A template for creating experimental apps",
    version="0.1.0",
    lifespan=lifespan
)


@app.get("/", response_class=HTMLResponse)
async def root():
    """App homepage"""
    return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Template App</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 20px;
            padding: 60px 40px;
            max-width: 600px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            text-align: center;
        }

        h1 {
            font-size: 3rem;
            margin-bottom: 20px;
            color: #333;
        }

        .emoji {
            font-size: 4rem;
            margin-bottom: 20px;
        }

        p {
            font-size: 1.2rem;
            color: #666;
            line-height: 1.6;
            margin-bottom: 30px;
        }

        .info {
            background: #f5f5f5;
            border-radius: 10px;
            padding: 20px;
            margin-top: 30px;
            text-align: left;
        }

        .info h3 {
            margin-bottom: 15px;
            color: #667eea;
        }

        .info ul {
            list-style: none;
        }

        .info li {
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }

        .info li:last-child {
            border-bottom: none;
        }

        code {
            background: #667eea;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="emoji">🔬</div>
        <h1>Template App</h1>
        <p>
            This is a template for creating new experimental apps.
            Replace this content with your own!
        </p>

        <div class="info">
            <h3>📋 Next Steps</h3>
            <ul>
                <li><strong>1.</strong> Copy this template directory</li>
                <li><strong>2.</strong> Update <code>app.json</code> with your app details</li>
                <li><strong>3.</strong> Modify <code>app/main.py</code> with your logic</li>
                <li><strong>4.</strong> Build and run with <code>docker-compose</code></li>
                <li><strong>5.</strong> Your app will auto-register with the gateway!</li>
            </ul>
        </div>

        <div class="info" style="margin-top: 20px;">
            <h3>🔗 Useful Links</h3>
            <ul>
                <li><a href="/app">App Route</a></li>
                <li><a href="/api/health">Health Check</a></li>
                <li><a href="/docs">API Documentation</a></li>
                <li><a href="/switcher">Back to Switcher</a></li>
            </ul>
        </div>
    </div>
</body>
</html>
"""


@app.get("/app", response_class=HTMLResponse)
async def app_route():
    """Main app interface (same as root for template)"""
    return await root()


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
