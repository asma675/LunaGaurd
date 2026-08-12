"""
LunaGuard mission models.

Covers rover configuration, route planning requests/responses,
and emergency reassessment payloads.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.terrain import TerrainMetadata


# ---------------------------------------------------------------------------
# Primitives
# ---------------------------------------------------------------------------


class GridPoint(BaseModel):
    """A (row, col) position in the terrain grid."""

    row: int = Field(..., ge=0, description="Grid row index (0-based)")
    col: int = Field(..., ge=0, description="Grid column index (0-based)")

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, GridPoint):
            return NotImplemented
        return self.row == other.row and self.col == other.col

    def __hash__(self) -> int:
        return hash((self.row, self.col))


# ---------------------------------------------------------------------------
# Rover Configuration
# ---------------------------------------------------------------------------


class RoverConfig(BaseModel):
    """Physical and operational parameters of the rover.

    All defaults are conservative values suitable for a small lunar scout rover.
    """

    battery_capacity_wh: float = Field(
        default=1000.0, gt=0.0, description="Total battery capacity in Watt-hours"
    )
    battery_percent: float = Field(
        default=100.0,
        ge=0.0,
        le=100.0,
        description="Current state-of-charge as a percentage (0–100)",
    )
    emergency_reserve_percent: float = Field(
        default=15.0,
        ge=0.0,
        lt=100.0,
        description="Battery percentage that must remain after mission completion",
    )
    base_energy_per_metre: float = Field(
        default=0.05,
        gt=0.0,
        description="Baseline energy consumption in Wh per metre of flat travel",
    )
    max_slope_deg: float = Field(
        default=15.0,
        gt=0.0,
        le=45.0,
        description="Hard maximum slope the rover can traverse in degrees",
    )
    speed_mps: float = Field(
        default=0.5, gt=0.0, description="Nominal rover speed in metres per second"
    )
    risk_tolerance: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Operator risk preference (0=ultra-safe, 1=accept high risk)",
    )
    max_duration_hours: Optional[float] = Field(
        default=None, gt=0.0, description="Optional maximum mission duration in hours"
    )

    @property
    def battery_wh(self) -> float:
        """Current battery energy in Wh."""
        return self.battery_capacity_wh * self.battery_percent / 100.0

    @property
    def reserve_wh(self) -> float:
        """Minimum battery energy that must remain."""
        return self.battery_capacity_wh * self.emergency_reserve_percent / 100.0

    @property
    def usable_wh(self) -> float:
        """Battery energy available for the mission (excluding reserve)."""
        return max(0.0, self.battery_wh - self.reserve_wh)


# ---------------------------------------------------------------------------
# Mission Request
# ---------------------------------------------------------------------------


class MissionRequest(BaseModel):
    """A route planning request: start, destination, rover parameters."""

    start: GridPoint
    destination: GridPoint
    rover: RoverConfig = Field(default_factory=RoverConfig)

    @model_validator(mode="after")
    def check_distinct_points(self) -> "MissionRequest":
        if self.start == self.destination:
            raise ValueError("start and destination must be different grid points")
        return self


# ---------------------------------------------------------------------------
# Route Profile
# ---------------------------------------------------------------------------


class RouteProfile(str, Enum):
    """The optimisation objective used when computing the route."""

    FASTEST = "FASTEST"
    LOWEST_ENERGY = "LOWEST_ENERGY"
    SAFEST = "SAFEST"


# ---------------------------------------------------------------------------
# Route Metrics
# ---------------------------------------------------------------------------


class RouteMetrics(BaseModel):
    """Computed quality metrics for a single planned route.

    Every field is derived from terrain + rover + path data —
    no values are hardcoded.
    """

    total_distance_m: float = Field(..., ge=0.0, description="Cumulative path length in metres")
    travel_time_hours: float = Field(..., ge=0.0, description="Estimated travel time in hours")
    energy_consumed_wh: float = Field(
        ..., ge=0.0, description="Energy consumed including 10% safety margin"
    )
    battery_remaining_wh: float = Field(..., description="Predicted battery remaining at destination")
    battery_reserve_percent: float = Field(
        ..., description="Predicted battery remaining as percentage of capacity"
    )
    max_slope_deg: float = Field(..., ge=0.0, description="Maximum slope encountered on path")
    avg_slope_deg: float = Field(..., ge=0.0, description="Mean slope along path")
    cumulative_hazard: float = Field(..., ge=0.0, description="Sum of hazard scores along path")
    high_risk_cells: int = Field(
        ..., ge=0, description="Count of cells with hazard_score > 0.6"
    )
    viable: bool = Field(
        ...,
        description="True only when all hard constraints are satisfied",
    )
    risk_score: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description=(
            "Composite risk score 0–100 (higher = more dangerous). "
            "Formula: normalize(0.30*slope_factor + 0.25*energy_factor "
            "+ 0.25*hazard_factor + 0.20*reserve_factor) * 100"
        ),
    )
    mission_success_score: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description=(
            "Mission success likelihood 0–100. "
            "Formula: 100 - risk_score + bonus_reserve "
            "(bonus_reserve ≤ 5, earned when reserve > 30%)"
        ),
    )
    calculation_time_ms: float = Field(
        ..., ge=0.0, description="Wall-clock time to compute this route in milliseconds"
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Human-readable constraint warnings and near-misses",
    )


# ---------------------------------------------------------------------------
# Route Result
# ---------------------------------------------------------------------------


class RouteResult(BaseModel):
    """A complete route: path, profile, metrics, and explainability evidence."""

    profile: RouteProfile
    path: list[GridPoint] = Field(..., min_length=1)
    metrics: RouteMetrics
    explanation_evidence: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Structured evidence for XAI: factor weights, top-risk cells, "
            "energy breakdown, etc."
        ),
    )


# ---------------------------------------------------------------------------
# Route Plan Response
# ---------------------------------------------------------------------------


class RoutePlanResponse(BaseModel):
    """Response for POST /api/routes/plan — contains all three route profiles."""

    mission_config: MissionRequest
    routes: list[RouteResult] = Field(..., min_length=1)
    recommended_profile: RouteProfile
    terrain_metadata: TerrainMetadata


# ---------------------------------------------------------------------------
# Emergency Models
# ---------------------------------------------------------------------------


class EmergencyType(str, Enum):
    """Categories of mid-mission emergency."""

    BATTERY_DEGRADATION = "BATTERY_DEGRADATION"
    REDUCED_MOBILITY = "REDUCED_MOBILITY"
    TERRAIN_OBSTRUCTION = "TERRAIN_OBSTRUCTION"


class EmergencyEvent(BaseModel):
    """Description of a mid-mission emergency event."""

    type: EmergencyType
    battery_loss_percent: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Battery percentage lost (for BATTERY_DEGRADATION)",
    )
    slope_reduction_deg: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Reduction in max traversable slope in degrees (for REDUCED_MOBILITY)",
    )
    obstructed_cells: Optional[list[GridPoint]] = Field(
        default=None,
        description="Cells newly blocked (for TERRAIN_OBSTRUCTION)",
    )

    @model_validator(mode="after")
    def check_fields_match_type(self) -> "EmergencyEvent":
        if self.type == EmergencyType.BATTERY_DEGRADATION and self.battery_loss_percent is None:
            raise ValueError("battery_loss_percent required for BATTERY_DEGRADATION")
        if self.type == EmergencyType.REDUCED_MOBILITY and self.slope_reduction_deg is None:
            raise ValueError("slope_reduction_deg required for REDUCED_MOBILITY")
        if self.type == EmergencyType.TERRAIN_OBSTRUCTION and (
            not self.obstructed_cells
        ):
            raise ValueError("obstructed_cells required for TERRAIN_OBSTRUCTION")
        return self


class ReassessRequest(BaseModel):
    """Request to reassess mission after an in-flight emergency."""

    original_request: MissionRequest
    active_route: RouteResult
    current_position: GridPoint
    emergency: EmergencyEvent


class RecoveryResult(BaseModel):
    """Comparison of original route post-emergency vs. newly planned recovery route."""

    original_route_viable: bool = Field(
        ..., description="Whether the remaining original route is still viable"
    )
    original_route_metrics_after: RouteMetrics = Field(
        ..., description="Projected metrics for the remaining original path under emergency conditions"
    )
    recovery_route: RouteResult = Field(
        ..., description="Newly planned route from current position to destination"
    )

    # Delta fields (recovery - original_post_emergency)
    risk_reduction: float = Field(
        ...,
        description="Risk score reduction: original_post - recovery (positive = safer)",
    )
    battery_reserve_change: float = Field(
        ...,
        description="Battery reserve % change: recovery - original_post (positive = more reserve)",
    )
    distance_change_m: float = Field(
        ...,
        description="Distance change in metres: recovery - original_post (positive = longer)",
    )
    max_slope_change: float = Field(
        ...,
        description="Max slope change in degrees: recovery - original_post (negative = shallower)",
    )
    mission_success_change: float = Field(
        ...,
        description="Mission success score change: recovery - original_post (positive = better)",
    )

    recommendation: str = Field(
        ..., description="FOLLOW_RECOVERY_ROUTE | CONTINUE_ORIGINAL | ABORT"
    )
    explanation: str = Field(
        ..., description="Deterministic template-generated explanation using actual metric values"
    )
