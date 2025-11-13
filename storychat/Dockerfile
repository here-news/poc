# Multi-stage build for better caching
FROM python:3.11-slim as python-base

# Set working directory
WORKDIR /app

# Install Node.js for React build
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Stage for Python dependencies - lightweight, no Playwright/spaCy
FROM python-base as deps-stage

# Copy requirements.txt first for better layer caching
COPY requirements.txt ./

# Install Python dependencies (now just FastAPI + Google Cloud libs)
RUN pip install --timeout=300 --retries=5 -r requirements.txt

# Final stage
FROM deps-stage as final

# Copy package files for Node.js
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy and build React app (these change more frequently)
COPY app/ ./app/
COPY index.html ./
COPY vite.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
RUN npm run build

# Copy Python server and services
COPY server.py ./
COPY services/ ./services/
COPY templates/ ./templates/

# Copy app metadata for beacon
COPY app.json ./

# Copy GCS credentials
COPY sage-striker-294302-b89a8b7e205b.json ./

# Expose port 8001
EXPOSE 8001

# Start the FastAPI server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
