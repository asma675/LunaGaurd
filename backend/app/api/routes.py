"""
LunaGuard routes API router.

Endpoints:
  POST /api/routes/plan      — RoutePlanResponse (all three profiles)
  POST /api/routes/reassess  — RecoveryResult (emergency reassessment)
  POST /api/routes/replan    — RouteResult (single SAFEST replan, no comparison)
"""

from __future__ import annotations

import time

import structlog
from fastapi import APIRouter, HTTPException

from app.models.mission import (
    MissionRequest,
    ReassessRequest,
    RecoveryResult,
    RoutePlanResponse,
    RouteProfile,
    RouteResult,
)
from app.services.emergency_service import EmergencyService
from app.services.energy_model import compute_route_metrics
from app.services.explainability import ExplainabilityService
from app.services.route_planner import AStarPlanner
from app.services.terrain_service import get_terrain

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/routes", tags=["routes"])

_explainability = ExplainabilityService()
_emergency = EmergencyService()


# ---------------------------------------------------------------------------
# POST /api/routes/plan
# ---------------------------------------------------------------------------


@router.post("/plan", response_model=RoutePlanResponse)
async def plan_routes(request: MissionRequest) -> RoutePlanResponse:
    """Plan three routes (FASTEST, LOWEST_ENERGY, SAFEST) for a mission."""
    terrain = get_terrain()
    rows, cols = terrain.metadata.grid_rows, terrain.metadata.grid_cols

    # Validate grid positions
    for label, pt in [("start", request.start), ("destination", request.destination)]:
        if not (0 <= pt.row < rows and 0 <= pt.col < cols):
            raise HTTPException(
                status_code=422,
                detail=f"{label} ({pt.row},{pt.col}) is outside the {rows}×{cols} grid",
            )
        if not terrain.traversable[pt.row][pt.col]:
            raise HTTPException(
                status_code=422,
                detail=f"{label} ({pt.row},{pt.col}) is not traversable",
            )

    planner = AStarPlanner(terrain)

    t0 = time.perf_counter()
    all_paths = planner.plan_all_profiles(
        start=request.start,
        dest=request.destination,
        rover=request.rover,
    )
    logger.info("routes.all_planned", elapsed_ms=f"{(time.perf_counter()-t0)*1000:.1f}")

    route_results: list[RouteResult] = []
    for profile, path in all_paths.items():
        if path is None:
            # Build a non-viable result to communicate the failure
            from app.services.emergency_service import _abort_metrics
            metrics = _abort_metrics(request.rover)
            metrics = metrics.model_copy(
                update={"warnings": [f"No path found for profile {profile.value}"]}
            )
            route_results.append(
                RouteResult(
                    profile=profile,
                    path=[request.start],
                    metrics=metrics,
                    explanation_evidence={"error": f"No traversable path for {profile.value}"},
                )
            )
            continue

        metrics = compute_route_metrics(path, terrain, request.rover, profile)
        evidence = _explainability.explain_route(
            RouteResult(profile=profile, path=path, metrics=metrics, explanation_evidence={}),
            request.rover,
            profile,
        )
        route_results.append(
            RouteResult(profile=profile, path=path, metrics=metrics, explanation_evidence=evidence)
        )

    # Recommend the profile with the highest mission_success_score among viable routes
    viable_routes = [r for r in route_results if r.metrics.viable]
    if viable_routes:
        best = max(viable_routes, key=lambda r: r.metrics.mission_success_score)
        recommended = best.profile
    elif route_results:
        # No viable — recommend the one with lowest risk_score
        best = min(route_results, key=lambda r: r.metrics.risk_score)
        recommended = best.profile
    else:
        recommended = RouteProfile.SAFEST

    return RoutePlanResponse(
        mission_config=request,
        routes=route_results,
        recommended_profile=recommended,
        terrain_metadata=terrain.metadata,
    )


# ---------------------------------------------------------------------------
# POST /api/routes/reassess
# ---------------------------------------------------------------------------


@router.post("/reassess", response_model=RecoveryResult)
async def reassess_route(request: ReassessRequest) -> RecoveryResult:
    """Reassess the mission after an in-flight emergency and plan a recovery route."""
    terrain = get_terrain()
    rows, cols = terrain.metadata.grid_rows, terrain.metadata.grid_cols

    pt = request.current_position
    if not (0 <= pt.row < rows and 0 <= pt.col < cols):
        raise HTTPException(
            status_code=422,
            detail=f"current_position ({pt.row},{pt.col}) is outside the {rows}×{cols} grid",
        )

    return _emergency.reassess_route(request, terrain)


# ---------------------------------------------------------------------------
# POST /api/routes/replan
# ---------------------------------------------------------------------------


@router.post("/replan", response_model=RouteResult)
async def replan_route(request: MissionRequest) -> RouteResult:
    """Plan a single SAFEST route without comparison (lightweight replan)."""
    terrain = get_terrain()
    rows, cols = terrain.metadata.grid_rows, terrain.metadata.grid_cols

    for label, pt in [("start", request.start), ("destination", request.destination)]:
        if not (0 <= pt.row < rows and 0 <= pt.col < cols):
            raise HTTPException(
                status_code=422,
                detail=f"{label} ({pt.row},{pt.col}) is outside the {rows}×{cols} grid",
            )

    planner = AStarPlanner(terrain)
    path = planner.plan(
        start=request.start,
        dest=request.destination,
        rover=request.rover,
        profile=RouteProfile.SAFEST,
    )

    if path is None:
        raise HTTPException(
            status_code=409,
            detail="No traversable path found from start to destination with SAFEST constraints",
        )

    metrics = compute_route_metrics(path, terrain, request.rover, RouteProfile.SAFEST)
    result = RouteResult(
        profile=RouteProfile.SAFEST,
        path=path,
        metrics=metrics,
        explanation_evidence={},
    )
    evidence = _explainability.explain_route(result, request.rover, RouteProfile.SAFEST)
    return result.model_copy(update={"explanation_evidence": evidence})
