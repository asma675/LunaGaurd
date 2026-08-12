# LunaGuard Algorithms

LunaGuard deliberately separates **deterministic mission calculations** from **generative AI narration**. Route search, energy, viability, risk, and mission-success values are computed in Python. IBM Granite may explain those values, but it does not create or overwrite them.

## 1. Terrain model

The demo uses a deterministic 100×100 grid at 100 m/cell (10 km × 10 km), seed 42.

Layers:
- **elevation** — multi-frequency synthetic topography plus Gaussian crater-like depressions,
- **slope** — gradient-derived degrees,
- **roughness** — local 3×3 elevation standard deviation,
- **hazard** — normalized composite,
- **traversable** — terrain-level hard mask.

Terrain hazard:

```text
slope_norm     = clamp(slope / 25°, 0, 1)
roughness_norm = clamp(roughness / p99(roughness), 0, 1)
depth_penalty  = clamp((mean_elevation - elevation) / (3 × elevation_std), 0, 1)

hazard = clamp(
    0.50 × slope_norm
  + 0.30 × roughness_norm
  + 0.20 × depth_penalty,
  0, 1
)
```

Terrain-level traversability requires slope < 25° and excludes very deep crater interiors. A rover can impose a stricter `max_slope_deg` during planning.

Implementation: `backend/app/services/terrain_service.py`.

## 2. Weighted A* planning

The planner uses an 8-connected grid.

### Hard constraints

A candidate destination cell is rejected (`cost = ∞`) when:
1. terrain marks it non-traversable, or
2. its slope exceeds `rover.max_slope_deg`, or
3. an emergency marks it newly obstructed.

### Profile weights

| Profile | Distance | Energy | Hazard |
|---|---:|---:|---:|
| `FASTEST` | 1.0 | 0.1 | 0.1 |
| `LOWEST_ENERGY` | 0.3 | 1.0 | 0.3 |
| `SAFEST` | 0.4 | 0.4 | 1.0 |

The operator's `risk_tolerance` modifies only the **soft hazard penalty**:

```text
hazard_scale = 1.5 - risk_tolerance
effective_hazard_weight = profile_hazard_weight × hazard_scale
```

At the default `risk_tolerance=0.5`, the table above is unchanged. A lower tolerance makes all profiles more hazard-averse; a higher tolerance reduces the soft hazard penalty. Hard traversability and slope constraints are never relaxed.

### Edge cost

```text
distance_norm = edge_distance_m / cell_size_m
energy_norm   = edge_energy_wh / 5.0

edge_cost =
    w_distance × distance_norm
  + w_energy   × energy_norm
  + w_hazard   × destination_hazard
```

The A* heuristic is:

```text
h(n) = euclidean_grid_steps(n, destination) × w_distance
```

Energy and hazard are non-negative and omitted from the heuristic, so the heuristic remains a lower bound for this weighted edge model.

Implementation: `backend/app/services/route_planner.py`.

## 3. Energy model

Per-edge energy:

```text
edge_energy = base_energy_per_metre
            × distance_m
            × slope_multiplier
            × roughness_multiplier
```

Slope multiplier:
- uphill 0–3°: 1.0,
- uphill 3–8°: gradually increases to 1.15,
- uphill >8°: grows from 1.15 using the configured prototype formula,
- downhill: small penalty; no regenerative braking is assumed.

Roughness multiplier:

```text
roughness_multiplier = 1.0 + 0.5 × normalized_roughness
```

Total route energy adds a 10% prototype overhead:

```text
route_energy = 1.10 × Σ(edge_energy)
```

Default rover `base_energy_per_metre` is 0.05 Wh/m and is user-configurable.

Implementation: `backend/app/services/energy_model.py`.

## 4. Viability

A route is non-viable when any of these conditions applies:
- a path cell exceeds the rover maximum slope,
- predicted energy use exceeds current battery energy,
- projected battery reserve falls below `emergency_reserve_percent`,
- optional mission duration exceeds `max_duration_hours`,
- during terrain-obstruction reassessment, the original remaining path intersects a newly blocked cell.

Planner-generated paths structurally avoid terrain/slope hard constraints; the explicit viability checks are also used when an existing route is reassessed under new emergency constraints.

## 5. Risk score

Risk is deterministic on a 0–100 scale:

```text
slope_factor   = min(max_slope / rover_max_slope, 1)
energy_factor  = min(route_energy / current_battery_wh, 1)
hazard_factor  = min(mean_hazard / 0.6, 1)
reserve_factor = max(0, 1 - projected_reserve / emergency_reserve_threshold)

risk_score = clamp(
    0.30 × slope_factor
  + 0.25 × energy_factor
  + 0.25 × hazard_factor
  + 0.20 × reserve_factor,
  0, 1
) × 100
```

## 6. Mission-success score

```text
bonus_reserve = 5 × clamp((battery_reserve_percent - 30) / 30, 0, 1)
mission_success = clamp(100 - risk_score + bonus_reserve, 0, 100)
```

The score is a prototype decision-support metric, not a probability of real mission success.

## 7. Route recommendation

For initial planning:
1. filter to viable routes,
2. recommend the viable route with highest mission-success score,
3. if none are viable, surface the lowest-risk option for diagnosis while keeping it labelled non-viable.

The operator can still select any route; LunaGuard is human-in-the-loop.

## 8. Emergency recovery

Supported events:

### `BATTERY_DEGRADATION`
Subtracts `battery_loss_percent` from rover state of charge (clamped at 0%).

### `REDUCED_MOBILITY`
Subtracts `slope_reduction_deg` from the rover's maximum slope (minimum 1°). Existing path cells are rechecked under the new limit.

### `TERRAIN_OBSTRUCTION`
Adds specified cells to the planner's emergency blocked set. If any lie ahead on the original remaining path, that original route is marked non-viable.

Recovery pipeline:

```text
updated_rover = apply(emergency)
original_remaining = slice(active_path, current_position)
original_metrics = recompute(original_remaining, updated_rover)
recovery_path = A*(current_position → original_destination, profile=SAFEST)
recovery_metrics = recompute(recovery_path, updated_rover)
compare deltas
recommend FOLLOW_RECOVERY_ROUTE / CONTINUE_ORIGINAL / ABORT
```

Implementation: `backend/app/services/emergency_service.py`.

## 9. Explainability and IBM Granite

`ExplainabilityService` creates structured factor evidence from computed route metrics. The risk breakdown is:
- slope: 30%,
- energy: 25%,
- hazard: 25%,
- reserve: 20%.

When IBM watsonx credentials are present, Granite receives a concise prompt containing only authoritative metrics. Returned narration is scanned for numeric claims; numbers that do not match computed evidence within tolerance cause the model output to be rejected and LunaGuard falls back to deterministic text.

This creates a clear safety boundary:

```text
Deterministic planner + metrics  → authoritative
IBM Granite narration            → advisory explanation only
```

Implementation: `backend/app/services/explainability.py` and `backend/app/api/ai.py`.
