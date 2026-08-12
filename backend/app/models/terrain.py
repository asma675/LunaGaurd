"""
LunaGuard terrain models.

Represents a 100×100 cell lunar south-pole-like terrain grid.
Each cell is 100m × 100m → 10 km × 10 km total area.

All terrain data in the demo is SYNTHETIC (deterministic, seed=42).
"""

from __future__ import annotations

from datetime import date
from typing import Any

from pydantic import BaseModel, Field, model_validator


class TerrainCell(BaseModel):
    """Single terrain cell with all computed attributes."""

    row: int = Field(..., ge=0, description="Grid row index (0-based)")
    col: int = Field(..., ge=0, description="Grid column index (0-based)")
    elevation_m: float = Field(..., description="Elevation in metres relative to mean lunar radius")
    slope_deg: float = Field(..., ge=0.0, le=90.0, description="Terrain slope in degrees")
    roughness: float = Field(..., ge=0.0, description="Local elevation standard deviation (metres)")
    hazard_score: float = Field(..., ge=0.0, le=1.0, description="Normalised hazard 0–1 (0=safe)")
    traversable: bool = Field(..., description="True if rover can enter this cell")


class TerrainMetadata(BaseModel):
    """Metadata describing the terrain dataset."""

    grid_rows: int = Field(..., gt=0, description="Number of rows in the grid")
    grid_cols: int = Field(..., gt=0, description="Number of columns in the grid")
    cell_size_m: float = Field(..., gt=0.0, description="Physical size of each cell in metres")
    bounds: dict[str, float] = Field(
        ...,
        description="Bounding box: {min_row, max_row, min_col, max_col} in cell indices",
    )
    data_source: str = Field(..., description="Human-readable description of data origin")
    is_synthetic: bool = Field(
        ...,
        description="True when terrain is algorithmically generated, not from a real DEM",
    )
    processing_date: str = Field(..., description="ISO-8601 date string of terrain generation")

    @model_validator(mode="after")
    def check_synthetic_label(self) -> "TerrainMetadata":
        """Synthetic terrain must always be labelled as such in the data_source string."""
        if self.is_synthetic and "synthetic" not in self.data_source.lower():
            raise ValueError(
                "is_synthetic=True requires 'synthetic' to appear in data_source string"
            )
        return self


class TerrainGrid(BaseModel):
    """Full terrain grid with all layer arrays and metadata."""

    metadata: TerrainMetadata
    # All 2-D arrays stored as list[list[T]] for JSON compatibility.
    # Outer index = row, inner index = col.
    elevation: list[list[float]] = Field(..., description="Elevation in metres (rows × cols)")
    slope: list[list[float]] = Field(..., description="Slope in degrees (rows × cols)")
    roughness: list[list[float]] = Field(..., description="Roughness in metres (rows × cols)")
    hazard: list[list[float]] = Field(..., description="Hazard score 0–1 (rows × cols)")
    traversable: list[list[bool]] = Field(
        ..., description="Traversability mask (rows × cols)"
    )

    @model_validator(mode="after")
    def check_dimensions(self) -> "TerrainGrid":
        """All layers must match metadata dimensions."""
        r, c = self.metadata.grid_rows, self.metadata.grid_cols
        for name, layer in [
            ("elevation", self.elevation),
            ("slope", self.slope),
            ("roughness", self.roughness),
            ("hazard", self.hazard),
            ("traversable", self.traversable),
        ]:
            if len(layer) != r:
                raise ValueError(
                    f"Layer '{name}' has {len(layer)} rows; expected {r}"
                )
            for i, row in enumerate(layer):
                if len(row) != c:
                    raise ValueError(
                        f"Layer '{name}' row {i} has {len(row)} cols; expected {c}"
                    )
        return self


class TerrainSampleResponse(BaseModel):
    """Response payload for GET /api/terrain/sample."""

    metadata: TerrainMetadata
    elevation: list[list[float]]
    slope: list[list[float]]
    roughness: list[list[float]]
    hazard: list[list[float]]
    traversable: list[list[bool]]
    summary: dict[str, Any] = Field(
        default_factory=dict,
        description="Aggregate statistics: min/max/mean per layer",
    )
