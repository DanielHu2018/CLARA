"""
CLARA — System Health Router
Provides system health and status endpoints.
"""

from fastapi import APIRouter
from datetime import datetime
import psutil
import platform

router = APIRouter()


@router.get("/")
async def get_system_health():
    """Get overall system health metrics."""
    return {
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat(),
        "system": {
            "platform": platform.system(),
            "python_version": platform.python_version(),
        },
        "resources": {
            "cpu_percent": psutil.cpu_percent(interval=0.1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent if platform.system() != "Windows" else psutil.disk_usage('C:\\').percent,
        }
    }


@router.get("/ping")
async def ping():
    """Simple ping endpoint for health checks."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
