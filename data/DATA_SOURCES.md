# LunaGuard Data Sources and Provenance

## Demo dataset

The checked-in LunaGuard prototype uses **deterministic synthetic terrain only**.

- Grid: 100 × 100 cells
- Cell size: 100 m
- Extent represented by grid: 10 km × 10 km
- Random seed: 42
- Generated layers: elevation, slope, roughness, hazard, traversability
- API provenance flag: `is_synthetic = true`
- API data-source label explicitly states that the terrain is synthetic and not real NASA/LOLA data

The generator lives in `backend/app/services/terrain_service.py`.

## Why synthetic data is used

- reproducible judge/demo results,
- no large external download,
- deterministic automated tests,
- clear separation between software architecture and mission-data validation.

## Derived layers

### Elevation
Multi-frequency synthetic surface plus Gaussian noise and fixed crater-like depressions.

### Slope
Computed from the gradient of elevation at 100 m spacing.

### Roughness
Local 3×3 elevation standard deviation.

### Hazard
Prototype normalized composite:

```text
0.50 × normalized_slope
+ 0.30 × normalized_roughness
+ 0.20 × relative_depth_penalty
```

### Traversability
Terrain-level mask requiring slope <25° and excluding very deep crater interiors. Rover configuration may impose a stricter slope limit.

## Production data path

A real deployment would replace the synthetic generator with a validated lunar digital elevation model / mission terrain product and would need to preserve:
- spatial reference and units,
- source and processing provenance,
- horizontal/vertical uncertainty,
- resolution and resampling history,
- no-data handling,
- derived-layer algorithms and calibration,
- independent verification and validation.

Potential sources may include mission-approved lunar elevation products such as LOLA-derived DEMs, but **no external lunar DEM is bundled or claimed as validated by this prototype**.
