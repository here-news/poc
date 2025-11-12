from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path


app = FastAPI(
    title="Mini Experiment",
    description="Minimal FastAPI + React TSX skeleton",
    version="0.1.0",
)


# Static UI (built by Vite into /app/ui)
ui_dir = Path(__file__).parent.parent / "ui"
if ui_dir.exists():
    app.mount("/static", StaticFiles(directory=str(ui_dir)), name="static")


@app.get("/")
async def root():
    index_path = ui_dir / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return JSONResponse({"message": "Mini Experiment API", "docs": "/docs"})


@app.get("/api/hello")
async def api_hello():
    return {"message": "Hello from FastAPI", "status": "ok"}

