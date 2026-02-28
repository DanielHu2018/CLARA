#!/bin/bash
# Railway startup script for CLARA backend

# Use Railway's PORT environment variable, default to 8000 for local
PORT=${PORT:-8000}

echo "Starting CLARA backend on port $PORT..."
uvicorn main:app --host 0.0.0.0 --port $PORT
