from fastapi import FastAPI
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Dict, List, Optional

app = FastAPI(
    title="RE News Gateway",
    description="Multi-App Gateway Landing Page",
    version="1.0.0",
)

# In-memory app registry for dynamic app management
app_registry: Dict[str, dict] = {}

class AppRegistration(BaseModel):
    id: str
    name: str
    version: str
    description: str
    status: str = "active"  # active, archived, development
    icon: str = "🔬"
    routes: dict

class AppHeartbeat(BaseModel):
    id: str


@app.get("/", response_class=HTMLResponse)
async def root():
    return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HERE.news - Coming Soon</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow: hidden;
            background: #000;
            color: white;
            cursor: default;
        }

        /* Space background */
        .galaxy {
            position: fixed;
            inset: 0;
            background: radial-gradient(ellipse at top, #1b2735 0%, #090a0f 100%);
            z-index: 0;
        }

        .nebula {
            position: fixed;
            inset: 0;
            background:
                radial-gradient(circle at 20% 50%, rgba(91, 132, 255, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(255, 125, 223, 0.25) 0%, transparent 50%);
            z-index: 1;
        }

        /* Stars */
        .stars {
            position: fixed;
            inset: 0;
            overflow: hidden;
            z-index: 2;
        }

        .star {
            position: absolute;
            background: white;
            border-radius: 50%;
            animation: twinkle linear infinite;
        }

        @keyframes twinkle {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
        }

        /* Floating symbols */
        .symbols-container {
            position: fixed;
            inset: 0;
            z-index: 3;
            pointer-events: none;
        }

        .symbol {
            position: absolute;
            font-family: 'Times New Roman', serif;
            font-weight: bold;
            color: rgba(102, 126, 234, 0.6);
            text-shadow: 0 0 20px rgba(102, 126, 234, 0.8);
            will-change: transform;
        }

        /* Content Container */
        .coming-soon-container {
            position: relative;
            z-index: 10;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            text-align: center;
        }

        .main-title h1 {
            font-size: 8rem;
            font-weight: 900;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 30px;
            letter-spacing: 8px;
            animation: glow-pulse 3s ease-in-out infinite;
        }

        @keyframes glow-pulse {
            0%, 100% { filter: brightness(1) drop-shadow(0 0 40px rgba(102, 126, 234, 0.5)); }
            50% { filter: brightness(1.4) drop-shadow(0 0 80px rgba(102, 126, 234, 0.8)); }
        }

        .main-title .coming-soon {
            font-size: 3rem;
            color: #a8b2d1;
            font-weight: 300;
            letter-spacing: 8px;
            text-transform: uppercase;
            animation: fade-pulse 2s ease-in-out infinite;
            margin-bottom: 20px;
        }

        @keyframes fade-pulse {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 1; }
        }

        .main-title .subtitle {
            font-size: 1.3rem;
            color: #8892b0;
            font-style: italic;
            letter-spacing: 2px;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .main-title h1 {
                font-size: 4rem;
                letter-spacing: 4px;
            }

            .main-title .coming-soon {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <!-- Galaxy Background -->
    <div class="galaxy"></div>
    <div class="nebula"></div>

    <!-- Stars -->
    <div class="stars" id="stars-container"></div>

    <!-- Floating Symbols -->
    <div class="symbols-container" id="symbols-container"></div>

    <!-- Main Content -->
    <div class="coming-soon-container">
        <div class="main-title">
            <h1>HERE.news</h1>
            <p class="coming-soon">Coming Soon...</p>
            <p class="subtitle">The Future of Truth Discovery</p>
        </div>
    </div>

    <script>
        // Generate random stars
        const starsContainer = document.getElementById('stars-container');
        const starCount = 200;

        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.width = Math.random() * 3 + 'px';
            star.style.height = star.style.width;
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDuration = (Math.random() * 3 + 2) + 's';
            star.style.animationDelay = Math.random() * 3 + 's';
            starsContainer.appendChild(star);
        }

        // Floating Mathematical Symbols - Space Travel
        const symbolsContainer = document.getElementById('symbols-container');
        const symbols = ['?', 'φ', 'ψ', 'ω', 'Ω', 'Σ', 'Δ', 'Θ', 'Λ', 'Π', 'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'κ', 'λ', 'μ', 'ν', 'ξ', 'π', 'ρ', 'σ', 'τ', 'υ', 'χ', '⌛', '⌛', '∞', '∞'];
        const symbolCount = 40;
        const symbolObjects = [];

        // Mouse position (normalized 0 to 1)
        let mouseX = 0.5;
        let mouseY = 0.5;
        let centerX = window.innerWidth / 2;
        let centerY = window.innerHeight / 2;

        class FloatingSymbol {
            constructor() {
                this.reset();
            }

            reset() {
                if (!this.element) {
                    this.element = document.createElement('div');
                    this.element.className = 'symbol';
                    symbolsContainer.appendChild(this.element);
                }

                this.element.textContent = symbols[Math.floor(Math.random() * symbols.length)];

                // Depth simulation (z-axis) - start small and grow
                this.z = 0.2 + Math.random() * 0.3;
                this.baseSize = 30 + Math.random() * 50;
                this.updateSize();

                // Start from center area and expand outward
                const angle = Math.random() * Math.PI * 2;
                const distance = 50 + Math.random() * 150;

                this.x = centerX + Math.cos(angle) * distance;
                this.y = centerY + Math.sin(angle) * distance;

                this.active = true;
                this.element.style.display = 'block';
            }

            updateSize() {
                const scale = 0.5 + this.z * 0.5;
                this.size = this.baseSize * scale;
                this.element.style.fontSize = this.size + 'px';
                this.element.style.opacity = 0.5 + this.z * 0.4;
            }

            destroy() {
                this.active = false;
                this.element.style.display = 'none';
                setTimeout(() => this.reset(), 1000 + Math.random() * 2000);
            }

            update() {
                if (!this.active) return;

                // Vector from center to symbol
                const dx = this.x - centerX;
                const dy = this.y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Travel direction influenced by mouse (steering effect)
                const travelX = (mouseX - 0.5) * 8;
                const travelY = (mouseY - 0.5) * 8;

                // Speed based on depth (closer = faster parallax)
                const speed = 2 + this.z * 6;

                // Move symbols outward from center (traveling through space)
                if (dist > 1) {
                    const dirX = dx / dist;
                    const dirY = dy / dist;

                    // Push outward + steering
                    this.x += dirX * speed + travelX;
                    this.y += dirY * speed + travelY;
                }

                // Update depth (move closer over time for parallax effect)
                this.z += 0.005;
                if (this.z > 1) this.z = 1;
                this.updateSize();

                // Rotation based on movement
                const rotation = (this.x * 0.1 + this.y * 0.1) % 360;

                // Respawn if out of bounds
                const margin = 200;
                if (this.x < -margin || this.x > window.innerWidth + margin ||
                    this.y < -margin || this.y > window.innerHeight + margin) {
                    this.reset();
                    return;
                }

                // Update DOM
                this.element.style.transform = `translate(${this.x}px, ${this.y}px) rotate(${rotation}deg)`;
            }
        }

        // Create symbols
        for (let i = 0; i < symbolCount; i++) {
            symbolObjects.push(new FloatingSymbol());
        }

        // Track mouse movement
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX / window.innerWidth;
            mouseY = e.clientY / window.innerHeight;
        });

        // Update center on resize
        window.addEventListener('resize', () => {
            centerX = window.innerWidth / 2;
            centerY = window.innerHeight / 2;
        });

        // Animation loop
        function animate() {
            symbolObjects.forEach(symbol => symbol.update());
            requestAnimationFrame(animate);
        }
        animate();
    </script>
</body>
</html>
"""


@app.get("/switcher", response_class=HTMLResponse)
async def switcher():
    return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>App Switcher - RE News</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            max-width: 700px;
            width: 100%;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }

        .header h1 {
            font-size: 2rem;
            margin-bottom: 10px;
            font-weight: 700;
        }

        .header p {
            font-size: 1rem;
            opacity: 0.9;
        }

        .content {
            padding: 40px;
        }

        .app-option {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }

        .app-option:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
            border-color: #667eea;
        }

        .app-option.active {
            background: #e7f0ff;
            border-color: #667eea;
        }

        .app-option h3 {
            color: #667eea;
            font-size: 1.3rem;
            margin-bottom: 8px;
            font-weight: 600;
        }

        .app-option .description {
            color: #495057;
            font-size: 0.95rem;
            line-height: 1.5;
        }

        .current-app {
            background: #d4edda;
            border: 2px solid #28a745;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 25px;
            text-align: center;
        }

        .current-app strong {
            color: #155724;
            font-size: 1.1rem;
        }

        .actions {
            margin-top: 25px;
            text-align: center;
        }

        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            font-size: 1rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            text-decoration: none;
            display: inline-block;
            margin: 5px;
            transition: all 0.3s ease;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary {
            background: #6c757d;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔄 App Switcher</h1>
            <p>Select which app to use</p>
        </div>

        <div class="content">
            <div id="current-app" class="current-app">
                <strong>Current App: <span id="current-app-name">Loading...</span></strong>
            </div>

            <div id="apps-container">
                <div style="text-align: center; padding: 40px 20px; color: #666;">
                    <div style="margin-bottom: 10px;">Loading active apps...</div>
                    <div style="font-size: 0.9em;">Apps will appear here once they register with the gateway</div>
                </div>
            </div>

            <div class="actions">
                <button class="btn" id="apply-btn">Apply Selection</button>
                <a href="/" class="btn btn-secondary">Back to Gateway</a>
            </div>
        </div>
    </div>

    <script>
        let selectedApp = null;
        let apps = [];

        // Get current cookie value
        function getCookie(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        }

        // Load active apps from beacon API
        async function loadApps() {
            try {
                const response = await fetch('/api/apps/active');
                const data = await response.json();
                apps = data.apps || [];

                const container = document.getElementById('apps-container');

                if (apps.length === 0) {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 40px 20px; color: #666;">
                            <div style="font-size: 1.2em; margin-bottom: 10px;">🔍 No active apps available</div>
                            <div style="font-size: 0.9em;">Apps will appear here when they:</div>
                            <div style="font-size: 0.9em; margin-top: 5px;">1. Register with the gateway</div>
                            <div style="font-size: 0.9em;">2. Send heartbeats (every 30s)</div>
                            <div style="font-size: 0.9em; margin-top: 10px; color: #999;">Refresh this page after starting an app</div>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = apps.map(app => `
                    <div class="app-option" data-app="${app.id}">
                        <h3>${app.icon} ${app.name}</h3>
                        <div class="description">${app.description}</div>
                        <div style="font-size: 0.85em; color: #999; margin-top: 5px;">v${app.version} • ${app.routes.base}</div>
                    </div>
                `).join('');

                // Get current app
                const currentApp = getCookie('active_app') || (apps.length > 0 ? apps[0].id : 'none');
                const currentAppData = apps.find(a => a.id === currentApp);
                document.getElementById('current-app-name').textContent =
                    currentAppData ? currentAppData.name : currentApp;

                // Highlight current app and set initial selection
                document.querySelectorAll('.app-option').forEach(option => {
                    if (option.dataset.app === currentApp) {
                        option.classList.add('active');
                        selectedApp = currentApp;
                    }

                    // Add click handler
                    option.addEventListener('click', () => {
                        document.querySelectorAll('.app-option').forEach(o => o.classList.remove('active'));
                        option.classList.add('active');
                        selectedApp = option.dataset.app;
                    });
                });

            } catch (error) {
                console.error('Failed to load apps:', error);
                document.getElementById('apps-container').innerHTML = `
                    <div style="text-align: center; padding: 40px 20px; color: #d32f2f;">
                        <div style="font-size: 1.2em; margin-bottom: 10px;">⚠️ Failed to load apps</div>
                        <div style="font-size: 0.9em;">Please refresh the page or check the gateway service</div>
                    </div>
                `;
            }
        }

        // Apply selection and redirect
        document.getElementById('apply-btn').addEventListener('click', () => {
            if (selectedApp) {
                // Set cookie for 30 days
                const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
                document.cookie = `active_app=${selectedApp}; expires=${expires}; path=/`;

                // Redirect to app homepage
                window.location.href = '/app';
            }
        });

        // Load apps on page load
        loadApps();
    </script>
</body>
</html>
"""


@app.get("/api/apps")
async def get_apps():
    """Return list of available apps"""
    return {
        "apps": [
            {
                "name": "StoryChat",
                "path": "/storychat",
                "port": 8001,
                "description": "Main chat interface for story exploration",
                "status": "running"
            },
            {
                "name": "Jimmy Lai Quest",
                "path": "/jimmylai",
                "port": 8000,
                "description": "Truth Market experiment",
                "status": "running"
            }
        ]
    }


@app.post("/api/apps/register")
async def register_app(registration: AppRegistration):
    """Register or update an app in the registry"""
    app_registry[registration.id] = {
        **registration.dict(),
        "last_heartbeat": datetime.now(),
        "registered_at": app_registry.get(registration.id, {}).get("registered_at", datetime.now())
    }
    return {"status": "registered", "app_id": registration.id}

@app.post("/api/apps/heartbeat")
async def app_heartbeat(heartbeat: AppHeartbeat):
    """Update app heartbeat timestamp"""
    if heartbeat.id in app_registry:
        app_registry[heartbeat.id]["last_heartbeat"] = datetime.now()
        return {"status": "ok"}
    return {"status": "not_registered", "message": "App needs to register first"}

@app.get("/api/apps/active")
async def get_active_apps():
    """Get list of active apps (heartbeat within last 60 seconds)"""
    cutoff = datetime.now() - timedelta(seconds=60)
    active_apps = []

    for app_id, app_data in app_registry.items():
        if app_data.get("status") == "active" and app_data.get("last_heartbeat", datetime.min) > cutoff:
            active_apps.append({
                "id": app_data["id"],
                "name": app_data["name"],
                "description": app_data["description"],
                "icon": app_data["icon"],
                "routes": app_data["routes"],
                "version": app_data["version"],
                "last_seen": app_data["last_heartbeat"].isoformat()
            })

    return {"apps": active_apps}

@app.get("/api/apps/all")
async def get_all_apps():
    """Get all registered apps regardless of status"""
    all_apps = []
    for app_id, app_data in app_registry.items():
        all_apps.append({
            "id": app_data["id"],
            "name": app_data["name"],
            "description": app_data["description"],
            "icon": app_data["icon"],
            "routes": app_data["routes"],
            "version": app_data["version"],
            "status": app_data["status"],
            "last_seen": app_data.get("last_heartbeat", datetime.min).isoformat()
        })
    return {"apps": all_apps}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "gateway"}
