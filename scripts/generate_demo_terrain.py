#!/usr/bin/env python3
"""
LunaGuard — Generate and save synthetic demo terrain.

Saves terrain to data/processed/demo_terrain.json relative to the
lunaguard project root.

Usage:
    python scripts/generate_demo_terrain.py
    python scripts/generate_demo_terrain.py --output path/to/output.json
    python scripts/generate_demo_terrain.py --seed 42 --rows 100 --cols 100
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate synthetic lunar terrain for LunaGuard demo"
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output JSON path (default: data/processed/demo_terrain.json)",
    )
    parser.add_argument("--seed", type=int, default=42, help="NumPy random seed")
    parser.add_argument("--rows", type=int, default=100, help="Grid rows")
    parser.add_argument("--cols", type=int, default=100, help="Grid columns")
    args = parser.parse_args()

    # Resolve project root (scripts/ → lunaguard/)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    # Add backend to Python path so we can import app modules
    backend_dir = project_root / "backend"
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    output_path: Path = args.output or (
        project_root / "data" / "processed" / "demo_terrain.json"
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Generating synthetic terrain: {args.rows}×{args.cols}, seed={args.seed}")

    from app.services.terrain_service import generate_synthetic_terrain, validate_terrain

    grid = generate_synthetic_terrain(rows=args.rows, cols=args.cols, seed=args.seed)
    validate_terrain(grid)

    # Serialise
    data = grid.model_dump()
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    # Print summary
    traversable_cells = sum(
        1 for row in grid.traversable for v in row if v
    )
    total = args.rows * args.cols
    print(f"✓ Terrain generated and validated")
    print(f"  Grid: {args.rows}×{args.cols} ({total} cells, each {grid.metadata.cell_size_m:.0f}m)")
    print(f"  Traversable: {traversable_cells}/{total} ({100*traversable_cells/total:.1f}%)")
    print(f"  Elevation range: [{min(v for r in grid.elevation for v in r):.1f}, "
          f"{max(v for r in grid.elevation for v in r):.1f}] m")
    print(f"  Max slope: {max(v for r in grid.slope for v in r):.1f}°")
    print(f"  Data source: {grid.metadata.data_source}")
    print(f"  Output: {output_path.resolve()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
