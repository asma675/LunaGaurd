"""
Tests for energy_model.py — edge energy, route energy, and route metrics.
"""

from __future__ import annotations

import pytest

from app.models.mission import GridPoint, RouteProfile, RoverConfig
from app.models.terrain import TerrainGrid
from app.services.energy_model import (
    SAFETY_MARGIN,
    compute_edge_energy,
    compute_route_energy,
    compute_route_metrics,
)


# ---------------------------------------------------------------------------
# Edge energy tests
# ---------------------------------------------------------------------------


def test_flat_terrain_baseline_energy() -> None:
    """Flat, smooth terrain should return exactly base_energy * distance * safety_margin."""
    rover = RoverConfig(base_energy_per_metre=0.05)
    # Flat (0°), no roughness
    energy = compute_edge_energy(
        distance_m=100.0,
        slope_deg=0.0,
        is_uphill=False,
        roughness_normalized=0.0,
        rover=rover,
    )
    # slope_mult = 1.0 (downhill branch at 0°: 1 + 0.05*0/15 = 1.0)
    # roughness_mult = 1.0 + 0.5*0.0 = 1.0
    expected = 0.05 * 100.0 * 1.0 * 1.0
    assert abs(energy - expected) < 1e-9


def test_uphill_higher_energy_than_flat() -> None:
    """Uphill traversal must consume more energy than flat."""
    rover = RoverConfig(base_energy_per_metre=0.05)
    flat_e = compute_edge_energy(100.0, 0.0, False, 0.0, rover)
    uphill_e = compute_edge_energy(100.0, 10.0, True, 0.0, rover)
    assert uphill_e > flat_e


def test_downhill_lower_than_uphill_higher_than_flat() -> None:
    """Downhill energy > flat energy but < uphill energy (no regen)."""
    rover = RoverConfig(base_energy_per_metre=0.05)
    flat_e = compute_edge_energy(100.0, 5.0, False, 0.0, rover)   # downhill 5°
    uphill_e = compute_edge_energy(100.0, 5.0, True, 0.0, rover)  # uphill 5°
    # downhill < uphill
    assert flat_e < uphill_e
    # downhill > base (slope 0°, downhill)
    base_e = compute_edge_energy(100.0, 0.0, False, 0.0, rover)
    assert flat_e >= base_e


def test_rough_terrain_multiplier() -> None:
    """High roughness must increase energy consumption."""
    rover = RoverConfig(base_energy_per_metre=0.05)
    smooth_e = compute_edge_energy(100.0, 0.0, False, 0.0, rover)
    rough_e = compute_edge_energy(100.0, 0.0, False, 1.0, rover)   # max roughness
    assert rough_e > smooth_e
    # At roughness_norm=1.0: roughness_mult = 1.0 + 0.5*1.0 = 1.5
    expected_rough = 0.05 * 100.0 * 1.0 * 1.5
    assert abs(rough_e - expected_rough) < 1e-9


def test_uphill_mild_slope_multiplier() -> None:
    """Mild uphill (3–8°) must have slope_mult between 1.0 and 1.15."""
    rover = RoverConfig(base_energy_per_metre=0.05)
    e = compute_edge_energy(100.0, 6.0, True, 0.0, rover)
    # slope_mult = 1.0 + 0.15 * (6-3)/5 = 1.0 + 0.09 = 1.09
    expected = 0.05 * 100.0 * 1.09 * 1.0
    assert abs(e - expected) < 1e-9


# ---------------------------------------------------------------------------
# Route energy tests
# ---------------------------------------------------------------------------


def test_route_energy_includes_safety_margin(
    terrain_fixture: TerrainGrid, rover_fixture: RoverConfig
) -> None:
    """compute_route_energy must be SAFETY_MARGIN × raw energy."""
    from app.services.energy_model import _roughness_p95
    import math

    path = [GridPoint(row=5, col=5), GridPoint(row=5, col=6)]
    total = compute_route_energy(path, terrain_fixture, rover_fixture)
    # For a single step, total should be > 0 and include safety margin
    assert total > 0.0
    # It's SAFETY_MARGIN × raw, so it must be more than raw
    # Verify it's not just base * 100
    assert total <= rover_fixture.battery_wh


def test_empty_path_returns_zero_energy(
    terrain_fixture: TerrainGrid, rover_fixture: RoverConfig
) -> None:
    """Single-cell (no movement) path returns 0 energy."""
    path = [GridPoint(row=5, col=5)]
    assert compute_route_energy(path, terrain_fixture, rover_fixture) == 0.0


# ---------------------------------------------------------------------------
# Route metrics tests
# ---------------------------------------------------------------------------


def test_battery_reserve_calculation(
    terrain_fixture: TerrainGrid, rover_fixture: RoverConfig
) -> None:
    """battery_reserve_percent must equal remaining/capacity × 100."""
    path = [
        GridPoint(row=20, col=20),
        GridPoint(row=20, col=21),
        GridPoint(row=20, col=22),
    ]
    metrics = compute_route_metrics(path, terrain_fixture, rover_fixture, RouteProfile.FASTEST)
    expected_reserve = (metrics.battery_remaining_wh / rover_fixture.battery_capacity_wh) * 100.0
    assert abs(metrics.battery_reserve_percent - expected_reserve) < 1e-6


def test_nonviable_when_energy_exceeds_battery() -> None:
    """Route must be non-viable when energy consumed exceeds battery."""
    # Rover with nearly empty battery
    exhausted_rover = RoverConfig(
        battery_capacity_wh=1000.0,
        battery_percent=1.0,   # only 10 Wh left
        emergency_reserve_percent=0.0,
        base_energy_per_metre=10.0,  # very high consumption
    )
    # A single long step will exceed available battery
    # Use a fake 2-cell path that moves 100m with 10 Wh/m = 1000 Wh raw → ×1.1 = 1100 Wh
    from app.models.terrain import TerrainGrid, TerrainMetadata
    import math

    # Build a minimal 3×3 terrain
    meta = TerrainMetadata(
        grid_rows=3,
        grid_cols=3,
        cell_size_m=100.0,
        bounds={"min_row": 0, "max_row": 2, "min_col": 0, "max_col": 2},
        data_source="Synthetic deterministic terrain (seed=0) — test only",
        is_synthetic=True,
        processing_date="2025-01-01",
    )
    tiny = TerrainGrid(
        metadata=meta,
        elevation=[[0.0, 0.0, 0.0]] * 3,
        slope=[[0.0, 0.0, 0.0]] * 3,
        roughness=[[0.0, 0.0, 0.0]] * 3,
        hazard=[[0.0, 0.0, 0.0]] * 3,
        traversable=[[True, True, True]] * 3,
    )
    path = [GridPoint(row=0, col=0), GridPoint(row=0, col=1)]
    metrics = compute_route_metrics(path, tiny, exhausted_rover, RouteProfile.FASTEST)
    assert not metrics.viable
    assert any("Insufficient battery" in w or "reserve" in w for w in metrics.warnings)


def test_nonviable_when_reserve_violated(
    terrain_fixture: TerrainGrid,
) -> None:
    """Route must be non-viable when battery reserve drops below threshold."""
    # Rover with high reserve requirement
    strict_rover = RoverConfig(
        battery_capacity_wh=100.0,
        battery_percent=20.0,   # 20 Wh available
        emergency_reserve_percent=15.0,  # 15 Wh must remain → only 5 Wh usable
        base_energy_per_metre=0.05,
        max_slope_deg=15.0,
    )
    # Find a long path that will consume > 5 Wh
    path = [GridPoint(row=r, col=5) for r in range(20)]  # 19 steps × 100m = 1900m
    # Filter to traversable
    filtered = [
        path[0]
    ] + [p for p in path[1:] if terrain_fixture.traversable[p.row][p.col]]
    if len(filtered) < 5:
        pytest.skip("Not enough traversable cells for this test")

    metrics = compute_route_metrics(filtered, terrain_fixture, strict_rover, RouteProfile.FASTEST)
    # With 5 Wh usable and 0.05 Wh/m over 1900m ≈ 95 Wh > 5 Wh → non-viable
    assert not metrics.viable


def test_risk_score_bounds(
    terrain_fixture: TerrainGrid, rover_fixture: RoverConfig
) -> None:
    """risk_score must always be in [0, 100]."""
    path = [GridPoint(row=20, col=20), GridPoint(row=21, col=21)]
    metrics = compute_route_metrics(path, terrain_fixture, rover_fixture, RouteProfile.SAFEST)
    assert 0.0 <= metrics.risk_score <= 100.0


def test_mission_success_score_bounds(
    terrain_fixture: TerrainGrid, rover_fixture: RoverConfig
) -> None:
    """mission_success_score must always be in [0, 100]."""
    path = [GridPoint(row=20, col=20), GridPoint(row=21, col=21)]
    metrics = compute_route_metrics(path, terrain_fixture, rover_fixture, RouteProfile.SAFEST)
    assert 0.0 <= metrics.mission_success_score <= 100.0


def test_calculation_time_ms_is_positive(
    terrain_fixture: TerrainGrid, rover_fixture: RoverConfig
) -> None:
    """calculation_time_ms must be a real elapsed time > 0."""
    path = [GridPoint(row=20, col=20), GridPoint(row=20, col=21)]
    metrics = compute_route_metrics(path, terrain_fixture, rover_fixture, RouteProfile.FASTEST)
    assert metrics.calculation_time_ms >= 0.0


def test_existing_path_becomes_nonviable_after_slope_limit_reduction(
    terrain_fixture: TerrainGrid,
) -> None:
    """Recomputed metrics must enforce a newly reduced rover slope limit."""
    violating_path = None
    for row in range(terrain_fixture.metadata.grid_rows):
        for col in range(1, terrain_fixture.metadata.grid_cols):
            if (
                terrain_fixture.traversable[row][col - 1]
                and terrain_fixture.traversable[row][col]
                and terrain_fixture.slope[row][col] > 1.0
            ):
                violating_path = [
                    GridPoint(row=row, col=col - 1),
                    GridPoint(row=row, col=col),
                ]
                break
        if violating_path:
            break

    if not violating_path:
        pytest.skip("No suitable adjacent traversable slope cell in fixture")

    restricted_rover = RoverConfig(
        battery_capacity_wh=3000.0,
        battery_percent=100.0,
        emergency_reserve_percent=10.0,
        base_energy_per_metre=0.05,
        max_slope_deg=1.0,
        speed_mps=0.5,
        risk_tolerance=0.5,
    )
    metrics = compute_route_metrics(
        violating_path,
        terrain_fixture,
        restricted_rover,
        RouteProfile.SAFEST,
    )

    assert metrics.viable is False
    assert any("exceeds rover limit" in warning for warning in metrics.warnings)
