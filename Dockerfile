# Multi-stage build for better caching
FROM python:3.11-slim as python-base

# Set working directory
WORKDIR /app

# Install system dependencies in single layer
RUN apt-get update && apt-get install -y \
    curl \
    libnss3 \
    libnspr4 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libasound2 \
    libcups2 \
    libxfixes3 \
    libpango-1.0-0 \
    libcairo2 \
    fonts-liberation \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Stage for Python dependencies and Playwright - heavily cached
FROM python-base as deps-stage

# Copy requirements.txt first for better layer caching
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --timeout=300 --retries=5 -r requirements.txt

# Install Playwright browsers (this will be cached in Docker layer)
RUN playwright install chromium

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

# Copy GCS credentials
COPY sage-striker-294302-b89a8b7e205b.json ./

# Expose port 9494
EXPOSE 9494

# Start the FastAPI server
CMD ["python", "server.py"]
