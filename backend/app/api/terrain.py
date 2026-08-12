"""
LunaGuard terrain API router.

Endpoints:
  GET /api/terrain/metadata  — TerrainMetadata
  GET /api/terrain/sample    — TerrainSampleResponse (full grid)
"""

from __future__ import annotations

import numpy as np
from fastapi import APIRouter

from app.models.terrain import TerrainMetadata, TerrainSampleResponse
from app.services.terrain_service import get_terrain

router = APIRouter(prefix="/api/terrain", tags=["terrain"])


@router.get("/metadata", response_model=TerrainMetadata)
async def terrain_metadata() -> TerrainMetadata:
    """Return metadata about the loaded terrain grid."""
    terrain = get_terrain()
    return terrain.metadata


@router.get("/sample", response_model=TerrainSampleResponse)
async def terrain_sample() -> TerrainSampleResponse:
    """Return the full terrain grid with summary statistics."""
    terrain = get_terrain()

    # Compute summary statistics for each layer
    flat_elevation = [v for row in terrain.elevation for v in row]
    flat_slope = [v for row in terrain.slope for v in row]
    flat_roughness = [v for row in terrain.roughness for v in row]
    flat_hazard = [v for row in terrain.hazard for v in row]
    flat_traversable = [v for row in terrain.traversable for v in row]

    def layer_stats(flat: list[float]) -> dict:
        arr = np.array(flat, dtype=np.float64)
        return {
            "min": round(float(arr.min()), 3),
            "max": round(float(arr.max()), 3),
            "mean": round(float(arr.mean()), 3),
            "std": round(float(arr.std()), 3),
        }

    traversable_count = sum(1 for v in flat_traversable if v)
    total_cells = len(flat_traversable)

    summary = {
        "elevation_m": layer_stats(flat_elevation),
        "slope_deg": layer_stats(flat_slope),
        "roughness": layer_stats(flat_roughness),
        "hazard_score": layer_stats(flat_hazard),
        "traversability": {
            "traversable_cells": traversable_count,
            "blocked_cells": total_cells - traversable_count,
            "traversable_percent": round(100.0 * traversable_count / total_cells, 1),
        },
    }

    return TerrainSampleResponse(
        metadata=terrain.metadata,
        elevation=terrain.elevation,
        slope=terrain.slope,
        roughness=terrain.roughness,
        hazard=terrain.hazard,
        traversable=terrain.traversable,
        summary=summary,
    )
