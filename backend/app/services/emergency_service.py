"""
LunaGuard Emergency Service.

Handles mid-mission emergencies by:
1. Applying the emergency event to the rover configuration
2. Re-evaluating the remaining original route under new constraints
3. Running A* from the current position to the destination with updated constraints
4. Generating a deterministic template-based explanation (no LLM)
5. Returning a full RecoveryResult with all delta fields computed from real metrics
"""

from __future__ import annotations

import copy

import structlog

from app.models.mission import (
    EmergencyEvent,
    EmergencyType,
    GridPoint,
    MissionRequest,
    ReassessRequest,
    RecoveryResult,
    RouteMetrics,
    RouteProfile,
    RouteResult,
    RoverConfig,
)
from app.models.terrain import TerrainGrid
from app.services.energy_model import compute_route_metrics
from app.services.explainability import ExplainabilityService
from app.services.route_planner import AStarPlanner

logger = structlog.get_logger(__name__)


class EmergencyService:
    """Reassesses and replans a rover mission after an in-flight emergency."""

    def __init__(self) -> None:
        self._explainability = ExplainabilityService()

    def reassess_route(
        self,
        request: ReassessRequest,
        terrain: TerrainGrid,
    ) -> RecoveryResult:
        """Core emergency reassessment pipeline.

        Steps:
        1. Apply emergency event → modified RoverConfig
        2. Compute remaining original route metrics (from current_position onward)
        3. Re-plan from current_position using modified constraints (SAFEST profile)
        4. Compute delta metrics (recovery − original_post_emergency)
        5. Determine recommendation
        6. Generate deterministic explanation

        Returns RecoveryResult with all fields populated from real calculations.
        """
        logger.info(
            "emergency.reassess_start",
            type=request.emergency.type.value,
            position=f"({request.current_position.row},{request.current_position.col})",
        )

        # 1. Apply emergency to rover
        updated_rover = self._apply_emergency(
            request.original_request.rover, request.emergency
        )

        # 2. Compute remaining original route metrics under emergency conditions
        original_remaining_path = _slice_path_from(
            request.active_route.path, request.current_position
        )

        blocked_extra = _obstructed_set(request.emergency)

        original_post_metrics = compute_route_metrics(
            original_remaining_path,
            terrain,
            updated_rover,
            RouteProfile.SAFEST,
        )

        # A terrain obstruction is an external hard constraint, so the original
        # route becomes non-viable if any newly blocked cell is still ahead.
        blocked_on_original = [
            pt for pt in original_remaining_path[1:]
            if (pt.row, pt.col) in blocked_extra
        ]
        if blocked_on_original:
            warnings = list(original_post_metrics.warnings)
            warnings.append(
                f"Original route intersects {len(blocked_on_original)} newly obstructed cell(s)"
            )
            original_post_metrics = original_post_metrics.model_copy(
                update={"viable": False, "warnings": warnings}
            )

        original_route_viable = original_post_metrics.viable

        # 3. Re-plan from current position to destination (SAFEST profile)
        planner = AStarPlanner(terrain)
        recovery_path = planner.plan(
            start=request.current_position,
            dest=request.original_request.destination,
            rover=updated_rover,
            profile=RouteProfile.SAFEST,
            blocked_extra=blocked_extra,
        )

        if recovery_path is None:
            # No recovery route possible — recommend abort
            logger.warning(
                "emergency.no_recovery_route",
                from_pos=f"({request.current_position.row},{request.current_position.col})",
            )
            # Build a degenerate recovery result (single-cell, non-viable)
            abort_metrics = _abort_metrics(updated_rover)
            abort_route = RouteResult(
                profile=RouteProfile.SAFEST,
                path=[request.current_position],
                metrics=abort_metrics,
                explanation_evidence={"note": "No traversable path found — abort recommended"},
            )
            explanation = self._generate_explanation(
                original_post_metrics, abort_metrics, request.emergency, aborted=True
            )
            return RecoveryResult(
                original_route_viable=original_route_viable,
                original_route_metrics_after=original_post_metrics,
                recovery_route=abort_route,
                risk_reduction=original_post_metrics.risk_score - abort_metrics.risk_score,
                battery_reserve_change=(
                    abort_metrics.battery_reserve_percent
                    - original_post_metrics.battery_reserve_percent
                ),
                distance_change_m=0.0,
                max_slope_change=0.0,
                mission_success_change=(
                    abort_metrics.mission_success_score
                    - original_post_metrics.mission_success_score
                ),
                recommendation="ABORT",
                explanation=explanation,
            )

        # 4. Compute recovery metrics
        recovery_metrics = compute_route_metrics(
            recovery_path,
            terrain,
            updated_rover,
            RouteProfile.SAFEST,
        )

        evidence = self._explainability.explain_route(
            RouteResult(
                profile=RouteProfile.SAFEST,
                path=recovery_path,
                metrics=recovery_metrics,
                explanation_evidence={},
            ),
            updated_rover,
            RouteProfile.SAFEST,
        )

        recovery_route = RouteResult(
            profile=RouteProfile.SAFEST,
            path=recovery_path,
            metrics=recovery_metrics,
            explanation_evidence=evidence,
        )

        # 5. Delta metrics (recovery − original_post_emergency)
        risk_reduction = (
            original_post_metrics.risk_score - recovery_metrics.risk_score
        )
        battery_reserve_change = (
            recovery_metrics.battery_reserve_percent
            - original_post_metrics.battery_reserve_percent
        )
        distance_change_m = (
            recovery_metrics.total_distance_m - original_post_metrics.total_distance_m
        )
        max_slope_change = (
            recovery_metrics.max_slope_deg - original_post_metrics.max_slope_deg
        )
        mission_success_change = (
            recovery_metrics.mission_success_score
            - original_post_metrics.mission_success_score
        )

        # 6. Recommendation
        if not recovery_metrics.viable:
            recommendation = "ABORT"
        elif not original_route_viable:
            recommendation = "FOLLOW_RECOVERY_ROUTE"
        elif risk_reduction >= 5.0 or battery_reserve_change >= 3.0:
            recommendation = "FOLLOW_RECOVERY_ROUTE"
        else:
            recommendation = "CONTINUE_ORIGINAL"

        # 7. Explanation
        explanation = self._generate_explanation(
            original_post_metrics, recovery_metrics, request.emergency, aborted=False
        )

        logger.info(
            "emergency.reassess_done",
            recommendation=recommendation,
            risk_reduction=f"{risk_reduction:.1f}",
            reserve_change=f"{battery_reserve_change:.1f}%",
        )

        return RecoveryResult(
            original_route_viable=original_route_viable,
            original_route_metrics_after=original_post_metrics,
            recovery_route=recovery_route,
            risk_reduction=risk_reduction,
            battery_reserve_change=battery_reserve_change,
            distance_change_m=distance_change_m,
            max_slope_change=max_slope_change,
            mission_success_change=mission_success_change,
            recommendation=recommendation,
            explanation=explanation,
        )

    # ------------------------------------------------------------------
    # Apply emergency
    # ------------------------------------------------------------------

    def _apply_emergency(
        self, rover: RoverConfig, emergency: EmergencyEvent
    ) -> RoverConfig:
        """Return a new RoverConfig with the emergency constraints applied.

        The original rover is never mutated.
        """
        data = rover.model_dump()

        if emergency.type == EmergencyType.BATTERY_DEGRADATION:
            loss = emergency.battery_loss_percent or 0.0
            new_pct = max(0.0, data["battery_percent"] - loss)
            data["battery_percent"] = new_pct
            logger.info(
                "emergency.battery_applied",
                original_pct=rover.battery_percent,
                loss=loss,
                new_pct=new_pct,
            )

        elif emergency.type == EmergencyType.REDUCED_MOBILITY:
            reduction = emergency.slope_reduction_deg or 0.0
            new_slope = max(1.0, data["max_slope_deg"] - reduction)
            data["max_slope_deg"] = new_slope
            logger.info(
                "emergency.mobility_applied",
                original_slope=rover.max_slope_deg,
                reduction=reduction,
                new_slope=new_slope,
            )

        # TERRAIN_OBSTRUCTION is handled via blocked_extra in the planner;
        # no rover config change required.

        return RoverConfig(**data)

    # ------------------------------------------------------------------
    # Explanation generator
    # ------------------------------------------------------------------

    def _generate_explanation(
        self,
        original_metrics: RouteMetrics,
        recovery_metrics: RouteMetrics,
        emergency: EmergencyEvent,
        aborted: bool,
    ) -> str:
        """Build a deterministic template explanation using ONLY computed metric values.

        No LLM is used here.  All numbers in the string come directly from the
        RouteMetrics objects — never invented.
        """
        if emergency.type == EmergencyType.BATTERY_DEGRADATION:
            em_desc = f"battery degradation of {(emergency.battery_loss_percent or 0.0):.1f}%"
        elif emergency.type == EmergencyType.REDUCED_MOBILITY:
            em_desc = (
                "reduced mobility "
                f"(max slope reduced by {(emergency.slope_reduction_deg or 0.0):.1f}°)"
            )
        else:
            em_desc = (
                f"terrain obstruction ({len(emergency.obstructed_cells or [])} cell(s) blocked)"
            )

        if aborted:
            return (
                f"Emergency detected: {em_desc}. "
                f"No viable recovery route could be found from the current position. "
                f"Original remaining route risk score: {original_metrics.risk_score:.1f}/100. "
                f"Recommendation: ABORT mission and remain in place pending rescue."
            )

        risk_direction = "reduced" if recovery_metrics.risk_score < original_metrics.risk_score else "increased"
        risk_delta = abs(recovery_metrics.risk_score - original_metrics.risk_score)

        reserve_direction = (
            "improved" if recovery_metrics.battery_reserve_percent > original_metrics.battery_reserve_percent
            else "decreased"
        )
        reserve_delta = abs(
            recovery_metrics.battery_reserve_percent - original_metrics.battery_reserve_percent
        )

        dist_delta = recovery_metrics.total_distance_m - original_metrics.total_distance_m
        dist_desc = (
            f"{abs(dist_delta):.0f} m {'longer' if dist_delta > 0 else 'shorter'}"
        )

        return (
            f"Emergency detected: {em_desc}. "
            f"Original remaining route: risk {original_metrics.risk_score:.1f}/100, "
            f"battery reserve {original_metrics.battery_reserve_percent:.1f}%, "
            f"viable={original_metrics.viable}. "
            f"Recovery route (SAFEST profile): risk {recovery_metrics.risk_score:.1f}/100 "
            f"({risk_direction} by {risk_delta:.1f} pts), "
            f"battery reserve {recovery_metrics.battery_reserve_percent:.1f}% "
            f"({reserve_direction} by {reserve_delta:.1f}%), "
            f"distance {dist_desc}, "
            f"max slope {recovery_metrics.max_slope_deg:.1f}°. "
            f"Mission success score: {recovery_metrics.mission_success_score:.1f}/100."
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _slice_path_from(
    path: list[GridPoint], current_position: GridPoint
) -> list[GridPoint]:
    """Return the sub-path from current_position to the end of path.

    If current_position is not found in path, returns the full path
    (safe fallback — metrics will be slightly over-estimated).
    """
    for i, pt in enumerate(path):
        if pt == current_position:
            return path[i:]
    # Not found — use full remaining path as conservative estimate
    return path


def _obstructed_set(emergency: EmergencyEvent) -> set[tuple[int, int]]:
    """Convert obstructed_cells to a set of (row, col) tuples."""
    if emergency.type != EmergencyType.TERRAIN_OBSTRUCTION or not emergency.obstructed_cells:
        return set()
    return {(pt.row, pt.col) for pt in emergency.obstructed_cells}


def _abort_metrics(rover: RoverConfig) -> RouteMetrics:
    """Return a non-viable zero-distance metrics object for the abort case."""
    return RouteMetrics(
        total_distance_m=0.0,
        travel_time_hours=0.0,
        energy_consumed_wh=0.0,
        battery_remaining_wh=rover.battery_wh,
        battery_reserve_percent=rover.battery_percent,
        max_slope_deg=0.0,
        avg_slope_deg=0.0,
        cumulative_hazard=0.0,
        high_risk_cells=0,
        viable=False,
        risk_score=100.0,
        mission_success_score=0.0,
        calculation_time_ms=0.0,
        warnings=["No traversable path found from current position — ABORT recommended"],
    )
