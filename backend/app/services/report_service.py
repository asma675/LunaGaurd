"""
LunaGuard Report Service.

Generates a comprehensive, JSON-serialisable mission report dict suitable for
download from the frontend.  All values are derived from computed metrics —
nothing is hardcoded.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

import structlog

from app.models.mission import RecoveryResult, RoutePlanResponse, RouteProfile

logger = structlog.get_logger(__name__)


def generate_report(
    plan_response: RoutePlanResponse,
    recovery: Optional[RecoveryResult] = None,
) -> dict[str, Any]:
    """Build a full mission report as a JSON-serialisable dict.

    Parameters
    ----------
    plan_response:
        The route plan output from the planner (all three profiles).
    recovery:
        Optional emergency recovery result, included if an emergency occurred.

    Returns
    -------
    dict
        Structured report with mission_config, terrain summary, route analyses,
        recommended_profile, optional emergency_recovery, and report metadata.
    """
    generated_at = datetime.now(timezone.utc).isoformat()

    # Summarise terrain
    meta = plan_response.terrain_metadata
    terrain_summary: dict[str, Any] = {
        "grid_dimensions": f"{meta.grid_rows}×{meta.grid_cols}",
        "cell_size_m": meta.cell_size_m,
        "total_area_km2": round(
            (meta.grid_rows * meta.cell_size_m * meta.grid_cols * meta.cell_size_m) / 1e6, 2
        ),
        "data_source": meta.data_source,
        "is_synthetic": meta.is_synthetic,
        "processing_date": meta.processing_date,
    }

    # Route analyses
    route_analyses: list[dict[str, Any]] = []
    for route in plan_response.routes:
        m = route.metrics
        analysis: dict[str, Any] = {
            "profile": route.profile.value,
            "path_cells": len(route.path),
            "viable": m.viable,
            "metrics": {
                "total_distance_m": round(m.total_distance_m, 1),
                "travel_time_hours": round(m.travel_time_hours, 4),
                "energy_consumed_wh": round(m.energy_consumed_wh, 2),
                "battery_remaining_wh": round(m.battery_remaining_wh, 2),
                "battery_reserve_percent": round(m.battery_reserve_percent, 2),
                "max_slope_deg": round(m.max_slope_deg, 2),
                "avg_slope_deg": round(m.avg_slope_deg, 2),
                "cumulative_hazard": round(m.cumulative_hazard, 3),
                "high_risk_cells": m.high_risk_cells,
                "risk_score": round(m.risk_score, 2),
                "mission_success_score": round(m.mission_success_score, 2),
                "calculation_time_ms": round(m.calculation_time_ms, 2),
            },
            "warnings": m.warnings,
            "explanation_evidence": route.explanation_evidence,
        }
        route_analyses.append(analysis)

    # Recommended route detail
    recommended: Optional[dict[str, Any]] = None
    for route in plan_response.routes:
        if route.profile == plan_response.recommended_profile:
            recommended = {
                "profile": route.profile.value,
                "risk_score": round(route.metrics.risk_score, 2),
                "mission_success_score": round(route.metrics.mission_success_score, 2),
                "battery_reserve_percent": round(route.metrics.battery_reserve_percent, 2),
            }
            break

    # Emergency recovery section
    recovery_section: Optional[dict[str, Any]] = None
    if recovery is not None:
        rec_m = recovery.recovery_route.metrics
        orig_m = recovery.original_route_metrics_after
        recovery_section = {
            "original_route_viable_post_emergency": recovery.original_route_viable,
            "original_remaining_metrics": {
                "risk_score": round(orig_m.risk_score, 2),
                "battery_reserve_percent": round(orig_m.battery_reserve_percent, 2),
                "total_distance_m": round(orig_m.total_distance_m, 1),
                "viable": orig_m.viable,
            },
            "recovery_route_metrics": {
                "risk_score": round(rec_m.risk_score, 2),
                "battery_reserve_percent": round(rec_m.battery_reserve_percent, 2),
                "total_distance_m": round(rec_m.total_distance_m, 1),
                "max_slope_deg": round(rec_m.max_slope_deg, 2),
                "viable": rec_m.viable,
            },
            "deltas": {
                "risk_reduction": round(recovery.risk_reduction, 2),
                "battery_reserve_change": round(recovery.battery_reserve_change, 2),
                "distance_change_m": round(recovery.distance_change_m, 1),
                "max_slope_change": round(recovery.max_slope_change, 2),
                "mission_success_change": round(recovery.mission_success_change, 2),
            },
            "recommendation": recovery.recommendation,
            "explanation": recovery.explanation,
        }

    # Mission config summary
    cfg = plan_response.mission_config
    mission_config_summary: dict[str, Any] = {
        "start": {"row": cfg.start.row, "col": cfg.start.col},
        "destination": {"row": cfg.destination.row, "col": cfg.destination.col},
        "rover": {
            "battery_capacity_wh": cfg.rover.battery_capacity_wh,
            "battery_percent": cfg.rover.battery_percent,
            "emergency_reserve_percent": cfg.rover.emergency_reserve_percent,
            "base_energy_per_metre": cfg.rover.base_energy_per_metre,
            "max_slope_deg": cfg.rover.max_slope_deg,
            "speed_mps": cfg.rover.speed_mps,
            "risk_tolerance": cfg.rover.risk_tolerance,
        },
    }

    report: dict[str, Any] = {
        "report_version": "1.0.0",
        "generated_at": generated_at,
        "service": "lunaguard-backend",
        "mission_config": mission_config_summary,
        "terrain": terrain_summary,
        "route_analyses": route_analyses,
        "recommended_profile": plan_response.recommended_profile.value,
        "recommended_route_summary": recommended,
        "emergency_recovery": recovery_section,
        "notes": (
            "All scores are formula-based. See AGENTS.md §7 for traceability. "
            "Terrain is SYNTHETIC — not real NASA/LOLA data."
            if meta.is_synthetic
            else "Terrain loaded from external DEM."
        ),
    }

    logger.info(
        "report.generated",
        profiles=len(route_analyses),
        has_recovery=recovery is not None,
    )
    return report
