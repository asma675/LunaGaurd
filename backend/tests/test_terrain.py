"""
Tests for terrain_service.py — synthetic terrain generation and validation.
"""

from __future__ import annotations

import math

import pytest

from app.models.terrain import TerrainGrid
from app.services.terrain_service import (
    generate_synthetic_terrain,
    validate_terrain,
)


def test_synthetic_terrain_dimensions(terrain_fixture: TerrainGrid) -> None:
    """Terrain grid must be exactly 100×100."""
    assert terrain_fixture.metadata.grid_rows == 100
    assert terrain_fixture.metadata.grid_cols == 100
    assert len(terrain_fixture.elevation) == 100
    assert all(len(row) == 100 for row in terrain_fixture.elevation)
    assert len(terrain_fixture.slope) == 100
    assert len(terrain_fixture.roughness) == 100
    assert len(terrain_fixture.hazard) == 100
    assert len(terrain_fixture.traversable) == 100


def test_terrain_slope_range(terrain_fixture: TerrainGrid) -> None:
    """All slope values must be in [0, 90)."""
    for r, row in enumerate(terrain_fixture.slope):
        for c, val in enumerate(row):
            assert 0.0 <= val < 90.0, (
                f"Slope out of [0,90) at ({r},{c}): {val}"
            )


def test_terrain_traversability_valid(terrain_fixture: TerrainGrid) -> None:
    """At least 50% of cells must be traversable (healthy terrain)."""
    total = 100 * 100
    traversable_count = sum(
        1
        for row in terrain_fixture.traversable
        for v in row
        if v
    )
    pct = traversable_count / total * 100
    assert pct >= 50.0, f"Only {pct:.1f}% of cells are traversable; expected ≥ 50%"


def test_terrain_hazard_normalized(terrain_fixture: TerrainGrid) -> None:
    """All hazard scores must be in [0, 1]."""
    for r, row in enumerate(terrain_fixture.hazard):
        for c, val in enumerate(row):
            assert 0.0 <= val <= 1.0, (
                f"Hazard out of [0,1] at ({r},{c}): {val}"
            )


def test_terrain_is_synthetic_labelled(terrain_fixture: TerrainGrid) -> None:
    """Synthetic terrain must be clearly labelled."""
    assert terrain_fixture.metadata.is_synthetic is True
    assert "synthetic" in terrain_fixture.metadata.data_source.lower()


def test_terrain_deterministic() -> None:
    """Two calls with seed=42 must produce identical elevation arrays."""
    g1 = generate_synthetic_terrain(seed=42)
    g2 = generate_synthetic_terrain(seed=42)
    assert g1.elevation[0][0] == g2.elevation[0][0]
    assert g1.elevation[50][50] == g2.elevation[50][50]
    assert g1.elevation[99][99] == g2.elevation[99][99]


def test_terrain_different_seeds_differ() -> None:
    """Different seeds must produce different elevations."""
    g1 = generate_synthetic_terrain(seed=42)
    g2 = generate_synthetic_terrain(seed=99)
    assert g1.elevation[10][10] != g2.elevation[10][10]


def test_terrain_validation_passes(terrain_fixture: TerrainGrid) -> None:
    """validate_terrain() must pass on the standard synthetic terrain."""
    validate_terrain(terrain_fixture)  # should not raise


def test_terrain_validation_rejects_invalid() -> None:
    """validate_terrain() must raise ValueError on invalid data."""
    valid = generate_synthetic_terrain(seed=42)

    # Inject a NaN into elevation
    bad_elevation = [list(row) for row in valid.elevation]
    bad_elevation[5][5] = float("nan")

    import copy
    bad_grid = valid.model_copy(update={"elevation": bad_elevation})

    with pytest.raises(ValueError, match="Non-finite elevation"):
        validate_terrain(bad_grid)


def test_terrain_cell_size(terrain_fixture: TerrainGrid) -> None:
    """Cell size must be 100 m."""
    assert terrain_fixture.metadata.cell_size_m == 100.0


def test_terrain_has_craters(terrain_fixture: TerrainGrid) -> None:
    """Synthetic terrain must have some non-traversable crater cells."""
    non_traversable = sum(
        1
        for row in terrain_fixture.traversable
        for v in row
        if not v
    )
    assert non_traversable > 0, "Expected at least some crater/non-traversable cells"
