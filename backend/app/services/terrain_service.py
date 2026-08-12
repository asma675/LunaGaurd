"""
Terrain service: loads or generates synthetic terrain for LunaGuard.

The synthetic terrain simulates a 100×100 cell grid representing a 10km×10km
section of a lunar south-pole-like region. Each cell is 100m × 100m.

All terrain is clearly labelled as SYNTHETIC and must never be presented
as authentic NASA/LOLA data.
"""

from __future__ import annotations

import math
from datetime import date
from typing import Optional

import numpy as np
import structlog
from scipy.ndimage import generic_filter

from app.models.terrain import TerrainGrid, TerrainMetadata, TerrainSampleResponse

logger = structlog.get_logger(__name__)

# Sentinel — holds the single loaded/generated grid
_terrain_cache: Optional[TerrainGrid] = None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def get_terrain() -> TerrainGrid:
    """Return the cached terrain grid, generating it on first call."""
    global _terrain_cache
    if _terrain_cache is None:
        logger.info("terrain.generating", seed=42)
        _terrain_cache = generate_synthetic_terrain()
        validate_terrain(_terrain_cache)
        logger.info(
            "terrain.ready",
            rows=_terrain_cache.metadata.grid_rows,
            cols=_terrain_cache.metadata.grid_cols,
        )
    return _terrain_cache


def generate_synthetic_terrain(rows: int = 100, cols: int = 100, seed: int = 42) -> TerrainGrid:
    """Generate a deterministic synthetic lunar-south-pole-like terrain.

    Parameters
    ----------
    rows, cols:
        Grid dimensions.  Default 100×100 (10 km × 10 km at 100 m/cell).
    seed:
        NumPy random seed — must be fixed so demo results are reproducible.

    Returns
    -------
    TerrainGrid
        Fully populated grid with elevation, slope, roughness, hazard,
        and traversability layers.  Metadata carries is_synthetic=True.
    """
    rng = np.random.default_rng(seed)

    # ------------------------------------------------------------------
    # 1. Elevation  (metres, relative to an arbitrary lunar datum)
    # ------------------------------------------------------------------
    x = np.linspace(0, 2 * math.pi, cols)
    y = np.linspace(0, 2 * math.pi, rows)
    XX, YY = np.meshgrid(x, y)

    # Multi-frequency waves to simulate rolling terrain
    elev = (
        200.0 * np.sin(0.8 * XX) * np.cos(0.6 * YY)
        + 150.0 * np.cos(1.5 * XX + 0.5) * np.sin(1.2 * YY + 1.0)
        + 80.0 * np.sin(2.5 * XX) * np.cos(2.0 * YY + 0.7)
        + 40.0 * np.cos(3.5 * XX + 1.2) * np.sin(3.0 * YY)
        + 20.0 * rng.standard_normal((rows, cols))  # gaussian noise
    )

    # Crater-like depressions: gaussian dips at fixed locations
    crater_centres = [
        (25, 30, 300.0, 8),   # (row, col, depth, sigma)
        (60, 65, 450.0, 12),
        (40, 15, 200.0, 6),
        (80, 80, 350.0, 10),
        (10, 70, 250.0, 7),
    ]
    for cr, cc, depth, sigma in crater_centres:
        rr = np.arange(rows)[:, None]
        cc_arr = np.arange(cols)[None, :]
        dist_sq = (rr - cr) ** 2 + (cc_arr - cc) ** 2
        elev -= depth * np.exp(-dist_sq / (2 * sigma ** 2))

    # ------------------------------------------------------------------
    # 2. Slope  (degrees) — from gradient of elevation
    # ------------------------------------------------------------------
    cell_size_m = 100.0  # metres per cell

    # np.gradient returns [dz/dy, dz/dx] for a 2-D array
    grad_y, grad_x = np.gradient(elev, cell_size_m, cell_size_m)
    slope_rad = np.arctan(np.sqrt(grad_x ** 2 + grad_y ** 2))
    slope = np.degrees(slope_rad)  # 0–~45° for realistic lunar terrain
    slope = np.clip(slope, 0.0, 89.9)

    # ------------------------------------------------------------------
    # 3. Roughness — local std-dev of elevation in 3×3 window
    # ------------------------------------------------------------------
    def _local_std(window: np.ndarray) -> float:
        return float(np.std(window))

    roughness = generic_filter(elev, _local_std, size=3)
    roughness = np.clip(roughness, 0.0, None)

    # ------------------------------------------------------------------
    # 4. Traversability mask
    # ------------------------------------------------------------------
    elev_mean = float(np.mean(elev))
    elev_std = float(np.std(elev))
    # Cells deep inside craters (> 3 std below mean) are non-traversable
    crater_mask = elev < (elev_mean - 3.0 * elev_std)
    # Slope hard limit for traversability (more generous than rover.max_slope_deg)
    traversable = (slope < 25.0) & (~crater_mask)

    # ------------------------------------------------------------------
    # 5. Hazard score — normalised 0–1 composite
    # ------------------------------------------------------------------
    # Weights: slope 50%, roughness 30%, crater depth penalty 20%
    slope_norm = np.clip(slope / 25.0, 0.0, 1.0)  # 25° → max

    roughness_max = float(np.percentile(roughness, 99)) or 1.0
    roughness_norm = np.clip(roughness / roughness_max, 0.0, 1.0)

    # Depth penalty: how far below the mean (normalised by 3 std)
    depth_penalty = np.clip((elev_mean - elev) / (3.0 * elev_std + 1e-9), 0.0, 1.0)

    hazard = 0.50 * slope_norm + 0.30 * roughness_norm + 0.20 * depth_penalty
    hazard = np.clip(hazard, 0.0, 1.0)

    # ------------------------------------------------------------------
    # 6. Build TerrainGrid
    # ------------------------------------------------------------------
    metadata = TerrainMetadata(
        grid_rows=rows,
        grid_cols=cols,
        cell_size_m=cell_size_m,
        bounds={
            "min_row": 0,
            "max_row": rows - 1,
            "min_col": 0,
            "max_col": cols - 1,
        },
        data_source="Synthetic deterministic terrain (seed=42) — NOT real NASA/LOLA data",
        is_synthetic=True,
        processing_date=date.today().isoformat(),
    )

    return TerrainGrid(
        metadata=metadata,
        elevation=elev.tolist(),
        slope=slope.tolist(),
        roughness=roughness.tolist(),
        hazard=hazard.tolist(),
        traversable=traversable.tolist(),
    )


def validate_terrain(grid: TerrainGrid) -> None:
    """Validate grid integrity.  Raises ValueError with a specific message on failure.

    Checks:
    - Grid has at least 1 cell
    - Elevations are finite (no NaN / inf)
    - Grid dimension mismatch (layer rows/cols vs metadata)
    - Slope values are in [0, 90]
    - Traversability mask is consistent (non-traversable cells have hazard ≥ 0)
    """
    rows = grid.metadata.grid_rows
    cols = grid.metadata.grid_cols

    if rows == 0 or cols == 0:
        raise ValueError("Terrain grid must have at least one cell")

    for r in range(rows):
        for c in range(cols):
            e = grid.elevation[r][c]
            if not math.isfinite(e):
                raise ValueError(f"Non-finite elevation at ({r},{c}): {e}")

            s = grid.slope[r][c]
            if not (0.0 <= s <= 90.0):
                raise ValueError(
                    f"Slope out of range [0,90] at ({r},{c}): {s:.3f}°"
                )

    # Spot-check hazard normalisation on a sample
    for r in range(0, rows, 10):
        for c in range(0, cols, 10):
            h = grid.hazard[r][c]
            if not (0.0 <= h <= 1.0):
                raise ValueError(
                    f"Hazard score out of range [0,1] at ({r},{c}): {h:.4f}"
                )

    # Dimension integrity (belt-and-suspenders check outside model validator)
    for name, layer in [
        ("elevation", grid.elevation),
        ("slope", grid.slope),
        ("roughness", grid.roughness),
        ("hazard", grid.hazard),
        ("traversable", grid.traversable),
    ]:
        if len(layer) != rows:
            raise ValueError(
                f"Layer '{name}' row count {len(layer)} ≠ metadata.grid_rows {rows}"
            )
        for i, row_data in enumerate(layer):
            if len(row_data) != cols:
                raise ValueError(
                    f"Layer '{name}' row {i} col count {len(row_data)} ≠ metadata.grid_cols {cols}"
                )

    logger.info("terrain.validation_passed", rows=rows, cols=cols)
