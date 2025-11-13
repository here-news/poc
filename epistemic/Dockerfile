# Stage 1: Build frontend with Node.js
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Copy frontend files
COPY frontend/package*.json ./
COPY frontend/tsconfig.json ./
COPY frontend/vite.config.ts ./
COPY frontend/index.html ./
COPY frontend/src ./src

# Install dependencies and build
RUN npm install && npm run build

# Stage 2: Python backend
FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Copy app metadata and mockup HTML (for reference)
COPY app.json ./
COPY mockup.html ./

# Copy built frontend from stage 1
COPY --from=frontend-builder /frontend/dist ./static

# Expose port (internal only, nginx will route)
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
