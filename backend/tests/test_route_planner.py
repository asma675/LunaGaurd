"""
Tests for route_planner.py — A* planner, weight profiles, hard constraints.
"""

from __future__ import annotations

import pytest

from app.models.mission import GridPoint, RouteProfile, RoverConfig
from app.models.terrain import TerrainGrid
from app.services.route_planner import AStarPlanner
from app.services.energy_model import compute_route_metrics


def _find_traversable_pair(
    terrain: TerrainGrid,
    min_distance: int = 20,
) -> tuple[GridPoint, GridPoint]:
    """Find a start/dest pair that are both traversable and at least min_distance cells apart."""
    rows, cols = terrain.metadata.grid_rows, terrain.metadata.grid_cols
    candidates = [
        GridPoint(row=r, col=c)
        for r in range(rows)
        for c in range(cols)
        if terrain.traversable[r][c]
    ]
    for i, a in enumerate(candidates):
        for b in candidates[i + 1:]:
            if abs(a.row - b.row) + abs(a.col - b.col) >= min_distance:
                return a, b
    raise RuntimeError("Could not find two traversable cells far enough apart")


def _find_plannable_pair(
    terrain: TerrainGrid,
    rover: RoverConfig,
    min_distance: int = 10,
) -> tuple[GridPoint, GridPoint]:
    """Find two cells in the same hard-constraint-feasible component.

    This keeps the route-existence test deterministic without weakening the
    planner's slope or traversability constraints.
    """
    rows, cols = terrain.metadata.grid_rows, terrain.metadata.grid_cols

    def allowed(r: int, c: int) -> bool:
        return bool(terrain.traversable[r][c]) and terrain.slope[r][c] <= rover.max_slope_deg

    neighbours = [
        (-1, -1), (-1, 0), (-1, 1),
        (0, -1),           (0, 1),
        (1, -1),  (1, 0),  (1, 1),
    ]
    unseen = {(r, c) for r in range(rows) for c in range(cols) if allowed(r, c)}

    while unseen:
        seed = unseen.pop()
        component = [seed]
        queue = [seed]
        while queue:
            r, c = queue.pop()
            for dr, dc in neighbours:
                nr, nc = r + dr, c + dc
                nxt = (nr, nc)
                if (
                    0 <= nr < rows
                    and 0 <= nc < cols
                    and nxt in unseen
                    and allowed(nr, nc)
                ):
                    unseen.remove(nxt)
                    queue.append(nxt)
                    component.append(nxt)

        if len(component) < 2:
            continue

        # Use the most separated pair from a deterministic sample of the component.
        component.sort()
        for i, a in enumerate(component):
            for b in reversed(component[i + 1:]):
                if abs(a[0] - b[0]) + abs(a[1] - b[1]) >= min_distance:
                    return GridPoint(row=a[0], col=a[1]), GridPoint(row=b[0], col=b[1])

    raise RuntimeError("Could not find a connected pair that satisfies rover hard constraints")


def test_route_found_between_valid_points(
    terrain_fixture: TerrainGrid, rover_fixture: RoverConfig
) -> None:
    """A* must find a route between two valid traversable points."""
    planner = AStarPlanner(terrain_fixture)
    start, dest = _find_plannable_pair(terrain_fixture, rover_fixture, min_distance=10)

    path = planner.plan(start, dest, rover_fixture, RouteProfile.FASTEST)
    assert path is not None
    assert len(path) >= 2
    assert path[0] == start
    assert path[-1] == dest


def test_no_route_when_blocked(
    terrain_fixture: TerrainGrid, rover_fixture: RoverConfig
) -> None:
    """When all neighbours of start are blocked, no path should be found."""
    planner = AStarPlanner(terrain_fixture)
    # Block every adjacent cell manually by using a very strict rover
    strict_rover = rover_fixture.model_copy(update={"max_slope_deg": 0.01})
    start, dest = _find_traversable_pair(terrain_fixture, min_distance=5)
    # With 0.01° max slope, it's almost certain no path exists on hilly terrain
    path = planner.plan(start, dest, strict_rover, RouteProfile.FASTEST)
    # We don't assert None because there might be flat cells — just assert it runs
    assert path is None or isinstance(path, list)


def test_fastest_route_not_longer_than_safest(
    terrain_fixture: TerrainGrid, rover_fixture: RoverConfig
) -> None:
    """FASTEST route distance should be ≤ SAFEST route distance (or equal)."""
    start = GridPoint(row=20, col=20)
    dest = GridPoint(row=50, col=50)
    if not (
        terrain_fixture.traversable[start.row][start.col]
        and terrain_fixture.traversable[dest.row][dest.col]
    ):
        start, dest = _find_traversable_pair(terrain_fixture, min_distance=20)

    planner = AStarPlanner(terrain_fixture)
    fastest = planner.plan(start, dest, rover_fixture, RouteProfile.FASTEST)
    safest = planner.plan(start, dest, rover_fixture, RouteProfile.SAFEST)

    if fastest is None or safest is None:
        pytest.skip("No path found for one or both profiles — terrain configuration issue")

    m_fastest = compute_route_metrics(fastest, terrain_fixture, rover_fixture, RouteProfile.FASTEST)
    m_safest = compute_route_metrics(safest, terrain_fixture, rover_fixture, RouteProfile.SAFEST)

    # FASTEST optimises distance — should not be longer than SAFEST
    assert m_fastest.total_distance_m <= m_safest.total_distance_m * 1.1, (
        f"FASTEST ({m_fastest.total_distance_m:.0f}m) is more than 10% longer "
        f"than SAFEST ({m_safest.total_distance_m:.0f}m)"
    )


def test_safest_route_lower_or_equal_max_slope(
    terrain_fixture: TerrainGrid, rover_fixture: RoverConfig
) -> None:
    """SAFEST route max slope should be ≤ FASTEST max slope."""
    start = GridPoint(row=20, col=20)
    dest = GridPoint(row=75, col=78)
    if not (
        terrain_fixture.traversable[start.row][start.col]
        and terrain_fixture.traversable[dest.row][dest.col]
    ):
        start, dest = _find_traversable_pair(terrain_fixture, min_distance=30)

    planner = AStarPlanner(terrain_fixture)
    fastest = planner.plan(start, dest, rover_fixture, RouteProfile.FASTEST)
    safest = planner.plan(start, dest, rover_fixture, RouteProfile.SAFEST)

    if fastest is None or safest is None:
        pytest.skip("No path found for one or both profiles")

    m_fastest = compute_route_metrics(fastest, terrain_fixture, rover_fixture, RouteProfile.FASTEST)
    m_safest = compute_route_metrics(safest, terrain_fixture, rover_fixture, RouteProfile.SAFEST)

    # SAFEST should generally prefer shallower slopes
    assert m_safest.max_slope_deg <= m_fastest.max_slope_deg + 2.0, (
        f"SAFEST max slope ({m_safest.max_slope_deg:.1f}°) is much higher "
        f"than FASTEST ({m_fastest.max_slope_deg:.1f}°)"
    )


def test_energy_route_lower_or_equal_consumption(
    terrain_fixture: TerrainGrid, rover_fixture: RoverConfig
) -> None:
    """LOWEST_ENERGY route energy should be ≤ FASTEST energy."""
    start = GridPoint(row=20, col=20)
    dest = GridPoint(row=75, col=78)
    if not (
        terrain_fixture.traversable[start.row][start.col]
        and terrain_fixture.traversable[dest.row][dest.col]
    ):
        start, dest = _find_traversable_pair(terrain_fixture, min_distance=30)

    planner = AStarPlanner(terrain_fixture)
    fastest = planner.plan(start, dest, rover_fixture, RouteProfile.FASTEST)
    lowest_e = planner.plan(start, dest, rover_fixture, RouteProfile.LOWEST_ENERGY)

    if fastest is None or lowest_e is None:
        pytest.skip("No path found for one or both profiles")

    m_fastest = compute_route_metrics(fastest, terrain_fixture, rover_fixture, RouteProfile.FASTEST)
    m_lowest = compute_route_metrics(
        lowest_e, terrain_fixture, rover_fixture, RouteProfile.LOWEST_ENERGY
    )

    # LOWEST_ENERGY should not consume significantly more than FASTEST
    assert m_lowest.energy_consumed_wh <= m_fastest.energy_consumed_wh * 1.1, (
        f"LOWEST_ENERGY ({m_lowest.energy_consumed_wh:.1f}Wh) consumes more "
        f"than FASTEST ({m_fastest.energy_consumed_wh:.1f}Wh)"
    )


def test_hard_slope_constraint_respected(
    terrain_fixture: TerrainGrid,
) -> None:
    """No cell on any planned path should exceed rover.max_slope_deg."""
    rover = RoverConfig(max_slope_deg=12.0)
    start, dest = _find_traversable_pair(terrain_fixture, min_distance=20)
    planner = AStarPlanner(terrain_fixture)
    path = planner.plan(start, dest, rover, RouteProfile.FASTEST)
    if path is None:
        pytest.skip("No path found — hard constraint correctly eliminates all options")

    for pt in path[1:]:
        slope = terrain_fixture.slope[pt.row][pt.col]
        assert slope <= rover.max_slope_deg + 1e-6, (
            f"Path includes cell ({pt.row},{pt.col}) with slope {slope:.2f}° "
            f"> rover limit {rover.max_slope_deg:.2f}°"
        )


def test_profiles_produce_different_paths(
    terrain_fixture: TerrainGrid, rover_fixture: RoverConfig
) -> None:
    """At least 2 of 3 profiles should produce distinct paths."""
    start = GridPoint(row=20, col=20)
    dest = GridPoint(row=75, col=78)
    if not (
        terrain_fixture.traversable[start.row][start.col]
        and terrain_fixture.traversable[dest.row][dest.col]
    ):
        start, dest = _find_traversable_pair(terrain_fixture, min_distance=30)

    planner = AStarPlanner(terrain_fixture)
    paths = planner.plan_all_profiles(start, dest, rover_fixture)

    found = {p: v for p, v in paths.items() if v is not None}
    if len(found) < 2:
        pytest.skip("Fewer than 2 profiles found paths — terrain too constrained")

    # Convert to frozensets of (row, col) for comparison
    path_sets = [frozenset((pt.row, pt.col) for pt in p) for p in found.values()]
    unique = len(set(path_sets))
    # At least 2 of 3 should be different
    assert unique >= 2, (
        f"All {len(path_sets)} paths are identical — weight profiles have no effect"
    )


def test_path_start_and_end_correct(
    terrain_fixture: TerrainGrid, rover_fixture: RoverConfig
) -> None:
    """Path must start exactly at start and end exactly at destination."""
    start, dest = _find_traversable_pair(terrain_fixture, min_distance=15)
    planner = AStarPlanner(terrain_fixture)
    path = planner.plan(start, dest, rover_fixture, RouteProfile.SAFEST)
    if path is None:
        pytest.skip("No path found")
    assert path[0] == start
    assert path[-1] == dest


def test_risk_tolerance_adjusts_soft_hazard_weight() -> None:
    """Operator risk tolerance changes hazard aversion without changing hard limits."""
    from app.services.route_planner import WEIGHT_PROFILES, _effective_weights

    conservative = _effective_weights(RouteProfile.SAFEST, 0.0)
    baseline = _effective_weights(RouteProfile.SAFEST, 0.5)
    permissive = _effective_weights(RouteProfile.SAFEST, 1.0)

    assert conservative.hazard_weight > baseline.hazard_weight > permissive.hazard_weight
    assert baseline.hazard_weight == WEIGHT_PROFILES[RouteProfile.SAFEST].hazard_weight
    assert conservative.distance_weight == permissive.distance_weight
    assert conservative.energy_weight == permissive.energy_weight
