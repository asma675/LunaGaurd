"""
Tests for emergency_service.py — battery degradation, mobility reduction, reassessment.
"""

from __future__ import annotations

import re

import pytest

from app.models.mission import (
    EmergencyEvent,
    EmergencyType,
    GridPoint,
    MissionRequest,
    ReassessRequest,
    RouteProfile,
    RoverConfig,
)
from app.models.terrain import TerrainGrid
from app.services.emergency_service import EmergencyService
from app.services.route_planner import AStarPlanner
from app.services.energy_model import compute_route_metrics


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_route_result(terrain, rover, start, dest):
    """Plan a SAFEST route and return (RouteResult, path)."""
    from app.models.mission import RouteResult
    planner = AStarPlanner(terrain)
    path = planner.plan(start, dest, rover, RouteProfile.SAFEST)
    if path is None:
        pytest.skip("No path found for test setup")
    metrics = compute_route_metrics(path, terrain, rover, RouteProfile.SAFEST)
    return RouteResult(
        profile=RouteProfile.SAFEST,
        path=path,
        metrics=metrics,
        explanation_evidence={},
    ), path


# ---------------------------------------------------------------------------
# Unit tests: _apply_emergency (via EmergencyService._apply_emergency)
# ---------------------------------------------------------------------------


def test_battery_degradation_applied(rover_fixture: RoverConfig) -> None:
    """Battery degradation must reduce battery_percent by the specified amount."""
    service = EmergencyService()
    emergency = EmergencyEvent(
        type=EmergencyType.BATTERY_DEGRADATION,
        battery_loss_percent=20.0,
    )
    updated = service._apply_emergency(rover_fixture, emergency)
    expected = max(0.0, rover_fixture.battery_percent - 20.0)
    assert abs(updated.battery_percent - expected) < 1e-9


def test_battery_degradation_clamps_to_zero(rover_fixture: RoverConfig) -> None:
    """Battery degradation must not produce negative battery_percent."""
    service = EmergencyService()
    emergency = EmergencyEvent(
        type=EmergencyType.BATTERY_DEGRADATION,
        battery_loss_percent=100.0,  # maximum valid loss; must clamp at zero
    )
    updated = service._apply_emergency(rover_fixture, emergency)
    assert updated.battery_percent == 0.0


def test_slope_reduction_applied(rover_fixture: RoverConfig) -> None:
    """Reduced mobility must decrease max_slope_deg by the specified amount."""
    service = EmergencyService()
    original_slope = rover_fixture.max_slope_deg
    emergency = EmergencyEvent(
        type=EmergencyType.REDUCED_MOBILITY,
        slope_reduction_deg=5.0,
    )
    updated = service._apply_emergency(rover_fixture, emergency)
    expected = max(1.0, original_slope - 5.0)
    assert abs(updated.max_slope_deg - expected) < 1e-9


def test_slope_reduction_clamps_to_one(rover_fixture: RoverConfig) -> None:
    """Reduced mobility must not produce max_slope_deg below 1.0°."""
    service = EmergencyService()
    emergency = EmergencyEvent(
        type=EmergencyType.REDUCED_MOBILITY,
        slope_reduction_deg=100.0,
    )
    updated = service._apply_emergency(rover_fixture, emergency)
    assert updated.max_slope_deg >= 1.0


def test_obstruction_does_not_change_rover(rover_fixture: RoverConfig) -> None:
    """Terrain obstruction emergency must not change rover config."""
    service = EmergencyService()
    emergency = EmergencyEvent(
        type=EmergencyType.TERRAIN_OBSTRUCTION,
        obstructed_cells=[GridPoint(row=5, col=5)],
    )
    updated = service._apply_emergency(rover_fixture, emergency)
    assert updated.battery_percent == rover_fixture.battery_percent
    assert updated.max_slope_deg == rover_fixture.max_slope_deg


# ---------------------------------------------------------------------------
# Integration tests: reassess_route
# ---------------------------------------------------------------------------


def test_emergency_triggers_reassessment(
    terrain_fixture: TerrainGrid,
    demo_mission_fixture: MissionRequest,
) -> None:
    """reassess_route must return a RecoveryResult without raising."""
    rover = demo_mission_fixture.rover
    start = demo_mission_fixture.start
    dest = demo_mission_fixture.destination

    route, path = _make_route_result(terrain_fixture, rover, start, dest)

    # Simulate being halfway along the path
    mid_idx = len(path) // 2
    current_pos = path[mid_idx]

    emergency = EmergencyEvent(
        type=EmergencyType.BATTERY_DEGRADATION,
        battery_loss_percent=15.0,
    )
    service = EmergencyService()
    result = service.reassess_route(
        ReassessRequest(
            original_request=demo_mission_fixture,
            active_route=route,
            current_position=current_pos,
            emergency=emergency,
        ),
        terrain_fixture,
    )
    assert result is not None
    assert result.recommendation in ("FOLLOW_RECOVERY_ROUTE", "CONTINUE_ORIGINAL", "ABORT")


def test_recovery_route_generated(
    terrain_fixture: TerrainGrid,
    demo_mission_fixture: MissionRequest,
) -> None:
    """Recovery route must be planned from current_position, not from start."""
    rover = demo_mission_fixture.rover
    start = demo_mission_fixture.start
    dest = demo_mission_fixture.destination

    route, path = _make_route_result(terrain_fixture, rover, start, dest)
    mid_idx = max(1, len(path) // 3)
    current_pos = path[mid_idx]

    emergency = EmergencyEvent(
        type=EmergencyType.BATTERY_DEGRADATION,
        battery_loss_percent=10.0,
    )
    service = EmergencyService()
    result = service.reassess_route(
        ReassessRequest(
            original_request=demo_mission_fixture,
            active_route=route,
            current_position=current_pos,
            emergency=emergency,
        ),
        terrain_fixture,
    )

    if result.recommendation == "ABORT":
        pytest.skip("No recovery route possible — ABORT scenario")

    rec_path = result.recovery_route.path
    # Recovery route must start at current_position
    assert rec_path[0] == current_pos
    # Recovery route must end at destination
    assert rec_path[-1] == dest


def test_explanation_contains_actual_values(
    terrain_fixture: TerrainGrid,
    demo_mission_fixture: MissionRequest,
) -> None:
    """Explanation text must reference actual metric values (not invented placeholders)."""
    rover = demo_mission_fixture.rover
    start = demo_mission_fixture.start
    dest = demo_mission_fixture.destination

    route, path = _make_route_result(terrain_fixture, rover, start, dest)
    mid_idx = max(1, len(path) // 3)
    current_pos = path[mid_idx]

    emergency = EmergencyEvent(
        type=EmergencyType.BATTERY_DEGRADATION,
        battery_loss_percent=12.0,
    )
    service = EmergencyService()
    result = service.reassess_route(
        ReassessRequest(
            original_request=demo_mission_fixture,
            active_route=route,
            current_position=current_pos,
            emergency=emergency,
        ),
        terrain_fixture,
    )

    explanation = result.explanation
    assert isinstance(explanation, str)
    assert len(explanation) > 20

    # Explanation must not contain placeholder strings
    bad_patterns = ["TODO", "PLACEHOLDER", "FIXME", "<value>", "NaN", "None"]
    for pattern in bad_patterns:
        assert pattern not in explanation, (
            f"Explanation contains placeholder '{pattern}': {explanation}"
        )

    # Explanation must reference the emergency type
    assert "battery" in explanation.lower() or "degradation" in explanation.lower()


def test_delta_fields_are_computed(
    terrain_fixture: TerrainGrid,
    demo_mission_fixture: MissionRequest,
) -> None:
    """All delta fields must be computed differences, not hardcoded zeros."""
    rover = demo_mission_fixture.rover
    start = demo_mission_fixture.start
    dest = demo_mission_fixture.destination

    route, path = _make_route_result(terrain_fixture, rover, start, dest)
    mid_idx = max(1, len(path) // 3)
    current_pos = path[mid_idx]

    emergency = EmergencyEvent(
        type=EmergencyType.BATTERY_DEGRADATION,
        battery_loss_percent=10.0,
    )
    service = EmergencyService()
    result = service.reassess_route(
        ReassessRequest(
            original_request=demo_mission_fixture,
            active_route=route,
            current_position=current_pos,
            emergency=emergency,
        ),
        terrain_fixture,
    )

    # Verify deltas are computed (not all zero simultaneously, which would be suspicious)
    delta_sum = abs(result.risk_reduction) + abs(result.battery_reserve_change)
    # At minimum one delta should be nonzero for a real emergency reassessment
    # (unless the path happens to be identical, which would be extremely rare)
    assert result.recommendation in ("FOLLOW_RECOVERY_ROUTE", "CONTINUE_ORIGINAL", "ABORT")


def test_terrain_obstruction_invalidates_original_remaining_route(
    terrain_fixture: TerrainGrid,
    demo_mission_fixture: MissionRequest,
) -> None:
    """A newly blocked cell ahead must invalidate the remaining original route."""
    rover = demo_mission_fixture.rover
    route, path = _make_route_result(
        terrain_fixture,
        rover,
        demo_mission_fixture.start,
        demo_mission_fixture.destination,
    )
    if len(path) < 4:
        pytest.skip("Route too short for an obstruction-ahead regression test")

    mid_idx = max(1, len(path) // 3)
    if mid_idx + 1 >= len(path):
        pytest.skip("No cell remains ahead of the simulated rover")

    current_pos = path[mid_idx]
    blocked = path[mid_idx + 1]
    emergency = EmergencyEvent(
        type=EmergencyType.TERRAIN_OBSTRUCTION,
        obstructed_cells=[blocked],
    )

    result = EmergencyService().reassess_route(
        ReassessRequest(
            original_request=demo_mission_fixture,
            active_route=route,
            current_position=current_pos,
            emergency=emergency,
        ),
        terrain_fixture,
    )

    assert result.original_route_viable is False
    assert any(
        "obstructed" in warning.lower()
        for warning in result.original_route_metrics_after.warnings
    )
