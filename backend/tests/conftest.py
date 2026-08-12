"""
Pytest fixtures for LunaGuard backend tests.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.mission import GridPoint, MissionRequest, RoverConfig
from app.models.terrain import TerrainGrid
from app.services.terrain_service import generate_synthetic_terrain


@pytest.fixture(scope="session")
def terrain_fixture() -> TerrainGrid:
    """Generate a synthetic terrain once per test session (deterministic, seed=42)."""
    return generate_synthetic_terrain(rows=100, cols=100, seed=42)


@pytest.fixture(scope="session")
def rover_fixture() -> RoverConfig:
    """Default rover configuration matching the demo mission."""
    return RoverConfig(
        battery_capacity_wh=1000.0,
        battery_percent=95.0,
        emergency_reserve_percent=15.0,
        base_energy_per_metre=0.05,
        max_slope_deg=15.0,
        speed_mps=0.5,
        risk_tolerance=0.5,
    )


@pytest.fixture(scope="session")
def demo_mission_fixture(terrain_fixture: TerrainGrid) -> MissionRequest:
    """Return a mission request with start/dest guaranteed to be traversable.

    Uses the demo coordinates (20,20) → (75,78) which are in a traversable
    area of the synthetic terrain.  If somehow not traversable, falls back to
    a brute-force search.
    """
    preferred_start = GridPoint(row=20, col=20)
    preferred_dest = GridPoint(row=75, col=78)

    def find_traversable(preferred: GridPoint) -> GridPoint:
        if terrain_fixture.traversable[preferred.row][preferred.col]:
            return preferred
        # Brute-force: find first traversable cell
        for r in range(terrain_fixture.metadata.grid_rows):
            for c in range(terrain_fixture.metadata.grid_cols):
                if terrain_fixture.traversable[r][c]:
                    return GridPoint(row=r, col=c)
        raise RuntimeError("No traversable cells found in terrain fixture")

    start = find_traversable(preferred_start)
    dest = find_traversable(preferred_dest)

    # Make sure start ≠ dest
    if start == dest:
        for r in range(terrain_fixture.metadata.grid_rows):
            for c in range(terrain_fixture.metadata.grid_cols):
                candidate = GridPoint(row=r, col=c)
                if terrain_fixture.traversable[r][c] and candidate != start:
                    dest = candidate
                    break

    return MissionRequest(
        start=start,
        destination=dest,
        rover=RoverConfig(
            battery_capacity_wh=1000.0,
            battery_percent=95.0,
            emergency_reserve_percent=15.0,
            base_energy_per_metre=0.05,
            max_slope_deg=15.0,
            speed_mps=0.5,
            risk_tolerance=0.5,
        ),
    )


@pytest.fixture(scope="session")
def test_client() -> TestClient:
    """FastAPI test client (synchronous, suitable for non-async tests)."""
    return TestClient(app)
