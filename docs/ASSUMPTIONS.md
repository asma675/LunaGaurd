# LunaGuard Assumptions and Prototype Boundaries

LunaGuard is a research/hackathon prototype. These assumptions are explicit so judges and developers can separate **demonstrated software behavior** from **future mission validation**.

## 1. Terrain

- Demo terrain is algorithmically generated with NumPy/SciPy using fixed seed 42.
- Grid size is 100×100 at 100 m/cell (10 km × 10 km).
- Elevation is relative synthetic topography, not a georeferenced lunar DEM.
- Slope is derived from the generated elevation gradient.
- Roughness is local 3×3 elevation standard deviation.
- Terrain hazard is a prototype composite of slope, roughness, and relative depth.
- Terrain-level traversability uses slope <25° and excludes extremely deep crater interiors.
- The API and UI must not present this dataset as real NASA/LOLA data.

**Production requirement:** replace the generator with a validated mission terrain pipeline and carry coordinate reference, uncertainty, provenance, and resolution metadata end to end.

## 2. Rover dynamics

The rover model is deliberately compact:
- constant nominal speed,
- configurable battery capacity/state of charge,
- configurable base Wh/m,
- configurable hard maximum slope,
- configurable emergency reserve,
- no wheel slip/traction model,
- no suspension dynamics,
- no thermal dynamics,
- no regenerative braking.

The energy equation is useful for deterministic relative route comparison; it is not a calibrated flight power model.

## 3. Route planning

- Movement is 8-connected between adjacent grid cells.
- Non-traversable cells are hard blocked.
- Cells above rover `max_slope_deg` are hard blocked.
- `FASTEST`, `LOWEST_ENERGY`, and `SAFEST` differ only in cost weights; all obey the same hard constraints.
- The recommended initial route is the viable route with the highest deterministic mission-success score.
- Human operators may choose a different viable route.

## 4. Risk and mission-success scores

- Scores are prototype decision-support indices, not probabilities of hardware survival or mission completion.
- Risk uses slope, energy fraction, hazard exposure, and reserve proximity.
- Mission-success score is derived from risk plus a small high-reserve bonus.
- A score should only be interpreted in the context of the configured prototype model.

## 5. Emergency scenarios

The demo supports three controlled event classes:
- battery degradation,
- reduced mobility (lower max slope),
- terrain obstruction.

Events are user-injected simulations. No real telemetry anomaly detector is connected.

Terrain obstruction is treated as a hard external constraint. Reduced mobility causes the remaining original path to be checked again under the new slope limit.

## 6. IBM watsonx / Granite

- watsonx credentials are optional for local demo reliability.
- When enabled, Granite narrates deterministic route evidence.
- Granite is not allowed to create route geometry, energy values, risk values, viability, or emergency recommendations.
- Numeric narration is validated against computed evidence; failed validation triggers deterministic fallback.
- Fallback mode is visibly labelled in the UI.

## 7. Timing and performance

- Route planning runs on a 100×100 in-memory grid and requires no GPU.
- Performance depends on host hardware, Python runtime, route length, and terrain constraints.
- The project does not make a guaranteed real-time flight deadline claim.

## 8. Safety / certification

LunaGuard is **not** flight software and is not certified for operational mission use. A production system would require, at minimum:
- validated input data,
- calibrated vehicle models,
- uncertainty handling,
- independent verification and validation,
- fail-safe/fault-containment design,
- authenticated and audited operations,
- applicable mission assurance and software safety processes.

## 9. Intended use

Appropriate:
- hackathon prototype,
- mission-planning research,
- education,
- decision-support UX exploration,
- algorithm comparison.

Not appropriate:
- autonomous flight control,
- safety certification evidence,
- real rover command generation without independent validated systems.
