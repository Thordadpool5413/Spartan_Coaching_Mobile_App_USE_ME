# Production Dockerfile for FastAPI backend on Render
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt \
        --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Copy application code
COPY . .

# Render injects PORT env var dynamically. Default to 8001 for local docker runs.
ENV PORT=8001
EXPOSE 8001

# Start uvicorn bound to 0.0.0.0:$PORT for Render's port forwarding
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001} --workers 2"]
