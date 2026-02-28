"""
Vercel Serverless Function Entry Point for CLARA Backend
"""
import sys
from pathlib import Path

# Add backend directory to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from main import app

# Vercel expects a handler
handler = app
