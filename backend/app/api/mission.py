"""
LunaGuard mission API router.

Endpoints:
  POST /api/mission/report  — Full mission report dict (download-ready JSON)
"""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.models.mission import RecoveryResult, RoutePlanResponse
from app.services.report_service import generate_report

router = APIRouter(prefix="/api/mission", tags=["mission"])


class ReportRequest(BaseModel):
    """Request body for POST /api/mission/report."""

    plan: RoutePlanResponse
    recovery: Optional[RecoveryResult] = None


@router.post("/report")
async def mission_report(request: ReportRequest) -> dict[str, Any]:
    """Generate a comprehensive mission report suitable for download."""
    return generate_report(request.plan, request.recovery)
