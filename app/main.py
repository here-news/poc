"""
φ HERE - Coherence-First News Platform
Main FastAPI application
"""

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.sessions import SessionMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from pathlib import Path
from contextlib import asynccontextmanager

from app.config import get_settings
from app.routers import auth, coherence, story, comments, chat, preview, events, extraction
from app.database.connection import init_db

# Initialize settings
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup"""
    print("🔧 Initializing database...")
    await init_db()
    print("✅ Database initialized")
    yield
    print("👋 Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="φ HERE",
    description="Coherence-first news platform that ranks stories by epistemic value",
    version="1.0.0",
    lifespan=lifespan
)

# CRITICAL: Session middleware for OAuth
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.jwt_secret_key,
    session_cookie="session",
    max_age=86400,  # 24 hours
    same_site="lax",
    https_only=False  # Must be False when nginx terminates SSL
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:7272", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(coherence.router)
app.include_router(story.router)
app.include_router(comments.router)
app.include_router(chat.router)
app.include_router(preview.router)
app.include_router(events.router)
app.include_router(extraction.router)  # URL extraction and archiving

# Mount static files for frontend (after build)
static_dir = Path("static")
if static_dir.exists():
    app.mount("/app/assets", StaticFiles(directory="static/assets"), name="assets")


@app.get("/", response_class=HTMLResponse)
async def root():
    """Public teaser landing page"""
    teaser_path = Path("teaser.html")
    if not teaser_path.exists():
        return HTMLResponse(content="<h1>φ HERE - Coming Soon</h1>")

    with open(teaser_path, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/test", response_class=HTMLResponse)
async def test_input():
    """Simple test page for debugging IME input"""
    return HTMLResponse(content="""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IME Input Test</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .test-section {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
        }
        h2 {
            color: #666;
            font-size: 1.2rem;
            margin-top: 0;
        }
        textarea {
            width: 100%;
            min-height: 100px;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            font-family: inherit;
            resize: vertical;
            box-sizing: border-box;
        }
        textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        input[type="text"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            font-family: inherit;
            box-sizing: border-box;
        }
        input[type="text"]:focus {
            outline: none;
            border-color: #667eea;
        }
        .output {
            margin-top: 15px;
            padding: 12px;
            background: #f8f8f8;
            border-radius: 4px;
            font-family: monospace;
            white-space: pre-wrap;
            word-break: break-all;
        }
        button {
            margin-top: 10px;
            padding: 10px 20px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
        }
        button:hover {
            background: #5568d3;
        }
        .info {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 6px;
            margin-top: 15px;
            color: #1565c0;
        }
    </style>
</head>
<body>
    <h1>🧪 IME Input Test Page</h1>

    <div class="test-section">
        <h2>Test 1: Plain Textarea</h2>
        <textarea id="textarea1" placeholder="Type Chinese characters here (e.g., 你好)..."></textarea>
        <div class="output">
            Value: <span id="output1">Empty</span><br>
            Length: <span id="length1">0</span>
        </div>
    </div>

    <div class="test-section">
        <h2>Test 2: Input Field</h2>
        <input type="text" id="input1" placeholder="Type Chinese here...">
        <div class="output">
            Value: <span id="output2">Empty</span><br>
            Length: <span id="length2">0</span>
        </div>
    </div>

    <div class="test-section">
        <h2>Test 3: Textarea with Button</h2>
        <textarea id="textarea2" placeholder="Type Chinese, then click Submit..."></textarea>
        <button onclick="submitText()">Submit</button>
        <div class="output">
            Submitted: <span id="output3">Nothing submitted yet</span>
        </div>
    </div>

    <div class="test-section">
        <h2>Test 4: Lit Web Component (Shadow DOM)</h2>
        <test-input></test-input>
        <div class="output">
            Lit value: <span id="output4">Empty</span>
        </div>
    </div>

    <div class="info">
        <strong>Instructions:</strong><br>
        1. Try typing Chinese characters in each field<br>
        2. Watch the output update in real-time<br>
        3. If Test 4 (Lit) DOESN'T work but Tests 1-3 do, the issue is with Lit/Shadow DOM
    </div>

    <script type="module">
        import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';

        class TestInput extends LitElement {
            static properties = {
                value: { type: String }
            };

            constructor() {
                super();
                this.value = '';
                this.textareaRef = null;
            }

            // CRITICAL FIX: Disable Shadow DOM to fix IME composition events
            createRenderRoot() {
                return this;
            }

            static styles = css`
                textarea {
                    width: 100%;
                    min-height: 100px;
                    padding: 12px;
                    border: 2px solid #ddd;
                    border-radius: 6px;
                    font-size: 16px;
                    resize: vertical;
                    box-sizing: border-box;
                }
                textarea:focus {
                    outline: none;
                    border-color: #667eea;
                }
            `;

            firstUpdated() {
                // Now using light DOM, so querySelector directly on 'this'
                this.textareaRef = this.querySelector('textarea');
                if (this.textareaRef) {
                    // Debug composition events
                    this.textareaRef.addEventListener('compositionstart', (e) => {
                        console.log('Composition START:', e.data);
                    });

                    this.textareaRef.addEventListener('compositionupdate', (e) => {
                        console.log('Composition UPDATE:', e.data);
                    });

                    this.textareaRef.addEventListener('compositionend', (e) => {
                        console.log('Composition END:', e.data);
                        // IMPORTANT: Update value after composition ends
                        setTimeout(() => {
                            this.value = this.textareaRef.value;
                            document.getElementById('output4').textContent = this.value || 'Empty';
                        }, 0);
                    });

                    this.textareaRef.addEventListener('input', (e) => {
                        // Only update if NOT composing
                        if (!e.isComposing) {
                            this.value = e.target.value;
                            document.getElementById('output4').textContent = this.value || 'Empty';
                            console.log('Input (not composing):', this.value);
                        }
                    });
                }
            }

            render() {
                return html`
                    <textarea
                        placeholder="Type Chinese in Lit component (with native listener fix)..."
                    ></textarea>
                `;
            }
        }

        customElements.define('test-input', TestInput);
    </script>

    <script>
        // Test 1: Real-time monitoring
        const textarea1 = document.getElementById('textarea1');
        const output1 = document.getElementById('output1');
        const length1 = document.getElementById('length1');

        textarea1.addEventListener('input', (e) => {
            const value = e.target.value;
            output1.textContent = value || 'Empty';
            length1.textContent = value.length;
        });

        // Test 2: Input field monitoring
        const input1 = document.getElementById('input1');
        const output2 = document.getElementById('output2');
        const length2 = document.getElementById('length2');

        input1.addEventListener('input', (e) => {
            const value = e.target.value;
            output2.textContent = value || 'Empty';
            length2.textContent = value.length;
        });

        // Test 3: Button submission
        function submitText() {
            const textarea2 = document.getElementById('textarea2');
            const output3 = document.getElementById('output3');
            output3.textContent = textarea2.value || 'Empty textarea';
        }

        // Log composition events for debugging
        [textarea1, input1, textarea2].forEach(el => {
            el.addEventListener('compositionstart', () => console.log('Composition started on', el.id));
            el.addEventListener('compositionend', () => console.log('Composition ended on', el.id));
        });
    </script>
</body>
</html>
    """)


@app.get("/app", response_class=HTMLResponse)
async def app_route():
    """Authenticated app (serves frontend SPA)"""
    index_path = Path("static/index.html")
    if not index_path.exists():
        return HTMLResponse(
            content="<h1>App Not Built</h1><p>Run frontend build first: cd frontend && npm install && npm run build</p>",
            status_code=503
        )

    with open(index_path, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "phi_here",
        "version": "1.0.0"
    }


@app.get("/{full_path:path}", response_class=HTMLResponse)
async def serve_spa(full_path: str):
    """
    Catch-all for React SPA client-side routing.
    Serves index.html for all routes not matched by API endpoints.

    Must be registered LAST so API routes take precedence.
    """
    index_path = Path("static/index.html")
    if not index_path.exists():
        return HTMLResponse(
            content="<h1>App Not Built</h1>",
            status_code=503
        )

    with open(index_path, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
