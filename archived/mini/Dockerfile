###############################
# Frontend build (Vite + React)
###############################
FROM node:20-alpine AS ui-builder
WORKDIR /frontend

# Install deps
COPY frontend/package*.json ./
RUN npm ci || npm install

# Build
COPY frontend/ .
RUN npm run build

###############################
# Backend runtime (FastAPI)
###############################
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python deps
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY app/ ./app/

# Built UI -> served as static files
COPY --from=ui-builder /frontend/dist ./ui/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

