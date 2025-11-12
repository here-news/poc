Mini Experiment Skeleton

- Dockerized FastAPI backend serving a static UI
- Minimal React + TypeScript (TSX) frontend built with Vite
- Mirrors this repo’s run style: `docker compose up --build` on port 8000

Quickstart

- cd `mini`
- Run: `docker compose up --build`
- Open: `http://localhost:8000`

Dev Tips

- Backend changes: files under `mini/app` are copied into the image at build time. Rebuild to apply: `docker compose up --build`.
- Frontend changes: edit files under `mini/frontend`; rebuild to regenerate the static UI bundle.
- Optional: run the frontend locally with `npm run dev` inside `mini/frontend` for faster iteration, then `npm run build` to update the bundle. The container uses the built `/frontend/dist` output.

Endpoints

- `/` serves the built UI (React app)
- `/api/hello` simple JSON hello endpoint

Structure

- `mini/app` FastAPI app
- `mini/frontend` React + TSX source (Vite)
- `mini/ui` populated at image build time with the compiled frontend
- `mini/Dockerfile` multi-stage build (Node for UI, Python for API)
- `mini/docker-compose.yml` one service on port 8000

