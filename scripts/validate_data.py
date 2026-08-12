#!/usr/bin/env python3
"""
LunaGuard — Validate terrain data and backend services.

Runs a series of checks:
1. Synthetic terrain generation and validation
2. A* route planner sanity check (FASTEST, LOWEST_ENERGY, SAFEST)
3. Energy model sanity check
4. Emergency service sanity check

Usage:
    python scripts/validate_data.py
    python scripts/validate_data.py --strict   # fail on any warning
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def section(title: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def ok(msg: str) -> None:
    print(f"  ✓ {msg}")


def warn(msg: str) -> None:
    print(f"  ⚠  {msg}")


def fail(msg: str) -> None:
    print(f"  ✗ {msg}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate LunaGuard data and services")
    parser.add_argument("--strict", action="store_true", help="Exit non-zero on any warning")
    args = parser.parse_args()

    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    backend_dir = project_root / "backend"
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    errors = 0
    warnings = 0

    # ------------------------------------------------------------------
    # 1. Terrain generation
    # ------------------------------------------------------------------
    section("1. Terrain Generation & Validation")
    try:
        from app.services.terrain_service import generate_synthetic_terrain, validate_terrain

        grid = generate_synthetic_terrain(seed=42)
        validate_terrain(grid)
        ok(f"Synthetic terrain generated: {grid.metadata.grid_rows}×{grid.metadata.grid_cols}")
        ok(f"Cell size: {grid.metadata.cell_size_m} m")
        ok(f"is_synthetic: {grid.metadata.is_synthetic}")
        ok(f"Data source: {grid.metadata.data_source[:60]}")

        traversable = sum(1 for r in grid.traversable for v in r if v)
        total = grid.metadata.grid_rows * grid.metadata.grid_cols
        pct = 100 * traversable / total
        ok(f"Traversability: {traversable}/{total} cells ({pct:.1f}%)")
        if pct < 50:
            warn(f"Traversability {pct:.1f}% is low; check terrain parameters")
            warnings += 1

        max_slope = max(v for r in grid.slope for v in r)
        ok(f"Max slope: {max_slope:.1f}°")
        if max_slope > 45:
            warn(f"Max slope {max_slope:.1f}° seems high for lunar terrain")
            warnings += 1

        min_hazard = min(v for r in grid.hazard for v in r)
        max_hazard = max(v for r in grid.hazard for v in r)
        ok(f"Hazard range: [{min_hazard:.3f}, {max_hazard:.3f}]")
        if max_hazard > 1.0 or min_hazard < 0.0:
            fail(f"Hazard out of [0,1] range!")
            errors += 1

    except Exception as exc:
        fail(f"Terrain generation failed: {exc}")
        errors += 1
        grid = None

    # ------------------------------------------------------------------
    # 2. Route planner
    # ------------------------------------------------------------------
    section("2. A* Route Planner")
    if grid is not None:
        try:
            from app.models.mission import GridPoint, RoverConfig, RouteProfile
            from app.services.route_planner import AStarPlanner

            rover = RoverConfig(
                battery_capacity_wh=1000.0,
                battery_percent=95.0,
                emergency_reserve_percent=15.0,
                base_energy_per_metre=0.05,
                max_slope_deg=15.0,
                speed_mps=0.5,
            )
            start = GridPoint(row=20, col=20)
            dest = GridPoint(row=75, col=78)

            # Ensure both are traversable
            if not grid.traversable[start.row][start.col]:
                warn(f"start {start} is not traversable; skipping planner check")
                warnings += 1
            elif not grid.traversable[dest.row][dest.col]:
                warn(f"dest {dest} is not traversable; skipping planner check")
                warnings += 1
            else:
                planner = AStarPlanner(grid)
                paths = planner.plan_all_profiles(start, dest, rover)
                for profile, path in paths.items():
                    if path is None:
                        warn(f"No path for profile {profile.value}")
                        warnings += 1
                    else:
                        ok(f"{profile.value}: {len(path)} cells, "
                           f"start={path[0]}, end={path[-1]}")
                        assert path[0] == start, "Path does not start at start!"
                        assert path[-1] == dest, "Path does not end at dest!"

                # Check profiles differ
                found = [p for p in paths.values() if p is not None]
                unique = len({frozenset((pt.row, pt.col) for pt in p) for p in found})
                if unique < 2:
                    warn(f"Only {unique} unique paths across profiles — weight profiles may not differ enough")
                    warnings += 1
                else:
                    ok(f"Profiles produce {unique} distinct paths — weight diversification working")

        except Exception as exc:
            fail(f"Route planner check failed: {exc}")
            errors += 1

    # ------------------------------------------------------------------
    # 3. Energy model
    # ------------------------------------------------------------------
    section("3. Energy Model")
    if grid is not None:
        try:
            from app.models.mission import GridPoint, RoverConfig, RouteProfile
            from app.services.energy_model import compute_edge_energy, compute_route_metrics

            rover = RoverConfig(base_energy_per_metre=0.05)
            flat_e = compute_edge_energy(100.0, 0.0, False, 0.0, rover)
            uphill_e = compute_edge_energy(100.0, 10.0, True, 0.0, rover)
            ok(f"Flat energy (100m): {flat_e:.4f} Wh")
            ok(f"Uphill energy (100m, 10°): {uphill_e:.4f} Wh")
            assert uphill_e > flat_e, "Uphill must be more expensive than flat"
            ok("Uphill > flat: ✓")

            path = [GridPoint(row=r, col=20) for r in range(20, 40)]
            full_rover = RoverConfig(battery_capacity_wh=1000, battery_percent=95)
            metrics = compute_route_metrics(path, grid, full_rover, RouteProfile.FASTEST)
            ok(f"Route metrics: distance={metrics.total_distance_m:.0f}m, "
               f"energy={metrics.energy_consumed_wh:.2f}Wh, "
               f"risk={metrics.risk_score:.1f}, "
               f"viable={metrics.viable}")
            assert 0 <= metrics.risk_score <= 100
            assert 0 <= metrics.mission_success_score <= 100

        except Exception as exc:
            fail(f"Energy model check failed: {exc}")
            errors += 1

    # ------------------------------------------------------------------
    # 4. Emergency service
    # ------------------------------------------------------------------
    section("4. Emergency Service")
    if grid is not None:
        try:
            from app.models.mission import (
                EmergencyEvent, EmergencyType, GridPoint, MissionRequest,
                ReassessRequest, RoverConfig, RouteProfile, RouteResult
            )
            from app.services.emergency_service import EmergencyService
            from app.services.route_planner import AStarPlanner
            from app.services.energy_model import compute_route_metrics

            rover = RoverConfig(
                battery_capacity_wh=1000, battery_percent=95,
                emergency_reserve_percent=15, base_energy_per_metre=0.05,
                max_slope_deg=15, speed_mps=0.5
            )
            start = GridPoint(row=20, col=20)
            dest = GridPoint(row=75, col=78)

            if grid.traversable[start.row][start.col] and grid.traversable[dest.row][dest.col]:
                planner = AStarPlanner(grid)
                path = planner.plan(start, dest, rover, RouteProfile.SAFEST)
                if path:
                    metrics = compute_route_metrics(path, grid, rover, RouteProfile.SAFEST)
                    route = RouteResult(
                        profile=RouteProfile.SAFEST,
                        path=path,
                        metrics=metrics,
                        explanation_evidence={},
                    )
                    mission = MissionRequest(start=start, destination=dest, rover=rover)
                    mid = path[len(path) // 3]
                    emergency = EmergencyEvent(
                        type=EmergencyType.BATTERY_DEGRADATION,
                        battery_loss_percent=15.0
                    )
                    service = EmergencyService()
                    result = service.reassess_route(
                        ReassessRequest(
                            original_request=mission,
                            active_route=route,
                            current_position=mid,
                            emergency=emergency,
                        ),
                        grid,
                    )
                    ok(f"Reassessment: recommendation={result.recommendation}")
                    ok(f"  Risk reduction: {result.risk_reduction:.1f} pts")
                    ok(f"  Reserve change: {result.battery_reserve_change:.1f}%")
                    ok(f"  Explanation length: {len(result.explanation)} chars")
                    assert result.recommendation in (
                        "FOLLOW_RECOVERY_ROUTE", "CONTINUE_ORIGINAL", "ABORT"
                    )
                else:
                    warn("No path found for emergency service test")
                    warnings += 1

        except Exception as exc:
            fail(f"Emergency service check failed: {exc}")
            errors += 1

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    section("Summary")
    if errors == 0 and warnings == 0:
        print("  All checks passed ✓")
    elif errors == 0:
        print(f"  {warnings} warning(s), 0 errors — review warnings above")
    else:
        print(f"  {errors} error(s), {warnings} warning(s) — fix errors before deploying")

    if args.strict and warnings > 0:
        return 1
    return 1 if errors > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
