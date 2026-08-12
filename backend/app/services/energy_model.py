"""
LunaGuard Energy Model — configurable prototype, NOT a validated flight model.

Formula per edge:
  edge_energy = base_energy_per_metre × distance_m × slope_multiplier × roughness_multiplier

slope_multiplier:
  - flat      (0–3°):   1.0
  - mild uphill (3–8°):  1.0 + 0.15 × (slope − 3) / 5
  - steep uphill (>8°):  1.15 + 0.30 × (slope − 8) / 7
  - downhill:            1.0 + 0.05 × slope / 15   (no regenerative braking assumed)

roughness_multiplier:
  - 1.0 + 0.5 × normalized_roughness  (normalized = roughness / 95th-percentile_of_grid)

safety_margin: 1.10  (10% overhead applied to total route energy)

Risk score formula:
  risk_score = clamp(
      0.30 × slope_factor
    + 0.25 × energy_factor
    + 0.25 × hazard_factor
    + 0.20 × reserve_factor
  , 0, 1) × 100

  where:
    slope_factor   = max_slope_deg  / rover.max_slope_deg
    energy_factor  = energy_consumed_wh / rover.battery_wh
    hazard_factor  = min(cumulative_hazard / (len(path) * 0.6), 1)
    reserve_factor = max(0, 1 - battery_reserve_percent / rover.emergency_reserve_percent)

Mission success score formula:
  mission_success = clamp(100 − risk_score + bonus_reserve, 0, 100)
  bonus_reserve   = 5 × clamp((battery_reserve_percent − 30) / 30, 0, 1)
                    (adds up to 5 points when reserve > 30%)
"""

from __future__ import annotations

import math
import time
from typing import Sequence

import numpy as np
import structlog

from app.models.mission import GridPoint, RouteMetrics, RouteProfile, RoverConfig
from app.models.terrain import TerrainGrid

logger = structlog.get_logger(__name__)

SAFETY_MARGIN = 1.10  # 10% energy overhead

# Roughness normalisation: computed lazily from terrain grid
_roughness_p95_cache: dict[int, float] = {}


# ---------------------------------------------------------------------------
# Edge-level energy
# ---------------------------------------------------------------------------


def compute_edge_energy(
    distance_m: float,
    slope_deg: float,
    is_uphill: bool,
    roughness_normalized: float,
    rover: RoverConfig,
) -> float:
    """Return energy in Wh consumed traversing a single edge.

    Parameters
    ----------
    distance_m:
        Euclidean distance of the edge in metres.
    slope_deg:
        Absolute slope of the destination cell in degrees.
    is_uphill:
        True when moving to a higher-elevation cell.
    roughness_normalized:
        Roughness of the destination cell, normalised to [0, 1].
    rover:
        Rover configuration providing base_energy_per_metre.
    """
    # --- slope multiplier ---
    if is_uphill:
        if slope_deg <= 3.0:
            slope_mult = 1.0
        elif slope_deg <= 8.0:
            slope_mult = 1.0 + 0.15 * (slope_deg - 3.0) / 5.0
        else:
            slope_mult = 1.15 + 0.30 * (slope_deg - 8.0) / 7.0
    else:
        # Downhill — slightly more energy (no regen assumed)
        slope_mult = 1.0 + 0.05 * slope_deg / 15.0

    # --- roughness multiplier ---
    roughness_mult = 1.0 + 0.5 * roughness_normalized

    energy = rover.base_energy_per_metre * distance_m * slope_mult * roughness_mult
    return float(energy)


def _roughness_p95(terrain: TerrainGrid) -> float:
    """Return the 95th-percentile roughness value for normalization (cached)."""
    key = id(terrain)
    if key not in _roughness_p95_cache:
        flat = [v for row in terrain.roughness for v in row]
        arr = np.array(flat, dtype=np.float64)
        p95 = float(np.percentile(arr, 95))
        _roughness_p95_cache[key] = max(p95, 1e-9)
    return _roughness_p95_cache[key]


# ---------------------------------------------------------------------------
# Route-level energy
# ---------------------------------------------------------------------------


def compute_route_energy(
    path: list[GridPoint],
    terrain: TerrainGrid,
    rover: RoverConfig,
) -> float:
    """Return total energy in Wh for the given path, including safety margin.

    Applies SAFETY_MARGIN (×1.10) to account for thermal losses, motor
    inefficiencies, and sensor loads not modelled explicitly.
    """
    if len(path) < 2:
        return 0.0

    p95 = _roughness_p95(terrain)
    total_raw = 0.0
    cell_size = terrain.metadata.cell_size_m

    for i in range(1, len(path)):
        prev, curr = path[i - 1], path[i]
        # Euclidean distance (diagonal cells get sqrt(2) × cell_size)
        dr = curr.row - prev.row
        dc = curr.col - prev.col
        dist = math.sqrt(dr * dr + dc * dc) * cell_size

        slope_deg = terrain.slope[curr.row][curr.col]
        roughness_raw = terrain.roughness[curr.row][curr.col]
        roughness_norm = min(roughness_raw / p95, 1.0)

        elev_prev = terrain.elevation[prev.row][prev.col]
        elev_curr = terrain.elevation[curr.row][curr.col]
        is_uphill = elev_curr > elev_prev

        total_raw += compute_edge_energy(dist, slope_deg, is_uphill, roughness_norm, rover)

    return total_raw * SAFETY_MARGIN


# ---------------------------------------------------------------------------
# Full route metrics
# ---------------------------------------------------------------------------


def compute_route_metrics(
    path: list[GridPoint],
    terrain: TerrainGrid,
    rover: RoverConfig,
    profile: RouteProfile,
) -> RouteMetrics:
    """Compute all RouteMetrics fields for a given path.

    Every field is derived from the path + terrain + rover — never hardcoded.
    """
    t_start = time.perf_counter()

    warnings: list[str] = []
    slope_violation = False

    if len(path) < 2:
        # Degenerate: start == destination
        elapsed_ms = (time.perf_counter() - t_start) * 1000.0
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
            viable=True,
            risk_score=0.0,
            mission_success_score=100.0,
            calculation_time_ms=elapsed_ms,
            warnings=[],
        )

    cell_size = terrain.metadata.cell_size_m
    p95 = _roughness_p95(terrain)

    total_distance_m = 0.0
    total_raw_energy = 0.0
    slopes: list[float] = []
    cumulative_hazard = 0.0
    high_risk_cells = 0

    for i in range(1, len(path)):
        prev, curr = path[i - 1], path[i]
        dr = curr.row - prev.row
        dc = curr.col - prev.col
        dist = math.sqrt(dr * dr + dc * dc) * cell_size
        total_distance_m += dist

        slope_deg = terrain.slope[curr.row][curr.col]
        slopes.append(slope_deg)

        roughness_raw = terrain.roughness[curr.row][curr.col]
        roughness_norm = min(roughness_raw / p95, 1.0)

        elev_prev = terrain.elevation[prev.row][prev.col]
        elev_curr = terrain.elevation[curr.row][curr.col]
        is_uphill = elev_curr > elev_prev

        edge_e = compute_edge_energy(dist, slope_deg, is_uphill, roughness_norm, rover)
        total_raw_energy += edge_e

        hazard = terrain.hazard[curr.row][curr.col]
        cumulative_hazard += hazard
        if hazard > 0.6:
            high_risk_cells += 1

        # Hard constraint check: slope
        if slope_deg > rover.max_slope_deg:
            slope_violation = True
            warnings.append(
                f"Cell ({curr.row},{curr.col}) slope {slope_deg:.1f}° exceeds "
                f"rover limit {rover.max_slope_deg:.1f}°"
            )

    energy_consumed_wh = total_raw_energy * SAFETY_MARGIN
    battery_remaining_wh = rover.battery_wh - energy_consumed_wh
    battery_reserve_percent = (battery_remaining_wh / rover.battery_capacity_wh) * 100.0

    # Viability checks
    viable = not slope_violation

    if energy_consumed_wh > rover.battery_wh:
        viable = False
        warnings.append(
            f"Insufficient battery: need {energy_consumed_wh:.1f} Wh, "
            f"available {rover.battery_wh:.1f} Wh"
        )

    if battery_reserve_percent < rover.emergency_reserve_percent:
        viable = False
        warnings.append(
            f"Battery reserve {battery_reserve_percent:.1f}% would drop below "
            f"required {rover.emergency_reserve_percent:.1f}%"
        )

    max_slope_deg = max(slopes) if slopes else 0.0
    avg_slope_deg = float(np.mean(slopes)) if slopes else 0.0
    travel_time_hours = (total_distance_m / rover.speed_mps) / 3600.0

    if rover.max_duration_hours and travel_time_hours > rover.max_duration_hours:
        viable = False
        warnings.append(
            f"Travel time {travel_time_hours:.2f} h exceeds limit {rover.max_duration_hours:.2f} h"
        )

    # Near-miss reserve warning (within 5 points of limit)
    if (
        viable
        and battery_reserve_percent < rover.emergency_reserve_percent + 5.0
    ):
        warnings.append(
            f"Battery reserve {battery_reserve_percent:.1f}% is within 5% of "
            f"emergency threshold {rover.emergency_reserve_percent:.1f}%"
        )

    # ------------------------------------------------------------------
    # Risk score  (0–100, higher = more dangerous)
    # Formula documented in module docstring.
    # ------------------------------------------------------------------
    n_cells = max(len(path) - 1, 1)

    # slope_factor: fraction of rover's hard slope limit
    slope_factor = min(max_slope_deg / rover.max_slope_deg, 1.0)

    # energy_factor: fraction of available battery used
    energy_factor = min(energy_consumed_wh / max(rover.battery_wh, 1e-9), 1.0)

    # hazard_factor: mean hazard vs threshold of 0.6 (high-risk threshold)
    mean_hazard = cumulative_hazard / n_cells
    hazard_factor = min(mean_hazard / 0.6, 1.0)

    # reserve_factor: how close to zero usable reserve we are
    reserve_ratio = battery_reserve_percent / max(rover.emergency_reserve_percent, 1e-9)
    reserve_factor = max(0.0, 1.0 - reserve_ratio)

    risk_raw = (
        0.30 * slope_factor
        + 0.25 * energy_factor
        + 0.25 * hazard_factor
        + 0.20 * reserve_factor
    )
    risk_score = min(max(risk_raw * 100.0, 0.0), 100.0)

    # High-risk routes always warrant a warning
    if risk_score > 70.0 and not warnings:
        warnings.append(
            f"Route risk score {risk_score:.1f}/100 is HIGH — review before executing"
        )

    # ------------------------------------------------------------------
    # Mission success score (0–100, higher = better)
    # bonus_reserve: up to +5 pts when reserve > 30%
    # ------------------------------------------------------------------
    bonus_reserve = 5.0 * min(
        max((battery_reserve_percent - 30.0) / 30.0, 0.0), 1.0
    )
    mission_success_score = min(max(100.0 - risk_score + bonus_reserve, 0.0), 100.0)

    elapsed_ms = (time.perf_counter() - t_start) * 1000.0

    return RouteMetrics(
        total_distance_m=total_distance_m,
        travel_time_hours=travel_time_hours,
        energy_consumed_wh=energy_consumed_wh,
        battery_remaining_wh=battery_remaining_wh,
        battery_reserve_percent=battery_reserve_percent,
        max_slope_deg=max_slope_deg,
        avg_slope_deg=avg_slope_deg,
        cumulative_hazard=cumulative_hazard,
        high_risk_cells=high_risk_cells,
        viable=viable,
        risk_score=risk_score,
        mission_success_score=mission_success_score,
        calculation_time_ms=elapsed_ms,
        warnings=warnings,
    )
