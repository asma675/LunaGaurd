"""
Grid-based weighted A* route planner for LunaGuard.

Uses configurable weight profiles to produce three meaningfully different routes:

  FASTEST      — minimises geometric distance (shortest path in cells)
  LOWEST_ENERGY — minimises energy consumption on each edge
  SAFEST        — minimises hazard exposure; diversifies away from the FASTEST path

Hard constraints (slope > rover.max_slope_deg, non-traversable cells) are never
relaxed: such edges receive cost = infinity and are never entered.
"""

from __future__ import annotations

import heapq
import math
import time
from dataclasses import dataclass
from typing import Optional

import structlog

from app.models.mission import GridPoint, RouteProfile, RoverConfig
from app.models.terrain import TerrainGrid
from app.services.energy_model import compute_edge_energy, _roughness_p95

logger = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Weight profiles
# ---------------------------------------------------------------------------


@dataclass
class CostWeights:
    """Relative weights used in A* edge cost computation."""

    distance_weight: float  # multiplier on normalised Euclidean distance
    energy_weight: float    # multiplier on normalised edge energy
    hazard_weight: float    # multiplier on destination cell hazard score


WEIGHT_PROFILES: dict[RouteProfile, CostWeights] = {
    # FASTEST: ignore energy and hazard, minimise step count / distance
    RouteProfile.FASTEST: CostWeights(
        distance_weight=1.0,
        energy_weight=0.1,
        hazard_weight=0.1,
    ),
    # LOWEST_ENERGY: heavily penalise costly edges; still avoid extreme hazard
    RouteProfile.LOWEST_ENERGY: CostWeights(
        distance_weight=0.3,
        energy_weight=1.0,
        hazard_weight=0.3,
    ),
    # SAFEST: heavily penalise hazardous cells; accept longer paths
    RouteProfile.SAFEST: CostWeights(
        distance_weight=0.4,
        energy_weight=0.4,
        hazard_weight=1.0,
    ),
}

def _effective_weights(profile: RouteProfile, risk_tolerance: float) -> CostWeights:
    """Return profile weights adjusted by the operator risk preference.

    ``risk_tolerance=0.5`` preserves the published baseline weights. Lower
    tolerance increases hazard aversion; higher tolerance relaxes only the
    soft hazard penalty. Hard slope and traversability constraints are never
    changed.
    """
    base = WEIGHT_PROFILES[profile]
    tolerance = min(max(float(risk_tolerance), 0.0), 1.0)
    hazard_scale = 1.5 - tolerance  # 1.5x at 0.0, 1.0x at 0.5, 0.5x at 1.0
    return CostWeights(
        distance_weight=base.distance_weight,
        energy_weight=base.energy_weight,
        hazard_weight=base.hazard_weight * hazard_scale,
    )


# Neighbours: 8-connected grid (cardinal + diagonal)
_NEIGHBOURS = [
    (-1, -1), (-1, 0), (-1, 1),
    (0, -1),           (0, 1),
    (1, -1),  (1, 0),  (1, 1),
]

# Maximum plausible energy for a single edge (used for normalisation)
_MAX_EDGE_ENERGY_WH = 5.0  # Wh — conservative upper bound for one 100 m step


# ---------------------------------------------------------------------------
# Planner class
# ---------------------------------------------------------------------------


class AStarPlanner:
    """Weighted A* route planner on the LunaGuard terrain grid."""

    def __init__(self, terrain: TerrainGrid) -> None:
        self._terrain = terrain
        self._p95_roughness = _roughness_p95(terrain)
        self._rows = terrain.metadata.grid_rows
        self._cols = terrain.metadata.grid_cols
        self._cell_size = terrain.metadata.cell_size_m

    # ------------------------------------------------------------------
    # Public methods
    # ------------------------------------------------------------------

    def plan(
        self,
        start: GridPoint,
        dest: GridPoint,
        rover: RoverConfig,
        profile: RouteProfile,
        blocked_extra: Optional[set[tuple[int, int]]] = None,
    ) -> list[GridPoint] | None:
        """Run A* and return a path, or None if no path exists.

        Parameters
        ----------
        start, dest:
            Grid positions.
        rover:
            Rover constraints used for hard-blocking.
        profile:
            Selects the weight profile.
        blocked_extra:
            Additional (row, col) pairs to treat as impassable (used by
            emergency service for newly obstructed cells).
        """
        weights = _effective_weights(profile, rover.risk_tolerance)
        blocked_extra = blocked_extra or set()

        # (f_score, tie_breaker, node_tuple)
        open_heap: list[tuple[float, int, tuple[int, int]]] = []
        counter = 0  # tie-breaker to keep heap stable

        start_t = (start.row, start.col)
        dest_t = (dest.row, dest.col)

        g_score: dict[tuple[int, int], float] = {start_t: 0.0}
        came_from: dict[tuple[int, int], tuple[int, int]] = {}

        h = self._heuristic(start_t, dest_t, weights)
        heapq.heappush(open_heap, (h, counter, start_t))
        counter += 1

        closed: set[tuple[int, int]] = set()

        while open_heap:
            _, _, current = heapq.heappop(open_heap)

            if current in closed:
                continue
            closed.add(current)

            if current == dest_t:
                return self._compute_path(came_from, current)

            for nr, nc in self._get_neighbours(current):
                neighbour = (nr, nc)
                if neighbour in closed:
                    continue
                if neighbour in blocked_extra:
                    continue

                edge_cost = self._edge_cost(current, neighbour, rover, weights)
                if edge_cost == math.inf:
                    continue

                tentative_g = g_score[current] + edge_cost
                if tentative_g < g_score.get(neighbour, math.inf):
                    came_from[neighbour] = current
                    g_score[neighbour] = tentative_g
                    f = tentative_g + self._heuristic(neighbour, dest_t, weights)
                    heapq.heappush(open_heap, (f, counter, neighbour))
                    counter += 1

        # No path found
        return None

    def plan_all_profiles(
        self,
        start: GridPoint,
        dest: GridPoint,
        rover: RoverConfig,
        blocked_extra: Optional[set[tuple[int, int]]] = None,
    ) -> dict[RouteProfile, list[GridPoint] | None]:
        """Plan routes for all three profiles and return a mapping."""
        results: dict[RouteProfile, list[GridPoint] | None] = {}
        for profile in RouteProfile:
            t0 = time.perf_counter()
            path = self.plan(start, dest, rover, profile, blocked_extra)
            elapsed = (time.perf_counter() - t0) * 1000.0
            logger.info(
                "planner.profile_done",
                profile=profile.value,
                found=path is not None,
                steps=len(path) if path else 0,
                elapsed_ms=f"{elapsed:.1f}",
            )
            results[profile] = path
        return results

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _heuristic(
        self,
        a: tuple[int, int],
        b: tuple[int, int],
        weights: CostWeights,
    ) -> float:
        """Admissible heuristic in the same normalized units as edge cost.

        Edge distance is normalized by cell size, so the lower-bound distance
        contribution is Euclidean grid steps × distance_weight. Energy and
        hazard terms are non-negative and can safely be omitted from h(n).
        """
        dr = b[0] - a[0]
        dc = b[1] - a[1]
        grid_steps = math.sqrt(dr * dr + dc * dc)
        return grid_steps * weights.distance_weight

    def _edge_cost(
        self,
        from_cell: tuple[int, int],
        to_cell: tuple[int, int],
        rover: RoverConfig,
        weights: CostWeights,
    ) -> float:
        """Weighted cost of moving from from_cell to to_cell.

        Returns math.inf when the move violates a hard constraint:
        - destination is non-traversable
        - destination slope exceeds rover.max_slope_deg
        """
        tr, tc = to_cell
        terrain = self._terrain

        # Hard constraint 1: non-traversable cell
        if not terrain.traversable[tr][tc]:
            return math.inf

        slope_deg = terrain.slope[tr][tc]

        # Hard constraint 2: slope exceeds rover hard limit
        if slope_deg > rover.max_slope_deg:
            return math.inf

        # --- Geometric distance component ---
        fr, fc = from_cell
        dr = tr - fr
        dc = tc - fc
        dist_m = math.sqrt(dr * dr + dc * dc) * self._cell_size

        # Normalised distance (vs single cell_size step)
        dist_norm = dist_m / self._cell_size

        # --- Energy component ---
        roughness_raw = terrain.roughness[tr][tc]
        roughness_norm = min(roughness_raw / self._p95_roughness, 1.0)
        elev_from = terrain.elevation[fr][fc]
        elev_to = terrain.elevation[tr][tc]
        is_uphill = elev_to > elev_from

        edge_energy = compute_edge_energy(
            dist_m, slope_deg, is_uphill, roughness_norm, rover
        )
        energy_norm = edge_energy / _MAX_EDGE_ENERGY_WH

        # --- Hazard component ---
        hazard = terrain.hazard[tr][tc]

        # Weighted composite cost
        cost = (
            weights.distance_weight * dist_norm
            + weights.energy_weight * energy_norm
            + weights.hazard_weight * hazard
        )
        return float(cost)

    def _compute_path(
        self,
        came_from: dict[tuple[int, int], tuple[int, int]],
        current: tuple[int, int],
    ) -> list[GridPoint]:
        """Reconstruct path from came_from map."""
        path: list[tuple[int, int]] = [current]
        while current in came_from:
            current = came_from[current]
            path.append(current)
        path.reverse()
        return [GridPoint(row=r, col=c) for r, c in path]

    def _get_neighbours(self, cell: tuple[int, int]) -> list[tuple[int, int]]:
        """Return valid in-bounds 8-connected neighbours."""
        r, c = cell
        neighbours = []
        for dr, dc in _NEIGHBOURS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < self._rows and 0 <= nc < self._cols:
                neighbours.append((nr, nc))
        return neighbours
